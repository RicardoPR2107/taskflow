/** Columnas de tareas completadas por día. Las cifras están en texto accesible, las barras son decoración. */
export function DailyBars({
  title,
  days,
}: {
  title: string;
  days: ReadonlyArray<{ date: string; count: number }>;
}) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return (
    <section
      aria-label={title}
      className="rounded-2xl border-2 border-ink bg-paper p-5 shadow-hard-sm"
    >
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-ink/80">
        {total === 0 ? 'Todavía no completaste tareas en este período.' : `${total} en total.`}
      </p>
      <ul className="mt-4 flex h-40 items-end gap-1.5">
        {days.map((day) => (
          <li
            key={day.date}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-xs font-extrabold">{day.count}</span>
            <span
              aria-hidden="true"
              className="w-full rounded-t-md border-2 border-ink bg-orange"
              style={{ height: `${Math.max(day.count > 0 ? 8 : 2, (day.count / max) * 100)}%` }}
            />
            <span className="text-[10px] font-bold text-ink/80">{day.date.slice(8)}</span>
            <span className="sr-only">
              {day.date}: {day.count} completadas
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink/70">Número bajo cada columna = día del mes.</p>
    </section>
  );
}
