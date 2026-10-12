import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import { validate } from '../../middlewares/validate.js';
import {
  createLocationSchema,
  updateLocationSchema,
  listLocationsQuerySchema,
} from './validators.js';
import * as controller from './controller.js';

export const locationsRouter = Router();

locationsRouter.get('/', validate(listLocationsQuerySchema, 'query'), controller.list);
locationsRouter.get('/:id', controller.detail);

locationsRouter.post(
  '/',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(createLocationSchema),
  controller.create,
);

locationsRouter.patch(
  '/:id',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(updateLocationSchema),
  controller.update,
);

locationsRouter.delete(
  '/:id',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  controller.remove,
);
