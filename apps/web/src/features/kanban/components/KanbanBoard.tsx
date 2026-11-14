import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskDto, type TaskStatus } from '@taskflow/shared';
import { useState } from 'react';
import { TaskSummary } from '../../tasks/components/TaskCard';
import { DraggableTask } from './DraggableTask';
import { KanbanColumn } from './KanbanColumn';

// Mensajes para lectores de pantalla durante el arrastre, en español.
const taskOf = (item: { data: { current?: { task?: TaskDto } } }) => item.data.current?.task;
const columnName = (id: unknown) => TASK_STATUS_LABELS[id as TaskStatus] ?? '';
const announcements: Announcements = {
  onDragStart: ({ active }) => `Tomaste la tarea “${taskOf(active)?.title}”.`,
  onDragOver: ({ over }) =>
    over ? `Sobre la columna ${columnName(over.id)}.` : 'Fuera de las columnas.',
  onDragEnd: ({ active, over }) =>
    over
      ? `Soltaste “${taskOf(active)?.title}” en la columna ${columnName(over.id)}.`
      : `Soltaste “${taskOf(active)?.title}” fuera de las columnas; no se movió.`,
  onDragCancel: ({ active }) => `Cancelaste el movimiento de “${taskOf(active)?.title}”.`,
};

interface KanbanBoardProps {
  tasks: TaskDto[];
  loaded: boolean; // false mientras se cargan: las columnas muestran un marcador
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  onMove: (task: TaskDto, status: TaskStatus) => void;
}

/** El tablero: 4 columnas donde las tarjetas se arrastran con el mouse o el dedo (RF de Kanban). */
export function KanbanBoard({ tasks, loaded, onEdit, onDelete, onMove }: KanbanBoardProps) {
  const [dragged, setDragged] = useState<TaskDto | null>(null);
  // Hay que mover 6 px antes de que empiece el arrastre: un clic normal nunca lo activa.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleStart = ({ active }: DragStartEvent) => setDragged(taskOf(active) ?? null);
  const handleEnd = ({ active, over }: DragEndEvent) => {
    setDragged(null);
    const task = taskOf(active);
    if (task && over && over.id !== task.status) onMove(task, over.id as TaskStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      accessibility={{ announcements }}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setDragged(null)}
    >
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status);
          return (
            <KanbanColumn
              key={status}
              status={status}
              count={loaded ? columnTasks.length : undefined}
            >
              {!loaded && (
                <div className="h-20 animate-pulse rounded-xl border-2 border-ink/20 bg-cream" />
              )}
              {loaded && columnTasks.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-ink/40 p-5 text-center text-sm text-ink/75">
                  Sin tareas
                </div>
              )}
              {columnTasks.map((task) => (
                <DraggableTask
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMove={onMove}
                />
              ))}
            </KanbanColumn>
          );
        })}
      </div>

      {/* La copia que sigue al cursor mientras se arrastra (así no la recortan las columnas). */}
      <DragOverlay>
        {dragged && (
          <div
            aria-hidden="true"
            className="rotate-1 cursor-grabbing rounded-xl border-2 border-ink bg-cream p-3.5 shadow-hard-lg"
          >
            <TaskSummary task={dragged} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
