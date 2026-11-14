/** E2E: crear, editar, completar y eliminar tareas, con la API y la base de datos reales (RF de tareas, RF-31). */
import { expect, test, type Page } from '@playwright/test';
import { login, logout, register } from './support';

const column = (page: Page, name: string) => page.getByRole('region', { name });
const dialog = (page: Page, name: string) => page.getByRole('dialog', { name });

async function createTask(
  page: Page,
  {
    title,
    priority,
    dueDate,
    status,
  }: { title: string; priority?: string; dueDate?: string; status?: string },
) {
  await page.getByRole('button', { name: 'Nueva tarea' }).first().click();
  await page.getByLabel('Título').fill(title);
  if (priority) await page.getByLabel('Prioridad').selectOption({ label: priority });
  if (status) await page.getByLabel('Estado').selectOption({ label: status });
  if (dueDate) await page.getByLabel('Fecha límite (opcional)').fill(dueDate);
  await page.getByRole('button', { name: 'Crear tarea' }).click();
  await expect(dialog(page, 'Nueva tarea')).toBeHidden();
}

test.describe('TC-E2E-TSK: tareas', () => {
  test('TC-E2E-TSK-01 crear una tarea la muestra en Pendiente y sigue ahí tras recargar', async ({
    page,
  }) => {
    await register(page);
    await expect(page.getByText('Aún no tienes tareas')).toBeVisible();

    await createTask(page, {
      title: 'Entregar informe de ventas',
      priority: 'Alta',
      dueDate: '2099-12-31',
    });

    await expect(page.getByText('Tarea creada')).toBeVisible();
    const pending = column(page, 'Pendiente');
    await expect(pending.getByText('Entregar informe de ventas')).toBeVisible();
    await expect(pending.getByText('Alta')).toBeVisible();
    await expect(pending.getByText('Vence 31/12/2099')).toBeVisible();
    await expect(page.getByText('Aún no tienes tareas')).toBeHidden();

    await page.reload();
    await expect(column(page, 'Pendiente').getByText('Entregar informe de ventas')).toBeVisible();
  });

  test('TC-E2E-TSK-02 crear una tarea sin título se rechaza y la ventana sigue abierta', async ({
    page,
  }) => {
    await register(page);

    await page.getByRole('button', { name: 'Nueva tarea' }).first().click();
    await page.getByRole('button', { name: 'Crear tarea' }).click();

    await expect(page.getByText('Escribe un título')).toBeVisible();
    await expect(dialog(page, 'Nueva tarea')).toBeVisible();
  });

  test('TC-E2E-TSK-03 un título de 101 caracteres se rechaza', async ({ page }) => {
    await register(page);

    await page.getByRole('button', { name: 'Nueva tarea' }).first().click();
    await page.getByLabel('Título').fill('a'.repeat(101));
    await page.getByRole('button', { name: 'Crear tarea' }).click();

    await expect(page.getByText(/no puede superar 100 caracteres/)).toBeVisible();
  });

  test('TC-E2E-TSK-04 pasar una tarea de Pendiente a Completada persiste al recargar', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, { title: 'Revisar pull request' });

    await page.getByRole('button', { name: 'Editar tarea: Revisar pull request' }).click();
    await page.getByLabel('Estado').selectOption({ label: 'Completada' });
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Tarea actualizada')).toBeVisible();
    await expect(column(page, 'Completada').getByText('Revisar pull request')).toBeVisible();
    await expect(column(page, 'Pendiente').getByText('Revisar pull request')).toBeHidden();

    await page.reload();
    await expect(column(page, 'Completada').getByText('Revisar pull request')).toBeVisible();
  });

  test('TC-E2E-TSK-05 editar el título y la prioridad guarda los cambios', async ({ page }) => {
    await register(page);
    await createTask(page, { title: 'Titulo con error' });

    await page.getByRole('button', { name: 'Editar tarea: Titulo con error' }).click();
    await expect(page.getByLabel('Título')).toHaveValue('Titulo con error');
    await page.getByLabel('Título').fill('Título corregido');
    await page.getByLabel('Prioridad').selectOption({ label: 'Urgente' });
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    const pending = column(page, 'Pendiente');
    await expect(pending.getByText('Título corregido')).toBeVisible();
    await expect(pending.getByText('Urgente')).toBeVisible();
    await expect(pending.getByText('Titulo con error')).toBeHidden();
  });

  test('TC-E2E-TSK-06 eliminar pide confirmación: cancelar conserva la tarea y confirmar la borra', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, { title: 'Pagar el internet' });

    await page.getByRole('button', { name: 'Eliminar tarea: Pagar el internet' }).click();
    await expect(dialog(page, '¿Eliminar esta tarea?')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('Pagar el internet')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar tarea: Pagar el internet' }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();

    await expect(page.getByText('Tarea eliminada')).toBeVisible();
    await expect(page.getByText('Pagar el internet')).toBeHidden();
    await expect(page.getByText('Aún no tienes tareas')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Aún no tienes tareas')).toBeVisible();
  });

  test('TC-E2E-TSK-07 una tarea con fecha pasada aparece como vencida y deja de estarlo al completarla', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, { title: 'Tarea atrasada', dueDate: '2020-01-01' });

    const pending = column(page, 'Pendiente');
    await expect(pending.getByText('Vencida')).toBeVisible();

    await page.getByRole('button', { name: 'Editar tarea: Tarea atrasada' }).click();
    await page.getByLabel('Estado').selectOption({ label: 'Completada' });
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    const done = column(page, 'Completada');
    await expect(done.getByText('Tarea atrasada')).toBeVisible();
    await expect(done.getByText('Vencida')).toBeHidden();
  });

  test('TC-E2E-TSK-08 cada cuenta ve solo sus tareas', async ({ page }) => {
    const ana = await register(page, { name: 'Ana' });
    await createTask(page, { title: 'Secreto de Ana' });
    await logout(page);

    await register(page, { name: 'Luis' });
    await expect(page.getByText('Aún no tienes tareas')).toBeVisible();
    await expect(page.getByText('Secreto de Ana')).toBeHidden();
    await logout(page);

    await login(page, ana.email, ana.password);
    await expect(page.getByText('Secreto de Ana')).toBeVisible();
  });

  test('TC-E2E-TSK-09 con el teclado: Escape cierra la ventana y el foco vuelve al botón', async ({
    page,
  }) => {
    await register(page);
    const open = page.getByRole('button', { name: 'Nueva tarea' }).first();

    await open.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Título')).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(dialog(page, 'Nueva tarea')).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('TC-E2E-TSK-10 si la API falla al guardar, avisa y conserva lo escrito', async ({
    page,
  }) => {
    await register(page);
    await page.route('**/api/tasks', (route) =>
      route.request().method() === 'POST' ? route.abort() : route.continue(),
    );

    await page.getByRole('button', { name: 'Nueva tarea' }).first().click();
    await page.getByLabel('Título').fill('No se perderá');
    await page.getByRole('button', { name: 'Crear tarea' }).click();

    await expect(page.getByText(/No se pudo conectar con el servidor/)).toBeVisible();
    await expect(page.getByLabel('Título')).toHaveValue('No se perderá');

    await page.unroute('**/api/tasks');
    await page.getByRole('button', { name: 'Crear tarea' }).click();
    await expect(column(page, 'Pendiente').getByText('No se perderá')).toBeVisible();
  });
});

test.describe('TC-E2E-TSK: mover con el selector', () => {
  test('TC-E2E-TSK-11 el selector "Mover a" cambia la tarea de columna y persiste al recargar', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, { title: 'Preparar la demo' });

    await page
      .getByLabel('Mover tarea: Preparar la demo')
      .selectOption({ label: 'Mover a: En progreso' });

    await expect(column(page, 'En progreso').getByText('Preparar la demo')).toBeVisible();
    await expect(column(page, 'Pendiente').getByText('Preparar la demo')).toBeHidden();
    await expect(page.getByText('“Preparar la demo” pasó a En progreso')).toBeVisible();

    await page.reload();
    await expect(column(page, 'En progreso').getByText('Preparar la demo')).toBeVisible();
  });
});
