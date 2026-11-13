import { z } from 'zod';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TITLE_MAX_LENGTH,
  type TaskPriority,
  type TaskStatus,
} from './constants';

// Reglas de las tareas, definidas UNA sola vez y usadas por el backend y el frontend.

export const DESCRIPTION_MAX_LENGTH = 1000;
export const MAX_PAGE_SIZE = 100;

// ---------- Fechas (RN-06, RN-10) ----------

/** ¿Es una fecha real con formato AAAA-MM-DD? ("2026-02-30" no lo es). */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** La fecha de hoy (AAAA-MM-DD) en la zona horaria indicada. Es el "hoy" del usuario, no el del servidor. */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * RN-06: una tarea está vencida si su fecha límite ya pasó y no está completada.
 * Una tarea que vence hoy NO está vencida hasta que termine el día del usuario.
 */
export function isOverdue(dueDate: string | null, status: TaskStatus, today: string): boolean {
  return dueDate !== null && status !== 'DONE' && dueDate < today;
}

// ---------- Fecha de finalización (RN-04, RN-05) ----------

/**
 * Decide qué fecha de finalización le corresponde a una tarea tras un cambio de estado:
 *  - pasa a Completada            -> ahora (o se conserva la que ya tenía)
 *  - vuelve a un estado distinto  -> se borra
 */
export function nextCompletedAt(
  previousStatus: TaskStatus | null,
  nextStatus: TaskStatus,
  previousCompletedAt: Date | null,
  now: Date = new Date(),
): Date | null {
  if (nextStatus !== 'DONE') return null;
  if (previousStatus === 'DONE' && previousCompletedAt) return previousCompletedAt;
  return now;
}

// ---------- Validación (RN-01, RN-02, RN-07) ----------

export const taskTitleSchema = z
  .string({ error: 'Escribe un título' })
  .trim()
  .min(1, 'Escribe un título')
  .max(TITLE_MAX_LENGTH, `El título no puede superar ${TITLE_MAX_LENGTH} caracteres`);

/** Descripción opcional: un texto vacío se guarda como "sin descripción" (null). */
export const taskDescriptionSchema = z
  .string()
  .trim()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres`,
  )
  .nullish()
  .transform((value) => value || null);

export const taskStatusSchema = z.enum(TASK_STATUSES, { error: 'Estado no permitido' });
export const taskPrioritySchema = z.enum(TASK_PRIORITIES, { error: 'Prioridad no permitida' });

export const dueDateSchema = z
  .string()
  .refine(isValidDateString, 'Usa una fecha válida (AAAA-MM-DD)')
  .nullish();

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  status: taskStatusSchema.default('PENDING'),
  priority: taskPrioritySchema.default('MEDIUM'),
  dueDate: dueDateSchema,
});

/** Edición parcial: solo se cambia lo que se envía. Debe venir al menos un campo. */
export const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema.optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: dueDateSchema,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'Envía al menos un campo para modificar',
  });

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

// ---------- Tarea tal como la ve el cliente ----------

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // AAAA-MM-DD
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean; // calculado en el servidor con la zona horaria del usuario
}

export interface TaskListResponse {
  tasks: TaskDto[];
  total: number;
  page: number;
  pageSize: number;
}
