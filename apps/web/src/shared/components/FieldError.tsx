/** Mensaje de error junto a un campo (mismo aspecto que el de TextField). */
export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-2 text-sm font-semibold">
      <span
        aria-hidden="true"
        className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange text-xs font-extrabold"
      >
        !
      </span>
      {children}
    </p>
  );
}

/** Clases comunes de los campos de formulario. */
export const fieldClasses = (hasError: boolean) =>
  [
    'w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 text-base placeholder:text-ink/45',
    'shadow-hard-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    hasError ? 'border-orange bg-orange-soft' : '',
  ].join(' ');
