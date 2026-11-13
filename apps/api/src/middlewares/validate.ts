import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Valida (y limpia) el cuerpo de la petición con un esquema Zod.
 * Si hay errores, Zod lanza una excepción y el manejador central responde 400.
 */
export const validateBody =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
