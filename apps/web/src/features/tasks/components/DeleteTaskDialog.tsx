import { useState } from 'react';
import type { TaskDto } from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { useToast } from '../../../shared/components/Toast';
import { ApiError } from '../../../shared/lib/api';
import { useDeleteTask } from '../hooks';

/** Confirmación antes de eliminar (RF-31). El foco empieza en "Cancelar" para evitar borrados por error. */
export function DeleteTaskDialog({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const deleteTask = useDeleteTask();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      await deleteTask.mutateAsync(task.id);
      toast.show('Tarea eliminada');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la tarea.');
    }
  }

  return (
    <Modal titleId="delete-task-title" onClose={onClose} dismissible={!deleteTask.isPending}>
      <h2 id="delete-task-title" className="text-2xl font-extrabold">
        ¿Eliminar esta tarea?
      </h2>
      <p className="mt-3 text-ink/80">
        Se eliminará <strong className="break-words">“{task.title}”</strong> y no se puede deshacer.
      </p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={deleteTask.isPending}
          data-autofocus
        >
          Cancelar
        </Button>
        <Button onClick={confirm} loading={deleteTask.isPending}>
          Sí, eliminar
        </Button>
      </div>
    </Modal>
  );
}
