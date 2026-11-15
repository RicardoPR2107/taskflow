// Prueba de carga de TaskFlow con k6.
// Simula usuarios reales: miran el dashboard, listan tareas, crean una, la completan y la borran.
// Además, un goteo constante de inicios de sesión (que usan argon2: es la operación más pesada).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const PEAK_VUS = Number(__ENV.PEAK_VUS || 40); // usuarios simultáneos en el momento de mayor carga
const PASSWORD = 'Clave-Segura#1';

// Cuántas peticiones atendió cada instancia de la API (Nginx lo informa en la cabecera X-Upstream).
const upstreamRequests = new Counter('upstream_requests');

export const options = {
  scenarios: {
    usuarios: {
      executor: 'ramping-vus', // sube poco a poco el número de usuarios, se mantiene y baja
      exec: 'usuario',
      startVUs: 1,
      stages: [
        { duration: '30s', target: Math.max(1, Math.ceil(PEAK_VUS / 4)) },
        { duration: '1m', target: Math.max(1, Math.ceil(PEAK_VUS / 2)) },
        { duration: '1m', target: PEAK_VUS },
        { duration: '1m', target: PEAK_VUS },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    inicios_de_sesion: {
      executor: 'constant-arrival-rate', // 2 inicios de sesión por segundo, pase lo que pase
      exec: 'iniciarSesion',
      rate: 2,
      timeUnit: '1s',
      duration: '3m50s',
      preAllocatedVUs: 5,
      maxVUs: 30,
    },
  },
  // Si no se cumplen, k6 termina con error: así se ve cuándo el sistema "no aguanta".
  thresholds: {
    http_req_failed: ['rate<0.01'], // menos de 1 % de errores
    http_req_duration: ['p(95)<800'], // el 95 % de las respuestas, en menos de 800 ms
  },
};

const json = { 'Content-Type': 'application/json' };

/** Se ejecuta una vez antes de empezar: crea la cuenta con la que se hará toda la prueba. */
export function setup() {
  const email = `carga-${Date.now()}-${Math.floor(Math.random() * 1e6)}@prueba.test`;
  const res = http.post(
    `${BASE}/api/auth/register`,
    JSON.stringify({ name: 'Prueba de carga', email, password: PASSWORD }),
    { headers: json, tags: { name: 'setup: registro' } },
  );
  if (res.status !== 201) {
    throw new Error(`No se pudo crear la cuenta de la prueba (código ${res.status}): ${res.body}`);
  }
  const session = res.cookies.taskflow_session[0].value;
  return { email, cookie: `taskflow_session=${session}` };
}

/** Un usuario haciendo su rutina. */
export function usuario(data) {
  const headers = { ...json, Cookie: data.cookie };
  const call = (method, path, name, body) => {
    const res = http.request(method, `${BASE}/api${path}`, body && JSON.stringify(body), {
      headers,
      tags: { name },
    });
    const instance = res.headers['X-Upstream'];
    if (instance) upstreamRequests.add(1, { upstream: instance });
    return res;
  };

  const dashboard = call('GET', '/dashboard', 'GET /api/dashboard');
  check(dashboard, { 'dashboard 200': (r) => r.status === 200 });

  const list = call('GET', '/tasks?page=1&pageSize=10&sort=due_asc', 'GET /api/tasks');
  check(list, { 'lista 200': (r) => r.status === 200 });

  const created = call('POST', '/tasks', 'POST /api/tasks', {
    title: `Tarea ${__VU}-${__ITER}`,
    priority: 'HIGH',
  });
  check(created, { 'crear 201': (r) => r.status === 201 });

  if (created.status === 201) {
    const id = created.json('task.id');
    const done = call('PATCH', `/tasks/${id}`, 'PATCH /api/tasks/:id', { status: 'DONE' });
    check(done, { 'completar 200': (r) => r.status === 200 });
    const removed = call('DELETE', `/tasks/${id}`, 'DELETE /api/tasks/:id');
    check(removed, { 'eliminar 204': (r) => r.status === 204 });
  }

  sleep(1); // el usuario "piensa" un segundo antes de la siguiente rutina
}

/** Un inicio de sesión (argon2 gasta bastante CPU a propósito, por seguridad). */
export function iniciarSesion(data) {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: data.email, password: PASSWORD }),
    { headers: json, tags: { name: 'POST /api/auth/login' } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
}
