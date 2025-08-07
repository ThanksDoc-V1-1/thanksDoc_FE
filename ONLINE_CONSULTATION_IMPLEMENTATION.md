# Online Consultation with Whereby Video Integration - Implementation Guide

## Overview

This implementation adds comprehensive online consultation functionality to the ThanksDoc platform with the following features:

1. **Patient Information Collection**: When businesses select "Online Consultation", they must provide patient details (name, phone, email)
2. **Whereby Video Integration**: Automatic video room creation when doctors accept online consultation requests
3. **WhatsApp Notifications**: Video call links sent to both doctor and patient via WhatsApp
4. **Video Consultation Page**: Embedded Whereby video interface for seamless consultations

## Features Implemented

### 1. Enhanced Business Dashboard
- **Patient Information Fields**: Added patient first name, last name, phone number, and email fields
- **Conditional Display**: Patient fields only appear when "Online Consultation" is selected
- **Validation**: Required field validation for patient information on online consultations
- **Real-time Updates**: Form updates dynamically based on service selection

### 2. Backend Service Request Model Updates
- **New Fields Added**:
  - `patientFirstName` (string, optional)
  - `patientLastName` (string, optional) 
  - `patientPhone` (string, optional)
  - `patientEmail` (string, optional)
  - `wherebyRoomUrl` (string, optional)
  - `wherebyMeetingId` (string, optional)
  - `videoCallStartedAt` (datetime, optional)
  - `videoCallEndedAt` (datetime, optional)

### 3. Whereby Video Service Integration
- **File**: `src/services/whereby.js`
- **Features**:
  - Create video meeting rooms with configurable duration
  - Automatic room naming with consultation prefixes
  - Meeting management (create, delete, get details)
  - Development mode fallback for testing without API key
  - Error handling and logging

### 4. Enhanced WhatsApp Service
- **Video Call Notifications**: New methods for sending video links
- **Doctor Notifications**: Includes patient details and consultation information
- **Patient Notifications**: Includes doctor details and meeting instructions
- **Dual Delivery**: Sends links to both parties simultaneously

### 5. Video Consultation Page
- **File**: `src/app/consultation/[requestId]/page.js`
- **Features**:
  - Embedded Whereby iframe for video calls
  - Real-time consultation details display
  - Call controls (mute, video, end call)
  - User type differentiation (doctor vs patient view)
  - Automatic status updates and redirection

### 6. Service Request Controller Updates
- **Enhanced Accept Method**: Automatically creates video rooms for online consultations
- **Patient Data Handling**: Processes and stores patient information
- **WhatsApp Integration**: Sends video links after successful acceptance
- **Error Handling**: Graceful fallback if video creation fails

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# Video Call Configuration - Whereby API
WHEREBY_API_KEY=your_whereby_api_key_here
```

### 2. Whereby API Setup

1. **Sign up for Whereby**: Visit [whereby.com/developers](https://whereby.com/developers)
2. **Create API Key**: Generate an API key in your Whereby dashboard
3. **Update Environment**: Replace `your_whereby_api_key_here` with your actual API key
4. **Test Connection**: The system will work in development mode even without the API key

### 3. Database Migration

The service request schema has been updated. If using a production database, you may need to:

1. **Backup Database**: Always backup before schema changes
2. **Apply Migration**: The new fields will be added automatically by Strapi
3. **Verify Schema**: Check that the new patient and video fields are present

### 4. Frontend Dependencies

No additional npm packages are required. The implementation uses existing dependencies.

## Usage Workflow

### 1. Business Creates Online Consultation Request

1. Business selects "Online Consultation" service
2. System displays patient information fields
3. Business fills in patient details (name, phone, email)
4. Business completes normal booking process
5. Request is created with patient information

### 2. Doctor Accepts Request

1. Doctor receives WhatsApp notification as usual
2. Doctor accepts via WhatsApp link or dashboard
3. **Automatic Video Room Creation**:
   - System creates Whereby meeting room
   - Room URL stored in service request
   - Meeting scheduled for consultation time

### 3. Video Call Notifications

1. **Doctor Receives**:
   - WhatsApp message with video link
   - Patient details and consultation information
   - Instructions to join at scheduled time

2. **Patient Receives**:
   - WhatsApp message with video link
   - Doctor details and consultation information
   - Instructions to join at scheduled time

### 4. Video Consultation

1. Both parties click their respective video links
2. Redirected to consultation page with embedded Whereby
3. Video call interface with controls
4. Automatic status tracking (call start/end times)
5. Redirection after call completion

## File Structure

```
├── Backend (UBER-DOC-BE/)
│   ├── src/services/whereby.js                          # Whereby integration service
│   ├── src/services/whatsapp.js                         # Enhanced WhatsApp service
│   ├── src/api/service-request/controllers/service-request.js  # Updated controller
│   └── src/api/service-request/content-types/service-request/schema.json  # Updated schema
│
└── Frontend (uber-doc/)
    ├── src/app/business/dashboard/page.js               # Enhanced business dashboard
    └── src/app/consultation/[requestId]/page.js         # Video consultation page
```

## Testing

### 1. Development Mode Testing

Without Whereby API key, the system will:
- Create mock video room URLs for testing
- Log all video-related actions to console
- Allow full workflow testing without actual video calls

### 2. Production Testing

With valid Whereby API key:
- Real video rooms are created
- Actual video calls can be conducted
- Full integration testing possible

### 3. WhatsApp Testing

Ensure WhatsApp credentials are properly configured to test:
- Video link delivery to doctors
- Video link delivery to patients
- Message formatting and content

## Troubleshooting

### Common Issues

1. **Video Links Not Working**
   - Check Whereby API key configuration
   - Verify environment variables are loaded
   - Check console logs for API errors

2. **WhatsApp Messages Not Sending**
   - Verify WhatsApp API credentials
   - Check phone number formatting
   - Review WhatsApp service logs

3. **Patient Fields Not Showing**
   - Verify service category is set to 'online'
   - Check service name includes 'Online Consultation'
   - Clear browser cache and reload

4. **Video Page Not Loading**
   - Verify requestId parameter exists
   - Check service request has video room URL
   - Ensure user type parameter is correct

## Next Steps

1. **Get Whereby API Key**: Sign up at [whereby.com/developers](https://whereby.com/developers) and replace the placeholder in your `.env` file
2. **Test the Workflow**: Create an online consultation request and test the complete flow
3. **Configure WhatsApp**: Ensure WhatsApp API credentials are properly set up for notifications
4. **Production Deploy**: Deploy both frontend and backend with the new changes

The implementation is now complete and ready for testing!
