import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { PublicOnlyRoute } from '../features/auth/components/PublicOnlyRoute';
import { AppLayout } from './AppLayout';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

// Carga perezosa: el código de cada pantalla se descarga solo cuando se visita.
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/auth/pages/ResetPasswordPage'));
const BoardPage = lazy(() => import('../features/kanban/pages/BoardPage'));
const TasksPage = lazy(() => import('../features/tasks/pages/TasksPage'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const NotFoundPage = lazy(() => import('../shared/pages/NotFoundPage'));

/** Mapa de rutas de la aplicación. Se exporta como datos para poder probarlo sin navegador real. */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/registro', element: <RegisterPage /> },
          { path: '/recuperar', element: <ForgotPasswordPage /> },
          { path: '/restablecer', element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/tablero', element: <BoardPage /> },
              { path: '/tareas', element: <TasksPage /> },
              { path: '/dashboard', element: <DashboardPage /> },
            ],
          },
        ],
      },
      { path: '/', element: <Navigate to="/tablero" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
