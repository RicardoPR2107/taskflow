/** Pruebas de componentes del tablero con tareas: crear, editar, eliminar y estados de pantalla. */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TaskDto } from '@taskflow/shared';
import { ANA, TASKS_LIST, mockApi, renderApp } from './helpers';

let counter = 0;
const makeTask = (overrides: Partial<TaskDto> = {}): TaskDto => ({
  id: `00000000-0000-4000-8000-00000000000${++counter}`,
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
const listOf = (tasks: TaskDto[]) => ({
  body: { tasks, total: tasks.length, page: 1, pageSize: 100 },
});
const SESSION = { 'GET /users/me': { body: { user: ANA } } };

const openBoard = async (extra: Parameters<typeof mockApi>[0] = {}) => {
  const api = mockApi({ ...SESSION, ...extra });
  const utils = renderApp('/tablero');
  await screen.findByRole('heading', { name: /Hola/ });
  return { api, ...utils };
};

describe('TC-WEB-TSK: tablero (estados de pantalla)', () => {
  it('TC-WEB-TSK-01 sin tareas, invita a crear la primera y las 4 columnas dicen "Sin tareas"', async () => {
    await openBoard();

    expect(await screen.findByText('Aún no tienes tareas')).toBeInTheDocument();
    expect(screen.getAllByText('Sin tareas')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Crear mi primera tarea' })).toBeInTheDocument();
  });

  it('TC-WEB-TSK-02 cada tarea aparece en su columna con prioridad, fecha y aviso de vencida', async () => {
    await openBoard({
      [TASKS_LIST]: listOf([
        makeTask({ title: 'Revisar pull request', status: 'IN_PROGRESS', priority: 'HIGH' }),
        makeTask({ title: 'Entregar informe', dueDate: '2026-03-05', isOverdue: true }),
      ]),
    });

    const inProgress = (await screen.findByRole('heading', { name: 'En progreso' })).closest(
      'section',
    )!;
    expect(within(inProgress).getByText('Revisar pull request')).toBeInTheDocument();
    expect(within(inProgress).getByText('Alta')).toBeInTheDocument();

    const pending = screen.getByRole('heading', { name: 'Pendiente' }).closest('section')!;
    expect(within(pending).getByText('Entregar informe')).toBeInTheDocument();
    expect(within(pending).getByText('Vence 05/03/2026')).toBeInTheDocument();
    expect(within(pending).getByText('Vencida')).toBeInTheDocument();
  });

  it('TC-WEB-TSK-03 mientras se cargan las tareas muestra el indicador de carga', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockApi({
      ...SESSION,
      [TASKS_LIST]: async () => {
        await gate;
        return listOf([]);
      },
    });
    renderApp('/tablero');

    expect(await screen.findByText('Cargando tus tareas…')).toBeInTheDocument();
    release();
    await waitFor(() => expect(screen.queryByText('Cargando tus tareas…')).not.toBeInTheDocument());
  });

  it('TC-WEB-TSK-04 si falla la carga, muestra el error y "Reintentar" la recupera', async () => {
    let failing = true;
    await openBoard({
      [TASKS_LIST]: () =>
        failing
          ? { status: 500, body: { error: { message: 'Error interno del servidor' } } }
          : listOf([makeTask({ title: 'Ya cargó' })]),
    });

    expect(await screen.findByText('Error interno del servidor')).toBeInTheDocument();
    failing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ya cargó')).toBeInTheDocument();
    expect(screen.queryByText('Error interno del servidor')).not.toBeInTheDocument();
  });
});

describe('TC-WEB-TSK: crear', () => {
  it('TC-WEB-TSK-05 enviar sin título muestra el error en español y NO llama a la API', async () => {
    const { api, user } = await openBoard();

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByText('Escribe un título')).toBeInTheDocument();
    expect(api.callsTo('POST /tasks')).toHaveLength(0);
  });

  it('TC-WEB-TSK-06 un título de más de 100 caracteres se rechaza con el límite en el mensaje', async () => {
    const { api, user } = await openBoard();

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    await user.type(screen.getByLabelText('Título'), 'a'.repeat(101));
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByText(/no puede superar 100 caracteres/)).toBeInTheDocument();
    expect(api.callsTo('POST /tasks')).toHaveLength(0);
  });

  it('TC-WEB-TSK-07 una tarea válida se envía limpia, se avisa, se cierra la ventana y aparece en el tablero', async () => {
    const tasks: TaskDto[] = [];
    const { api, user } = await openBoard({
      [TASKS_LIST]: () => listOf(tasks),
      'POST /tasks': ({ body }) => {
        const task = makeTask({ title: body.title, priority: body.priority });
        tasks.push(task);
        return { status: 201, body: { task } };
      },
    });

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    await user.type(screen.getByLabelText('Título'), '  Estudiar para el examen  ');
    await user.selectOptions(screen.getByLabelText('Prioridad'), 'URGENT');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByText('Tarea creada')).toBeInTheDocument();
    expect(api.callsTo('POST /tasks')[0]!.body).toEqual({
      title: 'Estudiar para el examen',
      description: null,
      status: 'PENDING',
      priority: 'URGENT',
      dueDate: null,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Estudiar para el examen')).toBeInTheDocument();
  });

  it('TC-WEB-TSK-08 los errores por campo que devuelve el servidor se muestran junto al campo', async () => {
    const { user } = await openBoard({
      'POST /tasks': {
        status: 400,
        body: { error: { message: 'Datos inválidos', details: { title: ['Escribe un título'] } } },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    await user.type(screen.getByLabelText('Título'), 'Algo');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByText('Escribe un título')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // la ventana sigue abierta
  });

  it('TC-WEB-TSK-09 si no hay conexión, avisa dentro de la ventana y conserva lo escrito', async () => {
    const { user } = await openBoard({
      'POST /tasks': () => {
        throw new Error('sin red');
      },
    });

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    await user.type(screen.getByLabelText('Título'), 'Algo importante');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByText(/No se pudo conectar con el servidor/)).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Algo importante');
  });

  it('TC-WEB-TSK-10 Cancelar y la tecla Escape cierran la ventana sin guardar', async () => {
    const { api, user } = await openBoard();

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    expect(screen.getByRole('dialog', { name: 'Nueva tarea' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.callsTo('POST /tasks')).toHaveLength(0);
  });

  it('TC-WEB-TSK-11 al abrir la ventana, el foco queda en el título', async () => {
    const { user } = await openBoard();

    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));

    expect(screen.getByLabelText('Título')).toHaveFocus();
  });
});

describe('TC-WEB-TSK: editar', () => {
  it('TC-WEB-TSK-12 la ventana trae los datos de la tarea y al guardar envía los cambios', async () => {
    const task = makeTask({ title: 'Original', description: 'Detalle', priority: 'LOW' });
    const { api, user } = await openBoard({
      [TASKS_LIST]: listOf([task]),
      [`PATCH /tasks/${task.id}`]: ({ body }) => ({
        body: { task: { ...task, ...body, completedAt: '2026-03-09T12:00:00.000Z' } },
      }),
    });

    await user.click(await screen.findByRole('button', { name: 'Editar tarea: Original' }));
    expect(screen.getByLabelText('Título')).toHaveValue('Original');
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('Detalle');
    expect(screen.getByLabelText('Prioridad')).toHaveValue('LOW');

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Corregido');
    await user.selectOptions(screen.getByLabelText('Estado'), 'DONE');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Tarea actualizada')).toBeInTheDocument();
    expect(api.callsTo(`PATCH /tasks/${task.id}`)[0]!.body).toMatchObject({
      title: 'Corregido',
      description: 'Detalle',
      status: 'DONE',
      priority: 'LOW',
      dueDate: null,
    });
  });

  it('TC-WEB-TSK-13 quitar la fecha límite envía null', async () => {
    const task = makeTask({ title: 'Con fecha', dueDate: '2026-03-20' });
    const { api, user } = await openBoard({
      [TASKS_LIST]: listOf([task]),
      [`PATCH /tasks/${task.id}`]: { body: { task } },
    });

    await user.click(await screen.findByRole('button', { name: 'Editar tarea: Con fecha' }));
    expect(screen.getByLabelText('Fecha límite (opcional)')).toHaveValue('2026-03-20');
    fireEvent.change(screen.getByLabelText('Fecha límite (opcional)'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText('Tarea actualizada');
    expect(api.callsTo(`PATCH /tasks/${task.id}`)[0]!.body.dueDate).toBeNull();
  });
});

describe('TC-WEB-TSK: eliminar (RF-31)', () => {
  it('TC-WEB-TSK-14 pide confirmación, el foco empieza en "Cancelar" y cancelar NO elimina', async () => {
    const task = makeTask({ title: 'No me borres' });
    const { api, user } = await openBoard({ [TASKS_LIST]: listOf([task]) });

    await user.click(await screen.findByRole('button', { name: 'Eliminar tarea: No me borres' }));

    expect(screen.getByRole('dialog', { name: '¿Eliminar esta tarea?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('No me borres')).toBeInTheDocument();
    expect(api.calls.filter((call) => call.key.startsWith('DELETE'))).toHaveLength(0);
  });

  it('TC-WEB-TSK-15 al confirmar, elimina la tarea, avisa y desaparece del tablero', async () => {
    let tasks = [makeTask({ title: 'Borrar esta' })];
    const id = tasks[0]!.id;
    const { api, user } = await openBoard({
      [TASKS_LIST]: () => listOf(tasks),
      [`DELETE /tasks/${id}`]: () => {
        tasks = [];
        return { status: 204 };
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Eliminar tarea: Borrar esta' }));
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    expect(await screen.findByText('Tarea eliminada')).toBeInTheDocument();
    expect(api.callsTo(`DELETE /tasks/${id}`)).toHaveLength(1);
    await waitFor(() => expect(screen.queryByText('Borrar esta')).not.toBeInTheDocument());
  });

  it('TC-WEB-TSK-16 si falla al eliminar, lo avisa en la ventana y la tarea sigue ahí', async () => {
    const task = makeTask({ title: 'Sigue aquí' });
    const { user } = await openBoard({
      [TASKS_LIST]: listOf([task]),
      [`DELETE /tasks/${task.id}`]: {
        status: 404,
        body: { error: { message: 'Tarea no encontrada' } },
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Eliminar tarea: Sigue aquí' }));
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    expect(
      await within(screen.getByRole('dialog')).findByText('Tarea no encontrada'),
    ).toBeVisible();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
