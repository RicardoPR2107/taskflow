import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@taskflow/shared';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { createRateLimiters } from './middlewares/rateLimit.js';
import { noStore, requireSameOrigin } from './middlewares/security.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { tasksRouter } from './modules/tasks/tasks.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

/** Demo de un solo contenedor: Express entrega la web compilada y, para cualquier ruta que no sea /api, index.html. */
function serveWeb(app: express.Express, dir: string) {
  const root = path.resolve(dir);
  app.use(
    express.static(root, {
      index: false,
      setHeaders: (res, file) => {
        // Los archivos de /assets cambian de nombre en cada versión: se pueden guardar un año.
        const isAsset = file.includes(`${path.sep}assets${path.sep}`);
        res.setHeader(
          'Cache-Control',
          isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(root, 'index.html')); // la ruta la resuelve React Router
  });
}

export function createApp({ webDistDir = env.WEB_DIST_DIR }: { webDistDir?: string } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Detrás de Nginx (Fase 6) hay que confiar en su cabecera para ver la IP real del cliente.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  // Cabeceras HTTP de seguridad. Sin "upgrade-insecure-requests" para poder probar por http en local;
  // en producción la conexión ya llega por HTTPS desde el proveedor.
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10kb' })); // límite de tamaño de las peticiones
  app.use(cookieParser());

  // Endpoint de salud: lo usarán Docker y Nginx más adelante.
  app.get('/api/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', timestamp: new Date().toISOString() };
    res.json(body);
  });

  const limiters = createRateLimiters();
  app.use('/api', limiters.api, noStore, requireSameOrigin); // protecciones comunes a toda la API
  app.use('/api/auth', createAuthRouter(limiters));
  app.use('/api/users', usersRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/dashboard', dashboardRouter);

  if (webDistDir) serveWeb(app, webDistDir);

  app.use(notFoundHandler);
  app.use(errorHandler); // siempre al final
  return app;
}
