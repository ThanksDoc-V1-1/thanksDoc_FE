'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Eye, DollarSign, Users, CreditCard, TrendingUp, Filter, Search } from 'lucide-react';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [doctorEarnings, setDoctorEarnings] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paidPayments, setPaidPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'earnings', 'pending', or 'paid'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchTransactionHistory();
  }, [selectedDoctor]); // Fetch when doctor changes or on initial mount

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

      ('🔍 Fetching from backend:', `${API_URL}/service-requests${query}`);

      const response = await fetch(`${API_URL}/service-requests${query}`);
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      
        // Transform the data
        const transactions = (data.data || []).map(item => {
          // Parse payment details to get actual service price and booking fee
          let servicePrice = 0;
          let bookingFee = 0;
          let actualTotalAmount = item.totalAmount || 0;
          
          if (item.paymentDetails) {
            try {
              const paymentDetails = JSON.parse(item.paymentDetails);
              servicePrice = parseFloat(paymentDetails.servicePrice) || 0;
              bookingFee = parseFloat(paymentDetails.serviceCharge) || 0;
              actualTotalAmount = parseFloat(paymentDetails.totalAmount) || actualTotalAmount;
              
              ('💰 Parsed payment details for transaction', item.id, ':', {
                servicePrice,
                bookingFee,
                totalAmount: actualTotalAmount,
                paymentDetails: paymentDetails
              });
            } catch (error) {
              console.warn('⚠️ Failed to parse paymentDetails for transaction', item.id, ':', error);
              // Fallback to legacy calculation if paymentDetails parsing fails
              servicePrice = item.doctor?.hourlyRate || 12;
              bookingFee = 3; // Old fixed booking fee
              actualTotalAmount = servicePrice + bookingFee;
            }
          } else {
            // Fallback for older records without paymentDetails
            ('📝 No paymentDetails found for transaction', item.id, ', using fallback calculation');
            servicePrice = item.doctor?.hourlyRate || 12;
            bookingFee = 3; // Old fixed booking fee  
            actualTotalAmount = servicePrice + bookingFee;
          }
          
          ('🔍 Raw transaction data for ID', item.id, ':', {
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
          totalAmount: actualTotalAmount,
          doctorFee: servicePrice, // Now shows the actual service price paid for the service
          serviceCharge: bookingFee, // Now shows the actual dynamic booking fee
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
      }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending (latest first)

      // Create individual doctor payment records (no grouping)
      // Show all transactions with their payment status
      const doctorPayments = transactions
        .map(transaction => ({
          id: transaction.id,
          doctorId: transaction.doctorId,
          doctorName: transaction.doctorName,
          serviceType: transaction.serviceType,
          businessName: transaction.businessName,
          amount: transaction.doctorFee,
          totalAmount: transaction.totalAmount,
          date: transaction.date,
          paymentStatus: transaction.paymentStatus,
          doctorPaidAt: transaction.doctorPaidAt,
          stripePaymentId: transaction.stripePaymentId,
          isPaid: transaction.paymentStatus === 'doctor_paid'
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending (latest first)

      ('🔍 Individual doctor payments:', doctorPayments.length);
      ('🔍 Doctor payments data:', doctorPayments.map(p => ({
        id: p.id,
        doctorName: p.doctorName,
        amount: p.amount,
        paymentStatus: p.paymentStatus
      })));

      // Create aggregated pending payments by doctor
      const pendingPaymentsMap = {};
      doctorPayments
        .filter(payment => !payment.isPaid)
        .forEach(payment => {
          if (!pendingPaymentsMap[payment.doctorId]) {
            pendingPaymentsMap[payment.doctorId] = {
              doctorId: payment.doctorId,
              doctorName: payment.doctorName,
              totalPending: 0,
              transactionCount: 0,
              transactions: []
            };
          }
          pendingPaymentsMap[payment.doctorId].totalPending += payment.amount;
          pendingPaymentsMap[payment.doctorId].transactionCount += 1;
          pendingPaymentsMap[payment.doctorId].transactions.push(payment);
        });

      const pendingPayments = Object.values(pendingPaymentsMap)
        .sort((a, b) => {
          // Sort by the latest transaction date for each doctor (descending)
          const aLatestDate = Math.max(...a.transactions.map(t => new Date(t.date).getTime()));
          const bLatestDate = Math.max(...b.transactions.map(t => new Date(t.date).getTime()));
          return bLatestDate - aLatestDate;
        });

      // Create aggregated paid payments by doctor
      const paidPaymentsMap = {};
      doctorPayments
        .filter(payment => payment.isPaid)
        .forEach(payment => {
          if (!paidPaymentsMap[payment.doctorId]) {
            paidPaymentsMap[payment.doctorId] = {
              doctorId: payment.doctorId,
              doctorName: payment.doctorName,
              totalPaid: 0,
              transactionCount: 0,
              lastPaymentDate: null,
              transactions: []
            };
          }
          paidPaymentsMap[payment.doctorId].totalPaid += payment.amount;
          paidPaymentsMap[payment.doctorId].transactionCount += 1;
          paidPaymentsMap[payment.doctorId].transactions.push(payment);
          
          // Track the most recent payment date
          if (payment.doctorPaidAt) {
            const paymentDate = new Date(payment.doctorPaidAt);
            if (!paidPaymentsMap[payment.doctorId].lastPaymentDate || 
                paymentDate > new Date(paidPaymentsMap[payment.doctorId].lastPaymentDate)) {
              paidPaymentsMap[payment.doctorId].lastPaymentDate = payment.doctorPaidAt;
            }
          }
        });

      const paidPayments = Object.values(paidPaymentsMap)
        .sort((a, b) => {
          // Sort by the latest payment date (descending)
          const aLatestDate = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
          const bLatestDate = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
          return bLatestDate - aLatestDate;
        });

      setTransactions(transactions);
      setSummary({
        totalTransactions: transactions.length,
        totalRevenue: transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
        totalDoctorEarnings: transactions.reduce((sum, t) => sum + (t.doctorFee || 0), 0),
        totalServiceCharges: transactions.reduce((sum, t) => sum + (t.serviceCharge || 0), 0),
      });
      setDoctorEarnings(doctorPayments);
      
      // Store aggregated data in state (we'll use a different state variable)
      setPendingPayments(pendingPayments);
      setPaidPayments(paidPayments);
      
      ('✅ Loaded transactions:', transactions.length);
      ('✅ Loaded doctor payments:', doctorPayments.length);
      ('✅ Loaded pending payments:', pendingPayments.length);
      ('✅ Loaded paid payments:', paidPayments.length);
      
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setTransactions([]);
      setDoctorEarnings([]);
      setPendingPayments([]);
      setPaidPayments([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  const markDoctorAsPaid = async (transactionId) => {
    try {
      ('🔵 Marking transaction as paid:', transactionId);
      
      const response = await fetch('/api/doctor-earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: parseInt(transactionId),
          action: 'mark_paid'
        })
      });

      ('🔵 Response status:', response.status);
      const responseData = await response.json();
      ('🔵 Response data:', responseData);

      if (response.ok) {
        // Update the specific transaction's status in the local state
        setDoctorEarnings(prevEarnings => 
          prevEarnings.map(payment => 
            payment.id === transactionId 
              ? { 
                  ...payment, 
                  isPaid: true, 
                  paymentStatus: 'doctor_paid',
                  doctorPaidAt: new Date().toISOString()
                }
              : payment
          )
        );
        
        alert('Payment marked as paid successfully!');
        
        // Refresh data from server to ensure consistency
        setTimeout(() => {
          ('🔵 Refreshing data...');
          fetchTransactionHistory();
        }, 1000);
      } else {
        alert(`Failed to mark payment as paid: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Failed to mark payment as paid');
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

  const filteredDoctorEarnings = doctorEarnings.filter(payment =>
    String(payment.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(payment.doctorId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingPayments = pendingPayments.filter(doctor =>
    String(doctor.doctorId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPaidPayments = paidPayments.filter(doctor =>
    String(doctor.doctorId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination helper function
  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDoctor, dateRange]);

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
                onKeyDown={(e) => e.key === 'Enter' && fetchTransactionHistory()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && fetchTransactionHistory()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchTransactionHistory}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Filter className="h-4 w-4 mr-2 inline" />
                {loading ? 'Applying...' : 'Apply Filters'}
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
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Total Pending Payments ({filteredPendingPayments.length})
              </button>
              <button
                onClick={() => setActiveTab('paid')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'paid'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Total Paid ({filteredPaidPayments.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'transactions' ? (
          <>
            <TransactionTable 
              transactions={getPaginatedData(filteredTransactions)} 
              formatCurrency={formatCurrency} 
              formatDate={formatDate} 
            />
            <PaginationControls 
              currentPage={currentPage}
              totalItems={filteredTransactions.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        ) : activeTab === 'earnings' ? (
          <DoctorPaymentsTable 
            doctorPayments={filteredDoctorEarnings} 
            formatCurrency={formatCurrency} 
            formatDate={formatDate}
            onMarkAsPaid={markDoctorAsPaid}
          />
        ) : activeTab === 'pending' ? (
          <PendingPaymentsTable 
            pendingPayments={filteredPendingPayments} 
            formatCurrency={formatCurrency} 
            formatDate={formatDate}
          />
        ) : (
          <PaidPaymentsTable 
            paidPayments={filteredPaidPayments} 
            formatCurrency={formatCurrency} 
            formatDate={formatDate}
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
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Service Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Booking Fee
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {transaction.businessName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                  {formatCurrency(transaction.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 font-semibold">
                  {formatCurrency(transaction.doctorFee)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-400 font-semibold">
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

// Doctor Payments Table Component (Individual Transactions)
function DoctorPaymentsTable({ doctorPayments, formatCurrency, formatDate, onMarkAsPaid }) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Transaction ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Doctor Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Service Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Doctor Earning
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Date
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
            {doctorPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                  #{payment.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                  {payment.doctorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {payment.serviceType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {payment.businessName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-bold">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                  {formatCurrency(payment.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {formatDate(payment.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    payment.isPaid 
                      ? 'bg-green-900 text-green-300'
                      : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {payment.isPaid ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!payment.isPaid ? (
                    <button
                      onClick={() => onMarkAsPaid(payment.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Mark as Paid
                    </button>
                  ) : (
                    <span className="text-green-400 text-xs font-medium">
                      Paid on {payment.doctorPaidAt ? formatDate(payment.doctorPaidAt) : 'Recently'}
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

// Pending Payments Table Component (Aggregated by Doctor)
function PendingPaymentsTable({ pendingPayments, formatCurrency, formatDate }) {
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
                Total Pending Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Number of Transactions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {pendingPayments.map((doctor) => (
              <tr key={doctor.doctorId} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                  {doctor.doctorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400 font-bold">
                  {formatCurrency(doctor.totalPending)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {doctor.transactionCount} payments
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900 text-yellow-300">
                    Pending
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Paid Payments Table Component (Aggregated by Doctor)
function PaidPaymentsTable({ paidPayments, formatCurrency, formatDate }) {
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
                Total Paid Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Number of Transactions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Last Payment Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {paidPayments.map((doctor) => (
              <tr key={doctor.doctorId} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                  {doctor.doctorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-bold">
                  {formatCurrency(doctor.totalPaid)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {doctor.transactionCount} payments
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {doctor.lastPaymentDate ? formatDate(doctor.lastPaymentDate) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-300">
                    Paid
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pagination Controls Component
function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="bg-gray-900 px-6 py-4 border-t border-gray-800 flex items-center justify-between">
      <div className="text-sm text-gray-400">
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={index} className="px-3 py-2 text-sm text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={index}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {page}
            </button>
          )
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
