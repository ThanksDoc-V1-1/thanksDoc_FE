'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    token: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    
    if (token && email) {
      setFormData(prev => ({
        ...prev,
        token,
        email
      }));
    } else {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          token: formData.token,
          newPassword: formData.newPassword
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen py-12 transition-colors duration-200 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="form-container text-center">
              <CheckCircle className={`h-16 w-16 mx-auto mb-4 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`} />
              <h1 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Password Reset Successful!</h1>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Your password has been successfully updated. You can now login with your new password.
              </p>
              <div className="space-y-3">
                <Link
                  href="/business/login"
                  className={`block w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isDarkMode 
                      ? 'bg-blue-800 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Business Login
                </Link>
                <Link
                  href="/doctor/login"
                  className={`block w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isDarkMode 
                      ? 'bg-green-800 text-white hover:bg-green-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Doctor Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className={`inline-flex items-center mb-4 transition-colors ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
            }`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Lock className={`h-8 w-8 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Reset Password</h1>
            </div>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <div className="form-container">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className={`form-input opacity-75 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
                />
              </div>

              <div>
                <label className="form-label">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                    className="form-input pr-10"
                    placeholder="Enter your new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-gray-300' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="form-input pr-10"
                    placeholder="Confirm your new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-gray-300' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className={`p-3 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'bg-red-900/50 text-red-300 border border-red-800' 
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {error}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !formData.token || !formData.email}
                  className={`w-full py-3 px-4 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                    isDarkMode 
                      ? 'bg-blue-800 text-white hover:bg-blue-700 shadow-blue-900/50' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                  }`}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

  

