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
      const completedRequests = response.data || [];
      setMyRequests(completedRequests);
      
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

  const handleCompleteRequest = async (requestId) => {
    const notes = prompt('Please add any notes about the service provided:');
    if (notes === null) return; // User cancelled

    setActionLoading(requestId);
    try {
      const response = await serviceRequestAPI.completeRequest(requestId, notes);
      if (response.data) {
        alert('Service request completed successfully!');
        fetchMyRequests();
      }
    } catch (error) {
      console.error('Error completing request:', error);
      alert('Failed to complete request. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md dark:bg-gray-800/90 shadow-lg border-b border-green-100 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Stethoscope className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Dr. {doctorName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">{doctor.specialization || 'Medical Professional'}</p>
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
                    isAvailable ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
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
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100/80 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all duration-200 font-medium border border-gray-200 dark:border-gray-600"
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
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-yellow-100 dark:border-gray-600 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-300 font-medium">Pending Requests</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pendingRequests}</p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-gray-600 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">My Requests</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.myRequests}</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                    <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-green-100 dark:border-gray-600 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-300 font-medium">Completed</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completedRequests}</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-gray-600 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Hourly Rate</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      ${doctor.hourlyRate || 0}
                    </p>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Available Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-blue-100 dark:border-gray-600">
              <div className="p-6 border-b border-blue-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Available Service Requests</h2>
                      <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Nearby businesses needing medical assistance</p>
                    </div>
                  </div>
                  {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 0 && (
                    <div className="relative">
                      <span className="absolute -right-1 -top-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700">
                        🔔 {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length} New Request{serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="divide-y divide-blue-100 dark:divide-gray-700">
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <div key={request.id} className={`p-6 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors ${request.status === 'accepted' ? 'bg-green-50/70 dark:bg-green-900/10 border-l-4 border-green-400' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {request.status === 'accepted' && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-700">
                                ACCEPTED
                              </span>
                            )}
                            {request.urgencyLevel && request.urgencyLevel !== 'medium' && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgencyLevel)}`}>
                                {request.urgencyLevel.toUpperCase()}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
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
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-medium shadow-md"
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
                                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-medium shadow-md"
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
                              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-medium shadow-md"
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
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <Clock className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-lg font-medium mb-2">No service requests available</p>
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-green-100 dark:border-gray-600 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Summary</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-green-100 dark:border-gray-600">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">Dr. {doctorName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-100 dark:border-gray-600">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Specialization:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{doctor.specialization || 'Medical Professional'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-100 dark:border-gray-600">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Experience:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{doctor.yearsOfExperience || 0} years</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-100 dark:border-gray-600">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Rate:</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">{formatCurrency(doctor.hourlyRate || 0)}/hour</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-3 rounded-lg mt-4">
                  <span className="font-medium text-green-700 dark:text-green-300">Total Earnings:</span>
                  <span className="text-green-700 dark:text-green-400 font-bold text-lg">{formatCurrency(stats.totalEarnings)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isAvailable ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}>
                    {isAvailable ? '✅ Available' : '❌ Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            {/* Completed Service Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-blue-100 dark:border-gray-600">
              <div className="p-6 border-b border-blue-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                      <Stethoscope className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Completed Service Requests</h3>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-blue-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {myRequests.length > 0 ? (
                  myRequests.map((request) => (
                    <div key={request.id} className={`p-4 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors ${request.status === 'pending' ? 'bg-yellow-50/80 dark:bg-yellow-900/10 border-l-4 border-yellow-400' : ''}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {request.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {request.estimatedDuration && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
                              <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                                {request.estimatedDuration}h • {formatCurrency((request.estimatedDuration || 0) * (doctorData?.hourlyRate || 0))}
                              </span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{request.serviceType}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{request.description}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block">{request.business?.businessName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                          Requested: {formatDate(request.requestedAt)}
                        </p>
                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-2 pt-2">
                            <button
                              onClick={() => handleAcceptRequest(request.id)}
                              disabled={actionLoading === request.id}
                              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-1 font-medium shadow-sm"
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
                              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-1 font-medium shadow-sm"
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
                          </div>
                        )}
                        
                        {request.status === 'accepted' && (
                          <button
                            onClick={() => handleCompleteRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-1 font-medium shadow-sm"
                          >
                            {actionLoading === request.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <span>Mark Complete</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <Stethoscope className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-lg font-medium mb-2">No completed service requests yet</p>
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
