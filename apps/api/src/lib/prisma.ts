import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Una única instancia de Prisma para toda la aplicación.
// Prisma 7 necesita un "driver adapter": aquí, el de PostgreSQL (pg).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
