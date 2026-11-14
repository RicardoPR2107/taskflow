/** Pruebas de seguridad transversales: CSRF por origen, caché, límite general y entradas hostiles. */
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { api, loggedInAgent, validRegistration } from './helpers';

const ORIGIN = 'http://localhost:5173'; // CORS_ORIGIN por defecto

describe('TC-API-SEC: seguridad transversal', () => {
  it('TC-API-SEC-01 una petición que modifica datos desde un sitio ajeno se rechaza con 403', async () => {
    const agent = await loggedInAgent();

    const response = await agent
      .post('/api/tasks')
      .set('Origin', 'https://sitio-malicioso.com')
      .send({ title: 'Tarea plantada' });

    expect(response.status).toBe(403);
    expect((await agent.get('/api/tasks')).body.total).toBe(0); // y no se creó nada
  });

  it('TC-API-SEC-02 lo mismo vale para editar y eliminar', async () => {
    const agent = await loggedInAgent();
    const { id } = (await agent.post('/api/tasks').send({ title: 'Mía' })).body.task;

    const patch = await agent
      .patch(`/api/tasks/${id}`)
      .set('Origin', 'https://sitio-malicioso.com')
      .send({ title: 'Hackeada' });
    const del = await agent.delete(`/api/tasks/${id}`).set('Origin', 'https://sitio-malicioso.com');

    expect([patch.status, del.status]).toEqual([403, 403]);
    expect((await agent.get(`/api/tasks/${id}`)).body.task.title).toBe('Mía');
  });

  it('TC-API-SEC-03 el origen del frontend sí puede modificar datos', async () => {
    const agent = await loggedInAgent();

    const response = await agent
      .post('/api/tasks')
      .set('Origin', ORIGIN)
      .send({ title: 'Legítima' });

    expect(response.status).toBe(201);
  });

  it('TC-API-SEC-04 el login y el registro también exigen un origen válido', async () => {
    const response = await api()
      .post('/api/auth/register')
      .set('Origin', 'https://sitio-malicioso.com')
      .send(validRegistration());

    expect(response.status).toBe(403);
  });

  it('TC-API-SEC-05 consultar (GET) no se bloquea por el origen', async () => {
    const agent = await loggedInAgent();

    const response = await agent.get('/api/tasks').set('Origin', 'https://otro-sitio.com');

    expect(response.status).toBe(200); // CORS ya impide que ese sitio LEA la respuesta
  });

  it('TC-API-SEC-06 las respuestas de la API no se guardan en caché', async () => {
    const agent = await loggedInAgent();

    expect((await agent.get('/api/tasks')).headers['cache-control']).toBe('no-store');
    expect((await agent.get('/api/dashboard')).headers['cache-control']).toBe('no-store');
  });

  it('TC-API-SEC-07 un id con texto malicioso responde 404 sin error interno', async () => {
    const agent = await loggedInAgent();

    for (const id of ["' OR 1=1 --", '../../etc/passwd', '%00', 'x'.repeat(500)]) {
      const response = await agent.get(`/api/tasks/${encodeURIComponent(id)}`);
      expect(response.status, id).toBe(404);
    }
  });

  it('TC-API-SEC-08 un título con HTML se guarda como texto y nunca se interpreta (la API solo habla JSON)', async () => {
    const agent = await loggedInAgent();
    const title = '<img src=x onerror=alert(1)>';

    const response = await agent.post('/api/tasks').send({ title });

    expect(response.status).toBe(201);
    expect(response.body.task.title).toBe(title);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('TC-API-SEC-09 un cuerpo con campos extra no puede cambiar datos internos (asignación masiva)', async () => {
    const agent = await loggedInAgent();
    const other = await loggedInAgent({ name: 'Luis', email: 'luis@mail.com' });
    const luisId = (await other.get('/api/users/me')).body.user.id;

    const response = await agent
      .post('/api/tasks')
      .send({ title: 'Intento', userId: luisId, completedAt: '2020-01-01T00:00:00Z' });

    expect(response.body.task.completedAt).toBeNull();
    expect((await other.get('/api/tasks')).body.total).toBe(0); // no apareció en la cuenta ajena
    expect((await agent.get('/api/tasks')).body.total).toBe(1);
  });

  it('TC-API-SEC-10 un JSON mal formado responde 400 y uno gigante 413, sin detalles internos', async () => {
    const agent = await loggedInAgent();

    const malformed = await agent
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    const huge = await agent
      .post('/api/tasks')
      .send({ title: 'a', description: 'x'.repeat(20_000) });

    expect(malformed.status).toBe(400);
    expect(huge.status).toBe(413);
    expect(JSON.stringify(malformed.body)).not.toMatch(/at .*\.(ts|js)|node_modules/);
  });
});

describe('TC-API-SEC: límite general', () => {
  afterEach(() => {
    delete process.env.API_RATE_LIMIT;
  });

  it('TC-API-SEC-11 superado el límite, la API responde 429, pero /api/health sigue disponible', async () => {
    process.env.API_RATE_LIMIT = '3';
    const agent = request.agent(createApp());

    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await agent.get('/api/tasks')).status);

    expect(statuses).toEqual([401, 401, 401, 429, 429]);
    expect((await agent.get('/api/health')).status).toBe(200); // Docker y Nginx lo consultan siempre
  });
});
