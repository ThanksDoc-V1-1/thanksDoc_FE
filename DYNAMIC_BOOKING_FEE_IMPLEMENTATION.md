# Dynamic Booking Fee Implementation

## Overview
The booking fee is now dynamic and can be managed by administrators from the admin dashboard. This replaces the previous static £3.00 booking fee with a configurable system setting.

## Key Changes

### 1. Backend Implementation

#### System Settings Content Type
- **Location**: `UBER-DOC-BE/src/api/system-setting/`
- **Purpose**: Manages platform-wide configuration settings
- **Key Features**:
  - Unique key-value pairs
  - Data type validation (string, number, boolean, JSON)
  - Public/private access control
  - Category grouping

#### API Endpoints
```
GET /api/system-settings/public          # Get public settings (no auth)
GET /api/system-settings/key/:key        # Get specific setting (admin)
PUT /api/system-settings/key/:key        # Create/update setting (admin)
DELETE /api/system-settings/:id          # Delete setting (admin)
```

### 2. Frontend Implementation

#### System Settings Context
- **Location**: `src/contexts/SystemSettingsContext.js`
- **Purpose**: Provides system settings throughout the application
- **Key Functions**:
  - `getBookingFee()` - Returns current booking fee
  - `getCurrencySymbol()` - Returns currency symbol
  - `refreshSettings()` - Refreshes settings from API

#### Admin Dashboard Integration
- **Location**: `src/app/admin/dashboard/page.js`
- **Features**:
  - View all system settings
  - Create/edit/delete settings
  - Special highlighting for booking fee
  - Data type validation
  - Public/private access control

#### Updated Components
The following components now use dynamic booking fee:
- Business Dashboard (`src/app/business/dashboard/page.js`)
- Doctor Dashboard (`src/app/doctor/dashboard/page.js`)
- Doctor Earnings (`src/app/doctor/earnings/page.js`)
- Business Expenditure (`src/app/business/expenditure/page.js`)

## Usage

### For Administrators

1. **Navigate to Admin Dashboard**
   - Login as admin user
   - Go to "System Settings" tab

2. **Update Booking Fee**
   - Find the `booking_fee` setting
   - Click edit and update the value
   - Setting will be applied immediately across the platform

3. **Create New Settings**
   - Click "Add Setting"
   - Fill in key, value, data type, and description
   - Mark as "Public" if it should be accessible without authentication

### For Developers

#### Using the System Settings Hook
```javascript
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';

function MyComponent() {
  const { getBookingFee, loading } = useSystemSettings();
  
  const bookingFee = getBookingFee(); // Always returns a number
  
  return (
    <div>
      Current booking fee: £{bookingFee.toFixed(2)}
    </div>
  );
}
```

#### Adding New System Settings
```javascript
// In admin dashboard or through API
const newSetting = {
  key: 'max_distance_km',
  value: '50',
  dataType: 'number',
  description: 'Maximum distance for doctor search',
  category: 'search',
  isPublic: true
};
```

## Default Settings

The following settings are automatically created:

| Key | Value | Type | Description |
|-----|--------|------|-------------|
| `booking_fee` | `3.00` | number | Service booking fee charged to businesses |
| `currency_symbol` | `£` | string | Currency symbol used throughout platform |
| `platform_name` | `Uber Doc` | string | Name of the platform |
| `min_service_duration` | `1` | number | Minimum service duration in hours |
| `max_service_duration` | `12` | number | Maximum service duration in hours |

## Initialization

### Automatic Setup
The system includes an initialization script that creates default settings:

```bash
cd UBER-DOC-BE
node initialize-system-settings.js
```

### Manual Setup via Admin Dashboard
1. Login to admin dashboard
2. Go to System Settings tab
3. Click "Add Setting"
4. Create the `booking_fee` setting:
   - Key: `booking_fee`
   - Value: `3.00`
   - Data Type: `number`
   - Category: `pricing`
   - Public: `true`

## Benefits

### 1. **Flexibility**
- Administrators can adjust booking fees without code changes
- Real-time updates across all components
- No application restart required

### 2. **Consistency**
- Single source of truth for booking fee
- Automatic propagation to all related calculations
- Centralized management

### 3. **Scalability**
- Easy to add new configurable settings
- Supports different data types
- Category organization for better management

### 4. **Reliability**
- Fallback to default values if API fails
- Loading states for better user experience
- Error handling for missing settings

## Error Handling

### Frontend Fallbacks
- Default booking fee of £3.00 if API fails
- Loading states while fetching settings
- Graceful degradation for missing settings

### Backend Validation
- Data type validation for setting values
- Unique key constraints
- Input sanitization

## Migration Notes

### Existing Code
All previous hardcoded `3.00` booking fees have been replaced with dynamic values from the system settings. The change is backward compatible - if the system settings fail to load, the default £3.00 fee is used.

### Database
The system settings are stored in a new `system_settings` collection in Strapi with the following schema:
- `key` (string, required, unique)
- `value` (text, required)
- `dataType` (enum: string, number, boolean, json)
- `description` (text)
- `category` (string)
- `isPublic` (boolean)

## Future Enhancements

### Planned Features
1. **Setting History**: Track changes to settings over time
2. **Validation Rules**: Custom validation for specific settings
3. **Environment-specific Settings**: Different values for dev/staging/prod
4. **Setting Groups**: Organize related settings together
5. **Import/Export**: Backup and restore settings configuration

### Potential Settings
- Maximum service radius
- Platform commission percentage
- Email notification intervals
- Search result limits
- File upload size limits

## Security Considerations

### Public vs Private Settings
- **Public Settings**: Accessible without authentication (e.g., booking fee, currency)
- **Private Settings**: Require admin authentication (e.g., API keys, internal configurations)

### Access Control
- Only admin users can modify settings
- Public settings are cached for performance
- Audit logging for setting changes (future enhancement)

## Testing

### Manual Testing
1. Change booking fee in admin dashboard
2. Verify updates appear immediately in:
   - Business request forms
   - Payment calculations
   - Invoice displays
   - Summary cards

### Automated Testing
- Unit tests for SystemSettingsContext
- Integration tests for API endpoints
- E2E tests for admin dashboard functionality

## Support

### Troubleshooting
1. **Settings not loading**: Check browser console for API errors
2. **Changes not appearing**: Verify admin permissions and setting is marked as public
3. **Default values used**: Check if Strapi backend is running and accessible

### Logs
- Frontend: Browser console shows setting fetch operations
- Backend: Strapi logs show API requests and errors

This implementation provides a robust, scalable solution for managing the booking fee and other system-wide settings while maintaining backward compatibility and providing excellent user experience.
