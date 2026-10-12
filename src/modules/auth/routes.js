import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { loginSchema, refreshSchema, logoutSchema } from './validators.js';
import * as controller from './controller.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), controller.login);
authRouter.post('/refresh', validate(refreshSchema), controller.refresh);
authRouter.post('/logout', authenticate, validate(logoutSchema), controller.logout);
