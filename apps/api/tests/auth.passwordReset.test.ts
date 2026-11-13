/** Pruebas de API: recuperación de contraseña (RF-33, RN-11, RNF-04). */
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPasswordResetEmail } from '../src/lib/mailer';
import { prisma } from '../src/lib/prisma';
import { STRONG_PASSWORD, api, registerUser } from './helpers';

// No se envía ningún correo de verdad: el correo "enviado" queda registrado para inspeccionarlo.
vi.mock('../src/lib/mailer', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));
const sentEmails = () => vi.mocked(sendPasswordResetEmail).mock.calls.map(([email]) => email);
const lastToken = () => new URL(sentEmails().at(-1)!.link).searchParams.get('token')!;

const forgot = (email: string) => api().post('/api/auth/forgot-password').send({ email });
const reset = (token: string, password: string) =>
  api().post('/api/auth/reset-password').send({ token, password });
const login = (email: string, password: string) =>
  api().post('/api/auth/login').send({ email, password });

beforeEach(() => vi.mocked(sendPasswordResetEmail).mockClear());

describe('TC-API-RST: solicitar el enlace (POST /api/auth/forgot-password)', () => {
  it('TC-API-RST-01 un correo registrado recibe el enlace y la API responde 200', async () => {
    await registerUser();
    const res = await forgot('ana@mail.com');

    expect(res.status).toBe(200);
    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0]).toMatchObject({ to: 'ana@mail.com', name: 'Ana', minutesValid: 30 });
    expect(sentEmails()[0]!.link).toMatch(/\/restablecer\?token=[A-Za-z0-9_-]{40,}$/);
  });

  it('TC-API-RST-02 un correo NO registrado recibe la misma respuesta, pero no se envía nada', async () => {
    await registerUser();
    const known = await forgot('ana@mail.com');
    vi.mocked(sendPasswordResetEmail).mockClear();
    const unknown = await forgot('nadie@mail.com');

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body); // nadie puede averiguar qué correos existen
    expect(sentEmails()).toHaveLength(0);
  });

  it('TC-API-RST-03 en la base solo se guarda el HASH del token, nunca el token', async () => {
    await registerUser();
    await forgot('ana@mail.com');
    const token = lastToken();

    const rows = await prisma.passwordResetToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(rows[0]!.tokenHash).not.toBe(token);
  });

  it('TC-API-RST-04 el enlace vence a los 30 minutos', async () => {
    await registerUser();
    await forgot('ana@mail.com');

    const [row] = await prisma.passwordResetToken.findMany();
    const minutes = (row!.expiresAt.getTime() - row!.createdAt.getTime()) / 60_000;
    expect(minutes).toBeGreaterThan(29.9);
    expect(minutes).toBeLessThan(30.1);
  });

  it('TC-API-RST-05 un enlace nuevo invalida el anterior (solo sirve el último)', async () => {
    await registerUser();
    await forgot('ana@mail.com');
    const first = lastToken();
    await forgot('ana@mail.com');
    const second = lastToken();

    expect(await prisma.passwordResetToken.count()).toBe(1);
    expect((await reset(first, 'Nueva-Clave#22')).status).toBe(400);
    expect((await reset(second, 'Nueva-Clave#22')).status).toBe(200);
  });

  it('TC-API-RST-06 valida el formato del correo', async () => {
    const res = await forgot('no-es-correo');

    expect(res.status).toBe(400);
    expect(res.body.error.details.email).toBeDefined();
  });

  it('TC-API-RST-07 si falla el envío del correo, el visitante recibe igual la respuesta genérica', async () => {
    await registerUser();
    vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error('SMTP caído'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await forgot('ana@mail.com');

    expect(res.status).toBe(200);
  });
});

describe('TC-API-RST: usar el enlace (POST /api/auth/reset-password)', () => {
  it('TC-API-RST-08 cambia la contraseña: la anterior deja de servir y la nueva funciona', async () => {
    await registerUser();
    await forgot('ana@mail.com');

    const res = await reset(lastToken(), 'Nueva-Clave#22');

    expect(res.status).toBe(200);
    expect((await login('ana@mail.com', STRONG_PASSWORD)).status).toBe(401);
    expect((await login('ana@mail.com', 'Nueva-Clave#22')).status).toBe(200);
  });

  it('TC-API-RST-09 la contraseña nueva se guarda con Argon2id', async () => {
    await registerUser();
    await forgot('ana@mail.com');
    await reset(lastToken(), 'Nueva-Clave#22');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@mail.com' } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('TC-API-RST-10 el enlace sirve UNA sola vez', async () => {
    await registerUser();
    await forgot('ana@mail.com');
    const token = lastToken();

    expect((await reset(token, 'Nueva-Clave#22')).status).toBe(200);
    const second = await reset(token, 'Otra-Clave#333');

    expect(second.status).toBe(400);
    expect(second.body.error.message).toBe(
      'El enlace no es válido o ya expiró. Solicita uno nuevo',
    );
    expect((await login('ana@mail.com', 'Otra-Clave#333')).status).toBe(401);
  });

  it('TC-API-RST-11 un enlace vencido se rechaza', async () => {
    await registerUser();
    await forgot('ana@mail.com');
    await prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    expect((await reset(lastToken(), 'Nueva-Clave#22')).status).toBe(400);
    expect((await login('ana@mail.com', STRONG_PASSWORD)).status).toBe(200); // la contraseña no cambió
  });

  it('TC-API-RST-12 un token inventado se rechaza', async () => {
    const res = await reset('inventado'.repeat(6), 'Nueva-Clave#22');

    expect(res.status).toBe(400);
  });

  it('TC-API-RST-13 una contraseña débil se rechaza y el enlace NO se gasta', async () => {
    await registerUser();
    await forgot('ana@mail.com');
    const token = lastToken();

    const weak = await reset(token, 'debil');
    expect(weak.status).toBe(400);
    expect(weak.body.error.details.password).toBeDefined();
    expect((await reset(token, 'Nueva-Clave#22')).status).toBe(200); // sigue sirviendo
  });

  it('TC-API-RST-14 dos peticiones simultáneas con el mismo enlace: solo una tiene éxito', async () => {
    await registerUser();
    await forgot('ana@mail.com');
    const token = lastToken();

    const [a, b] = await Promise.all([
      reset(token, 'Clave-Uno#1111'),
      reset(token, 'Clave-Dos#2222'),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 400]);
  });

  it('TC-API-RST-15 cambiar la contraseña de Ana no afecta a otra cuenta', async () => {
    await registerUser({ email: 'ana@mail.com' });
    await registerUser({ email: 'luis@mail.com', name: 'Luis' });
    await forgot('ana@mail.com');
    await reset(lastToken(), 'Nueva-Clave#22');

    expect((await login('luis@mail.com', STRONG_PASSWORD)).status).toBe(200);
  });
});
