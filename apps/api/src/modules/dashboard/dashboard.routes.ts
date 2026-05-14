import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import { prisma } from '../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/manager', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [tasks, pendingReviews, activeSessions, reportsToday, rejectedProofs] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: {
          organizationId: auth.organizationId
        },
        _count: true
      }),
      prisma.workProof.count({
        where: {
          verificationStatus: 'PENDING',
          task: {
            organizationId: auth.organizationId
          }
        }
      }),
      prisma.workSession.count({
        where: {
          sessionStatus: 'ACTIVE',
          task: {
            organizationId: auth.organizationId
          }
        }
      }),
      prisma.dailyReport.count({
        where: {
          submittedAt: {
            gte: today
          },
          task: {
            organizationId: auth.organizationId
          }
        }
      }),
      prisma.workProof.count({
        where: {
          verificationStatus: 'REJECTED',
          task: {
            organizationId: auth.organizationId
          }
        }
      })
    ]);

    response.json({
      tasksByStatus: tasks.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      pendingReviews,
      activeSessions,
      reportsToday,
      rejectedProofs
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/employee/timeline', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const [sessions, proofs, comments, reports] = await Promise.all([
      prisma.workSession.findMany({
        where: {
          userId: auth.sub,
          task: {
            organizationId: auth.organizationId
          }
        },
        include: {
          task: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 25
      }),
      prisma.workProof.findMany({
        where: {
          userId: auth.sub,
          task: {
            organizationId: auth.organizationId
          }
        },
        include: {
          task: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 25
      }),
      prisma.taskComment.findMany({
        where: {
          userId: auth.sub,
          task: {
            organizationId: auth.organizationId
          }
        },
        include: {
          task: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 25
      }),
      prisma.dailyReport.findMany({
        where: {
          userId: auth.sub,
          task: {
            organizationId: auth.organizationId
          }
        },
        include: {
          task: true
        },
        orderBy: {
          submittedAt: 'desc'
        },
        take: 25
      })
    ]);

    const events = [
      ...sessions.map((session) => ({
        id: `session-${session.id}`,
        type: session.sessionStatus === 'ACTIVE' ? 'CHECK_IN' : 'WORK_SESSION',
        title: session.sessionStatus === 'ACTIVE' ? 'Checked in' : 'Completed work session',
        taskTitle: session.task.title,
        occurredAt: session.checkOutTime?.toISOString() ?? session.checkInTime.toISOString()
      })),
      ...proofs.map((proof) => ({
        id: `proof-${proof.id}`,
        type: 'PROOF',
        title: `Proof ${proof.verificationStatus.toLowerCase()}`,
        taskTitle: proof.task.title,
        occurredAt: proof.capturedAt.toISOString()
      })),
      ...comments.map((comment) => ({
        id: `comment-${comment.id}`,
        type: comment.commentType,
        title: comment.message,
        taskTitle: comment.task.title,
        occurredAt: comment.createdAt.toISOString()
      })),
      ...reports.map((report) => ({
        id: `report-${report.id}`,
        type: 'REPORT',
        title: report.title,
        taskTitle: report.task.title,
        occurredAt: report.submittedAt.toISOString()
      }))
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    response.json(events.slice(0, 50));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/employee/notifications', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const [tasks, proofs] = await Promise.all([
      prisma.task.findMany({
        where: {
          assignedToId: auth.sub,
          organizationId: auth.organizationId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      }),
      prisma.workProof.findMany({
        where: {
          userId: auth.sub,
          verificationStatus: {
            in: ['APPROVED', 'REJECTED']
          },
          task: {
            organizationId: auth.organizationId
          }
        },
        include: {
          task: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 20
      })
    ]);

    const notifications = [
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        title: 'Task assigned',
        message: task.title,
        type: 'TASK_ASSIGNED',
        createdAt: task.createdAt.toISOString()
      })),
      ...proofs.map((proof) => ({
        id: `proof-${proof.id}`,
        title: proof.verificationStatus === 'APPROVED' ? 'Proof approved' : 'Proof rejected',
        message: proof.task.title,
        type: `PROOF_${proof.verificationStatus}`,
        createdAt: proof.updatedAt.toISOString()
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    response.json(notifications.slice(0, 30));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/manager/map', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const proofs = await prisma.workProof.findMany({
      where: {
        task: {
          organizationId: auth.organizationId
        }
      },
      include: {
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
        capturedAt: 'desc'
      },
      take: 100
    });

    response.json(
      proofs.map((proof) => ({
        id: proof.id,
        taskTitle: proof.task.title,
        employeeName: proof.user.name,
        latitude: proof.latitude,
        longitude: proof.longitude,
        capturedAt: proof.capturedAt.toISOString(),
        verificationStatus: proof.verificationStatus,
        outsideGeofence: proof.outsideGeofence
      }))
    );
  } catch (error) {
    next(error);
  }
});
