import type { ListTasksQuery, TaskPriority, TaskSort, TaskStatus } from '@taskflow/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { toDateOnly } from './tasks.mapper.js';

interface TaskData {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
}

/** Arma el WHERE con TODOS los filtros activos: los resultados cumplen cada uno (se combinan con "y"). */
/** En LIKE, % y _ son comodines: se escapan para que la búsqueda sea literal. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

function buildWhere(userId: string, filters: ListTasksQuery, today: string): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [];
  if (filters.status) and.push({ status: filters.status });
  if (filters.priority) and.push({ priority: filters.priority });
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: escapeLike(filters.q), mode: 'insensitive' } },
        { description: { contains: escapeLike(filters.q), mode: 'insensitive' } },
      ],
    });
  }
  // RN-06: vencida = fecha anterior a hoy (el "hoy" del usuario) y sin completar.
  if (filters.overdue) and.push({ status: { not: 'DONE' }, dueDate: { lt: toDateOnly(today) } });
  if (filters.dueFrom) and.push({ dueDate: { gte: toDateOnly(filters.dueFrom) } });
  if (filters.dueTo) and.push({ dueDate: { lte: toDateOnly(filters.dueTo) } });
  return { userId, AND: and };
}

const tieBreak = [{ createdAt: 'desc' as const }, { id: 'asc' as const }]; // orden estable entre páginas
const ORDER_BY: Record<TaskSort, Prisma.TaskOrderByWithRelationInput[]> = {
  newest: tieBreak,
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  due_asc: [{ dueDate: { sort: 'asc', nulls: 'last' } }, ...tieBreak],
  priority_desc: [{ priority: 'desc' }, ...tieBreak], // el enum está declarado de menor a mayor
  title_asc: [{ title: 'asc' }, { id: 'asc' }],
};

// RN-08: TODAS las consultas incluyen el userId, así que es imposible tocar la tarea de otra persona.
export const tasksRepository = {
  list: (userId: string, filters: ListTasksQuery, today: string) =>
    prisma.$transaction([
      prisma.task.findMany({
        where: buildWhere(userId, filters, today),
        orderBy: ORDER_BY[filters.sort],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.task.count({ where: buildWhere(userId, filters, today) }),
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
