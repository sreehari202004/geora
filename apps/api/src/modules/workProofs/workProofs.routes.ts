import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import { prisma } from '../../prisma/client.js';
import { uploadProofImage, uploadReportAttachment } from '../../services/media/cloudinaryMediaService.js';
import { HttpError } from '../../utils/httpError.js';

export const workProofsRouter = Router();

const createProofSchema = z.object({
  localUuid: z.string().min(8),
  taskId: z.string().uuid(),
  imageUri: z.string().min(1).optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationAccuracy: z.number().nullable().optional(),
  capturedAt: z.string().datetime(),
  remarks: z.string().optional(),
  taskVersion: z.number().int().positive().optional(),
  reportTitle: z.string().min(1).optional(),
  reportText: z.string().min(1).optional()
});

const verifyProofSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional()
});

const proofParamsSchema = z.object({
  proofId: z.string().uuid()
});

const attachmentSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive()
});

workProofsRouter.use(requireAuth);

workProofsRouter.post('/', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const input = createProofSchema.parse(request.body);
    console.log('[proof:create] received', {
      localUuid: input.localUuid,
      taskId: input.taskId,
      userId: auth.sub,
      hasImageBase64: Boolean(input.imageBase64),
      hasReportText: Boolean(input.reportText)
    });
    const task = await prisma.task.findFirst({
      where: {
        id: input.taskId,
        assignedToId: auth.sub,
        organizationId: auth.organizationId
      },
      include: {
        organization: true,
        assignedTo: {
          select: {
            name: true
          }
        }
      }
    });

    if (!task) {
      console.log('[proof:create] task not found', {
        taskId: input.taskId,
        userId: auth.sub,
        organizationId: auth.organizationId
      });
      throw new HttpError(404, 'Task not found');
    }

    const existingProof = await prisma.workProof.findUnique({
      where: {
        userId_localUuid: {
          userId: auth.sub,
          localUuid: input.localUuid
        }
      }
    });

    if (existingProof) {
      console.log('[proof:create] duplicate local uuid, returning existing proof', {
        localUuid: input.localUuid,
        proofId: existingProof.id
      });
      return response.status(200).json({
        id: existingProof.id,
        status: 'already_synced'
      });
    }

    if (input.taskVersion && input.taskVersion !== task.versionNumber) {
      console.log('[proof:create] task version conflict', {
        localUuid: input.localUuid,
        submittedVersion: input.taskVersion,
        serverVersion: task.versionNumber
      });
      throw new HttpError(409, 'Task changed while this proof was offline');
    }

    const outsideGeofence = isOutsideGeofence(
      input.latitude,
      input.longitude,
      task.geofenceLatitude,
      task.geofenceLongitude,
      task.geofenceRadiusMeters
    );
    const watermarkText = buildWatermarkText({
      employeeName: task.assignedTo.name,
      organizationName: task.organization.name,
      taskId: task.id,
      capturedAt: input.capturedAt,
      latitude: input.latitude,
      longitude: input.longitude
    });
    const uploadedImage = await uploadProofImage({
      imageBase64: input.imageBase64,
      imageMimeType: input.imageMimeType,
      localUuid: input.localUuid,
      organizationId: auth.organizationId,
      taskId: input.taskId,
      userId: auth.sub,
      watermarkText
    });
    console.log('[proof:create] image uploaded', {
      localUuid: input.localUuid,
      publicId: uploadedImage.publicId
    });

    const existingAttempts = await prisma.workProofAttempt.count({
      where: {
        taskId: input.taskId,
        submittedById: auth.sub
      }
    });
    const capturedAt = new Date(input.capturedAt);
    const proofId = crypto.randomUUID();
    const reportId = input.reportText ? crypto.randomUUID() : null;

    const proof = await prisma.$transaction(
      async (tx) => {
        const savedProof = await tx.workProof.create({
          data: {
            id: proofId,
            localUuid: input.localUuid,
            taskId: input.taskId,
            userId: auth.sub,
            imageUrl: uploadedImage.secureUrl,
            imagePublicId: uploadedImage.publicId,
            watermarkText,
            latitude: input.latitude,
            longitude: input.longitude,
            locationAccuracy: input.locationAccuracy,
            outsideGeofence,
            capturedAt,
            remarks: input.remarks,
            syncStatus: 'SYNCED',
            verificationStatus: 'PENDING'
          }
        });

        if (input.reportText && reportId) {
          await tx.dailyReport.create({
            data: {
              id: reportId,
              taskId: input.taskId,
              userId: auth.sub,
              workProofId: savedProof.id,
              title: input.reportTitle ?? 'Daily work report',
              reportText: input.reportText,
              submittedAt: capturedAt,
              syncStatus: 'SYNCED'
            }
          });
        }

        await tx.workProofAttempt.create({
          data: {
            localUuid: input.localUuid,
            taskId: input.taskId,
            submittedById: auth.sub,
            workProofId: savedProof.id,
            proofVersion: existingAttempts + 1,
            imageUrl: uploadedImage.secureUrl,
            imagePublicId: uploadedImage.publicId,
            watermarkText,
            reportId,
            remarks: input.remarks,
            status: 'PENDING',
            submittedAt: capturedAt
          }
        });

        await tx.task.update({
          where: {
            id: input.taskId
          },
          data: {
            status: 'COMPLETED',
            versionNumber: {
              increment: 1
            }
          }
        });

        return savedProof;
      },
      {
        timeout: 15000
      }
    );
    console.log('[proof:create] saved proof and completed task', {
      proofId: proof.id,
      taskId: input.taskId,
      localUuid: input.localUuid
    });

    response.status(201).json({
      id: proof.id,
      status: 'synced'
    });
  } catch (error) {
    next(error);
  }
});

workProofsRouter.post('/:proofId/attachments', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const params = proofParamsSchema.parse(request.params);
    const input = attachmentSchema.parse(request.body);
    console.log('[proof:attachment] received', {
      proofId: params.proofId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize
    });
    const proof = await prisma.workProof.findFirst({
      where: {
        id: params.proofId,
        task: {
          organizationId: auth.organizationId
        }
      },
      include: {
        dailyReport: true
      }
    });

    if (!proof?.dailyReport) {
      throw new HttpError(404, 'Daily report not found for proof');
    }

    const uploaded = await uploadReportAttachment({
      fileBase64: input.fileBase64,
      fileMimeType: input.fileType,
      fileName: input.fileName,
      organizationId: auth.organizationId,
      dailyReportId: proof.dailyReport.id
    });
    console.log('[proof:attachment] uploaded', {
      proofId: params.proofId,
      publicId: uploaded.publicId
    });

    const attachment = await prisma.reportAttachment.create({
      data: {
        dailyReportId: proof.dailyReport.id,
        fileUrl: uploaded.secureUrl,
        filePublicId: uploaded.publicId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize
      }
    });

    response.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
});

workProofsRouter.get('/pending-review', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const proofs = await prisma.workProof.findMany({
      where: {
        verificationStatus: 'PENDING',
        task: {
          organizationId: auth.organizationId
        }
      },
      include: {
        dailyReport: {
          include: {
            attachments: true
          }
        },
        attempts: {
          orderBy: {
            proofVersion: 'desc'
          }
        },
        task: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    response.json(proofs);
  } catch (error) {
    next(error);
  }
});

function buildWatermarkText(input: {
  employeeName: string;
  organizationName: string;
  taskId: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
}) {
  const capturedAt = new Date(input.capturedAt).toISOString();
  return `${input.organizationName} | ${input.employeeName} | Task ${input.taskId.slice(0, 8)} | ${capturedAt} | ${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`;
}

function isOutsideGeofence(
  latitude: number,
  longitude: number,
  geofenceLatitude?: number | null,
  geofenceLongitude?: number | null,
  geofenceRadiusMeters?: number | null
) {
  if (geofenceLatitude == null || geofenceLongitude == null || geofenceRadiusMeters == null) {
    return false;
  }

  const earthRadiusMeters = 6371000;
  const latDelta = toRadians(geofenceLatitude - latitude);
  const longDelta = toRadians(geofenceLongitude - longitude);
  const lat1 = toRadians(latitude);
  const lat2 = toRadians(geofenceLatitude);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(longDelta / 2) * Math.sin(longDelta / 2);
  const distance = 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return distance > geofenceRadiusMeters;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

workProofsRouter.get('/reviewed', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const proofs = await prisma.workProof.findMany({
      where: {
        verificationStatus: {
          in: ['APPROVED', 'REJECTED']
        },
        task: {
          organizationId: auth.organizationId
        }
      },
      include: {
        dailyReport: {
          include: {
            attachments: true
          }
        },
        attempts: {
          orderBy: {
            proofVersion: 'desc'
          }
        },
        task: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 25
    });

    response.json(proofs);
  } catch (error) {
    next(error);
  }
});

workProofsRouter.patch('/:proofId/verify', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const params = proofParamsSchema.parse(request.params);
    const input = verifyProofSchema.parse(request.body);
    const proof = await prisma.workProof.findFirst({
      where: {
        id: params.proofId,
        task: {
          organizationId: auth.organizationId
        }
      }
    });

    if (!proof) {
      throw new HttpError(404, 'Proof not found');
    }

    const updatedProof = await prisma.$transaction(async (tx) => {
      const nextProof = await tx.workProof.update({
        where: {
          id: proof.id
        },
        data: {
          verificationStatus: input.status
        }
      });

      await tx.task.update({
        where: {
          id: proof.taskId
        },
        data: {
          status: input.status === 'APPROVED' ? 'VERIFIED' : 'REJECTED'
        }
      });

      await tx.workProofAttempt.updateMany({
        where: {
          workProofId: proof.id
        },
        data: {
          status: input.status
        }
      });

      await tx.verificationAudit.create({
        data: {
          workProofId: proof.id,
          managerId: auth.sub,
          verificationStatus: input.status,
          reason: input.reason
        }
      });

      return nextProof;
    });

    response.json(updatedProof);
  } catch (error) {
    next(error);
  }
});
