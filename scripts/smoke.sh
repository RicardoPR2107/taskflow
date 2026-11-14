#!/usr/bin/env bash
# Prueba de humo del despliegue con Docker: comprueba que Nginx, las instancias de la API y la base de
# datos trabajan juntos. Uso: bash scripts/smoke.sh   (o BASE=http://mi-sitio bash scripts/smoke.sh)
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
JSON='Content-Type: application/json'
fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

echo "Esperando a que el sitio responda…"
ready=0
for _ in $(seq 1 60); do
  if curl -fs "$BASE/api/health" >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[ "$ready" = 1 ] || fail "El sitio no respondió en 2 minutos"
ok "La API responde a través de Nginx"

# 1. La página y las rutas de React Router
curl -fs "$BASE/" | grep -q '<div id="root">' || fail "No se entregó la página principal"
curl -fs "$BASE/tablero" | grep -q '<div id="root">' || fail "Una ruta de la app no cayó en index.html"
ok "La web se sirve y las rutas internas funcionan"

# 2. Cabeceras de seguridad y sin versión de Nginx
headers=$(curl -sI "$BASE/" | tr -d '\r')
echo "$headers" | grep -qi '^content-security-policy:' || fail "Falta Content-Security-Policy"
echo "$headers" | grep -qi '^x-frame-options: DENY' || fail "Falta X-Frame-Options"
echo "$headers" | grep -qiE '^server: nginx/[0-9]' && fail "Nginx revela su versión"
ok "Cabeceras de seguridad presentes"

# 3. Balanceo: las peticiones deben repartirse entre varias instancias
upstreams=$(for _ in $(seq 1 30); do
  curl -sI "$BASE/api/health" | tr -d '\r' | grep -i '^x-upstream:' | awk '{print $2}'
done | sort -u | wc -l)
echo "   Instancias que atendieron las 30 peticiones: $upstreams"
[ "$upstreams" -ge 2 ] || fail "Nginx no está repartiendo la carga entre instancias"
ok "Nginx reparte la carga entre $upstreams instancias"

# 4. Flujo real: registro, crear tarea, dashboard y bloqueo de origen ajeno
email="humo-$RANDOM$RANDOM@prueba.test"
response=$(curl -si -H "$JSON" -H "Origin: $BASE" \
  -d "{\"name\":\"Humo\",\"email\":\"$email\",\"password\":\"Clave-Segura#1\"}" "$BASE/api/auth/register" | tr -d '\r')
echo "$response" | head -1 | grep -q ' 201' || fail "El registro no respondió 201"
cookie=$(echo "$response" | grep -i '^set-cookie: taskflow_session' | sed 's/^[^:]*: *\([^;]*\).*/\1/')
[ -n "$cookie" ] || fail "No llegó la cookie de sesión"
ok "Registro y sesión funcionan (base de datos conectada)"

code=$(curl -s -o /dev/null -w '%{http_code}' -H "$JSON" -H "Origin: $BASE" -H "Cookie: $cookie" \
  -d '{"title":"Tarea de la prueba de humo"}' "$BASE/api/tasks")
[ "$code" = 201 ] || fail "Crear una tarea respondió $code"
total=$(curl -s -H "Cookie: $cookie" "$BASE/api/tasks" | grep -o '"total":[0-9]*' | cut -d: -f2)
[ "$total" = 1 ] || fail "La lista de tareas debía tener 1 tarea y tiene: $total"
curl -s -H "Cookie: $cookie" "$BASE/api/dashboard" | grep -q '"total":1' || fail "El dashboard no refleja la tarea"
ok "Crear tarea, listar y dashboard funcionan"

code=$(curl -s -o /dev/null -w '%{http_code}' -H "$JSON" -H "Origin: https://sitio-malicioso.com" -H "Cookie: $cookie" \
  -d '{"title":"Intruso"}' "$BASE/api/tasks")
[ "$code" = 403 ] || fail "Un origen ajeno debía recibir 403 y recibió $code"
ok "Un sitio ajeno no puede modificar datos (403)"

echo "🎉 Todo correcto"
