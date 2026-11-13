/** Pruebas de la cuenta de prueba interna (RF-34). */
import { DEMO_USER } from '@taskflow/shared';
import { describe, expect, it } from 'vitest';
import { ensureDemoUser } from '../src/lib/demoUser';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';
import { api } from './helpers';

const loginDemo = () =>
  api().post('/api/auth/login').send({ email: DEMO_USER.email, password: DEMO_USER.password });

describe('TC-DEMO: cuenta de prueba interna', () => {
  it('TC-DEMO-01 se crea si no existe y permite iniciar sesión', async () => {
    expect(await ensureDemoUser()).toBe('created');

    const res = await loginDemo();
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe(DEMO_USER.name);
  });

  it('TC-DEMO-02 es idempotente: ejecutarla otra vez no duplica ni cambia nada', async () => {
    await ensureDemoUser();

    expect(await ensureDemoUser()).toBe('exists');
    expect(await prisma.user.count({ where: { email: DEMO_USER.email } })).toBe(1);
  });

  it('TC-DEMO-03 si alguien le cambió la contraseña, se restaura la publicada', async () => {
    await ensureDemoUser();
    await prisma.user.update({
      where: { email: DEMO_USER.email },
      data: { passwordHash: await hashPassword('Cambiada-Demo#1') },
    });
    expect((await loginDemo()).status).toBe(401);

    expect(await ensureDemoUser()).toBe('restored');
    expect((await loginDemo()).status).toBe(200);
  });
});
