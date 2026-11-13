import { createHash, randomBytes } from 'node:crypto';
import type { LoginInput, PublicUser, RegisterInput, ResetPasswordInput } from '@taskflow/shared';
import { env } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import { sendPasswordResetEmail } from '../../lib/mailer.js';
import { getDummyHash, hashPassword, verifyPassword } from '../../lib/password.js';
import { signSessionToken } from '../../lib/token.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { usersRepository } from '../users/users.repository.js';
import { toPublicUser } from '../users/users.mapper.js';
import { passwordResetRepository } from './passwordReset.repository.js';

const RESET_TOKEN_MINUTES = 30;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export interface AuthResult {
  user: PublicUser;
  token: string;
}

// El service contiene las reglas de negocio. No sabe nada de HTTP (req/res).
export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await usersRepository.create({
        name: input.name,
        email: input.email,
        passwordHash,
      });
      return { user: toPublicUser(user), token: await signSessionToken(user.id) };
    } catch (error) {
      // P2002 = violación de unicidad: ya existe un usuario con ese correo.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'Ya existe una cuenta con ese correo');
      }
      throw error;
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await usersRepository.findByEmail(input.email);

    // Siempre verificamos una contraseña, exista o no el correo (ver getDummyHash).
    const hashToCheck = user?.passwordHash ?? (await getDummyHash());
    const passwordMatches = await verifyPassword(hashToCheck, input.password);

    // Mismo mensaje para "correo inexistente" y "contraseña incorrecta".
    if (!user || !passwordMatches) {
      throw new AppError(401, 'Correo o contraseña incorrectos');
    }

    return { user: toPublicUser(user), token: await signSessionToken(user.id) };
  },

  /**
   * Recuperación de contraseña, paso 1. SIEMPRE termina igual (exista o no el correo),
   * para que nadie pueda averiguar qué correos están registrados.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await usersRepository.findByEmail(email);
    if (!user) return;

    // 32 bytes aleatorios: imposible de adivinar. En la base solo se guarda su hash.
    const token = randomBytes(32).toString('base64url');
    await passwordResetRepository.replaceForUser({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
    });

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        link: `${env.CORS_ORIGIN}/restablecer?token=${token}`,
        minutesValid: RESET_TOKEN_MINUTES,
      });
    } catch (error) {
      // Si el correo falla, lo registramos pero NO se lo decimos al visitante (misma respuesta).
      console.error('No se pudo enviar el correo de recuperación', error);
    }
  },

  /** Recuperación de contraseña, paso 2: el enlace recibido + la contraseña nueva. */
  async resetPassword({ token, password }: ResetPasswordInput): Promise<void> {
    const invalid = new AppError(400, 'El enlace no es válido o ya expiró. Solicita uno nuevo');

    const record = await passwordResetRepository.findByHash(sha256(token));
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw invalid;

    const passwordHash = await hashPassword(password);
    const done = await passwordResetRepository.consume({
      tokenId: record.id,
      userId: record.userId,
      passwordHash,
    });
    if (!done) throw invalid;
  },
};
