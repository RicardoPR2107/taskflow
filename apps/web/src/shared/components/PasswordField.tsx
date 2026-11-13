import { useState, type ComponentProps } from 'react';
import { TextField } from './TextField';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'adornment'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      adornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="rounded-lg bg-cream px-2.5 py-1.5 text-xs font-bold transition-colors hover:bg-orange"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  );
}
