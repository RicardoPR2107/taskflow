/** E2E: inicio y cierre de sesión, y protección de pantallas (RF-02, RF-03, RF-06). */
import { expect, test } from '@playwright/test';
import { DEMO, STRONG_PASSWORD, login, logout, register, uniqueEmail } from './support';

test.describe('TC-E2E-AUTH: sesión', () => {
  test('TC-E2E-AUTH-01 sin sesión, abrir la raíz lleva al login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('TC-E2E-AUTH-02 la cuenta de prueba entra al tablero y se ven las 4 columnas', async ({
    page,
  }) => {
    await login(page, DEMO.email, DEMO.password);

    await expect(page).toHaveURL(/\/tablero$/);
    await expect(
      page.getByRole('heading', { name: new RegExp(`Hola, ${DEMO.name}`) }),
    ).toBeVisible();
    for (const column of ['Pendiente', 'En progreso', 'En revisión', 'Completada']) {
      await expect(page.getByRole('heading', { name: column })).toBeVisible();
    }
  });

  test('TC-E2E-AUTH-03 enviar el login vacío muestra los errores en español', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Ingresa un correo válido')).toBeVisible();
    await expect(page.getByText('La contraseña es obligatoria')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC-E2E-AUTH-04 una contraseña incorrecta muestra un aviso y no entra', async ({ page }) => {
    await login(page, DEMO.email, 'Incorrecta#123');

    await expect(
      page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC-E2E-AUTH-05 un correo inexistente da el mismo aviso que una contraseña incorrecta', async ({
    page,
  }) => {
    await login(page, uniqueEmail('fantasma'), STRONG_PASSWORD);

    await expect(
      page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos' }),
    ).toBeVisible();
  });

  test('TC-E2E-AUTH-06 la sesión sobrevive a recargar la página', async ({ page }) => {
    await login(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/tablero$/);

    await page.reload();

    await expect(
      page.getByRole('heading', { name: new RegExp(`Hola, ${DEMO.name}`) }),
    ).toBeVisible();
  });

  test('TC-E2E-AUTH-07 cerrar sesión devuelve al login y el tablero queda protegido', async ({
    page,
  }) => {
    await login(page, DEMO.email, DEMO.password);
    await logout(page);

    await page.goto('/tablero');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC-E2E-AUTH-08 con sesión iniciada, /login y /registro redirigen al tablero', async ({
    page,
  }) => {
    await login(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/tablero$/);

    for (const path of ['/login', '/registro', '/recuperar']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/tablero$/);
    }
  });

  test('TC-E2E-AUTH-09 la cookie de sesión es HttpOnly y JavaScript no puede leerla', async ({
    page,
    context,
  }) => {
    await login(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/tablero$/);

    const cookie = (await context.cookies()).find((c) => c.name === 'taskflow_session');
    expect(cookie).toBeDefined();
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.sameSite).toBe('Lax');
    expect(await page.evaluate(() => document.cookie)).toBe('');
  });

  test('TC-E2E-AUTH-10 dos cuentas distintas ven cada una su propio nombre (aislamiento)', async ({
    page,
  }) => {
    const first = await register(page, { name: 'Primera' });
    await expect(page.getByRole('heading', { name: /Hola, Primera/ })).toBeVisible();
    await logout(page);

    await register(page, { name: 'Segunda' });
    await expect(page.getByRole('heading', { name: /Hola, Segunda/ })).toBeVisible();
    await expect(page.getByText(first.email)).toHaveCount(0);
  });
});
