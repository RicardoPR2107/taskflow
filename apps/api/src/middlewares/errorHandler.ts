import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { env } from '../config/env.js';

/** Error "esperado" con un código HTTP y un mensaje seguro para mostrar al usuario. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Errores del analizador de JSON de Express (cuerpo demasiado grande, JSON mal formado, etc.). */
function isHttpClientError(err: unknown): err is { status: number; type?: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof err.status === 'number' &&
    err.status >= 400 &&
    err.status < 500
  );
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Recurso no encontrado' } });
}

// Manejador de errores central (RNF-06): todo error termina aquí.
// Express reconoce un manejador de errores por tener 4 parámetros.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Datos inválidos', details: z.flattenError(err).fieldErrors },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
    return;
  }

  if (isHttpClientError(err)) {
    const messages: Record<string, string> = {
      'entity.too.large': 'La petición es demasiado grande',
      'entity.parse.failed': 'El cuerpo de la petición no es un JSON válido',
    };
    res
      .status(err.status)
      .json({ error: { message: messages[err.type ?? ''] ?? 'Petición no válida' } });
    return;
  }

  // Error inesperado: lo registramos y NO exponemos detalles internos al cliente.
  console.error(err);
  res.status(500).json({
    error: { message: 'Error interno del servidor' },
    ...(env.NODE_ENV === 'development' && err instanceof Error ? { debug: err.message } : {}),
  });
}
