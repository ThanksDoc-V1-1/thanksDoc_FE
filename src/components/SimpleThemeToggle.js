'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function SimpleThemeToggle() {
  const { 
    isDarkMode, 
    themeMode, 
    setThemeToSystem, 
    setThemeToLight, 
    setThemeToDark, 
    isInitialized 
  } = useTheme();

  if (!isInitialized) {
    return null; // Don't render until theme is initialized to avoid hydration mismatch
  }

  const cycleTheme = () => {
    if (themeMode === 'system') {
      setThemeToLight();
    } else if (themeMode === 'light') {
      setThemeToDark();
    } else {
      setThemeToSystem();
    }
  };

  const getCurrentIcon = () => {
    if (themeMode === 'system') {
      return <Monitor className="w-5 h-5" />;
    }
    return isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />;
  };

  const getThemeLabel = () => {
    if (themeMode === 'system') {
      return `System (${isDarkMode ? 'Dark' : 'Light'})`;
    }
    return themeMode === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <button
      onClick={cycleTheme}
      className={`
        relative p-2 rounded-lg transition-all duration-200 
        ${isDarkMode 
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
          : 'bg-gray-200 hover:bg-gray-300 text-blue-600'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
      `}
      aria-label={`Current theme: ${getThemeLabel()}. Click to cycle themes`}
      title={`Current theme: ${getThemeLabel()}. Click to cycle themes`}
    >
      <div className="relative w-5 h-5">
        {getCurrentIcon()}
      </div>
    </button>
  );
}
