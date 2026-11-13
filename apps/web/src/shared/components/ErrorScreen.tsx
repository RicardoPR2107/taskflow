import { Button } from './Button';
import { Footer } from './Footer';
import { Logo } from './Logo';

interface ErrorScreenProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Pantalla de fallo con mensaje claro y botón para reintentar. */
export function ErrorScreen({
  title = 'Algo salió mal',
  message,
  actionLabel = 'Reintentar',
  onAction,
}: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-md">
          <Logo className="mb-6" />
          <div role="alert" className="rounded-3xl border-2 border-ink bg-paper p-7 shadow-hard">
            <h1 className="text-2xl font-extrabold">{title}</h1>
            <p className="mt-2 text-ink/80">{message}</p>
            {onAction && (
              <Button className="mt-6" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
