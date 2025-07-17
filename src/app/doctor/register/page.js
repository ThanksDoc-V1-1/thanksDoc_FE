'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Stethoscope, ArrowLeft, MapPin, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../../lib/api';
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    specialization: '',
    licenseNumber: '',
    yearsOfExperience: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    hourlyRate: '',
    bio: '',
    emergencyContact: '',
    languages: ['English'],
    certifications: [],
    latitude: '',
    longitude: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

      const { confirmPassword, ...dataToSend } = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`, // Add combined name field
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        hourlyRate: parseFloat(formData.hourlyRate),
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

                <div>
                  <label className="form-label">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Emergency contact number"
                  />
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h2 className="form-section-heading">Professional Information</h2>
                
                <div>
                  <label className="form-label">
                    Specialization *
                  </label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select specialization</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Family Medicine">Family Medicine</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Medical License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="Enter license number"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Years of Experience *
                    </label>
                    <input
                      type="number"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      required
                      min="0"
                      className="form-input"
                      placeholder="Years"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Hourly Rate (GBP) *
                    </label>
                    <input
                      type="number"
                      name="hourlyRate"
                      value={formData.hourlyRate}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="Rate per hour"
                    />
                  </div>
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
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
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

