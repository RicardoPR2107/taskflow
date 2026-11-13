import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { queryClient } from './queryClient';
import { routes } from './router';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
