import type { DashboardDto } from '@taskflow/shared';
import { request } from '../../shared/lib/api';

export const dashboardApi = {
  get: () => request<{ dashboard: DashboardDto }>('/dashboard'),
};
