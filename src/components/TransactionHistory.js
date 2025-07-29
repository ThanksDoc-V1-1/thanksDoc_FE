'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Eye, DollarSign, Users, CreditCard, TrendingUp, Filter, Search } from 'lucide-react';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [doctorEarnings, setDoctorEarnings] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' or 'earnings'

  useEffect(() => {
    fetchTransactionHistory();
  }, [selectedDoctor, dateRange]);

  const fetchTransactionHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDoctor) params.append('doctorId', selectedDoctor);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      // Call backend directly
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      // Build query for paid transactions
      let query = '?populate=business,doctor&filters[isPaid][$eq]=true';
      if (selectedDoctor) query += `&filters[doctor][id][$eq]=${selectedDoctor}`;
      if (dateRange.startDate) query += `&filters[paidAt][$gte]=${dateRange.startDate}`;
      if (dateRange.endDate) query += `&filters[paidAt][$lte]=${dateRange.endDate}`;

      console.log('🔍 Fetching from backend:', `${API_URL}/service-requests${query}`);

      const response = await fetch(`${API_URL}/service-requests${query}`);
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      
        // Transform the data
        const transactions = (data.data || []).map(item => {
          // The backend returns flattened data, not wrapped in attributes
          // Fee structure: Doctor gets their hourly rate, Service charge is £3
          const doctorFee = item.doctor?.hourlyRate || 12; // Use actual hourly rate
          const serviceCharge = 3;
          const totalAmount = doctorFee + serviceCharge;
          
          console.log('🔍 Raw transaction data for ID', item.id, ':', {
            paymentStatus: item.paymentStatus,
            doctorPaidAt: item.doctorPaidAt,
            isPaid: item.isPaid
          });
          
          return {
          id: item.id,
          paymentId: item.paymentIntentId || `payment_${item.id}`,
          stripePaymentId: item.paymentIntentId || 'N/A', // Show actual Stripe payment ID
          serviceType: item.serviceType,
          doctorId: item.doctor?.id,
          doctorName: item.doctor?.firstName && item.doctor?.lastName
            ? `${item.doctor.firstName} ${item.doctor.lastName}`
            : item.doctor?.name || 'Unknown Doctor',
          totalAmount: totalAmount,
          doctorFee: doctorFee,
          serviceCharge: serviceCharge,
          date: item.paidAt || item.createdAt,
          status: item.isPaid ? 'Paid' : 'Pending',
          currency: item.currency || 'GBP',
          paymentMethod: item.paymentMethod || 'card',
          businessName: item.business?.name || 
                       item.business?.businessName || 
                       item.business?.companyName || 
                       'Unknown Business',
          chargeId: item.chargeId,
          paymentIntentId: item.paymentIntentId,
          // Include the paymentStatus and doctorPaidAt from backend
          paymentStatus: item.paymentStatus,
          doctorPaidAt: item.doctorPaidAt,
        };
      });

      // Group by doctor for earnings and check payment status
      const doctorEarningsMap = {};
      transactions.forEach(transaction => {
        if (!doctorEarningsMap[transaction.doctorId]) {
          doctorEarningsMap[transaction.doctorId] = {
            doctorId: transaction.doctorId,
            doctorName: transaction.doctorName,
            totalEarnings: 0,
            totalTransactions: 0,
            transactions: [],
            isPaid: false,
            paymentDate: null
          };
        }
        
        doctorEarningsMap[transaction.doctorId].totalEarnings += transaction.doctorFee;
        doctorEarningsMap[transaction.doctorId].totalTransactions += 1;
        doctorEarningsMap[transaction.doctorId].transactions.push(transaction);
      });

      // Check payment status for each doctor after all transactions are grouped
      Object.keys(doctorEarningsMap).forEach(doctorId => {
        const doctor = doctorEarningsMap[doctorId];
        
        console.log('🔍 Checking payment status for doctor:', doctor.doctorName);
        console.log('🔍 Doctor transactions:', doctor.transactions.map(t => ({
          id: t.id,
          paymentStatus: t.paymentStatus,
          doctorPaidAt: t.doctorPaidAt
        })));
        
        // Check if any transaction for this doctor has paymentStatus 'doctor_paid'
        const hasAnyPaidTransaction = doctor.transactions.some(t => t.paymentStatus === 'doctor_paid');
        
        console.log('🔍 Has any paid transaction:', hasAnyPaidTransaction);
        
        if (hasAnyPaidTransaction) {
          doctor.isPaid = true;
          // Use the latest doctorPaidAt date
          const paidTransactions = doctor.transactions.filter(t => t.doctorPaidAt);
          if (paidTransactions.length > 0) {
            const latestPaymentDate = Math.max(
              ...paidTransactions.map(t => new Date(t.doctorPaidAt).getTime())
            );
            doctor.paymentDate = new Date(latestPaymentDate).toISOString();
          } else {
            doctor.paymentDate = new Date().toISOString(); // Fallback to current date
          }
        }
        
        console.log('🔍 Final doctor status:', {
          doctorId: doctor.doctorId,
          doctorName: doctor.doctorName,
          isPaid: doctor.isPaid,
          paymentDate: doctor.paymentDate
        });
      });

      const doctorEarnings = Object.values(doctorEarningsMap);

      setTransactions(transactions);
      setSummary({
        totalTransactions: transactions.length,
        totalRevenue: transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
        totalDoctorEarnings: transactions.reduce((sum, t) => sum + (t.doctorFee || 0), 0),
        totalServiceCharges: transactions.reduce((sum, t) => sum + (t.serviceCharge || 0), 0),
      });
      setDoctorEarnings(doctorEarnings);
      
      console.log('✅ Loaded transactions:', transactions.length);
      console.log('✅ Loaded doctor earnings:', doctorEarnings.length);
      console.log('✅ Doctor earnings data:', doctorEarnings.map(d => ({
        id: d.doctorId, 
        name: d.doctorName, 
        isPaid: d.isPaid, 
        paymentDate: d.paymentDate
      })));
      
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setTransactions([]);
      setDoctorEarnings([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  const markDoctorAsPaid = async (doctorId) => {
    try {
      console.log('🔵 Marking doctor as paid:', doctorId);
      
      const response = await fetch('/api/doctor-earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId: parseInt(doctorId),
          action: 'mark_paid'
        })
      });

      console.log('🔵 Response status:', response.status);
      const responseData = await response.json();
      console.log('🔵 Response data:', responseData);

      if (response.ok) {
        // Update the local state immediately for better UX
        const currentDate = new Date().toISOString();
        setDoctorEarnings(prevEarnings => 
          prevEarnings.map(doctor => 
            doctor.doctorId === doctorId 
              ? { ...doctor, isPaid: true, paymentDate: currentDate }
              : doctor
          )
        );
        
        alert('Doctor marked as paid successfully!');
        
        // Refresh data from server to ensure consistency
        setTimeout(() => {
          console.log('🔵 Refreshing data...');
          fetchTransactionHistory();
        }, 1000);
      } else {
        alert(`Failed to mark doctor as paid: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error marking doctor as paid:', error);
      alert('Failed to mark doctor as paid');
    }
  };

  const formatCurrency = (amount) => `£${amount.toFixed(2)}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

  const filteredTransactions = transactions.filter(transaction =>
    String(transaction.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.stripePaymentId && transaction.stripePaymentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDoctorEarnings = doctorEarnings.filter(doctor =>
    String(doctor.doctorId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
          <p className="text-gray-400">Monitor payments, doctor earnings, and manage payouts</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{summary.totalTransactions || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalRevenue || 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Doctor Earnings</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalDoctorEarnings || 0)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Service Charges</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalServiceCharges || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchTransactionHistory}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Filter className="h-4 w-4 mr-2 inline" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-800">
            <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                All Transactions ({filteredTransactions.length})
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'earnings'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Doctor Payments ({filteredDoctorEarnings.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'transactions' ? (
          <TransactionTable transactions={filteredTransactions} formatCurrency={formatCurrency} formatDate={formatDate} />
        ) : (
          <DoctorEarningsTable 
            doctorEarnings={filteredDoctorEarnings} 
            formatCurrency={formatCurrency} 
            formatDate={formatDate}
            onMarkAsPaid={markDoctorAsPaid}
          />
        )}
      </div>
    </div>
  );
}

// Transaction Table Component
function TransactionTable({ transactions, formatCurrency, formatDate }) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Stripe Payment ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Service Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Doctor Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Doctor Fee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Service Charge
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                  {transaction.stripePaymentId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {transaction.serviceType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {transaction.doctorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                  {formatCurrency(transaction.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-semibold">
                  {formatCurrency(transaction.doctorFee)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-400">
                  {formatCurrency(transaction.serviceCharge)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {formatDate(transaction.date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Doctor Earnings Table Component
function DoctorEarningsTable({ doctorEarnings, formatCurrency, formatDate, onMarkAsPaid }) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Doctor Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Total Earnings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Doctor Payments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {doctorEarnings.map((doctor) => (
              <tr key={doctor.doctorId} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                  {doctor.doctorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-bold">
                  {formatCurrency(doctor.totalEarnings)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {doctor.totalTransactions} payments
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    doctor.isPaid 
                      ? 'bg-green-900 text-green-300'
                      : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {doctor.isPaid ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!doctor.isPaid ? (
                    <button
                      onClick={() => onMarkAsPaid(doctor.doctorId)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Mark as Paid
                    </button>
                  ) : (
                    <span className="text-green-400 text-xs font-medium">
                      Paid on {doctor.paymentDate ? formatDate(doctor.paymentDate) : 'Recently'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
