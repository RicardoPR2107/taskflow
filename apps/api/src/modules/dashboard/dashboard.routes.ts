import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', authenticate, async (req, res) => {
  res.json({ dashboard: await dashboardService.get(req.userId!) });
});
