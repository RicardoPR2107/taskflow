import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Una única instancia de Prisma para toda la aplicación.
// Prisma 7 necesita un "driver adapter": aquí, el de PostgreSQL (pg).
// La sesión se fija en UTC: así las fechas guardadas no dependen de la zona horaria del servidor de
// Postgres (en Windows o Docker puede ser distinta). La zona del USUARIO se aplica aparte (RN-10).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, options: '-c timezone=UTC' });

export const prisma = new PrismaClient({ adapter });
