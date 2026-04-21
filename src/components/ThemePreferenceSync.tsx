'use client';

import { useEffect } from 'react';

const THEME_STORAGE_KEY = 'uniact-theme-preference';
type ThemePreference = 'light' | 'dark' | 'system';

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') {
    return preference;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredPreference(): ThemePreference {
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(preference);

  root.setAttribute('data-theme', resolvedTheme);
  root.setAttribute('data-theme-preference', preference);
  root.style.colorScheme = resolvedTheme;
}

export default function ThemePreferenceSync() {
  useEffect(() => {
    applyTheme(getStoredPreference());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const preference = getStoredPreference();
      if (preference === 'system') {
        applyTheme(preference);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        applyTheme(getStoredPreference());
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return null;
}
