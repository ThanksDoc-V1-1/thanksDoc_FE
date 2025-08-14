'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const PhoneInput = ({ 
  value = '', 
  onChange, 
  placeholder = "Enter phone number", 
  required = false, 
  className = "form-input",
  name = "phone",
  disabled = false 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({ code: '+44', flag: '🇬🇧', name: 'United Kingdom' });
  const [phoneNumber, setPhoneNumber] = useState(value.replace(/^\+44\s?/, ''));
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Common country codes
  const countryCodes = [
    { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+1', flag: '🇺🇸', name: 'United States' },
    { code: '+1', flag: '🇨🇦', name: 'Canada' },
    { code: '+33', flag: '🇫🇷', name: 'France' },
    { code: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: '+39', flag: '🇮🇹', name: 'Italy' },
    { code: '+34', flag: '🇪🇸', name: 'Spain' },
    { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
    { code: '+32', flag: '🇧🇪', name: 'Belgium' },
    { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
    { code: '+43', flag: '🇦🇹', name: 'Austria' },
    { code: '+45', flag: '🇩🇰', name: 'Denmark' },
    { code: '+46', flag: '🇸🇪', name: 'Sweden' },
    { code: '+47', flag: '🇳🇴', name: 'Norway' },
    { code: '+358', flag: '🇫🇮', name: 'Finland' },
    { code: '+353', flag: '🇮🇪', name: 'Ireland' },
    { code: '+351', flag: '🇵🇹', name: 'Portugal' },
    { code: '+30', flag: '🇬🇷', name: 'Greece' },
    { code: '+48', flag: '🇵🇱', name: 'Poland' },
    { code: '+420', flag: '🇨🇿', name: 'Czech Republic' },
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+86', flag: '🇨🇳', name: 'China' },
    { code: '+81', flag: '🇯🇵', name: 'Japan' },
    { code: '+82', flag: '🇰🇷', name: 'South Korea' },
    { code: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
    { code: '+27', flag: '🇿🇦', name: 'South Africa' },
    { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
    { code: '+254', flag: '🇰🇪', name: 'Kenya' },
    { code: '+256', flag: '🇺🇬', name: 'Uganda' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: '+20', flag: '🇪🇬', name: 'Egypt' },
    { code: '+52', flag: '🇲🇽', name: 'Mexico' },
    { code: '+55', flag: '🇧🇷', name: 'Brazil' },
    { code: '+54', flag: '🇦🇷', name: 'Argentina' },
    { code: '+56', flag: '🇨🇱', name: 'Chile' },
    { code: '+57', flag: '🇨🇴', name: 'Colombia' }
  ];

  useEffect(() => {
    // Parse existing value to extract country code and number
    if (value) {
      const matchedCountry = countryCodes.find(country => value.startsWith(country.code));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(value.replace(new RegExp(`^${matchedCountry.code}\\s?`), ''));
      } else {
        setPhoneNumber(value);
      }
    }
  }, []);

  useEffect(() => {
    // Handle clicks outside dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter countries based on search query
  const filteredCountries = countryCodes.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');
    // Update the full phone number WITHOUT space for WhatsApp compatibility
    const fullNumber = phoneNumber ? `${country.code}${phoneNumber.replace(/\s/g, '')}` : country.code;
    onChange({ target: { name, value: fullNumber } });
    // Focus back to input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handlePhoneNumberChange = (e) => {
    const inputValue = e.target.value;
    setPhoneNumber(inputValue);
    // Update the full phone number with country code WITHOUT space for WhatsApp compatibility
    const cleanNumber = inputValue.replace(/\s/g, ''); // Remove any spaces
    const fullNumber = cleanNumber ? `${selectedCountry.code}${cleanNumber}` : selectedCountry.code;
    onChange({ target: { name, value: fullNumber } });
  };

  const formatPhoneNumber = (number) => {
    // Basic formatting for UK numbers
    if (selectedCountry.code === '+44' && number) {
      const cleaned = number.replace(/\D/g, '');
      if (cleaned.length >= 10) {
        return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
      } else if (cleaned.length >= 7) {
        return cleaned.replace(/(\d{4})(\d{3})/, '$1 $2');
      } else if (cleaned.length >= 4) {
        return cleaned.replace(/(\d{4})/, '$1');
      }
    }
    return number;
  };

  return (
    <div className="relative">
      <div className="flex">
        {/* Country Code Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleDropdownToggle}
            className="flex items-center gap-2 px-3 py-2 border border-r-0 rounded-l-md transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer form-input !rounded-r-none !border-r-0"
            disabled={disabled}
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.code}</span>
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 z-50 w-72 max-h-60 border rounded-md shadow-lg form-input !p-0 overflow-hidden">
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded form-input !text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {/* Countries List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country, index) => (
                    <button
                      key={`${country.code}-${country.name}-${index}`}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-200
                        hover:bg-gray-100 dark:hover:bg-gray-600
                        ${selectedCountry.code === country.code && selectedCountry.name === country.name 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-900 dark:text-gray-100'
                        }
                      `}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="font-medium min-w-12">{country.code}</span>
                      <span className="truncate">{country.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          ref={inputRef}
          type="tel"
          name={name}
          value={formatPhoneNumber(phoneNumber)}
          onChange={handlePhoneNumberChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="flex-1 border border-l-0 rounded-r-md rounded-l-none focus:outline-none focus:ring-2 focus:ring-blue-500 form-input !rounded-l-none !border-l-0"
        />
      </div>
    </div>
  );
};

// Utility function to format phone number for WhatsApp API
export const formatPhoneForWhatsApp = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all spaces, dashes, parentheses, and other non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Ensure it starts with + if it doesn't already
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return cleaned;
};

// Utility function to validate WhatsApp phone format
export const isValidWhatsAppPhone = (phoneNumber) => {
  const formatted = formatPhoneForWhatsApp(phoneNumber);
  // WhatsApp numbers should be: + followed by country code (1-3 digits) and national number (4-15 digits)
  return /^\+\d{5,18}$/.test(formatted);
};

export default PhoneInput;
