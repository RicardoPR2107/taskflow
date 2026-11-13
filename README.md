# 🗂️ TaskFlow

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-45ba4b?logo=playwright&logoColor=white)

Aplicación web full stack para gestionar tareas personales con un tablero Kanban y un dashboard de productividad. Es un proyecto de portafolio para practicar diseño de interfaces, lógica de negocio, seguridad y pruebas automatizadas.

> 🚧 **Estado:** en desarrollo. Ya funcionan las cuentas y la gestión de tareas. El arrastre en el tablero, los filtros y el dashboard son lo siguiente.

## 📦 Tecnologías

- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Tailwind CSS
- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Validación:** Zod (el mismo esquema en frontend y backend)
- **Pruebas:** Vitest, React Testing Library, Supertest, Playwright
- **Calidad:** GitHub Actions (CI), Prettier

## ✨ Funcionalidades

Lo que ya puede hacer el usuario:

- **Crear una cuenta** con una contraseña segura (mínimo 10 caracteres, mayúscula, minúscula, número y símbolo).
- **Iniciar y cerrar sesión**, con la sesión guardada en una cookie protegida.
- **Recuperar la contraseña** con un enlace de un solo uso que dura 30 minutos.
- **Crear, editar y eliminar tareas** con título, descripción, estado, prioridad y fecha límite. Antes de eliminar se pide confirmación.
- **Ver las tareas en un tablero** de 4 columnas (Pendiente, En progreso, En revisión, Completada), con aviso de las vencidas.
- **Recibir avisos** dentro de la app y ver pantallas de carga, vacío y error.

Próximamente: arrastrar y soltar en el tablero, filtros, dashboard con gráficos, tema claro y oscuro.

## ⌨️ Atajos de teclado

Todavía no hay. Se agregarán junto con el tablero.

## 🧑‍🍳 El proceso

1. Definí los requisitos, las reglas de negocio y el stack antes de escribir código.
2. Armé un monorepo con `npm workspaces`: `apps/web`, `apps/api` y `packages/shared`.
3. Construí el backend por capas (rutas, controladores, servicios y repositorio) con Prisma sobre PostgreSQL.
4. Agregué la seguridad desde el inicio: Argon2id, cookies `HttpOnly`, límite de intentos y cabeceras con Helmet.
5. Diseñé la interfaz con un estilo brutalista limpio (crema, negro y naranja) y la hice responsive.
6. Escribí pruebas en cada nivel y las conecté a un CI que corre en cada Pull Request.

## 📚 Lo que aprendí

- A mantener las reglas de validación en un solo lugar (`packages/shared`) para que frontend y backend nunca se contradigan.
- A guardar contraseñas y tokens de forma segura, y a no revelar si un correo existe.
- A probar en cuatro niveles: unitarias, componentes, API y flujos completos con navegador real.
- A trabajar con ramas, Pull Requests e integración continua.

## 💡 Cómo se podría mejorar

- Envío real de correos para la recuperación de contraseña.
- Notificaciones dentro de la app y modo oscuro.
- Despliegue con Docker, Nginx y varias instancias del backend.
- Pruebas de carga con k6 y monitoreo con Grafana.

## 🚀 Cómo ejecutarlo

Necesitas Node.js 22 o superior, npm, Git y PostgreSQL.

```bash
git clone https://github.com/RicardoPR2107/taskflow.git
cd taskflow
npm install
```

1. Crea una base de datos vacía llamada `taskflow` en PostgreSQL.
2. Copia `apps/api/.env.example` como `apps/api/.env` (en PowerShell: `Copy-Item apps/api/.env.example apps/api/.env`).
3. En ese `.env`, pon tu contraseña de PostgreSQL en `DATABASE_URL` y un secreto en `JWT_SECRET`. Para generarlo:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
4. Crea las tablas y arranca la app:
   ```bash
   npm run db:generate -w @taskflow/api
   npm run db:migrate -w @taskflow/api
   npm run dev
   ```
5. Abre http://localhost:5173.

### Pruebas

```bash
npm test                                   # unitarias, API y componentes
npx playwright install chromium            # solo la primera vez
npm run test:e2e                           # flujos completos con navegador real
```

Las pruebas usan su propia base de datos (`taskflow_test`, se crea sola) y no tocan la tuya.

## 🎥 Video

_Se agregará cuando el proyecto esté terminado._

## 📄 Derechos

© Ricardo Palma. Todos los derechos reservados.
