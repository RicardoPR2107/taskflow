import { cn } from '../lib/cn';
import { APP_OWNER } from '../config';

/** Pie de página común a todas las pantallas. */
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('px-5 py-6 text-center text-sm text-ink/70', className)}>
      © {new Date().getFullYear()} {APP_OWNER}. Todos los derechos reservados.
    </footer>
  );
}
