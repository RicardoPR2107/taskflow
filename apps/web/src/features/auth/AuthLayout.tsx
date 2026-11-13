import type { ReactNode } from 'react';
import { Logo } from '../../shared/components/Logo';

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Marco compartido de login y registro: mensaje a la izquierda (solo en pantallas anchas) y formulario a la derecha. */
export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-2 lg:gap-16 lg:px-8">
      <section className="flex flex-col gap-6 lg:gap-8">
        <Logo />
        <h1 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Tus tareas,
          <br />
          <em className="text-burnt underline decoration-burnt decoration-[3px] underline-offset-[10px]">
            en orden.
          </em>
        </h1>
        <p className="hidden max-w-md text-lg text-ink-soft lg:block">
          Un tablero Kanban y un panel de progreso para organizar tu día, sin hojas de cálculo ni
          herramientas complicadas.
        </p>
      </section>

      <main>
        <div className="rounded-brut-lg border-2 border-ink bg-paper p-6 shadow-brut-lg sm:p-8">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight">{title}</h2>
          {children}
        </div>
        <p className="mt-6 text-center text-sm font-medium">{footer}</p>
      </main>
    </div>
  );
}
