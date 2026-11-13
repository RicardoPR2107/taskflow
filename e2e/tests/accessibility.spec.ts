/** E2E: auditoría automática de accesibilidad con axe-core, nivel WCAG 2.1 AA (RNF-10). */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEMO, login, register } from './support';

const audit = async (page: import('@playwright/test').Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} elemento/s) → ${v.nodes[0]?.target.join(' ')}`,
  );
};

test.describe('TC-E2E-A11Y: accesibilidad', () => {
  for (const [path, heading] of [
    ['/login', 'Iniciar sesión'],
    ['/registro', 'Crear cuenta'],
    ['/recuperar', 'Recuperar contraseña'],
    ['/restablecer', 'Enlace no válido'],
    ['/esta-ruta-no-existe', 'Esta página no existe'],
  ] as const) {
    test(`TC-E2E-A11Y-01 ${path}: sin violaciones WCAG 2.1 AA`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();

      expect(await audit(page)).toEqual([]);
    });
  }

  test('TC-E2E-A11Y-02 /tablero: sin violaciones WCAG 2.1 AA', async ({ page }) => {
    await login(page, DEMO.email, DEMO.password);
    await expect(page.getByRole('heading', { name: /Hola/ })).toBeVisible();

    expect(await audit(page)).toEqual([]);
  });

  test('TC-E2E-A11Y-03 el login con errores visibles también cumple', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Ingresa un correo válido')).toBeVisible();

    expect(await audit(page)).toEqual([]);
  });

  test('TC-E2E-A11Y-03 el tablero con tareas y sus ventanas: sin violaciones WCAG 2.1 AA', async ({
    page,
  }) => {
    await register(page);
    for (const [title, priority] of [
      ['Tarea urgente', 'Urgente'],
      ['Tarea alta', 'Alta'],
      ['Tarea baja', 'Baja'],
    ]) {
      await page.getByRole('button', { name: 'Nueva tarea' }).first().click();
      await page.getByLabel('Título').fill(title!);
      await page.getByLabel('Prioridad').selectOption({ label: priority });
      await page.getByLabel('Fecha límite (opcional)').fill('2020-01-01');
      await page.getByRole('button', { name: 'Crear tarea' }).click();
      await expect(page.getByText(title!, { exact: true })).toBeVisible();
    }
    expect(await audit(page)).toEqual([]);

    await page.getByRole('button', { name: 'Editar tarea: Tarea alta' }).click();
    await expect(page.getByRole('dialog', { name: 'Editar tarea' })).toBeVisible();
    expect(await audit(page)).toEqual([]);
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('button', { name: 'Eliminar tarea: Tarea alta' }).click();
    await expect(page.getByRole('dialog', { name: '¿Eliminar esta tarea?' })).toBeVisible();
    expect(await audit(page)).toEqual([]);
  });
});
