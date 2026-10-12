import { describe, it, expect } from 'vitest';
import { authenticate } from '../src/middlewares/auth.js';
import { authorize } from '../src/middlewares/rbac.js';
import { signAccessToken } from '../src/utils/jwt.js';

const run = (middleware, req) =>
  new Promise((resolve) => middleware(req, {}, (error) => resolve(error)));

describe('middleware authenticate', () => {
  it('rechaza peticiones sin encabezado Authorization', async () => {
    const error = await run(authenticate, { headers: {} });
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('rechaza tokens inválidos', async () => {
    const error = await run(authenticate, { headers: { authorization: 'Bearer token.falso' } });
    expect(error.statusCode).toBe(401);
  });

  it('acepta un access token válido y expone el usuario', async () => {
    const token = signAccessToken({ sub: 1, email: 'a@b.com', role: 'admin' });
    const req = { headers: { authorization: `Bearer ${token}` } };

    const error = await run(authenticate, req);

    expect(error).toBeUndefined();
    expect(req.user).toMatchObject({ id: 1, email: 'a@b.com', role: 'admin' });
  });
});

describe('middleware authorize', () => {
  it('rechaza cuando falta el usuario', async () => {
    const error = await run(authorize('admin'), {});
    expect(error.statusCode).toBe(401);
  });

  it('rechaza un rol no permitido', async () => {
    const error = await run(authorize('admin'), { user: { role: 'asistente' } });
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('permite un rol autorizado', async () => {
    const error = await run(authorize('admin', 'organizador'), { user: { role: 'organizador' } });
    expect(error).toBeUndefined();
  });
});
