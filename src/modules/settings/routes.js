import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import { validate } from '../../middlewares/validate.js';
import { updateSettingsSchema } from './validators.js';
import * as controller from './controller.js';

export const settingsRouter = Router();

settingsRouter.get('/', authenticate, authorize(ROLE_NAMES.admin), controller.show);

settingsRouter.patch(
  '/',
  authenticate,
  authorize(ROLE_NAMES.admin),
  validate(updateSettingsSchema),
  controller.update,
);
