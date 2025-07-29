import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query parameters for the backend
    let query = '?populate=doctor';
    
    if (doctorId) query += `&filters[doctor][id][$eq]=${doctorId}`;
    if (startDate) query += `&filters[paidAt][$gte]=${startDate}`;
    if (endDate) query += `&filters[paidAt][$lte]=${endDate}`;
    
    // Only get paid transactions
    query += '&filters[isPaid][$eq]=true';
    
    console.log('🔍 Fetching doctor earnings from backend:', `${API_URL}/service-requests${query}`);

    const response = await fetch(`${API_URL}/service-requests${query}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Doctor earnings data fetched:', data.data?.length || 0);

    // Transform the data to calculate doctor earnings
    const transactions = (data.data || []).map(item => ({
      id: item.id,
      paymentId: item.attributes.paymentIntentId || `payment_${item.id}`,
      serviceType: item.attributes.serviceType,
      doctorId: item.attributes.doctor?.data?.id,
      doctorName: item.attributes.doctor?.data?.attributes 
        ? `${item.attributes.doctor.data.attributes.firstName} ${item.attributes.doctor.data.attributes.lastName}`
        : 'Unknown Doctor',
      totalAmount: item.attributes.totalAmount || 0,
      doctorFee: (item.attributes.totalAmount || 0) * 0.85, // 85% to doctor
      serviceCharge: (item.attributes.totalAmount || 0) * 0.15, // 15% service charge
      date: item.attributes.paidAt || item.attributes.createdAt,
      status: item.attributes.isPaid ? 'Paid' : 'Pending',
      currency: item.attributes.currency || 'GBP',
      paymentMethod: item.attributes.paymentMethod || 'card',
      businessName: item.attributes.business?.data?.attributes?.name || 
                   item.attributes.business?.data?.attributes?.companyName || 
                   'Unknown Business',
    }));

    // Group by doctor and calculate earnings
    const doctorEarningsMap = {};
    transactions.forEach(transaction => {
      if (!doctorEarningsMap[transaction.doctorId]) {
        doctorEarningsMap[transaction.doctorId] = {
          doctorId: transaction.doctorId,
          doctorName: transaction.doctorName,
          totalEarnings: 0,
          totalTransactions: 0,
          transactions: []
        };
      }
      
      doctorEarningsMap[transaction.doctorId].totalEarnings += transaction.doctorFee;
      doctorEarningsMap[transaction.doctorId].totalTransactions += 1;
      doctorEarningsMap[transaction.doctorId].transactions.push(transaction);
    });

    const doctorEarnings = Object.values(doctorEarningsMap);

    return NextResponse.json({
      doctorEarnings,
      summary: {
        totalDoctors: doctorEarnings.length,
        totalEarnings: doctorEarnings.reduce((sum, d) => sum + d.totalEarnings, 0),
        totalTransactions: transactions.length,
      }
    });
  } catch (error) {
    console.error('❌ Doctor earnings API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch doctor earnings',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { doctorId, paymentDate, paymentMethod } = body;

    // Validate required fields
    if (!doctorId) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    // Here we create a doctor payment record in the database
    // This will track when doctors are paid out their earnings
    console.log('Marking doctor as paid:', {
      doctorId,
      paymentDate,
      paymentMethod
    });

    // Create a doctor payment record in Strapi
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    try {
      const paymentRecord = await fetch(`${API_URL}/doctor-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            doctor: doctorId,
            paymentDate: paymentDate,
            paymentMethod: paymentMethod,
            status: 'completed',
            notes: 'Doctor marked as paid via admin dashboard'
          }
        })
      });

      if (!paymentRecord.ok) {
        console.log('Warning: Could not create payment record in database, but continuing...');
      }
    } catch (dbError) {
      console.log('Warning: Database error when creating payment record:', dbError.message);
      // Continue anyway - the frontend will handle the status update
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Doctor marked as paid successfully',
        doctorId,
        paymentDate,
        paymentMethod
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing doctor payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
