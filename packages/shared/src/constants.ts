// ---------- Valores permitidos (RN-07) ----------
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const THEMES = ['LIGHT', 'DARK'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type Theme = (typeof THEMES)[number];

// ---------- Etiquetas en español para mostrar en la interfaz ----------
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  IN_REVIEW: 'En revisión',
  DONE: 'Completada',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

// ---------- Límites (RN-02) ----------
export const TITLE_MAX_LENGTH = 100;
