/** Pruebas de la pantalla Dashboard: indicadores, gráficos en texto, estado vacío y error. */
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { lastDays } from '@taskflow/shared';
import { ANA, mockApi, renderApp } from './helpers';

const SESSION = { 'GET /users/me': { body: { user: ANA } } };
const DASHBOARD = 'GET /dashboard';
const days = lastDays('2026-03-14', 14).map((date) => ({ date, count: 0 }));

const dashboard = (overrides = {}) => ({
  body: {
    dashboard: {
      total: 0,
      overdue: 0,
      completionRate: 0,
      byStatus: { PENDING: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
      byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      completedByDay: days,
      ...overrides,
    },
  },
});
const open = async (handler: Parameters<typeof mockApi>[0][string]) => {
  mockApi({ ...SESSION, [DASHBOARD]: handler });
  renderApp('/dashboard');
  await screen.findByRole('heading', { name: 'Dashboard' });
  await screen.findByRole('heading', { name: 'Dashboard' });
};
const kpi = (label: string) =>
  within(screen.getByLabelText('Indicadores')).getByText(label).closest('div')!;

describe('TC-WEB-DSH: dashboard', () => {
  it('TC-WEB-DSH-01 muestra los seis indicadores con sus valores', async () => {
    await open(
      dashboard({
        total: 8,
        overdue: 2,
        completionRate: 25,
        byStatus: { PENDING: 3, IN_PROGRESS: 2, IN_REVIEW: 1, DONE: 2 },
      }),
    );

    await screen.findByLabelText('Indicadores');
    expect(within(kpi('Total')).getByText('8')).toBeInTheDocument();
    expect(within(kpi('Pendientes')).getByText('3')).toBeInTheDocument();
    expect(within(kpi('En progreso')).getByText('2')).toBeInTheDocument();
    expect(within(kpi('Completadas')).getByText('2')).toBeInTheDocument();
    expect(within(kpi('Vencidas')).getByText('2')).toBeInTheDocument();
    expect(within(kpi('Tasa de finalización')).getByText('25%')).toBeInTheDocument();
  });

  it('TC-WEB-DSH-02 sin tareas: mensaje de bienvenida y tasa 0% (sin errores)', async () => {
    await open(dashboard());

    expect(await screen.findByText(/Aún no tienes tareas/)).toBeInTheDocument();
    expect(within(kpi('Tasa de finalización')).getByText('0%')).toBeInTheDocument();
  });

  it('TC-WEB-DSH-03 los gráficos por estado y por prioridad muestran cada cifra como texto', async () => {
    await open(
      dashboard({
        total: 4,
        byStatus: { PENDING: 1, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 3 },
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 4, URGENT: 0 },
      }),
    );

    await screen.findByLabelText('Indicadores');
    const byStatus = screen.getByRole('region', { name: 'Tareas por estado' });
    expect(
      within(byStatus).getByText('Completada').nextElementSibling?.nextElementSibling,
    ).toHaveTextContent('3');
    const byPriority = screen.getByRole('region', { name: 'Tareas por prioridad' });
    expect(
      within(byPriority).getByText('Alta').nextElementSibling?.nextElementSibling,
    ).toHaveTextContent('4');
  });

  it('TC-WEB-DSH-04 el gráfico diario tiene 14 columnas y un texto accesible por día', async () => {
    const withData = days.map((d, i) => (i === 13 ? { ...d, count: 5 } : d));
    await open(dashboard({ completedByDay: withData }));

    const chart = await screen.findByRole('region', { name: /últimos 14 días/ });
    expect(within(chart).getAllByRole('listitem')).toHaveLength(14);
    expect(within(chart).getByText('2026-03-14: 5 completadas')).toBeInTheDocument();
    expect(within(chart).getByText('5 en total.')).toBeInTheDocument();
  });

  it('TC-WEB-DSH-05 si la API falla, muestra el error y permite reintentar', async () => {
    let fail = true;
    await open(() => (fail ? { status: 500, body: { error: { message: 'Fallo' } } } : dashboard()));

    expect(await screen.findByText('Fallo')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByLabelText('Indicadores')).toBeInTheDocument();
  });
});
