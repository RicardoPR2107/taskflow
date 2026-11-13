import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url)); // en módulos ES no existe __dirname

// Misma conexión que desarrollo (apps/api/.env), pero apuntando a la base "_test": las E2E NUNCA tocan tus datos.
loadEnv({ path: resolve(__dirname, '../apps/api/.env') });
const devUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!devUrl) throw new Error('Falta DATABASE_URL en apps/api/.env');
const testUrl = new URL(devUrl);
if (!process.env.TEST_DATABASE_URL) testUrl.pathname = '/taskflow_test';
if (!testUrl.pathname.slice(1).endsWith('_test'))
  throw new Error('La base de datos de las E2E debe terminar en "_test"');

// Puertos propios para no chocar con `npm run dev` (3000 y 5173).
const API_PORT = 3100;
const WEB_PORT = 5174;
const root = resolve(__dirname, '..');
export const OUTBOX_FILE = resolve(__dirname, '.outbox/emails.jsonl'); // correos simulados que "envía" la API

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // comparten una sola API y una sola base de datos
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Solo para entornos sin los navegadores de Playwright (por ejemplo, un navegador del sistema).
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },

  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    // El móvil solo repite las pruebas de diseño y de registro (cada registro cuenta para el límite de la API).
    { name: 'movil', testMatch: /(layout|register)\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],

  webServer: [
    {
      // API real, con la base de datos de pruebas y una bandeja de correos simulada.
      command: 'npx tsx apps/api/src/server.ts',
      cwd: root,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false, // siempre una API nueva: sus contadores de intentos empiezan en cero
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        DATABASE_URL: testUrl.toString(),
        JWT_SECRET: 'secreto-solo-para-e2e-0123456789abcdefghijklmnop',
        MAIL_OUTBOX_FILE: OUTBOX_FILE,
      },
    },
    {
      // Frontend real, con su proxy apuntando a la API de pruebas.
      command: `npx vite --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: resolve(root, 'apps/web'),
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
