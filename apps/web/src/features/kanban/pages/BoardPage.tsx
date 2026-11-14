import { useState } from 'react';
import { TASK_STATUS_LABELS, type TaskDto, type TaskStatus } from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { useToast } from '../../../shared/components/Toast';
import { useCurrentUser } from '../../auth/hooks';
import { DeleteTaskDialog } from '../../tasks/components/DeleteTaskDialog';
import { TaskFormDialog } from '../../tasks/components/TaskFormDialog';
import { useMoveTask, useTasks } from '../../tasks/hooks';
import { KanbanBoard } from '../components/KanbanBoard';

export default function BoardPage() {
  const { data: user } = useCurrentUser();
  const tasksQuery = useTasks();
  const moveTask = useMoveTask();
  const toast = useToast();
  const [formTask, setFormTask] = useState<TaskDto | null | undefined>(undefined); // undefined = cerrado
  const [taskToDelete, setTaskToDelete] = useState<TaskDto | null>(null);

  const tasks = tasksQuery.data?.tasks ?? [];
  const total = tasksQuery.data?.total ?? 0;

  function handleMove(task: TaskDto, status: TaskStatus) {
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
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hola, <span className="font-serif font-medium italic">{user?.name}</span>
          </h1>
          <p className="mt-2 max-w-xl text-ink/80">
            Arrastra las tareas entre columnas para cambiar su estado, o usa el selector “Mover a”.
          </p>
        </div>
        <Button onClick={() => setFormTask(null)}>Nueva tarea</Button>
      </div>

      {tasksQuery.isError && (
        <div className="mt-6 space-y-3">
          <Alert>{tasksQuery.error.message}</Alert>
          <Button variant="dark" size="sm" onClick={() => tasksQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {tasksQuery.isPending && (
        <p role="status" className="mt-6 flex items-center gap-2 font-semibold">
          <Spinner /> Cargando tus tareas…
        </p>
      )}

      {tasksQuery.isSuccess && total === 0 && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-ink bg-paper p-6">
          <p className="text-lg font-extrabold">Aún no tienes tareas</p>
          <p className="mt-1 text-ink/80">Crea la primera y aparecerá en la columna que elijas.</p>
          <Button className="mt-4" onClick={() => setFormTask(null)}>
            Crear mi primera tarea
          </Button>
        </div>
      )}

      {!tasksQuery.isError && (
        <KanbanBoard
          tasks={tasks}
          loaded={tasksQuery.isSuccess}
          onEdit={setFormTask}
          onDelete={setTaskToDelete}
          onMove={handleMove}
        />
      )}

      {tasksQuery.isSuccess && total > tasks.length && (
        <p className="mt-4 text-sm text-ink/75">
          Mostrando las {tasks.length} tareas más recientes de {total}. Los filtros y la paginación
          llegan en la Fase 4.
        </p>
      )}

      {formTask !== undefined && (
        <TaskFormDialog task={formTask} onClose={() => setFormTask(undefined)} />
      )}
      {taskToDelete && (
        <DeleteTaskDialog task={taskToDelete} onClose={() => setTaskToDelete(null)} />
      )}
    </div>
  );
}
