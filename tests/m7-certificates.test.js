import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Op } from 'sequelize';
import { createApp } from '../src/app.js';
import { isDatabaseUp } from '../src/config/database.js';
import { config } from '../src/config/index.js';
import {
  Certificate,
  Setting,
  Talk,
  TalkRegistration,
  User,
  REGISTRATION_STATUSES,
} from '../src/db/models/index.js';
import { setTransporter } from '../src/services/mailer.service.js';
import { documentStore } from '../src/services/documentStore.service.js';

const app = createApp();
const dbUp = await isDatabaseUp();

const ADMIN = { email: 'admin@tecnologiadigital.dev', password: 'Admin123!' };

const EMAILS = {
  eligible: 'm7-asistente@example.com',
  empty: 'm7-nuevo@example.com',
};

let adminToken;
let eligibleToken;
let emptyToken;
const ids = {};
const sentMails = [];

function parsePdf(res, callback) {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

async function authPost(path, token, body) {
  return request(app).post(path).set('Authorization', `Bearer ${token}`).send(body);
}

async function authGet(path, token) {
  return request(app).get(path).set('Authorization', `Bearer ${token}`);
}

async function createAttendee(kind) {
  const email = EMAILS[kind];
  const password = 'Asistente123!';
  const created = await authPost('/api/users', adminToken, {
    name: `M7-${kind}`,
    lastName: 'Asistente',
    email,
    password,
    role: 'asistente',
  });
  const login = await request(app).post('/api/auth/login').send({ email, password });
  return { id: created.body.id, token: login.body.tokens.accessToken };
}

describe.skipIf(!dbUp)('Constancias PDF (M7)', () => {
  beforeAll(async () => {
    config.pdf.provider = 'stub';
    setTransporter({
      sendMail: async (options) => {
        sentMails.push(options);
        return { messageId: `stub-${sentMails.length}` };
      },
    });

    await Setting.upsert({ key: 'certificate.metric', value: JSON.stringify('talks') });
    await Setting.upsert({ key: 'certificate.minTalks', value: JSON.stringify(1) });
    await Setting.upsert({ key: 'certificate.minHours', value: JSON.stringify(0) });

    const login = await request(app).post('/api/auth/login').send(ADMIN);
    adminToken = login.body.tokens.accessToken;

    const eligible = await createAttendee('eligible');
    ids.eligible = eligible.id;
    eligibleToken = eligible.token;

    const empty = await createAttendee('empty');
    ids.empty = empty.id;
    emptyToken = empty.token;

    const talkA = await authPost('/api/talks', adminToken, {
      title: 'M7-Ponencia A',
      date: '2024-03-01',
      startTime: '09:00',
      endTime: '10:00',
    });
    const talkB = await authPost('/api/talks', adminToken, {
      title: 'M7-Ponencia B',
      date: '2024-03-02',
      startTime: '11:00',
      endTime: '11:30',
    });
    ids.talkA = talkA.body.id;
    ids.talkB = talkB.body.id;

    await TalkRegistration.create({
      talkId: ids.talkA,
      userId: ids.eligible,
      status: REGISTRATION_STATUSES.attended,
      attendedAt: new Date(),
    });
    await TalkRegistration.create({
      talkId: ids.talkB,
      userId: ids.eligible,
      status: REGISTRATION_STATUSES.attended,
      attendedAt: new Date(),
    });
  });

  afterAll(async () => {
    setTransporter(null);
    config.pdf.provider = 'wkhtmltopdf';

    const users = [ids.eligible, ids.empty].filter(Boolean);
    const certificates = await Certificate.findAll({ where: { userId: users } });
    for (const certificate of certificates) {
      await documentStore.remove(certificate.filePath);
    }
    await Certificate.destroy({ where: { userId: users } });
    await TalkRegistration.destroy({ where: { talkId: [ids.talkA, ids.talkB].filter(Boolean) } });
    await Talk.destroy({ where: { title: { [Op.like]: 'M7-%' } } });
    await User.destroy({ where: { email: Object.values(EMAILS) } });
  });

  it('calcula elegibilidad por número de ponencias', async () => {
    const res = await authGet('/api/certificates/eligibility', eligibleToken);

    expect(res.status).toBe(200);
    expect(res.body.eligible).toBe(true);
    expect(res.body.talksCount).toBe(2);
    expect(res.body.hoursTotal).toBe(1.5);
    expect(res.body.metric).toBe('talks');
  });

  it('marca como no elegible a quien no tiene asistencia', async () => {
    const eligibility = await authGet('/api/certificates/eligibility', emptyToken);
    expect(eligibility.body.eligible).toBe(false);
    expect(eligibility.body.talksCount).toBe(0);

    const issue = await authPost('/api/certificates', emptyToken, {});
    expect(issue.status).toBe(409);
    expect(issue.body.error.code).toBe('NOT_ELIGIBLE');
  });

  it('respeta la métrica por horas configurable', async () => {
    await Setting.upsert({ key: 'certificate.metric', value: JSON.stringify('hours') });
    await Setting.upsert({ key: 'certificate.minHours', value: JSON.stringify(2) });

    const notEnough = await authGet('/api/certificates/eligibility', eligibleToken);
    expect(notEnough.body.eligible).toBe(false);
    expect(notEnough.body.metric).toBe('hours');

    await Setting.upsert({ key: 'certificate.minHours', value: JSON.stringify(1) });
    const enough = await authGet('/api/certificates/eligibility', eligibleToken);
    expect(enough.body.eligible).toBe(true);

    await Setting.upsert({ key: 'certificate.metric', value: JSON.stringify('talks') });
    await Setting.upsert({ key: 'certificate.minHours', value: JSON.stringify(0) });
  });

  it('emite la constancia, guarda el PDF y envía el correo con adjunto', async () => {
    const issued = await authPost('/api/certificates', eligibleToken, { sendEmail: true });

    expect(issued.status).toBe(201);
    expect(issued.body.code).toMatch(/^TD-\d{4}-[0-9A-F]{8}$/);
    expect(issued.body.talksCount).toBe(2);
    expect(issued.body.hoursTotal).toBe(1.5);
    expect(issued.body.downloadUrl).toBe(`/api/certificates/${issued.body.id}/download`);
    ids.certificate = issued.body.id;
    ids.code = issued.body.code;

    const stored = await Certificate.findOne({ where: { userId: ids.eligible } });
    expect(stored).toBeTruthy();
    expect(await documentStore.exists(stored.filePath)).toBe(true);

    const mail = sentMails.at(-1);
    expect(mail.to).toBe(EMAILS.eligible);
    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments[0].contentType).toBe('application/pdf');
    expect(Buffer.isBuffer(mail.attachments[0].content)).toBe(true);
  });

  it('permite descargar el PDF al propietario y bloquea a terceros', async () => {
    const forbidden = await authGet(`/api/certificates/${ids.certificate}/download`, emptyToken);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/certificates/${ids.certificate}/download`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .buffer(true)
      .parse(parsePdf);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['content-type']).toContain('application/pdf');
    expect(allowed.headers['content-disposition']).toContain('.pdf');
    expect(allowed.body.slice(0, 5).toString()).toBe('%PDF-');

    const admin = await request(app)
      .get(`/api/certificates/${ids.certificate}/download`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(parsePdf);
    expect(admin.status).toBe(200);

    const mine = await authGet('/api/certificates/me', eligibleToken);
    expect(mine.status).toBe(200);
    expect(mine.body.code).toBe(ids.code);
  });

  it('permite verificar la constancia por su código público', async () => {
    const res = await request(app).get(`/api/certificates/verify/${ids.code}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.holder).toBe('M7-eligible Asistente');
    expect(res.body.talksCount).toBe(2);

    const missing = await request(app).get('/api/certificates/verify/TD-0000-XXXXXXXX');
    expect(missing.status).toBe(404);
  });

  it('reexpide la constancia reemplazando el archivo anterior', async () => {
    const previous = await Certificate.findOne({ where: { userId: ids.eligible } });
    const previousFile = previous.filePath;
    const previousCode = previous.code;

    const reissued = await authPost('/api/certificates', eligibleToken, { sendEmail: false });
    expect(reissued.status).toBe(201);
    expect(reissued.body.id).toBe(ids.certificate);
    expect(reissued.body.code).not.toBe(previousCode);
    expect(await documentStore.exists(previousFile)).toBe(false);

    const count = await Certificate.count({ where: { userId: ids.eligible } });
    expect(count).toBe(1);
  });

  it('permite a los organizadores emitir constancias para otros usuarios y listarlas', async () => {
    const issued = await authPost(`/api/certificates/users/${ids.eligible}`, adminToken, {
      sendEmail: false,
    });
    expect(issued.status).toBe(201);
    expect(issued.body.userId).toBe(ids.eligible);

    const list = await authGet('/api/certificates?pageSize=50', adminToken);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    const found = list.body.data.find((item) => item.user.email === EMAILS.eligible);
    expect(found).toBeTruthy();
  });
});
