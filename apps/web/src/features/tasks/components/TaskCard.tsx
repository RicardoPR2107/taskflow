import { TASK_PRIORITY_LABELS, type TaskDto, type TaskPriority } from '@taskflow/shared';
import { Button } from '../../../shared/components/Button';
import { cn } from '../../../shared/lib/cn';
import { formatDate } from '../taskForm';

const priorityStyles: Record<TaskPriority, string> = {
  LOW: 'bg-cream',
  MEDIUM: 'bg-paper',
  HIGH: 'bg-orange-soft',
  URGENT: 'bg-orange',
};

interface TaskCardProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  return (
    <article className="rounded-xl border-2 border-ink bg-cream p-3.5">
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

      <div className="mt-3 flex gap-2">
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
      </div>
    </article>
  );
}
