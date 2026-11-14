import {
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskDto,
  type TaskPriority,
  type TaskStatus,
} from '@taskflow/shared';
import type { ReactNode } from 'react';
import { Button } from '../../../shared/components/Button';
import { cn } from '../../../shared/lib/cn';
import { formatDate } from '../taskForm';

const priorityStyles: Record<TaskPriority, string> = {
  LOW: 'bg-cream',
  MEDIUM: 'bg-paper',
  HIGH: 'bg-orange-soft',
  URGENT: 'bg-orange',
};

/** Lo que se ve de una tarea: título, descripción, prioridad, fecha y aviso de vencida. */
export function TaskSummary({ task }: { task: TaskDto }) {
  return (
    <>
      <h3 className={cn('break-words font-bold', task.status === 'DONE' && 'line-through')}>
        {task.title}
      </h3>
      {task.description && (
        <p className="mt-1 line-clamp-2 break-words text-sm text-ink/80">{task.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
        <span
          className={cn(
            'rounded-full border-2 border-ink px-2.5 py-0.5',
            priorityStyles[task.priority],
          )}
        >
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        {task.dueDate && <span className="text-ink/80">Vence {formatDate(task.dueDate)}</span>}
        {task.isOverdue && (
          <span className="rounded-full border-2 border-ink bg-orange px-2.5 py-0.5">Vencida</span>
        )}
      </div>
    </>
  );
}

interface TaskCardProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  onMove: (task: TaskDto, status: TaskStatus) => void;
  handle?: ReactNode; // asa para arrastrar (la pone el tablero)
}

export function TaskCard({ task, onEdit, onDelete, onMove, handle }: TaskCardProps) {
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <TaskSummary task={task} />
        </div>
        {handle}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Editar tarea: ${task.title}`}
          onClick={() => onEdit(task)}
        >
          Editar
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Eliminar tarea: ${task.title}`}
          onClick={() => onDelete(task)}
        >
          Eliminar
        </Button>
        {/* Alternativa al arrastre: sirve con teclado, lectores de pantalla y pantallas táctiles. */}
        <select
          aria-label={`Mover tarea: ${task.title}`}
          value={task.status}
          onChange={(event) => onMove(task, event.target.value as TaskStatus)}
          className="rounded-xl bg-cream px-2.5 py-2 text-sm font-bold hover:bg-orange"
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              Mover a: {TASK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
