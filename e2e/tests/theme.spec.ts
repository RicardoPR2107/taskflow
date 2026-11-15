/** E2E: tema claro/oscuro. Se recuerda, respeta el del sistema y el oscuro también cumple WCAG 2.1 AA. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { register } from './support';

const audit = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} elemento/s) → ${v.nodes[0]?.target.join(' ')}`,
  );
};

const theme = (page: Page) => page.locator('html').getAttribute('data-theme');

test.describe('TC-E2E-THM: tema claro y oscuro', () => {
  test('TC-E2E-THM-01 el botón cambia el tema y la elección se recuerda al recargar', async ({
    page,
  }) => {
    await page.goto('/login');
    expect(await theme(page)).toBe('light');

    await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
    expect(await theme(page)).toBe('dark');

    await page.reload();
    expect(await theme(page)).toBe('dark');
    await expect(page.getByRole('button', { name: 'Cambiar a tema claro' })).toBeVisible();
  });

  test('TC-E2E-THM-02 la elección se mantiene dentro de la app y al volver a claro', async ({
    page,
  }) => {
    await register(page);
    await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
    await page.getByRole('link', { name: 'Tareas' }).click();
    await expect(page).toHaveURL(/\/tareas/);
    expect(await theme(page)).toBe('dark');

    await page.getByRole('button', { name: 'Cambiar a tema claro' }).click();
    await page.reload();
    expect(await theme(page)).toBe('light');
  });

  test.describe('sistema en modo oscuro', () => {
    test.use({ colorScheme: 'dark' });

    test('TC-E2E-THM-03 sin elección guardada, se usa el tema del sistema', async ({ page }) => {
      await page.goto('/login');
      expect(await theme(page)).toBe('dark');
    });

    test('TC-E2E-THM-04 la elección guardada manda sobre el sistema', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('taskflow-theme', 'light'));
      await page.goto('/login');
      expect(await theme(page)).toBe('light');
    });
  });

  test.describe('accesibilidad en oscuro', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('taskflow-theme', 'dark'));
    });

    for (const [path, heading] of [
      ['/login', 'Iniciar sesión'],
      ['/registro', 'Crear cuenta'],
      ['/recuperar', 'Recuperar contraseña'],
      ['/esta-ruta-no-existe', 'Esta página no existe'],
    ] as const) {
      test(`TC-E2E-THM-05 ${path}: sin violaciones WCAG 2.1 AA`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { name: heading })).toBeVisible();
        expect(await theme(page)).toBe('dark');

        expect(await audit(page)).toEqual([]);
      });
    }

    test('TC-E2E-THM-06 el login con errores visibles cumple', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page.getByText('Ingresa un correo válido')).toBeVisible();

      expect(await audit(page)).toEqual([]);
    });

    test('TC-E2E-THM-07 tablero, tareas, dashboard y ventanas: sin violaciones', async ({
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
      expect(await theme(page)).toBe('dark');
      expect(await audit(page)).toEqual([]);

      await page.getByRole('button', { name: 'Editar tarea: Tarea alta' }).click();
      await expect(page.getByRole('dialog', { name: 'Editar tarea' })).toBeVisible();
      expect(await audit(page)).toEqual([]);
      await page.getByRole('button', { name: 'Cancelar' }).click();

      await page.getByRole('button', { name: 'Eliminar tarea: Tarea alta' }).click();
      await expect(page.getByRole('dialog', { name: '¿Eliminar esta tarea?' })).toBeVisible();
      expect(await audit(page)).toEqual([]);
      await page.getByRole('button', { name: 'Cancelar' }).click();

      await page.getByRole('link', { name: 'Tareas' }).click();
      await expect(page).toHaveURL(/\/tareas/);
      await expect(page.getByText('Tarea urgente', { exact: true })).toBeVisible();
      expect(await audit(page)).toEqual([]);

      await page.getByRole('link', { name: 'Dashboard' }).click();
      await expect(page.getByLabel('Indicadores')).toBeVisible();
      expect(await audit(page)).toEqual([]);
    });
  });
});
