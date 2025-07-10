'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Clock, Building2, MapPin, DollarSign, Check, X, LogOut, Phone } from 'lucide-react';
import { serviceRequestAPI, doctorAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getUrgencyColor, getStatusColor } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const [doctorData, setDoctorData] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track which request is being processed
  const [isAvailable, setIsAvailable] = useState(true);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    myRequests: 0,
    completedRequests: 0,
    totalEarnings: 0
  });

  // Authentication check - redirect if not authenticated or not doctor
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user) {
        console.log('🚫 No authentication, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      if (user.role !== 'doctor') {
        console.log('🚫 Not doctor role, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      console.log('✅ Doctor authenticated, loading dashboard');
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    console.log('🏠 Dashboard useEffect - User:', user);
    console.log('🆔 User ID:', user?.id);
    console.log('📧 User email:', user?.email);
    console.log('👤 Full user object:', JSON.stringify(user, null, 2));
    
    if (user?.id) {
      fetchDoctorData();
      fetchNearbyRequests();
    }
  }, [user]);
  
  // Fetch completed requests after getting available requests to ensure proper stats calculation
  useEffect(() => {
    if (user?.id) {
      fetchMyRequests();
    }
  }, [user, serviceRequests]);

  const fetchDoctorData = async () => {
    try {
      console.log('🔍 Fetching doctor data for ID:', user.id);
      console.log('🔍 User object keys:', Object.keys(user));
      console.log('🔍 User ID type:', typeof user.id);
      console.log('🔍 User ID value:', JSON.stringify(user.id));
      
      const response = await doctorAPI.getById(user.id);
      console.log('📡 Doctor API response:', response);
      
      if (response.data?.data) {
        const doctor = response.data.data;
        console.log('✅ Doctor data received:', doctor);
        console.log('👤 Doctor ID from backend:', doctor.id);
        console.log('📧 Doctor email from backend:', doctor.email);
        setDoctorData(doctor);
        setIsAvailable(doctor.isAvailable || false);
      } else {
        console.log('⚠️ No doctor data in response, falling back to user data');
        setDoctorData(user);
      }
    } catch (error) {
      console.error('❌ Error fetching doctor data:', error);
      console.error('❌ Error details:', error.response?.data);
      console.log('🔄 Falling back to user data from auth context');
      // Fallback to user data from auth context
      setDoctorData(user);
    }
  };

  const fetchNearbyRequests = async () => {
    try {
      // Get available requests for this specific doctor (unassigned or assigned to them)
      const response = await serviceRequestAPI.getAvailableRequests(user.id);
      const availableRequests = response.data || [];
      console.log('🔍 Available requests:', availableRequests);
      console.log('📊 Request statuses:', availableRequests.map(req => req.status));
      setServiceRequests(availableRequests);
      
      // Update stats - count only pending requests as "pending"
      const pendingCount = availableRequests.filter(req => req.status === 'pending').length;
      
      setStats(prev => ({
        ...prev,
        pendingRequests: pendingCount
      }));
    } catch (error) {
      console.error('Error fetching available requests:', error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await serviceRequestAPI.getDoctorRequests(user.id);
      const doctorRequests = response.data || [];
      console.log('👨‍⚕️ Doctor requests:', doctorRequests);
      console.log('📊 Doctor request statuses:', doctorRequests.map(req => req.status));
      setMyRequests(doctorRequests);
      
      // Also fetch stats from backend
      try {
        const statsResponse = await doctorAPI.getStats(user.id);
        if (statsResponse.data?.data) {
          setStats(prev => ({
            ...prev,
            ...statsResponse.data.data
          }));
        }
      } catch (statsError) {
        console.error('Error fetching stats from backend:', statsError);
        // Fallback to calculating stats from available and completed requests
        const totalEarnings = completedRequests.reduce((sum, req) => sum + (req.totalAmount || 0), 0);
        
        // We'll count accepted requests from serviceRequests
        const acceptedRequests = serviceRequests.filter(req => req.status === 'accepted' && req.doctor?.id === user.id);
        
        setStats(prev => ({
          ...prev,
          myRequests: acceptedRequests.length + completedRequests.length,
          completedRequests: completedRequests.length,
          totalEarnings
        }));
      }
    } catch (error) {
      console.error('Error fetching completed requests:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setActionLoading(requestId);
    try {
      const response = await serviceRequestAPI.acceptRequest(requestId, user.id);
      if (response.data) {
        alert('Service request accepted successfully!');
        fetchNearbyRequests();
        fetchMyRequests();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request. It may have already been taken by another doctor.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Please provide a reason for rejecting this request (optional):');
    if (reason === null) return; // User cancelled

    setActionLoading(requestId);
    try {
      const response = await serviceRequestAPI.rejectRequest(requestId, user.id, reason);
      if (response.data) {
        alert('Service request rejected successfully!');
        fetchNearbyRequests();
        fetchMyRequests();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // State for the completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionRequest, setCompletionRequest] = useState(null);
  const [completionAmount, setCompletionAmount] = useState(0);

  const handleCompleteRequest = async (requestId) => {
    // Get the request details first
    const request = serviceRequests.find(r => r.id === requestId) || myRequests.find(r => r.id === requestId);
    if (!request) {
      alert('Service request not found.');
      return;
    }
    
    console.log('🩺 Request to complete:', JSON.stringify(request, null, 2));
    console.log('🩺 Current request status:', request.status);
    console.log('🩺 Request ID:', requestId);
    console.log('🩺 Doctor ID:', request.doctor?.id);
    
    // Check if the request is in the correct state to be completed
    if (request.status !== 'accepted' && request.status !== 'in_progress') {
      alert(`Cannot complete request with status: ${request.status}. The request must be in 'accepted' or 'in_progress' state.`);
      return;
    }
    
    // Double check the status by fetching the latest data
    try {
      const freshResponse = await serviceRequestAPI.getById(requestId);
      const freshRequest = freshResponse.data?.data;
      
      if (freshRequest && (freshRequest.status !== 'accepted' && freshRequest.status !== 'in_progress')) {
        alert(`Cannot complete request with current status: ${freshRequest.status}. The request must be in 'accepted' or 'in_progress' state.`);
        console.log('❌ Request completion failed - incorrect status after refresh:', freshRequest.status);
        return;
      }
      console.log('✅ Fresh request status verified:', freshRequest?.status);
    } catch (error) {
      console.error('❌ Error fetching fresh request data:', error);
      // Continue anyway as we already have the request data
    }
    
    // Calculate payment amount based on hourly rate and duration
    const hours = request.estimatedDuration || 1;
    const hourlyRate = doctorData?.hourlyRate || 50;
    const paymentAmount = hours * hourlyRate;
    
    // Show the completion modal instead of multiple popups
    setCompletionRequest(request);
    setCompletionAmount(paymentAmount);
    setCompletionNotes('');
    setShowCompletionModal(true);
  };
  
  // Function to handle the actual completion after modal confirmation
  const handleConfirmCompletion = async () => {
    if (!completionRequest) return;
    
    setShowCompletionModal(false);
    setActionLoading(completionRequest.id);
    
    try {
      console.log('🚀 Sending complete request to API for ID:', completionRequest.id);
      const response = await serviceRequestAPI.completeRequest(completionRequest.id, completionNotes);
      console.log('✅ Complete request API response:', response);
      
      if (response.data) {
        // Show a single success notification
        alert(`Service completed successfully! Expected payment: ${formatCurrency(completionAmount)}`);
        
        // Refresh data to update the UI
        console.log('🔄 Refreshing data after successful completion');
        await fetchNearbyRequests();
        await fetchMyRequests();
      }
    } catch (error) {
      console.error('❌ Error completing request:', error);
      console.error('❌ Error response:', error.response?.data);
      
      // Get detailed error message if available
      const errorMessage = error.response?.data?.error?.message || 'Failed to complete request. Please try again.';
      
      alert(`Failed to complete request: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
      
      // Log additional details that might help debug
      console.log('📊 Current request data:', JSON.stringify(completionRequest, null, 2));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAvailabilityToggle = async () => {
    try {
      const newAvailability = !isAvailable;
      await doctorAPI.updateAvailability(user.id, newAvailability);
      setIsAvailable(newAvailability);
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Get doctor display data (either from backend or auth context)
  const doctor = doctorData || user;
  const doctorName = doctor?.name || `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim() || doctor?.email || 'Doctor';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'doctor') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-md modal-scrollable">
            <h3 className="text-xl font-bold text-white mb-4">Complete Service Request</h3>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 mb-2">Expected Payment</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(completionAmount)}</p>
              <p className="text-sm text-gray-400 mt-1">
                After completion, the business will be prompted to make payment.
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                rows="3"
                placeholder="Add any notes about the service provided..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompletion}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
              >
                Complete Request
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Header */}
      <header className="bg-gray-900 shadow-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-800 rounded-lg shadow-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Dr. {doctorName}
                </h1>
                <p className="text-gray-400">{doctor.specialization || 'Medical Professional'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification counter */}
              {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 0 && (
                <div className="relative">
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length}
                  </span>
                  <span className="absolute animate-ping h-5 w-5 rounded-full bg-red-400 opacity-75"></span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Available:</span>
                <button
                  onClick={handleAvailabilityToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
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
                    <p className="text-sm text-yellow-400 font-medium">Pending Requests</p>
                    <p className="text-2xl font-bold text-white">{stats.pendingRequests}</p>
                  </div>
                  <div className="bg-yellow-900/30 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-400 font-medium">My Requests</p>
                    <p className="text-2xl font-bold text-white">{stats.myRequests}</p>
                  </div>
                  <div className="bg-blue-900/30 p-3 rounded-lg">
                    <Stethoscope className="h-6 w-6 text-blue-400" />
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
                    <Check className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-800 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-400 font-medium">Hourly Rate</p>
                    <p className="text-2xl font-bold text-white">
                      ${doctor.hourlyRate || 0}
                    </p>
                  </div>
                  <div className="bg-purple-900/30 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Available Requests */}
            <div className="bg-gray-900 rounded-lg shadow border border-gray-800">
              <div className="p-6 border-b border-gray-800 bg-gray-900 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-900/30 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Available Service Requests</h2>
                      <p className="text-sm text-blue-300 font-medium">Nearby businesses needing medical assistance</p>
                    </div>
                  </div>
                  {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 0 && (
                    <div className="relative">
                      <span className="absolute -right-1 -top-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-400 border border-yellow-700">
                        🔔 {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length} New Request{serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 1 ? 's' : ''}
                      </span>
                      </div>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-700">
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <div key={request.id} className={`p-6 hover:bg-gray-700/50 transition-colors ${request.status === 'accepted' ? 'bg-green-900/10 border-l-4 border-green-400' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {request.status === 'accepted' && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-900/30 text-green-400 border border-green-700">
                                ACCEPTED
                              </span>
                            )}
                            {request.urgencyLevel && request.urgencyLevel !== 'medium' && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgencyLevel)}`}>
                                {request.urgencyLevel.toUpperCase()}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                              {formatDate(request.requestedAt)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{request.serviceType}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{request.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">{request.business?.businessName || 'Business'}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{request.estimatedDuration}h</span>
                            </div>
                            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold">{formatCurrency((doctor.hourlyRate || 0) * (request.estimatedDuration || 1))}</span>
                            </div>
                          </div>
                          
                          {/* Display business contact info when request is accepted */}
                          {request.status === 'accepted' && request.business && (
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                              <h4 className="font-semibold text-green-800 dark:text-green-300 text-sm mb-2">Business Contact Information:</h4>
                              <div className="space-y-2">
                                {request.business.contactPersonName && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <span className="text-green-700 dark:text-green-400 font-medium">Contact:</span>
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {request.business.contactPersonName}
                                    </span>
                                  </div>
                                )}
                                {request.business.phone && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <span className="text-green-700 dark:text-green-400 font-medium">Phone:</span>
                                    <a href={`tel:${request.business.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center">
                                      <Phone className="h-3 w-3 mr-1" />
                                      {request.business.phone}
                                    </a>
                                  </div>
                                )}
                                {request.business.address && (
                                  <div className="flex items-start space-x-2 text-sm">
                                    <span className="text-green-700 dark:text-green-400 font-medium">Address:</span>
                                    <div className="text-gray-700 dark:text-gray-300">
                                      <p>{request.business.address}</p>
                                      <p>
                                        {[
                                          request.business.city,
                                          request.business.state,
                                          request.business.zipCode
                                        ].filter(Boolean).join(', ')}
                                      </p>
                                      <a 
                                        href={`https://maps.google.com/?q=${encodeURIComponent(
                                          [
                                            request.business.address,
                                            request.business.city,
                                            request.business.state,
                                            request.business.zipCode
                                          ].filter(Boolean).join(', ')
                                        )}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs inline-flex items-center mt-1"
                                      >
                                        <MapPin className="h-3 w-3 mr-1" />View on Map
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {request.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleAcceptRequest(request.id)}
                                disabled={actionLoading === request.id || !isAvailable}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-medium shadow-sm hover:shadow"
                              >
                                {actionLoading === request.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4" />
                                    <span>Accept</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={actionLoading === request.id}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-medium shadow-sm hover:shadow"
                              >
                                {actionLoading === request.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="h-4 w-4" />
                                    <span>Reject</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleCompleteRequest(request.id)}
                              disabled={actionLoading === request.id}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-medium shadow-sm hover:shadow"
                            >
                              {actionLoading === request.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span>Mark Complete</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <div className="bg-gray-800/50 rounded-lg p-6">
                      <Clock className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                      <p className="text-lg font-medium mb-2 text-gray-300">No service requests available</p>
                      <p className="text-sm">Check back later for new requests from businesses in your area.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Doctor Info */}
            <div className="bg-gray-900 rounded-lg shadow border border-gray-800 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-900/30 p-2 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Profile Summary</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-300">Name:</span>
                  <span className="text-white font-semibold">Dr. {doctorName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-300">Specialization:</span>
                  <span className="text-green-400 font-semibold">{doctor.specialization || 'Medical Professional'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-300">Experience:</span>
                  <span className="text-white font-semibold">{doctor.yearsOfExperience || 0} years</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="font-medium text-gray-300">Rate:</span>
                  <span className="text-purple-400 font-semibold">{formatCurrency(doctor.hourlyRate || 0)}/hour</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-gradient-to-r from-green-900/20 to-emerald-900/20 px-3 rounded-lg mt-4">
                  <span className="font-medium text-green-300">Total Earnings:</span>
                  <span className="text-green-400 font-bold text-lg">{formatCurrency(stats.totalEarnings)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-300">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isAvailable ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                    {isAvailable ? '✅ Available' : '❌ Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            {/* Completed Service Requests */}
            <div className="bg-gray-900 rounded-lg shadow border border-gray-800">
              <div className="p-6 border-b border-gray-800 bg-gray-900 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-900/30 p-2 rounded-lg">
                      <Stethoscope className="h-5 w-5 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Completed Service Requests</h3>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
                {myRequests.length > 0 ? (
                  myRequests.map((request) => (
                    // Render completed request with payment status
                    <div key={request.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-white">{request.serviceType}</h4>
                          <p className="text-sm text-gray-400">{request.description}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          request.isPaid 
                          ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700' 
                          : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                        }`}>
                          {request.isPaid ? 'PAID' : 'PENDING PAYMENT'}
                        </div>
                      </div>
                      <p className="text-sm text-blue-400 font-medium bg-blue-900/20 px-2 py-1 rounded inline-block mb-2">
                        {request.business?.businessName}
                      </p>
                      
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                        <div className="text-xs text-gray-400">
                          Completed: {formatDate(request.completedAt || request.updatedAt)}
                        </div>
                        <div className={`font-semibold ${request.isPaid ? 'text-emerald-400' : 'text-green-400'}`}>
                          {formatCurrency(request.totalAmount || 0)}
                          {request.isPaid && (
                            <span className="text-xs font-normal ml-1">({request.paymentMethod === 'cash' ? 'Cash' : 'Card'})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <div className="bg-gray-800/50 rounded-lg p-6">
                      <Stethoscope className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                      <p className="text-lg font-medium mb-2 text-gray-300">No completed service requests yet</p>
                      <p className="text-sm">Completed service requests will appear here after you mark them as done.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
