/** E2E: arrastrar y soltar tareas entre columnas con el mouse, incluso cuando la API falla. */
import { expect, test, type Page } from '@playwright/test';
import { register } from './support';

const column = (page: Page, name: string) => page.getByRole('region', { name });

async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Nueva tarea' }).first().click();
  await page.getByLabel('Título').fill(title);
  await page.getByRole('button', { name: 'Crear tarea' }).click();
  await expect(column(page, 'Pendiente').getByText(title)).toBeVisible();
}

/** Arrastra la tarjeta (desde su asa) hasta el centro de la columna, con movimientos intermedios como una persona. */
async function drag(page: Page, title: string, targetColumn: string) {
  const handle = page
    .getByTestId('task-card')
    .filter({ hasText: title })
    .getByTitle('Arrastrar a otra columna');
  const from = (await handle.boundingBox())!;
  const to = (await column(page, targetColumn).boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 15 });
  await page.mouse.up();
  // La copia que se arrastra tarda ~250 ms en "asentarse"; un nuevo arrastre no puede empezar antes.
  await page.waitForTimeout(400);
}

test.describe('TC-E2E-KAN: arrastrar y soltar', () => {
  test('TC-E2E-KAN-01 arrastrar una tarjeta a otra columna la mueve y persiste al recargar', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, 'Entregar informe');

    await drag(page, 'Entregar informe', 'En progreso');

    await expect(column(page, 'En progreso').getByText('Entregar informe')).toBeVisible();
    await expect(column(page, 'Pendiente').getByText('Entregar informe')).toBeHidden();

    await page.reload();
    await expect(column(page, 'En progreso').getByText('Entregar informe')).toBeVisible();
  });

  test('TC-E2E-KAN-02 arrastrar a Completada la completa y se puede devolver a Pendiente', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, 'Pagar el internet');

    await drag(page, 'Pagar el internet', 'Completada');
    await expect(column(page, 'Completada').getByText('Pagar el internet')).toBeVisible();

    await drag(page, 'Pagar el internet', 'Pendiente');
    await expect(column(page, 'Pendiente').getByText('Pagar el internet')).toBeVisible();
    await page.reload();
    await expect(column(page, 'Pendiente').getByText('Pagar el internet')).toBeVisible();
  });

  test('TC-E2E-KAN-03 soltar la tarjeta en su misma columna, o fuera de las columnas, no cambia nada', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, 'Se queda donde está');
    let patches = 0;
    page.on('request', (request) => request.method() === 'PATCH' && patches++);

    await drag(page, 'Se queda donde está', 'Pendiente');
    const handle = page.getByTitle('Arrastrar a otra columna');
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 20, { steps: 4 });
    await page.mouse.move(5, 5, { steps: 10 }); // fuera de todas las columnas
    await page.mouse.up();

    await expect(column(page, 'Pendiente').getByText('Se queda donde está')).toBeVisible();
    expect(patches).toBe(0);
  });

  test('TC-E2E-KAN-04 un clic en la tarjeta o en sus botones no inicia un arrastre', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, 'Solo un clic');

    await page.getByRole('button', { name: 'Editar tarea: Solo un clic' }).click();

    await expect(page.getByRole('dialog', { name: 'Editar tarea' })).toBeVisible();
  });

  test('TC-E2E-KAN-05 si la API se cae durante el movimiento, la tarjeta vuelve y se informa el fallo', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, 'No se debe perder');
    await page.route('**/api/tasks/*', (route) =>
      route.request().method() === 'PATCH' ? route.abort() : route.continue(),
    );

    await drag(page, 'No se debe perder', 'En revisión');

    await expect(
      page.getByText('No se pudo mover “No se debe perder”. Volvió a Pendiente.'),
    ).toBeVisible();
    await expect(column(page, 'Pendiente').getByText('No se debe perder')).toBeVisible();
    await expect(column(page, 'En revisión').getByText('No se debe perder')).toBeHidden();

    // Al volver la API, el mismo movimiento funciona (la interfaz quedó consistente).
    await page.unroute('**/api/tasks/*');
    await drag(page, 'No se debe perder', 'En revisión');
    await expect(column(page, 'En revisión').getByText('No se debe perder')).toBeVisible();
    await page.reload();
    await expect(column(page, 'En revisión').getByText('No se debe perder')).toBeVisible();
  });

  test('TC-E2E-KAN-06 el servidor responde error al mover: se restaura y se avisa', async ({
    page,
  }) => {
    await register(page);
    await createTask(page, 'Con error del servidor');
    await page.route('**/api/tasks/*', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: { message: 'Error interno' } }),
          })
        : route.continue(),
    );

    await drag(page, 'Con error del servidor', 'Completada');

    await expect(page.getByText(/No se pudo mover “Con error del servidor”/)).toBeVisible();
    await expect(column(page, 'Pendiente').getByText('Con error del servidor')).toBeVisible();
  });
});
