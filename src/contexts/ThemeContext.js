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
  // State to track if dark mode is enabled
  const [isDarkMode, setIsDarkMode] = useState(false);
  // State to track current path
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // Only apply dark mode to the homepage
    const path = window.location.pathname;
    setCurrentPath(path);
    
    if (path === '/' || path === '') {
      // Apply dark mode only on the homepage
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
      console.log('🌙 Dark mode applied to homepage');
    } else {
      // Remove dark mode on other pages
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
      console.log('☀️ Light mode applied to non-homepage');
    }
    
    // Update localStorage to remember the current theme state
    localStorage.setItem('theme', path === '/' ? 'dark' : 'light');
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
