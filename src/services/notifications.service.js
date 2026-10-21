import { config } from '../config/index.js';
import { sendMailSafe } from './mailer.service.js';

export function sendVerificationEmail(user, token) {
  const url = `${config.frontendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

  return sendMailSafe({
    to: user.email,
    subject: `Confirma tu correo electrónico — ${config.appName}`,
    template: 'verify-email',
    context: { name: user.name, url },
  });
}

export function sendPasswordResetEmail(user, token) {
  const url = `${config.frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  return sendMailSafe({
    to: user.email,
    subject: `Recuperación de contraseña — ${config.appName}`,
    template: 'reset-password',
    context: { name: user.name, url },
  });
}

export function sendCertificateEmail(
  user,
  { subject = `Tu constancia — ${config.appName}`, pdf, filename = 'constancia.pdf' } = {},
) {
  return sendMailSafe({
    to: user.email,
    subject,
    template: 'certificate',
    context: { name: user.name },
    attachments: pdf ? [{ filename, content: pdf, contentType: 'application/pdf' }] : undefined,
  });
}
