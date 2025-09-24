'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Clock, User, MapPin, DollarSign, LogOut, X, Phone, CreditCard, Lock, Edit, Save, FileText } from 'lucide-react';
import { serviceRequestAPI, doctorAPI, businessAPI, serviceAPI } from '../../../lib/api';
import api from '../../../lib/api';
import { formatCurrency, formatDate, getStatusColor, getTimeElapsed, formatDuration } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';
import PaymentForm from '../../../components/PaymentForm';
import CountryCodePicker from '../../../components/CountryCodePicker';
import BusinessComplianceDocuments from '../../../components/BusinessComplianceDocuments';
import BusinessNotificationCenter from '../../../components/BusinessNotificationCenter';

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
    // estimatedDuration removed - will use service default duration
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
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [loadingAssignedDoctors, setLoadingAssignedDoctors] = useState(false);
  
  // New states for service selection and service-based doctor filtering
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceBasedDoctors, setServiceBasedDoctors] = useState([]);
  const [loadingServiceDoctors, setLoadingServiceDoctors] = useState(false);
  const [serviceCost, setServiceCost] = useState(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  
  // Tab state for navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  
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
  
  // Loading overlay state for doctor request submission specifically
  const [isSendingDoctorRequest, setIsSendingDoctorRequest] = useState(false);
  
  const [isOnlineService, setIsOnlineService] = useState(false);
  
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
  const [profileCountryCode, setProfileCountryCode] = useState('+1');
  const [profilePhoneNumber, setProfilePhoneNumber] = useState('');
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  // Auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds refresh rate

  // Distance filtering functions
  
  // Helper function to get current service duration in hours
  const getCurrentServiceDuration = () => {
    if (!formData.serviceId || !availableServices.length) {
      return 1; // Default to 1 hour if no service selected
    }
    
    const selectedService = availableServices.find(service => service.id.toString() === formData.serviceId.toString());
    if (!selectedService || !selectedService.duration) {
      return 1; // Default to 1 hour if service not found or no duration
    }
    
    // Convert minutes to hours
    const durationInHours = selectedService.duration / 60;
    return durationInHours > 0 ? durationInHours : 1; // Ensure positive duration
  };

  // Helper function to get service duration by service ID
  const getServiceDurationById = (serviceId) => {
    if (!serviceId || !availableServices.length) {
      return 1; // Default to 1 hour if no service ID or services
    }
    
    const selectedService = availableServices.find(service => service.id.toString() === serviceId.toString());
    if (!selectedService || !selectedService.duration) {
      return 1; // Default to 1 hour if service not found or no duration
    }
    
    // Convert minutes to hours
    const durationInHours = selectedService.duration / 60;
    return durationInHours > 0 ? durationInHours : 1; // Ensure positive duration
  };

  // Function to filter doctors by service only (no location filtering)
  const applyServiceFilter = (selectedServiceId = null) => {
    // If no service is selected, return all doctors
    if (!selectedServiceId) {
      return;
    }

    ('� Service Filter Applied:', {
      selectedService: `Service ID: ${selectedServiceId}`,
      totalDoctors: nearbyDoctors.length,
      totalPreviousDoctors: previousDoctors.length
    });
  };

  // Helper function to get doctors that offer a specific service (replaces distance filtering)
  const getDoctorsForService = (doctorsList, serviceId) => {
    if (!serviceId) return doctorsList;
    return doctorsList.filter(doctor => doctorOffersService(doctor, serviceId));
  };

  // Helper function to get available doctors for current service
  const getAvailableDoctors = () => {
    let availableDoctors = nearbyDoctors.filter(doctor => doctor.isAvailable);
    if (formData.serviceId) {
      availableDoctors = getDoctorsForService(availableDoctors, formData.serviceId);
    }
    return availableDoctors;
  };

  // Helper function to get available previous doctors for current service  
  const getAvailablePreviousDoctors = () => {
    let availablePrevious = previousDoctors.filter(doctor => doctor.isAvailable);
    if (formData.serviceId) {
      availablePrevious = getDoctorsForService(availablePrevious, formData.serviceId);
    }
    return availablePrevious;
  };

  // Helper function to get available assigned doctors for current service
  const getAvailableAssignedDoctors = () => {
    let availableAssigned = assignedDoctors.filter(doctor => doctor.isAvailable);
    if (formData.serviceId) {
      availableAssigned = getDoctorsForService(availableAssigned, formData.serviceId);
    }
    return availableAssigned;
  };

  // Authentication check - redirect if not authenticated or not business
  useEffect(() => {
    ('🔍 Business Dashboard - Auth state check:', {
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
        ('🚫 Not authenticated after delay, redirecting to business login');
        router.push('/business/login');
        return;
      }
      
      // Only check role if we have a user and are not loading
      if (!authLoading && isAuthenticated && user && user.role !== 'business') {
        ('🚫 Not business role (got:', user.role, '), redirecting to home');
        router.push('/');
        return;
      }
      
      if (!authLoading && isAuthenticated && user && user.role === 'business') {
        ('✅ Business authenticated, loading dashboard');
      }
    }, 500); // 500ms delay to ensure auth is fully loaded

    // Cleanup timeout if component unmounts or dependencies change
    return () => clearTimeout(timeoutId);
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    ('🏢 Business Dashboard useEffect - User:', user);
    ('🆔 User ID:', user?.id);
    ('📧 User email:', user?.email);
    
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

  // Handle business data updates
  useEffect(() => {
    ('🏢 Business data useEffect:', businessData);
    
    // Update edit profile data when business data is available
    // BUT ONLY if the edit profile modal is not currently open
    if (businessData && !showEditProfile) {
      console.log('🔄 Resetting editProfileData from businessData (modal closed)');
      setEditProfileData({
        businessName: businessData.businessName || '',
        contactPersonName: businessData.contactPersonName || '',
        email: businessData.email || '',
        phone: businessData.phone || '',
        address: businessData.address || '',
        city: businessData.city || '',
        state: businessData.state || '',
        zipCode: businessData.zipCode || '',
        description: businessData.description || '',
        latitude: businessData.latitude || '',
        longitude: businessData.longitude || ''
      });
    } else if (showEditProfile) {
      console.log('✅ Preserving editProfileData (modal open)');
    }

    // Apply service filter when service changes
    applyServiceFilter(formData.serviceId);
  }, [businessData, nearbyDoctors, previousDoctors, formData.serviceId, showEditProfile]);

  // Fetch assigned doctors when business data is available
  useEffect(() => {
    if (businessData?.id && !loadingAssignedDoctors) {
      fetchAssignedDoctors();
    }
  }, [businessData?.id]);

  // Initialize online service state when services are loaded
  useEffect(() => {
    if (availableServices.length > 0 && formData.serviceId) {
      const selectedService = availableServices.find(service => service.id.toString() === formData.serviceId.toString());
      const isOnline = selectedService?.category === 'online';
      setIsOnlineService(isOnline);
    }
  }, [availableServices, formData.serviceId]);

  // Initialize quick request online service state when services are loaded




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
      ('🔍 Fetching business data for ID:', user.id);
      const response = await businessAPI.getById(user.id);
      ('📡 Business API response:', response);
      
      if (response.data?.data) {
        const business = response.data.data;
        ('✅ Business data received:', business);
        setBusinessData(business);
      } else {
        ('⚠️ No business data in response, falling back to user data');
        setBusinessData(user);
      }
    } catch (error) {
      console.error('❌ Error fetching business data:', error);
      console.error('❌ Error details:', error.response?.data);
      ('🔄 Falling back to user data from auth context');
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
      ('🔍 Fetching previously worked with doctors for business:', user.id);
      
      // Get all completed service requests for this business
      const response = await serviceRequestAPI.getBusinessRequests(user.id);
      ('📊 Business requests for previous doctors:', response.data);

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
            
            (`🔍 Checking doctor ${doctorId}:`, {
              foundInAvailable: !!currentDoctor,
              currentDoctorServices: currentDoctor?.services,
              availableDoctorsCount: availableDoctors.length
            });
            
            // Also fetch full doctor profile with services
            let doctorWithServices = null;
            try {
              const profileResponse = await doctorAPI.getProfile(doctorId);
              doctorWithServices = profileResponse.data;
              (`🔍 Doctor ${doctorId} profile services:`, doctorWithServices?.services);
            } catch (profileErr) {
              (`Could not fetch profile for doctor ${doctorId}:`, profileErr);
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
              
              (`✅ Updated doctor ${doctorId}:`, {
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
              
              (`❌ Doctor ${doctorId} not available, services:`, uniqueDoctors[doctorId].services?.map(s => ({ id: s.id, name: s.name })));
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
      ('👨‍⚕️ Previously worked with doctors with current availability:', previousDoctorsList);
      ('✅ Available previous doctors:', previousDoctorsList.filter(d => d.isAvailable));
      setPreviousDoctors(previousDoctorsList);
    } catch (error) {
      console.error('❌ Error fetching previous doctors:', error);
      setPreviousDoctors([]);
    } finally {
      setLoadingPreviousDoctors(false);
    }
  };

  // Fetch assigned doctors for this business
  const fetchAssignedDoctors = async () => {
    if (!businessData?.id) {
      ('⚠️ No business ID available for fetching assigned doctors');
      return;
    }

    try {
      setLoadingAssignedDoctors(true);
      ('🔍 Fetching assigned doctors for business:', businessData.id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/businesses/${businessData.id}/assigned-doctors`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assigned doctors: ${response.status}`);
      }

      const data = await response.json();
      const doctors = data.data || [];
      
      ('👨‍⚕️ Raw assigned doctors response:', doctors);

      // Use the same availability checking logic as previous doctors
      try {
        // Get current available doctors list
        const availableResponse = await doctorAPI.getAvailable();
        const availableDoctors = availableResponse.data || [];
        
        // Check each assigned doctor against the available doctors list
        const assignedDoctorsWithAvailability = doctors.map(doctor => {
          const currentDoctor = availableDoctors.find(d => d.id.toString() === doctor.id.toString());
          
          (`🔍 Checking assigned doctor ${doctor.id}:`, {
            foundInAvailable: !!currentDoctor,
            currentDoctorServices: currentDoctor?.services,
            availableDoctorsCount: availableDoctors.length
          });
          
          if (currentDoctor) {
            // Doctor is available, use current data
            return {
              ...doctor,
              isAvailable: true,
              hourlyRate: currentDoctor.hourlyRate || doctor.hourlyRate,
              specialization: currentDoctor.specialisation || doctor.specialization,
              services: currentDoctor.services || doctor.services || []
            };
          } else {
            // Doctor is not in available list, mark as unavailable
            return {
              ...doctor,
              isAvailable: false,
              services: doctor.services || []
            };
          }
        });

        ('👨‍⚕️ Assigned doctors with availability:', assignedDoctorsWithAvailability);
        ('✅ Available assigned doctors:', assignedDoctorsWithAvailability.filter(d => d.isAvailable));
        setAssignedDoctors(assignedDoctorsWithAvailability);
      } catch (availabilityError) {
        console.error('Error checking doctor availability:', availabilityError);
        // If we can't check availability, just use the doctors as is but mark them unavailable
        const doctorsWithUnavailable = doctors.map(doctor => ({
          ...doctor,
          isAvailable: false,
          services: doctor.services || []
        }));
        setAssignedDoctors(doctorsWithUnavailable);
      }
    } catch (error) {
      console.error('❌ Error fetching assigned doctors:', error);
      setAssignedDoctors([]);
    } finally {
      setLoadingAssignedDoctors(false);
    }
  };

  // Fetch available services from backend
  const fetchAvailableServices = async () => {
    try {
      setLoadingServices(true);
      ('🔍 Fetching available services from backend');
      
      // Add a small delay to see the loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch all active services sorted by category and display order
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?filters[isActive][$eq]=true&sort=category:asc,displayOrder:asc,name:asc&pagination[limit]=100`);
      const data = await response.json();
      ('📊 Raw API response:', data);
      ('📊 Response status:', response.status);
      
      let services = [];
      if (data && Array.isArray(data.data)) {
        services = data.data;
        ('📊 Using data.data array:', services.length, 'services');
      } else if (Array.isArray(data)) {
        services = data;
        ('📊 Using data array:', services.length, 'services');
      } else {
        ('❌ Unexpected response structure:', data);
      }
      
      // Filter out patient services for business dashboard
      services = services.filter(service => service.serviceType !== 'patient');
      
      ('✅ Fetched services:', services.length, 'services (after filtering out patient services)');
      ('✅ Service categories found:', [...new Set(services.map(s => s.category))]);
      ('✅ Service types found:', [...new Set(services.map(s => s.serviceType))]);
      
      setAvailableServices(services);
    } catch (error) {
      console.error('❌ Error fetching available services:', error);
      setAvailableServices([]);
    } finally {
      setLoadingServices(false);
      ('🏁 Loading services completed');
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
      ('🔍 Fetching doctors for service ID:', serviceId);
      
      const response = await serviceAPI.getDoctorsByService(serviceId, {
        available: true // Only get available doctors
      });
      
      ('👨‍⚕️ Doctors for service response:', response.data);
      
      let doctors = [];
      if (Array.isArray(response.data)) {
        doctors = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        doctors = response.data.data;
      }
      
      ('✅ Available doctors for service:', doctors);
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
    
    // Parse existing phone number to extract country code and number
    const existingPhone = business?.phone || '';
    const parsePhoneNumber = (phone) => {
      if (!phone) return { countryCode: '+1', phoneNumber: '' };
      
      // Common country codes to check for
      const countryCodes = ['+1', '+44', '+91', '+86', '+49', '+33', '+81', '+61', '+55', '+52', '+7', '+39', '+34', '+31', '+46', '+47', '+41', '+32', '+48', '+420', '+351', '+30', '+90', '+234', '+254', '+256', '+27', '+20', '+212', '+213', '+216', '+218', '+249', '+251', '+252', '+253', '+223', '+224', '+225', '+226', '+227', '+228', '+229', '+230'];
      
      for (const code of countryCodes.sort((a, b) => b.length - a.length)) {
        if (phone.startsWith(code)) {
          return {
            countryCode: code,
            phoneNumber: phone.slice(code.length)
          };
        }
      }
      
      // If no country code found, assume it's a local number
      return { countryCode: '+1', phoneNumber: phone };
    };
    
    const { countryCode, phoneNumber } = parsePhoneNumber(existingPhone);
    setProfileCountryCode(countryCode);
    setProfilePhoneNumber(phoneNumber);
    
    setEditProfileData({
      businessName: business?.businessName || business?.name || '',
      contactPersonName: business?.contactPersonName || `${business?.firstName || ''} ${business?.lastName || ''}`.trim() || '',
      email: business?.email || '',
      phone: existingPhone,
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
    console.log('🔄 Form field changed:', name, '=', value);
    setEditProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for profile phone country code change
  const handleProfileCountryCodeChange = (code) => {
    console.log('🔄 Profile country code changed:', code);
    setProfileCountryCode(code);
    // Update the combined phone number in profile data
    const fullPhone = code + profilePhoneNumber;
    setEditProfileData(prev => ({
      ...prev,
      phone: fullPhone
    }));
  };

  // Handler for profile phone number change
  const handleProfilePhoneChange = (phone) => {
    console.log('🔄 Profile phone number changed:', phone);
    setProfilePhoneNumber(phone);
    // Update the combined phone number in profile data
    const fullPhone = profileCountryCode + phone;
    setEditProfileData(prev => ({
      ...prev,
      phone: fullPhone
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
    setProfileCountryCode('+1');
    setProfilePhoneNumber('');
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
          // Location coordinates set successfully
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



  // Format time for display
  const formatTime = (time) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
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
      if (!quickRequestPatientFirstName || !quickRequestPatientLastName || !quickRequestPatientPhone || !quickRequestPatientEmail) {
        alert('Please provide complete patient information (name, phone, and email) for online consultation.');
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

    // Create ISO string without timezone conversion to preserve exact selected time
    const serviceDateTimeString = `${quickRequestServiceDate}T${quickRequestServiceTime}:00.000Z`;

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
        serviceDateTime: serviceDateTimeString,
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
          serviceDateTime: serviceDateTimeString,
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
    ('🔍 Checking if doctor offers service:', {
      doctor: doctor?.firstName + ' ' + doctor?.lastName,
      doctorServices: doctor?.services,
      serviceId,
      serviceIdType: typeof serviceId,
      servicesLength: doctor?.services?.length
    });
    
    if (!doctor?.services || !serviceId) {
      ('❌ Missing doctor services or serviceId:', {
        hasServices: !!doctor?.services,
        servicesLength: doctor?.services?.length,
        hasServiceId: !!serviceId
      });
      return false;
    }
    
    const hasService = doctor.services.some(service => {
      ('🔍 Comparing service:', {
        serviceIdFromDoctor: service.id,
        serviceNameFromDoctor: service.name,
        serviceIdFromDropdown: serviceId,
        comparison: service.id.toString() === serviceId.toString()
      });
      return service.id.toString() === serviceId.toString();
    });
    
    ('✅ Doctor offers service result:', hasService);
    return hasService;
  };

  const handleCancelRequest = async (requestId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this service request?');
    if (!confirmCancel) return;

    const reason = 'Cancelled by business';

    try {
      // Don't show the loading overlay for cancellation
      const response = await serviceRequestAPI.cancel(requestId, reason);
      
      if (response.data) {
        alert('Service request cancelled successfully!');
        fetchServiceRequests(); // Refresh the requests list
      }
    } catch (error) {
      console.error('Error cancelling service request:', error);
      alert('Failed to cancel service request. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // If doctor selection type changes, reset preferred doctor and fetch doctors if needed
    if (name === 'doctorSelectionType') {
      setFormData(prev => ({
        ...prev,
        preferredDoctorId: null
      }));
      
      if (value === 'previous' && previousDoctors.length === 0) {
        fetchPreviousDoctors();
      }
      
      if (value === 'assigned' && assignedDoctors.length === 0) {
        fetchAssignedDoctors();
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
      
      // Check if it's an online service and set calendar state
      const isOnline = selectedService?.category === 'online';
      setIsOnlineService(isOnline);
      
      // Clear calendar data for non-online services
      if (!isOnline) {
        setAvailabilityData({});
        setSelectedDate('');
        setAvailableSlots([]);
      }
      
      // Calculate the correct duration in hours
      const serviceDurationInHours = selectedService?.duration ? formatDuration(selectedService.duration / 60) : 1;
      ('🕒 Service selection debug:', {
        serviceId: value,
        serviceName: selectedService?.name,
        serviceDurationMinutes: selectedService?.duration,
        serviceDurationHours: serviceDurationInHours,
        willUseServiceDefaultDuration: true
      });
      
      // Check if currently selected doctor still offers the new service (for previous or assigned doctor selection)
      let shouldResetDoctor = false;
      if (formData.preferredDoctorId && (formData.doctorSelectionType === 'previous' || formData.doctorSelectionType === 'assigned') && value) {
        let selectedDoctor = null;
        if (formData.doctorSelectionType === 'previous') {
          selectedDoctor = previousDoctors.find(d => d.id.toString() === formData.preferredDoctorId.toString());
        } else if (formData.doctorSelectionType === 'assigned') {
          selectedDoctor = assignedDoctors.find(d => d.id.toString() === formData.preferredDoctorId.toString());
        }
        
        if (selectedDoctor && !doctorOffersService(selectedDoctor, value)) {
          shouldResetDoctor = true;
          ('🔄 Selected doctor no longer offers the new service, resetting selection');
        }
      }
      
      setFormData(prev => ({
        ...prev,
        serviceType: selectedService ? selectedService.name : '', // Update serviceType when service changes
        // estimatedDuration removed - duration now comes from service default
        preferredDoctorId: shouldResetDoctor || !value ? null : prev.preferredDoctorId // Reset selected doctor when service changes or doctor doesn't offer service
      }));
      
      // Fetch doctors for the selected service for any selection type
      if (value) {
        fetchDoctorsForService(value);
        // Calculate service cost with the service's default duration
        calculateServiceCost(value, serviceDurationInHours);
      } else {
        // Clear service cost when no service is selected
        setServiceCost(null);
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
      ('💰 Calculating cost for service:', serviceId, 'with duration:', duration);
      
      // Find the selected service to get base price and duration
      const selectedService = availableServices.find(service => service.id.toString() === serviceId.toString());
      
      if (!selectedService) {
        console.error('❌ Service not found in available services');
        setServiceCost(null);
        return;
      }
      
      const basePrice = parseFloat(selectedService.price || 0);
      const serviceDuration = selectedService.duration ? (selectedService.duration / 60) : 1; // Convert minutes to hours
      const requestedDuration = duration || getCurrentServiceDuration();
      
      ('🔍 Debug duration calculation:');
      ('  - Service duration (minutes):', selectedService.duration);
      ('  - Service duration (hours):', serviceDuration);
      ('  - Requested duration (hours):', requestedDuration);
      ('  - Base price:', basePrice);
      
      // Scale the price based on duration
      const scalingFactor = requestedDuration / serviceDuration;
      const scaledPrice = basePrice * scalingFactor;
      const totalCost = scaledPrice + SERVICE_CHARGE;
      
      ('  - Scaling factor:', scalingFactor);
      ('  - Scaled price:', scaledPrice);
      
      const costData = {
        servicePrice: scaledPrice,
        serviceCharge: SERVICE_CHARGE,
        totalAmount: totalCost,
        baseDuration: serviceDuration,
        requestedDuration: requestedDuration,
        scalingFactor: scalingFactor
      };
      
      ('💰 Calculated service cost:', costData);
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
    // Fetch previous doctors and assigned doctors when form opens for the first time
    if (previousDoctors.length === 0) {
      fetchPreviousDoctors();
    }
    if (assignedDoctors.length === 0) {
      fetchAssignedDoctors();
    }
    // If a service is already selected (from quick actions), fetch doctors for that service
    if (formData.serviceId && serviceBasedDoctors.length === 0) {
      fetchDoctorsForService(formData.serviceId);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setIsSendingDoctorRequest(true); // Show loading overlay only for doctor requests

    try {
      // Validation: If service is required but not selected
      if (!formData.serviceId) {
        alert('Please select a service for your request.');
        setIsSendingDoctorRequest(false);
        return;
      }

      // Validation: If previous doctors option is selected, a doctor must be chosen
      if (formData.doctorSelectionType === 'previous' && !formData.preferredDoctorId) {
        alert('Please select a doctor from your previously worked with doctors, or choose "Any available doctor" option.');
        setIsSendingDoctorRequest(false);
        return;
      }

      // Validation: If assigned doctors option is selected, a doctor must be chosen
      if (formData.doctorSelectionType === 'assigned' && !formData.preferredDoctorId) {
        alert('Please select a doctor from your assigned doctors, or choose "Any available doctor" option.');
        setIsSendingDoctorRequest(false);
        return;
      }

      // Additional validation: Ensure the selected doctor is available if previous option is chosen
      if (formData.doctorSelectionType === 'previous' && formData.preferredDoctorId) {
        const selectedDoctor = previousDoctors.find(d => d.id.toString() === formData.preferredDoctorId.toString());
        if (!selectedDoctor || !selectedDoctor.isAvailable) {
          alert('The selected doctor is no longer available. Please choose another doctor or refresh the list.');
          setIsSendingDoctorRequest(false);
          return;
        }
      }

      // Additional validation: Ensure the selected doctor is available if assigned option is chosen
      if (formData.doctorSelectionType === 'assigned' && formData.preferredDoctorId) {
        const selectedDoctor = assignedDoctors.find(d => d.id.toString() === formData.preferredDoctorId.toString());
        if (!selectedDoctor || !selectedDoctor.isAvailable) {
          alert('The selected assigned doctor is no longer available. Please choose another doctor or refresh the list.');
          setIsSendingDoctorRequest(false);
          return;
        }
      }

      // Validation: Check if there are any doctors available for the selected service
      if (formData.doctorSelectionType === 'any' && getAvailableDoctors().length === 0) {
        alert('No doctors are available for the selected service. Please contact support for assistance.');
        setIsSendingDoctorRequest(false);
        return;
      }

      // Validation: Check if service date and time are provided
      if (!formData.serviceDate || !formData.serviceTime) {
        alert('Please provide both service date and time.');
        setIsSendingDoctorRequest(false);
        return;
      }

      // Validation: Check if service date is not in the past
      const serviceDateTime = new Date(`${formData.serviceDate}T${formData.serviceTime}`);
      const now = new Date();
      if (serviceDateTime <= now) {
        alert('Service date and time must be in the future.');
        setIsSendingDoctorRequest(false);
        return;
      }

      // Create ISO string without timezone conversion to preserve exact selected time
      const serviceDateTimeString = `${formData.serviceDate}T${formData.serviceTime}:00.000Z`;

      // Validation: For online consultations, patient information is required
      const selectedService = availableServices.find(service => service.id.toString() === formData.serviceId.toString());
      const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || 
                                    selectedService?.category === 'online';
      
      if (isOnlineConsultation) {
        if (!formData.patientFirstName || !formData.patientLastName || !formData.patientPhone || !formData.patientEmail) {
          alert('For online consultations, please provide the patient\'s first name, last name, phone number, and email address.');
          setIsSendingDoctorRequest(false);
          return;
        }
        
        // Basic phone number validation
        const fullPhoneNumber = formData.patientCountryCode + formData.patientPhone.replace(/\s/g, '');
        const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;
        if (!phoneRegex.test(fullPhoneNumber.replace(/\s/g, ''))) {
          alert('Please provide a valid phone number for the patient.');
          setIsSendingDoctorRequest(false);
          return;
        }
      }

      // Calculate total cost including booking fee and duration scaling
      const baseServiceCost = parseFloat(selectedService?.price || 0);
      const serviceDuration = selectedService?.duration ? (selectedService.duration / 60) : 1; // Convert minutes to hours, default to 1 hour
      const requestedDuration = getCurrentServiceDuration();
      
      // Scale the price based on duration (proportional scaling)
      const scaledServiceCost = baseServiceCost * (requestedDuration / serviceDuration);
      const totalCost = scaledServiceCost + SERVICE_CHARGE;

      console.log('🔍 Form Submission Debug:', {
        formData,
        serviceDate: formData.serviceDate,
        serviceTime: formData.serviceTime,

        isOnlineService
      });

      // Create a temporary request object for payment
      const tempRequest = {
        id: 'temp-' + Date.now(), // Temporary ID for payment
        businessId: user.id,
        serviceType: selectedService?.name || 'Selected Service',
        description: formData.description,
        estimatedDuration: parseInt(requestedDuration * 60), // Convert hours back to minutes for storage
        serviceCharge: SERVICE_CHARGE,
        servicePrice: scaledServiceCost, // Store the scaled service price based on duration
        serviceDateTime: serviceDateTimeString,
        totalAmount: totalCost,
        // Store the complete form data for later use
        _formData: {
          ...formData
        },
        _serviceDateTime: serviceDateTimeString // Store string instead of Date object
      };

      // Show payment modal first - payment is now required before service request creation
      setPaymentRequest(tempRequest);
      setShowPaymentModal(true);
      setIsSendingDoctorRequest(false); // Hide loading overlay when showing payment modal

    } catch (error) {
      console.error('Error preparing service request:', error);
      alert('Failed to prepare service request. Please try again.');
      setIsSendingDoctorRequest(false); // Hide loading overlay on error
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
    setIsSendingDoctorRequest(true); // Show loading overlay for doctor request notifications
    
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
          
          const charge = paymentIntent.charges?.data?.[0];

          const requestData = {
            ...quickRequestData,
            businessId: user.id,
            // Mark as paid since payment was successful
            isPaid: true,
            paymentMethod: 'card',
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
            paidAt: new Date().toISOString(),
            totalAmount: paymentRequest.totalAmount,
            chargeId: charge?.id,
            currency: paymentIntent.currency || 'gbp'
          };

          // Create the direct service request with payment information
          const response = await serviceRequestAPI.createDirectRequest(requestData);
          
          if (response.data) {
            const requestId = response.data.id || response.data.data?.id;
            
            alert(`Payment successful! Service request sent to Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName} for ${requestHours} hour(s)!`);
            
            setShowHoursPopup(false);
            setSelectedDoctor(null);
            setRequestHours(1);
            setQuickRequestServiceType('');
            setQuickRequestServiceId('');
            setQuickRequestServiceDate('');
            setQuickRequestServiceTime('');
            ('🔄 Manually refreshing after creating paid quick service request');
            await fetchServiceRequests();
          }
        } else {
          // Handle regular request creation
          const formDataFromTemp = paymentRequest._formData;
          const serviceDateTimeString = paymentRequest._serviceDateTime;
          
          console.log('🔍 Service Request Creation Debug:', {
            formDataFromTemp,
            serviceDateTimeString,
            serviceDate: formDataFromTemp.serviceDate,
            serviceTime: formDataFromTemp.serviceTime
          });
          
          // Find the selected service to check if it's an online consultation
          const selectedService = availableServices.find(s => s.id.toString() === formDataFromTemp.serviceId.toString());
          const isOnlineConsultation = selectedService?.name?.toLowerCase().includes('online consultation') || 
                                       selectedService?.category === 'online';
          
          const charge = paymentIntent.charges?.data?.[0];

          const requestData = {
            businessId: user.id,
            // Explicitly include only the fields we need from formDataFromTemp
            serviceType: formDataFromTemp.serviceType,
            serviceId: formDataFromTemp.serviceId,
            description: formDataFromTemp.description,
            scheduledAt: formDataFromTemp.scheduledAt,
            preferredDoctorId: formDataFromTemp.preferredDoctorId,
            doctorSelectionType: formDataFromTemp.doctorSelectionType,
            // Set explicit values for other fields
            urgencyLevel: 'medium', // Default urgency level since we removed it from UI
            estimatedDuration: parseInt(getServiceDurationById(formDataFromTemp.serviceId) * 60), // Convert hours to minutes for storage
            serviceCharge: SERVICE_CHARGE,
            servicePrice: paymentRequest.servicePrice, // Store the service price for doctors
            serviceDateTime: serviceDateTimeString,
            // Mark as paid since payment was successful
            isPaid: true,
            paymentMethod: 'card',
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
            paidAt: new Date().toISOString(),
            totalAmount: paymentRequest.totalAmount,
            chargeId: charge?.id,
            currency: paymentIntent.currency || 'gbp'
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
            if ((formDataFromTemp.doctorSelectionType === 'previous' || formDataFromTemp.doctorSelectionType === 'assigned' || formDataFromTemp.doctorSelectionType === 'any') && formDataFromTemp.preferredDoctorId) {
              notificationMessage = `Payment successful! Service request created and your selected doctor has been notified.`;
            } else {
              notificationMessage = `Payment successful! Service request created and ${response.data.notifiedDoctors} nearby doctors have been notified.`;
            }
            
            alert(notificationMessage);
            setShowRequestForm(false);
            setFormData({
              serviceType: '',
              serviceId: '',
              description: '',
              // estimatedDuration removed - will use service default duration
              preferredDoctorId: null,
              doctorSelectionType: 'any',
              serviceDate: '',
              serviceTime: '',
              selectedSlotId: '', // Reset selected slot
              selectedTimeSlot: null, // Reset selected time slot
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
            setIsOnlineService(false); // Reset online service state
            ('🔄 Manually refreshing after creating paid service request');
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
        
        ('💳 Card Payment Response:', response.data);
        
        if (response.data) {
          alert(`Card payment of ${formatCurrency(calculateTotalAmount(paymentRequest))} processed successfully! (includes £${SERVICE_CHARGE} booking fee)`);
          
          // Force update the request in the local state too
          setServiceRequests(prev => 
            prev.map(req => 
              req.id === paymentRequest.id ? { 
                ...req, 
                isPaid: true, 
                paymentMethod: 'card',
                paymentIntentId: paymentIntent.id,
                chargeId: charge?.id,
                paymentStatus: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
                paidAt: new Date().toISOString(),
                currency: paymentIntent.currency || 'gbp',
                totalAmount: calculateTotalAmount(paymentRequest)
              } : req
            )
          );
          
          // Also fetch fresh data from server immediately regardless of auto-refresh
          ('🔄 Manually refreshing after card payment');
          await fetchServiceRequests();
        }
      }
    } catch (error) {
      console.error('Error processing payment/creating service request:', error);
      
      // Provide more specific error messages based on the error type
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        alert(`⏰ Service request is taking longer than expected to process. This usually happens when sending notifications to doctors.

🔄 The service request is likely being created - please check your requests list in a moment.

If you don't see your request after 2 minutes, please contact support.`);
      } else if (error.response?.status >= 500) {
        alert(`❌ Server error occurred while creating your service request.

🔄 Please check your requests list - the request might have been created despite the error.

If you don't see your request, please contact support.`);
      } else {
        alert(`❌ Service request creation failed.

🔄 Please refresh the page and check your requests list.

If the issue persists, contact support.`);
      }
    } finally {
      setIsSendingDoctorRequest(false); // Hide loading overlay
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
      isDarkMode 
        ? 'bg-gray-950 text-gray-100' 
        : 'relative overflow-hidden bg-gradient-to-b from-white via-blue-200/90 to-blue-300/80 text-gray-900'
    }`}>
      {!isDarkMode && (
        <>
          <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-blue-400/45 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute top-40 -right-24 w-[28rem] h-[28rem] bg-indigo-300/45 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-cyan-300/35 rounded-full blur-3xl" />
        </>
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
                disabled={!businessData?.isVerified}
                className={`px-4 py-2 ${businessData?.isVerified 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
                } text-white rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow disabled:cursor-not-allowed`}
                title={!businessData?.isVerified ? 'Business must be verified to request doctors' : 'Request a doctor consultation'}
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Request Doctor</span>
              </button>
              
              {/* Business Notification Center */}
              <BusinessNotificationCenter businessId={user?.id} className="flex-shrink-0" />
              
              <button
                onClick={handleLogout}
                className={`px-4 py-2 ${isDarkMode ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50' : 'bg-red-600 text-white hover:bg-red-700'} rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow`}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              {/* Business Notification Center for mobile */}
              <BusinessNotificationCenter businessId={user?.id} className="flex-shrink-0" />
              
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
                  if (businessData?.isVerified) {
                    handleOpenRequestForm();
                    const mobileMenu = document.getElementById('mobile-menu-business');
                    if (mobileMenu) mobileMenu.classList.add('hidden');
                  }
                }}
                disabled={!businessData?.isVerified}
                className={`w-full px-4 py-2 ${businessData?.isVerified 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
                } text-white rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow disabled:cursor-not-allowed`}
                title={!businessData?.isVerified ? 'Business must be verified to request doctors' : 'Request a doctor consultation'}
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

      {/* Verification Banner */}
      {businessData && !businessData.isVerified && (
        <div className={`border-b transition-colors ${
          isDarkMode 
            ? 'bg-yellow-900/20 border-yellow-800 text-yellow-200' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                Your business account is pending verification. Go to Compliance documents section to submit compliance documents
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={`border-b transition-colors ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-800' 
          : 'bg-white/80 supports-[backdrop-filter]:backdrop-blur-md backdrop-blur border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'dashboard'
                  ? isDarkMode
                    ? 'border-blue-400 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                  : isDarkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'compliance'
                  ? isDarkMode
                    ? 'border-blue-400 text-blue-400'
                    : 'border-blue-600 text-blue-600'
                  : isDarkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Compliance Documents</span>
            </button>
          </nav>
        </div>
      </div>

  <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab Content */}
        {activeTab === 'dashboard' && (
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
                    : 'bg-white/90 border-blue-200 hover:bg-blue-50/40'
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
                    : 'bg-white/90 border-blue-200 hover:bg-blue-50/40'
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
                    : 'bg-white/90 border-blue-200 hover:bg-blue-50/40'
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

            {/* Service Requests */}
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow border`}>
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
            <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow border p-6`}>
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
                    <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>County:</span>
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
                <div className={`flex justify-between items-center py-2 px-3 rounded-lg mt-4`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.2)' : 'rgba(15, 146, 151, 0.1)'}}>
                  <span className={`font-medium`} style={{color: '#0F9297'}}>Total Spent:</span>
                  <span className={`font-bold text-lg`} style={{color: '#0F9297'}}>{formatCurrency(stats.totalSpent)}</span>
                </div>
              </div>
            </div>


          </div>
        </div>
        )}

        {/* Compliance Tab Content */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <BusinessComplianceDocuments businessId={user?.businessId || user?.id} />
          </div>
        )}
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow max-w-2xl w-full border max-h-[90vh] flex flex-col`}>
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
                                  {formatCurrency(service.price)}
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
                                  {formatCurrency(service.price)}
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
                                  {formatCurrency(service.price)}
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
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="patientEmail"
                          value={formData.patientEmail}
                          onChange={handleInputChange}
                          placeholder="Patient's email address"
                          required
                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  <option value="assigned">My assigned doctors</option>
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
                  ) : getAvailablePreviousDoctors().filter(doctor => {
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
                        {getAvailablePreviousDoctors()
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
                          ✅ Showing {getAvailablePreviousDoctors().filter(doctor => {
                            const isAvailable = doctor.isAvailable;
                            const offersService = !formData.serviceId || doctorOffersService(doctor, formData.serviceId);
                            return isAvailable && offersService;
                          }).length} available doctor(s) you've worked with before{formData.serviceId ? ' who offer the selected service' : ''}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {previousDoctors.length === 0 
                          ? "No previously worked with doctors found. You need to complete at least one service request first."
                          : formData.serviceId 
                            ? `None of your previous doctors who offer the selected service are currently available. ${getAvailablePreviousDoctors().filter(d => d.isAvailable && !doctorOffersService(d, formData.serviceId)).length > 0 ? 'Some of your previous doctors are available but don\'t offer this service.' : ''} Please try the 'Any available doctor' option instead.`
                            : "None of your previous doctors are currently available. Please try the 'Any available doctor' option instead."
                        }
                      </p>
                      {previousDoctors.length > 0 && (
                        <div className="mt-2">
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Previous doctors ({previousDoctors.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length} unavailable{formData.serviceId ? '/don\'t offer this service' : ''}):
                          </p>
                          <ul className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                            {previousDoctors
                              .filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId)))
                              .slice(0, 3)
                              .map((doctor) => (
                                <li key={doctor.id}>
                                  • Dr. {doctor.firstName} {doctor.lastName}
                                  {!doctor.isAvailable ? ' (unavailable)' : formData.serviceId && !doctorOffersService(doctor, formData.serviceId) ? ' (doesn\'t offer this service)' : ''}
                                </li>
                              ))}
                            {previousDoctors.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length > 3 && (
                              <li>... and {previousDoctors.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {formData.doctorSelectionType === 'assigned' && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Select Assigned Doctor *
                  </label>
                  {loadingAssignedDoctors ? (
                    <div className={`flex items-center justify-center py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading assigned doctors...
                    </div>
                  ) : assignedDoctors.filter(doctor => {
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
                        <option value="">Select an assigned doctor</option>
                        {assignedDoctors
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
                      <div className={`mt-2 p-2 rounded ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          ✅ Showing {assignedDoctors.filter(doctor => {
                            const isAvailable = doctor.isAvailable;
                            const offersService = !formData.serviceId || doctorOffersService(doctor, formData.serviceId);
                            return isAvailable && offersService;
                          }).length} available doctor(s) assigned to your business{formData.serviceId ? ' who offer the selected service' : ''}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {assignedDoctors.length === 0 
                          ? "No doctors have been assigned to your business by the admin yet."
                          : formData.serviceId 
                            ? `None of your assigned doctors who offer the selected service are currently available. ${assignedDoctors.filter(d => d.isAvailable && !doctorOffersService(d, formData.serviceId)).length > 0 ? 'Some of your assigned doctors are available but don\'t offer this service.' : ''} Please try the 'Any available doctor' option instead.`
                            : "None of your assigned doctors are currently available. Please try the 'Any available doctor' option instead."
                        }
                      </p>
                      {assignedDoctors.length > 0 && (
                        <div className="mt-2">
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Assigned doctors ({assignedDoctors.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length} unavailable{formData.serviceId ? '/don\'t offer this service' : ''}):
                          </p>
                          <ul className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                            {assignedDoctors
                              .filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId)))
                              .slice(0, 3)
                              .map((doctor) => (
                                <li key={doctor.id}>
                                  • Dr. {doctor.firstName} {doctor.lastName}
                                  {!doctor.isAvailable ? ' (unavailable)' : formData.serviceId && !doctorOffersService(doctor, formData.serviceId) ? ' (doesn\'t offer this service)' : ''}
                                </li>
                              ))}
                            {assignedDoctors.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length > 3 && (
                              <li>... and {assignedDoctors.filter(doctor => !doctor.isAvailable || (formData.serviceId && !doctorOffersService(doctor, formData.serviceId))).length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}


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

              {/* Service Date and Time */}
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

              {/* Information Messages */}
              <div className="space-y-3">
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
                      // estimatedDuration removed - will use service default duration
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
                  disabled={isSendingDoctorRequest || loading || (formData.doctorSelectionType === 'any' && getAvailableDoctors().length === 0) || !businessData?.isVerified}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-all duration-200 font-medium shadow-sm hover:shadow disabled:cursor-not-allowed"
                >
                  {isSendingDoctorRequest ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending Request...
                    </div>
                  ) : !businessData?.isVerified ? 'Business Not Verified' :
                   (formData.doctorSelectionType === 'any' && getAvailableDoctors().length === 0) ? 'No Doctors Available' :
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
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow max-w-2xl w-full border max-h-[90vh] flex flex-col`}>
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
                                onChange={(e) => {
                                  setQuickRequestServiceId(e.target.value);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {service.name}
                              </span>
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-100'} px-2 py-1 rounded mr-3`}>
                                {formatCurrency(service.price)}
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
                                onChange={(e) => {
                                  setQuickRequestServiceId(e.target.value);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {service.name}
                              </span>
                              <span className={`text-sm font-medium px-2 py-1 rounded mr-3 ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
                                {formatCurrency(service.price)}
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
                                onChange={(e) => {
                                  setQuickRequestServiceId(e.target.value);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {service.name}
                              </span>
                              <span className={`text-sm font-medium px-2 py-1 rounded mr-3 ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
                                {formatCurrency(service.price)}
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
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={quickRequestPatientEmail}
                          onChange={(e) => setQuickRequestPatientEmail(e.target.value)}
                          placeholder="Patient's email address"
                          required
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
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}> (includes {formatCurrency(SERVICE_CHARGE)} booking fee)</span>
                </p>
                <div className={`mt-2 p-2 rounded ${isDarkMode ? 'bg-orange-900/20 border-orange-600/30' : 'bg-orange-50 border-orange-200'} border`}>
                  <p className={`text-xs ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    💳 Payment required before request is sent to doctor
                  </p>
                </div>
              </div>
              
              {/* Date and Time Fields */}
              {false ? (
                <div className="space-y-6">
                  <div>
                    <label className={`block text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-blue-900'} mb-4`}>
                      Select an Available Date *
                    </label>
                    
                    {/* Calendar Navigation */}
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
                          setCurrentMonth(newMonth);
                          fetchMonthAvailability(newMonth);
                        }}
                        className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        ←
                      </button>
                      <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
                          setCurrentMonth(newMonth);
                          fetchMonthAvailability(newMonth);
                        }}
                        className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        →
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className={`rounded-xl border-2 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'} p-4 shadow-lg`}>
                      {loadingAvailability ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Loading availability...
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* Calendar Header */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div key={day} className={`p-2 text-center text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          {/* Calendar Dates */}
                          <div className="grid grid-cols-7 gap-1">
                            {getCalendarDates(currentMonth).map((date, index) => {
                              const dateStr = date.toISOString().split('T')[0];
                              const isCurrentMonth = isDateInCurrentMonth(date, currentMonth);
                              const hasSlots = hasAvailableSlots(dateStr);
                              const isToday = dateStr === new Date().toISOString().split('T')[0];
                              const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
                              const isSelected = selectedDate === dateStr;
                              const slotsForDate = getSlotsForDate(dateStr);
                              const availableCount = slotsForDate.filter(slot => !slot.isBooked).length;

                              return (
                                <button
                                  key={index}
                                  type="button"
                                  disabled={!hasSlots || isPastDate || !isCurrentMonth}
                                  onClick={() => handleCalendarDateClick(dateStr)}
                                  className={`relative p-2 text-sm rounded-lg border transition-all duration-200 min-h-[40px] ${
                                    isSelected
                                      ? (isDarkMode ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-xl ring-2 ring-blue-400' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl ring-2 ring-blue-300 font-bold')
                                      : isToday && hasSlots && !isPastDate && isCurrentMonth
                                      ? (isDarkMode ? 'bg-gradient-to-br from-blue-800 to-blue-900 border-blue-500 text-blue-100 shadow-lg ring-2 ring-blue-400' : 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white border-2 border-blue-300 shadow-lg')
                                      : isToday && isCurrentMonth
                                      ? (isDarkMode ? 'bg-blue-900/50 border-blue-600 text-blue-200 ring-2 ring-blue-500' : 'bg-blue-400/20 border-blue-300 text-blue-700 ring-2 ring-blue-400')
                                      : hasSlots && !isPastDate && isCurrentMonth
                                      ? (isDarkMode ? 'bg-green-800/40 border-green-500 text-green-200 hover:bg-green-700/50' : 'bg-gradient-to-br from-emerald-400 to-green-500 text-white hover:from-emerald-500 hover:to-green-600 shadow-md')
                                      : isCurrentMonth
                                      ? (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500')
                                      : (isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed')
                                  }`}
                                >
                                  <span className="block text-lg font-bold">{date.getDate()}</span>
                                  {hasSlots && !isPastDate && (
                                    <>
                                      <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${
                                        isSelected ? 'bg-white shadow-md' : isDarkMode ? 'bg-green-400' : 'bg-white shadow-lg ring-1 ring-emerald-300'
                                      }`} />
                                      <div className={`absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                                        isSelected ? (isDarkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-800 text-white') : (isDarkMode ? 'bg-green-600 text-white' : 'bg-emerald-600 text-white')
                                      }`}>
                                        {availableCount}
                                      </div>
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                      
                      {/* Legend */}
                      <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-900/50' : 'bg-white/70'} text-xs`}>
                        <div className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          How to select:
                        </div>
                        <div className="space-y-1">
                          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            🟢 <strong>Green dates</strong> have available slots - click to select
                            <br />
                            🔵 <strong>Blue outline</strong> shows today's date
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Slots Selection */}
                  {selectedDate && (
                    <div>
                      <label className={`block text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-blue-900'} mb-4`}>
                        Choose Your Time Slot *
                      </label>
                      
                      <div className={`rounded-xl border-2 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'} p-4 shadow-lg`}>
                        {/* Selected Date Display */}
                        <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} border ${isDarkMode ? 'border-blue-700' : 'border-blue-200'}`}>
                          <div className="flex items-center space-x-2">
                            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <span className={`font-semibold ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                              {new Date(selectedDate).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Time Slots Grid */}
                        {availableSlots.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {availableSlots.map((slot) => {
                              const slotData = slot.attributes || slot;
                              const slotId = slot.id || slot.documentId;
                              const isSelectedSlot = quickRequestServiceDate === slotData.date && quickRequestServiceTime === `${slotData.startTime}-${slotData.endTime}`;
                              const isBooked = slotData.isBooked;
                              
                              if (isBooked) {
                                return (
                                  <button
                                    key={slotId}
                                    type="button"
                                    disabled={true}
                                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                      isDarkMode 
                                        ? 'border-red-800 bg-red-900/20 text-red-400' 
                                        : 'border-red-300 bg-red-50 text-red-600'
                                    } cursor-not-allowed opacity-60`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-red-900/40' : 'bg-red-200'}`}>
                                          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                        <div className="text-center">
                                          <div className={`font-medium text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                            {formatTime(slotData.startTime)} - {formatTime(slotData.endTime)}
                                          </div>
                                        </div>
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-200 text-red-700'
                                      }`}>
                                        BOOKED
                                      </span>
                                    </div>
                                  </button>
                                );
                              }
                              
                              return (
                                <button
                                  key={slotId}
                                  type="button"
                                  onClick={() => {
                                    setQuickRequestServiceDate(slotData.date);
                                    setQuickRequestServiceTime(`${slotData.startTime}-${slotData.endTime}`);
                                  }}
                                  className={`p-3 rounded-lg border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                                    isSelectedSlot
                                      ? (isDarkMode ? 'border-blue-500 bg-blue-600 text-white shadow-lg' : 'border-blue-500 bg-blue-600 text-white shadow-lg')
                                      : (isDarkMode ? 'border-gray-600 bg-gray-700/50 text-gray-200 hover:border-blue-400 hover:bg-gray-600/50' : 'border-blue-200 bg-white text-gray-900 hover:border-blue-400 hover:bg-blue-50 shadow-sm')
                                  }`}
                                >
                                  <div className="flex flex-col items-center space-y-1">
                                    <div className={`p-1.5 rounded-md ${isSelectedSlot ? 'bg-white/20' : isDarkMode ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                                      <svg className={`h-4 w-4 ${isSelectedSlot ? 'text-white' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="text-center">
                                      <div className={`font-medium text-xs leading-tight ${isSelectedSlot ? (isDarkMode ? 'text-blue-100' : 'text-white') : (isDarkMode ? 'text-gray-200' : 'text-gray-900')}`}>
                                        {formatTime(slotData.startTime)} - {formatTime(slotData.endTime)}
                                      </div>
                                    </div>
                                    {isSelectedSlot && (
                                      <svg className={`h-4 w-4 ${isDarkMode ? 'text-blue-300' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <svg className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <p className="text-lg font-medium mb-2">No slots available</p>
                            <p className="text-sm">
                              No available time slots for this date. Please select a different date.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
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
              )}
              
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
                  Pay & Send Request
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
                ('🏢 Business info for payment:', info);
                return info;
              })()}
            />
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow max-w-2xl w-full border max-h-[90vh] flex flex-col`}>
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
                  <CountryCodePicker
                    selectedCode={profileCountryCode}
                    onCodeChange={handleProfileCountryCodeChange}
                    phoneNumber={profilePhoneNumber}
                    onPhoneChange={handleProfilePhoneChange}
                    placeholder="Enter phone number"
                    isDarkMode={isDarkMode}
                    required={false}
                    className="w-full"
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
                    County
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={editProfileData.state}
                    onChange={handleProfileInputChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter county"
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
                        readOnly
                        step="any"
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-400 placeholder-gray-500' : 'border-gray-300 bg-gray-100 text-gray-600 placeholder-gray-400'} rounded-lg cursor-not-allowed`}
                        placeholder="Latitude"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="longitude"
                        value={editProfileData.longitude}
                        readOnly
                        step="any"
                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-400 placeholder-gray-500' : 'border-gray-300 bg-gray-100 text-gray-600 placeholder-gray-400'} rounded-lg cursor-not-allowed`}
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

      {/* Loading Overlay - Only for Doctor Requests */}
      {isSendingDoctorRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-xl border p-8 max-w-md w-full text-center`}>
            <div className="flex flex-col items-center space-y-4">
              {/* Animated spinner */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animate-reverse"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Sending Doctor Request
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Please wait while we notify available doctors...
                </p>
              </div>
              
              <div className={`${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg border w-full`}>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className={`${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Validating payment information
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-75"></div>
                    <span className={`${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Finding available doctors
                    </span>
                  </div>
                </div>
              </div>
              
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                This may take up to 30 seconds. Please don't close this window.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
