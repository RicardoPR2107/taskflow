import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordFormSchema, type ResetPasswordFormInput } from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button, buttonClasses } from '../../../shared/components/Button';
import { PasswordField } from '../../../shared/components/PasswordField';
import { TextLink } from '../../../shared/components/TextLink';
import { AuthShell } from '../components/AuthShell';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { useResetPassword } from '../hooks';
import { handleSubmitError } from '../submitError';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
    // Los errores aparecen al enviar y se corrigen en vivo al escribir (así el diseño no se mueve al hacer clic).
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await reset.mutateAsync({ token, password });
    } catch (error) {
      handleSubmitError(error, setError, setFormError, ['password']);
    }
  });

  const requestNew = (
    <>
      ¿El enlace expiró? <TextLink to="/recuperar">Solicitar uno nuevo</TextLink>
    </>
  );

  // Enlace sin token (por ejemplo, copiado incompleto)
  if (!token) {
    return (
      <AuthShell
        title="Enlace no válido"
        subtitle="Este enlace está incompleto."
        footer={requestNew}
      >
        <Alert>El enlace de recuperación no es válido. Solicita uno nuevo para continuar.</Alert>
        <Link to="/recuperar" className={buttonClasses({ fullWidth: true, className: 'mt-6' })}>
          Solicitar un enlace nuevo
        </Link>
      </AuthShell>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthShell title="Contraseña actualizada" subtitle="Todo listo." footer={<></>}>
        <p className="text-ink/90">
          Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con la nueva.
        </p>
        <Link to="/login" className={buttonClasses({ fullWidth: true, className: 'mt-6' })}>
          Ir a iniciar sesión
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crea tu nueva contraseña"
      subtitle="Elige una contraseña segura que no uses en otros sitios."
      footer={requestNew}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <fieldset disabled={reset.isPending} className="space-y-5">
          <div className="space-y-3">
            <PasswordField
              label="Contraseña nueva"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordRequirements password={watch('password')} />
          </div>
          <PasswordField
            label="Repite la contraseña"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </fieldset>
        <Button type="submit" fullWidth loading={reset.isPending}>
          {reset.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthShell>
  );
}
