import request from 'supertest';
import { createApp } from '../src/app';

/** Una aplicación compartida (para agentes con cookies). Cada api() usa una aplicación NUEVA: sin contadores heredados. */
export const app = createApp();
export const api = () => request(createApp());

export const STRONG_PASSWORD = 'Clave-Segura#1';

export const validRegistration = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ana',
  email: 'ana@mail.com',
  password: STRONG_PASSWORD,
  ...overrides,
});

/** Crea una cuenta y devuelve la respuesta (incluida la cookie de sesión). */
export const registerUser = (overrides: Record<string, unknown> = {}) =>
  api().post('/api/auth/register').send(validRegistration(overrides));

/** Devuelve el valor de la cabecera Set-Cookie de la sesión, tal como la envía el servidor. */
export function sessionCookieHeader(response: request.Response): string | undefined {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((cookie) => cookie.startsWith('taskflow_session='));
}

export const cookieValue = (header: string) => header.split(';')[0]!.split('=')[1]!;
