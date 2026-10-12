import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { Op } from 'sequelize';
import { createApp } from '../src/app.js';
import { isDatabaseUp } from '../src/config/database.js';
import { User, Speaker } from '../src/db/models/index.js';

const app = createApp();
const dbUp = await isDatabaseUp();

const suffix = Date.now();
const ADMIN = { email: 'admin@tecnologiadigital.dev', password: 'Admin123!' };

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(PNG_BASE64, 'base64');

async function loginAs(credentials) {
  const res = await request(app).post('/api/auth/login').send(credentials);
  return res.body.tokens.accessToken;
}

async function createUser(adminToken, overrides) {
  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(overrides);
  return res.body;
}

afterAll(async () => {
  await Speaker.destroy({ where: { name: { [Op.like]: 'M3-%' } } });
  await User.destroy({ where: { email: { [Op.like]: 'm3-%@example.com' } } });
});

describe.skipIf(!dbUp)('Ponentes (M3)', () => {
  let adminToken;

  it('obtiene el token de administrador', async () => {
    adminToken = await loginAs(ADMIN);
    expect(typeof adminToken).toBe('string');
  });

  it('crea un ponente con fotografía', async () => {
    const res = await request(app)
      .post('/api/speakers')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'M3-Ponente Uno')
      .field('academicDegree', 'Dra.')
      .field('institution', 'Universidad de Prueba')
      .field('bio', 'Semblanza de prueba.')
      .attach('photo', pngBuffer, { filename: 'foto.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('M3-Ponente Uno');
    expect(res.body.photoUrl).toMatch(/^\/uploads\/speakers\/[a-f0-9]+\.png$/);

    const photo = await request(app).get(res.body.photoUrl);
    expect(photo.status).toBe(200);
    expect(photo.headers['content-type']).toContain('image/png');
  });

  it('rechaza un formato de archivo no permitido', async () => {
    const res = await request(app)
      .post('/api/speakers')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'M3-Archivo Invalido')
      .attach('photo', Buffer.from('no soy imagen'), {
        filename: 'archivo.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('lista y busca ponentes públicamente', async () => {
    const res = await request(app).get('/api/speakers?search=M3-Ponente');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((speaker) => speaker.name === 'M3-Ponente Uno')).toBe(true);
  });

  it('actualiza un ponente y posteriormente elimina su fotografía', async () => {
    const list = await request(app).get('/api/speakers?search=M3-Ponente');
    const speaker = list.body.data.find((item) => item.name === 'M3-Ponente Uno');

    const updated = await request(app)
      .patch(`/api/speakers/${speaker.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ institution: 'Otra Universidad' });
    expect(updated.status).toBe(200);
    expect(updated.body.institution).toBe('Otra Universidad');

    const removed = await request(app)
      .delete(`/api/speakers/${speaker.id}/photo`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(200);
    expect(removed.body.photoUrl).toBeNull();
  });

  it('permite que un ponente edite su propio perfil y no el de otros', async () => {
    const ponenteUser = await createUser(adminToken, {
      name: 'M3',
      lastName: 'Ponente',
      email: `m3-ponente-${suffix}@example.com`,
      password: 'Ponente123!',
      role: 'ponente',
    });

    const own = await request(app)
      .post('/api/speakers')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'M3-Perfil Propio')
      .field('userId', String(ponenteUser.id));
    expect(own.status).toBe(201);

    const other = await request(app)
      .post('/api/speakers')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'M3-Perfil Ajeno');
    expect(other.status).toBe(201);
    await request(app)
      .patch(`/api/speakers/${other.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const ponenteToken = await loginAs({
      email: `m3-ponente-${suffix}@example.com`,
      password: 'Ponente123!',
    });

    const editOwn = await request(app)
      .patch(`/api/speakers/${own.body.id}`)
      .set('Authorization', `Bearer ${ponenteToken}`)
      .send({ bio: 'Actualicé mi propia semblanza.' });
    expect(editOwn.status).toBe(200);

    const editOther = await request(app)
      .patch(`/api/speakers/${other.body.id}`)
      .set('Authorization', `Bearer ${ponenteToken}`)
      .send({ bio: 'Intento no permitido.' });
    expect(editOther.status).toBe(403);
    expect(editOther.body.error.code).toBe('FORBIDDEN');
  });

  it('prohíbe crear ponentes a usuarios sin rol de gestión', async () => {
    await createUser(adminToken, {
      name: 'M3',
      lastName: 'Asistente',
      email: `m3-asistente-${suffix}@example.com`,
      password: 'Asistente123!',
      role: 'asistente',
    });
    const assistantToken = await loginAs({
      email: `m3-asistente-${suffix}@example.com`,
      password: 'Asistente123!',
    });

    const res = await request(app)
      .post('/api/speakers')
      .set('Authorization', `Bearer ${assistantToken}`)
      .field('name', 'M3-No Permitido');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
