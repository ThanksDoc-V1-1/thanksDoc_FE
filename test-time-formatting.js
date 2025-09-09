// Test script to verify time formatting fix

// Simulate the formatDate function
function formatDate(date, options = {}) {
  if (!date) {
    return 'Not specified';
  }
  
  try {
    // Handle both Date objects and string formats
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    // For service request times that end with Z (UTC), parse manually to preserve original time
    if (typeof date === 'string' && date.endsWith('Z') && date.includes('T')) {
      const [datePart, timePart] = date.replace('Z', '').split('T');
      const [year, month, day] = datePart.split('-');
      const [hours, minutes] = timePart.split(':');
      
      const hour24 = parseInt(hours);
      const minute = parseInt(minutes);
      const isPM = hour24 >= 12;
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const minuteStr = minute.toString().padStart(2, '0');
      const timeString = `${hour12}:${minuteStr} ${isPM ? 'PM' : 'AM'}`;
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[parseInt(month) - 1];
      
      return `${monthName} ${parseInt(day)}, ${year} at ${timeString}`;
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', date);
    return 'Invalid date';
  }
}

// Test cases
console.log('=== Time Formatting Test ===\n');

// Test the problematic case: 11:11 service time
const serviceDateTime = '2025-09-24T11:11:00.000Z';
console.log('Input:', serviceDateTime);
console.log('Expected output: September 24, 2025 at 11:11 AM');
console.log('Actual output:  ', formatDate(serviceDateTime));
console.log('✅ Fixed:', formatDate(serviceDateTime).includes('11:11 AM') ? 'YES' : 'NO');

console.log('\n=== Additional Test Cases ===\n');

// Test other times
const testCases = [
  '2025-09-24T14:30:00.000Z', // 2:30 PM
  '2025-09-24T00:00:00.000Z', // 12:00 AM
  '2025-09-24T12:00:00.000Z', // 12:00 PM
  '2025-09-24T23:59:00.000Z', // 11:59 PM
  '2025-09-24T09:05:00.000Z', // 9:05 AM
];

testCases.forEach(testCase => {
  console.log(`Input: ${testCase}`);
  console.log(`Output: ${formatDate(testCase)}`);
  console.log('---');
});

console.log('\n=== Comparison with old function ===\n');

// Old function behavior (using Intl.DateTimeFormat)
function oldFormatDate(date) {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

console.log('Input: 2025-09-24T11:11:00.000Z');
console.log('Old function:', oldFormatDate('2025-09-24T11:11:00.000Z'));
console.log('New function:', formatDate('2025-09-24T11:11:00.000Z'));
