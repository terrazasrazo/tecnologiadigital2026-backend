import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Op } from 'sequelize';
import { createApp } from '../src/app.js';
import { isDatabaseUp } from '../src/config/database.js';
import { Talk, User } from '../src/db/models/index.js';

const app = createApp();
const dbUp = await isDatabaseUp();

const ADMIN = { email: 'admin@tecnologiadigital.dev', password: 'Admin123!' };

let adminToken;
let attendeeToken;
const ids = {};

async function authPost(path, token, body) {
  return request(app).post(path).set('Authorization', `Bearer ${token}`).send(body);
}

function currentTalkTimes() {
  const end = new Date(Date.now() + 5 * 60_000);
  const start = new Date(end.getTime() - 10 * 60_000);
  const date = end.toISOString().slice(0, 10);
  const sameDay = start.toISOString().slice(0, 10) === date;
  return {
    date,
    startTime: sameDay ? start.toISOString().slice(11, 16) : '00:00',
    endTime: end.toISOString().slice(11, 16),
  };
}

describe.skipIf(!dbUp)('Asistencia y QR (M5)', () => {
  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN);
    adminToken = login.body.tokens.accessToken;

    const location = await authPost('/api/locations', adminToken, { name: 'M5-Aula' });
    ids.location = location.body.id;

    const attendee = await authPost('/api/users', adminToken, {
      name: 'M5',
      lastName: 'Asistente',
      email: 'm5-asistente@example.com',
      password: 'Asistente123!',
      role: 'asistente',
    });
    ids.attendee = attendee.body.id;

    const attendeeLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'm5-asistente@example.com', password: 'Asistente123!' });
    attendeeToken = attendeeLogin.body.tokens.accessToken;

    const open = await authPost('/api/talks', adminToken, {
      title: 'M5-Ponencia Abierta',
      ...currentTalkTimes(),
      locationId: ids.location,
    });
    ids.open = open.body.id;

    const future = await authPost('/api/talks', adminToken, {
      title: 'M5-Ponencia Futura',
      date: '2030-09-09',
      startTime: '10:00',
      endTime: '11:00',
    });
    ids.future = future.body.id;

    const past = await authPost('/api/talks', adminToken, {
      title: 'M5-Ponencia Pasada',
      date: '2020-01-01',
      startTime: '10:00',
      endTime: '11:00',
    });
    ids.past = past.body.id;
  });

  afterAll(async () => {
    const talks = await Talk.findAll({ where: { title: { [Op.like]: 'M5-%' } } });
    for (const talk of talks) {
      await request(app)
        .delete(`/api/talks/${talk.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    if (ids.location) {
      await request(app)
        .delete(`/api/locations/${ids.location}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    await User.destroy({ where: { email: 'm5-asistente@example.com' } });
  });

  it('calcula la ventana de asistencia por defecto (fin -20min / +10min)', async () => {
    const res = await request(app).get(`/api/talks/${ids.future}`);

    expect(res.status).toBe(200);
    const { opensAt, closesAt, isOpen } = res.body.attendanceWindow;
    const expectedEnd = Date.parse('2030-09-09T11:00:00Z');
    expect(Date.parse(opensAt)).toBe(expectedEnd - 20 * 60_000);
    expect(Date.parse(closesAt)).toBe(expectedEnd + 10 * 60_000);
    expect(isOpen).toBe(false);
  });

  it('permite inscribirse, evita duplicados y permite cancelar', async () => {
    const created = await authPost(`/api/attendance/talks/${ids.open}/register`, attendeeToken, {});
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('registered');

    const duplicate = await authPost(
      `/api/attendance/talks/${ids.open}/register`,
      attendeeToken,
      {},
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('ALREADY_REGISTERED');

    const cancelled = await request(app)
      .delete(`/api/attendance/talks/${ids.open}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`);
    expect(cancelled.status).toBe(200);

    const reRegistered = await authPost(
      `/api/attendance/talks/${ids.open}/register`,
      attendeeToken,
      {},
    );
    expect(reRegistered.status).toBe(201);
  });

  it('lista las inscripciones del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/attendance/me')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    const registration = res.body.data.find((item) => item.talkId === ids.open);
    expect(registration).toBeDefined();
    expect(registration.talk.title).toBe('M5-Ponencia Abierta');
  });

  it('genera el token QR (solo organizadores) y rechaza a asistentes', async () => {
    const forbidden = await request(app)
      .get(`/api/attendance/talks/${ids.open}/qr`)
      .set('Authorization', `Bearer ${attendeeToken}`);
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .get(`/api/attendance/talks/${ids.open}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    ids.qrToken = res.body.token;
  });

  it('registra la asistencia dentro de la ventana y es idempotente', async () => {
    const res = await authPost(`/api/attendance/talks/${ids.open}/checkin`, attendeeToken, {
      token: ids.qrToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.alreadyAttended).toBe(false);
    expect(res.body.registration.status).toBe('attended');
    expect(res.body.registration.attendedAt).toBeTruthy();

    const again = await authPost(`/api/attendance/talks/${ids.open}/checkin`, attendeeToken, {
      token: ids.qrToken,
    });
    expect(again.status).toBe(200);
    expect(again.body.alreadyAttended).toBe(true);
  });

  it('rechaza un código QR inválido', async () => {
    const res = await authPost(`/api/attendance/talks/${ids.open}/checkin`, attendeeToken, {
      token: 'no-es-un-token',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QR');
  });

  it('rechaza el registro fuera de la ventana (aún no abierta y ya cerrada)', async () => {
    const futureQr = await request(app)
      .get(`/api/attendance/talks/${ids.future}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);
    const pastQr = await request(app)
      .get(`/api/attendance/talks/${ids.past}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    const notOpen = await authPost(`/api/attendance/talks/${ids.future}/checkin`, attendeeToken, {
      token: futureQr.body.token,
    });
    expect(notOpen.status).toBe(409);
    expect(notOpen.body.error.code).toBe('ATTENDANCE_NOT_OPEN');

    const closed = await authPost(`/api/attendance/talks/${ids.past}/checkin`, attendeeToken, {
      token: pastQr.body.token,
    });
    expect(closed.status).toBe(409);
    expect(closed.body.error.code).toBe('ATTENDANCE_CLOSED');
  });

  it('lista inscritos con su usuario y no permite cancelar una asistencia', async () => {
    const list = await request(app)
      .get(`/api/attendance/talks/${ids.open}/registrations`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(list.status).toBe(200);
    const registration = list.body.data.find((item) => item.userId === ids.attendee);
    expect(registration.user.email).toBe('m5-asistente@example.com');
    expect(registration.status).toBe('attended');

    const cancel = await request(app)
      .delete(`/api/attendance/talks/${ids.open}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`);
    expect(cancel.status).toBe(409);
    expect(cancel.body.error.code).toBe('CANNOT_CANCEL_ATTENDED');
  });

  it('permite marcar asistencia manualmente', async () => {
    const res = await authPost(`/api/attendance/talks/${ids.future}/attendance`, adminToken, {
      userId: ids.attendee,
      attended: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('attended');
    expect(res.body.userId).toBe(ids.attendee);
  });
});
