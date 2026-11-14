import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Una única instancia de Prisma para toda la aplicación.
// La sesión se fija en UTC para que las fechas no dependan de la zona del servidor Postgres.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, options: '-c timezone=UTC' });

export const prisma = new PrismaClient({ adapter });
