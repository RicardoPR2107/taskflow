/** Pruebas de COMPONENTES compartidos y del cliente HTTP (RNF-06, RNF-07, RNF-13). */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/shared/components/ErrorBoundary';
import { Footer } from '../src/shared/components/Footer';
import { ApiError, request } from '../src/shared/lib/api';

describe('TC-WEB-UI: componentes compartidos', () => {
  it('TC-WEB-UI-01 el pie de página muestra el año actual y el titular de los derechos', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      `© ${new Date().getFullYear()} Ricardo Palma. Todos los derechos reservados.`,
    );
  });

  it('TC-WEB-UI-02 ErrorBoundary: un error inesperado muestra una pantalla de fallo, no una pantalla en blanco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Broken = () => {
      throw new Error('fallo inesperado');
    };

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal');
    expect(screen.getByRole('button', { name: 'Recargar página' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // incluso la pantalla de fallo lleva pie de página
  });

  it('TC-WEB-UI-03 ErrorBoundary: sin errores, muestra el contenido normal', () => {
    render(
      <ErrorBoundary>
        <p>contenido normal</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('contenido normal')).toBeInTheDocument();
  });
});

describe('TC-WEB-HTTP: cliente HTTP (request)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (status: number, body?: unknown) =>
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(body === undefined ? null : JSON.stringify(body), { status }),
        ),
    );

  it('TC-WEB-HTTP-01 devuelve el cuerpo JSON cuando todo sale bien', async () => {
    respond(200, { ok: true });

    await expect(request('/algo')).resolves.toEqual({ ok: true });
  });

  it('TC-WEB-HTTP-02 una respuesta 204 devuelve undefined', async () => {
    respond(204);

    await expect(request('/algo', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('TC-WEB-HTTP-03 un error de la API se convierte en ApiError con estado, mensaje y errores por campo', async () => {
    respond(400, {
      error: { message: 'Datos inválidos', details: { email: ['Ingresa un correo válido'] } },
    });

    const error = await request('/algo').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: 'Datos inválidos',
      fieldErrors: { email: ['Ingresa un correo válido'] },
    });
  });

  it('TC-WEB-HTTP-04 sin conexión lanza un ApiError de estado 0 con mensaje claro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = (await request('/algo').catch((e: unknown) => e)) as ApiError;

    expect(error.isNetworkError).toBe(true);
    expect(error.message).toContain('No se pudo conectar con el servidor');
  });

  it('TC-WEB-HTTP-05 un error sin cuerpo JSON (por ejemplo, 502 del proxy) da un mensaje genérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 })),
    );

    const error = (await request('/algo').catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(502);
    expect(error.message).toBe('Ocurrió un error inesperado. Inténtalo de nuevo.');
  });

  it('TC-WEB-HTTP-06 envía JSON con el encabezado correcto y la cookie de sesión', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/auth/login', { method: 'POST', body: { a: 1 } });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: '{"a":1}',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});
