# WhatsApp Templates for Video Call Links

## Templates to Register with Facebook Business Manager

### 1. Doctor Video Call Link Template

**Template Name**: `doctor_video_call_link`

**Category**: `UTILITY`

**Language**: `English (US)`

**Template Content**:
```
🩺 *ThanksDoc - Video Consultation Ready*

Hi Dr. {{1}},

Your video consultation is ready to start!

📋 *Patient Details:*
• Name: {{2}}
• Phone: {{3}}
• Service: {{4}}

🎥 *Join Video Call:*
{{5}}

⏰ Please join at your scheduled time. The patient will receive their link separately.

Questions? Reply to this message.

_ThanksDoc - Connecting Healthcare_
```

**Parameters**:
1. `{{1}}` - Doctor's name
2. `{{2}}` - Patient's full name
3. `{{3}}` - Patient's phone number
4. `{{4}}` - Service name
5. `{{5}}` - Video call URL

---

### 2. Patient Video Call Link Template

**Template Name**: `patient_video_call_link`

**Category**: `UTILITY`

**Language**: `English (US)`

**Template Content**:
```
🏥 *ThanksDoc - Your Video Consultation*

Hello {{1}},

Your video consultation with Dr. {{2}} is ready!

📋 *Consultation Details:*
• Doctor: Dr. {{3}}
• Service: {{4}}
• Scheduled Time: Please check your booking confirmation

🎥 *Join Video Call:*
{{5}}

📱 *Instructions:*
• Click the link above to join
• Allow camera and microphone access
• Ensure good internet connection
• Join a few minutes early

Need help? Contact us at support@thanksdoc.com

_ThanksDoc - Your Healthcare Partner_
```

**Parameters**:
1. `{{1}}` - Patient's first name
2. `{{2}}` - Doctor's name
3. `{{3}}` - Doctor's name (repeated for clarity)
4. `{{4}}` - Service name
5. `{{5}}` - Video call URL

---

## Registration Instructions

### Step 1: Access Facebook Business Manager
1. Go to [business.facebook.com](https://business.facebook.com)
2. Navigate to WhatsApp Manager
3. Select your WhatsApp Business Account
4. Go to "Message Templates"

### Step 2: Create Doctor Template
1. Click "Create Template"
2. Enter template name: `doctor_video_call_link`
3. Select category: `UTILITY`
4. Select language: `English (US)`
5. Copy and paste the doctor template content above
6. Configure the 5 parameters as listed
7. Submit for review

### Step 3: Create Patient Template
1. Click "Create Template"
2. Enter template name: `patient_video_call_link`
3. Select category: `UTILITY`
4. Select language: `English (US)`
5. Copy and paste the patient template content above
6. Configure the 5 parameters as listed
7. Submit for review

### Step 4: Update Backend Configuration

After approval, add these template names to your `.env` file:

```env
# Video Call WhatsApp Templates
WHATSAPP_TEMPLATE_DOCTOR_VIDEO_CALL=doctor_video_call_link
WHATSAPP_TEMPLATE_PATIENT_VIDEO_CALL=patient_video_call_link
```

---

## Template Usage in Code

The WhatsApp service will use these templates like this:

```javascript
// For doctors
await sendTemplateMessage(
  doctorPhone,
  'doctor_video_call_link',
  [
    doctorName,           // {{1}}
    patientFullName,      // {{2}}
    patientPhone,         // {{3}}
    serviceName,          // {{4}}
    videoRoomUrl          // {{5}}
  ]
);

// For patients
await sendTemplateMessage(
  patientPhone,
  'patient_video_call_link',
  [
    patientFirstName,     // {{1}}
    doctorName,           // {{2}}
    doctorName,           // {{3}}
    serviceName,          // {{4}}
    videoRoomUrl          // {{5}}
  ]
);
```

---

## Alternative Shorter Templates (if character limit is an issue)

### Doctor Template (Shorter)
**Template Name**: `doctor_video_short`

```
🩺 ThanksDoc Video Call

Dr. {{1}}, your consultation with {{2}} is ready.

Join: {{3}}

Patient: {{4}}
```

### Patient Template (Shorter)
**Template Name**: `patient_video_short`

```
🏥 ThanksDoc Consultation

Hi {{1}}, your video call with Dr. {{2}} is ready.

Join: {{3}}

Service: {{4}}
```

---

## Tips for Template Approval

1. **Use Clear Language**: Templates should be professional and clear
2. **Include Branding**: Use your business name (ThanksDoc)
3. **Utility Category**: Video call links qualify as UTILITY messages
4. **Parameter Validation**: Ensure all parameters are properly formatted
5. **Test First**: Test templates in WhatsApp Business API before going live

## Review Timeline

- **Initial Review**: 24-48 hours
- **Rejection Response**: Update and resubmit within 30 days
- **Approval**: Templates become active immediately

Remember to wait for approval before updating your WhatsApp service to use these templates!
