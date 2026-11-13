import { Router } from 'express';
import { createTaskSchema, updateTaskSchema } from '@taskflow/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody } from '../../middlewares/validate.js';
import { createTask, deleteTask, getTask, listTasks, updateTask } from './tasks.controller.js';

export const tasksRouter = Router();

tasksRouter.use(authenticate); // todas las rutas de tareas exigen sesión

tasksRouter.get('/', listTasks);
tasksRouter.post('/', validateBody(createTaskSchema), createTask);
tasksRouter.get('/:id', getTask);
tasksRouter.patch('/:id', validateBody(updateTaskSchema), updateTask);
tasksRouter.delete('/:id', deleteTask);
