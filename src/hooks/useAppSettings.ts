import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AppLanguage = 'en' | 'hi' | 'kn';
export type PreviewScreenState = 'live' | 'loading' | 'empty' | 'error' | 'offline';

interface StoredSettings {
  theme: ThemeMode;
  dataSaver: boolean;
  language: AppLanguage;
}

const SETTINGS_KEY = 'lifedrop_settings_v1';

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSettings>;
      return {
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        dataSaver: Boolean(parsed.dataSaver),
        language:
          parsed.language === 'hi' || parsed.language === 'kn' ? parsed.language : 'en',
      };
    }
  } catch {
    // Fallback
  }
  return { theme: 'dark', dataSaver: false, language: 'en' };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<StoredSettings>(loadSettings);
  const [previewState, setPreviewState] = useState<PreviewScreenState>('live');

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }

    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (settings.dataSaver) {
      root.classList.add('data-saver');
    } else {
      root.classList.remove('data-saver');
    }
  }, [settings]);

  const setTheme = (theme: ThemeMode) =>
    setSettings((prev) => ({ ...prev, theme }));

  const toggleTheme = () =>
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));

  const setDataSaver = (dataSaver: boolean) =>
    setSettings((prev) => ({ ...prev, dataSaver }));

  const setLanguage = (language: AppLanguage) =>
    setSettings((prev) => ({ ...prev, language }));

  return {
    theme: settings.theme,
    dataSaver: settings.dataSaver,
    language: settings.language,
    previewState,
    setTheme,
    toggleTheme,
    setDataSaver,
    setLanguage,
    setPreviewState,
  };
}
