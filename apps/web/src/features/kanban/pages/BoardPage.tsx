import { useState } from 'react';
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskDto } from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { useCurrentUser } from '../../auth/hooks';
import { DeleteTaskDialog } from '../../tasks/components/DeleteTaskDialog';
import { TaskCard } from '../../tasks/components/TaskCard';
import { TaskFormDialog } from '../../tasks/components/TaskFormDialog';
import { useTasks } from '../../tasks/hooks';

// El tablero tiene sus 4 columnas. Arrastrar y soltar tareas llega en la Fase 3.
export default function BoardPage() {
  const { data: user } = useCurrentUser();
  const tasksQuery = useTasks();
  const [formTask, setFormTask] = useState<TaskDto | null | undefined>(undefined); // undefined = cerrado
  const [taskToDelete, setTaskToDelete] = useState<TaskDto | null>(null);

  const tasks = tasksQuery.data?.tasks ?? [];
  const total = tasksQuery.data?.total ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hola, <span className="font-serif font-medium italic">{user?.name}</span>
          </h1>
          <p className="mt-2 max-w-xl text-ink/80">Organiza tus tareas por estado.</p>
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
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TASK_STATUSES.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            return (
              <section
                key={status}
                aria-labelledby={`col-${status}`}
                className="rounded-2xl border-2 border-ink bg-paper p-4 shadow-hard"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2
                    id={`col-${status}`}
                    className="text-sm font-extrabold uppercase tracking-widest"
                  >
                    {TASK_STATUS_LABELS[status]}
                  </h2>
                  {tasksQuery.isSuccess && (
                    <span
                      className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-bold"
                      aria-label={`${columnTasks.length} tareas`}
                    >
                      {columnTasks.length}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {tasksQuery.isPending && (
                    <div className="h-20 animate-pulse rounded-xl border-2 border-ink/20 bg-cream" />
                  )}
                  {tasksQuery.isSuccess && columnTasks.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-ink/40 p-5 text-center text-sm text-ink/75">
                      Sin tareas
                    </div>
                  )}
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={setFormTask}
                      onDelete={setTaskToDelete}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
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
