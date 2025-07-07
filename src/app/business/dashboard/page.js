'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Clock, User, MapPin, DollarSign, LogOut } from 'lucide-react';
import { serviceRequestAPI, doctorAPI, businessAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getUrgencyColor, getStatusColor } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';

export default function BusinessDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [businessData, setBusinessData] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [nearbyDoctors, setNearbyDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalSpent: 0
  });
  const [formData, setFormData] = useState({
    urgencyLevel: 'medium',
    serviceType: '',
    description: '',
    estimatedDuration: 1,
  });

  useEffect(() => {
    console.log('🏢 Business Dashboard useEffect - User:', user);
    console.log('🆔 User ID:', user?.id);
    console.log('📧 User email:', user?.email);
    
    if (user?.id) {
      fetchBusinessData();
      fetchServiceRequests();
      fetchNearbyDoctors();
    }
  }, [user]);

  const fetchBusinessData = async () => {
    try {
      console.log('🔍 Fetching business data for ID:', user.id);
      const response = await businessAPI.getById(user.id);
      console.log('📡 Business API response:', response);
      
      if (response.data?.data) {
        const business = response.data.data;
        console.log('✅ Business data received:', business);
        setBusinessData(business);
      } else {
        console.log('⚠️ No business data in response, falling back to user data');
        setBusinessData(user);
      }
    } catch (error) {
      console.error('❌ Error fetching business data:', error);
      console.error('❌ Error details:', error.response?.data);
      console.log('🔄 Falling back to user data from auth context');
      setBusinessData(user);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await serviceRequestAPI.getBusinessRequests(user.id);
      const requests = response.data || [];
      setServiceRequests(requests);
      
      // Also fetch stats from backend
      try {
        const statsResponse = await businessAPI.getStats(user.id);
        if (statsResponse.data?.data) {
          setStats(prev => ({
            ...prev,
            ...statsResponse.data.data
          }));
        }
      } catch (statsError) {
        console.error('Error fetching stats from backend:', statsError);
        // Fallback to calculating stats from requests
        const completedRequests = requests.filter(req => req.status === 'completed');
        const totalSpent = completedRequests.reduce((sum, req) => sum + (req.totalAmount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalRequests: requests.length,
          activeRequests: requests.filter(req => req.status === 'pending' || req.status === 'accepted').length,
          completedRequests: completedRequests.length,
          totalSpent
        }));
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchNearbyDoctors = async () => {
    try {
      const business = businessData || user;
      const response = await doctorAPI.getAvailable({
        latitude: business.latitude,
        longitude: business.longitude,
        radius: 10
      });
      setNearbyDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching nearby doctors:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestData = {
        businessId: user.id,
        ...formData,
        estimatedDuration: parseInt(formData.estimatedDuration),
      };

      const response = await serviceRequestAPI.createServiceRequest(requestData);
      
      if (response.data) {
        alert(`Service request created successfully! ${response.data.notifiedDoctors} nearby doctors have been notified.`);
        setShowRequestForm(false);
        setFormData({
          urgencyLevel: 'medium',
          serviceType: '',
          description: '',
          estimatedDuration: 1,
        });
        fetchServiceRequests();
      }
    } catch (error) {
      console.error('Error creating service request:', error);
      alert('Failed to create service request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get business display data (either from backend or auth context)
  const business = businessData || user;
  const businessName = business?.businessName || business?.name || business?.email || 'Business';
  const contactName = business?.contactPersonName || `${business?.firstName || ''} ${business?.lastName || ''}`.trim() || 'Contact Person';

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{businessName}</h1>
                <p className="text-gray-600 dark:text-gray-400">Welcome back, {contactName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowRequestForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Request Doctor</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRequests}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Requests</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.activeRequests}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completedRequests}</p>
                  </div>
                  <User className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalSpent)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* Service Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Service Requests</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {serviceRequests.length > 0 ? (
                  serviceRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                              {request.urgencyLevel.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{request.serviceType}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{request.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                          {request.doctor && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Doctor: Dr. {request.doctor.firstName} {request.doctor.lastName}
                            </p>
                          )}
                        </div>
                        {request.totalAmount && (
                          <div className="text-right">
                            <div className="flex items-center text-green-600 dark:text-green-400">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold">{formatCurrency(request.totalAmount)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No service requests yet. Click "Request Doctor" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Name:</span> <span className="text-gray-600 dark:text-gray-400">{businessName}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Contact:</span> <span className="text-gray-600 dark:text-gray-400">{contactName}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Email:</span> <span className="text-gray-600 dark:text-gray-400">{business?.email || 'N/A'}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Type:</span> <span className="text-gray-600 dark:text-gray-400">{business?.businessType || 'N/A'}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Address:</span> <span className="text-gray-600 dark:text-gray-400">{business?.address || 'N/A'}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Total Spent:</span> <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stats.totalSpent)}</span></p>
              </div>
            </div>

            {/* Nearby Doctors */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Doctors Nearby</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{nearbyDoctors.length} doctors available</p>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
                {nearbyDoctors.slice(0, 5).map((doctor) => (
                  <div key={doctor.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{doctor.specialization}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {doctor.yearsOfExperience} years exp. • {formatCurrency(doctor.hourlyRate)}/hr
                        </p>
                        {doctor.distance && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {doctor.distance.toFixed(1)} km away
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Request a Doctor</h2>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Type *
                </label>
                <input
                  type="text"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Emergency consultation, Health checkup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Urgency Level *
                </label>
                <select
                  name="urgencyLevel"
                  value={formData.urgencyLevel}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Duration (hours) *
                </label>
                <input
                  type="number"
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleInputChange}
                  required
                  min="0.5"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what kind of medical assistance you need"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Requesting...' : 'Request Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
