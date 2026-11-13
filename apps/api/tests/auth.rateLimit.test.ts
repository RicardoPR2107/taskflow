/** Pruebas de API: protección contra intentos repetidos (RNF-04). Archivo aparte porque los contadores acumulan por aplicación. */
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { STRONG_PASSWORD, registerUser } from './helpers';

vi.mock('../src/lib/mailer', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('TC-API-RL: límites de intentos', () => {
  it('TC-API-RL-01 tras 10 intentos de login fallidos, el 11.º recibe 429, incluso con la contraseña correcta', async () => {
    await registerUser();
    const app = createApp(); // una única aplicación: sus contadores acumulan, como en el servidor real
    const wrong = () =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'ana@mail.com', password: 'Incorrecta#123' });

    for (let i = 0; i < 10; i++) expect((await wrong()).status).toBe(401);

    const blocked = await wrong();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/Demasiados intentos/);
    expect(blocked.headers['retry-after']).toBeDefined();

    const correct = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@mail.com', password: STRONG_PASSWORD });
    expect(correct.status).toBe(429);
  });

  it('TC-API-RL-02 los inicios de sesión EXITOSOS no cuentan para el límite', async () => {
    await registerUser();
    const app = createApp();

    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ana@mail.com', password: STRONG_PASSWORD });
      expect(res.status).toBe(200);
    }
  });

  it('TC-API-RL-03 la recuperación de contraseña admite 5 solicitudes por tanda; la 6.ª recibe 429', async () => {
    const app = createApp();
    const ask = () =>
      request(app).post('/api/auth/forgot-password').send({ email: 'nadie@mail.com' });

    for (let i = 0; i < 5; i++) expect((await ask()).status).toBe(200);

    expect((await ask()).status).toBe(429);
  });

  it('TC-API-RL-04 el registro admite 20 cuentas por tanda; la 21.ª recibe 429', async () => {
    const app = createApp();
    const create = (n: number) =>
      request(app)
        .post('/api/auth/register')
        .send({ name: 'U', email: `u${n}@mail.com`, password: STRONG_PASSWORD });

    for (let i = 0; i < 20; i++) expect((await create(i)).status).toBe(201);

    expect((await create(99)).status).toBe(429);
  });
});
