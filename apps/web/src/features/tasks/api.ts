import type {
  CreateTaskInput,
  ListTasksQuery,
  TaskDto,
  TaskListResponse,
  UpdateTaskInput,
} from '@taskflow/shared';
import { request } from '../../shared/lib/api';

/** Filtros opcionales de la lista (todo lo que no sea página ni tamaño). */
export type TaskFilters = Partial<Omit<ListTasksQuery, 'page' | 'pageSize'>>;

// Todas las llamadas HTTP del módulo de tareas viven aquí.
export const tasksApi = {
  /** Solo se envían los filtros que tienen valor, para que la URL quede limpia. */
  list: (page = 1, pageSize = 100, filters: TaskFilters = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '' && !(key === 'sort' && value === 'newest'))
        params.set(key, String(value));
    }
    return request<TaskListResponse>(`/tasks?${params.toString()}`);
  },
  create: (input: CreateTaskInput) =>
    request<{ task: TaskDto }>('/tasks', { method: 'POST', body: input }),
  update: (id: string, input: UpdateTaskInput) =>
    request<{ task: TaskDto }>(`/tasks/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
