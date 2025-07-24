'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  Filter, 
  Search, 
  TrendingUp, 
  Clock,
  Building2,
  Check,
  Banknote,
  ChevronDown,
  FileText,
  DollarSign
} from 'lucide-react';
import { serviceRequestAPI, doctorAPI } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function DoctorEarnings() {
  const router = useRouter();
  const { user, isAuthenticated, authLoading } = useAuth();
  const { isDarkMode } = useTheme();
  
  // State management
  const [earnings, setEarnings] = useState([]);
  const [filteredEarnings, setFilteredEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorData, setDoctorData] = useState(null);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'business'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  
  // Summary stats
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalRequests: 0,
    averageEarning: 0,
    thisMonth: 0,
    lastMonth: 0
  });

  // Authentication check
  useEffect(() => {
    // Don't redirect if we're still loading auth state
    if (authLoading) {
      return;
    }
    
    // Only redirect if we're sure the user is not authenticated or not a doctor
    if (!isAuthenticated || user?.role !== 'doctor') {
      console.log('🔐 Auth check failed:', { isAuthenticated, userRole: user?.role, authLoading });
      router.push('/doctor/login');
      return;
    }
  }, [isAuthenticated, authLoading, user, router]);

  // Fetch doctor data and earnings
  useEffect(() => {
    // Only fetch if we have a valid authenticated doctor user
    if (!authLoading && isAuthenticated && user?.role === 'doctor' && user?.id) {
      console.log('✅ Fetching data for authenticated doctor:', user.id);
      fetchDoctorData();
      fetchEarnings();
    }
  }, [isAuthenticated, authLoading, user]);

  const fetchDoctorData = async () => {
    try {
      console.log('🔍 Fetching doctor profile...');
      const response = await doctorAPI.getProfile();
      console.log('✅ Doctor profile response:', response.data);
      setDoctorData(response.data);
    } catch (error) {
      console.error('❌ Error fetching doctor data:', error);
      
      // If we get an authentication error, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔐 Authentication failed, redirecting to login');
        localStorage.clear(); // Clear potentially invalid tokens
        router.push('/doctor/login');
      }
    }
  };

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      
      // Ensure we have user ID before proceeding
      if (!user?.id) {
        console.error('❌ No user ID available for earnings fetch');
        return;
      }
      
      // Use the same method as dashboard - get requests specifically for this doctor
      console.log('🔍 Fetching doctor requests for ID:', user.id);
      const response = await serviceRequestAPI.getDoctorRequests(user.id);
      const allRequests = response.data || [];
      
      console.log('🔍 Doctor requests response:', allRequests);
      
      // Filter for completed requests only
      const completedRequests = allRequests.filter(request => {
        const requestData = request.attributes || request;
        const status = requestData.status;
        const completedAt = requestData.completedAt;
        const totalAmount = requestData.totalAmount;
        
        console.log('📊 Request details:', {
          requestId: request.id,
          status,
          completedAt,
          totalAmount,
          isCompleted: status === 'completed' && completedAt && totalAmount > 0
        });
        
        return status === 'completed' && completedAt && totalAmount > 0;
      });

      console.log('✅ Filtered completed requests:', completedRequests);

      // Transform the data for earnings display
      const earningsData = completedRequests.map(request => {
        const requestData = request.attributes || request;
        return {
          id: request.id,
          date: requestData.completedAt,
          amount: requestData.totalAmount,
          serviceType: requestData.serviceType,
          duration: requestData.estimatedDuration,
          business: {
            name: requestData.business?.data?.attributes?.businessName || 
                  requestData.business?.businessName || 
                  'Unknown Business',
            contact: requestData.business?.data?.attributes?.contactPersonName || 
                    requestData.business?.contactPersonName || 
                    'Unknown Contact'
          },
          requestedAt: requestData.requestedAt,
          description: requestData.description
        };
      });

      console.log('💰 Earnings data:', earningsData);
      setEarnings(earningsData);
      setFilteredEarnings(earningsData);
      calculateStats(earningsData);
    } catch (error) {
      console.error('❌ Error fetching earnings:', error);
      
      // If we get an authentication error, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔐 Authentication failed during earnings fetch, redirecting to login');
        localStorage.clear(); // Clear potentially invalid tokens
        router.push('/doctor/login');
        return;
      }
      
      // Set empty data on other errors
      setEarnings([]);
      setFilteredEarnings([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (earningsData) => {
    const total = earningsData.reduce((sum, earning) => sum + earning.amount, 0);
    const totalRequests = earningsData.length;
    const average = totalRequests > 0 ? total / totalRequests : 0;
    
    // Calculate this month and last month earnings
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const thisMonthEarnings = earningsData.filter(earning => {
      const date = new Date(earning.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((sum, earning) => sum + earning.amount, 0);
    
    const lastMonthEarnings = earningsData.filter(earning => {
      const date = new Date(earning.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).reduce((sum, earning) => sum + earning.amount, 0);
    
    setStats({
      totalEarnings: total,
      totalRequests,
      averageEarning: average,
      thisMonth: thisMonthEarnings,
      lastMonth: lastMonthEarnings
    });
  };

  // Filter and sort earnings
  useEffect(() => {
    let filtered = [...earnings];
    
    // Date filtering
    if (dateFrom) {
      filtered = filtered.filter(earning => new Date(earning.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(earning => new Date(earning.date) <= new Date(dateTo));
    }
    
    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(earning => 
        earning.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        earning.business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        earning.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'business':
          aValue = a.business.name.toLowerCase();
          bValue = b.business.name.toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredEarnings(filtered);
    calculateStats(filtered);
  }, [earnings, dateFrom, dateTo, searchTerm, sortBy, sortOrder]);

  const exportToCsv = () => {
    const csvContent = [
      ['Date', 'Service Type', 'Business', 'Duration (hrs)', 'Amount (£)', 'Description'],
      ...filteredEarnings.map(earning => [
        formatDate(earning.date),
        earning.serviceType,
        earning.business.name,
        earning.duration,
        earning.amount.toFixed(2),
        earning.description || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-earnings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setSortBy('date');
    setSortOrder('desc');
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'doctor') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Loading earnings data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`shadow-md transition-colors ${
        isDarkMode 
          ? 'bg-gray-900 border-b border-gray-800' 
          : 'bg-white border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/doctor/dashboard')}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-800 rounded-lg shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Earnings Report
                  </h1>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Track your medical service earnings
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={exportToCsv}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-green-900/30 text-green-300 hover:bg-green-800/50' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400 font-medium">Total Earnings</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>£{stats.totalEarnings.toFixed(2)}</p>
              </div>
              <div className={`p-3 rounded-lg ${
                isDarkMode 
                  ? 'bg-green-900/30' 
                  : 'bg-green-600'
              }`}>
                <Banknote className={`h-6 w-6 ${
                  isDarkMode ? 'text-green-400' : 'text-white'
                }`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400 font-medium">Completed Requests</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{stats.totalRequests}</p>
              </div>
              <div className={`p-3 rounded-lg ${
                isDarkMode 
                  ? 'bg-blue-900/30' 
                  : 'bg-blue-600'
              }`}>
                <Check className={`h-6 w-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-white'
                }`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-400 font-medium">Average per Request</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>£{stats.averageEarning.toFixed(2)}</p>
              </div>
              <div className={`p-3 rounded-lg ${
                isDarkMode 
                  ? 'bg-purple-900/30' 
                  : 'bg-purple-600'
              }`}>
                <TrendingUp className={`h-6 w-6 ${
                  isDarkMode ? 'text-purple-400' : 'text-white'
                }`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-400 font-medium">This Month</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>£{stats.thisMonth.toFixed(2)}</p>
                {stats.lastMonth > 0 && (
                  <p className={`text-xs mt-1 ${
                    stats.thisMonth >= stats.lastMonth 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {stats.thisMonth >= stats.lastMonth ? '↗' : '↘'} vs last month
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${
                isDarkMode 
                  ? 'bg-amber-900/30' 
                  : 'bg-amber-600'
              }`}>
                <Calendar className={`h-6 w-6 ${
                  isDarkMode ? 'text-amber-400' : 'text-white'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-lg shadow border p-6 mb-8 ${
          isDarkMode 
            ? 'bg-gray-900 border-gray-800' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Filters & Search</h2>
            <button
              onClick={resetFilters}
              className={`text-sm px-3 py-1 rounded transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Reset Filters
            </button>
          </div>
          
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`w-full rounded-lg p-2 transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border border-gray-700 text-white' 
                    : 'bg-white border border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`w-full rounded-lg p-2 transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border border-gray-700 text-white' 
                    : 'bg-white border border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Search
              </label>
              <div className="relative">
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Search services, businesses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-lg pl-10 pr-3 py-2 transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full rounded-lg p-2 transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border border-gray-700 text-white' 
                    : 'bg-white border border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="business">Business</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={`w-full rounded-lg p-2 transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border border-gray-700 text-white' 
                    : 'bg-white border border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Earnings List */}
        <div className={`rounded-lg shadow border ${
          isDarkMode 
            ? 'bg-gray-900 border-gray-800' 
            : 'bg-white border-gray-200'
        }`}>
          <div className={`p-6 border-b ${
            isDarkMode ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Earnings History
              </h2>
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {filteredEarnings.length} records found
              </span>
            </div>
          </div>
          
          <div className={`divide-y ${
            isDarkMode ? 'divide-gray-800' : 'divide-gray-200'
          }`}>
            {filteredEarnings.length > 0 ? (
              filteredEarnings.map((earning, index) => (
                <div key={earning.id} className={`p-6 transition-colors ${
                  index % 2 === 0 
                    ? isDarkMode ? 'bg-gray-900/50 hover:bg-gray-800/70' : 'bg-gray-50 hover:bg-gray-100' 
                    : isDarkMode ? 'bg-gray-900 hover:bg-gray-800/50' : 'bg-white hover:bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isDarkMode 
                            ? 'bg-green-900/40 text-green-400 border border-green-900' 
                            : 'bg-green-100 text-green-700 border border-green-300'
                        }`}>
                          COMPLETED
                        </span>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatDate(earning.date)}
                        </span>
                      </div>
                      
                      <h3 className={`font-semibold text-lg mb-2 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {earning.serviceType}
                      </h3>
                      
                      {earning.description && (
                        <p className={`text-sm mb-3 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {earning.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                          isDarkMode 
                            ? 'text-blue-400 bg-blue-900/20' 
                            : 'text-blue-600 bg-blue-50'
                        }`}>
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{earning.business.name}</span>
                        </div>
                        
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                          isDarkMode 
                            ? 'text-gray-400 bg-gray-700/50' 
                            : 'text-gray-600 bg-gray-100'
                        }`}>
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{earning.duration}h</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end ml-4">
                      <div className={`text-2xl font-bold ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        £{earning.amount.toFixed(2)}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Requested: {formatDate(earning.requestedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <FileText className={`h-16 w-16 mx-auto mb-4 ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <h3 className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  No earnings found
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {dateFrom || dateTo || searchTerm 
                    ? 'Try adjusting your filters to see more results.'
                    : 'Complete service requests to start earning and see your earnings here.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
