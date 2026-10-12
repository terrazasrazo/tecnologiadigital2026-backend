import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import { validate } from '../../middlewares/validate.js';
import {
  checkInSchema,
  manualAttendanceSchema,
  listRegistrationsQuerySchema,
} from './validators.js';
import * as controller from './controller.js';

export const attendanceRouter = Router();

attendanceRouter.get('/me', authenticate, controller.listMine);

attendanceRouter.post('/talks/:talkId/register', authenticate, controller.register);
attendanceRouter.delete('/talks/:talkId/register', authenticate, controller.cancel);

attendanceRouter.get(
  '/talks/:talkId/registrations',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(listRegistrationsQuerySchema, 'query'),
  controller.listByTalk,
);

attendanceRouter.get(
  '/talks/:talkId/qr',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  controller.qr,
);

attendanceRouter.post(
  '/talks/:talkId/checkin',
  authenticate,
  validate(checkInSchema),
  controller.checkIn,
);

attendanceRouter.post(
  '/talks/:talkId/attendance',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(manualAttendanceSchema),
  controller.setAttendance,
);
