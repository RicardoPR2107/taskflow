import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';

type TextFieldProps = ComponentProps<'input'> & {
  label: string;
  error?: string;
  hint?: string;
  adornment?: ReactNode; // elemento a la derecha dentro del campo (ej. botón "Mostrar")
};

export function TextField({
  label,
  error,
  hint,
  adornment,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 text-base placeholder:text-ink/45',
            'shadow-hard-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-orange bg-orange-soft',
            adornment ? 'pr-24' : undefined,
            className,
          )}
          {...rest}
        />
        {adornment && (
          <div className="absolute inset-y-0 right-2 flex items-center">{adornment}</div>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-ink/70">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-2 text-sm font-semibold"
        >
          <span
            aria-hidden="true"
            className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange text-xs font-extrabold"
          >
            !
          </span>
          {error}
        </p>
      )}
    </div>
  );
}
