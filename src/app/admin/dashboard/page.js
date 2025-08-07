'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Building2, Stethoscope, Check, X, Eye, EyeOff, Search, AlertTriangle, Calendar, Clock, MapPin, DollarSign, Phone, Mail, FileCheck, FileText, RefreshCw, LogOut, Plus, Package, Globe, CreditCard } from 'lucide-react';
import { doctorAPI, businessAPI, serviceRequestAPI, serviceAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getCurrentLocation } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import TransactionHistory from '../../../components/TransactionHistory';
import AdminNotificationCenter from '../../../components/AdminNotificationCenter';

export default function AdminDashboard() {
  const { logout, user, isAuthenticated, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [doctorEarnings, setDoctorEarnings] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [focusedDoctorId, setFocusedDoctorId] = useState(null);
  
  // Pagination states
  const [servicesCurrentPage, setServicesCurrentPage] = useState(1);
  const [businessTypesCurrentPage, setBusinessTypesCurrentPage] = useState(1);
  const servicesPerPage = 5;
  const businessTypesPerPage = 5;
  
  // Service form states and handlers
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    category: 'in-person',
    price: '',
    duration: '',
    isActive: true,
    displayOrder: 0
  });

  // Business Type form states and handlers
  const [showBusinessTypeForm, setShowBusinessTypeForm] = useState(false);
  const [editingBusinessType, setEditingBusinessType] = useState(null);
  const [businessTypeFormData, setBusinessTypeFormData] = useState({
    name: '',
    value: '',
    description: '',
    isActive: true,
    displayOrder: 0
  });

  const handleServiceFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('📝 Form field changed:', { name, value, type, checked });
    
    setServiceFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'displayOrder' ? parseInt(value) || 0 : value)
    }));
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      console.log('🛠️ Service form submission started');
      console.log('📝 Form data:', serviceFormData);
      console.log('✏️ Editing service:', editingService);

      const serviceData = {
        name: serviceFormData.name.trim(),
        description: serviceFormData.description.trim(),
        category: serviceFormData.category,
        price: parseFloat(serviceFormData.price) || 0,
        duration: parseInt(serviceFormData.duration) || 0,
        isActive: serviceFormData.isActive,
        displayOrder: parseInt(serviceFormData.displayOrder) || 0
      };

      console.log('📝 Processed service data:', serviceData);

      let response;
      if (editingService) {
        // Extract clean ID - handle both Strapi v4 and v5 formats
        let serviceId = editingService.documentId || editingService.id;
        
        // Clean the ID to remove any URL fragments or port numbers
        if (typeof serviceId === 'string') {
          serviceId = serviceId.split(':')[0].split('/').pop();
        }
        
        console.log('📝 Updating service with clean ID:', serviceId);
        
        response = await serviceAPI.update(serviceId, serviceData);
        console.log('✅ Update response:', response);
        
        if (response.data) {
          const updatedService = response.data.data || response.data;
          setServices(prev => prev.map(service => 
            (service.id === editingService.id || service.documentId === editingService.documentId) 
              ? updatedService : service
          ));
          alert('Service updated successfully!');
        }
      } else {
        console.log('🆕 Creating new service');
        
        response = await serviceAPI.create(serviceData);
        console.log('✅ Create response:', response);
        
        if (response.data) {
          const newService = response.data.data || response.data;
          setServices(prev => [...prev, newService]);
          alert('Service created successfully!');
        }
      }

      // Reset form
      setShowServiceForm(false);
      setEditingService(null);
      setServiceFormData({
        name: '',
        description: '',
        category: 'in-person',
        price: '',
        duration: '',
        isActive: true,
        displayOrder: 0
      });

      // Refresh all data
      await fetchAllData();
      
    } catch (error) {
      console.error('❌ Error saving service:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
        url: error.config?.url
      });
      
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication expired. Please refresh the page and log in again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error?.message || 'Bad request - please check your input data';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error ${editingService ? 'updating' : 'creating'} service: ${errorMessage}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleEditService = (service) => {
    console.log('✏️ Edit service clicked:', service);
    setEditingService(service);
    
    // Extract data from either Strapi v4 or v5 format
    const serviceData = service.attributes || service;
    
    const formData = {
      name: serviceData.name || '',
      description: serviceData.description || '',
      category: serviceData.category || 'in-person',
      price: serviceData.price?.toString() || '',
      duration: serviceData.duration?.toString() || '',
      isActive: serviceData.isActive !== undefined ? serviceData.isActive : true,
      displayOrder: serviceData.displayOrder || 0
    };
    
    console.log('✏️ Setting form data:', formData);
    setServiceFormData(formData);
    setShowServiceForm(true);
  };

  const handleDeleteService = async (service) => {
    const serviceName = service.attributes?.name || service.name || 'this service';
    if (!confirm(`Are you sure you want to delete "${serviceName}"?`)) {
      return;
    }

    try {
      setDataLoading(true);
      
      // Extract and clean ID
      let serviceId = service.documentId || service.id;
      
      // Clean the ID to remove any URL fragments or port numbers
      if (typeof serviceId === 'string') {
        serviceId = serviceId.split(':')[0].split('/').pop();
      }
      
      console.log('🗑️ Deleting service with clean ID:', serviceId);
      
      await serviceAPI.delete(serviceId);
      
      // Remove from local state
      setServices(prev => prev.filter(s => 
        s.id !== service.id && s.documentId !== service.documentId
      ));
      
      alert('Service deleted successfully!');
      await fetchAllData(); // Refresh data
      
    } catch (error) {
      console.error('❌ Error deleting service:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error occurred';
      alert(`Error deleting service: ${errorMessage}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Business Type form handlers
  const handleBusinessTypeFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBusinessTypeFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'displayOrder' ? parseInt(value) || 0 : value)
    }));
  };

  const handleBusinessTypeSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      let response;
      if (editingBusinessType) {
        const businessTypeIdentifier = editingBusinessType.documentId || editingBusinessType.id;
        const updateData = {
          name: businessTypeFormData.name,
          value: businessTypeFormData.value,
          description: businessTypeFormData.description,
          isActive: businessTypeFormData.isActive,
          displayOrder: parseInt(businessTypeFormData.displayOrder)
        };
        
        response = await businessAPI.updateBusinessType(businessTypeIdentifier, updateData);
        setBusinessTypes(prev => prev.map(type => 
          (type.id === editingBusinessType.id || type.documentId === editingBusinessType.documentId) 
            ? response.data.data : type
        ));
      } else {
        const createData = {
          name: businessTypeFormData.name,
          value: businessTypeFormData.value,
          description: businessTypeFormData.description,
          isActive: businessTypeFormData.isActive,
          displayOrder: parseInt(businessTypeFormData.displayOrder)
        };
        
        response = await businessAPI.createBusinessType(createData);
        setBusinessTypes(prev => [...prev, response.data.data]);
      }

      setShowBusinessTypeForm(false);
      setEditingBusinessType(null);
      setBusinessTypeFormData({
        name: '',
        value: '',
        description: '',
        isActive: true,
        displayOrder: 0
      });
      
      alert(editingBusinessType ? 'Business type updated successfully!' : 'Business type created successfully!');
    } catch (error) {
      console.error('Error saving business type:', error);
      alert(`Failed to save business type. Error: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleEditBusinessType = (businessType) => {
    setEditingBusinessType(businessType);
    
    const formData = {
      name: businessType.attributes?.name || businessType.name || '',
      value: businessType.attributes?.value || businessType.value || '',
      description: businessType.attributes?.description || businessType.description || '',
      isActive: businessType.attributes?.isActive !== undefined ? businessType.attributes.isActive : (businessType.isActive !== undefined ? businessType.isActive : true),
      displayOrder: businessType.attributes?.displayOrder || businessType.displayOrder || 0
    };
    
    setBusinessTypeFormData(formData);
    setShowBusinessTypeForm(true);
  };

  const handleDeleteBusinessType = async (id, documentId) => {
    if (!window.confirm('Are you sure you want to delete this business type? This action cannot be undone.')) return;

    setDataLoading(true);
    try {
      const businessTypeIdentifier = documentId || id;
      await businessAPI.deleteBusinessType(businessTypeIdentifier);
      setBusinessTypes(prev => prev.filter(type => 
        type.id !== id && type.documentId !== documentId
      ));
      alert('Business type deleted successfully');
    } catch (error) {
      console.error('Error deleting business type:', error);
      alert(`Failed to delete business type. Error: ${error.response?.data?.error?.message || error.message}`);
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
  
  // Compliance documents state
  const [complianceDocuments, setComplianceDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [updatingVerification, setUpdatingVerification] = useState(false);
  
  // Professional References state
  const [professionalReferences, setProfessionalReferences] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  
  // Compliance document types management
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentTypesLoading, setDocumentTypesLoading] = useState(true);
  const [showDocumentTypeForm, setShowDocumentTypeForm] = useState(false);
  const [editingDocumentType, setEditingDocumentType] = useState(null);
  const [documentTypeFormData, setDocumentTypeFormData] = useState({
    name: '',
    required: true,
    description: '',
    autoExpiry: true, // Enable auto-expiry by default for all documents
    validityYears: 3, // Default to 3 years validity
    expiryWarningDays: 30
  });
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    email: '',
    password: '',
    licenceNumber: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    bio: ''
  });
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    contactPersonName: '',
    email: '',
    password: '',
    businessType: '',
    registrationNumber: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    town: '',
    county: '',
    postcode: '',
    latitude: '',
    longitude: '',
    description: ''
  });

  // Town/City autocomplete states for business form
  const [businessTownQuery, setBusinessTownQuery] = useState('');
  const [showBusinessTownSuggestions, setShowBusinessTownSuggestions] = useState(false);
  const [filteredBusinessTowns, setFilteredBusinessTowns] = useState([]);
  const [businessLocationLoading, setBusinessLocationLoading] = useState(false);
  
  // UK Towns and Counties data for business form
  const ukTownsAndCounties = [
    { town: 'London', county: 'Greater London' },
    { town: 'Birmingham', county: 'West Midlands' },
    { town: 'Manchester', county: 'Greater Manchester' },
    { town: 'Liverpool', county: 'Merseyside' },
    { town: 'Leeds', county: 'West Yorkshire' },
    { town: 'Sheffield', county: 'South Yorkshire' },
    { town: 'Bristol', county: 'Bristol' },
    { town: 'Newcastle upon Tyne', county: 'Tyne and Wear' },
    { town: 'Nottingham', county: 'Nottinghamshire' },
    { town: 'Leicester', county: 'Leicestershire' },
    { town: 'Coventry', county: 'West Midlands' },
    { town: 'Bradford', county: 'West Yorkshire' },
    { town: 'Stoke-on-Trent', county: 'Staffordshire' },
    { town: 'Wolverhampton', county: 'West Midlands' },
    { town: 'Plymouth', county: 'Devon' },
    { town: 'Derby', county: 'Derbyshire' },
    { town: 'Southampton', county: 'Hampshire' },
    { town: 'Portsmouth', county: 'Hampshire' },
    { town: 'Brighton', county: 'East Sussex' },
    { town: 'Hull', county: 'East Yorkshire' },
    { town: 'Reading', county: 'Berkshire' },
    { town: 'Oxford', county: 'Oxfordshire' },
    { town: 'Cambridge', county: 'Cambridgeshire' },
    { town: 'York', county: 'North Yorkshire' },
    { town: 'Bath', county: 'Somerset' },
    { town: 'Canterbury', county: 'Kent' },
    { town: 'Salisbury', county: 'Wiltshire' },
    { town: 'Winchester', county: 'Hampshire' },
    { town: 'Norwich', county: 'Norfolk' },
    { town: 'Exeter', county: 'Devon' },
    { town: 'Chester', county: 'Cheshire' },
    { town: 'Gloucester', county: 'Gloucestershire' },
    { town: 'Worcester', county: 'Worcestershire' },
    { town: 'Lincoln', county: 'Lincolnshire' },
    { town: 'Peterborough', county: 'Cambridgeshire' },
    { town: 'Lancaster', county: 'Lancashire' },
    { town: 'Preston', county: 'Lancashire' },
    { town: 'Blackpool', county: 'Lancashire' },
    { town: 'Bournemouth', county: 'Dorset' },
    { town: 'Swindon', county: 'Wiltshire' },
    { town: 'Warrington', county: 'Cheshire' },
    { town: 'Stockport', county: 'Greater Manchester' },
    { town: 'Bolton', county: 'Greater Manchester' },
    { town: 'Wigan', county: 'Greater Manchester' },
    { town: 'Rochdale', county: 'Greater Manchester' },
    { town: 'Salford', county: 'Greater Manchester' },
    { town: 'Oldham', county: 'Greater Manchester' },
    { town: 'Bury', county: 'Greater Manchester' },
    { town: 'Huddersfield', county: 'West Yorkshire' },
    { town: 'Wakefield', county: 'West Yorkshire' },
    { town: 'Halifax', county: 'West Yorkshire' },
    { town: 'Doncaster', county: 'South Yorkshire' },
    { town: 'Rotherham', county: 'South Yorkshire' },
    { town: 'Barnsley', county: 'South Yorkshire' },
    { town: 'Edinburgh', county: 'City of Edinburgh' },
    { town: 'Glasgow', county: 'Glasgow City' },
    { town: 'Aberdeen', county: 'Aberdeenshire' },
    { town: 'Dundee', county: 'Angus' },
    { town: 'Stirling', county: 'Stirlingshire' },
    { town: 'Perth', county: 'Perth and Kinross' },
    { town: 'Inverness', county: 'Highland' },
    { town: 'Cardiff', county: 'Cardiff' },
    { town: 'Swansea', county: 'Swansea' },
    { town: 'Newport', county: 'Newport' },
    { town: 'Wrexham', county: 'Wrexham' },
    { town: 'Bangor', county: 'Gwynedd' },
    { town: 'Belfast', county: 'Belfast' },
    { town: 'Londonderry', county: 'Londonderry' },
    { town: 'Lisburn', county: 'Lisburn and Castlereagh' },
    { town: 'Newtownabbey', county: 'Antrim and Newtownabbey' }
  ];

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
      // Use direct fetch for services to avoid doctor populate filters
      const servicesPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?sort=category:asc,displayOrder:asc,name:asc&pagination[limit]=100`)
        .then(res => res.json())
        .then(data => ({ data }));
        
      const [doctorsRes, businessesRes, requestsRes, servicesRes, businessTypesRes] = await Promise.all([
        doctorAPI.getAll(),
        businessAPI.getAll(),
        serviceRequestAPI.getAll(),
        servicesPromise,
        businessAPI.getBusinessTypes()
      ]);

      console.log('🏥 Raw doctors response:', doctorsRes.data);
      console.log('🏢 Raw businesses response:', businessesRes.data);
      console.log('📋 Raw requests response:', requestsRes.data);
      console.log('📦 Raw services response:', servicesRes.data);
      console.log('📦 Services data structure:');
      if (servicesRes.data?.data && servicesRes.data.data.length > 0) {
        console.log('📦 First service object:', JSON.stringify(servicesRes.data.data[0], null, 2));
      }
      console.log('🏗️ Raw business types response:', businessTypesRes.data);

      setDoctors(doctorsRes.data?.data || []);
      setBusinesses(businessesRes.data?.data || []);
      setServices(servicesRes.data?.data || []);
      setBusinessTypes(businessTypesRes.data?.data || []);
      
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
    
    // Handle URL parameters for navigation from notifications
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const search = urlParams.get('search');
    const focus = urlParams.get('focus');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (search) {
      setSearchTerm(search);
    }
    
    if (focus) {
      setFocusedDoctorId(focus);
      // Clear focus after 5 seconds
      setTimeout(() => setFocusedDoctorId(null), 5000);
    }
    
    // Set up automatic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing data...');
      fetchAllData();
    }, 30000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(refreshInterval);
  }, []);

  // Separate useEffect for document types with extended delay and retry logic
  useEffect(() => {
    const loadDocumentTypesWithDelay = async () => {
      console.log('📋 Starting document types loading with delay...');
      setDocumentTypesLoading(true);
      
      // Wait 3 seconds to ensure backend is ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try loading document types with aggressive retry logic
      let attempts = 0;
      const maxAttempts = 5;
      const baseDelay = 2000; // Start with 2 seconds
      
      while (attempts < maxAttempts) {
        try {
          console.log(`📋 Document types loading attempt ${attempts + 1}/${maxAttempts}`);
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types`);
          console.log('📡 Document types API Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📦 Document types received:', data.data?.length || 0);
            
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              console.log('✅ Successfully loaded document types:', data.data.length);
              setDocumentTypes(data.data);
              setDocumentTypesLoading(false);
              return; // Success, exit the retry loop
            } else {
              console.log('⚠️ API returned empty data, retrying...');
              throw new Error('Empty data received');
            }
          } else {
            throw new Error(`API request failed with status: ${response.status}`);
          }
        } catch (error) {
          attempts++;
          console.error(`❌ Document types loading attempt ${attempts} failed:`, error.message);
          
          if (attempts >= maxAttempts) {
            console.log('❌ All document types loading attempts failed, using fallback');
            const fallbackTypes = [
              { key: 'gmc_registration', name: 'GMC Registration', required: true, description: '' },
              { key: 'medical_indemnity', name: 'Medical Indemnity', required: true, description: '' },
              { key: 'dbs_check', name: 'DBS Check', required: true, description: '' },
              { key: 'right_to_work', name: 'Right to Work', required: true, description: '' },
              { key: 'photo_id', name: 'Photo ID', required: true, description: '' }
            ];
            setDocumentTypes(fallbackTypes);
            setDocumentTypesLoading(false);
            return;
          }
          
          // Exponential backoff: wait longer each time
          const delay = baseDelay * Math.pow(2, attempts - 1);
          console.log(`⏳ Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
    
    loadDocumentTypesWithDelay();
  }, []); // Run once on component mount

  // Debug effect to track documentTypes changes
  useEffect(() => {
    console.log('📋 DocumentTypes state changed:', documentTypes);
    console.log('📋 DocumentTypes length:', documentTypes.length);
    console.log('📋 DocumentTypes is array:', Array.isArray(documentTypes));
  }, [documentTypes]);

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
          licenceNumber: '',
          phone: '',
          address: '',
          bio: ''
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
      // Validation for required fields
      if (!businessFormData.addressLine1.trim()) {
        throw new Error('Please enter address line 1');
      }
      if (!businessFormData.town.trim()) {
        throw new Error('Please select a town or city');
      }
      if (!businessFormData.county.trim()) {
        throw new Error('Please ensure a county is selected');
      }
      if (!businessFormData.postcode.trim()) {
        throw new Error('Please enter postcode');
      }
      if (!businessFormData.latitude || !businessFormData.longitude) {
        throw new Error('Please provide location coordinates');
      }

      const response = await businessAPI.create({
        businessName: businessFormData.name,
        name: businessFormData.name, // Same as business name
        contactPersonName: businessFormData.contactPersonName || businessFormData.name, // Use contact person name or fallback to business name
        email: businessFormData.email,
        password: businessFormData.password,
        businessType: businessFormData.businessType,
        businessLicence: businessFormData.registrationNumber,
        phone: businessFormData.phone,
        // New UK address format
        address: `${businessFormData.addressLine1}${businessFormData.addressLine2 ? ', ' + businessFormData.addressLine2 : ''}`,
        addressLine1: businessFormData.addressLine1,
        addressLine2: businessFormData.addressLine2,
        town: businessFormData.town,
        city: businessFormData.town, // Use town as city for compatibility
        county: businessFormData.county,
        state: businessFormData.county, // Use county as state for compatibility
        postcode: businessFormData.postcode,
        zipCode: businessFormData.postcode, // Use postcode as zipCode for compatibility
        latitude: parseFloat(businessFormData.latitude),
        longitude: parseFloat(businessFormData.longitude),
        description: businessFormData.description || '',
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
          addressLine1: '',
          addressLine2: '',
          town: '',
          county: '',
          postcode: '',
          latitude: '',
          longitude: '',
          description: ''
        });
        setBusinessTownQuery('');
        setShowBusinessTownSuggestions(false);
        setFilteredBusinessTowns([]);
        fetchAllData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error registering business:', error);
      alert(error.message || 'Failed to register business. Please try again.');
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
        licenseNumber: doctorFormData.licenceNumber, // Map to American spelling for backend
        phone: doctorFormData.phone,
        address: doctorFormData.address,
        city: doctorFormData.city || 'Not specified', // Use form data or default
        state: doctorFormData.state || 'Not specified', // Use form data or default  
        postcode: doctorFormData.postcode || '00000', // Use form data or default
        bio: doctorFormData.bio || '',
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
          licenceNumber: '',
          phone: '',
          address: '',
          bio: ''
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

  // Handle business town input with autocomplete
  const handleBusinessTownChange = (e) => {
    const value = e.target.value;
    setBusinessTownQuery(value);
    setBusinessFormData(prev => ({
      ...prev,
      town: value
    }));

    if (value.length > 0) {
      const filtered = ukTownsAndCounties.filter(location =>
        location.town.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredBusinessTowns(filtered);
      setShowBusinessTownSuggestions(true);
    } else {
      setShowBusinessTownSuggestions(false);
      setFilteredBusinessTowns([]);
      // Clear county when town is cleared
      setBusinessFormData(prev => ({
        ...prev,
        county: ''
      }));
    }
  };

  // Handle business town selection from suggestions
  const handleBusinessTownSelect = (townData) => {
    setBusinessTownQuery(townData.town);
    setBusinessFormData(prev => ({
      ...prev,
      town: townData.town,
      county: townData.county
    }));
    setShowBusinessTownSuggestions(false);
    setFilteredBusinessTowns([]);
  };

  // Handle getting business location
  const handleGetBusinessLocation = async () => {
    setBusinessLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setBusinessFormData(prev => ({
        ...prev,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      }));
    } catch (error) {
      alert('Unable to get location. Please enter coordinates manually.');
    } finally {
      setBusinessLocationLoading(false);
    }
  };

  // Filter functions for search functionality only
  // Filter functions for search
  const filteredDoctors = doctors.filter(doctor => {
    if (!searchTerm) return true;
    
    // Handle both direct properties and nested attributes structure
    const firstName = doctor.firstName || doctor.attributes?.firstName || '';
    const lastName = doctor.lastName || doctor.attributes?.lastName || '';
    const email = doctor.email || doctor.attributes?.email || '';
    const licenceNumber = doctor.licenseNumber || doctor.licenceNumber || doctor.attributes?.licenseNumber || doctor.attributes?.licenceNumber || '';
    
    const search = searchTerm.toLowerCase();
    return `${firstName} ${lastName}`.toLowerCase().includes(search) ||
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

  const filteredBusinessTypes = businessTypes.filter(businessType => {
    if (!searchTerm) return true;
    const name = businessType.attributes?.name || businessType.name || '';
    const value = businessType.attributes?.value || businessType.value || '';
    const description = businessType.attributes?.description || businessType.description || '';
    const status = businessType.attributes?.isActive || businessType.isActive ? 'active' : 'inactive';
    const search = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(search) ||
           value.toLowerCase().includes(search) ||
           description.toLowerCase().includes(search) ||
           status.includes(search);
  });

  // Pagination calculations for services
  const totalServicesPages = Math.ceil(filteredServices.length / servicesPerPage);
  const servicesStartIndex = (servicesCurrentPage - 1) * servicesPerPage;
  const servicesEndIndex = servicesStartIndex + servicesPerPage;
  const paginatedServices = filteredServices.slice(servicesStartIndex, servicesEndIndex);

  // Pagination calculations for business types
  const totalBusinessTypesPages = Math.ceil(filteredBusinessTypes.length / businessTypesPerPage);
  const businessTypesStartIndex = (businessTypesCurrentPage - 1) * businessTypesPerPage;
  const businessTypesEndIndex = businessTypesStartIndex + businessTypesPerPage;
  const paginatedBusinessTypes = filteredBusinessTypes.slice(businessTypesStartIndex, businessTypesEndIndex);

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
    
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return `${doctorFirstName} ${doctorLastName}`.toLowerCase().includes(searchLower);
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
    console.log('🆔 Doctor ID for API call:', doctor.id);
    console.log('🔍 Current showDoctorDetails state:', showDoctorDetails);
    console.log('🔍 Current selectedDoctor state:', selectedDoctor);
    setSelectedDoctor(doctor);
    setShowDoctorDetails(true);
    // Load compliance documents and professional references for this doctor
    loadComplianceDocuments(doctor.id);
    loadProfessionalReferences(doctor.id);
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
    setComplianceDocuments([]);
    setProfessionalReferences([]);
  };

  // Compliance Documents Configuration - Now loaded from API
  // Document types will be loaded from the backend
  
  // Load compliance document types from API
  const loadDocumentTypes = async (retryCount = 0) => {
    console.log('🚀 loadDocumentTypes function called, retry:', retryCount);
    
    // Set loading to true when starting manual load
    if (retryCount === 0) {
      setDocumentTypesLoading(true);
    }
    
    try {
      console.log('🔄 Loading document types from API...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types`);
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Document types received:', data.data?.length || 0);
        console.log('📋 Document types data:', data.data);
        
        // Check if data.data exists and is an array
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log('✅ Setting document types from API:', data.data.length);
          setDocumentTypes(data.data);
          setDocumentTypesLoading(false);
        } else {
          console.log('⚠️ API returned empty data, using fallback');
          const fallbackTypes = [
            { key: 'gmc_registration', name: 'GMC Registration', required: true, description: '' },
            { key: 'medical_indemnity', name: 'Medical Indemnity', required: true, description: '' },
            { key: 'dbs_check', name: 'DBS Check', required: true, description: '' },
            { key: 'right_to_work', name: 'Right to Work', required: true, description: '' },
            { key: 'photo_id', name: 'Photo ID', required: true, description: '' }
          ];
          setDocumentTypes(fallbackTypes);
          setDocumentTypesLoading(false);
        }
      } else {
        console.error('❌ API request failed with status:', response.status);
        
        // Retry up to 3 times for failed requests during initial load
        if (retryCount < 3) {
          console.log(`🔄 Retrying in 2 seconds... (attempt ${retryCount + 1}/3)`);
          setTimeout(() => loadDocumentTypes(retryCount + 1), 2000);
          return;
        }
        
        // Fallback to default types if API fails after retries
        const fallbackTypes = [
          { key: 'gmc_registration', name: 'GMC Registration', required: true, description: '' },
          { key: 'medical_indemnity', name: 'Medical Indemnity', required: true, description: '' },
          { key: 'dbs_check', name: 'DBS Check', required: true, description: '' },
          { key: 'right_to_work', name: 'Right to Work', required: true, description: '' },
          { key: 'photo_id', name: 'Photo ID', required: true, description: '' }
        ];
        setDocumentTypes(fallbackTypes);
        setDocumentTypesLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading document types:', error);
      
      // Retry up to 3 times for network errors during initial load
      if (retryCount < 3) {
        console.log(`🔄 Retrying in 2 seconds due to error... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => loadDocumentTypes(retryCount + 1), 2000);
        return;
      }
      
      // Fallback to default types
      const fallbackTypes = [
        { key: 'gmc_registration', name: 'GMC Registration', required: true, description: '' },
        { key: 'medical_indemnity', name: 'Medical Indemnity', required: true, description: '' },
        { key: 'dbs_check', name: 'DBS Check', required: true, description: '' },
        { key: 'right_to_work', name: 'Right to Work', required: true, description: '' },
        { key: 'photo_id', name: 'Photo ID', required: true, description: '' }
      ];
      setDocumentTypes(fallbackTypes);
      setDocumentTypesLoading(false);
    }
    
    // Force a re-render to see current state
    console.log('🔍 Function complete, checking documentTypes state...');
  };

  // Handle document type form changes
  const handleDocumentTypeFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDocumentTypeFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Generate document key from display name
  const generateDocumentKey = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  // Handle document type submission
  const handleDocumentTypeSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      console.log('📝 Document type form submission started');
      console.log('📝 Form data:', documentTypeFormData);
      console.log('✏️ Editing document type:', editingDocumentType);

      // Auto-generate key from name if creating new document type
      const documentKey = editingDocumentType 
        ? editingDocumentType.key // Keep existing key when editing
        : generateDocumentKey(documentTypeFormData.name);

      console.log('🔑 Using document key:', documentKey);

      let response;
      if (editingDocumentType) {
        // Update existing document type - use numeric ID for Strapi v5
        const documentId = editingDocumentType.id; // Use numeric ID, not documentId
        console.log('📝 Updating document type with numeric ID:', documentId);
        
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types/${documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              key: documentKey,
              name: documentTypeFormData.name,
              required: documentTypeFormData.required,
              description: documentTypeFormData.description,
              autoExpiry: documentTypeFormData.autoExpiry,
              validityYears: documentTypeFormData.autoExpiry ? documentTypeFormData.validityYears : null,
              expiryWarningDays: documentTypeFormData.autoExpiry ? documentTypeFormData.expiryWarningDays : 30
            }
          })
        });
        
        console.log('📡 Update response status:', response.status);
      } else {
        // Create new document type
        console.log('🆕 Creating new document type');
        
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              key: documentKey,
              name: documentTypeFormData.name,
              required: documentTypeFormData.required,
              description: documentTypeFormData.description,
              autoExpiry: documentTypeFormData.autoExpiry,
              validityYears: documentTypeFormData.autoExpiry ? documentTypeFormData.validityYears : null,
              expiryWarningDays: documentTypeFormData.autoExpiry ? documentTypeFormData.expiryWarningDays : 30
            }
          })
        });
        
        console.log('📡 Create response status:', response.status);
      }

      const responseData = await response.json();
      console.log('📦 Response data:', responseData);

      if (response.ok) {
        console.log('✅ Document type operation successful');
        alert(editingDocumentType ? 'Document type updated successfully!' : 'Document type created successfully!');
        setShowDocumentTypeForm(false);
        setEditingDocumentType(null);
        setDocumentTypeFormData({
          name: '',
          required: true,
          description: '',
          autoExpiry: false,
          validityYears: 1,
          expiryWarningDays: 30
        });
        
        // Reload document types to reflect changes
        console.log('🔄 Reloading document types...');
        await loadDocumentTypes(0); // Reset retry count
      } else {
        console.error('❌ API request failed:', response.status, responseData);
        throw new Error(responseData.error?.message || responseData.message || 'Failed to save document type');
      }
    } catch (error) {
      console.error('❌ Error saving document type:', error);
      alert(`Failed to save document type: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Handle edit document type
  const handleEditDocumentType = (documentType) => {
    setEditingDocumentType(documentType);
    setDocumentTypeFormData({
      name: documentType.name,
      required: documentType.required,
      description: documentType.description || '',
      autoExpiry: documentType.autoExpiry || false,
      validityYears: documentType.validityYears || 1,
      expiryWarningDays: documentType.expiryWarningDays || 30
    });
    setShowDocumentTypeForm(true);
  };

  // Handle delete document type
  const handleDeleteDocumentType = async (documentType) => {
    console.log('🗑️ Delete document type requested:', documentType);
    
    if (!confirm(`Are you sure you want to delete the document type "${documentType.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDataLoading(true);
      const documentId = documentType.id; // Use numeric ID, not documentId
      console.log('🗑️ Deleting document type with numeric ID:', documentId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types/${documentId}`, {
        method: 'DELETE'
      });

      console.log('📡 Delete response status:', response.status);

      if (response.ok) {
        console.log('✅ Document type deleted successfully');
        alert('Document type deleted successfully!');
        
        // Reload document types to reflect changes
        console.log('🔄 Reloading document types after deletion...');
        await loadDocumentTypes(0); // Reset retry count
      } else {
        // Try to get error details
        let responseData;
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = { message: 'Unknown error' };
        }
        console.error('❌ Delete request failed:', response.status, responseData);
        throw new Error(responseData.error?.message || responseData.message || 'Failed to delete document type');
      }
    } catch (error) {
      console.error('❌ Error deleting document type:', error);
      alert(`Failed to delete document type: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Handle enabling auto-expiry for all documents
  const handleEnableAutoExpiryForAll = async () => {
    if (!confirm('This will enable auto-expiry tracking for ALL compliance documents. This action will update existing document types and calculate expiry dates for existing documents. Do you want to continue?')) {
      return;
    }

    try {
      setDataLoading(true);
      console.log('🚀 Starting auto-expiry migration...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types/enable-auto-expiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Auto-expiry migration completed:', result);
        
        alert(`Auto-expiry tracking enabled successfully!\n\n` +
              `Document Types Updated: ${result.result?.documentTypesUpdated || 0}\n` +
              `Documents Updated: ${result.result?.documentsUpdated || 0}\n\n` +
              `All documents now have automatic expiry tracking enabled.`);
        
        // Reload document types to reflect changes
        await loadDocumentTypes(0);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enable auto-expiry');
      }
    } catch (error) {
      console.error('❌ Error enabling auto-expiry:', error);
      alert(`Failed to enable auto-expiry: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Load compliance documents for a doctor
  const loadComplianceDocuments = async (doctorId) => {
    try {
      console.log('🔍 Loading compliance documents for doctor ID:', doctorId);
      setLoadingDocuments(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/doctor/${doctorId}`);
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 API Response data:', data);
        setComplianceDocuments(data.data?.documents || []);
        console.log('✅ Compliance documents set:', data.data?.documents || []);
      } else {
        console.error('❌ Failed to load compliance documents, status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        setComplianceDocuments([]);
      }
    } catch (error) {
      console.error('❌ Error loading compliance documents:', error);
      setComplianceDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Load professional references for a doctor
  const loadProfessionalReferences = async (doctorId) => {
    try {
      console.log('🔍 Loading professional references for doctor ID:', doctorId);
      setLoadingReferences(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professional-references/doctor/${doctorId}`);
      console.log('📡 Professional References API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Professional References API Response data:', data);
        setProfessionalReferences(data.data?.references || []);
        console.log('✅ Professional references set:', data.data?.references || []);
      } else {
        console.error('❌ Failed to load professional references, status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        setProfessionalReferences([]);
      }
    } catch (error) {
      console.error('❌ Error loading professional references:', error);
      setProfessionalReferences([]);
    } finally {
      setLoadingReferences(false);
    }
  };

  // Handle document verification
  const handleDocumentVerification = async (documentId, verificationStatus) => {
    try {
      setUpdatingVerification(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/${documentId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationStatus,
          notes: `${verificationStatus === 'verified' ? 'Approved' : 'Rejected'} by admin via dashboard`
        })
      });

      if (response.ok) {
        // Refresh documents
        if (selectedDoctor) {
          await loadComplianceDocuments(selectedDoctor.id);
        }
        setShowDocumentModal(false);
        setSelectedDocument(null);
      } else {
        console.error('Failed to update verification status');
        alert('Failed to update verification status');
      }
    } catch (error) {
      console.error('Error updating verification status:', error);
      alert('Error updating verification status');
    } finally {
      setUpdatingVerification(false);
    }
  };

  // Get document status info
  const getDocumentStatus = (status, verificationStatus) => {
    if (status === 'missing') {
      return { variant: 'danger', text: 'Missing', color: 'bg-red-100 text-red-800 border-red-200' };
    }
    
    if (status === 'uploaded') {
      switch (verificationStatus) {
        case 'verified':
          return { variant: 'success', text: 'Verified', color: 'bg-green-100 text-green-800 border-green-200' };
        case 'rejected':
          return { variant: 'danger', text: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' };
        case 'pending':
        default:
          return { variant: 'warning', text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      }
    }
    
    return { variant: 'neutral', text: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  // Get all documents with their statuses
  const getAllDocumentsWithStatus = () => {
    // Ensure complianceDocuments is always an array
    const documents = Array.isArray(complianceDocuments) ? complianceDocuments : [];
    
    // Filter out Professional References from document types as it's handled separately
    const filteredDocumentTypes = documentTypes.filter(docType => docType.key !== 'professional_references');
    
    return filteredDocumentTypes.map(docType => {
      const uploadedDoc = documents.find(doc => doc.documentType === docType.key);
      let status = uploadedDoc ? uploadedDoc.status : 'missing';
      let expiryStatus = null;
      let daysUntilExpiry = null;
      
      // Calculate expiry status for documents with auto-expiry enabled
      if (uploadedDoc && docType.autoExpiry && uploadedDoc.expiryDate) {
        const today = new Date();
        const expiryDate = new Date(uploadedDoc.expiryDate);
        daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          expiryStatus = 'expired';
          status = 'expired'; // Override status if document is expired
        } else if (daysUntilExpiry <= (docType.expiryWarningDays || 30)) {
          expiryStatus = 'expiring';
        } else {
          expiryStatus = 'valid';
        }
      }
      
      return {
        type: docType.key,
        config: docType,
        document: uploadedDoc,
        status: status,
        expiryStatus: expiryStatus,
        daysUntilExpiry: daysUntilExpiry,
        verificationStatus: uploadedDoc?.verificationStatus || 'pending'
      };
    });
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

  // Pagination component for services
  const ServicesPagination = () => (
    <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'} border-t flex items-center justify-between`}>
      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {servicesStartIndex + 1} to {Math.min(servicesEndIndex, filteredServices.length)} of {filteredServices.length} services
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setServicesCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={servicesCurrentPage === 1}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            servicesCurrentPage === 1
              ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Previous
        </button>
        <span className={`px-3 py-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Page {servicesCurrentPage} of {totalServicesPages}
        </span>
        <button
          onClick={() => setServicesCurrentPage(prev => Math.min(prev + 1, totalServicesPages))}
          disabled={servicesCurrentPage === totalServicesPages}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            servicesCurrentPage === totalServicesPages
              ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Pagination component for business types
  const BusinessTypesPagination = () => (
    <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'} border-t flex items-center justify-between`}>
      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {businessTypesStartIndex + 1} to {Math.min(businessTypesEndIndex, filteredBusinessTypes.length)} of {filteredBusinessTypes.length} business types
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setBusinessTypesCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={businessTypesCurrentPage === 1}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            businessTypesCurrentPage === 1
              ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Previous
        </button>
        <span className={`px-3 py-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Page {businessTypesCurrentPage} of {totalBusinessTypesPages}
        </span>
        <button
          onClick={() => setBusinessTypesCurrentPage(prev => Math.min(prev + 1, totalBusinessTypesPages))}
          disabled={businessTypesCurrentPage === totalBusinessTypesPages}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            businessTypesCurrentPage === totalBusinessTypesPages
              ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );

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
              {/* Admin Notification Center */}
              <AdminNotificationCenter />
              
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
                  activeTab === 'transactions' ? "Search transactions by payment ID, doctor ID..." :
                  activeTab === 'earnings' ? "Search by doctor name..." :
                  activeTab === 'compliance-documents' ? "Search document types by name..." :
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
              { id: 'transactions', name: 'Transactions', icon: CreditCard },
              { id: 'earnings', name: 'Doctor Earnings', icon: DollarSign },
              { id: 'compliance-documents', name: 'Compliance Documents', icon: FileText },
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
                    const isVerified = doctor.isVerified || doctor.attributes?.isVerified;
                    const isAvailable = doctor.isAvailable || doctor.attributes?.isAvailable;
                    const city = doctor.city || doctor.attributes?.city;
                    const state = doctor.state || doctor.attributes?.state;
                    
                    // Check if this doctor is focused from notification
                    const isFocused = focusedDoctorId && (id.toString() === focusedDoctorId.toString());
                    
                    return (
                      <tr key={id} className={`transition-all duration-500 ${
                        isFocused 
                          ? (isDarkMode ? 'bg-blue-900/30 hover:bg-blue-800/40 ring-2 ring-blue-500/50' : 'bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-400/50')
                          : (isDarkMode ? 'bg-gray-900 hover:bg-gray-800/50' : 'bg-white hover:bg-gray-50')
                      }`}>
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
                    console.log('🆕 Add New Service button clicked');
                    setEditingService(null);
                    setServiceFormData({
                      name: '',
                      description: '',
                      category: 'in-person',
                      serviceType: 'subcategory',
                      price: '',
                      duration: '',
                      isActive: true,
                      displayOrder: services.length,
                      parentService: null
                    });
                    setShowServiceForm(true);
                    console.log('🆕 Service form should now be visible');
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
                      Type
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Category
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Price
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Duration
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
                  {paginatedServices.length > 0 ? paginatedServices.map((service) => {
                    const id = service.id;
                    const documentId = service.documentId;
                    const name = service.attributes?.name || service.name;
                    const category = service.attributes?.category || service.category;
                    const serviceType = service.attributes?.serviceType || service.serviceType || 'subcategory';
                    const price = service.attributes?.price || service.price || 0;
                    const duration = service.attributes?.duration || service.duration || 0;
                    const isActive = service.attributes?.isActive || service.isActive;
                    const displayOrder = service.attributes?.displayOrder || service.displayOrder || 0;

                    return (
                      <tr key={id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{name}</div>
                              {service.attributes?.description || service.description ? (
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate max-w-xs`}>
                                  {service.attributes?.description || service.description}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            serviceType === 'main' 
                              ? isDarkMode ? 'bg-purple-900/40 text-purple-400 border border-purple-900' : 'bg-purple-100 text-purple-700 border border-purple-300'
                              : isDarkMode ? 'bg-orange-900/40 text-orange-400 border border-orange-900' : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}>
                            {serviceType === 'main' ? 'Parent' : 'Subcategory'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            category === 'in-person' 
                              ? isDarkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-900' : 'bg-blue-100 text-blue-700 border border-blue-300'
                              : category === 'online'
                              ? isDarkMode ? 'bg-green-900/40 text-green-400 border border-green-900' : 'bg-green-100 text-green-700 border border-green-300'
                              : isDarkMode ? 'bg-purple-900/40 text-purple-400 border border-purple-900' : 'bg-purple-100 text-purple-700 border border-purple-300'
                          }`}>
                            {category === 'in-person' ? (
                              <>
                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                In-Person
                              </>
                            ) : category === 'online' ? (
                              <>
                                <Globe className="h-3.5 w-3.5 mr-1" />
                                Online
                              </>
                            ) : (
                              <>
                                <Shield className="h-3.5 w-3.5 mr-1" />
                                NHS
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isDarkMode ? 'bg-green-900/40 text-green-400 border border-green-900' : 'bg-green-100 text-green-700 border border-green-300'
                          }`}>
                            <DollarSign className="h-3.5 w-3.5 mr-1" />
                            £{parseFloat(price).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {duration > 0 ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              isDarkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-900' : 'bg-blue-100 text-blue-700 border border-blue-300'
                            }`}>
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              {duration}m
                            </span>
                          ) : (
                            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                          )}
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
                              onClick={() => handleDeleteService(service)}
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
                      <td colSpan="7" className="px-6 py-8 text-center">
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
            
            {filteredServices.length > 0 && <ServicesPagination />}
          <div className={`mt-8 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Building2 className="h-5 w-5 text-indigo-500 mr-2" />
                  Business Types
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage available business types for registration</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <button
                  onClick={() => {
                    setEditingBusinessType(null);
                    setBusinessTypeFormData({
                      name: '',
                      value: '',
                      description: '',
                      isActive: true,
                      displayOrder: businessTypes.length
                    });
                    setShowBusinessTypeForm(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Business Type
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
                      Value
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
                  {paginatedBusinessTypes.length > 0 ? paginatedBusinessTypes.map((businessType) => {
                    const id = businessType.id;
                    const documentId = businessType.documentId;
                    const name = businessType.attributes?.name || businessType.name;
                    const value = businessType.attributes?.value || businessType.value;
                    const description = businessType.attributes?.description || businessType.description;
                    const isActive = businessType.attributes?.isActive !== undefined ? businessType.attributes.isActive : businessType.isActive;
                    const displayOrder = businessType.attributes?.displayOrder || businessType.displayOrder || 0;

                    return (
                      <tr key={id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{name}</div>
                              {description && (
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                            {value}
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
                              onClick={() => handleEditBusinessType(businessType)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                              }`}
                            >
                              <Eye className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            </button>
                            <button
                              onClick={() => handleDeleteBusinessType(id, documentId)}
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
                          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No business types found</h3>
                          <p className="max-w-md mx-auto">
                            {searchTerm ? 
                              'Try adjusting your search criteria to find what you\'re looking for.' :
                              'No business types have been added yet. Click the "Add Business Type" button to create one.'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredBusinessTypes.length > 0 && <BusinessTypesPagination />}
          </div>
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
                              onChange={handleServiceFormChange}
                              rows={3}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                              onChange={handleServiceFormChange}
                              required
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="in-person">In-Person</option>
                              <option value="online">Online</option>
                              <option value="nhs">NHS</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Price (£) *
                              </label>
                              <input
                                type="number"
                                name="price"
                                value={serviceFormData.price}
                                onChange={handleServiceFormChange}
                                min="0"
                                step="0.01"
                                required
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Duration (minutes)
                              </label>
                              <input
                                type="number"
                                name="duration"
                                value={serviceFormData.duration}
                                onChange={handleServiceFormChange}
                                min="0"
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder="60"
                              />
                            </div>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Display Order
                            </label>
                            <input
                              type="number"
                              name="displayOrder"
                              value={serviceFormData.displayOrder}
                              onChange={handleServiceFormChange}
                              min={0}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                              onChange={handleServiceFormChange}
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

        {/* Business Type Form Modal */}
        {showBusinessTypeForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowBusinessTypeForm(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50 ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
                <form onSubmit={handleBusinessTypeSubmit}>
                  <div className={`px-6 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <div className="flex justify-between items-center">
                          <h3 className={`text-lg font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {editingBusinessType ? 'Edit Business Type' : 'Add New Business Type'}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowBusinessTypeForm(false)}
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
                              Business Type Name *
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={businessTypeFormData.name}
                              onChange={handleBusinessTypeFormChange}
                              required
                              autoFocus
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              placeholder="e.g., Pharmacy, Clinic, Hospital"
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Value (Identifier) *
                            </label>
                            <input
                              type="text"
                              name="value"
                              value={businessTypeFormData.value}
                              onChange={handleBusinessTypeFormChange}
                              required
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              placeholder="e.g., pharmacy, clinic, hospital"
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Description
                            </label>
                            <textarea
                              name="description"
                              value={businessTypeFormData.description}
                              onChange={handleBusinessTypeFormChange}
                              rows={3}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              placeholder="Brief description of this business type"
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Display Order
                            </label>
                            <input
                              type="number"
                              name="displayOrder"
                              value={businessTypeFormData.displayOrder}
                              onChange={handleBusinessTypeFormChange}
                              min={0}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                              checked={businessTypeFormData.isActive}
                              onChange={handleBusinessTypeFormChange}
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
                          ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                          : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                      } ${dataLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {dataLoading ? 'Saving...' : editingBusinessType ? 'Save Changes' : 'Add Business Type'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBusinessTypeForm(false)}
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

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <TransactionHistory />
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

        {/* Compliance Document Types Management Tab */}
        {activeTab === 'compliance-documents' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'} p-2 rounded-lg`}>
                    <FileText className={`h-5 w-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Compliance Document Types</h2>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage required document types for doctor compliance</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEnableAutoExpiryForAll}
                    disabled={dataLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Clock className="h-4 w-4" />
                    <span>Enable Auto-Expiry for All</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingDocumentType(null);
                      setDocumentTypeFormData({
                        name: '',
                        required: true,
                        description: '',
                        autoExpiry: true, // Default to auto-expiry enabled
                        validityYears: 3, // Default to 3 years
                        expiryWarningDays: 30
                      });
                      setShowDocumentTypeForm(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Document Type</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {documentTypesLoading ? (
                <div className="text-center py-12">
                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-xl p-8`}>
                    <div className="flex items-center justify-center mb-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                    <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading Document Types</h3>
                    <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Please wait while we load the compliance document types...
                    </p>
                  </div>
                </div>
              ) : documentTypes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentTypes.map((docType) => (
                    <div
                      key={docType.key || docType.id}
                      className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-lg p-4 border hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <FileText className={`h-5 w-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{docType.name}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            docType.required 
                              ? isDarkMode 
                                ? 'bg-red-900/30 text-red-400' 
                                : 'bg-red-100 text-red-700'
                              : isDarkMode 
                                ? 'bg-green-900/30 text-green-400' 
                                : 'bg-green-100 text-green-700'
                          }`}>
                            {docType.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Key:</span> {docType.key}
                        </p>
                        {docType.description && (
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {docType.description}
                          </p>
                        )}
                        {docType.autoExpiry ? (
                          <div className={`p-2 rounded ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                              <span className="font-medium">Auto-Expiry:</span> {docType.validityYears} year{docType.validityYears > 1 ? 's' : ''} validity
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-blue-400/80' : 'text-blue-600'}`}>
                              Warning: {docType.expiryWarningDays || 30} days before expiry
                            </p>
                          </div>
                        ) : (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            No automatic expiry tracking
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditDocumentType(docType)}
                          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                            isDarkMode 
                              ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDocumentType(docType)}
                          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                            isDarkMode 
                              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-xl p-8`}>
                    <FileText className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No document types found</h3>
                    <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No compliance document types have been created yet. Click the "Add Document Type" button to create one.
                    </p>
                    <button
                      onClick={() => {
                        setEditingDocumentType(null);
                        setDocumentTypeFormData({
                          name: '',
                          required: true,
                          description: '',
                          autoExpiry: false,
                          validityYears: 1,
                          expiryWarningDays: 30
                        });
                        setShowDocumentTypeForm(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Document Type</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Type Form Modal */}
      {showDocumentTypeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-500 mr-2" />
                {editingDocumentType ? 'Edit Document Type' : 'Add Document Type'}
              </h2>
              <button
                onClick={() => setShowDocumentTypeForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleDocumentTypeSubmit} className="p-6 space-y-6">
              <div>
                <label htmlFor="documentTypeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  id="documentTypeName"
                  name="name"
                  value={documentTypeFormData.name}
                  onChange={handleDocumentTypeFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                  placeholder="e.g., GMC Registration, Medical Indemnity"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  A unique key will be automatically generated from this name.
                </p>
              </div>
              
              <div>
                <label htmlFor="documentTypeDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="documentTypeDescription"
                  name="description"
                  value={documentTypeFormData.description}
                  onChange={handleDocumentTypeFormChange}
                  rows="3"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                  placeholder="Optional description of what this document is for..."
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="documentTypeRequired"
                  name="required"
                  checked={documentTypeFormData.required}
                  onChange={handleDocumentTypeFormChange}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="documentTypeRequired" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  This document is required for compliance
                </label>
              </div>

              {/* Expiry Management Section */}
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="documentTypeAutoExpiry"
                    name="autoExpiry"
                    checked={documentTypeFormData.autoExpiry}
                    onChange={handleDocumentTypeFormChange}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="documentTypeAutoExpiry" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable automatic expiry tracking
                  </label>
                </div>
                
                {documentTypeFormData.autoExpiry && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="validityYears" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Validity Period (Years) *
                      </label>
                      <select
                        id="validityYears"
                        name="validityYears"
                        value={documentTypeFormData.validityYears}
                        onChange={handleDocumentTypeFormChange}
                        required={documentTypeFormData.autoExpiry}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                      >
                        <option value={1}>1 Year</option>
                        <option value={2}>2 Years</option>
                        <option value={3}>3 Years</option>
                        <option value={4}>4 Years</option>
                        <option value={5}>5 Years</option>
                        <option value={10}>10 Years</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="expiryWarningDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Warning Period (Days)
                      </label>
                      <select
                        id="expiryWarningDays"
                        name="expiryWarningDays"
                        value={documentTypeFormData.expiryWarningDays}
                        onChange={handleDocumentTypeFormChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                      >
                        <option value={7}>7 Days</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={60}>60 Days</option>
                        <option value={90}>90 Days</option>
                      </select>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {documentTypeFormData.autoExpiry 
                    ? `Documents will automatically expire ${documentTypeFormData.validityYears} year(s) after issue date and show warning ${documentTypeFormData.expiryWarningDays} days before expiry.`
                    : 'Enable expiry tracking for documents that have a validity period (e.g., training certificates, licenses).'
                  }
                </p>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDocumentTypeForm(false)}
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      {editingDocumentType ? 'Update Document Type' : 'Create Document Type'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <label htmlFor="doctorlicenceNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GMC Number *
                  </label>
                  <input
                    type="text"
                    id="doctorlicenceNumber"
                    name="licenceNumber"
                    value={doctorFormData.licenceNumber}
                    onChange={handleDoctorFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter GMC number"
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
              
              {/* Location Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location Information</h3>
                
                <div>
                  <label htmlFor="businessAddressLine1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    id="businessAddressLine1"
                    name="addressLine1"
                    value={businessFormData.addressLine1}
                    onChange={handleBusinessFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="House number and street name"
                  />
                </div>

                <div>
                  <label htmlFor="businessAddressLine2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    id="businessAddressLine2"
                    name="addressLine2"
                    value={businessFormData.addressLine2}
                    onChange={handleBusinessFormChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Apartment, suite, unit, building, floor, etc. (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative">
                    <label htmlFor="businessTown" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Town/City *
                    </label>
                    <input
                      type="text"
                      id="businessTown"
                      name="town"
                      value={businessTownQuery}
                      onChange={handleBusinessTownChange}
                      onFocus={() => businessTownQuery.length > 0 && setShowBusinessTownSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBusinessTownSuggestions(false), 200)}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                      placeholder="Start typing town or city..."
                      autoComplete="off"
                    />
                    {showBusinessTownSuggestions && filteredBusinessTowns.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
                        {filteredBusinessTowns.map((townData, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                            onClick={() => handleBusinessTownSelect(townData)}
                          >
                            <div className="font-medium">{townData.town}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {townData.county}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="businessCounty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      County *
                    </label>
                    <input
                      type="text"
                      id="businessCounty"
                      name="county"
                      value={businessFormData.county}
                      onChange={handleBusinessFormChange}
                      required
                      className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500 ${
                        businessFormData.county ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
                      }`}
                      placeholder="County (auto-filled)"
                      readOnly={!!businessFormData.county}
                    />
                  </div>
                  <div>
                    <label htmlFor="businessPostcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      id="businessPostcode"
                      name="postcode"
                      value={businessFormData.postcode}
                      onChange={handleBusinessFormChange}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                      placeholder="Enter postcode"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="businessLatitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Latitude * (Auto-filled)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="businessLatitude"
                      name="latitude"
                      value={businessFormData.latitude}
                      onChange={handleBusinessFormChange}
                      required
                      readOnly
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                      placeholder="Use 'Get Current Location' button"
                    />
                  </div>
                  <div>
                    <label htmlFor="businessLongitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Longitude * (Auto-filled)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="businessLongitude"
                      name="longitude"
                      value={businessFormData.longitude}
                      onChange={handleBusinessFormChange}
                      required
                      readOnly
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                      placeholder="Use 'Get Current Location' button"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGetBusinessLocation}
                  disabled={businessLocationLoading}
                  className="inline-flex items-center px-4 py-2 border border-purple-500 text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {businessLocationLoading ? 'Getting Location...' : 'Get My Location'}
                </button>
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
                      Medical Professional
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
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>License Number:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDoctor.licenseNumber || selectedDoctor.licenceNumber || 'N/A'}</span>
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

              {/* Compliance Documents Section */}
              <div className="mt-8">
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Compliance Documents
                    </h3>
                    {loadingDocuments && (
                      <div className="flex items-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</span>
                      </div>
                    )}
                  </div>

                  {!loadingDocuments && Array.isArray(complianceDocuments) && (
                    <>
                      {/* Documents Summary */}
                      <div className="grid grid-cols-5 gap-4 mb-6">
                        {(() => {
                          try {
                            const allDocs = getAllDocumentsWithStatus();
                            const uploadedCount = allDocs.filter(doc => doc.status === 'uploaded' || doc.status === 'verified').length;
                            const verifiedCount = allDocs.filter(doc => doc.verificationStatus === 'verified').length;
                            const pendingCount = allDocs.filter(doc => doc.verificationStatus === 'pending' && doc.status === 'uploaded').length;
                            const missingCount = allDocs.filter(doc => doc.status === 'missing').length;
                            const expiredCount = allDocs.filter(doc => doc.expiryStatus === 'expired' || doc.status === 'expired').length;
                            const expiringCount = allDocs.filter(doc => doc.expiryStatus === 'expiring').length;

                            return (
                              <>
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                    {uploadedCount}
                                  </div>
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Uploaded</div>
                                </div>
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    {verifiedCount}
                                  </div>
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Verified</div>
                                </div>
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                    {pendingCount}
                                  </div>
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending</div>
                                </div>
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                    {expiringCount}
                                  </div>
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Expiring</div>
                                </div>
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                    {expiredCount > 0 ? expiredCount : missingCount}
                                  </div>
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {expiredCount > 0 ? 'Expired' : 'Missing'}
                                  </div>
                                </div>
                              </>
                            );
                          } catch (error) {
                            console.error('Error calculating document stats:', error);
                            return (
                              <div className="col-span-4 text-center">
                                <span className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  Error loading document statistics
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* Documents Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(() => {
                          try {
                            return getAllDocumentsWithStatus().map(({ type, config, document, status, expiryStatus, daysUntilExpiry, verificationStatus }) => {
                              // Determine the display status - prioritize expiry status over verification status
                              let displayStatus = status;
                              let statusText = status;
                              let statusColor = '';
                              
                              if (expiryStatus === 'expired') {
                                displayStatus = 'expired';
                                statusText = 'Expired';
                                statusColor = isDarkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200';
                              } else if (expiryStatus === 'expiring') {
                                displayStatus = 'expiring';
                                statusText = `Expires in ${daysUntilExpiry} days`;
                                statusColor = isDarkMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200';
                              } else if (verificationStatus === 'verified') {
                                statusText = 'Verified';
                                statusColor = isDarkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200';
                              } else if (verificationStatus === 'pending' && status === 'uploaded') {
                                statusText = 'Pending Review';
                                statusColor = isDarkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200';
                              } else if (status === 'missing') {
                                statusText = 'Missing';
                                statusColor = isDarkMode ? 'bg-gray-900/30 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-700 border-gray-200';
                              } else {
                                statusText = status.charAt(0).toUpperCase() + status.slice(1);
                                statusColor = isDarkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200';
                              }
                              
                              return (
                                <div
                                  key={type}
                                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border rounded-lg p-4 transition-all duration-200 ${
                                    document ? 'cursor-pointer hover:shadow-md' : 'opacity-60'
                                  }`}
                                  onClick={() => document && setSelectedDocument(document) && setShowDocumentModal(true)}
                                >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                                    {config.name}
                                  </h4>
                                  {config.required && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                                      Required
                                    </span>
                                  )}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full border ${statusColor}`}>
                                  {statusText}
                                </span>
                              </div>
                              
                              {document && (
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                                  <div>Uploaded: {new Date(document.uploadedAt).toLocaleDateString('en-GB')}</div>
                                  {document.expiryDate && (
                                    <div className={expiryStatus === 'expired' ? 'text-red-500 font-medium' : expiryStatus === 'expiring' ? 'text-orange-500 font-medium' : ''}>
                                      Expires: {new Date(document.expiryDate).toLocaleDateString('en-GB')}
                                      {daysUntilExpiry !== null && (
                                        <span className="ml-1">
                                          ({daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} days ago` : `${daysUntilExpiry} days left`})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {document.verifiedBy && (
                                    <div>Verified by: {document.verifiedBy}</div>
                                  )}
                                  {config.autoExpiry && (
                                    <div className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                      Auto-expiry: {config.validityYears} year{config.validityYears > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {document && (
                                <div className="mt-3 flex justify-between items-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDocument(document);
                                      setShowDocumentModal(true);
                                    }}
                                    className={`text-xs px-3 py-1 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'} transition-colors`}
                                  >
                                    <Eye className="h-3 w-3 inline mr-1" />
                                    View
                                  </button>
                                  
                                  {verificationStatus === 'pending' && expiryStatus !== 'expired' && (
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDocumentVerification(document.id, 'verified');
                                        }}
                                        disabled={updatingVerification}
                                        className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDocumentVerification(document.id, 'rejected');
                                        }}
                                        disabled={updatingVerification}
                                        className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                  
                                  {expiryStatus === 'expired' && (
                                    <div className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}`}>
                                      Document Expired - Requires Renewal
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                          } catch (error) {
                            console.error('Error rendering documents grid:', error);
                            return (
                              <div className="col-span-3 text-center p-8">
                                <span className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  Error loading documents. Please try again.
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Professional References Section */}
              <div className="mt-8">
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Professional References
                    </h3>
                    {loadingReferences && (
                      <div className="flex items-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</span>
                      </div>
                    )}
                  </div>

                  {!loadingReferences && (
                    <>
                      {professionalReferences && professionalReferences.length > 0 ? (
                        <div className="space-y-4">
                          {professionalReferences.map((reference, index) => (
                            <div
                              key={reference.id || index}
                              className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border rounded-lg p-4`}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                                    {reference.firstName} {reference.lastName}
                                  </h4>
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                                    <div><span className="font-medium">Position:</span> {reference.position}</div>
                                    <div><span className="font-medium">Organisation:</span> {reference.organisation}</div>
                                  </div>
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  <div><span className="font-medium">Email:</span> {reference.email}</div>
                                  {reference.createdAt && (
                                    <div className="mt-2">
                                      <span className="font-medium">Added:</span> {new Date(reference.createdAt).toLocaleDateString('en-GB')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-4`} />
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            No professional references have been provided yet.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
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

      {/* Document Viewer Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow max-w-4xl w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-green-900/30' : 'bg-green-600'} p-2 rounded-lg`}>
                    <FileCheck className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-white'}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Document Review
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'} font-medium`}>
                      {documentTypes[selectedDocument.documentType]?.name || selectedDocument.documentType}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setSelectedDocument(null);
                  }}
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
                {/* Document Information */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Document Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Document Name:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-right max-w-xs truncate`}>{selectedDocument.documentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>File Name:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-right max-w-xs truncate`}>{selectedDocument.originalFileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Upload Date:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(selectedDocument.uploadedAt).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>File Size:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{(selectedDocument.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                    {selectedDocument.issueDate && (
                      <div className="flex justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Issue Date:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(selectedDocument.issueDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                    {selectedDocument.expiryDate && (
                      <div className="flex justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Expiry Date:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(selectedDocument.expiryDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Status */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Verification Status</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDocumentStatus(selectedDocument.status, selectedDocument.verificationStatus).color}`}>
                        {getDocumentStatus(selectedDocument.status, selectedDocument.verificationStatus).text}
                      </span>
                    </div>
                    {selectedDocument.verifiedBy && (
                      <div className="flex justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Verified By:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDocument.verifiedBy}</span>
                      </div>
                    )}
                    {selectedDocument.verifiedAt && (
                      <div className="flex justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Verified Date:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(selectedDocument.verifiedAt).toLocaleString('en-GB')}</span>
                      </div>
                    )}
                    {selectedDocument.notes && (
                      <div>
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Notes:</span>
                        <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} mt-1`}>{selectedDocument.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Preview */}
              <div className="mt-6">
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Document Preview</h3>
                  <div className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border rounded-lg p-8 text-center`}>
                    <FileText className={`h-16 w-16 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                    <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                      {selectedDocument.originalFileName}
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                      Click the button below to download and review this document
                    </p>
                    <button
                      onClick={() => window.open(selectedDocument.s3Url, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center mx-auto"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      Review Document
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Actions */}
              <div className="mt-6 flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-3">
                  {selectedDocument.verificationStatus !== 'verified' && (
                    <button
                      onClick={() => handleDocumentVerification(selectedDocument.id, 'verified')}
                      disabled={updatingVerification}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center disabled:opacity-50"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      {updatingVerification ? 'Updating...' : 'Verify Document'}
                    </button>
                  )}
                  {selectedDocument.verificationStatus !== 'rejected' && (
                    <button
                      onClick={() => handleDocumentVerification(selectedDocument.id, 'rejected')}
                      disabled={updatingVerification}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center disabled:opacity-50"
                    >
                      <X className="h-5 w-5 mr-2" />
                      {updatingVerification ? 'Updating...' : 'Reject Document'}
                    </button>
                  )}
                  {selectedDocument.verificationStatus !== 'pending' && (
                    <button
                      onClick={() => handleDocumentVerification(selectedDocument.id, 'pending')}
                      disabled={updatingVerification}
                      className={`px-6 py-3 rounded-lg transition-colors flex items-center disabled:opacity-50 ${
                        isDarkMode ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      {updatingVerification ? 'Updating...' : 'Reset to Pending'}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setSelectedDocument(null);
                  }}
                  className={`px-6 py-3 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors font-medium`}
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
