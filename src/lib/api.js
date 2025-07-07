import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
