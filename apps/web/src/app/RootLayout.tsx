import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { FullPageLoader } from '../shared/components/FullPageLoader';

/** Mientras se descarga el código de una página (carga perezosa), se muestra el indicador de carga. */
export function RootLayout() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Outlet />
    </Suspense>
  );
}
