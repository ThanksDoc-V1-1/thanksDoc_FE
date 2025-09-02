import { NextResponse } from 'next/server';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Simple in-memory cache for customer lookups (you can replace with Redis in production)
const customerCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// POST - Create or retrieve a Stripe customer
export async function POST(request) {
  try {
    const { email, businessId, patientId, businessName, isPatient } = await request.json();
    
    if (!email || (!businessId && !patientId)) {
      return NextResponse.json(
        { error: 'Email and either Business ID or Patient ID are required' },
        { status: 400 }
      );
    }

    ('Creating/retrieving customer for:', { email, businessId, patientId, businessName, isPatient });

    // Check cache first
    const cacheKey = `customer_${email}_${businessId || patientId}`;
    const cached = customerCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      ('Using cached customer:', cached.customer.id);
      return NextResponse.json({
        customerId: cached.customer.id,
        email: cached.customer.email,
        name: cached.customer.name,
      });
    }

    // Check if customer already exists with optimization
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    ('Found existing customers:', existingCustomers.data.length);

    let customer;
    
    if (existingCustomers.data.length > 0) {
      // Customer exists, return existing customer
      customer = existingCustomers.data[0];
      ('Found existing customer:', customer.id);
    } else {
      // Create new customer with optimized metadata
      const customerData = {
        email: email,
        name: businessName,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      };

      if (isPatient) {
        customerData.metadata.patientId = patientId;
        customerData.metadata.customerType = 'patient';
      } else {
        customerData.metadata.businessId = businessId.toString();
        customerData.metadata.businessName = businessName || '';
        customerData.metadata.customerType = 'business';
      }

      customer = await stripe.customers.create(customerData);
      ('Created new customer:', customer.id);
    }

    // Cache the result
    customerCache.set(cacheKey, {
      customer,
      timestamp: Date.now()
    });

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
