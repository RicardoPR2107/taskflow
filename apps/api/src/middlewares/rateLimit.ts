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

// Máximo 20 registros cada 15 minutos por IP. (Las pruebas E2E crean muchas cuentas desde una sola IP
// y suben el límite con REGISTER_RATE_LIMIT; en producción no se define y rige el 20.)
const registerLimiter = () =>
  rateLimit({
    ...tooManyRequests('Demasiados registros desde esta conexión. Inténtalo más tarde'),
    limit: Number(process.env.REGISTER_RATE_LIMIT) || 20,
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

// Límite general para toda la API: 600 peticiones cada 15 minutos por IP (frena abusos y bucles).
// Las pruebas E2E lo suben con API_RATE_LIMIT porque hacen miles de peticiones desde una sola IP.
const apiLimiter = () =>
  rateLimit({
    ...tooManyRequests('Demasiadas peticiones. Espera unos minutos e inténtalo de nuevo'),
    limit: Number(process.env.API_RATE_LIMIT) || 600,
  });

/**
 * Cada instancia de la aplicación crea sus propios contadores. En producción hay una sola,
 * pero así las pruebas pueden crear una aplicación nueva sin heredar bloqueos de otras pruebas.
 */
export function createRateLimiters() {
  return {
    api: apiLimiter(),
    login: loginLimiter(),
    register: registerLimiter(),
    forgotPassword: forgotPasswordLimiter(),
    resetPassword: resetPasswordLimiter(),
  };
}

export type RateLimiters = ReturnType<typeof createRateLimiters>;
