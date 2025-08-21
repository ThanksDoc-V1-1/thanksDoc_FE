'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { systemSettingsAPI } from '../lib/api';

const SystemSettingsContext = createContext();

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};

export const SystemSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default values for critical settings
  const defaultSettings = {
    booking_fee: 3.00,
    currency_symbol: '£',
    platform_name: 'Uber Doc',
    min_service_duration: 1,
    max_service_duration: 12
  };

  const fetchPublicSettings = async () => {
    try {
      setLoading(true);
      ('🔧 Fetching public system settings...');
      
      const response = await systemSettingsAPI.getPublicSettings();
      const fetchedSettings = response.data?.data || {};
      
      // Merge with defaults to ensure we always have critical values
      const mergedSettings = { ...defaultSettings, ...fetchedSettings };
      
      ('⚙️ Public settings loaded:', mergedSettings);
      setSettings(mergedSettings);
      setError(null);
    } catch (error) {
      console.error('❌ Error fetching public settings:', error);
      ('🔄 Using default settings as fallback');
      
      // Use default settings as fallback
      setSettings(defaultSettings);
      setError('Failed to load settings, using defaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicSettings();
  }, []);

  // Helper functions for specific settings
  const getBookingFee = () => {
    const fee = settings.booking_fee;
    return typeof fee === 'number' ? fee : parseFloat(fee) || defaultSettings.booking_fee;
  };

  const getCurrencySymbol = () => {
    return settings.currency_symbol || defaultSettings.currency_symbol;
  };

  const getPlatformName = () => {
    return settings.platform_name || defaultSettings.platform_name;
  };

  const getMinServiceDuration = () => {
    const duration = settings.min_service_duration;
    return typeof duration === 'number' ? duration : parseInt(duration) || defaultSettings.min_service_duration;
  };

  const getMaxServiceDuration = () => {
    const duration = settings.max_service_duration;
    return typeof duration === 'number' ? duration : parseInt(duration) || defaultSettings.max_service_duration;
  };

  // Refresh settings (useful for admin changes)
  const refreshSettings = () => {
    fetchPublicSettings();
  };

  const value = {
    settings,
    loading,
    error,
    getBookingFee,
    getCurrencySymbol,
    getPlatformName,
    getMinServiceDuration,
    getMaxServiceDuration,
    refreshSettings
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export default SystemSettingsProvider;
