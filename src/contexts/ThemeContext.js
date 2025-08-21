'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme state - always follow system preference
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Clean up any old localStorage theme settings
    localStorage.removeItem('theme');
    localStorage.removeItem('themeMode');

    // Always follow system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const systemPrefersDark = mediaQuery.matches;
    
    setIsDarkMode(systemPrefersDark);
    applyTheme(systemPrefersDark);
    setIsInitialized(true);
    
    (`🎨 Theme automatically set to: ${systemPrefersDark ? 'dark' : 'light'} mode (following system)`);

    // Listen for system theme changes
    const handleSystemThemeChange = (e) => {
      setIsDarkMode(e.matches);
      applyTheme(e.matches);
      (`🎨 System theme changed: ${e.matches ? 'dark' : 'light'} mode`);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Cleanup listener
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const value = {
    isDarkMode,
    isInitialized,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
