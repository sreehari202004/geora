import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import { prisma } from '../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';

export const tasksRouter = Router();

const createTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(1),
  assignedToId: z.string().uuid(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).default('NONE'),
  geofenceLatitude: z.number().min(-90).max(90).optional(),
  geofenceLongitude: z.number().min(-180).max(180).optional(),
  geofenceRadiusMeters: z.number().int().positive().optional(),
  checklistItems: z.array(z.string().min(1)).default([])
});

const taskParamsSchema = z.object({
  taskId: z.string().uuid()
});

const sessionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

const commentSchema = z.object({
  message: z.string().min(1),
  commentType: z.enum(['INFO', 'ISSUE', 'BLOCKER', 'UPDATE']).default('INFO')
});

tasksRouter.use(requireAuth);

tasksRouter.get('/assigned', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: auth.sub,
        organizationId: auth.organizationId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    response.json(
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        startDate: task.startDate?.toISOString() ?? null,
        dueDate: task.dueDate?.toISOString() ?? null,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        versionNumber: task.versionNumber,
        recurrence: task.recurrence,
        geofenceLatitude: task.geofenceLatitude,
        geofenceLongitude: task.geofenceLongitude,
        geofenceRadiusMeters: task.geofenceRadiusMeters
      }))
    );
  } catch (error) {
    next(error);
  }
});

tasksRouter.get('/managed', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: auth.organizationId
      },
      include: {
        assignedTo: {
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

    response.json(
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        startDate: task.startDate?.toISOString() ?? null,
        dueDate: task.dueDate?.toISOString() ?? null,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        versionNumber: task.versionNumber,
        recurrence: task.recurrence,
        geofenceLatitude: task.geofenceLatitude,
        geofenceLongitude: task.geofenceLongitude,
        geofenceRadiusMeters: task.geofenceRadiusMeters,
        assignedTo: task.assignedTo
      }))
    );
  } catch (error) {
    next(error);
  }
});

tasksRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const input = createTaskSchema.parse(request.body);
    const assignee = await prisma.user.findFirst({
      where: {
        id: input.assignedToId,
        organizationId: auth.organizationId
      }
    });

    if (!assignee) {
      throw new HttpError(404, 'Assignee not found');
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        assignedToId: input.assignedToId,
        assignedById: auth.sub,
        organizationId: auth.organizationId,
        priority: input.priority,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        recurrence: input.recurrence,
        geofenceLatitude: input.geofenceLatitude,
        geofenceLongitude: input.geofenceLongitude,
        geofenceRadiusMeters: input.geofenceRadiusMeters,
        checklistItems: {
          create: input.checklistItems.map((label, index) => ({
            label,
            sortOrder: index
          }))
        }
      }
    });

    response.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

tasksRouter.post('/:taskId/sessions/check-in', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const params = taskParamsSchema.parse(request.params);
    const input = sessionSchema.parse(request.body);
    const task = await prisma.task.findFirst({
      where: {
        id: params.taskId,
        assignedToId: auth.sub,
        organizationId: auth.organizationId
      }
    });

    if (!task) {
      throw new HttpError(404, 'Task not found');
    }

    const session = await prisma.workSession.create({
      data: {
        taskId: task.id,
        userId: auth.sub,
        checkInTime: new Date(),
        checkInLat: input.latitude,
        checkInLong: input.longitude
      }
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'IN_PROGRESS', versionNumber: { increment: 1 } }
    });

    response.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

tasksRouter.post('/:taskId/sessions/check-out', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const params = taskParamsSchema.parse(request.params);
    const input = sessionSchema.parse(request.body);
    const session = await prisma.workSession.findFirst({
      where: {
        taskId: params.taskId,
        userId: auth.sub,
        sessionStatus: 'ACTIVE',
        task: {
          organizationId: auth.organizationId
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!session) {
      throw new HttpError(404, 'Active session not found');
    }

    const updated = await prisma.workSession.update({
      where: { id: session.id },
      data: {
        checkOutTime: new Date(),
        checkOutLat: input.latitude,
        checkOutLong: input.longitude,
        sessionStatus: 'COMPLETED'
      }
    });

    response.json(updated);
  } catch (error) {
    next(error);
  }
});

tasksRouter.post('/:taskId/comments', async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const params = taskParamsSchema.parse(request.params);
    const input = commentSchema.parse(request.body);
    const task = await prisma.task.findFirst({
      where: {
        id: params.taskId,
        organizationId: auth.organizationId
      }
    });

    if (!task) {
      throw new HttpError(404, 'Task not found');
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: task.id,
        userId: auth.sub,
        message: input.message,
        commentType: input.commentType
      }
    });

    response.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});
