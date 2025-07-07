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
  // Check if email exists in doctors collection
  findDoctorByEmail: async (email) => {
    console.log('👨‍⚕️ Checking doctor by email:', email);
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
  
  // Check if email exists in businesses collection
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
  },
  
  // Check if user is admin (you can implement admin user collection or use env variables)
  checkAdminUser: async (email, password) => {
    console.log('👨‍💼 Checking admin user:', email);
    // For now, we'll use environment variables for admin
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@thanksdoc.com';
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    
    console.log('👨‍💼 Admin credentials check:', { adminEmail, providedEmail: email });
    
    if (email === adminEmail && password === adminPassword) {
      const result = { 
        user: { 
          id: 'admin', 
          email: adminEmail, 
          firstName: 'Admin', 
          lastName: 'User' 
        }, 
        role: 'admin' 
      };
      console.log('✅ Admin login successful:', result);
      return result;
    }
    console.log('❌ Admin login failed');
    return null;
  },
  
  // Main login function that checks all user types
  login: async (email, password) => {
    console.log('🚀 Starting login process for:', email);
    
    // Check admin first
    console.log('1️⃣ Checking admin...');
    const adminUser = await authAPI.checkAdminUser(email, password);
    if (adminUser) {
      console.log('✅ Admin user found');
      return adminUser;
    }
    
    // Check doctor
    console.log('2️⃣ Checking doctor...');
    const doctorUser = await authAPI.findDoctorByEmail(email);
    if (doctorUser) {
      console.log('✅ Doctor user found');
      // In a real app, you'd verify password here
      // For now, we'll simulate password verification
      return doctorUser;
    }
    
    // Check business
    console.log('3️⃣ Checking business...');
    const businessUser = await authAPI.findBusinessByEmail(email);
    if (businessUser) {
      console.log('✅ Business user found');
      // In a real app, you'd verify password here
      // For now, we'll simulate password verification
      return businessUser;
    }
    
    console.log('❌ No user found with email:', email);
    throw new Error('Invalid email or user not found');
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
};

// Business API calls
export const businessAPI = {
  getAll: () => api.get('/businesses'),
  getById: (id) => api.get(`/businesses/${id}`),
  create: (data) => api.post('/businesses', { data }),
  update: (id, data) => api.put(`/businesses/${id}`, { data }),
  delete: (id) => api.delete(`/businesses/${id}`),
};

// Service Request API calls
export const serviceRequestAPI = {
  getAll: () => api.get('/service-requests'),
  getById: (id) => api.get(`/service-requests/${id}`),
  create: (data) => api.post('/service-requests', { data }),
  update: (id, data) => api.put(`/service-requests/${id}`, { data }),
  delete: (id) => api.delete(`/service-requests/${id}`),
  findNearbyDoctors: (data) => api.post('/service-requests/find-nearby-doctors', data),
  createServiceRequest: (data) => api.post('/service-requests/create', data),
  acceptRequest: (id, doctorId) => api.put(`/service-requests/${id}/accept`, { doctorId }),
  completeRequest: (id, notes) => api.put(`/service-requests/${id}/complete`, { notes }),
  getDoctorRequests: (doctorId) => api.get(`/service-requests/doctor/${doctorId}`),
  getBusinessRequests: (businessId) => api.get(`/service-requests/business/${businessId}`),
};

export default api;
