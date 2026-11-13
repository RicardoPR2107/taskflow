import { useRouteError } from 'react-router-dom';
import { ErrorScreen } from '../shared/components/ErrorScreen';

/** Se muestra si falla algo al cargar una ruta (por ejemplo, un trozo de código que no se pudo descargar). */
export function RouteError() {
  const error = useRouteError();
  console.error('Error de ruta:', error);

  return (
    <ErrorScreen
      message="No pudimos cargar esta pantalla. Revisa tu conexión e inténtalo de nuevo."
      actionLabel="Recargar página"
      onAction={() => window.location.reload()}
    />
  );
}
