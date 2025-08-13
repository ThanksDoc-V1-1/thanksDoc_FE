'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CreditCard, Plus, Trash2, Check } from 'lucide-react';

const SavedPaymentMethods = forwardRef(function SavedPaymentMethods({ 
  customerId, 
  onPaymentMethodSelect, 
  selectedPaymentMethodId,
  onAddNewCard 
}, ref) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshPaymentMethods: fetchPaymentMethods,
  }));

  useEffect(() => {
    if (customerId) {
      fetchPaymentMethods();
    }
  }, [customerId]);

  const fetchPaymentMethods = async (retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching payment methods for customer:', customerId, retryCount > 0 ? `(retry ${retryCount})` : '');
      
      // Increase timeout and add retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15 second timeout
      
      const response = await fetch(`/api/payment-methods?customerId=${customerId}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache', // Ensure fresh data
        }
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      console.log('🔍 Payment methods response:', data);
      
      if (response.ok) {
        setPaymentMethods(data.paymentMethods || []);
        console.log('✅ Payment methods loaded:', data.paymentMethods?.length || 0);
      } else {
        console.error('Failed to fetch payment methods:', data.error);
        setPaymentMethods([]); // Clear methods on error
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Payment methods request timed out');
        
        // Retry logic for timeout errors
        if (retryCount < maxRetries) {
          console.log(`⏳ Retrying payment methods fetch (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            fetchPaymentMethods(retryCount + 1);
          }, 1000); // Wait 1 second before retry
          return; // Don't set loading to false yet
        }
        
        setPaymentMethods([]);
        // Show user-friendly message for persistent timeouts
        console.log('💡 Consider using "Add New Card" if saved methods don\'t load');
      } else {
        console.error('Error fetching payment methods:', error);
        setPaymentMethods([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setDeletingId(paymentMethodId);
      const response = await fetch(`/api/payment-methods?paymentMethodId=${paymentMethodId}&customerId=${customerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
        if (selectedPaymentMethodId === paymentMethodId) {
          onPaymentMethodSelect(null);
        }
      } else {
        const data = await response.json();
        alert(`Failed to remove payment method: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      alert('Failed to remove payment method');
    } finally {
      setDeletingId(null);
    }
  };

  const getCardIcon = (brand) => {
    const icons = {
      visa: '💳',
      mastercard: '💳', 
      amex: '💳',
      discover: '💳',
    };
    return icons[brand] || '💳';
  };

  const formatCardBrand = (brand) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-600 rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-gray-600 rounded w-20 animate-pulse"></div>
        </div>
        
        {/* Enhanced loading skeleton */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 border-2 border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-6 bg-gray-600 rounded animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-600 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-600 rounded w-20 animate-pulse"></div>
                  </div>
                </div>
                <div className="w-4 h-4 bg-gray-600 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-400 text-sm">Loading saved cards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Payment Methods</h3>
        <button
          onClick={onAddNewCard}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add New Card</span>
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No saved payment methods</p>
          <button
            onClick={onAddNewCard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`bg-gray-800 rounded-lg p-4 border-2 cursor-pointer transition-all ${
                selectedPaymentMethodId === method.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => onPaymentMethodSelect(method.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-6 bg-gray-700 rounded text-sm">
                    {getCardIcon(method.card.brand)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">
                        {formatCardBrand(method.card.brand)} •••• {method.card.last4}
                      </span>
                      {selectedPaymentMethodId === method.id && (
                        <Check className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      Expires {method.card.exp_month.toString().padStart(2, '0')}/{method.card.exp_year}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePaymentMethod(method.id);
                  }}
                  disabled={deletingId === method.id}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1"
                >
                  {deletingId === method.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default SavedPaymentMethods;
