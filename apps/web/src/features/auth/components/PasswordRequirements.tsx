import { PASSWORD_RULES } from '@taskflow/shared';
import { cn } from '../../../shared/lib/cn';

/** Lista de requisitos de la contraseña que se marcan en vivo mientras el usuario escribe. */
export function PasswordRequirements({ password }: { password: string }) {
  return (
    <div className="rounded-xl bg-cream px-4 py-3">
      <p className="text-sm font-bold">Tu contraseña debe tener:</p>
      <ul className="mt-2 space-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.id} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-extrabold transition-colors',
                  met ? 'bg-ink text-cream' : 'bg-ink/10 text-ink/60',
                )}
              >
                {met ? '✓' : '·'}
              </span>
              <span className={met ? 'font-semibold' : 'text-ink/75'}>
                {rule.label}
                <span className="sr-only">{met ? ': cumplido' : ': pendiente'}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
