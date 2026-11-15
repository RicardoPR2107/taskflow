/** Pruebas del TEMA claro/oscuro: el botón alterna, aplica el tema y lo recuerda. */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../src/shared/components/ThemeToggle';
import { THEME_STORAGE_KEY } from '../src/shared/lib/theme';

describe('TC-WEB-THM: tema claro y oscuro', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.clear();
  });
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.clear();
  });

  it('TC-WEB-THM-01 por defecto es claro y el botón ofrece cambiar a oscuro', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Cambiar a tema oscuro' })).toBeInTheDocument();
  });

  it('TC-WEB-THM-02 al pulsar cambia a oscuro, lo aplica a la página y lo recuerda', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a tema oscuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Cambiar a tema claro' })).toBeInTheDocument();
  });

  it('TC-WEB-THM-03 si la página ya cargó en oscuro, el botón ofrece volver a claro', () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a tema claro' }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
