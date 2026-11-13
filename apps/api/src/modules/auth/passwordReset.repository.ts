import { prisma } from '../../lib/prisma.js';

export const passwordResetRepository = {
  /** Reemplaza cualquier enlace anterior sin usar: solo el más reciente sirve. */
  async replaceForUser(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: data.userId, usedAt: null } }),
      prisma.passwordResetToken.create({ data }),
    ]);
  },

  findByHash: (tokenHash: string) => prisma.passwordResetToken.findUnique({ where: { tokenHash } }),

  /**
   * Usa el enlace y cambia la contraseña en UNA sola transacción.
   * El updateMany con "usedAt: null" evita que dos peticiones simultáneas usen el mismo enlace.
   * Devuelve false si el enlace ya no era utilizable.
   */
  async consume(params: {
    tokenId: string;
    userId: string;
    passwordHash: string;
  }): Promise<boolean> {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const marked = await tx.passwordResetToken.updateMany({
        where: { id: params.tokenId, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (marked.count === 0) return false;

      await tx.user.update({
        where: { id: params.userId },
        data: { passwordHash: params.passwordHash },
      });
      // Cualquier otro enlace pendiente de esa cuenta deja de servir.
      await tx.passwordResetToken.deleteMany({ where: { userId: params.userId, usedAt: null } });
      return true;
    });
  },
};
