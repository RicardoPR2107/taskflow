import 'dotenv/config'; // lee apps/api/.env para derivar la base de datos de pruebas
import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './tests/testDatabase';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false, // todos los archivos comparten la misma base de datos de pruebas
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: 'secreto-solo-para-pruebas-0123456789abcdefghij',
      CORS_ORIGIN: 'http://localhost:5173',
      MAIL_OUTBOX_FILE: '',
    },
  },
});
