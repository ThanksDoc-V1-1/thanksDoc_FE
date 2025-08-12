'use client';

// Simple test page to verify system settings API
import { useState, useEffect } from 'react';
import { systemSettingsAPI } from '../../lib/api';

export default function TestSystemSettings() {
  const [allSettings, setAllSettings] = useState(null);
  const [publicSettings, setPublicSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testAPIs = async () => {
      try {
        console.log('🧪 Testing system settings APIs from frontend...');
        
        // Test public settings
        console.log('1. Testing public settings API...');
        const publicRes = await systemSettingsAPI.getPublicSettings();
        console.log('✅ Public settings response:', publicRes);
        setPublicSettings(publicRes.data);
        
        // Test authenticated settings
        console.log('2. Testing authenticated settings API...');
        const allRes = await systemSettingsAPI.getAll();
        console.log('✅ All settings response:', allRes);
        setAllSettings(allRes.data);
        
      } catch (err) {
        console.error('❌ Error testing APIs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testAPIs();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">System Settings API Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Public Settings</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(publicSettings, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">All Settings (Authenticated)</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(allSettings, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Settings Count:</h3>
        <p>Public: {publicSettings?.data ? Object.keys(publicSettings.data).length : 0}</p>
        <p>All: {allSettings?.data ? allSettings.data.length : 0}</p>
      </div>
    </div>
  );
}
