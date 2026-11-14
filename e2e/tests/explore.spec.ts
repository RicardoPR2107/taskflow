/** E2E: lista con filtros y paginación, y dashboard con cifras reales (Fase 4). */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { register } from './support';

/** Crea tareas directo por la API usando la sesión del navegador: así la prueba no depende de la interfaz. */
async function seed(page: Page, tasks: Array<Record<string, unknown>>) {
  for (const task of tasks) {
    const response = await page.request.post('/api/tasks', { data: task });
    expect(response.ok()).toBe(true);
  }
}
const kpi = (page: Page, name: string) =>
  page
    .getByLabel('Indicadores')
    .locator('div')
    .filter({ has: page.getByText(name, { exact: true }) });

test.describe('TC-E2E-LST: lista de tareas', () => {
  test('TC-E2E-LST-01 filtrar por estado y prioridad, y la URL conserva el filtro al recargar', async ({
    page,
  }) => {
    await register(page);
    await seed(page, [
      { title: 'Revisar pull request', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Pagar el internet', priority: 'LOW' },
      { title: 'Comprar café', priority: 'HIGH', status: 'DONE' },
    ]);

    await page.getByRole('link', { name: 'Tareas' }).click();
    await expect(page.getByText('3 tareas')).toBeVisible();

    await page.getByLabel('Prioridad').selectOption({ label: 'Alta' });
    await expect(page.getByText('2 tareas con estos filtros')).toBeVisible();
    await page.getByLabel('Estado').selectOption({ label: 'En progreso' });
    await expect(page.getByText('1 tarea con estos filtros')).toBeVisible();
    await expect(page.getByText('Revisar pull request')).toBeVisible();
    await expect(page).toHaveURL(/status=IN_PROGRESS/);

    await page.reload();
    await expect(page.getByLabel('Estado')).toHaveValue('IN_PROGRESS');
    await expect(page.getByText('Revisar pull request')).toBeVisible();

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page.getByText('3 tareas')).toBeVisible();
  });

  test('TC-E2E-LST-02 buscar por texto y ver el mensaje de "sin resultados"', async ({ page }) => {
    await register(page);
    await seed(page, [{ title: 'Entregar informe de ventas' }, { title: 'Comprar café' }]);
    await page.goto('/tareas');

    await page.getByLabel('Buscar').fill('informe');
    await expect(page.getByText('1 tarea con estos filtros')).toBeVisible();
    await expect(page.getByText('Entregar informe de ventas')).toBeVisible();
    await expect(page.getByText('Comprar café')).toBeHidden();

    await page.getByLabel('Buscar').fill('zzz');
    await expect(page.getByText('Ninguna tarea coincide con los filtros')).toBeVisible();
  });

  test('TC-E2E-LST-03 solo vencidas muestra únicamente las de fecha pasada sin completar', async ({
    page,
  }) => {
    await register(page);
    await seed(page, [
      { title: 'Vencida', dueDate: '2020-01-01' },
      { title: 'Futura', dueDate: '2099-01-01' },
      { title: 'Vieja pero hecha', dueDate: '2020-01-01', status: 'DONE' },
    ]);
    await page.goto('/tareas');

    await page.getByLabel('Solo vencidas').click();
    await expect(page.getByLabel('Solo vencidas')).toBeChecked();

    await expect(page.getByText('1 tarea con estos filtros')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vencida' })).toBeVisible();
  });

  test('TC-E2E-LST-04 paginación: 12 tareas se reparten en 2 páginas de 10 y 2', async ({
    page,
  }) => {
    await register(page);
    await seed(
      page,
      Array.from({ length: 12 }, (_, i) => ({ title: `Tarea ${String(i + 1).padStart(2, '0')}` })),
    );
    await page.goto('/tareas?sort=title_asc');

    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Resultados' }).getByRole('listitem')).toHaveCount(
      10,
    );

    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Resultados' }).getByRole('listitem')).toHaveCount(
      2,
    );
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  test('TC-E2E-LST-05 se puede editar y eliminar desde la lista', async ({ page }) => {
    await register(page);
    await seed(page, [{ title: 'Para borrar' }]);
    await page.goto('/tareas');

    await page.getByRole('button', { name: 'Eliminar tarea: Para borrar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();

    await expect(page.getByText('Aún no tienes tareas')).toBeVisible();
  });
});

test.describe('TC-E2E-DSH: dashboard', () => {
  test('TC-E2E-DSH-01 sin tareas, todo en 0 y la tasa de finalización es 0%', async ({ page }) => {
    await register(page);
    await page.getByRole('link', { name: 'Dashboard' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/Aún no tienes tareas/)).toBeVisible();
    await expect(kpi(page, 'Total').getByText('0', { exact: true })).toBeVisible();
    await expect(kpi(page, 'Tasa de finalización').getByText('0%')).toBeVisible();
  });

  test('TC-E2E-DSH-02 las cifras reflejan las tareas reales y se actualizan al cambiarlas', async ({
    page,
  }) => {
    await register(page);
    await seed(page, [
      { title: 'a', status: 'DONE' },
      { title: 'b', dueDate: '2020-01-01' },
      { title: 'c', status: 'IN_PROGRESS' },
      { title: 'd' },
    ]);
    await page.goto('/dashboard');

    await expect(kpi(page, 'Total').getByText('4', { exact: true })).toBeVisible();
    await expect(kpi(page, 'Completadas').getByText('1', { exact: true })).toBeVisible();
    await expect(kpi(page, 'Vencidas').getByText('1', { exact: true })).toBeVisible();
    await expect(kpi(page, 'Tasa de finalización').getByText('25%')).toBeVisible();
    await expect(page.getByRole('region', { name: /últimos 14 días/ })).toContainText(
      '1 en total.',
    );

    // Completar otra tarea desde el tablero y volver: las cifras cambian sin recargar a mano.
    await page.getByRole('link', { name: 'Tablero' }).click();
    await page.getByLabel('Mover tarea: d').selectOption({ label: 'Mover a: Completada' });
    await page.getByRole('link', { name: 'Dashboard' }).click();

    await expect(kpi(page, 'Completadas').getByText('2', { exact: true })).toBeVisible();
    await expect(kpi(page, 'Tasa de finalización').getByText('50%')).toBeVisible();
  });

  test('TC-E2E-DSH-03 cada cuenta ve solo sus propias cifras', async ({ page, browser }) => {
    await register(page);
    await seed(page, [{ title: 'mía' }]);
    const other = await browser.newPage();
    await register(other);

    await other.goto('/dashboard');

    await expect(kpi(other, 'Total').getByText('0', { exact: true })).toBeVisible();
    await other.close();
  });
});

test.describe('TC-E2E-A11Y: pantallas de la Fase 4', () => {
  for (const path of ['/tareas', '/dashboard']) {
    test(`TC-E2E-A11Y-04 ${path} con datos: sin violaciones WCAG 2.1 AA`, async ({ page }) => {
      await register(page);
      await seed(page, [
        { title: 'Urgente vencida', priority: 'URGENT', dueDate: '2020-01-01' },
        { title: 'Hecha', status: 'DONE', priority: 'LOW' },
        { title: 'En curso', status: 'IN_PROGRESS', priority: 'HIGH' },
      ]);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/Cargando/)).toBeHidden();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(
        results.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes[0]?.target.join(' ')}`),
      ).toEqual([]);
    });
  }
});
