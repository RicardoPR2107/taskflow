import { DEMO_USER } from '@taskflow/shared';
import { ensureDemoUser } from '../src/lib/demoUser.js';
import { prisma } from '../src/lib/prisma.js';

// Uso: npm run db:seed -w @taskflow/api
const result = await ensureDemoUser();
const messages = {
  created: 'Cuenta de prueba creada',
  restored: 'Cuenta de prueba restaurada (se recuperó su contraseña original)',
  exists: 'La cuenta de prueba ya existía',
};
console.log(`${messages[result]}: ${DEMO_USER.email} / ${DEMO_USER.password}`);
await prisma.$disconnect();
