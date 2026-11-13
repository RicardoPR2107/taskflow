import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../shared/components/Button';
import { Footer } from '../shared/components/Footer';
import { Logo } from '../shared/components/Logo';
import { ToastProvider } from '../shared/components/Toast';
import { cn } from '../shared/lib/cn';
import { useCurrentUser, useLogout } from '../features/auth/hooks';

/** Estructura de las pantallas privadas: barra superior con navegación y cierre de sesión. */
export function AppLayout() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <header className="border-b-2 border-ink bg-paper">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5">
            <div className="flex items-center gap-8">
              <Logo />
              <nav aria-label="Principal">
                <NavLink
                  to="/tablero"
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-2 py-1 font-bold transition-colors hover:bg-orange',
                      isActive &&
                        'underline decoration-orange decoration-4 underline-offset-8 hover:decoration-transparent',
                    )
                  }
                >
                  Tablero
                </NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-cream px-3 py-1 text-sm font-bold sm:inline">
                {user?.name}
              </span>
              <Button
                variant="dark"
                size="sm"
                loading={logout.isPending}
                onClick={() => logout.mutate()}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:py-10">
          <Outlet />
        </main>

        <Footer className="border-t-2 border-ink bg-paper" />
      </div>
    </ToastProvider>
  );
}
