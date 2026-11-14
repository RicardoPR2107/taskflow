import { useState } from 'react';
import { TASK_STATUS_LABELS, type TaskDto, type TaskStatus } from '@taskflow/shared';
import { useToast } from '../../shared/components/Toast';
import { useMoveTask } from './hooks';

/** Estado de los diálogos de crear/editar y eliminar, compartido por el tablero y la lista. */
export function useTaskDialogs() {
  const [formTask, setFormTask] = useState<TaskDto | null | undefined>(undefined); // undefined = cerrado
  const [taskToDelete, setTaskToDelete] = useState<TaskDto | null>(null);
  return { formTask, setFormTask, taskToDelete, setTaskToDelete };
}

/** Mover una tarea de estado avisando con un mensaje (éxito o error con reversión). */
export function useTaskMove() {
  const moveTask = useMoveTask();
  const toast = useToast();

  return function handleMove(task: TaskDto, status: TaskStatus) {
    if (task.status === status) return;
    moveTask.mutate(
      { task, status },
      {
        onSuccess: () => toast.show(`“${task.title}” pasó a ${TASK_STATUS_LABELS[status]}`),
        onError: () =>
          toast.show(
            `No se pudo mover “${task.title}”. Volvió a ${TASK_STATUS_LABELS[task.status]}.`,
            'error',
          ),
      },
    );
  };
}
