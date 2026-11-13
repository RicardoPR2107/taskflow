import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorScreen } from '../../../shared/components/ErrorScreen';
import { FullPageLoader } from '../../../shared/components/FullPageLoader';
import { useCurrentUser } from '../hooks';

/** Solo deja pasar a quien tiene sesión. Si no, lo manda a /login recordando a dónde iba. */
export function ProtectedRoute() {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageLoader />;
  if (isError) {
    return (
      <ErrorScreen
        title="No pudimos verificar tu sesión"
        message="Parece que no hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo."
        onAction={() => void refetch()}
      />
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
