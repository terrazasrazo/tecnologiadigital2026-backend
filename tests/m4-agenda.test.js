import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Op } from 'sequelize';
import { createApp } from '../src/app.js';
import { isDatabaseUp } from '../src/config/database.js';
import { Talk, Speaker, User } from '../src/db/models/index.js';

const app = createApp();
const dbUp = await isDatabaseUp();

const ADMIN = { email: 'admin@tecnologiadigital.dev', password: 'Admin123!' };
const DATE = '2030-05-10';

let adminToken;
const ids = {};

async function createLocation(fields) {
  const res = await request(app)
    .post('/api/locations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(fields);
  return res.body.id;
}

async function createTalk(fields) {
  return request(app).post('/api/talks').set('Authorization', `Bearer ${adminToken}`).send(fields);
}

describe.skipIf(!dbUp)('Agenda (M4)', () => {
  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN);
    adminToken = login.body.tokens.accessToken;

    const speakerA = await request(app)
      .post('/api/speakers')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'M4-Ponente Alfa');
    const speakerB = await request(app)
      .post('/api/speakers')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'M4-Ponente Beta');

    ids.speakerA = speakerA.body.id;
    ids.speakerB = speakerB.body.id;
    ids.locationA = await createLocation({ name: 'M4-Auditorio Principal', capacity: 200 });
    ids.locationB = await createLocation({ name: 'M4-Sala Anexa', capacity: 50 });
  });

  afterAll(async () => {
    const talks = await Talk.findAll({ where: { title: { [Op.like]: 'M4-%' } } });
    for (const talk of talks) {
      await request(app)
        .delete(`/api/talks/${talk.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    for (const locationId of [ids.locationA, ids.locationB]) {
      if (locationId) {
        await request(app)
          .delete(`/api/locations/${locationId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    }
    await Speaker.destroy({ where: { name: { [Op.like]: 'M4-%' } } });
    await User.destroy({ where: { email: 'm4-asistente@example.com' } });
  });

  it('crea, lista, actualiza y valida ubicaciones', async () => {
    const created = await createLocation({ name: 'M4-Sala Temporal', capacity: 50 });
    expect(created).toBeDefined();

    const listed = await request(app).get('/api/locations?search=M4-Sala');
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((item) => item.id === created)).toBe(true);

    const updated = await request(app)
      .patch(`/api/locations/${created}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 75 });
    expect(updated.status).toBe(200);
    expect(updated.body.capacity).toBe(75);

    const invalid = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });
    expect(invalid.status).toBe(400);

    const removed = await request(app)
      .delete(`/api/locations/${created}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(200);
  });

  it('crea una ponencia con ubicación y ponentes', async () => {
    const res = await createTalk({
      title: 'M4-Conferencia de Apertura',
      description: 'Ponencia inaugural.',
      date: DATE,
      startTime: '10:00',
      endTime: '11:00',
      locationId: ids.locationA,
      speakerIds: [ids.speakerA, ids.speakerB],
    });

    expect(res.status).toBe(201);
    expect(res.body.durationMinutes).toBe(60);
    expect(res.body.location.id).toBe(ids.locationA);
    expect(res.body.speakers).toHaveLength(2);
    ids.opening = res.body.id;
  });

  it('rechaza un rango de horario inválido', async () => {
    const res = await createTalk({
      title: 'M4-Rango Inválido',
      date: DATE,
      startTime: '12:00',
      endTime: '11:00',
      locationId: ids.locationB,
    });

    expect(res.status).toBe(400);
  });

  it('rechaza ponentes inexistentes', async () => {
    const res = await createTalk({
      title: 'M4-Ponente Inexistente',
      date: DATE,
      startTime: '12:00',
      endTime: '13:00',
      locationId: ids.locationB,
      speakerIds: [999999],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SPEAKER_NOT_FOUND');
  });

  it('detecta conflictos de horario en la misma ubicación', async () => {
    const res = await createTalk({
      title: 'M4-Solape',
      date: DATE,
      startTime: '10:30',
      endTime: '11:30',
      locationId: ids.locationA,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TALK_TIME_CONFLICT');
  });

  it('permite el mismo horario en otra ubicación y las canceladas no bloquean', async () => {
    const other = await createTalk({
      title: 'M4-Simultánea',
      date: DATE,
      startTime: '10:30',
      endTime: '11:30',
      locationId: ids.locationB,
    });
    expect(other.status).toBe(201);

    const cancelled = await createTalk({
      title: 'M4-Cancelada',
      date: DATE,
      startTime: '10:30',
      endTime: '11:30',
      locationId: ids.locationA,
      status: 'cancelled',
    });
    expect(cancelled.status).toBe(201);
  });

  it('lista y filtra ponencias públicamente', async () => {
    const res = await request(app).get(`/api/talks?date=${DATE}`);

    expect(res.status).toBe(200);
    const opening = res.body.data.find((talk) => talk.title === 'M4-Conferencia de Apertura');
    expect(opening).toBeDefined();
    expect(opening.speakers).toHaveLength(2);
    expect(opening.startTime).toBe('10:00:00');
  });

  it('detecta conflictos al actualizar una ponencia', async () => {
    const second = await createTalk({
      title: 'M4-Segunda',
      date: DATE,
      startTime: '12:00',
      endTime: '13:00',
      locationId: ids.locationA,
    });
    expect(second.status).toBe(201);

    const res = await request(app)
      .patch(`/api/talks/${second.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startTime: '10:45', endTime: '11:45' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TALK_TIME_CONFLICT');
  });

  it('prohíbe gestionar ponencias a asistentes', async () => {
    await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({
      name: 'M4',
      lastName: 'Asistente',
      email: 'm4-asistente@example.com',
      password: 'Asistente123!',
      role: 'asistente',
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'm4-asistente@example.com', password: 'Asistente123!' });
    const token = login.body.tokens.accessToken;

    const res = await request(app)
      .post('/api/talks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'M4-No Permitida', date: DATE, startTime: '14:00', endTime: '15:00' });

    expect(res.status).toBe(403);
  });

  it('impide eliminar una ubicación en uso', async () => {
    const res = await request(app)
      .delete(`/api/locations/${ids.locationA}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LOCATION_IN_USE');
  });
});
