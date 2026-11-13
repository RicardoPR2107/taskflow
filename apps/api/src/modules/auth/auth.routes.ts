import { Router } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@taskflow/shared';
import type { RateLimiters } from '../../middlewares/rateLimit.js';
import { validateBody } from '../../middlewares/validate.js';
import { forgotPassword, login, logout, register, resetPassword } from './auth.controller.js';

export function createAuthRouter(limiters: RateLimiters) {
  const router = Router();

  router.post('/register', limiters.register, validateBody(registerSchema), register);
  router.post('/login', limiters.login, validateBody(loginSchema), login);
  router.post('/logout', logout);
  router.post(
    '/forgot-password',
    limiters.forgotPassword,
    validateBody(forgotPasswordSchema),
    forgotPassword,
  );
  router.post(
    '/reset-password',
    limiters.resetPassword,
    validateBody(resetPasswordSchema),
    resetPassword,
  );

  return router;
}
