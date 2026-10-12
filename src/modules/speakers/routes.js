import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import { uploadSpeakerPhoto } from '../../middlewares/upload.js';
import { createSpeakerSchema, updateSpeakerSchema, listSpeakersQuerySchema } from './validators.js';
import * as controller from './controller.js';

export const speakersRouter = Router();

speakersRouter.get('/', validate(listSpeakersQuerySchema, 'query'), controller.list);
speakersRouter.get('/:id', controller.detail);

speakersRouter.post(
  '/',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  uploadSpeakerPhoto,
  validate(createSpeakerSchema),
  controller.create,
);

speakersRouter.patch(
  '/:id',
  authenticate,
  uploadSpeakerPhoto,
  validate(updateSpeakerSchema),
  controller.update,
);

speakersRouter.delete('/:id/photo', authenticate, controller.removePhoto);

speakersRouter.delete(
  '/:id',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  controller.remove,
);
