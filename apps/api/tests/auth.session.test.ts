/** Pruebas de API: sesión, cierre de sesión y manipulación de tokens (RF-03, RF-06, RNF-04). */
import { SignJWT } from 'jose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, api, cookieValue, registerUser, sessionCookieHeader } from './helpers';

const TEST_SECRET = 'secreto-solo-para-pruebas-0123456789abcdefghij';
const me = (cookie?: string) => {
  const req = api().get('/api/users/me');
  return cookie ? req.set('Cookie', cookie) : req;
};
const signToken = (sub: string, secret: string, expiresIn: string | number) =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));

describe('TC-API-SES: sesión con cookie', () => {
  it('TC-API-SES-01 el flujo completo: registrar, consultar, cerrar sesión y quedar sin acceso', async () => {
    const agent = request.agent(app); // conserva las cookies, como un navegador
    await agent
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@mail.com', password: 'Clave-Segura#1' })
      .expect(201);

    const meResponse = await agent.get('/api/users/me');
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe('ana@mail.com');

    await agent.post('/api/auth/logout').expect(204);
    expect((await agent.get('/api/users/me')).status).toBe(401);
  });

  it('TC-API-SES-02 sin cookie responde 401 con un mensaje claro', async () => {
    const res = await me();

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Debes iniciar sesión');
  });

  it('TC-API-SES-03 un token inventado responde 401', async () => {
    expect((await me('taskflow_session=abc.def.ghi')).status).toBe(401);
  });

  it('TC-API-SES-04 un token válido modificado a mano responde 401', async () => {
    const token = cookieValue(sessionCookieHeader(await registerUser())!);
    const [header, payload, signature] = token.split('.');
    const tampered = `${header}.${payload}x.${signature}`;

    expect((await me(`taskflow_session=${tampered}`)).status).toBe(401);
  });

  it('TC-API-SES-05 un token firmado con OTRO secreto responde 401', async () => {
    const created = await registerUser();
    const forged = await signToken(
      created.body.user.id,
      'otro-secreto-distinto-0123456789abcdef',
      '1h',
    );

    expect((await me(`taskflow_session=${forged}`)).status).toBe(401);
  });

  it('TC-API-SES-06 un token expirado responde 401', async () => {
    const created = await registerUser();
    const expired = await signToken(
      created.body.user.id,
      TEST_SECRET,
      Math.floor(Date.now() / 1000) - 60,
    );

    const res = await me(`taskflow_session=${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expiró|no es válida/);
  });

  it('TC-API-SES-07 un token sin firma (alg "none") responde 401', async () => {
    const created = await registerUser();
    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: created.body.user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;

    expect((await me(`taskflow_session=${unsigned}`)).status).toBe(401);
  });

  it('TC-API-SES-08 si el usuario fue eliminado, el token deja de servir y la cookie se borra', async () => {
    const created = await registerUser();
    const cookie = `taskflow_session=${cookieValue(sessionCookieHeader(created)!)}`;
    await prisma.user.delete({ where: { id: created.body.user.id } });

    const res = await me(cookie);
    expect(res.status).toBe(401);
    expect(sessionCookieHeader(res)).toMatch(/expires=Thu, 01 Jan 1970/i); // instrucción de borrar la cookie
  });

  it('TC-API-SES-09 cerrar sesión ordena borrar la cookie', async () => {
    const res = await api().post('/api/auth/logout');

    expect(res.status).toBe(204);
    expect(sessionCookieHeader(res)).toMatch(/expires=Thu, 01 Jan 1970/i);
  });

  it('TC-API-SES-10 dos usuarios no pueden ver los datos del otro (aislamiento)', async () => {
    const ana = await registerUser({ email: 'ana@mail.com', name: 'Ana' });
    const luis = await registerUser({ email: 'luis@mail.com', name: 'Luis' });

    const anaMe = await me(`taskflow_session=${cookieValue(sessionCookieHeader(ana)!)}`);
    const luisMe = await me(`taskflow_session=${cookieValue(sessionCookieHeader(luis)!)}`);

    expect(anaMe.body.user.email).toBe('ana@mail.com');
    expect(luisMe.body.user.email).toBe('luis@mail.com');
  });
});
