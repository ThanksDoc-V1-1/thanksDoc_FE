import { NextResponse } from 'next/server';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  try {
    // Get recent payment intents
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10,
    });

    const payments = paymentIntents.data.map(payment => ({
      id: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      created: new Date(payment.created * 1000).toISOString(),
      metadata: payment.metadata,
    }));

    return NextResponse.json({
      payments,
      total_count: paymentIntents.data.length
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { paymentIntentId } = await request.json();
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    // Retrieve specific payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return NextResponse.json({
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      created: new Date(paymentIntent.created * 1000).toISOString(),
      metadata: paymentIntent.metadata,
      charges: paymentIntent.charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        status: charge.status,
        receipt_url: charge.receipt_url,
      }))
    });
  } catch (error) {
    console.error('Error retrieving payment:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment' },
      { status: 500 }
    );
  }
}
