/** Pruebas de PANTALLA: recuperación de contraseña (RF-33, RN-11). */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NO_SESSION, mockApi, renderApp } from './helpers';

const TOKEN = 'a'.repeat(43);

describe('TC-WEB-RST: solicitar el enlace (/recuperar)', () => {
  it('TC-WEB-RST-01 valida el correo antes de enviar', async () => {
    const api = mockApi({ 'GET /users/me': NO_SESSION });
    const { user } = renderApp('/recuperar');
    await screen.findByRole('heading', { name: 'Recuperar contraseña' });

    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument();
    expect(api.callsTo('POST /auth/forgot-password')).toHaveLength(0);
  });

  it('TC-WEB-RST-02 al enviar, confirma sin revelar si el correo existe', async () => {
    const api = mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/forgot-password': {
        body: { message: 'Si el correo está registrado, te enviamos un enlace' },
      },
    });
    const { user } = renderApp('/recuperar');
    await screen.findByRole('heading', { name: 'Recuperar contraseña' });

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@mail.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();
    expect(screen.getByText(/Si/, { selector: 'p' })).toHaveTextContent('está registrado');
    expect(api.callsTo('POST /auth/forgot-password')[0]!.body).toEqual({ email: 'ana@mail.com' });
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('TC-WEB-RST-03 si se superó el límite de solicitudes, lo avisa', async () => {
    mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/forgot-password': {
        status: 429,
        body: {
          error: {
            message: 'Demasiadas solicitudes de recuperación. Inténtalo de nuevo en 15 minutos',
          },
        },
      },
    });
    const { user } = renderApp('/recuperar');
    await screen.findByRole('heading', { name: 'Recuperar contraseña' });

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@mail.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiadas solicitudes');
  });
});

describe('TC-WEB-RST: crear la contraseña nueva (/restablecer)', () => {
  const open = async (token = TOKEN, extra: Parameters<typeof mockApi>[0] = {}) => {
    const api = mockApi({ 'GET /users/me': NO_SESSION, ...extra });
    const utils = renderApp(token ? `/restablecer?token=${token}` : '/restablecer');
    return { api, ...utils };
  };
  const type = async (
    user: ReturnType<typeof renderApp>['user'],
    password: string,
    confirm: string,
  ) => {
    await user.type(screen.getByLabelText('Contraseña nueva'), password);
    await user.type(screen.getByLabelText('Repite la contraseña'), confirm);
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
  };

  it('TC-WEB-RST-04 un enlace sin token muestra "Enlace no válido" y ofrece pedir uno nuevo', async () => {
    await open('');

    expect(await screen.findByRole('heading', { name: 'Enlace no válido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar un enlace nuevo' })).toHaveAttribute(
      'href',
      '/recuperar',
    );
  });

  it('TC-WEB-RST-05 muestra la lista de requisitos y detecta contraseñas que no coinciden', async () => {
    const { api, user } = await open();
    await screen.findByRole('heading', { name: 'Crea tu nueva contraseña' });
    expect(screen.getByText('Tu contraseña debe tener:')).toBeInTheDocument();

    await type(user, 'Nueva-Clave#77', 'Distinta-Clave#88');

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(api.callsTo('POST /auth/reset-password')).toHaveLength(0);
  });

  it('TC-WEB-RST-06 rechaza una contraseña débil antes de llamar a la API', async () => {
    const { api, user } = await open();
    await screen.findByRole('heading', { name: 'Crea tu nueva contraseña' });

    await type(user, 'debil', 'debil');

    expect(
      await screen.findByText('La contraseña debe tener al menos 10 caracteres', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(api.callsTo('POST /auth/reset-password')).toHaveLength(0);
  });

  it('TC-WEB-RST-07 con una contraseña válida envía token y contraseña, y confirma el cambio', async () => {
    const { api, user } = await open(TOKEN, {
      'POST /auth/reset-password': { body: { message: 'Tu contraseña fue actualizada' } },
    });
    await screen.findByRole('heading', { name: 'Crea tu nueva contraseña' });

    await type(user, 'Nueva-Clave#77', 'Nueva-Clave#77');

    expect(
      await screen.findByRole('heading', { name: 'Contraseña actualizada' }),
    ).toBeInTheDocument();
    expect(api.callsTo('POST /auth/reset-password')[0]!.body).toEqual({
      token: TOKEN,
      password: 'Nueva-Clave#77',
    });
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('TC-WEB-RST-08 un enlace vencido o ya usado muestra el aviso y permite solicitar otro', async () => {
    const { user } = await open(TOKEN, {
      'POST /auth/reset-password': {
        status: 400,
        body: { error: { message: 'El enlace no es válido o ya expiró. Solicita uno nuevo' } },
      },
    });
    await screen.findByRole('heading', { name: 'Crea tu nueva contraseña' });

    await type(user, 'Nueva-Clave#77', 'Nueva-Clave#77');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El enlace no es válido o ya expiró',
    );
    expect(screen.getByRole('link', { name: 'Solicitar uno nuevo' })).toHaveAttribute(
      'href',
      '/recuperar',
    );
  });
});
