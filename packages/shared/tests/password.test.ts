/**
 * Pruebas UNITARIAS de la política de contraseñas (RN-11).
 * Verifican la lógica pura, sin base de datos, navegador ni red.
 */
import { describe, expect, it } from 'vitest';
import {
  DEMO_USER,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  passwordSchema,
} from '../src/index';

const firstMessage = (password: string) => {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0]?.message;
};

describe('TC-PWD: política de contraseñas (RN-11)', () => {
  it('TC-PWD-01 acepta una contraseña que cumple todas las reglas', () => {
    expect(passwordSchema.safeParse('Valida-Clave#2026').success).toBe(true);
  });

  it.each([
    ['TC-PWD-02', 'Corta1!a', `al menos ${PASSWORD_MIN_LENGTH} caracteres`],
    ['TC-PWD-03', 'SINMINUSCULA1!AAAA', 'una letra minúscula'],
    ['TC-PWD-04', 'sinmayuscula1!aaaa', 'una letra mayúscula'],
    ['TC-PWD-05', 'SinNumeroAqui!!!!', 'un número'],
    ['TC-PWD-06', 'SinEspecial12345Aa', 'un carácter especial'],
  ])('%s rechaza una contraseña a la que le falta: %s', (_id, password, expectedText) => {
    expect(firstMessage(password)).toContain(expectedText);
  });

  it('TC-PWD-07 el espacio NO cuenta como carácter especial', () => {
    expect(firstMessage('Con espacio 1 Aa b')).toContain('carácter especial');
  });

  it('TC-PWD-08 acepta letras y números de otros idiomas (ñ, á, ü)', () => {
    expect(passwordSchema.safeParse('Contraseña-ÁÜ-2026').success).toBe(true);
  });

  it(`TC-PWD-09 rechaza contraseñas de más de ${PASSWORD_MAX_LENGTH} caracteres`, () => {
    expect(firstMessage('Aa1!'.repeat(40))).toContain(`${PASSWORD_MAX_LENGTH}`);
  });

  it('TC-PWD-10 rechaza un valor que no es texto', () => {
    expect(passwordSchema.safeParse(undefined).success).toBe(false);
    expect(passwordSchema.safeParse(12345678901).success).toBe(false);
  });

  it('TC-PWD-11 informa todas las reglas incumplidas, no solo la primera', () => {
    const result = passwordSchema.safeParse('abc');
    expect(result.success ? 0 : result.error.issues.length).toBe(4); // largo, mayúscula, número, especial
  });

  it('TC-PWD-12 la lista de reglas tiene un identificador único por regla', () => {
    const ids = PASSWORD_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('TC-PWD-13 la contraseña de la cuenta de prueba cumple la política', () => {
    expect(passwordSchema.safeParse(DEMO_USER.password).success).toBe(true);
  });
});
