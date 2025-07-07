'use client';

import { useState, useEffect } from 'react';
import { Stethoscope, Clock, Building2, MapPin, DollarSign, Check, X } from 'lucide-react';
import { serviceRequestAPI, doctorAPI } from '../../../lib/api';
import { formatCurrency, formatDate, getUrgencyColor, getStatusColor } from '../../../lib/utils';

// Mock doctor data - in a real app, this would come from authentication
const mockDoctor = {
  id: 1,
  firstName: "Sarah",
  lastName: "Johnson",
  email: "sarah.johnson@email.com",
  specialization: "General Medicine",
  hourlyRate: 150,
  latitude: 40.7589,
  longitude: -73.9851,
  isAvailable: true,
  yearsOfExperience: 8
};

export default function DoctorDashboard() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(mockDoctor.isAvailable);

  useEffect(() => {
    fetchNearbyRequests();
    fetchMyRequests();
  }, []);

  const fetchNearbyRequests = async () => {
    try {
      // In a real app, this would find nearby pending requests
      const response = await serviceRequestAPI.getAll();
      const pendingRequests = response.data?.data?.filter(req => req.status === 'pending') || [];
      setServiceRequests(pendingRequests);
    } catch (error) {
      console.error('Error fetching nearby requests:', error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await serviceRequestAPI.getDoctorRequests(mockDoctor.id);
      setMyRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching my requests:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setLoading(true);
    try {
      const response = await serviceRequestAPI.acceptRequest(requestId, mockDoctor.id);
      if (response.data) {
        alert('Service request accepted successfully!');
        fetchNearbyRequests();
        fetchMyRequests();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request. It may have already been taken by another doctor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRequest = async (requestId) => {
    const notes = prompt('Please add any notes about the service provided:');
    if (notes === null) return; // User cancelled

    setLoading(true);
    try {
      const response = await serviceRequestAPI.completeRequest(requestId, notes);
      if (response.data) {
        alert('Service request completed successfully!');
        fetchMyRequests();
      }
    } catch (error) {
      console.error('Error completing request:', error);
      alert('Failed to complete request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityToggle = async () => {
    try {
      const newAvailability = !isAvailable;
      await doctorAPI.updateAvailability(mockDoctor.id, newAvailability);
      setIsAvailable(newAvailability);
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dr. {mockDoctor.firstName} {mockDoctor.lastName}
                </h1>
                <p className="text-gray-600">{mockDoctor.specialization}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Available:</span>
                <button
                  onClick={handleAvailabilityToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold text-yellow-600">{serviceRequests.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">My Requests</p>
                    <p className="text-2xl font-bold text-blue-600">{myRequests.length}</p>
                  </div>
                  <Stethoscope className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {myRequests.filter(req => req.status === 'completed').length}
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Hourly Rate</p>
                    <p className="text-2xl font-bold text-purple-600">${mockDoctor.hourlyRate}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Available Requests */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Available Service Requests</h2>
                <p className="text-sm text-gray-600 mt-1">Nearby businesses needing medical assistance</p>
              </div>
              <div className="divide-y">
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <div key={request.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                              {request.urgencyLevel.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(request.requestedAt)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{request.serviceType}</h3>
                          <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Building2 className="h-4 w-4" />
                              <span>{request.business?.businessName || 'Business'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{request.estimatedDuration}h</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatCurrency(mockDoctor.hourlyRate * (request.estimatedDuration || 1))}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={loading || !isAvailable}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                          >
                            <Check className="h-4 w-4" />
                            <span>Accept</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No service requests available at the moment.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Doctor Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> Dr. {mockDoctor.firstName} {mockDoctor.lastName}</p>
                <p><span className="font-medium">Specialization:</span> {mockDoctor.specialization}</p>
                <p><span className="font-medium">Experience:</span> {mockDoctor.yearsOfExperience} years</p>
                <p><span className="font-medium">Rate:</span> {formatCurrency(mockDoctor.hourlyRate)}/hour</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </p>
              </div>
            </div>

            {/* My Active Requests */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">My Service Requests</h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {myRequests.length > 0 ? (
                  myRequests.map((request) => (
                    <div key={request.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {request.totalAmount && (
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(request.totalAmount)}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">{request.serviceType}</h4>
                        <p className="text-sm text-gray-600">{request.business?.businessName}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(request.acceptedAt || request.requestedAt)}
                        </p>
                        {request.status === 'accepted' && (
                          <button
                            onClick={() => handleCompleteRequest(request.id)}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No requests yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
