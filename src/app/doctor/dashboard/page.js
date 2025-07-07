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
      const response = await serviceRequestAPI.getAll();
      const pendingRequests = response.data?.data?.filter(req => req.status === 'pending') || [];
      setServiceRequests(pendingRequests);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        pendingRequests: pendingRequests.length
      }));
    } catch (error) {
      console.error('Error fetching nearby requests:', error);
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
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Please provide a reason for rejecting this request (optional):');
    if (reason === null) return; // User cancelled

    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleCompleteRequest = async (requestId) => {
    const notes = prompt('Please add any notes about the service provided:');
    if (notes === null) return; // User cancelled

    setLoading(true);
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
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending Requests</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingRequests}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">My Requests</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.myRequests}</p>
                  </div>
                  <Stethoscope className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completedRequests}</p>
                  </div>
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hourly Rate</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      ${doctor.hourlyRate || 0}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* Available Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Available Service Requests</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Nearby businesses needing medical assistance</p>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <div key={request.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                              {request.urgencyLevel.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(request.requestedAt)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{request.serviceType}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{request.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Building2 className="h-4 w-4" />
                              <span>{request.business?.businessName || 'Business'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{request.estimatedDuration}h</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatCurrency((doctor.hourlyRate || 0) * (request.estimatedDuration || 1))}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={loading || !isAvailable}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                          >
                            <Check className="h-4 w-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No service requests available at the moment.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Doctor Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Summary</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Name:</span> <span className="text-gray-600 dark:text-gray-400">Dr. {doctorName}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Specialization:</span> <span className="text-gray-600 dark:text-gray-400">{doctor.specialization || 'Medical Professional'}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Experience:</span> <span className="text-gray-600 dark:text-gray-400">{doctor.yearsOfExperience || 0} years</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Rate:</span> <span className="text-gray-600 dark:text-gray-400">{formatCurrency(doctor.hourlyRate || 0)}/hour</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Total Earnings:</span> <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stats.totalEarnings)}</span></p>
                <p><span className="font-medium text-gray-700 dark:text-gray-300">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${isAvailable ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'}`}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </p>
              </div>
            </div>

            {/* My Service Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Requests</h3>
                  {myRequests.filter(req => req.status === 'pending').length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 animate-pulse">
                      🔔 {myRequests.filter(req => req.status === 'pending').length} New Request{myRequests.filter(req => req.status === 'pending').length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {myRequests.length > 0 ? (
                  myRequests.map((request) => (
                    <div key={request.id} className={`p-4 ${request.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400' : ''}`}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {request.estimatedDuration && (
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                              {request.estimatedDuration}h • {formatCurrency((request.estimatedDuration || 0) * (doctorData?.hourlyRate || 0))}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{request.serviceType}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{request.description}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{request.business?.businessName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Requested: {formatDate(request.requestedAt)}
                        </p>
                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-2 pt-2">
                            <button
                              onClick={() => handleAcceptRequest(request.id)}
                              disabled={loading}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
                            >
                              <Check className="h-4 w-4" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={loading}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
                            >
                              <X className="h-4 w-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                        
                        {request.status === 'accepted' && (
                          <button
                            onClick={() => handleCompleteRequest(request.id)}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No service requests yet
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
