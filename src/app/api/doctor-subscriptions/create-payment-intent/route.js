const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:1337';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/doctor-subscriptions/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error || 'Payment intent creation failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Payment intent API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
