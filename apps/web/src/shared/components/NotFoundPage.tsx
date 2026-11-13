import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex w-full max-w-md flex-col items-start gap-5 rounded-brut-lg border-2 border-ink bg-paper p-8 shadow-brut">
        <Logo />
        <p className="font-serif text-7xl leading-none text-burnt">404</p>
        <h1 className="font-serif text-4xl leading-tight">Esta página no existe</h1>
        <p className="text-ink-soft">
          La dirección que abriste no corresponde a ninguna pantalla de TaskFlow.
        </p>
        <Link
          to="/"
          className="inline-flex items-center rounded-brut border-2 border-ink bg-burnt px-6 py-3 font-bold shadow-brut transition-all duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-brut-lg active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:transition-none"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
