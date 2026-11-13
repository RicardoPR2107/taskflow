import type { CreateTaskInput, TaskDto, TaskListResponse, UpdateTaskInput } from '@taskflow/shared';
import { request } from '../../shared/lib/api';

// Todas las llamadas HTTP del módulo de tareas viven aquí.
export const tasksApi = {
  list: (page = 1, pageSize = 100) =>
    request<TaskListResponse>(`/tasks?page=${page}&pageSize=${pageSize}`),
  create: (input: CreateTaskInput) =>
    request<{ task: TaskDto }>('/tasks', { method: 'POST', body: input }),
  update: (id: string, input: UpdateTaskInput) =>
    request<{ task: TaskDto }>(`/tasks/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
