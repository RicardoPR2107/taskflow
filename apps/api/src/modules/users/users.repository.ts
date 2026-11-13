import { prisma } from '../../lib/prisma.js';

// El repository es la ÚNICA capa que habla con la base de datos.
export const usersRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  create: (data: { name: string; email: string; passwordHash: string }) =>
    prisma.user.create({ data }),
};
