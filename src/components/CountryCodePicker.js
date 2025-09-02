'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

// Common country codes with their flags and names
const COUNTRY_CODES = [
  { code: '+44', name: 'United Kingdom', flag: 'GB', iso: 'GB' },
  { code: '+1', name: 'United States', flag: 'US', iso: 'US' },
  { code: '+1', name: 'Canada', flag: 'CA', iso: 'CA' },
  { code: '+33', name: 'France', flag: 'FR', iso: 'FR' },
  { code: '+49', name: 'Germany', flag: 'DE', iso: 'DE' },
  { code: '+39', name: 'Italy', flag: 'IT', iso: 'IT' },
  { code: '+34', name: 'Spain', flag: 'ES', iso: 'ES' },
  { code: '+31', name: 'Netherlands', flag: 'NL', iso: 'NL' },
  { code: '+32', name: 'Belgium', flag: 'BE', iso: 'BE' },
  { code: '+41', name: 'Switzerland', flag: 'CH', iso: 'CH' },
  { code: '+43', name: 'Austria', flag: 'AT', iso: 'AT' },
  { code: '+45', name: 'Denmark', flag: 'DK', iso: 'DK' },
  { code: '+46', name: 'Sweden', flag: 'SE', iso: 'SE' },
  { code: '+47', name: 'Norway', flag: 'NO', iso: 'NO' },
  { code: '+358', name: 'Finland', flag: 'FI', iso: 'FI' },
  { code: '+353', name: 'Ireland', flag: 'IE', iso: 'IE' },
  { code: '+351', name: 'Portugal', flag: 'PT', iso: 'PT' },
  { code: '+30', name: 'Greece', flag: 'GR', iso: 'GR' },
  { code: '+48', name: 'Poland', flag: 'PL', iso: 'PL' },
  { code: '+420', name: 'Czech Republic', flag: 'CZ', iso: 'CZ' },
  { code: '+91', name: 'India', flag: 'IN', iso: 'IN' },
  { code: '+86', name: 'China', flag: 'CN', iso: 'CN' },
  { code: '+81', name: 'Japan', flag: 'JP', iso: 'JP' },
  { code: '+82', name: 'South Korea', flag: 'KR', iso: 'KR' },
  { code: '+65', name: 'Singapore', flag: 'SG', iso: 'SG' },
  { code: '+852', name: 'Hong Kong', flag: 'HK', iso: 'HK' },
  { code: '+61', name: 'Australia', flag: 'AU', iso: 'AU' },
  { code: '+64', name: 'New Zealand', flag: 'NZ', iso: 'NZ' },
  { code: '+27', name: 'South Africa', flag: 'ZA', iso: 'ZA' },
  { code: '+234', name: 'Nigeria', flag: 'NG', iso: 'NG' },
  { code: '+256', name: 'Uganda', flag: 'UG', iso: 'UG' },
  { code: '+20', name: 'Egypt', flag: 'EG', iso: 'EG' },
  { code: '+971', name: 'UAE', flag: 'AE', iso: 'AE' },
  { code: '+966', name: 'Saudi Arabia', flag: 'SA', iso: 'SA' },
  { code: '+90', name: 'Turkey', flag: 'TR', iso: 'TR' },
  { code: '+7', name: 'Russia', flag: 'RU', iso: 'RU' },
  { code: '+55', name: 'Brazil', flag: 'BR', iso: 'BR' },
  { code: '+52', name: 'Mexico', flag: 'MX', iso: 'MX' },
  { code: '+54', name: 'Argentina', flag: 'AR', iso: 'AR' },
];

export default function CountryCodePicker({ 
  selectedCode = '+44', 
  onCodeChange, 
  phoneNumber = '',
  onPhoneChange,
  placeholder = "Enter phone number",
  className = "",
  isDarkMode = false,
  required = false,
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter countries based on search term
  const filteredCountries = COUNTRY_CODES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.includes(searchTerm) ||
    country.iso.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the selected country object
  const selectedCountry = COUNTRY_CODES.find(country => country.code === selectedCode) || COUNTRY_CODES[0];

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCountrySelect = (country) => {
    onCodeChange(country.code);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value;
    // Remove any non-digit characters except spaces and dashes for formatting
    const cleanedValue = value.replace(/[^\d\s-]/g, '');
    onPhoneChange(cleanedValue);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex w-full">
        {/* Country Code Picker */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`relative flex items-center px-3 py-3 border-r-0 rounded-l-xl transition-all duration-200 flex-shrink-0 ${
            isDarkMode 
              ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600' 
              : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300 hover:bg-blue-100/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          <span className={`text-xs font-bold mr-2 px-1.5 py-0.5 rounded ${
            isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-blue-200 text-blue-800'
          }`}>
            {selectedCountry.flag}
          </span>
          <span className="text-sm font-medium mr-1">{selectedCountry.code}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`flex-1 min-w-0 px-4 py-3 border-l-0 rounded-r-xl transition-all duration-200 ${
            isDarkMode 
              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
              : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-50 max-h-60 overflow-hidden ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
        }`}>
          {/* Search Input */}
          <div className={`p-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="relative">
              <Search className={`absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search countries..."
                className={`w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>

          {/* Country List */}
          <div className="overflow-y-auto max-h-40">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={`${country.code}-${country.iso}`}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center px-2 sm:px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                    selectedCode === country.code
                      ? isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700'
                      : isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <span className={`text-xs font-bold mr-2 sm:mr-3 px-1 sm:px-1.5 py-0.5 rounded min-w-[28px] sm:min-w-[32px] text-center ${
                    selectedCode === country.code
                      ? isDarkMode ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800'
                      : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {country.flag}
                  </span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className={`text-xs sm:text-sm font-medium ml-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {country.code}
                  </span>
                </button>
              ))
            ) : (
              <div className={`px-2 sm:px-3 py-2 text-xs sm:text-sm text-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
