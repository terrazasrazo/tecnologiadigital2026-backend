import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import { validate } from '../../middlewares/validate.js';
import {
  certificateCodeParamSchema,
  certificateIdParamSchema,
  issueCertificateSchema,
  listCertificatesQuerySchema,
  userIdParamSchema,
} from './validators.js';
import * as controller from './controller.js';

export const certificatesRouter = Router();

certificatesRouter.get(
  '/verify/:code',
  validate(certificateCodeParamSchema, 'params'),
  controller.verify,
);

certificatesRouter.get('/eligibility', authenticate, controller.eligibility);
certificatesRouter.get('/me', authenticate, controller.mine);

certificatesRouter.post('/', authenticate, validate(issueCertificateSchema), controller.issue);

certificatesRouter.get(
  '/',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(listCertificatesQuerySchema, 'query'),
  controller.list,
);

certificatesRouter.post(
  '/users/:userId',
  authenticate,
  authorize(ROLE_NAMES.admin, ROLE_NAMES.organizador),
  validate(userIdParamSchema, 'params'),
  validate(issueCertificateSchema),
  controller.issueForUser,
);

certificatesRouter.get(
  '/:id/download',
  authenticate,
  validate(certificateIdParamSchema, 'params'),
  controller.download,
);
