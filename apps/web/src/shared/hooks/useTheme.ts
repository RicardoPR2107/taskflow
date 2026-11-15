import { useCallback, useState } from 'react';
import { applyTheme, readTheme, saveTheme, type Theme } from '../lib/theme';

/** Tema actual (claro u oscuro) y una función para alternarlo. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
