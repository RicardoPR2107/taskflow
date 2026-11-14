import { prisma } from '../../lib/prisma.js';
import { toDateOnly } from '../tasks/tasks.mapper.js';

// Todas las consultas filtran por userId: cada persona ve solo sus propias cifras.
export const dashboardRepository = {
  countByStatus: (userId: string) =>
    prisma.task.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),

  countByPriority: (userId: string) =>
    prisma.task.groupBy({ by: ['priority'], where: { userId }, _count: { _all: true } }),

  countOverdue: (userId: string, today: string) =>
    prisma.task.count({
      where: { userId, status: { not: 'DONE' }, dueDate: { lt: toDateOnly(today) } },
    }),

  /** Tareas completadas por día, contando el día en la zona horaria del usuario (RN-10). */
  completedPerDay: (userId: string, timeZone: string, since: string) =>
    prisma.$queryRaw<Array<{ day: string; count: number }>>`
      SELECT to_char(("completedAt" AT TIME ZONE ${timeZone})::date, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count
      FROM tasks
      WHERE "userId" = ${userId}::uuid
        AND "completedAt" IS NOT NULL
        AND ("completedAt" AT TIME ZONE ${timeZone})::date >= ${since}::date
      GROUP BY day`,
};
