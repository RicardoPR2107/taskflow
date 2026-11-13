import type { Request, Response } from 'express';
import { AppError } from '../../middlewares/errorHandler.js';
import { clearSessionCookie } from '../auth/auth.cookies.js';
import { usersRepository } from './users.repository.js';
import { toPublicUser } from './users.mapper.js';

export async function getMe(req: Request, res: Response) {
  const user = await usersRepository.findById(req.userId!);
  if (!user) {
    // Token válido pero el usuario ya no existe: cerramos la sesión.
    clearSessionCookie(res);
    throw new AppError(401, 'Tu sesión no es válida. Inicia sesión de nuevo');
  }
  res.json({ user: toPublicUser(user) });
}
