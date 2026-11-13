import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// En equipos más lentos, la primera pantalla (carga perezosa) tarda más de 1 s en aparecer.
configure({ asyncUtilTimeout: 10000 });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
