'use client';

import { useState, useEffect, useRef } from 'react';
import { CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import SavedPaymentMethods from './SavedPaymentMethods';
import { formatCurrency, formatDuration } from '../lib/utils';

// Load Stripe once and cache it
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Enhanced loading component with progress steps
function LoadingProgress({ currentStep = 1, steps }) {
  return (
    <div className="max-w-xl mx-auto bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-800">
      <div className="flex flex-col items-center justify-center py-12">
        {/* Animated loading spinner */}
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-ping opacity-20"></div>
        </div>
        
        {/* Loading text */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Preparing Your Payment</h3>
          <p className="text-gray-400 text-sm mb-4">Setting up secure payment options...</p>
          
          {/* Progress steps */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;
              
              return (
                <div key={index} className="flex items-center justify-center space-x-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    isCompleted ? 'bg-green-500' : 
                    isActive ? 'bg-blue-500 animate-pulse' : 
                    'bg-gray-500'
                  }`}></div>
                  <span className={`${
                    isCompleted ? 'text-green-300' :
                    isActive ? 'text-gray-300' : 
                    'text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : ''} {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Security indicators */}
        <div className="flex items-center justify-center mt-6 space-x-4 text-xs text-gray-500">
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
        </div>
      </div>
    </div>
  );
}

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
  
  // Enhanced loading states
  const [initializationStep, setInitializationStep] = useState(1);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  
  // Ref to access SavedPaymentMethods component
  const savedPaymentMethodsRef = useRef();

  const initializationSteps = [
    'Initializing customer account',
    'Loading saved payment methods',
    'Preparing secure checkout',
    'Ready for payment'
  ];

  useEffect(() => {
    // Initialize customer when component mounts
    if (businessInfo && !customerId) {
      initializeCustomer();
    }
  }, [businessInfo, customerId]);

  useEffect(() => {
    // Only create PaymentIntent once we have all necessary info
    if (!paymentIntentCreated && serviceRequest && customerId && isFullyLoaded) {
      createPaymentIntent();
    }
  }, [serviceRequest, customerId, isFullyLoaded]); // Removed selectedPaymentMethodId and paymentIntentCreated to prevent loops

  const initializeCustomer = async () => {
    try {
      setInitializationStep(1);
      
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
        ('✅ Customer initialized successfully:', data.customerId);
        setCustomerId(data.customerId);
        setInitializationStep(2);
        
        // Add small delay to show step progression
        setTimeout(() => {
          setInitializationStep(3);
          setTimeout(() => {
            setInitializationStep(4);
            setTimeout(() => {
              setIsFullyLoaded(true);
            }, 300);
          }, 500);
        }, 300);
      } else {
        console.error('Failed to initialize customer:', data.error);
        setPaymentError('Failed to initialize payment system');
        setIsFullyLoaded(true);
      }
    } catch (error) {
      console.error('Error initializing customer:', error);
      setPaymentError('Failed to initialize payment system');
      setIsFullyLoaded(true);
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
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
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
      if (error.name === 'AbortError') {
        console.error('Payment intent creation timed out');
        setPaymentError('Payment initialization timed out. Please try again.');
      } else {
        console.error('Error creating payment intent:', error);
        setPaymentError('Failed to initialize payment. Please try again.');
      }
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
        ('Payment succeeded:', result.paymentIntent);
        
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
        alert(`Payment successful! Payment ID: ${result.paymentIntent.id}\nAmount: ${formatCurrency(amount)}\nStatus: ${result.paymentIntent.status}`);
        
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
      ('💳 Starting saved card payment with:', {
        selectedPaymentMethodId,
        clientSecret,
        customerId
      });

      // If no client secret or it wasn't created with the selected payment method, create a new one
      if (!clientSecret) {
        ('💳 Creating new payment intent for saved payment method');
        await createPaymentIntentForSavedMethod();
        
        // Wait a moment for the payment intent to be created
        if (!clientSecret) {
          setPaymentError('Failed to initialize payment. Please try again.');
          return;
        }
      }

      // For saved payment methods, we need to confirm the payment intent with the saved payment method
      ('💳 Confirming payment with saved payment method:', selectedPaymentMethodId);
      
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: selectedPaymentMethodId
      });
      
      ('💳 Confirmation result:', result);
      
      if (result.error) {
        console.error('❌ Saved card payment failed:', result.error);
        setPaymentError(result.error.message || 'Payment failed with saved card');
      } else if (result.paymentIntent) {
        if (result.paymentIntent.status === 'succeeded') {
          ('✅ Saved card payment succeeded:', result.paymentIntent);
          const amount = (result.paymentIntent.amount || 0) / 100;
          alert(`Payment successful! Payment ID: ${result.paymentIntent.id}\nAmount: ${formatCurrency(amount)}\nStatus: ${result.paymentIntent.status}`);
          onPaymentSuccess?.(result.paymentIntent);
        } else {
          console.error('❌ Payment intent status:', result.paymentIntent.status);
          setPaymentError(`Payment ${result.paymentIntent.status}. Please try a different payment method.`);
        }
      } else {
        console.error('❌ No payment intent in result');
        setPaymentError('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Saved card payment error:', error);
      setPaymentError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createPaymentIntentForSavedMethod = async () => {
    try {
      // Generate a unique idempotency key for this payment
      const idempotencyKey = `pi_saved_${serviceRequest.id}_${Date.now()}`;
      
      const requestBody = {
        amount: serviceRequest.totalAmount,
        currency: 'gbp',
        idempotencyKey: idempotencyKey,
        customerId: customerId,
        paymentMethodId: selectedPaymentMethodId,
        metadata: {
          serviceRequestId: serviceRequest.id?.toString() || '',
          serviceType: serviceRequest.serviceType,
          doctorId: serviceRequest.doctor?.id?.toString() || '',
          patientId: serviceRequest.patientId?.toString() || '',
        },
      };
      
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
        return;
      }

      setClientSecret(data.clientSecret);
      ('✅ Payment intent created for saved method:', data.clientSecret);
      
    } catch (error) {
      console.error('Error creating payment intent for saved method:', error);
      setPaymentError('Failed to initialize payment. Please try again.');
    }
  };

  const savePaymentMethodToCustomer = async (paymentMethodId) => {
    try {
      ('💾 Saving payment method to customer:', { customerId, paymentMethodId });
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
      ('💾 Save payment method response:', data);
      
      if (response.ok) {
        ('✅ Payment method saved successfully');
      } else {
        console.error('❌ Failed to save payment method:', data.error);
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
    }
  };

  if (!isFullyLoaded) {
    return (
      <LoadingProgress 
        currentStep={initializationStep} 
        steps={initializationSteps} 
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-800 max-h-[80vh] overflow-y-auto modal-scrollable">
      <div className="flex items-center justify-center mb-6">
        <Lock className="h-6 w-6 text-green-400 mr-2" />
        <h2 className="text-xl font-semibold text-white">Secure Payment</h2>
      </div>

      {/* Stripe Badge for Trust */}
      <div className="flex items-center justify-center mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-gray-300 text-sm font-medium">Powered by Stripe</span>
          </div>
          <div className="text-gray-400 text-xs">•</div>
          <div className="flex items-center space-x-1">
            <Lock className="h-3 w-3 text-green-400" />
            <span className="text-gray-400 text-xs">SSL Encrypted</span>
          </div>
        </div>
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
            <span className="text-white">{formatDuration(serviceRequest.estimatedDuration)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Doctor:</span>
            <span className="text-white">Dr. {serviceRequest.doctor?.firstName} {serviceRequest.doctor?.lastName}</span>
          </div>
          <div className="flex justify-between font-medium text-white pt-2 border-t border-gray-700">
            <span>Total:</span>
            <span>{formatCurrency(serviceRequest.totalAmount)}</span>
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {showAddCard && (
            <div className="flex items-center mb-6">
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
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Card Information
            </label>
            <div className="border border-gray-600 rounded-lg bg-gray-700 p-4 relative">
              {!stripe && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-400 text-sm">Loading card form...</span>
                  </div>
                </div>
              )}
              <CardElement
                options={{
                  hidePostalCode: true,
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#ffffff',
                      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
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
          <div className="flex items-center py-2">
            <input
              type="checkbox"
              id="saveCard"
              checked={savePaymentMethod}
              onChange={(e) => setSavePaymentMethod(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900 w-4 h-4"
            />
            <label htmlFor="saveCard" className="ml-3 text-sm text-gray-300">
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
                  <span>Pay {formatCurrency(serviceRequest.totalAmount)}</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">
              <Lock className="inline h-3 w-3 mr-1" />
              Your payment information is secure and encrypted
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <span>Secured by</span>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">S</span>
                </div>
                <span className="font-medium">Stripe</span>
              </div>
            </div>
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
                <span>Pay {formatCurrency(serviceRequest.totalAmount)}</span>
              </>
            )}
          </button>
          
          <div className="text-center mt-2">
            <p className="text-xs text-gray-400 mb-2">
              <Lock className="inline h-3 w-3 mr-1" />
              Your payment information is secure and encrypted
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <span>Secured by</span>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">S</span>
                </div>
                <span className="font-medium">Stripe</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main PaymentForm component that wraps CheckoutForm with Stripe Elements
export default function PaymentForm({ serviceRequest, onPaymentSuccess, businessInfo }) {
  const [stripeLoading, setStripeLoading] = useState(true);
  
  useEffect(() => {
    // Preload Stripe to improve performance
    stripePromise.then(() => {
      setStripeLoading(false);
    }).catch((error) => {
      console.error('Failed to load Stripe:', error);
      setStripeLoading(false);
    });
  }, []);

  if (stripeLoading) {
    return (
      <LoadingProgress 
        currentStep={1} 
        steps={['Loading payment system', 'Initializing Stripe', 'Setting up security', 'Ready for payment']} 
      />
    );
  }

  return (
    <Elements 
      stripe={stripePromise}
      options={{
        // Add options to improve loading performance
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#3b82f6',
          },
        },
        loader: 'auto', // Show Stripe's own loading indicator
      }}
    >
      <CheckoutForm 
        serviceRequest={serviceRequest} 
        onPaymentSuccess={onPaymentSuccess}
        businessInfo={businessInfo}
      />
    </Elements>
  );
}
