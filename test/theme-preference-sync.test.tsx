import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

type MediaListener = (event: MediaQueryListEvent) => void;

function createMatchMedia(matches: boolean) {
  const listeners = new Set<MediaListener>();

  return vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_event: string, callback: MediaListener) => listeners.add(callback),
    removeEventListener: (_event: string, callback: MediaListener) => listeners.delete(callback),
    dispatch: (value: boolean) => {
      listeners.forEach((listener) =>
        listener({ matches: value, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent)
      );
    },
  }));
}

describe('ThemePreferenceSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
  });

  it('resolves system preference using current OS theme', async () => {
    vi.stubGlobal('matchMedia', createMatchMedia(true));
    localStorage.setItem('uniact-theme-preference', 'system');

    const ThemePreferenceSync = (await import('../src/components/ThemePreferenceSync')).default;
    render(<ThemePreferenceSync />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('system');
  });

  it('forces light theme when user preference is light', async () => {
    vi.stubGlobal('matchMedia', createMatchMedia(true));
    localStorage.setItem('uniact-theme-preference', 'light');

    const ThemePreferenceSync = (await import('../src/components/ThemePreferenceSync')).default;
    render(<ThemePreferenceSync />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('light');
  });
});
