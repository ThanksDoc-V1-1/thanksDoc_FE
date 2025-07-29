import { NextResponse } from 'next/server';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST - Create or retrieve a Stripe customer
export async function POST(request) {
  try {
    const { email, businessId, businessName } = await request.json();
    
    if (!email || !businessId) {
      return NextResponse.json(
        { error: 'Email and Business ID are required' },
        { status: 400 }
      );
    }

    console.log('Creating/retrieving customer for:', { email, businessId, businessName });

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    console.log('Found existing customers:', existingCustomers.data.length);

    let customer;
    
    if (existingCustomers.data.length > 0) {
      // Customer exists, return existing customer
      customer = existingCustomers.data[0];
      console.log('Found existing customer:', customer.id);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: email,
        name: businessName,
        metadata: {
          businessId: businessId.toString(),
          businessName: businessName || '',
        },
      });
      console.log('Created new customer:', customer.id);
    }

    return NextResponse.json({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
    });
  } catch (error) {
    console.error('Error creating/retrieving customer:', error);
    return NextResponse.json(
      { error: 'Failed to create/retrieve customer' },
      { status: 500 }
    );
  }
}

// GET - Retrieve customer details
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const customer = await stripe.customers.retrieve(customerId);

    return NextResponse.json({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      metadata: customer.metadata,
    });
  } catch (error) {
    console.error('Error retrieving customer:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve customer' },
      { status: 500 }
    );
  }
}
