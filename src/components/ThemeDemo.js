'use client';

import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import SimpleThemeToggle from './SimpleThemeToggle';
import ThemeInfo from './ThemeInfo';

export default function ThemeDemo() {
  const { isDarkMode, themeMode } = useTheme();

  return (
    <div className={`min-h-screen p-8 transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-gray-900 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Theme System Demo</h1>
          <div className="flex space-x-4">
            <ThemeToggle />
            <SimpleThemeToggle />
          </div>
        </div>

        <ThemeInfo />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <h3 className="text-xl font-semibold mb-3">Automatic Detection</h3>
            <p className="mb-4">
              Your app now automatically detects and follows your device's light/dark mode preference. 
              Try changing your system theme to see it update instantly!
            </p>
            <div className={`p-3 rounded ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <p className="text-sm">
                Current theme: <span className="font-mono">{themeMode}</span>
                <br />
                Rendered as: <span className="font-mono">{isDarkMode ? 'dark' : 'light'}</span>
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <h3 className="text-xl font-semibold mb-3">Manual Override</h3>
            <p className="mb-4">
              Users can still manually choose their preferred theme mode:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span><strong>System:</strong> Follow device preference</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span><strong>Light:</strong> Always use light mode</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span><strong>Dark:</strong> Always use dark mode</span>
              </li>
            </ul>
          </div>

          {/* Form Demo */}
          <div className="md:col-span-2">
            <div className="form-container">
              <h3 className="form-section-heading mb-4">Form Elements Demo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter your name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Message</label>
                  <textarea 
                    rows="3" 
                    className="form-input" 
                    placeholder="Type your message here..."
                  ></textarea>
                </div>
              </div>
              <div className="form-footer-text mt-4">
                All form elements now respond to theme changes automatically.
                <a href="#" className="form-link ml-1">Learn more</a>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-8 p-4 rounded-lg ${
          isDarkMode 
            ? 'bg-green-900/20 border border-green-800 text-green-200' 
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <h4 className="font-semibold mb-2">✅ Implementation Complete</h4>
          <p className="text-sm">
            Your app now supports automatic light/dark mode detection based on device settings, 
            with the option for users to manually override their preference.
          </p>
        </div>
      </div>
    </div>
  );
}
