import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { getMe } from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/me', authenticate, getMe);
