'use client';

import { useTheme } from '../contexts/ThemeContext';
import { Monitor, Moon, Sun, Info } from 'lucide-react';

export default function ThemeInfo() {
  const { isDarkMode, themeMode, isInitialized } = useTheme();

  if (!isInitialized) {
    return null;
  }

  return (
    <div className={`
      p-4 rounded-lg border-l-4 mb-4
      ${isDarkMode 
        ? 'bg-blue-900/20 border-blue-400 text-blue-100' 
        : 'bg-blue-50 border-blue-400 text-blue-800'
      }
    `}>
      <div className="flex items-start space-x-3">
        <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold mb-2">Theme System</h4>
          <p className="text-sm mb-3">
            Your app now automatically responds to your device's theme preference. 
            Current mode: <strong>{themeMode}</strong>
            {themeMode === 'system' && (
              <span> (following system: {isDarkMode ? 'dark' : 'light'})</span>
            )}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>System: Auto-follows device</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4" />
              <span>Light: Always light mode</span>
            </div>
            <div className="flex items-center space-x-2">
              <Moon className="w-4 h-4" />
              <span>Dark: Always dark mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
