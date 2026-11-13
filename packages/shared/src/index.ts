import { z } from 'zod';

export * from './constants';
import { type Theme } from './constants';

// ---------- Política de contraseñas (RN-11) ----------
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRule {
  id: 'length' | 'lowercase' | 'uppercase' | 'number' | 'special';
  label: string; // texto que ve el usuario
  message: string; // mensaje de error cuando no se cumple
  test: (password: string) => boolean;
}

// Una sola lista de reglas: la validan el backend y el frontend, y el frontend además
// la muestra como lista de requisitos que se marcan en vivo mientras se escribe.
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'lowercase',
    label: 'Una letra minúscula',
    message: 'La contraseña debe incluir al menos una letra minúscula',
    test: (p) => /\p{Ll}/u.test(p),
  },
  {
    id: 'uppercase',
    label: 'Una letra mayúscula',
    message: 'La contraseña debe incluir al menos una letra mayúscula',
    test: (p) => /\p{Lu}/u.test(p),
  },
  {
    id: 'number',
    label: 'Un número',
    message: 'La contraseña debe incluir al menos un número',
    test: (p) => /\p{Nd}/u.test(p),
  },
  {
    id: 'special',
    label: 'Un carácter especial (por ejemplo ! # $ % & * -)',
    message: 'La contraseña debe incluir al menos un carácter especial (por ejemplo ! # $ % & * -)',
    // Especial = ni letra, ni número, ni espacio
    test: (p) => /[^\p{L}\p{N}\s]/u.test(p),
  },
];

export const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria' })
  .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`)
  .check((ctx) => {
    // Se reporta una incidencia por cada regla incumplida; el formulario muestra la primera.
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(ctx.value)) {
        ctx.issues.push({ code: 'custom', message: rule.message, input: ctx.value });
      }
    }
  });

// ---------- Cuenta de prueba (RF-34) ----------
// Cumple la política de contraseñas. Es una cuenta de demostración, sin datos reales.
export const DEMO_USER = {
  name: 'Usuario Demo',
  email: 'demo@taskflow.dev',
  password: 'Demo-Task#2026',
} as const;

// ---------- Esquemas de autenticación (RF-01, RF-02, RF-33) ----------
// Zod 4: la opción `error` define el mensaje cuando el valor falta o no es del tipo esperado.
const emailSchema = z
  .string({ error: 'El correo es obligatorio' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Ingresa un correo válido'));

export const registerSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(60, 'El nombre no puede superar los 60 caracteres'),
  email: emailSchema,
  password: passwordSchema,
});

// El login NO exige la política: solo que escriba algo. Así nadie queda fuera por reglas nuevas.
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z
    .string({ error: 'El enlace no es válido' })
    .min(20, 'El enlace no es válido')
    .max(200, 'El enlace no es válido'),
  password: passwordSchema,
});

// Formulario de "nueva contraseña": la confirmación solo existe en la interfaz, no viaja a la API.
export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ error: 'Confirma tu contraseña' }).min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---------- Respuesta de salud de la API ----------
export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

// ---------- Usuario tal como lo ve el cliente (nunca incluye la contraseña) ----------
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  timezone: string;
  theme: Theme;
}

// ---------- Tareas ----------
export * from './tasks';
