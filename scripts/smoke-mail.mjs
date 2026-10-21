#!/usr/bin/env node
/**
 * Prueba de humo del correo saliente.
 *
 *   node scripts/smoke-mail.mjs                 # solo conexión + TLS + AUTH
 *   node scripts/smoke-mail.mjs alguien@x.com   # además envía un correo real
 *
 * Usa exactamente la misma carga de entorno (.env.<NODE_ENV> y .env) y las
 * mismas credenciales que la app, así que replica lo que ocurre en producción.
 */
import fs from 'node:fs';
import nodemailer from 'nodemailer';
import { config } from '../src/config/index.js';
import { sendMail } from '../src/services/mailer.service.js';

const mask = (value) => (value ? `oculta (${String(value).length} chars)` : '(vacío)');

const files = ['.env', `.env.${config.env}`];
console.log('== Entorno ==');
console.log('cwd          :', process.cwd());
console.log('NODE_ENV     :', JSON.stringify(process.env.NODE_ENV ?? '(no definido)'));
console.log('config.env   :', config.env);
for (const file of files) {
  console.log(`${file.padEnd(12)}: ${fs.existsSync(file) ? 'existe' : 'no existe'}`);
}

console.log('\n== SMTP efectivo ==');
console.log('host         :', config.email.host || '(VACÍO → jsonTransport: NO se envía nada)');
console.log('port         :', config.email.port, '| secure:', config.email.secure);
console.log('user         :', config.email.user || '(sin autenticación)');
console.log('password     :', mask(config.email.password));
console.log('MAIL_FROM    :', config.email.from);
console.log('retries/delay:', config.email.maxRetries, '/', config.email.retryDelayMs, 'ms');
console.log('LOG_LEVEL    :', config.logLevel);

if (!config.email.host) {
  console.error(
    '\n✗ SMTP_HOST está vacío: nodemailer usa jsonTransport y los correos solo ' +
      'se escriben en el log. Revisa .env / .env.' + config.env,
  );
  process.exit(2);
}

const transport = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: config.email.user
    ? { user: config.email.user, pass: config.email.password }
    : undefined,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

console.log('\n== verify() (conexión + TLS + AUTH desde este servidor) ==');
try {
  const ok = await transport.verify();
  console.log('✓ verify OK =', ok);
} catch (error) {
  console.error('✗ verify falló');
  console.error('  name        :', error.name);
  console.error('  code        :', error.code);
  console.error('  responseCode:', error.responseCode);
  console.error('  response    :', (error.response || '').replace(/\r?\n/g, ' | '));
  console.error('  message     :', error.message);
  process.exit(3);
} finally {
  transport.close();
}

const to = process.argv[2];
if (!to) {
  console.log('\n(Envío real: repite con `node scripts/smoke-mail.mjs tu@correo.com`)');
  process.exit(0);
}

console.log(`\n== Envío real vía sendMail() a ${to} ==`);
try {
  const info = await sendMail({
    to,
    subject: `Prueba de envío — ${config.appName}`,
    html: `<p>Prueba desde el backend de ${config.appName}.</p>`,
  });
  console.log('✓ enviado');
  console.log('  messageId :', info.messageId);
  console.log('  response  :', info.response);
  console.log('  accepted  :', JSON.stringify(info.accepted));
  console.log('  rejected  :', JSON.stringify(info.rejected));
} catch (error) {
  console.error('✗ fallo:', error.message);
  console.error('  code   :', error.code);
  console.error('  reason :', error.details?.reason);
  process.exit(4);
}
