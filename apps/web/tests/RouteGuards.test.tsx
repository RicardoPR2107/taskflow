/** Pruebas de RUTAS: quién puede ver qué (RF-06, RNF-04), 404, errores de conexión y pie de página (RNF-13). */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ANA, NO_SESSION, mockApi, renderApp } from './helpers';

const FOOTER = new RegExp(
  `© ${new Date().getFullYear()} Ricardo Palma\\. Todos los derechos reservados\\.`,
);

describe('TC-WEB-RUT: rutas protegidas y públicas', () => {
  it('TC-WEB-RUT-01 sin sesión, /tablero lleva al login', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    const { router } = renderApp('/tablero');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('TC-WEB-RUT-02 la raíz "/" sin sesión también termina en el login', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    const { router } = renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('TC-WEB-RUT-03 con sesión, /tablero muestra el saludo, las 4 columnas y el botón de cerrar sesión', async () => {
    mockApi({ 'GET /users/me': { body: { user: ANA } } });
    renderApp('/tablero');

    expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();
    for (const column of ['Pendiente', 'En progreso', 'En revisión', 'Completada']) {
      expect(screen.getByRole('heading', { name: column })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it.each(['/login', '/registro', '/recuperar', '/restablecer'])(
    'TC-WEB-RUT-04 con sesión, %s redirige al tablero',
    async (path) => {
      mockApi({ 'GET /users/me': { body: { user: ANA } } });
      const { router } = renderApp(path);

      expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/tablero');
    },
  );

  it('TC-WEB-RUT-05 cerrar sesión lleva al login y vuelve a proteger el tablero', async () => {
    let active = true;
    mockApi({
      'GET /users/me': () => (active ? { body: { user: ANA } } : NO_SESSION),
      'POST /auth/logout': () => {
        active = false;
        return { status: 204 };
      },
    });
    const { router, user } = renderApp('/tablero');
    await screen.findByRole('heading', { name: /Hola, Ana/ });

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('TC-WEB-RUT-06 sin conexión al abrir la app, muestra la pantalla de fallo y Reintentar la recupera', async () => {
    let online = false;
    mockApi({
      'GET /users/me': () =>
        online ? NO_SESSION : (Promise.reject(new TypeError('Failed to fetch')) as never),
    });
    const { user } = renderApp('/tablero');

    expect(
      await screen.findByRole('heading', { name: 'No pudimos verificar tu sesión' }),
    ).toBeInTheDocument();

    online = true;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('TC-WEB-RUT-07 una dirección inexistente muestra la página 404 con enlace al inicio', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    renderApp('/esto-no-existe');

    expect(
      await screen.findByRole('heading', { name: 'Esta página no existe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  it.each([
    ['/login', 'Iniciar sesión'],
    ['/registro', 'Crear cuenta'],
    ['/recuperar', 'Recuperar contraseña'],
    ['/restablecer', 'Enlace no válido'],
    ['/esto-no-existe', 'Esta página no existe'],
  ])('TC-WEB-RUT-08 %s muestra el pie de página de derechos reservados', async (path, heading) => {
    mockApi({ 'GET /users/me': NO_SESSION });
    renderApp(path);
    await screen.findByRole('heading', { name: heading });

    expect(screen.getByText(FOOTER)).toBeInTheDocument();
  });

  it('TC-WEB-RUT-09 el tablero (pantalla privada) también muestra el pie de página', async () => {
    mockApi({ 'GET /users/me': { body: { user: ANA } } });
    renderApp('/tablero');
    await screen.findByRole('heading', { name: /Hola, Ana/ });

    expect(screen.getByText(FOOTER)).toBeInTheDocument();
  });
});
