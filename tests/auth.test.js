import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { isDatabaseUp } from '../src/config/database.js';

const app = createApp();
const dbUp = await isDatabaseUp();

const ADMIN = {
  email: 'admin@tecnologiadigital.dev',
  password: 'Admin123!',
};

describe.skipIf(!dbUp)('Auth API (integración)', () => {
  it('inicia sesión y devuelve un par de tokens', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ADMIN.email);
    expect(res.body.user.role.name).toBe('admin');
    expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.tokens.refreshToken).toEqual(expect.any(String));
    expect(res.body.tokens.tokenType).toBe('Bearer');
  });

  it('rechaza credenciales inválidas con 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ ...ADMIN, password: 'contraseña-incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('valida el cuerpo de entrada con 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-es-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rota el refresh token y rechaza su reutilización', async () => {
    const login = await request(app).post('/api/auth/login').send(ADMIN);
    const { refreshToken } = login.body.tokens;

    const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.tokens.accessToken).toEqual(expect.any(String));

    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });

  it('exige autenticación para cerrar sesión', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(401);
  });
});
