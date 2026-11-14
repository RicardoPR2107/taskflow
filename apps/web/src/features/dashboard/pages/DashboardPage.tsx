import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  DASHBOARD_DAYS,
} from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { BarList } from '../components/BarList';
import { DailyBars } from '../components/DailyBars';
import { useDashboard } from '../hooks';

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-paper p-4 shadow-hard-sm">
      <dt className="text-sm font-bold text-ink/80">{label}</dt>
      <dd className="mt-1 text-3xl font-extrabold">{value}</dd>
    </div>
  );
}

export default function DashboardPage() {
  const query = useDashboard();
  const data = query.data;

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Dashboard</h1>
      <p className="mt-2 max-w-xl text-ink/80">Un resumen de cómo van tus tareas.</p>

      {query.isError && (
        <div className="mt-6 space-y-3">
          <Alert>{query.error.message}</Alert>
          <Button variant="dark" size="sm" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {query.isPending && (
        <p role="status" className="mt-6 flex items-center gap-2 font-semibold">
          <Spinner /> Cargando el resumen…
        </p>
      )}

      {data && (
        <>
          {data.total === 0 && (
            <p className="mt-6 rounded-2xl border-2 border-dashed border-ink bg-paper p-5 font-bold">
              Aún no tienes tareas. Crea algunas y aquí verás tu progreso.
            </p>
          )}

          <dl
            aria-label="Indicadores"
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            <Kpi label="Total" value={data.total} />
            <Kpi label="Pendientes" value={data.byStatus.PENDING} />
            <Kpi label="En progreso" value={data.byStatus.IN_PROGRESS} />
            <Kpi label="Completadas" value={data.byStatus.DONE} />
            <Kpi label="Vencidas" value={data.overdue} />
            <Kpi label="Tasa de finalización" value={`${data.completionRate}%`} />
          </dl>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <BarList
              title="Tareas por estado"
              rows={TASK_STATUSES.map((s) => ({
                label: TASK_STATUS_LABELS[s],
                value: data.byStatus[s],
              }))}
            />
            <BarList
              title="Tareas por prioridad"
              rows={TASK_PRIORITIES.map((p) => ({
                label: TASK_PRIORITY_LABELS[p],
                value: data.byPriority[p],
              }))}
            />
          </div>

          <div className="mt-4">
            <DailyBars
              title={`Completadas en los últimos ${DASHBOARD_DAYS} días`}
              days={data.completedByDay}
            />
          </div>
        </>
      )}
    </div>
  );
}
