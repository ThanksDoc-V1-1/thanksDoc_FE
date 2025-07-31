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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    licenceNumber: '',
    address: '',
    city: '',
    state: '',
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
      if (!formData.latitude || !formData.longitude) {
        throw new Error('Please provide your location coordinates');
      }
      if (formData.selectedServices.length === 0) {
        throw new Error('Please select at least one service you offer');
      }

      const { confirmPassword, selectedServices, licenceNumber, postcode, ...dataToSend } = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`, // Add combined name field
        licenseNumber: formData.licenceNumber, // Map licenceNumber to licenseNumber
        zipCode: formData.postcode, // Map postcode to zipCode
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        services: formData.selectedServices // Add services to the data
      };

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
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={2}
                    className="form-input"
                    placeholder="Enter complete address"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="State"
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
                      placeholder="ZIP"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="Latitude"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="Longitude"
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

