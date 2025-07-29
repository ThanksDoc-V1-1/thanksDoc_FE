import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request) {
  try {
    console.log('🔄 Transaction history API called');
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('search');

    console.log('📊 Query parameters:', { startDate, endDate, searchTerm });

    // Build query parameters for the backend
    let query = '?populate=business,doctor';
    
    // Only get paid transactions for now (simplified)
    query += '&filters[isPaid][$eq]=true';
    
    console.log('🔍 Fetching transactions from backend:', `${API_URL}/service-requests${query}`);

    const response = await fetch(`${API_URL}/service-requests${query}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error response:', errorText);
      throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Transactions fetched:', data.data?.length || 0);

    // Transform the data to match frontend expectations
    const transactions = (data.data || []).map(item => ({
      id: item.id,
      paymentId: item.attributes.paymentIntentId || `payment_${item.id}`,
      serviceType: item.attributes.serviceType,
      doctorId: item.attributes.doctor?.data?.id,
      doctorName: item.attributes.doctor?.data?.attributes 
        ? `${item.attributes.doctor.data.attributes.firstName} ${item.attributes.doctor.data.attributes.lastName}`
        : 'Unknown Doctor',
      totalAmount: item.attributes.totalAmount || 0,
      doctorFee: (item.attributes.totalAmount || 0) * 0.85, // 85% to doctor, 15% service charge
      serviceCharge: (item.attributes.totalAmount || 0) * 0.15,
      date: item.attributes.paidAt || item.attributes.createdAt,
      status: item.attributes.isPaid ? 'Paid' : 'Pending',
      currency: item.attributes.currency || 'GBP',
      paymentMethod: item.attributes.paymentMethod || 'card',
      businessName: item.attributes.business?.data?.attributes?.name || 
                   item.attributes.business?.data?.attributes?.companyName || 
                   'Unknown Business',
      chargeId: item.attributes.chargeId,
      paymentIntentId: item.attributes.paymentIntentId,
    }));

    return NextResponse.json({
      transactions,
      summary: {
        totalTransactions: transactions.length,
        totalRevenue: transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
        totalDoctorEarnings: transactions.reduce((sum, t) => sum + (t.doctorFee || 0), 0),
        totalServiceCharges: transactions.reduce((sum, t) => sum + (t.serviceCharge || 0), 0),
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transaction history:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
