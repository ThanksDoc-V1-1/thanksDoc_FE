'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';

// Helper function to convert coordinates to location names using reverse geocoding
const getLocationName = async (latitude, longitude) => {
  try {
    // Use Google Maps Geocoding API for reverse geocoding
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found, falling back to coordinates');
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Get the most relevant result (usually the first one)
      const result = data.results[0];
      
      // Try to get city, country format
      let city = '';
      let country = '';
      
      for (const component of result.address_components) {
        if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
        }
        if (component.types.includes('country')) {
          country = component.long_name;
        }
      }

      // Format the location name
      if (city && country) {
        return `${city}, ${country}`;
      } else if (result.formatted_address) {
        // Fallback to formatted address but try to shorten it
        const parts = result.formatted_address.split(',');
        if (parts.length >= 2) {
          return `${parts[0].trim()}, ${parts[parts.length - 1].trim()}`;
        }
        return result.formatted_address;
      }
    }

    // Fallback to coordinates if geocoding fails
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.error('Error getting location name:', error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};

const DistanceSlider = ({ 
  value, 
  onChange, 
  isDarkMode = false, 
  businessLocation = null,
  onLocationUpdate = null,
  disabled = false 
}) => {
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [loadingLocationName, setLoadingLocationName] = useState(false);

  // Update location name when businessLocation changes
  useEffect(() => {
    const updateLocationName = async () => {
      if (businessLocation && businessLocation.latitude && businessLocation.longitude) {
        setLoadingLocationName(true);
        try {
          const name = await getLocationName(businessLocation.latitude, businessLocation.longitude);
          setLocationName(name);
        } catch (error) {
          console.error('Error getting location name:', error);
          setLocationName(`${businessLocation.latitude.toFixed(4)}, ${businessLocation.longitude.toFixed(4)}`);
        } finally {
          setLoadingLocationName(false);
        }
      } else {
        setLocationName('');
      }
    };

    updateLocationName();
  }, [businessLocation]);

  const distanceOptions = [
    { value: 5, label: '5km', description: 'Very close nearby' },
    { value: 10, label: '10km', description: 'Close vicinity' },
    { value: 20, label: '20km', description: 'Wider area' },
    { value: -1, label: 'Anywhere', description: 'No distance limit' }
  ];

  const getCurrentLocation = async () => {
    if (!onLocationUpdate) return;
    
    setGettingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      await onLocationUpdate(position);
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your current location. Please ensure location access is enabled.');
    } finally {
      setGettingLocation(false);
    }
  };

  const selectedOption = distanceOptions.find(option => option.value === value) || distanceOptions[3];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Doctor Distance Preference
        </label>
        {onLocationUpdate && (
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={gettingLocation || disabled}
            className={`inline-flex items-center px-3 py-1 rounded-md text-xs transition-colors ${
              isDarkMode 
                ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 disabled:opacity-50' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50'
            }`}
          >
            <Navigation className="h-3 w-3 mr-1" />
            {gettingLocation ? 'Getting...' : 'Update Location'}
          </button>
        )}
      </div>

      {businessLocation ? (
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center space-x-2">
            <MapPin className={`h-4 w-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
              Location set: {loadingLocationName ? 'Getting location...' : (locationName || `${businessLocation.latitude.toFixed(4)}, ${businessLocation.longitude.toFixed(4)}`)}
            </span>
          </div>
        </div>
      ) : (
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center space-x-2">
            <MapPin className={`h-4 w-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              No location set. {onLocationUpdate ? 'Click "Update Location" to enable distance filtering.' : 'Distance filtering is disabled.'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {distanceOptions.map((option) => (
          <label 
            key={option.value} 
            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              value === option.value
                ? isDarkMode 
                  ? 'border-blue-500 bg-blue-900/20' 
                  : 'border-blue-500 bg-blue-50'
                : isDarkMode 
                  ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="distanceFilter"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(parseInt(e.target.value))}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </span>
                {option.value !== -1 && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    ~{Math.round(option.value * 0.621)} miles
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      {!businessLocation && onLocationUpdate && (
        <div className={`p-3 rounded-lg border-dashed border-2 ${
          isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="text-center">
            <MapPin className={`h-8 w-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Location Required
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              Click "Update Location" to enable distance-based doctor filtering
            </p>
          </div>
        </div>
      )}

      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p className="flex items-center space-x-1">
          <span>💡</span>
          <span>
            {selectedOption.value === -1 
              ? 'All verified doctors will be available for your request'
              : `Doctors within ${selectedOption.label} radius will be prioritized for your request`
            }
          </span>
        </p>
      </div>
    </div>
  );
};

export default DistanceSlider;
