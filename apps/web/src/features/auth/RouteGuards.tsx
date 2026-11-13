import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorScreen } from '../../shared/components/ErrorScreen';
import { FullPageLoader } from '../../shared/components/FullPageLoader';
import { useCurrentUser } from './hooks';

interface LocationState {
  from?: { pathname: string };
}

/** Rutas privadas: sin sesión, redirige a /login (y recuerda a dónde quería ir). */
export function ProtectedRoute() {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageLoader />;
  if (isError) {
    return (
      <ErrorScreen
        title="No pudimos comprobar tu sesión"
        message="Revisa tu conexión a internet e inténtalo de nuevo."
        onAction={() => void refetch()}
      />
    );
  }
  if (!user)
    return <Navigate to="/login" replace state={{ from: location } satisfies LocationState} />;
  return <Outlet />;
}

/** Rutas públicas (login y registro): con sesión iniciada no tienen sentido, redirige adentro. */
export function PublicOnlyRoute() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageLoader />;
  if (user) {
    const from = (location.state as LocationState | null)?.from?.pathname;
    return <Navigate to={from ?? '/tablero'} replace />;
  }
  return <Outlet />;
}
