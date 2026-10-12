import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(currentDir, '..', 'emails', 'templates');

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (config.email.host) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user
        ? { user: config.email.user, pass: config.email.password }
        : undefined,
    });
  } else {
    logger.warn('SMTP no configurado: los correos se generan en el log (modo desarrollo).');
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

export async function sendMail({ to, subject, template, context = {} }) {
  const templatePath = path.join(templatesDir, `${template}.ejs`);
  const html = await ejs.renderFile(templatePath, context);

  const info = await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject,
    html,
  });

  if (!config.email.host) {
    logger.info({ to, subject, context }, 'Correo generado (modo desarrollo, no enviado)');
  }

  return info;
}
