import { Router } from 'express';
import { healthRouter } from '../modules/health/routes.js';
import { authRouter } from '../modules/auth/routes.js';
import { usersRouter } from '../modules/users/routes.js';

export const routes = Router();

routes.use('/health', healthRouter);
routes.use('/api/auth', authRouter);
routes.use('/api/users', usersRouter);
