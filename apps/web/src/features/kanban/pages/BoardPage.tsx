import { TASK_STATUSES, TASK_STATUS_LABELS } from '@taskflow/shared';
import { useCurrentUser } from '../../auth/hooks';

// Pantalla provisional: el tablero real llega en la Fase 3.
export default function BoardPage() {
  const { data: user } = useCurrentUser();

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Hola, <span className="font-serif font-medium italic">{user?.name}</span>
      </h1>
      <p className="mt-2 max-w-xl text-ink/80">
        Tu sesión está iniciada. Así se organizará tu tablero; la creación y el movimiento de tareas
        llegan en las próximas fases.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <section
            key={status}
            aria-labelledby={`col-${status}`}
            className="rounded-2xl border-2 border-ink bg-paper p-4 shadow-hard"
          >
            <h2 id={`col-${status}`} className="text-sm font-extrabold uppercase tracking-widest">
              {TASK_STATUS_LABELS[status]}
            </h2>
            <div className="mt-4 rounded-xl border-2 border-dashed border-ink/40 p-5 text-center text-sm text-ink/60">
              Sin tareas
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
