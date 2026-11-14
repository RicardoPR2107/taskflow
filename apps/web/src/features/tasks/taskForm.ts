import { z } from 'zod';
import {
  DESCRIPTION_MAX_LENGTH,
  isValidDateString,
  taskPrioritySchema,
  taskStatusSchema,
  taskTitleSchema,
  type TaskDto,
} from '@taskflow/shared';

/** Esquema del formulario: los campos son texto (la fecha vacía significa "sin fecha"). */
export const taskFormSchema = z.object({
  title: taskTitleSchema,
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres`,
    ),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: z
    .string()
    .refine((value) => value === '' || isValidDateString(value), 'Usa una fecha válida'),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: '',
  description: '',
  status: 'PENDING',
  priority: 'MEDIUM',
  dueDate: '',
};

export const taskToFormValues = (task: TaskDto): TaskFormValues => ({
  title: task.title,
  description: task.description ?? '',
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate ?? '',
});

/** De lo que se escribió en el formulario a lo que espera la API. */
export const formValuesToInput = (values: TaskFormValues) => ({
  ...values,
  description: values.description || null,
  dueDate: values.dueDate || null,
});

/** "2026-03-09" -> "09/03/2026" (sin pasar por Date, para que la zona horaria no mueva el día). */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
