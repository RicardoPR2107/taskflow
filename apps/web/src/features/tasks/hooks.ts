import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isOverdue,
  todayInZone,
  type TaskListResponse,
  type TaskDto,
  type TaskStatus,
  type UpdateTaskInput,
} from '@taskflow/shared';
import { useCurrentUser } from '../auth/hooks';
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

/**
 * Mover una tarea de columna con actualización OPTIMISTA: la tarjeta cambia de columna al instante
 * (sin esperar al servidor). Si la API falla, se restaura el estado anterior; al terminar, siempre se
 * vuelve a pedir la lista al servidor para reconciliar lo que se ve con lo que realmente se guardó.
 */
export function useMoveTask() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: ({ task, status }: { task: TaskDto; status: TaskStatus }) =>
      tasksApi.update(task.id, { status }),

    onMutate: async ({ task, status }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY }); // que ninguna consulta pise el cambio
      const snapshot = queryClient.getQueriesData<TaskListResponse>({ queryKey: TASKS_KEY });
      const today = todayInZone(user?.timezone ?? 'UTC');

      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: TASKS_KEY },
        (current) =>
          current && {
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    status,
                    completedAt:
                      status === 'DONE' ? (item.completedAt ?? new Date().toISOString()) : null,
                    isOverdue: isOverdue(item.dueDate, status, today),
                  }
                : item,
            ),
          },
      );
      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
