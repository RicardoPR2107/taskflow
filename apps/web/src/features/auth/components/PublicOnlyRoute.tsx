import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorScreen } from '../../../shared/components/ErrorScreen';
import { FullPageLoader } from '../../../shared/components/FullPageLoader';
import { useCurrentUser } from '../hooks';

/** Para /login y /registro: si ya hay sesión, redirige al destino original o al tablero. */
export function PublicOnlyRoute() {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageLoader />;
  if (isError) {
    return (
      <ErrorScreen
        title="No pudimos conectar con el servidor"
        message="Revisa tu conexión e inténtalo de nuevo."
        onAction={() => void refetch()}
      />
    );
  }
  if (user) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? '/tablero'} replace />;
  }

  return <Outlet />;
}
