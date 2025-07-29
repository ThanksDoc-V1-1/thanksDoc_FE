import { NextResponse } from 'next/server';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { amount, currency = 'gbp', metadata = {}, idempotencyKey } = await request.json();

    console.log('Creating payment intent for amount:', amount, currency);
    console.log('Metadata:', metadata);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Generate idempotency key if not provided
    const idemKey = idempotencyKey || `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in pence for GBP
      currency: currency,
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      idempotencyKey: idemKey, // Prevents duplicate PaymentIntents
    });

    console.log('Payment intent created:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
