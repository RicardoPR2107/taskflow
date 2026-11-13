import { DEMO_USER } from '@taskflow/shared';
import { Button } from '../../../shared/components/Button';

// La cuenta de prueba es para el equipo, no para los usuarios: este recuadro está OCULTO por defecto.
// Para activarlo en tu PC, crea apps/web/.env.local con la línea: VITE_SHOW_DEMO_ACCOUNT=true
export const SHOW_DEMO_ACCOUNT = import.meta.env.VITE_SHOW_DEMO_ACCOUNT === 'true';

/** Atajo interno (RF-34): muestra las credenciales de la cuenta de prueba y las autocompleta con un clic. */
export function DemoAccountHint({ onUse }: { onUse: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-ink/40 p-4">
      <p className="text-sm font-extrabold">Atajo del equipo</p>
      <p className="mt-1 text-sm text-ink/80">Cuenta de prueba interna:</p>
      <dl className="mt-2 space-y-0.5 text-sm">
        <div className="flex gap-2">
          <dt className="font-bold">Correo:</dt>
          <dd className="break-all">{DEMO_USER.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">Contraseña:</dt>
          <dd className="break-all">{DEMO_USER.password}</dd>
        </div>
      </dl>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onUse}>
        Usar cuenta de prueba
      </Button>
    </div>
  );
}
