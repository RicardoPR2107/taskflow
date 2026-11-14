import { createApp } from './app.js';
import { env } from './config/env.js';
import { ensureDemoUser } from './lib/demoUser.js';
import { prisma } from './lib/prisma.js';

async function main() {
  // Comprobamos la conexión a la base de datos antes de aceptar peticiones.
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Base de datos conectada');
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL. Revisa DATABASE_URL en apps/api/.env');
    console.error(error);
    process.exit(1);
  }

  // La cuenta de prueba siempre existe fuera de producción (en producción: npm run db:seed,
  // o SEED_DEMO=true en la demo pública).
  if (env.NODE_ENV !== 'production' || env.SEED_DEMO === 'true') {
    const demo = await ensureDemoUser();
    if (demo !== 'exists')
      console.log(
        `Cuenta de prueba ${demo === 'created' ? 'creada' : 'restaurada'} (demo@taskflow.dev)`,
      );
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API de TaskFlow escuchando en http://localhost:${env.PORT}`);
  });
}

main();
