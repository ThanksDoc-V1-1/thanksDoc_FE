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
    const { doctorId, action } = body;

    // Validate required fields
    if (!doctorId) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    if (action !== 'mark_paid') {
      return NextResponse.json(
        { error: 'Invalid action. Only "mark_paid" is supported.' },
        { status: 400 }
      );
    }

    console.log('🔵 Updating paymentStatus for doctor:', doctorId);
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const currentDate = new Date().toISOString();
    
    try {
      // First, get all paid service requests for this doctor
      const serviceRequestsResponse = await fetch(`${API_URL}/service-requests?filters[doctor][id][$eq]=${doctorId}&filters[isPaid][$eq]=true`);
      
      if (serviceRequestsResponse.ok) {
        const requestsData = await serviceRequestsResponse.json();
        const requests = requestsData.data || [];
        
        console.log(`🔵 Found ${requests.length} paid requests for doctor ${doctorId}`);
        
        // Update paymentStatus to 'doctor_paid' for all requests
        const updatePromises = requests.map(async (request) => {
          try {
            // In Strapi v4, use documentId for updates, not id
            const updateUrl = `${API_URL}/service-requests/${request.documentId}`;
            console.log(`🔍 Updating request ${request.id} using documentId ${request.documentId} at ${updateUrl}`);
            
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
              console.error(`❌ Failed to update request ${request.id}:`, updateResponse.status, errorText);
              return false;
            } else {
              console.log(`✅ Updated request ${request.id} payment status to doctor_paid`);
              return true;
            }
          } catch (updateError) {
            console.error(`❌ Error updating request ${request.id}:`, updateError);
            return false;
          }
        });
        
        const results = await Promise.all(updatePromises);
        const successCount = results.filter(Boolean).length;
        
        console.log(`✅ Updated ${successCount}/${requests.length} service requests`);
        
        if (successCount === 0) {
          return NextResponse.json(
            { error: 'Failed to update any service requests' },
            { status: 500 }
          );
        }
        
      } else {
        const errorText = await serviceRequestsResponse.text();
        console.error('❌ Failed to fetch service requests for doctor:', serviceRequestsResponse.status, errorText);
        return NextResponse.json(
          { error: 'Failed to fetch service requests for doctor' },
          { status: 500 }
        );
      }
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
        message: 'Doctor marked as paid successfully',
        doctorId,
        paymentDate: currentDate
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error processing doctor payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
