'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Payment Form Component that uses Stripe Elements
function CheckoutForm({ serviceRequest, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    createPaymentIntent();
  }, [serviceRequest]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: serviceRequest.totalAmount,
          currency: 'gbp',
          metadata: {
            serviceType: serviceRequest.serviceType,
            doctorId: serviceRequest.doctor?.id || '',
            patientId: serviceRequest.patientId || '',
          },
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setPaymentError(data.error);
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      setPaymentError('Failed to initialize payment. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);
    setPaymentError(null);

    const card = elements.getElement(CardElement);

    if (!card) {
      setPaymentError('Card element not found');
      setLoading(false);
      return;
    }

    try {
      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: `Dr. ${serviceRequest.doctor?.firstName} ${serviceRequest.doctor?.lastName}`,
          },
        },
      });

      if (result.error) {
        console.error('Payment failed:', result.error);
        setPaymentError(result.error.message);
      } else {
        // Payment succeeded
        console.log('Payment succeeded:', result.paymentIntent);
        console.log('Payment ID:', result.paymentIntent.id);
        console.log('Amount:', result.paymentIntent.amount / 100);
        console.log('Status:', result.paymentIntent.status);
        
        // Show success message with proper amount formatting
        const amount = (result.paymentIntent.amount || result.paymentIntent.amount_received || 0) / 100;
        alert(`Payment successful! Payment ID: ${result.paymentIntent.id}\nAmount: £${amount.toFixed(2)}\nStatus: ${result.paymentIntent.status}`);
        
        onPaymentSuccess?.(result.paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800 max-h-[80vh] overflow-y-auto modal-scrollable">
      <div className="flex items-center justify-center mb-6">
        <Lock className="h-6 w-6 text-green-400 mr-2" />
        <h2 className="text-xl font-semibold text-white">Secure Payment</h2>
      </div>

      {/* Service Summary */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-white mb-2">Service Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Service:</span>
            <span className="text-white">{serviceRequest.serviceType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Duration:</span>
            <span className="text-white">{serviceRequest.estimatedDuration}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Doctor:</span>
            <span className="text-white">Dr. {serviceRequest.doctor?.firstName} {serviceRequest.doctor?.lastName}</span>
          </div>
          <div className="flex justify-between font-medium text-white pt-2 border-t border-gray-700">
            <span>Total:</span>
            <span>£{serviceRequest.totalAmount}</span>
          </div>
        </div>
      </div>

      {paymentError && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
          <p className="text-sm">{paymentError}</p>
        </div>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Information
          </label>
          <div className="border border-gray-600 rounded-lg bg-gray-700 p-3">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#ffffff',
                    '::placeholder': {
                      color: '#9ca3af',
                    },
                  },
                  invalid: {
                    color: '#ef4444',
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || !stripe || !clientSecret}
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
                <span>Pay £{serviceRequest.totalAmount}</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400">
            <Lock className="inline h-3 w-3 mr-1" />
            Your payment information is secure and encrypted
          </p>
        </div>
      </form>
    </div>
  );
}

// Main PaymentForm component that wraps CheckoutForm with Stripe Elements
export default function PaymentForm({ serviceRequest, onPaymentSuccess }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm serviceRequest={serviceRequest} onPaymentSuccess={onPaymentSuccess} />
    </Elements>
  );
}
