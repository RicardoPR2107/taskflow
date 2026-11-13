import { useCurrentUser } from '../../auth/hooks';

// Estados del Kanban (RF-15). Aquí solo se muestra la estructura vacía: el tablero real llega en la Fase 3.
const COLUMNS = ['Pendiente', 'En progreso', 'En revisión', 'Completada'] as const;

export default function BoardPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-5xl leading-none tracking-tight sm:text-6xl">
          Hola, <em className="text-burnt">{user?.name}</em>
        </h1>
        <p className="max-w-xl text-ink-soft">
          Esta es la vista previa de tu tablero. Aquí podrás crear tareas y moverlas entre columnas.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((title) => (
          <section
            key={title}
            aria-labelledby={`col-${title}`}
            className="flex flex-col gap-3 rounded-brut-lg border-2 border-ink bg-cream-deep p-4 shadow-brut"
          >
            <div className="flex items-center justify-between">
              <h2 id={`col-${title}`} className="font-extrabold">
                {title}
              </h2>
              <span className="grid min-w-7 place-items-center rounded-full border-2 border-ink bg-paper px-2 text-sm font-bold">
                0
              </span>
            </div>
            {/* Estado vacío (RF-32) */}
            <div className="grid min-h-40 place-items-center rounded-brut border-2 border-dashed border-ink/50 p-4 text-center text-sm font-medium text-ink-soft">
              Sin tareas
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
