import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { PasswordField } from '../../../shared/components/PasswordField';
import { TextField } from '../../../shared/components/TextField';
import { TextLink } from '../../../shared/components/TextLink';
import { AuthShell } from '../components/AuthShell';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { useRegister } from '../hooks';
import { handleSubmitError } from '../submitError';

export default function RegisterPage() {
  const registerUser = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
    // Los errores aparecen al enviar y se corrigen en vivo al escribir (así el diseño no se mueve al hacer clic).
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerUser.mutateAsync(values);
    } catch (error) {
      handleSubmitError(error, setError, setFormError, ['name', 'email', 'password']);
    }
  });

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Es gratis y toma menos de un minuto."
      footer={
        <>
          ¿Ya tienes cuenta? <TextLink to="/login">Iniciar sesión</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <fieldset disabled={registerUser.isPending} className="space-y-5">
          <TextField
            label="Nombre"
            autoComplete="name"
            placeholder="Tu nombre"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="space-y-3">
            <PasswordField
              label="Contraseña"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordRequirements password={watch('password')} />
          </div>
        </fieldset>
        <Button type="submit" fullWidth loading={registerUser.isPending}>
          {registerUser.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthShell>
  );
}
