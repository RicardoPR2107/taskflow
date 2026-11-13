/** Error devuelto por la API (o por la falta de conexión, con status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** Cliente HTTP mínimo. Todas las llamadas pasan por aquí para tratar los errores en un solo lugar. */
export async function request<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin', // envía la cookie de sesión
    });
  } catch {
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as { error?: { message?: string; details?: unknown } } | null)?.error;
    const details = error?.details;
    throw new ApiError(
      response.status,
      error?.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      details && typeof details === 'object' ? (details as Record<string, string[]>) : undefined,
    );
  }

  return data as T;
}
