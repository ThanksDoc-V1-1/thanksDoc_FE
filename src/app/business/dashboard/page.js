'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Clock, User, MapPin, DollarSign, LogOut, X, Phone, CreditCard, Lock } from 'lucide-react';
import { serviceRequestAPI, doctorAPI, businessAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getUrgencyColor, getStatusColor, getTimeElapsed } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';

export default function BusinessDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
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
    preferredDoctorId: null,
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [showHoursPopup, setShowHoursPopup] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [requestHours, setRequestHours] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 5;

  // Auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds refresh rate

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

  useEffect(() => {
    if (!autoRefresh || !user?.id) return;
    
    console.log('🔄 Setting up auto-refresh for business dashboard');
    
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing business dashboard data');
      fetchServiceRequests();
      fetchNearbyDoctors();
      setLastRefreshTime(new Date());
    }, AUTO_REFRESH_INTERVAL);
    
    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [autoRefresh, user?.id]);

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
      console.log('🔄 Fetching service requests for business:', user.id);
      const response = await serviceRequestAPI.getBusinessRequests(user.id);
      const requests = response.data || [];
      console.log('📋 Fetched service requests:', requests);
      console.log('🔍 Any paid requests?', requests.some(req => req.isPaid));
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
      // Get all available doctors instead of limiting by location radius
      const response = await doctorAPI.getAvailable({
        // Remove location filtering to show all available doctors
        // latitude: business.latitude,
        // longitude: business.longitude,
        // radius: 10
      });
      console.log('📍 Available doctors response:', response.data);
      setNearbyDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching available doctors:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleQuickServiceRequest = (doctor) => {
    setSelectedDoctor(doctor);
    setShowHoursPopup(true);
  };

  const handleSubmitQuickRequest = async () => {
    if (!selectedDoctor || !requestHours) {
      alert('Please specify the number of hours required.');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        businessId: user.id,
        doctorId: selectedDoctor.id,
        urgencyLevel: 'medium',
        serviceType: 'Medical Consultation',
        description: `Quick service request for ${requestHours} hour(s) with Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
        estimatedDuration: parseFloat(requestHours),
      };

      const response = await serviceRequestAPI.createDirectRequest(requestData);
      
      if (response.data) {
        alert(`Service request sent to Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName} for ${requestHours} hour(s)!`);
        setShowHoursPopup(false);
        setSelectedDoctor(null);
        setRequestHours(1);
        fetchServiceRequests(); // Refresh the requests list
      }
    } catch (error) {
      console.error('Error creating service request:', error);
      alert('Failed to send service request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this service request?');
    if (!confirmCancel) return;

    const reason = window.prompt('Please provide a reason for cancellation (optional):') || 'Cancelled by business';

    try {
      setLoading(true);
      const response = await serviceRequestAPI.cancel(requestId, reason);
      
      if (response.data) {
        alert('Service request cancelled successfully!');
        fetchServiceRequests(); // Refresh the requests list
      }
    } catch (error) {
      console.error('Error cancelling service request:', error);
      alert('Failed to cancel service request. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const handlePayment = (requestId, paymentMethod) => {
    const request = serviceRequests.find(r => r.id === requestId);
    if (!request) {
      alert('Service request not found.');
      return;
    }
    
    if (paymentMethod === 'cash') {
      handleCashPayment(request);
    } else {
      // Show card payment modal
      setPaymentRequest(request);
      setShowPaymentModal(true);
    }
  };
  
  const handleCashPayment = async (request) => {
    setLoading(true);
    try {
      const response = await serviceRequestAPI.processPayment(request.id, 'cash', {});
      console.log('💰 Cash Payment Response:', response.data);
      if (response.data) {
        alert(`Cash payment of ${formatCurrency(request.totalAmount)} processed successfully! The payment status has been updated.`);
        // Force update the request in the local state too
        setServiceRequests(prev => 
          prev.map(req => 
            req.id === request.id ? { ...req, isPaid: true, paymentMethod: 'cash' } : req
          )
        );
        // Also fetch fresh data from server
        fetchServiceRequests(); 
      }
    } catch (error) {
      console.error('Error processing cash payment:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePaymentSuccess = async () => {
    if (!paymentRequest) return;
    
    setShowPaymentModal(false);
    setLoading(true);
    
    try {
      const response = await serviceRequestAPI.processPayment(paymentRequest.id, 'card', {
        timestamp: new Date().toISOString(),
      });
      
      console.log('💳 Card Payment Response:', response.data);
      
      if (response.data) {
        alert(`Card payment of ${formatCurrency(paymentRequest.totalAmount)} processed successfully! The payment status has been updated.`);
        
        // Force update the request in the local state too
        setServiceRequests(prev => 
          prev.map(req => 
            req.id === paymentRequest.id ? { ...req, isPaid: true, paymentMethod: 'card' } : req
          )
        );
        
        // Also fetch fresh data from server
        fetchServiceRequests();
      }
    } catch (error) {
      console.error('Error processing card payment:', error);
      alert('Payment record failed. Please contact support.');
    } finally {
      setLoading(false);
      setPaymentRequest(null); // Clear payment request
    }
  };

  // Get business display data (either from backend or auth context)
  const business = businessData || user;
  const businessName = business?.businessName || business?.name || business?.email || 'Business';
  const contactName = business?.contactPersonName || `${business?.firstName || ''} ${business?.lastName || ''}`.trim() || 'Contact Person';

  // Calculate pagination indices and total pages
  const startIndex = (currentPage - 1) * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const totalPages = Math.ceil(serviceRequests.length / requestsPerPage);
  const currentRequests = serviceRequests.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll back to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Authentication check - redirect if not authenticated or not business
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user) {
        console.log('🚫 No authentication, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      if (user.role !== 'business') {
        console.log('🚫 Not business role, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      console.log('✅ Business authenticated, loading dashboard');
    }
  }, [authLoading, isAuthenticated, user]);

  // Log whenever service requests change
  useEffect(() => {
    if (serviceRequests.length > 0) {
      console.log('💼 Current service requests state:', serviceRequests);
      console.log('✅ Requests with isPaid:', serviceRequests.filter(req => req.isPaid).length);
    }
  }, [serviceRequests]);

  // Don't render anything if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'business') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 shadow-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-800 rounded-lg shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{businessName}</h1>
                <p className="text-gray-400">Welcome back, {contactName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowRequestForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Request Doctor</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-900/30 text-red-300 rounded-md hover:bg-red-800/50 transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Total Requests</p>
                    <p className="text-2xl font-bold text-white">{stats.totalRequests}</p>
                  </div>
                  <div className="bg-blue-900/30 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">Active Requests</p>
                    <p className="text-2xl font-bold text-white">{stats.activeRequests}</p>
                  </div>
                  <div className="bg-yellow-900/30 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-400 font-medium">Completed</p>
                    <p className="text-2xl font-bold text-white">{stats.completedRequests}</p>
                  </div>
                  <div className="bg-green-900/30 p-3 rounded-lg">
                    <User className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-400 font-medium">Total Spent</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalSpent)}</p>
                  </div>
                  <div className="bg-purple-900/30 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-900 rounded-lg shadow border border-gray-800 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-blue-900/30 p-2 rounded-lg">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Verified Available Doctors</h2>
                  <p className="text-sm text-blue-400 font-medium">({nearbyDoctors.length}) verified professionals</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">Choose from our network of verified healthcare professionals</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyDoctors.slice(0, 6).map((doctor) => (
                  <div key={doctor.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:shadow-lg hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </h4>
                        <p className="text-xs text-blue-400 font-medium bg-blue-900/20 px-2 py-1 rounded-md inline-block mt-1">{doctor.specialization}</p>
                        <p className="text-xs text-gray-300 mt-2">
                          💰 {formatCurrency(doctor.hourlyRate)}/hr • 🎓 {doctor.yearsOfExperience}y exp
                        </p>
                        <button
                          onClick={() => handleQuickServiceRequest(doctor)}
                          className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow"
                        >
                          Request Service
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {nearbyDoctors.length > 6 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-300">
                    {nearbyDoctors.length - 6} more doctors available in the sidebar →
                  </p>
                </div>
              )}
            </div>

            {/* Service Requests */}
            <div className="bg-gray-900 rounded-lg shadow border border-gray-800">
              <div className="p-6 border-b border-gray-800 bg-gray-900 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-900/30 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Recent Service Requests</h2>
                  </div>
                  {serviceRequests.length > 0 && (
                    <div className="text-sm text-gray-400">
                      Showing {startIndex + 1}-{Math.min(endIndex, serviceRequests.length)} of {serviceRequests.length} requests
                    </div>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-700">
                {serviceRequests.length > 0 ? (
                  currentRequests.map((request) => (
                    <div key={request.id} className="p-6 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgencyLevel)}`}>
                              {request.urgencyLevel.toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {request.status === 'pending' && (
                              <span className="px-2 py-1 bg-orange-900/30 text-orange-300 rounded-full text-xs font-medium">
                                ⏱️ {getTimeElapsed(request.requestedAt)}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-white mb-1">{request.serviceType}</h3>
                          <p className="text-gray-300 text-sm mb-2">{request.description}</p>
                          <p className="text-xs text-gray-400">
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                          {request.doctor && (
                            <div>
                              <p className="text-xs text-blue-400 font-medium">
                                Doctor: Dr. {request.doctor.firstName} {request.doctor.lastName}
                              </p>
                              
                              {/* Show doctor contact info when request is accepted */}
                              {request.status === 'accepted' && request.doctor.phone && (
                                <div className="mt-2 p-3 bg-blue-900/10 border border-blue-800 rounded-lg">
                                  <h4 className="font-semibold text-blue-300 text-xs mb-2">Doctor Contact Information:</h4>
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Phone className="h-3 w-3 text-blue-400" />
                                    <a href={`tel:${request.doctor.phone}`} className="text-blue-400 hover:underline text-xs">
                                      {request.doctor.phone}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              disabled={loading}
                              className="px-3 py-2 bg-red-900/30 text-red-300 rounded-lg hover:bg-red-900/50 transition-colors text-xs font-medium flex items-center space-x-1 border border-red-700"
                            >
                              <X className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                          {request.totalAmount && request.status === 'completed' && request.isPaid === false && (
                            <div className="bg-green-900/20 px-3 py-2 rounded-lg flex flex-col items-end">
                              <span className="font-semibold text-green-400 mb-2">{formatCurrency(request.totalAmount)}</span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handlePayment(request.id, 'cash')}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium flex items-center"
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Pay Cash
                                </button>
                                <button
                                  onClick={() => handlePayment(request.id, 'card')}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center"
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Pay Card
                                </button>
                              </div>
                            </div>
                          )}
                          {request.totalAmount && request.status === 'completed' && request.isPaid === true && (
                            <div className="bg-emerald-900/20 px-3 py-2 rounded-lg flex flex-col items-end">
                              <span className="font-semibold text-emerald-400 mb-1">{formatCurrency(request.totalAmount)}</span>
                              <div className="flex items-center space-x-1 bg-emerald-900/30 px-2 py-1 rounded text-xs text-emerald-400">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Paid ({request.paymentMethod === 'cash' ? 'Cash' : 'Card'})
                              </div>
                            </div>
                          )}
                          {request.totalAmount && request.status !== 'completed' && (
                            <div className="bg-green-900/20 px-3 py-2 rounded-lg">
                              <span className="font-semibold text-green-400">{formatCurrency(request.totalAmount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="bg-gray-800/50 rounded-lg p-6">
                      <Clock className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                      <p className="text-lg font-medium mb-2 text-gray-300">No service requests yet</p>
                      <p className="text-sm text-gray-400">Click "Request Doctor" to get started with your first consultation.</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Pagination Controls */}
              {serviceRequests.length > requestsPerPage && (
                <div className="p-4 border-t border-gray-800 bg-gray-800/50 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <div className="flex space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Info */}
            <div className="bg-gray-900 rounded-lg shadow border border-gray-800 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-indigo-900/30 p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Business Information</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-200">Name:</span>
                  <span className="text-white font-semibold">{businessName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-200">Contact:</span>
                  <span className="text-white font-semibold">{contactName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-200">Email:</span>
                  <span className="text-white font-semibold">{business?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-200">Type:</span>
                  <span className="text-indigo-400 font-semibold">{business?.businessType || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-200">Address:</span>
                  <span className="text-white font-semibold text-right">{business?.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-green-900/20 px-3 rounded-lg mt-4">
                  <span className="font-medium text-green-300">Total Spent:</span>
                  <span className="text-green-300 font-bold text-lg">{formatCurrency(stats.totalSpent)}</span>
                </div>
              </div>
            </div>

            {/* Available Doctors */}
            <div className="bg-gray-900 rounded-lg shadow border border-gray-800 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-900/30 p-2 rounded-lg">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Verified Available Doctors</h3>
              </div>
              <div className="space-y-3 text-sm max-h-96 overflow-y-auto pr-2">
                {nearbyDoctors.length > 0 ? (
                  nearbyDoctors.map((doctor) => (
                    <div key={doctor.id} className="py-3 border-b border-gray-800 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm">
                            Dr. {doctor.firstName} {doctor.lastName}
                          </h4>
                          <p className="text-blue-300 font-medium text-xs">{doctor.specialization}</p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                            ✅ Available
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
                            🔒 Verified
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-200 text-xs">Experience:</span>
                        <span className="text-white font-semibold text-xs">{doctor.yearsOfExperience} years</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-200 text-xs">Rate:</span>
                        <span className="text-white font-semibold text-xs">{formatCurrency(doctor.hourlyRate)}/hour</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-200 text-xs">Location:</span>
                        <span className="text-white font-semibold text-xs text-right">{doctor.city}, {doctor.state}</span>
                      </div>
                      {doctor.bio && (
                        <div className="bg-gray-700/50 px-3 py-2 rounded-lg mt-2">
                          <p className="text-xs text-gray-300 italic">"{doctor.bio}"</p>
                        </div>
                      )}
                      {doctor.languages && doctor.languages.length > 0 && (
                        <div className="bg-green-900/20 px-3 py-2 rounded-lg mt-2">
                          <span className="font-medium text-green-300 text-xs">Languages:</span>
                          <span className="text-green-300 font-semibold text-xs ml-2">{doctor.languages.join(', ')}</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleQuickServiceRequest(doctor)}
                        className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow"
                      >
                        Request Service
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gray-800/50 rounded-lg p-6">
                      <User className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                      <p className="text-lg font-medium mb-2 text-gray-300">No verified doctors available</p>
                      <p className="text-sm text-gray-400">Our doctors are currently busy or under verification. Please check back later.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow max-w-md w-full border border-gray-800">
            <div className="p-6 border-b border-gray-800 bg-gray-900 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-900/30 p-2 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Request a Doctor</h2>
              </div>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Service Type *
                </label>
                <input
                  type="text"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Emergency consultation, Health checkup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preferred Doctor
                </label>
                <select
                  name="preferredDoctorId"
                  value={formData.preferredDoctorId || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Any available doctor</option>
                  {nearbyDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization} (${doctor.hourlyRate}/hr)
                    </option>
                  ))}
                </select>
                {formData.preferredDoctorId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Selected: Dr. {nearbyDoctors.find(d => d.id == formData.preferredDoctorId)?.firstName} {nearbyDoctors.find(d => d.id == formData.preferredDoctorId)?.lastName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Urgency Level *
                </label>
                <select
                  name="urgencyLevel"
                  value={formData.urgencyLevel}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what kind of medical assistance you need (optional)"
                />
              </div>                <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    setFormData({
                      urgencyLevel: 'medium',
                      serviceType: '',
                      description: '',
                      estimatedDuration: 1,
                      preferredDoctorId: null,
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow"
                >
                  {loading ? 'Requesting...' : 'Request Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hours Input Popup */}
      {showHoursPopup && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow max-w-md w-full border border-gray-800">
            <div className="p-6 border-b border-gray-800 bg-gray-900 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-900/30 p-2 rounded-lg">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Request Service</h2>
                  <p className="text-sm text-blue-400 font-medium">
                    Dr. {selectedDoctor.firstName} {selectedDoctor.lastName} - {selectedDoctor.specialization}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How many hours of service do you need? *
                </label>
                <input
                  type="number"
                  value={requestHours}
                  onChange={(e) => setRequestHours(e.target.value)}
                  min="0.5"
                  max="24"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter hours (e.g., 2, 3.5, 8)"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Estimated cost: {formatCurrency((selectedDoctor.hourlyRate || 0) * (parseFloat(requestHours) || 0))}
                </p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center">
                  <div className="bg-blue-900/50 p-1 rounded mr-2">
                    <Clock className="h-4 w-4 text-blue-300" />
                  </div>
                  Service Details:
                </h4>
                <p className="text-xs text-gray-200 mb-1">• Medical consultation with verified doctor</p>
                <p className="text-xs text-gray-200 mb-1">• Professional healthcare service</p>
                <p className="text-xs text-blue-300 font-medium">• Rate: {formatCurrency(selectedDoctor.hourlyRate || 0)}/hour</p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowHoursPopup(false);
                    setSelectedDoctor(null);
                    setRequestHours(1);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuickRequest}
                  disabled={loading || !requestHours || parseFloat(requestHours) <= 0}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow"
                >
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}              {showPaymentModal && paymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow max-w-md w-full border border-gray-800 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-800 bg-gray-900 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-900/30 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Payment for Service</h2>
              </div>
            </div>
            <div className="p-6 overflow-y-auto modal-scrollable">
              <div className="mb-6 bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Service Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Service:</span>
                    <span className="text-white font-medium">{paymentRequest.serviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Doctor:</span>
                    <span className="text-white font-medium">
                      {paymentRequest.doctor ? `Dr. ${paymentRequest.doctor.firstName} ${paymentRequest.doctor.lastName}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Duration:</span>
                    <span className="text-white font-medium">{paymentRequest.estimatedDuration} hour(s)</span>
                  </div>
                  <div className="flex justify-between mt-4">
                    <span className="text-blue-400 font-semibold">Amount Due:</span>
                    <span className="text-blue-400 font-bold text-xl">{formatCurrency(paymentRequest.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-800 rounded-lg p-4 bg-gray-800/50">
                  <h4 className="text-gray-200 font-medium mb-3">Card Information</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Name on Card</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-gray-300">Your payment information is encrypted and secure</span>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentRequest(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSuccess}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow flex items-center justify-center"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Pay {formatCurrency(paymentRequest.totalAmount)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
