/** Pruebas de API: inicio de sesión (RF-02, RNF-04). */
import { describe, expect, it } from 'vitest';
import { STRONG_PASSWORD, api, registerUser, sessionCookieHeader } from './helpers';

const login = (email: string, password: string) =>
  api().post('/api/auth/login').send({ email, password });

describe('TC-API-LOG: POST /api/auth/login', () => {
  it('TC-API-LOG-01 con credenciales correctas responde 200 y entrega la cookie de sesión', async () => {
    await registerUser();
    const res = await login('ana@mail.com', STRONG_PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@mail.com');
    expect(sessionCookieHeader(res)).toMatch(/HttpOnly/i);
  });

  it('TC-API-LOG-02 con contraseña incorrecta responde 401 y NO entrega cookie', async () => {
    await registerUser();
    const res = await login('ana@mail.com', 'Incorrecta#123');

    expect(res.status).toBe(401);
    expect(sessionCookieHeader(res)).toBeUndefined();
  });

  it('TC-API-LOG-03 un correo inexistente da EXACTAMENTE la misma respuesta que una contraseña incorrecta', async () => {
    await registerUser();
    const wrongPassword = await login('ana@mail.com', 'Incorrecta#123');
    const unknownEmail = await login('nadie@mail.com', 'Incorrecta#123');

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(unknownEmail.body.error.message).toBe('Correo o contraseña incorrectos');
  });

  it('TC-API-LOG-04 el correo no distingue mayúsculas ni espacios', async () => {
    await registerUser();
    const res = await login('  ANA@Mail.com ', STRONG_PASSWORD);

    expect(res.status).toBe(200);
  });

  it('TC-API-LOG-05 acepta contraseñas anteriores a la política (el login no la exige)', async () => {
    const { prisma } = await import('../src/lib/prisma');
    const { hashPassword } = await import('../src/lib/password');
    await prisma.user.create({
      data: {
        name: 'Vieja',
        email: 'vieja@mail.com',
        passwordHash: await hashPassword('clave-antigua-1'),
      },
    });

    const res = await login('vieja@mail.com', 'clave-antigua-1');

    expect(res.status).toBe(200);
  });

  it('TC-API-LOG-06 rechaza con 400 un cuerpo sin contraseña', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'ana@mail.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.password).toBeDefined();
  });

  it('TC-API-LOG-07 un intento de inyección SQL como contraseña no inicia sesión', async () => {
    await registerUser();
    const res = await login('ana@mail.com', "' OR '1'='1");

    expect(res.status).toBe(401);
  });

  it('TC-API-LOG-08 un intento de inyección en el correo se rechaza', async () => {
    const res = await login("admin@mail.com' --", 'cualquiera');

    expect(res.status).toBe(400);
  });
});
