import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../../shared/lib/api';

/**
 * Traduce un error de la API a lo que ve el usuario:
 *  - errores por campo (400) -> junto a cada campo
 *  - correo repetido (409)   -> junto al campo de correo
 *  - cualquier otro          -> aviso general del formulario
 */
export function handleSubmitError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  setFormError: (message: string) => void,
  fields: readonly Path<T>[],
) {
  if (!(error instanceof ApiError)) {
    setFormError('Ocurrió un error inesperado. Inténtalo de nuevo.');
    return;
  }

  if (error.fieldErrors) {
    let shown = false;
    for (const field of fields) {
      const message = error.fieldErrors[field]?.[0];
      if (message) {
        setError(field, { message });
        shown = true;
      }
    }
    if (shown) return;
  }

  if (error.status === 409 && fields.includes('email' as Path<T>)) {
    setError('email' as Path<T>, { message: error.message });
    return;
  }

  setFormError(error.message);
}
