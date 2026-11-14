/** Gráfico de barras horizontales hecho con HTML: cada fila muestra etiqueta, barra y el número como texto. */
export function BarList({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<{ label: string; value: number }>;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section
      aria-label={title}
      className="rounded-2xl border-2 border-ink bg-paper p-5 shadow-hard-sm"
    >
      <h2 className="text-lg font-extrabold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3">
            <span className="text-sm font-bold">{row.label}</span>
            <span aria-hidden="true" className="h-4 rounded-full border-2 border-ink bg-cream">
              <span
                className="block h-full rounded-full bg-orange"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-extrabold">{row.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
