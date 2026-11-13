import { DEMO_USER } from '@taskflow/shared';
import { prisma } from './prisma.js';
import { hashPassword, verifyPassword } from './password.js';
import { usersRepository } from '../modules/users/users.repository.js';

/**
 * Garantiza que la cuenta de prueba (RF-34) exista Y que su contraseña sea la publicada.
 * Es idempotente: si todo está bien, no cambia nada. Si alguien cambió la contraseña
 * (por ejemplo, con la recuperación), la restaura para que la cuenta de prueba nunca quede inservible.
 * Se ejecuta al arrancar la API fuera de producción y con `npm run db:seed`.
 */
export async function ensureDemoUser(): Promise<'created' | 'exists' | 'restored'> {
  const existing = await usersRepository.findByEmail(DEMO_USER.email);

  if (!existing) {
    await usersRepository.create({
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      passwordHash: await hashPassword(DEMO_USER.password),
    });
    return 'created';
  }

  if (await verifyPassword(existing.passwordHash, DEMO_USER.password)) return 'exists';

  await prisma.user.update({
    where: { id: existing.id },
    data: { passwordHash: await hashPassword(DEMO_USER.password) },
  });
  return 'restored';
}
