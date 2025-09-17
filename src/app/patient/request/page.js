'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Plus, Clock, Phone, CreditCard, ArrowRight, Heart, CheckCircle } from 'lucide-react';
import { serviceRequestAPI, serviceAPI, availabilitySlotsAPI } from '../../../lib/api';
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
    dateOfBirth: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postcode: '',
    howDidYouHear: '',
    serviceId: '',
    doctorSelection: 'any', // 'any', 'previous', or 'specific'
    preferredDoctorId: '',
    description: '',
    serviceDate: '',
    serviceTime: '',
    selectedSlotId: '', // For online services with pre-defined slots
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
  
  // Availability slots states (for online services)
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isOnlineService, setIsOnlineService] = useState(false);
  
  // Calendar states for patient booking
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availabilityData, setAvailabilityData] = useState({}); // Stores slots grouped by date
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState({});
  
  // UK Cities autocomplete states
  const [cityQuery, setCityQuery] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedCityIndex, setSelectedCityIndex] = useState(-1);
  
  // UK Towns and Counties data
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
  
  useEffect(() => {
    fetchAvailableServices();
  }, []);
  
  // Sync cityQuery with formData.city
  useEffect(() => {
    if (formData.city && !cityQuery) {
      setCityQuery(formData.city);
    }
  }, [formData.city, cityQuery]);
  
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

  // Fetch availability when online service is selected or month changes
  useEffect(() => {
    if (isOnlineService) {
      fetchMonthAvailability(currentMonth);
    }
  }, [isOnlineService, currentMonth]);

  // Calendar helper functions
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

  const hasAvailableSlots = (dateStr) => {
    return availabilityData[dateStr] && availabilityData[dateStr].length > 0;
  };

  const getSlotsForDate = (dateStr) => {
    return availabilityData[dateStr] || [];
  };

  // Fetch availability data for the month
  const fetchMonthAvailability = async (monthDate) => {
    if (!isOnlineService) return;
    
    try {
      setLoadingAvailability(true);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      
      // Get first and last day of the month
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const response = await availabilitySlotsAPI.getAvailableSlots('online', startDate, endDate);
      
      if (response?.data) {
        // Group slots by date
        const slotsData = Array.isArray(response.data) ? response.data : 
                         response.data.data ? response.data.data : [];
        
        const groupedSlots = {};
        slotsData.forEach(slot => {
          const slotData = slot.attributes || slot;
          const date = slotData.date;
          if (!groupedSlots[date]) {
            groupedSlots[date] = [];
          }
          groupedSlots[date].push(slot);
        });
        
        setAvailabilityData(groupedSlots);
      }
    } catch (error) {
      console.error('❌ Error fetching month availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };
  
  // Fetch available services
  const fetchAvailableServices = async () => {
    try {
      setLoadingServices(true);
      console.log('🔍 Fetching available services for patients');
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/patient`);
      const data = await response.json();
      
      let services = [];
      if (data && Array.isArray(data.data)) {
        services = data.data;
      } else if (Array.isArray(data)) {
        services = data;
      }
      
      console.log('✅ Fetched patient services:', services.length, 'services');
      console.log('Patient services data:', services);
      setAvailableServices(services);
    } catch (error) {
      console.error('❌ Error fetching patient services:', error);
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
  
  // Handle date changes
  const handleDateChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If all date fields are filled, construct the dateOfBirth
      if (updated.dobDay && updated.dobMonth && updated.dobYear) {
        const formattedDate = `${updated.dobYear}-${updated.dobMonth.padStart(2, '0')}-${updated.dobDay.padStart(2, '0')}`;
        updated.dateOfBirth = formattedDate;
      }
      
      return updated;
    });
    
    // Clear date error when user starts selecting
    if (errors.dateOfBirth) {
      setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle service selection separately to manage online/offline logic
    if (name === 'serviceId') {
      handleServiceChange(e);
      return;
    }
    
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

  // Handle city input with autocomplete
  const handleCityChange = (e) => {
    const value = e.target.value;
    setCityQuery(value);
    setFormData(prev => ({
      ...prev,
      city: value
    }));

    if (value.length > 0) {
      const filtered = ukTownsAndCounties.filter(location =>
        location.town.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredCities(filtered);
      setShowCitySuggestions(true);
      setSelectedCityIndex(-1); // Reset selection
    } else {
      setShowCitySuggestions(false);
      setFilteredCities([]);
      setSelectedCityIndex(-1);
      // Clear county when city is cleared
      setFormData(prev => ({
        ...prev,
        county: ''
      }));
    }

    // Clear city error when user starts typing
    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
  };

  // Handle city selection from suggestions
  const handleCitySelect = (cityData) => {
    setCityQuery(cityData.town);
    setFormData(prev => ({
      ...prev,
      city: cityData.town,
      county: cityData.county
    }));
    setShowCitySuggestions(false);
    setFilteredCities([]);
    setSelectedCityIndex(-1);
  };

  // Handle keyboard navigation for city suggestions
  const handleCityKeyDown = (e) => {
    if (!showCitySuggestions || filteredCities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCityIndex(prev => 
          prev < filteredCities.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCityIndex(prev => 
          prev > 0 ? prev - 1 : filteredCities.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCityIndex >= 0 && selectedCityIndex < filteredCities.length) {
          handleCitySelect(filteredCities[selectedCityIndex]);
        }
        break;
      case 'Escape':
        setShowCitySuggestions(false);
        setSelectedCityIndex(-1);
        break;
    }
  };
  
  // Fetch available slots for a specific date and service type
  const fetchAvailableSlots = async (date, serviceType) => {
    if (!date || !serviceType) return;
    
    try {
      setLoadingSlots(true);
      const response = await availabilitySlotsAPI.getAvailableSlots(serviceType, date);
      const slots = response.data?.data || response.data || [];
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };
  
  // Handle slot selection
  const handleSlotSelect = (slot) => {
    setFormData(prev => ({
      ...prev,
      selectedSlotId: slot.id || slot.documentId,
      serviceDate: slot.date || slot.attributes?.date,
      serviceTime: `${slot.startTime || slot.attributes?.startTime}-${slot.endTime || slot.attributes?.endTime}`
    }));
  };
  
  // Handle date change for online services
  const handleDateChangeForSlots = (date) => {
    setSelectedDate(date);
    setFormData(prev => ({
      ...prev,
      serviceDate: date,
      serviceTime: '',
      selectedSlotId: ''
    }));
    
    if (isOnlineService && date) {
      fetchAvailableSlots(date, 'online');
    }
  };

  // Handle calendar date click
  const handleCalendarDateClick = (dateStr) => {
    if (hasAvailableSlots(dateStr)) {
      setSelectedDate(dateStr);
      setFormData(prev => ({
        ...prev,
        serviceDate: dateStr,
        serviceTime: '',
        selectedSlotId: ''
      }));
      
      // Set available slots for the selected date
      const slotsForDate = getSlotsForDate(dateStr);
      setAvailableSlots(slotsForDate);
    }
  };
  
  // Handle service selection change
  const handleServiceChange = (e) => {
    const { value } = e.target;
    const service = availableServices.find(s => s.id.toString() === value);
    const serviceData = service?.attributes || service;
    const isOnline = serviceData?.category === 'online';
    
    setIsOnlineService(isOnline);
    setFormData(prev => ({
      ...prev,
      serviceId: value,
      serviceDate: '',
      serviceTime: '',
      selectedSlotId: ''
    }));
    
    // Clear slots when changing service
    setAvailableSlots([]);
    setSelectedDate('');
    
    // Clear errors for service selection
    if (errors.serviceId) {
      setErrors(prev => ({ ...prev, serviceId: '' }));
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

    // Date of birth validation
    if (!formData.dobDay || !formData.dobMonth || !formData.dobYear) {
      newErrors.dateOfBirth = 'Please select your complete date of birth';
    } else {
      // Construct the date from dropdown values
      const birthDate = new Date(
        parseInt(formData.dobYear), 
        parseInt(formData.dobMonth) - 1, // Month is 0-indexed
        parseInt(formData.dobDay)
      );
      
      // Validate the constructed date
      if (isNaN(birthDate.getTime()) || 
          birthDate.getDate() !== parseInt(formData.dobDay) ||
          birthDate.getMonth() !== parseInt(formData.dobMonth) - 1 ||
          birthDate.getFullYear() !== parseInt(formData.dobYear)) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      } else {
        // Check if the date is not in the future
        const today = new Date();
        if (birthDate > today) {
          newErrors.dateOfBirth = 'Date of birth cannot be in the future';
        }
        // Check if age is reasonable (not more than 120 years old)
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age > 120) {
          newErrors.dateOfBirth = 'Please enter a valid date of birth';
        }
      }
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address line 1 is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.county.trim()) {
      newErrors.county = 'Please select a city from the dropdown to auto-fill county';
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    }

    if (!formData.howDidYouHear) {
      newErrors.howDidYouHear = 'Please select how you heard about us';
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
    
    // For online services, validate slot selection; for others, validate time input
    if (isOnlineService) {
      if (!formData.selectedSlotId) {
        newErrors.serviceTime = 'Please select an available time slot';
      }
    } else {
      if (!formData.serviceTime) {
        newErrors.serviceTime = 'Service time is required';
      }
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
      
      // If this is an online service with a selected slot, book the slot first
      if (isOnlineService && patientData.selectedSlotId) {
        try {
          await availabilitySlotsAPI.bookSlot(patientData.selectedSlotId);
          console.log('Slot booked successfully:', patientData.selectedSlotId);
        } catch (slotError) {
          console.error('Error booking slot:', slotError);
          // Continue with the request even if slot booking fails - this can be handled manually
        }
      }
      
      // Create service request data matching the backend structure
      const requestData = {
        // Patient information (not business)
        patientFirstName: patientData.firstName,
        patientLastName: patientData.lastName,
        patientPhone: patientData.fullPhone,
        patientEmail: patientData.email,
        patientDateOfBirth: patientData.dateOfBirth,
        patientAddressLine1: patientData.addressLine1,
        patientAddressLine2: patientData.addressLine2,
        patientCity: patientData.city,
        patientCounty: patientData.county,
        patientPostcode: patientData.postcode,
        patientHowDidYouHear: patientData.howDidYouHear,
        
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
          `${patientData.serviceDate}T${patientData.serviceTime}:00` : null,
        availabilitySlotId: patientData.selectedSlotId || null, // Reference to booked slot
        
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
      console.log('🕐 DEBUG - serviceDate:', patientData.serviceDate);
      console.log('🕐 DEBUG - serviceTime:', patientData.serviceTime);
      console.log('🕐 DEBUG - constructed serviceDateTime:', requestData.serviceDateTime);
      
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
          
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 font-medium`}>
            Thank you for choosing our service! You can now safely close this window.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-cyan-50'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 backdrop-blur-sm border-blue-100'} border-b shadow-lg`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg'} p-3 rounded-xl`}>
              <Heart className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent'}`}>
                Request a Doctor
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-blue-600/70'}`}>
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
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/70 backdrop-blur-sm border-blue-100 shadow-xl'} rounded-xl border`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50'} rounded-t-xl`}>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                  Patient Information
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-blue-600/70'} mt-1`}>
                  Please provide your details to request medical service
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Your first name"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                      } ${errors.firstName ? 'border-red-400 bg-red-50' : ''}`}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Your last name"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                      } ${errors.lastName ? 'border-red-400 bg-red-50' : ''}`}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                
                {/* Contact Information */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
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
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-blue-600/70'}`}>
                    You'll receive WhatsApp notifications when a doctor accepts your request
                  </p>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Your email address"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                    } ${errors.email ? 'border-red-400 bg-red-50' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                    Date of Birth *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Day Dropdown */}
                    <div>
                      <select
                        name="dobDay"
                        value={formData.dobDay || ''}
                        onChange={(e) => handleDateChange('dobDay', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300'
                        } ${errors.dateOfBirth ? 'border-red-400 bg-red-50' : ''}`}
                      >
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day.toString()}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Month Dropdown */}
                    <div>
                      <select
                        name="dobMonth"
                        value={formData.dobMonth || ''}
                        onChange={(e) => handleDateChange('dobMonth', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300'
                        } ${errors.dateOfBirth ? 'border-red-400 bg-red-50' : ''}`}
                      >
                        <option value="">Month</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>
                    
                    {/* Year Dropdown */}
                    <div>
                      <select
                        name="dobYear"
                        value={formData.dobYear || ''}
                        onChange={(e) => handleDateChange('dobYear', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300'
                        } ${errors.dateOfBirth ? 'border-red-400 bg-red-50' : ''}`}
                      >
                        <option value="">Year</option>
                        {Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year.toString()}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>
                  )}
                </div>

                {/* Address Section */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-blue-900'} border-b ${isDarkMode ? 'border-gray-600' : 'border-blue-200'} pb-2`}>
                    Address Details
                  </h3>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="House number and street name"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                      } ${errors.addressLine1 ? 'border-red-400 bg-red-50' : ''}`}
                    />
                    {errors.addressLine1 && (
                      <p className="text-red-500 text-xs mt-1">{errors.addressLine1}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      placeholder="Apartment, suite, etc. (optional)"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                        City/Town *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={cityQuery || formData.city}
                        onChange={handleCityChange}
                        onKeyDown={handleCityKeyDown}
                        placeholder="Start typing city or town..."
                        autoComplete="off"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                        } ${errors.city ? 'border-red-400 bg-red-50' : ''}`}
                      />
                      {showCitySuggestions && filteredCities.length > 0 && (
                        <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-800' 
                            : 'border-blue-200 bg-white'
                        }`}>
                          {filteredCities.map((cityData, index) => (
                            <button
                              key={`${cityData.town}-${cityData.county}`}
                              type="button"
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                                index === selectedCityIndex
                                  ? 'bg-blue-100 dark:bg-gray-700'
                                  : ''
                              } ${
                                isDarkMode 
                                  ? 'text-gray-200 hover:text-white' 
                                  : 'text-gray-700 hover:text-gray-900'
                              }`}
                              onClick={() => handleCitySelect(cityData)}
                              style={{ 
                                WebkitTapHighlightColor: 'transparent',
                                touchAction: 'manipulation'
                              }}
                            >
                              <div className="font-medium">{cityData.town}</div>
                              <div className={`text-xs ${
                                index === selectedCityIndex
                                  ? 'text-blue-600 dark:text-blue-300'
                                  : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {cityData.county}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.city && (
                        <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                        County *
                      </label>
                      <input
                        type="text"
                        name="county"
                        value={formData.county}
                        onChange={handleInputChange}
                        placeholder="County (auto-filled)"
                        readOnly={!!formData.county}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                        } ${formData.county ? (isDarkMode ? 'bg-gray-600' : 'bg-gray-50') : ''}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                      Postcode *
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleInputChange}
                      placeholder="Enter your postcode"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' 
                          : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                      } ${errors.postcode ? (isDarkMode ? 'border-red-400 bg-red-900/20' : 'border-red-400 bg-red-50') : ''}`}
                    />
                    {errors.postcode && (
                      <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>
                    )}
                  </div>
                </div>

                {/* How did you hear about us */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                    How did you hear about us? *
                  </label>
                  <select
                    name="howDidYouHear"
                    value={formData.howDidYouHear}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300'
                    } ${errors.howDidYouHear ? 'border-red-400 bg-red-50' : ''}`}
                  >
                    <option value="">Please select...</option>
                    <option value="search-engine">Search Engine (Google, Bing, etc.)</option>
                    <option value="social-media">Social Media (Facebook, Instagram, Twitter)</option>
                    <option value="friend-family">Friend or Family Recommendation</option>
                    <option value="doctor-referral">Doctor/GP Referral</option>
                    <option value="online-ad">Online Advertisement</option>
                    <option value="healthcare-website">Healthcare Website</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="newspaper-magazine">Newspaper/Magazine</option>
                    <option value="radio-tv">Radio/TV</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.howDidYouHear && (
                    <p className="text-red-500 text-xs mt-1">{errors.howDidYouHear}</p>
                  )}
                </div>
                
                {/* Service Selection */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                    Which service do you require? *
                  </label>
                  {loadingServices ? (
                    <div className={`w-full px-4 py-3 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400' : 'border-blue-200 bg-blue-50/50 text-blue-600'} rounded-xl`}>
                      Loading services...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableServices.map(service => (
                        <label key={service.id} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                            : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-300'
                        } ${formData.serviceId === service.id.toString() ? 'border-blue-500 bg-blue-100' : ''}`}>
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="serviceId"
                              value={service.id}
                              checked={formData.serviceId === service.id.toString()}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                                {service.name}
                              </div>
                              {service.description && (
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-blue-600/70'}`}>
                                  {service.description}
                                </div>
                              )}
                              <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-blue-500'}`}>
                                Duration: {service.duration} minutes
                              </div>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {formatCurrency(service.price)}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {errors.serviceId && (
                    <p className="text-red-500 text-xs mt-1">{errors.serviceId}</p>
                  )}
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                    Doctor Selection *
                  </label>
                  <select
                    name="doctorSelection"
                    value={formData.doctorSelection}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300'
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
                            <label key={doctor.id} className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer hover:border-blue-500 transition-all duration-200 ${
                              isDarkMode 
                                ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                                : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-300'
                            } ${formData.preferredDoctorId === doctor.id.toString() ? 'border-blue-500 bg-blue-100' : ''}`}>
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
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe what kind of medical assistance you need (optional)"
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-blue-200 bg-blue-50/50 text-blue-900 placeholder-blue-400/70 hover:border-blue-300'
                    }`}
                  />
                </div>

                {/* Service Date and Time */}
                {isOnlineService ? (
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-blue-900'} mb-4`}>
                        Select an Available Date *
                      </label>
                      
                      {/* Calendar Navigation */}
                      <div className="mb-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                          className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gradient-to-br from-slate-100 to-blue-100 hover:from-blue-200 hover:to-purple-200 border border-blue-200 hover:border-purple-300 shadow-md hover:shadow-lg'} transform hover:scale-110`}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                          className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gradient-to-br from-slate-100 to-blue-100 hover:from-blue-200 hover:to-purple-200 border border-blue-200 hover:border-purple-300 shadow-md hover:shadow-lg'} transform hover:scale-110`}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Calendar Grid */}
                      <div className={`rounded-xl border-2 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'} p-4 shadow-lg`}>
                        {/* Loading State */}
                        {loadingAvailability && (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Loading availability...
                            </span>
                          </div>
                        )}
                        
                        {/* Calendar */}
                        {!loadingAvailability && (
                          <div className="grid grid-cols-7 gap-1">
                            {/* Weekday Headers */}
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className={`p-3 text-center text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {day}
                              </div>
                            ))}
                            
                            {/* Calendar Dates */}
                            {getMonthDates(currentMonth).map((date, index) => {
                              const dateStr = date.toISOString().split('T')[0];
                              const isCurrentMonth = isDateInCurrentMonth(date, currentMonth);
                              const isToday = date.toDateString() === new Date().toDateString();
                              const isSelected = dateStr === selectedDate;
                              const hasSlots = hasAvailableSlots(dateStr);
                              const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
                              const slotsCount = getSlotsForDate(dateStr).length;
                              
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => isCurrentMonth && hasSlots && !isPastDate ? handleCalendarDateClick(dateStr) : null}
                                  disabled={!isCurrentMonth || !hasSlots || isPastDate}
                                  className={`
                                    relative p-3 h-16 text-sm rounded-lg transition-all duration-200 font-medium
                                    ${!isCurrentMonth || isPastDate
                                      ? (isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed')
                                      : isSelected
                                      ? (isDarkMode ? 'bg-blue-600 text-white shadow-xl ring-2 ring-blue-400' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl ring-2 ring-blue-300 transform scale-105')
                                      : isToday
                                      ? (isDarkMode ? 'bg-orange-900 text-orange-100 border border-orange-600' : 'bg-gradient-to-br from-orange-400 to-red-500 text-white border-2 border-orange-300 shadow-lg')
                                      : hasSlots
                                      ? (isDarkMode ? 'bg-green-900 text-green-100 hover:bg-green-800 cursor-pointer' : 'bg-gradient-to-br from-emerald-400 to-green-500 text-white hover:from-emerald-500 hover:to-green-600 shadow-lg cursor-pointer transform hover:scale-105')
                                      : (isDarkMode ? 'text-gray-400 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed hover:bg-gray-100')
                                    }
                                  `}
                                >
                                  <span className="block text-lg font-bold">{date.getDate()}</span>
                                  {hasSlots && !isPastDate && (
                                    <>
                                      <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${
                                        isSelected ? 'bg-white shadow-md' : isDarkMode ? 'bg-green-400' : 'bg-white shadow-lg ring-1 ring-emerald-300'
                                      }`} />
                                      <div className={`absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                                        isSelected ? 'bg-white text-blue-600 shadow-md' : isDarkMode ? 'bg-green-400 text-green-900' : 'bg-white text-emerald-600 shadow-lg ring-1 ring-emerald-200'
                                      }`}>
                                        {slotsCount}
                                      </div>
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Help Text */}
                      <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
                        <div className="flex items-start space-x-2">
                          <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-800'} font-medium`}>
                              How to book:
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} mt-1`}>
                              🟢 <strong>Green dates</strong> have available slots - click to select
                              <br />
                              🔵 <strong>Blue outline</strong> shows today's date
                              <br />
                              ⚪ <strong>Numbers</strong> show how many slots are available
                            </p>
                          </div>
                        </div>
                      </div>

                      {errors.serviceDate && (
                        <p className="text-red-500 text-sm mt-2 font-medium">{errors.serviceDate}</p>
                      )}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {availableSlots.map((slot) => {
                                const slotData = slot.attributes || slot;
                                const slotId = slot.id || slot.documentId;
                                const isSelected = formData.selectedSlotId === slotId;
                                const availableSpots = slotData.maxBookings - (slotData.currentBookings || 0);
                                
                                return (
                                  <button
                                    key={slotId}
                                    type="button"
                                    onClick={() => handleSlotSelect(slot)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-105 ${
                                      isSelected
                                        ? (isDarkMode ? 'border-blue-500 bg-blue-900/50 text-blue-200 shadow-xl ring-2 ring-blue-400' : 'border-blue-500 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl ring-2 ring-blue-300')
                                        : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-blue-500 hover:bg-gray-600' : 'border-blue-200 bg-white text-gray-900 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 shadow-md hover:shadow-lg')
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : isDarkMode ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                                          <Clock className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-white'}`} />
                                        </div>
                                        <span className="font-bold text-lg">
                                          {formatTime(slotData.startTime)} - {formatTime(slotData.endTime)}
                                        </span>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle className={`h-6 w-6 ${isDarkMode ? 'text-blue-300' : 'text-white'}`} />
                                      )}
                                    </div>
                                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : isSelected ? 'text-blue-100' : 'text-gray-600'} flex items-center justify-between`}>
                                      <span>
                                        {availableSpots} spot{availableSpots !== 1 ? 's' : ''} available
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        isSelected 
                                          ? 'bg-white/20 text-white' 
                                          : isDarkMode 
                                          ? 'bg-green-900 text-green-300' 
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        Available
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <Clock className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                              <p className="text-lg font-medium mb-2">No slots available</p>
                              <p className="text-sm">
                                No available time slots for this date. Please select a different date.
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {errors.serviceTime && (
                          <p className="text-red-500 text-sm mt-2 font-medium">{errors.serviceTime}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                        Service Date *
                      </label>
                      <input
                        type="date"
                        name="serviceDate"
                        value={formData.serviceDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]} // Today or later
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300'
                        } ${errors.serviceDate ? 'border-red-400 bg-red-50' : ''}`}
                      />
                      {errors.serviceDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.serviceDate}</p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-blue-900'} mb-2`}>
                        Service Time *
                      </label>
                      <input
                        type="time"
                        name="serviceTime"
                        value={formData.serviceTime}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-blue-200 bg-blue-50/50 text-blue-900 hover:border-blue-300'
                        } ${errors.serviceTime ? 'border-red-400 bg-red-50' : ''}`}
                      />
                      {errors.serviceTime && (
                        <p className="text-red-500 text-xs mt-1">{errors.serviceTime}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Information Messages */}
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border flex items-start space-x-2`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      {isOnlineService 
                        ? 'Please select a date and then choose from the available time slots for your online consultation.'
                        : 'Please select when you need the medical service.'
                      }
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
                    className={`w-full py-4 px-6 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white`}
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
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/70 backdrop-blur-sm border-blue-100 shadow-xl'} rounded-xl border sticky top-8`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50'} rounded-t-xl`}>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                  Price Summary
                </h3>
              </div>
              
              <div className="p-6">
                {selectedService ? (
                  <div className="space-y-4">
                    <div className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'} border rounded-xl p-4`}>
                      <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-blue-900'} mb-2`}>
                        {selectedService.name}
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-blue-600/70'} mb-3`}>
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
