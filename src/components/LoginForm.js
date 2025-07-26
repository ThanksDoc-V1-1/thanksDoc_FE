'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../lib/api';

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 Login attempt started');
    console.log('📧 Email:', formData.email);

    try {
      // Use the backend API to authenticate user
      console.log('🌐 Calling authAPI.login...');
      const result = await authAPI.login(formData.email, formData.password);
      
      console.log('✅ Login API result:', result);
      
      if (result) {
        const { user, jwt } = result;
        
        console.log('👤 User data:', user);
        console.log('🔑 JWT token:', jwt ? 'RECEIVED' : 'NOT RECEIVED');
        
        // Login returns the redirect URL
        console.log('🔄 Calling login function...');
        const redirectUrl = await login(user, jwt);
        
        console.log('🎯 Received redirect URL:', redirectUrl);
        
        // Ensure redirect happens with a small delay to let auth state settle
        if (redirectUrl && redirectUrl !== '/') {
          console.log('🚀 Will navigate to dashboard:', redirectUrl);
          // Add a small delay to ensure authentication state is fully set
          setTimeout(() => {
            console.log('🚀 Navigating to dashboard now:', redirectUrl);
            window.location.href = redirectUrl;
          }, 200); // 200ms delay to ensure auth state is set
        } else {
          console.log('⚠️ No valid redirect URL, staying on home page');
        }
      } else {
        console.log('❌ No result from login API');
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('🚨 Login error:', err);
      console.error('📄 Error details:', err.response?.data || err.message);
      
      // Display a specific message if the account is not verified
      if (err.message && err.message.includes('not verified')) {
        setError('Your account is pending verification. Please wait for admin approval before logging in.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
      console.log('🏁 Login attempt finished');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className={`rounded-lg shadow-lg p-8 w-full max-w-md border transition-colors ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700 shadow-blue-900/20' 
        : 'bg-white border-gray-200 shadow-gray-300/20'
    }`}>
      <div className="text-center mb-6">
        <div className={`rounded-full p-3 inline-block ${
          isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
        }`}>
          <LogIn className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className={`text-2xl font-bold mt-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>Sign In</h2>
        <p className={`mt-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>Access your ThanksDoc dashboard</p>
      </div>

      {error && (
        <div className={`px-4 py-3 rounded mb-4 border ${
          isDarkMode 
            ? 'bg-red-900/50 border-red-800 text-red-300' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors ${
              isDarkMode 
                ? 'border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400' 
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
            }`}
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-3 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400' 
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-800 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors shadow-md"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-400">
        <p>Don't have an account?</p>
        <div className="mt-2 space-x-4">
          <a href="/doctor/register" className="text-blue-400 hover:text-blue-300 hover:underline">
            Join as Doctor
          </a>
          <span>•</span>
          <a href="/business/register" className="text-blue-400 hover:underline">
            Register Business
          </a>
        </div>
      </div>
    </div>
  );
}
