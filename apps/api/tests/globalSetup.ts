import { prepareTestDatabase } from './prepareTestDatabase';

/** Se ejecuta UNA vez antes de todas las pruebas de API. */
export default async function setup() {
  await prepareTestDatabase();
}
