import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication API calls
export const authAPI = {
  // New unified login function using the backend auth endpoint
  login: async (email, password) => {
    try {
      console.log('� Starting login process for:', email);
      
      // Check admin first (still using environment variables)
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@thanksdoc.com';
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
      
      if (email === adminEmail && password === adminPassword) {
        const result = { 
          user: { 
            id: 'admin', 
            email: adminEmail, 
            name: 'Admin User',
            role: 'admin'
          }, 
          role: 'admin',
          jwt: 'admin-token' // Mock token for admin
        };
        console.log('✅ Admin login successful:', result);
        return result;
      }
      
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

// Doctor API calls
export const doctorAPI = {
  getAll: () => api.get('/doctors'),
  getById: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', { data }),
  update: (id, data) => api.put(`/doctors/${id}`, { data }),
  delete: (id) => api.delete(`/doctors/${id}`),
  getAvailable: (params) => api.get('/doctors/available', { params }),
  updateAvailability: (id, isAvailable) => api.put(`/doctors/${id}/availability`, { isAvailable }),
  getStats: (id) => api.get(`/doctors/${id}/stats`),
};

// Business API calls
export const businessAPI = {
  getAll: () => api.get('/businesses'),
  getById: (id) => api.get(`/businesses/${id}`),
  create: (data) => api.post('/businesses', { data }),
  update: (id, data) => api.put(`/businesses/${id}`, { data }),
  delete: (id) => api.delete(`/businesses/${id}`),
  getStats: (id) => api.get(`/businesses/${id}/stats`),
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
  getDoctorRequests: (doctorId) => api.get(`/service-requests/doctor/${doctorId}`),
  getAvailableRequests: (doctorId) => api.get(`/service-requests/available/${doctorId}`),
  getBusinessRequests: (businessId) => api.get(`/service-requests/business/${businessId}`),
};

export default api;
