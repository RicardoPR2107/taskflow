import type { ReactNode } from 'react';
import { Footer } from '../../../shared/components/Footer';
import { Logo } from '../../../shared/components/Logo';
import { TaskPreviewCard } from './TaskPreviewCard';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode; // el formulario
  footer: ReactNode; // enlace a la otra pantalla
}

/** Estructura común de login y registro: presentación a la izquierda, formulario a la derecha. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5">
        <Logo />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-8 px-5 pb-16 pt-2 lg:grid-cols-2 lg:gap-16 lg:pt-10">
        <section aria-labelledby="hero-title">
          <h1
            id="hero-title"
            className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Tus tareas,{' '}
            <span className="whitespace-nowrap font-serif font-medium italic underline decoration-orange decoration-[5px] underline-offset-[10px]">
              en orden.
            </span>
          </h1>
          <p className="mt-6 hidden max-w-md text-lg text-ink/80 sm:block">
            Organiza tus pendientes en un tablero Kanban y mide tu progreso en un dashboard. Una
            cuenta personal, sin equipos y sin ruido.
          </p>
          <TaskPreviewCard className="mt-12 hidden lg:block" />
        </section>

        <section className="mx-auto w-full max-w-md" aria-labelledby="form-title">
          <div className="rounded-3xl border-2 border-ink bg-paper p-6 shadow-hard-lg sm:p-8">
            <h2 id="form-title" className="text-2xl font-extrabold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-ink/70">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm">{footer}</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
