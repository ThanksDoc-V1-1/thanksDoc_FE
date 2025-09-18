'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Building2, Stethoscope, Check, X, Eye, EyeOff, Search, AlertTriangle, Calendar, Clock, MapPin, DollarSign, Phone, Mail, FileCheck, FileText, RefreshCw, LogOut, Plus, Package, Globe, CreditCard, Settings, Edit, User, UserCog, BarChart, Menu, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { doctorAPI, businessAPI, serviceRequestAPI, serviceAPI, systemSettingsAPI, adminAPI, subscriptionAPI, authAPI, individualTimeSlotsAPI } from '../../../lib/api';
import { formatCurrency, formatDate, formatDuration, getCurrentLocation } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import TransactionHistory from '../../../components/TransactionHistory';
import AdminNotificationCenter from '../../../components/AdminNotificationCenter';

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date) => {
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0');
};

export default function AdminDashboard() {
  const { logout, user, isAuthenticated, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [businessComplianceDocumentTypes, setBusinessComplianceDocumentTypes] = useState([]);
  const [businessComplianceDocumentTypesLoading, setBusinessComplianceDocumentTypesLoading] = useState(true);
  
  // Business document type form management
  const [showBusinessDocumentTypeForm, setShowBusinessDocumentTypeForm] = useState(false);
  const [editingBusinessDocumentType, setEditingBusinessDocumentType] = useState(null);
  const [businessDocumentTypeFormData, setBusinessDocumentTypeFormData] = useState({
    name: '',
    required: true,
    description: '',
    autoExpiry: true,
    validityYears: 1,
    expiryWarningDays: 30,
    allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    maxFileSize: 10485760, // 10MB
    helpText: ''
  });
  
  const [doctorEarnings, setDoctorEarnings] = useState([]);
  const [systemSettings, setSystemSettings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [complianceUsers, setComplianceUsers] = useState([]);
  const [executiveUsers, setExecutiveUsers] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    pastDueSubscriptions: 0,
    monthlyRevenue: 0,
    conversionRate: 0
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedDoctorId, setFocusedDoctorId] = useState(null);
  // Mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Collapsible (desktop) sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // start collapsed by default
  // Change password UI state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  
  // Pagination states
  const [servicesCurrentPage, setServicesCurrentPage] = useState(1);
  const [businessTypesCurrentPage, setBusinessTypesCurrentPage] = useState(1);
  const [doctorsCurrentPage, setDoctorsCurrentPage] = useState(1);
  const [businessesCurrentPage, setBusinessesCurrentPage] = useState(1);
  const [serviceRequestsCurrentPage, setServiceRequestsCurrentPage] = useState(1);
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState(1);
  const [complianceUsersCurrentPage, setComplianceUsersCurrentPage] = useState(1);
  const [executiveUsersCurrentPage, setExecutiveUsersCurrentPage] = useState(1);
  const servicesPerPage = 20;
  const businessTypesPerPage = 20;
  const doctorsPerPage = 20;
  const businessesPerPage = 20;
  const serviceRequestsPerPage = 20;
  const transactionsPerPage = 20;
  const complianceUsersPerPage = 20;
  const executiveUsersPerPage = 20;
  
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

  // System Settings form states and handlers  
  const [showSystemSettingForm, setShowSystemSettingForm] = useState(false);
  const [editingSystemSetting, setEditingSystemSetting] = useState(null);
  const [systemSettingFormData, setSystemSettingFormData] = useState({
    key: '',
    value: '',
    dataType: 'string',
    description: '',
    category: 'general',
    isPublic: false
  });

  // Compliance User form states and handlers
  const [showComplianceUserForm, setShowComplianceUserForm] = useState(false);
  const [editingComplianceUser, setEditingComplianceUser] = useState(null);
  const [complianceUserFormData, setComplianceUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    isActive: true
  });

  // Executive user states
  const [showExecutiveUserForm, setShowExecutiveUserForm] = useState(false);
  const [editingExecutiveUser, setEditingExecutiveUser] = useState(null);
  const [executiveUserFormData, setExecutiveUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    isActive: true
  });

  // Helper function to get a system setting value
  const getSystemSettingValue = (key, defaultValue = null) => {
    const setting = systemSettings.find(setting => setting.key === key);
    return setting ? setting.value : defaultValue;
  };

  // Doctor edit form states
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Business edit form states
  const [editingBusiness, setEditingBusiness] = useState(null);

  // Delete confirmation states
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Doctor Assignment states
  const [doctorAssignments, setDoctorAssignments] = useState([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentFormData, setAssignmentFormData] = useState({
    doctorId: '',
    businessId: '',
    notes: ''
  });
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Availability Slots states
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotFormData, setSlotFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    isActive: true
  });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => formatDateLocal(new Date()));
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); // 'week' or 'month'
  const [showDateSlots, setShowDateSlots] = useState(false);
  const [selectedDateSlots, setSelectedDateSlots] = useState([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');

  // Individual slots states
  const [showIndividualSlots, setShowIndividualSlots] = useState(false);
  const [individualSlots, setIndividualSlots] = useState([]);
  const [loadingIndividualSlots, setLoadingIndividualSlots] = useState(false);
  const [selectedBulkSlot, setSelectedBulkSlot] = useState(null);

  // Helper function to get dates with slots
  const getDatesWithSlots = () => {
    const datesWithSlots = new Set();
    availabilitySlots.forEach(slot => {
      const slotData = slot.attributes || slot;
      if (slotData.date && slotData.serviceType === 'online') {
        datesWithSlots.add(slotData.date);
      }
    });
    return datesWithSlots;
  };

  // Helper function to get slots for a specific date
  const getSlotsForDate = (dateStr) => {
    return availabilitySlots.filter(slot => {
      const slotData = slot.attributes || slot;
      return slotData.date === dateStr && slotData.serviceType === 'online';
    }).sort((a, b) => {
      const aData = a.attributes || a;
      const bData = b.attributes || b;
      return aData.startTime.localeCompare(bData.startTime);
    });
  };

  // Handle calendar date click
  const handleCalendarDateClick = (dateStr) => {
    setSelectedCalendarDate(dateStr);
    setSelectedDate(dateStr);
    const slotsForDate = getSlotsForDate(dateStr);
    setSelectedDateSlots(slotsForDate);
    setShowDateSlots(true);
  };

  // Fetch individual slots for a bulk slot
  const fetchIndividualSlots = async (bulkSlot) => {
    try {
      setLoadingIndividualSlots(true);
      setSelectedBulkSlot(bulkSlot);
      
      const slotData = bulkSlot.attributes || bulkSlot;
      console.log('🔍 Fetching individual slots for bulk slot:', slotData);
      
      // Fetch all individual slots for this date and service type
      const response = await individualTimeSlotsAPI.getAvailableSlots(slotData.serviceType, slotData.date);
      console.log('📋 Individual slots response:', response);
      
      const allSlots = response.data?.data || response.data || [];
      
      // Filter only slots that belong to this parent slot
      const parentSlotId = bulkSlot.id || bulkSlot.documentId;
      const filteredSlots = allSlots.filter(slot => {
        const slotInfo = slot.attributes || slot;
        return slotInfo.parentSlot === parentSlotId;
      });
      
      setIndividualSlots(filteredSlots);
      setShowIndividualSlots(true);
      console.log('✅ Individual slots loaded:', filteredSlots.length);
      
    } catch (error) {
      console.error('❌ Error fetching individual slots:', error);
      setIndividualSlots([]);
    } finally {
      setLoadingIndividualSlots(false);
    }
  };

  // Unbook an individual slot
  const handleUnbookIndividualSlot = async (slotId) => {
    if (!confirm('Are you sure you want to unbook this slot?')) return;
    
    try {
      await individualTimeSlotsAPI.unbookSlot(slotId);
      
      // Refresh individual slots
      if (selectedBulkSlot) {
        await fetchIndividualSlots(selectedBulkSlot);
      }
      
      // Refresh bulk slots to update booking counts
      await fetchAvailabilitySlots();
      
      alert('Slot unbooked successfully!');
    } catch (error) {
      console.error('❌ Error unbooking slot:', error);
      alert('Error unbooking slot. Please try again.');
    }
  };



  const handleServiceFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    ('📝 Form field changed:', { name, value, type, checked });
    
    setServiceFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'displayOrder' ? parseInt(value) || 0 : value)
    }));
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      ('🛠️ Service form submission started');
      ('📝 Form data:', serviceFormData);
      ('✏️ Editing service:', editingService);

      const serviceData = {
        name: serviceFormData.name.trim(),
        description: serviceFormData.description.trim(),
        category: serviceFormData.category,
        price: parseFloat(serviceFormData.price) || 0,
        duration: parseInt(serviceFormData.duration) || 0,
        isActive: serviceFormData.isActive,
        displayOrder: parseInt(serviceFormData.displayOrder) || 0
      };

      ('📝 Processed service data:', serviceData);

      let response;
      if (editingService) {
        // Extract clean ID - handle both Strapi v4 and v5 formats
        let serviceId = editingService.documentId || editingService.id;
        
        // Clean the ID to remove any URL fragments or port numbers
        if (typeof serviceId === 'string') {
          serviceId = serviceId.split(':')[0].split('/').pop();
        }
        
        ('📝 Updating service with clean ID:', serviceId);
        
        response = await serviceAPI.update(serviceId, serviceData);
        ('✅ Update response:', response);
        
        if (response.data) {
          const updatedService = response.data.data || response.data;
          setServices(prev => prev.map(service => 
            (service.id === editingService.id || service.documentId === editingService.documentId) 
              ? updatedService : service
          ));
          alert('Service updated successfully!');
        }
      } else {
        ('🆕 Creating new service');
        
        response = await serviceAPI.create(serviceData);
        ('✅ Create response:', response);
        
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
    ('✏️ Edit service clicked:', service);
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
    
    ('✏️ Setting form data:', formData);
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
      
      ('🗑️ Deleting service with clean ID:', serviceId);
      
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

  // Availability Slots handlers
  const handleSlotFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSlotFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSlotSubmit = async (e) => {
    e.preventDefault();
    setLoadingSlots(true);

    try {
      // Convert time format from HH:mm to HH:mm:ss.SSS for Strapi
      const formatTimeForStrapi = (time) => {
        if (!time) return time;
        return `${time}:00.000`;
      };

      const slotData = {
        date: slotFormData.date,
        startTime: formatTimeForStrapi(slotFormData.startTime),
        endTime: formatTimeForStrapi(slotFormData.endTime),
        serviceType: 'online',
        maxBookings: 1,
        isActive: slotFormData.isActive
      };

      // Validate that end time is after start time
      if (slotFormData.startTime >= slotFormData.endTime) {
        alert('End time must be after start time');
        return;
      }

      let response;
      if (editingSlot) {
        // Update existing slot
        const slotId = editingSlot.documentId || editingSlot.id;
        response = await adminAPI.updateAvailabilitySlot(slotId, slotData);
        setAvailabilitySlots(prev => prev.map(slot => 
          (slot.id === editingSlot.id || slot.documentId === editingSlot.documentId) 
            ? response.data.data : slot
        ));
        alert('Availability slot updated successfully!');
      } else {
        // Create new slot
        response = await adminAPI.createAvailabilitySlot(slotData);
        if (response.data) {
          const newSlot = response.data.data || response.data;
          setAvailabilitySlots(prev => [...prev, newSlot]);
          alert('Availability slot created successfully!');
        }
      }

      // Reset form
      setShowSlotForm(false);
      setEditingSlot(null);
      setSlotFormData({
        date: '',
        startTime: '',
        endTime: '',
        isActive: true
      });

      await fetchAvailabilitySlots(); // Refresh slots data
      
    } catch (error) {
      console.error('❌ Error saving availability slot:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error occurred';
      alert(`Error ${editingSlot ? 'updating' : 'creating'} availability slot: ${errorMessage}`);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    const slotData = slot.attributes || slot;
    
    // Convert time format from HH:mm:ss.SSS to HH:mm for HTML input
    const formatTimeForInput = (time) => {
      if (!time) return '';
      // Extract HH:mm part from HH:mm:ss.SSS
      return time.split(':').slice(0, 2).join(':');
    };
    
    setSlotFormData({
      date: slotData.date || '',
      startTime: formatTimeForInput(slotData.startTime) || '',
      endTime: formatTimeForInput(slotData.endTime) || '',
      isActive: slotData.isActive !== undefined ? slotData.isActive : true
    });
    setShowSlotForm(true);
  };

  const handleDeleteSlot = async (slot) => {
    const slotTime = `${slot.attributes?.date || slot.date} ${slot.attributes?.startTime || slot.startTime}-${slot.attributes?.endTime || slot.endTime}`;
    if (!confirm(`Are you sure you want to delete the slot on ${slotTime}?`)) {
      return;
    }

    try {
      setLoadingSlots(true);
      const slotId = slot.documentId || slot.id;
      
      await adminAPI.deleteAvailabilitySlot(slotId);
      
      setAvailabilitySlots(prev => prev.filter(s => 
        s.id !== slot.id && s.documentId !== slot.documentId
      ));
      
      alert('Availability slot deleted successfully!');
      
    } catch (error) {
      console.error('❌ Error deleting availability slot:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error occurred';
      alert(`Error deleting availability slot: ${errorMessage}`);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchAvailabilitySlots = async () => {
    try {
      setLoadingSlots(true);
      const response = await adminAPI.getAvailabilitySlots();
      setAvailabilitySlots(response.data?.data || response.data || []);
    } catch (error) {
      console.error('❌ Error fetching availability slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Month calendar helper functions
  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End on the Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const isDateInCurrentMonth = (date, currentMonth) => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
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

  // System Settings form handlers
  const handleSystemSettingFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSystemSettingFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSystemSettingSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      let response;
      if (editingSystemSetting) {
        // Update existing setting
        const updateData = {
          key: systemSettingFormData.key,
          value: systemSettingFormData.value,
          dataType: systemSettingFormData.dataType,
          description: systemSettingFormData.description,
          category: systemSettingFormData.category,
          isPublic: systemSettingFormData.isPublic
        };
        
        response = await systemSettingsAPI.updateByKey(systemSettingFormData.key, updateData);
        setSystemSettings(prev => prev.map(setting => 
          setting.key === systemSettingFormData.key ? { ...setting, ...updateData } : setting
        ));
      } else {
        // Create new setting
        const createData = {
          key: systemSettingFormData.key,
          value: systemSettingFormData.value,
          dataType: systemSettingFormData.dataType,
          description: systemSettingFormData.description,
          category: systemSettingFormData.category,
          isPublic: systemSettingFormData.isPublic
        };
        
        response = await systemSettingsAPI.create(createData);
        setSystemSettings(prev => [...prev, response.data.data]);
      }

      setShowSystemSettingForm(false);
      setEditingSystemSetting(null);
      setSystemSettingFormData({
        key: '',
        value: '',
        dataType: 'string',
        description: '',
        category: 'general',
        isPublic: false
      });
      
      alert(editingSystemSetting ? 'System setting updated successfully!' : 'System setting created successfully!');
    } catch (error) {
      console.error('Error saving system setting:', error);
      alert(`Failed to save system setting. Error: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleEditSystemSetting = (setting) => {
    setEditingSystemSetting(setting);
    
    const formData = {
      key: setting.key || '',
      value: setting.value || '',
      dataType: setting.dataType || 'string',
      description: setting.description || '',
      category: setting.category || 'general',
      isPublic: setting.isPublic || false
    };
    
    setSystemSettingFormData(formData);
    setShowSystemSettingForm(true);
  };

  const handleDeleteSystemSetting = async (settingId) => {
    if (!window.confirm('Are you sure you want to delete this system setting? This action cannot be undone.')) return;

    setDataLoading(true);
    try {
      await systemSettingsAPI.delete(settingId);
      setSystemSettings(prev => prev.filter(setting => setting.id !== settingId));
      alert('System setting deleted successfully');
    } catch (error) {
      console.error('Error deleting system setting:', error);
      alert(`Failed to delete system setting. Error: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Compliance User handlers
  const handleComplianceUserFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setComplianceUserFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleComplianceUserSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      // Validate password confirmation for new users
      if (!editingComplianceUser && complianceUserFormData.password !== complianceUserFormData.confirmPassword) {
        alert('Passwords do not match');
        setDataLoading(false);
        return;
      }

      const userData = {
        firstName: complianceUserFormData.firstName.trim(),
        lastName: complianceUserFormData.lastName.trim(),
        email: complianceUserFormData.email.trim(),
        role: 'compliance',
        isActive: complianceUserFormData.isActive
      };

      // Include password for new users or if password is provided for existing users
      if (!editingComplianceUser) {
        userData.password = complianceUserFormData.password;
      } else if (complianceUserFormData.password.trim()) {
        // Only include password in update if a new password is provided
        userData.password = complianceUserFormData.password;
      }

      let response;
      if (editingComplianceUser) {
        // Update existing compliance user
        console.log('Updating compliance user with data:', userData);
        
        const jwt = localStorage.getItem('jwt');
        
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admins/${editingComplianceUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({ data: userData })
        });
        
        console.log('Update response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Update response error:', errorText);
          throw new Error('Failed to update compliance user');
        }
        
        const result = await response.json();
        console.log('Update result:', result);
        
        setComplianceUsers(prev => prev.map(user => 
          user.id === editingComplianceUser.id ? result.data : user
        ));
      } else {
        // Create new compliance user using the API
        const userData = {
          email: complianceUserFormData.email,
          password: complianceUserFormData.password,
          firstName: complianceUserFormData.firstName,
          lastName: complianceUserFormData.lastName,
          name: `${complianceUserFormData.firstName} ${complianceUserFormData.lastName}`
        };
        
        console.log('Creating compliance user with data:', userData);
        
        const result = await authAPI.register('compliance', userData);
        console.log('Registration successful:', result);
        
        // Add the user with the compliance role explicitly set
        const newUser = {
          ...result.user,
          firstName: complianceUserFormData.firstName,
          lastName: complianceUserFormData.lastName,
          role: 'compliance',
          isActive: complianceUserFormData.isActive
        };
        setComplianceUsers(prev => [...prev, newUser]);
      }

      setShowComplianceUserForm(false);
      setEditingComplianceUser(null);
      setComplianceUserFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        isActive: true
      });
      
      alert(editingComplianceUser ? 'Compliance user updated successfully!' : 'Compliance user created successfully!');
    } catch (error) {
      console.error('Error saving compliance user:', error);
      alert(`Failed to save compliance user. Error: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleEditComplianceUser = (user) => {
    setEditingComplianceUser(user);
    setComplianceUserFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      isActive: user.isActive !== false
    });
    setShowComplianceUserForm(true);
  };

  const handleDeleteComplianceUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this compliance user? This action cannot be undone.')) return;

    setDataLoading(true);
    try {
      console.log('🗑️ Deleting compliance user with ID:', userId);
      
      const jwt = localStorage.getItem('jwt');
      console.log('🔑 JWT token exists:', !!jwt);
      console.log('🌐 API URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('🎯 Full delete URL:', `${process.env.NEXT_PUBLIC_API_URL}/admins/${userId}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admins/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
      
      console.log('📥 Delete response status:', response.status);
      console.log('📥 Delete response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete response error:', errorText);
        throw new Error(`Failed to delete compliance user: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Delete result:', result);
      
      setComplianceUsers(prev => prev.filter(user => user.id !== userId));
      console.log('✅ Compliance user deleted successfully from UI');
      
    } catch (error) {
      console.error('❌ Error deleting compliance user:', error);
      alert(`Failed to delete compliance user. Error: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Executive user form handlers
  const handleExecutiveUserFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExecutiveUserFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleExecutiveUserSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      // Validate password confirmation for new users
      if (!editingExecutiveUser && executiveUserFormData.password !== executiveUserFormData.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      const userData = {
        firstName: executiveUserFormData.firstName.trim(),
        lastName: executiveUserFormData.lastName.trim(),
        email: executiveUserFormData.email.trim(),
        role: 'executive',
        isActive: executiveUserFormData.isActive
      };

      if (!editingExecutiveUser) {
        // Creating new executive user
        userData.password = executiveUserFormData.password;
      } else if (executiveUserFormData.password.trim()) {
        // Updating existing executive user with new password
        userData.password = executiveUserFormData.password;
      }

      if (!editingExecutiveUser) {
        console.log('Creating new executive user via auth API...');
        
        // Register the executive user via authAPI
        const registrationData = {
          email: executiveUserFormData.email,
          password: executiveUserFormData.password,
          firstName: executiveUserFormData.firstName,
          lastName: executiveUserFormData.lastName,
          name: `${executiveUserFormData.firstName} ${executiveUserFormData.lastName}`
        };
        
        const result = await authAPI.register('executive', registrationData);
        console.log('Registration successful:', result);
        
        // Add the user with the executive role explicitly set
        const newUser = {
          ...result.user,
          firstName: executiveUserFormData.firstName,
          lastName: executiveUserFormData.lastName,
          role: 'executive',
          isActive: executiveUserFormData.isActive
        };
        setExecutiveUsers(prev => [...prev, newUser]);
      } else {
        console.log('Updating existing executive user...');
        
        // Update existing executive user via admin API
        const jwt = localStorage.getItem('jwt');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admins/${editingExecutiveUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({
            firstName: executiveUserFormData.firstName,
            lastName: executiveUserFormData.lastName,
            email: executiveUserFormData.email,
            isActive: executiveUserFormData.isActive,
            ...(executiveUserFormData.password.trim() && { password: executiveUserFormData.password })
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update executive user');
        }

        const updatedUser = await response.json();
        setExecutiveUsers(prev => prev.map(user => 
          user.id === editingExecutiveUser.id 
            ? { ...updatedUser, role: 'executive' }
            : user
        ));
      }

      setShowExecutiveUserForm(false);
      setEditingExecutiveUser(null);
      setExecutiveUserFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        isActive: true
      });
      
      alert(editingExecutiveUser ? 'Executive user updated successfully!' : 'Executive user created successfully!');
    } catch (error) {
      console.error('Error saving executive user:', error);
      alert(`Failed to save executive user. Error: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleEditExecutiveUser = (user) => {
    setEditingExecutiveUser(user);
    setExecutiveUserFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      isActive: user.isActive !== false
    });
    setShowExecutiveUserForm(true);
  };

  const handleDeleteExecutiveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this executive user? This action cannot be undone.')) return;

    setDataLoading(true);
    try {
      console.log('🗑️ Deleting executive user with ID:', userId);
      
      const jwt = localStorage.getItem('jwt');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admins/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete response error:', errorText);
        throw new Error(`Failed to delete executive user: ${response.status} ${errorText}`);
      }
      
      setExecutiveUsers(prev => prev.filter(user => user.id !== userId));
      console.log('✅ Executive user deleted successfully from UI');
      
    } catch (error) {
      console.error('❌ Error deleting executive user:', error);
      alert(`Failed to delete executive user. Error: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

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
  
  // Business compliance documents state
  const [businessComplianceDocuments, setBusinessComplianceDocuments] = useState([]);
  const [loadingBusinessComplianceDocuments, setLoadingBusinessComplianceDocuments] = useState(false);
  const [updatingBusinessDocumentVerification, setUpdatingBusinessDocumentVerification] = useState(false);
  const [businessDocumentTypes, setBusinessDocumentTypes] = useState([]);
  
  // Professional References state
  const [professionalReferences, setProfessionalReferences] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [selectedReference, setSelectedReference] = useState(null);
  const [loadingReferenceDetails, setLoadingReferenceDetails] = useState(false);
  // Email verification update states
  const [updatingDoctorEmailVerifiedId, setUpdatingDoctorEmailVerifiedId] = useState(null);
  const [updatingBusinessEmailVerifiedId, setUpdatingBusinessEmailVerifiedId] = useState(null);
  const [updatingDoctorSubscriptionExemptionId, setUpdatingDoctorSubscriptionExemptionId] = useState(null);
  
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
        
      const [doctorsRes, businessesRes, requestsRes, servicesRes, businessTypesRes, systemSettingsRes, subscriptionsRes, complianceUsersRes, executiveUsersRes, availabilitySlotsRes] = await Promise.all([
        doctorAPI.getAll(),
        businessAPI.getAll(),
        serviceRequestAPI.getAll(),
        servicesPromise,
        businessAPI.getBusinessTypes(),
        systemSettingsAPI.getAll(),
        subscriptionAPI.getAll().catch(err => ({ data: { data: [] } })), // Handle if subscriptions API is not ready
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admins`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
            'Content-Type': 'application/json'
          }
        })
          .then(res => {
            console.log('All admins fetch response status:', res.status);
            return res.json();
          })
          .then(data => {
            console.log('All admins fetch response data:', data);
            // Filter for compliance users on the frontend
            const complianceUsers = data.data?.filter(admin => admin.role === 'compliance') || [];
            console.log('Filtered compliance users:', complianceUsers);
            return { data: { data: complianceUsers } };
          })
          .catch(err => {
            console.error('Admins fetch error:', err);
            return { data: { data: [] } };
          }), // Handle if compliance users endpoint is not ready
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admins`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
            'Content-Type': 'application/json'
          }
        })
          .then(res => {
            console.log('All admins fetch response for executive users status:', res.status);
            return res.json();
          })
          .then(data => {
            console.log('All admins fetch response for executive users data:', data);
            // Filter for executive users on the frontend
            const executiveUsers = data.data?.filter(admin => admin.role === 'executive') || [];
            console.log('Filtered executive users:', executiveUsers);
            return { data: { data: executiveUsers } };
          })
          .catch(err => {
            console.error('Executive users fetch error:', err);
            return { data: { data: [] } };
          }), // Handle if executive users endpoint is not ready
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/availability-slots?sort=date:asc,startTime:asc`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
            'Content-Type': 'application/json'
          }
        })
          .then(res => res.json())
          .then(data => ({ data }))
          .catch(err => {
            console.error('Availability slots fetch error:', err);
            return { data: { data: [] } };
          }) // Handle if availability slots endpoint is not ready
      ]);

      // Initialize transactions as empty array (placeholder for future transactions API)
      setTransactions([]);

      ('🏥 Raw doctors response:', doctorsRes.data);
      ('🏢 Raw businesses response:', businessesRes.data);
      ('📋 Raw requests response:', requestsRes.data);
      ('📦 Raw services response:', servicesRes.data);
      ('📦 Services data structure:');
      if (servicesRes.data?.data && servicesRes.data.data.length > 0) {
        ('📦 First service object:', JSON.stringify(servicesRes.data.data[0], null, 2));
      }
      ('🏗️ Raw business types response:', businessTypesRes.data);
      ('⚙️ Raw system settings response:', systemSettingsRes.data);
      ('💳 Raw subscriptions response:', subscriptionsRes.data);
      ('👥 Raw compliance users response:', complianceUsersRes.data);
      ('👔 Raw executive users response:', executiveUsersRes.data);
      ('🕒 Raw availability slots response:', availabilitySlotsRes.data);

      setDoctors(doctorsRes.data?.data || []);
      setBusinesses(businessesRes.data?.data || []);
      setServices(servicesRes.data?.data || []);
      setBusinessTypes(businessTypesRes.data?.data || []);
      setSystemSettings(systemSettingsRes.data?.data || []);
      setSubscriptions(subscriptionsRes.data?.data || []);
      setComplianceUsers(complianceUsersRes.data?.data || []);
      setExecutiveUsers(executiveUsersRes.data?.data || []);
      setAvailabilitySlots(availabilitySlotsRes.data?.data || []);

      // Load subscription stats (only if the endpoint exists)
      try {
        const statsRes = await subscriptionAPI.getStats();
        setSubscriptionStats(statsRes.data || subscriptionStats);
        console.log('✅ Subscription stats loaded:', statsRes.data);
      } catch (error) {
        console.warn('⚠️ Subscription stats endpoint not available:', error.response?.status);
        console.log('📊 Using default subscription stats');
        // Calculate basic stats from subscriptions data
        const subscriptionsData = subscriptionsRes.data?.data || [];
        const basicStats = {
          totalSubscriptions: subscriptionsData.length,
          activeSubscriptions: subscriptionsData.filter(sub => (sub.subscriptionStatus || sub.status) === 'active').length,
          cancelledSubscriptions: subscriptionsData.filter(sub => {
            const status = sub.subscriptionStatus || sub.status;
            return status === 'canceled' || status === 'cancelled';
          }).length,
          pastDueSubscriptions: subscriptionsData.filter(sub => (sub.subscriptionStatus || sub.status) === 'past_due').length,
          monthlyRevenue: 0, // Add missing property
          conversionRate: 0 // Add missing property
        };
        setSubscriptionStats(basicStats);
        console.log('📊 Calculated subscription stats:', basicStats);
      }

      // Load doctor assignments
      try {
        const assignmentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-business-assignments`)
          .then(res => res.json());
        setDoctorAssignments(assignmentsRes.data || []);
        console.log('✅ Doctor assignments loaded:', assignmentsRes.data?.length || 0);
      } catch (error) {
        console.warn('⚠️ Doctor assignments endpoint not available:', error);
        setDoctorAssignments([]);
      }
      
      // Sort service requests by date, with newest first
      const requests = requestsRes.data?.data || [];
      
      // Log detailed status information for debugging
      ('📋 Request status details:');
      requests.forEach(req => {
        (`ID: ${req.id}, Status: ${req.status}, isPaid: ${req.isPaid ? 'true' : 'false'}, 
          Timestamps: [requested: ${req.requestedAt || 'none'}, accepted: ${req.acceptedAt || 'none'}, completed: ${req.completedAt || 'none'}]`);
      });
      
      const sortedRequests = requests.sort((a, b) => {
        const dateA = new Date(a.requestedAt || a.createdAt || a.attributes?.requestedAt || a.attributes?.createdAt || 0);
        const dateB = new Date(b.requestedAt || b.createdAt || b.attributes?.requestedAt || b.attributes?.createdAt || 0);
        return dateB - dateA; // Sort descending (newest first)
      });
      
      ('📋 Sorted requests:', sortedRequests.length);
      setServiceRequests(sortedRequests);
      
      // Calculate doctor earnings
      calculateDoctorEarnings(doctorsRes.data?.data || [], requestsRes.data?.data || [], businessesRes.data?.data || []);
      
      // Initialize subscription settings after system settings are loaded
      await initializeSubscriptionSettings(systemSettingsRes.data?.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Load business compliance document types from API
  const loadBusinessComplianceDocumentTypes = async () => {
    ('🏢 Starting business compliance document types loading...');
    setBusinessComplianceDocumentTypesLoading(true);
    
    try {
      ('🏢 Loading business compliance document types from API...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-document-types`);
      ('📡 Business compliance document types API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        ('📦 Business compliance document types received:', data.data?.length || 0);
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          ('✅ Successfully loaded business compliance document types:', data.data.length);
          setBusinessComplianceDocumentTypes(data.data);
        } else {
          ('⚠️ API returned empty data for business compliance document types');
          setBusinessComplianceDocumentTypes([]);
        }
      } else {
        throw new Error(`API request failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading business compliance document types:', error.message);
      // Set empty array on error instead of fallback
      setBusinessComplianceDocumentTypes([]);
    } finally {
      setBusinessComplianceDocumentTypesLoading(false);
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
      ('🔄 Auto-refreshing data...');
      fetchAllData();
    }, 30000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(refreshInterval);
  }, []);

  // Initialize default subscription settings
  const initializeSubscriptionSettings = async (currentSystemSettings = null) => {
    console.log('🔄 Initializing subscription settings...');
    
    // Use passed settings or current state
    const settingsToCheck = currentSystemSettings || systemSettings;
    console.log('📊 Using system settings:', settingsToCheck);
    
    try {
      // Ensure systemSettings is an array before trying to find
      const settingsArray = Array.isArray(settingsToCheck) ? settingsToCheck : [];
      
      // Check if subscription amount setting exists
      const existingSetting = settingsArray.find(setting => setting.key === 'doctor_subscription_amount');
      console.log('🔍 Existing subscription setting found:', existingSetting);
      
      if (!existingSetting) {
        console.log('➕ Creating default subscription amount setting...');
        // Create default subscription amount setting
        const createResponse = await systemSettingsAPI.create({
          key: 'doctor_subscription_amount',
          value: '29',
          dataType: 'number',
          description: 'Monthly subscription amount for doctors in GBP',
          category: 'subscription',
          isPublic: false
        });
        console.log('✅ Created subscription setting:', createResponse);
        
        // Refresh system settings
        console.log('🔄 Refreshing system settings...');
        const updatedSettings = await systemSettingsAPI.getAll();
        console.log('📊 Updated settings response:', updatedSettings);
        setSystemSettings(updatedSettings.data?.data || []);
      } else {
        console.log('✅ Subscription setting already exists, no action needed');
      }
    } catch (error) {
      console.error('❌ Error initializing subscription settings:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
    }
  };

  // Separate useEffect for document types with extended delay and retry logic
  useEffect(() => {
    const loadDocumentTypesWithDelay = async () => {
      ('📋 Starting document types loading with delay...');
      setDocumentTypesLoading(true);
      
      // Wait 3 seconds to ensure backend is ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try loading document types with aggressive retry logic
      let attempts = 0;
      const maxAttempts = 5;
      const baseDelay = 2000; // Start with 2 seconds
      
      while (attempts < maxAttempts) {
        try {
          (`📋 Document types loading attempt ${attempts + 1}/${maxAttempts}`);
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types`);
          ('📡 Document types API Response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            ('📦 Document types received:', data.data?.length || 0);
            
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              ('✅ Successfully loaded document types:', data.data.length);
              setDocumentTypes(data.data);
              setDocumentTypesLoading(false);
              return; // Success, exit the retry loop
            } else {
              ('⚠️ API returned empty data, retrying...');
              throw new Error('Empty data received');
            }
          } else {
            throw new Error(`API request failed with status: ${response.status}`);
          }
        } catch (error) {
          attempts++;
          console.error(`❌ Document types loading attempt ${attempts} failed:`, error.message);
          
          if (attempts >= maxAttempts) {
            ('❌ All document types loading attempts failed, using fallback');
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
          (`⏳ Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
    
    loadDocumentTypesWithDelay();
  }, []); // Run once on component mount

  // Separate useEffect for business compliance document types
  useEffect(() => {
    loadBusinessComplianceDocumentTypes();
  }, []);

  // Debug effect to track documentTypes changes
  useEffect(() => {
    ('📋 DocumentTypes state changed:', documentTypes);
    ('📋 DocumentTypes length:', documentTypes.length);
    ('📋 DocumentTypes is array:', Array.isArray(documentTypes));
  }, [documentTypes]);

  // Debug effect to track businessComplianceDocumentTypes changes
  useEffect(() => {
    ('🏢 BusinessComplianceDocumentTypes state changed:', businessComplianceDocumentTypes);
    ('🏢 BusinessComplianceDocumentTypes length:', businessComplianceDocumentTypes.length);
    ('🏢 BusinessComplianceDocumentTypes is array:', Array.isArray(businessComplianceDocumentTypes));
  }, [businessComplianceDocumentTypes]);

  // Authentication check - redirect if not authenticated or not admin/compliance
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !user) {
        console.log('🚫 No authentication, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      if (user.role !== 'admin' && user.role !== 'compliance' && user.role !== 'executive') {
        console.log('🚫 Not admin, compliance, or executive role, redirecting to home');
        window.location.href = '/';
        return;
      }
      
      // Set default tab for compliance users
      if (user.role === 'compliance' && activeTab === 'overview') {
        console.log('🔧 Setting compliance user default tab to doctors');
        setActiveTab('doctors');
      }
      
      console.log('✅ Admin/Compliance authenticated, loading dashboard', {
        role: user.role,
        activeTab: activeTab
      });
    }
  }, [loading, isAuthenticated, user, activeTab]);

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

  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'compliance' && user.role !== 'executive')) {
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

  // Edit doctor handler
  const handleEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setDoctorFormData({
      firstName: doctor.firstName || doctor.attributes?.firstName || '',
      lastName: doctor.lastName || doctor.attributes?.lastName || '',
      email: doctor.email || doctor.attributes?.email || '',
      phoneNumber: doctor.phone || doctor.phoneNumber || doctor.attributes?.phone || doctor.attributes?.phoneNumber || '',
      specialization: doctor.specialization || doctor.attributes?.specialization || '',
      licenseNumber: doctor.licenseNumber || doctor.attributes?.licenseNumber || '',
      availabilityStatus: doctor.isAvailable ? 'available' : 'offline',
      isVerified: doctor.isVerified !== undefined ? doctor.isVerified : (doctor.attributes?.isVerified || false)
    });
  };

  // Edit business handler
  const handleEditBusiness = (business) => {
    setEditingBusiness(business);
    setBusinessFormData({
      businessName: business.businessName || business.attributes?.businessName || '',
      email: business.email || business.attributes?.email || '',
      phoneNumber: business.phone || business.phoneNumber || business.attributes?.phone || business.attributes?.phoneNumber || '',
      address: business.address || business.attributes?.address || '',
      businessType: business.businessType || business.attributes?.businessType || '',
      isVerified: business.isVerified !== undefined ? business.isVerified : (business.attributes?.isVerified || false),
      isActive: business.isActive !== undefined ? business.isActive : (business.attributes?.isActive || true)
    });
  };

  // Delete doctor handler
  const handleDeleteDoctor = (doctor) => {
    setDeleteTarget({
      type: 'doctor',
      item: doctor
    });
  };

  // Delete business handler
  const handleDeleteBusiness = (business) => {
    setDeleteTarget({
      type: 'business',
      item: business
    });
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      if (deleteTarget.type === 'doctor') {
        await doctorAPI.delete(deleteTarget.item.id);
        alert('Doctor deleted successfully!');
      } else if (deleteTarget.type === 'business') {
        await businessAPI.delete(deleteTarget.item.id);
        alert('Business deleted successfully!');
      }
      
      await fetchAllData();
      setDeleteTarget(null);
    } catch (error) {
      console.error(`Error deleting ${deleteTarget.type}:`, error);
      alert(`Failed to delete ${deleteTarget.type}. They may have active service requests.`);
    }
  };

  // Update doctor handler
  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    
    try {
      // Prepare the data for API call
      const updateData = {
        firstName: doctorFormData.firstName,
        lastName: doctorFormData.lastName,
        email: doctorFormData.email,
        phone: doctorFormData.phoneNumber,
        phoneNumber: doctorFormData.phoneNumber,
        specialization: doctorFormData.specialization,
        licenseNumber: doctorFormData.licenseNumber,
        isAvailable: doctorFormData.availabilityStatus === 'available',
        isVerified: doctorFormData.isVerified
      };
      
      await doctorAPI.update(editingDoctor.id, updateData);
      await fetchAllData();
      setEditingDoctor(null);
      alert('Doctor updated successfully!');
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert('Failed to update doctor.');
    }
  };

  // Update business handler
  const handleUpdateBusiness = async (e) => {
    e.preventDefault();
    if (!editingBusiness) return;
    
    try {
      // Prepare the data for API call
      const updateData = {
        businessName: businessFormData.businessName,
        email: businessFormData.email,
        phone: businessFormData.phoneNumber,
        phoneNumber: businessFormData.phoneNumber,
        address: businessFormData.address,
        businessType: businessFormData.businessType,
        isVerified: businessFormData.isVerified,
        isActive: businessFormData.isActive
      };
      
      await businessAPI.update(editingBusiness.id, updateData);
      await fetchAllData();
      setEditingBusiness(null);
      alert('Business updated successfully!');
    } catch (error) {
      console.error('Error updating business:', error);
      alert('Failed to update business.');
    }
  };

  // Toggle email verification for a doctor
  const handleToggleDoctorEmailVerified = async (doctor) => {
    try {
      const id = doctor.id;
      const current = (doctor.isEmailVerified !== undefined ? doctor.isEmailVerified : doctor.attributes?.isEmailVerified) || false;
      setUpdatingDoctorEmailVerifiedId(id);
      await doctorAPI.update(id, { isEmailVerified: !current });
      // Update local selected doctor state optimistically
      setSelectedDoctor((prev) => (prev && prev.id === id ? { ...prev, isEmailVerified: !current } : prev));
      await fetchAllData();
    } catch (error) {
      console.error('Error updating doctor email verification:', error);
      alert('Failed to update email verification for doctor.');
    } finally {
      setUpdatingDoctorEmailVerifiedId(null);
    }
  };

  // Toggle email verification for a business
  const handleToggleBusinessEmailVerified = async (business) => {
    try {
      const id = business.id;
      const current = (business.isEmailVerified !== undefined ? business.isEmailVerified : business.attributes?.isEmailVerified) || false;
      setUpdatingBusinessEmailVerifiedId(id);
      await businessAPI.update(id, { isEmailVerified: !current });
      // Update local selected business state optimistically
      setSelectedBusiness((prev) => (prev && prev.id === id ? { ...prev, isEmailVerified: !current } : prev));
      await fetchAllData();
    } catch (error) {
      console.error('Error updating business email verification:', error);
      alert('Failed to update email verification for business.');
    } finally {
      setUpdatingBusinessEmailVerifiedId(null);
    }
  };

  const handleToggleDoctorSubscriptionExemption = async (doctor) => {
    try {
      const id = doctor.id || doctor.documentId;
      const current = (doctor.allowWithoutSubscription !== undefined ? doctor.allowWithoutSubscription : doctor.attributes?.allowWithoutSubscription) || false;
      setUpdatingDoctorSubscriptionExemptionId(id);
      await doctorAPI.update(id, { allowWithoutSubscription: !current });
      // Update doctors list
      setSelectedDoctor((prev) => (prev && prev.id === id ? { ...prev, allowWithoutSubscription: !current } : prev));
      // Refresh the doctors list
      const response = await doctorAPI.list();
      setDoctors(response);
    } catch (error) {
      console.error('Error updating doctor subscription exemption:', error);
    } finally {
      setUpdatingDoctorSubscriptionExemptionId(null);
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
  isEmailVerified: true, // Admin-registered businesses can log in immediately
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
  isEmailVerified: true, // Admin-registered doctors can log in immediately
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

  // Doctor Assignment functions
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setLoadingAssignments(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-business-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            doctorId: assignmentFormData.doctorId,
            businessId: assignmentFormData.businessId,
            notes: assignmentFormData.notes,
            assignedBy: user?.id || 1 // Use current admin user ID
          }
        })
      });

      if (response.ok) {
        await fetchAllData(); // Refresh all data
        setShowAssignmentForm(false);
        setAssignmentFormData({ doctorId: '', businessId: '', notes: '' });
        alert('Doctor assigned to business successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert(`Error creating assignment: ${error.message}`);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    
    setLoadingAssignments(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctor-business-assignments/${assignmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchAllData(); // Refresh all data
        alert('Assignment removed successfully!');
      } else {
        throw new Error('Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert(`Error removing assignment: ${error.message}`);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAssignmentFormChange = (e) => {
    const { name, value } = e.target;
    setAssignmentFormData(prev => ({
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

  const filteredComplianceUsers = complianceUsers.filter(user => {
    if (!searchTerm) return true;
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const email = user.email || '';
    const status = user.isActive ? 'active' : 'inactive';
    const search = searchTerm.toLowerCase();
    
    return `${firstName} ${lastName}`.toLowerCase().includes(search) ||
           email.toLowerCase().includes(search) ||
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

  // Pagination calculations for doctors
  const totalDoctorsPages = Math.ceil(filteredDoctors.length / doctorsPerPage);
  const doctorsStartIndex = (doctorsCurrentPage - 1) * doctorsPerPage;
  const doctorsEndIndex = doctorsStartIndex + doctorsPerPage;
  const paginatedDoctors = filteredDoctors.slice(doctorsStartIndex, doctorsEndIndex);

  // Pagination calculations for businesses
  const totalBusinessesPages = Math.ceil(filteredBusinesses.length / businessesPerPage);
  const businessesStartIndex = (businessesCurrentPage - 1) * businessesPerPage;
  const businessesEndIndex = businessesStartIndex + businessesPerPage;
  const paginatedBusinesses = filteredBusinesses.slice(businessesStartIndex, businessesEndIndex);

  // Pagination calculations for compliance users
  const totalComplianceUsersPages = Math.ceil(filteredComplianceUsers.length / complianceUsersPerPage);
  const complianceUsersStartIndex = (complianceUsersCurrentPage - 1) * complianceUsersPerPage;
  const complianceUsersEndIndex = complianceUsersStartIndex + complianceUsersPerPage;
  const paginatedComplianceUsers = filteredComplianceUsers.slice(complianceUsersStartIndex, complianceUsersEndIndex);

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

  const filteredTransactions = transactions.filter(transaction => {
    // Handle both direct properties and nested attributes structure  
    const paymentId = transaction.paymentId || transaction.attributes?.paymentId || '';
    const doctorId = transaction.doctorId || transaction.attributes?.doctorId || '';
    const amount = transaction.amount || transaction.attributes?.amount || '';
    
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return paymentId.toLowerCase().includes(searchLower) ||
           doctorId.toString().toLowerCase().includes(searchLower) ||
           amount.toString().toLowerCase().includes(searchLower);
  });

  const filteredDoctorEarnings = doctorEarnings.filter(earning => {
    const doctorFirstName = earning.doctor?.firstName || earning.doctor?.attributes?.firstName || '';
    const doctorLastName = earning.doctor?.lastName || earning.doctor?.attributes?.lastName || '';
    
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return `${doctorFirstName} ${doctorLastName}`.toLowerCase().includes(searchLower);
  });

  // Service Requests Pagination
  const totalServiceRequestsPages = Math.ceil(filteredRequests.length / serviceRequestsPerPage);
  const serviceRequestsStartIndex = (serviceRequestsCurrentPage - 1) * serviceRequestsPerPage;
  const serviceRequestsEndIndex = serviceRequestsStartIndex + serviceRequestsPerPage;
  const paginatedServiceRequests = filteredRequests.slice(serviceRequestsStartIndex, serviceRequestsEndIndex);

  // Transactions Pagination
  const totalTransactionsPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const transactionsStartIndex = (transactionsCurrentPage - 1) * transactionsPerPage;
  const transactionsEndIndex = transactionsStartIndex + transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(transactionsStartIndex, transactionsEndIndex);

  // Pagination handlers
  const handleServicesPageChange = (page) => {
    setServicesCurrentPage(page);
  };

  const handleBusinessTypesPageChange = (page) => {
    setBusinessTypesCurrentPage(page);
  };

  const handleDoctorsPageChange = (page) => {
    setDoctorsCurrentPage(page);
  };

  const handleBusinessesPageChange = (page) => {
    setBusinessesCurrentPage(page);
  };

  const handleServiceRequestsPageChange = (page) => {
    setServiceRequestsCurrentPage(page);
  };

  const handleTransactionsPageChange = (page) => {
    setTransactionsCurrentPage(page);
  };

  const handleComplianceUsersPageChange = (page) => {
    setComplianceUsersCurrentPage(page);
  };

  // View detail handlers
  const handleViewDoctorDetails = (doctor) => {
    ('👨‍⚕️ Viewing doctor details:', doctor);
    ('🆔 Doctor ID for API call:', doctor.id);
    ('🔍 Current showDoctorDetails state:', showDoctorDetails);
    ('🔍 Current selectedDoctor state:', selectedDoctor);
    setSelectedDoctor(doctor);
    setShowDoctorDetails(true);
    // Load compliance documents and professional references for this doctor
    loadComplianceDocuments(doctor.id);
    loadProfessionalReferences(doctor.id);
    ('✅ Modal states updated - showDoctorDetails: true, selectedDoctor:', doctor);
  };

  const handleViewBusinessDetails = (business) => {
    ('🏢 Viewing business details:', business);
    ('🔍 Current showBusinessDetails state:', showBusinessDetails);
    ('🔍 Current selectedBusiness state:', selectedBusiness);
    setSelectedBusiness(business);
    setShowBusinessDetails(true);
    // Load business compliance documents for this business
    loadBusinessComplianceDocuments(business.id);
    ('✅ Modal states updated - showBusinessDetails: true, selectedBusiness:', business);
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
    ('🚀 loadDocumentTypes function called, retry:', retryCount);
    
    // Set loading to true when starting manual load
    if (retryCount === 0) {
      setDocumentTypesLoading(true);
    }
    
    try {
      ('🔄 Loading document types from API...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types`);
      ('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        ('📦 Document types received:', data.data?.length || 0);
        ('📋 Document types data:', data.data);
        
        // Check if data.data exists and is an array
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          ('✅ Setting document types from API:', data.data.length);
          setDocumentTypes(data.data);
          setDocumentTypesLoading(false);
        } else {
          ('⚠️ API returned empty data, using fallback');
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
          (`🔄 Retrying in 2 seconds... (attempt ${retryCount + 1}/3)`);
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
        (`🔄 Retrying in 2 seconds due to error... (attempt ${retryCount + 1}/3)`);
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
    ('🔍 Function complete, checking documentTypes state...');
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
      ('📝 Document type form submission started');
      ('📝 Form data:', documentTypeFormData);
      ('✏️ Editing document type:', editingDocumentType);

      // Auto-generate key from name if creating new document type
      const documentKey = editingDocumentType 
        ? editingDocumentType.key // Keep existing key when editing
        : generateDocumentKey(documentTypeFormData.name);

      ('🔑 Using document key:', documentKey);

      let response;
      if (editingDocumentType) {
        // Update existing document type - use numeric ID for Strapi v5
        const documentId = editingDocumentType.id; // Use numeric ID, not documentId
        ('📝 Updating document type with numeric ID:', documentId);
        
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
        
        ('📡 Update response status:', response.status);
      } else {
        // Create new document type
        ('🆕 Creating new document type');
        
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
        
        ('📡 Create response status:', response.status);
      }

      const responseData = await response.json();
      ('📦 Response data:', responseData);

      if (response.ok) {
        ('✅ Document type operation successful');
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
        ('🔄 Reloading document types...');
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
    ('🗑️ Delete document type requested:', documentType);
    
    if (!confirm(`Are you sure you want to delete the document type "${documentType.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDataLoading(true);
      const documentId = documentType.id; // Use numeric ID, not documentId
      ('🗑️ Deleting document type with numeric ID:', documentId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types/${documentId}`, {
        method: 'DELETE'
      });

      ('📡 Delete response status:', response.status);

      if (response.ok) {
        ('✅ Document type deleted successfully');
        alert('Document type deleted successfully!');
        
        // Reload document types to reflect changes
        ('🔄 Reloading document types after deletion...');
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
      ('🚀 Starting auto-expiry migration...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-document-types/enable-auto-expiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        ('✅ Auto-expiry migration completed:', result);
        
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

  // Business Document Type Management Functions
  const handleBusinessDocumentTypeFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBusinessDocumentTypeFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBusinessDocumentTypeSubmit = async (e) => {
    e.preventDefault();
    setDataLoading(true);

    try {
      ('🏢 Business document type form submission started');
      ('📝 Form data:', businessDocumentTypeFormData);

      // Auto-generate key from name if creating new document type
      const documentKey = editingBusinessDocumentType 
        ? editingBusinessDocumentType.key // Keep existing key when editing
        : generateDocumentKey(businessDocumentTypeFormData.name);

      ('🔑 Using business document key:', documentKey);

      let response;
      if (editingBusinessDocumentType) {
        // Update existing business document type
        const documentId = editingBusinessDocumentType.id;
        ('📝 Updating business document type with ID:', documentId);
        
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-document-types/${documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              key: documentKey,
              name: businessDocumentTypeFormData.name,
              required: businessDocumentTypeFormData.required,
              description: businessDocumentTypeFormData.description,
              autoExpiry: businessDocumentTypeFormData.autoExpiry,
              validityYears: businessDocumentTypeFormData.autoExpiry ? businessDocumentTypeFormData.validityYears : null,
              expiryWarningDays: businessDocumentTypeFormData.autoExpiry ? businessDocumentTypeFormData.expiryWarningDays : 30,
              allowedFileTypes: businessDocumentTypeFormData.allowedFileTypes,
              maxFileSize: businessDocumentTypeFormData.maxFileSize,
              helpText: businessDocumentTypeFormData.helpText
            }
          })
        });
      } else {
        // Create new business document type
        ('🆕 Creating new business document type');
        
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-document-types`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              key: documentKey,
              name: businessDocumentTypeFormData.name,
              required: businessDocumentTypeFormData.required,
              description: businessDocumentTypeFormData.description,
              autoExpiry: businessDocumentTypeFormData.autoExpiry,
              validityYears: businessDocumentTypeFormData.autoExpiry ? businessDocumentTypeFormData.validityYears : null,
              expiryWarningDays: businessDocumentTypeFormData.autoExpiry ? businessDocumentTypeFormData.expiryWarningDays : 30,
              allowedFileTypes: businessDocumentTypeFormData.allowedFileTypes,
              maxFileSize: businessDocumentTypeFormData.maxFileSize,
              helpText: businessDocumentTypeFormData.helpText
            }
          })
        });
      }

      ('📡 Business document type response status:', response.status);

      if (response.ok) {
        ('✅ Business document type saved successfully');
        alert('Business document type saved successfully!');
        
        // Reset form and close modal
        setBusinessDocumentTypeFormData({
          name: '',
          required: true,
          description: '',
          autoExpiry: true,
          validityYears: 1,
          expiryWarningDays: 30,
          category: 'registration',
          allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
          maxFileSize: 10485760,
          examples: '',
          helpText: ''
        });
        setEditingBusinessDocumentType(null);
        setShowBusinessDocumentTypeForm(false);
        
        // Reload business document types to reflect changes
        await loadBusinessComplianceDocumentTypes();
      } else {
        const errorData = await response.json();
        console.error('❌ Save request failed:', response.status, errorData);
        throw new Error(errorData.error?.message || errorData.message || 'Failed to save business document type');
      }
    } catch (error) {
      console.error('❌ Error saving business document type:', error);
      alert(`Failed to save business document type: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleEditBusinessDocumentType = (documentType) => {
    ('✏️ Edit business document type requested:', documentType);
    setEditingBusinessDocumentType(documentType);
    setBusinessDocumentTypeFormData({
      name: documentType.name,
      required: documentType.required,
      description: documentType.description || '',
      autoExpiry: documentType.autoExpiry || false,
      validityYears: documentType.validityYears || 1,
      expiryWarningDays: documentType.expiryWarningDays || 30,
      allowedFileTypes: documentType.allowedFileTypes || ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      maxFileSize: documentType.maxFileSize || 10485760,
      helpText: documentType.helpText || ''
    });
    setShowBusinessDocumentTypeForm(true);
  };

  const handleDeleteBusinessDocumentType = async (documentType) => {
    ('🗑️ Delete business document type requested:', documentType);
    
    if (!confirm(`Are you sure you want to delete the business document type "${documentType.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDataLoading(true);
      const documentId = documentType.id;
      ('🗑️ Deleting business document type with ID:', documentId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-document-types/${documentId}`, {
        method: 'DELETE'
      });

      ('📡 Delete response status:', response.status);

      if (response.ok) {
        ('✅ Business document type deleted successfully');
        alert('Business document type deleted successfully!');
        
        // Reload business document types to reflect changes
        await loadBusinessComplianceDocumentTypes();
      } else {
        const responseData = await response.json();
        console.error('❌ Delete request failed:', response.status, responseData);
        throw new Error(responseData.error?.message || responseData.message || 'Failed to delete business document type');
      }
    } catch (error) {
      console.error('❌ Error deleting business document type:', error);
      alert(`Failed to delete business document type: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  const handleEnableAutoExpiryForAllBusiness = async () => {
    if (!confirm('This will enable auto-expiry tracking for ALL business compliance documents. This action will update existing document types and calculate expiry dates for existing documents. Do you want to continue?')) {
      return;
    }

    try {
      setDataLoading(true);
      ('🚀 Starting business auto-expiry migration...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-document-types/enable-auto-expiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        ('✅ Business auto-expiry migration completed:', result);
        
        alert(`Business auto-expiry tracking enabled successfully!\n\n` +
              `Document Types Updated: ${result.result?.documentTypesUpdated || 0}\n` +
              `Documents Updated: ${result.result?.documentsUpdated || 0}\n\n` +
              `All business documents now have automatic expiry tracking enabled.`);
        
        // Reload business document types to reflect changes
        await loadBusinessComplianceDocumentTypes();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enable auto-expiry');
      }
    } catch (error) {
      console.error('❌ Error enabling business auto-expiry:', error);
      alert(`Failed to enable business auto-expiry: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

  // Load compliance documents for a doctor
  const loadComplianceDocuments = async (doctorId) => {
    try {
      ('🔍 Loading compliance documents for doctor ID:', doctorId);
      setLoadingDocuments(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/doctor/${doctorId}`);
      ('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        ('📦 API Response data:', data);
        setComplianceDocuments(data.data?.documents || []);
        ('✅ Compliance documents set:', data.data?.documents || []);
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

  // Helper function to get rating color class
  const getRatingColorClass = (rating) => {
    if (!rating) return 'bg-gray-100 text-gray-800';
    
    const lowerRating = rating.toLowerCase();
    
    if (lowerRating === 'excellent' || lowerRating === 'outstanding') {
      return 'bg-green-100 text-green-800';
    } else if (lowerRating === 'good' || lowerRating === 'very good') {
      return 'bg-blue-100 text-blue-800';
    } else if (lowerRating === 'satisfactory' || lowerRating === 'adequate') {
      return 'bg-yellow-100 text-yellow-800';
    } else if (lowerRating === 'less than satisfactory' || lowerRating === 'needs improvement' || lowerRating === 'needs-improvement') {
      return 'bg-orange-100 text-orange-800';
    } else if (lowerRating === 'poor' || lowerRating === 'unsatisfactory') {
      return 'bg-red-100 text-red-800';
    } else if (lowerRating === 'n/a' || lowerRating === 'not applicable') {
      return 'bg-gray-100 text-gray-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  // Load professional references for a doctor
  const loadProfessionalReferences = async (doctorId) => {
    try {
      ('🔍 Loading professional references for doctor ID:', doctorId);
      setLoadingReferences(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professional-references/doctor/${doctorId}`);
      ('📡 Professional References API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        ('📦 Professional References API Response data:', data);
        setProfessionalReferences(data.data?.references || []);
        ('✅ Professional references set:', data.data?.references || []);
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

  // Load detailed reference response data
  const loadReferenceDetails = async (reference) => {
    try {
      ('🔍 Loading detailed reference data for:', reference);
      setLoadingReferenceDetails(true);
      
      // Use the custom route to get all submissions for the doctor,
      // then find the one that matches this reference
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professional-reference-submissions/doctor/${reference.doctor?.id || reference.doctor}`);
      ('📡 Reference Details API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        ('📦 Reference Details API Response data:', data);
        
        // Find the submission that matches this professional reference
        const submissions = data.data?.submissions || [];
        const matchingSubmission = submissions.find(submission => 
          submission.professionalReference?.id === reference.id
        );
        
        if (matchingSubmission) {
          ('✅ Found matching submission for reference');
          setSelectedReference(matchingSubmission);
          setShowReferenceModal(true);
        } else {
          ('No submission found for this reference');
          // Show a message that no response has been submitted yet
          alert('This reference has not been responded to yet.');
        }
      } else {
        console.error('❌ Failed to load reference details, status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading reference details:', error);
    } finally {
      setLoadingReferenceDetails(false);
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

  // Smart verification handler that detects document type
  const handleModalDocumentVerification = async (documentId, verificationStatus) => {
    // Detect document type based on current tab context or business details view
    if (activeTab === 'business-compliance-documents' || (showBusinessDetails && selectedBusiness)) {
      // This is a business compliance document - use business handler
      await handleBusinessDocumentVerification(documentId, verificationStatus);
    } else {
      // This is a doctor compliance document - use doctor handler  
      await handleDocumentVerification(documentId, verificationStatus);
    }
  };

  // Handle business document verification
  const handleBusinessDocumentVerification = async (documentId, verificationStatus) => {
    try {
      setUpdatingBusinessDocumentVerification(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/${documentId}/verify`, {
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
        // Refresh business documents
        if (selectedBusiness) {
          await loadBusinessComplianceDocuments(selectedBusiness.id);
        }
        setShowDocumentModal(false);
        setSelectedDocument(null);
      } else {
        console.error('Failed to update business document verification status');
        alert('Failed to update business document verification status');
      }
    } catch (error) {
      console.error('Error updating business document verification status:', error);
      alert('Error updating business document verification status');
    } finally {
      setUpdatingBusinessDocumentVerification(false);
    }
  };

  // Load business compliance documents
  const loadBusinessComplianceDocuments = async (businessId) => {
    try {
      setLoadingBusinessComplianceDocuments(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/business/${businessId}`);
      
      if (response.ok) {
        const result = await response.json();
        ('📄 Business compliance documents loaded:', result);
        setBusinessComplianceDocuments(result.data?.documents || []);
        
        // Also store the business document types from the API response
        if (result.data?.overview?.requiredDocuments) {
          ('📋 Business document types from API:', result.data.overview.requiredDocuments);
          setBusinessDocumentTypes(result.data.overview.requiredDocuments);
        }
      } else {
        console.error('Failed to load business compliance documents:', response.status, response.statusText);
        setBusinessComplianceDocuments([]);
      }
    } catch (error) {
      console.error('Error loading business compliance documents:', error);
      setBusinessComplianceDocuments([]);
    } finally {
      setLoadingBusinessComplianceDocuments(false);
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

  // Get all business documents with their statuses
  const getAllBusinessDocumentsWithStatus = () => {
    // Ensure businessComplianceDocuments is always an array
    const documents = Array.isArray(businessComplianceDocuments) ? businessComplianceDocuments : [];
    
    ('📋 Processing business documents:', documents);
    ('📋 Available business document types:', businessDocumentTypes);
    ('📋 General document types:', documentTypes);
    
    // Use business-specific document types if available, otherwise fall back to general document types
    const availableDocumentTypes = businessDocumentTypes.length > 0 ? businessDocumentTypes : documentTypes.filter(docType => docType.key !== 'professional_references');
    
    return availableDocumentTypes.map(docType => {
      const docKey = docType.id || docType.key; // Business document types use 'id', general ones use 'key'
      const uploadedDoc = documents.find(doc => doc.documentType === docKey);
      (`📄 Checking document type ${docKey} (${docType.name}):`, uploadedDoc ? 'Found' : 'Missing');
      
      // For business compliance documents, if document exists, status is based on verification status
      let status = uploadedDoc ? 'uploaded' : 'missing';
      let expiryStatus = null;
      let daysUntilExpiry = null;
      
      // Use existing expiry status from API if available, but recalculate the days
      if (uploadedDoc && uploadedDoc.expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate calculation
        const expiryDate = new Date(uploadedDoc.expiryDate);
        expiryDate.setHours(0, 0, 0, 0); // Reset time to start of day
        
        daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        (`📅 Date calculation for ${docKey}:`, {
          today: today.toISOString().split('T')[0],
          expiryDate: expiryDate.toISOString().split('T')[0],
          daysUntilExpiry
        });
        
        if (daysUntilExpiry < 0) {
          expiryStatus = 'expired';
          status = 'expired';
        } else if (daysUntilExpiry <= (docType.expiryWarningDays || 30)) {
          expiryStatus = 'expiring';
        } else {
          expiryStatus = 'valid';
        }
      }
      
      return {
        type: docKey,
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
    setBusinessComplianceDocuments([]);
    setBusinessDocumentTypes([]);
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
    <div className={`min-h-screen flex ${
      isDarkMode 
        ? 'bg-gray-950' 
        : 'relative overflow-hidden bg-gradient-to-b from-white via-blue-200/90 to-blue-300/80'
    }`}>
      {!isDarkMode && (
        <>
          <div className="pointer-events-none absolute -top-16 -left-16 w-96 h-96 bg-blue-400/45 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute top-40 -right-24 w-[28rem] h-[28rem] bg-indigo-300/45 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-[45%] -translate-x-1/2 w-[30rem] h-[30rem] bg-cyan-300/35 rounded-full blur-3xl" />
        </>
      )}
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Side Navigation */}
  <div className={`fixed inset-y-0 left-0 z-30 ${isSidebarCollapsed ? 'w-20' : 'w-64'} ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} border-r flex flex-col shadow-lg transform transition-transform duration-300 -translate-x-full md:translate-x-0 md:h-screen ${isSidebarOpen ? 'translate-x-0' : ''}`}>
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 w-full">
            <div className="p-2 rounded-lg shadow-lg flex-shrink-0">
              <img src="/logo.png" alt="ThanksDoc Logo" className="h-8 w-8 object-contain" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden transition-all duration-300">
                <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admin Panel</h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Management Dashboard</p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="hidden md:inline-flex p-2 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsSidebarCollapsed(v => !v)}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
            </button>
            {/* Close on mobile */}
            <button
              className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {[
              { id: 'overview', name: 'Overview', icon: Shield, adminOnly: true },
              { id: 'doctors', name: 'Doctors', icon: Stethoscope, adminOnly: false },
              { id: 'businesses', name: 'Businesses', icon: Building2, adminOnly: false },
              { id: 'doctor-assignments', name: 'Doctor Assignments', icon: Users, adminOnly: true },
              { id: 'services', name: 'Services', icon: Package, adminOnly: true },
              { id: 'availability-slots', name: 'Availability Slots', icon: Clock, adminOnly: true },
              { id: 'requests', name: 'Service Requests', icon: Calendar, adminOnly: true },
              { id: 'transactions', name: 'Transactions', icon: CreditCard, adminOnly: true },
              { id: 'earnings', name: 'Doctor Earnings', icon: DollarSign, adminOnly: true },
              { id: 'subscriptions', name: 'Doctor Subscriptions', icon: CreditCard, adminOnly: true },
              { id: 'compliance-documents', name: 'Doctor Compliance Documents', icon: FileText, adminOnly: false },
              { id: 'business-compliance-documents', name: 'Business Compliance Documents', icon: FileCheck, adminOnly: false },
              { id: 'compliance-users', name: 'Compliance Users', icon: User, adminOnly: true },
              { id: 'executive-users', name: 'Executive Users', icon: UserCog, adminOnly: true },
              { id: 'settings', name: 'System Settings', icon: Settings, adminOnly: true },
            ].filter(tab => {
              // Show all tabs for admin users
              if (user?.role === 'admin') return true;
              // Show only compliance tabs for compliance users
              if (user?.role === 'compliance') return !tab.adminOnly;
              // Show all tabs except user management for executive users
              if (user?.role === 'executive') {
                return tab.id !== 'compliance-users' && tab.id !== 'executive-users';
              }
              return false;
            }).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                    setSearchTerm('');
                    setIsSidebarOpen(false); // close on mobile after navigation
                  }}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors group ${
                    activeTab === tab.id
                      ? isDarkMode
                        ? 'bg-blue-900 text-blue-100 border border-blue-800 shadow-lg'
                        : 'bg-blue-600 text-white shadow-md'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${!isSidebarCollapsed ? 'mr-3' : ''}`} />
                  {!isSidebarCollapsed && <span className="truncate">{tab.name}</span>}
                  {isSidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-lg border border-gray-700">{tab.name}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Fixed Bottom Section - User Info and Actions */}
        <div className={`mt-auto p-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} bg-inherit`}>          
          {/* User Profile Section */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} mb-4`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <User className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.role === 'compliance' ? 'Compliance Officer' : 'Admin User'}
                </p>
                <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email || 'admin@gmail.com'}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={fetchAllData}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center'} px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
              {!isSidebarCollapsed && 'Refresh Data'}
            </button>

            <button
              onClick={() => setShowChangePassword(v => !v)}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center'} px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/50'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <Shield className={`h-4 w-4 ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
              {!isSidebarCollapsed && (showChangePassword ? 'Cancel' : 'Change Password')}
            </button>

            <button
              onClick={logout}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center'} px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <LogOut className={`h-4 w-4 ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
              {!isSidebarCollapsed && 'Logout'}
            </button>
          </div>

          {showChangePassword && (
            <div className={`mt-3 p-3 rounded-lg border ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
              <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Update your admin password</p>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className={`w-full px-4 py-2 pr-10 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                  <button type="button" onClick={() => setShowCurrentPwd(v=>!v)} className="absolute inset-y-0 right-0 px-3 text-gray-400">
                    {showCurrentPwd ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    className={`w-full px-4 py-2 pr-10 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                  <button type="button" onClick={() => setShowNewPwd(v=>!v)} className="absolute inset-y-0 right-0 px-3 text-gray-400">
                    {showNewPwd ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
                <button
                  disabled={changePwdLoading}
                  onClick={async () => {
                    if (!currentPassword || !newPassword) {
                      alert('Please fill both fields');
                      return;
                    }
                    if (newPassword.length < 6) {
                      alert('New password must be at least 6 characters');
                      return;
                    }
                    try {
                      setChangePwdLoading(true);
                      await adminAPI.changePassword(currentPassword, newPassword);
                      alert('Password changed successfully. You will be logged out to re-authenticate.');
                      setCurrentPassword('');
                      setNewPassword('');
                      setShowChangePassword(false);
                      // Force re-authentication so the new password is used on next login
                      setTimeout(() => {
                        logout();
                      }, 300);
                    } catch (err) {
                      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to change password';
                      alert(msg);
                    } finally {
                      setChangePwdLoading(false);
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg ${isDarkMode ? 'bg-purple-700 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                >
                  {changePwdLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
  <div className={`relative z-10 flex-1 flex flex-col min-w-0 ml-0 transition-[margin] duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Top Header */}
  <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/80 supports-[backdrop-filter]:backdrop-blur-md backdrop-blur border-blue-200'} relative z-40 border-b px-4 sm:px-6 py-4 shadow-sm`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`} />
              </button>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} capitalize`}>
                {activeTab === 'settings' ? 'System Settings' :
                 activeTab === 'earnings' ? 'Doctor Earnings' :
                 activeTab === 'compliance-documents' ? 'Doctor Compliance Documents' :
                 activeTab === 'business-compliance-documents' ? 'Business Compliance Documents' :
                 activeTab === 'availability-slots' ? 'Availability Slots' :
                 activeTab}
              </h2>
            </div>

            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              {/* Admin Notification Center */}
              <AdminNotificationCenter />

              {dataLoading && (
                <div className="flex items-center space-x-2">
                  <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</span>
                </div>
              )}

              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {activeTab === 'overview' ? 'Dashboard overview and statistics' :
             activeTab === 'doctors' ? 'Manage registered doctors and their verification status' :
             activeTab === 'businesses' ? 'Manage registered businesses and their profiles' :
             activeTab === 'doctor-assignments' ? 'Assign doctors to specific businesses for exclusive access' :
             activeTab === 'services' ? 'Configure available medical services' :
             activeTab === 'availability-slots' ? 'Manage appointment time slots for online consultations' :
             activeTab === 'settings' ? 'System-wide configuration settings' :
             activeTab === 'requests' ? 'Monitor and manage service requests' :
             activeTab === 'transactions' ? 'View payment transactions and financial data' :
             activeTab === 'earnings' ? 'Track doctor earnings and payments' :
             activeTab === 'compliance-documents' ? 'Manage compliance document types and verification' :
             activeTab === 'compliance-users' ? 'Manage compliance officers who review documents' :
             activeTab === 'executive-users' ? 'Manage executive users with full platform access' :
             'Manage your platform'}
          </p>
        </div>

        {/* Content Area with Search */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {/* Search Bar - Only show on non-overview tabs */}
            {activeTab !== 'overview' && (
              <div className="mb-6">
                <div className="relative max-w-md">
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
                      activeTab === 'settings' ? "Search settings by key, category, description..." :
                      activeTab === 'requests' ? "Search requests by service type, business, doctor..." :
                      activeTab === 'transactions' ? "Search transactions by payment ID, doctor ID..." :
                      activeTab === 'earnings' ? "Search by doctor name..." :
                      activeTab === 'compliance-documents' ? "Search document types by name..." :
                      activeTab === 'compliance-users' ? "Search compliance users by name, email..." :
                      activeTab === 'executive-users' ? "Search executive users by name, email..." :
                      "Search..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            )}
        {/* Tab Content */}
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
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-blue-600' : 'bg-white/90 border-blue-200 hover:border-blue-400'}`}
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
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-purple-600' : 'bg-white/90 border-blue-200 hover:border-purple-400'}`}
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
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-green-600' : 'bg-white/90 border-blue-200 hover:border-green-400'}`}
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
                className={`p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 group relative overflow-hidden cursor-pointer text-left w-full ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-amber-600' : 'bg-white/90 border-blue-200 hover:border-amber-400'}`}
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
            <div className={`rounded-2xl shadow border overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'}`}>
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
                  (`Overview rendering request ${request.id}: status=${request.status}, completedAt=${request.completedAt}, isPaid=${request.isPaid}`);
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
                                  {formatDuration(request.estimatedDuration || request.attributes?.estimatedDuration) || 'TBD'}min
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
          <div className={`rounded-2xl shadow border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'}`}>
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
                  {paginatedDoctors.length > 0 ? paginatedDoctors.map((doctor) => {
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
                            {/* Admin and Executive actions: Verify/Unverify */}
                            {(user?.role === 'admin' || user?.role === 'executive') && (
                              <>
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
                              </>
                            )}
                            
                            {/* View button - available to all users */}
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
                            
                            {/* Admin and Executive actions: Edit and Delete */}
                            {(user?.role === 'admin' || user?.role === 'executive') && (
                              <>
                                <button 
                                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm ${isDarkMode ? 'bg-blue-700 text-blue-200 hover:bg-blue-600' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditDoctor(doctor);
                                  }}
                                  title="Edit doctor details"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm ${isDarkMode ? 'bg-red-700 text-red-200 hover:bg-red-600' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteDoctor(doctor);
                                  }}
                                  title="Delete doctor"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
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
            
            {/* Doctors Pagination */}
            {filteredDoctors.length > 0 && (
              <div className={`px-6 py-4 border-t flex items-center justify-between ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing {((doctorsCurrentPage - 1) * doctorsPerPage) + 1} to {Math.min(doctorsCurrentPage * doctorsPerPage, filteredDoctors.length)} of {filteredDoctors.length} doctors
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDoctorsCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={doctorsCurrentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      doctorsCurrentPage === 1
                        ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <span className={`px-3 py-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Page {doctorsCurrentPage} of {totalDoctorsPages}
                  </span>
                  
                  <button
                    onClick={() => setDoctorsCurrentPage(prev => Math.min(prev + 1, totalDoctorsPages))}
                    disabled={doctorsCurrentPage === totalDoctorsPages}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      doctorsCurrentPage === totalDoctorsPages
                        ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-2xl shadow border`}>
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
                  {paginatedBusinesses.length > 0 ? paginatedBusinesses.map((business) => {
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
                            {/* Admin and Executive actions: Verify/Unverify */}
                            {(user?.role === 'admin' || user?.role === 'executive') && (
                              <>
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
                              </>
                            )}
                            
                            {/* View button - available to all users */}
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
                            
                            {/* Admin and Executive actions: Edit and Delete */}
                            {(user?.role === 'admin' || user?.role === 'executive') && (
                              <>
                                <button 
                                  className={`${isDarkMode ? 'bg-blue-700 text-blue-200 hover:bg-blue-600' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditBusiness(business);
                                  }}
                                  title="Edit business details"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  className={`${isDarkMode ? 'bg-red-700 text-red-200 hover:bg-red-600' : 'bg-red-100 text-red-700 hover:bg-red-200'} px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteBusiness(business);
                                  }}
                                  title="Delete business"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
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
            
            {/* Businesses Pagination */}
            {filteredBusinesses.length > 0 && (
              <div className={`px-6 py-4 border-t flex items-center justify-between ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing {((businessesCurrentPage - 1) * businessesPerPage) + 1} to {Math.min(businessesCurrentPage * businessesPerPage, filteredBusinesses.length)} of {filteredBusinesses.length} businesses
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setBusinessesCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={businessesCurrentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      businessesCurrentPage === 1
                        ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <span className={`px-3 py-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Page {businessesCurrentPage} of {totalBusinessesPages}
                  </span>
                  
                  <button
                    onClick={() => setBusinessesCurrentPage(prev => Math.min(prev + 1, totalBusinessesPages))}
                    disabled={businessesCurrentPage === totalBusinessesPages}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      businessesCurrentPage === totalBusinessesPages
                        ? isDarkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compliance Users Tab */}
        {activeTab === 'compliance-users' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <User className="h-5 w-5 text-purple-500 mr-2" />
                  Compliance Users
                  <button 
                    onClick={fetchAllData}
                    className={`ml-3 p-1.5 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-md transition-colors`} 
                    title="Refresh data"
                  >
                    <RefreshCw className="h-4 w-4 text-purple-400" />
                  </button>
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage compliance officers who can review and approve/reject documents</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`text-sm px-3 py-1 rounded-full ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                  <span className="font-medium">{complianceUsers.length}</span> Users
                </div>
                <button
                  onClick={() => {
                    setEditingComplianceUser(null);
                    setComplianceUserFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      password: '',
                      confirmPassword: '',
                      isActive: true
                    });
                    setShowComplianceUserForm(true);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isDarkMode 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } flex items-center space-x-2`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Compliance User</span>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {filteredComplianceUsers.length > 0 ? (
                <>
                  <div className="grid gap-4">
                  {paginatedComplianceUsers.map((user) => (
                    <div key={user.id} className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'} flex items-center justify-center`}>
                            <User className={`h-5 w-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {user.firstName} {user.lastName}
                              </h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.isActive 
                                  ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                  : isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                              }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {user.email}
                            </p>
                            <div className="flex items-center space-x-4 text-xs mt-1">
                              <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                Role: Compliance Officer
                              </span>
                              {user.createdAt && (
                                <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  Created: {formatDate(user.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditComplianceUser(user)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              isDarkMode 
                                ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            } flex items-center space-x-1`}
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteComplianceUser(user.id)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              isDarkMode 
                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            } flex items-center space-x-1`}
                          >
                            <X className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination for Compliance Users */}
                {totalComplianceUsersPages > 1 && (
                  <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'} border-t mt-6 rounded-b-lg`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Showing {complianceUsersStartIndex + 1}-{Math.min(complianceUsersEndIndex, filteredComplianceUsers.length)} of {filteredComplianceUsers.length} filtered users ({complianceUsers.length} total)
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleComplianceUsersPageChange(complianceUsersCurrentPage - 1)}
                          disabled={complianceUsersCurrentPage === 1}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        
                        <div className="flex space-x-1">
                          {Array.from({ length: totalComplianceUsersPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => handleComplianceUsersPageChange(page)}
                              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                complianceUsersCurrentPage === page
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => handleComplianceUsersPageChange(complianceUsersCurrentPage + 1)}
                          disabled={complianceUsersCurrentPage === totalComplianceUsersPages}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </>
              ) : (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No compliance users found</h3>
                <p className="text-sm mb-4">Create compliance users to manage document approvals</p>
                <button
                  onClick={() => {
                    setEditingComplianceUser(null);
                    setComplianceUserFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      password: '',
                      confirmPassword: '',
                      isActive: true
                    });
                    setShowComplianceUserForm(true);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isDarkMode 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } flex items-center space-x-2 mx-auto`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Compliance User</span>
                </button>
              </div>
            )} 

            </div>
          </div>
        )}

        {/* Executive Users Tab */}
        {activeTab === 'executive-users' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <UserCog className="h-5 w-5 text-blue-500 mr-2" />
                  Executive Users
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage executive users with full platform access</p>
              </div>
              <button
                onClick={() => {
                  setEditingExecutiveUser(null);
                  setExecutiveUserFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    isActive: true
                  });
                  setShowExecutiveUserForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center font-medium"
                disabled={dataLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Executive User
              </button>
            </div>

            <div className="p-6">
            {executiveUsers.length > 0 ? (
              <>
                <div className="grid gap-4">
                  {(() => {
                    const filteredUsers = executiveUsers.filter(user => {
                      if (!searchTerm) return true;
                      return user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             user.email?.toLowerCase().includes(searchTerm.toLowerCase());
                    });

                    const startIndex = (executiveUsersCurrentPage - 1) * executiveUsersPerPage;
                    const endIndex = startIndex + executiveUsersPerPage;
                    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

                    return paginatedUsers.map((user) => (
                      <div key={user.id} className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-lg p-4 border`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-blue-100'}`}>
                              <UserCog className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {user.firstName} {user.lastName}
                              </h3>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {user.email}
                              </p>
                              <div className="flex items-center space-x-3 mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                  Executive
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  user.isActive !== false 
                                    ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                                    : (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                                }`}>
                                  {user.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditExecutiveUser(user)}
                              disabled={dataLoading}
                              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white hover:bg-gray-50 text-gray-600'} border border-gray-300 dark:border-gray-600`}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExecutiveUser(user.id)}
                              disabled={dataLoading}
                              className="p-2 rounded-lg border border-red-300 dark:border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Pagination for Executive Users */}
                {(() => {
                  const filteredUsers = executiveUsers.filter(user => {
                    if (!searchTerm) return true;
                    return user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase());
                  });
                  const totalPages = Math.ceil(filteredUsers.length / executiveUsersPerPage);

                  if (totalPages <= 1) return null;

                  return (
                    <div className="flex items-center justify-between mt-6">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Showing {((executiveUsersCurrentPage - 1) * executiveUsersPerPage) + 1} to {Math.min(executiveUsersCurrentPage * executiveUsersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setExecutiveUsersCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={executiveUsersCurrentPage === 1}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            executiveUsersCurrentPage === 1
                              ? 'opacity-50 cursor-not-allowed'
                              : isDarkMode 
                                ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <span className={`px-3 py-1.5 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Page {executiveUsersCurrentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setExecutiveUsersCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={executiveUsersCurrentPage === totalPages}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            executiveUsersCurrentPage === totalPages
                              ? 'opacity-50 cursor-not-allowed'
                              : isDarkMode 
                                ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <UserCog className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No executive users found</h3>
                <p className="text-sm mb-4">Create executive users with full platform access except user creation</p>
                <button
                  onClick={() => {
                    setEditingExecutiveUser(null);
                    setExecutiveUserFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      password: '',
                      confirmPassword: '',
                      isActive: true
                    });
                    setShowExecutiveUserForm(true);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isDarkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } flex items-center space-x-2 mx-auto`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Executive User</span>
                </button>
              </div>
            )} 

            </div>
          </div>
        )}

        {/* Doctor Assignments Tab */}
        {activeTab === 'doctor-assignments' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Users className="h-5 w-5 text-indigo-500 mr-2" />
                  Doctor Assignments
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Assign doctors to specific businesses</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <button
                  onClick={() => setShowAssignmentForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center font-medium"
                  disabled={loadingAssignments}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loadingAssignments ? 'Loading...' : 'New Assignment'}
                </button>
                <span className={`${isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700'} px-3 py-1 rounded-full flex items-center`}>
                  <Users className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{doctorAssignments.filter(a => a.isActive).length}</span> Active
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} sticky top-0 z-10`}>
                  <tr>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Doctor
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Business
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Assigned Date
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`px-6 py-3.5 text-left text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                  {doctorAssignments.filter(assignment => assignment.isActive).length > 0 ? (
                    doctorAssignments
                      .filter(assignment => assignment.isActive)
                      .map((assignment, index) => {
                        const doctor = assignment.doctor;
                        const business = assignment.business;
                        
                        return (
                          <tr key={assignment.id} className={`transition-colors ${
                            index % 2 === 0 
                              ? isDarkMode ? 'bg-gray-900/50 hover:bg-gray-800/70' : 'bg-gray-50 hover:bg-gray-100' 
                              : isDarkMode ? 'bg-gray-900 hover:bg-gray-800/50' : 'bg-white hover:bg-gray-50'
                          }`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'} mr-3`}>
                                  <Stethoscope className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                </div>
                                <div>
                                  <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Dr. {doctor?.firstName} {doctor?.lastName}
                                  </div>
                                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {doctor?.specialization || 'General Practice'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-purple-900/40' : 'bg-purple-100'} mr-3`}>
                                  <Building2 className={`h-5 w-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                                </div>
                                <div>
                                  <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {business?.businessName}
                                  </div>
                                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {business?.businessType}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {formatDate(assignment.assignedAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                assignment.isActive
                                  ? isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                                  : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {assignment.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleRemoveAssignment(assignment.id)}
                                disabled={loadingAssignments}
                                className={`text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors ${loadingAssignments ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Remove Assignment"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Users className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                          <h3 className="text-sm font-medium mb-2">No doctor assignments</h3>
                          <p className="text-sm mb-4">Get started by assigning doctors to businesses.</p>
                          <button
                            onClick={() => setShowAssignmentForm(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Assignment
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-2xl shadow border`}>
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
                    ('🆕 Add New Service button clicked');
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
                    ('🆕 Service form should now be visible');
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
                            {formatCurrency(price)}
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
          <div className={`mt-8 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-2xl shadow border`}>
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

        {/* Availability Slot Form Modal */}
        {showSlotForm && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowSlotForm(false)}></div>
              <div className={`relative inline-block align-middle rounded-lg text-left overflow-visible shadow-xl transform transition-all max-w-lg w-full mx-4 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`} style={{ zIndex: 10000 }}>
                <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg leading-6 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`} id="modal-title">
                      {editingSlot ? 'Edit Availability Slot' : 'Add New Availability Slot'}
                    </h3>
                    <button
                      type="button"
                      className={`rounded-md p-2 hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'text-gray-400'}`}
                      onClick={() => setShowSlotForm(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSlotSubmit} className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={slotFormData.date}
                        onChange={handleSlotFormChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-gray-100'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                          Start Time *
                        </label>
                        <input
                          type="time"
                          name="startTime"
                          value={slotFormData.startTime}
                          onChange={handleSlotFormChange}
                          required
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isDarkMode
                              ? 'border-gray-600 bg-gray-700 text-gray-100'
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                          End Time *
                        </label>
                        <input
                          type="time"
                          name="endTime"
                          value={slotFormData.endTime}
                          onChange={handleSlotFormChange}
                          required
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            isDarkMode
                              ? 'border-gray-600 bg-gray-700 text-gray-100'
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={slotFormData.isActive}
                        onChange={handleSlotFormChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Active (Available for booking)
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="submit"
                        disabled={loadingSlots}
                        className={`inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          loadingSlots
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {loadingSlots ? 'Saving...' : editingSlot ? 'Update Slot' : 'Create Slot'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSlotForm(false)}
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

        {/* Availability Slots Tab */}
        {activeTab === 'availability-slots' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  Availability Slots
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage appointment time slots for online consultations</p>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCalendarView('week')}
                    className={`px-3 py-1 rounded-md ${calendarView === 'week' 
                      ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                      : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView('month')}
                    className={`px-3 py-1 rounded-md ${calendarView === 'month' 
                      ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                      : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')
                    }`}
                  >
                    Month
                  </button>
                </div>
                <button
                  onClick={() => {
                    setEditingSlot(null);
                    setSlotFormData({
                      date: selectedDate,
                      startTime: '',
                      endTime: '',
                      serviceType: 'online',
                      maxBookings: 1,
                      isActive: true
                    });
                    setShowSlotForm(true);
                  }}
                  className={`px-4 py-2 rounded-lg text-white font-medium ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'} transition-all duration-200 transform hover:scale-105 flex items-center space-x-2`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Slot</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Calendar Navigation */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      if (calendarView === 'week') {
                        const newWeek = new Date(currentWeek);
                        newWeek.setDate(currentWeek.getDate() - 7);
                        setCurrentWeek(newWeek);
                      } else {
                        const newMonth = new Date(currentWeek);
                        newMonth.setMonth(currentWeek.getMonth() - 1);
                        setCurrentWeek(newMonth);
                      }
                    }}
                    className={`p-3 rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gradient-to-br from-slate-100 to-blue-100 hover:from-blue-200 hover:to-purple-200 border border-blue-200 hover:border-purple-300 shadow-md hover:shadow-lg'} transform hover:scale-110`}
                  >
                    <ChevronsLeft className="h-5 w-5" />
                  </button>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {calendarView === 'week' 
                      ? `Week of ${currentWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      : currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    }
                  </h3>
                  <button
                    onClick={() => {
                      if (calendarView === 'week') {
                        const newWeek = new Date(currentWeek);
                        newWeek.setDate(currentWeek.getDate() + 7);
                        setCurrentWeek(newWeek);
                      } else {
                        const newMonth = new Date(currentWeek);
                        newMonth.setMonth(currentWeek.getMonth() + 1);
                        setCurrentWeek(newMonth);
                      }
                    }}
                    className={`p-3 rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gradient-to-br from-slate-100 to-blue-100 hover:from-blue-200 hover:to-purple-200 border border-blue-200 hover:border-purple-300 shadow-md hover:shadow-lg'} transform hover:scale-110`}
                  >
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    const today = new Date();
                    setCurrentWeek(today);
                    setSelectedDate(formatDateLocal(today));
                  }}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600 shadow-lg'} transform hover:scale-105`}
                >
                  Today
                </button>
              </div>

              {/* Interactive Calendar */}
              {calendarView === 'month' && (
                <div className="mb-6">
                  {/* Month Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {/* Weekday Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className={`p-2 text-center text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar Dates */}
                    {getMonthDates(currentWeek).map((date, index) => {
                      const dateStr = formatDateLocal(date);
                      const isCurrentMonth = isDateInCurrentMonth(date, currentWeek);
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = dateStr === selectedCalendarDate;
                      const datesWithSlots = getDatesWithSlots();
                      const hasSlots = datesWithSlots.has(dateStr);
                      const slotsCount = getSlotsForDate(dateStr).length;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleCalendarDateClick(dateStr)}
                          className={`
                            relative p-2 h-12 text-sm rounded-lg transition-all duration-200 transform hover:scale-105
                            ${!isCurrentMonth 
                              ? (isDarkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600')
                              : isSelected
                              ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-300')
                              : isToday
                              ? (isDarkMode ? 'bg-blue-900 text-blue-100 border border-blue-600' : 'bg-gradient-to-br from-orange-400 to-orange-500 text-white border-2 border-orange-300 shadow-md')
                              : hasSlots
                              ? (isDarkMode ? 'bg-green-900 text-green-100 hover:bg-green-800' : 'bg-gradient-to-br from-emerald-400 to-green-500 text-white hover:from-emerald-500 hover:to-green-600 shadow-md')
                              : (isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gradient-to-br hover:from-purple-50 hover:to-blue-50 border border-transparent hover:border-purple-200')
                            }
                          `}
                        >
                          <span className="block font-medium">{date.getDate()}</span>
                          {hasSlots && (
                            <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${
                              isSelected ? 'bg-white shadow-md' : isDarkMode ? 'bg-green-400' : 'bg-white shadow-lg ring-1 ring-emerald-300'
                            }`}>
                            </div>
                          )}
                          {slotsCount > 0 && (
                            <div className={`absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                              isSelected ? 'bg-white text-blue-600 shadow-md' : isDarkMode ? 'bg-green-400 text-green-900' : 'bg-white text-emerald-600 shadow-lg ring-1 ring-emerald-200'
                            }`}>
                              {slotsCount}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Week View Calendar */}
              {calendarView === 'week' && (
                <div className="grid grid-cols-8 gap-2 mb-6">
                  <div></div> {/* Empty cell for time column */}
                  {getWeekDates(currentWeek).map((date, index) => {
                    const dateStr = formatDateLocal(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = dateStr === selectedCalendarDate;
                    const hasSlots = getDatesWithSlots().has(dateStr);
                    const slotsCount = getSlotsForDate(dateStr).length;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleCalendarDateClick(dateStr)}
                        className={`
                          relative text-center p-3 rounded-lg transition-all duration-200 transform hover:scale-105
                          ${isSelected
                            ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-300')
                            : isToday 
                            ? (isDarkMode ? 'bg-blue-900 text-blue-100 border border-blue-600' : 'bg-gradient-to-br from-orange-400 to-orange-500 text-white border-2 border-orange-300 shadow-md')
                            : hasSlots
                            ? (isDarkMode ? 'bg-green-900 text-green-100 hover:bg-green-800' : 'bg-gradient-to-br from-emerald-400 to-green-500 text-white hover:from-emerald-500 hover:to-green-600 shadow-md')
                            : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gradient-to-br from-slate-50 to-gray-100 text-gray-700 hover:from-purple-50 hover:to-blue-50 border border-gray-200 hover:border-purple-200')
                          }
                        `}
                      >
                        <div className="text-xs font-medium">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-bold">
                          {date.getDate()}
                        </div>
                        {slotsCount > 0 && (
                          <div className={`absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                            isSelected ? 'bg-white text-blue-600 shadow-md' : isDarkMode ? 'bg-green-400 text-green-900' : 'bg-white text-emerald-600 shadow-lg ring-1 ring-emerald-200'
                          }`}>
                            {slotsCount}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Date Slots Panel */}
              {showDateSlots && selectedCalendarDate && (
                <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 shadow-lg'} rounded-xl p-6 mb-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(selectedCalendarDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedDateSlots.length} slot{selectedDateSlots.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setEditingSlot(null);
                          setSlotFormData({
                            date: selectedCalendarDate,
                            startTime: '',
                            endTime: '',
                            serviceType: 'online',
                            maxBookings: 1,
                            isActive: true
                          });
                          setShowSlotForm(true);
                        }}
                        className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'} transition-all duration-200 transform hover:scale-105 flex items-center space-x-2`}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Slot</span>
                      </button>
                      <button
                        onClick={() => setShowDateSlots(false)}
                        className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-red-100 text-red-600 hover:text-red-700'} transition-colors`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {selectedDateSlots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedDateSlots.map((slot) => {
                        const slotData = slot.attributes || slot;
                        return (
                          <div key={slot.id || slot.documentId} className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 shadow-lg hover:shadow-xl'} rounded-xl p-4 transition-all duration-200 transform hover:scale-105`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                                  <Clock className="h-4 w-4 text-white" />
                                </div>
                                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                  {formatTime(slotData.startTime)} - {formatTime(slotData.endTime)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => fetchIndividualSlots(slot)}
                                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-600 text-blue-400' : 'hover:bg-purple-100 text-purple-600'} transition-colors`}
                                  title="View Individual Slots"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditSlot(slot)}
                                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-blue-100 text-blue-600'} transition-colors`}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slot)}
                                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100 text-red-600'} transition-colors`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                                Max: {slotData.maxBookings} booking{slotData.maxBookings !== 1 ? 's' : ''}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                slotData.isActive 
                                  ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md' 
                                  : 'bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-md'
                              }`}>
                                {slotData.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No slots available for this date</p>
                      <p className="text-xs mt-1">Click "Add Slot" to create your first time slot</p>
                    </div>
                  )}
                </div>
              )}
                
              {/* Empty state */}
              {!showDateSlots && availabilitySlots.filter(slot => {
                const slotData = slot.attributes || slot;
                return slotData.serviceType === 'online';
              }).length === 0 && (
                <div className="text-center py-12">
                  <Clock className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'} mb-2`}>
                    No availability slots yet
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} mb-4`}>
                    Create time slots for patients to book online consultations
                  </p>
                  <button
                    onClick={() => {
                      setEditingSlot(null);
                      setSlotFormData({
                        date: formatDateLocal(new Date()),
                        startTime: '',
                        endTime: '',
                        serviceType: 'online',
                        maxBookings: 1,
                        isActive: true
                      });
                      setShowSlotForm(true);
                    }}
                    className={`px-4 py-2 rounded-lg text-white ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-colors flex items-center space-x-2`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Slot</span>
                  </button>
                </div>
              )}
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
              {paginatedServiceRequests.length > 0 ? paginatedServiceRequests.map((request, index) => {
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
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDuration(estimatedDuration)}min</span>
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
                    Showing {serviceRequestsStartIndex + 1}-{Math.min(serviceRequestsEndIndex, filteredRequests.length)} of {filteredRequests.length} filtered requests ({serviceRequests.length} total)
                  </div>
                  
                  {totalServiceRequestsPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleServiceRequestsPageChange(serviceRequestsCurrentPage - 1)}
                        disabled={serviceRequestsCurrentPage === 1}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: totalServiceRequestsPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handleServiceRequestsPageChange(page)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              serviceRequestsCurrentPage === page
                                ? 'bg-blue-600 text-white shadow-sm'
                                : isDarkMode ? 'text-gray-400 bg-gray-800 border border-gray-600 hover:bg-gray-700' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => handleServiceRequestsPageChange(serviceRequestsCurrentPage + 1)}
                        disabled={serviceRequestsCurrentPage === totalServiceRequestsPages}
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
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow border`}>
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
                                  <div key={business.id} className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/90 border-blue-200'} rounded-lg p-4 border`}>
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

        {/* Doctor Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <CreditCard className="h-5 w-5 text-blue-500 mr-2" />
                  Doctor Subscriptions
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage doctor subscription payments and status</p>
              </div>
              
              {/* Subscription Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} text-center`}>
                  <div className="font-bold text-lg">{subscriptionStats.activeSubscriptions}</div>
                  <div className="text-xs">Active</div>
                </div>
                <div className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'} text-center`}>
                  <div className="font-bold text-lg">{subscriptionStats.pastDueSubscriptions}</div>
                  <div className="text-xs">Past Due</div>
                </div>
                <div className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'} text-center`}>
                  <div className="font-bold text-lg">{subscriptionStats.cancelledSubscriptions}</div>
                  <div className="text-xs">Cancelled</div>
                </div>
                <div className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'} text-center`}>
                  <div className="font-bold text-lg">£{(subscriptionStats.monthlyRevenue || 0).toFixed(0)}</div>
                  <div className="text-xs">Monthly Revenue</div>
                </div>
              </div>
            </div>
            
            {/* Subscription Settings Section */}
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center`}>
                <Settings className="h-5 w-5 text-blue-500 mr-2" />
                Subscription Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Subscription Amount */}
                <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-lg border p-4`}>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Monthly Subscription Amount (£)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getSystemSettingValue('doctor_subscription_amount', '29')}
                      onChange={async (e) => {
                        const amount = parseFloat(e.target.value);
                        if (amount >= 0) {
                          try {
                            // Delete the old monthlySubscriptionAmount record if it exists
                            try {
                              await systemSettingsAPI.deleteByKey('monthlySubscriptionAmount');
                            } catch (deleteError) {
                              // Ignore error if record doesn't exist
                              console.log('No monthlySubscriptionAmount record to delete');
                            }
                            
                            // Save with the correct key
                            await systemSettingsAPI.updateByKey('doctor_subscription_amount', {
                              value: amount,
                              dataType: 'number',
                              description: 'Monthly subscription amount for doctors in GBP',
                              category: 'subscription',
                              isPublic: true
                            });
                            await fetchAllData();
                          } catch (error) {
                            console.error('Error updating subscription amount:', error);
                            alert('Failed to update subscription amount');
                          }
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="29.00"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      per month
                    </span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                    This amount will be charged to all new doctor subscriptions
                  </p>
                </div>
                
                {/* Subscription Requirements */}
                <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-lg border p-4`}>
                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                    Subscription Requirements
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Valid medical license required
                    </div>
                    <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      All compliance documents uploaded
                    </div>
                    <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Active subscription payment
                    </div>
                    <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Automatic recurring billing
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {subscriptions.length > 0 ? (
                <div className="space-y-6">
                  {subscriptions
                    .filter(subscription => subscription && typeof subscription === 'object') // Filter out null/undefined subscriptions
                    .filter(subscription => {
                      if (!searchTerm) return true;
                      const doctorName = `${subscription.doctor?.firstName || ''} ${subscription.doctor?.lastName || ''}`.toLowerCase();
                      const doctorEmail = subscription.doctor?.email?.toLowerCase() || '';
                      const status = (subscription.subscriptionStatus || subscription.status || '')?.toLowerCase();
                      const search = searchTerm.toLowerCase();
                      
                      return doctorName.includes(search) || doctorEmail.includes(search) || status.includes(search);
                    })
                    .map((subscription) => {
                      const doctor = subscription.doctor;
                      const actualStatus = subscription.subscriptionStatus || subscription.status;
                      const isActive = actualStatus === 'active';
                      const isPastDue = actualStatus === 'past_due';
                      const isCancelled = actualStatus === 'cancelled' || actualStatus === 'canceled';
                      
                      return (
                        <div key={subscription.id} className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border p-6`}>
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                isActive ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                                isPastDue ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                                isCancelled ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') :
                                (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600')
                              }`}>
                                {doctor?.firstName?.charAt(0)}{doctor?.lastName?.charAt(0)}
                              </div>
                              
                              <div className="flex-1">
                                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  Dr. {doctor?.firstName} {doctor?.lastName}
                                </h3>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {doctor?.email}
                                </p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  License: {doctor?.licenseNumber}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              <div className="text-center lg:text-right">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                    isActive ? 'bg-green-600 text-white' :
                                    isPastDue ? 'bg-yellow-600 text-white' :
                                    isCancelled ? 'bg-red-600 text-white' :
                                    'bg-gray-600 text-white'
                                  }`}>
                                    {(actualStatus || 'unknown').replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                                
                                <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  £{subscription.amount}/month
                                </div>
                                
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {subscription.nextPaymentDate && (
                                    <div>Next: {formatDate(subscription.nextPaymentDate)}</div>
                                  )}
                                  {subscription.lastPaymentDate && (
                                    <div>Last: {formatDate(subscription.lastPaymentDate)}</div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                {isActive && (
                                  <button
                                    onClick={async () => {
                                      if (confirm('Are you sure you want to cancel this subscription?')) {
                                        try {
                                          await subscriptionAPI.cancel(subscription.id, { 
                                            cancelledBy: 'admin',
                                            reason: 'Cancelled by admin via dashboard'
                                          });
                                          await fetchAllData();
                                          alert('Subscription cancelled successfully');
                                        } catch (error) {
                                          console.error('Error cancelling subscription:', error);
                                          alert('Failed to cancel subscription');
                                        }
                                      }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {subscription.notes && (
                            <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <strong>Notes:</strong> {subscription.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-xl p-8`}>
                    <CreditCard className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No subscriptions found</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Doctor subscriptions will appear here once doctors start subscribing to the service.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compliance Document Types Management Tab */}
        {activeTab === 'compliance-documents' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow border`}>
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

        {/* System Settings Tab */}
        {activeTab === 'settings' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-2xl shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Settings className="h-5 w-5 text-blue-500 mr-2" />
                  System Settings
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Configure system-wide settings and preferences</p>
              </div>
              <button
                onClick={() => {
                  setEditingSystemSetting(null);
                  setSystemSettingFormData({
                    key: '',
                    value: '',
                    dataType: 'string',
                    description: '',
                    category: 'general',
                    isPublic: false
                  });
                  setShowSystemSettingForm(true);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } flex items-center space-x-2`}
              >
                <Plus className="h-4 w-4" />
                <span>Add Setting</span>
              </button>
            </div>
            
            <div className="p-6">
              {systemSettings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <th className={`text-left py-3 px-4 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Key</th>
                        <th className={`text-left py-3 px-4 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Value</th>
                        <th className={`text-left py-3 px-4 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type</th>
                        <th className={`text-left py-3 px-4 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</th>
                        <th className={`text-left py-3 px-4 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Public</th>
                        <th className={`text-left py-3 px-4 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemSettings
                        .filter(setting => {
                          if (!searchTerm) return true;
                          const search = searchTerm.toLowerCase();
                          return (
                            setting.key?.toLowerCase().includes(search) ||
                            setting.value?.toLowerCase().includes(search) ||
                            setting.category?.toLowerCase().includes(search) ||
                            setting.description?.toLowerCase().includes(search)
                          );
                        })
                        .map((setting) => (
                          <tr key={setting.id} className={`border-b ${isDarkMode ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}>
                            <td className={`py-4 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              <div className="font-medium">{setting.key}</div>
                              {setting.description && (
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                  {setting.description}
                                </div>
                              )}
                            </td>
                            <td className={`py-4 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              <div className="max-w-xs truncate">
                                {setting.dataType === 'boolean' ? (setting.value === 'true' ? 'Yes' : 'No') : setting.value}
                              </div>
                            </td>
                            <td className={`py-4 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                setting.dataType === 'number' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                setting.dataType === 'boolean' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                setting.dataType === 'json' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {setting.dataType}
                              </span>
                            </td>
                            <td className={`py-4 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                setting.category === 'pricing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                setting.category === 'system' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {setting.category}
                              </span>
                            </td>
                            <td className={`py-4 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                setting.isPublic ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {setting.isPublic ? 'Public' : 'Private'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditSystemSetting(setting)}
                                  className={`p-2 rounded-md text-sm transition-colors ${
                                    isDarkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title="Edit setting"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSystemSetting(setting.id)}
                                  className={`p-2 rounded-md text-sm transition-colors ${
                                    isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'
                                  }`}
                                  title="Delete setting"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-xl p-8`}>
                    <Settings className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No system settings configured</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                      System settings allow you to configure platform-wide preferences and values.
                    </p>
                    <button
                      onClick={() => {
                        setEditingSystemSetting(null);
                        setSystemSettingFormData({
                          key: '',
                          value: '',
                          dataType: 'string',
                          description: '',
                          category: 'general',
                          isPublic: false
                        });
                        setShowSystemSettingForm(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add First Setting</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Business Compliance Documents Tab */}
        {activeTab === 'business-compliance-documents' && (
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow border`}>
            <div className={`p-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} p-2 rounded-lg`}>
                    <FileCheck className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Business Compliance Document Types</h2>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Manage required document types for business compliance</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEnableAutoExpiryForAllBusiness}
                    disabled={dataLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Clock className="h-4 w-4" />
                    <span>Enable Auto-Expiry for All</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingBusinessDocumentType(null);
                      setBusinessDocumentTypeFormData({
                        name: '',
                        required: true,
                        description: '',
                        autoExpiry: true,
                        validityYears: 1,
                        expiryWarningDays: 30,
                        category: 'registration',
                        allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
                        maxFileSize: 10485760,
                        examples: '',
                        helpText: ''
                      });
                      setShowBusinessDocumentTypeForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Document Type</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {businessComplianceDocumentTypesLoading ? (
                <div className="text-center py-12">
                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-xl p-8`}>
                    <div className="flex items-center justify-center mb-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                    <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading Business Document Types</h3>
                    <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Please wait while we load the business compliance document types...
                    </p>
                  </div>
                </div>
              ) : businessComplianceDocumentTypes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {businessComplianceDocumentTypes.map((docType) => (
                    <div
                      key={docType.key || docType.id}
                      className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-lg p-4 border hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <FileCheck className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
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
                        {docType.category && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <span className="font-medium">Category:</span> {docType.category}
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
                        {docType.examples && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <span className="font-medium">Examples:</span> {docType.examples}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditBusinessDocumentType(docType)}
                          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                            isDarkMode 
                              ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBusinessDocumentType(docType)}
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
                    <FileCheck className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No business document types found</h3>
                    <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No business compliance document types have been created yet. Click the "Add Document Type" button to create one.
                    </p>
                    <button
                      onClick={() => {
                        setEditingBusinessDocumentType(null);
                        setBusinessDocumentTypeFormData({
                          name: '',
                          required: true,
                          description: '',
                          autoExpiry: true,
                          validityYears: 1,
                          expiryWarningDays: 30,
                          category: 'registration',
                          allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
                          maxFileSize: 10485760,
                          examples: '',
                          helpText: ''
                        });
                        setShowBusinessDocumentTypeForm(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
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

      {/* Business Document Type Form Modal */}
      {showBusinessDocumentTypeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-500 mr-2" />
                {editingBusinessDocumentType ? 'Edit Business Document Type' : 'Add Business Document Type'}
              </h2>
              <button
                onClick={() => setShowBusinessDocumentTypeForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleBusinessDocumentTypeSubmit} className="p-6 space-y-6">
              <div>
                <label htmlFor="businessDocumentTypeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  id="businessDocumentTypeName"
                  name="name"
                  value={businessDocumentTypeFormData.name}
                  onChange={handleBusinessDocumentTypeFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="e.g., Business Registration Certificate"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This is what users will see when uploading documents
                </p>
              </div>

              <div>
                <label htmlFor="businessDocumentTypeDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="businessDocumentTypeDescription"
                  name="description"
                  rows={3}
                  value={businessDocumentTypeFormData.description}
                  onChange={handleBusinessDocumentTypeFormChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="Describe what this document is for and any specific requirements..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="required"
                      checked={businessDocumentTypeFormData.required}
                      onChange={handleBusinessDocumentTypeFormChange}
                      className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required document</span>
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Business must provide this document to complete registration
                  </p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="autoExpiry"
                      checked={businessDocumentTypeFormData.autoExpiry}
                      onChange={handleBusinessDocumentTypeFormChange}
                      className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable auto-expiry tracking</span>
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Track document expiry dates and send reminders
                  </p>
                </div>
              </div>

              {businessDocumentTypeFormData.autoExpiry && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div>
                    <label htmlFor="businessDocumentTypeValidityYears" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Validity Period (Years) *
                    </label>
                    <input
                      type="number"
                      id="businessDocumentTypeValidityYears"
                      name="validityYears"
                      min="1"
                      max="10"
                      value={businessDocumentTypeFormData.validityYears}
                      onChange={handleBusinessDocumentTypeFormChange}
                      required={businessDocumentTypeFormData.autoExpiry}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="businessDocumentTypeExpiryWarningDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Warning Days *
                    </label>
                    <input
                      type="number"
                      id="businessDocumentTypeExpiryWarningDays"
                      name="expiryWarningDays"
                      min="1"
                      max="365"
                      value={businessDocumentTypeFormData.expiryWarningDays}
                      onChange={handleBusinessDocumentTypeFormChange}
                      required={businessDocumentTypeFormData.autoExpiry}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className={`p-4 rounded-lg ${businessDocumentTypeFormData.autoExpiry ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                <h4 className={`font-medium mb-2 ${businessDocumentTypeFormData.autoExpiry ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                  Auto-Expiry Settings
                </h4>
                <p className={`text-sm ${businessDocumentTypeFormData.autoExpiry ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {businessDocumentTypeFormData.autoExpiry 
                    ? `Documents will automatically expire ${businessDocumentTypeFormData.validityYears} year(s) after issue date and show warning ${businessDocumentTypeFormData.expiryWarningDays} days before expiry.`
                    : 'Enable expiry tracking for documents that have a validity period (e.g., business licenses, insurance certificates).'
                  }
                </p>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBusinessDocumentTypeForm(false)}
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 mr-2" />
                      {editingBusinessDocumentType ? 'Update Document Type' : 'Create Document Type'}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow w-full border max-h-[95vh] flex flex-col max-w-5xl xl:max-w-6xl`}>          
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
                    {/* Email Verification Toggle */}
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email Verified:</span>
                      {(() => {
                        const emailVerified = (selectedDoctor.isEmailVerified !== undefined ? selectedDoctor.isEmailVerified : selectedDoctor.attributes?.isEmailVerified) || false;
                        return (
                          <div className="flex items-center space-x-3">
                            <span className={`font-medium ${emailVerified ? 'text-green-600' : 'text-red-600'}`}>{emailVerified ? 'Yes' : 'No'}</span>
                            <button
                              onClick={() => handleToggleDoctorEmailVerified(selectedDoctor)}
                              disabled={updatingDoctorEmailVerifiedId === selectedDoctor.id}
                              className={`px-3 py-1.5 rounded font-medium text-xs transition-colors ${
                                emailVerified
                                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={emailVerified ? 'Mark as unverified' : 'Mark as verified'}
                            >
                              {updatingDoctorEmailVerifiedId === selectedDoctor.id
                                ? 'Updating...'
                                : emailVerified ? 'Set Unverified' : 'Mark Verified'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Subscription Exemption Toggle */}
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Allow Without Subscription:</span>
                      {(() => {
                        const allowWithoutSubscription = (selectedDoctor.allowWithoutSubscription !== undefined ? selectedDoctor.allowWithoutSubscription : selectedDoctor.attributes?.allowWithoutSubscription) || false;
                        return (
                          <div className="flex items-center space-x-3">
                            <span className={`font-medium ${allowWithoutSubscription ? 'text-green-600' : 'text-red-600'}`}>{allowWithoutSubscription ? 'Yes' : 'No'}</span>
                            <button
                              onClick={() => handleToggleDoctorSubscriptionExemption(selectedDoctor)}
                              disabled={updatingDoctorSubscriptionExemptionId === selectedDoctor.id}
                              className={`px-3 py-1.5 rounded font-medium text-xs transition-colors ${
                                allowWithoutSubscription
                                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                              title={allowWithoutSubscription ? 'Require subscription' : 'Allow without subscription'}
                            >
                              {updatingDoctorSubscriptionExemptionId === selectedDoctor.id
                                ? 'Updating...'
                                : allowWithoutSubscription ? 'Require Subscription' : 'Allow Without Subscription'}
                            </button>
                          </div>
                        );
                      })()}
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
                                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white/90 border-blue-200'} border rounded-lg p-4 transition-all duration-200 ${
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
                              onClick={() => loadReferenceDetails(reference)}
                              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white/90 border-blue-200 hover:bg-blue-50'} border rounded-lg p-4 cursor-pointer transition-colors duration-200`}
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
                                  <div className="mt-2 flex items-center text-blue-600">
                                    <Eye className="h-3 w-3 mr-1" />
                                    <span className="text-xs font-medium">Click to view response</span>
                                  </div>
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
      {(() => {
        ('🔍 Modal render check:', {
          showDocumentModal,
          selectedDocument,
          shouldShow: showDocumentModal && selectedDocument
        });
        
        if (!showDocumentModal || !selectedDocument) {
          ('❌ Modal not showing because:', {
            showDocumentModal,
            selectedDocument: !!selectedDocument
          });
          return false;
        }
        
        ('✅ Modal should be visible');
        return true;
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
             style={{display: 'flex !important', zIndex: 9999}}
             key={selectedDocument?.id || selectedDocument?.documentId}>
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow max-w-4xl w-full border max-h-[90vh] flex flex-col`}>
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
                      {(() => {
                        // Try to find document type name from business document types first, then general document types
                        const businessDocType = businessDocumentTypes.find(dt => dt.id === selectedDocument.documentType);
                        const generalDocType = documentTypes.find(dt => dt.key === selectedDocument.documentType);
                        return businessDocType?.name || generalDocType?.name || selectedDocument.documentType;
                      })()}
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
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-right max-w-xs truncate`}>{selectedDocument.documentName || selectedDocument.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>File Name:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-right max-w-xs truncate`}>
                        {selectedDocument.originalFileName || selectedDocument.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Upload Date:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(selectedDocument.uploadedAt || selectedDocument.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>File Size:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{((selectedDocument.fileSize || 0) / 1024).toFixed(1)} KB</span>
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
                  <div className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white/90 border-blue-200'} border rounded-lg p-8 text-center`}>
                    <FileText className={`h-16 w-16 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} />
                    <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                      {selectedDocument.originalFileName || selectedDocument.fileName}
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                      Click the button below to download and review this document
                    </p>
                    <button
                      onClick={() => window.open(selectedDocument.s3Url || selectedDocument.fileUrl, '_blank')}
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
                      onClick={() => handleModalDocumentVerification(selectedDocument.id, 'verified')}
                      disabled={updatingVerification || updatingBusinessDocumentVerification}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center disabled:opacity-50"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      {(updatingVerification || updatingBusinessDocumentVerification) ? 'Updating...' : 'Verify Document'}
                    </button>
                  )}
                  {selectedDocument.verificationStatus !== 'rejected' && (
                    <button
                      onClick={() => handleModalDocumentVerification(selectedDocument.id, 'rejected')}
                      disabled={updatingVerification || updatingBusinessDocumentVerification}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center disabled:opacity-50"
                    >
                      <X className="h-5 w-5 mr-2" />
                      {(updatingVerification || updatingBusinessDocumentVerification) ? 'Updating...' : 'Reject Document'}
                    </button>
                  )}
                  {selectedDocument.verificationStatus !== 'pending' && (
                    <button
                      onClick={() => handleModalDocumentVerification(selectedDocument.id, 'pending')}
                      disabled={updatingVerification || updatingBusinessDocumentVerification}
                      className={`px-6 py-3 rounded-lg transition-colors flex items-center disabled:opacity-50 ${
                        isDarkMode ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      {(updatingVerification || updatingBusinessDocumentVerification) ? 'Updating...' : 'Reset to Pending'}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow w-full border max-h-[95vh] flex flex-col max-w-5xl xl:max-w-6xl`}>
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
                    {/* Email Verification Toggle */}
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email Verified:</span>
                      {(() => {
                        const emailVerified = (selectedBusiness.isEmailVerified !== undefined ? selectedBusiness.isEmailVerified : selectedBusiness.attributes?.isEmailVerified) || false;
                        return (
                          <div className="flex items-center space-x-3">
                            <span className={`font-medium ${emailVerified ? 'text-green-600' : 'text-red-600'}`}>{emailVerified ? 'Yes' : 'No'}</span>
                            <button
                              onClick={() => handleToggleBusinessEmailVerified(selectedBusiness)}
                              disabled={updatingBusinessEmailVerifiedId === selectedBusiness.id}
                              className={`px-3 py-1.5 rounded font-medium text-xs transition-colors ${
                                emailVerified
                                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={emailVerified ? 'Mark as unverified' : 'Mark as verified'}
                            >
                              {updatingBusinessEmailVerifiedId === selectedBusiness.id
                                ? 'Updating...'
                                : emailVerified ? 'Set Unverified' : 'Mark Verified'}
                            </button>
                          </div>
                        );
                      })()}
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

              {/* Business Compliance Documents Section */}
              <div className="mt-8">
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Business Compliance Documents
                    </h3>
                    {loadingBusinessComplianceDocuments && (
                      <div className="flex items-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</span>
                      </div>
                    )}
                  </div>

                  {!loadingBusinessComplianceDocuments && Array.isArray(businessComplianceDocuments) && (
                    <>
                      {/* Documents Summary */}
                      <div className="grid grid-cols-5 gap-4 mb-6">
                        {(() => {
                          try {
                            const allDocs = getAllBusinessDocumentsWithStatus();
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
                            console.error('Error calculating business document stats:', error);
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
                            return getAllBusinessDocumentsWithStatus().map(({ type, config, document, status, expiryStatus, daysUntilExpiry, verificationStatus }) => {
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
                                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white/90 border-blue-200'} border rounded-lg p-4 transition-all duration-200 ${
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
                                      ('🔍 Business View button clicked, document:', document);
                                      setSelectedDocument(document);
                                      setShowDocumentModal(true);
                                      ('📄 Modal should be opening with document:', document);
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
                                          handleBusinessDocumentVerification(document.id, 'verified');
                                        }}
                                        disabled={updatingBusinessDocumentVerification}
                                        className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBusinessDocumentVerification(document.id, 'rejected');
                                        }}
                                        disabled={updatingBusinessDocumentVerification}
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
                            console.error('Error rendering business documents grid:', error);
                            return (
                              <div className="col-span-3 text-center p-4">
                                <span className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  Error loading business compliance documents
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </>
                  )}

                  {!loadingBusinessComplianceDocuments && (!businessComplianceDocuments || businessComplianceDocuments.length === 0) && (
                    <div className="text-center py-8">
                      <FileText className={`h-12 w-12 mx-auto ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        No compliance documents uploaded yet
                      </p>
                    </div>
                  )}

                  {loadingBusinessComplianceDocuments && (
                    <div className="text-center py-8">
                      <RefreshCw className={`h-8 w-8 mx-auto animate-spin ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Loading business compliance documents...
                      </p>
                    </div>
                  )}
                </div>
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

      {/* System Setting Form Modal */}
      {showSystemSettingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-500 mr-2" />
                {editingSystemSetting ? 'Edit System Setting' : 'Add System Setting'}
              </h2>
              <button
                onClick={() => setShowSystemSettingForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSystemSettingSubmit} className="p-6 space-y-6">
              <div>
                <label htmlFor="systemSettingKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Setting Key *
                </label>
                <input
                  type="text"
                  id="systemSettingKey"
                  name="key"
                  value={systemSettingFormData.key}
                  onChange={handleSystemSettingFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="e.g., booking_fee, max_booking_days"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use lowercase letters, numbers, and underscores only.
                </p>
              </div>
              
              <div>
                <label htmlFor="systemSettingValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value *
                </label>
                <input
                  type="text"
                  id="systemSettingValue"
                  name="value"
                  value={systemSettingFormData.value}
                  onChange={handleSystemSettingFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="e.g., 3.50, true, enabled"
                />
              </div>

              <div>
                <label htmlFor="systemSettingDataType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Type *
                </label>
                <select
                  id="systemSettingDataType"
                  name="dataType"
                  value={systemSettingFormData.dataType}
                  onChange={handleSystemSettingFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label htmlFor="systemSettingCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  id="systemSettingCategory"
                  name="category"
                  value={systemSettingFormData.category}
                  onChange={handleSystemSettingFormChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="payments">Payments</option>
                  <option value="booking">Booking</option>
                  <option value="notifications">Notifications</option>
                  <option value="security">Security</option>
                  <option value="ui">User Interface</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="systemSettingDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="systemSettingDescription"
                  name="description"
                  value={systemSettingFormData.description}
                  onChange={handleSystemSettingFormChange}
                  rows="3"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="Optional description of what this setting controls..."
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="systemSettingIsPublic"
                  name="isPublic"
                  checked={systemSettingFormData.isPublic}
                  onChange={handleSystemSettingFormChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="systemSettingIsPublic" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Make this setting publicly accessible (for frontend use)
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSystemSettingForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                >
                  {editingSystemSetting ? 'Update Setting' : 'Create Setting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compliance User Form Modal */}
      {showComplianceUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleComplianceUserSubmit} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingComplianceUser ? 'Edit Compliance User' : 'Add Compliance User'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowComplianceUserForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="complianceUserFirstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="complianceUserFirstName"
                    name="firstName"
                    value={complianceUserFormData.firstName}
                    onChange={handleComplianceUserFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label htmlFor="complianceUserLastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="complianceUserLastName"
                    name="lastName"
                    value={complianceUserFormData.lastName}
                    onChange={handleComplianceUserFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label htmlFor="complianceUserEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="complianceUserEmail"
                    name="email"
                    value={complianceUserFormData.email}
                    onChange={handleComplianceUserFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label htmlFor="complianceUserPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {editingComplianceUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    id="complianceUserPassword"
                    name="password"
                    value={complianceUserFormData.password}
                    onChange={handleComplianceUserFormChange}
                    required={!editingComplianceUser}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                    placeholder={editingComplianceUser ? "Leave blank to keep current password" : "Enter password"}
                    minLength="8"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {editingComplianceUser ? 'Leave blank to keep the current password.' : 'Password must be at least 8 characters long.'}
                  </p>
                </div>

                {!editingComplianceUser && (
                  <div>
                    <label htmlFor="complianceUserConfirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      id="complianceUserConfirmPassword"
                      name="confirmPassword"
                      value={complianceUserFormData.confirmPassword}
                      onChange={handleComplianceUserFormChange}
                      required={!editingComplianceUser}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500"
                      placeholder="Confirm password"
                      minLength="8"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="complianceUserIsActive"
                    name="isActive"
                    checked={complianceUserFormData.isActive}
                    onChange={handleComplianceUserFormChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-700 rounded"
                  />
                  <label htmlFor="complianceUserIsActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Active User
                  </label>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">Compliance User Permissions</h4>
                  <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                    <li>• View doctor compliance documents</li>
                    <li>• View business compliance documents</li>
                    <li>• Approve or reject documents</li>
                    <li>• Add comments to document reviews</li>
                    <li>• No access to other admin functions</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowComplianceUserForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dataLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors font-medium disabled:opacity-50"
                >
                  {dataLoading ? 'Saving...' : (editingComplianceUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Executive User Form Modal */}
      {showExecutiveUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleExecutiveUserSubmit} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingExecutiveUser ? 'Edit Executive User' : 'Add Executive User'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowExecutiveUserForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="executiveUserFirstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="executiveUserFirstName"
                    name="firstName"
                    value={executiveUserFormData.firstName}
                    onChange={handleExecutiveUserFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label htmlFor="executiveUserLastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="executiveUserLastName"
                    name="lastName"
                    value={executiveUserFormData.lastName}
                    onChange={handleExecutiveUserFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label htmlFor="executiveUserEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="executiveUserEmail"
                    name="email"
                    value={executiveUserFormData.email}
                    onChange={handleExecutiveUserFormChange}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label htmlFor="executiveUserPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {editingExecutiveUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    id="executiveUserPassword"
                    name="password"
                    value={executiveUserFormData.password}
                    onChange={handleExecutiveUserFormChange}
                    required={!editingExecutiveUser}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder={editingExecutiveUser ? "Leave blank to keep current password" : "Enter password"}
                    minLength="8"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {editingExecutiveUser ? 'Leave blank to keep the current password.' : 'Password must be at least 8 characters long.'}
                  </p>
                </div>

                {!editingExecutiveUser && (
                  <div>
                    <label htmlFor="executiveUserConfirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      id="executiveUserConfirmPassword"
                      name="confirmPassword"
                      value={executiveUserFormData.confirmPassword}
                      onChange={handleExecutiveUserFormChange}
                      required={!editingExecutiveUser}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                      placeholder="Confirm password"
                      minLength="8"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="executiveUserIsActive"
                    name="isActive"
                    checked={executiveUserFormData.isActive}
                    onChange={handleExecutiveUserFormChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded"
                  />
                  <label htmlFor="executiveUserIsActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Active User
                  </label>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Executive User Permissions</h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Full access to all platform features</li>
                    <li>• View and manage doctors and businesses</li>
                    <li>• Access all compliance documents</li>
                    <li>• View analytics and system settings</li>
                    <li>• Cannot create compliance or executive users</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowExecutiveUserForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dataLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium disabled:opacity-50"
                >
                  {dataLoading ? 'Saving...' : (editingExecutiveUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Reference Details Modal */}
      {showReferenceModal && selectedReference && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white/90 border-blue-200'} rounded-lg shadow max-w-6xl w-full border max-h-[90vh] flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
                    <FileText className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Professional Reference Response
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                      {selectedReference.refereeName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowReferenceModal(false);
                    setSelectedReference(null);
                  }}
                  className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loadingReferenceDetails ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mr-3" />
                  <span className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading reference details...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Referee Information */}
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                      Referee Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Name:</span> {selectedReference.refereeName}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                          <span className="font-medium">Position:</span> {selectedReference.refereePosition}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                          <span className="font-medium">Workplace:</span> {selectedReference.refereeWorkPlace}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Email:</span> {selectedReference.refereeEmail}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                          <span className="font-medium">Work Duration:</span> {selectedReference.workDuration}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                          <span className="font-medium">Last Worked:</span> {selectedReference.lastWorkedWith}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Being Assessed */}
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                      Doctor Being Assessed
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Name:</span> {selectedReference.clinicianName}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                          <span className="font-medium">Email:</span> {selectedReference.clinicianEmail}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Position:</span> {selectedReference.clinicianPosition}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Competency Assessment */}
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                      Clinical Competency Assessment
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedReference.clinicalKnowledge && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Clinical Knowledge</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.clinicalKnowledge)}`}>
                            {selectedReference.clinicalKnowledge}
                          </span>
                        </div>
                      )}

                      {selectedReference.diagnosis && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Diagnosis</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.diagnosis)}`}>
                            {selectedReference.diagnosis}
                          </span>
                        </div>
                      )}

                      {selectedReference.clinicalDecisionMaking && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Clinical Decision Making</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.clinicalDecisionMaking)}`}>
                            {selectedReference.clinicalDecisionMaking}
                          </span>
                        </div>
                      )}

                      {selectedReference.treatment && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Treatment</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.treatment)}`}>
                            {selectedReference.treatment}
                          </span>
                        </div>
                      )}

                      {selectedReference.prescribing && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Prescribing</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.prescribing)}`}>
                            {selectedReference.prescribing}
                          </span>
                        </div>
                      )}

                      {selectedReference.medicalRecordKeeping && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Medical Record Keeping</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.medicalRecordKeeping)}`}>
                            {selectedReference.medicalRecordKeeping}
                          </span>
                        </div>
                      )}

                      {selectedReference.recognisingLimitations && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recognising Limitations</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.recognisingLimitations)}`}>
                            {selectedReference.recognisingLimitations}
                          </span>
                        </div>
                      )}

                      {selectedReference.keepingKnowledgeUpToDate && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Keeping Knowledge Up to Date</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.keepingKnowledgeUpToDate)}`}>
                            {selectedReference.keepingKnowledgeUpToDate}
                          </span>
                        </div>
                      )}

                      {selectedReference.reviewingPerformance && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reviewing Performance</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.reviewingPerformance)}`}>
                            {selectedReference.reviewingPerformance}
                          </span>
                        </div>
                      )}

                      {selectedReference.teachingStudents && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Teaching Students</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.teachingStudents)}`}>
                            {selectedReference.teachingStudents}
                          </span>
                        </div>
                      )}

                      {selectedReference.supervisingColleagues && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Supervising Colleagues</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.supervisingColleagues)}`}>
                            {selectedReference.supervisingColleagues}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional Attributes */}
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                      Professional Attributes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedReference.commitmentToCare && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Commitment to Care</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.commitmentToCare)}`}>
                            {selectedReference.commitmentToCare}
                          </span>
                        </div>
                      )}

                      {selectedReference.communicationWithPatients && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Communication with Patients</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.communicationWithPatients)}`}>
                            {selectedReference.communicationWithPatients}
                          </span>
                        </div>
                      )}

                      {selectedReference.workingEffectivelyWithColleagues && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Working Effectively with Colleagues</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.workingEffectivelyWithColleagues)}`}>
                            {selectedReference.workingEffectivelyWithColleagues}
                          </span>
                        </div>
                      )}

                      {selectedReference.effectiveTimeManagement && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Effective Time Management</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRatingColorClass(selectedReference.effectiveTimeManagement)}`}>
                            {selectedReference.effectiveTimeManagement}
                          </span>
                        </div>
                      )}

                      {selectedReference.respectsPatientConfidentiality && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Respects Patient Confidentiality</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                            selectedReference.respectsPatientConfidentiality === 'Strongly agree' || 
                            selectedReference.respectsPatientConfidentiality === 'Agree' ? 'bg-green-100 text-green-800' :
                            selectedReference.respectsPatientConfidentiality === 'Disagree' || 
                            selectedReference.respectsPatientConfidentiality === 'Strongly disagree' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedReference.respectsPatientConfidentiality}
                          </span>
                        </div>
                      )}

                      {selectedReference.honestAndTrustworthy && (
                        <div className="space-y-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Honest and Trustworthy</h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                            selectedReference.honestAndTrustworthy === 'Strongly agree' || 
                            selectedReference.honestAndTrustworthy === 'Agree' ? 'bg-green-100 text-green-800' :
                            selectedReference.honestAndTrustworthy === 'Disagree' || 
                            selectedReference.honestAndTrustworthy === 'Strongly disagree' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedReference.honestAndTrustworthy}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fitness to Practice Assessment */}
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                      Fitness to Practice Assessment
                    </h3>
                    <div className="space-y-4">
                      {selectedReference.performanceNotImpaired && (
                        <div>
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                            Performance Not Impaired
                          </h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                            selectedReference.performanceNotImpaired === 'Strongly agree' || 
                            selectedReference.performanceNotImpaired === 'Agree' ? 'bg-green-100 text-green-800' :
                            selectedReference.performanceNotImpaired === 'Disagree' || 
                            selectedReference.performanceNotImpaired === 'Strongly disagree' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedReference.performanceNotImpaired}
                          </span>
                        </div>
                      )}

                      {selectedReference.fitToPractice && (
                        <div>
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                            Fit to Practice
                          </h4>
                          <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                            selectedReference.fitToPractice === 'Yes' ? 'bg-green-100 text-green-800' :
                            selectedReference.fitToPractice === 'No' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedReference.fitToPractice}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission Details */}
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                      Submission Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Submitted:</span> {new Date(selectedReference.createdAt).toLocaleString('en-GB')}
                        </p>
                        {selectedReference.submittedAt && (
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                            <span className="font-medium">Completed:</span> {new Date(selectedReference.submittedAt).toLocaleString('en-GB')}
                          </p>
                        )}
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                          <span className="font-medium">Status:</span> {selectedReference.isSubmitted ? 'Completed' : 'In Progress'}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="font-medium">Reference ID:</span> {selectedReference.id}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                          <span className="font-medium">Token:</span> {selectedReference.referenceToken?.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-b-lg`}>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowReferenceModal(false);
                    setSelectedReference(null);
                  }}
                  className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-md transition-colors font-medium`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Doctor Edit Form Modal */}
        {editingDoctor && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingDoctor(null)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-50 ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
                <form onSubmit={handleUpdateDoctor}>
                  <div className={`px-6 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <div className="flex justify-between items-center">
                          <h3 className={`text-lg font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Edit Doctor Information
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingDoctor(null)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                First Name *
                              </label>
                              <input
                                type="text"
                                name="firstName"
                                value={doctorFormData.firstName}
                                onChange={(e) => setDoctorFormData({...doctorFormData, firstName: e.target.value})}
                                required
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                            </div>
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Last Name *
                              </label>
                              <input
                                type="text"
                                name="lastName"
                                value={doctorFormData.lastName}
                                onChange={(e) => setDoctorFormData({...doctorFormData, lastName: e.target.value})}
                                required
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Email *
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={doctorFormData.email}
                              onChange={(e) => setDoctorFormData({...doctorFormData, email: e.target.value})}
                              required
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phoneNumber"
                              value={doctorFormData.phoneNumber}
                              onChange={(e) => setDoctorFormData({...doctorFormData, phoneNumber: e.target.value})}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Specialization
                            </label>
                            <input
                              type="text"
                              name="specialization"
                              value={doctorFormData.specialization}
                              onChange={(e) => setDoctorFormData({...doctorFormData, specialization: e.target.value})}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              License Number
                            </label>
                            <input
                              type="text"
                              name="licenseNumber"
                              value={doctorFormData.licenseNumber}
                              onChange={(e) => setDoctorFormData({...doctorFormData, licenseNumber: e.target.value})}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Availability Status
                              </label>
                              <select
                                name="availabilityStatus"
                                value={doctorFormData.availabilityStatus}
                                onChange={(e) => setDoctorFormData({...doctorFormData, availabilityStatus: e.target.value})}
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              >
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="offline">Offline</option>
                              </select>
                            </div>
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Verification Status
                              </label>
                              <select
                                name="isVerified"
                                value={doctorFormData.isVerified}
                                onChange={(e) => setDoctorFormData({...doctorFormData, isVerified: e.target.value === 'true'})}
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              >
                                <option value="true">Verified</option>
                                <option value="false">Not Verified</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-6 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                      Update Doctor
                    </button>
                    <button
                      type="button"
                      className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setEditingDoctor(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Business Edit Form Modal */}
        {editingBusiness && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingBusiness(null)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-50 ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
                <form onSubmit={handleUpdateBusiness}>
                  <div className={`px-6 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <div className="flex justify-between items-center">
                          <h3 className={`text-lg font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Edit Business Information
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingBusiness(null)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Business Name *
                            </label>
                            <input
                              type="text"
                              name="businessName"
                              value={businessFormData.businessName}
                              onChange={(e) => setBusinessFormData({...businessFormData, businessName: e.target.value})}
                              required
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Email *
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={businessFormData.email}
                              onChange={(e) => setBusinessFormData({...businessFormData, email: e.target.value})}
                              required
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phoneNumber"
                              value={businessFormData.phoneNumber}
                              onChange={(e) => setBusinessFormData({...businessFormData, phoneNumber: e.target.value})}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Address
                            </label>
                            <textarea
                              name="address"
                              value={businessFormData.address}
                              onChange={(e) => setBusinessFormData({...businessFormData, address: e.target.value})}
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
                              Business Type
                            </label>
                            <select
                              name="businessType"
                              value={businessFormData.businessType}
                              onChange={(e) => setBusinessFormData({...businessFormData, businessType: e.target.value})}
                              className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            >
                              <option value="">Select Business Type</option>
                              {businessTypes.map((type) => (
                                <option key={type.id} value={type.value}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Verification Status
                              </label>
                              <select
                                name="isVerified"
                                value={businessFormData.isVerified}
                                onChange={(e) => setBusinessFormData({...businessFormData, isVerified: e.target.value === 'true'})}
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              >
                                <option value="true">Verified</option>
                                <option value="false">Not Verified</option>
                              </select>
                            </div>
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Active Status
                              </label>
                              <select
                                name="isActive"
                                value={businessFormData.isActive}
                                onChange={(e) => setBusinessFormData({...businessFormData, isActive: e.target.value === 'true'})}
                                className={`mt-1 block w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-6 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                      Update Business
                    </button>
                    <button
                      type="button"
                      className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setEditingBusiness(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setDeleteTarget(null)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50 ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
                <div className={`px-6 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className={`text-lg font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Confirm Delete
                      </h3>
                      <div className="mt-2">
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Are you sure you want to delete this {deleteTarget.type}? This action cannot be undone.
                        </p>
                        <p className={`text-sm font-medium mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {deleteTarget.type === 'doctor' 
                            ? `${deleteTarget.item.firstName} ${deleteTarget.item.lastName} (${deleteTarget.item.email})`
                            : `${deleteTarget.item.businessName} (${deleteTarget.item.email})`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`px-6 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Assignment Form Modal */}
        {showAssignmentForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAssignmentForm(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50 ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
                <form onSubmit={handleCreateAssignment}>
                  <div className={`px-6 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className={`text-lg font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Assign Doctor to Business
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowAssignmentForm(false)}
                            className={`rounded-full p-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                              Select Doctor *
                            </label>
                            <select
                              name="doctorId"
                              value={assignmentFormData.doctorId}
                              onChange={handleAssignmentFormChange}
                              required
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'
                              }`}
                            >
                              <option value="">Choose a doctor...</option>
                              {doctors.filter(doctor => doctor.isVerified).map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                  Dr. {doctor.firstName} {doctor.lastName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                              Select Business *
                            </label>
                            <select
                              name="businessId"
                              value={assignmentFormData.businessId}
                              onChange={handleAssignmentFormChange}
                              required
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'
                              }`}
                            >
                              <option value="">Choose a business...</option>
                              {businesses.filter(business => business.isVerified).map((business) => (
                                <option key={business.id} value={business.id}>
                                  {business.businessName} - {business.businessType}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                              Notes (Optional)
                            </label>
                            <textarea
                              name="notes"
                              value={assignmentFormData.notes}
                              onChange={handleAssignmentFormChange}
                              rows={3}
                              placeholder="Add any notes about this assignment..."
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t`}>
                    <button
                      type="submit"
                      disabled={loadingAssignments || !assignmentFormData.doctorId || !assignmentFormData.businessId}
                      className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                        loadingAssignments || !assignmentFormData.doctorId || !assignmentFormData.businessId
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500'
                      }`}
                    >
                      {loadingAssignments ? 'Creating...' : 'Create Assignment'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAssignmentForm(false)}
                      disabled={loadingAssignments}
                      className={`mt-3 w-full inline-flex justify-center rounded-lg border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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

        {/* Individual Slots Modal */}
        {showIndividualSlots && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white dark:bg-gray-800">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Individual Time Slots
                  {selectedBulkSlot && (
                    <span className={`block text-sm font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                      {selectedBulkSlot.attributes?.date || selectedBulkSlot.date} • {formatTime(selectedBulkSlot.attributes?.startTime || selectedBulkSlot.startTime)} - {formatTime(selectedBulkSlot.attributes?.endTime || selectedBulkSlot.endTime)}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowIndividualSlots(false)}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 max-h-96 overflow-y-auto">
                {loadingIndividualSlots ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading individual slots...</span>
                  </div>
                ) : individualSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {individualSlots.map((slot) => {
                      const slotData = slot.attributes || slot;
                      const slotId = slot.id || slot.documentId;
                      const isBooked = slotData.isBooked;
                      
                      return (
                        <div
                          key={slotId}
                          className={`p-3 rounded-lg border-2 ${
                            isBooked 
                              ? (isDarkMode ? 'border-red-500 bg-red-900/20' : 'border-red-300 bg-red-50')
                              : (isDarkMode ? 'border-green-500 bg-green-900/20' : 'border-green-300 bg-green-50')
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <div className={`p-2 rounded-lg ${
                              isBooked 
                                ? (isDarkMode ? 'bg-red-800' : 'bg-red-500')
                                : (isDarkMode ? 'bg-green-700' : 'bg-green-500')
                            }`}>
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-center">
                              <div className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {formatTime(slotData.startTime)} - {formatTime(slotData.endTime)}
                              </div>
                              <div className={`text-xs mt-1 font-semibold ${
                                isBooked
                                  ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                                  : (isDarkMode ? 'text-green-400' : 'text-green-600')
                              }`}>
                                {isBooked ? 'BOOKED' : 'Available'}
                              </div>
                              {isBooked && slotData.bookedBy && (
                                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  by: {slotData.bookedBy}
                                </div>
                              )}
                              {isBooked && slotData.bookedAt && (
                                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {new Date(slotData.bookedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                            {isBooked && (
                              <button
                                onClick={() => handleUnbookIndividualSlot(slotId)}
                                className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'} transition-colors`}
                              >
                                Unbook
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className="text-lg font-medium mb-2">No individual slots found</p>
                    <p className="text-sm">
                      Individual slots will be automatically generated when you create bulk slots.
                    </p>
                  </div>
                )}
              </div>

              <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
                <button
                  onClick={() => setShowIndividualSlots(false)}
                  className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} transition-colors`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
