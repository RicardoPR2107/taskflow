#!/usr/bin/env bash
# Prueba de humo de la demo de un solo contenedor (API + web). Uso: BASE=http://localhost:8081 bash scripts/smoke-demo.sh
set -euo pipefail

BASE="${BASE:-http://localhost:8081}"
fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

ready=0
for _ in $(seq 1 60); do
  if curl -fs "$BASE/api/health" >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[ "$ready" = 1 ] || fail "La demo no respondió en 2 minutos"
ok "La demo responde"

curl -fs "$BASE/" | grep -q '<div id="root">' || fail "No se sirve la página principal"
curl -fs "$BASE/tablero" | grep -q '<div id="root">' || fail "Una ruta de la app no cayó en index.html"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/no-existe")" = 404 ] || fail "/api inexistente debía dar 404"
ok "La web se sirve desde Express y /api sigue siendo API"

# La cuenta de prueba pública debe existir y permitir entrar.
code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -H "Origin: $BASE" \
  -d '{"email":"demo@taskflow.dev","password":"Demo-Task#2026"}' "$BASE/api/auth/login")
[ "$code" = 200 ] || fail "La cuenta demo no pudo iniciar sesión (código $code)"
ok "La cuenta de prueba demo@taskflow.dev funciona"

echo "🎉 Todo correcto"
