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
    ('🔍 AuthContext: Checking localStorage for user data...');
    ('🌍 Environment:', typeof window !== 'undefined' ? 'browser' : 'server');
    
    // Add delay in production to ensure localStorage is accessible
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('jwt');
        
        ('💾 Saved user exists:', !!savedUser);
        ('🔑 Saved token exists:', !!savedToken);
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser);
          ('👤 Found saved user data:', userData);
          
          // Validate user data structure
          if (userData && (userData.id || userData.email) && userData.role) {
            // Normalize role to string format
            const normalizedRole = normalizeRole(userData.role);
            const normalizedUser = {
              ...userData,
              role: normalizedRole
            };
            
            ('✅ Setting user with normalized role:', normalizedRole);
            setUser(normalizedUser);
            
            // Update localStorage with normalized data
            localStorage.setItem('user', JSON.stringify(normalizedUser));
          } else {
            ('❌ Invalid user data, clearing storage');
            localStorage.removeItem('user');
            localStorage.removeItem('jwt');
          }
        } else {
          ('ℹ️ No saved user data found');
        }
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        // Don't clear localStorage on errors - might be temporary
        ('⚠️ Keeping existing auth data despite error');
      }
      
      setLoading(false);
    };

    // Small delay to ensure localStorage is ready in production
    if (typeof window !== 'undefined') {
      setTimeout(checkAuth, 200); // Increased from 100ms to 200ms
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (userData, jwt) => {
    ('🔐 Login called with:', userData);
    ('🌍 Login environment:', typeof window !== 'undefined' ? 'browser' : 'server');

    // Normalize role to string format
    const normalizedRole = normalizeRole(userData.role);
    const normalizedUser = {
      ...userData,
      role: normalizedRole
    };

    ('✅ Normalized user for login:', normalizedUser);

    // Set user state first
    setUser(normalizedUser);

    // Save to localStorage
    try {
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('jwt', jwt);
      ('💾 User data saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }

    ('✅ User logged in successfully');

    // Determine redirect URL but don't redirect immediately
    const dashboardUrls = {
      admin: '/admin/dashboard',
      doctor: '/doctor/dashboard',
      business: '/business/dashboard'
    };

    const redirectUrl = dashboardUrls[normalizedRole] || '/';
    ('🎯 Will redirect to URL:', redirectUrl);

    // Return the redirect URL so the login component can handle the navigation
    return redirectUrl;
  };

  const logout = () => {
    ('🚪 Logging out user - clearing all data');

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

    ('🧹 All data cleared, redirecting to home page');

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
