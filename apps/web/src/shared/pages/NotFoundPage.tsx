import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/Button';
import { Footer } from '../components/Footer';
import { Logo } from '../components/Logo';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-md">
          <Logo className="mb-6" />
          <div className="rounded-3xl border-2 border-ink bg-paper p-7 shadow-hard">
            <p className="font-serif text-6xl italic">404</p>
            <h1 className="mt-2 text-2xl font-extrabold">Esta página no existe</h1>
            <p className="mt-2 text-ink/80">
              La dirección que buscas no está disponible o fue movida.
            </p>
            <Link to="/" className={buttonClasses({ className: 'mt-6' })}>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
