/** Pruebas de PANTALLA: inicio de sesión (RF-02, RNF-05, RNF-07). */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ANA, NO_SESSION, mockApi, renderApp } from './helpers';

const fillAndSubmit = async (
  user: ReturnType<typeof renderApp>['user'],
  email: string,
  password: string,
) => {
  if (email) await user.type(screen.getByLabelText('Correo electrónico'), email);
  if (password) await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
};

describe('TC-WEB-LOG: pantalla de inicio de sesión', () => {
  it('TC-WEB-LOG-01 muestra el formulario y los enlaces de registro y recuperación', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    renderApp('/login');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute(
      'href',
      '/recuperar',
    );
    expect(screen.getByRole('link', { name: 'Crear una cuenta' })).toHaveAttribute(
      'href',
      '/registro',
    );
  });

  it('TC-WEB-LOG-02 enviar vacío muestra los errores en español y NO llama a la API', async () => {
    const api = mockApi({ 'GET /users/me': NO_SESSION });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await fillAndSubmit(user, '', '');

    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(api.callsTo('POST /auth/login')).toHaveLength(0);
  });

  it('TC-WEB-LOG-03 un correo mal escrito se rechaza antes de llamar a la API', async () => {
    const api = mockApi({ 'GET /users/me': NO_SESSION });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await fillAndSubmit(user, 'esto-no-es-un-correo', 'cualquiera');

    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument();
    expect(api.callsTo('POST /auth/login')).toHaveLength(0);
  });

  it('TC-WEB-LOG-04 con credenciales correctas envía los datos limpios y entra al tablero', async () => {
    let loggedIn = false;
    const api = mockApi({
      'GET /users/me': () => (loggedIn ? { body: { user: ANA } } : NO_SESSION),
      'POST /auth/login': () => {
        loggedIn = true;
        return { body: { user: ANA } };
      },
    });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await fillAndSubmit(user, '  ANA@Mail.com ', 'Clave-Segura#1');

    expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();
    expect(api.callsTo('POST /auth/login')[0]!.body).toEqual({
      email: 'ana@mail.com',
      password: 'Clave-Segura#1',
    });
  });

  it('TC-WEB-LOG-05 credenciales incorrectas muestran el aviso del servidor y se queda en el login', async () => {
    mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/login': {
        status: 401,
        body: { error: { message: 'Correo o contraseña incorrectos' } },
      },
    });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await fillAndSubmit(user, 'ana@mail.com', 'Incorrecta#123');

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('TC-WEB-LOG-06 si no hay conexión con el servidor, avisa con un mensaje claro', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await fillAndSubmit(user, 'ana@mail.com', 'Clave-Segura#1');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    );
  });

  it('TC-WEB-LOG-07 si se superó el límite de intentos, muestra el aviso del servidor', async () => {
    mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/login': {
        status: 429,
        body: {
          error: {
            message: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo',
          },
        },
      },
    });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await fillAndSubmit(user, 'ana@mail.com', 'Clave-Segura#1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos fallidos');
  });

  it('TC-WEB-LOG-08 mientras espera la respuesta, el botón dice "Ingresando…" y no se puede pulsar otra vez', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/login': async () => {
        await gate;
        return { status: 401, body: { error: { message: 'Correo o contraseña incorrectos' } } };
      },
    });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await fillAndSubmit(user, 'ana@mail.com', 'Clave-Segura#1');

    const busy = await screen.findByRole('button', { name: 'Ingresando…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    release();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled(),
    );
  });

  it('TC-WEB-LOG-09 el botón Mostrar/Ocultar revela y vuelve a esconder la contraseña', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    const { user } = renderApp('/login');
    const password = await screen.findByLabelText('Contraseña');

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('TC-WEB-LOG-10 el atajo de la cuenta de prueba está OCULTO para los usuarios por defecto', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    expect(screen.queryByText('demo@taskflow.dev')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar cuenta de prueba' })).not.toBeInTheDocument();
  });

  it('TC-WEB-LOG-11 corregir un error en vivo lo quita sin esperar a enviar (el diseño no se mueve)', async () => {
    mockApi({ 'GET /users/me': NO_SESSION });
    const { user } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    await fillAndSubmit(user, 'mal', 'x');
    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Correo electrónico'));
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@mail.com');

    await waitFor(() =>
      expect(screen.queryByText('Ingresa un correo válido')).not.toBeInTheDocument(),
    );
  });
});
