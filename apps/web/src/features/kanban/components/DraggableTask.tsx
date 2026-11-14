import { useDraggable } from '@dnd-kit/core';
import type { TaskDto, TaskStatus } from '@taskflow/shared';
import { cn } from '../../../shared/lib/cn';
import { TaskCard } from '../../tasks/components/TaskCard';

interface DraggableTaskProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  onMove: (task: TaskDto, status: TaskStatus) => void;
}

/** Tarjeta que se arrastra desde su asa (así en el celular se puede seguir desplazando la página). */
export function DraggableTask({ task, ...actions }: DraggableTaskProps) {
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  // El asa es solo para el mouse y el tacto: con teclado se usa el selector "Mover a".
  const handle = (
    <span
      ref={setActivatorNodeRef}
      {...listeners}
      aria-hidden="true"
      title="Arrastrar a otra columna"
      className="mt-0.5 shrink-0 cursor-grab touch-none select-none rounded-lg px-1.5 py-1 text-lg leading-none text-ink/70 hover:bg-orange hover:text-ink active:cursor-grabbing"
    >
      ⠿
    </span>
  );

  return (
    <article
      ref={setNodeRef}
      data-testid="task-card"
      className={cn(
        'rounded-xl border-2 border-ink bg-cream p-3.5 transition-opacity',
        isDragging && 'opacity-40',
      )}
    >
      <TaskCard task={task} handle={handle} {...actions} />
    </article>
  );
}
