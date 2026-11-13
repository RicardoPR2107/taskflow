import type {
  ForgotPasswordInput,
  LoginInput,
  PublicUser,
  RegisterInput,
  ResetPasswordInput,
} from '@taskflow/shared';
import { request } from '../../shared/lib/api';

// Todas las llamadas HTTP del módulo de autenticación viven aquí.
export const authApi = {
  register: (input: RegisterInput) =>
    request<{ user: PublicUser }>('/auth/register', { method: 'POST', body: input }),
  login: (input: LoginInput) =>
    request<{ user: PublicUser }>('/auth/login', { method: 'POST', body: input }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  forgotPassword: (input: ForgotPasswordInput) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: input }),
  resetPassword: (input: ResetPasswordInput) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: input }),
  me: () => request<{ user: PublicUser }>('/users/me'),
};
