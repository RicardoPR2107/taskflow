import { TASK_STATUS_LABELS, type TaskStatus } from '@taskflow/shared';
import { cn } from '../../../shared/lib/cn';

const ROWS: Array<{ title: string; status: TaskStatus }> = [
  { title: 'Entregar informe de ventas', status: 'DONE' },
  { title: 'Revisar pull request', status: 'IN_PROGRESS' },
  { title: 'Pagar el internet', status: 'PENDING' },
];

const chipStyles: Record<string, string> = {
  DONE: 'bg-ink text-cream',
  IN_PROGRESS: 'bg-orange text-ink',
  PENDING: 'bg-cream text-ink',
};

/** Tarjeta decorativa (no interactiva) que muestra cómo se ve una lista de tareas. */
export function TaskPreviewCard({ className }: { className?: string }) {
  return (
    <div className={cn('max-w-md', className)} aria-hidden="true">
      {/* Misma sombra negra que la tarjeta del formulario (shadow-hard-lg) */}
      <div className="rounded-3xl border-2 border-ink bg-paper p-5 shadow-hard-lg">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-ink/60">
          Hoy en tu tablero
        </p>
        <ul className="space-y-2.5">
          {ROWS.map((row) => (
            <li
              key={row.title}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream px-3.5 py-2.5"
            >
              <span className="text-sm font-bold">{row.title}</span>
              <span
                className={cn(
                  'shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold',
                  chipStyles[row.status],
                )}
              >
                {TASK_STATUS_LABELS[row.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
