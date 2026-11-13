import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../../shared/lib/api';

/**
 * Traduce un error de la API a lo que ve el usuario:
 * - errores por campo (400) -> mensaje junto a cada campo;
 * - cualquier otro (credenciales, correo repetido, red, límite de intentos) -> alerta general.
 */
export function applyServerError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  setFormError: (message: string) => void,
) {
  if (error instanceof ApiError) {
    if (error.status === 400 && error.fieldErrors) {
      for (const [field, messages] of Object.entries(error.fieldErrors)) {
        if (messages[0]) setError(field as Path<T>, { message: messages[0] });
      }
      return;
    }
    setFormError(error.message);
    return;
  }
  setFormError('Ocurrió un error inesperado. Inténtalo de nuevo.');
}
