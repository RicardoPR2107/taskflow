/** Pruebas UNITARIAS de las reglas de tareas: fechas, vencimiento y finalización (RN-01 a RN-10). */
import { describe, expect, it } from 'vitest';
import {
  completionRate,
  createTaskSchema,
  isOverdue,
  isValidDateString,
  lastDays,
  listTasksQuerySchema,
  nextCompletedAt,
  todayInZone,
  updateTaskSchema,
} from '../src/index';

describe('TC-TSK: fechas (RN-10)', () => {
  it('TC-TSK-01 valida el formato y rechaza fechas que no existen', () => {
    expect(isValidDateString('2026-03-09')).toBe(true);
    expect(isValidDateString('2028-02-29')).toBe(true); // año bisiesto
    for (const bad of ['2026-02-30', '2027-02-29', '2026-13-01', '09/03/2026', '', 'hoy']) {
      expect(isValidDateString(bad)).toBe(false);
    }
  });

  it('TC-TSK-02 "hoy" depende de la zona horaria: a las 03:00 UTC en Lima todavía es el día anterior', () => {
    const now = new Date('2026-03-10T03:00:00.000Z');
    expect(todayInZone('America/Lima', now)).toBe('2026-03-09'); // UTC-5
    expect(todayInZone('UTC', now)).toBe('2026-03-10');
    expect(todayInZone('Asia/Tokyo', now)).toBe('2026-03-10'); // UTC+9
  });
});

describe('TC-TSK: vencimiento (RN-06)', () => {
  const today = '2026-03-09';

  it('TC-TSK-03 vencida = fecha pasada y sin completar', () => {
    expect(isOverdue('2026-03-08', 'PENDING', today)).toBe(true);
    expect(isOverdue('2026-03-08', 'IN_PROGRESS', today)).toBe(true);
    expect(isOverdue('2026-03-08', 'IN_REVIEW', today)).toBe(true);
  });

  it('TC-TSK-04 vence hoy no es vencida hasta que termine el día', () => {
    expect(isOverdue('2026-03-09', 'PENDING', today)).toBe(false);
    expect(isOverdue('2026-03-09', 'PENDING', '2026-03-10')).toBe(true);
  });

  it('TC-TSK-05 una tarea completada o sin fecha nunca está vencida', () => {
    expect(isOverdue('2020-01-01', 'DONE', today)).toBe(false);
    expect(isOverdue(null, 'PENDING', today)).toBe(false);
  });
});

describe('TC-TSK: fecha de finalización (RN-04, RN-05)', () => {
  const now = new Date('2026-03-09T12:00:00.000Z');
  const before = new Date('2026-03-01T12:00:00.000Z');

  it('TC-TSK-06 al pasar a Completada se registra la fecha actual', () => {
    expect(nextCompletedAt('PENDING', 'DONE', null, now)).toEqual(now);
    expect(nextCompletedAt(null, 'DONE', null, now)).toEqual(now);
  });

  it('TC-TSK-07 si ya estaba Completada se conserva la fecha original', () => {
    expect(nextCompletedAt('DONE', 'DONE', before, now)).toEqual(before);
  });

  it('TC-TSK-08 al salir de Completada se borra', () => {
    expect(nextCompletedAt('DONE', 'PENDING', before, now)).toBeNull();
    expect(nextCompletedAt('PENDING', 'IN_PROGRESS', null, now)).toBeNull();
  });
});

describe('TC-TSK: esquemas (RN-01, RN-02, RN-07)', () => {
  it('TC-TSK-09 crear aplica valores por defecto y normaliza el texto', () => {
    expect(createTaskSchema.parse({ title: '  Estudiar ', description: '  ' })).toEqual({
      title: 'Estudiar',
      description: null,
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: undefined,
    });
  });

  it('TC-TSK-10 rechaza título vacío, título largo y prioridad inventada', () => {
    expect(createTaskSchema.safeParse({ title: ' ' }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: 'a'.repeat(101) }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: 'x', priority: 'MEGA' }).success).toBe(false);
  });

  it('TC-TSK-11 modificar exige al menos un campo y no inventa valores por defecto', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
    expect(updateTaskSchema.parse({ status: 'DONE' })).toEqual({ status: 'DONE' });
  });

  it('TC-TSK-12 la paginación tiene valores por defecto y un máximo', () => {
    expect(listTasksQuerySchema.parse({})).toEqual({ page: 1, pageSize: 50, sort: 'newest' });
    expect(listTasksQuerySchema.parse({ page: '2', pageSize: '10' })).toMatchObject({
      page: 2,
      pageSize: 10,
    });
    expect(listTasksQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });
});

describe('TC-TSK: filtros de la lista', () => {
  it('TC-TSK-13 acepta filtros válidos y los normaliza', () => {
    expect(
      listTasksQuerySchema.parse({
        q: '  informe ',
        status: 'DONE',
        priority: 'HIGH',
        overdue: 'true',
        dueFrom: '2026-03-01',
        dueTo: '2026-03-31',
        sort: 'due_asc',
      }),
    ).toMatchObject({
      q: 'informe',
      status: 'DONE',
      priority: 'HIGH',
      overdue: true,
      dueFrom: '2026-03-01',
      dueTo: '2026-03-31',
      sort: 'due_asc',
    });
  });

  it('TC-TSK-14 rechaza estado, prioridad, orden o fechas inválidas', () => {
    for (const bad of [
      { status: 'NADA' },
      { priority: 'MEGA' },
      { sort: 'al_azar' },
      { dueFrom: '2026-02-30' },
      { overdue: 'quizas' },
    ]) {
      expect(listTasksQuerySchema.safeParse(bad).success).toBe(false);
    }
  });

  it('TC-TSK-15 rechaza un rango de fechas al revés', () => {
    const result = listTasksQuerySchema.safeParse({ dueFrom: '2026-03-10', dueTo: '2026-03-01' });
    expect(result.success).toBe(false);
  });
});

describe('TC-TSK: indicadores del dashboard (RN-09)', () => {
  it('TC-TSK-16 la tasa de finalización se redondea y, sin tareas, es 0 (sin dividir entre cero)', () => {
    expect(completionRate(0, 0)).toBe(0);
    expect(completionRate(1, 3)).toBe(33);
    expect(completionRate(2, 3)).toBe(67);
    expect(completionRate(5, 5)).toBe(100);
    expect(completionRate(0, 4)).toBe(0);
  });

  it('TC-TSK-17 lastDays devuelve los días consecutivos terminando hoy, también al cruzar meses y años', () => {
    expect(lastDays('2026-03-09', 3)).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
    expect(lastDays('2026-03-02', 4)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(lastDays('2027-01-01', 2)).toEqual(['2026-12-31', '2027-01-01']);
    expect(lastDays('2026-03-09', 14)).toHaveLength(14);
  });
});
