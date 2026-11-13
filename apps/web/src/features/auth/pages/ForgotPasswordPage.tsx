import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button, buttonClasses } from '../../../shared/components/Button';
import { TextField } from '../../../shared/components/TextField';
import { TextLink } from '../../../shared/components/TextLink';
import { Link } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { useForgotPassword } from '../hooks';
import { handleSubmitError } from '../submitError';

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    // Los errores aparecen al enviar y se corrigen en vivo al escribir (así el diseño no se mueve al hacer clic).
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await forgot.mutateAsync(values);
      setSentTo(values.email);
    } catch (error) {
      handleSubmitError(error, setError, setFormError, ['email']);
    }
  });

  const backToLogin = (
    <>
      ¿La recordaste? <TextLink to="/login">Iniciar sesión</TextLink>
    </>
  );

  if (sentTo) {
    return (
      <AuthShell title="Revisa tu correo" subtitle="Solicitud enviada." footer={backToLogin}>
        <p className="text-ink/90">
          Si <strong className="break-all">{sentTo}</strong> está registrado, te enviamos un enlace
          para crear una contraseña nueva. El enlace funciona una sola vez y vence en 30 minutos.
        </p>
        {import.meta.env.DEV && (
          <p className="mt-4 rounded-xl border-2 border-dashed border-ink/40 p-3 text-sm">
            <strong>Modo desarrollo:</strong> no se envían correos reales. Copia el enlace desde la
            terminal donde corre la API.
          </p>
        )}
        <Link to="/login" className={buttonClasses({ fullWidth: true, className: 'mt-6' })}>
          Volver a iniciar sesión
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva."
      footer={backToLogin}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <fieldset disabled={forgot.isPending}>
          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </fieldset>
        <Button type="submit" fullWidth loading={forgot.isPending}>
          {forgot.isPending ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>
    </AuthShell>
  );
}
