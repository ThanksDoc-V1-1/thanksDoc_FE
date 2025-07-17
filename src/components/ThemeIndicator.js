'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeIndicator() {
  const { isDarkMode, isInitialized } = useTheme();

  if (!isInitialized) {
    return null;
  }

  return (
    <div className={`
      inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs
      ${isDarkMode 
        ? 'bg-gray-700 text-gray-300 border border-gray-600' 
        : 'bg-gray-100 text-gray-600 border border-gray-300'
      }
    `}>
      <Monitor className="w-3 h-3" />
      <span>Auto</span>
      {isDarkMode ? (
        <Moon className="w-3 h-3" />
      ) : (
        <Sun className="w-3 h-3" />
      )}
    </div>
  );
}
