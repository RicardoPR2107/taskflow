/** Pruebas de API del dashboard: indicadores, tasa de finalización y completadas por día (RN-09, RN-10). */
import { describe, expect, it } from 'vitest';
import { DASHBOARD_DAYS, todayInZone } from '@taskflow/shared';
import { api, loggedInAgent } from './helpers';
import { prisma } from '../src/lib/prisma';

const dayFromToday = (days: number) => {
  const [y, m, d] = todayInZone('America/Lima').split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
};
type Agent = Awaited<ReturnType<typeof loggedInAgent>>;
const dashboardOf = async (agent: Agent) => (await agent.get('/api/dashboard')).body.dashboard;
const create = (agent: Agent, body: Record<string, unknown>) => agent.post('/api/tasks').send(body);

describe('TC-API-DSH: dashboard', () => {
  it('TC-API-DSH-01 sin sesión responde 401', async () => {
    expect((await api().get('/api/dashboard')).status).toBe(401);
  });

  it('TC-API-DSH-02 sin tareas: todo en 0 y la tasa de finalización es 0, sin errores (RN-09)', async () => {
    const agent = await loggedInAgent();
    const dashboard = await dashboardOf(agent);

    expect(dashboard).toMatchObject({ total: 0, overdue: 0, completionRate: 0 });
    expect(dashboard.byStatus).toEqual({ PENDING: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 });
    expect(dashboard.byPriority).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 });
    expect(dashboard.completedByDay).toHaveLength(DASHBOARD_DAYS);
    expect(dashboard.completedByDay.every((day: { count: number }) => day.count === 0)).toBe(true);
  });

  it('TC-API-DSH-03 cuenta las tareas por estado y por prioridad', async () => {
    const agent = await loggedInAgent();
    await create(agent, { title: 'a', status: 'PENDING', priority: 'LOW' });
    await create(agent, { title: 'b', status: 'PENDING', priority: 'HIGH' });
    await create(agent, { title: 'c', status: 'IN_PROGRESS', priority: 'HIGH' });
    await create(agent, { title: 'd', status: 'DONE', priority: 'URGENT' });

    const dashboard = await dashboardOf(agent);

    expect(dashboard.total).toBe(4);
    expect(dashboard.byStatus).toEqual({ PENDING: 2, IN_PROGRESS: 1, IN_REVIEW: 0, DONE: 1 });
    expect(dashboard.byPriority).toEqual({ LOW: 1, MEDIUM: 0, HIGH: 2, URGENT: 1 });
  });

  it('TC-API-DSH-04 la tasa de finalización se calcula con datos reales y se redondea', async () => {
    const agent = await loggedInAgent();
    await create(agent, { title: 'a', status: 'DONE' });
    await create(agent, { title: 'b' });
    await create(agent, { title: 'c' });

    expect((await dashboardOf(agent)).completionRate).toBe(33);

    await create(agent, { title: 'd', status: 'DONE' });
    expect((await dashboardOf(agent)).completionRate).toBe(50);
  });

  it('TC-API-DSH-05 las vencidas son las de fecha pasada sin completar; hoy y las completadas no cuentan', async () => {
    const agent = await loggedInAgent();
    await create(agent, { title: 'ayer', dueDate: dayFromToday(-1) });
    await create(agent, { title: 'hoy', dueDate: dayFromToday(0) });
    await create(agent, { title: 'mañana', dueDate: dayFromToday(1) });
    await create(agent, { title: 'sin fecha' });
    await create(agent, { title: 'vieja pero hecha', dueDate: dayFromToday(-9), status: 'DONE' });

    expect((await dashboardOf(agent)).overdue).toBe(1);
  });

  it('TC-API-DSH-06 completar una tarea cambia las cifras; eliminarla las actualiza', async () => {
    const agent = await loggedInAgent();
    const { id } = (await create(agent, { title: 'x', dueDate: dayFromToday(-2) })).body.task;
    expect(await dashboardOf(agent)).toMatchObject({ total: 1, overdue: 1, completionRate: 0 });

    await agent.patch(`/api/tasks/${id}`).send({ status: 'DONE' });
    expect(await dashboardOf(agent)).toMatchObject({ total: 1, overdue: 0, completionRate: 100 });

    await agent.delete(`/api/tasks/${id}`);
    expect(await dashboardOf(agent)).toMatchObject({ total: 0, overdue: 0, completionRate: 0 });
  });

  it('TC-API-DSH-07 las completadas se cuentan en el día de hoy, y el resto de los días queda en 0', async () => {
    const agent = await loggedInAgent();
    await create(agent, { title: 'a', status: 'DONE' });
    await create(agent, { title: 'b', status: 'DONE' });

    const { completedByDay } = await dashboardOf(agent);
    const today = completedByDay.at(-1);

    expect(today).toEqual({ date: dayFromToday(0), count: 2 });
    expect(completedByDay[0].date).toBe(dayFromToday(-(DASHBOARD_DAYS - 1)));
    expect(completedByDay.slice(0, -1).every((day: { count: number }) => day.count === 0)).toBe(
      true,
    );
  });

  it('TC-API-DSH-08 el día de una tarea completada depende de la zona horaria del usuario (RN-10)', async () => {
    const agent = await loggedInAgent();
    const { id } = (await create(agent, { title: 'tarde', status: 'DONE' })).body.task;
    // 03:00 UTC del día de hoy en Lima (UTC-5) todavía es "ayer" para el usuario.
    const todayLima = dayFromToday(0);
    await prisma.task.update({
      where: { id },
      data: { completedAt: new Date(`${todayLima}T03:00:00.000Z`) },
    });

    const { completedByDay } = await dashboardOf(agent);

    expect(
      completedByDay.find((day: { date: string }) => day.date === dayFromToday(-1)).count,
    ).toBe(1);
    expect(completedByDay.find((day: { date: string }) => day.date === todayLima).count).toBe(0);
  });

  it('TC-API-DSH-09 una tarea completada hace más de 14 días no aparece en el gráfico', async () => {
    const agent = await loggedInAgent();
    const { id } = (await create(agent, { title: 'antigua', status: 'DONE' })).body.task;
    await prisma.task.update({
      where: { id },
      data: { completedAt: new Date(`${dayFromToday(-30)}T15:00:00.000Z`) },
    });

    const dashboard = await dashboardOf(agent);

    expect(dashboard.completedByDay.every((day: { count: number }) => day.count === 0)).toBe(true);
    expect(dashboard.byStatus.DONE).toBe(1); // pero sí cuenta en el total
  });

  it('TC-API-DSH-10 cada cuenta ve solo sus cifras', async () => {
    const ana = await loggedInAgent({ email: 'ana@mail.com' });
    const luis = await loggedInAgent({ name: 'Luis', email: 'luis@mail.com' });
    await create(ana, { title: 'de Ana', status: 'DONE' });
    await create(ana, { title: 'de Ana 2' });
    await create(luis, { title: 'de Luis' });

    expect((await dashboardOf(ana)).total).toBe(2);
    expect((await dashboardOf(luis)).total).toBe(1);
    expect((await dashboardOf(luis)).completionRate).toBe(0);
  });
});
