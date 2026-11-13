import type { Response } from 'express';
import { env } from '../../config/env.js';
import { SESSION_DURATION_SECONDS } from '../../lib/token.js';

export const SESSION_COOKIE_NAME = 'taskflow_session';

const baseOptions = {
  httpOnly: true, // JavaScript del navegador no puede leer la cookie (protege contra XSS)
  secure: env.NODE_ENV === 'production', // en producción solo viaja por HTTPS
  sameSite: 'lax' as const, // no se envía en peticiones originadas desde otros sitios (anti-CSRF)
  path: '/',
};

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...baseOptions,
    maxAge: SESSION_DURATION_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, baseOptions);
}
