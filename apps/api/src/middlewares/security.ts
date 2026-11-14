import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa extra contra CSRF (que otro sitio haga peticiones en nombre del usuario).
 * La cookie ya es SameSite=Lax; además, si una petición que MODIFICA datos trae la cabecera Origin
 * (los navegadores siempre la envían), debe ser el origen del frontend. Herramientas sin navegador
 * (curl, pruebas) no la envían y no son un riesgo de CSRF, porque ese ataque necesita un navegador.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!SAFE_METHODS.has(req.method) && origin && origin !== env.CORS_ORIGIN) {
    res.status(403).json({ error: { message: 'Origen no permitido' } });
    return;
  }
  next();
}

/** Las respuestas de la API son privadas: ni el navegador ni un proxy deben guardarlas en caché. */
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
