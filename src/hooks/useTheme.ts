import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chicken_stall_theme') as Theme;
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark'; // Always default to dark mode!
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light');
      body.classList.remove('dark');
    }
    localStorage.setItem('chicken_stall_theme', theme);

    // Update meta theme-color for browser chrome
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0b1120' : '#ffffff');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, setTheme: setThemeState };
}
