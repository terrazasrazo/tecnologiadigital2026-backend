import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  updateStatusSchema,
  listUsersQuerySchema,
} from './validators.js';
import * as controller from './controller.js';

export const usersRouter = Router();

usersRouter.get('/me', authenticate, controller.me);
usersRouter.patch('/me', authenticate, validate(updateProfileSchema), controller.updateMe);
usersRouter.post(
  '/me/change-password',
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword,
);

usersRouter.get(
  '/',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(listUsersQuerySchema, 'query'),
  controller.list,
);
usersRouter.post(
  '/',
  authenticate,
  authorize(ROLE_NAMES.admin),
  validate(adminCreateUserSchema),
  controller.create,
);
usersRouter.get('/:id', authenticate, authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador), controller.detail);
usersRouter.patch(
  '/:id',
  authenticate,
  authorize(ROLE_NAMES.admin),
  validate(adminUpdateUserSchema),
  controller.update,
);
usersRouter.patch(
  '/:id/status',
  authenticate,
  authorize(ROLE_NAMES.admin),
  validate(updateStatusSchema),
  controller.updateStatus,
);
usersRouter.delete('/:id', authenticate, authorize(ROLE_NAMES.admin), controller.remove);
