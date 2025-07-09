'use client';

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

/**
 * Custom hook to access and manage theme state
 * Note: In this application, dark mode is always enforced
 */
export const useTheme = () => {
  const { isDarkMode, toggleTheme } = useThemeContext();
  
  return {
    isDarkMode, // Will always be true
    toggleTheme, // Will maintain dark mode even if called
    // Provide helper functions for dark mode styles
    getBgColor: (dark, light) => dark, // Always return dark color
    getTextColor: (dark, light) => dark, // Always return dark color
  };
};

export default useTheme;
