import type { PublicUser } from '@taskflow/shared';
import type { User } from '../../generated/prisma/client.js';

/** Solo estos campos salen hacia el cliente. Nunca passwordHash. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    theme: user.theme,
  };
}
