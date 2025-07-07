'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Stethoscope, ArrowLeft, MapPin } from 'lucide-react';
import { authAPI } from '../../../lib/api';
import { getCurrentLocation, validateEmail, validatePhone } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';

const inputClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

export default function DoctorRegister() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Stethoscope className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Join as Doctor</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">Create your profile to start receiving service requests</p>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Information</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className={inputClasses}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className={inputClasses}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={inputClasses}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className={inputClasses}
                    placeholder="Enter password (min 6 characters)"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className={inputClasses}
                    placeholder="Confirm your password"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className={inputClasses}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className={inputClasses}
                    placeholder="Emergency contact number"
                  />
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Professional Information</h2>
                
                <div>
                  <label className={labelClasses}>
                    Specialization *
                  </label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    required
                    className={inputClasses}
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
                  <label className={labelClasses}>
                    Medical License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    required
                    className={inputClasses}
                    placeholder="Enter license number"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>
                      Years of Experience *
                    </label>
                    <input
                      type="number"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      required
                      min="0"
                      className={inputClasses}
                      placeholder="Years"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>
                      Hourly Rate (USD) *
                    </label>
                    <input
                      type="number"
                      name="hourlyRate"
                      value={formData.hourlyRate}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className={inputClasses}
                      placeholder="Rate per hour"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief bio about yourself and experience"
                  />
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location Information</h2>
                
                <div>
                  <label className={labelClasses}>
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter complete address"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClasses}>
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className={inputClasses}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className={inputClasses}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className={inputClasses}
                      placeholder="ZIP"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      required
                      className={inputClasses}
                      placeholder="Latitude"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      required
                      className={inputClasses}
                      placeholder="Longitude"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
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
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Registering...' : 'Register as Doctor'}
                </button>
              </div>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link href="/doctor/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
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
