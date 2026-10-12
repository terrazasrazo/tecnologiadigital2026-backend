import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import { validate } from '../../middlewares/validate.js';
import { createTalkSchema, updateTalkSchema, listTalksQuerySchema } from './validators.js';
import * as controller from './controller.js';

export const talksRouter = Router();

talksRouter.get('/', validate(listTalksQuerySchema, 'query'), controller.list);
talksRouter.get('/:id', controller.detail);

talksRouter.post(
  '/',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(createTalkSchema),
  controller.create,
);

talksRouter.patch(
  '/:id',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(updateTalkSchema),
  controller.update,
);

talksRouter.delete(
  '/:id',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  controller.remove,
);
