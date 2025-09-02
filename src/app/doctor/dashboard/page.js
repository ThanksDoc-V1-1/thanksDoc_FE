'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Clock, Building2, MapPin, Check, X, LogOut, Phone, Edit, User, Banknote, TrendingUp, Plus, Minus, Settings, FileText } from 'lucide-react';
import { serviceRequestAPI, doctorAPI, serviceAPI, testJWTToken } from '../../../lib/api';
import { formatCurrency, formatDate, formatDuration, getUrgencyColor, getStatusColor } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';
import NotificationCenter from '../../../components/NotificationCenter';
import NotificationBanner from '../../../components/NotificationBanner';
import DistanceSlider from '../../../components/DistanceSlider';
import CountryCodePicker from '../../../components/CountryCodePicker';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, authLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const { getBookingFee } = useSystemSettings();
  const [doctorData, setDoctorData] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track which request is being processed
  const [isAvailable, setIsAvailable] = useState(true);
  const [declinedRequests, setDeclinedRequests] = useState(new Set()); // Track declined requests for this session
  const [stats, setStats] = useState({
    pendingRequests: 0,
    myRequests: 0,
    completedRequests: 0,
    totalEarnings: 0
  });

  // State for controlling auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const AUTO_REFRESH_INTERVAL = 30000; // Increased to 30 seconds to reduce load
  const [refreshing, setRefreshing] = useState(false); // Prevent multiple simultaneous refreshes
  const [fetchingNearby, setFetchingNearby] = useState(false); // Prevent multiple fetchNearbyRequests
  const [fetchingMyRequests, setFetchingMyRequests] = useState(false); // Prevent multiple fetchMyRequests

  // Doctor profile editing states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    qualifications: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    serviceRadius: 12 // Default to 12 miles
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState('+44'); // Default UK country code
  const [phoneNumber, setPhoneNumber] = useState(''); // Phone number without country code
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [doctorLocationName, setDoctorLocationName] = useState('');

  // Service management states
  const [doctorServices, setDoctorServices] = useState([]);
  const [allServices, setAllServices] = useState({ inPerson: [], online: [], nhs: [] });
  const [availableServices, setAvailableServices] = useState([]); // For pricing lookup
  const [showManageServices, setShowManageServices] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Request filtering states
  const [requestFilter, setRequestFilter] = useState('all'); // 'all', 'pending', 'completed'

  // Pagination and filtering states for Recent Service Requests
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const itemsPerPage = 5;

  // Authentication check - redirect if not authenticated or not doctor
  useEffect(() => {
    ('🔍 Doctor Dashboard - Auth state check:', {
      authLoading,
      isAuthenticated,
      user: user ? { id: user.id, email: user.email, role: user.role } : null
    });

    // Don't redirect while authentication is still loading
    if (authLoading) {
      ('⏳ Auth still loading, waiting...');
      return;
    }

    // Add a small delay to ensure AuthContext has fully initialized
    const timeoutId = setTimeout(() => {
      // Only redirect if we're sure about the authentication state (not loading)
      if (!authLoading && isAuthenticated === false) {
        ('🚫 Not authenticated after delay, redirecting to doctor login');
        window.location.href = '/doctor/login';
        return;
      }
      
      // Only check role if we have a user and are not loading
      if (!authLoading && isAuthenticated && user && user.role !== 'doctor') {
        ('🚫 Not doctor role (got:', user.role, '), redirecting to home');
        window.location.href = '/';
        return;
      }
      
      if (!authLoading && isAuthenticated && user && user.role === 'doctor') {
        ('✅ Doctor authenticated, loading dashboard');
      }
    }, 500); // 500ms delay to ensure auth is fully loaded

    // Cleanup timeout if component unmounts or dependencies change
    return () => clearTimeout(timeoutId);
  }, [authLoading, isAuthenticated, user]);

  // Helper function to filter available requests (excludes requests declined by current doctor)
  const getAvailablePendingRequests = () => {
    const available = serviceRequests.filter(req => {
      const isPending = req.status === 'pending';
      const hasNotDeclined = !declinedRequests.has(req.id);
      const shouldShow = isPending && hasNotDeclined;
      
      if (req.status === 'pending') {
        (`📋 Request ${req.id}: pending=${isPending}, declined=${declinedRequests.has(req.id)}, showing=${shouldShow}`);
      }
      
      return shouldShow;
    });
    
    (`📊 Total service requests: ${serviceRequests.length}, Pending: ${serviceRequests.filter(r => r.status === 'pending').length}, Available after filter: ${available.length}`);
    (`📊 Declined requests: ${Array.from(declinedRequests)}`);
    
    return available;
  };

  useEffect(() => {
    ('🏠 Dashboard useEffect - User:', user);
    ('🆔 User ID:', user?.id);
    ('📧 User email:', user?.email);
    ('👤 Full user object:', JSON.stringify(user, null, 2));
    
    if (user?.id) {
      fetchDoctorData();
      fetchNearbyRequests();
      fetchServices(); // Fetch services for pricing calculations
      loadAllServices(); // Load all services for manage services section
    }
  }, [user]);

  // Debug useEffect to monitor allServices state changes
  useEffect(() => {
    ('🔍 AllServices state changed:', {
      inPerson: allServices.inPerson.length,
      online: allServices.online.length,
      nhs: allServices.nhs.length
    });
    ('📋 Online services:', allServices.online.map(s => s.name));
    ('🏛️ NHS services:', allServices.nhs.map(s => s.name));
  }, [allServices]);

  // Load declined requests from localStorage when user changes
  useEffect(() => {
    if (user?.id) {
      const savedDeclined = localStorage.getItem(`declined_requests_${user.id}`);
      if (savedDeclined) {
        try {
          const declinedArray = JSON.parse(savedDeclined);
          setDeclinedRequests(new Set(declinedArray));
          ('📂 Loaded declined requests from localStorage:', declinedArray);
        } catch (error) {
          console.error('Error loading declined requests from localStorage:', error);
        }
      }
    }
  }, [user?.id]);

  // Save declined requests to localStorage when they change
  useEffect(() => {
    if (user?.id && declinedRequests.size > 0) {
      const declinedArray = Array.from(declinedRequests);
      localStorage.setItem(`declined_requests_${user.id}`, JSON.stringify(declinedArray));
      ('💾 Saved declined requests to localStorage:', declinedArray);
    }
  }, [declinedRequests, user?.id]);

  // Handle doctor location reverse geocoding
  useEffect(() => {
    if (doctorData && doctorData.latitude && doctorData.longitude && !doctorLocationName) {
      reverseGeocode(parseFloat(doctorData.latitude), parseFloat(doctorData.longitude));
    } else if (!doctorData?.latitude || !doctorData?.longitude) {
      setDoctorLocationName('');
    }
  }, [doctorData, doctorLocationName]);

  // Helper function to calculate doctor earnings based on service pricing
  const calculateDoctorEarnings = (request) => {
    // Debug logging
    ('🔍 Calculating earnings for request:', {
      requestId: request.id,
      serviceType: request.serviceType,
      servicePrice: request.servicePrice,
      hasServicePrice: !!request.servicePrice,
      availableServicesCount: availableServices.length
    });
    
    // First priority: Check if request already has service price stored
    if (request.servicePrice && parseFloat(request.servicePrice) > 0) {
      ('💰 Using stored servicePrice:', request.servicePrice);
      return parseFloat(request.servicePrice);
    } else {
      ('❌ NO servicePrice found in request! Will attempt service lookup...');
    }
    
    // If services haven't loaded yet, return 0 and let it recalculate when services load
    if (availableServices.length === 0) {
      ('⏳ Services not loaded yet, returning 0');
      return 0;
    }
    
    ('🔍 SEARCHING for service match for:', request.serviceType);

    // Second priority: Try exact service name match
    let service = availableServices.find(s => s.name === request.serviceType);
    ('🎯 Found service (exact match):', service);
    
    // Third priority: Try case-insensitive match
    if (!service) {
      service = availableServices.find(s => s.name?.toLowerCase() === request.serviceType?.toLowerCase());
      ('🎯 Found service (case-insensitive match):', service);
    }
    
    // Fourth priority: Try partial match (contains)
    if (!service) {
      service = availableServices.find(s => 
        s.name?.toLowerCase().includes(request.serviceType?.toLowerCase()) ||
        request.serviceType?.toLowerCase().includes(s.name?.toLowerCase())
      );
      ('🎯 Found service (partial match):', service);
    }
    
    // Fifth priority: Special handling for common service types
    if (!service && request.serviceType?.toLowerCase().includes('online consultation')) {
      service = availableServices.find(s => 
        s.name?.toLowerCase().includes('online') || 
        s.name?.toLowerCase().includes('consultation') ||
        s.category?.toLowerCase().includes('online')
      );
      ('🎯 Found service (online consultation fallback):', service);
    }
    
    const servicePrice = service ? parseFloat(service.price) : 0; // Return 0 if service not found - should rely on stored servicePrice
    ('💵 Final calculated price:', servicePrice);
    
    // Fallback: If still no price found and it's an online consultation, use a realistic default price
    if (servicePrice === 0 && request.serviceType?.toLowerCase().includes('online consultation')) {
      ('🚨 Using realistic fallback price for online consultation: £7.00');
      return 7.00; // Realistic price for online consultations (£6.30 take-home = 90% of £7.00)
    }
    
    if (!service) {
      ('⚠️ WARNING: No service match found, returning 0!');
      ('🔍 Available services:', availableServices.map(s => ({ name: s.name, price: s.price })));
      ('🔍 Looking for service type:', request.serviceType);
    }
    
    return servicePrice; // Doctor earns the service price (excluding dynamic booking fee)
  };

  // Helper function to calculate total amount including booking fee (for display purposes)
  const calculateTotalAmount = (request) => {
    const servicePrice = calculateDoctorEarnings(request);
    return servicePrice + getBookingFee(); // Service price + dynamic booking fee
  };

  // Helper function to calculate doctor take-home amount after 10% ThanksDoc commission
  const calculateDoctorTakeHome = (servicePrice) => {
    return servicePrice * 0.9; // Doctor keeps 90%, ThanksDoc takes 10%
  };
  
  // Fetch completed requests after getting available requests to ensure proper stats calculation
  useEffect(() => {
    if (user?.id) {
      fetchMyRequests();
    }
  }, [user, serviceRequests]);

  // Force re-calculation when services are loaded
  useEffect(() => {
    if (availableServices.length > 0) {
      ('🔄 Services loaded, triggering re-render for price calculations');
      // Force a state update to trigger re-render of components using calculateDoctorEarnings
      setStats(prev => ({ ...prev }));
    }
  }, [availableServices]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;
    
    ('🔄 Setting up auto-refresh for doctor dashboard');
    
    const refreshInterval = setInterval(async () => {
      if (refreshing) {
        ('⏭️ Skipping refresh - already in progress');
        return;
      }
      
      ('🔄 Auto-refreshing doctor dashboard data');
      setRefreshing(true);
      
      try {
        await Promise.all([
          fetchNearbyRequests(),
          fetchMyRequests()
        ]);
        setLastRefreshTime(new Date());
      } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
      } finally {
        setRefreshing(false);
      }
    }, AUTO_REFRESH_INTERVAL);
    
    return () => {
      ('🛑 Clearing auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [autoRefresh, user?.id]); // Keep refreshing out of dependencies to prevent infinite loops

  const fetchServices = async () => {
    try {
      ('🔍 [DOCTOR] Fetching available services from backend');
      
      // Fetch all services sorted by category and display order, then filter active ones on frontend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?sort=category:asc,displayOrder:asc,name:asc&pagination[limit]=100`);
      const data = await response.json();
      ('📊 [DOCTOR] Raw API response:', data);
      ('📊 [DOCTOR] Response status:', response.status);
      
      let services = [];
      if (data && Array.isArray(data.data)) {
        services = data.data;
        ('📊 [DOCTOR] Using data.data array:', services.length, 'services');
      } else if (Array.isArray(data)) {
        services = data;
        ('📊 [DOCTOR] Using data array:', services.length, 'services');
      } else {
        ('❌ [DOCTOR] Unexpected API response format:', data);
      }
      
      if (services.length > 0) {
        // Filter only active services
        const activeServices = services.filter(service => service.isActive === true);
        ('✅ [DOCTOR] Successfully fetched services:', activeServices.length, 'active out of', services.length, 'total');
        
        // Map services to expected format
        const formattedServices = activeServices.map(service => ({
          id: service.id,
          name: service.name || service.attributes?.name,
          price: service.price || service.attributes?.price,
          category: service.category || service.attributes?.category,
          duration: service.duration || service.attributes?.duration
        }));
        
        setAvailableServices(formattedServices);
      } else {
        ('⚠️ [DOCTOR] No services found in response');
        setAvailableServices([]);
      }
    } catch (error) {
      console.error('❌ [DOCTOR] Error fetching services:', error);
      // Set default services if fetch fails
      setAvailableServices([]);
    }
  };

  const fetchDoctorData = async () => {
    try {
      ('🔍 Fetching doctor data for ID:', user.id);
      ('🔍 User object keys:', Object.keys(user));
      ('🔍 User ID type:', typeof user.id);
      ('🔍 User ID value:', JSON.stringify(user.id));
      
      const response = await doctorAPI.getById(user.id);
      ('📡 Doctor API response:', response);
      
      if (response.data?.data) {
        const doctor = response.data.data;
        ('✅ Doctor data received:', doctor);
        ('👤 Doctor ID from backend:', doctor.id);
        ('📧 Doctor email from backend:', doctor.email);
        ('🔧 Doctor services from backend:', doctor.services);
        ('🔧 Services type:', typeof doctor.services);
        ('🔧 Services length:', doctor.services?.length);
        setDoctorData(doctor);
        setIsAvailable(doctor.isAvailable || false);
        
        // Load doctor's services
        if (doctor.services) {
          ('✅ Setting doctor services:', doctor.services);
          setDoctorServices(doctor.services);
        } else {
          ('⚠️ No services found in doctor data');
        }
      } else {
        ('⚠️ No doctor data in response, falling back to user data');
        setDoctorData(user);
      }
    } catch (error) {
      console.error('❌ Error fetching doctor data:', error);
      console.error('❌ Error details:', error.response?.data);
      ('🔄 Falling back to user data from auth context');
      // Fallback to user data from auth context
      setDoctorData(user);
    }
  };

  const fetchNearbyRequests = async () => {
    if (fetchingNearby) {
      ('⏭️ Skipping fetchNearbyRequests - already in progress');
      return;
    }
    
    if (!user?.id) {
      ('⚠️ No user ID available for fetchNearbyRequests');
      return;
    }
    
    setFetchingNearby(true);
    try {
      // Get available requests for this specific doctor (unassigned or assigned to them)
      const response = await serviceRequestAPI.getAvailableRequests(user.id);
      const availableRequests = response.data || [];
      ('🔍 Available requests:', availableRequests);
      ('📊 Request statuses:', availableRequests.map(req => req.status));
      ('💰 Service prices in requests:', availableRequests.map(req => ({ 
        id: req.id, 
        serviceType: req.serviceType, 
        servicePrice: req.servicePrice,
        hasServicePrice: !!req.servicePrice 
      })));
      setServiceRequests(availableRequests);
      
      // Update stats - count only pending requests as "pending"
      const pendingCount = availableRequests.filter(req => req.status === 'pending').length;
      
      setStats(prev => ({
        ...prev,
        pendingRequests: pendingCount
      }));
    } catch (error) {
      console.error('❌ Error fetching available requests:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      // Don't set empty array on error - keep existing data to prevent flash
    } finally {
      setFetchingNearby(false);
    }
  };

  const fetchMyRequests = async () => {
    if (fetchingMyRequests) {
      ('⏭️ Skipping fetchMyRequests - already in progress');
      return;
    }
    
    if (!user?.id) {
      ('⚠️ No user ID available for fetchMyRequests');
      return;
    }
    
    setFetchingMyRequests(true);
    try {
      const response = await serviceRequestAPI.getDoctorRequests(user.id);
      const doctorRequests = response.data || [];
      ('👨‍⚕️ Doctor requests:', doctorRequests);
      ('📊 Doctor request statuses:', doctorRequests.map(req => req.status));
      ('💰 Service prices in doctor requests:', doctorRequests.map(req => ({ 
        id: req.id, 
        serviceType: req.serviceType, 
        servicePrice: req.servicePrice,
        hasServicePrice: !!req.servicePrice 
      })));
      setMyRequests(doctorRequests);
      
      // Also fetch stats from backend
      try {
        const statsResponse = await doctorAPI.getStats(user.id);
        ('📊 [DASHBOARD] Backend stats response:', statsResponse);
        if (statsResponse.data?.data) {
          ('📊 [DASHBOARD] Using backend stats:', statsResponse.data.data);
          setStats(prev => ({
            ...prev,
            ...statsResponse.data.data
          }));
        }
      } catch (statsError) {
        console.error('📊 [DASHBOARD] Error fetching stats from backend, using fallback calculation:', statsError);
        // Fallback to calculating stats from available and completed requests
        const totalEarnings = completedRequests.reduce((sum, req) => sum + calculateDoctorTakeHome(calculateDoctorEarnings(req)), 0);
        ('📊 [DASHBOARD] Frontend calculated total earnings:', totalEarnings);
        
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
      console.error('❌ Error fetching completed requests:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      // Don't reset data on error - keep existing data
    } finally {
      setFetchingMyRequests(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setActionLoading(requestId);
    try {
      const response = await serviceRequestAPI.acceptRequest(requestId, user.id);
      if (response.data) {
        alert('Service request accepted successfully!');
        ('🔄 Manually refreshing after accepting request');
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

    ('🚫 Starting to reject request:', requestId);
    ('📊 Before reject - declinedRequests:', Array.from(declinedRequests));

    setActionLoading(requestId);
    try {
      const response = await serviceRequestAPI.rejectRequest(requestId, user.id, reason);
      if (response.data) {
        // Add the declined request to local state so it disappears from this doctor's view
        ('✅ API call successful, adding to declined requests');
        setDeclinedRequests(prev => {
          const newSet = new Set([...prev, requestId]);
          ('📊 New declined requests set:', Array.from(newSet));
          // Save to localStorage
          localStorage.setItem('declinedRequests', JSON.stringify(Array.from(newSet)));
          ('💾 Saved declined requests to localStorage');
          return newSet;
        });
        
        alert('Service request rejected successfully!');
        ('🔄 Request declined locally - no API refresh needed');
        
        ('📊 After decline - available requests:', getAvailablePendingRequests().length);
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
    
    ('🩺 Request to complete:', JSON.stringify(request, null, 2));
    ('🩺 Current request status:', request.status);
    ('🩺 Request ID:', requestId);
    ('🩺 Doctor ID:', request.doctor?.id);
    
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
        ('❌ Request completion failed - incorrect status after refresh:', freshRequest.status);
        return;
      }
      ('✅ Fresh request status verified:', freshRequest?.status);
    } catch (error) {
      console.error('❌ Error fetching fresh request data:', error);
      // Continue anyway as we already have the request data
    }
    
    // Calculate payment amount based on service pricing
    const doctorEarnings = calculateDoctorEarnings(request);
    const doctorTakeHome = calculateDoctorTakeHome(doctorEarnings);
    
    // Show the completion modal instead of multiple popups
    setCompletionRequest(request);
    setCompletionAmount(doctorTakeHome); // Show the actual amount doctor will receive
    setCompletionNotes('');
    setShowCompletionModal(true);
  };
  
  // Function to handle the actual completion after modal confirmation
  const handleConfirmCompletion = async () => {
    if (!completionRequest) return;
    
    setShowCompletionModal(false);
    setActionLoading(completionRequest.id);
    
    try {
      ('🚀 Sending complete request to API for ID:', completionRequest.id);
      const response = await serviceRequestAPI.completeRequest(completionRequest.id, completionNotes);
      ('✅ Complete request API response:', response);
      
      if (response.data) {
        // Show a single success notification
        alert(`Service completed successfully! Expected payment: ${formatCurrency(completionAmount)}`);
        
        // Refresh data immediately to update the UI, regardless of auto-refresh setting
        ('🔄 Manually refreshing data after successful completion');
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
      ('📊 Current request data:', JSON.stringify(completionRequest, null, 2));
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
    
    // Parse existing phone number to extract country code and number
    const fullPhone = doctorInfo?.phone || '';
    let countryCode = '+44'; // default
    let phoneNumberOnly = '';
    
    if (fullPhone) {
      // Check for common country codes
      const countryCodes = ['+256', '+254', '+234', '+44', '+1', '+91', '+86', '+33', '+49', '+39', '+34'];
      const matchedCode = countryCodes.find(code => fullPhone.startsWith(code));
      
      if (matchedCode) {
        countryCode = matchedCode;
        phoneNumberOnly = fullPhone.replace(matchedCode, '').replace(/^\s+/, ''); // Remove country code and leading spaces
      } else {
        phoneNumberOnly = fullPhone;
      }
    }
    
    setPhoneCountryCode(countryCode);
    setPhoneNumber(phoneNumberOnly);
    
    setEditProfileData({
      firstName: doctorInfo?.firstName || '',
      lastName: doctorInfo?.lastName || '',
      email: doctorInfo?.email || '',
      phone: fullPhone,
      licenseNumber: doctorInfo?.licenseNumber || '',
      qualifications: doctorInfo?.qualifications || '',
      bio: doctorInfo?.bio || '',
      address: doctorInfo?.address || '',
      city: doctorInfo?.city || '',
      state: doctorInfo?.state || '',
      zipCode: doctorInfo?.zipCode || '',
      latitude: doctorInfo?.latitude || '',
      longitude: doctorInfo?.longitude || '',
      serviceRadius: doctorInfo?.serviceRadius || 12
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

  const handlePhoneCountryCodeChange = (countryCode) => {
    setPhoneCountryCode(countryCode);
    // Update the full phone number in profile data
    const fullPhone = phoneNumber ? `${countryCode}${phoneNumber.replace(/\s/g, '')}` : countryCode;
    setEditProfileData(prev => ({
      ...prev,
      phone: fullPhone
    }));
  };

  const handlePhoneNumberChange = (number) => {
    setPhoneNumber(number);
    // Update the full phone number in profile data
    const fullPhone = number ? `${phoneCountryCode}${number.replace(/\s/g, '')}` : phoneCountryCode;
    setEditProfileData(prev => ({
      ...prev,
      phone: fullPhone
    }));
  };

  const handleDistanceChange = (distance) => {
    setEditProfileData(prev => ({
      ...prev,
      serviceRadius: distance
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileUpdateLoading(true);

    try {
      ('🔄 Updating doctor profile for user ID:', user.id);
      ('📝 Raw profile data:', editProfileData);
      
      // Transform data to ensure proper types and field name mapping
      const transformedData = {
        firstName: editProfileData.firstName,
        lastName: editProfileData.lastName,
        email: editProfileData.email,
        phone: editProfileData.phone,
        licenseNumber: editProfileData.licenseNumber,
        qualifications: editProfileData.qualifications,
        bio: editProfileData.bio,
        address: editProfileData.address,
        city: editProfileData.city,
        state: editProfileData.state,
        zipCode: editProfileData.zipCode,
        latitude: editProfileData.latitude ? parseFloat(editProfileData.latitude) : null,
        longitude: editProfileData.longitude ? parseFloat(editProfileData.longitude) : null,
        serviceRadius: editProfileData.serviceRadius ? parseInt(editProfileData.serviceRadius) : 12
      };
      
      ('📝 Transformed profile data being sent:', transformedData);
      
      // Try to update the doctor profile
      const response = await doctorAPI.updateProfile(user.id, transformedData);
      
      ('✅ Profile update response:', response);
      
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
        ('⚠️ No data in response:', response);
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
      licenseNumber: '',
      qualifications: '',
      bio: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      latitude: '',
      longitude: '',
      serviceRadius: 12
    });
    // Reset phone-related states
    setPhoneCountryCode('+44');
    setPhoneNumber('');
  };

  // Get current location for doctor profile
  const handleGetCurrentLocation = () => {
    setLocationLoading(true);
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setEditProfileData(prev => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString()
        }));
        
        // Optionally, reverse geocode to get address
        reverseGeocode(latitude, longitude);
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location. Please enter coordinates manually.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      // Try Google Maps API first (more reliable in production)
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (googleApiKey) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`
        );
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results[0]) {
          const result = data.results[0];
          const locationName = result.formatted_address || result.address_components[0]?.long_name;
          if (locationName) {
            setDoctorLocationName(locationName);
          }
          
          // Also update the form fields with detailed address components
          const components = result.address_components;
          const addressData = {};
          
          components.forEach(component => {
            const types = component.types;
            if (types.includes('locality')) addressData.city = component.long_name;
            if (types.includes('administrative_area_level_1')) addressData.state = component.long_name;
            if (types.includes('postal_code')) addressData.zipCode = component.long_name;
            if (types.includes('route')) addressData.address = component.long_name;
          });
          
          setEditProfileData(prev => ({
            ...prev,
            address: addressData.address || prev.address,
            city: addressData.city || prev.city,
            state: addressData.state || prev.state,
            zipCode: addressData.zipCode || prev.zipCode
          }));
          return;
        }
      }
      
      // Fallback to BigDataCloud API
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const data = await response.json();
      
      if (data) {
        // Create a readable location name
        const locationParts = [];
        if (data.locality) locationParts.push(data.locality);
        if (data.city && data.city !== data.locality) locationParts.push(data.city);
        if (data.principalSubdivision) locationParts.push(data.principalSubdivision);
        if (data.countryName) locationParts.push(data.countryName);
        
        const locationName = locationParts.join(', ');
        setDoctorLocationName(locationName);

        setEditProfileData(prev => ({
          ...prev,
          address: data.locality || '',
          city: data.city || '',
          state: data.principalSubdivision || '',
          zipCode: data.postcode || ''
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Set a fallback location name if available
      if (doctorData?.city) {
        const fallbackName = [doctorData.city, doctorData.state, doctorData.country].filter(Boolean).join(', ');
        setDoctorLocationName(fallbackName);
      }
    }
  };

  // Service Management Functions
  const loadDoctorServices = async () => {
    if (!doctorData?.id) return;
    
    try {
      setServiceLoading(true);
      // Get doctor data with populated services
      const response = await doctorAPI.getProfile(doctorData.id);
      if (response.data?.data?.services) {
        setDoctorServices(response.data.data.services);
      }
    } catch (error) {
      console.error('Error loading doctor services:', error);
    } finally {
      setServiceLoading(false);
    }
  };

  const loadAllServices = async () => {
    try {
      ('🔄 Loading all services...');
      
      // Use direct fetch to get all services without populate filters
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?sort=category:asc,displayOrder:asc,name:asc&pagination[limit]=100`);
      const responseData = await response.json();
      ('📊 All services response:', responseData);
      
      const allServicesData = responseData.data || [];
      ('📋 All services data:', allServicesData);
      
      // Filter active services and group by category
      const activeServices = allServicesData.filter(service => service.isActive === true);
      ('📋 Active services data:', activeServices.length, 'out of', allServicesData.length);
      
      const inPersonServices = activeServices.filter(service => service.category === 'in-person');
      const onlineServices = activeServices.filter(service => service.category === 'online');
      const nhsServices = activeServices.filter(service => service.category === 'nhs');
      
      ('📍 In-person services:', inPersonServices.length);
      ('💻 Online services:', onlineServices.length);
      ('🏛️ NHS services:', nhsServices.length);
      
      // Debug: log online service names
      ('💻 Online service names:', onlineServices.map(s => s.name));
      ('🏛️ NHS service names:', nhsServices.map(s => s.name));
      
      ('🔄 Setting allServices state...');
      setAllServices({
        inPerson: inPersonServices,
        online: onlineServices,
        nhs: nhsServices
      });
      ('✅ AllServices state set successfully');
    } catch (error) {
      console.error('Error loading all services:', error);
      // Fallback: try without authentication in case JWT is the issue
      try {
        ('🔄 Retrying without JWT token...');
        const token = localStorage.getItem('jwt');
        localStorage.removeItem('jwt');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?sort=category:asc,displayOrder:asc,name:asc&pagination[limit]=100`);
        const responseData = await response.json();
        const allServicesData = responseData.data || [];
        
        // Filter active services and group by category
        const activeServices = allServicesData.filter(service => service.isActive === true);
        const inPersonServices = activeServices.filter(service => service.category === 'in-person');
        const onlineServices = activeServices.filter(service => service.category === 'online');
        const nhsServices = activeServices.filter(service => service.category === 'nhs');
        
        setAllServices({
          inPerson: inPersonServices,
          online: onlineServices,
          nhs: nhsServices
        });
        
        // Restore token
        if (token) localStorage.setItem('jwt', token);
        ('✅ Services loaded successfully without JWT');
      } catch (fallbackError) {
        console.error('❌ Failed to load services even without JWT:', fallbackError);
      }
    }
  };

  const handleAddService = async (serviceId) => {
    if (!doctorData?.id || doctorServices.find(s => s.id === serviceId)) return;
    
    try {
      setServiceLoading(true);
      
      // Find the service to add
      const allServicesList = [...allServices.inPerson, ...allServices.online, ...allServices.nhs];
      const serviceToAdd = allServicesList.find(s => s.id === serviceId);
      
      if (!serviceToAdd) return;
      
      // Update doctor services
      const updatedServices = [...doctorServices.map(s => s.id), serviceId];
      await doctorAPI.updateProfile(doctorData.id, { services: updatedServices });
      
      // Update local state
      setDoctorServices([...doctorServices, serviceToAdd]);
      
      alert('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Failed to add service. Please try again.');
    } finally {
      setServiceLoading(false);
    }
  };

  const handleRemoveService = async (serviceId) => {
    if (!doctorData?.id || !doctorServices.find(s => s.id === serviceId)) return;
    
    try {
      setServiceLoading(true);
      
      // Update doctor services
      const updatedServices = doctorServices.filter(s => s.id !== serviceId).map(s => s.id);
      await doctorAPI.updateProfile(doctorData.id, { services: updatedServices });
      
      // Update local state
      setDoctorServices(doctorServices.filter(s => s.id !== serviceId));
      
      alert('Service removed successfully!');
    } catch (error) {
      console.error('Error removing service:', error);
      alert('Failed to remove service. Please try again.');
    } finally {
      setServiceLoading(false);
    }
  };

  const handleManageServices = async () => {
    setShowManageServices(true);
    await loadAllServices();
  };

  // Filter and pagination functions for Recent Service Requests
  const getFilteredAndPaginatedRequests = () => {
    let filteredRequests = myRequests;
    
    // Apply status filter
    if (requestFilter === 'completed') {
      filteredRequests = myRequests.filter(req => req.status === 'completed');
    }
    
    // Apply date filtering
    if (dateFromFilter || dateToFilter) {
      filteredRequests = filteredRequests.filter(req => {
        const requestDate = new Date(req.requestedAt);
        const fromDate = dateFromFilter ? new Date(dateFromFilter) : null;
        const toDate = dateToFilter ? new Date(dateToFilter + 'T23:59:59') : null; // Include full day
        
        let includeRequest = true;
        
        if (fromDate && requestDate < fromDate) {
          includeRequest = false;
        }
        
        if (toDate && requestDate > toDate) {
          includeRequest = false;
        }
        
        return includeRequest;
      });
    }
    
    // Calculate pagination
    const totalItems = filteredRequests.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
    
    return {
      requests: paginatedRequests,
      totalItems,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  };

  const handlePageChange = (newPage) => {
    const { totalPages } = getFilteredAndPaginatedRequests();
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const clearDateFilters = () => {
    setDateFromFilter('');
    setDateToFilter('');
    setCurrentPage(1);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [requestFilter, dateFromFilter, dateToFilter]);

  // Handler functions for card clicks
  const handlePendingRequestsClick = () => {
    setRequestFilter('pending');
    // Scroll to the requests section
    const requestsSection = document.getElementById('requests-section');
    if (requestsSection) {
      requestsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCompletedRequestsClick = () => {
    setRequestFilter('completed');
    // Scroll to the recent requests section
    const recentRequestsSection = document.getElementById('recent-requests-section');
    if (recentRequestsSection) {
      recentRequestsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Get doctor display data (either from backend or auth context)
  const doctor = doctorData || user;
  const doctorName = doctor?.name || 
    `${(doctor?.firstName || '').trim()} ${(doctor?.lastName || '').trim()}`.trim() || 
    doctor?.email?.split('@')[0] || 'Doctor';
  
  // For debugging - let's log what we're getting
  ('👨‍⚕️ Doctor data:', doctor);
  ('👤 Doctor firstName:', doctor?.firstName);
  ('👤 Doctor lastName:', doctor?.lastName);
  ('📝 Doctor name result:', doctorName);

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

  // Only show access denied if we're definitely not authenticated AND not loading
  if (!authLoading && (!isAuthenticated || !user || user.role !== 'doctor')) {
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
      isDarkMode 
        ? 'bg-gray-950 text-gray-100' 
        : 'relative overflow-hidden bg-gradient-to-b from-white via-blue-200/90 to-blue-300/80 text-gray-900'
    }`}>
      {/* Light-mode decorative accents */}
      {!isDarkMode && (
        <>
          <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-blue-400/45 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute top-40 -right-24 w-[28rem] h-[28rem] bg-indigo-300/45 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-cyan-300/35 rounded-full blur-3xl" />
        </>
      )}
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
              }`}>Service Cost</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(completionAmount || 0)}</p>
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
                className="px-4 py-2 text-white font-medium rounded-lg transition-colors"
                style={{backgroundColor: '#0F9297'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0d7e82'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0F9297'}
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
                    Phone Number
                  </label>
                  <CountryCodePicker
                    selectedCode={phoneCountryCode}
                    onCodeChange={handlePhoneCountryCodeChange}
                    phoneNumber={phoneNumber}
                    onPhoneChange={handlePhoneNumberChange}
                    placeholder="Enter phone number"
                    isDarkMode={isDarkMode}
                    required={false}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    GMC Number
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={editProfileData.licenseNumber}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter GMC number"
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

              {/* Location Information Section */}
              <div className={`border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Location Information
                  </h4>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locationLoading}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      locationLoading
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span>{locationLoading ? 'Getting Location...' : 'Use Current Location'}</span>
                  </button>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={editProfileData.address}
                    onChange={handleProfileInputChange}
                    className={`w-full rounded-lg p-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter your practice address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={editProfileData.city}
                      onChange={handleProfileInputChange}
                      className={`w-full rounded-lg p-3 transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      State/County
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={editProfileData.state}
                      onChange={handleProfileInputChange}
                      className={`w-full rounded-lg p-3 transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="State/County"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={editProfileData.zipCode}
                      onChange={handleProfileInputChange}
                      className={`w-full rounded-lg p-3 transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Postal Code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={editProfileData.latitude}
                      onChange={handleProfileInputChange}
                      className={`w-full rounded-lg p-3 transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Latitude (e.g., 51.5074)"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={editProfileData.longitude}
                      onChange={handleProfileInputChange}
                      className={`w-full rounded-lg p-3 transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Longitude (e.g., -0.1278)"
                    />
                  </div>
                </div>

                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border border-blue-800 text-blue-300' 
                    : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}>
                  <p className="font-medium mb-1">💡 Location Tips:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Click "Use Current Location" to automatically fill coordinates</li>
                    <li>• Accurate location helps businesses find you for service requests</li>
                    <li>• Your location is used for distance-based filtering and routing</li>
                  </ul>
                </div>

                {/* Service Radius Section */}
                <div className="mt-6">
                  <DistanceSlider
                    value={editProfileData.serviceRadius}
                    onChange={handleDistanceChange}
                    isDarkMode={isDarkMode}
                    businessLocation={editProfileData.latitude && editProfileData.longitude ? {
                      latitude: parseFloat(editProfileData.latitude),
                      longitude: parseFloat(editProfileData.longitude)
                    } : null}
                  />
                  <div className={`mt-2 p-3 rounded-lg text-sm ${
                    isDarkMode 
                      ? 'bg-purple-900/20 border border-purple-800 text-purple-300' 
                      : 'bg-purple-50 border border-purple-200 text-purple-700'
                  }`}>
                    <p className="font-medium mb-1">🎯 Service Radius Info:</p>
                    <ul className="text-xs space-y-1">
                      <li>• Only receive service requests from businesses within your selected radius</li>
                      <li>• You can adjust this anytime based on your availability and travel preferences</li>
                      <li>• Online services are not affected by distance settings</li>
                    </ul>
                  </div>
                </div>
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
                      : 'text-white'
                  }`}
                  style={{
                    backgroundColor: profileUpdateLoading ? '#9CA3AF' : '#0F9297'
                  }}
                >
                  {profileUpdateLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Services Modal */}
      {showManageServices && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Manage Your Services
                </h3>
                <button
                  onClick={() => setShowManageServices(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Current Services */}
              <div>
                <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Your Current Services ({doctorServices.length})
                </h4>
                <div className="grid gap-3">
                  {doctorServices.length === 0 ? (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No services selected yet.</p>
                    </div>
                  ) : (
                    doctorServices.map((service) => (
                      <div 
                        key={service.id} 
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            service.category === 'in-person' 
                              ? 'bg-green-500' 
                              : service.category === 'online' 
                                ? 'bg-blue-500' 
                                : 'bg-purple-500'
                          }`}></div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {service.name}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                service.category === 'in-person'
                                  ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                  : service.category === 'online'
                                    ? isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                    : isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {service.category === 'in-person' ? 'In-Person' : service.category === 'online' ? 'Online' : 'NHS'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {formatCurrency(calculateDoctorTakeHome(service.price || 0))}
                              </span>
                              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                • {service.duration || 30} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveService(service.id)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            isDarkMode 
                              ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' 
                              : 'bg-red-100 hover:bg-red-200 text-red-600'
                          }`}
                          disabled={serviceLoading}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Available Services to Add */}
              <div>
                <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Available Services to Add
                </h4>
                
                {/* In-Person Services */}
                <div className="mb-6">
                  <h5 className={`text-md font-medium mb-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    In-Person Services
                  </h5>
                  <div className="grid gap-3">
                    {allServices.inPerson
                      .filter(service => !doctorServices.find(ds => ds.id === service.id))
                      .map((service) => (
                        <div 
                          key={service.id} 
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/90 border-blue-100'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {service.name}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                    {formatCurrency(calculateDoctorTakeHome(service.price || 0))}
                                  </span>
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    • {service.duration || 30} min
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddService(service.id)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400' 
                                : 'bg-green-100 hover:bg-green-200 text-green-600'
                            }`}
                            disabled={serviceLoading}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Online Services */}
                <div>
                  <h5 className={`text-md font-medium mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    Online Services
                  </h5>
                  <div className="grid gap-3">
                    {(() => {
                      const filteredOnlineServices = allServices.online
                        .filter(service => !doctorServices.find(ds => ds.id === service.id));
                      ('🔍 Online Services Filtering Debug:');
                      ('  Total online services:', allServices.online.length);
                      ('  Doctor services count:', doctorServices.length);
                      ('  Filtered online services:', filteredOnlineServices.length);
                      ('  Doctor service IDs:', doctorServices.map(ds => ds.id));
                      ('  Online service IDs:', allServices.online.map(s => s.id));
                      return filteredOnlineServices;
                    })()
                      .map((service) => (
                        <div 
                          key={service.id} 
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/90 border-blue-100'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {service.name}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    {formatCurrency(calculateDoctorTakeHome(service.price || 0))}
                                  </span>
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    • {service.duration || 30} min
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddService(service.id)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400' 
                                : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                            }`}
                            disabled={serviceLoading}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* NHS Services */}
                <div>
                  <h5 className={`text-md font-medium mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    NHS Services
                  </h5>
                  <div className="grid gap-3">
                    {(() => {
                      const filteredNhsServices = allServices.nhs
                        .filter(service => !doctorServices.find(ds => ds.id === service.id));
                      ('🔍 NHS Services Filtering Debug:');
                      ('  Total NHS services:', allServices.nhs.length);
                      ('  Filtered NHS services:', filteredNhsServices.length);
                      ('  NHS service IDs:', allServices.nhs.map(s => s.id));
                      return filteredNhsServices;
                    })()
                      .map((service) => (
                        <div 
                          key={service.id} 
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/90 border-blue-100'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {service.name}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                    {formatCurrency(calculateDoctorTakeHome(service.price || 0))}
                                  </span>
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    • {service.duration || 30} min
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddService(service.id)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-400' 
                                : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
                            }`}
                            disabled={serviceLoading}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowManageServices(false)}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
      {/* Header */}
  <header className={`relative z-40 shadow-md transition-colors ${
        isDarkMode 
          ? 'bg-gray-900 border-b border-gray-800' 
          : 'bg-white/80 supports-[backdrop-filter]:backdrop-blur-md backdrop-blur border-b border-blue-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 rounded-lg shadow-lg">
                <img src="/logo.png" alt="ThanksDoc Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Dr. {doctorName}
                </h1>
                <div className="flex items-center space-x-4">
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Medical Professional
                  </p>
                  {/* Current Location Display */}
                  {(doctor?.latitude && doctor?.longitude) && doctorLocationName && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-md ${
                      isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'
                    }`}>
                      <MapPin className={`h-3 w-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {doctorLocationName}
                      </span>
                    </div>
                  )}
                  {(doctor?.latitude && doctor?.longitude) && !doctorLocationName && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-md ${
                      isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100/50'
                    }`}>
                      <MapPin className={`h-3 w-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Detecting location...
                      </span>
                    </div>
                  )}
                  {!(doctor?.latitude && doctor?.longitude) && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-md ${
                      isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100/50'
                    }`}>
                      <MapPin className={`h-3 w-3 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <span className={`text-xs ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Location not set - Edit your doctor profile to set location
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Profile Summary and Controls */}
            <div className="flex items-center space-x-4">
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                  style={{backgroundColor: isAvailable ? '#0F9297' : '#6B7280'}}
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
              {/* Notification Center */}
              {user && (
                <NotificationCenter 
                  doctorId={user.id} 
                  className="relative"
                />
              )}
              
              {/* Auto-refresh indicator */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center px-2 py-1 bg-gray-800 rounded-md">
                  <div className={`flex items-center mr-2`} style={{color: autoRefresh ? '#0F9297' : '#6B7280'}}>
                    <svg className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-xs">{autoRefresh ? 'Auto-updating' : 'Updates paused'}</span>
                  </div>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`text-xs px-2 py-0.5 rounded`}
                    style={{
                      backgroundColor: autoRefresh ? '#0F9297' : '#374151',
                      color: autoRefresh ? 'white' : '#D1D5DB'
                    }}
                  >
                    {autoRefresh ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
              
              {/* Service request notification counter */}
              {getAvailablePendingRequests().length > 0 && (
                <div className="relative">
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {getAvailablePendingRequests().length}
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
              {/* Mobile Notification Center */}
              {user && (
                <div className="flex justify-center">
                  <NotificationCenter 
                    doctorId={user.id} 
                    className="relative"
                  />
                </div>
              )}
              
              {/* Auto-refresh control */}
              <div className="flex items-center px-2 py-1 bg-gray-800 rounded-md">
                <div className={`flex items-center mr-2`} style={{color: autoRefresh ? '#0F9297' : '#6B7280'}}>
                  <svg className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs">{autoRefresh ? 'Auto-updating' : 'Updates paused'}</span>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-xs px-2 py-0.5 rounded`}
                  style={{
                    backgroundColor: autoRefresh ? '#0F9297' : '#374151',
                    color: autoRefresh ? 'white' : '#D1D5DB'
                  }}
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
              
              {/* Service request notification indicator */}
              {getAvailablePendingRequests().length > 0 && (
                <div className="bg-red-900/30 text-red-300 rounded-md px-3 py-2 text-center">
                  <span className="font-medium">
                    {getAvailablePendingRequests().length} pending requests
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

  <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Urgent Notification Banner */}
        {user && (
          <NotificationBanner 
            doctorId={user.id} 
            className="mb-6"
          />
        )}
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards - Mobile responsive */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
      <button 
                onClick={handlePendingRequestsClick}
                className={`p-3 lg:p-4 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left ${
                  isDarkMode 
        ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
        : 'bg-white/90 border-blue-100 hover:bg-blue-50/40'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">Pending</p>
                    <p className={`text-lg lg:text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.pendingRequests}</p>
                  </div>
                  <div className={`p-1.5 lg:p-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-yellow-900/30' 
                      : 'bg-yellow-600'
                  }`}>
                    <Clock className={`h-4 w-4 ${
                      isDarkMode ? 'text-yellow-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </button>
      <button 
                onClick={handleCompletedRequestsClick}
                className={`p-3 lg:p-4 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left ${
                  isDarkMode 
        ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
        : 'bg-white/90 border-blue-100 hover:bg-blue-50/40'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-400 font-medium">Completed</p>
                    <p className={`text-lg lg:text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{stats.completedRequests}</p>
                  </div>
                  <div className={`p-1.5 lg:p-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-green-900/30' 
                      : 'bg-green-600'
                  }`}>
                    <Check className={`h-4 w-4 ${
                      isDarkMode ? 'text-green-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </button>
      <button 
                onClick={() => router.push('/doctor/earnings')}
                className={`p-3 lg:p-4 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left ${
                  isDarkMode 
        ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
        : 'bg-white/90 border-blue-100 hover:bg-blue-50/40'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{color: '#0F9297'}}>Earnings</p>
                    <p className={`text-lg lg:text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{formatCurrency(stats.totalEarnings || 0)}</p>
                  </div>
                  <div className={`p-1.5 lg:p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                    <TrendingUp className={`h-4 w-4 ${
                      isDarkMode ? 'text-white' : 'text-white'
                    }`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
                  </div>
                </div>
              </button>
      <button 
                onClick={handleManageServices}
                className={`p-3 lg:p-4 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left ${
                  isDarkMode 
        ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
        : 'bg-white/90 border-blue-100 hover:bg-blue-50/40'
                }`}
                disabled={serviceLoading}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{color: '#0F9297'}}>Services</p>
                    <p className={`text-lg lg:text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{doctorServices.length}</p>
                  </div>
                  <div className={`p-1.5 lg:p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                    <Settings className={`h-4 w-4 ${
                      isDarkMode ? 'text-white' : 'text-white'
                    }`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
                  </div>
                </div>
              </button>
      <button 
                onClick={() => router.push('/doctor/compliance')}
                className={`p-3 lg:p-4 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left ${
                  isDarkMode 
        ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
        : 'bg-white/90 border-blue-100 hover:bg-blue-50/40'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-400 font-medium">Docs</p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>Compliance</p>
                  </div>
                  <div className={`p-1.5 lg:p-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-red-900/30' 
                      : 'bg-red-600'
                  }`}>
                    <FileText className={`h-4 w-4 ${
                      isDarkMode ? 'text-red-400' : 'text-white'
                    }`} />
                  </div>
                </div>
              </button>
            </div>

            {/* Service Radius Information */}
            <div className={`rounded-lg shadow border p-4 ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-800' 
                : 'bg-white/90 border-blue-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                  <MapPin className={`h-4 w-4`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
                </div>
                <div className="flex-1">
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Service Area
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    You are currently receiving service requests within{' '}
                    <span className="font-semibold" style={{color: '#0F9297'}}>
                      {doctorData?.serviceRadius === -1 
                        ? 'unlimited distance' 
                        : `${doctorData?.serviceRadius || 12} miles`
                      }
                    </span>
                    {' '}of your location
                  </p>
                </div>
                <button
                  onClick={handleEditProfile}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Adjust Range
                </button>
              </div>
            </div>

            {/* Available Requests */}
            <div id="requests-section" className={`rounded-lg shadow border ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-800' 
                : 'bg-white/90 border-blue-200'
            }`}>
              <div className={`p-6 border-b rounded-t-lg ${
                isDarkMode 
                  ? 'border-gray-800 bg-gray-900' 
                  : 'border-blue-200 bg-blue-100/60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                      <Clock className={`h-5 w-5`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
                    </div>
                    <div>
                      <h2 className={`text-xl font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {requestFilter === 'pending' ? 'Pending Service Requests' : 'Available Service Requests'}
                      </h2>
                      <p className={`text-sm font-medium`} style={{color: '#0F9297'}}>
                        {requestFilter === 'pending' 
                          ? 'Service requests waiting for response' 
                          : 'Nearby businesses needing medical assistance'
                        }
                      </p>
                      {requestFilter !== 'all' && (
                        <button
                          onClick={() => setRequestFilter('all')}
                          className={`mt-2 text-xs px-3 py-1 rounded-full border transition-colors ${
                            isDarkMode 
                              ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Show All Requests
                        </button>
                      )}
                    </div>
                  </div>
                  {getAvailablePendingRequests().length > 0 && (
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
                        🔔 {getAvailablePendingRequests().length} New Request{getAvailablePendingRequests().length > 1 ? 's' : ''}
                      </span>
                      </div>
                  )}
                </div>
              </div>
              <div className={`divide-y ${
                isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {(() => {
                  let filteredRequests = [];
                  
                  // Apply filter based on requestFilter state
                  if (requestFilter === 'pending') {
                    // Use the helper function to get available pending requests
                    filteredRequests = getAvailablePendingRequests();
                  } else if (requestFilter === 'completed') {
                    // For completed requests, we should show from myRequests instead
                    filteredRequests = myRequests.filter(req => req.status === 'completed');
                  } else {
                    // For 'all' filter, show only available pending requests (declined ones should be hidden)
                    filteredRequests = getAvailablePendingRequests();
                  }
                  
                  return filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
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
                          
                          {/* Service Date/Time Display */}
                          {/* Business Name - Made more prominent */}
                          <h2 className={`text-lg font-bold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`} style={{color: '#0F9297'}}>{request.business?.businessName || 'Business'}</h2>
                          
                          {request.requestedServiceDateTime && (
                            <div className={`mb-3 p-2 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-blue-900/20 border-blue-800 text-blue-300' 
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  Service Requested for: {formatDate(request.requestedServiceDateTime)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <h3 className={`font-medium mb-1 text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>{request.serviceType}</h3>
                          <p className={`text-sm mb-3 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>{request.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-gray-400 bg-gray-700/50' 
                                : 'text-gray-600 bg-gray-100'
                            }`}>
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{formatDuration(request.estimatedDuration)}min</span>
                            </div>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'text-green-400 bg-green-900/20' 
                                : 'text-green-600 bg-green-50'
                            }`}>
                              <span className="font-semibold">{formatCurrency(calculateDoctorTakeHome(calculateDoctorEarnings(request)))}</span>
                            </div>
                          </div>
                          
                          {/* Display contact info when request is accepted */}
                          {request.status === 'accepted' && (
                            <div className={`mt-4 p-3 border rounded-lg ${
                              isDarkMode 
                                ? 'bg-green-900/10 border-green-800' 
                                : 'bg-green-50 border-green-200'
                            }`}>
                              {request.isPatientRequest ? (
                                // Patient request contact info
                                <div>
                                  <h4 className={`font-semibold text-sm mb-2 ${
                                    isDarkMode ? 'text-green-300' : 'text-green-800'
                                  }`}>Patient Contact Information:</h4>
                                  <div className="space-y-2">
                                    {(request.patientFirstName || request.patientLastName) && (
                                      <div className="flex items-center space-x-2 text-sm">
                                        <span className={`font-medium ${
                                          isDarkMode ? 'text-green-400' : 'text-green-700'
                                        }`}>Patient:</span>
                                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                          {[request.patientFirstName, request.patientLastName].filter(Boolean).join(' ')}
                                        </span>
                                      </div>
                                    )}
                                    {request.patientPhone && (
                                      <div className="flex items-center space-x-2 text-sm">
                                        <span className={`font-medium ${
                                          isDarkMode ? 'text-green-400' : 'text-green-700'
                                        }`}>Phone:</span>
                                        <a href={`tel:${request.patientPhone}`} className={`hover:underline inline-flex items-center`} style={{color: '#0F9297'}}>
                                          <Phone className="h-3 w-3 mr-1" style={{color: '#0F9297'}} />
                                          {request.patientPhone}
                                        </a>
                                      </div>
                                    )}
                                    {request.patientEmail && (
                                      <div className="flex items-center space-x-2 text-sm">
                                        <span className={`font-medium ${
                                          isDarkMode ? 'text-green-400' : 'text-green-700'
                                        }`}>Email:</span>
                                        <a href={`mailto:${request.patientEmail}`} className={`hover:underline`} style={{color: '#0F9297'}}>
                                          {request.patientEmail}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                // Business request contact info
                                <div>
                                  <h4 className={`font-semibold text-sm mb-2 ${
                                    isDarkMode ? 'text-green-300' : 'text-green-800'
                                  }`}>Business Contact Information:</h4>
                                  <div className="space-y-2">
                                    {request.business?.contactPersonName && (
                                      <div className="flex items-center space-x-2 text-sm">
                                        <span className={`font-medium ${
                                          isDarkMode ? 'text-green-400' : 'text-green-700'
                                        }`}>Contact:</span>
                                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                          {request.business.contactPersonName}
                                        </span>
                                      </div>
                                    )}
                                    {request.business?.phone && (
                                      <div className="flex items-center space-x-2 text-sm">
                                        <span className={`font-medium ${
                                          isDarkMode ? 'text-green-400' : 'text-green-700'
                                        }`}>Phone:</span>
                                        <a href={`tel:${request.business.phone}`} className={`hover:underline inline-flex items-center`} style={{color: '#0F9297'}}>
                                          <Phone className="h-3 w-3 mr-1" style={{color: '#0F9297'}} />
                                          {request.business.phone}
                                        </a>
                                      </div>
                                    )}
                                    {request.business?.address && (
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
                                            className={`hover:underline text-xs inline-flex items-center mt-1`}
                                            style={{color: '#0F9297'}}
                                          >
                                            <MapPin className="h-3 w-3 mr-1" style={{color: '#0F9297'}} />View on Map
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
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
                        }`}>
                          {requestFilter === 'pending' 
                            ? 'No pending requests' 
                            : requestFilter === 'completed' 
                              ? 'No completed requests' 
                              : 'No service requests available'
                          }
                        </p>
                        <p className="text-sm">
                          {requestFilter === 'pending' 
                            ? 'No pending requests at the moment.' 
                            : requestFilter === 'completed' 
                              ? 'No completed requests to show.' 
                              : 'Check back later for new requests from businesses in your area.'
                          }
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Doctor Profile Sidebar */}
          <div className="space-y-6">
            {/* Doctor Profile */}
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow border p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                    <User className={`h-5 w-5`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
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
                {doctor?.licenseNumber && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>GMC:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{doctor.licenseNumber}</span>
                  </div>
                )}
                {doctor?.zipCode && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Postal Code:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{doctor.zipCode}</span>
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
                
                {/* Location Information */}
                {(doctor?.latitude && doctor?.longitude) ? (
                  <div className={`py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className={`h-4 w-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Location:</span>
                    </div>
                    
                    {/* Place Name from Coordinates */}
                    {doctorLocationName ? (
                      <div className="mb-2">
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                          {doctorLocationName}
                        </span>
                      </div>
                    ) : (
                      <div className="mb-2">
                        <span className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-sm`}>
                          Detecting location...
                        </span>
                      </div>
                    )}
                    
                    {/* Coordinates */}
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      📍 Coordinates: {parseFloat(doctor.latitude).toFixed(6)}, {parseFloat(doctor.longitude).toFixed(6)}
                    </div>
                  </div>
                ) : (
                  <div className={`py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-2">
                      <MapPin className={`h-4 w-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Location:</span>
                      <span className={`${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} text-sm`}>Coordinates not set</span>
                    </div>
                  </div>
                )}
                <div className={`flex justify-between items-center py-2 px-3 rounded-lg mt-4`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.2)' : 'rgba(15, 146, 151, 0.1)'}}>
                  <span className={`font-medium`} style={{color: '#0F9297'}}>Total Earnings:</span>
                  <span className={`font-bold text-lg`} style={{color: '#0F9297'}}>{formatCurrency(stats.totalEarnings || 0)}</span>
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

        {/* Recent Service Requests Section - Side by side with My Services */}
        <div id="recent-requests-section" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Recent Service Requests - Takes 2 columns on desktop, full width on mobile */}
            <div className="lg:col-span-2 order-1 lg:order-1">
              <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow border`}>
            <div className={`p-4 lg:p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-blue-200 bg-blue-100/60'} rounded-t-lg`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                    <Clock className={`h-5 w-5`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
                  </div>
                  <div>
                    <h2 className={`text-lg lg:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {requestFilter === 'completed' ? 'Completed Service Requests' : 'Recent Service Requests'}
                    </h2>
                    {requestFilter !== 'all' && (
                      <button
                        onClick={() => setRequestFilter('all')}
                        className={`mt-1 text-xs px-3 py-1 rounded-full border transition-colors ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                            : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Show All Requests
                      </button>
                    )}
                  </div>
                </div>
                {(() => {
                  const { totalItems } = getFilteredAndPaginatedRequests();
                  return totalItems > 0 && (
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {totalItems} {requestFilter === 'completed' ? 'completed' : 'total'} requests
                    </div>
                  );
                })()}
              </div>
              
              {/* Date Filter Controls - Mobile responsive */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label className={`text-sm font-medium whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    From:
                  </label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className={`flex-1 sm:flex-none px-3 py-1 text-sm rounded border ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label className={`text-sm font-medium whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    To:
                  </label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className={`flex-1 sm:flex-none px-3 py-1 text-sm rounded border ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                {(dateFromFilter || dateToFilter) && (
                  <button
                    onClick={clearDateFilters}
                    className={`w-full sm:w-auto px-3 py-1 text-sm rounded border transition-colors ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {(() => {
                const { requests, totalItems, totalPages, currentPage, hasNextPage, hasPrevPage } = getFilteredAndPaginatedRequests();
                
                return totalItems > 0 ? (
                  <>
                    {/* Service Request List */}
                    {requests.map((request) => (
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
                          
                          {/* Service Date/Time Display */}
                          {request.requestedServiceDateTime && (
                            <div className={`mb-2 p-2 rounded border ${
                              isDarkMode 
                                ? 'bg-blue-900/20 border-blue-800 text-blue-300' 
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs font-medium">
                                  Service for: {formatDate(request.requestedServiceDateTime)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                          {request.isPatientRequest ? (
                            // Patient request display
                            <div className="mt-2">
                              <p className={`text-xs font-medium`} style={{color: '#0F9297'}}>
                                Patient: {[request.patientFirstName, request.patientLastName].filter(Boolean).join(' ') || 'Private Patient'}
                              </p>
                              
                              {/* Show patient contact info when request is accepted */}
                              {request.status === 'accepted' && request.patientPhone && (
                                <div className={`mt-2 p-3 ${isDarkMode ? 'bg-blue-900/10 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                                  <h4 className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} text-xs mb-2`}>Patient Contact Information:</h4>
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Phone className="h-3 w-3" style={{color: '#0F9297'}} />
                                    <a href={`tel:${request.patientPhone}`} className={`hover:underline text-xs`} style={{color: '#0F9297'}}>
                                      {request.patientPhone}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Business request display
                            <div className="mt-2">
                              <p className={`text-xs font-medium`} style={{color: '#0F9297'}}>
                                Business: {request.business?.businessName || 'Business'}
                              </p>
                              
                              {/* Show business contact info when request is accepted */}
                              {request.status === 'accepted' && request.business?.phone && (
                                <div className={`mt-2 p-3 ${isDarkMode ? 'bg-blue-900/10 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                                  <h4 className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} text-xs mb-2`}>Business Contact Information:</h4>
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Phone className="h-3 w-3" style={{color: '#0F9297'}} />
                                    <a href={`tel:${request.business.phone}`} className={`hover:underline text-xs`} style={{color: '#0F9297'}}>
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
                              <span className="font-medium">{formatDuration(request.estimatedDuration)}min</span>
                            </div>
                          </div>
                          {request.status === 'completed' && (
                            <div className={`${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'} px-3 py-2 rounded-lg flex flex-col items-end`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>{formatCurrency(calculateDoctorTakeHome(calculateDoctorEarnings(request)))}</span>
                              <div className="flex items-center space-x-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                                COMPLETED
                              </div>
                            </div>
                          )}
                          {(request.status === 'accepted' || request.status === 'in_progress') && (
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
                    ))}
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} order-2 sm:order-1`}>
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} requests
                          </div>
                          <div className="flex items-center space-x-2 order-1 sm:order-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={!hasPrevPage}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                !hasPrevPage
                                  ? isDarkMode 
                                    ? 'border-gray-700 text-gray-500 cursor-not-allowed bg-gray-800 border' 
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed bg-white border'
                                  : isDarkMode 
                                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800 border' 
                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50 bg-white border'
                              } disabled:opacity-50`}
                            >
                              Previous
                            </button>
                            
                            {/* Page Numbers - Mobile optimized with simplified display */}
                            <div className="flex items-center space-x-1">
                              {/* Simple mobile pagination - show only current page info and basic controls */}
                              <div className="hidden sm:flex space-x-1 overflow-x-auto max-w-sm scrollbar-hide">
                                {(() => {
                                  const maxVisiblePages = 3; // Reduced further for better mobile fit
                                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                  
                                  // Adjust start page if we're near the end
                                  if (endPage - startPage + 1 < maxVisiblePages) {
                                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                  }
                                  
                                  const pages = [];
                                  
                                  // Add first page if not in visible range
                                  if (startPage > 1) {
                                    pages.push(
                                      <button
                                        key={1}
                                        onClick={() => handlePageChange(1)}
                                        className={`px-2 py-1 text-sm font-medium rounded transition-colors flex-shrink-0 ${
                                          currentPage === 1
                                            ? 'bg-blue-600 text-white'
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
                                        <span key="ellipsis1" className={`px-1 py-1 text-sm flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                                          className={`px-2 py-1 text-sm font-medium rounded transition-colors flex-shrink-0 ${
                                            currentPage === i
                                              ? 'bg-blue-600 text-white'
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
                                  
                                  // Add last page if not in visible range
                                  if (endPage < totalPages) {
                                    if (endPage < totalPages - 1) {
                                      pages.push(
                                        <span key="ellipsis2" className={`px-1 py-1 text-sm flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          ...
                                        </span>
                                      );
                                    }
                                    
                                    pages.push(
                                      <button
                                        key={totalPages}
                                        onClick={() => handlePageChange(totalPages)}
                                        className={`px-2 py-1 text-sm font-medium rounded transition-colors flex-shrink-0 ${
                                          currentPage === totalPages
                                            ? 'bg-blue-600 text-white'
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
                              
                              {/* Mobile-only simple page indicator */}
                              <div className={`sm:hidden px-3 py-1 text-sm rounded border ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-600 text-gray-300' 
                                  : 'bg-gray-100 border-gray-300 text-gray-600'
                              }`}>
                                {currentPage} / {totalPages}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={!hasNextPage}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                !hasNextPage
                                  ? isDarkMode 
                                    ? 'border-gray-700 text-gray-500 cursor-not-allowed bg-gray-800 border' 
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed bg-white border'
                                  : isDarkMode 
                                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800 border' 
                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50 bg-white border'
                              } disabled:opacity-50`}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-6`}>
                      <Stethoscope className={`h-12 w-12 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                      <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {(dateFromFilter || dateToFilter) 
                          ? 'No requests found for the selected date range' 
                          : requestFilter === 'completed' 
                            ? 'No completed requests yet' 
                            : 'No service requests yet'
                        }
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(dateFromFilter || dateToFilter) 
                          ? 'Try adjusting your date filters to see more results.' 
                          : requestFilter === 'completed' 
                            ? 'Completed service requests will appear here.' 
                            : 'Service requests you accept will appear here.'
                        }
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}