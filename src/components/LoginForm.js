'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { authAPI } from '../lib/api';

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
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
        
        // Ensure redirect happens immediately
        if (redirectUrl && redirectUrl !== '/') {
          console.log('🚀 Navigating to dashboard:', redirectUrl);
          // Navigate directly to the dashboard
          window.location.href = redirectUrl;
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg shadow-blue-900/20 p-8 w-full max-w-md">
      <div className="text-center mb-6">
        <div className="bg-blue-900/30 rounded-full p-3 inline-block">
          <LogIn className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mt-4">Sign In</h2>
        <p className="text-gray-300 mt-2">Access your ThanksDoc dashboard</p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
