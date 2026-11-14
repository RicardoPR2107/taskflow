import { useId, type ComponentProps } from 'react';
import { FieldError, fieldClasses } from './FieldError';

type TextAreaFieldProps = ComponentProps<'textarea'> & { label: string; error?: string };

export function TextAreaField({ label, error, id, ...rest }: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={fieldClasses(Boolean(error))}
        {...rest}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
