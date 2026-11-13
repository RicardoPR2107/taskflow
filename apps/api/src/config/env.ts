import { z } from 'zod';

// Validamos las variables de entorno al arrancar: si falta alguna, el servidor
// no inicia y muestra un mensaje claro en vez de fallar más tarde.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z
    .string({ error: 'Falta DATABASE_URL en el archivo .env' })
    .startsWith('postgresql://', 'DATABASE_URL debe empezar con postgresql://'),
  // Solo para pruebas E2E: archivo donde se guardan los correos simulados (ver mailer.ts)
  MAIL_OUTBOX_FILE: z.string().optional(),
  JWT_SECRET: z
    .string({ error: 'Falta JWT_SECRET en el archivo .env' })
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres')
    .refine(
      (value) => !value.startsWith('REEMPLAZA'),
      'Reemplaza JWT_SECRET por un secreto real (mira las instrucciones en .env.example)',
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:');
  console.error(z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
