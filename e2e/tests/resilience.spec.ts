/** E2E: comportamiento cuando algo falla (RNF-06, RNF-07): errores de conexión, cargas lentas, carga perezosa. */
import { expect, test } from '@playwright/test';
import { DEMO, login } from './support';

test.describe('TC-E2E-RES: fallos y estados de carga', () => {
  test('TC-E2E-RES-01 sin conexión con la API durante el login, avisa con un mensaje claro', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await page.route('**/api/auth/login', (route) => route.abort());

    await page.getByLabel('Correo electrónico').fill(DEMO.email);
    await page.getByLabel('Contraseña').fill(DEMO.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: 'No se pudo conectar con el servidor' }),
    ).toBeVisible();
  });

  test('TC-E2E-RES-02 con el servidor lento, el botón muestra "Ingresando…" y se bloquea', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await page.route('**/api/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.getByLabel('Correo electrónico').fill(DEMO.email);
    await page.getByLabel('Contraseña').fill(DEMO.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByRole('button', { name: 'Ingresando…' })).toBeDisabled();
    await expect(page).toHaveURL(/\/tablero$/);
  });

  test('TC-E2E-RES-03 si la API cae al abrir la app, hay pantalla de fallo y Reintentar la recupera', async ({
    page,
  }) => {
    await page.route('**/api/users/me', (route) => route.abort());
    await page.goto('/tablero');

    await expect(page.getByRole('heading', { name: 'No pudimos verificar tu sesión' })).toBeVisible(
      { timeout: 15_000 },
    );

    await page.unroute('**/api/users/me');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC-E2E-RES-04 carga perezosa: el código del tablero no se descarga hasta entrar a él', async ({
    page,
  }) => {
    const downloaded: string[] = [];
    page.on('request', (request) => downloaded.push(request.url()));

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    expect(downloaded.some((url) => /BoardPage/.test(url))).toBe(false);

    await login(page, DEMO.email, DEMO.password);
    await expect(page.getByRole('heading', { name: /Hola/ })).toBeVisible();
    expect(downloaded.some((url) => /BoardPage/.test(url))).toBe(true);
  });

  test('TC-E2E-RES-05 si un trozo de código no se puede descargar, se muestra la pantalla de error de ruta', async ({
    page,
  }) => {
    await login(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/tablero$/);
    await page.context().clearCookies();
    await page.route(/NotFoundPage/, (route) => route.abort());

    await page.goto('/esta-ruta-no-existe');

    await expect(page.getByRole('heading', { name: 'Algo salió mal' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Recargar página' })).toBeVisible();
  });
});
