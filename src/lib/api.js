import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

('🌐 API URL configured as:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased to 30 second timeout
});

// Create a separate axios instance for public API calls (no JWT token)
const publicAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    ('📡 Making API request to:', config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => {
    ('✅ API response received:', response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // Handle network errors (backend not reachable)
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      console.error('🚨 Network error - Backend may not be reachable');
      // Don't show alert on every network error to avoid spam
      return Promise.reject(error);
    }

    // Only handle authentication errors for login attempts
    // Do NOT auto-logout users for other API failures
    if (error.response?.status === 401 || error.response?.status === 403) {
      ('🔒 Authentication error detected:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.response?.data?.message
      });
      
      // Only auto-logout if this is specifically the login endpoint failing with invalid credentials
      const isLoginEndpoint = error.config?.url?.includes('/auth/login');
      
      if (isLoginEndpoint) {
        ('🔒 Login endpoint failed - this is expected for invalid credentials');
        // Don't auto-logout here - let the login component handle the error
      } else {
        ('🔒 API endpoint failed but NOT auto-logging out - user stays logged in');
        // Log the error but don't logout the user automatically
        // This prevents the issue where dashboard API calls failing cause auto-logout
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to manually logout user (can be called by components)
export const forceLogout = () => {
  ('🔒 Force logout called');
  
  // Clear tokens
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  
  // Redirect to appropriate login page based on current path
  const currentPath = window.location.pathname;
  if (currentPath.includes('/admin')) {
    window.location.href = '/admin/login';
  } else if (currentPath.includes('/doctor')) {
    window.location.href = '/doctor/login';
  } else if (currentPath.includes('/business')) {
    window.location.href = '/business/login';
  } else {
    window.location.href = '/';
  }
};

// Helper function to check if user should remain authenticated
export const isUserAuthenticated = () => {
  try {
    const user = localStorage.getItem('user');
    const jwt = localStorage.getItem('jwt');
    
    if (!user || !jwt) {
      ('🔍 No authentication data found');
      return false;
    }
    
    const userData = JSON.parse(user);
    if (!userData.id && !userData.email) {
      ('🔍 Invalid user data structure');
      return false;
    }
    
    ('✅ User authentication data is valid');
    return true;
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    return false;
  }
};

// Helper function to test JWT token validity
export const testJWTToken = async () => {
  try {
    ('🧪 Testing JWT token validity...');
    const token = localStorage.getItem('jwt');
    const user = localStorage.getItem('user');
    
    if (!token) {
      ('❌ No JWT token found');
      return false;
    }
    
    ('🔑 JWT token found:', token.substring(0, 50) + '...');
    ('👤 User data:', user);
    
    // Try to decode the JWT token first
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      ('🔍 JWT Payload:', payload);
      ('🆔 User ID in token:', payload.id);
      ('🕐 JWT Expires:', new Date(payload.exp * 1000));
      ('🕐 Current time:', new Date());
      ('⏰ Token expired?', payload.exp * 1000 < Date.now());
    } catch (decodeError) {
      console.error('❌ Cannot decode JWT token:', decodeError);
    }
    
    // Test with a simple endpoint that should always work if JWT is valid
    const response = await api.get('/services');
    ('✅ JWT token is valid - services endpoint accessible');
    ('📊 Services response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ JWT token test failed:', error);
    console.error('📄 Error response:', error.response?.data);
    return false;
  }
};

// Helper function to test if user exists in current database
export const testUserExists = async () => {
  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userEmail = userData.email;
    
    if (!userEmail) {
      ('❌ No user email found');
      return false;
    }
    
    ('🔍 Testing if user exists in database:', userEmail);
    
    // Try to find user by email without authentication (this should work)
    const response = await api.get(`/doctors?filters[email][$eq]=${userEmail}`);
    ('👨‍⚕️ User search result:', response.data);
    
    if (response.data.data && response.data.data.length > 0) {
      const foundUser = response.data.data[0];
      ('✅ User exists in hosted database:', foundUser);
      ('🆔 Hosted DB User ID:', foundUser.id);
      ('🆔 Local storage User ID:', userData.id);
      
      if (foundUser.id !== userData.id) {
        console.warn('⚠️ USER ID MISMATCH! This is the problem!');
        alert(`USER ID MISMATCH!\nLocal storage: ${userData.id}\nHosted database: ${foundUser.id}\n\nThis is why JWT fails! Use Re-login button.`);
      }
      
      return true;
    } else {
      ('❌ User not found in hosted database');
      alert('User not found in hosted database! You may need to register again.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking user existence:', error);
    return false;
  }
};

// Helper function to test services endpoint permissions
export const testServicesPermissions = async () => {
  try {
    ('🧪 Testing services endpoint permissions...');
    
    // Test 1: Try without JWT (public access)
    const originalToken = localStorage.getItem('jwt');
    localStorage.removeItem('jwt'); // Temporarily remove JWT
    
    try {
      const publicResponse = await api.get('/services');
      ('✅ Services accessible without JWT (public permissions)');
      ('📊 Public services response:', publicResponse.data);
      localStorage.setItem('jwt', originalToken); // Restore JWT
      return { public: true, authenticated: null };
    } catch (publicError) {
      ('❌ Services NOT accessible without JWT');
      localStorage.setItem('jwt', originalToken); // Restore JWT
      
      // Test 2: Try with JWT (authenticated access)
      try {
        const authResponse = await api.get('/services');
        ('✅ Services accessible with JWT (authenticated permissions)');
        ('📊 Auth services response:', authResponse.data);
        return { public: false, authenticated: true };
      } catch (authError) {
        ('❌ Services NOT accessible with JWT either');
        ('🔍 This suggests a backend permissions configuration issue');
        return { public: false, authenticated: false };
      }
    }
  } catch (error) {
    console.error('❌ Error testing services permissions:', error);
    return { public: false, authenticated: false };
  }
};

// Test category-specific services API calls (like the dashboard uses)
export const testServiceCategories = async () => {
  ('🧪 Testing category-specific services API calls...');
  
  try {
    // Test in-person services
    ('📡 Testing in-person services...');
    const inPersonResponse = await api.get('/services?filters[category][$eq]=in-person&sort=displayOrder:asc');
    ('✅ In-person services response:', inPersonResponse.data);
    
    // Test online services  
    ('📡 Testing online services...');
    const onlineResponse = await api.get('/services?filters[category][$eq]=online&sort=displayOrder:asc');
    ('✅ Online services response:', onlineResponse.data);
    
    // Test data structure
    ('📊 In-person services count:', inPersonResponse.data?.data?.length || 0);
    ('📊 Online services count:', onlineResponse.data?.data?.length || 0);
    
    // Alert with results
    const inPersonCount = inPersonResponse.data?.data?.length || 0;
    const onlineCount = onlineResponse.data?.data?.length || 0;
    
    alert(`🧪 Category Services Test Results:
📍 In-person services: ${inPersonCount}
💻 Online services: ${onlineCount}
🔍 Total should be: 11
📊 Check console for detailed response structures`);
    
    return { inPersonCount, onlineCount };
  } catch (error) {
    console.error('❌ Category services test failed:', error);
    alert('❌ Category services test failed - check console for details');
    return false;
  }
};

export const doctorAPI = {
  getAll: () => api.get('/doctors'),
  getById: (id) => api.get(`/doctors/${id}?populate=services`),
  getProfile: (id) => api.get(`/doctors/${id}?populate=services`), // Get doctor profile with services
  create: (data) => api.post('/doctors', { data }),
  update: (id, data) => api.put(`/doctors/${id}`, { data }),
  updateProfile: (id, data) => {
    ('🔄 Doctor API updateProfile called with:', { id, data });
    ('🌐 Making request to:', `${API_URL}/doctors/${id}`);
    return api.put(`/doctors/${id}`, { data });
  }, // Convenience method for profile updates
  delete: (id) => api.delete(`/doctors/${id}`),
  getAvailable: (params) => api.get('/doctors/available?populate=services', { params }),
  updateAvailability: (id, isAvailable) => api.put(`/doctors/${id}/availability`, { isAvailable }),
  getStats: (id) => api.get(`/doctors/${id}/stats`),
  getOverallStats: () => api.get('/doctors/stats'),
};

// Authentication API calls
export const authAPI = {
  // New unified login function using the backend auth endpoint
  login: async (email, password) => {
    try {
      ('� Starting login process for:', email);
      
      // No longer need to handle admin login separately - the backend handles it now
      // Let all login attempts go through the API
      
      // Use the new auth endpoint for doctors and businesses
      const response = await api.post('/auth/login', {
        email,
        password
      });
      
      ('✅ Login successful:', response.data);
      
      // Ensure the response has the correct structure
      const result = {
        ...response.data,
        user: {
          ...response.data.user,
          role: response.data.user.role // Make sure role is in user object
        }
      };
      
      return result;
      
    } catch (error) {
      console.error('🚨 Login error:', error);
      console.error('🔍 Error response status:', error.response?.status);
      console.error('🔍 Error response data:', error.response?.data);
      console.error('🔍 Error response data type:', typeof error.response?.data);
      console.error('🔍 Error response data message:', error.response?.data?.message);
      console.error('🔍 Error response data message type:', typeof error.response?.data?.message);
      console.error('🔍 Error response data.error:', error.response?.data?.error);
      console.error('🔍 Error response data.error.message:', error.response?.data?.error?.message);
      
      // Check if it's a verification error (HTTP 400 or 403)
      if (error.response?.status === 400 || error.response?.status === 403) {
        // Check if the error message is about email verification
        const errorMessage = String(error.response?.data?.error?.message || error.response?.data?.message || error.response?.data || '');
        console.error('🔍 Checking error message for verification:', errorMessage);
        if (errorMessage.includes('verify') || errorMessage.includes('verification')) {
          console.error('✅ Verification error detected, throwing specific message');
          throw new Error(errorMessage);
        }
      }
      
      // For all other errors, check if we have a specific message from the backend
      const backendMessage = error.response?.data?.error?.message || error.response?.data?.message || error.response?.data;
      console.error('🔍 Backend message:', backendMessage, typeof backendMessage);
      if (backendMessage && typeof backendMessage === 'string') {
        console.error('✅ Using backend message:', backendMessage);
        throw new Error(backendMessage);
      }
      
      // Only show "Invalid credentials" for actual 401 Unauthorized errors
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      
      // For other errors, show a generic message
      console.error('❌ Using generic fallback message');
      throw new Error('Login failed. Please try again.');
    }
  },

  // New unified register function
  register: async (type, userData) => {
    try {
      ('� Starting registration process for:', userData.email, 'as', type);
      
      const response = await api.post('/auth/register', {
        type,
        ...userData
      });
      
      ('✅ Registration successful:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('� Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  // Get current user info
  me: async (token) => {
    try {
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user info');
    }
  },

  // Legacy functions kept for backward compatibility (but updated to use new auth)
  findDoctorByEmail: async (email) => {
    ('�‍⚕️ Checking doctor by email:', email);
    try {
      const response = await api.get(`/doctors?filters[email][$eq]=${email}`);
      ('👨‍⚕️ Doctor API response:', response.data);
      const result = response.data.data.length > 0 ? { user: response.data.data[0], role: 'doctor' } : null;
      ('👨‍⚕️ Doctor result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error checking doctor:', error);
      return null;
    }
  },
  
  findBusinessByEmail: async (email) => {
    ('🏢 Checking business by email:', email);
    try {
      const response = await api.get(`/businesses?filters[email][$eq]=${email}`);
      ('🏢 Business API response:', response.data);
      const result = response.data.data.length > 0 ? { user: response.data.data[0], role: 'business' } : null;
      ('🏢 Business result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error checking business:', error);
      return null;
    }
  }
};

// Business API calls
export const businessAPI = {
  getAll: () => api.get('/businesses'),
  getById: (id) => api.get(`/businesses/${id}`),
  getProfile: () => api.get('/businesses/profile'), // Get current business's profile
  create: (data) => api.post('/businesses', { data }),
  update: (id, data) => api.put(`/businesses/${id}`, { data }),
  updateProfile: (id, data) => api.put(`/businesses/${id}`, { data }), // Convenience method for profile updates
  delete: (id) => api.delete(`/businesses/${id}`),
  getStats: (id) => api.get(`/businesses/${id}/stats`),
  getOverallStats: () => api.get('/businesses/stats'),
  getBusinessTypes: () => publicAPI.get('/business-types'), // Get available business types
  
  // Business Types CRUD operations (admin only)
  createBusinessType: (data) => api.post('/business-types', { data }),
  updateBusinessType: (id, data) => api.put(`/business-types/${id}`, { data }),
  deleteBusinessType: (id) => api.delete(`/business-types/${id}`),
};

// Service Request API calls
export const serviceRequestAPI = {
  getAll: () => api.get('/service-requests'),
  getById: (id) => api.get(`/service-requests/${id}`),
  create: (data) => api.post('/service-requests', { data }),
  update: (id, data) => api.put(`/service-requests/${id}`, { data }),
  delete: (id) => api.delete(`/service-requests/${id}`),
  cancel: (id, reason) => api.put(`/service-requests/${id}/cancel`, { reason }),
  findNearbyDoctors: (data) => api.post('/service-requests/find-nearby-doctors', data),
  createServiceRequest: (data) => api.post('/service-requests/create', data, { timeout: 60000 }), // 1 minute timeout for service requests
  createDirectRequest: (data) => api.post('/service-requests/direct', data),
  acceptRequest: (id, doctorId) => api.put(`/service-requests/${id}/accept`, { doctorId }),
  rejectRequest: (id, doctorId, reason) => api.put(`/service-requests/${id}/doctor-decline`, { doctorId, reason }), // Updated to use doctor-decline endpoint
  completeRequest: (id, notes) => api.put(`/service-requests/${id}/complete`, { notes }),
  processPayment: (id, paymentMethod, paymentDetails, additionalData = {}) => 
    api.put(`/service-requests/${id}/payment`, { 
      paymentMethod, 
      paymentDetails, 
      ...additionalData 
    }),
  getDoctorRequests: (doctorId) => api.get(`/service-requests/doctor/${doctorId}`),
  getAvailableRequests: (doctorId) => api.get(`/service-requests/available/${doctorId}`),
  getBusinessRequests: (businessId) => api.get(`/service-requests/business/${businessId}`),
  getOverallStats: () => api.get('/service-requests/stats'),
  // New fallback functionality
  enableAutoFallback: (requestId, timeoutMinutes = 2) => api.put(`/service-requests/${requestId}/enable-fallback`, { timeoutMinutes }),
  checkFallbackStatus: (requestId) => api.get(`/service-requests/${requestId}/fallback-status`),
  triggerFallback: (requestId) => api.put(`/service-requests/${requestId}/trigger-fallback`),
  // Service cost calculation
  calculateServiceCost: (serviceId) => api.post('/service-requests/calculate-cost', { serviceId }),
};

// Service API calls
export const serviceAPI = {
  getAll: () => {
    ('🔍 Fetching all services...');
    return api.get('/services?populate[doctors][fields][0]=id&populate[doctors][fields][1]=firstName&populate[doctors][fields][2]=lastName&sort=category:asc,displayOrder:asc,name:asc');
  },
  getById: (id) => {
    ('🔍 Fetching service by ID:', id);
    return api.get(`/services/${id}?populate=*`);
  },
  create: (data) => {
    ('🆕 Creating new service with data:', data);
    const payload = { data: { ...data } };
    ('🆕 Create payload:', payload);
    return api.post('/services', payload);
  },
  update: (id, data) => {
    // Clean the ID to ensure it's just the ID without any URL fragments
    const cleanId = typeof id === 'string' ? id.split(':')[0].split('/').pop() : id;
    ('🔄 Service update - Original ID:', id);
    ('🔄 Service update - Clean ID:', cleanId);
    ('🔄 Service update - Data:', data);
    
    const payload = { data: { ...data } };
    ('🔄 Update payload:', payload);
    ('🔄 Full URL will be:', `/services/${cleanId}`);
    
    return api.put(`/services/${cleanId}`, payload);
  },
  delete: (id) => {
    // Clean the ID to ensure it's just the ID without any URL fragments
    const cleanId = typeof id === 'string' ? id.split(':')[0].split('/').pop() : id;
    ('🗑️ Service delete - Original ID:', id);
    ('🗑️ Service delete - Clean ID:', cleanId);
    
    return api.delete(`/services/${cleanId}`);
  },
  getByCategory: (category) => {
    ('🔍 Fetching services by category:', category);
    return publicAPI.get(`/services?filters[category][$eq]=${category}&sort=displayOrder:asc`);
  },
  getDoctorsByService: async (serviceId, params) => {
    try {
      // Get all doctors with their services populated
      const response = await api.get('/doctors?populate=services&filters[isAvailable][$eq]=true&filters[isVerified][$eq]=true');
      
      ('🔍 Raw response from doctors API:', response);
      ('🔍 Response data structure:', response.data);
      ('🔍 Is response.data an array?', Array.isArray(response.data));
      
      // Handle different response structures
      let doctors = response.data;
      
      // If response.data is not an array, try response.data.data
      if (!Array.isArray(doctors) && response.data?.data) {
        doctors = response.data.data;
      }
      
      // If still not an array, return empty array
      if (!Array.isArray(doctors)) {
        console.error('❌ Doctors data is not an array:', doctors);
        return { data: [] };
      }
      
      (`🔍 Processing ${doctors.length} doctors for service ID: ${serviceId}`);
      
      // Filter doctors who have the specified service
      const doctorsWithService = doctors.filter(doctor => {
        const hasService = doctor.services && doctor.services.some(service => service.id == serviceId);
        if (hasService) {
          (`✅ Doctor ${doctor.firstName} ${doctor.lastName} offers service ${serviceId}`);
        }
        return hasService;
      });
      
      (`🔍 Found ${doctorsWithService.length} doctors with service ${serviceId}`);
      
      return { data: doctorsWithService };
    } catch (error) {
      console.error('❌ Error in getDoctorsByService:', error);
      // Fallback: return empty array instead of throwing
      return { data: [] };
    }
  },

  // Alternative method using service endpoint
  getDoctorsByServiceAlternative: async (serviceId, params) => {
    try {
      // Get the specific service with its doctors populated
      const response = await api.get(`/services/${serviceId}?populate=doctors`);
      
      ('🔍 Service response:', response);
      
      if (response.data?.doctors) {
        // Filter only available and verified doctors
        const availableDoctors = response.data.doctors.filter(doctor => 
          doctor.isAvailable && doctor.isVerified
        );
        
        (`🔍 Found ${availableDoctors.length} available doctors for service ${serviceId}`);
        return { data: availableDoctors };
      }
      
      return { data: [] };
    } catch (error) {
      console.error('❌ Error in getDoctorsByServiceAlternative:', error);
      return { data: [] };
    }
  },
};

// Transaction API calls
export const transactionAPI = {
  getTransactionHistory: (params) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/transaction-history${queryString}`);
  },
  getPaymentDetails: (paymentIntentId) => api.post('/transaction-history', { paymentIntentId }),
};

// Doctor Earnings API calls
export const earningsAPI = {
  getDoctorEarnings: (params) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/doctor-earnings${queryString}`);
  },
  markDoctorAsPaid: (doctorId, paymentDetails) => 
    api.post('/doctor-earnings', { doctorId, ...paymentDetails }),
};

// System Settings API calls
export const systemSettingsAPI = {
  getAll: () => api.get('/system-settings'),
  getPublicSettings: () => publicAPI.get('/system-settings/public'),
  getByKey: (key) => publicAPI.get(`/system-settings/key/${key}`),
  create: (data) => api.post('/system-settings', { data }),
  update: (id, data) => api.put(`/system-settings/${id}`, { data }),
  updateByKey: (key, data) => api.put(`/system-settings/key/${key}`, data),
  delete: (id) => api.delete(`/system-settings/${id}`),
};

// Doctor Subscription API calls
export const subscriptionAPI = {
  getAll: () => api.get('/doctor-subscriptions'),
  getById: (id) => api.get(`/doctor-subscriptions/${id}`),
  getByDoctorId: (doctorId) => api.get(`/doctor-subscriptions/doctor/${doctorId}`),
  create: (data) => api.post('/doctor-subscriptions/create', data),
  cancel: (id) => api.put(`/doctor-subscriptions/${id}/cancel`),
  getStats: () => api.get('/doctor-subscriptions/stats'),
};

// Admin API calls
export const adminAPI = {
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export default api;
