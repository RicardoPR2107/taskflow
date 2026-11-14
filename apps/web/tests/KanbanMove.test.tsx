/** Pruebas de componentes del movimiento de tareas: cambio inmediato, restauración ante fallos y reconciliación. */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { TaskDto } from '@taskflow/shared';
import { ANA, TASKS_LIST, mockApi, renderApp } from './helpers';

const makeTask = (overrides: Partial<TaskDto> = {}): TaskDto => ({
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Revisar pull request',
  description: null,
  status: 'PENDING',
  priority: 'MEDIUM',
  dueDate: null,
  completedAt: null,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
  isOverdue: false,
  ...overrides,
});
const listOf = (tasks: TaskDto[]) => ({
  body: { tasks, total: tasks.length, page: 1, pageSize: 100 },
});
const columnOf = async (name: string) =>
  (await screen.findByRole('heading', { name })).closest('section')!;

/** Un "servidor" que guarda el estado de la tarea, para que las recargas devuelvan lo guardado. */
function boardWith(task: TaskDto, patch: (body: { status: TaskDto['status'] }) => unknown) {
  let stored = task;
  const api = mockApi({
    'GET /users/me': { body: { user: ANA } },
    [TASKS_LIST]: () => listOf([stored]),
    [`PATCH /tasks/${task.id}`]: async ({ body }) => {
      const result = (await patch(body)) as { status?: number; body?: unknown } | undefined;
      if (result?.status && result.status >= 400) return result;
      stored = { ...stored, status: body.status };
      return { body: { task: stored } };
    },
  });
  renderApp('/tablero');
  return api;
}

describe('TC-WEB-KAN: mover tareas entre columnas', () => {
  it('TC-WEB-KAN-01 la tarjeta cambia de columna AL INSTANTE, sin esperar al servidor', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const task = makeTask();
    const api = boardWith(task, () => gate);

    const select = await screen.findByLabelText('Mover tarea: Revisar pull request');
    await userEvent.setup().selectOptions(select, 'IN_PROGRESS');

    // El servidor todavía no respondió, pero la tarjeta ya está en la columna nueva.
    const inProgress = await columnOf('En progreso');
    expect(within(inProgress).getByText('Revisar pull request')).toBeInTheDocument();
    expect(within(await columnOf('Pendiente')).queryByText('Revisar pull request')).toBeNull();

    release();
    expect(
      await screen.findByText('“Revisar pull request” pasó a En progreso'),
    ).toBeInTheDocument();
    expect(api.callsTo(`PATCH /tasks/${task.id}`)[0]!.body).toEqual({ status: 'IN_PROGRESS' });
  });

  it('TC-WEB-KAN-02 si la API falla, la tarjeta vuelve a su columna y se avisa del error', async () => {
    const task = makeTask();
    boardWith(task, () => ({ status: 500, body: { error: { message: 'Error interno' } } }));

    const select = await screen.findByLabelText('Mover tarea: Revisar pull request');
    await userEvent.setup().selectOptions(select, 'DONE');

    expect(
      await screen.findByText('No se pudo mover “Revisar pull request”. Volvió a Pendiente.'),
    ).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        within(await columnOf('Pendiente')).getByText('Revisar pull request'),
      ).toBeInTheDocument(),
    );
    expect(within(await columnOf('Completada')).queryByText('Revisar pull request')).toBeNull();
  });

  it('TC-WEB-KAN-03 si se cae la conexión al mover, también se restaura y se avisa', async () => {
    const task = makeTask();
    mockApi({
      'GET /users/me': { body: { user: ANA } },
      [TASKS_LIST]: listOf([task]),
      [`PATCH /tasks/${task.id}`]: () => {
        throw new Error('sin red');
      },
    });
    renderApp('/tablero');

    const select = await screen.findByLabelText('Mover tarea: Revisar pull request');
    await userEvent.setup().selectOptions(select, 'IN_REVIEW');

    expect(await screen.findByText(/No se pudo mover/)).toBeInTheDocument();
    expect(
      within(await columnOf('Pendiente')).getByText('Revisar pull request'),
    ).toBeInTheDocument();
  });

  it('TC-WEB-KAN-04 completar una tarea vencida le quita el aviso "Vencida" de inmediato', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const task = makeTask({ dueDate: '2020-01-01', isOverdue: true });
    boardWith(task, () => gate);

    expect(await screen.findByText('Vencida')).toBeInTheDocument();
    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText('Mover tarea: Revisar pull request'), 'DONE');

    await waitFor(() => expect(screen.queryByText('Vencida')).not.toBeInTheDocument());
    release();
  });

  it('TC-WEB-KAN-05 el selector ofrece los 4 estados y muestra el actual', async () => {
    boardWith(makeTask({ status: 'IN_REVIEW' }), () => undefined);

    const select = (await screen.findByLabelText(
      'Mover tarea: Revisar pull request',
    )) as HTMLSelectElement;

    expect(select.value).toBe('IN_REVIEW');
    expect(within(select).getAllByRole('option')).toHaveLength(4);
  });
});
