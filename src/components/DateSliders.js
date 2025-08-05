'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const DateDropdowns = ({ value, onChange, label, disabled = false, autoCalculated = false }) => {
  const { isDarkMode } = useTheme();
  
  // Parse the date value or set defaults
  const parseDate = (dateString) => {
    if (!dateString) {
      const today = new Date();
      return {
        year: today.getFullYear(),
        month: today.getMonth() + 1, // JavaScript months are 0-indexed
        day: today.getDate()
      };
    }
    const date = new Date(dateString);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  };

  const [dateComponents, setDateComponents] = useState(parseDate(value));

  // Update when external value changes
  useEffect(() => {
    if (value) {
      setDateComponents(parseDate(value));
    }
  }, [value]);

  // Get number of days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  // Generate year range (current year ± 20 years)
  const currentYear = new Date().getFullYear();
  const yearRange = Array.from({ length: 41 }, (_, i) => currentYear - 20 + i);

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate day range based on selected month/year
  const daysInMonth = getDaysInMonth(dateComponents.year, dateComponents.month);
  const dayRange = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Handle date component changes
  const handleDateChange = (component, newValue) => {
    let newDateComponents = { ...dateComponents, [component]: parseInt(newValue) };
    
    // Adjust day if it's invalid for the new month/year
    if (component === 'month' || component === 'year') {
      const maxDays = getDaysInMonth(newDateComponents.year, newDateComponents.month);
      if (newDateComponents.day > maxDays) {
        newDateComponents.day = maxDays;
      }
    }
    
    setDateComponents(newDateComponents);
    
    // Create date string and call onChange
    const dateString = `${newDateComponents.year}-${String(newDateComponents.month).padStart(2, '0')}-${String(newDateComponents.day).padStart(2, '0')}`;
    onChange(dateString);
  };

  return (
    <div>
      <label className={`block text-xs font-medium mb-2 ${
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      }`}>
        {label}
        {autoCalculated && (
          <span className={`ml-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            (Auto-calculated)
          </span>
        )}
      </label>
      
      <div className={`p-4 rounded-lg border ${
        disabled ? 'opacity-50' : ''
      } ${
        isDarkMode 
          ? 'bg-gray-800/50 border-gray-600' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="grid grid-cols-3 gap-3">
          {/* Day Dropdown */}
          <div>
            <label className={`block text-xs font-medium mb-2 text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Day
            </label>
            <select
              value={dateComponents.day}
              onChange={(e) => handleDateChange('day', e.target.value)}
              disabled={disabled}
              className={`w-full px-3 py-2 text-sm rounded border appearance-none cursor-pointer ${
                disabled ? 'cursor-not-allowed' : ''
              } ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {dayRange.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div>
            <label className={`block text-xs font-medium mb-2 text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Month
            </label>
            <select
              value={dateComponents.month}
              onChange={(e) => handleDateChange('month', e.target.value)}
              disabled={disabled}
              className={`w-full px-3 py-2 text-sm rounded border appearance-none cursor-pointer ${
                disabled ? 'cursor-not-allowed' : ''
              } ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {monthNames.map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div>
            <label className={`block text-xs font-medium mb-2 text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Year
            </label>
            <select
              value={dateComponents.year}
              onChange={(e) => handleDateChange('year', e.target.value)}
              disabled={disabled}
              className={`w-full px-3 py-2 text-sm rounded border appearance-none cursor-pointer ${
                disabled ? 'cursor-not-allowed' : ''
              } ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {yearRange.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Display selected date */}
        <div className={`text-center mt-4 pt-3 border-t ${
          isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'
        }`}>
          <span className="text-sm">
            Selected: {monthNames[dateComponents.month - 1]} {dateComponents.day}, {dateComponents.year}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DateDropdowns;
