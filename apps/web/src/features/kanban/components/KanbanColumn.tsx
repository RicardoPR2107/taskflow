import { useDroppable } from '@dnd-kit/core';
import { TASK_STATUS_LABELS, type TaskStatus } from '@taskflow/shared';
import type { ReactNode } from 'react';
import { cn } from '../../../shared/lib/cn';

interface KanbanColumnProps {
  status: TaskStatus;
  count?: number; // undefined mientras se cargan
  children: ReactNode;
}

/** Una columna del tablero: también es una zona donde se pueden soltar tarjetas. */
export function KanbanColumn({ status, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`col-${status}`}
      className={cn(
        'rounded-2xl border-2 border-ink p-4 shadow-hard transition-colors',
        isOver ? 'bg-orange-soft' : 'bg-paper',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={`col-${status}`} className="text-sm font-extrabold uppercase tracking-widest">
          {TASK_STATUS_LABELS[status]}
        </h2>
        {count !== undefined && (
          <span
            className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-bold"
            aria-label={`${count} tareas`}
          >
            {count}
          </span>
        )}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
