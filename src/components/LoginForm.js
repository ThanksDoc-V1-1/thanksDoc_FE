'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
          // Immediate redirect without timeout
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
      setError(err.message || 'Login failed. Please try again.');
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
      <div className="text-center mb-6">
        <LogIn className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign In</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Access your ThanksDoc dashboard</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Don't have an account?</p>
        <div className="mt-2 space-x-4">
          <a href="/doctor/register" className="text-blue-600 dark:text-blue-400 hover:underline">
            Join as Doctor
          </a>
          <span>•</span>
          <a href="/business/register" className="text-blue-600 dark:text-blue-400 hover:underline">
            Register Business
          </a>
        </div>
      </div>
    </div>
  );
}
