'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Clock, User, MapPin, DollarSign, LogOut, X, Phone, CreditCard, Lock, Edit, Save } from 'lucide-react';
import { serviceRequestAPI, doctorAPI, businessAPI, serviceAPI } from '../../../lib/api';
import api from '../../../lib/api';
import { formatCurrency, formatDate, getStatusColor, getTimeElapsed, filterDoctorsByDistance, sortDoctorsByDistance, getDoctorDistance, formatDistance } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';
import PaymentForm from '../../../components/PaymentForm';
import CountryCodePicker from '../../../components/CountryCodePicker';
import DistanceSlider from '../../../components/DistanceSlider';

// Helper function to check fallback status
const checkFallbackStatus = async (requestId) => {
  try {
    const response = await serviceRequestAPI.checkFallbackStatus(requestId);
    return response.data || response;
  } catch (error) {
    console.error('Error checking fallback status:', error);
    return null;
  }
};

// LocationDisplay component for reverse geocoding
const LocationDisplay = ({ latitude, longitude, isDarkMode }) => {
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getLocationName = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY&limit=1&no_annotations=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            // Extract meaningful place name
            const placeName = result.formatted || 
                            `${result.components.suburb || result.components.neighbourhood || ''} ${result.components.city || result.components.town || ''}`.trim() ||
                            `${result.components.city || result.components.state || 'Unknown Location'}`;
            setLocationName(placeName);
          } else {
            setLocationName('Location unavailable');
          }
        } else {
          // Fallback to a simpler display if API fails
          setLocationName(`${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`);
        }
      } catch (error) {
        console.error('Error fetching location name:', error);
        // Fallback to coordinates
        setLocationName(`${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`);
      } finally {
        setLoading(false);
      }
    };

    if (latitude && longitude) {
      getLocationName();
    }
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="mb-2">
        <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-500'} text-sm`}>Place:</span>
        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1 italic`}>
          Loading location name...
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-500'} text-sm`}>Place:</span>
      <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm mt-1 font-medium`}>
        {locationName}
      </div>
    </div>
  );
};

export default function BusinessDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const { getBookingFee } = useSystemSettings();
  
  // Dynamic booking fee from system settings
  const SERVICE_CHARGE = getBookingFee(); // Dynamic booking fee for all requests
  
  // Helper function to calculate total amount including booking fee
  const calculateTotalAmount = (request) => {
    // For new temporary requests, the totalAmount is already correctly calculated
    if (request.id && request.id.toString().startsWith('temp-')) {
      return request.totalAmount; // Already includes service price + booking fee
    }
    
    // If totalAmount already includes booking fee (backend calculated), use it
    // Otherwise, calculate based on service price + booking fee
    const baseAmount = request.totalAmount || 0;
    const serviceCharge = request.serviceCharge || SERVICE_CHARGE;
    
    // Find the service price based on serviceType
    const service = availableServices.find(s => s.name === request.serviceType);
    const servicePrice = service ? parseFloat(service.price) : 0; // Use 0 if service not found, should rely on stored servicePrice
    const expectedTotal = servicePrice + serviceCharge;
    
    // If totalAmount is close to expected total, use it; otherwise calculate from service price
    if (baseAmount >= expectedTotal - 1 && baseAmount <= expectedTotal + 1) {
      return baseAmount; // Already includes correct total
    } else {
      return servicePrice + serviceCharge; // Calculate from service price + booking fee
    }
  };
  
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
    serviceId: '', // Add serviceId for service selection
    subcategoryId: '', // Add subcategoryId for subcategory selection
    description: '',
    estimatedDuration: 1,
    preferredDoctorId: null,
    doctorSelectionType: 'any', // 'any' or 'previous'
    serviceDate: '',
    serviceTime: '',
    // Patient information fields for online consultations
    patientFirstName: '',
    patientLastName: '',
    patientPhone: '',
    patientCountryCode: '+44', // Default to UK
    patientEmail: '',
  });
  const [previousDoctors, setPreviousDoctors] = useState([]);
  const [loadingPreviousDoctors, setLoadingPreviousDoctors] = useState(false);
  
  // New states for service selection and service-based doctor filtering
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceBasedDoctors, setServiceBasedDoctors] = useState([]);
  const [loadingServiceDoctors, setLoadingServiceDoctors] = useState(false);
  const [serviceCost, setServiceCost] = useState(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [showHoursPopup, setShowHoursPopup] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [requestHours, setRequestHours] = useState(1);
  const [quickRequestServiceType, setQuickRequestServiceType] = useState('');
  const [quickRequestServiceId, setQuickRequestServiceId] = useState('');
  const [quickRequestServiceDate, setQuickRequestServiceDate] = useState('');
  const [quickRequestServiceTime, setQuickRequestServiceTime] = useState('');
  
  // Patient information for quick request (individual doctor form)
  const [quickRequestPatientFirstName, setQuickRequestPatientFirstName] = useState('');
  const [quickRequestPatientLastName, setQuickRequestPatientLastName] = useState('');
  const [quickRequestPatientPhone, setQuickRequestPatientPhone] = useState('');
  const [quickRequestPatientCountryCode, setQuickRequestPatientCountryCode] = useState('+44');
  const [quickRequestPatientEmail, setQuickRequestPatientEmail] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fallback status tracking
  const [fallbackStatuses, setFallbackStatuses] = useState({});
  const requestsPerPage = 5;
  
  // Distance filtering states
  const [distanceFilter, setDistanceFilter] = useState(10); // Default to 10km
  const [businessLocation, setBusinessLocation] = useState(null);
  const [businessLocationName, setBusinessLocationName] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [filteredDoctorsByDistance, setFilteredDoctorsByDistance] = useState([]);
  const [filteredPreviousDoctorsByDistance, setFilteredPreviousDoctorsByDistance] = useState([]);

  // Business profile editing states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    businessName: '',
    contactPersonName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    description: '',
    latitude: '',
    longitude: ''
  });
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [businessLocationLoading, setBusinessLocationLoading] = useState(false);

  // Auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds refresh rate

  // Distance filtering functions
  const applyDistanceFilter = (distance = distanceFilter, selectedServiceId = null) => {
    if (!businessLocation) {
      setFilteredDoctorsByDistance(nearbyDoctors);
      setFilteredPreviousDoctorsByDistance(previousDoctors);
      return;
    }

    // Filter main doctors list by distance
    let filtered = distance === -1 
      ? nearbyDoctors 
      : filterDoctorsByDistance(nearbyDoctors, businessLocation, distance);
    
    // Filter previous doctors list by distance
    let filteredPrevious = distance === -1 
      ? previousDoctors 
      : filterDoctorsByDistance(previousDoctors, businessLocation, distance);
    
    // Apply service filtering if a service is selected
    if (selectedServiceId) {
      filtered = filtered.filter(doctor => doctorOffersService(doctor, selectedServiceId));
      filteredPrevious = filteredPrevious.filter(doctor => doctorOffersService(doctor, selectedServiceId));
    }
    
    // Sort both lists by distance regardless of filter
    filtered = sortDoctorsByDistance(filtered, businessLocation);
    filteredPrevious = sortDoctorsByDistance(filteredPrevious, businessLocation);
    
    // Only log when there's a mismatch or for debugging
    console.log('📍 Distance & Service Filter Result:', {
      range: distance === -1 ? 'Anywhere' : `${distance}km`,
      selectedService: selectedServiceId ? `Service ID: ${selectedServiceId}` : 'No service filter',
      totalDoctors: nearbyDoctors.length,
      filteredCount: filtered.length,
      totalPreviousDoctors: previousDoctors.length,
      filteredPreviousCount: filteredPrevious.length,
      businessLocation: `${businessLocation.latitude}, ${businessLocation.longitude}`
    });

    setFilteredDoctorsByDistance(filtered);
    setFilteredPreviousDoctorsByDistance(filteredPrevious);
  };

  const handleDistanceFilterChange = (newDistance) => {
    setDistanceFilter(newDistance);
    // Apply both distance and service filter (if a service is selected in the form)
    applyDistanceFilter(newDistance, formData.serviceId);
  };

  // Authentication check - redirect if not authenticated or not business
  useEffect(() => {
    console.log('🔍 Business Dashboard - Auth state check:', {
      authLoading,
      isAuthenticated,
      user: user ? { id: user.id, email: user.email, role: user.role } : null
    });

    // Don't redirect while authentication is still loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }

    // Add a small delay to ensure AuthContext has fully initialized
    const timeoutId = setTimeout(() => {
      // Only redirect if we're sure about the authentication state (not loading)
      if (!authLoading && isAuthenticated === false) {
        console.log('🚫 Not authenticated after delay, redirecting to business login');
        router.push('/business/login');
        return;
      }
      
      // Only check role if we have a user and are not loading
      if (!authLoading && isAuthenticated && user && user.role !== 'business') {
        console.log('🚫 Not business role (got:', user.role, '), redirecting to home');
        router.push('/');
        return;
      }
      
      if (!authLoading && isAuthenticated && user && user.role === 'business') {
        console.log('✅ Business authenticated, loading dashboard');
      }
    }, 500); // 500ms delay to ensure auth is fully loaded

    // Cleanup timeout if component unmounts or dependencies change
    return () => clearTimeout(timeoutId);
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    console.log('🏢 Business Dashboard useEffect - User:', user);
    console.log('🆔 User ID:', user?.id);
    console.log('📧 User email:', user?.email);
    
    if (user?.id) {
      fetchBusinessData();
      fetchServiceRequests();
      fetchNearbyDoctors();
      fetchAvailableServices(); // Fetch available services
    }
  }, [user]);

  useEffect(() => {
    if (!autoRefresh || !user?.id) return;
    
    const refreshInterval = setInterval(() => {
      fetchServiceRequests();
      fetchNearbyDoctors();
      setLastRefreshTime(new Date());
    }, AUTO_REFRESH_INTERVAL);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [autoRefresh, user?.id]);

  // Check fallback statuses for requests
  useEffect(() => {
    const checkAllFallbackStatuses = async () => {
      if (serviceRequests.length === 0) return;
      
      const newStatuses = {};
      
      for (const request of serviceRequests) {
        // Only check fallback status for pending requests with assigned doctors
        if (request.status === 'pending' && request.doctor) {
          const status = await checkFallbackStatus(request.id);
          if (status) {
            newStatuses[request.id] = status;
          }
        }
      }
      
      setFallbackStatuses(newStatuses);
    };
    
    // Check fallback statuses when requests change
    checkAllFallbackStatuses();
    
    // Set up periodic checking every 30 seconds
    const fallbackInterval = setInterval(checkAllFallbackStatuses, 30000);
    
    return () => clearInterval(fallbackInterval);
  }, [serviceRequests]);

  // Log whenever service requests change
  useEffect(() => {
    // Only log when there are new paid requests for important updates
  }, [serviceRequests]);

  // Handle business location and distance filtering
  useEffect(() => {
    console.log('🏢 Business location useEffect:', { businessData, businessLocation });
    // Only set business location if the business has actual coordinates stored
    if (businessData && businessData.latitude && businessData.longitude && !businessLocation) {
      const location = {
        latitude: parseFloat(businessData.latitude),
        longitude: parseFloat(businessData.longitude)
      };
      setBusinessLocation(location);
      console.log('📍 Calling reverse geocode for business:', location);
      // Get the place name for these coordinates
      reverseGeocode(location.latitude, location.longitude);
    } else if (!businessData?.latitude || !businessData?.longitude) {
      // If business doesn't have coordinates, clear the location
      setBusinessLocation(null);
      setBusinessLocationName('');
    }

    // Apply distance filter when location, doctors, or filter changes
    applyDistanceFilter(distanceFilter, formData.serviceId);
  }, [businessData, businessLocation, nearbyDoctors, previousDoctors, distanceFilter, formData.serviceId]);

  // Show loading screen while authentication is being checked
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Building2 className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Only show access denied if we're definitely not authenticated AND not loading
  if (!authLoading && (!isAuthenticated || !user || user.role !== 'business')) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Building2 className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Access denied. Please login as a business user.</p>
        </div>
      </div>
    );
  }

  // fetchBusinessData function
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
        const totalSpent = completedRequests.reduce((sum, req) => {
          const baseAmount = req.totalAmount || 0;
          const serviceCharge = req.serviceCharge || SERVICE_CHARGE;
          const estimatedDoctorFee = (req.doctor?.hourlyRate || 0) * (req.estimatedDuration || 0);
          const expectedTotal = estimatedDoctorFee + serviceCharge;
          
          // Use same logic as calculateTotalAmount function
          if (baseAmount >= expectedTotal - 1 && baseAmount <= expectedTotal + 1) {
            return sum + baseAmount;
          } else {
            return sum + baseAmount + serviceCharge;
          }
        }, 0);
        
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
      // Get all available doctors with services populated
      const response = await api.get('/doctors?populate=services&filters[isAvailable][$eq]=true&filters[isVerified][$eq]=true');
      
      // Handle the response structure - check if it's response.data.data or response.data
      let doctors = response.data;
      if (!Array.isArray(doctors) && response.data?.data) {
        doctors = response.data.data;
      }
      
      setNearbyDoctors(doctors || []);
    } catch (error) {
      console.error('Error fetching available doctors:', error);
    }
  };

  const fetchPreviousDoctors = async () => {
    try {
      setLoadingPreviousDoctors(true);
      console.log('🔍 Fetching previously worked with doctors for business:', user.id);
      
      // Get all completed service requests for this business
      const response = await serviceRequestAPI.getBusinessRequests(user.id);
      console.log('📊 Business requests for previous doctors:', response.data);

      let allRequests = [];
      if (Array.isArray(response.data)) {
        allRequests = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        allRequests = response.data.data;
      }

      // Extract unique doctors from completed requests
      const completedRequests = allRequests.filter(req => req.status === 'completed' && req.doctor);
      const uniqueDoctorIds = new Set();
      const uniqueDoctors = {};
      
      completedRequests.forEach(req => {
        if (req.doctor && req.doctor.id && !uniqueDoctorIds.has(req.doctor.id)) {
          uniqueDoctorIds.add(req.doctor.id);
          uniqueDoctors[req.doctor.id] = {
            id: req.doctor.id,
            firstName: req.doctor.firstName,
            lastName: req.doctor.lastName,
            specialization: req.doctor.specialization,
            hourlyRate: req.doctor.hourlyRate,
            isAvailable: req.doctor.isAvailable,
            lastWorkedWith: req.completedAt || req.updatedAt
          };
        }
      });

      // Now fetch current availability status and services for these doctors
      try {
        const availabilityPromises = Object.keys(uniqueDoctors).map(async (doctorId) => {
          try {
            // Get current doctor availability from the available doctors endpoint
            const availableResponse = await doctorAPI.getAvailable();
            const availableDoctors = availableResponse.data || [];
            const currentDoctor = availableDoctors.find(d => d.id.toString() === doctorId.toString());
            
            console.log(`🔍 Checking doctor ${doctorId}:`, {
              foundInAvailable: !!currentDoctor,
              currentDoctorServices: currentDoctor?.services,
              availableDoctorsCount: availableDoctors.length
            });
            
            // Also fetch full doctor profile with services
            let doctorWithServices = null;
            try {
              const profileResponse = await doctorAPI.getProfile(doctorId);
              doctorWithServices = profileResponse.data;
              console.log(`🔍 Doctor ${doctorId} profile services:`, doctorWithServices?.services);
            } catch (profileErr) {
              console.log(`Could not fetch profile for doctor ${doctorId}:`, profileErr);
            }
            
            if (currentDoctor) {
              // Update with current availability, rate information, and services
              const updatedDoctor = {
                ...uniqueDoctors[doctorId],
                isAvailable: true, // If they're in the available list, they're available
                hourlyRate: currentDoctor.hourlyRate || uniqueDoctors[doctorId].hourlyRate,
                specialization: currentDoctor.specialisation || uniqueDoctors[doctorId].specialization,
                services: currentDoctor.services || doctorWithServices?.services || [] // Prefer services from available endpoint, fallback to profile
              };
              
              console.log(`✅ Updated doctor ${doctorId}:`, {
                name: `${updatedDoctor.firstName} ${updatedDoctor.lastName}`,
                isAvailable: updatedDoctor.isAvailable,
                servicesCount: updatedDoctor.services?.length || 0,
                services: updatedDoctor.services?.map(s => ({ id: s.id, name: s.name }))
              });
              
              uniqueDoctors[doctorId] = updatedDoctor;
            } else {
              // Doctor is not in available list, mark as unavailable but still add services if available
              uniqueDoctors[doctorId].isAvailable = false;
              uniqueDoctors[doctorId].services = doctorWithServices?.services || [];
              
              console.log(`❌ Doctor ${doctorId} not available, services:`, uniqueDoctors[doctorId].services?.map(s => ({ id: s.id, name: s.name })));
            }
          } catch (err) {
            console.error(`Error checking availability for doctor ${doctorId}:`, err);
            // Default to unavailable if we can't check
            uniqueDoctors[doctorId].isAvailable = false;
            uniqueDoctors[doctorId].services = [];
          }
        });

        await Promise.all(availabilityPromises);
      } catch (availabilityError) {
        console.error('Error checking doctor availability:', availabilityError);
      }

      const previousDoctorsList = Object.values(uniqueDoctors);
      console.log('👨‍⚕️ Previously worked with doctors with current availability:', previousDoctorsList);
      console.log('✅ Available previous doctors:', previousDoctorsList.filter(d => d.isAvailable));
      setPreviousDoctors(previousDoctorsList);
    } catch (error) {
      console.error('❌ Error fetching previous doctors:', error);
      setPreviousDoctors([]);
    } finally {
      setLoadingPreviousDoctors(false);
    }
  };

  // Fetch available services from backend
  const fetchAvailableServices = async () => {
    try {
      setLoadingServices(true);
      console.log('🔍 Fetching available services from backend');
      
      // Add a small delay to see the loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch all active services sorted by category and display order
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?filters[isActive][$eq]=true&sort=category:asc,displayOrder:asc,name:asc&pagination[limit]=100`);
      const data = await response.json();
      console.log('📊 Raw API response:', data);
      console.log('📊 Response status:', response.status);
      
      let services = [];
      if (data && Array.isArray(data.data)) {
        services = data.data;
        console.log('📊 Using data.data array:', services.length, 'services');
      } else if (Array.isArray(data)) {
        services = data;
        console.log('📊 Using data array:', services.length, 'services');
      } else {
        console.log('❌ Unexpected response structure:', data);
      }
      
      console.log('✅ Fetched services:', services.length, 'services');
      console.log('✅ Service categories found:', [...new Set(services.map(s => s.category))]);
      
      setAvailableServices(services);
    } catch (error) {
      console.error('❌ Error fetching available services:', error);
      setAvailableServices([]);
    } finally {
      setLoadingServices(false);
      console.log('🏁 Loading services completed');
    }
  };

  // Fetch doctors who have the selected service
  const fetchDoctorsForService = async (serviceId) => {
    if (!serviceId) {
      setServiceBasedDoctors([]);
      return;
    }

    try {
      setLoadingServiceDoctors(true);
      console.log('🔍 Fetching doctors for service ID:', serviceId);
      
      const response = await serviceAPI.getDoctorsByService(serviceId, {
        available: true // Only get available doctors
      });
      
      console.log('👨‍⚕️ Doctors for service response:', response.data);
      
      let doctors = [];
      if (Array.isArray(response.data)) {
        doctors = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        doctors = response.data.data;
      }
      
      console.log('✅ Available doctors for service:', doctors);
      setServiceBasedDoctors(doctors);
    } catch (error) {
      console.error('❌ Error fetching doctors for service:', error);
      setServiceBasedDoctors([]);
    } finally {
      setLoadingServiceDoctors(false);
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

  const handleEditProfile = () => {
    const business = businessData || user;
    setEditProfileData({
      businessName: business?.businessName || business?.name || '',
      contactPersonName: business?.contactPersonName || `${business?.firstName || ''} ${business?.lastName || ''}`.trim() || '',
      email: business?.email || '',
      phone: business?.phone || '',
      address: business?.address || '',
      city: business?.city || '',
      state: business?.state || '',
      zipCode: business?.zipCode || '',
      description: business?.description || '',
      latitude: business?.latitude || '',
      longitude: business?.longitude || ''
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
      const response = await businessAPI.updateProfile(user.id, editProfileData);
      
      if (response.data) {
        alert('Profile updated successfully!');
        setShowEditProfile(false);
        // Update the local business data
        setBusinessData(prev => ({
          ...prev,
          ...editProfileData
        }));
        // Refresh business data from server
        await fetchBusinessData();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const handlecancelleditProfile = () => {
    setShowEditProfile(false);
    setEditProfileData({
      businessName: '',
      contactPersonName: '',
      email: '',
      phone: '',
      latitude: '',
      longitude: '',
    });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          setEditProfileData(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
          }));
          // Optionally, reverse geocode to get place name
          reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get current location. Please enter manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Reverse geocode to get place name from coordinates
  const reverseGeocode = async (lat, lng) => {
    console.log('🌍 Starting reverse geocode:', { lat, lng });
    setLocationLoading(true);
    try {
      // Try Google Maps API first (more reliable in production)
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      console.log('🗝️ Google API key available:', !!googleApiKey);
      
      if (googleApiKey) {
        console.log('📡 Calling Google Maps API...');
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`
        );
        const data = await response.json();
        console.log('🗺️ Google Maps response:', data);
        
        if (data.status === 'OK' && data.results && data.results[0]) {
          const result = data.results[0];
          const locationName = result.formatted_address || result.address_components[0]?.long_name;
          if (locationName) {
            console.log('✅ Google Maps location found:', locationName);
            setBusinessLocationName(locationName);
            return;
          }
        }
      }
      
      // Fallback to BigDataCloud API
      console.log('📡 Calling BigDataCloud API fallback...');
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const data = await response.json();
      console.log('🌐 BigDataCloud response:', data);
      
      if (data) {
        // Create a readable location name
        const locationParts = [];
        if (data.locality) locationParts.push(data.locality);
        if (data.city && data.city !== data.locality) locationParts.push(data.city);
        if (data.principalSubdivision) locationParts.push(data.principalSubdivision);
        if (data.countryName) locationParts.push(data.countryName);
        
        const locationName = locationParts.join(', ');
        console.log('✅ BigDataCloud location found:', locationName);
        setBusinessLocationName(locationName);
      }
    } catch (error) {
      console.error('❌ Error reverse geocoding:', error);
      // Set a fallback location name if available
      if (businessData?.city) {
        const fallbackName = [businessData.city, businessData.state, businessData.country].filter(Boolean).join(', ');
        console.log('🔄 Using fallback location:', fallbackName);
        setBusinessLocationName(fallbackName);
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmitQuickRequest = async () => {
    if (!selectedDoctor || !requestHours || !quickRequestServiceId) {
      alert('Please select a service and specify the number of hours required.');
      return;
    }

    // Check if doctor offers the selected service
    if (!doctorOffersService(selectedDoctor, quickRequestServiceId)) {
      alert(`Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName} does not offer this service. Please select a different service.`);
      return;
    }

    // Check if the selected doctor is within the distance range (warning only, not blocking)
    if (businessLocation && distanceFilter !== -1) {
      const isWithinRange = filteredDoctorsByDistance.some(d => d.id === selectedDoctor.id);
      if (!isWithinRange) {
        const confirm = window.confirm(
          `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName} is located more than ${distanceFilter}km from your location. ` +
          `Do you still want to proceed with this request?`
        );
        if (!confirm) {
          return;
        }
      }
    }

    // Validate date and time
    if (!quickRequestServiceDate || !quickRequestServiceTime) {
      alert('Please select the date and time when you need the service.');
      return;
    }

    // Check if this is an online consultation and validate patient information
    const selectedService = availableServices.find(service => service.id.toString() === quickRequestServiceId.toString());
    const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || 
                                  selectedService?.category === 'online';
    
    if (isOnlineConsultation) {
      if (!quickRequestPatientFirstName || !quickRequestPatientLastName || !quickRequestPatientPhone) {
        alert('Please provide patient information for online consultation.');
        return;
      }
    }

    // Validation: Check if service date is not in the past
    const serviceDateTime = new Date(`${quickRequestServiceDate}T${quickRequestServiceTime}`);
    const now = new Date();
    if (serviceDateTime <= now) {
      alert('Service date and time must be in the future.');
      return;
    }

    try {
      // Find the selected service details
      const serviceAmount = parseFloat(selectedService?.price || 0);
      const totalWithServiceCharge = serviceAmount + SERVICE_CHARGE;
      
      // Create a temporary request object for payment
      const tempRequest = {
        id: 'temp-quick-' + Date.now(), // Temporary ID for payment
        businessId: user.id,
        serviceType: selectedService?.name || 'Selected Service',
        description: `${selectedService?.name || 'Service'} request for ${requestHours} hour(s) with Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
        estimatedDuration: parseFloat(requestHours),
        serviceCharge: SERVICE_CHARGE,
        servicePrice: serviceAmount, // Store the service price
        serviceDateTime: serviceDateTime.toISOString(),
        totalAmount: totalWithServiceCharge,
        // Store the complete request data for later use
        _quickRequestData: {
          doctorId: selectedDoctor.id,
          urgencyLevel: 'medium',
          serviceId: quickRequestServiceId,
          serviceType: selectedService?.name || 'Selected Service',
          description: `${selectedService?.name || 'Service'} request for ${requestHours} hour(s) with Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
          estimatedDuration: parseFloat(requestHours),
          serviceCharge: SERVICE_CHARGE,
          servicePrice: serviceAmount, // Store the service price
          estimatedCost: totalWithServiceCharge,
          serviceDateTime: serviceDateTime.toISOString(),
          // Add distance filtering parameters
          businessLatitude: businessLocation?.latitude,
          businessLongitude: businessLocation?.longitude,
          distanceFilter: distanceFilter,
          // Add patient information for online consultations
          ...(isOnlineConsultation && {
            patientFirstName: quickRequestPatientFirstName,
            patientLastName: quickRequestPatientLastName,
            patientPhone: quickRequestPatientPhone,
            patientEmail: quickRequestPatientEmail
          })
        },
        _isQuickRequest: true,
        _selectedDoctor: selectedDoctor,
        _requestHours: requestHours
      };

      // Show payment modal first - payment is now required before service request creation
      setPaymentRequest(tempRequest);
      setShowPaymentModal(true);
      
    } catch (error) {
      console.error('Error preparing quick service request:', error);
      alert('Failed to prepare service request. Please try again.');
    }
  };

  // Helper function to check if a doctor offers a specific service
  const doctorOffersService = (doctor, serviceId) => {
    console.log('🔍 Checking if doctor offers service:', {
      doctor: doctor?.firstName + ' ' + doctor?.lastName,
      doctorServices: doctor?.services,
      serviceId,
      serviceIdType: typeof serviceId,
      servicesLength: doctor?.services?.length
    });
    
    if (!doctor?.services || !serviceId) {
      console.log('❌ Missing doctor services or serviceId:', {
        hasServices: !!doctor?.services,
        servicesLength: doctor?.services?.length,
        hasServiceId: !!serviceId
      });
      return false;
    }
    
    const hasService = doctor.services.some(service => {
      console.log('🔍 Comparing service:', {
        serviceIdFromDoctor: service.id,
        serviceNameFromDoctor: service.name,
        serviceIdFromDropdown: serviceId,
        comparison: service.id.toString() === serviceId.toString()
      });
      return service.id.toString() === serviceId.toString();
    });
    
    console.log('✅ Doctor offers service result:', hasService);
    return hasService;
  };

  // Distance filtering functions
  const handleBusinessLocationUpdate = async (location) => {
    try {
      console.log('📍 Updating business location:', location);
      setBusinessLocation(location);
      
      // Update the business profile with the new location
      const response = await businessAPI.updateProfile(user.id, {
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      if (response.data) {
        console.log('✅ Business location updated successfully');
        // Update local business data
        setBusinessData(prev => ({
          ...prev,
          latitude: location.latitude,
          longitude: location.longitude
        }));
        
        // Re-filter doctors with new location
        applyDistanceFilter();
      }
    } catch (error) {
      console.error('❌ Error updating business location:', error);
      // Still set the local state for immediate UI feedback
      setBusinessLocation(location);
      applyDistanceFilter();
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

    // If estimated duration changes, recalculate service cost
    if (name === 'estimatedDuration' && formData.serviceId) {
      calculateServiceCost(formData.serviceId, parseFloat(value));
    }

    // If doctor selection type changes, reset preferred doctor and fetch previous doctors if needed
    if (name === 'doctorSelectionType') {
      setFormData(prev => ({
        ...prev,
        preferredDoctorId: null
      }));
      
      if (value === 'previous' && previousDoctors.length === 0) {
        fetchPreviousDoctors();
      }
      
      // For 'any' doctor selection, also load previous doctors and service-based doctors if service is selected
      if (value === 'any') {
        if (previousDoctors.length === 0) {
          fetchPreviousDoctors();
        }
        if (formData.serviceId) {
          fetchDoctorsForService(formData.serviceId);
        }
      }
    }

    // If service selection changes, fetch doctors for that service
    if (name === 'serviceId') {
      setSelectedServiceId(value);
      
      // Find the selected service to get its name for serviceType
      const selectedService = availableServices.find(service => service.id.toString() === value);
      
      // Calculate the correct duration in hours
      const serviceDurationInHours = selectedService?.duration ? (selectedService.duration / 60) : 1;
      console.log('🕒 Service selection debug:', {
        serviceId: value,
        serviceName: selectedService?.name,
        serviceDurationMinutes: selectedService?.duration,
        serviceDurationHours: serviceDurationInHours,
        currentFormDuration: formData.estimatedDuration
      });
      
      // Check if currently selected doctor still offers the new service (for previous doctor selection)
      let shouldResetDoctor = false;
      if (formData.preferredDoctorId && formData.doctorSelectionType === 'previous' && value) {
        const selectedDoctor = previousDoctors.find(d => d.id.toString() === formData.preferredDoctorId.toString());
        if (selectedDoctor && !doctorOffersService(selectedDoctor, value)) {
          shouldResetDoctor = true;
          console.log('🔄 Selected doctor no longer offers the new service, resetting selection');
        }
      }
      
      setFormData(prev => ({
        ...prev,
        serviceType: selectedService ? selectedService.name : '', // Update serviceType when service changes
        estimatedDuration: serviceDurationInHours, // Set duration from service (convert minutes to hours, default to 1 hour)
        preferredDoctorId: shouldResetDoctor || !value ? null : prev.preferredDoctorId // Reset selected doctor when service changes or doctor doesn't offer service
      }));
      
      // Fetch doctors for the selected service for any selection type
      if (value) {
        fetchDoctorsForService(value);
        // Calculate service cost with the service's default duration
        calculateServiceCost(value, serviceDurationInHours);
        // Re-apply distance and service filters when service selection changes
        applyDistanceFilter(distanceFilter, value);
      } else {
        // Clear service cost when no service is selected
        setServiceCost(null);
        // Re-apply distance filter without service filter when no service is selected
        applyDistanceFilter(distanceFilter, null);
      }
    }
  };

  // Calculate service cost
  const calculateServiceCost = async (serviceId, duration = null) => {
    if (!serviceId) {
      setServiceCost(null);
      return;
    }

    try {
      setLoadingCost(true);
      console.log('💰 Calculating cost for service:', serviceId, 'with duration:', duration);
      
      // Find the selected service to get base price and duration
      const selectedService = availableServices.find(service => service.id.toString() === serviceId.toString());
      
      if (!selectedService) {
        console.error('❌ Service not found in available services');
        setServiceCost(null);
        return;
      }
      
      const basePrice = parseFloat(selectedService.price || 0);
      const serviceDuration = selectedService.duration ? (selectedService.duration / 60) : 1; // Convert minutes to hours
      const requestedDuration = duration || parseFloat(formData.estimatedDuration) || 1;
      
      console.log('🔍 Debug duration calculation:');
      console.log('  - Service duration (minutes):', selectedService.duration);
      console.log('  - Service duration (hours):', serviceDuration);
      console.log('  - Requested duration (hours):', requestedDuration);
      console.log('  - Base price:', basePrice);
      
      // Scale the price based on duration
      const scalingFactor = requestedDuration / serviceDuration;
      const scaledPrice = basePrice * scalingFactor;
      const totalCost = scaledPrice + SERVICE_CHARGE;
      
      console.log('  - Scaling factor:', scalingFactor);
      console.log('  - Scaled price:', scaledPrice);
      
      const costData = {
        servicePrice: scaledPrice,
        serviceCharge: SERVICE_CHARGE,
        totalAmount: totalCost,
        baseDuration: serviceDuration,
        requestedDuration: requestedDuration,
        scalingFactor: scalingFactor
      };
      
      console.log('💰 Calculated service cost:', costData);
      setServiceCost(costData);
    } catch (error) {
      console.error('❌ Error calculating service cost:', error);
      setServiceCost(null);
    } finally {
      setLoadingCost(false);
    }
  };

  const handleOpenRequestForm = () => {
    setShowRequestForm(true);
    // Fetch previous doctors when form opens for the first time
    if (previousDoctors.length === 0) {
      fetchPreviousDoctors();
    }
    // If a service is already selected (from quick actions), fetch doctors for that service
    if (formData.serviceId && serviceBasedDoctors.length === 0) {
      fetchDoctorsForService(formData.serviceId);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation: If service is required but not selected
      if (!formData.serviceId) {
        alert('Please select a service for your request.');
        setLoading(false);
        return;
      }

      // Validation: If previous doctors option is selected, a doctor must be chosen
      if (formData.doctorSelectionType === 'previous' && !formData.preferredDoctorId) {
        alert('Please select a doctor from your previously worked with doctors, or choose "Any available doctor" option.');
        setLoading(false);
        return;
      }

      // Additional validation: Ensure the selected doctor is available if previous option is chosen
      if (formData.doctorSelectionType === 'previous' && formData.preferredDoctorId) {
        const selectedDoctor = previousDoctors.find(d => d.id.toString() === formData.preferredDoctorId.toString());
        if (!selectedDoctor || !selectedDoctor.isAvailable) {
          alert('The selected doctor is no longer available. Please choose another doctor or refresh the list.');
          setLoading(false);
          return;
        }
      }

      // Validation: Check if there are any doctors available within the selected distance range
      if (formData.doctorSelectionType === 'any' && filteredDoctorsByDistance.length === 0) {
        const distanceText = businessLocation && distanceFilter !== -1 
          ? `within ${distanceFilter}km of your location` 
          : 'in your area';
        alert(`No doctors are available ${distanceText}. Please try increasing the distance range or contact support for assistance.`);
        setLoading(false);
        return;
      }

      // Validation: Check if service date and time are provided
      if (!formData.serviceDate || !formData.serviceTime) {
        alert('Please provide both service date and time.');
        setLoading(false);
        return;
      }

      // Validation: Check if service date is not in the past
      const serviceDateTime = new Date(`${formData.serviceDate}T${formData.serviceTime}`);
      const now = new Date();
      if (serviceDateTime <= now) {
        alert('Service date and time must be in the future.');
        setLoading(false);
        return;
      }

      // Validation: For online consultations, patient information is required
      const selectedService = availableServices.find(service => service.id.toString() === formData.serviceId.toString());
      const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || 
                                    selectedService?.category === 'online';
      
      if (isOnlineConsultation) {
        if (!formData.patientFirstName || !formData.patientLastName || !formData.patientPhone) {
          alert('For online consultations, please provide the patient\'s first name, last name, and phone number.');
          setLoading(false);
          return;
        }
        
        // Basic phone number validation
        const fullPhoneNumber = formData.patientCountryCode + formData.patientPhone.replace(/\s/g, '');
        const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;
        if (!phoneRegex.test(fullPhoneNumber.replace(/\s/g, ''))) {
          alert('Please provide a valid phone number for the patient.');
          setLoading(false);
          return;
        }
      }

      // Calculate total cost including booking fee and duration scaling
      const baseServiceCost = parseFloat(selectedService?.price || 0);
      const serviceDuration = selectedService?.duration ? (selectedService.duration / 60) : 1; // Convert minutes to hours, default to 1 hour
      const requestedDuration = parseFloat(formData.estimatedDuration);
      
      // Scale the price based on duration (proportional scaling)
      const scaledServiceCost = baseServiceCost * (requestedDuration / serviceDuration);
      const totalCost = scaledServiceCost + SERVICE_CHARGE;

      // Create a temporary request object for payment
      const tempRequest = {
        id: 'temp-' + Date.now(), // Temporary ID for payment
        businessId: user.id,
        serviceType: selectedService?.name || 'Selected Service',
        description: formData.description,
        estimatedDuration: parseInt(formData.estimatedDuration),
        serviceCharge: SERVICE_CHARGE,
        servicePrice: scaledServiceCost, // Store the scaled service price based on duration
        serviceDateTime: serviceDateTime.toISOString(),
        totalAmount: totalCost,
        // Store the complete form data for later use
        _formData: {
          ...formData,
          // Add distance filtering parameters to form data
          businessLatitude: businessLocation?.latitude,
          businessLongitude: businessLocation?.longitude,
          distanceFilter: distanceFilter
        },
        _serviceDateTime: serviceDateTime
      };

      // Show payment modal first - payment is now required before service request creation
      setPaymentRequest(tempRequest);
      setShowPaymentModal(true);
      setLoading(false); // Remove loading since we're showing payment modal

    } catch (error) {
      console.error('Error preparing service request:', error);
      alert('Failed to prepare service request. Please try again.');
      setLoading(false);
    }
  };

  const handlePayment = (requestId, paymentMethod) => {
    const request = serviceRequests.find(r => r.id === requestId);
    if (!request) {
      alert('Service request not found.');
      return;
    }
    
    // Only allow card payments now
    if (paymentMethod === 'card') {
      // Show card payment modal
      setPaymentRequest(request);
      setShowPaymentModal(true);
    } else {
      alert('Only card payments are supported.');
    }
  };
  
  
  const handlePaymentSuccess = async (paymentIntent) => {
    if (!paymentRequest) return;
    
    setShowPaymentModal(false);
    setLoading(true);
    
    try {
      // Check if this is a new service request (temporary) or an existing one
      const isNewServiceRequest = paymentRequest.id.startsWith('temp-');
      
      if (isNewServiceRequest) {
        // Check if this is a quick request or regular request
        const isQuickRequest = paymentRequest._isQuickRequest;
        
        if (isQuickRequest) {
          // Handle quick request creation
          const quickRequestData = paymentRequest._quickRequestData;
          const selectedDoctor = paymentRequest._selectedDoctor;
          const requestHours = paymentRequest._requestHours;
          
          const requestData = {
            ...quickRequestData,
            businessId: user.id,
            // Add distance filtering parameters
            businessLatitude: businessLocation?.latitude,
            businessLongitude: businessLocation?.longitude,
            distanceFilter: distanceFilter,
            // Mark as paid since payment was successful
            isPaid: true,
            paymentMethod: 'card',
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status,
            paidAt: new Date().toISOString(),
            totalAmount: paymentRequest.totalAmount
          };

          // Create the direct service request with payment information
          const response = await serviceRequestAPI.createDirectRequest(requestData);
          
          if (response.data) {
            const requestId = response.data.id || response.data.data?.id;
            
            alert(`Payment successful! Service request sent to Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName} for ${requestHours} hour(s)!
            
⏱️ Auto-fallback enabled: If the doctor doesn't respond within 24 hours, your request will be automatically sent to other available doctors.

Payment ID: ${paymentIntent.id}`);
            
            setShowHoursPopup(false);
            setSelectedDoctor(null);
            setRequestHours(1);
            setQuickRequestServiceType('');
            setQuickRequestServiceId('');
            setQuickRequestServiceDate('');
            setQuickRequestServiceTime('');
            console.log('🔄 Manually refreshing after creating paid quick service request');
            await fetchServiceRequests();
          }
        } else {
          // Handle regular request creation
          const formDataFromTemp = paymentRequest._formData;
          const serviceDateTime = paymentRequest._serviceDateTime;
          
          // Find the selected service to check if it's an online consultation
          const selectedService = availableServices.find(s => s.id.toString() === formDataFromTemp.serviceId.toString());
          const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || 
                                       selectedService?.category === 'online';
          
          const requestData = {
            businessId: user.id,
            ...formDataFromTemp,
            urgencyLevel: 'medium', // Default urgency level since we removed it from UI
            estimatedDuration: parseInt(formDataFromTemp.estimatedDuration),
            serviceCharge: SERVICE_CHARGE,
            servicePrice: paymentRequest.servicePrice, // Store the service price for doctors
            serviceDateTime: serviceDateTime.toISOString(),
            // Add distance filtering parameters
            businessLatitude: businessLocation?.latitude,
            businessLongitude: businessLocation?.longitude,
            distanceFilter: distanceFilter,
            // Mark as paid since payment was successful
            isPaid: true,
            paymentMethod: 'card',
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status,
            paidAt: new Date().toISOString(),
            totalAmount: paymentRequest.totalAmount
          };

          // Add patient information for online consultations
          if (isOnlineConsultation) {
            requestData.patientFirstName = formDataFromTemp.patientFirstName;
            requestData.patientLastName = formDataFromTemp.patientLastName;
            requestData.patientPhone = formDataFromTemp.patientCountryCode + formDataFromTemp.patientPhone.replace(/\s/g, '');
            requestData.patientEmail = formDataFromTemp.patientEmail;
          }

          // Create the service request with payment information
          const response = await serviceRequestAPI.createServiceRequest(requestData);
          
          if (response.data) {
            const requestId = response.data.id || response.data.data?.id;
            
            let notificationMessage;
            if ((formDataFromTemp.doctorSelectionType === 'previous' || formDataFromTemp.doctorSelectionType === 'any') && formDataFromTemp.preferredDoctorId) {
              notificationMessage = `Payment successful! Service request created and your selected doctor has been notified.
              
⏱️ Auto-fallback enabled: If the doctor doesn't respond within 24 hours, your request will be automatically sent to other available doctors.

Payment ID: ${paymentIntent.id}`;
            } else {
              notificationMessage = `Payment successful! Service request created and ${response.data.notifiedDoctors} nearby doctors have been notified. Payment ID: ${paymentIntent.id}`;
            }
            
            alert(notificationMessage);
            setShowRequestForm(false);
            setFormData({
              serviceType: '',
              serviceId: '',
              description: '',
              estimatedDuration: 1,
              preferredDoctorId: null,
              doctorSelectionType: 'any',
              serviceDate: '',
              serviceTime: '',
              // Reset patient information fields
              patientFirstName: '',
              patientLastName: '',
              patientPhone: '',
              patientCountryCode: '+44', // Default to UK
              patientEmail: '',
            });
            // Reset service-related states
            setSelectedServiceId('');
            setServiceBasedDoctors([]);
            console.log('🔄 Manually refreshing after creating paid service request');
            await fetchServiceRequests();
            await fetchNearbyDoctors();
          }
        }
      } else {
        // This is an existing service request - process payment normally (old flow for existing requests)
        const charge = paymentIntent.charges?.data?.[0];
        
        const response = await serviceRequestAPI.processPayment(paymentRequest.id, 'card', {
          paymentIntentId: paymentIntent.id,
          chargeId: charge?.id,
          receiptUrl: charge?.receipt_url,
          amount: (paymentIntent.amount || paymentIntent.amount_received || 0) / 100,
          currency: paymentIntent.currency || 'gbp',
          status: paymentIntent.status,
          timestamp: new Date().toISOString(),
          stripeCustomerId: paymentIntent.customer,
          paymentMethodId: paymentIntent.payment_method,
          description: paymentIntent.description,
          metadata: paymentIntent.metadata,
        }, {
          paymentIntentId: paymentIntent.id,
          chargeId: charge?.id,
          receiptUrl: charge?.receipt_url,
          currency: paymentIntent.currency || 'gbp'
        });
        
        console.log('💳 Card Payment Response:', response.data);
        
        if (response.data) {
          alert(`Card payment of ${formatCurrency(calculateTotalAmount(paymentRequest))} processed successfully! (includes £${SERVICE_CHARGE} booking fee) Payment ID: ${paymentIntent.id}`);
          
          // Force update the request in the local state too
          setServiceRequests(prev => 
            prev.map(req => 
              req.id === paymentRequest.id ? { 
                ...req, 
                isPaid: true, 
                paymentMethod: 'card',
                paymentIntentId: paymentIntent.id,
                chargeId: charge?.id,
                paymentStatus: paymentIntent.status,
                paidAt: new Date().toISOString(),
                currency: paymentIntent.currency || 'gbp',
                totalAmount: calculateTotalAmount(paymentRequest)
              } : req
            )
          );
          
          // Also fetch fresh data from server immediately regardless of auto-refresh
          console.log('🔄 Manually refreshing after card payment');
          await fetchServiceRequests();
        }
      }
    } catch (error) {
      console.error('Error processing payment/creating service request:', error);
      alert('Payment processed but service request creation failed. Please contact support.');
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
              <div className="p-2.5 rounded-lg shadow-lg">
                <img src="/logo.png" alt="ThanksDoc Logo" className="h-8 w-8 object-contain" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h1 className={`text-2xl font-bold tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{businessName}</h1>
                  <button
                    onClick={handleEditProfile}
                    className={`p-1.5 rounded-md hover:bg-opacity-80 transition-colors ${
                      isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Edit Business Profile"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-4">
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Welcome back, {contactName}
                  </p>
                  {/* Current Location Display */}
                  {businessLocation && businessLocationName && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-md ${
                      isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'
                    }`}>
                      <MapPin className={`h-3 w-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {businessLocationName}
                      </span>
                    </div>
                  )}
                  {businessLocation && (!businessLocationName || locationLoading) && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-md ${
                      isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100/50'
                    }`}>
                      <MapPin className={`h-3 w-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} ${locationLoading ? 'animate-pulse' : ''}`} />
                      <span className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {locationLoading ? 'Loading...' : 'Detecting location...'}
                      </span>
                    </div>
                  )}
                  {!businessLocation && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-md ${
                      isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100/50'
                    }`}>
                      <MapPin className={`h-3 w-3 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <span className={`text-xs ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Location not set
                      </span>
                    </div>
                  )}
                </div>
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
                onClick={handleOpenRequestForm}
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
                  handleOpenRequestForm();
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
              <button 
                onClick={() => router.push('/business/expenditure')}
                className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left w-full ${
                  isDarkMode 
                    ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
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
              </button>
              <button 
                onClick={() => router.push('/business/expenditure?filter=active')}
                className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left w-full ${
                  isDarkMode 
                    ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
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
              </button>
              <button 
                onClick={() => router.push('/business/expenditure?filter=completed')}
                className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left w-full ${
                  isDarkMode 
                    ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
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
              </button>
              <button 
                onClick={() => router.push('/business/expenditure')}
                className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md cursor-pointer text-left w-full ${
                  isDarkMode 
                    ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{color: '#0F9297'}}>Total Spent</p>
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{formatCurrency(stats.totalSpent)}</p>
                  </div>
                  <div className={`p-3 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                    <DollarSign className={`h-6 w-6`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
                  </div>
                </div>
              </button>
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
                <div className="flex-1">
                  <h2 className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Verified Available Doctors</h2>
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>({filteredDoctorsByDistance.length}) verified professionals
                    {businessLocation && distanceFilter !== -1 
                      ? ` within ${distanceFilter}km` 
                      : businessLocation 
                        ? ' (no distance limit)' 
                        : ' (location not set)'
                    }
                    {formData.serviceId && (() => {
                      const selectedService = availableServices.find(s => s.id.toString() === formData.serviceId);
                      return selectedService ? ` offering "${selectedService.name}"` : '';
                    })()}
                  </p>
                </div>
              </div>

              {/* Distance Filter Controls */}
              {businessLocation && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Choose from our network of verified healthcare professionals
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDistanceFilterChange(10)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          distanceFilter === 10
                            ? isDarkMode
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-600 text-white'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        10km
                      </button>
                      <button
                        onClick={() => handleDistanceFilterChange(20)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          distanceFilter === 20
                            ? isDarkMode
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-600 text-white'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        20km
                      </button>
                      <button
                        onClick={() => handleDistanceFilterChange(-1)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          distanceFilter === -1
                            ? isDarkMode
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-600 text-white'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Anywhere
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!businessLocation && (
                <div className="mb-4">
                  <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Choose from our network of verified healthcare professionals
                  </p>
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                      📍 Set your business location to filter doctors by distance
                    </p>
                    <button
                      onClick={handleBusinessLocationUpdate}
                      className={`mt-2 px-3 py-1 rounded text-xs font-medium ${
                        isDarkMode
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      }`}
                    >
                      Update Location
                    </button>
                  </div>
                </div>
              )}

              {/* Service Filter Indicator */}
              {formData.serviceId && (() => {
                const selectedService = availableServices.find(s => s.id.toString() === formData.serviceId);
                return selectedService ? (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    isDarkMode 
                      ? 'bg-green-900/20 border border-green-800 text-green-300' 
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    🔍 Also filtering by service: <strong>"{selectedService.name}"</strong>
                    <br />
                    <span className="text-xs opacity-75">Change service selection in the form below to update this filter</span>
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDoctorsByDistance.slice(0, 6).map((doctor) => {
                  const distance = getDoctorDistance(doctor, businessLocation);
                  return (
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
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-semibold text-sm ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              Dr. {doctor.firstName} {doctor.lastName}
                            </h4>
                            {distance && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isDarkMode 
                                  ? 'bg-green-900/20 text-green-400 border border-green-700' 
                                  : 'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                📍 {formatDistance(distance)}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs font-medium px-2 py-1 rounded-md inline-block mt-1 ${
                            isDarkMode 
                              ? 'text-blue-400 bg-blue-900/20' 
                              : 'text-blue-600 bg-blue-50'
                          }`}>{doctor.specialisation}</p>
                          
                          {/* Show up to 3 services */}
                          <div className="mt-2">
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                              Services:
                            </p>
                            <div className="space-y-1">
                              {doctor.services && doctor.services.length > 0 ? (
                                doctor.services.slice(0, 3).map((service, index) => (
                                  <div key={service.id || index} className={`text-xs px-2 py-1 rounded ${
                                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {service.name}
                                  </div>
                                ))
                              ) : (
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Services loading...
                                </div>
                              )}
                              {doctor.services && doctor.services.length > 3 && (
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  +{doctor.services.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleQuickServiceRequest(doctor)}
                            className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow"
                          >
                            Request Service
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredDoctorsByDistance.length > 6 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-300">
                    {filteredDoctorsByDistance.length - 6} more doctors available in the sidebar →
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
                            {/* Payment Status Flag */}
                            {request.status === 'completed' && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                isDarkMode 
                                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700' 
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                💰 PAID
                              </span>
                            )}
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
                              
                              {/* Show fallback status for pending requests */}
                              {request.status === 'pending' && fallbackStatuses[request.id] && (
                                <div className={`mt-2 p-2 ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-lg`}>
                                  <div className="flex items-center space-x-2">
                                    <Clock className={`h-3 w-3 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                    <span className={`text-xs font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                                      {fallbackStatuses[request.id].fallbackTriggered 
                                        ? '🔄 Request reassigned to other doctors' 
                                        : '⏱️ Auto-fallback enabled (24 hour timeout)'
                                      }
                                    </span>
                                  </div>
                                  {!fallbackStatuses[request.id].fallbackTriggered && fallbackStatuses[request.id].fallbackTimeout && (
                                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                      Timeout: {new Date(fallbackStatuses[request.id].fallbackTimeout).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                              )}
                              
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
                            <div className={`${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'} px-3 py-2 rounded-lg flex flex-col items-end`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>{formatCurrency(calculateTotalAmount(request))}</span>
                              <div className="flex items-center space-x-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                                PAID
                              </div>
                            </div>
                          )}
                          {request.totalAmount && request.status === 'completed' && request.isPaid === true && (
                            <div className={`${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'} px-3 py-2 rounded-lg flex flex-col items-end`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>{formatCurrency(calculateTotalAmount(request))}</span>
                              <div className="flex items-center space-x-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                                PAID
                              </div>
                            </div>
                          )}
                          {request.totalAmount && request.status !== 'completed' && (
                            <div className={`${isDarkMode ? 'bg-green-900/20' : 'bg-green-100'} px-3 py-2 rounded-lg`}>
                              <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>{formatCurrency(calculateTotalAmount(request))}</span>
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-600'} p-2 rounded-lg`}>
                    <Building2 className={`h-5 w-5 ${isDarkMode ? 'text-indigo-400' : 'text-white'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Business Information</h3>
                </div>
                <button
                  onClick={handleEditProfile}
                  className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Edit Business Profile"
                >
                  <Edit className="h-4 w-4" />
                </button>
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
                {business?.phone && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Phone:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{business.phone}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Address:</span>
                  <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-right`}>{business?.address || 'Not provided'}</span>
                </div>
                {business?.city && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>City:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-right`}>{business.city}</span>
                  </div>
                )}
                {business?.state && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>State:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-right`}>{business.state}</span>
                  </div>
                )}
                {business?.zipCode && (
                  <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Postal Code:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-right`}>{business.zipCode}</span>
                  </div>
                )}
                {business?.description && (
                  <div className={`py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'} block mb-1`}>Description:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>{business.description}</span>
                  </div>
                )}
                {/* Location Information */}
                {(business?.latitude && business?.longitude) ? (
                  <div className={`py-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className={`h-4 w-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Location:</span>
                    </div>
                    
                    {/* Place Name from Coordinates */}
                    {businessLocationName ? (
                      <div className="mb-2">
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                          {businessLocationName}
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
                      📍 Coordinates: {parseFloat(business.latitude).toFixed(6)}, {parseFloat(business.longitude).toFixed(6)}
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
                  <span className={`font-medium`} style={{color: '#0F9297'}}>Total Spent:</span>
                  <span className={`font-bold text-lg`} style={{color: '#0F9297'}}>{formatCurrency(stats.totalSpent)}</span>
                </div>
              </div>
            </div>

            {/* Available Doctors */}
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border p-6`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                  <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Verified Available Doctors
                    {businessLocation && distanceFilter !== -1 && (
                      <span className={`text-sm font-normal ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} ml-2`}>
                        (within {distanceFilter}km)
                      </span>
                    )}
                    {!businessLocation && (
                      <span className={`text-sm font-normal ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} ml-2`}>
                        (location not set)
                      </span>
                    )}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    ({filteredDoctorsByDistance.length}) verified professionals
                    {businessLocation && distanceFilter !== -1 
                      ? ` within ${distanceFilter}km` 
                      : businessLocation 
                        ? ' (no distance limit)' 
                        : ' (location not set)'
                    }
                    {formData.serviceId && (() => {
                      const selectedService = availableServices.find(s => s.id.toString() === formData.serviceId);
                      return selectedService ? ` offering "${selectedService.name}"` : '';
                    })()}
                  </p>
                </div>
              </div>

              {/* Distance Filter Controls for Verified Doctors */}
              {businessLocation && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDistanceFilterChange(10)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        distanceFilter === 10
                          ? isDarkMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      10km
                    </button>
                    <button
                      onClick={() => handleDistanceFilterChange(20)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        distanceFilter === 20
                          ? isDarkMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      20km
                    </button>
                    <button
                      onClick={() => handleDistanceFilterChange(-1)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        distanceFilter === -1
                          ? isDarkMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Anywhere
                    </button>
                  </div>
                  <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    💡 Default view shows doctors within 10km. Use buttons above to change range.
                  </div>
                  {formData.serviceId && (() => {
                    const selectedService = availableServices.find(s => s.id.toString() === formData.serviceId);
                    return selectedService ? (
                      <div className={`mt-2 p-2 rounded-lg text-xs ${
                        isDarkMode 
                          ? 'bg-green-900/20 border border-green-800 text-green-300' 
                          : 'bg-green-50 border border-green-200 text-green-700'
                      }`}>
                        🔍 Also filtering by service: <strong>"{selectedService.name}"</strong>
                        <br />
                        <span className="text-xs opacity-75">Change service selection in the form to update this filter</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {!businessLocation && (
                <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                    📍 Set your business location to filter doctors by distance
                  </p>
                  <button
                    onClick={handleBusinessLocationUpdate}
                    className={`mt-2 px-3 py-1 rounded text-xs font-medium ${
                      isDarkMode
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    Update Location
                  </button>
                </div>
              )}
              <div className="space-y-3 text-sm max-h-96 overflow-y-auto pr-2">
                {filteredDoctorsByDistance.length > 0 ? (
                  filteredDoctorsByDistance.map((doctor) => {
                    const distance = getDoctorDistance(doctor, businessLocation);
                    return (
                      <div key={doctor.id} className={`py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} last:border-b-0`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>
                                Dr. {doctor.firstName} {doctor.lastName}
                              </h4>
                              {distance && (
                                <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                                  isDarkMode 
                                    ? 'bg-green-900/20 text-green-400 border border-green-700' 
                                    : 'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                  📍 {formatDistance(distance)}
                                </span>
                              )}
                            </div>
                            <p className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-medium text-xs`}>{doctor.specialisation}</p>
                            
                            {/* Show up to 3 services */}
                            <div className="mt-2">
                              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                                Services:
                              </p>
                              <div className="space-y-1">
                                {doctor.services && doctor.services.length > 0 ? (
                                  doctor.services.slice(0, 3).map((service, index) => (
                                    <div key={service.id || index} className={`text-xs px-2 py-1 rounded ${
                                      isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {service.name}
                                    </div>
                                  ))
                                ) : (
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Services loading...
                                  </div>
                                )}
                                {doctor.services && doctor.services.length > 3 && (
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    +{doctor.services.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
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
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-6`}>
                      <User className={`h-12 w-12 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                      <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {businessLocation && distanceFilter !== -1 
                          ? `No doctors available within ${distanceFilter}km`
                          : 'No doctors currently available'
                        }
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {businessLocation && distanceFilter !== -1 
                          ? `Try increasing your distance range to 20km or select "Anywhere" to see more doctors in your area.`
                          : 'Our doctors are currently busy or under verification. Please check back later.'
                        }
                      </p>
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
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-2xl w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg flex-shrink-0`}>
              <div className="flex items-center space-x-3">
                <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                  <Plus className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Request a Doctor</h2>
              </div>
            </div>
            <form onSubmit={handleSubmitRequest} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Which service do you require? *
                </label>
                {loadingServices ? (
                  <div className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400' : 'border-gray-300 bg-gray-100 text-gray-500'} rounded-lg`}>
                    Loading services...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* NHS Services */}
                    {(() => {
                      const nhsServices = availableServices.filter(service => service.category === 'nhs');
                      if (nhsServices.length === 0) return null;
                      return (
                        <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                          <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            NHS Work *
                          </h3>
                          <div className="space-y-2 pr-6">
                            {nhsServices.map(service => (
                              <label key={service.id} className="flex items-center space-x-3 cursor-pointer pr-6">
                                <input
                                  type="radio"
                                  name="serviceId"
                                  value={service.id}
                                  checked={formData.serviceId === service.id.toString()}
                                  onChange={handleInputChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {service.name}
                                </span>
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-100'} px-2 py-1 rounded mr-3`}>
                                  £{service.price}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Online Services */}
                    {(() => {
                      const onlineServices = availableServices.filter(service => service.category === 'online');
                      if (onlineServices.length === 0) return null;
                      return (
                        <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                          <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Online Private Doctor *
                          </h3>
                          <div className="space-y-2 pr-6">
                            {onlineServices.map(service => (
                              <label key={service.id} className="flex items-center space-x-3 cursor-pointer pr-6">
                                <input
                                  type="radio"
                                  name="serviceId"
                                  value={service.id}
                                  checked={formData.serviceId === service.id.toString()}
                                  onChange={handleInputChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {service.name}
                                </span>
                                <span className={`text-sm font-medium px-2 py-1 rounded mr-3 ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
                                  £{service.price}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* In-Person Services */}
                    {(() => {
                      const inPersonServices = availableServices.filter(service => service.category === 'in-person');
                      if (inPersonServices.length === 0) return null;
                      return (
                        <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                          <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            In Person Private Doctor *
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-6">
                            {inPersonServices.map(service => (
                              <label key={service.id} className="flex items-center space-x-3 cursor-pointer pr-6">
                                <input
                                  type="radio"
                                  name="serviceId"
                                  value={service.id}
                                  checked={formData.serviceId === service.id.toString()}
                                  onChange={handleInputChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {service.name}
                                </span>
                                <span className={`text-sm font-medium px-2 py-1 rounded mr-3 ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
                                  £{service.price}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {availableServices.length === 0 && !loadingServices && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No services available at the moment
                  </p>
                )}
                
                {/* Show pricing summary */}
                {formData.serviceId && (() => {
                  const selectedService = availableServices.find(s => s.id.toString() === formData.serviceId);
                  if (selectedService && (serviceCost || selectedService.serviceType === 'subcategory')) {
                    // Use serviceCost data if available, otherwise calculate from base service
                    const pricing = serviceCost || {
                      servicePrice: parseFloat(selectedService.price),
                      serviceCharge: 3.00,
                      totalAmount: parseFloat(selectedService.price) + 3.00
                    };
                    
                    return (
                      <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} border`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Service: {selectedService.name}
                          </span>
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            £{pricing.servicePrice.toFixed(2)}
                          </span>
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
                          <div>Base Duration: {selectedService.duration} minutes</div>
                          {serviceCost && serviceCost.requestedDuration !== serviceCost.baseDuration && (
                            <div>Requested Duration: {(serviceCost.requestedDuration * 60).toFixed(0)} minutes (×{serviceCost.scalingFactor.toFixed(2)})</div>
                          )}
                          <div>Category: {selectedService.category === 'in-person' ? 'In-Person' : selectedService.category === 'online' ? 'Online' : 'NHS'}</div>
                          {serviceCost && serviceCost.requestedDuration !== serviceCost.baseDuration && (
                            <div className={`text-xs italic ${isDarkMode ? 'text-yellow-400' : 'text-orange-600'} mt-1`}>
                              Price adjusted for extended duration
                            </div>
                          )}
                          <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-blue-200'} space-y-1`}>
                            <div className="flex justify-between">
                              <span>Service fee:</span>
                              <span>£{pricing.servicePrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Booking fee:</span>
                              <span>£{pricing.serviceCharge.toFixed(2)}</span>
                            </div>
                            <div className={`flex justify-between font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} pt-1 border-t ${isDarkMode ? 'border-gray-700' : 'border-blue-200'}`}>
                              <span>Total:</span>
                              <span>£{pricing.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Patient Information Fields - Show only for online consultations */}
              {(() => {
                const selectedService = availableServices.find(s => s.id.toString() === formData.serviceId);
                const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || 
                                              selectedService?.category === 'online';
                
                if (!isOnlineConsultation) return null;
                
                return (
                  <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-orange-600 bg-orange-900/20' : 'border-orange-200 bg-orange-50'}`}>
                    <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                      👤 Patient Information *
                    </h3>
                    <p className={`text-xs mb-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      Please provide the patient's details who will be participating in the online consultation.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="patientFirstName"
                          value={formData.patientFirstName}
                          onChange={handleInputChange}
                          required
                          placeholder="Patient's first name"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="patientLastName"
                          value={formData.patientLastName}
                          onChange={handleInputChange}
                          required
                          placeholder="Patient's last name"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Phone Number *
                        </label>
                        <CountryCodePicker
                          selectedCode={formData.patientCountryCode}
                          onCodeChange={(code) => setFormData({ ...formData, patientCountryCode: code })}
                          phoneNumber={formData.patientPhone}
                          onPhoneChange={(phone) => setFormData({ ...formData, patientPhone: phone })}
                          placeholder="Patient's phone number (for video call link)"
                          isDarkMode={isDarkMode}
                          required={true}
                          className="w-full"
                        />
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          WhatsApp video call link will be sent to this number
                        </p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          name="patientEmail"
                          value={formData.patientEmail}
                          onChange={handleInputChange}
                          placeholder="Patient's email address"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Distance Filter */}
              <DistanceSlider
                value={distanceFilter}
                onChange={handleDistanceFilterChange}
                isDarkMode={isDarkMode}
                businessLocation={businessLocation}
                onLocationUpdate={handleBusinessLocationUpdate}
                disabled={loading}
              />

              {/* Distance Filter Status */}
              {businessLocation && (
                <div className={`mt-2 p-2 rounded-lg text-sm ${
                  filteredDoctorsByDistance.length > 0 
                    ? isDarkMode 
                      ? 'bg-green-900/20 border border-green-800 text-green-300' 
                      : 'bg-green-50 border border-green-200 text-green-700'
                    : isDarkMode 
                      ? 'bg-orange-900/20 border border-orange-800 text-orange-300' 
                      : 'bg-orange-50 border border-orange-200 text-orange-700'
                }`}>
                  📍 {filteredDoctorsByDistance.length} doctor{filteredDoctorsByDistance.length !== 1 ? 's' : ''} available 
                  {distanceFilter !== -1 ? ` within ${distanceFilter}km` : ' (no distance limit)'} 
                  of your location
                  {filteredDoctorsByDistance.length === 0 && distanceFilter !== -1 && (
                    <span className="block mt-1 text-xs">
                      Try increasing the distance range or selecting "Anywhere" to find doctors.
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Doctor Selection *
                </label>
                <select
                  name="doctorSelectionType"
                  value={formData.doctorSelectionType}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="any">Any available doctor</option>
                  <option value="previous">Previously worked with doctors</option>
                </select>
              </div>

              {formData.doctorSelectionType === 'previous' && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Select Previous Doctor *
                  </label>
                  {loadingPreviousDoctors ? (
                    <div className={`flex items-center justify-center py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading previous doctors...
                    </div>
                  ) : filteredPreviousDoctorsByDistance.filter(doctor => {
                      // Filter by availability and service if service is selected
                      const isAvailable = doctor.isAvailable;
                      const offersService = !formData.serviceId || doctorOffersService(doctor, formData.serviceId);
                      return isAvailable && offersService;
                    }).length > 0 ? (
                    <>
                      <select
                        name="preferredDoctorId"
                        value={formData.preferredDoctorId || ''}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Select a previous doctor</option>
                        {filteredPreviousDoctorsByDistance
                          .filter(doctor => {
                            // Filter by availability and service if service is selected
                            const isAvailable = doctor.isAvailable;
                            const offersService = !formData.serviceId || doctorOffersService(doctor, formData.serviceId);
                            return isAvailable && offersService;
                          })
                          .map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              Dr. {doctor.firstName} {doctor.lastName}
                            </option>
                          ))}
                      </select>
                      <div className={`mt-2 p-2 rounded ${isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                          ✅ Showing {filteredPreviousDoctorsByDistance.filter(doctor => {
                            const isAvailable = doctor.isAvailable;
                            const offersService = !formData.serviceId || doctorOffersService(doctor, formData.serviceId);
                            return isAvailable && offersService;
                          }).length} available doctor(s) you've worked with before{formData.serviceId ? ' who offer the selected service' : ''} within {distanceFilter === 'anywhere' ? 'any distance' : distanceFilter}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {filteredPreviousDoctorsByDistance.length === 0 
                          ? "No previously worked with doctors found. You need to complete at least one service request first."
                          : formData.serviceId 
                            ? `None of your previous doctors who offer the selected service are currently available. ${filteredPreviousDoctorsByDistance.filter(d => d.isAvailable && !doctorOffersService(d, formData.serviceId)).length > 0 ? 'Some of your previous doctors are available but don\'t offer this service.' : ''} Please try the 'Any available doctor' option instead.`
                            : "None of your previous doctors are currently available. Please try the 'Any available doctor' option instead."
                        }
                      </p>
                      {filteredPreviousDoctorsByDistance.length > 0 && (
                        <div className="mt-2">
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Previous doctors ({filteredPreviousDoctorsByDistance.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length} unavailable{formData.serviceId ? '/don\'t offer this service' : ''}):
                          </p>
                          <ul className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                            {filteredPreviousDoctorsByDistance
                              .filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId)))
                              .slice(0, 3)
                              .map((doctor) => (
                                <li key={doctor.id}>
                                  • Dr. {doctor.firstName} {doctor.lastName}
                                  {!doctor.isAvailable ? ' (unavailable)' : formData.serviceId && !doctorOffersService(doctor, formData.serviceId) ? ' (doesn\'t offer this service)' : ''}
                                </li>
                              ))}
                            {filteredPreviousDoctorsByDistance.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length > 3 && (
                              <li>... and {filteredPreviousDoctorsByDistance.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {formData.doctorSelectionType === 'any' && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Doctor Assignment
                  </label>
                  {filteredDoctorsByDistance.length > 0 ? (
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        📍 Your request will be sent to {filteredDoctorsByDistance.length} available doctor{filteredDoctorsByDistance.length > 1 ? 's' : ''}
                        {businessLocation && distanceFilter !== -1 
                          ? ` within ${distanceFilter}km of your location` 
                          : businessLocation 
                            ? ' (no distance limit)' 
                            : ' in your area'
                        }.
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mt-1`}>
                        The first available doctor will be automatically assigned to your request.
                      </p>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        ⚠️ No doctors available
                        {businessLocation && distanceFilter !== -1 
                          ? ` within ${distanceFilter}km of your location` 
                          : ' in your area'
                        }.
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'} mt-1`}>
                        Please try increasing the distance range or contact support for assistance.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Service Date *
                  </label>
                  <input
                    type="date"
                    name="serviceDate"
                    value={formData.serviceDate}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Service Time *
                  </label>
                  <input
                    type="time"
                    name="serviceTime"
                    value={formData.serviceTime}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>

              <div className={`${isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} p-3 rounded-lg border`}>
                <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'} font-medium`}>
                  📅 Please select when you need the medical service. The date and time must be in the future.
                </p>
              </div>

              {/* Booking Fee Notice */}
              <div className={`${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} p-3 rounded-lg border`}>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} font-medium`}>
                  ℹ️ Booking Fee: A {formatCurrency(SERVICE_CHARGE)} booking fee will be added to your final payment.
                </p>
              </div>
              </div>
              
              <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} flex-shrink-0`}>
                <div className="flex space-x-3">
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
                      doctorSelectionType: 'any',
                      serviceDate: '',
                      serviceTime: '',
                      // Reset patient information fields
                      patientFirstName: '',
                      patientLastName: '',
                      patientPhone: '',
                      patientCountryCode: '+44', // Default to UK
                      patientEmail: '',
                    });
                  }}
                  className={`flex-1 px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (formData.doctorSelectionType === 'any' && filteredDoctorsByDistance.length === 0)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 
                   (formData.doctorSelectionType === 'any' && filteredDoctorsByDistance.length === 0) ? 'No Doctors Available' :
                   'Pay & Request Doctor'}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hours Input Popup */}
      {showHoursPopup && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-2xl w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg flex-shrink-0`}>
              <div className="flex items-center space-x-3">
                <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                  <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Request Service</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                    Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Which service do you require? *
                </label>
                <div className="space-y-4">
                  {/* NHS Services */}
                  {(() => {
                    const nhsServices = availableServices.filter(service => service.category === 'nhs');
                    if (nhsServices.length === 0) return null;
                    return (
                      <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                        <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          NHS Work *
                        </h3>
                        <div className="space-y-2 pr-6">
                          {nhsServices.map(service => (
                            <label key={service.id} className="flex items-center space-x-3 cursor-pointer pr-6">
                              <input
                                type="radio"
                                name="quickRequestServiceId"
                                value={service.id}
                                checked={quickRequestServiceId === service.id.toString()}
                                onChange={(e) => setQuickRequestServiceId(e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {service.name}
                              </span>
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-100'} px-2 py-1 rounded mr-3`}>
                                £{service.price}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Online Services */}
                  {(() => {
                    const onlineServices = availableServices.filter(service => service.category === 'online');
                    if (onlineServices.length === 0) return null;
                    return (
                      <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                        <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Online Private Doctor *
                        </h3>
                        <div className="space-y-2 pr-6">
                          {onlineServices.map(service => (
                            <label key={service.id} className="flex items-center space-x-3 cursor-pointer pr-6">
                              <input
                                type="radio"
                                name="quickRequestServiceId"
                                value={service.id}
                                checked={quickRequestServiceId === service.id.toString()}
                                onChange={(e) => setQuickRequestServiceId(e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {service.name}
                              </span>
                              <span className={`text-sm font-medium px-2 py-1 rounded mr-3 ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
                                £{service.price}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* In-Person Services */}
                  {(() => {
                    const inPersonServices = availableServices.filter(service => service.category === 'in-person');
                    if (inPersonServices.length === 0) return null;
                    return (
                      <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                        <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          In Person Private Doctor *
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-6">
                          {inPersonServices.map(service => (
                            <label key={service.id} className="flex items-center space-x-3 cursor-pointer pr-6">
                              <input
                                type="radio"
                                name="quickRequestServiceId"
                                value={service.id}
                                checked={quickRequestServiceId === service.id.toString()}
                                onChange={(e) => setQuickRequestServiceId(e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {service.name}
                              </span>
                              <span className={`text-sm font-medium px-2 py-1 rounded mr-3 ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
                                £{service.price}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {quickRequestServiceId && !doctorOffersService(selectedDoctor, quickRequestServiceId) && (
                  <p className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    ⚠️ Dr. {selectedDoctor.firstName} {selectedDoctor.lastName} does not offer this service
                  </p>
                )}
              </div>

              {/* Patient Information Fields - Show only for online consultations */}
              {(() => {
                const selectedService = availableServices.find(s => s.id.toString() === quickRequestServiceId);
                const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || 
                                              selectedService?.category === 'online';
                
                if (!isOnlineConsultation) return null;
                
                return (
                  <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-orange-600 bg-orange-900/20' : 'border-orange-200 bg-orange-50'}`}>
                    <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                      👤 Patient Information *
                    </h3>
                    <p className={`text-xs mb-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      Please provide the patient's details who will be participating in the online consultation.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={quickRequestPatientFirstName}
                          onChange={(e) => setQuickRequestPatientFirstName(e.target.value)}
                          required
                          placeholder="Patient's first name"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={quickRequestPatientLastName}
                          onChange={(e) => setQuickRequestPatientLastName(e.target.value)}
                          required
                          placeholder="Patient's last name"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Phone Number *
                        </label>
                        <CountryCodePicker
                          selectedCode={quickRequestPatientCountryCode}
                          onCodeChange={(code) => setQuickRequestPatientCountryCode(code)}
                          phoneNumber={quickRequestPatientPhone}
                          onPhoneChange={(phone) => setQuickRequestPatientPhone(phone)}
                          placeholder="Patient's phone number (for video call link)"
                          isDarkMode={isDarkMode}
                          required={true}
                          className="w-full"
                        />
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          WhatsApp video call link will be sent to this number
                        </p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          value={quickRequestPatientEmail}
                          onChange={(e) => setQuickRequestPatientEmail(e.target.value)}
                          placeholder="Patient's email address"
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  Estimated cost: {(() => {
                    const selectedService = availableServices.find(service => service.id.toString() === quickRequestServiceId.toString());
                    const servicePrice = parseFloat(selectedService?.price || 0);
                    return formatCurrency(servicePrice + SERVICE_CHARGE);
                  })()}
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}> (includes £{SERVICE_CHARGE} booking fee)</span>
                </p>
                <div className={`mt-2 p-2 rounded ${isDarkMode ? 'bg-orange-900/20 border-orange-600/30' : 'bg-orange-50 border-orange-200'} border`}>
                  <p className={`text-xs ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    💳 Payment required before request is sent to doctor
                  </p>
                </div>
              </div>
              
              {/* Date and Time Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Service Date *
                  </label>
                  <input
                    type="date"
                    value={quickRequestServiceDate}
                    onChange={(e) => setQuickRequestServiceDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Service Time *
                  </label>
                  <input
                    type="time"
                    value={quickRequestServiceTime}
                    onChange={(e) => setQuickRequestServiceTime(e.target.value)}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    required
                  />
                </div>
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
                <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-medium`}>• Service price: {(() => {
                  const selectedService = availableServices.find(service => service.id.toString() === quickRequestServiceId.toString());
                  return formatCurrency(parseFloat(selectedService?.price || 0));
                })()}</p>
                <p className={`text-xs ${isDarkMode ? 'text-orange-300' : 'text-orange-600'} font-medium`}>• Booking fee: {formatCurrency(SERVICE_CHARGE)}</p>
              </div>
            </div>
            <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} flex-shrink-0`}>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowHoursPopup(false);
                    setSelectedDoctor(null);
                    setRequestHours(1);
                    setQuickRequestServiceType('');
                    setQuickRequestServiceId('');
                    setQuickRequestServiceDate('');
                    setQuickRequestServiceTime('');
                    // Reset patient information
                    setQuickRequestPatientFirstName('');
                    setQuickRequestPatientLastName('');
                    setQuickRequestPatientPhone('');
                    setQuickRequestPatientCountryCode('+44');
                    setQuickRequestPatientEmail('');
                  }}
                  className={`flex-1 px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuickRequest}
                  disabled={loading || !requestHours || parseFloat(requestHours) <= 0 || !quickRequestServiceId || !quickRequestServiceDate || !quickRequestServiceTime || (quickRequestServiceId && !doctorOffersService(selectedDoctor, quickRequestServiceId)) || (() => {
                    const selectedService = availableServices.find(s => s.id.toString() === quickRequestServiceId);
                    const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || selectedService?.category === 'online';
                    return isOnlineConsultation && (!quickRequestPatientFirstName || !quickRequestPatientLastName || !quickRequestPatientPhone);
                  })()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow"
                >
                  {loading ? 'Processing...' : 'Pay & Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative max-w-md w-full">
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentRequest(null);
              }}
              className="absolute -top-2 -right-2 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <PaymentForm 
              serviceRequest={{
                ...paymentRequest,
                totalAmount: calculateTotalAmount(paymentRequest)
              }} 
              onPaymentSuccess={handlePaymentSuccess}
              businessInfo={(() => {
                const info = {
                  id: user?.id,
                  email: user?.email,
                  name: businessData?.businessName || user?.businessName,
                  businessName: businessData?.businessName || user?.businessName
                };
                console.log('🏢 Business info for payment:', info);
                return info;
              })()}
            />
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-2xl w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                    <Building2 className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                  </div>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Business Profile</h2>
                </div>
                <button
                  onClick={handlecancelleditProfile}
                  className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 overflow-y-auto modal-scrollable flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={editProfileData.businessName}
                    onChange={handleProfileInputChange}
                    required
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter business name"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    name="contactPersonName"
                    value={editProfileData.contactPersonName}
                    onChange={handleProfileInputChange}
                    required
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter contact person name"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editProfileData.email}
                    onChange={handleProfileInputChange}
                    required
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editProfileData.phone}
                    onChange={handleProfileInputChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Business Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={editProfileData.address}
                    onChange={handleProfileInputChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter business address"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={editProfileData.city}
                    onChange={handleProfileInputChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={editProfileData.state}
                    onChange={handleProfileInputChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter state"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={editProfileData.zipCode}
                    onChange={handleProfileInputChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter postal code"
                  />
                </div>

                {/* Location Coordinates */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Location Coordinates
                    </label>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                    >
                      📍 Get Current Location
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        name="latitude"
                        value={editProfileData.latitude}
                        onChange={handleProfileInputChange}
                        step="any"
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Latitude"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="longitude"
                        value={editProfileData.longitude}
                        onChange={handleProfileInputChange}
                        step="any"
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Longitude"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Business Description
                  </label>
                  <textarea
                    name="description"
                    value={editProfileData.description}
                    onChange={handleProfileInputChange}
                    rows={3}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Describe your business (optional)"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handlecancelleditProfile}
                  className={`flex-1 px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileUpdateLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow flex items-center justify-center"
                >
                  {profileUpdateLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      Update Profile
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
