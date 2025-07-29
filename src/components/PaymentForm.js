'use client';

import { useState, useEffect, useRef } from 'react';
import { CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import SavedPaymentMethods from './SavedPaymentMethods';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Payment Form Component that uses Stripe Elements
function CheckoutForm({ serviceRequest, onPaymentSuccess, businessInfo }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentError, setPaymentError] = useState(null);
  const [paymentIntentCreated, setPaymentIntentCreated] = useState(false);
  
  // Customer and payment method states
  const [customerId, setCustomerId] = useState(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(true);
  
  // Ref to access SavedPaymentMethods component
  const savedPaymentMethodsRef = useRef();

  useEffect(() => {
    // Initialize customer when component mounts
    if (businessInfo && !customerId) {
      initializeCustomer();
    }
  }, [businessInfo, customerId]);

  useEffect(() => {
    // Only create PaymentIntent once we have all necessary info
    if (!paymentIntentCreated && serviceRequest && !clientSecret && customerId) {
      createPaymentIntent();
    }
  }, [serviceRequest, paymentIntentCreated, clientSecret, customerId, selectedPaymentMethodId]);

  const initializeCustomer = async () => {
    try {
      setCustomerLoading(true);
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: businessInfo.email,
          businessId: businessInfo.id,
          businessName: businessInfo.name || businessInfo.businessName,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Customer initialized successfully:', data.customerId);
        setCustomerId(data.customerId);
      } else {
        console.error('Failed to initialize customer:', data.error);
        setPaymentError('Failed to initialize payment system');
      }
    } catch (error) {
      console.error('Error initializing customer:', error);
      setPaymentError('Failed to initialize payment system');
    } finally {
      setCustomerLoading(false);
    }
  };

  const createPaymentIntent = async () => {
    if (paymentIntentCreated) return; // Prevent duplicate creation
    
    try {
      setPaymentIntentCreated(true); // Mark as being created
      
      // Generate a unique idempotency key for this payment
      const idempotencyKey = `pi_${serviceRequest.id}_${Date.now()}`;
      
      const requestBody = {
        amount: serviceRequest.totalAmount,
        currency: 'gbp',
        idempotencyKey: idempotencyKey,
        customerId: customerId,
        savePaymentMethod: savePaymentMethod,
        metadata: {
          serviceRequestId: serviceRequest.id?.toString() || '',
          serviceType: serviceRequest.serviceType,
          doctorId: serviceRequest.doctor?.id?.toString() || '',
          patientId: serviceRequest.patientId?.toString() || '',
        },
      };

      // If using saved payment method, add it to the request
      if (selectedPaymentMethodId) {
        requestBody.paymentMethodId = selectedPaymentMethodId;
      }
      
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (data.error) {
        setPaymentError(data.error);
        setPaymentIntentCreated(false); // Reset on error
        return;
      }

      setClientSecret(data.clientSecret);
      
      // If using saved payment method and payment is already completed, handle success
      if (data.status === 'succeeded') {
        onPaymentSuccess?.({ id: data.paymentIntentId });
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      setPaymentError('Failed to initialize payment. Please try again.');
      setPaymentIntentCreated(false); // Reset on error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If using saved payment method, process directly
    if (selectedPaymentMethodId && !showAddCard) {
      return handleSavedCardPayment();
    }

    // Original card payment flow
    if (!stripe || !elements || !clientSecret || loading) {
      return; // Prevent multiple submissions
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
      const paymentMethodData = {
        card: card,
        billing_details: {
          name: `${businessInfo?.name || businessInfo?.businessName || 'Business'}`,
        },
      };

      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodData,
        setup_future_usage: savePaymentMethod ? 'off_session' : undefined,
      });

      if (result.error) {
        console.error('Payment failed:', result.error);
        setPaymentError(result.error.message);
      } else {
        // Payment succeeded
        console.log('Payment succeeded:', result.paymentIntent);
        
        // Save payment method if requested
        if (savePaymentMethod && result.paymentIntent.payment_method) {
          await savePaymentMethodToCustomer(result.paymentIntent.payment_method);
          // Refresh saved payment methods after saving
          if (savedPaymentMethodsRef.current?.refreshPaymentMethods) {
            savedPaymentMethodsRef.current.refreshPaymentMethods();
          }
        }
        
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

  const handleSavedCardPayment = async () => {
    if (!selectedPaymentMethodId) return;
    
    setLoading(true);
    setPaymentError(null);

    try {
      // For saved payment methods, the payment intent should already be confirmed
      // Just need to verify the payment status
      if (clientSecret) {
        const result = await stripe.retrievePaymentIntent(clientSecret);
        
        if (result.error) {
          setPaymentError(result.error.message);
        } else if (result.paymentIntent.status === 'succeeded') {
          const amount = (result.paymentIntent.amount || 0) / 100;
          alert(`Payment successful! Payment ID: ${result.paymentIntent.id}\nAmount: £${amount.toFixed(2)}\nStatus: ${result.paymentIntent.status}`);
          onPaymentSuccess?.(result.paymentIntent);
        } else {
          setPaymentError('Payment failed. Please try a different payment method.');
        }
      }
    } catch (error) {
      console.error('Saved card payment error:', error);
      setPaymentError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const savePaymentMethodToCustomer = async (paymentMethodId) => {
    try {
      console.log('💾 Saving payment method to customer:', { customerId, paymentMethodId });
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          paymentMethodId: paymentMethodId,
        }),
      });
      
      const data = await response.json();
      console.log('💾 Save payment method response:', data);
      
      if (response.ok) {
        console.log('✅ Payment method saved successfully');
      } else {
        console.error('❌ Failed to save payment method:', data.error);
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
    }
  };

  if (customerLoading) {
    return (
      <div className="max-w-md mx-auto bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

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

      {/* Saved Payment Methods Section */}
      {customerId && !showAddCard && (
        <div className="mb-6">
          <SavedPaymentMethods
            ref={savedPaymentMethodsRef}
            customerId={customerId}
            selectedPaymentMethodId={selectedPaymentMethodId}
            onPaymentMethodSelect={setSelectedPaymentMethodId}
            onAddNewCard={() => setShowAddCard(true)}
          />
        </div>
      )}

      {/* Payment Form - Only show when adding a new card or no saved methods selected */}
      {(showAddCard || !selectedPaymentMethodId) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {showAddCard && (
            <div className="flex items-center mb-4">
              <button
                type="button"
                onClick={() => setShowAddCard(false)}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to saved cards
              </button>
            </div>
          )}

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

          {/* Save payment method checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="saveCard"
              checked={savePaymentMethod}
              onChange={(e) => setSavePaymentMethod(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
            />
            <label htmlFor="saveCard" className="ml-2 text-sm text-gray-300">
              Save this card for future payments
            </label>
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
      )}

      {/* Quick Pay Button for Saved Payment Methods */}
      {selectedPaymentMethodId && !showAddCard && (
        <div className="pt-4">
          <button
            onClick={handleSubmit}
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
                <span>Pay £{serviceRequest.totalAmount}</span>
              </>
            )}
          </button>
          
          <div className="text-center mt-2">
            <p className="text-xs text-gray-400">
              <Lock className="inline h-3 w-3 mr-1" />
              Your payment information is secure and encrypted
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Main PaymentForm component that wraps CheckoutForm with Stripe Elements
export default function PaymentForm({ serviceRequest, onPaymentSuccess, businessInfo }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm 
        serviceRequest={serviceRequest} 
        onPaymentSuccess={onPaymentSuccess}
        businessInfo={businessInfo}
      />
    </Elements>
  );
}
