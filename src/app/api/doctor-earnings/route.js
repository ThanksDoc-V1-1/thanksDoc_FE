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
    const { transactionId, action } = body;

    // Validate required fields
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    if (action !== 'mark_paid') {
      return NextResponse.json(
        { error: 'Invalid action. Only "mark_paid" is supported.' },
        { status: 400 }
      );
    }

    console.log('🔵 Updating paymentStatus for transaction:', transactionId);
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const currentDate = new Date().toISOString();
    
    try {
      // First, get the specific transaction to verify it exists and get its documentId
      const transactionResponse = await fetch(`${API_URL}/service-requests/${transactionId}`);
      
      if (!transactionResponse.ok) {
        console.error('❌ Transaction not found:', transactionId);
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }
      
      const transactionData = await transactionResponse.json();
      const transaction = transactionData.data;
      
      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction data not found' },
          { status: 404 }
        );
      }
      
      console.log(`🔵 Found transaction ${transaction.id}, documentId: ${transaction.documentId}`);
      
      // Check if transaction is already marked as doctor_paid
      if (transaction.paymentStatus === 'doctor_paid') {
        console.log(`ℹ️ Transaction ${transactionId} is already marked as doctor_paid`);
        return NextResponse.json(
          { 
            success: true, 
            message: 'Transaction is already marked as paid',
            transactionId,
            paymentDate: transaction.doctorPaidAt || currentDate
          },
          { status: 200 }
        );
      }
      
      // Update paymentStatus to 'doctor_paid' for this specific transaction
      const updateUrl = `${API_URL}/service-requests/${transaction.documentId}`;
      
      console.log(`🔍 Updating transaction ${transaction.id} using documentId ${transaction.documentId} at ${updateUrl}`);
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            paymentStatus: 'doctor_paid',
            doctorPaidAt: currentDate
          }
        })
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`❌ Failed to update transaction ${transaction.id}:`, updateResponse.status, errorText);
        return NextResponse.json(
          { error: 'Failed to update transaction payment status' },
          { status: 500 }
        );
      }
      
      console.log(`✅ Updated transaction ${transaction.id} payment status to doctor_paid`);
      
    } catch (dbError) {
      console.error('❌ Database error when updating payment status:', dbError);
      return NextResponse.json(
        { error: 'Database error when updating payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Transaction marked as paid successfully',
        transactionId,
        paymentDate: currentDate
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error processing transaction payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
