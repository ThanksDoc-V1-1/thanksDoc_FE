'use client';

import Link from "next/link";
import { ArrowRight, Stethoscope, Building2, Clock, Shield, LogOut, CheckCircle } from "lucide-react";
import LoginForm from "../components/LoginForm";
import { useAuth } from "../contexts/AuthContext";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const searchParams = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState('');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 5: return '/admin/dashboard';
      case 3: return '/doctor/dashboard';
      case 4: return '/business/dashboard';
      default: return '/';
    }
  };

  const getRoleText = () => {
    if (!user) return '';
    switch (user.role) {
      case 5: return 'Admin';
      case 3: return 'Doctor';
      case 4: return 'Business';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">ThanksDoc</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600 dark:text-gray-300">
                  Welcome, {user.firstName || user.businessName || user.name} ({getRoleText()})
                </span>
                <Link 
                  href={getDashboardLink()} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button 
                  onClick={logout}
                  className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/business/register" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Register Business
                </Link>
                <Link href="/doctor/register" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Register Doctor
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Registration Success Message */}
        {showMessage && (
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Registration Successful!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {messageType === 'doctor' 
                      ? 'Your doctor profile has been submitted for review. You will receive a confirmation email once verified.'
                      : 'Your business profile has been submitted for review. You will receive a confirmation email once verified.'
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowMessage(false)}
                className="mt-3 text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isAuthenticated ? (
          /* Authenticated User Content */
          <div className="text-center max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome back, {user.name}!
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                You're logged in as a {getRoleText().toLowerCase()}. Ready to get started?
              </p>
              <Link 
                href={getDashboardLink()}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors space-x-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Non-authenticated User Content */
          <div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Marketing Content */}
              <div className="text-center lg:text-left">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                  On-Demand <span className="text-blue-600 dark:text-blue-400">Healthcare</span>
                  <br />
                  for Your Business
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                  Connect pharmacies and businesses with verified doctors instantly. 
                  Request medical consultations within 10km radius with just a few clicks.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center mb-8">
                  <Link 
                    href="/business/register" 
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Building2 className="h-5 w-5" />
                    <span>Register Your Business</span>
                  </Link>
                  <Link 
                    href="/doctor/register" 
                    className="border border-blue-600 text-blue-600 dark:text-blue-400 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Stethoscope className="h-5 w-5" />
                    <span>Join as Doctor</span>
                  </Link>
                </div>
              </div>

              {/* Right Side - Login Form */}
              <div className="flex justify-center">
                <LoginForm />
              </div>
            </div>

            {/* Features Section */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Quick Response</h3>
                <p className="text-gray-600 dark:text-gray-300">Get connected with nearby doctors in minutes, not hours.</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Verified Doctors</h3>
                <p className="text-gray-600 dark:text-gray-300">All doctors are vetted and verified by our admin team.</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">B2B Focused</h3>
                <p className="text-gray-600 dark:text-gray-300">Designed specifically for pharmacies and healthcare businesses.</p>
              </div>
            </div>

            {/* How it Works */}
            <div className="mt-20 text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">How ThanksDoc Works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Request a Doctor</h3>
                  <p className="text-gray-600 dark:text-gray-300">Business submits a request with urgency level and service type</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Doctor Responds</h3>
                  <p className="text-gray-600 dark:text-gray-300">Nearby doctors receive notification and first responder gets the job</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Service Delivered</h3>
                  <p className="text-gray-600 dark:text-gray-300">Doctor visits location, provides service, and payment is processed</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Stethoscope className="h-6 w-6" />
            <span className="text-xl font-bold">ThanksDoc</span>
          </div>
          <p className="text-gray-400">Connecting healthcare professionals with businesses in need.</p>
        </div>
      </footer>
    </div>
  );
}
