'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Stethoscope, ArrowLeft, MapPin, Eye, EyeOff } from 'lucide-react';
import { authAPI, serviceAPI } from '../../../lib/api';
import { getCurrentLocation, validateEmail, validatePhone } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function DoctorRegister() {
  const router = useRouter();
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [services, setServices] = useState({ inPerson: [], online: [] });
  const [servicesLoading, setServicesLoading] = useState(true);
  
  // Town/City autocomplete states
  const [townQuery, setTownQuery] = useState('');
  const [showTownSuggestions, setShowTownSuggestions] = useState(false);
  const [filteredTowns, setFilteredTowns] = useState([]);
  const [selectedTownIndex, setSelectedTownIndex] = useState(-1);
  
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
    { town: 'Canterbury', county: 'Kent' },
    { town: 'Bath', county: 'Somerset' },
    { town: 'Chester', county: 'Cheshire' },
    { town: 'Durham', county: 'County Durham' },
    { town: 'Exeter', county: 'Devon' },
    { town: 'Gloucester', county: 'Gloucestershire' },
    { town: 'Hereford', county: 'Herefordshire' },
    { town: 'Ipswich', county: 'Suffolk' },
    { town: 'Lancaster', county: 'Lancashire' },
    { town: 'Lincoln', county: 'Lincolnshire' },
    { town: 'Norwich', county: 'Norfolk' },
    { town: 'Peterborough', county: 'Cambridgeshire' },
    { town: 'Preston', county: 'Lancashire' },
    { town: 'Salisbury', county: 'Wiltshire' },
    { town: 'Truro', county: 'Cornwall' },
    { town: 'Winchester', county: 'Hampshire' },
    { town: 'Worcester', county: 'Worcestershire' },
    { town: 'Carlisle', county: 'Cumbria' },
    { town: 'Chichester', county: 'West Sussex' },
    { town: 'Lichfield', county: 'Staffordshire' },
    { town: 'Ripon', county: 'North Yorkshire' },
    { town: 'St Albans', county: 'Hertfordshire' },
    { town: 'St Davids', county: 'Pembrokeshire' },
    { town: 'Wells', county: 'Somerset' },
    { town: 'Armagh', county: 'County Armagh' },
    { town: 'Bangor', county: 'County Down' },
    { town: 'Belfast', county: 'County Antrim' },
    { town: 'Lisburn', county: 'County Antrim' },
    { town: 'Londonderry', county: 'County Londonderry' },
    { town: 'Newry', county: 'County Down' },
    { town: 'Aberdeen', county: 'Aberdeenshire' },
    { town: 'Dundee', county: 'Angus' },
    { town: 'Edinburgh', county: 'Midlothian' },
    { town: 'Glasgow', county: 'Lanarkshire' },
    { town: 'Inverness', county: 'Highland' },
    { town: 'Perth', county: 'Perth and Kinross' },
    { town: 'Stirling', county: 'Stirlingshire' },
    { town: 'Cardiff', county: 'South Glamorgan' },
    { town: 'Newport', county: 'Gwent' },
    { town: 'Swansea', county: 'West Glamorgan' },
    { town: 'Bangor', county: 'Gwynedd' },
    { town: 'St Asaph', county: 'Denbighshire' },
    { town: 'Wrexham', county: 'Wrexham' }
  ];
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    licenceNumber: '',
    addressLine1: '',
    addressLine2: '',
    town: '',
    county: '',
    postcode: '',
    bio: '',
    languages: ['English'],
    certifications: [],
    latitude: '',
    longitude: '',
    selectedServices: [] // Add services array
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle town/city search and autocomplete
  const handleTownChange = (e) => {
    const value = e.target.value;
    setTownQuery(value);
    
    if (value.length > 0) {
      const filtered = ukTownsAndCounties.filter(item =>
        item.town.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTowns(filtered.slice(0, 10)); // Limit to 10 results
      setShowTownSuggestions(true);
      setSelectedTownIndex(-1);
    } else {
      setFilteredTowns([]);
      setShowTownSuggestions(false);
      setFormData(prev => ({
        ...prev,
        town: '',
        county: ''
      }));
    }
  };

  // Handle town selection from dropdown
  const handleTownSelect = (townData) => {
    setTownQuery(townData.town);
    setFormData(prev => ({
      ...prev,
      town: townData.town,
      county: townData.county
    }));
    setShowTownSuggestions(false);
    setFilteredTowns([]);
    setSelectedTownIndex(-1);
  };

  // Handle keyboard navigation for town suggestions
  const handleTownKeyDown = (e) => {
    if (!showTownSuggestions || filteredTowns.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedTownIndex(prev => 
          prev < filteredTowns.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedTownIndex(prev => 
          prev > 0 ? prev - 1 : filteredTowns.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedTownIndex >= 0 && selectedTownIndex < filteredTowns.length) {
          handleTownSelect(filteredTowns[selectedTownIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowTownSuggestions(false);
        setSelectedTownIndex(-1);
        break;
    }
  };

  // Load services on component mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        setServicesLoading(true);
        const [inPersonResponse, onlineResponse] = await Promise.all([
          serviceAPI.getByCategory('in-person'),
          serviceAPI.getByCategory('online')
        ]);
        
        setServices({
          inPerson: inPersonResponse.data.data || [],
          online: onlineResponse.data.data || []
        });
      } catch (error) {
        console.error('Error loading services:', error);
        // Show error message instead of fallback services
        alert('Unable to load services. Please try again or contact support.');
        setServices({
          inPerson: [],
          online: []
        });
      } finally {
        setServicesLoading(false);
      }
    };

    loadServices();
  }, []);

  // Handle service selection
  const handleServiceToggle = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      }));
    } catch (error) {
      alert('Unable to get your location. Please enter coordinates manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!validateEmail(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
      if (!validatePhone(formData.phone)) {
        throw new Error('Please enter a valid phone number');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (!formData.addressLine1.trim()) {
        throw new Error('Please enter your address line 1');
      }
      if (!formData.town.trim()) {
        throw new Error('Please select a town or city');
      }
      if (!formData.county.trim()) {
        throw new Error('Please ensure a county is selected');
      }
      if (!formData.postcode.trim()) {
        throw new Error('Please enter your postcode');
      }
      if (!formData.latitude || !formData.longitude) {
        throw new Error('Please provide your location coordinates');
      }
      if (formData.selectedServices.length === 0) {
        throw new Error('Please select at least one service you offer');
      }

      const dataToSend = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        licenseNumber: formData.licenceNumber,
        // Map UK address format to backend expected format
        address: `${formData.addressLine1}${formData.addressLine2 ? ', ' + formData.addressLine2 : ''}`,
        city: formData.town,
        state: formData.county,
        zipCode: formData.postcode,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        bio: formData.bio || '',
        languages: formData.languages || ['English'],
        certifications: formData.certifications || []
        // Note: Services will be handled separately after registration
      };

      console.log('Doctor registration data:', JSON.stringify(dataToSend, null, 2));

      // Use the new authentication API
      const response = await authAPI.register('doctor', dataToSend);
      
      if (response.user) {
        alert('Doctor profile registered successfully! Your information will be reviewed and you will receive a confirmation email once verified.');
        router.push('/?registered=doctor');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.response?.data?.error?.message || error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen py-12 transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className={`inline-flex items-center mb-4 transition-colors ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
            }`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Stethoscope className={`h-8 w-8 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Join as Doctor</h1>
            </div>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Create your profile to start receiving service requests
            </p>
          </div>

          {/* Form */}
          <div className="form-container">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h2 className="form-section-heading">Personal Information</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="form-input pr-10"
                      placeholder="Enter password (min 6 characters)"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-gray-300' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="form-input pr-10"
                      placeholder="Confirm your password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-gray-300' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h2 className="form-section-heading">Professional Information</h2>
                
                <div>
                  <label className="form-label">
                    GMC Number *
                  </label>
                  <input
                    type="text"
                    name="licenceNumber"
                    value={formData.licenceNumber}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="Enter GMC number"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    className="form-input"
                    placeholder="Brief bio about yourself and experience"
                  />
                </div>
              </div>

              {/* Services Offered */}
              <div className="space-y-4">
                <h2 className="form-section-heading">Services You Offer</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                  Select the services you provide to help businesses find you
                </p>
                
                {servicesLoading ? (
                  <div className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading services...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* In-Person Services */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        In-Person Services
                      </h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {services.inPerson.map((service) => (
                          <label
                            key={service.id}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                              formData.selectedServices.includes(service.id)
                                ? isDarkMode
                                  ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                                  : 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDarkMode
                                  ? 'border-gray-600 hover:border-gray-500 text-gray-300'
                                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedServices.includes(service.id)}
                              onChange={() => handleServiceToggle(service.id)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium">{service.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Online Services */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Online Services
                      </h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {services.online.map((service) => (
                          <label
                            key={service.id}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                              formData.selectedServices.includes(service.id)
                                ? isDarkMode
                                  ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                                  : 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDarkMode
                                  ? 'border-gray-600 hover:border-gray-500 text-gray-300'
                                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedServices.includes(service.id)}
                              onChange={() => handleServiceToggle(service.id)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium">{service.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h2 className="form-section-heading">Location Information</h2>
                
                <div>
                  <label className="form-label">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="House number and street name"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Apartment, suite, unit, building, floor, etc. (optional)"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="relative">
                    <label className="form-label">
                      Town/City *
                    </label>
                    <input
                      type="text"
                      name="town"
                      value={townQuery}
                      onChange={handleTownChange}
                      onKeyDown={handleTownKeyDown}
                      onFocus={() => townQuery.length > 0 && setShowTownSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTownSuggestions(false), 300)}
                      required
                      className="form-input"
                      placeholder="Start typing town or city..."
                      autoComplete="off"
                    />
                    {showTownSuggestions && filteredTowns.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${
                        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                      } max-h-60 overflow-auto`}>
                        {filteredTowns.map((townData, index) => (
                          <button
                            key={index}
                            type="button"
                            className={`w-full text-left px-4 py-2 text-sm first:rounded-t-md last:rounded-b-md transition-colors ${
                              index === selectedTownIndex
                                ? isDarkMode 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-blue-500 text-white'
                                : isDarkMode 
                                  ? 'text-gray-200 hover:text-white hover:bg-gray-700 active:bg-gray-600' 
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                            }`}
                            onClick={() => handleTownSelect(townData)}
                            onMouseEnter={() => setSelectedTownIndex(index)}
                            onTouchStart={() => setSelectedTownIndex(index)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              handleTownSelect(townData);
                            }}
                            style={{ 
                              WebkitTapHighlightColor: 'transparent',
                              touchAction: 'manipulation'
                            }}
                          >
                            <div className="font-medium">{townData.town}</div>
                            <div className={`text-xs ${
                              index === selectedTownIndex
                                ? 'text-blue-100'
                                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {townData.county}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">
                      County *
                    </label>
                    <input
                      type="text"
                      name="county"
                      value={formData.county}
                      onChange={handleInputChange}
                      required
                      className={`form-input ${
                        formData.county ? 'bg-gray-50 dark:bg-gray-700' : ''
                      }`}
                      placeholder="County (auto-filled)"
                      readOnly={!!formData.county}
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="Enter postcode"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Latitude * (Auto-filled)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      required
                      readOnly
                      className={`form-input ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-600 cursor-not-allowed'
                      }`}
                      placeholder="Use 'Get Current Location' button"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Longitude * (Auto-filled)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      required
                      readOnly
                      className={`form-input ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-600 cursor-not-allowed'
                      }`}
                      placeholder="Use 'Get Current Location' button"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 ${
                    isDarkMode 
                      ? 'border-blue-500 text-blue-400 bg-gray-800 hover:bg-gray-700' 
                      : 'border-blue-500 text-blue-600 bg-white hover:bg-blue-50'
                  }`}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {locationLoading ? 'Getting Location...' : 'Get My Location'}
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                    isDarkMode 
                      ? 'bg-blue-800 text-white hover:bg-blue-700 shadow-blue-900/50' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                  }`}
                >
                  {loading ? 'Registering...' : 'Register as Doctor'}
                </button>
              </div>

              <div className="form-footer-text">
                Already have an account?{' '}
                <Link href="/doctor/login" className="form-link">
                  Login here
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

