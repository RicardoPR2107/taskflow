import argon2 from 'argon2';

// Argon2id con los parámetros mínimos recomendados por OWASP:
// 19 MiB de memoria, 2 iteraciones y 1 hilo. Hacerlo costoso a propósito
// encarece los ataques de fuerza bruta si alguien robara la base de datos.
const options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, options);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// Hash "falso" que se calcula una sola vez. Cuando el correo no existe, verificamos
// contra este hash para que el login tarde lo mismo que con un correo válido.
// Así nadie puede descubrir qué correos están registrados midiendo tiempos.
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('contraseña-que-nadie-usa');
  return dummyHash;
}
