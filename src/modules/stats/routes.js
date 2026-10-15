import { Router } from 'express';
import { ROLE_NAMES } from '../../db/models/index.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/rbac.js';
import * as controller from './controller.js';

export const statsRouter = Router();

statsRouter.get('/', authenticate, authorize(ROLE_NAMES.admin), controller.summary);
