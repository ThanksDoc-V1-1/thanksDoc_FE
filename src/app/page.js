'use client';

import Link from "next/link";
import { ArrowRight, Stethoscope, Building2, Clock, Shield, LogOut, CheckCircle } from "lucide-react";
import LoginForm from "../components/LoginForm";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

// Create a client component that uses useSearchParams
function HomeContent() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState('');
  
  // But if user is authenticated and lands on home page, redirect them
  useEffect(() => {
    // Removed automatic redirection logic to prevent intermediate page
  }, [loading, isAuthenticated, user]);
  
  useEffect(() => {
    const registered = searchParams.get('registered');
    if (registered === 'doctor' || registered === 'business') {
      setMessageType(registered);
      setShowMessage(true);
      // Hide message after 10 seconds
      const timer = setTimeout(() => setShowMessage(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <>
      {/* Registration Success Message */}
      {showMessage && (
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-green-900/50 border border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-200">
                  Registration Successful!
                </h3>
                <p className="text-sm text-green-300 mt-1">
                  {messageType === 'doctor' 
                    ? 'Your doctor profile has been submitted for review. You will receive a confirmation email once verified.'
                    : 'Your business profile has been submitted for review. You will receive a confirmation email once verified.'
                  }
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowMessage(false)}
              className="mt-3 text-xs text-green-400 hover:text-green-200 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Homepage Content */}
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Marketing Content */}
        <div className="text-center lg:text-left">
          <h1 className={`text-5xl md:text-6xl font-bold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            On-Demand <span className="text-blue-400">Healthcare</span>
            <br />
            for Your Business
          </h1>
          <p className={`text-xl mb-8 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Connecting businesses with verified doctors instantly. 
            Request medical consultations within 10km radius with just a few clicks.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center mb-8">
            <Link 
              href="/business/register" 
              className="bg-blue-800 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/50"
            >
              <Building2 className="h-5 w-5" />
              <span>Register Your Business</span>
            </Link>
            <Link 
              href="/doctor/register" 
              className="bg-gray-800 border border-blue-500 text-blue-400 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 shadow-lg"
            >
              <Stethoscope className="h-5 w-5" />
              <span>Join as Doctor</span>
            </Link>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex justify-center">
          {!isAuthenticated ? (
            <LoginForm />
          ) : (
            null
          )}
        </div>
      </div>
    </>
  );
}

// Create a loading fallback component
function HomeLoadingFallback() {
  return (
    <div className="text-center py-12">
      <Stethoscope className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
      <p className="text-gray-300">Loading content...</p>
    </div>
  );
}

export default function Home() {
  const { loading, user, logout, isAuthenticated } = useAuth();
  const { isDarkMode, isInitialized } = useTheme();

  if (loading || !isInitialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-8 w-8 text-blue-400" />
            <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ThanksDoc
            </span>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {isAuthenticated && user ? (
              <>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Welcome, {user.name || user.email}
                </span>
                <Link 
                  href={
                    user.role === 'admin' ? '/admin/dashboard' : 
                    user.role === 'doctor' ? '/doctor/dashboard' : 
                    user.role === 'business' ? '/business/dashboard' : '/'
                  }
                  className="text-blue-400 hover:text-blue-200 transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button 
                  onClick={logout}
                  className={`flex items-center space-x-1 transition-colors ${
                    isDarkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-600 hover:text-red-500'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/business/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Register Business
                </Link>
                <Link href="/doctor/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Register Doctor
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile navigation button */}
          <div className="md:hidden flex items-center space-x-3">
            {isAuthenticated && user && (
              <button 
                onClick={() => {
                  const mobileMenu = document.getElementById('mobile-menu');
                  if (mobileMenu) {
                    mobileMenu.classList.toggle('hidden');
                  }
                }}
                className={isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
        </nav>
        
        {/* Mobile menu */}
        {isAuthenticated && user && (
          <div id="mobile-menu" className={`md:hidden mt-4 hidden rounded-lg p-3 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200 shadow-lg'
          }`}>
            <div className="space-y-2">
              <p className={`px-3 py-2 rounded-md text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Welcome, {user.name || user.email}
              </p>
              <Link 
                href={
                  user.role === 'admin' ? '/admin/dashboard' : 
                  user.role === 'doctor' ? '/doctor/dashboard' : 
                  user.role === 'business' ? '/business/dashboard' : '/'
                }
                className="block px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
              <button 
                onClick={logout}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  isDarkMode ? 'bg-red-900/30 hover:bg-red-800/50' : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
              >
                <div className="flex items-center">
                  <LogOut className="h-4 w-4 mr-1.5" />
                  <span>Logout</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <Suspense fallback={<HomeLoadingFallback />}>
          <HomeContent />
        </Suspense>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className={`p-6 rounded-xl shadow-lg border transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-gray-200/50'
          }`}>
            <div className="bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Quick Response</h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Get connected with nearby doctors in minutes, not hours.
            </p>
          </div>
          
          <div className={`p-6 rounded-xl shadow-lg border transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-gray-200/50'
          }`}>
            <div className="bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Verified Doctors</h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              All doctors are vetted and verified by our admin team.
            </p>
          </div>
          
          <div className={`p-6 rounded-xl shadow-lg border transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-gray-200/50'
          }`}>
            <div className="bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>B2B Focused</h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Designed specifically for pharmacies and healthcare businesses.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-20 text-center">
          <h2 className={`text-3xl font-bold mb-12 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>How ThanksDoc Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className={`text-lg font-semibold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Request a Doctor</h3>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Business submits a request with urgency level and service type
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className={`text-lg font-semibold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Doctor Responds</h3>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Nearby doctors receive notification and first responder gets the job
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className={`text-lg font-semibold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Service Delivered</h3>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Doctor visits location, provides service, and payment is processed
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`py-12 mt-20 border-t transition-colors ${
        isDarkMode 
          ? 'bg-gray-800 text-white border-gray-700' 
          : 'bg-gray-100 text-gray-900 border-gray-200'
      }`}>
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Stethoscope className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold">ThanksDoc</span>
          </div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            Connecting healthcare professionals with businesses in need.
          </p>
        </div>
      </footer>
    </div>
  );
}
