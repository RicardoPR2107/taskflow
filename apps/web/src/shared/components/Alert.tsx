import type { ReactNode } from 'react';

/** Aviso de error a nivel de formulario. Se anuncia a los lectores de pantalla. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border-2 border-ink bg-orange-soft p-3.5 text-sm font-semibold"
    >
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange text-sm font-extrabold"
      >
        !
      </span>
      <p>{children}</p>
    </div>
  );
}
