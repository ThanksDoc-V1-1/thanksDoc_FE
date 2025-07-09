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
  // Always use dark mode by default
  const [isDarkMode, setIsDarkMode] = useState(true);
  // State to track current path (keep for future reference)
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // Apply dark mode to all pages
    const path = window.location.pathname;
    setCurrentPath(path);
    
    // Apply dark mode to all pages consistently
    document.documentElement.classList.add('dark');
    setIsDarkMode(true);
    console.log('🌙 Dark mode applied to all pages');
    
    // Force dark mode in local storage
    localStorage.setItem('theme', 'dark');
  }, []);

  // This function exists but will always maintain dark mode
  const toggleTheme = () => {
    console.log('🌙 Toggle attempted, but maintaining dark mode');
    // We keep dark mode no matter what
    setIsDarkMode(true);
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem('theme', 'dark');
  };

  const value = {
    isDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
