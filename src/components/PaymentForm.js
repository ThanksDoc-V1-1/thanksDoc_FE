'use client';

import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';

// Mock Stripe integration for demo purposes
export default function PaymentForm({ serviceRequest, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCardData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, we'll just show success
      alert('Payment processed successfully!');
      onPaymentSuccess?.();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-center mb-6">
        <Lock className="h-6 w-6 text-green-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Secure Payment</h2>
      </div>

      {/* Service Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Service Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Service:</span>
            <span>{serviceRequest.serviceType}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{serviceRequest.estimatedDuration}h</span>
          </div>
          <div className="flex justify-between">
            <span>Doctor:</span>
            <span>Dr. {serviceRequest.doctor?.firstName} {serviceRequest.doctor?.lastName}</span>
          </div>
          <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
            <span>Total:</span>
            <span>${serviceRequest.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cardholder Name
          </label>
          <input
            type="text"
            name="cardholderName"
            value={cardData.cardholderName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Number
          </label>
          <div className="relative">
            <input
              type="text"
              name="cardNumber"
              value={cardData.cardNumber}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1234 5678 9012 3456"
              maxLength="19"
            />
            <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <input
              type="text"
              name="expiryDate"
              value={cardData.expiryDate}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="MM/YY"
              maxLength="5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CVV
            </label>
            <input
              type="text"
              name="cvv"
              value={cardData.cvv}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123"
              maxLength="4"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Pay ${serviceRequest.totalAmount}</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            <Lock className="inline h-3 w-3 mr-1" />
            Your payment information is secure and encrypted
          </p>
        </div>
      </form>
    </div>
  );
}
