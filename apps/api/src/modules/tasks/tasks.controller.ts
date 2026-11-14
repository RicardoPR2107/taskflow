import type { Request, Response } from 'express';
import { z } from 'zod';
import { listTasksQuerySchema } from '@taskflow/shared';
import { AppError } from '../../middlewares/errorHandler.js';
import { tasksService } from './tasks.service.js';

/** Un id mal formado no puede existir: respondemos 404, igual que con una tarea ajena. */
function taskId(req: Request): string {
  const parsed = z.uuid().safeParse(req.params.id);
  if (!parsed.success) throw new AppError(404, 'Tarea no encontrada');
  return parsed.data;
}

// El id del usuario SIEMPRE sale de la sesión (req.userId), nunca del cuerpo ni de la URL.
export async function listTasks(req: Request, res: Response) {
  const query = listTasksQuerySchema.parse(req.query);
  res.json(await tasksService.list(req.userId!, query));
}

export async function getTask(req: Request, res: Response) {
  res.json({ task: await tasksService.get(req.userId!, taskId(req)) });
}

export async function createTask(req: Request, res: Response) {
  res.status(201).json({ task: await tasksService.create(req.userId!, req.body) });
}

export async function updateTask(req: Request, res: Response) {
  res.json({ task: await tasksService.update(req.userId!, taskId(req), req.body) });
}

export async function deleteTask(req: Request, res: Response) {
  await tasksService.remove(req.userId!, taskId(req));
  res.status(204).end();
}
