import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  renderTemplate,
  buildHtml,
  sendMail,
  sendMailSafe,
  setTransporter,
} from '../src/services/mailer.service.js';
import {
  sendVerificationEmail,
  sendCertificateEmail,
} from '../src/services/notifications.service.js';
import { config } from '../src/config/index.js';

let fake;

beforeEach(() => {
  fake = { sendMail: vi.fn().mockResolvedValue({ messageId: 'ok' }) };
  setTransporter(fake);
  config.email.maxRetries = 2;
  config.email.retryDelayMs = 1;
});

afterAll(() => {
  setTransporter(null);
});

describe('Infraestructura de correo (M6)', () => {
  it('renderiza una plantilla con su contexto', async () => {
    const html = await renderTemplate('verify-email', {
      name: 'Ana',
      url: 'https://ejemplo.test/verify-email?token=abc',
    });

    expect(html).toContain('Ana');
    expect(html).toContain('https://ejemplo.test/verify-email?token=abc');
  });

  it('envuelve la plantilla en el layout base', async () => {
    const html = await buildHtml({
      template: 'verify-email',
      context: { name: 'Ana', url: 'https://ejemplo.test/x' },
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain(config.appName);
    expect(html).toContain('Ana');
  });

  it('envía un correo renderizando la plantilla y respetando adjuntos', async () => {
    const pdf = Buffer.from('%PDF-1.4 contenido');
    const info = await sendMail({
      to: 'ana@example.com',
      subject: 'Constancia',
      template: 'certificate',
      context: { name: 'Ana' },
      attachments: [{ filename: 'constancia.pdf', content: pdf }],
    });

    expect(info.messageId).toBe('ok');
    expect(fake.sendMail).toHaveBeenCalledTimes(1);
    const message = fake.sendMail.mock.calls[0][0];
    expect(message.to).toBe('ana@example.com');
    expect(message.html).toContain('Ana');
    expect(message.attachments[0].filename).toBe('constancia.pdf');
  });

  it('reintenta hasta lograrlo', async () => {
    fake.sendMail
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ messageId: 'ok' });

    const info = await sendMail({
      to: 'ana@example.com',
      subject: 'Prueba',
      template: 'verify-email',
      context: { name: 'Ana', url: 'https://ejemplo.test/x' },
    });

    expect(info.messageId).toBe('ok');
    expect(fake.sendMail).toHaveBeenCalledTimes(3);
  });

  it('falla con MAIL_SEND_FAILED al agotar los intentos', async () => {
    fake.sendMail.mockRejectedValue(new Error('smtp caído'));
    config.email.maxRetries = 1;

    await expect(
      sendMail({
        to: 'ana@example.com',
        subject: 'Prueba',
        template: 'verify-email',
        context: { name: 'Ana', url: 'https://ejemplo.test/x' },
      }),
    ).rejects.toMatchObject({ code: 'MAIL_SEND_FAILED' });

    expect(fake.sendMail).toHaveBeenCalledTimes(2);
  });

  it('no bloquea el flujo con sendMailSafe', async () => {
    fake.sendMail.mockRejectedValue(new Error('smtp caído'));

    const result = await sendMailSafe({
      to: 'ana@example.com',
      subject: 'Prueba',
      template: 'verify-email',
      context: { name: 'Ana', url: 'https://ejemplo.test/x' },
    });

    expect(result).toBeNull();
  });

  it('rechaza correos sin contenido', async () => {
    await expect(sendMail({ to: 'ana@example.com', subject: 'Vacío' })).rejects.toMatchObject({
      code: 'MAIL_EMPTY_CONTENT',
    });
  });

  it('las notificaciones de dominio usan el servicio compartido', async () => {
    const user = { name: 'Ana', email: 'ana@example.com' };

    await sendVerificationEmail(user, 'token-123');
    expect(fake.sendMail).toHaveBeenCalledTimes(1);
    expect(fake.sendMail.mock.calls[0][0].html).toContain('token-123');

    await sendCertificateEmail(user, { pdf: Buffer.from('pdf') });
    const message = fake.sendMail.mock.calls[1][0];
    expect(message.attachments[0].filename).toBe('constancia.pdf');
  });
});
