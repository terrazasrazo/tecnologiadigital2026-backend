import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './validators.js';
import * as controller from './controller.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), controller.register);
authRouter.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
authRouter.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  controller.resendVerification,
);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

authRouter.post('/login', validate(loginSchema), controller.login);
authRouter.post('/refresh', validate(refreshSchema), controller.refresh);
authRouter.post('/logout', authenticate, validate(logoutSchema), controller.logout);
