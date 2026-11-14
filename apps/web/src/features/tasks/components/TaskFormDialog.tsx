import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TITLE_MAX_LENGTH,
  type TaskDto,
} from '@taskflow/shared';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { SelectField } from '../../../shared/components/SelectField';
import { TextAreaField } from '../../../shared/components/TextAreaField';
import { TextField } from '../../../shared/components/TextField';
import { useToast } from '../../../shared/components/Toast';
import { handleSubmitError } from '../../auth/submitError';
import { useCreateTask, useUpdateTask } from '../hooks';
import {
  EMPTY_TASK_FORM,
  formValuesToInput,
  taskFormSchema,
  taskToFormValues,
  type TaskFormValues,
} from '../taskForm';

const statusOptions = TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));
const priorityOptions = TASK_PRIORITIES.map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

interface TaskFormDialogProps {
  task: TaskDto | null; // null = crear una tarea nueva
  onClose: () => void;
}

/** Ventana para crear o editar una tarea (RF de tareas, RN-01, RN-02, RN-07). */
export function TaskFormDialog({ task, onClose }: TaskFormDialogProps) {
  const isEditing = task !== null;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = createTask.isPending || updateTask.isPending;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: task ? taskToFormValues(task) : EMPTY_TASK_FORM,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const input = formValuesToInput(values);
    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, input });
        toast.show('Tarea actualizada');
      } else {
        await createTask.mutateAsync(input);
        toast.show('Tarea creada');
      }
      onClose();
    } catch (error) {
      handleSubmitError(error, setError, setFormError, [
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
      ]);
    }
  });

  return (
    <Modal titleId="task-form-title" onClose={onClose} dismissible={!saving}>
      <h2 id="task-form-title" className="text-2xl font-extrabold">
        {isEditing ? 'Editar tarea' : 'Nueva tarea'}
      </h2>

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Título"
          maxLength={TITLE_MAX_LENGTH + 20} // deja escribir de más para mostrar el aviso en español
          error={errors.title?.message}
          disabled={saving}
          {...register('title')}
        />
        <TextAreaField
          label="Descripción (opcional)"
          error={errors.description?.message}
          disabled={saving}
          {...register('description')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Estado"
            options={statusOptions}
            error={errors.status?.message}
            disabled={saving}
            {...register('status')}
          />
          <SelectField
            label="Prioridad"
            options={priorityOptions}
            error={errors.priority?.message}
            disabled={saving}
            {...register('priority')}
          />
        </div>

        <TextField
          label="Fecha límite (opcional)"
          type="date"
          error={errors.dueDate?.message}
          disabled={saving}
          {...register('dueDate')}
        />

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
