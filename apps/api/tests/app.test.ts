/** Pruebas de API: salud del servicio, errores y cabeceras de seguridad (RNF-04, RNF-06). */
import { describe, expect, it } from 'vitest';
import { api } from './helpers';

describe('TC-API-APP: servicio y seguridad general', () => {
  it('TC-API-APP-01 /api/health responde 200 con la hora del servidor', async () => {
    const res = await api().get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('TC-API-APP-02 una ruta inexistente responde 404 en JSON (no una página de error de Express)', async () => {
    const res = await api().get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Recurso no encontrado');
  });

  it('TC-API-APP-03 no revela la tecnología del servidor (sin cabecera X-Powered-By)', async () => {
    const res = await api().get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('TC-API-APP-04 envía las cabeceras de seguridad de Helmet', async () => {
    const res = await api().get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('TC-API-APP-05 CORS solo autoriza el origen del frontend: un sitio ajeno nunca queda autorizado', async () => {
    const allowed = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    const denied = await api().get('/api/health').set('Origin', 'https://sitio-malicioso.com');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    // La API siempre anuncia el origen permitido; el navegador bloquea al que no coincide.
    // Lo importante: jamás se refleja el origen ajeno ni se usa el comodín "*".
    expect(denied.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(denied.headers['access-control-allow-origin']).not.toBe('https://sitio-malicioso.com');
    expect(denied.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('TC-API-APP-06 un error interno responde 500 sin exponer detalles técnicos', async () => {
    const { prisma } = await import('../src/lib/prisma');
    const original = prisma.user.findUnique;
    // Simula una falla inesperada de la base de datos
    (prisma.user as { findUnique: unknown }).findUnique = () =>
      Promise.reject(new Error('conexión secreta rota: host=10.0.0.5'));
    const consoleError = console.error;
    console.error = () => undefined;
    try {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: 'ana@mail.com', password: 'Cualquiera#1' });

      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Error interno del servidor');
      expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
    } finally {
      (prisma.user as { findUnique: unknown }).findUnique = original;
      console.error = consoleError;
    }
  });
});
