import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import { prisma } from '../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/employees', requireRole('ADMIN', 'MANAGER'), async (request, response, next) => {
  try {
    const auth = request.auth;

    if (!auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    const employees = await prisma.user.findMany({
      where: {
        organizationId: auth.organizationId,
        role: 'EMPLOYEE'
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    response.json(employees);
  } catch (error) {
    next(error);
  }
});
