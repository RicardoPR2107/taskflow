import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.cookies.js';
import { verifySessionToken } from '../lib/token.js';
import { AppError } from './errorHandler.js';

/** Exige sesión iniciada. El id del usuario sale del token, nunca de lo que envíe el cliente. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token !== 'string' || token.length === 0) {
    throw new AppError(401, 'Debes iniciar sesión');
  }

  try {
    req.userId = await verifySessionToken(token);
  } catch {
    throw new AppError(401, 'Tu sesión no es válida o expiró. Inicia sesión de nuevo');
  }
  next();
}
