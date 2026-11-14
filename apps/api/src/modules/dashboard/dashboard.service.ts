import {
  DASHBOARD_DAYS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  completionRate,
  lastDays,
  todayInZone,
  type DashboardDto,
  type TaskPriority,
  type TaskStatus,
} from '@taskflow/shared';
import { AppError } from '../../middlewares/errorHandler.js';
import { usersRepository } from '../users/users.repository.js';
import { dashboardRepository } from './dashboard.repository.js';

/** Convierte "grupos con conteo" en un objeto con TODAS las claves (las que no aparecen valen 0). */
function toCounts<K extends string>(
  keys: readonly K[],
  groups: Array<{ key: K; count: number }>,
): Record<K, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const group of groups) counts[group.key] = group.count;
  return counts;
}

export const dashboardService = {
  async get(userId: string): Promise<DashboardDto> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new AppError(401, 'Tu sesión no es válida. Inicia sesión de nuevo');

    const today = todayInZone(user.timezone);
    const days = lastDays(today, DASHBOARD_DAYS);

    const [statusGroups, priorityGroups, overdue, completed] = await Promise.all([
      dashboardRepository.countByStatus(userId),
      dashboardRepository.countByPriority(userId),
      dashboardRepository.countOverdue(userId, today),
      dashboardRepository.completedPerDay(userId, user.timezone, days[0]!),
    ]);

    const byStatus = toCounts<TaskStatus>(
      TASK_STATUSES,
      statusGroups.map((group) => ({ key: group.status, count: group._count._all })),
    );
    const byPriority = toCounts<TaskPriority>(
      TASK_PRIORITIES,
      priorityGroups.map((group) => ({ key: group.priority, count: group._count._all })),
    );
    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    const perDay = new Map(completed.map((row) => [row.day, row.count]));

    return {
      total,
      overdue,
      completionRate: completionRate(byStatus.DONE, total),
      byStatus,
      byPriority,
      completedByDay: days.map((date) => ({ date, count: perDay.get(date) ?? 0 })),
    };
  },
};
