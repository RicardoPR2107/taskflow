import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_SORTS,
  TASK_SORT_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  listTasksQuerySchema,
  type TaskDto,
} from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { SelectField } from '../../../shared/components/SelectField';
import { Spinner } from '../../../shared/components/Spinner';
import { TextField } from '../../../shared/components/TextField';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { DeleteTaskDialog } from '../components/DeleteTaskDialog';
import { TaskCard } from '../components/TaskCard';
import { TaskFormDialog } from '../components/TaskFormDialog';
import { useTaskList } from '../hooks';
import { useTaskDialogs, useTaskMove } from '../useTaskActions';

const PAGE_SIZE = 10;
const ALL = '';

/**
 * Lista de tareas con búsqueda, filtros, orden y paginación. Todo vive en la URL (?status=DONE&page=2),
 * así el filtro sobrevive a recargar la página y se puede compartir o guardar como favorito.
 */
export default function TasksPage() {
  const [params, setParams] = useSearchParams();
  const { formTask, setFormTask, taskToDelete, setTaskToDelete } = useTaskDialogs();
  const handleMove = useTaskMove();

  // Los parámetros de la URL se validan con el mismo esquema que usa la API; si son inválidos se ignoran.
  const parsed = listTasksQuerySchema.safeParse(Object.fromEntries(params));
  const {
    page,
    pageSize: _ignored,
    ...filters
  } = parsed.success ? parsed.data : listTasksQuerySchema.parse({});
  void _ignored;

  // La caja de búsqueda tiene su propio estado para que escribir sea fluido; a la URL llega con retraso.
  const [search, setSearch] = useState(filters.q ?? '');
  const debouncedSearch = useDebouncedValue(search);

  function update(changes: Record<string, string | undefined>, keepPage = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!keepPage) next.delete('page'); // al cambiar un filtro se vuelve a la página 1
    setParams(next, { replace: true });
  }

  useEffect(() => {
    if ((debouncedSearch.trim() || undefined) !== filters.q) {
      update({ q: debouncedSearch.trim() || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const query = useTaskList(page, PAGE_SIZE, filters);
  const tasks: TaskDto[] = query.data?.tasks ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(
    filters.q ||
    filters.status ||
    filters.priority ||
    filters.overdue ||
    filters.dueFrom ||
    filters.dueTo ||
    filters.sort !== 'newest',
  );

  function clearFilters() {
    setSearch('');
    setParams({}, { replace: true });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Tareas</h1>
          <p className="mt-2 max-w-xl text-ink/80">
            Busca, filtra y ordena todas tus tareas. Los resultados se piden al servidor por
            páginas.
          </p>
        </div>
        <Button onClick={() => setFormTask(null)}>Nueva tarea</Button>
      </div>

      <form
        role="search"
        aria-label="Filtros de tareas"
        onSubmit={(event) => event.preventDefault()}
        className="mt-6 grid gap-4 rounded-2xl border-2 border-ink bg-paper p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <TextField
            label="Buscar"
            type="search"
            placeholder="Título o descripción"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <SelectField
          label="Estado"
          value={filters.status ?? ALL}
          onChange={(event) => update({ status: event.target.value || undefined })}
          options={[
            { value: ALL, label: 'Todos' },
            ...TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] })),
          ]}
        />
        <SelectField
          label="Prioridad"
          value={filters.priority ?? ALL}
          onChange={(event) => update({ priority: event.target.value || undefined })}
          options={[
            { value: ALL, label: 'Todas' },
            ...TASK_PRIORITIES.map((value) => ({ value, label: TASK_PRIORITY_LABELS[value] })),
          ]}
        />
        <TextField
          label="Vence desde"
          type="date"
          value={filters.dueFrom ?? ''}
          onChange={(event) => update({ dueFrom: event.target.value || undefined })}
        />
        <TextField
          label="Vence hasta"
          type="date"
          value={filters.dueTo ?? ''}
          onChange={(event) => update({ dueTo: event.target.value || undefined })}
        />
        <SelectField
          label="Ordenar por"
          value={filters.sort}
          onChange={(event) =>
            update({ sort: event.target.value === 'newest' ? undefined : event.target.value })
          }
          options={TASK_SORTS.map((value) => ({ value, label: TASK_SORT_LABELS[value] }))}
        />
        <div className="flex items-end gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-orange"
              checked={Boolean(filters.overdue)}
              onChange={(event) => update({ overdue: event.target.checked ? 'true' : undefined })}
            />
            Solo vencidas
          </label>
        </div>
        {hasFilters && (
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </form>

      {!parsed.success && (
        <div className="mt-4">
          <Alert>Algunos filtros de la dirección no son válidos y se ignoraron.</Alert>
        </div>
      )}

      {query.isError && (
        <div className="mt-6 space-y-3">
          <Alert>{query.error.message}</Alert>
          <Button variant="dark" size="sm" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {query.isPending && (
        <p role="status" className="mt-6 flex items-center gap-2 font-semibold">
          <Spinner /> Cargando tus tareas…
        </p>
      )}

      {query.isSuccess && (
        <p role="status" className="mt-6 font-bold">
          {total === 1 ? '1 tarea' : `${total} tareas`}
          {hasFilters ? ' con estos filtros' : ''}
        </p>
      )}

      {query.isSuccess && total === 0 && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-ink bg-paper p-6">
          <p className="text-lg font-extrabold">
            {hasFilters ? 'Ninguna tarea coincide con los filtros' : 'Aún no tienes tareas'}
          </p>
          <p className="mt-1 text-ink/80">
            {hasFilters
              ? 'Prueba con otros criterios o limpia los filtros.'
              : 'Crea la primera para verla aquí.'}
          </p>
        </div>
      )}

      {tasks.length > 0 && (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2" aria-label="Resultados">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border-2 border-ink bg-paper p-4 shadow-hard-sm"
            >
              <TaskCard
                task={task}
                onEdit={setFormTask}
                onDelete={setTaskToDelete}
                onMove={handleMove}
              />
            </li>
          ))}
        </ul>
      )}

      {query.isSuccess && total > PAGE_SIZE && (
        <nav aria-label="Paginación" className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) }, true)}
          >
            Anterior
          </Button>
          <span className="font-bold">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => update({ page: String(page + 1) }, true)}
          >
            Siguiente
          </Button>
        </nav>
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
