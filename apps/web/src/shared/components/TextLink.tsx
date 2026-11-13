import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/cn';

/** Enlace de texto: subrayado naranja, y se resalta con fondo naranja al pasar el mouse. */
export function TextLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        'rounded px-1 font-extrabold underline decoration-orange decoration-2 underline-offset-4 transition-colors',
        'hover:bg-orange hover:decoration-transparent',
        className,
      )}
      {...rest}
    />
  );
}
