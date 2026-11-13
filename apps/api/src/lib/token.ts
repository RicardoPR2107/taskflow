import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 días

/** Crea un token firmado que contiene solo el id del usuario. */
export function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);
}

/** Devuelve el id del usuario si el token es válido; lanza un error si no lo es. */
export async function verifySessionToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (!payload.sub) throw new Error('Token sin usuario');
  return payload.sub;
}
