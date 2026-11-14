# syntax=docker/dockerfile:1
# Un solo Dockerfile con dos "destinos" (targets): `api` (Express) y `web` (Nginx con la página ya compilada).

# ---------- Dependencias (se reutilizan en los dos destinos) ----------
FROM node:22-slim AS deps
WORKDIR /app
# openssl lo necesita Prisma para conectarse y migrar.
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# Primero solo los package.json: mientras no cambien las dependencias, Docker reutiliza esta capa (más rápido).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY e2e/package.json e2e/
RUN npm ci

# ---------- API ----------
FROM deps AS api
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
# prisma generate solo necesita que DATABASE_URL exista; no se conecta a nada.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run db:generate -w @taskflow/api
ENV NODE_ENV=production PORT=3000
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]

# ---------- Compilar la web ----------
FROM deps AS web-build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @taskflow/web

# ---------- Web: Nginx sirve la página y reparte /api entre las instancias de la API ----------
FROM nginx:1.27-alpine AS web
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

# ---------- Demo pública (Render): un solo contenedor con API + web ----------
# Es el ÚLTIMO destino, así que es el que se construye cuando no se indica ninguno (como hace Render).
FROM api AS demo
COPY --from=web-build /app/apps/web/dist /app/web-dist
ENV WEB_DIST_DIR=/app/web-dist SEED_DEMO=true
# Antes de arrancar, crea o actualiza las tablas en la base de datos (igual que el servicio `migrate`).
CMD ["sh", "-c", "if [ -d prisma/migrations ] && [ -n \"$(ls -A prisma/migrations)\" ]; then npx prisma migrate deploy; else npx prisma db push; fi && npx tsx src/server.ts"]
