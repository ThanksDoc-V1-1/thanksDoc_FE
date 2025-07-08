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

  useEffect(() => {
    // Check if user is logged in on app start
    console.log('🔍 AuthContext: Checking localStorage for user data...');
    
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('jwt');
      
      console.log('📦 Saved user:', savedUser ? 'EXISTS' : 'NONE');
      console.log('🔑 Saved token:', savedToken ? 'EXISTS' : 'NONE');
      
      if (savedUser && savedToken) {
        const userData = JSON.parse(savedUser);
        console.log('👤 Parsed user data:', userData);
        
        // Validate user data structure
        if (userData && (userData.id || userData.email) && userData.role) {
          console.log('✅ Valid user data found, setting user');
          setUser(userData);
        } else {
          console.log('❌ Invalid user data structure, clearing localStorage');
          localStorage.clear();
        }
      } else {
        console.log('ℹ️ No complete auth data found');
      }
    } catch (error) {
      console.error('❌ Error parsing saved user data:', error);
      localStorage.clear();
    }
    
    setLoading(false);
    console.log('🏁 AuthContext initialization complete');
  }, []);

  const login = (userData, jwt = null) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (jwt) {
      localStorage.setItem('jwt', jwt);
    }
  };

  const logout = () => {
    console.log('🚪 Logout initiated');
    setUser(null);
    
    // Clear all possible storage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('🧹 Storage cleared, redirecting to home');
    
    // Force page reload to ensure clean state
    window.location.href = '/';
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    isDoctor: user?.role === 3,
    isBusiness: user?.role === 4,
    isAdmin: user?.role === 5, // Changed admin to role 5 to distinguish from business
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
