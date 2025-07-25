import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear invalid tokens
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
      }
    }
    return Promise.reject(error);
  }
);

// Doctor API calls
export const doctorAPI = {
  getAll: () => api.get('/doctors'),
  getById: (id) => api.get(`/doctors/${id}?populate=services`),
  getProfile: (id) => api.get(`/doctors/${id}?populate=services`), // Get doctor profile with services
  create: (data) => api.post('/doctors', { data }),
  update: (id, data) => api.put(`/doctors/${id}`, { data }),
  updateProfile: (id, data) => {
    console.log('🔄 Doctor API updateProfile called with:', { id, data });
    console.log('🌐 Making request to:', `${API_URL}/doctors/${id}`);
    return api.put(`/doctors/${id}`, { data });
  }, // Convenience method for profile updates
  delete: (id) => api.delete(`/doctors/${id}`),
  getAvailable: (params) => api.get('/doctors/available', { params }),
  updateAvailability: (id, isAvailable) => api.put(`/doctors/${id}/availability`, { isAvailable }),
  getStats: (id) => api.get(`/doctors/${id}/stats`),
  getOverallStats: () => api.get('/doctors/stats'),
};

// Authentication API calls
export const authAPI = {
  // New unified login function using the backend auth endpoint
  login: async (email, password) => {
    try {
      console.log('� Starting login process for:', email);
      
      // No longer need to handle admin login separately - the backend handles it now
      // Let all login attempts go through the API
      
      // Use the new auth endpoint for doctors and businesses
      const response = await api.post('/auth/login', {
        email,
        password
      });
      
      console.log('✅ Login successful:', response.data);
      
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
      
      // Check if it's a verification error (HTTP 403)
      if (error.response?.status === 403) {
        throw new Error(error.response?.data?.message || 'Account not verified. Please wait for admin approval.');
      }
      
      throw new Error(error.response?.data?.message || 'Invalid credentials');
    }
  },

  // New unified register function
  register: async (type, userData) => {
    try {
      console.log('� Starting registration process for:', userData.email, 'as', type);
      
      const response = await api.post('/auth/register', {
        type,
        ...userData
      });
      
      console.log('✅ Registration successful:', response.data);
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
    console.log('�‍⚕️ Checking doctor by email:', email);
    try {
      const response = await api.get(`/doctors?filters[email][$eq]=${email}`);
      console.log('👨‍⚕️ Doctor API response:', response.data);
      const result = response.data.data.length > 0 ? { user: response.data.data[0], role: 'doctor' } : null;
      console.log('👨‍⚕️ Doctor result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error checking doctor:', error);
      return null;
    }
  },
  
  findBusinessByEmail: async (email) => {
    console.log('🏢 Checking business by email:', email);
    try {
      const response = await api.get(`/businesses?filters[email][$eq]=${email}`);
      console.log('🏢 Business API response:', response.data);
      const result = response.data.data.length > 0 ? { user: response.data.data[0], role: 'business' } : null;
      console.log('🏢 Business result:', result);
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
  createServiceRequest: (data) => api.post('/service-requests/create', data),
  createDirectRequest: (data) => api.post('/service-requests/direct', data),
  acceptRequest: (id, doctorId) => api.put(`/service-requests/${id}/accept`, { doctorId }),
  rejectRequest: (id, doctorId, reason) => api.put(`/service-requests/${id}/reject`, { doctorId, reason }),
  completeRequest: (id, notes) => api.put(`/service-requests/${id}/complete`, { notes }),
  processPayment: (id, paymentMethod, paymentDetails) => api.put(`/service-requests/${id}/payment`, { paymentMethod, paymentDetails }),
  getDoctorRequests: (doctorId) => api.get(`/service-requests/doctor/${doctorId}`),
  getAvailableRequests: (doctorId) => api.get(`/service-requests/available/${doctorId}`),
  getBusinessRequests: (businessId) => api.get(`/service-requests/business/${businessId}`),
  getOverallStats: () => api.get('/service-requests/stats'),
};

// Service API calls
export const serviceAPI = {
  getAll: () => api.get('/services'),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', { data }),
  update: (id, data) => api.put(`/services/${id}`, { data }),
  delete: (id) => api.delete(`/services/${id}`),
  getByCategory: (category) => api.get(`/services?filters[category][$eq]=${category}&sort=displayOrder:asc`),
  getDoctorsByService: async (serviceId, params) => {
    try {
      // Get all doctors with their services populated
      const response = await api.get('/doctors?populate=services&filters[isAvailable][$eq]=true&filters[isVerified][$eq]=true');
      
      console.log('🔍 Raw response from doctors API:', response);
      console.log('🔍 Response data structure:', response.data);
      console.log('🔍 Is response.data an array?', Array.isArray(response.data));
      
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
      
      console.log(`🔍 Processing ${doctors.length} doctors for service ID: ${serviceId}`);
      
      // Filter doctors who have the specified service
      const doctorsWithService = doctors.filter(doctor => {
        const hasService = doctor.services && doctor.services.some(service => service.id == serviceId);
        if (hasService) {
          console.log(`✅ Doctor ${doctor.firstName} ${doctor.lastName} offers service ${serviceId}`);
        }
        return hasService;
      });
      
      console.log(`🔍 Found ${doctorsWithService.length} doctors with service ${serviceId}`);
      
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
      
      console.log('🔍 Service response:', response);
      
      if (response.data?.doctors) {
        // Filter only available and verified doctors
        const availableDoctors = response.data.doctors.filter(doctor => 
          doctor.isAvailable && doctor.isVerified
        );
        
        console.log(`🔍 Found ${availableDoctors.length} available doctors for service ${serviceId}`);
        return { data: availableDoctors };
      }
      
      return { data: [] };
    } catch (error) {
      console.error('❌ Error in getDoctorsByServiceAlternative:', error);
      return { data: [] };
    }
  },
};

export default api;
