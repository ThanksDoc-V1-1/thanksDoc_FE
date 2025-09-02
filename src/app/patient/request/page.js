'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Plus, Clock, Phone, CreditCard, ArrowRight, Heart, CheckCircle } from 'lucide-react';
import { serviceRequestAPI, serviceAPI } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';
import PaymentForm from '../../../components/PaymentForm';
import CountryCodePicker from '../../../components/CountryCodePicker';

export default function PatientRequestPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { getBookingFee } = useSystemSettings();
  
  // Dynamic booking fee from system settings
  const SERVICE_CHARGE = getBookingFee();
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    countryCode: '+44',
    email: '',
    serviceId: '',
    doctorSelection: 'any', // 'any', 'previous', or 'specific'
    preferredDoctorId: '',
    description: '',
    serviceDate: '',
    serviceTime: '',
  });
  
  // Doctor-related states
  const [previousDoctors, setPreviousDoctors] = useState([]);
  const [loadingPreviousDoctors, setLoadingPreviousDoctors] = useState(false);
  
  // Service and pricing states
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [servicePrice, setServicePrice] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    fetchAvailableServices();
  }, []);
  
  // Update pricing when service changes
  useEffect(() => {
    if (formData.serviceId) {
      const service = availableServices.find(s => s.id.toString() === formData.serviceId.toString());
      if (service) {
        setSelectedService(service);
        const price = parseFloat(service.price) || 0;
        setServicePrice(price);
        setTotalAmount(price + SERVICE_CHARGE);
      }
    } else {
      setSelectedService(null);
      setServicePrice(0);
      setTotalAmount(0);
    }
  }, [formData.serviceId, availableServices, SERVICE_CHARGE]);
  
  // Fetch available services
  const fetchAvailableServices = async () => {
    try {
      setLoadingServices(true);
      console.log('🔍 Fetching available services for patients');
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?filters[isActive][$eq]=true&sort=category:asc,displayOrder:asc,name:asc&pagination[limit]=100`);
      const data = await response.json();
      
      let services = [];
      if (data && Array.isArray(data.data)) {
        services = data.data;
      } else if (Array.isArray(data)) {
        services = data;
      }
      
      console.log('✅ Fetched services for patients:', services.length, 'services');
      console.log('Services data:', services);
      setAvailableServices(services);
    } catch (error) {
      console.error('❌ Error fetching available services:', error);
      setAvailableServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Fetch previously worked with doctors based on patient contact info
  const fetchPreviousDoctors = async () => {
    if (!formData.phone && !formData.email) return;
    
    try {
      setLoadingPreviousDoctors(true);
      
      // Build search criteria
      const searchCriteria = [];
      if (formData.phone) {
        const fullPhone = formData.countryCode + formData.phone.replace(/\s/g, '');
        searchCriteria.push(`filters[patientPhone][$eq]=${encodeURIComponent(fullPhone)}`);
      }
      if (formData.email) {
        searchCriteria.push(`filters[patientEmail][$eq]=${encodeURIComponent(formData.email)}`);
      }
      
      const searchQuery = searchCriteria.join('&');
      
      // Fetch previous service requests for this patient
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/service-requests?${searchQuery}&filters[isPatientRequest][$eq]=true&filters[status][$in][0]=accepted&filters[status][$in][1]=completed&populate[doctor]=*`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract unique doctors from previous requests
        const doctorMap = new Map();
        data.data?.forEach(request => {
          if (request.doctor && request.doctor.id) {
            doctorMap.set(request.doctor.id, {
              id: request.doctor.id,
              firstName: request.doctor.firstName,
              lastName: request.doctor.lastName,
              specialization: request.doctor.specialization,
              lastWorkedWith: request.acceptedAt || request.completedAt
            });
          }
        });
        
        const uniqueDoctors = Array.from(doctorMap.values());
        setPreviousDoctors(uniqueDoctors);
        
        console.log(`Found ${uniqueDoctors.length} previously worked with doctors`);
      }
    } catch (error) {
      console.error('Error fetching previous doctors:', error);
      setPreviousDoctors([]);
    } finally {
      setLoadingPreviousDoctors(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Fetch previous doctors when phone or email changes (with debounce)
    if (name === 'phone' || name === 'email') {
      const timeoutId = setTimeout(() => {
        fetchPreviousDoctors();
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(timeoutId);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    console.log('🔍 Validating form with data:', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      serviceId: formData.serviceId,
      serviceDate: formData.serviceDate,
      serviceTime: formData.serviceTime,
      doctorSelection: formData.doctorSelection,
      preferredDoctorId: formData.preferredDoctorId
    });
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length < 7 || formData.phone.length > 15) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.serviceId) {
      newErrors.serviceId = 'Please select a service';
    }
    
    if (!formData.serviceDate) {
      newErrors.serviceDate = 'Service date is required';
    } else {
      // Check if the date is not in the past
      const selectedDate = new Date(formData.serviceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.serviceDate = 'Service date cannot be in the past';
      }
    }
    
    if (!formData.serviceTime) {
      newErrors.serviceTime = 'Service time is required';
    }
    
    // Validate doctor selection
    if (formData.doctorSelection === 'previous') {
      if (previousDoctors.length === 0) {
        newErrors.doctorSelection = 'No previous doctors found. Please select "Any available doctor".';
      } else if (!formData.preferredDoctorId) {
        newErrors.preferredDoctorId = 'Please select a doctor from your previous doctors';
      }
    }
    
    setErrors(newErrors);
    console.log('Validation errors found:', newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Form validation failed, errors:', errors);
      alert('Please fill in all required fields before proceeding.');
      return;
    }
    
    console.log('Form validation passed, proceeding with submission');
    
    if (!selectedService) {
      alert('Please select a service');
      return;
    }
    
    // Create temporary payment request object
    const tempPaymentRequest = {
      id: `temp-patient-${Date.now()}`,
      totalAmount: totalAmount,
      servicePrice: servicePrice,
      serviceCharge: SERVICE_CHARGE,
      serviceType: selectedService.name,
      estimatedDuration: selectedService.duration || 60,
      _isPatientRequest: true,
      _patientData: {
        ...formData,
        fullPhone: formData.countryCode + formData.phone.replace(/\s/g, ''),
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category
      }
    };
    
    setPaymentRequest(tempPaymentRequest);
    setShowPaymentModal(true);
  };
  
  // Handle successful payment
  const handlePaymentSuccess = async (paymentIntent) => {
    if (!paymentRequest) return;
    
    setShowPaymentModal(false);
    setIsSubmitting(true);
    
    try {
      const patientData = paymentRequest._patientData;
      const charge = paymentIntent.charges?.data?.[0];
      
      // Create service request data matching the backend structure
      const requestData = {
        // Patient information (not business)
        patientFirstName: patientData.firstName,
        patientLastName: patientData.lastName,
        patientPhone: patientData.fullPhone,
        patientEmail: patientData.email,
        
        // Service information
        serviceId: parseInt(patientData.serviceId),
        serviceType: patientData.serviceName,
        urgencyLevel: 'medium',
        description: patientData.description || `Patient service request for ${patientData.serviceName}`,
        estimatedDuration: selectedService.duration || 1,
        
        // Doctor selection and scheduling
        doctorSelectionType: patientData.doctorSelection,
        preferredDoctorId: patientData.preferredDoctorId || null,
        serviceDateTime: patientData.serviceDate && patientData.serviceTime ? 
          new Date(`${patientData.serviceDate}T${patientData.serviceTime}`).toISOString() : null,
        
        // Payment information
        isPaid: true,
        paymentMethod: 'card',
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
        paidAt: new Date().toISOString(),
        totalAmount: paymentRequest.totalAmount,
        servicePrice: paymentRequest.servicePrice,
        serviceCharge: paymentRequest.serviceCharge,
        chargeId: charge?.id,
        currency: paymentIntent.currency || 'gbp',
        
        // Mark as patient request
        isPatientRequest: true,
        
        // Use a placeholder business ID or create a special patient business entry
        businessId: null, // Will be handled on backend
        
        // Set status
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      
      console.log('Creating patient service request with data:', requestData);
      
      // Create the service request via a special patient endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/service-requests/patient-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create patient service request');
      }
      
      const result = await response.json();
      console.log('Patient service request created successfully:', result);
      
      setSuccess(true);
    } catch (error) {
      console.error('Error creating patient service request:', error);
      alert('Payment was successful, but there was an error processing your request. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (success) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`max-w-md w-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg border p-8 text-center`}>
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              Request Submitted Successfully!
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
              Your service request has been sent to available doctors. You'll receive notifications via WhatsApp and email once a doctor accepts your request.
            </p>
          </div>
          
          <div className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 mb-6`}>
            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              Service Details
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Service: {selectedService?.name}
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Total Paid: {formatCurrency(totalAmount)}
            </p>
          </div>
          
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
            Keep this page open to track your request status, or save this link for later reference.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Make Another Request
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'} p-2 rounded-lg`}>
              <Heart className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Request a Doctor
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Get medical care from qualified doctors
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Request Form */}
          <div className="lg:col-span-2">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Patient Information
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Please provide your details to request medical service
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Your first name"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      } ${errors.firstName ? 'border-red-500' : ''}`}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Your last name"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      } ${errors.lastName ? 'border-red-500' : ''}`}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                
                {/* Contact Information */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Phone Number *
                  </label>
                  <CountryCodePicker
                    selectedCode={formData.countryCode}
                    onCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                    phoneNumber={formData.phone}
                    onPhoneChange={(phone) => setFormData({ ...formData, phone: phone })}
                    placeholder="Your phone number"
                    isDarkMode={isDarkMode}
                    required={true}
                    className="w-full"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    You'll receive WhatsApp notifications when a doctor accepts your request
                  </p>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Your email address"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>
                
                {/* Service Selection */}
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
                            <div className="space-y-2">
                              {nhsServices.map(service => (
                                <label key={service.id} className="flex items-center space-x-3 cursor-pointer">
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
                                  <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-100'} px-2 py-1 rounded`}>
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
                            <div className="space-y-2">
                              {onlineServices.map(service => (
                                <label key={service.id} className="flex items-center space-x-3 cursor-pointer">
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
                                  <span className={`text-sm font-medium px-2 py-1 rounded ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
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
                              In-Person Private Services *
                            </h3>
                            <div className="space-y-2">
                              {inPersonServices.map(service => (
                                <label key={service.id} className="flex items-center space-x-3 cursor-pointer">
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
                                  <span className={`text-sm font-medium px-2 py-1 rounded ${isDarkMode ? 'text-blue-300 bg-blue-900/20' : 'text-blue-700 bg-blue-100'}`}>
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
                  {errors.serviceId && (
                    <p className="text-red-500 text-xs mt-1">{errors.serviceId}</p>
                  )}
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Doctor Selection *
                  </label>
                  <select
                    name="doctorSelection"
                    value={formData.doctorSelection}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="any">Any available doctor</option>
                    <option value="previous">Previously worked with doctors</option>
                  </select>

                  {/* Show previous doctors when selected */}
                  {formData.doctorSelection === 'previous' && (
                    <div className="mt-3">
                      {loadingPreviousDoctors ? (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} flex items-center space-x-2`}>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Loading your previous doctors...
                          </span>
                        </div>
                      ) : previousDoctors.length > 0 ? (
                        <div className="space-y-2">
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                            Select a doctor you've worked with before:
                          </p>
                          {previousDoctors.map(doctor => (
                            <label key={doctor.id} className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:border-blue-500 transition-colors ${
                              isDarkMode 
                                ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                                : 'border-gray-200 bg-gray-50 hover:bg-blue-50'
                            } ${formData.preferredDoctorId === doctor.id.toString() ? 'border-blue-500 bg-blue-50' : ''}`}>
                              <input
                                type="radio"
                                name="preferredDoctorId"
                                value={doctor.id}
                                checked={formData.preferredDoctorId === doctor.id.toString()}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  Dr. {doctor.firstName} {doctor.lastName}
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {doctor.specialization}
                                </div>
                                {doctor.lastWorkedWith && (
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                    Last worked: {formatDate(doctor.lastWorkedWith)}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border`}>
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0 mt-0.5">
                              <svg className="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                                No previous doctors found
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'} mt-1`}>
                                Complete a service request first to build your doctor history. For now, please select "Any available doctor".
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what kind of medical assistance you need (optional)"
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Service Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Service Date *
                    </label>
                    <input
                      type="date"
                      name="serviceDate"
                      value={formData.serviceDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]} // Today or later
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-900'
                      } ${errors.serviceDate ? 'border-red-500' : ''}`}
                    />
                    {errors.serviceDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.serviceDate}</p>
                    )}
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
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-900'
                      } ${errors.serviceTime ? 'border-red-500' : ''}`}
                    />
                    {errors.serviceTime && (
                      <p className="text-red-500 text-xs mt-1">{errors.serviceTime}</p>
                    )}
                  </div>
                </div>

                {/* Information Messages */}
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border flex items-start space-x-2`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      Please select when you need the medical service.
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border flex items-start space-x-2`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      Booking Fee: A £{SERVICE_CHARGE.toFixed(2)} booking fee will be added to your final payment.
                    </p>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    // disabled={loading || !selectedService}
                    className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors bg-blue-600 hover:bg-blue-700 text-white`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span>Pay & Request Doctor</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Price Summary */}
          <div className="lg:col-span-1">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow border sticky top-8`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Price Summary
                </h3>
              </div>
              
              <div className="p-6">
                {selectedService ? (
                  <div className="space-y-4">
                    <div className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                      <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                        {selectedService.name}
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                        Category: {selectedService.category === 'nhs' ? 'NHS Work' : 
                                 selectedService.category === 'online' ? 'Online Private' :
                                 'In-Person Private'}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Duration:
                          </span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {selectedService.duration || 60} min
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Service Price:
                          </span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatCurrency(servicePrice)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Booking Fee:
                          </span>
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatCurrency(SERVICE_CHARGE)}
                          </span>
                        </div>
                        
                        <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} pt-2 mt-2`}>
                          <div className="flex justify-between">
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              Total:
                            </span>
                            <span className={`font-bold text-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {formatCurrency(totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'} mb-1`}>
                            What's included:
                          </p>
                          <ul className={`text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-700'} space-y-1`}>
                            <li>• Instant doctor notifications</li>
                            <li>• WhatsApp & email updates</li>
                            <li>• Secure payment processing</li>
                            <li>• 24/7 support availability</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Select a service to see pricing details
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && paymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full relative">
            {/* Close Button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute -top-2 -right-2 z-10 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full p-2 transition-colors border border-gray-600"
              aria-label="Close payment modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <PaymentForm
              serviceRequest={paymentRequest}
              onPaymentSuccess={handlePaymentSuccess}
              businessInfo={{
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.countryCode + formData.phone
              }}
            />
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg border p-8 max-w-sm w-full`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Creating Your Request
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Notifying available doctors...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
