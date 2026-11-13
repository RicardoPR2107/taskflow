import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateTaskInput } from '@taskflow/shared';
import { tasksApi } from './api';

export const TASKS_KEY = ['tasks'] as const;
/** Cuántas tareas trae el tablero de una vez. La paginación completa llega con los filtros (Fase 4). */
export const BOARD_PAGE_SIZE = 100;

export function useTasks() {
  return useQuery({
    queryKey: [...TASKS_KEY, { page: 1, pageSize: BOARD_PAGE_SIZE }],
    queryFn: () => tasksApi.list(1, BOARD_PAGE_SIZE),
  });
}

/** Tras crear, editar o eliminar, las listas se vuelven a pedir al servidor. */
function useRefreshTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TASKS_KEY });
}

export function useCreateTask() {
  const refresh = useRefreshTasks();
  return useMutation({ mutationFn: tasksApi.create, onSuccess: refresh });
}

export function useUpdateTask() {
  const refresh = useRefreshTasks();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      tasksApi.update(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteTask() {
  const refresh = useRefreshTasks();
  return useMutation({ mutationFn: tasksApi.remove, onSuccess: refresh });
}
