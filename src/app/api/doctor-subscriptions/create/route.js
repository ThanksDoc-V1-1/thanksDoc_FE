import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:1337';

export async function POST(request) {
  try {
    const body = await request.json();
    const { doctorId, paymentMethodId, amount, savePaymentMethod } = body;

    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    // Forward the request to Strapi backend
    const response = await fetch(`${BACKEND_URL}/api/doctor-subscriptions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        doctorId,
        paymentMethodId,
        amount,
        savePaymentMethod,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to create subscription' }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
