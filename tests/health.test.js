import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /health', () => {
  it('responde 200 con el estado del servicio', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      env: expect.any(String),
    });
    expect(typeof res.body.uptime).toBe('number');
    expect(['up', 'down']).toContain(res.body.db);
  });
});

describe('Rutas no encontradas', () => {
  it('responde 404 para rutas inexistentes', async () => {
    const res = await request(app).get('/api/ruta-inexistente');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
