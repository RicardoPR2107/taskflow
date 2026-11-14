/** Pruebas de la pantalla "Tareas": filtros sincronizados con la URL, petición al servidor y paginación. */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TaskDto } from '@taskflow/shared';
import { ANA, mockApi, renderApp } from './helpers';

let counter = 0;
const makeTask = (overrides: Partial<TaskDto> = {}): TaskDto => ({
  id: `00000000-0000-4000-8000-00000000010${++counter}`,
  title: 'Pagar el internet',
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
const page = (tasks: TaskDto[], total = tasks.length, pageNumber = 1) => ({
  body: { tasks, total, page: pageNumber, pageSize: 10 },
});
const SESSION = { 'GET /users/me': { body: { user: ANA } } };
const FIRST = 'GET /tasks?page=1&pageSize=10';

const open = async (path: string, extra: Parameters<typeof mockApi>[0] = {}) => {
  const api = mockApi({ ...SESSION, [FIRST]: page([]), ...extra });
  const utils = renderApp(path);
  await screen.findByRole('heading', { name: 'Tareas' });
  return { api, ...utils };
};

describe('TC-WEB-LST: lista de tareas', () => {
  it('TC-WEB-LST-01 pide al servidor la página 1 con 10 tareas y muestra el total', async () => {
    await open('/tareas', {
      [FIRST]: page([makeTask({ title: 'Revisar pull request' }), makeTask()], 2),
    });

    expect(await screen.findByText('Revisar pull request')).toBeInTheDocument();
    expect(screen.getByText('2 tareas')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });

  it('TC-WEB-LST-02 sin tareas, invita a crear una; con filtros, dice que nada coincide', async () => {
    await open('/tareas');
    expect(await screen.findByText('Aún no tienes tareas')).toBeInTheDocument();
  });

  it('TC-WEB-LST-03 los filtros de la URL se aplican al abrir la pantalla y se envían a la API', async () => {
    const { api } = await open('/tareas?status=DONE&priority=HIGH&overdue=true&sort=title_asc', {
      'GET /tasks?page=1&pageSize=10&status=DONE&priority=HIGH&overdue=true&sort=title_asc': page(
        [],
      ),
    });

    expect(await screen.findByText('Ninguna tarea coincide con los filtros')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado')).toHaveValue('DONE');
    expect(screen.getByLabelText('Prioridad')).toHaveValue('HIGH');
    expect(screen.getByLabelText('Solo vencidas')).toBeChecked();
    expect(api.calls.some((c) => c.key.includes('overdue=true'))).toBe(true);
  });

  it('TC-WEB-LST-04 cambiar un filtro actualiza la URL y vuelve a pedir los datos', async () => {
    const { router } = await open('/tareas', {
      'GET /tasks?page=1&pageSize=10&status=IN_PROGRESS': page([
        makeTask({ title: 'En marcha', status: 'IN_PROGRESS' }),
      ]),
    });

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'IN_PROGRESS' } });

    expect(await screen.findByText('En marcha')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=IN_PROGRESS');
  });

  it('TC-WEB-LST-05 la búsqueda espera a que el usuario deje de escribir', async () => {
    const { api, router } = await open('/tareas', {
      'GET /tasks?page=1&pageSize=10&q=informe': page([makeTask({ title: 'Entregar informe' })]),
    });

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'informe' } });

    expect(await screen.findByText('Entregar informe')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=informe');
    expect(api.calls.filter((c) => c.key.includes('q=')).length).toBe(1); // una sola petición
  });

  it('TC-WEB-LST-06 "Limpiar filtros" borra todo y vuelve a la lista completa', async () => {
    const { router, user } = await open('/tareas?status=DONE', {
      'GET /tasks?page=1&pageSize=10&status=DONE': page([]),
    });

    await user.click(await screen.findByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByLabelText('Estado')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
  });

  it('TC-WEB-LST-07 paginación: muestra "Página X de Y" y avanza o retrocede', async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => makeTask({ title: `Tarea ${i + 1}` }));
    const { user, router } = await open('/tareas', {
      [FIRST]: page(tasks, 25),
      'GET /tasks?page=2&pageSize=10': page([makeTask({ title: 'Tarea 11' })], 25, 2),
    });

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
    expect(await screen.findByText('Tarea 11')).toBeInTheDocument();
  });

  it('TC-WEB-LST-08 cambiar un filtro desde la página 2 vuelve a la página 1', async () => {
    const { router } = await open('/tareas?page=2', {
      'GET /tasks?page=2&pageSize=10': page([makeTask()], 25, 2),
      'GET /tasks?page=1&pageSize=10&priority=LOW': page([]),
    });
    await screen.findByText('Página 2 de 3');

    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'LOW' } });

    await waitFor(() => expect(router.state.location.search).toBe('?priority=LOW'));
  });

  it('TC-WEB-LST-09 filtros inválidos en la URL se ignoran con un aviso, sin romper la pantalla', async () => {
    await open('/tareas?status=NADA&page=abc');

    expect(await screen.findByText(/no son válidos y se ignoraron/)).toBeInTheDocument();
    expect(screen.getByLabelText('Estado')).toHaveValue('');
  });

  it('TC-WEB-LST-10 si la API falla, muestra el error y permite reintentar', async () => {
    let fail = true;
    await open('/tareas', {
      [FIRST]: () =>
        fail
          ? { status: 500, body: { error: { message: 'Algo salió mal' } } }
          : page([makeTask({ title: 'Recuperada' })]),
    });

    expect(await screen.findByText('Algo salió mal')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Recuperada')).toBeInTheDocument();
  });
});
