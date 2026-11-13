import 'dotenv/config';
import { prepareTestDatabase } from './prepareTestDatabase';

// Uso: npm run db:test:prepare -w @taskflow/api
await prepareTestDatabase();
console.log('Base de datos de pruebas lista.');
