import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { routes } from '../src/app/router';

interface SimulatedResponse {
  status?: number;
  body?: unknown;
}
type Handler =
  SimulatedResponse | ((request: { body: any }) => SimulatedResponse | Promise<SimulatedResponse>);

export const TASKS_LIST = 'GET /tasks?page=1&pageSize=100';
export const emptyTasks = () => ({ tasks: [], total: 0, page: 1, pageSize: 100 });

/**
 * Simula la API: cada clave es "MÉTODO /ruta". Así las pruebas de pantallas no necesitan
 * servidor ni base de datos. Una petición no prevista hace fallar la prueba (para notarlo).
 */
export function mockApi(overrides: Record<string, Handler>) {
  // Casi todas las pantallas privadas piden las tareas: por defecto, la lista llega vacía.
  const handlers: Record<string, Handler> = { [TASKS_LIST]: { body: emptyTasks() }, ...overrides };
  const calls: Array<{ key: string; body: any }> = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^.*?\/api/, '');
    const key = `${init?.method ?? 'GET'} ${path}`;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ key, body });

    const handler = handlers[key];
    if (!handler) throw new Error(`Petición no simulada: ${key}`);
    const result = typeof handler === 'function' ? await handler({ body }) : handler;
    const status = result.status ?? 200;
    if (status === 204) return new Response(null, { status });
    return new Response(JSON.stringify(result.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, callsTo: (key: string) => calls.filter((call) => call.key === key) };
}

export const ANA = {
  id: '1',
  email: 'ana@mail.com',
  name: 'Ana',
  timezone: 'America/Lima',
  theme: 'LIGHT',
};

/** Dibuja la aplicación real (con sus rutas) empezando en la dirección indicada. */
export function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, client, user };
}

/** Respuesta de "no hay sesión" para GET /users/me */
export const NO_SESSION = { status: 401, body: { error: { message: 'Debes iniciar sesión' } } };
