import { rateLimit } from 'express-rate-limit';

const tooManyRequests = (message: string) => ({
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  handler: (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
    res.status(429).json({ error: { message } });
  },
});

// Máximo 10 intentos de login FALLIDOS cada 15 minutos por IP (los exitosos no cuentan).
const loginLimiter = () =>
  rateLimit({
    ...tooManyRequests('Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo'),
    limit: 10,
    skipSuccessfulRequests: true,
  });

// Máximo 20 registros cada 15 minutos por IP.
const registerLimiter = () =>
  rateLimit({
    ...tooManyRequests('Demasiados registros desde esta conexión. Inténtalo más tarde'),
    limit: 20,
  });

// Máximo 5 solicitudes de recuperación cada 15 minutos por IP (evita inundar de correos a alguien).
const forgotPasswordLimiter = () =>
  rateLimit({
    ...tooManyRequests('Demasiadas solicitudes de recuperación. Inténtalo de nuevo en 15 minutos'),
    limit: 5,
  });

// Máximo 10 intentos de restablecer cada 15 minutos por IP.
const resetPasswordLimiter = () =>
  rateLimit({
    ...tooManyRequests('Demasiados intentos. Inténtalo de nuevo en 15 minutos'),
    limit: 10,
  });

/**
 * Cada instancia de la aplicación crea sus propios contadores. En producción hay una sola,
 * pero así las pruebas pueden crear una aplicación nueva sin heredar bloqueos de otras pruebas.
 */
export function createRateLimiters() {
  return {
    login: loginLimiter(),
    register: registerLimiter(),
    forgotPassword: forgotPasswordLimiter(),
    resetPassword: resetPasswordLimiter(),
  };
}

export type RateLimiters = ReturnType<typeof createRateLimiters>;
