'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

export default function BusinessForgotPassword() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        throw new Error('Failed to send reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('An error occurred. Please try again.');
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
            <div className="text-center mb-8">
              <Link href="/business/login" className={`inline-flex items-center mb-4 transition-colors ${
                isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
              }`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </div>

            <div className="form-container text-center">
              <CheckCircle className={`h-16 w-16 mx-auto mb-4 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`} />
              <h1 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Reset Link Sent!</h1>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                If an account with email <strong>{email}</strong> exists, we've sent a password reset token to your registered WhatsApp number.
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Check your WhatsApp messages and follow the instructions to reset your password.
              </p>
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
            <Link href="/business/login" className={`inline-flex items-center mb-4 transition-colors ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
            }`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Building2 className={`h-8 w-8 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Forgot Password</h1>
            </div>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Enter your email to receive a password reset token via WhatsApp
            </p>
          </div>

          {/* Form */}
          <div className="form-container">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="form-label">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Enter your registered email address"
                />
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
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                    isDarkMode 
                      ? 'bg-blue-800 text-white hover:bg-blue-700 shadow-blue-900/50' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                  }`}
                >
                  {loading ? 'Sending...' : 'Send Reset Token'}
                </button>
              </div>

              <div className="form-footer-text">
                Remember your password?{' '}
                <Link href="/business/login" className="form-link">
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
