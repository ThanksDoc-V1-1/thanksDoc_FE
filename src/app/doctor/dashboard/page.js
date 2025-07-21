'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Clock, Building2, MapPin, DollarSign, Check, X, LogOut, Phone, Edit, User } from 'lucide-react';
import { serviceRequestAPI, doctorAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getUrgencyColor, getStatusColor } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, authLoading } = useAuth();
  const { isDarkMode } = useTheme();
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

  // State for controlling auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

  // Doctor profile editing states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialisation: '',
    yearsOfExperience: '',
    hourlyRate: '',
    licenceNumber: '',
    qualifications: '',
    bio: ''
  });
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);

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

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;
    
    console.log('🔄 Setting up auto-refresh for doctor dashboard');
    
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing doctor dashboard data');
      fetchNearbyRequests();
      fetchMyRequests();
      setLastRefreshTime(new Date());
    }, AUTO_REFRESH_INTERVAL);
    
    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [autoRefresh, user?.id]);

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
        console.log('🔄 Manually refreshing after accepting request');
        await fetchNearbyRequests();
        await fetchMyRequests();
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
        console.log('🔄 Manually refreshing after rejecting request');
        await fetchNearbyRequests();
        await fetchMyRequests();
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
        
        // Refresh data immediately to update the UI, regardless of auto-refresh setting
        console.log('🔄 Manually refreshing data after successful completion');
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

  const handleEditProfile = () => {
    const doctorInfo = doctorData || user;
    setEditProfileData({
      firstName: doctorInfo?.firstName || '',
      lastName: doctorInfo?.lastName || '',
      email: doctorInfo?.email || '',
      phone: doctorInfo?.phone || '',
      specialisation: doctorInfo?.specialization || '',
      yearsOfExperience: String(doctorInfo?.yearsOfExperience || ''),
      hourlyRate: String(doctorInfo?.hourlyRate || ''),
      licenceNumber: doctorInfo?.licenceNumber || '',
      qualifications: doctorInfo?.qualifications || '',
      bio: doctorInfo?.bio || ''
    });
    setShowEditProfile(true);
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setEditProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileUpdateLoading(true);

    try {
      console.log('🔄 Updating doctor profile for user ID:', user.id);
      console.log('📝 Raw profile data:', editProfileData);
      
      // Transform data to ensure proper types and field name mapping
      const transformedData = {
        firstName: editProfileData.firstName,
        lastName: editProfileData.lastName,
        email: editProfileData.email,
        phone: editProfileData.phone,
        specialization: editProfileData.specialisation, // Map UK spelling to US spelling for backend
        yearsOfExperience: parseInt(editProfileData.yearsOfExperience) || 0,
        hourlyRate: parseFloat(editProfileData.hourlyRate) || 0,
        licenceNumber: editProfileData.licenceNumber,
        qualifications: editProfileData.qualifications,
        bio: editProfileData.bio
      };
      
      console.log('📝 Transformed profile data being sent:', transformedData);
      
      // Try to update the doctor profile
      const response = await doctorAPI.updateProfile(user.id, transformedData);
      
      console.log('✅ Profile update response:', response);
      
      if (response.data) {
        alert('Profile updated successfully!');
        setShowEditProfile(false);
        // Update the local doctor data with transformed data
        setDoctorData(prev => ({
          ...prev,
          ...transformedData
        }));
        // Refresh doctor data from server
        await fetchDoctorData();
      } else {
        console.log('⚠️ No data in response:', response);
        alert('Update completed but no confirmation received. Please refresh the page.');
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update profile. Please try again.';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid profile data. Please check all fields and try again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Doctor record not found. Please try logging out and back in.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = `Error: ${error.response.data.error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const handleCancelEditProfile = () => {
    setShowEditProfile(false);
    setEditProfileData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialisation: '',
      yearsOfExperience: '',
      hourlyRate: '',
      licenceNumber: '',
      qualifications: '',
      bio: ''
    });
  };

  // Get doctor display data (either from backend or auth context)
  const doctor = doctorData || user;
  const doctorName = doctor?.name || 
    `${(doctor?.firstName || '').trim()} ${(doctor?.lastName || '').trim()}`.trim() || 
    doctor?.email?.split('@')[0] || 'Doctor';
  
  // For debugging - let's log what we're getting
  console.log('👨‍⚕️ Doctor data:', doctor);
  console.log('👤 Doctor firstName:', doctor?.firstName);
  console.log('👤 Doctor lastName:', doctor?.lastName);
  console.log('📝 Doctor name result:', doctorName);

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
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-md modal-scrollable ${
            isDarkMode 
              ? 'bg-gray-900 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Complete Service Request</h3>
            
            <div className={`rounded-lg p-4 mb-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <p className={`text-sm mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Expected Payment</p>
              <p className="text-2xl font-bold text-green-500">£{(completionAmount || 0).toFixed(2)}</p>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                After completion, the business will be prompted to make payment.
              </p>
            </div>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Notes (optional)
              </label>
              <textarea
                className={`w-full rounded-lg p-2 transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                    : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                rows="3"
                placeholder="Add any notes about the service provided..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompletionModal(false)}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-800' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompletion}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Complete Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
            isDarkMode 
              ? 'bg-gray-900 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Edit Doctor Profile</h3>
              <button
                onClick={handleCancelEditProfile}
                className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={editProfileData.firstName}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={editProfileData.lastName}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editProfileData.email}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editProfileData.phone}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Specialisation
                  </label>
                  <input
                    type="text"
                    name="specialisation"
                    value={editProfileData.specialisation}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="e.g., General Practice, Cardiology"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    value={editProfileData.yearsOfExperience}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter years of experience"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Hourly Rate (£)
                  </label>
                  <input
                    type="number"
                    name="hourlyRate"
                    value={editProfileData.hourlyRate}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter hourly rate"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Licence Number
                  </label>
                  <input
                    type="text"
                    name="licenceNumber"
                    value={editProfileData.licenceNumber}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter medical licence number"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Qualifications
                </label>
                <input
                  type="text"
                  name="qualifications"
                  value={editProfileData.qualifications}
                  onChange={handleProfileInputChange}
                  className={`w-full rounded-lg p-3 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="e.g., MBBS, MD, FRCS"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={editProfileData.bio}
                  onChange={handleProfileInputChange}
                  rows="4"
                  className={`w-full rounded-lg p-3 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Tell us about yourself, your approach to medicine, and what makes you unique..."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEditProfile}
                  className={`px-4 py-2 border rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-800' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileUpdateLoading}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    profileUpdateLoading
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {profileUpdateLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
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
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Dr. {doctorName}
                </h1>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {doctor.specialization || 'Medical Professional'}
                </p>
              </div>
            </div>

            {/* Right side - Profile Summary and Controls */}
            <div className="flex items-center space-x-4">
              {/* Compact Profile Summary */}
              <div className={`hidden lg:flex items-center space-x-3 px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800/50 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {doctor.yearsOfExperience || 0} years exp. • £{(doctor.hourlyRate || 0).toFixed(2)}/hour
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Total Earnings:</span>
                    <span className={`text-sm font-semibold ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>£{(stats.totalEarnings || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    isAvailable 
                      ? isDarkMode 
                        ? 'bg-green-900/30 text-green-400 border-green-700' 
                        : 'bg-green-600 text-white border-green-500'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-400 border-gray-600' 
                        : 'bg-gray-400 text-white border-gray-300'
                  }`}>
                    {isAvailable ? '✅ Available' : '❌ Unavailable'}
                  </span>
                </div>
              </div>

              {/* Doctor availability toggle */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                isDarkMode 
                  ? 'bg-gray-800/80' 
                  : 'bg-gray-100/80'
              }`}>
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Available</span>
                <button
                  onClick={handleAvailabilityToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                  aria-label={`Set availability to ${isAvailable ? 'unavailable' : 'available'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            {/* Desktop controls */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Auto-refresh indicator */}
              <div className="flex items-center space-x-2">
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
              </div>
              
              {/* Notification counter */}
              {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 0 && (
                <div className="relative">
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length}
                  </span>
                  <span className="absolute animate-ping h-5 w-5 rounded-full bg-red-400 opacity-75"></span>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow ${
                  isDarkMode 
                    ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <button 
                onClick={() => {
                  const mobileMenu = document.getElementById('mobile-menu-doctor');
                  if (mobileMenu) {
                    mobileMenu.classList.toggle('hidden');
                  }
                }}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
                aria-label="Toggle mobile menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile menu */}
          <div id="mobile-menu-doctor" className="md:hidden mt-4 hidden">
            <div className="space-y-3 py-3">
              {/* Auto-refresh control */}
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
              
              {/* Availability toggle removed from here - now always visible in the header */}
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className={`w-full px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2 shadow-sm hover:shadow ${
                  isDarkMode 
                    ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
              
              {/* Notification indicator */}
              {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 0 && (
                <div className="bg-red-900/30 text-red-300 rounded-md px-3 py-2 text-center">
                  <span className="font-medium">
                    {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length} pending requests
                  </span>
                </div>
              )}
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
                    <p className="text-sm text-yellow-400 font-medium">Pending Requests</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.pendingRequests}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode 
                      ? 'bg-yellow-900/30' 
                      : 'bg-yellow-600'
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
                    <p className="text-sm text-blue-400 font-medium">My Requests</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.myRequests}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode 
                      ? 'bg-blue-900/30' 
                      : 'bg-blue-600'
                  }`}>
                    <Stethoscope className={`h-6 w-6 ${
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
                    <p className="text-sm text-green-400 font-medium">Completed</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.completedRequests}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode 
                      ? 'bg-green-900/30' 
                      : 'bg-green-600'
                  }`}>
                    <Check className={`h-6 w-6 ${
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
                    <p className="text-sm text-purple-400 font-medium">Hourly Rate</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      ${doctor.hourlyRate || 0}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode 
                      ? 'bg-purple-900/30' 
                      : 'bg-purple-600'
                  }`}>
                    <DollarSign className={`h-6 w-6 ${
                      isDarkMode ? 'text-purple-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Available Requests */}
            <div className={`rounded-lg shadow border ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-800' 
                : 'bg-white border-gray-200'
            }`}>
              <div className={`p-6 border-b rounded-t-lg ${
                isDarkMode 
                  ? 'border-gray-800 bg-gray-900' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-blue-900/30' 
                        : 'bg-blue-600'
                    }`}>
                      <Clock className={`h-5 w-5 ${
                        isDarkMode ? 'text-blue-400' : 'text-white'
                      }`} />
                    </div>
                    <div>
                      <h2 className={`text-xl font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>Available Service Requests</h2>
                      <p className={`text-sm font-medium ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-600'
                      }`}>Nearby businesses needing medical assistance</p>
                    </div>
                  </div>
                  {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 0 && (
                    <div className="relative">
                      <span className="absolute -right-1 -top-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                        isDarkMode 
                          ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' 
                          : 'bg-yellow-600 text-white border-yellow-500'
                      }`}>
                        🔔 {serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length} New Request{serviceRequests.filter(req => req.status === 'pending' && (!req.doctor || req.doctor.id === user.id)).length > 1 ? 's' : ''}
                      </span>
                      </div>
                  )}
                </div>
              </div>
              <div className={`divide-y ${
                isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <div key={request.id} className={`p-6 transition-colors ${
                      request.status === 'accepted' 
                        ? 'bg-green-900/10 border-l-4 border-green-400' 
                        : ''
                    } ${
                      isDarkMode 
                        ? 'hover:bg-gray-700/50' 
                        : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {request.status === 'accepted' && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                isDarkMode 
                                  ? 'bg-green-900/30 text-green-400 border-green-700' 
                                  : 'bg-green-600 text-white border-green-500'
                              }`}>
                                ACCEPTED
                              </span>
                            )}
                            {request.urgencyLevel && request.urgencyLevel !== 'medium' && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgencyLevel, isDarkMode)}`}>
                                {request.urgencyLevel.toUpperCase()}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-gray-400 bg-gray-700/50' 
                                : 'text-gray-600 bg-gray-100'
                            }`}>
                              {formatDate(request.requestedAt)}
                            </span>
                          </div>
                          <h3 className={`font-semibold mb-1 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{request.serviceType}</h3>
                          <p className={`text-sm mb-3 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>{request.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-blue-400 bg-blue-900/20' 
                                : 'text-blue-600 bg-blue-50'
                            }`}>
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">{request.business?.businessName || 'Business'}</span>
                            </div>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-gray-400 bg-gray-700/50' 
                                : 'text-gray-600 bg-gray-100'
                            }`}>
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{request.estimatedDuration}h</span>
                            </div>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-green-400 bg-green-900/20' 
                                : 'text-green-600 bg-green-50'
                            }`}>
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold">£{((doctor.hourlyRate || 0) * (request.estimatedDuration || 1)).toFixed(2)}</span>
                            </div>
                          </div>
                          
                          {/* Display business contact info when request is accepted */}
                          {request.status === 'accepted' && request.business && (
                            <div className={`mt-4 p-3 border rounded-lg ${
                              isDarkMode 
                                ? 'bg-green-900/10 border-green-800' 
                                : 'bg-green-50 border-green-200'
                            }`}>
                              <h4 className={`font-semibold text-sm mb-2 ${
                                isDarkMode ? 'text-green-300' : 'text-green-800'
                              }`}>Business Contact Information:</h4>
                              <div className="space-y-2">
                                {request.business.contactPersonName && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <span className={`font-medium ${
                                      isDarkMode ? 'text-green-400' : 'text-green-700'
                                    }`}>Contact:</span>
                                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                      {request.business.contactPersonName}
                                    </span>
                                  </div>
                                )}
                                {request.business.phone && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <span className={`font-medium ${
                                      isDarkMode ? 'text-green-400' : 'text-green-700'
                                    }`}>Phone:</span>
                                    <a href={`tel:${request.business.phone}`} className={`hover:underline inline-flex items-center ${
                                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>
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
                                        className={`hover:underline text-xs inline-flex items-center mt-1 ${
                                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                        }`}
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
                  <div className={`p-8 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className={`rounded-lg p-6 ${
                      isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'
                    }`}>
                      <Clock className={`h-12 w-12 mx-auto mb-4 ${
                        isDarkMode ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-lg font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>No service requests available</p>
                      <p className="text-sm">Check back later for new requests from businesses in your area.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Doctor Profile Sidebar */}
          <div className="space-y-6">
            {/* Doctor Profile */}
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                    <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Doctor Profile</h3>
                </div>
                <button
                  onClick={handleEditProfile}
                  className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Edit Doctor Profile"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Full Name:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>
                    {`${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim() || 'N/A'}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Email:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{doctor?.email || 'N/A'}</span>
                </div>
                {doctor?.phone && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Phone:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{doctor.phone}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Specialisation:</span>
                  <span className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} font-semibold`}>{doctor?.specialization || 'Medical Professional'}</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Experience:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{doctor?.yearsOfExperience || 0} years</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Rate:</span>
                  <span className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'} font-semibold`}>£{(doctor?.hourlyRate || 0).toFixed(2)}/hour</span>
                </div>
                {doctor?.licenceNumber && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Licence:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{doctor.licenceNumber}</span>
                  </div>
                )}
                {doctor?.qualifications && (
                  <div className={`py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'} block mb-1`}>Qualifications:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>{doctor.qualifications}</span>
                  </div>
                )}
                {doctor?.bio && (
                  <div className={`py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'} block mb-1`}>Bio:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>{doctor.bio}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center py-2 ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} px-3 rounded-lg mt-4`}>
                  <span className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Total Earnings:</span>
                  <span className={`${isDarkMode ? 'text-green-300' : 'text-green-700'} font-bold text-lg`}>£{(stats.totalEarnings || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    isAvailable 
                      ? isDarkMode 
                        ? 'bg-green-900/30 text-green-400 border-green-700' 
                        : 'bg-green-600 text-white border-green-500'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-400 border-gray-600' 
                        : 'bg-gray-400 text-white border-gray-300'
                  }`}>
                    {isAvailable ? '✅ Available' : '❌ Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Service Requests Section */}
        <div className="mt-8">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                    <Clock className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                  </div>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Service Requests</h2>
                </div>
                {myRequests.length > 0 && (
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {myRequests.length} total requests
                  </div>
                )}
              </div>
            </div>
              <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {myRequests.length > 0 ? (
                  myRequests.slice(0, 10).map((request) => (
                    <div key={request.id} className={`p-6 ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status, isDarkMode)}`}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {request.urgencyLevel && request.urgencyLevel !== 'medium' && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgencyLevel, isDarkMode)}`}>
                                {request.urgencyLevel.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{request.serviceType}</h3>
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mb-2`}>{request.description}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                          {request.business && (
                            <div className="mt-2">
                              <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                                Business: {request.business.businessName || 'Business'}
                              </p>
                              
                              {/* Show business contact info when request is accepted */}
                              {request.status === 'accepted' && request.business.phone && (
                                <div className={`mt-2 p-3 ${isDarkMode ? 'bg-blue-900/10 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                                  <h4 className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} text-xs mb-2`}>Business Contact Information:</h4>
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Phone className={`h-3 w-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                    <a href={`tel:${request.business.phone}`} className={`${isDarkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'} text-xs`}>
                                      {request.business.phone}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-gray-400 bg-gray-700/50' 
                                : 'text-gray-600 bg-gray-100'
                            }`}>
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{request.estimatedDuration}h</span>
                            </div>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-green-400 bg-green-900/20' 
                                : 'text-green-600 bg-green-50'
                            }`}>
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold">£{((doctor?.hourlyRate || 0) * (request.estimatedDuration || 1)).toFixed(2)}</span>
                            </div>
                          </div>
                          {request.status === 'completed' && request.totalAmount && (
                            <div className={`${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'} px-3 py-2 rounded-lg flex flex-col items-end`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>£{(request.totalAmount || 0).toFixed(2)}</span>
                              <div className="flex items-center space-x-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                                COMPLETED
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-6`}>
                      <Stethoscope className={`h-12 w-12 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                      <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No service requests yet</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Service requests you accept will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}