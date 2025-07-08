'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Building2, Stethoscope, Check, X, Eye, Search, Filter, AlertTriangle, Calendar, Clock, MapPin, DollarSign, Phone, Mail, FileCheck, RefreshCw } from 'lucide-react';
import { doctorAPI, businessAPI, serviceRequestAPI } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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

  // Filter functions for search and status filters
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = searchTerm === '' || 
      `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'verified' && doctor.isVerified) || 
      (filterStatus === 'unverified' && !doctor.isVerified);
    
    return matchesSearch && matchesFilter;
  });

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = searchTerm === '' || 
      business.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.businessType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.businessLicense?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'verified' && business.isVerified) || 
      (filterStatus === 'unverified' && !business.isVerified);
    
    return matchesSearch && matchesFilter;
  });

  const filteredRequests = serviceRequests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.business?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.doctor?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.doctor?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'pending' && request.status === 'pending') || 
      (filterStatus === 'accepted' && request.status === 'accepted') ||
      (filterStatus === 'completed' && request.status === 'completed');
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalDoctors: doctors.length,
    verifiedDoctors: doctors.filter(d => d.attributes?.isVerified || d.isVerified).length,
    totalBusinesses: businesses.length,
    verifiedBusinesses: businesses.filter(b => b.attributes?.isVerified || b.isVerified).length,
    totalRequests: serviceRequests.length,
    completedRequests: serviceRequests.filter(r => r.attributes?.status === 'completed' || r.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-800 rounded-lg shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ThanksDoc Admin</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage doctors, businesses, and service requests</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchAllData}
                className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search & Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none shadow-sm"
              placeholder="Search by name, email, license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2 whitespace-nowrap">
            <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <select 
              className="block w-full pl-3 pr-8 py-2.5 text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 bg-white dark:bg-gray-900 p-1.5 rounded-xl shadow border border-gray-200 dark:border-gray-800">
          <nav className="grid grid-cols-2 sm:flex gap-1.5">
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
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-gray-300 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400"></div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Doctors Stats Card */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/5 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-3.5 rounded-2xl shadow-inner">
                      <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${
                      stats.verifiedDoctors / Math.max(stats.totalDoctors, 1) >= 0.8 
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {Math.round(stats.verifiedDoctors / Math.max(stats.totalDoctors, 1) * 100)}% Verified
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Doctors</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalDoctors}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{stats.verifiedDoctors}</span> verified
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{stats.totalDoctors - stats.verifiedDoctors}</span> pending
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Businesses Stats Card */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/5 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-purple-100 dark:bg-purple-900/40 p-3.5 rounded-2xl shadow-inner">
                      <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${
                      stats.verifiedBusinesses / Math.max(stats.totalBusinesses, 1) >= 0.8 
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {Math.round(stats.verifiedBusinesses / Math.max(stats.totalBusinesses, 1) * 100)}% Verified
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Businesses</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalBusinesses}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{stats.verifiedBusinesses}</span> verified
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{stats.totalBusinesses - stats.verifiedBusinesses}</span> pending
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Requests Stats Card */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/5 dark:to-green-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-100 dark:bg-green-900/40 p-3.5 rounded-2xl shadow-inner">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                      {Math.round(stats.completedRequests / Math.max(stats.totalRequests, 1) * 100)}% Complete
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Service Requests</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalRequests}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{stats.completedRequests}</span> completed
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{stats.totalRequests - stats.completedRequests}</span> active
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/5 dark:to-amber-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-amber-100 dark:bg-amber-900/40 p-3.5 rounded-2xl shadow-inner">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                      Last 24 Hours
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">New Requests</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {serviceRequests.filter(r => {
                      const date = new Date(r.requestedAt || r.attributes?.requestedAt);
                      const now = new Date();
                      const diff = now - date;
                      return diff < 24 * 60 * 60 * 1000;
                    }).length}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {serviceRequests.filter(r => r.status === 'pending' || r.attributes?.status === 'pending').length}
                        </span> pending
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {serviceRequests.filter(r => r.status === 'accepted' || r.attributes?.status === 'accepted').length}
                        </span> accepted
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Service Requests */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-500 mr-2" />
                      Recent Service Requests
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Latest service requests from businesses</p>
                  </div>
                  <button onClick={() => setActiveTab('requests')} 
                    className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                    View all requests →
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {serviceRequests.slice(0, 5).map((request) => {
                  // Handle both direct properties and nested attributes
                  const id = request.id || request.attributes?.id;
                  const serviceType = request.serviceType || request.attributes?.serviceType;
                  const requestedAt = request.requestedAt || request.attributes?.requestedAt;
                  const status = request.status || request.attributes?.status;
                  const totalAmount = request.totalAmount || request.attributes?.totalAmount;
                  const urgencyLevel = request.urgencyLevel || request.attributes?.urgencyLevel;
                  
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
                    <div key={id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              urgencyLevel === 'emergency' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400' :
                              urgencyLevel === 'high' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' :
                              urgencyLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                              'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                            }`}>
                              {urgencyLevel || 'normal'}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                              status === 'accepted' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' :
                              status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                            }`}>
                              {(status || 'pending').replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{serviceType}</h3>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1 space-x-2">
                            <Building2 className="h-4 w-4 flex-shrink-0" />
                            <span>{businessName}</span>
                            <span className="text-gray-400 dark:text-gray-600">→</span>
                            <Stethoscope className="h-4 w-4 flex-shrink-0" />
                            <span>{doctorName}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-500 mt-2">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            <span>{formatDate(requestedAt)}</span>
                          </div>
                        </div>
                        
                        {totalAmount && (
                          <div className="flex flex-col items-end ml-4">
                            <div className="text-sm font-semibold text-green-600 dark:text-green-500 flex items-center">
                              <DollarSign className="h-3.5 w-3.5 mr-0.5" />
                              {formatCurrency(totalAmount)}
                            </div>
                            <div className={`mt-1 text-xs px-2 py-1 rounded-full ${
                              (request.paymentStatus || request.attributes?.paymentStatus) === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                              (request.paymentStatus || request.attributes?.paymentStatus) === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                              (request.paymentStatus || request.attributes?.paymentStatus) === 'failed' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                            }`}>
                              {((request.paymentStatus || request.attributes?.paymentStatus) || 'pending').toUpperCase()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {serviceRequests.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-500 mr-2" />
                  Doctors Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Verify and manage doctor profiles</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full flex items-center">
                  <Check className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.verifiedDoctors}</span> Verified
                </span>
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.totalDoctors - stats.verifiedDoctors}</span> Pending
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search doctors by name, specialty, license or email..." 
                  className="w-full pl-10 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="mb-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'all' ? 
                    'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All Doctors
                </button>
                <button 
                  onClick={() => setFilterStatus('verified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'verified' ? 
                    'bg-green-600 text-white font-medium' :
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}
                >
                  Verified Only
                </button>
                <button 
                  onClick={() => setFilterStatus('unverified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'unverified' ? 
                    'bg-yellow-600 text-white font-medium' :
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                  }`}
                >
                  Pending Verification
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Experience & Rate
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredDoctors.length > 0 ? filteredDoctors.map((doctor) => {
                    // Access data considering both direct properties and nested attributes structure
                    const id = doctor.id;
                    const firstName = doctor.firstName || doctor.attributes?.firstName;
                    const lastName = doctor.lastName || doctor.attributes?.lastName;
                    const email = doctor.email || doctor.attributes?.email;
                    const licenseNumber = doctor.licenseNumber || doctor.attributes?.licenseNumber;
                    const specialization = doctor.specialization || doctor.attributes?.specialization;
                    const yearsOfExperience = doctor.yearsOfExperience || doctor.attributes?.yearsOfExperience;
                    const hourlyRate = doctor.hourlyRate || doctor.attributes?.hourlyRate;
                    const isVerified = doctor.isVerified || doctor.attributes?.isVerified;
                    const isAvailable = doctor.isAvailable || doctor.attributes?.isAvailable;
                    const city = doctor.city || doctor.attributes?.city;
                    const state = doctor.state || doctor.attributes?.state;
                    
                    return (
                      <tr key={id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                              {firstName?.charAt(0)}{lastName?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                Dr. {firstName} {lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <Mail className="h-3.5 w-3.5 mr-1 stroke-2" /> {email}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <FileCheck className="h-3.5 w-3.5 mr-1 stroke-2" /> {licenseNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">{specialization}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white flex flex-col">
                            <span className="font-medium">{yearsOfExperience} years experience</span>
                            <span className="text-green-600 dark:text-green-500 font-medium">{formatCurrency(hourlyRate)}/hr</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                            <span>{city}, {state}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              isVerified 
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900' 
                              : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900'
                            }`}>
                              {isVerified 
                                ? <Check className="h-3.5 w-3.5 mr-1 stroke-2" /> 
                                : <Clock className="h-3.5 w-3.5 mr-1 stroke-2" />
                              }
                              {isVerified ? 'Verified' : 'Pending'}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              isAvailable 
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
                            }`}>
                              {isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            {!isVerified ? (
                              <button
                                onClick={() => handleVerifyDoctor(id, true)}
                                className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center"
                              >
                                <Check className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Verify</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerifyDoctor(id, false)}
                                className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center"
                              >
                                <X className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Unverify</span>
                              </button>
                            )}
                            <button 
                              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => alert(`View details for ${firstName} ${lastName}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className="bg-white dark:bg-gray-900">
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        {searchTerm || filterStatus !== 'all' ? (
                          <>
                            <p className="font-medium">No matching doctors found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
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
            
            {filteredDoctors.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'} of {doctors.length} total
              </div>
            )}
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-500 mr-2" />
                  Businesses Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Verify and manage business profiles</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full flex items-center">
                  <Check className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.verifiedBusinesses}</span> Verified
                </span>
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1 stroke-2" />
                  <span className="font-medium">{stats.totalBusinesses - stats.verifiedBusinesses}</span> Pending
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search businesses by name, type, license or email..." 
                  className="w-full pl-10 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="mb-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'all' ? 
                    'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All Businesses
                </button>
                <button 
                  onClick={() => setFilterStatus('verified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'verified' ? 
                    'bg-green-600 text-white font-medium' :
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}
                >
                  Verified Only
                </button>
                <button 
                  onClick={() => setFilterStatus('unverified')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'unverified' ? 
                    'bg-yellow-600 text-white font-medium' :
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                  }`}
                >
                  Pending Verification
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredBusinesses.length > 0 ? filteredBusinesses.map((business) => {
                    // Access data considering both direct properties and nested attributes structure
                    const id = business.id;
                    const businessName = business.businessName || business.attributes?.businessName;
                    const email = business.email || business.attributes?.email;
                    const businessLicense = business.businessLicense || business.attributes?.businessLicense;
                    const businessType = business.businessType || business.attributes?.businessType;
                    const contactPersonName = business.contactPersonName || business.attributes?.contactPersonName;
                    const phone = business.phone || business.attributes?.phone;
                    const city = business.city || business.attributes?.city;
                    const state = business.state || business.attributes?.state;
                    const zipCode = business.zipCode || business.attributes?.zipCode;
                    const isVerified = business.isVerified || business.attributes?.isVerified;
                    
                    // Get business type color
                    const getBusinessTypeColor = (type) => {
                      switch(type?.toLowerCase()) {
                        case 'pharmacy': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400';
                        case 'clinic': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
                        case 'hospital': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400';
                        default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
                      }
                    };

                    return (
                      <tr key={id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                              {businessName?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {businessName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <Mail className="h-3.5 w-3.5 mr-1 stroke-2" /> {email}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <FileCheck className="h-3.5 w-3.5 mr-1 stroke-2" /> {businessLicense}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${getBusinessTypeColor(businessType)}`}>
                            {businessType || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">{contactPersonName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Phone className="h-3.5 w-3.5 mr-1 stroke-2" /> {phone}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                            <span>{city}, {state}</span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{zipCode}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isVerified 
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900' 
                            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900'
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
                            {!isVerified ? (
                              <button
                                onClick={() => handleVerifyBusiness(id, true)}
                                className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center"
                              >
                                <Check className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Verify</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerifyBusiness(id, false)}
                                className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center"
                              >
                                <X className="h-4 w-4 mr-1.5 stroke-2" />
                                <span>Unverify</span>
                              </button>
                            )}
                            <button 
                              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => alert(`View details for ${businessName}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className="bg-white dark:bg-gray-900">
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        {searchTerm || filterStatus !== 'all' ? (
                          <>
                            <p className="font-medium">No matching businesses found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
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
            
            {filteredBusinesses.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'} of {businesses.length} total
              </div>
            )}
          </div>
        )}

        {/* Service Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-500 mr-2" />
                  Service Requests
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monitor all service requests in the system</p>
              </div>
              <div className="flex items-center space-x-3 text-sm self-end sm:self-auto">
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full">
                  <span className="font-medium">{serviceRequests.filter(r => r.status === 'pending' || r.attributes?.status === 'pending').length}</span> Pending
                </span>
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                  <span className="font-medium">{serviceRequests.filter(r => r.status === 'completed' || r.attributes?.status === 'completed').length}</span> Completed
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search service requests by type, business, or doctor..." 
                  className="w-full pl-10 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="mb-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'all' ? 
                    'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All Requests
                </button>
                <button 
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'pending' ? 
                    'bg-yellow-600 text-white font-medium' :
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                  }`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => setFilterStatus('accepted')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'accepted' ? 
                    'bg-blue-600 text-white font-medium' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  }`}
                >
                  Accepted
                </button>
                <button 
                  onClick={() => setFilterStatus('completed')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === 'completed' ? 
                    'bg-green-600 text-white font-medium' :
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRequests.length > 0 ? filteredRequests.map((request) => {
                // Handle both direct properties and nested attributes
                const id = request.id || request.attributes?.id;
                const serviceType = request.serviceType || request.attributes?.serviceType;
                const description = request.description || request.attributes?.description;
                const requestedAt = request.requestedAt || request.attributes?.requestedAt;
                const acceptedAt = request.acceptedAt || request.attributes?.acceptedAt;
                const completedAt = request.completedAt || request.attributes?.completedAt;
                const status = request.status || request.attributes?.status;
                const totalAmount = request.totalAmount || request.attributes?.totalAmount;
                const urgencyLevel = request.urgencyLevel || request.attributes?.urgencyLevel;
                const estimatedDuration = request.estimatedDuration || request.attributes?.estimatedDuration;
                const paymentStatus = request.paymentStatus || request.attributes?.paymentStatus;
                
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
                  <div key={id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            urgencyLevel === 'emergency' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400' :
                            urgencyLevel === 'high' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' :
                            urgencyLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                            'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                          }`}>
                            {urgencyLevel || 'normal'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900' :
                            status === 'accepted' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900' :
                            status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900' :
                            status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                          }`}>
                            {(status || 'pending').replace('_', ' ')}
                          </span>
                          {requestedAt && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {formatDate(requestedAt)}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{serviceType}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{description}</p>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 flex flex-col space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 dark:text-gray-400">Business</span>
                              <span className="font-medium text-gray-900 dark:text-white">{businessName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 dark:text-gray-400">Contact</span>
                              <span className="font-medium text-gray-900 dark:text-white">{contactPersonName}</span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 flex flex-col space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 dark:text-gray-400">Doctor</span>
                              <span className="font-medium text-gray-900 dark:text-white">{doctorName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 dark:text-gray-400">Duration</span>
                              <span className="font-medium text-gray-900 dark:text-white">{estimatedDuration}h</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-500">
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
                          <div className="text-lg font-semibold text-green-600 dark:text-green-500 flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(totalAmount)}
                          </div>
                          <div className={`text-xs px-2.5 py-1.5 rounded-full flex items-center ${
                            paymentStatus === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                            paymentStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                            paymentStatus === 'failed' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                          }`}>
                            {paymentStatus === 'paid' && <Check className="h-3 w-3 mr-1 stroke-2" />}
                            {(paymentStatus || 'pending').toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="p-10 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mb-4">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No service requests found</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    {searchTerm || filterStatus !== 'all' ? 
                      'Try adjusting your search or filter criteria to find what you\'re looking for.' :
                      'Service requests will appear here when businesses submit them.'
                    }
                  </p>
                </div>
              )}
            </div>
            
            {filteredRequests.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} of {serviceRequests.length} total
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
