# TaskFlow

Aplicación web de gestión de tareas con tablero Kanban y dashboard de productividad.

**Stack:** TypeScript, React, Node.js, Express (más Vite, Zod, PostgreSQL y Prisma).

## Estructura

```
apps/web         Frontend (React + Vite)
apps/api         Backend (Node + Express)
packages/shared  Esquemas Zod y tipos compartidos por frontend y backend
```

Es un monorepo gestionado con **npm workspaces**: una sola instalación para todo.

## Puesta en marcha

Requisitos: Node.js 22 o superior, npm, Git y PostgreSQL.

```bash
npm install                                  # instala todo (raíz y workspaces)
cp apps/api/.env.example apps/api/.env       # en PowerShell: Copy-Item apps/api/.env.example apps/api/.env
npm run dev                                  # levanta API (3000) y web (5173)
```

Abre http://localhost:5173: debe decir "Estado de la API: conectada".

## Base de datos (Prisma + PostgreSQL)

1. Crea una base de datos vacía llamada `taskflow` en tu PostgreSQL.
2. En `apps/api/.env`, ajusta `DATABASE_URL` con tu usuario y contraseña.
3. Genera el cliente y crea las tablas:

```bash
npm run db:generate -w @taskflow/api
npm run db:migrate -w @taskflow/api -- --name init
```

Al arrancar con `npm run dev`, la API debe mostrar "Base de datos conectada".

## Autenticación

En `apps/api/.env` hace falta un `JWT_SECRET` real. Genéralo con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Endpoints disponibles:

| Método | Ruta                 | Función                               |
| ------ | -------------------- | ------------------------------------- |
| POST   | `/api/auth/register` | Crear cuenta e iniciar sesión         |
| POST   | `/api/auth/login`    | Iniciar sesión                        |
| POST   | `/api/auth/logout`   | Cerrar sesión                         |
| GET    | `/api/users/me`      | Datos del usuario con sesión iniciada |

La sesión viaja en una cookie `HttpOnly` y las contraseñas se guardan con Argon2id.

## Scripts (desde la raíz)

| Comando                              | Qué hace                                       |
| ------------------------------------ | ---------------------------------------------- |
| `npm run dev`                        | Arranca backend y frontend a la vez            |
| `npm run typecheck`                  | Revisa los tipos de TypeScript en todo el repo |
| `npm run build`                      | Compila el frontend para producción            |
| `npm run format`                     | Da formato uniforme al código con Prettier     |
| `npm run db:studio -w @taskflow/api` | Abre Prisma Studio para ver los datos          |

## Frontend

- **Estilos:** Tailwind CSS. Los colores, sombras y tipografías del sistema de diseño están en `apps/web/src/index.css` (bloque `@theme`).
- **Paleta:** cream `#F3EEE3`, ink `#111111` y burnt orange `#D9541E`.
- **Rutas:** `/login` y `/registro` (públicas), `/tablero` (privada). Cada pantalla se carga de forma perezosa (`React.lazy`).
- **Sesión:** `useCurrentUser` consulta `/api/users/me`; `ProtectedRoute` y `PublicOnlyRoute` deciden a dónde va cada visitante.

## Cuenta de prueba, contraseñas y recuperación

- **Cuenta de prueba:** `demo@taskflow.dev` / `Demo-Task#2026`. La API la crea (o la restaura) sola al arrancar fuera de producción. También se puede crear con `npm run db:seed -w @taskflow/api`. En el login aparece un botón para autocompletarla.
- **Política de contraseñas:** mínimo 10 caracteres, con minúscula, mayúscula, número y carácter especial. Está definida una sola vez en `packages/shared` y la usan el backend y el frontend.
- **Recuperar contraseña:** `/recuperar` pide el correo y genera un enlace de un solo uso, válido 30 minutos. Como aún no hay servicio de correo, en desarrollo el enlace se imprime en la terminal de la API ("correo simulado"). Para enviar correos reales solo hay que reemplazar `apps/api/src/lib/mailer.ts`.
- **Pie de página:** todas las pantallas muestran "© año Ricardo Palma. Todos los derechos reservados." (se cambia en `apps/web/src/shared/config.ts`).

Después de actualizar el código, aplica la nueva tabla de recuperación:

```bash
npm run db:generate -w @taskflow/api
npm run db:migrate -w @taskflow/api   # cuando pida un nombre, escribe: password_reset
```

## Pruebas

Se ejecutan desde la raíz:

| Comando            | Qué ejecuta                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `npm test`         | Unitarias (`packages/shared/tests`), API (`apps/api/tests`) y pantallas (`apps/web/tests`) |
| `npm run test:e2e` | Extremo a extremo con navegador real (`e2e/tests`)                                         |
| `npm run test:all` | Revisión de tipos + todas las pruebas                                                      |

Las pruebas usan su propia base de datos (`taskflow_test`, se crea sola) y nunca tocan la de desarrollo. La primera vez, instala el navegador con `npx playwright install chromium`.
