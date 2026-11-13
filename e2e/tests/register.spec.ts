/** E2E: registro de cuentas y política de contraseñas (RF-01, RN-11). */
import { expect, test } from '@playwright/test';
import { STRONG_PASSWORD, register, uniqueEmail } from './support';

test.describe('TC-E2E-REG: registro', () => {
  test('TC-E2E-REG-01 un registro válido crea la cuenta y entra al tablero con el nombre', async ({
    page,
  }) => {
    await register(page, { name: 'Luis' });

    await expect(page.getByRole('heading', { name: /Hola, Luis/ })).toBeVisible();
  });

  test('TC-E2E-REG-02 los 5 requisitos de la contraseña se marcan en vivo', async ({ page }) => {
    await page.goto('/registro');
    const met = page.getByText(': cumplido');
    await expect(met).toHaveCount(0);

    await page.getByLabel('Contraseña').fill('abc');
    await expect(met).toHaveCount(1);
    await page.getByLabel('Contraseña').fill('Abc1!');
    await expect(met).toHaveCount(4);
    await page.getByLabel('Contraseña').fill('Abcdef123!');
    await expect(met).toHaveCount(5);
  });

  test('TC-E2E-REG-03 una contraseña sin mayúscula se rechaza con el motivo concreto', async ({
    page,
  }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Luis');
    await page.getByLabel('Correo electrónico').fill(uniqueEmail());
    await page.getByLabel('Contraseña').fill('sinmayuscula123!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(
      page.getByText('La contraseña debe incluir al menos una letra mayúscula'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/registro$/);
  });

  test('TC-E2E-REG-04 regresión: tras corregir un error, UN solo clic basta para crear la cuenta', async ({
    page,
  }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Luis');
    await page.getByLabel('Correo electrónico').fill(uniqueEmail());
    await page.getByLabel('Contraseña').fill('debil');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText(/al menos 10 caracteres/).first()).toBeVisible();

    await page.getByLabel('Contraseña').fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Crear cuenta' }).click(); // un único clic con el ratón

    await expect(page).toHaveURL(/\/tablero$/);
  });

  test('TC-E2E-REG-05 un correo ya registrado se avisa junto al campo de correo', async ({
    page,
    context,
  }) => {
    const first = await register(page, { name: 'Ana' });
    await context.clearCookies();

    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Otra Ana');
    await page.getByLabel('Correo electrónico').fill(first.email.toUpperCase());
    await page.getByLabel('Contraseña').fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Ya existe una cuenta con ese correo')).toBeVisible();
    await expect(page).toHaveURL(/\/registro$/);
  });

  test('TC-E2E-REG-06 enviar el registro vacío muestra un error por campo', async ({ page }) => {
    await page.goto('/registro');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('El nombre es obligatorio')).toBeVisible();
    await expect(page.getByText('Ingresa un correo válido')).toBeVisible();
  });
});
