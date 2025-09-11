'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Lock, Check, AlertTriangle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { formatCurrency } from '../lib/utils';

// Load Stripe once and cache it
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Card Element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '"Inter", system-ui, sans-serif',
      '::placeholder': {
        color: '#9CA3AF',
      },
      backgroundColor: 'transparent',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
  hidePostalCode: true,
};

// Payment Form Component that uses Stripe Elements
function SubscriptionCheckoutForm({ 
  doctorData, 
  subscriptionAmount, 
  onPaymentSuccess, 
  onCancel, 
  isDarkMode 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [saveCard, setSaveCard] = useState(true); // Default to saving card for subscriptions

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setPaymentError(null);

    const card = elements.getElement(CardElement);

    try {
      // 1. Create payment intent for subscription (like the existing payment flow)
      console.log('Creating subscription payment intent for doctor:', doctorData.id);
      const paymentIntentResponse = await fetch('/api/doctor-subscriptions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          doctorId: doctorData.id,
          amount: subscriptionAmount,
          savePaymentMethod: saveCard,
        }),
      });

      const paymentIntentData = await paymentIntentResponse.json();

      if (!paymentIntentResponse.ok) {
        throw new Error(paymentIntentData.error || 'Failed to create payment intent');
      }

      console.log('Payment intent created:', paymentIntentData);

      // 2. Confirm payment with card details (same as existing payment form)
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentData.clientSecret,
        {
          payment_method: {
            card: card,
            billing_details: {
              name: `Dr. ${doctorData.firstName} ${doctorData.lastName}`,
              email: doctorData.email,
            },
          },
          setup_future_usage: saveCard ? 'off_session' : undefined,
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      console.log('Payment confirmed:', paymentIntent);

      // 3. Create subscription record after successful payment
      const subscriptionResponse = await fetch('/api/doctor-subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          doctorId: doctorData.id,
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method,
          amount: subscriptionAmount,
          savePaymentMethod: saveCard,
        }),
      });

      const subscriptionData = await subscriptionResponse.json();

      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error || 'Failed to create subscription');
      }

      console.log('Subscription created:', subscriptionData);

      // Confirm payment if needed
      if (subscriptionData.requiresPaymentConfirmation) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          subscriptionData.clientSecret,
          {
            payment_method: {
              card: card,
              billing_details: {
                name: `Dr. ${doctorData.firstName} ${doctorData.lastName}`,
                email: doctorData.email,
              },
            },
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      // Success!
      onPaymentSuccess(subscriptionData);
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subscription Summary */}
      <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-lg border p-4`}>
        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
          Subscription Summary
        </h4>
        <div className="flex items-center justify-between">
          <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Monthly Subscription
          </span>
          <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatCurrency(subscriptionAmount)}/month
          </span>
        </div>
        <div className="mt-3 text-sm">
          <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Check className="h-4 w-4 text-green-500 mr-2" />
            Recurring billing - cancel anytime
          </div>
          <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            <Check className="h-4 w-4 text-green-500 mr-2" />
            Secure payment processing
          </div>
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-4">
        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Payment Method
        </h4>
        
        <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4`}>
          <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
            Card Information
          </label>
          
          <div className={`p-3 rounded-md border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`}>
            <CardElement
              options={cardElementOptions}
              onChange={(event) => {
                setCardComplete(event.complete);
                if (event.error) {
                  setPaymentError(event.error.message);
                } else {
                  setPaymentError(null);
                }
              }}
            />
          </div>
        </div>

        {/* Save Card Option */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="saveCard"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="saveCard" className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Save this payment method for future payments
          </label>
        </div>
      </div>

      {/* Payment Error */}
      {paymentError && (
        <div className={`${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} rounded-lg border p-4`}>
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
              {paymentError}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
          } disabled:opacity-50`}
        >
          Cancel
        </button>
        
        <button
          type="submit"
          disabled={!stripe || loading || !cardComplete}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Subscribe Now</span>
            </>
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-1">
          <Lock className="h-3 w-3 text-green-400" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-indigo-600 rounded flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">S</span>
          </div>
          <span>Stripe Secure</span>
        </div>
        <div className="flex items-center space-x-1">
          <CreditCard className="h-3 w-3 text-blue-400" />
          <span>PCI Compliant</span>
        </div>
      </div>
    </form>
  );
}

// Main Subscription Payment Form Component
export default function SubscriptionPaymentForm({ 
  doctorData, 
  subscriptionAmount, 
  onPaymentSuccess, 
  onCancel, 
  isDarkMode 
}) {
  return (
    <Elements stripe={stripePromise}>
      <SubscriptionCheckoutForm
        doctorData={doctorData}
        subscriptionAmount={subscriptionAmount}
        onPaymentSuccess={onPaymentSuccess}
        onCancel={onCancel}
        isDarkMode={isDarkMode}
      />
    </Elements>
  );
}
