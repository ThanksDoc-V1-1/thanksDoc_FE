'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  Filter, 
  TrendingDown, 
  Clock,
  User,
  Check,
  DollarSign,
  ChevronDown,
  FileText,
  Building2
} from 'lucide-react';
import { serviceRequestAPI, businessAPI } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function BusinessExpenditure() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, authLoading } = useAuth();
  const { isDarkMode } = useTheme();
  
  // State management
  const [expenditures, setExpenditures] = useState([]);
  const [filteredExpenditures, setFilteredExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [requestFilter, setRequestFilter] = useState('all'); // 'all', 'active', 'completed'
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'doctor'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  
  // Summary stats
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalRequests: 0,
    averageSpending: 0,
    thisMonth: 0,
    lastMonth: 0
  });

  // Authentication check
  useEffect(() => {
    // Don't redirect if we're still loading auth state
    if (authLoading) {
      return;
    }
    
    // Only redirect if we're sure the user is not authenticated or not a business
    if (!isAuthenticated || user?.role !== 'business') {
      console.log('🔐 Auth check failed:', { isAuthenticated, userRole: user?.role, authLoading });
      router.push('/business/login');
      return;
    }
  }, [isAuthenticated, authLoading, user, router]);

  // Fetch business data and expenditures
  useEffect(() => {
    // Only fetch if we have a valid authenticated business user
    if (!authLoading && isAuthenticated && user?.role === 'business' && user?.id) {
      console.log('✅ Fetching data for authenticated business:', user.id);
      fetchBusinessData();
      fetchExpenditures();
    }
  }, [isAuthenticated, authLoading, user]);

  // Handle URL parameters for filtering
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['active', 'completed'].includes(filterParam)) {
      setRequestFilter(filterParam);
    }
  }, [searchParams]);

  const fetchBusinessData = async () => {
    try {
      console.log('🔍 Fetching business profile...');
      const response = await businessAPI.getProfile();
      console.log('✅ Business profile response:', response.data);
      console.log('📍 Business address fields:', {
        address: response.data?.address,
        city: response.data?.city,
        state: response.data?.state,
        zipCode: response.data?.zipCode
      });
      setBusinessData(response.data);
    } catch (error) {
      console.error('❌ Error fetching business data:', error);
      
      // If we get an authentication error, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔐 Authentication failed, redirecting to login');
        localStorage.clear(); // Clear potentially invalid tokens
        router.push('/business/login');
      }
    }
  };

  const fetchExpenditures = async () => {
    try {
      setLoading(true);
      
      // Ensure we have user ID before proceeding
      if (!user?.id) {
        console.error('❌ No user ID available for expenditure fetch');
        return;
      }

      console.log('🔍 Fetching expenditure data for business:', user.id);
      
      // Fetch all service requests (both completed and active for filtering)
      const response = await serviceRequestAPI.getBusinessRequests(user.id);
      console.log('📊 Raw expenditure response:', response.data);

      let allRequests = [];
      if (Array.isArray(response.data)) {
        allRequests = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        allRequests = response.data.data;
      }

      // Transform all requests into expenditure format
      const expenditureData = allRequests.map(request => {
        const serviceCharge = 3.00; // Standard service charge
        const doctorFee = Math.max(0, (request.totalAmount || 0) - serviceCharge);
        
        return {
          id: request.id,
          date: request.completedAt || request.updatedAt || request.createdAt,
          amount: request.totalAmount || 0,
          doctorFee: doctorFee,
          serviceCharge: serviceCharge,
          serviceType: request.serviceType || 'Medical Service',
          description: request.description || '',
          duration: request.estimatedDuration || 0,
          status: request.status,
          doctor: {
            id: request.doctor?.id,
            name: `${request.doctor?.firstName || ''} ${request.doctor?.lastName || ''}`.trim() || 'Unknown Doctor',
            specialization: request.doctor?.specialization || 'Medical Professional'
          },
          business: {
            id: request.business?.id,
            name: request.business?.businessName || request.business?.name || 'Unknown Business'
          },
          requestId: request.id,
          paymentStatus: request.status === 'completed' ? 'completed' : 'pending'
        };
      });

      console.log('📈 Processed expenditure data:', expenditureData);
      
      setExpenditures(expenditureData);
      setFilteredExpenditures(expenditureData);
      
      // Calculate summary statistics
      calculateStats(expenditureData);
      
    } catch (error) {
      console.error('❌ Error fetching expenditures:', error);
      
      // If we get an authentication error, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔐 Authentication failed, redirecting to login');
        localStorage.clear();
        router.push('/business/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (expenditureData) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Calculate stats based on completed requests only for spending calculations
    const completedRequests = expenditureData.filter(exp => exp.status === 'completed' && exp.amount > 0);
    
    const totalSpent = completedRequests.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalRequests = completedRequests.length;
    const averageSpending = totalRequests > 0 ? totalSpent / totalRequests : 0;

    const thisMonth = completedRequests
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const lastMonthTotal = completedRequests
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear;
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    setStats({
      totalSpent,
      totalRequests,
      averageSpending,
      thisMonth,
      lastMonth: lastMonthTotal
    });
  };

  // Filter and sort expenditures
  useEffect(() => {
    let filtered = [...expenditures];

    // Status filtering based on requestFilter
    if (requestFilter === 'completed') {
      filtered = filtered.filter(exp => exp.status === 'completed' && exp.amount > 0);
    } else if (requestFilter === 'active') {
      filtered = filtered.filter(exp => exp.status !== 'completed');
    }

    // Date filtering
    if (dateFrom) {
      filtered = filtered.filter(exp => new Date(exp.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(exp => new Date(exp.date) <= new Date(dateTo));
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date) - new Date(b.date);
          break;
        case 'amount':
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
        case 'doctor':
          comparison = (a.doctor?.name || '').localeCompare(b.doctor?.name || '');
          break;
        default:
          comparison = new Date(a.date) - new Date(b.date);
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredExpenditures(filtered);
    calculateStats(filtered);
  }, [expenditures, dateFrom, dateTo, sortBy, sortOrder, requestFilter]);

  const exportToCSV = () => {
    const headers = ['Date', 'Service Type', 'Doctor', 'Duration (hrs)', 'Doctor Fee', 'Service Charge', 'Total Amount', 'Description'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenditures.map(exp => [
        formatDate(exp.date),
        exp.serviceType || '',
        exp.doctor?.name || '',
        exp.duration || 0,
        exp.doctorFee?.toFixed(2) || '0.00',
        exp.serviceCharge?.toFixed(2) || '0.00',
        exp.amount?.toFixed(2) || '0.00',
        `"${(exp.description || '').replace(/"/g, '""')}"` // Escape quotes
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `business-expenditure-${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
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
                onClick={() => router.back()}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="p-2.5 rounded-lg shadow-lg">
                <img src="/logo.png" alt="ThanksDoc Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {requestFilter === 'active' ? 'Active Requests' : 
                   requestFilter === 'completed' ? 'Completed Expenditures' : 
                   'Business Expenditure'}
                </h1>
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  <p className="font-medium">
                    {businessData?.businessName || user?.businessName || 'Business Account'}
                  </p>
                  {/* Debug: Show what data we have */}
                  {console.log('🏢 Business data in render:', businessData)}
                  {businessData?.address && (
                    <p className="text-sm">
                      📍 {businessData.address}
                    </p>
                  )}
                  {businessData && (businessData.city || businessData.state || businessData.zipCode) && (
                    <p className="text-sm">
                      🌍 {[
                        businessData.city,
                        businessData.state,
                        businessData.zipCode
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {requestFilter !== 'all' && (
                    <button
                      onClick={() => setRequestFilter('all')}
                      className={`mt-1 text-xs px-2 py-1 rounded border transition-colors ${
                        isDarkMode 
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                          : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Show All
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={exportToCSV}
                className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-lg shadow border ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{color: '#0F9297'}}>Total Spent</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(stats.totalSpent)}</p>
              </div>
              <div className={`p-3 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                <TrendingDown className={`h-6 w-6`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow border ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400 font-medium">Total Requests</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{stats.totalRequests}</p>
              </div>
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-blue-900/30' : 'bg-blue-600'
              }`}>
                <FileText className={`h-6 w-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-white'
                }`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow border ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400 font-medium">Average Spending</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(stats.averageSpending)}</p>
              </div>
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-green-900/30' : 'bg-green-600'
              }`}>
                <DollarSign className={`h-6 w-6 ${
                  isDarkMode ? 'text-green-400' : 'text-white'
                }`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow border ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-400 font-medium">This Month</p>
                <p className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(stats.thisMonth)}</p>
                <p className={`text-xs mt-1 ${
                  stats.thisMonth >= stats.lastMonth 
                    ? 'text-red-400' 
                    : 'text-green-400'
                }`}>
                  {stats.thisMonth >= stats.lastMonth ? '↑' : '↓'} vs last month
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-purple-900/30' : 'bg-purple-600'
              }`}>
                <Calendar className={`h-6 w-6 ${
                  isDarkMode ? 'text-purple-400' : 'text-white'
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
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSortBy('date');
                setSortOrder('desc');
              }}
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
                <option value="doctor">Doctor</option>
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
            
            {/* Reset Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setSortBy('date');
                  setSortOrder('desc');
                }}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Expenditure History */}
        <div className={`rounded-lg shadow border ${
          isDarkMode 
            ? 'bg-gray-900 border-gray-800' 
            : 'bg-white border-gray-200'
        }`}>
          <div className={`p-6 border-b ${
            isDarkMode ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                <Building2 className={`h-5 w-5`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
              </div>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {requestFilter === 'active' ? 'Active Requests' : 
                 requestFilter === 'completed' ? 'Completed Expenditures' : 
                 'Expenditure History'}
              </h2>
            </div>
          </div>

          <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading expenditure data...</p>
              </div>
            ) : filteredExpenditures.length === 0 ? (
              <div className="p-8 text-center">
                <DollarSign className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {requestFilter === 'active' ? 'No active requests found' :
                   requestFilter === 'completed' ? 'No completed expenditures found' :
                   'No expenditures found'}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {expenditures.length === 0 
                    ? "You haven't made any service requests yet." 
                    : requestFilter === 'active'
                    ? "No active requests match your current filters."
                    : requestFilter === 'completed'
                    ? "No completed expenditures match your current filters."
                    : "No expenditures match your current filters."
                  }
                </p>
              </div>
            ) : (
              filteredExpenditures.map((expenditure) => (
                <div key={expenditure.id} className={`p-6 hover:bg-opacity-50 transition-colors ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center space-x-1 text-sm mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(expenditure.date)}
                        </span>
                      </div>
                      
                      <h3 className={`font-bold text-lg mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Dr. {expenditure.doctor.name}
                      </h3>
                      
                      <p className={`text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {expenditure.doctor.specialization}
                      </p>
                      
                      <p className={`text-sm mb-3 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {expenditure.serviceType}
                      </p>
                      
                      {expenditure.description && (
                        <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {expenditure.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                          isDarkMode 
                            ? 'text-gray-400 bg-gray-700/50' 
                            : 'text-gray-600 bg-gray-100'
                        }`}>
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{expenditure.duration}h</span>
                        </div>
                        
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          expenditure.status === 'completed'
                            ? isDarkMode 
                              ? 'bg-green-900/30 text-green-400' 
                              : 'bg-green-100 text-green-800'
                            : expenditure.status === 'pending'
                            ? isDarkMode 
                              ? 'bg-yellow-900/30 text-yellow-400' 
                              : 'bg-yellow-100 text-yellow-800'
                            : isDarkMode 
                              ? 'bg-blue-900/30 text-blue-400' 
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {expenditure.status === 'completed' && <Check className="h-3 w-3 inline mr-1" />}
                          {expenditure.status === 'completed' ? 'Completed' : 
                           expenditure.status === 'pending' ? 'Pending' :
                           expenditure.status === 'in-progress' ? 'In Progress' : 
                           'Active'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className={`text-2xl font-bold`} style={{color: '#0F9297'}}>
                        {expenditure.status === 'completed' && expenditure.amount > 0 
                          ? formatCurrency(expenditure.amount)
                          : expenditure.status !== 'completed' 
                          ? 'Pending Payment'
                          : 'No Charge'
                        }
                      </div>
                      {expenditure.status === 'completed' && expenditure.amount > 0 && (
                        <div className={`text-xs space-y-1 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <div>Doctor Fee: {formatCurrency(expenditure.doctorFee)}</div>
                          <div>Service Charge: {formatCurrency(expenditure.serviceCharge)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
