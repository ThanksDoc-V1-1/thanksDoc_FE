'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';

export default function NavBar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effect for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (user.role === 'business') {
      return user.businessName || user.name || user.email;
    } else if (user.role === 'doctor') {
      return `Dr. ${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email;
    } else if (user.role === 'admin') {
      return 'Admin';
    }
    
    return user.email;
  };
  
  // Get dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/';
    
    if (user.role === 'business') {
      return '/business/dashboard';
    } else if (user.role === 'doctor') {
      return '/doctor/dashboard';
    } else if (user.role === 'admin') {
      return '/admin/dashboard';
    }
    
    return '/';
  };

  return (
    <nav className={`fixed w-full top-0 z-50 ${scrolled ? 'bg-gray-900/95 shadow-md backdrop-blur-sm' : 'bg-transparent'} transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
              </svg>
              <span className="text-xl font-bold text-white">ThanksDoc</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user && (
              <>
                <span className="text-gray-300">Welcome, {getUserDisplayName()}</span>
                <Link 
                  href={getDashboardLink()} 
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-md bg-red-900/30 text-red-300 hover:bg-red-800/50 transition-colors flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && isAuthenticated && user && (
        <div className="md:hidden bg-gray-800 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <div className="block px-3 py-2 text-base font-medium text-white">
              Welcome, {getUserDisplayName()}
            </div>
            
            <Link 
              href={getDashboardLink()} 
              className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Go to Dashboard
            </Link>
            
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white bg-red-900/30 hover:bg-red-800/50"
            >
              <div className="flex items-center">
                <LogOut className="h-4 w-4 mr-1.5" />
                <span>Logout</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
