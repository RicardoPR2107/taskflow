import { expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { OUTBOX_FILE } from '../playwright.config';

export const DEMO = {
  name: 'Usuario Demo',
  email: 'demo@taskflow.dev',
  password: 'Demo-Task#2026',
};
export const STRONG_PASSWORD = 'Clave-Segura#1';
export const FOOTER = new RegExp(
  `© ${new Date().getFullYear()} Ricardo Palma\\. Todos los derechos reservados\\.`,
);

let counter = 0;
/** Correo único por prueba: ninguna prueba depende de los datos de otra. */
export const uniqueEmail = (prefix = 'e2e') => `${prefix}-${Date.now()}-${counter++}@prueba.test`;

export async function register(
  page: Page,
  { name = 'Ana', email = uniqueEmail(), password = STRONG_PASSWORD } = {},
) {
  await page.goto('/registro');
  await page.getByLabel('Nombre').fill(name);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/tablero$/);
  return { name, email, password };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** Lee de la bandeja de correos simulada el último enlace de recuperación enviado a ese correo. */
export async function lastResetLink(email: string): Promise<string> {
  let link = '';
  await expect
    .poll(
      () => {
        if (!existsSync(OUTBOX_FILE)) return '';
        const lines = readFileSync(OUTBOX_FILE, 'utf8').trim().split('\n').filter(Boolean);
        const mails = lines.map((line) => JSON.parse(line) as { to: string; link: string });
        link = mails.filter((mail) => mail.to === email).at(-1)?.link ?? '';
        return link;
      },
      { message: `esperando el correo de recuperación para ${email}` },
    )
    .not.toBe('');
  return link;
}
