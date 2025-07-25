'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to normalize role to string
  const normalizeRole = (role) => {
    if (typeof role === 'string') return role;
    
    // Convert numeric roles to string roles
    const roleMap = {
      1: 'doctor',
      2: 'business', 
      5: 'admin'
    };
    
    return roleMap[role] || 'user';
  };

  useEffect(() => {
    // Check if user is logged in on app start
    console.log('🔍 AuthContext: Checking localStorage for user data...');
    console.log('🌍 Environment:', typeof window !== 'undefined' ? 'browser' : 'server');
    
    // Add delay in production to ensure localStorage is accessible
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('jwt');
        
        console.log('💾 Saved user exists:', !!savedUser);
        console.log('🔑 Saved token exists:', !!savedToken);
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser);
          console.log('👤 Found saved user data:', userData);
          
          // Validate user data structure
          if (userData && (userData.id || userData.email) && userData.role) {
            // Normalize role to string format
            const normalizedRole = normalizeRole(userData.role);
            const normalizedUser = {
              ...userData,
              role: normalizedRole
            };
            
            console.log('✅ Setting user with normalized role:', normalizedRole);
            setUser(normalizedUser);
            
            // Update localStorage with normalized data
            localStorage.setItem('user', JSON.stringify(normalizedUser));
          } else {
            console.log('❌ Invalid user data, clearing storage');
            localStorage.removeItem('user');
            localStorage.removeItem('jwt');
          }
        } else {
          console.log('ℹ️ No saved user data found');
        }
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('jwt');
      }
      
      setLoading(false);
    };

    // Small delay to ensure localStorage is ready in production
    if (typeof window !== 'undefined') {
      setTimeout(checkAuth, 100);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (userData, jwt) => {
    console.log('🔐 Login called with:', userData);
    console.log('🌍 Login environment:', typeof window !== 'undefined' ? 'browser' : 'server');

    // Normalize role to string format
    const normalizedRole = normalizeRole(userData.role);
    const normalizedUser = {
      ...userData,
      role: normalizedRole
    };

    console.log('✅ Normalized user for login:', normalizedUser);

    // Set user state
    setUser(normalizedUser);

    // Save to localStorage
    try {
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('jwt', jwt);
      console.log('💾 User data saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }

    console.log('✅ User logged in successfully');

    // Redirect the user to their dashboard
    const dashboardUrls = {
      admin: '/admin/dashboard',
      doctor: '/doctor/dashboard',
      business: '/business/dashboard'
    };

    const redirectUrl = dashboardUrls[normalizedRole] || '/';
    console.log('🎯 Redirecting to URL:', redirectUrl);

    // Use a small delay to ensure state is updated
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 100);
  };

  const logout = () => {
    console.log('🚪 Logging out user - clearing all data');

    // Clear user state
    setUser(null);

    // Clear localStorage completely
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear any cookies if they exist
    document.cookie.split(';').forEach(function(c) {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    // Clear any caches
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(name) {
          caches.delete(name);
        });
      });
    }

    console.log('🧹 All data cleared, redirecting to home page');

    // Redirect directly to the home page
    window.location.href = '/';
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    isDoctor: user?.role === 'doctor',
    isBusiness: user?.role === 'business',
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
