import { isOverdue, type TaskDto } from '@taskflow/shared';
import type { Task } from '../../generated/prisma/client.js';

/** De la fila de la base de datos a lo que ve el cliente. `today` es el día del usuario (RN-10). */
export function toTaskDto(task: Task, today: string): TaskDto {
  const dueDate = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    isOverdue: isOverdue(dueDate, task.status, today),
  };
}

/** "2026-03-09" -> Date a medianoche UTC (así lo guarda una columna de solo fecha). */
export const toDateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
