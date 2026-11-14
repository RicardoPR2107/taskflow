/** Demo de un solo contenedor: Express sirve la web compilada sin romper la API. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const dir = mkdtempSync(path.join(tmpdir(), 'taskflow-web-'));
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
  app = createApp({ webDistDir: dir });
});

describe('TC-API-WEB: web compilada servida por Express', () => {
  it('TC-API-WEB-01 la raíz entrega index.html sin caché', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<div id="root">');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('TC-API-WEB-02 una ruta de React Router (/tablero) cae en index.html', async () => {
    const response = await request(app).get('/tablero');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<div id="root">');
  });

  it('TC-API-WEB-03 los archivos de /assets se guardan en caché un año', async () => {
    const response = await request(app).get('/assets/app-abc123.js');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('TC-API-WEB-04 una ruta /api inexistente sigue respondiendo 404 en JSON, no index.html', async () => {
    const response = await request(app).get('/api/no-existe');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Recurso no encontrado');
  });

  it('TC-API-WEB-05 la API y las cabeceras de seguridad siguen funcionando', async () => {
    const health = await request(app).get('/api/health');
    const page = await request(app).get('/');

    expect(health.status).toBe(200);
    expect(page.headers['content-security-policy']).toContain("script-src 'self'");
    expect(page.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });

  it('TC-API-WEB-06 sin carpeta configurada, la API no sirve páginas (comportamiento normal)', async () => {
    const response = await request(createApp({ webDistDir: undefined })).get('/tablero');

    expect(response.status).toBe(404);
  });
});
