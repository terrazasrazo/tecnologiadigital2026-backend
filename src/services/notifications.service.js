import { config } from '../config/index.js';
import { sendMail } from './mailer.service.js';

export function sendVerificationEmail(user, token) {
  const url = `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

  return sendMail({
    to: user.email,
    subject: 'Confirma tu correo electrónico',
    template: 'verify-email',
    context: { name: user.name, url },
  });
}

export function sendPasswordResetEmail(user, token) {
  const url = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  return sendMail({
    to: user.email,
    subject: 'Recuperación de contraseña',
    template: 'reset-password',
    context: { name: user.name, url },
  });
}
