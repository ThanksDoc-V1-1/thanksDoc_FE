'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Building2, Stethoscope, Check, X, Eye, EyeOff, Search, Filter, AlertTriangle, Calendar, Clock, MapPin, DollarSign, Phone, Mail, FileCheck, RefreshCw, LogOut, Plus } from 'lucide-react';
import { doctorAPI, businessAPI, serviceRequestAPI } from '../../../lib/api';
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
  const [doctorEarnings, setDoctorEarnings] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 5;
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);
  const [showBusinessPassword, setShowBusinessPassword] = useState(false);
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    licenseNumber: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
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
    zipCode: '',
    description: ''
  });

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

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [doctorsRes, businessesRes, requestsRes] = await Promise.all([
        doctorAPI.getAll(),
        businessAPI.getAll(),
        serviceRequestAPI.getAll()
      ]);

      console.log('🏥 Raw doctors response:', doctorsRes.data);
      console.log('🏢 Raw businesses response:', businessesRes.data);
      console.log('📋 Raw requests response:', requestsRes.data);

      setDoctors(doctorsRes.data?.data || []);
      setBusinesses(businessesRes.data?.data || []);
      
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
          specialization: '',
          licenseNumber: '',
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
        businessLicense: businessFormData.registrationNumber,
        phone: businessFormData.phone,
        address: businessFormData.address,
        city: businessFormData.city || 'Not specified',
        state: businessFormData.state || 'Not specified',
        zipCode: businessFormData.zipCode || '00000',
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
          zipCode: '',
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
        specialization: doctorFormData.specialization,
        licenseNumber: doctorFormData.licenseNumber,
        phone: doctorFormData.phone,
        address: doctorFormData.address,
        city: doctorFormData.city || 'Not specified', // Use form data or default
        state: doctorFormData.state || 'Not specified', // Use form data or default  
        zipCode: doctorFormData.zipCode || '00000', // Use form data or default
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
          specialization: '',
          licenseNumber: '',
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

  // Filter functions for search and status filters
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = searchTerm === '' || 
      `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'verified' && doctor.isVerified) || 
      (filterStatus === 'unverified' && !doctor.isVerified);
    
    return matchesSearch && matchesFilter;
  });

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = searchTerm === '' || 
      business.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.businessType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.businessLicense?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'verified' && business.isVerified) || 
      (filterStatus === 'unverified' && !business.isVerified);
    
    return matchesSearch && matchesFilter;
  });

  const filteredRequests = serviceRequests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.business?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.doctor?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.doctor?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Determine the effective status considering timestamps
    let effectiveStatus = request.status || request.attributes?.status;
    if (request.completedAt || request.attributes?.completedAt) {
      effectiveStatus = 'completed';
    } else if ((request.acceptedAt || request.attributes?.acceptedAt) && effectiveStatus === 'pending') {
      effectiveStatus = 'accepted';
    }
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'pending' && effectiveStatus === 'pending') || 
      (filterStatus === 'accepted' && effectiveStatus === 'accepted') ||
      (filterStatus === 'completed' && effectiveStatus === 'completed');
    
    return matchesSearch && matchesFilter;
  });

  // Pagination for service requests
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const startIndex = (currentPage - 1) * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
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
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-800 rounded-lg shadow-lg">
                <Shield className="h-6 w-6 text-white" />
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
        {/* Search & Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="text"
              className={`block w-full pl-10 pr-3 py-2.5 border ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 focus:ring-blue-400 focus:border-blue-400' : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500'} rounded-lg focus:outline-none shadow-sm`}
              placeholder="Search by name, email, license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2 whitespace-nowrap">
            <Filter className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <select 
              className={`block w-full pl-3 pr-8 py-2.5 text-base border ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 focus:ring-blue-400 focus:border-blue-400' : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500'} rounded-lg focus:outline-none shadow-sm cursor-pointer`}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`mb-8 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-1.5 rounded-xl shadow border`}>
          <nav className="grid grid-cols-2 sm:flex gap-1.5">
            {[
              { id: 'overview', name: 'Overview', icon: Eye },
              { id: 'doctors', name: 'Doctors', icon: Stethoscope },
              { id: 'businesses', name: 'Businesses', icon: Building2 },
              { id: 'requests', name: 'Service Requests', icon: Users },
              { id: 'earnings', name: 'Doctor Earnings', icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
              <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
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
                </div>
              </div>

              {/* Businesses Stats Card */}
              <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
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
                </div>
              </div>

              {/* Service Requests Stats Card */}
              <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
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
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
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
                </div>
              </div>
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
                {serviceRequests.slice(0, 5).map((request) => {
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
                    <div key={id} className={`p-6 transition-colors ${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize shadow-sm ${
                              urgencyLevel === 'emergency' 
                                ? isDarkMode ? 'bg-red-600 text-red-100' : 'bg-red-600 text-white'
                                : urgencyLevel === 'high' 
                                ? isDarkMode ? 'bg-orange-600 text-orange-100' : 'bg-orange-600 text-white'
                                : urgencyLevel === 'medium' 
                                ? isDarkMode ? 'bg-yellow-600 text-yellow-100' : 'bg-yellow-600 text-white'
                                : isDarkMode ? 'bg-emerald-600 text-emerald-100' : 'bg-emerald-600 text-white'
                            }`}>
                              {urgencyLevel || 'normal'}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize shadow-sm border ${
                              status === 'completed' 
                                ? isDarkMode ? 'bg-emerald-600 text-emerald-100 border-emerald-500' : 'bg-emerald-600 text-white border-emerald-600'
                                : status === 'accepted' 
                                ? isDarkMode ? 'bg-blue-600 text-blue-100 border-blue-500' : 'bg-blue-600 text-white border-blue-600'
                                : status === 'pending' 
                                ? isDarkMode ? 'bg-amber-600 text-amber-100 border-amber-500' : 'bg-amber-600 text-white border-amber-600'
                                : status === 'rejected' 
                                ? isDarkMode ? 'bg-red-600 text-red-100 border-red-500' : 'bg-red-600 text-white border-red-600'
                                : isDarkMode ? 'bg-slate-600 text-slate-100 border-slate-500' : 'bg-slate-600 text-white border-slate-600'
                            }`}>
                              {(status || 'pending').replace('_', ' ')}
                            </span>
                            {isPaid && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-green-900/40 text-green-400 border border-green-900">
                                <Check className="h-3 w-3 mr-1 stroke-2" />
                                PAID
                              </span>
                            )}
                          </div>
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{serviceType}</h3>
                          <div className={`flex items-center text-sm mt-1 space-x-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Building2 className="h-4 w-4 flex-shrink-0" />
                            <span>{businessName}</span>
                            <span className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>→</span>
                            <Stethoscope className="h-4 w-4 flex-shrink-0" />
                            <span>{doctorName}</span>
                          </div>
                          <div className={`flex items-center text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            <span>{formatDate(requestedAt)}</span>
                          </div>
                        </div>
                        
                        {totalAmount && (
                          <div className="flex flex-col items-end ml-4">
                            <div className="text-sm font-semibold text-green-500">
                              {formatCurrency(totalAmount)}
                            </div>
                            <div className={`mt-1 text-xs px-3 py-1.5 rounded-full flex items-center font-bold shadow-sm ${
                              isPaid || (request.paymentStatus || request.attributes?.paymentStatus) === 'paid' 
                                ? isDarkMode ? 'bg-emerald-600 text-emerald-100' : 'bg-emerald-600 text-white'
                                : (request.paymentStatus || request.attributes?.paymentStatus) === 'pending' 
                                ? isDarkMode ? 'bg-amber-600 text-amber-100' : 'bg-amber-600 text-white'
                                : (request.paymentStatus || request.attributes?.paymentStatus) === 'failed' 
                                ? isDarkMode ? 'bg-red-600 text-red-100' : 'bg-red-600 text-white'
                                : isDarkMode ? 'bg-slate-600 text-slate-100' : 'bg-slate-600 text-white'
                            }`}>
                              {isPaid && <Check className="h-3 w-3 mr-1 stroke-2" />}
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
            
            <div className="p-4">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search doctors by name, specialty, license or email..." 
                  className={`w-full pl-10 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 shadow-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 focus:ring-blue-500' : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="mb-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'all' ? 
                    'bg-blue-600 text-white font-medium' :
                    isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Doctors
                </button>
                <button 
                  onClick={() => setFilterStatus('verified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'verified' ? 
                    'bg-green-600 text-white font-medium' :
                    isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Verified Only
                </button>
                <button 
                  onClick={() => setFilterStatus('unverified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'unverified' ? 
                    'bg-yellow-600 text-white font-medium' :
                    isDarkMode ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  Pending Verification
                </button>
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
                      Specialization
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
                    const licenseNumber = doctor.licenseNumber || doctor.attributes?.licenseNumber;
                    const specialization = doctor.specialization || doctor.attributes?.specialization;
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
                                <FileCheck className="h-3.5 w-3.5 mr-1 stroke-2" /> {licenseNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{specialization}</div>
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
                              onClick={() => alert(`View details for ${firstName} ${lastName}`)}
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
                        {searchTerm || filterStatus !== 'all' ? (
                          <>
                            <p className="font-medium">No matching doctors found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
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
            
            <div className="p-4">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search businesses by name, type, license or email..." 
                  className={`w-full pl-10 px-4 py-2.5 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="mb-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'all' ? 
                    'bg-purple-600 text-white font-medium' :
                    isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Businesses
                </button>
                <button 
                  onClick={() => setFilterStatus('verified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'verified' ? 
                    'bg-green-600 text-white font-medium' :
                    isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Verified Only
                </button>
                <button 
                  onClick={() => setFilterStatus('unverified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'unverified' ? 
                    'bg-yellow-600 text-white font-medium' :
                    isDarkMode ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  Pending Verification
                </button>
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
                    const businessLicense = business.businessLicense || business.attributes?.businessLicense;
                    const businessType = business.businessType || business.attributes?.businessType;
                    const contactPersonName = business.contactPersonName || business.attributes?.contactPersonName;
                    const phone = business.phone || business.attributes?.phone;
                    const city = business.city || business.attributes?.city;
                    const state = business.state || business.attributes?.state;
                    const zipCode = business.zipCode || business.attributes?.zipCode;
                    const isVerified = business.isVerified || business.attributes?.isVerified;
                    
                    // Get business type color
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
                                <FileCheck className="h-3.5 w-3.5 mr-1 stroke-2" /> {businessLicense}
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
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{zipCode}</div>
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
                              onClick={() => alert(`View details for ${businessName}`)}
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
                        {searchTerm || filterStatus !== 'all' ? (
                          <>
                            <p className="font-medium">No matching businesses found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
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
            
            <div className="p-4">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search service requests by type, business, or doctor..." 
                  className={`w-full pl-10 px-4 py-2.5 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="mb-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'all' ? 
                    isDarkMode ? 'bg-gray-100 text-gray-900 font-medium' : 'bg-gray-800 text-white font-medium' :
                    isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Requests
                </button>
                <button 
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'pending' ? 
                    'bg-yellow-600 text-white font-medium' :
                    isDarkMode ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => setFilterStatus('accepted')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'accepted' ? 
                    'bg-blue-600 text-white font-medium' :
                    isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Accepted
                </button>
                <button 
                  onClick={() => setFilterStatus('completed')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'completed' ? 
                    'bg-green-600 text-white font-medium' :
                    isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Completed
                </button>
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            urgencyLevel === 'emergency' ? 
                              isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700' :
                            urgencyLevel === 'high' ? 
                              isDarkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700' :
                            urgencyLevel === 'medium' ? 
                              isDarkMode ? 'bg-yellow-900/40 text-yellow-400' : 'bg-yellow-100 text-yellow-700' :
                              isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                          }`}>
                            {urgencyLevel || 'normal'}
                          </span>
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
                    {searchTerm || filterStatus !== 'all' ? 
                      'Try adjusting your search or filter criteria to find what you\'re looking for.' :
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
                  <DollarSign className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
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
                  {doctorEarnings.map((earning) => {
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
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{doctor.specialization}</p>
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
                    <DollarSign className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
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
                  <label htmlFor="doctorSpecialization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    id="doctorSpecialization"
                    name="specialization"
                    value={doctorFormData.specialization}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="e.g., Cardiology, General Practice"
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorLicenseNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Number *
                  </label>
                  <input
                    type="text"
                    id="doctorLicenseNumber"
                    name="licenseNumber"
                    value={doctorFormData.licenseNumber}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter medical license number"
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
                  <label htmlFor="doctorZipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zip Code *
                  </label>
                  <input
                    type="text"
                    id="doctorZipCode"
                    name="zipCode"
                    value={doctorFormData.zipCode}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter zip code"
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
                  <label htmlFor="businessZipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zip Code *
                  </label>
                  <input
                    type="text"
                    id="businessZipCode"
                    name="zipCode"
                    value={businessFormData.zipCode}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter zip code"
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
    </div>
  );
}
