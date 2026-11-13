import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { testDatabaseUrl } from './testDatabase';

/**
 * Deja lista la base de datos de pruebas: la crea si no existe y deja sus tablas exactamente
 * como dice schema.prisma (borrando los datos de pruebas anteriores).
 * La usan tanto las pruebas de API (globalSetup) como las E2E (npm run db:test:prepare).
 */
export async function prepareTestDatabase() {
  const url = testDatabaseUrl();
  const name = new URL(url).pathname.slice(1);

  // 1) Crear la base de datos si no existe (nos conectamos a la base "postgres" del mismo servidor)
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name.replace(/[^a-z0-9_]/g, '')}"`);
      console.log(`Base de datos de pruebas creada: ${name}`);
    }
  } finally {
    await client.end();
  }

  // 2) Sincronizar las tablas con schema.prisma
  if (process.env.SKIP_DB_PUSH !== '1') {
    execSync('npx prisma db push --force-reset --accept-data-loss', {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, DATABASE_URL: url },
    });
  }
}
