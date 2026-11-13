/** Pruebas de PANTALLA: registro (RF-01, RN-11, RNF-05). */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ANA, NO_SESSION, mockApi, renderApp } from './helpers';

const fillForm = async (
  user: ReturnType<typeof renderApp>['user'],
  values: { name?: string; email?: string; password?: string },
) => {
  if (values.name) await user.type(screen.getByLabelText('Nombre'), values.name);
  if (values.email) await user.type(screen.getByLabelText('Correo electrónico'), values.email);
  if (values.password) await user.type(screen.getByLabelText('Contraseña'), values.password);
};
const submit = (user: ReturnType<typeof renderApp>['user']) =>
  user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
const openRegister = async () => {
  const api = mockApi({ 'GET /users/me': NO_SESSION });
  const utils = renderApp('/registro');
  await screen.findByRole('heading', { name: 'Crear cuenta' });
  return { api, ...utils };
};

describe('TC-WEB-REG: pantalla de registro', () => {
  it('TC-WEB-REG-01 muestra los campos, la lista de requisitos y el enlace al login', async () => {
    await openRegister();

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByText('Tu contraseña debe tener:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  });

  it('TC-WEB-REG-02 los requisitos se marcan en vivo mientras se escribe la contraseña', async () => {
    const { user } = await openRegister();
    expect(screen.queryAllByText(': cumplido')).toHaveLength(0);

    await user.type(screen.getByLabelText('Contraseña'), 'abc');
    expect(screen.queryAllByText(': cumplido')).toHaveLength(1);

    await user.type(screen.getByLabelText('Contraseña'), 'DEF123!xyz');
    expect(screen.queryAllByText(': cumplido')).toHaveLength(5);
  });

  it('TC-WEB-REG-03 enviar vacío muestra un error por campo y NO llama a la API', async () => {
    const { api, user } = await openRegister();

    await submit(user);

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument();
    expect(api.callsTo('POST /auth/register')).toHaveLength(0);
  });

  it('TC-WEB-REG-04 una contraseña sin mayúscula se rechaza con el motivo concreto', async () => {
    const { api, user } = await openRegister();
    await fillForm(user, { name: 'Luis', email: 'luis@mail.com', password: 'sinmayuscula123!' });

    await submit(user);

    expect(
      await screen.findByText('La contraseña debe incluir al menos una letra mayúscula'),
    ).toBeInTheDocument();
    expect(api.callsTo('POST /auth/register')).toHaveLength(0);
  });

  it('TC-WEB-REG-05 el primer clic en "Crear cuenta" funciona aunque se acabe de corregir un error', async () => {
    let created = false;
    const api = mockApi({
      'GET /users/me': () => (created ? { body: { user: ANA } } : NO_SESSION),
      'POST /auth/register': () => {
        created = true;
        return { status: 201, body: { user: ANA } };
      },
    });
    const { user } = renderApp('/registro');
    await screen.findByRole('heading', { name: 'Crear cuenta' });
    await fillForm(user, { name: 'Ana', email: 'ana@mail.com', password: 'debil' });
    await submit(user); // primer intento: error
    await screen.findByText(/al menos 10 caracteres/, { selector: 'p' });

    await user.clear(screen.getByLabelText('Contraseña'));
    await user.type(screen.getByLabelText('Contraseña'), 'Clave-Segura#1');
    await submit(user); // basta UN clic

    expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();
    expect(api.callsTo('POST /auth/register')).toHaveLength(1);
  });

  it('TC-WEB-REG-06 un registro válido envía los datos limpios y entra al tablero', async () => {
    let created = false;
    const api = mockApi({
      'GET /users/me': () => (created ? { body: { user: ANA } } : NO_SESSION),
      'POST /auth/register': () => {
        created = true;
        return { status: 201, body: { user: ANA } };
      },
    });
    const { user } = renderApp('/registro');
    await screen.findByRole('heading', { name: 'Crear cuenta' });
    await fillForm(user, { name: '  Ana  ', email: ' ANA@Mail.com', password: 'Clave-Segura#1' });

    await submit(user);

    expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();
    expect(api.callsTo('POST /auth/register')[0]!.body).toEqual({
      name: 'Ana',
      email: 'ana@mail.com',
      password: 'Clave-Segura#1',
    });
  });

  it('TC-WEB-REG-07 un correo ya registrado (409) se avisa junto al campo de correo', async () => {
    mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/register': {
        status: 409,
        body: { error: { message: 'Ya existe una cuenta con ese correo' } },
      },
    });
    const { user } = renderApp('/registro');
    await screen.findByRole('heading', { name: 'Crear cuenta' });
    await fillForm(user, { name: 'Ana', email: 'ana@mail.com', password: 'Clave-Segura#1' });

    await submit(user);

    const message = await screen.findByText('Ya existe una cuenta con ese correo');
    expect(message).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
  });

  it('TC-WEB-REG-08 los errores por campo que devuelve el servidor (400) se muestran junto a cada campo', async () => {
    mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/register': {
        status: 400,
        body: {
          error: { message: 'Datos inválidos', details: { name: ['El nombre es obligatorio'] } },
        },
      },
    });
    const { user } = renderApp('/registro');
    await screen.findByRole('heading', { name: 'Crear cuenta' });
    await fillForm(user, { name: 'A', email: 'ana@mail.com', password: 'Clave-Segura#1' });

    await submit(user);

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();
  });

  it('TC-WEB-REG-09 mientras se crea la cuenta, los campos y el botón quedan bloqueados', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockApi({
      'GET /users/me': NO_SESSION,
      'POST /auth/register': async () => {
        await gate;
        return { status: 409, body: { error: { message: 'Ya existe una cuenta con ese correo' } } };
      },
    });
    const { user } = renderApp('/registro');
    await screen.findByRole('heading', { name: 'Crear cuenta' });
    await fillForm(user, { name: 'Ana', email: 'ana@mail.com', password: 'Clave-Segura#1' });
    await submit(user);

    expect(await screen.findByRole('button', { name: 'Creando cuenta…' })).toBeDisabled();
    expect(screen.getByLabelText('Nombre')).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toBeEnabled());
  });
});
