import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'dark';
type Size = 'md' | 'sm';

// Botones planos: sin bordes y sin sombras. El naranja es el color de acción y de resalte.
//  - primary:   naranja (acción principal)
//  - secondary: crema, sin borde; resalta en naranja al pasar el mouse
//  - dark:      negro tinta; resalta en naranja al pasar el mouse
// Texto en tinta sobre naranja: contraste 4.7:1 (el blanco sobre ese naranja no llega a 4.5:1).
const variants: Record<Variant, string> = {
  primary: 'bg-orange text-ink hover:brightness-95',
  secondary: 'bg-cream text-ink hover:bg-orange',
  dark: 'bg-ink text-cream hover:bg-orange hover:text-ink',
};
const sizes: Record<Size, string> = {
  md: 'px-5 py-3 text-base',
  sm: 'px-3.5 py-2 text-sm',
};

interface ButtonStyleOptions {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}

/** Clases de un botón. También sirve para que un enlace (<Link>) se vea como botón. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors duration-100',
    'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  );
}

type ButtonProps = ComponentProps<'button'> &
  ButtonStyleOptions & {
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
