import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@taskflow/shared';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { createRateLimiters } from './middlewares/rateLimit.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Detrás de Nginx (Fase 6) hay que confiar en su cabecera para ver la IP real del cliente.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet()); // cabeceras HTTP de seguridad
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10kb' })); // límite de tamaño de las peticiones
  app.use(cookieParser());

  // Endpoint de salud: lo usarán Docker y Nginx más adelante.
  app.get('/api/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', timestamp: new Date().toISOString() };
    res.json(body);
  });

  app.use('/api/auth', createAuthRouter(createRateLimiters()));
  app.use('/api/users', usersRouter);
  // Las tareas y el dashboard se montarán aquí en las siguientes fases.

  app.use(notFoundHandler);
  app.use(errorHandler); // siempre al final
  return app;
}
