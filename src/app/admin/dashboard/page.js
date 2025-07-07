'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Building2, Stethoscope, Check, X, Eye } from 'lucide-react';
import { doctorAPI, businessAPI, serviceRequestAPI } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [doctorsRes, businessesRes, requestsRes] = await Promise.all([
        doctorAPI.getAll(),
        businessAPI.getAll(),
        serviceRequestAPI.getAll()
      ]);

      setDoctors(doctorsRes.data?.data || []);
      setBusinesses(businessesRes.data?.data || []);
      setServiceRequests(requestsRes.data?.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const stats = {
    totalDoctors: doctors.length,
    verifiedDoctors: doctors.filter(d => d.isVerified).length,
    totalBusinesses: businesses.length,
    verifiedBusinesses: businesses.filter(b => b.isVerified).length,
    totalRequests: serviceRequests.length,
    completedRequests: serviceRequests.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ThanksDoc Admin</h1>
              <p className="text-gray-600">Manage doctors, businesses, and service requests</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Eye },
              { id: 'doctors', name: 'Doctors', icon: Stethoscope },
              { id: 'businesses', name: 'Businesses', icon: Building2 },
              { id: 'requests', name: 'Service Requests', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Doctors</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalDoctors}</p>
                    <p className="text-xs text-gray-500">{stats.verifiedDoctors} verified</p>
                  </div>
                  <Stethoscope className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Businesses</p>
                    <p className="text-2xl font-bold text-green-600">{stats.totalBusinesses}</p>
                    <p className="text-xs text-gray-500">{stats.verifiedBusinesses} verified</p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Service Requests</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalRequests}</p>
                    <p className="text-xs text-gray-500">{stats.completedRequests} completed</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Recent Service Requests</h2>
              </div>
              <div className="divide-y">
                {serviceRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{request.serviceType}</h3>
                        <p className="text-sm text-gray-600">
                          {request.business?.businessName} → {request.doctor ? `Dr. ${request.doctor.firstName} ${request.doctor.lastName}` : 'Pending'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(request.requestedAt)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          request.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {request.totalAmount && (
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {formatCurrency(request.totalAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Doctors Management</h2>
              <p className="text-sm text-gray-600 mt-1">Verify and manage doctor profiles</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctors.map((doctor) => (
                    <tr key={doctor.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Dr. {doctor.firstName} {doctor.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{doctor.email}</div>
                          <div className="text-sm text-gray-500">{doctor.licenseNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doctor.specialization}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doctor.yearsOfExperience} years
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(doctor.hourlyRate)}/hr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doctor.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doctor.isVerified ? 'Verified' : 'Pending'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doctor.isAvailable ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {doctor.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {!doctor.isVerified ? (
                            <button
                              onClick={() => handleVerifyDoctor(doctor.id, true)}
                              className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                            >
                              <Check className="h-4 w-4" />
                              <span>Verify</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerifyDoctor(doctor.id, false)}
                              className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                            >
                              <X className="h-4 w-4" />
                              <span>Unverify</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Businesses Management</h2>
              <p className="text-sm text-gray-600 mt-1">Verify and manage business profiles</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {businesses.map((business) => (
                    <tr key={business.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {business.businessName}
                          </div>
                          <div className="text-sm text-gray-500">{business.email}</div>
                          <div className="text-sm text-gray-500">{business.businessLicense}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {business.businessType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{business.contactPersonName}</div>
                        <div className="text-sm text-gray-500">{business.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{business.city}, {business.state}</div>
                        <div className="text-sm text-gray-500">{business.zipCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          business.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {business.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {!business.isVerified ? (
                            <button
                              onClick={() => handleVerifyBusiness(business.id, true)}
                              className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                            >
                              <Check className="h-4 w-4" />
                              <span>Verify</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerifyBusiness(business.id, false)}
                              className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                            >
                              <X className="h-4 w-4" />
                              <span>Unverify</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Service Requests</h2>
              <p className="text-sm text-gray-600 mt-1">Monitor all service requests in the system</p>
            </div>
            <div className="divide-y">
              {serviceRequests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.urgencyLevel === 'emergency' ? 'bg-red-100 text-red-800' :
                          request.urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                          request.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {request.urgencyLevel.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          request.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{request.serviceType}</h3>
                      <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>
                          <p><span className="font-medium">Business:</span> {request.business?.businessName || 'N/A'}</p>
                          <p><span className="font-medium">Contact:</span> {request.business?.contactPersonName || 'N/A'}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Doctor:</span> {
                            request.doctor ? `Dr. ${request.doctor.firstName} ${request.doctor.lastName}` : 'Not assigned'
                          }</p>
                          <p><span className="font-medium">Duration:</span> {request.estimatedDuration}h</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-2">
                        <span>Requested: {formatDate(request.requestedAt)}</span>
                        {request.acceptedAt && (
                          <span>Accepted: {formatDate(request.acceptedAt)}</span>
                        )}
                        {request.completedAt && (
                          <span>Completed: {formatDate(request.completedAt)}</span>
                        )}
                      </div>
                    </div>
                    {request.totalAmount && (
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(request.totalAmount)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          request.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          request.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.paymentStatus?.toUpperCase() || 'PENDING'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
