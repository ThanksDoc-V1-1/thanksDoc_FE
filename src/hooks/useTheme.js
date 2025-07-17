'use client';

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

/**
 * Custom hook to access theme state
 * Note: Theme now automatically follows system preference
 */
export const useTheme = () => {
  const { isDarkMode, isInitialized } = useThemeContext();
  
  return {
    isDarkMode, // Automatically follows system preference
    isInitialized, // Whether theme has been initialized
    // Provide helper functions for theme-aware styles
    getBgColor: (dark, light) => isDarkMode ? dark : light,
    getTextColor: (dark, light) => isDarkMode ? dark : light,
  };
};

export default useTheme;
