import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = 'dark';
});

if (typeof window !== 'undefined' && !('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (typeof document !== 'undefined' && !document.querySelector('meta[name="theme-color"]')) {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '#1B1740';
  document.head.appendChild(meta);
}
