/** Pruebas de API: registro de cuentas (RF-01, RN-03, RN-11, RNF-04, RNF-05). */
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import {
  STRONG_PASSWORD,
  api,
  registerUser,
  sessionCookieHeader,
  validRegistration,
} from './helpers';

describe('TC-API-REG: POST /api/auth/register', () => {
  it('TC-API-REG-01 crea la cuenta y responde 201 con los datos públicos', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: 'Ana',
      email: 'ana@mail.com',
      timezone: 'America/Lima',
      theme: 'LIGHT',
    });
    expect(res.body.user.id).toEqual(expect.any(String));
  });

  it('TC-API-REG-02 NUNCA devuelve la contraseña ni su hash', async () => {
    const res = await registerUser();

    expect(JSON.stringify(res.body)).not.toMatch(/password|hash|argon2/i);
  });

  it('TC-API-REG-03 guarda la contraseña con Argon2id, nunca en texto plano', async () => {
    await registerUser();

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@mail.com' } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain(STRONG_PASSWORD);
  });

  it('TC-API-REG-04 entrega la sesión en una cookie HttpOnly con SameSite=Lax', async () => {
    const cookie = sessionCookieHeader(await registerUser());

    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
  });

  it('TC-API-REG-05 normaliza el correo antes de guardarlo (minúsculas y sin espacios)', async () => {
    const res = await registerUser({ email: '  ANA@Mail.COM ' });

    expect(res.body.user.email).toBe('ana@mail.com');
  });

  it('TC-API-REG-06 rechaza un correo repetido con 409, aunque cambien las mayúsculas', async () => {
    await registerUser();
    const res = await registerUser({ email: 'ANA@MAIL.COM', name: 'Otra Ana' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Ya existe una cuenta con ese correo');
    expect(await prisma.user.count()).toBe(1);
  });

  it.each([
    ['TC-API-REG-07', 'Corta1!a', 'al menos 10 caracteres'],
    ['TC-API-REG-08', 'SINMINUSCULA1!AAAA', 'letra minúscula'],
    ['TC-API-REG-09', 'sinmayuscula1!aaaa', 'letra mayúscula'],
    ['TC-API-REG-10', 'SinNumeroAqui!!!!', 'un número'],
    ['TC-API-REG-11', 'SinEspecial12345Aa', 'carácter especial'],
  ])('%s rechaza con 400 una contraseña que incumple: %s', async (_id, password, expected) => {
    const res = await registerUser({ password });

    expect(res.status).toBe(400);
    expect(res.body.error.details.password[0]).toContain(expected);
    expect(await prisma.user.count()).toBe(0);
  });

  it('TC-API-REG-12 rechaza un correo inválido y un nombre vacío con mensajes en español', async () => {
    const res = await registerUser({ email: 'no-es-correo', name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.email).toContain('Ingresa un correo válido');
    expect(res.body.error.details.name).toContain('El nombre es obligatorio');
  });

  it('TC-API-REG-13 un cuerpo vacío devuelve 400 con un mensaje por cada campo obligatorio', async () => {
    const res = await api().post('/api/auth/register').send({});

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['email', 'name', 'password']);
  });

  it('TC-API-REG-14 ignora campos que el cliente no debería poder fijar (id, fechas, tema)', async () => {
    const forcedId = '11111111-1111-4111-8111-111111111111';
    const res = await registerUser({
      id: forcedId,
      theme: 'DARK',
      createdAt: '2000-01-01T00:00:00Z',
      passwordHash: 'x',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.id).not.toBe(forcedId);
    expect(res.body.user.theme).toBe('LIGHT');
  });

  it('TC-API-REG-15 un intento de inyección SQL en el correo se rechaza y no altera los datos', async () => {
    await registerUser();
    const res = await registerUser({ email: "' OR 1=1; DROP TABLE users; --" });

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(1);
  });

  it('TC-API-REG-16 guarda un nombre con HTML como texto plano, sin interpretarlo', async () => {
    const res = await registerUser({ name: '<script>alert(1)</script>' });

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.user.name).toBe('<script>alert(1)</script>');
  });

  it('TC-API-REG-17 rechaza una petición de más de 10 KB con 413', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send(validRegistration({ name: 'a'.repeat(20_000) }));

    expect(res.status).toBe(413);
  });

  it('TC-API-REG-18 rechaza un JSON mal formado con 400, no con 500', async () => {
    const res = await api()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": "Ana", ');

    expect(res.status).toBe(400);
  });
});
