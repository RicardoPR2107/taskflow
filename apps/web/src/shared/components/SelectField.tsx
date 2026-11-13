import { useId, type ComponentProps } from 'react';
import { FieldError, fieldClasses } from './FieldError';

interface SelectFieldProps extends ComponentProps<'select'> {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  error?: string;
}

export function SelectField({ label, options, error, id, ...rest }: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={fieldClasses(Boolean(error))}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
