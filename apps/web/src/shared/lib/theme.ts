export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'taskflow-theme';

// Color de la barra del navegador en el móvil. Debe coincidir con --color-cream de cada tema.
const BROWSER_BAR_COLOR: Record<Theme, string> = { light: '#F3EEE3', dark: '#151311' };

/** Tema que está aplicado ahora mismo (lo puso public/theme-init.js al cargar la página). */
export function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Aplica el tema: el CSS cambia solo porque depende del atributo data-theme de <html>. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BROWSER_BAR_COLOR[theme]);
}

/** Recuerda la elección para la próxima visita. Si el navegador no deja guardar, no pasa nada. */
export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* modo privado o almacenamiento bloqueado */
  }
}
