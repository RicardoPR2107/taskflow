/** Pruebas de API de filtros, búsqueda y orden de la lista de tareas. */
import { describe, expect, it } from 'vitest';
import { todayInZone } from '@taskflow/shared';
import { loggedInAgent } from './helpers';

const dayFromToday = (days: number) => {
  const [y, m, d] = todayInZone('America/Lima').split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
};

type Agent = Awaited<ReturnType<typeof loggedInAgent>>;

/** Crea un conjunto conocido de tareas y devuelve el agente. */
async function seed(): Promise<Agent> {
  const agent = await loggedInAgent();
  const tasks = [
    { title: 'Entregar informe de ventas', priority: 'URGENT', dueDate: dayFromToday(-3) },
    {
      title: 'Revisar pull request',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: dayFromToday(2),
    },
    { title: 'Pagar el internet', priority: 'LOW', description: 'Vence con la factura' },
    { title: 'Comprar café', priority: 'MEDIUM', status: 'DONE', dueDate: dayFromToday(-10) },
    { title: 'Estudiar para el examen', priority: 'HIGH', dueDate: dayFromToday(7) },
  ];
  for (const task of tasks) await agent.post('/api/tasks').send(task);
  return agent;
}
const titles = (response: { body: { tasks: Array<{ title: string }> } }) =>
  response.body.tasks.map((task) => task.title);

describe('TC-API-FLT: filtros de la lista', () => {
  it('TC-API-FLT-01 filtra por estado', async () => {
    const agent = await seed();
    const response = await agent.get('/api/tasks?status=IN_PROGRESS');

    expect(titles(response)).toEqual(['Revisar pull request']);
    expect(response.body.total).toBe(1);
  });

  it('TC-API-FLT-02 filtra por prioridad', async () => {
    const agent = await seed();
    const response = await agent.get('/api/tasks?priority=HIGH&sort=title_asc');

    expect(titles(response)).toEqual(['Estudiar para el examen', 'Revisar pull request']);
  });

  it('TC-API-FLT-03 busca por texto en el título, sin importar mayúsculas ni tildes de la búsqueda', async () => {
    const agent = await seed();

    expect(titles(await agent.get('/api/tasks?q=INFORME'))).toEqual(['Entregar informe de ventas']);
    expect(titles(await agent.get('/api/tasks?q=pull'))).toEqual(['Revisar pull request']);
  });

  it('TC-API-FLT-04 la búsqueda también mira la descripción', async () => {
    const agent = await seed();

    expect(titles(await agent.get('/api/tasks?q=factura'))).toEqual(['Pagar el internet']);
  });

  it('TC-API-FLT-05 los símbolos de la búsqueda se toman literalmente (un "%" no devuelve todo)', async () => {
    const agent = await seed();
    await agent.post('/api/tasks').send({ title: 'Meta del 100% del mes' });

    expect(titles(await agent.get('/api/tasks?q=%25'))).toEqual(['Meta del 100% del mes']);
    expect(titles(await agent.get('/api/tasks?q=_'))).toEqual([]);
  });

  it('TC-API-FLT-06 "solo vencidas" trae las de fecha pasada sin completar (la completada no cuenta)', async () => {
    const agent = await seed();
    const response = await agent.get('/api/tasks?overdue=true');

    expect(titles(response)).toEqual(['Entregar informe de ventas']);
    expect(response.body.tasks[0].isOverdue).toBe(true);
  });

  it('TC-API-FLT-07 filtra por rango de fecha límite, incluyendo los extremos', async () => {
    const agent = await seed();
    const response = await agent.get(
      `/api/tasks?dueFrom=${dayFromToday(2)}&dueTo=${dayFromToday(7)}&sort=due_asc`,
    );

    expect(titles(response)).toEqual(['Revisar pull request', 'Estudiar para el examen']);
  });

  it('TC-API-FLT-08 varios filtros a la vez: el resultado cumple TODOS los criterios', async () => {
    const agent = await seed();

    const both = await agent.get('/api/tasks?priority=HIGH&status=PENDING');
    expect(titles(both)).toEqual(['Estudiar para el examen']);

    const none = await agent.get('/api/tasks?priority=LOW&status=DONE');
    expect(none.body).toMatchObject({ tasks: [], total: 0 });

    const overdueAndDone = await agent.get('/api/tasks?overdue=true&status=DONE');
    expect(overdueAndDone.body.total).toBe(0); // una tarea completada nunca está vencida
  });

  it('TC-API-FLT-09 el total y la paginación respetan los filtros', async () => {
    const agent = await seed();
    const page1 = await agent.get('/api/tasks?priority=HIGH&pageSize=1&page=1&sort=title_asc');
    const page2 = await agent.get('/api/tasks?priority=HIGH&pageSize=1&page=2&sort=title_asc');

    expect(page1.body.total).toBe(2);
    expect(titles(page1)).toEqual(['Estudiar para el examen']);
    expect(titles(page2)).toEqual(['Revisar pull request']);
  });

  it('TC-API-FLT-10 los filtros solo alcanzan las tareas propias', async () => {
    const ana = await seed();
    const luis = await loggedInAgent({ name: 'Luis', email: 'luis@mail.com' });
    await luis.post('/api/tasks').send({ title: 'Informe secreto de Luis' });

    expect(titles(await ana.get('/api/tasks?q=informe'))).toEqual(['Entregar informe de ventas']);
    expect(titles(await luis.get('/api/tasks?q=informe'))).toEqual(['Informe secreto de Luis']);
  });
});

describe('TC-API-FLT: orden', () => {
  it('TC-API-FLT-11 ordena por prioridad, de urgente a baja', async () => {
    const agent = await seed();
    const response = await agent.get('/api/tasks?sort=priority_desc');

    expect(response.body.tasks.map((t: { priority: string }) => t.priority)).toEqual([
      'URGENT',
      'HIGH',
      'HIGH',
      'MEDIUM',
      'LOW',
    ]);
  });

  it('TC-API-FLT-12 ordena por fecha límite con las tareas sin fecha al final', async () => {
    const agent = await seed();
    const response = await agent.get('/api/tasks?sort=due_asc');

    expect(titles(response)).toEqual([
      'Comprar café',
      'Entregar informe de ventas',
      'Revisar pull request',
      'Estudiar para el examen',
      'Pagar el internet',
    ]);
  });

  it('TC-API-FLT-13 ordena por título de la A a la Z', async () => {
    const agent = await seed();
    const response = await agent.get('/api/tasks?sort=title_asc');

    expect(titles(response)[0]).toBe('Comprar café');
    expect(titles(response).at(-1)).toBe('Revisar pull request');
  });

  it('TC-API-FLT-14 por defecto, las más recientes primero', async () => {
    const agent = await seed();

    expect(titles(await agent.get('/api/tasks'))[0]).toBe('Estudiar para el examen');
    expect(titles(await agent.get('/api/tasks?sort=oldest'))[0]).toBe('Entregar informe de ventas');
  });
});

describe('TC-API-FLT: valores inválidos', () => {
  it('TC-API-FLT-15 un filtro inválido se rechaza con 400 y un mensaje por campo', async () => {
    const agent = await loggedInAgent();

    for (const query of [
      'status=NADA',
      'priority=MEGA',
      'sort=al_azar',
      'dueFrom=2026-02-30',
      'overdue=quizas',
      'q=' + 'a'.repeat(101),
      'dueFrom=2026-03-10&dueTo=2026-03-01',
    ]) {
      const response = await agent.get(`/api/tasks?${query}`);
      expect(response.status, query).toBe(400);
      expect(response.body.error.details).toBeDefined();
    }
  });

  it('TC-API-FLT-16 un texto de búsqueda con comillas o SQL no rompe nada (consultas parametrizadas)', async () => {
    const agent = await seed();

    const response = await agent.get(
      `/api/tasks?q=${encodeURIComponent("'; DROP TABLE tasks; --")}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect((await agent.get('/api/tasks')).body.total).toBe(5); // la tabla sigue intacta
  });
});
