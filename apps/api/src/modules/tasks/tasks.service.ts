import {
  nextCompletedAt,
  todayInZone,
  type CreateTaskInput,
  type ListTasksQuery,
  type TaskDto,
  type TaskListResponse,
  type UpdateTaskInput,
} from '@taskflow/shared';
import { AppError } from '../../middlewares/errorHandler.js';
import { usersRepository } from '../users/users.repository.js';
import { tasksRepository } from './tasks.repository.js';
import { toDateOnly, toTaskDto } from './tasks.mapper.js';

const notFound = () => new AppError(404, 'Tarea no encontrada');

/** El "hoy" del usuario según su zona horaria (RN-10). */
async function todayFor(userId: string): Promise<string> {
  const user = await usersRepository.findById(userId);
  if (!user) throw new AppError(401, 'Tu sesión no es válida. Inicia sesión de nuevo');
  return todayInZone(user.timezone);
}

// El service tiene las reglas de negocio. No sabe nada de HTTP ni de Prisma.
export const tasksService = {
  async list(userId: string, { page, pageSize }: ListTasksQuery): Promise<TaskListResponse> {
    const today = await todayFor(userId);
    const [tasks, total] = await tasksRepository.list(userId, (page - 1) * pageSize, pageSize);
    return { tasks: tasks.map((task) => toTaskDto(task, today)), total, page, pageSize };
  },

  async get(userId: string, id: string): Promise<TaskDto> {
    const [today, task] = await Promise.all([
      todayFor(userId),
      tasksRepository.findOwned(userId, id),
    ]);
    if (!task) throw notFound();
    return toTaskDto(task, today);
  },

  async create(userId: string, input: CreateTaskInput): Promise<TaskDto> {
    const today = await todayFor(userId);
    const task = await tasksRepository.create(userId, {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? toDateOnly(input.dueDate) : null,
      completedAt: nextCompletedAt(null, input.status, null), // RN-04
    });
    return toTaskDto(task, today);
  },

  async update(userId: string, id: string, input: UpdateTaskInput): Promise<TaskDto> {
    const [today, current] = await Promise.all([
      todayFor(userId),
      tasksRepository.findOwned(userId, id),
    ]);
    if (!current) throw notFound();

    const data: Parameters<typeof tasksRepository.updateOwned>[2] = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined)
      data.dueDate = input.dueDate ? toDateOnly(input.dueDate) : null;
    if (input.status !== undefined) {
      data.status = input.status;
      // RN-04 y RN-05: la fecha de finalización sigue al estado.
      data.completedAt = nextCompletedAt(current.status, input.status, current.completedAt);
    }

    const changed = await tasksRepository.updateOwned(userId, id, data);
    if (changed === 0) throw notFound(); // la borraron justo ahora
    const updated = await tasksRepository.findOwned(userId, id);
    if (!updated) throw notFound();
    return toTaskDto(updated, today);
  },

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await tasksRepository.deleteOwned(userId, id);
    if (deleted === 0) throw notFound();
  },
};
