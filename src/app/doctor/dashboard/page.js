'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Clock, Building2, MapPin, DollarSign, Check, X, LogOut } from 'lucide-react';
import { serviceRequestAPI, doctorAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getUrgencyColor, getStatusColor } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
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

  useEffect(() => {
    console.log('🏠 Dashboard useEffect - User:', user);
    console.log('🆔 User ID:', user?.id);
    console.log('📧 User email:', user?.email);
    console.log('👤 Full user object:', JSON.stringify(user, null, 2));
    
    if (user?.id) {
      fetchDoctorData();
      fetchNearbyRequests();
      fetchMyRequests();
    }
  }, [user]);

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
      
      // Update stats
      setStats(prev => ({
        ...prev,
        pendingRequests: availableRequests.length
      }));
    } catch (error) {
      console.error('Error fetching available requests:', error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await serviceRequestAPI.getDoctorRequests(user.id);
      const requests = response.data || [];
      setMyRequests(requests);
      
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
        // Fallback to calculating stats from requests
        const completedRequests = requests.filter(req => req.status === 'completed');
        const totalEarnings = completedRequests.reduce((sum, req) => sum + (req.totalAmount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          myRequests: requests.length,
          completedRequests: completedRequests.length,
          totalEarnings
        }));
      }
    } catch (error) {
      console.error('Error fetching my requests:', error);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-blue-50 dark:bg-gray-900">
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
              <div className="bg-gradient-to-br from-white to-yellow-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-yellow-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 dark:text-gray-400 font-medium">Pending Requests</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pendingRequests}</p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-white to-blue-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-gray-400 font-medium">My Requests</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.myRequests}</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                    <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-white to-green-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-green-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-gray-400 font-medium">Completed</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.completedRequests}</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-white to-purple-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-gray-400 font-medium">Hourly Rate</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
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
            <div className="bg-gradient-to-br from-white to-blue-50 dark:bg-gray-800 rounded-xl shadow-md border border-blue-100 dark:border-gray-700">
              <div className="p-6 border-b border-blue-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-800 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Available Service Requests</h2>
                    <p className="text-sm text-blue-600 dark:text-gray-400 font-medium">Nearby businesses needing medical assistance</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-blue-100 dark:divide-gray-700">
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <div key={request.id} className="p-6 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
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
                        </div>
                        <div className="flex space-x-2">
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
            <div className="bg-gradient-to-br from-white to-green-50 dark:bg-gray-800 rounded-xl shadow-md border border-green-100 dark:border-gray-700 p-6">
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

            {/* My Service Requests */}
            <div className="bg-gradient-to-br from-white to-blue-50 dark:bg-gray-800 rounded-xl shadow-md border border-blue-100 dark:border-gray-700">
              <div className="p-6 border-b border-blue-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-800 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                      <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Requests</h3>
                  </div>
                  {myRequests.filter(req => req.status === 'pending').length > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 animate-pulse border border-red-200 dark:border-red-700">
                      🔔 {myRequests.filter(req => req.status === 'pending').length} New Request{myRequests.filter(req => req.status === 'pending').length > 1 ? 's' : ''}
                    </span>
                  )}
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
                      <p className="text-lg font-medium mb-2">No service requests yet</p>
                      <p className="text-sm">New requests will appear here when businesses contact you.</p>
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
