'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Clock, User, MapPin, DollarSign } from 'lucide-react';
import { serviceRequestAPI, doctorAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getUrgencyColor, getStatusColor } from '../../../lib/utils';

// Mock business data - in a real app, this would come from authentication
const mockBusiness = {
  id: 1,
  businessName: "HealthCare Pharmacy",
  contactPersonName: "John Smith",
  email: "john@healthcare.com",
  latitude: 40.7128,
  longitude: -74.0060,
  address: "123 Main St, New York, NY 10001"
};

export default function BusinessDashboard() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [nearbyDoctors, setNearbyDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    urgencyLevel: 'medium',
    serviceType: '',
    description: '',
    estimatedDuration: 1,
  });

  useEffect(() => {
    fetchServiceRequests();
    fetchNearbyDoctors();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      // In a real app, this would use the actual business ID
      const response = await serviceRequestAPI.getBusinessRequests(mockBusiness.id);
      setServiceRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchNearbyDoctors = async () => {
    try {
      const response = await doctorAPI.getAvailable({
        latitude: mockBusiness.latitude,
        longitude: mockBusiness.longitude,
        radius: 10
      });
      setNearbyDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching nearby doctors:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestData = {
        businessId: mockBusiness.id,
        ...formData,
        estimatedDuration: parseInt(formData.estimatedDuration),
      };

      const response = await serviceRequestAPI.createServiceRequest(requestData);
      
      if (response.data) {
        alert(`Service request created successfully! ${response.data.notifiedDoctors} nearby doctors have been notified.`);
        setShowRequestForm(false);
        setFormData({
          urgencyLevel: 'medium',
          serviceType: '',
          description: '',
          estimatedDuration: 1,
        });
        fetchServiceRequests();
      }
    } catch (error) {
      console.error('Error creating service request:', error);
      alert('Failed to create service request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{mockBusiness.businessName}</h1>
                <p className="text-gray-600">Welcome back, {mockBusiness.contactPersonName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowRequestForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Request Doctor</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{serviceRequests.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {serviceRequests.filter(req => req.status === 'completed').length}
                    </p>
                  </div>
                  <User className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Nearby Doctors</p>
                    <p className="text-2xl font-bold text-purple-600">{nearbyDoctors.length}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Service Requests */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Recent Service Requests</h2>
              </div>
              <div className="divide-y">
                {serviceRequests.length > 0 ? (
                  serviceRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                              {request.urgencyLevel.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{request.serviceType}</h3>
                          <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                          <p className="text-xs text-gray-500">
                            Requested: {formatDate(request.requestedAt)}
                          </p>
                          {request.doctor && (
                            <p className="text-xs text-gray-500">
                              Doctor: Dr. {request.doctor.firstName} {request.doctor.lastName}
                            </p>
                          )}
                        </div>
                        {request.totalAmount && (
                          <div className="text-right">
                            <div className="flex items-center text-green-600">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold">{formatCurrency(request.totalAmount)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No service requests yet. Click "Request Doctor" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {mockBusiness.businessName}</p>
                <p><span className="font-medium">Contact:</span> {mockBusiness.contactPersonName}</p>
                <p><span className="font-medium">Email:</span> {mockBusiness.email}</p>
                <p><span className="font-medium">Address:</span> {mockBusiness.address}</p>
              </div>
            </div>

            {/* Nearby Doctors */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Available Doctors Nearby</h3>
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {nearbyDoctors.slice(0, 5).map((doctor) => (
                  <div key={doctor.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        <p className="text-xs text-gray-500">
                          {doctor.yearsOfExperience} years exp. • {formatCurrency(doctor.hourlyRate)}/hr
                        </p>
                        {doctor.distance && (
                          <p className="text-xs text-blue-600">
                            {doctor.distance.toFixed(1)} km away
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Request a Doctor</h2>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <input
                  type="text"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Emergency consultation, Health checkup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level *
                </label>
                <select
                  name="urgencyLevel"
                  value={formData.urgencyLevel}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (hours) *
                </label>
                <input
                  type="number"
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleInputChange}
                  required
                  min="0.5"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what kind of medical assistance you need"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Requesting...' : 'Request Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
