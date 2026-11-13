import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';

// Antes de CADA prueba la base queda vacía: ninguna prueba depende de otra.
beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
