import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicUser } from '@taskflow/shared';
import { ApiError } from '../../shared/lib/api';
import { authApi } from './api';

export const ME_KEY = ['me'] as const;

/**
 * Usuario con sesión iniciada. Devuelve `null` si no hay sesión (401),
 * y solo falla de verdad ante errores reales (por ejemplo, sin conexión).
 */
export function useCurrentUser() {
  return useQuery<PublicUser | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await authApi.me()).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user }) => queryClient.setQueryData(ME_KEY, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user }) => queryClient.setQueryData(ME_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // 1) Marcamos "sin sesión": las rutas protegidas reaccionan y redirigen a /login.
      queryClient.setQueryData(ME_KEY, null);
      // 2) Borramos los demás datos de la sesión anterior (tareas, estadísticas...).
      //    No usamos queryClient.clear(): eliminaría también la consulta del usuario y
      //    las pantallas que la observan no se enterarían del cambio.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_KEY[0] });
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}
