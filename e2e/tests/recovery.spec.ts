/** E2E: recuperación de contraseña de punta a punta (RF-33, RN-11). */
import { expect, test } from '@playwright/test';
import { STRONG_PASSWORD, lastResetLink, login, logout, register, uniqueEmail } from './support';

const NEW_PASSWORD = 'Nueva-Clave#77';

async function requestLink(page: import('@playwright/test').Page, email: string) {
  await page.goto('/recuperar');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
}

async function setNewPassword(
  page: import('@playwright/test').Page,
  password: string,
  confirm = password,
) {
  await page.getByLabel('Contraseña nueva').fill(password);
  await page.getByLabel('Repite la contraseña').fill(confirm);
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
}

test.describe('TC-E2E-RST: recuperar la contraseña', () => {
  test('TC-E2E-RST-01 flujo completo: pedir enlace, abrirlo, cambiar la contraseña e iniciar sesión con la nueva', async ({
    page,
  }) => {
    const { email } = await register(page);
    await logout(page);

    await requestLink(page, email);
    await page.goto(await lastResetLink(email));
    await setNewPassword(page, NEW_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Contraseña actualizada' })).toBeVisible();

    await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click();
    await login(page, email, STRONG_PASSWORD);
    await expect(
      page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos' }),
    ).toBeVisible(); // la anterior ya no sirve

    await login(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/tablero$/); // la nueva sí
  });

  test('TC-E2E-RST-02 el enlace sirve una sola vez', async ({ page }) => {
    const { email } = await register(page);
    await logout(page);
    await requestLink(page, email);
    const link = await lastResetLink(email);

    await page.goto(link);
    await setNewPassword(page, NEW_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Contraseña actualizada' })).toBeVisible();

    await page.goto(link);
    await setNewPassword(page, 'Otra-Clave#999');
    await expect(
      page.getByRole('alert').filter({ hasText: 'El enlace no es válido o ya expiró' }),
    ).toBeVisible();
  });

  test('TC-E2E-RST-03 la pantalla rechaza contraseñas débiles o distintas antes de enviar', async ({
    page,
  }) => {
    const { email } = await register(page);
    await logout(page);
    await requestLink(page, email);
    await page.goto(await lastResetLink(email));

    await setNewPassword(page, NEW_PASSWORD, 'Distinta-Clave#88');
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();

    await setNewPassword(page, 'debil', 'debil');
    await expect(page.getByText(/al menos 10 caracteres/).first()).toBeVisible();
  });

  test('TC-E2E-RST-04 pedir el enlace de un correo inexistente da la misma confirmación (no revela cuentas)', async ({
    page,
  }) => {
    await requestLink(page, uniqueEmail('fantasma'));

    await expect(page.getByText(/está registrado/)).toBeVisible();
  });

  test('TC-E2E-RST-05 un enlace inventado o sin token muestra pantallas de error claras', async ({
    page,
  }) => {
    await page.goto('/restablecer');
    await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();

    await page.goto(`/restablecer?token=${'x'.repeat(43)}`);
    await setNewPassword(page, NEW_PASSWORD);
    await expect(
      page.getByRole('alert').filter({ hasText: 'El enlace no es válido o ya expiró' }),
    ).toBeVisible();
  });
});
