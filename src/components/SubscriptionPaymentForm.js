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
  
  // Saved payment methods state
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [loadingSavedMethods, setLoadingSavedMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showNewCardForm, setShowNewCardForm] = useState(true);

  // Fetch saved payment methods on component mount
  useEffect(() => {
    if (doctorData?.id) {
      fetchSavedPaymentMethods();
    }
  }, [doctorData?.id]);

  const fetchSavedPaymentMethods = async () => {
    try {
      setLoadingSavedMethods(true);
      const response = await fetch(`http://localhost:1337/api/doctor-subscriptions/payment-methods/saved?doctorId=${doctorData.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.paymentMethods) {
          setSavedPaymentMethods(data.paymentMethods);
          
          // If there are saved methods, select the first one
          if (data.paymentMethods.length > 0) {
            setSelectedPaymentMethod(data.paymentMethods[0].id);
            setShowNewCardForm(false); // Don't show new card form by default if we have saved cards
          } else {
            setShowNewCardForm(true); // Show new card form if no saved cards
          }
        } else {
          setSavedPaymentMethods([]);
          setShowNewCardForm(true);
        }
      } else {
        setSavedPaymentMethods([]);
        setShowNewCardForm(true);
      }
    } catch (error) {
      console.error('Error fetching saved payment methods:', error);
      setSavedPaymentMethods([]);
      setShowNewCardForm(true);
    } finally {
      setLoadingSavedMethods(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setPaymentError(null);

    try {
      // Check if using saved payment method or new card
      if (selectedPaymentMethod && !showNewCardForm) {
        // Using saved payment method
        console.log('Creating subscription with saved payment method:', selectedPaymentMethod);
        
        const subscriptionResponse = await fetch('/api/doctor-subscriptions/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            doctorId: doctorData.id,
            paymentMethodId: selectedPaymentMethod,
            useSavedPaymentMethod: true,
            savePaymentMethod: false, // Already saved
          }),
        });

        const subscriptionData = await subscriptionResponse.json();
        console.log('Subscription response:', subscriptionData);

        if (!subscriptionResponse.ok) {
          const errorMessage = subscriptionData.error?.message || subscriptionData.message || subscriptionData.error || 'Failed to create subscription';
          console.error('Subscription creation failed:', errorMessage);
          throw new Error(errorMessage);
        }

        console.log('Subscription created successfully with saved payment method');
        onSuccess();
        
      } else {
        // Using new card - existing flow
        const card = elements.getElement(CardElement);

        // 1. Create payment intent for subscription
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

        // 2. Confirm payment with card details
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

        // Success!
        onSuccess();
      }
      
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

      {/* Payment Method */}
      <div className="space-y-4">
        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Payment Method
        </h4>
        
        {/* Loading saved methods */}
        {loadingSavedMethods && (
          <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4`}>
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Loading saved payment methods...
              </span>
            </div>
          </div>
        )}

        {/* Saved Payment Methods */}
        {!loadingSavedMethods && savedPaymentMethods.length > 0 && (
          <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 space-y-3`}>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Saved Cards
            </label>
            
            {savedPaymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-3">
                <input
                  type="radio"
                  id={`payment-${method.id}`}
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id}
                  onChange={(e) => {
                    setSelectedPaymentMethod(e.target.value);
                    setShowNewCardForm(false);
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`payment-${method.id}`} className={`flex-1 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">
                        **** **** **** {method.card.last4}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {method.card.brand.toUpperCase()}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {method.card.exp_month}/{method.card.exp_year}
                      </span>
                      {method.isDefault && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            ))}
            
            {/* Option to add new card */}
            <div className="flex items-center space-x-3 pt-2 border-t border-gray-300 dark:border-gray-600">
              <input
                type="radio"
                id="new-payment-method"
                name="paymentMethod"
                value="new"
                checked={showNewCardForm}
                onChange={(e) => {
                  setShowNewCardForm(e.target.checked);
                  setSelectedPaymentMethod('');
                }}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="new-payment-method" className={`cursor-pointer text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Use a new card
              </label>
            </div>
          </div>
        )}

        {/* New Card Form - Show if no saved cards or user selects "new card" */}
        {(showNewCardForm || (!loadingSavedMethods && savedPaymentMethods.length === 0)) && (
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
        )}

        {/* Save Card Option - Only show for new cards */}
        {(showNewCardForm || (!loadingSavedMethods && savedPaymentMethods.length === 0)) && (
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
        )}
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
          disabled={!stripe || loading || (showNewCardForm && !cardComplete) || (!showNewCardForm && !selectedPaymentMethod)}
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
