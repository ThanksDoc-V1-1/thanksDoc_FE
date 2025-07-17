'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';

export default function ThemeToggle() {
  const { 
    isDarkMode, 
    themeMode, 
    toggleTheme, 
    setThemeToSystem, 
    setThemeToLight, 
    setThemeToDark, 
    isInitialized 
  } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!isInitialized) {
    return null; // Don't render until theme is initialized to avoid hydration mismatch
  }

  const getCurrentIcon = () => {
    if (themeMode === 'system') {
      return <Monitor className="w-5 h-5" />;
    }
    return isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />;
  };

  const handleOptionClick = (mode) => {
    switch (mode) {
      case 'system':
        setThemeToSystem();
        break;
      case 'light':
        setThemeToLight();
        break;
      case 'dark':
        setThemeToDark();
        break;
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      {/* Simple toggle button (click to cycle through modes) */}
      <button
        onClick={toggleTheme}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowDropdown(!showDropdown);
        }}
        className={`
          relative p-2 rounded-lg transition-all duration-200 
          ${isDarkMode 
            ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
            : 'bg-gray-200 hover:bg-gray-300 text-blue-600'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
        `}
        aria-label={`Current theme: ${themeMode}. Click to toggle, right-click for options`}
        title={`Current theme: ${themeMode}. Click to toggle, right-click for options`}
      >
        <div className="relative w-5 h-5">
          {getCurrentIcon()}
        </div>
      </button>

      {/* Dropdown menu for theme selection */}
      {showDropdown && (
        <div className={`
          absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50
          ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
        `}>
          <div className="py-1">
            <button
              onClick={() => handleOptionClick('system')}
              className={`
                w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors
                ${themeMode === 'system'
                  ? (isDarkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700')
                }
              `}
            >
              <Monitor className="w-4 h-4" />
              <span>System</span>
              {themeMode === 'system' && <span className="ml-auto text-xs">✓</span>}
            </button>
            
            <button
              onClick={() => handleOptionClick('light')}
              className={`
                w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors
                ${themeMode === 'light'
                  ? (isDarkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700')
                }
              `}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
              {themeMode === 'light' && <span className="ml-auto text-xs">✓</span>}
            </button>
            
            <button
              onClick={() => handleOptionClick('dark')}
              className={`
                w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors
                ${themeMode === 'dark'
                  ? (isDarkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700')
                }
              `}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
              {themeMode === 'dark' && <span className="ml-auto text-xs">✓</span>}
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
