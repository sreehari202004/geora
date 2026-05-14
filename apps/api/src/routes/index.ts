import { Router } from 'express';

import { authRouter } from '../modules/auth/auth.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { tasksRouter } from '../modules/tasks/tasks.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { workProofsRouter } from '../modules/workProofs/workProofs.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/work-proofs', workProofsRouter);
