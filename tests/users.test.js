import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { Op } from 'sequelize';
import { createApp } from '../src/app.js';
import { isDatabaseUp } from '../src/config/database.js';
import { User, TOKEN_TYPES } from '../src/db/models/index.js';
import { issueUserToken } from '../src/services/token.service.js';

const app = createApp();
const dbUp = await isDatabaseUp();

const suffix = Date.now();
const email = `m2-test-${suffix}@example.com`;
const password = 'Password123!';
const newPassword = 'NuevaPass123!';

const ADMIN = { email: 'admin@tecnologiadigital.dev', password: 'Admin123!' };

afterAll(async () => {
  await User.destroy({ where: { email: { [Op.like]: 'm2-temp-%@example.com' } } });
  await User.destroy({ where: { email } });
});

describe.skipIf(!dbUp)('Registro y verificación de cuenta', () => {
  it('registra un usuario como asistente pendiente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', lastName: 'User', email, password });

    expect(res.status).toBe(201);
    expect(res.body.user.status).toBe('pending');
  });

  it('impide el login antes de verificar el correo', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_ACTIVE');
  });

  it('rechaza el registro de un correo duplicado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', lastName: 'User', email, password });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('verifica el correo y habilita el login', async () => {
    const user = await User.findOne({ where: { email } });
    const token = await issueUserToken(user.id, TOKEN_TYPES.emailVerification, 60_000);

    const verify = await request(app).post('/api/auth/verify-email').send({ token });
    expect(verify.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.user.status).toBe('active');
  });

  it('rechaza la reutilización de un token de verificación', async () => {
    const user = await User.findOne({ where: { email } });
    const token = await issueUserToken(user.id, TOKEN_TYPES.emailVerification, 60_000);

    await request(app).post('/api/auth/verify-email').send({ token });
    const reuse = await request(app).post('/api/auth/verify-email').send({ token });

    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('TOKEN_ALREADY_USED');
  });

  it('recupera la contraseña mediante forgot + reset', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);

    const user = await User.findOne({ where: { email } });
    const token = await issueUserToken(user.id, TOKEN_TYPES.passwordReset, 60_000);

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: newPassword });
    expect(reset.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email, password: newPassword });
    expect(login.status).toBe(200);
  });

  it('no revela si un correo existe en forgot-password', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'no-existe@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe.skipIf(!dbUp)('Perfil y administración de usuarios', () => {
  it('permite consultar y editar el propio perfil', async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN);
    const accessToken = login.body.tokens.accessToken;

    const me = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toContain('@');

    const patched = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: '555-0100' });
    expect(patched.status).toBe(200);
    expect(patched.body.phone).toBe('555-0100');
  });

  it('permite al admin listar usuarios con paginación', async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN);
    const res = await request(app)
      .get('/api/users?page=1&pageSize=5')
      .set('Authorization', `Bearer ${login.body.tokens.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 5 });
  });

  it('prohíbe el listado a usuarios sin rol admin', async () => {
    const adminLogin = await request(app).post('/api/auth/login').send(ADMIN);
    const tempEmail = `m2-temp-forbidden-${Date.now()}@example.com`;
    const tempPassword = 'Asistente123!';

    await request(app)
      .post('/api/users')
      .set({ Authorization: `Bearer ${adminLogin.body.tokens.accessToken}` })
      .send({
        name: 'Asistente',
        lastName: 'Prueba',
        email: tempEmail,
        password: tempPassword,
        role: 'asistente',
      });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: tempEmail, password: tempPassword });
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.tokens.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('permite al admin crear, desactivar y eliminar un usuario', async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN);
    const auth = { Authorization: `Bearer ${login.body.tokens.accessToken}` };
    const tempEmail = `m2-temp-${Date.now()}@example.com`;

    const created = await request(app).post('/api/users').set(auth).send({
      name: 'Temp',
      lastName: 'User',
      email: tempEmail,
      password: 'TempPass123!',
      role: 'ponente',
    });
    expect(created.status).toBe(201);
    expect(created.body.role.name).toBe('ponente');
    const id = created.body.id;

    const deactivated = await request(app)
      .patch(`/api/users/${id}/status`)
      .set(auth)
      .send({ status: 'inactive' });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.status).toBe('inactive');

    const removed = await request(app).delete(`/api/users/${id}`).set(auth);
    expect(removed.status).toBe(200);
    expect(removed.body.success).toBe(true);
  });

  it('impide que el admin se elimine a sí mismo', async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN);
    const me = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${login.body.tokens.accessToken}`);

    const res = await request(app)
      .delete(`/api/users/${me.body.id}`)
      .set('Authorization', `Bearer ${login.body.tokens.accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_DELETE_SELF');
  });
});
