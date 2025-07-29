import { NextResponse } from 'next/server';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { 
      amount, 
      currency = 'gbp', 
      metadata = {}, 
      idempotencyKey,
      customerId,
      paymentMethodId,
      savePaymentMethod = false 
    } = await request.json();

    console.log('Creating payment intent for amount:', amount, currency);
    console.log('Metadata:', metadata);
    console.log('Customer ID:', customerId);
    console.log('Payment Method ID:', paymentMethodId);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Generate idempotency key if not provided
    const idemKey = idempotencyKey || `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Payment intent configuration
    const paymentIntentData = {
      amount: Math.round(amount * 100), // Stripe expects amount in pence for GBP
      currency: currency,
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Add customer and payment method if provided
    if (customerId) {
      paymentIntentData.customer = customerId;
    }

    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
      paymentIntentData.confirmation_method = 'manual';
      paymentIntentData.confirm = true;
    }

    // Setup future usage if saving payment method
    if (savePaymentMethod) {
      paymentIntentData.setup_future_usage = 'off_session';
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData, {
      idempotencyKey: idemKey, // Prevents duplicate PaymentIntents
    });

    console.log('Payment intent created:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
