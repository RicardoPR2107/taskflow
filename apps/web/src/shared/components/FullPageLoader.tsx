import { Logo } from './Logo';
import { Spinner } from './Spinner';

export function FullPageLoader() {
  return (
    <div role="status" className="grid min-h-screen place-items-center px-5">
      <div className="flex flex-col items-center gap-5">
        <Logo />
        <Spinner className="h-7 w-7" />
        <span className="text-sm font-semibold">Cargando…</span>
      </div>
    </div>
  );
}
