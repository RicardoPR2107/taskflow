import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DEMO_USER, loginSchema, type LoginInput } from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { PasswordField } from '../../../shared/components/PasswordField';
import { TextField } from '../../../shared/components/TextField';
import { TextLink } from '../../../shared/components/TextLink';
import { AuthShell } from '../components/AuthShell';
import { DemoAccountHint, SHOW_DEMO_ACCOUNT } from '../components/DemoAccountHint';
import { useLogin } from '../hooks';
import { handleSubmitError } from '../submitError';

export default function LoginPage() {
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    // Los errores aparecen al enviar y se corrigen en vivo al escribir (así el diseño no se mueve al hacer clic).
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      // Al guardarse el usuario, PublicOnlyRoute redirige solo al tablero.
    } catch (error) {
      handleSubmitError(error, setError, setFormError, ['email', 'password']);
    }
  });

  const useDemoAccount = () => {
    setFormError(null);
    setValue('email', DEMO_USER.email, { shouldValidate: true });
    setValue('password', DEMO_USER.password, { shouldValidate: true });
  };

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Entra a tu cuenta para ver tus tareas."
      footer={
        <>
          ¿Aún no tienes cuenta? <TextLink to="/registro">Crear una cuenta</TextLink>
        </>
      }
    >
      {/* noValidate: los mensajes los damos nosotros (en español), no el navegador */}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <fieldset disabled={login.isPending} className="space-y-5">
          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <div>
            <PasswordField
              label="Contraseña"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <p className="mt-2 text-right text-sm">
              <TextLink to="/recuperar" className="font-bold">
                ¿Olvidaste tu contraseña?
              </TextLink>
            </p>
          </div>
        </fieldset>
        <Button type="submit" fullWidth loading={login.isPending}>
          {login.isPending ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>

      {SHOW_DEMO_ACCOUNT && <DemoAccountHint onUse={useDemoAccount} />}
    </AuthShell>
  );
}
