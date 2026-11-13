import type { TaskPriority, TaskStatus } from '@taskflow/shared';
import { prisma } from '../../lib/prisma.js';

interface TaskData {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
}

// RN-08: TODAS las consultas incluyen el userId, así que es imposible tocar la tarea de otra persona.
export const tasksRepository = {
  list: (userId: string, skip: number, take: number) =>
    prisma.$transaction([
      prisma.task.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take,
      }),
      prisma.task.count({ where: { userId } }),
    ]),

  findOwned: (userId: string, id: string) => prisma.task.findFirst({ where: { id, userId } }),

  create: (userId: string, data: TaskData) => prisma.task.create({ data: { ...data, userId } }),

  /** Devuelve cuántas filas cambió: 0 significa que la tarea no existe o no es del usuario. */
  updateOwned: async (userId: string, id: string, data: Partial<TaskData>) => {
    const { count } = await prisma.task.updateMany({ where: { id, userId }, data });
    return count;
  },

  deleteOwned: async (userId: string, id: string) => {
    const { count } = await prisma.task.deleteMany({ where: { id, userId } });
    return count;
  },
};
