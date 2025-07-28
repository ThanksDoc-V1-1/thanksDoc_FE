'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Building2, Stethoscope, Check, X, Eye, EyeOff, Search, AlertTriangle, Calendar, Clock, MapPin, DollarSign, Phone, Mail, FileCheck, RefreshCw, LogOut, Plus, Package, Globe } from 'lucide-react';
import { doctorAPI, businessAPI, serviceRequestAPI, serviceAPI } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function AdminDashboard() {
  const { logout, user, isAuthenticated, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [doctorEarnings, setDoctorEarnings] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Service form states and handlers
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    category: 'in-person',
    isActive: true,
    displayOrder: 0
  });

  const handleServiceFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'isActive') {
      setServiceFormData(prev => ({
        ...prev,
        [name]: e.target.checked
      }));
    } else {
      setServiceFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      let response;
      if (editingService) {
        response = await serviceAPI.update(editingService.id, {
          name: serviceFormData.name,
          description: serviceFormData.description,
          category: serviceFormData.category,
          isActive: serviceFormData.isActive,
          displayOrder: parseInt(serviceFormData.displayOrder)
        });
        setServices(prev => prev.map(service => 
          service.id === editingService.id ? response.data.data : service
        ));
      } else {
        response = await serviceAPI.create({
          name: serviceFormData.name,
          description: serviceFormData.description,
          category: serviceFormData.category,
          isActive: serviceFormData.isActive,
          displayOrder: parseInt(serviceFormData.displayOrder)
        });
        setServices(prev => [...prev, response.data.data]);
      }

      setShowServiceForm(false);
      setEditingService(null);
      setServiceFormData({
        name: '',
        description: '',
        category: 'in-person',
        isActive: true,
        displayOrder: services.length
      });
      await fetchAllData(); // Refresh all data to ensure consistency
      alert(`Service ${editingService ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Failed to save service. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceFormData({
      name: service.attributes?.name || service.name,
      description: service.attributes?.description || service.description || '',
      category: service.attributes?.category || service.category,
      isActive: service.attributes?.isActive || service.isActive,
      displayOrder: service.attributes?.displayOrder || service.displayOrder || 0
    });
    setShowServiceForm(true);
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    setDataLoading(true);
    try {
      await serviceAPI.delete(id);
      setServices(prev => prev.filter(service => service.id !== id));
      alert('Service deleted successfully');
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };
  const requestsPerPage = 5;
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);
  const [showBusinessPassword, setShowBusinessPassword] = useState(false);
  
  // View modals state
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialisation: '',
    licenceNumber: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    bio: '',
    experience: '',
    consultationFee: ''
  });
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    contactPersonName: '',
    email: '',
    password: '',
    businessType: '',
    registrationNumber: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    description: ''
  });

  // Calculate doctor earnings function - defined before fetchAllData to avoid ReferenceError

  // Calculate doctor earnings function - defined before fetchAllData to avoid ReferenceError
  const calculateDoctorEarnings = (doctorsData, requestsData, businessesData) => {
    const earningsMap = new Map();
    
    // Initialize earnings for all doctors
    doctorsData.forEach(doctor => {
      earningsMap.set(doctor.id, {
        doctor: doctor,
        totalEarnings: 0,
        completedRequests: 0,
        businesses: new Map() // Track earnings per business
      });
    });
    
    // Calculate earnings from completed service requests
    requestsData
      .filter(request => request.status === 'completed' && request.doctor && request.totalAmount)
      .forEach(request => {
        const doctorId = request.doctor.id;
        const businessId = request.business?.id;
        const earnings = parseFloat(request.totalAmount) || 0;
        
        if (earningsMap.has(doctorId)) {
          const doctorEarning = earningsMap.get(doctorId);
          doctorEarning.totalEarnings += earnings;
          doctorEarning.completedRequests += 1;
          
          // Track earnings per business
          if (businessId && request.business) {
            if (!doctorEarning.businesses.has(businessId)) {
              doctorEarning.businesses.set(businessId, {
                business: request.business,
                earnings: 0,
                requestCount: 0
              });
            }
            const businessEarning = doctorEarning.businesses.get(businessId);
            businessEarning.earnings += earnings;
            businessEarning.requestCount += 1;
          }
        }
      });
    
    // Convert to array and sort by total earnings
    const earningsArray = Array.from(earningsMap.values())
      .map(earning => ({
        ...earning,
        businesses: Array.from(earning.businesses.values())
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings);
    
    setDoctorEarnings(earningsArray);
  };

  // Registration functions for doctors and businesses

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [doctorsRes, businessesRes, requestsRes, servicesRes] = await Promise.all([
        doctorAPI.getAll(),
        businessAPI.getAll(),
        serviceRequestAPI.getAll(),
        serviceAPI.getAll()
      ]);

      console.log('🏥 Raw doctors response:', doctorsRes.data);
      console.log('🏢 Raw businesses response:', businessesRes.data);
      console.log('📋 Raw requests response:', requestsRes.data);
      console.log('📦 Raw services response:', servicesRes.data);

      setDoctors(doctorsRes.data?.data || []);
      setBusinesses(businessesRes.data?.data || []);
      setServices(servicesRes.data?.data || []);
      
      // Sort service requests by date, with newest first
      const requests = requestsRes.data?.data || [];
      
      // Log detailed status information for debugging
      console.log('📋 Request status details:');
      requests.forEach(req => {
        console.log(`ID: ${req.id}, Status: ${req.status}, isPaid: ${req.isPaid ? 'true' : 'false'}, 
          Timestamps: [requested: ${req.requestedAt || 'none'}, accepted: ${req.acceptedAt || 'none'}, completed: ${req.completedAt || 'none'}]`);
      });
      
      const sortedRequests = requests.sort((a, b) => {
        const dateA = new Date(a.requestedAt || a.createdAt || a.attributes?.requestedAt || a.attributes?.createdAt || 0);
        const dateB = new Date(b.requestedAt || b.createdAt || b.attributes?.requestedAt || b.attributes?.createdAt || 0);
        return dateB - dateA; // Sort descending (newest first)
      });
      
      console.log('📋 Sorted requests:', sortedRequests.length);
      setServiceRequests(sortedRequests);
      
      // Calculate doctor earnings
      calculateDoctorEarnings(doctorsRes.data?.data || [], requestsRes.data?.data || [], businessesRes.data?.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // Set up automatic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing data...');
      fetchAllData();
    }, 30000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(refreshInterval);
  }, []);

  // Authentication check - redirect if not authenticated or not admin
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !user) {
        console.log('🚫 No authentication, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      if (user.role !== 'admin') {
        console.log('🚫 Not admin role, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      console.log('✅ Admin authenticated, loading dashboard');
    }
  }, [loading, isAuthenticated, user]);

  // Don't render anything if not authenticated
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300">Access Denied</p>
        </div>
      </div>
    );
  }

  const handleVerifyDoctor = async (doctorId, isVerified) => {
    try {
      await doctorAPI.update(doctorId, { isVerified });
      fetchAllData();
      alert(`Doctor ${isVerified ? 'verified' : 'unverified'} successfully!`);
    } catch (error) {
      console.error('Error updating doctor verification:', error);
      alert('Failed to update doctor verification.');
    }
  };

  const handleVerifyBusiness = async (businessId, isVerified) => {
    try {
      await businessAPI.update(businessId, { isVerified });
      fetchAllData();
      alert(`Business ${isVerified ? 'verified' : 'unverified'} successfully!`);
    } catch (error) {
      console.error('Error updating business verification:', error);
      alert('Failed to update business verification.');
    }
  };

  // Registration functions for doctors and businesses
  const handleDoctorRegistration = async (e) => {
    e.preventDefault();
    setDataLoading(true);
    
    try {
      const response = await doctorAPI.create({
        ...doctorFormData,
        isVerified: true // Admin registered doctors are automatically verified
      });
      
      if (response.data) {
        alert('Doctor registered successfully!');
        setShowDoctorForm(false);
        setDoctorFormData({
          name: '',
          email: '',
          password: '',
          specialisation: '',
          licenceNumber: '',
          phone: '',
          address: '',
          bio: '',
          experience: '',
          consultationFee: ''
        });
        fetchAllData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error registering doctor:', error);
      alert('Failed to register doctor. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleBusinessRegistration = async (e) => {
    e.preventDefault();
    setDataLoading(true);
    
    try {
      const response = await businessAPI.create({
        businessName: businessFormData.name,
        name: businessFormData.name, // Same as business name
        contactPersonName: businessFormData.contactPersonName || businessFormData.name, // Use contact person name or fallback to business name
        email: businessFormData.email,
        password: businessFormData.password,
        businessType: businessFormData.businessType,
        businessLicence: businessFormData.registrationNumber,
        phone: businessFormData.phone,
        address: businessFormData.address,
        city: businessFormData.city || 'Not specified',
        state: businessFormData.state || 'Not specified',
        postcode: businessFormData.postcode || '00000',
        description: businessFormData.description || '',
        latitude: 0.0, // Default coordinate
        longitude: 0.0, // Default coordinate
        isVerified: true, // Admin registered businesses are automatically verified
        operatingHours: {},
        emergencyContact: '',
        paymentMethods: []
      });
      
      if (response.data) {
        alert('Business registered successfully!');
        setShowBusinessForm(false);
        setBusinessFormData({
          name: '',
          contactPersonName: '',
          email: '',
          password: '',
          businessType: '',
          registrationNumber: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          postcode: '',
          description: ''
        });
        fetchAllData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error registering business:', error);
      alert('Failed to register business. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleDoctorFormChange = (e) => {
    const { name, value } = e.target;
    setDoctorFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDoctorRegister = async (e) => {
    e.preventDefault();
    setDataLoading(true);
    
    try {
      const firstName = doctorFormData.name.split(' ')[0];
      const lastName = doctorFormData.name.split(' ').slice(1).join(' ') || firstName;
      const fullName = `${firstName} ${lastName}`;
      
      const response = await doctorAPI.create({
        firstName: firstName,
        lastName: lastName,
        name: fullName,
        email: doctorFormData.email,
        password: doctorFormData.password,
        specialization: doctorFormData.specialisation, // Map to American spelling for backend
        licenseNumber: doctorFormData.licenceNumber, // Map to American spelling for backend
        phone: doctorFormData.phone,
        address: doctorFormData.address,
        city: doctorFormData.city || 'Not specified', // Use form data or default
        state: doctorFormData.state || 'Not specified', // Use form data or default  
        postcode: doctorFormData.postcode || '00000', // Use form data or default
        bio: doctorFormData.bio || '',
        yearsOfExperience: parseInt(doctorFormData.experience) || 0,
        hourlyRate: parseFloat(doctorFormData.consultationFee) || 0,
        latitude: 0.0, // Default coordinate
        longitude: 0.0, // Default coordinate
        isVerified: true, // Admin-registered doctors are auto-verified
        isAvailable: true,
        emergencyContact: '',
        languages: ['English'],
        certifications: []
      });
      
      if (response.data) {
        alert('Doctor registered successfully!');
        setShowDoctorForm(false);
        setDoctorFormData({
          name: '',
          email: '',
          password: '',
          specialisation: '',
          licenceNumber: '',
          phone: '',
          address: '',
          bio: '',
          experience: '',
          consultationFee: ''
        });
        fetchAllData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error registering doctor:', error);
      alert('Failed to register doctor. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleBusinessFormChange = (e) => {
    const { name, value } = e.target;
    setBusinessFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter functions for search functionality only
  // Filter functions for search
  const filteredDoctors = doctors.filter(doctor => {
    if (!searchTerm) return true;
    
    // Handle both direct properties and nested attributes structure
    const firstName = doctor.firstName || doctor.attributes?.firstName || '';
    const lastName = doctor.lastName || doctor.attributes?.lastName || '';
    const specialisation = doctor.specialization || doctor.specialisation || doctor.attributes?.specialization || doctor.attributes?.specialisation || '';
    const email = doctor.email || doctor.attributes?.email || '';
    const licenceNumber = doctor.licenseNumber || doctor.licenceNumber || doctor.attributes?.licenseNumber || doctor.attributes?.licenceNumber || '';
    
    const search = searchTerm.toLowerCase();
    return `${firstName} ${lastName}`.toLowerCase().includes(search) ||
           specialisation.toLowerCase().includes(search) ||
           email.toLowerCase().includes(search) ||
           licenceNumber.toLowerCase().includes(search);
  });

  const filteredBusinesses = businesses.filter(business => {
    if (!searchTerm) return true;
    
    // Handle both direct properties and nested attributes structure
    const businessName = business.businessName || business.name || business.attributes?.businessName || business.attributes?.name || '';
    const businessType = business.businessType || business.attributes?.businessType || '';
    const email = business.email || business.attributes?.email || '';
    const businessLicence = business.businessLicence || business.attributes?.businessLicence || '';
    const contactPersonName = business.contactPersonName || business.attributes?.contactPersonName || '';
    
    const search = searchTerm.toLowerCase();
    return businessName.toLowerCase().includes(search) ||
           businessType.toLowerCase().includes(search) ||
           email.toLowerCase().includes(search) ||
           businessLicence.toLowerCase().includes(search) ||
           contactPersonName.toLowerCase().includes(search);
  });

  const filteredServices = services.filter(service => {
    if (!searchTerm) return true;
    const name = service.attributes?.name || service.name || '';
    const description = service.attributes?.description || service.description || '';
    const category = service.attributes?.category || service.category || '';
    const status = service.attributes?.isActive || service.isActive ? 'active' : 'inactive';
    const search = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(search) ||
           description.toLowerCase().includes(search) ||
           category.toLowerCase().includes(search) ||
           status.includes(search);
  });

  const filteredRequests = serviceRequests.filter(request => {
    // Handle both direct properties and nested attributes structure
    const serviceType = request.serviceType || request.attributes?.serviceType || '';
    const description = request.description || request.attributes?.description || '';
    const businessName = request.business?.businessName || request.business?.name || request.attributes?.business?.businessName || request.attributes?.business?.name || '';
    const doctorFirstName = request.doctor?.firstName || request.attributes?.doctor?.firstName || '';
    const doctorLastName = request.doctor?.lastName || request.attributes?.doctor?.lastName || '';
    
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return serviceType.toLowerCase().includes(searchLower) ||
           description.toLowerCase().includes(searchLower) ||
           businessName.toLowerCase().includes(searchLower) ||
           `${doctorFirstName} ${doctorLastName}`.toLowerCase().includes(searchLower);
  });

  const filteredDoctorEarnings = doctorEarnings.filter(earning => {
    const doctorFirstName = earning.doctor?.firstName || earning.doctor?.attributes?.firstName || '';
    const doctorLastName = earning.doctor?.lastName || earning.doctor?.attributes?.lastName || '';
    const specialisation = earning.doctor?.specialization || earning.doctor?.specialisation || earning.doctor?.attributes?.specialization || earning.doctor?.attributes?.specialisation || '';
    
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return `${doctorFirstName} ${doctorLastName}`.toLowerCase().includes(searchLower) ||
           specialisation.toLowerCase().includes(searchLower);
  });

  // Pagination for service requests
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const startIndex = (currentPage - 1) * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // View detail handlers
  const handleViewDoctorDetails = (doctor) => {
    console.log('👨‍⚕️ Viewing doctor details:', doctor);
    console.log('🔍 Current showDoctorDetails state:', showDoctorDetails);
    console.log('🔍 Current selectedDoctor state:', selectedDoctor);
    setSelectedDoctor(doctor);
    setShowDoctorDetails(true);
    console.log('✅ Modal states updated - showDoctorDetails: true, selectedDoctor:', doctor);
  };

  const handleViewBusinessDetails = (business) => {
    console.log('🏢 Viewing business details:', business);
    console.log('🔍 Current showBusinessDetails state:', showBusinessDetails);
    console.log('🔍 Current selectedBusiness state:', selectedBusiness);
    setSelectedBusiness(business);
    setShowBusinessDetails(true);
    console.log('✅ Modal states updated - showBusinessDetails: true, selectedBusiness:', business);
  };

  const handleCloseDoctorDetails = () => {
    setShowDoctorDetails(false);
    setSelectedDoctor(null);
  };

  const handleCloseBusinessDetails = () => {
    setShowBusinessDetails(false);
    setSelectedBusiness(null);
  };

  const stats = {
    totalDoctors: doctors.length,
    verifiedDoctors: doctors.filter(d => d.isVerified).length,
    totalBusinesses: businesses.length,
    verifiedBusinesses: businesses.filter(b => b.isVerified).length,
    totalRequests: serviceRequests.length,
    completedRequests: serviceRequests.filter(r => r.status === 'completed').length,
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} shadow-md border-b`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 rounded-lg shadow-lg">
                <img src="/logo.png" alt="ThanksDoc Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                  {user?.name || user?.email || 'Admin Dashboard'}
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage doctors, businesses, and service requests</p>
              </div>
            </div>
            
            {/* Desktop controls */}
            <div className="hidden md:flex items-center space-x-3">
              <button 
                onClick={fetchAllData}
                className={`px-4 py-2 ${isDarkMode ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/50' : 'bg-blue-600 text-white hover:bg-blue-700'} rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow`}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                <span>Refresh Data</span>
              </button>
              <button 
                onClick={logout}
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
                  const mobileMenu = document.getElementById('mobile-menu-admin');
                  if (mobileMenu) {
                    mobileMenu.classList.toggle('hidden');
                  }
                }}
                className={`p-2 rounded-md ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile menu */}
          <div id="mobile-menu-admin" className="md:hidden mt-4 hidden">
            <div className="space-y-3 py-3">
              <button 
                onClick={fetchAllData}
                className={`w-full px-4 py-2 ${isDarkMode ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/50' : 'bg-blue-600 text-white hover:bg-blue-700'} rounded-md transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2 shadow-sm hover:shadow`}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                <span>Refresh Data</span>
              </button>
              <button 
                onClick={logout}
                className={`w-full px-4 py-2 ${isDarkMode ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50' : 'bg-red-600 text-white hover:bg-red-700'} rounded-md transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2 shadow-sm hover:shadow`}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Bar - Only show on non-overview tabs */}
        {activeTab !== 'overview' && (
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <input
                type="text"
                className={`block w-full pl-10 pr-3 py-2.5 border ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 focus:ring-blue-400 focus:border-blue-400' : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500'} rounded-lg focus:outline-none shadow-sm`}
                placeholder={
                  activeTab === 'doctors' ? "Search doctors by name, specialty, email..." :
                  activeTab === 'businesses' ? "Search businesses by name, type, email..." :
                  activeTab === 'services' ? "Search services by name, category..." :
                  activeTab === 'requests' ? "Search requests by service type, business, doctor..." :
                  activeTab === 'earnings' ? "Search by doctor name..." :
                  "Search..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={`mb-8 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-1.5 rounded-xl shadow border`}>
          <nav className="grid grid-cols-2 sm:flex gap-1.5">
            {[
              { id: 'overview', name: 'Overview', icon: Shield },
              { id: 'doctors', name: 'Doctors', icon: Stethoscope },
              { id: 'businesses', name: 'Businesses', icon: Building2 },
              { id: 'services', name: 'Services', icon: Package },
              { id: 'requests', name: 'Service Requests', icon: Calendar },
              { id: 'earnings', name: 'Doctor Earnings', icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm(''); // Reset search when switching tabs
                    setCurrentPage(1); // Reset pagination when switching tabs
                  }}
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        {dataLoading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-gray-700 border-t-blue-400"></div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Doctors Stats Card */}
              <button 
                onClick={() => {
                  setActiveTab('doctors');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-blue-600' : 'bg-white border-gray-200 hover:border-blue-400'}`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isDarkMode ? 'bg-gradient-to-r from-blue-900/5 to-blue-900/10' : 'bg-gradient-to-r from-blue-50/80 to-blue-100/30'}`}></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3.5 rounded-2xl shadow-inner ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                      <Stethoscope className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${
                      stats.verifiedDoctors / Math.max(stats.totalDoctors, 1) >= 0.8 
                      ? isDarkMode ? 'bg-emerald-600 text-emerald-100' : 'bg-emerald-600 text-white'
                      : isDarkMode ? 'bg-amber-600 text-amber-100' : 'bg-amber-600 text-white'
                    }`}>
                      {Math.round(stats.verifiedDoctors / Math.max(stats.totalDoctors, 1) * 100)}% Verified
                    </div>
                  </div>
                  
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Doctors</h3>
                  <p className={`text-3xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalDoctors}</p>
                  
                  <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{stats.verifiedDoctors}</span> verified
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{stats.totalDoctors - stats.verifiedDoctors}</span> pending
                      </p>
                    </div>
                  </div>
                  <div className={`mt-3 text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                    Click to manage doctors →
                  </div>
                </div>
              </button>

              {/* Businesses Stats Card */}
              <button 
                onClick={() => {
                  setActiveTab('businesses');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-purple-600' : 'bg-white border-gray-200 hover:border-purple-400'}`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isDarkMode ? 'bg-gradient-to-r from-purple-900/5 to-purple-900/10' : 'bg-gradient-to-r from-purple-50/80 to-purple-100/30'}`}></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3.5 rounded-2xl shadow-inner ${isDarkMode ? 'bg-purple-900/40' : 'bg-purple-100'}`}>
                      <Building2 className={`h-6 w-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${
                      stats.verifiedBusinesses / Math.max(stats.totalBusinesses, 1) >= 0.8 
                      ? isDarkMode ? 'bg-emerald-600 text-emerald-100' : 'bg-emerald-600 text-white'
                      : isDarkMode ? 'bg-amber-600 text-amber-100' : 'bg-amber-600 text-white'
                    }`}>
                      {Math.round(stats.verifiedBusinesses / Math.max(stats.totalBusinesses, 1) * 100)}% Verified
                    </div>
                  </div>
                  
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Businesses</h3>
                  <p className={`text-3xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalBusinesses}</p>
                  
                  <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{stats.verifiedBusinesses}</span> verified
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{stats.totalBusinesses - stats.verifiedBusinesses}</span> pending
                      </p>
                    </div>
                  </div>
                  <div className={`mt-3 text-xs ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} font-medium`}>
                    Click to manage businesses →
                  </div>
                </div>
              </button>

              {/* Service Requests Stats Card */}
              <button 
                onClick={() => {
                  setActiveTab('requests');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-green-600' : 'bg-white border-gray-200 hover:border-green-400'}`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isDarkMode ? 'bg-gradient-to-r from-green-900/5 to-green-900/10' : 'bg-gradient-to-r from-green-50/80 to-green-100/30'}`}></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3.5 rounded-2xl shadow-inner ${isDarkMode ? 'bg-green-900/40' : 'bg-green-100'}`}>
                      <Users className={`h-6 w-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${isDarkMode ? 'bg-blue-600 text-blue-100' : 'bg-blue-600 text-white'}`}>
                      {Math.round(stats.completedRequests / Math.max(stats.totalRequests, 1) * 100)}% Complete
                    </div>
                  </div>
                  
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Service Requests</h3>
                  <p className={`text-3xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalRequests}</p>
                  
                  <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{stats.completedRequests}</span> completed
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{stats.totalRequests - stats.completedRequests}</span> active
                      </p>
                    </div>
                  </div>
                  <div className={`mt-3 text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'} font-medium`}>
                    Click to view requests →
                  </div>
                </div>
              </button>

              {/* Recent Activity Card */}
              <button 
                onClick={() => {
                  setActiveTab('earnings');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-amber-600' : 'bg-white border-gray-200 hover:border-amber-400'}`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isDarkMode ? 'bg-gradient-to-r from-amber-900/5 to-amber-900/10' : 'bg-gradient-to-r from-amber-50/80 to-amber-100/30'}`}></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3.5 rounded-2xl shadow-inner ${isDarkMode ? 'bg-amber-900/40' : 'bg-amber-100'}`}>
                      <AlertTriangle className={`h-6 w-6 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${isDarkMode ? 'bg-amber-600 text-amber-100' : 'bg-amber-600 text-white'}`}>
                      Last 24 Hours
                    </div>
                  </div>
                  
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>New Requests</h3>
                  <p className={`text-3xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {serviceRequests.filter(r => {
                      const date = new Date(r.requestedAt || r.attributes?.requestedAt);
                      const now = new Date();
                      const diff = now - date;
                      return diff < 24 * 60 * 60 * 1000;
                    }).length}
                  </p>
                  
                  <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">
                          {serviceRequests.filter(r => r.status === 'pending' || r.attributes?.status === 'pending').length}
                        </span> pending
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">
                          {serviceRequests.filter(r => r.status === 'accepted' || r.attributes?.status === 'accepted').length}
                        </span> accepted
                      </p>
                    </div>
                  </div>
                  <div className={`mt-3 text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-600'} font-medium`}>
                    Click to view earnings →
                  </div>
                </div>
              </button>
            </div>

            {/* Recent Service Requests */}
            <div className={`rounded-2xl shadow border overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-xl font-semibold flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Calendar className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`} />
                      Recent Service Requests
                    </h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Latest service requests from businesses</p>
                  </div>
                  <button onClick={() => setActiveTab('requests')} 
                    className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>
                    View all requests →
                  </button>
                </div>
              </div>
              
              <div className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                {serviceRequests.slice(0, 5).map((request, index) => {
                  // Debug log to verify data
                  console.log(`Overview rendering request ${request.id}: status=${request.status}, completedAt=${request.completedAt}, isPaid=${request.isPaid}`);
                  // Handle both direct properties and nested attributes
                  const id = request.id || request.attributes?.id;
                  const serviceType = request.serviceType || request.attributes?.serviceType;
                  const requestedAt = request.requestedAt || request.attributes?.requestedAt;
                  const acceptedAt = request.acceptedAt || request.attributes?.acceptedAt;
                  const completedAt = request.completedAt || request.attributes?.completedAt;
                  
                  // Determine the correct status based on timestamps and status field
                  let status = request.status || request.attributes?.status;
                  
                  // If timestamps indicate a different state than what's stored, use the timestamp-based status
                  if (completedAt) {
                    status = 'completed';
                  } else if (acceptedAt && status === 'pending') {
                    status = 'accepted';
                  }
                  
                  const totalAmount = request.totalAmount || request.attributes?.totalAmount;
                  const urgencyLevel = request.urgencyLevel || request.attributes?.urgencyLevel;
                  
                  // Check isPaid flag first, then fall back to paymentStatus field
                  const isPaid = request.isPaid || request.attributes?.isPaid;
                  
                  // Business and doctor might be nested differently depending on API response format
                  const businessName = request.business?.businessName || 
                    request.attributes?.business?.data?.attributes?.businessName || 
                    request.attributes?.business?.businessName || 
                    'Unknown Business';
                  
                  const doctorName = request.doctor ? 
                    `Dr. ${request.doctor.firstName || ''} ${request.doctor.lastName || ''}` : 
                    request.attributes?.doctor?.data?.attributes ? 
                    `Dr. ${request.attributes.doctor.data.attributes.firstName || ''} ${request.attributes.doctor.data.attributes.lastName || ''}` :
                    request.attributes?.doctor?.firstName ? 
                    `Dr. ${request.attributes.doctor.firstName || ''} ${request.attributes.doctor.lastName || ''}` :
                    'Pending';
                    
                  return (
                    <div key={id} className={`p-6 transition-colors ${
                      index % 2 === 0 
                        ? isDarkMode ? 'bg-gray-900/50 hover:bg-gray-800/70' : 'bg-gray-50 hover:bg-gray-100' 
                        : isDarkMode ? 'bg-gray-900 hover:bg-gray-800/50' : 'bg-white hover:bg-gray-50'
                    }`}>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-3">
                            {urgencyLevel && urgencyLevel !== 'medium' && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                urgencyLevel === 'emergency' ? 
                                  isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700' :
                                urgencyLevel === 'high' ? 
                                  isDarkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700' :
                                  isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                              }`}>
                                {urgencyLevel}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              status === 'completed' ? 
                                isDarkMode ? 'bg-green-900/40 text-green-400 border border-green-900' : 'bg-green-100 text-green-700 border border-green-300' :
                              status === 'accepted' ? 
                                isDarkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-900' : 'bg-blue-100 text-blue-700 border border-blue-300' :
                              status === 'pending' ? 
                                isDarkMode ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-900' : 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                              status === 'rejected' ? 
                                isDarkMode ? 'bg-red-900/40 text-red-400 border border-red-900' : 'bg-red-100 text-red-700 border border-red-300' :
                                isDarkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}>
                              {(status || 'pending').replace('_', ' ')}
                            </span>
                            {requestedAt && (
                              <span className={`text-xs flex items-center ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {formatDate(requestedAt)}
                              </span>
                            )}
                          </div>
                          
                          <h3 className={`font-semibold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{serviceType}</h3>
                          <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} ${request.description || request.attributes?.description ? '' : 'text-gray-400 italic'}`}>
                            {request.description || request.attributes?.description || 'No description provided'}
                          </p>
                          
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-3 flex flex-col space-y-2`}>
                              <div className="flex justify-between items-center">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Business</span>
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{businessName}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Contact</span>
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {request.business?.contactPersonName || 
                                    request.attributes?.business?.data?.attributes?.contactPersonName || 
                                    request.attributes?.business?.contactPersonName || 
                                    'Unknown Contact'}
                                </span>
                              </div>
                            </div>
                            
                            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-3 flex flex-col space-y-2`}>
                              <div className="flex justify-between items-center">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Doctor</span>
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{doctorName}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Duration</span>
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {(request.estimatedDuration || request.attributes?.estimatedDuration) || 'TBD'}h
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className={`flex flex-wrap items-center gap-4 mt-4 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                            {acceptedAt && (
                              <span className="flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1 text-blue-500" />
                                Accepted: {formatDate(acceptedAt)}
                              </span>
                            )}
                            {completedAt && (
                              <span className="flex items-center">
                                <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                                Completed: {formatDate(completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {totalAmount && (
                          <div className="flex flex-col items-end space-y-2 min-w-[120px]">
                            <div className={`text-lg font-semibold ${isDarkMode ? 'text-green-600' : 'text-green-600'}`}>
                              £{totalAmount.toFixed(2)}
                            </div>
                            <div className={`text-xs px-2.5 py-1.5 rounded-full flex items-center ${
                              isPaid || (request.paymentStatus || request.attributes?.paymentStatus) === 'paid' ? 
                                isDarkMode ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-700' :
                              (request.paymentStatus || request.attributes?.paymentStatus) === 'pending' ? 
                                isDarkMode ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-100 text-yellow-700' :
                              (request.paymentStatus || request.attributes?.paymentStatus) === 'failed' ? 
                                isDarkMode ? 'bg-red-100 text-red-700' : 'bg-red-100 text-red-700' :
                                isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {(isPaid || (request.paymentStatus || request.attributes?.paymentStatus) === 'paid') && <Check className="h-3 w-3 mr-1 stroke-2" />}
                              {(isPaid ? 'PAID' : (request.paymentStatus || request.attributes?.paymentStatus) || 'pending').toUpperCase()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {serviceRequests.length === 0 && (
                  <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <p className="mb-2">No service requests found</p>
                    <p className="text-sm">Service requests will appear here when businesses create them</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className={`rounded-2xl shadow border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-xl font-semibold flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Stethoscope className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`} />
                  Doctors Management
                </h2>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Verify and manage doctor profiles</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <button
                  onClick={() => setShowDoctorForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Register New Doctor
                </button>
                <span className={`px-3 py-1.5 rounded-full flex items-center shadow-sm font-bold ${isDarkMode ? 'bg-emerald-600 text-emerald-100' : 'bg-emerald-600 text-white'}`}>
                  <Check className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.verifiedDoctors}</span> Verified
                </span>
                <span className={`px-3 py-1.5 rounded-full flex items-center shadow-sm font-bold ${isDarkMode ? 'bg-amber-600 text-amber-100' : 'bg-amber-600 text-white'}`}>
                  <Clock className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.totalDoctors - stats.verifiedDoctors}</span> Pending
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Doctor
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      specialisation
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Experience & Rate
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Location
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Status
                    </th>
                    <th className={`px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                  {filteredDoctors.length > 0 ? filteredDoctors.map((doctor) => {
                    // Access data considering both direct properties and nested attributes structure
                    const id = doctor.id;
                    const firstName = doctor.firstName || doctor.attributes?.firstName;
                    const lastName = doctor.lastName || doctor.attributes?.lastName;
                    const email = doctor.email || doctor.attributes?.email;
                    const licenceNumber = doctor.licenseNumber || doctor.licenceNumber || doctor.attributes?.licenseNumber || doctor.attributes?.licenceNumber;
                    const specialisation = doctor.specialization || doctor.specialisation || doctor.attributes?.specialization || doctor.attributes?.specialisation;
                    const yearsOfExperience = doctor.yearsOfExperience || doctor.attributes?.yearsOfExperience;
                    const hourlyRate = doctor.hourlyRate || doctor.attributes?.hourlyRate;
                    const isVerified = doctor.isVerified || doctor.attributes?.isVerified;
                    const isAvailable = doctor.isAvailable || doctor.attributes?.isAvailable;
                    const city = doctor.city || doctor.attributes?.city;
                    const state = doctor.state || doctor.attributes?.state;
                    
                    return (
                      <tr key={id} className={`transition-colors ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800/50' : 'bg-white hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                              {firstName?.charAt(0)}{lastName?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Dr. {firstName} {lastName}
                              </div>
                              <div className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Mail className="h-3.5 w-3.5 mr-1 stroke-2" /> {email}
                              </div>
                              <div className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                <FileCheck className="h-3.5 w-3.5 mr-1 stroke-2" /> {licenceNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{specialisation}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm flex flex-col ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="font-medium">{yearsOfExperience} years experience</span>
                            <span className="text-green-500 font-medium">{formatCurrency(hourlyRate)}/hr</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <MapPin className={`h-3.5 w-3.5 mr-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span>{city}, {state}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              isVerified 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-amber-600 text-white'
                            }`}>
                              {isVerified 
                                ? <Check className="h-3.5 w-3.5 mr-1 stroke-2" /> 
                                : <Clock className="h-3.5 w-3.5 mr-1 stroke-2" />
                              }
                              {isVerified ? 'Verified' : 'Pending'}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              isAvailable 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-600 text-white'
                            }`}>
                              {isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            {!isVerified ? (
                              <button
                                onClick={() => handleVerifyDoctor(id, true)}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center font-medium shadow-sm"
                              >
                                <Check className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Verify</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerifyDoctor(id, false)}
                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors flex items-center font-medium shadow-sm"
                              >
                                <X className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Unverify</span>
                              </button>
                            )}
                            <button 
                              className={`px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewDoctorDetails(doctor);
                              }}
                              title="View doctor details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className="bg-gray-900">
                      <td colSpan="6" className={`px-6 py-10 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {searchTerm ? (
                          <>
                            <p className="font-medium">No matching doctors found</p>
                            <p className="text-sm mt-1">Try adjusting your search criteria</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">No doctors registered yet</p>
                            <p className="text-sm mt-1">Doctors will appear here when they register and verify their accounts</p>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredDoctors.length > 0 && (
              <div className={`px-6 py-4 border-t text-sm ${isDarkMode ? 'bg-gray-800/50 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                Showing {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'} of {doctors.length} total
              </div>
            )}
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Building2 className="h-5 w-5 text-purple-500 mr-2" />
                  Businesses Management
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Verify and manage business profiles</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <button
                  onClick={() => setShowBusinessForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Register New Business
                </button>
                <span className={`${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} px-3 py-1 rounded-full flex items-center`}>
                  <Check className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.verifiedBusinesses}</span> Verified
                </span>
                <span className={`${isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'} px-3 py-1 rounded-full flex items-center`}>
                  <Clock className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.totalBusinesses - stats.verifiedBusinesses}</span> Pending
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} sticky top-0 z-10`}>
                  <tr>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Business
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Type
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Contact
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Location
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`px-6 py-3.5 text-right text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                  {filteredBusinesses.length > 0 ? filteredBusinesses.map((business) => {
                    // Access data considering both direct properties and nested attributes structure
                    const id = business.id;
                    const businessName = business.businessName || business.attributes?.businessName;
                    const email = business.email || business.attributes?.email;
                    const businessLicence = business.businessLicence || business.attributes?.businessLicence;
                    const businessType = business.businessType || business.attributes?.businessType;
                    const contactPersonName = business.contactPersonName || business.attributes?.contactPersonName;
                    const phone = business.phone || business.attributes?.phone;
                    const city = business.city || business.attributes?.city;
                    const state = business.state || business.attributes?.state;
                    const postcode = business.postcode || business.attributes?.postcode;
                    const isVerified = business.isVerified || business.attributes?.isVerified;
                    
                    // Get business type colour
                    const getBusinessTypeColor = (type) => {
                      const baseClasses = 'px-2.5 py-1 rounded-lg text-xs font-medium capitalize';
                      switch(type?.toLowerCase()) {
                        case 'pharmacy': 
                          return isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700';
                        case 'clinic': 
                          return isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700';
                        case 'hospital': 
                          return isDarkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-700';
                        default: 
                          return isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700';
                      }
                    };

                    return (
                      <tr key={id} className={`transition-colors ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800/50' : 'bg-white hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                              {businessName?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {businessName}
                              </div>
                              <div className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Mail className="h-3.5 w-3.5 mr-1 stroke-2" /> {email}
                              </div>
                              <div className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                <FileCheck className="h-3.5 w-3.5 mr-1 stroke-2" /> {businessLicence}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`${getBusinessTypeColor(businessType)}`}>
                            {businessType || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{contactPersonName}</div>
                          <div className={`text-sm flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Phone className="h-3.5 w-3.5 mr-1 stroke-2" /> {phone}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <MapPin className={`h-3.5 w-3.5 mr-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span>{city}, {state}</span>
                          </div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{postcode}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                            isVerified 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-amber-600 text-white'
                          }`}>
                            {isVerified 
                              ? <Check className="h-3.5 w-3.5 mr-1 stroke-2" /> 
                              : <Clock className="h-3.5 w-3.5 mr-1 stroke-2" />
                            }
                            {isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            {!isVerified ? (
                              <button
                                onClick={() => handleVerifyBusiness(id, true)}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center font-medium shadow-sm"
                              >
                                <Check className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Verify</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerifyBusiness(id, false)}
                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors flex items-center font-medium shadow-sm"
                              >
                                <X className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Unverify</span>
                              </button>
                            )}
                            <button 
                              className={`${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-3 py-1.5 rounded-lg transition-colors`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewBusinessDetails(business);
                              }}
                              title="View business details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className={isDarkMode ? 'bg-gray-900' : 'bg-white'}>
                      <td colSpan="6" className={`px-6 py-10 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {searchTerm ? (
                          <>
                            <p className="font-medium">No matching businesses found</p>
                            <p className="text-sm mt-1">Try adjusting your search criteria</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">No businesses registered yet</p>
                            <p className="text-sm mt-1">Businesses will appear here when they register</p>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredBusinesses.length > 0 && (
              <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800/50 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'} border-t text-sm`}>
                Showing {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'} of {businesses.length} total
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Package className="h-5 w-5 text-purple-500 mr-2" />
                  Medical Services
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage available medical services</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <button
                  onClick={() => {
                    setEditingService(null);
                    setServiceFormData({
                      name: '',
                      description: '',
                      category: 'in-person',
                      isActive: true,
                      displayOrder: services.length
                    });
                    setShowServiceForm(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Service
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Name
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Category
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Status
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Order
                    </th>
                    <th className={`px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                  {filteredServices.length > 0 ? filteredServices.map((service) => {
                    const id = service.id;
                    const name = service.attributes?.name || service.name;
                    const category = service.attributes?.category || service.category;
                    const isActive = service.attributes?.isActive || service.isActive;
                    const displayOrder = service.attributes?.displayOrder || service.displayOrder || 0;

                    return (
                      <tr key={id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            category === 'in-person' 
                              ? isDarkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-900' : 'bg-blue-100 text-blue-700 border border-blue-300'
                              : isDarkMode ? 'bg-green-900/40 text-green-400 border border-green-900' : 'bg-green-100 text-green-700 border border-green-300'
                          }`}>
                            {category === 'in-person' ? (
                              <>
                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                In-Person
                              </>
                            ) : (
                              <>
                                <Globe className="h-3.5 w-3.5 mr-1" />
                                Online
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            isActive 
                              ? isDarkMode ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-900' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : isDarkMode ? 'bg-red-900/40 text-red-400 border border-red-900' : 'bg-red-100 text-red-700 border border-red-300'
                          }`}>
                            {isActive ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <X className="h-3.5 w-3.5 mr-1" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            {displayOrder}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEditService(service)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                              }`}
                            >
                              <Eye className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            </button>
                            <button
                              onClick={() => handleDeleteService(id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                              }`}
                            >
                              <X className={`h-4 w-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No services found</h3>
                          <p className="max-w-md mx-auto">
                            {searchTerm ? 
                              'Try adjusting your search criteria to find what you\'re looking for.' :
                              'No services have been added yet. Click the "Add New Service" button to create one.'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredServices.length > 0 && (
              <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800/50 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'} border-t text-sm`}>
                Showing {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} of {services.length} total
              </div>
            )}
          </div>
        )}

        {/* Service Form Modal */}
        {showServiceForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowServiceForm(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50 ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
                <form onSubmit={handleServiceSubmit}>
                  <div className={`px-6 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <div className="flex justify-between items-center">
                          <h3 className={`text-lg font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {editingService ? 'Edit Service' : 'Add New Service'}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowServiceForm(false)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Service Name *
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={serviceFormData.name}
                              onChange={handleServiceFormChange}
                              required
                              autoFocus
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Description
                            </label>
                            <textarea
                              name="description"
                              value={serviceFormData.description}
                              onChange={(e) => setServiceFormData(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Category *
                            </label>
                            <select
                              name="category"
                              value={serviceFormData.category}
                              onChange={(e) => setServiceFormData(prev => ({ ...prev, category: e.target.value }))}
                              required
                              className={`mt-1 block w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="in-person">In-Person</option>
                              <option value="online">Online</option>
                            </select>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Display Order
                            </label>
                            <input
                              type="number"
                              name="displayOrder"
                              value={serviceFormData.displayOrder}
                              onChange={(e) => setServiceFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))}
                              min={0}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="isActive"
                              checked={serviceFormData.isActive}
                              onChange={(e) => setServiceFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                            />
                            <label className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Active
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'} border-t flex flex-row-reverse gap-3`}>
                    <button
                      type="submit"
                      disabled={dataLoading}
                      className={`inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      } ${dataLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {dataLoading ? 'Saving...' : editingService ? 'Save Changes' : 'Add Service'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowServiceForm(false)}
                      className={`inline-flex justify-center rounded-lg border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isDarkMode
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-800 focus:ring-gray-500'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Service Requests Tab */}
        {activeTab === 'requests' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Users className="h-5 w-5 text-green-500 mr-2" />
                  Service Requests
                  <button 
                    onClick={fetchAllData}
                    className={`ml-3 p-1.5 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-md transition-colors`} 
                    title="Refresh data"
                  >
                    <RefreshCw className="h-4 w-4 text-green-400" />
                  </button>
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Monitor all service requests in the system</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <span className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full`}>
                  <span className="font-medium">
                    {serviceRequests.filter(r => {
                      const status = r.status || r.attributes?.status;
                      const completedAt = r.completedAt || r.attributes?.completedAt;
                      const acceptedAt = r.acceptedAt || r.attributes?.acceptedAt;
                      return status === 'pending' && !completedAt && !acceptedAt;
                    }).length}
                  </span> Pending
                </span>
                <span className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full`}>
                  <span className="font-medium">
                    {serviceRequests.filter(r => {
                      const status = r.status || r.attributes?.status;
                      const completedAt = r.completedAt || r.attributes?.completedAt;
                      const acceptedAt = r.acceptedAt || r.attributes?.acceptedAt;
                      return (status === 'accepted' || (status === 'pending' && acceptedAt)) && !completedAt;
                    }).length}
                  </span> Accepted
                </span>
                <span className={`${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} px-3 py-1 rounded-full`}>
                  <span className="font-medium">
                    {serviceRequests.filter(r => {
                      const completedAt = r.completedAt || r.attributes?.completedAt;
                      return completedAt !== null && completedAt !== undefined;
                    }).length}
                  </span> Completed
                </span>
              </div>
            </div>
            
            <div className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {currentRequests.length > 0 ? currentRequests.map((request, index) => {
                // Handle both direct properties and nested attributes
                const id = request.id || request.attributes?.id;
                const serviceType = request.serviceType || request.attributes?.serviceType;
                const description = request.description || request.attributes?.description;
                const requestedAt = request.requestedAt || request.attributes?.requestedAt;
                const acceptedAt = request.acceptedAt || request.attributes?.acceptedAt;
                const completedAt = request.completedAt || request.attributes?.completedAt;
                
                // Determine the correct status based on timestamps and status field
                let status = request.status || request.attributes?.status;
                
                // If timestamps indicate a different state than what's stored, use the timestamp-based status
                if (completedAt) {
                  status = 'completed';
                } else if (acceptedAt && status === 'pending') {
                  status = 'accepted';
                }
                
                const totalAmount = request.totalAmount || request.attributes?.totalAmount;
                const urgencyLevel = request.urgencyLevel || request.attributes?.urgencyLevel;
                const estimatedDuration = request.estimatedDuration || request.attributes?.estimatedDuration;
                
                // Check isPaid flag first, then fall back to paymentStatus field
                const isPaid = request.isPaid || request.attributes?.isPaid;
                let paymentStatus = request.paymentStatus || request.attributes?.paymentStatus;
                
                // If isPaid is true, ensure the payment status is shown as 'paid'
                if (isPaid === true) {
                  paymentStatus = 'paid';
                }
                
                // Business and doctor might be nested differently depending on API response format
                const businessName = request.business?.businessName || 
                  request.attributes?.business?.data?.attributes?.businessName || 
                  request.attributes?.business?.businessName || 
                  'Unknown Business';
                
                const contactPersonName = request.business?.contactPersonName || 
                  request.attributes?.business?.data?.attributes?.contactPersonName || 
                  request.attributes?.business?.contactPersonName || 
                  'Unknown Contact';
                
                const doctorName = request.doctor ? 
                  `Dr. ${request.doctor.firstName || ''} ${request.doctor.lastName || ''}` : 
                  request.attributes?.doctor?.data?.attributes ? 
                  `Dr. ${request.attributes.doctor.data.attributes.firstName || ''} ${request.attributes.doctor.data.attributes.lastName || ''}` :
                  request.attributes?.doctor?.firstName ? 
                  `Dr. ${request.attributes.doctor.firstName || ''} ${request.attributes.doctor.lastName || ''}` :
                  'Not assigned';
                  
                return (
                  <div key={id} className={`p-6 transition-colors ${
                    index % 2 === 0 
                      ? isDarkMode ? 'bg-gray-900/50 hover:bg-gray-800/70' : 'bg-gray-50 hover:bg-gray-100' 
                      : isDarkMode ? 'bg-gray-900 hover:bg-gray-800/50' : 'bg-white hover:bg-gray-50'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          {urgencyLevel && urgencyLevel !== 'medium' && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              urgencyLevel === 'emergency' ? 
                                isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700' :
                              urgencyLevel === 'high' ? 
                                isDarkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700' :
                                isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                            }`}>
                              {urgencyLevel}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            status === 'completed' ? 
                              isDarkMode ? 'bg-green-900/40 text-green-400 border border-green-900' : 'bg-green-100 text-green-700 border border-green-300' :
                            status === 'accepted' ? 
                              isDarkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-900' : 'bg-blue-100 text-blue-700 border border-blue-300' :
                            status === 'pending' ? 
                              isDarkMode ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-900' : 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                            status === 'rejected' ? 
                              isDarkMode ? 'bg-red-900/40 text-red-400 border border-red-900' : 'bg-red-100 text-red-700 border border-red-300' :
                              isDarkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                            {(status || 'pending').replace('_', ' ')}
                          </span>
                          {requestedAt && (
                            <span className={`text-xs flex items-center ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {formatDate(requestedAt)}
                            </span>
                          )}
                        </div>
                        
                        <h3 className={`font-semibold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{serviceType}</h3>
                        <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{description}</p>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-3 flex flex-col space-y-2`}>
                            <div className="flex justify-between items-center">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Business</span>
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{businessName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Contact</span>
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{contactPersonName}</span>
                            </div>
                          </div>
                          
                          <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-lg p-3 flex flex-col space-y-2`}>
                            <div className="flex justify-between items-center">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Doctor</span>
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{doctorName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Duration</span>
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{estimatedDuration}h</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`flex flex-wrap items-center gap-4 mt-4 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          {acceptedAt && (
                            <span className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1 text-blue-500" />
                              Accepted: {formatDate(acceptedAt)}
                            </span>
                          )}
                          {completedAt && (
                            <span className="flex items-center">
                              <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                              Completed: {formatDate(completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {totalAmount && (
                        <div className="flex flex-col items-end space-y-2 min-w-[120px]">
                          <div className={`text-lg font-semibold ${isDarkMode ? 'text-green-600' : 'text-green-600'}`}>
                            {formatCurrency(totalAmount)}
                          </div>
                          <div className={`text-xs px-2.5 py-1.5 rounded-full flex items-center ${
                            isPaid || paymentStatus === 'paid' ? 
                              isDarkMode ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-700' :
                            paymentStatus === 'pending' ? 
                              isDarkMode ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-100 text-yellow-700' :
                            paymentStatus === 'failed' ? 
                              isDarkMode ? 'bg-red-100 text-red-700' : 'bg-red-100 text-red-700' :
                              isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {(isPaid || paymentStatus === 'paid') && <Check className="h-3 w-3 mr-1 stroke-2" />}
                            {(isPaid ? 'PAID' : paymentStatus || 'pending').toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="p-10 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'} mb-4`}>
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No service requests found</h3>
                  <p className={`max-w-md mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {searchTerm ? 
                      'Try adjusting your search criteria to find what you\'re looking for.' :
                      'Service requests will appear here when businesses submit them.'
                    }
                  </p>
                </div>
              )}
            </div>
            
            {filteredRequests.length > 0 && (
              <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'} border-t`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} filtered requests ({serviceRequests.length} total)
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white shadow-sm'
                                : isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Doctor Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b`}>
              <div className="flex items-center space-x-3">
                <div className={`${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} p-2 rounded-lg`}>
                  <Users className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Doctor Earnings</h2>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Track earnings and revenue per doctor from completed service requests</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {doctorEarnings.length > 0 ? (
                <div className="space-y-6">
                  {filteredDoctorEarnings.map((earning) => {
                    const doctor = earning.doctor;
                    const doctorName = `Dr. ${doctor.firstName} ${doctor.lastName}`;
                    
                    return (
                      <div key={doctor.id} className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-lg p-5 border`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/30' : 'bg-gradient-to-br from-blue-100 to-blue-200'}`}>
                              <Stethoscope className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{doctorName}</h3>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{doctor.specialization || doctor.specialisation || 'Medical Professional'}</p>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Rate: {formatCurrency(doctor.hourlyRate)}/hour</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {formatCurrency(earning.totalEarnings)}
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {earning.completedRequests} completed requests
                            </p>
                          </div>
                        </div>
                        
                        {earning.businesses.length > 0 && (
                          <div>
                            <h4 className={`text-md font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Earnings by Business:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {earning.businesses.map((businessEarning) => {
                                const business = businessEarning.business;
                                return (
                                  <div key={business.id} className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-lg p-4 border`}>
                                    <div className="flex items-center space-x-3 mb-2">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-indigo-900/30 to-indigo-800/30' : 'bg-gradient-to-br from-indigo-100 to-indigo-200'}`}>
                                        <Building2 className={`h-4 w-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {business.businessName}
                                        </h5>
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{business.businessType}</p>
                                      </div>
                                    </div>
                                    <div className="mt-2">
                                      <div className={`text-lg font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                        {formatCurrency(businessEarning.earnings)}
                                      </div>
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {businessEarning.requestCount} requests
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {earning.businesses.length === 0 && earning.totalEarnings === 0 && (
                          <div className="text-center py-4">
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No completed service requests yet</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-xl p-8`}>
                    <Users className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No earnings data available</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Doctor earnings will appear here once service requests are completed with payment information.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Doctor Registration Form Modal */}
      {showDoctorForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-500 mr-2" />
                Register New Doctor
              </h2>
              <button
                onClick={() => setShowDoctorForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleDoctorRegister} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="doctorName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="doctorName"
                    name="name"
                    value={doctorFormData.name}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter doctor's full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="doctorEmail"
                    name="email"
                    value={doctorFormData.email}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showDoctorPassword ? "text" : "password"}
                      id="doctorPassword"
                      name="password"
                      value={doctorFormData.password}
                      onChange={handleDoctorFormChange}
                      required
                      className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDoctorPassword(!showDoctorPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                    >
                      {showDoctorPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="doctorPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="doctorPhone"
                    name="phone"
                    value={doctorFormData.phone}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorspecialisation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    specialisation *
                  </label>
                  <input
                    type="text"
                    id="doctorspecialisation"
                    name="specialisation"
                    value={doctorFormData.specialisation}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="e.g., Cardiology, General Practice"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorlicenceNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Number *
                  </label>
                  <input
                    type="text"
                    id="doctorlicenceNumber"
                    name="licenceNumber"
                    value={doctorFormData.licenceNumber}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter Medical Licence Number"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorExperience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    id="doctorExperience"
                    name="experience"
                    value={doctorFormData.experience}
                    onChange={handleDoctorFormChange}
                    required
                    min="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter years of experience"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorConsultationFee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Consultation Fee ($) *
                  </label>
                  <input
                    type="number"
                    id="doctorConsultationFee"
                    name="consultationFee"
                    value={doctorFormData.consultationFee}
                    onChange={handleDoctorFormChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter consultation fee"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="doctorAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  id="doctorAddress"
                  name="address"
                  value={doctorFormData.address}
                  onChange={handleDoctorFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="Enter complete address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="doctorCity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="doctorCity"
                    name="city"
                    value={doctorFormData.city}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter city"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorState" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    id="doctorState"
                    name="state"
                    value={doctorFormData.state}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter state"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorpostcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Postcode *
                  </label>
                  <input
                    type="text"
                    id="doctorpostcode"
                    name="postcode"
                    value={doctorFormData.postcode}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter postcode"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="doctorBio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  id="doctorBio"
                  name="bio"
                  value={doctorFormData.bio}
                  onChange={handleDoctorFormChange}
                  rows="3"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="Enter doctor's bio (optional)"
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDoctorForm(false)}
                  className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dataLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center"
                >
                  {dataLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Register Doctor
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Registration Form Modal */}
      {showBusinessForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-500 mr-2" />
                Register New Business
              </h2>
              <button
                onClick={() => setShowBusinessForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleBusinessRegistration} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="name"
                    value={businessFormData.name}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter business name"
                  />
                </div>
                
                <div>
                  <label htmlFor="businessContactPerson" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    id="businessContactPerson"
                    name="contactPersonName"
                    value={businessFormData.contactPersonName}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="businessEmail"
                    name="email"
                    value={businessFormData.email}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label htmlFor="businessPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showBusinessPassword ? "text" : "password"}
                      id="businessPassword"
                      name="password"
                      value={businessFormData.password}
                      onChange={handleBusinessFormChange}
                      required
                      className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBusinessPassword(!showBusinessPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                    >
                      {showBusinessPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="businessPhone"
                    name="phone"
                    value={businessFormData.phone}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Type *
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={businessFormData.businessType}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                  >
                    <option value="">Select business type</option>
                    <option value="clinic">Clinic</option>
                    <option value="hospital">Hospital</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="diagnostic">Diagnostic Center</option>
                    <option value="homecare">Home Care</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    id="businessRegistrationNumber"
                    name="registrationNumber"
                    value={businessFormData.registrationNumber}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter registration number"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  id="businessAddress"
                  name="address"
                  value={businessFormData.address}
                  onChange={handleBusinessFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                  placeholder="Enter complete address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="businessCity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="businessCity"
                    name="city"
                    value={businessFormData.city}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter city"
                  />
                </div>
                
                <div>
                  <label htmlFor="businessState" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    id="businessState"
                    name="state"
                    value={businessFormData.state}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter state"
                  />
                </div>
                
                <div>
                  <label htmlFor="businesspostcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Postcode *
                  </label>
                  <input
                    type="text"
                    id="businesspostcode"
                    name="postcode"
                    value={businessFormData.postcode}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter postcode"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="businessDescription"
                  name="description"
                  value={businessFormData.description}
                  onChange={handleBusinessFormChange}
                  rows="3"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                  placeholder="Enter business description (optional)"
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBusinessForm(false)}
                  className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dataLoading}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors flex items-center"
                >
                  {dataLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Register Business
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Details Modal */}
      {showDoctorDetails && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-4xl w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                    <Stethoscope className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                      {selectedDoctor.specialization || selectedDoctor.specialisation || 'Medical Professional'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDoctorDetails}
                  className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto modal-scrollable flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Personal Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>First Name:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.firstName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Last Name:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Verification Status:</span>
                      <span className={`font-medium ${selectedDoctor.isVerified ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDoctor.isVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Professional Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>specialisation:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.specialization || selectedDoctor.specialisation || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>License Number:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.licenseNumber || selectedDoctor.licenceNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Years of Experience:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.yearsOfExperience || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Hourly Rate:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(selectedDoctor.hourlyRate || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Availability:</span>
                      <span className={`font-medium ${selectedDoctor.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDoctor.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Address Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Address:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-right`}>{selectedDoctor.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>City:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.city || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>State:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.state || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Postcode:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.postcode || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {selectedDoctor.bio && (
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Biography</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedDoctor.bio}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCloseDoctorDetails}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Details Modal */}
      {showBusinessDetails && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-4xl w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-600'} p-2 rounded-lg`}>
                    <Building2 className={`h-5 w-5 ${isDarkMode ? 'text-indigo-400' : 'text-white'}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedBusiness.businessName || selectedBusiness.name}
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} font-medium`}>
                      {selectedBusiness.businessType || 'Business'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseBusinessDetails}
                  className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto modal-scrollable flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Information */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Business Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Business Name:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.businessName || selectedBusiness.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Business Type:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.businessType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Registration Number:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.registrationNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Verification Status:</span>
                      <span className={`font-medium ${selectedBusiness.isVerified ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedBusiness.isVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Contact Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Contact Person:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.contactPersonName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Website:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.website || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Address Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Address:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-right`}>{selectedBusiness.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>City:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.city || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>State:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.state || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Postcode:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBusiness.postcode || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedBusiness.description && (
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Description</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedBusiness.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCloseBusinessDetails}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
