'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Clock, User, MapPin, DollarSign, LogOut, X, Phone, CreditCard, Lock } from 'lucide-react';
import { serviceRequestAPI, doctorAPI, businessAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getStatusColor, getTimeElapsed } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function BusinessDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { isDarkMode } = useTheme();
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
  const [quickRequestServiceType, setQuickRequestServiceType] = useState('');
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
    if (!selectedDoctor || !requestHours || !quickRequestServiceType) {
      alert('Please specify the service type and number of hours required.');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        businessId: user.id,
        doctorId: selectedDoctor.id,
        urgencyLevel: 'medium',
        serviceType: quickRequestServiceType,
        description: `${quickRequestServiceType} service request for ${requestHours} hour(s) with Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
        estimatedDuration: parseFloat(requestHours),
      };

      const response = await serviceRequestAPI.createDirectRequest(requestData);
      
      if (response.data) {
        alert(`Service request sent to Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName} for ${requestHours} hour(s)!`);
        setShowHoursPopup(false);
        setSelectedDoctor(null);
        setRequestHours(1);
        setQuickRequestServiceType('');
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
        urgencyLevel: 'medium', // Default urgency level since we removed it from UI
        estimatedDuration: parseInt(formData.estimatedDuration),
      };

      const response = await serviceRequestAPI.createServiceRequest(requestData);
      
      if (response.data) {
        alert(`Service request created successfully! ${response.data.notifiedDoctors} nearby doctors have been notified.`);
        setShowRequestForm(false);
        setFormData({
          serviceType: '',
          description: '',
          estimatedDuration: 1,
          preferredDoctorId: null,
        });
        console.log('🔄 Manually refreshing after creating service request');
        await fetchServiceRequests();
        await fetchNearbyDoctors(); // Also refresh doctors in case availability changed
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
        // Also fetch fresh data from server immediately regardless of auto-refresh
        console.log('🔄 Manually refreshing after cash payment');
        await fetchServiceRequests(); 
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
        
        // Also fetch fresh data from server immediately regardless of auto-refresh
        console.log('🔄 Manually refreshing after card payment');
        await fetchServiceRequests();
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
    <div className={`min-h-screen transition-colors ${
      isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`shadow-md transition-colors ${
        isDarkMode 
          ? 'bg-gray-900 border-b border-gray-800' 
          : 'bg-white border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-800 rounded-lg shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{businessName}</h1>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Welcome back, {contactName}
                </p>
              </div>
            </div>
            
            {/* Desktop controls */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Auto-refresh indicator */}
              <div className={`flex items-center px-2 py-1 rounded-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <div className={`flex items-center mr-2 ${
                  autoRefresh 
                    ? 'text-blue-400' 
                    : isDarkMode ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  <svg className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs">{autoRefresh ? 'Auto-updating' : 'Updates paused'}</span>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-xs px-2 py-0.5 rounded ${autoRefresh ? 'bg-blue-700 text-blue-100' : 'bg-gray-700 text-gray-300'}`}
                >
                  {autoRefresh ? 'Disable' : 'Enable'}
                </button>
              </div>
              
              <button
                onClick={() => setShowRequestForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Request Doctor</span>
              </button>
              <button
                onClick={handleLogout}
                className={`px-4 py-2 ${isDarkMode ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50' : 'bg-red-600 text-white hover:bg-red-700'} rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow`}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => {
                  const mobileMenu = document.getElementById('mobile-menu-business');
                  if (mobileMenu) {
                    mobileMenu.classList.toggle('hidden');
                  }
                }}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile menu */}
          <div id="mobile-menu-business" className="md:hidden mt-4 hidden">
            <div className="space-y-2 py-3">
              <div className="flex items-center px-2 py-1 bg-gray-800 rounded-md">
                <div className={`flex items-center mr-2 ${autoRefresh ? 'text-blue-400' : 'text-gray-500'}`}>
                  <svg className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs">{autoRefresh ? 'Auto-updating' : 'Updates paused'}</span>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-xs px-2 py-0.5 rounded ${autoRefresh ? 'bg-blue-700 text-blue-100' : 'bg-gray-700 text-gray-300'}`}
                >
                  {autoRefresh ? 'Disable' : 'Enable'}
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowRequestForm(true);
                  const mobileMenu = document.getElementById('mobile-menu-business');
                  if (mobileMenu) mobileMenu.classList.add('hidden');
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Request Doctor</span>
              </button>
              <button
                onClick={handleLogout}
                className={`w-full px-4 py-2 ${isDarkMode ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50' : 'bg-red-600 text-white hover:bg-red-700'} rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow`}
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
              <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-800' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Total Requests</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.totalRequests}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'
                  }`}>
                    <Clock className={`h-6 w-6 ${
                      isDarkMode ? 'text-blue-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </div>
              <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-800' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">Active Requests</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.activeRequests}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-600'
                  }`}>
                    <Clock className={`h-6 w-6 ${
                      isDarkMode ? 'text-yellow-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </div>
              <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-800' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-400 font-medium">Completed</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.completedRequests}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-green-900/30' : 'bg-green-600'
                  }`}>
                    <User className={`h-6 w-6 ${
                      isDarkMode ? 'text-green-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </div>
              <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-800' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-400 font-medium">Total Spent</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{formatCurrency(stats.totalSpent)}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-purple-900/30' : 'bg-purple-600'
                  }`}>
                    <User className={`h-6 w-6 ${
                      isDarkMode ? 'text-purple-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`rounded-lg shadow border p-6 ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-800' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-4">
                <div className={`p-2 rounded-lg ${
                  isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'
                }`}>
                  <User className={`h-5 w-5 ${
                    isDarkMode ? 'text-blue-400' : 'text-white'
                  }`} />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Verified Available Doctors</h2>
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>({nearbyDoctors.length}) verified professionals</p>
                </div>
              </div>
              <p className={`text-sm mb-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Choose from our network of verified healthcare professionals</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyDoctors.slice(0, 6).map((doctor) => (
                  <div key={doctor.id} className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-lg ${
                    isDarkMode 
                      ? 'bg-gray-900 border-gray-800 hover:border-gray-700' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'
                      }`}>
                        <User className={`h-5 w-5 ${
                          isDarkMode ? 'text-blue-400' : 'text-white'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Dr. {doctor.firstName} {doctor.lastName}
                        </h4>
                        <p className={`text-xs font-medium px-2 py-1 rounded-md inline-block mt-1 ${
                          isDarkMode 
                            ? 'text-blue-400 bg-blue-900/20' 
                            : 'text-blue-600 bg-blue-50'
                        }`}>{doctor.specialization}</p>
                        <p className={`text-xs mt-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
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
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                      <Clock className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                    </div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Service Requests</h2>
                  </div>
                  {serviceRequests.length > 0 && (
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Showing {startIndex + 1}-{Math.min(endIndex, serviceRequests.length)} of {serviceRequests.length} requests
                    </div>
                  )}
                </div>
              </div>
              <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {serviceRequests.length > 0 ? (
                  currentRequests.map((request) => (
                    <div key={request.id} className={`p-6 ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status, isDarkMode)}`}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {request.status === 'pending' && (
                              <span className="px-3 py-1.5 bg-orange-600 text-white rounded-full text-xs font-bold shadow-sm">
                                ⏱️ {getTimeElapsed(request.requestedAt)}
                              </span>
                            )}
                          </div>
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{request.serviceType}</h3>
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mb-2`}>{request.description}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                          {request.doctor && (
                            <div>
                              <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                                Doctor: Dr. {request.doctor.firstName} {request.doctor.lastName}
                              </p>
                              
                              {/* Show doctor contact info when request is accepted */}
                              {request.status === 'accepted' && request.doctor.phone && (
                                <div className={`mt-2 p-3 ${isDarkMode ? 'bg-blue-900/10 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                                  <h4 className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} text-xs mb-2`}>Doctor Contact Information:</h4>
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Phone className={`h-3 w-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                    <a href={`tel:${request.doctor.phone}`} className={`${isDarkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'} text-xs`}>
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
                              className={`px-3 py-2 ${isDarkMode ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50 border-red-700' : 'bg-red-600 text-white hover:bg-red-700 border-red-600'} rounded-lg transition-colors text-xs font-medium flex items-center space-x-1 border`}
                            >
                              <X className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                          {request.totalAmount && request.status === 'completed' && request.isPaid === false && (
                            <div className={`${isDarkMode ? 'bg-green-900/20' : 'bg-green-100'} px-3 py-2 rounded-lg flex flex-col items-end`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'} mb-2`}>{formatCurrency(request.totalAmount)}</span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handlePayment(request.id, 'cash')}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium flex items-center"
                                >
                                  Pay Cash
                                </button>
                                <button
                                  onClick={() => handlePayment(request.id, 'card')}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center"
                                >
                                  Pay Card
                                </button>
                              </div>
                            </div>
                          )}
                          {request.totalAmount && request.status === 'completed' && request.isPaid === true && (
                            <div className={`${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'} px-3 py-2 rounded-lg flex flex-col items-end`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>{formatCurrency(request.totalAmount)}</span>
                              <div className="flex items-center space-x-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                                PAID ({request.paymentMethod === 'cash' ? 'CASH' : 'CARD'})
                              </div>
                            </div>
                          )}
                          {request.totalAmount && request.status !== 'completed' && (
                            <div className={`${isDarkMode ? 'bg-green-900/20' : 'bg-green-100'} px-3 py-2 rounded-lg`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>{formatCurrency(request.totalAmount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-6`}>
                      <Clock className={`h-12 w-12 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                      <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No service requests yet</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Click "Request Doctor" to get started with your first consultation.</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Pagination Controls */}
              {serviceRequests.length > requestsPerPage && (
                <div className={`p-4 border-t ${isDarkMode ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'} rounded-b-lg`}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} order-2 sm:order-1`}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2 order-1 sm:order-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 text-sm font-medium ${isDarkMode ? 'text-gray-400 bg-gray-800 border-gray-600 hover:bg-gray-700' : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50'} border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                      >
                        Previous
                      </button>
                      <div className="flex space-x-1 overflow-x-auto max-w-sm scrollbar-hide">
                        {(() => {
                          const maxVisiblePages = 3; // Reduced for better mobile experience
                          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          
                          // Adjust start page if we're near the end
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          const pages = [];
                          
                          // Add first page and ellipsis if needed
                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                onClick={() => handlePageChange(1)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === 1
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : isDarkMode 
                                      ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700'
                                      : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                1
                              </button>
                            );
                            
                            if (startPage > 2) {
                              pages.push(
                                <span key="ellipsis1" className={`px-2 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ...
                                </span>
                              );
                            }
                          }
                          
                          // Add visible page range
                          for (let i = startPage; i <= endPage; i++) {
                            if (i !== 1 && i !== totalPages) {
                              pages.push(
                                <button
                                  key={i}
                                  onClick={() => handlePageChange(i)}
                                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    currentPage === i
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : isDarkMode 
                                        ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700'
                                        : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {i}
                                </button>
                              );
                            }
                          }
                          
                          // Add ellipsis and last page if needed
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="ellipsis2" className={`px-2 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ...
                                </span>
                              );
                            }
                            
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => handlePageChange(totalPages)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === totalPages
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : isDarkMode 
                                      ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700'
                                      : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {totalPages}
                              </button>
                            );
                          }
                          
                          return pages;
                        })()}
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 text-sm font-medium ${isDarkMode ? 'text-gray-400 bg-gray-800 border-gray-600 hover:bg-gray-700' : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50'} border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
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
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border p-6`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-600'} p-2 rounded-lg`}>
                  <Building2 className={`h-5 w-5 ${isDarkMode ? 'text-indigo-400' : 'text-white'}`} />
                </div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Business Information</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Name:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{businessName}</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Contact:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{contactName}</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Email:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{business?.email || 'N/A'}</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Type:</span>
                  <span className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} font-semibold`}>{business?.businessType || 'N/A'}</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Address:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-right`}>{business?.address || 'N/A'}</span>
                </div>
                <div className={`flex justify-between items-center py-2 ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} px-3 rounded-lg mt-4`}>
                  <span className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Total Spent:</span>
                  <span className={`${isDarkMode ? 'text-green-300' : 'text-green-700'} font-bold text-lg`}>{formatCurrency(stats.totalSpent)}</span>
                </div>
              </div>
            </div>

            {/* Available Doctors */}
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border p-6`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                  <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Verified Available Doctors</h3>
              </div>
              <div className="space-y-3 text-sm max-h-96 overflow-y-auto pr-2">
                {nearbyDoctors.length > 0 ? (
                  nearbyDoctors.map((doctor) => (
                    <div key={doctor.id} className={`py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} last:border-b-0`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>
                            Dr. {doctor.firstName} {doctor.lastName}
                          </h4>
                          <p className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-medium text-xs`}>{doctor.specialization}</p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                            ✅ Available
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            🔒 Verified
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'} text-xs`}>Experience:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-xs`}>{doctor.yearsOfExperience} years</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'} text-xs`}>Rate:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-xs`}>{formatCurrency(doctor.hourlyRate)}/hour</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'} text-xs`}>Location:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-xs text-right`}>{doctor.city}, {doctor.state}</span>
                      </div>
                      {doctor.bio && (
                        <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'} px-3 py-2 rounded-lg mt-2`}>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} italic`}>"{doctor.bio}"</p>
                        </div>
                      )}
                      {doctor.languages && doctor.languages.length > 0 && (
                        <div className={`${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} px-3 py-2 rounded-lg mt-2`}>
                          <span className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'} text-xs`}>Languages:</span>
                          <span className={`${isDarkMode ? 'text-green-300' : 'text-green-700'} font-semibold text-xs ml-2`}>{doctor.languages.join(', ')}</span>
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
                    <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-6`}>
                      <User className={`h-12 w-12 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                      <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No verified doctors available</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Our doctors are currently busy or under verification. Please check back later.</p>
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
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-md w-full border`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center space-x-3">
                <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                  <Plus className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Request a Doctor</h2>
              </div>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Service Type *
                </label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="">Select service type</option>
                  <option value="In Person">In Person</option>
                  <option value="Online">Online</option>
                  <option value="NHS">NHS</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Preferred Doctor
                </label>
                <select
                  name="preferredDoctorId"
                  value={formData.preferredDoctorId || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="">Any available doctor</option>
                  {nearbyDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization} ({formatCurrency(doctor.hourlyRate)}/hr)
                    </option>
                  ))}
                </select>
                {formData.preferredDoctorId && (
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    Selected: Dr. {nearbyDoctors.find(d => d.id == formData.preferredDoctorId)?.firstName} {nearbyDoctors.find(d => d.id == formData.preferredDoctorId)?.lastName}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
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
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
                  className={`flex-1 px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
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
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-md w-full border`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center space-x-3">
                <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                  <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Request Service</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                    Dr. {selectedDoctor.firstName} {selectedDoctor.lastName} - {selectedDoctor.specialization}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Service Type *
                </label>
                <select
                  value={quickRequestServiceType}
                  onChange={(e) => setQuickRequestServiceType(e.target.value)}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  required
                >
                  <option value="">Select service type</option>
                  <option value="In Person">In Person</option>
                  <option value="Online">Online</option>
                  <option value="NHS">NHS</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  How many hours of service do you need? *
                </label>
                <input
                  type="number"
                  value={requestHours}
                  onChange={(e) => setRequestHours(e.target.value)}
                  min="0.5"
                  max="24"
                  step="0.5"
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Enter hours (e.g., 2, 3.5, 8)"
                />
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                  Estimated cost: {formatCurrency((selectedDoctor.hourlyRate || 0) * (parseFloat(requestHours) || 0))}
                </p>
              </div>
              <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'} p-4 rounded-lg border`}>
                <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2 flex items-center`}>
                  <div className={`${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'} p-1 rounded mr-2`}>
                    <Clock className={`h-4 w-4 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                  </div>
                  Service Details:
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-1`}>• Medical consultation with verified doctor</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-1`}>• Professional healthcare service</p>
                <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-medium`}>• Rate: {formatCurrency(selectedDoctor.hourlyRate || 0)}/hour</p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowHoursPopup(false);
                    setSelectedDoctor(null);
                    setRequestHours(1);
                    setQuickRequestServiceType('');
                  }}
                  className={`flex-1 px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuickRequest}
                  disabled={loading || !requestHours || parseFloat(requestHours) <= 0 || !quickRequestServiceType}
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
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-md w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center space-x-3">
                <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                  <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment for Service</h2>
              </div>
            </div>
            <div className="p-6 overflow-y-auto modal-scrollable">
              <div className={`mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Service Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Service:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{paymentRequest.serviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Doctor:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                      {paymentRequest.doctor ? `Dr. ${paymentRequest.doctor.firstName} ${paymentRequest.doctor.lastName}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Duration:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{paymentRequest.estimatedDuration} hour(s)</span>
                  </div>
                  <div className="flex justify-between mt-4">
                    <span className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>Amount Due:</span>
                    <span className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-bold text-xl`}>{formatCurrency(paymentRequest.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`border ${isDarkMode ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'} rounded-lg p-4`}>
                  <h4 className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} font-medium mb-3`}>Card Information</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Name on Card</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>
                </div>
                
                <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} p-3 rounded-lg border flex items-center space-x-2`}>
                  <Lock className="h-4 w-4 text-green-400" />
                  <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Your payment information is encrypted and secure</span>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentRequest(null);
                  }}
                  className={`flex-1 px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
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
