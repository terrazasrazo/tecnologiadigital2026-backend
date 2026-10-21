import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middlewares/error.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const emailsDir = path.resolve(currentDir, '..', 'emails');
const templatesDir = path.join(emailsDir, 'templates');
const layoutsDir = path.join(emailsDir, 'layouts');

let transporter = null;
let warnedTransportConfig = false;

/**
 * Detecta la combinación puerto/`secure` inválida antes de que nodemailer falle
 * con un error criptíco (ESOCKET "wrong version number").
 */
function warnIfTransportMisconfigured() {
  if (warnedTransportConfig || !config.email.host) {
    return;
  }
  warnedTransportConfig = true;

  const { host, port, secure } = config.email;

  if (secure && (port === 587 || port === 25)) {
    logger.warn(
      { host, port, secure },
      'SMTP_SECURE=true con puerto STARTTLS: nodemailer espera TLS implícito y la ' +
        'conexión fallará. Usa SMTP_PORT=465 con SMTP_SECURE=true, o SMTP_PORT=587 con SMTP_SECURE=false.',
    );
  } else if (!secure && port === 465) {
    logger.warn(
      { host, port, secure },
      'SMTP_PORT=465 requiere SMTP_SECURE=true (TLS implícito) o la conexión fallará.',
    );
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function setTransporter(next) {
  transporter = next;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (config.email.host) {
    warnIfTransportMisconfigured();
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

export async function renderTemplate(name, context = {}) {
  const templatePath = path.join(templatesDir, `${name}.ejs`);
  return ejs.renderFile(templatePath, { appName: config.appName, ...context });
}

async function renderLayout(name, context) {
  const layoutPath = path.join(layoutsDir, `${name}.ejs`);
  return ejs.renderFile(layoutPath, context);
}

export async function buildHtml({ template, html, layout = 'base', context = {} }) {
  if (html) {
    return html;
  }
  if (!template) {
    return null;
  }

  const body = await renderTemplate(template, context);
  if (!layout) {
    return body;
  }

  return renderLayout(layout, { appName: config.appName, ...context, body });
}

export async function sendMail({
  to,
  subject,
  template,
  html,
  layout = 'base',
  context = {},
  attachments,
  cc,
  bcc,
  replyTo,
  headers,
}) {
  const finalHtml = await buildHtml({ template, html, layout, context });
  if (!finalHtml) {
    throw new AppError('El correo no tiene contenido HTML', 500, 'MAIL_EMPTY_CONTENT');
  }

  const maxRetries = Math.max(0, config.email.maxRetries);
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const info = await getTransporter().sendMail({
        from: config.email.from,
        to,
        cc,
        bcc,
        replyTo,
        subject,
        html: finalHtml,
        attachments,
        headers,
      });

      if (!config.email.host) {
        logger.info({ to, subject }, 'Correo generado (modo desarrollo, no enviado)');
      }

      return info;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      logger.warn(
        { err: error, attempt: attempt + 1, maxRetries, to, subject, willRetry: !isLastAttempt },
        'Fallo al enviar el correo',
      );

      if (!isLastAttempt) {
        await sleep(config.email.retryDelayMs * (attempt + 1));
      }
    }
  }

  throw new AppError('No se pudo enviar el correo tras varios intentos', 502, 'MAIL_SEND_FAILED', {
    reason: lastError?.message,
  });
}

export async function sendMailSafe(options) {
  try {
    return await sendMail(options);
  } catch (error) {
    logger.error(
      { err: error, to: options.to, subject: options.subject },
      'Envío de correo fallido (no bloqueante)',
    );
    return null;
  }
}
