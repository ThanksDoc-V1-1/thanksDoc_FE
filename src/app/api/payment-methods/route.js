import { NextResponse } from 'next/server';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Simple in-memory cache for payment methods (you can replace with Redis in production)
const paymentMethodsCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// GET - Retrieve saved payment methods for a customer
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

    console.log('Fetching payment methods for customer:', customerId);

    // Check cache first
    const cacheKey = `payment_methods_${customerId}`;
    const cached = paymentMethodsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('Using cached payment methods:', cached.methods.length);
      return NextResponse.json({
        paymentMethods: cached.methods,
      });
    }

    // List payment methods for the customer with expanded details
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 10, // Limit to reduce response size
    });

    console.log('Raw payment methods from Stripe:', paymentMethods.data.length);

    // Format the payment methods for frontend (optimized)
    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      card: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      },
      created: pm.created,
    }));

    // Cache the results
    paymentMethodsCache.set(cacheKey, {
      methods: formattedMethods,
      timestamp: Date.now()
    });

    return NextResponse.json({
      paymentMethods: formattedMethods,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST - Save a new payment method for a customer
export async function POST(request) {
  try {
    const { customerId, paymentMethodId, setAsDefault = false } = await request.json();
    
    if (!customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Customer ID and Payment Method ID are required' },
        { status: 400 }
      );
    }

    console.log('Saving payment method for customer:', customerId, 'Payment Method:', paymentMethodId);

    // First check if payment method is already attached to this customer
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      if (paymentMethod.customer && paymentMethod.customer === customerId) {
        console.log('Payment method already attached to customer');
        return NextResponse.json({
          success: true,
          message: 'Payment method already attached to customer',
        });
      }
      
      // Attach payment method to customer if not already attached
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      console.log('Payment method attached successfully');
    } catch (attachError) {
      // If already attached, the error message will indicate this
      if (attachError.message && attachError.message.includes('already attached')) {
        console.log('Payment method already attached (caught in error)');
      } else {
        throw attachError; // Re-throw if it's a different error
      }
    }

    // Set as default if requested
    if (setAsDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Invalidate cache for this customer
    const cacheKey = `payment_methods_${customerId}`;
    paymentMethodsCache.delete(cacheKey);

    return NextResponse.json({
      success: true,
      message: 'Payment method saved successfully',
    });
  } catch (error) {
    console.error('Error saving payment method:', error);
    return NextResponse.json(
      { error: 'Failed to save payment method' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a saved payment method
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('paymentMethodId');
    const customerId = searchParams.get('customerId'); // Add this to invalidate cache
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment Method ID is required' },
        { status: 400 }
      );
    }

    console.log('Deleting payment method:', paymentMethodId);

    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    // Invalidate cache if customerId is provided
    if (customerId) {
      const cacheKey = `payment_methods_${customerId}`;
      paymentMethodsCache.delete(cacheKey);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
