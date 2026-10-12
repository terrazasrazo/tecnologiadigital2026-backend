import { Router } from 'express';
import { healthRouter } from '../modules/health/routes.js';
import { authRouter } from '../modules/auth/routes.js';
import { usersRouter } from '../modules/users/routes.js';
import { speakersRouter } from '../modules/speakers/routes.js';
import { locationsRouter } from '../modules/locations/routes.js';
import { talksRouter } from '../modules/talks/routes.js';
import { attendanceRouter } from '../modules/attendance/routes.js';
import { certificatesRouter } from '../modules/certificates/routes.js';

export const routes = Router();

routes.use('/health', healthRouter);
routes.use('/api/auth', authRouter);
routes.use('/api/users', usersRouter);
routes.use('/api/speakers', speakersRouter);
routes.use('/api/locations', locationsRouter);
routes.use('/api/talks', talksRouter);
routes.use('/api/attendance', attendanceRouter);
routes.use('/api/certificates', certificatesRouter);
