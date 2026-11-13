/** Pruebas UNITARIAS de los esquemas de validación compartidos (RF-01, RF-02, RF-33, RN-01 a RN-07). */
import { describe, expect, it } from 'vitest';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordFormSchema,
  resetPasswordSchema,
} from '../src/index';

const validRegistration = { name: 'Ana', email: 'ana@mail.com', password: 'Clave-Segura#1' };

describe('TC-REG: esquema de registro', () => {
  it('TC-REG-01 normaliza el correo (recorta espacios y pasa a minúsculas)', () => {
    const result = registerSchema.parse({ ...validRegistration, email: '  ANA@Mail.COM ' });
    expect(result.email).toBe('ana@mail.com');
  });

  it('TC-REG-02 recorta los espacios del nombre', () => {
    expect(registerSchema.parse({ ...validRegistration, name: '  Ana  ' }).name).toBe('Ana');
  });

  it('TC-REG-03 rechaza un nombre vacío o de solo espacios', () => {
    expect(registerSchema.safeParse({ ...validRegistration, name: '   ' }).success).toBe(false);
  });

  it('TC-REG-04 rechaza un nombre de más de 60 caracteres', () => {
    expect(registerSchema.safeParse({ ...validRegistration, name: 'a'.repeat(61) }).success).toBe(
      false,
    );
  });

  it.each(['abc', 'sin-arroba.com', 'a@', '@b.com', ''])(
    'TC-REG-05 rechaza el correo inválido %j',
    (email) => {
      expect(registerSchema.safeParse({ ...validRegistration, email }).success).toBe(false);
    },
  );

  it('TC-REG-06 rechaza campos faltantes con mensajes en español', () => {
    const result = registerSchema.safeParse({});
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'El nombre es obligatorio',
        'El correo es obligatorio',
        'La contraseña es obligatoria',
      ]),
    );
  });
});

describe('TC-LOG: esquema de inicio de sesión', () => {
  it('TC-LOG-01 NO exige la política de contraseñas (así nadie queda fuera)', () => {
    expect(loginSchema.safeParse({ email: 'ana@mail.com', password: 'clave-vieja' }).success).toBe(
      true,
    );
  });

  it('TC-LOG-02 exige que la contraseña no esté vacía', () => {
    expect(loginSchema.safeParse({ email: 'ana@mail.com', password: '' }).success).toBe(false);
  });
});

describe('TC-RST: esquemas de recuperación de contraseña', () => {
  it('TC-RST-01 la solicitud normaliza el correo', () => {
    expect(forgotPasswordSchema.parse({ email: ' ANA@mail.com ' }).email).toBe('ana@mail.com');
  });

  it('TC-RST-02 restablecer exige un token con forma válida', () => {
    expect(
      resetPasswordSchema.safeParse({ token: 'corto', password: 'Nueva-Clave#22' }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: 'a'.repeat(43), password: 'Nueva-Clave#22' }).success,
    ).toBe(true);
  });

  it('TC-RST-03 restablecer exige que la contraseña nueva cumpla la política', () => {
    expect(
      resetPasswordSchema.safeParse({ token: 'a'.repeat(43), password: 'debil' }).success,
    ).toBe(false);
  });

  it('TC-RST-04 el formulario detecta contraseñas que no coinciden', () => {
    const result = resetPasswordFormSchema.safeParse({
      password: 'Nueva-Clave#22',
      confirmPassword: 'Otra-Clave#33',
    });
    expect(result.success ? null : result.error.issues[0]?.message).toBe(
      'Las contraseñas no coinciden',
    );
  });

  it('TC-RST-05 el formulario acepta contraseñas iguales y válidas', () => {
    expect(
      resetPasswordFormSchema.safeParse({
        password: 'Nueva-Clave#22',
        confirmPassword: 'Nueva-Clave#22',
      }).success,
    ).toBe(true);
  });
});

describe('TC-ENUM: estados y prioridades (RN-07)', () => {
  it('TC-ENUM-01 hay 4 estados y 4 prioridades', () => {
    expect(TASK_STATUSES).toHaveLength(4);
    expect(TASK_PRIORITIES).toHaveLength(4);
  });

  it('TC-ENUM-02 cada estado y cada prioridad tiene su etiqueta en español', () => {
    for (const status of TASK_STATUSES) expect(TASK_STATUS_LABELS[status]).toBeTruthy();
    for (const priority of TASK_PRIORITIES) expect(TASK_PRIORITY_LABELS[priority]).toBeTruthy();
  });
});
