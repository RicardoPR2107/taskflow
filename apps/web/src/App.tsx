import { useEffect, useState } from 'react';
import { TASK_STATUSES, type HealthResponse } from '@taskflow/shared';

type ApiState = 'cargando' | 'conectada' | 'error';

// Pantalla temporal de la Fase 1A: comprueba que frontend, backend y paquete compartido se hablan.
export function App() {
  const [state, setState] = useState<ApiState>('cargando');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? (res.json() as Promise<HealthResponse>) : Promise.reject()))
      .then(() => setState('conectada'))
      .catch(() => setState('error'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>TaskFlow</h1>
      <p>
        Estado de la API:{' '}
        <strong>
          {state === 'cargando' && 'comprobando...'}
          {state === 'conectada' && 'conectada ✅'}
          {state === 'error' && 'sin conexión ❌ (¿está corriendo el backend?)'}
        </strong>
      </p>
      <p>Estados de tarea (vienen del paquete compartido): {TASK_STATUSES.join(', ')}</p>
    </main>
  );
}
