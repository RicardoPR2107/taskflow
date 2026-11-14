/** Pruebas de API de tareas: validaciones, reglas de negocio, propiedad y paginación (RN-01 a RN-10). */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { todayInZone } from '@taskflow/shared';
import { api, loggedInAgent } from './helpers';

const TIMEZONE = 'America/Lima'; // zona por defecto de las cuentas nuevas
const dayFromToday = (days: number) => {
  const [y, m, d] = todayInZone(TIMEZONE).split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
};

type Agent = Awaited<ReturnType<typeof loggedInAgent>>;
const createTask = (agent: Agent, body: Record<string, unknown> = { title: 'Pagar el internet' }) =>
  agent.post('/api/tasks').send(body);

describe('TC-API-TSK: acceso', () => {
  it('TC-API-TSK-01 sin sesión, todas las rutas de tareas responden 401', async () => {
    const id = randomUUID();
    const calls = [
      api().get('/api/tasks'),
      api().post('/api/tasks').send({ title: 'x' }),
      api().get(`/api/tasks/${id}`),
      api().patch(`/api/tasks/${id}`).send({ title: 'x' }),
      api().delete(`/api/tasks/${id}`),
    ];
    for (const response of await Promise.all(calls)) expect(response.status).toBe(401);
  });
});

describe('TC-API-TSK: crear (POST /api/tasks)', () => {
  it('TC-API-TSK-02 con solo el título responde 201 y aplica los valores por defecto', async () => {
    const agent = await loggedInAgent();
    const response = await createTask(agent);

    expect(response.status).toBe(201);
    expect(response.body.task).toMatchObject({
      title: 'Pagar el internet',
      description: null,
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: null,
      completedAt: null,
      isOverdue: false,
    });
    expect(response.body.task.id).toEqual(expect.any(String));
  });

  it('TC-API-TSK-03 sin título, o con solo espacios, se rechaza con 400 (RN-01)', async () => {
    const agent = await loggedInAgent();

    for (const body of [{}, { title: '' }, { title: '    ' }]) {
      const response = await createTask(agent, body);
      expect(response.status).toBe(400);
      expect(response.body.error.details.title).toBeDefined();
    }
  });

  it('TC-API-TSK-04 un título de 100 caracteres se acepta y uno de 101 se rechaza (RN-02)', async () => {
    const agent = await loggedInAgent();

    expect((await createTask(agent, { title: 'a'.repeat(100) })).status).toBe(201);
    const tooLong = await createTask(agent, { title: 'a'.repeat(101) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.details.title[0]).toContain('100');
  });

  it('TC-API-TSK-05 recorta los espacios del título y guarda una descripción vacía como null', async () => {
    const agent = await loggedInAgent();
    const response = await createTask(agent, { title: '  Estudiar  ', description: '   ' });

    expect(response.body.task.title).toBe('Estudiar');
    expect(response.body.task.description).toBeNull();
  });

  it('TC-API-TSK-06 una prioridad o un estado no permitidos se rechazan con 400 (RN-07)', async () => {
    const agent = await loggedInAgent();

    const priority = await createTask(agent, { title: 'x', priority: 'ALTISIMA' });
    expect(priority.status).toBe(400);
    expect(priority.body.error.details.priority).toBeDefined();

    const status = await createTask(agent, { title: 'x', status: 'EN_EL_AIRE' });
    expect(status.status).toBe(400);
    expect(status.body.error.details.status).toBeDefined();
  });

  it('TC-API-TSK-07 una fecha límite inexistente o mal escrita se rechaza con 400', async () => {
    const agent = await loggedInAgent();

    for (const dueDate of ['2026-02-30', 'mañana', '09/03/2026', '2026-13-01']) {
      const response = await createTask(agent, { title: 'x', dueDate });
      expect(response.status).toBe(400);
      expect(response.body.error.details.dueDate).toBeDefined();
    }
  });

  it('TC-API-TSK-08 la tarea pertenece a quien tiene la sesión: un userId enviado se ignora (RN-03)', async () => {
    const ana = await loggedInAgent({ email: 'ana@mail.com' });
    const luis = await loggedInAgent({ name: 'Luis', email: 'luis@mail.com' });
    const luisId = (await luis.get('/api/users/me')).body.user.id;

    const created = await createTask(ana, { title: 'De Ana', userId: luisId });

    expect(created.status).toBe(201);
    expect((await luis.get('/api/tasks')).body.total).toBe(0);
    expect((await ana.get('/api/tasks')).body.total).toBe(1);
  });

  it('TC-API-TSK-09 crear una tarea ya Completada registra su fecha de finalización (RN-04)', async () => {
    const agent = await loggedInAgent();
    const response = await createTask(agent, { title: 'Ya hecha', status: 'DONE' });

    expect(response.body.task.completedAt).toEqual(expect.any(String));
  });
});

describe('TC-API-TSK: consultar (GET)', () => {
  it('TC-API-TSK-10 una tarea creada se puede consultar por su id', async () => {
    const agent = await loggedInAgent();
    const { id } = (await createTask(agent)).body.task;

    const response = await agent.get(`/api/tasks/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.task.title).toBe('Pagar el internet');
  });

  it('TC-API-TSK-11 la lista solo trae las tareas de quien la pide', async () => {
    const ana = await loggedInAgent({ email: 'ana@mail.com' });
    const luis = await loggedInAgent({ name: 'Luis', email: 'luis@mail.com' });
    await createTask(ana, { title: 'De Ana 1' });
    await createTask(ana, { title: 'De Ana 2' });
    await createTask(luis, { title: 'De Luis' });

    const response = await ana.get('/api/tasks');
    expect(response.body.total).toBe(2);
    expect(response.body.tasks.map((t: { title: string }) => t.title).sort()).toEqual([
      'De Ana 1',
      'De Ana 2',
    ]);
  });

  it('TC-API-TSK-12 un id con formato inválido o inexistente responde 404', async () => {
    const agent = await loggedInAgent();

    expect((await agent.get('/api/tasks/no-es-un-id')).status).toBe(404);
    expect((await agent.get(`/api/tasks/${randomUUID()}`)).status).toBe(404);
  });
});

describe('TC-API-TSK: modificar (PATCH)', () => {
  it('TC-API-TSK-13 cambia solo los campos enviados y el resto queda igual', async () => {
    const agent = await loggedInAgent();
    const { id } = (
      await createTask(agent, { title: 'Original', description: 'Detalle', priority: 'HIGH' })
    ).body.task;

    const response = await agent.patch(`/api/tasks/${id}`).send({ title: 'Nuevo título' });

    expect(response.status).toBe(200);
    expect(response.body.task).toMatchObject({
      title: 'Nuevo título',
      description: 'Detalle',
      priority: 'HIGH',
      status: 'PENDING',
    });
  });

  it('TC-API-TSK-14 pasar a Completada guarda la fecha de finalización y persiste al recargar (RN-04)', async () => {
    const agent = await loggedInAgent();
    const { id } = (await createTask(agent)).body.task;

    const patched = await agent.patch(`/api/tasks/${id}`).send({ status: 'DONE' });
    expect(patched.body.task.status).toBe('DONE');
    expect(patched.body.task.completedAt).toEqual(expect.any(String));

    const reloaded = await agent.get(`/api/tasks/${id}`);
    expect(reloaded.body.task.status).toBe('DONE');
    expect(reloaded.body.task.completedAt).toBe(patched.body.task.completedAt);
  });

  it('TC-API-TSK-15 volver de Completada a otro estado borra la fecha de finalización (RN-05)', async () => {
    const agent = await loggedInAgent();
    const { id } = (await createTask(agent, { title: 'x', status: 'DONE' })).body.task;

    const response = await agent.patch(`/api/tasks/${id}`).send({ status: 'IN_PROGRESS' });

    expect(response.body.task.status).toBe('IN_PROGRESS');
    expect(response.body.task.completedAt).toBeNull();
  });

  it('TC-API-TSK-16 editar el título de una tarea Completada no cambia su fecha de finalización', async () => {
    const agent = await loggedInAgent();
    const created = (await createTask(agent, { title: 'x', status: 'DONE' })).body.task;

    const response = await agent
      .patch(`/api/tasks/${created.id}`)
      .send({ title: 'Con otro nombre' });

    expect(response.body.task.completedAt).toBe(created.completedAt);
  });

  it('TC-API-TSK-17 una descripción vacía o una fecha null limpian esos campos', async () => {
    const agent = await loggedInAgent();
    const { id } = (
      await createTask(agent, { title: 'x', description: 'Algo', dueDate: dayFromToday(3) })
    ).body.task;

    const response = await agent.patch(`/api/tasks/${id}`).send({ description: '', dueDate: null });

    expect(response.body.task.description).toBeNull();
    expect(response.body.task.dueDate).toBeNull();
  });

  it('TC-API-TSK-18 un cuerpo vacío o con valores inválidos se rechaza con 400', async () => {
    const agent = await loggedInAgent();
    const { id } = (await createTask(agent)).body.task;

    expect((await agent.patch(`/api/tasks/${id}`).send({})).status).toBe(400);
    expect((await agent.patch(`/api/tasks/${id}`).send({ title: '' })).status).toBe(400);
    expect((await agent.patch(`/api/tasks/${id}`).send({ priority: 'NADA' })).status).toBe(400);
  });
});

describe('TC-API-TSK: vencidas (RN-06, RN-10)', () => {
  const overdueOf = async (agent: Agent, body: Record<string, unknown>) =>
    (await createTask(agent, { title: 'x', ...body })).body.task.isOverdue as boolean;

  it('TC-API-TSK-19 una fecha pasada sin completar está vencida; hoy y mañana, no', async () => {
    const agent = await loggedInAgent();

    expect(await overdueOf(agent, { dueDate: dayFromToday(-1) })).toBe(true);
    expect(await overdueOf(agent, { dueDate: dayFromToday(0) })).toBe(false);
    expect(await overdueOf(agent, { dueDate: dayFromToday(1) })).toBe(false);
    expect(await overdueOf(agent, {})).toBe(false);
  });

  it('TC-API-TSK-20 una tarea con fecha pasada pero Completada no está vencida', async () => {
    const agent = await loggedInAgent();

    expect(await overdueOf(agent, { dueDate: dayFromToday(-5), status: 'DONE' })).toBe(false);
  });

  it('TC-API-TSK-21 completar una tarea vencida la saca de vencidas, y reabrirla la devuelve', async () => {
    const agent = await loggedInAgent();
    const { id } = (await createTask(agent, { title: 'x', dueDate: dayFromToday(-2) })).body.task;

    expect(
      (await agent.patch(`/api/tasks/${id}`).send({ status: 'DONE' })).body.task.isOverdue,
    ).toBe(false);
    expect(
      (await agent.patch(`/api/tasks/${id}`).send({ status: 'PENDING' })).body.task.isOverdue,
    ).toBe(true);
  });
});

describe('TC-API-TSK: propiedad (RN-08)', () => {
  it('TC-API-TSK-22 nadie puede ver, modificar ni borrar la tarea de otra cuenta', async () => {
    const ana = await loggedInAgent({ email: 'ana@mail.com' });
    const luis = await loggedInAgent({ name: 'Luis', email: 'luis@mail.com' });
    const { id } = (await createTask(luis, { title: 'Privada de Luis' })).body.task;

    expect((await ana.get(`/api/tasks/${id}`)).status).toBe(404);
    expect((await ana.patch(`/api/tasks/${id}`).send({ title: 'Hackeada' })).status).toBe(404);
    expect((await ana.delete(`/api/tasks/${id}`)).status).toBe(404);

    const intact = await luis.get(`/api/tasks/${id}`);
    expect(intact.status).toBe(200);
    expect(intact.body.task.title).toBe('Privada de Luis');
  });
});

describe('TC-API-TSK: eliminar (DELETE)', () => {
  it('TC-API-TSK-23 al eliminar responde 204 y la tarea desaparece de la consulta y de la lista', async () => {
    const agent = await loggedInAgent();
    const { id } = (await createTask(agent)).body.task;

    expect((await agent.delete(`/api/tasks/${id}`)).status).toBe(204);
    expect((await agent.get(`/api/tasks/${id}`)).status).toBe(404);
    expect((await agent.get('/api/tasks')).body.total).toBe(0);
  });

  it('TC-API-TSK-24 eliminar dos veces la misma tarea responde 404 la segunda', async () => {
    const agent = await loggedInAgent();
    const { id } = (await createTask(agent)).body.task;

    await agent.delete(`/api/tasks/${id}`);
    expect((await agent.delete(`/api/tasks/${id}`)).status).toBe(404);
  });
});

describe('TC-API-TSK: paginación (RNF-08)', () => {
  it('TC-API-TSK-25 devuelve el total y respeta página y tamaño', async () => {
    const agent = await loggedInAgent();
    for (let i = 1; i <= 5; i++) await createTask(agent, { title: `Tarea ${i}` });

    const first = await agent.get('/api/tasks?page=1&pageSize=2');
    const last = await agent.get('/api/tasks?page=3&pageSize=2');

    expect(first.body).toMatchObject({ total: 5, page: 1, pageSize: 2 });
    expect(first.body.tasks).toHaveLength(2);
    expect(last.body.tasks).toHaveLength(1);
  });

  it('TC-API-TSK-26 las páginas no repiten tareas', async () => {
    const agent = await loggedInAgent();
    for (let i = 1; i <= 4; i++) await createTask(agent, { title: `Tarea ${i}` });

    const ids = [
      ...(await agent.get('/api/tasks?page=1&pageSize=2')).body.tasks,
      ...(await agent.get('/api/tasks?page=2&pageSize=2')).body.tasks,
    ].map((task: { id: string }) => task.id);

    expect(new Set(ids).size).toBe(4);
  });

  it('TC-API-TSK-27 una página o un tamaño inválidos se rechazan con 400', async () => {
    const agent = await loggedInAgent();

    for (const query of ['page=0', 'page=abc', 'pageSize=0', 'pageSize=101']) {
      expect((await agent.get(`/api/tasks?${query}`)).status).toBe(400);
    }
  });
});
