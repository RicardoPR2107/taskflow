/**
 * Base de datos de las pruebas. NUNCA es la de desarrollo: las pruebas borran los datos,
 * así que por seguridad el nombre debe terminar en "_test" o todo se detiene.
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  const dev = process.env.DATABASE_URL;

  let raw = explicit;
  if (!raw && dev) {
    const url = new URL(dev);
    url.pathname = '/taskflow_test'; // misma conexión que desarrollo, otra base de datos
    raw = url.toString();
  }
  if (!raw) throw new Error('Falta DATABASE_URL (o TEST_DATABASE_URL) en apps/api/.env');

  const name = new URL(raw).pathname.slice(1);
  if (!name.endsWith('_test')) {
    throw new Error(
      `Por seguridad, la base de datos de pruebas debe terminar en "_test" (recibida: "${name}")`,
    );
  }
  return raw;
}
