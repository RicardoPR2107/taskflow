import type { Request, Response } from 'express';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@taskflow/shared';
import { clearSessionCookie, setSessionCookie } from './auth.cookies.js';
import { authService } from './auth.service.js';

// El controller traduce HTTP <-> service. No decide reglas de negocio.
export async function register(req: Request, res: Response) {
  const { user, token } = await authService.register(req.body as RegisterInput);
  setSessionCookie(res, token);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const { user, token } = await authService.login(req.body as LoginInput);
  setSessionCookie(res, token);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response) {
  await authService.requestPasswordReset((req.body as ForgotPasswordInput).email);
  // Respuesta idéntica exista o no la cuenta.
  res.json({
    message: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.',
  });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body as ResetPasswordInput);
  res.json({ message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' });
}
