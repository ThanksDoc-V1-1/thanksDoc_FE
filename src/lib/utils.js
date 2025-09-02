export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Radius of the Earth in miles (was 6371 km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in miles
  return distance;
}

export function formatCurrency(amount, currency = 'GBP') {
  // Always use pound sign for UK currency
  const numAmount = Number(amount) || 0;
  
  // Handle edge cases for very long decimals or scientific notation
  if (!isFinite(numAmount)) {
    return '£0.00';
  }
  
  // Round to 2 decimal places to prevent floating point precision issues
  const roundedAmount = Math.round(numAmount * 100) / 100;
  
  return `£${roundedAmount.toFixed(2)}`;
}

export function formatDuration(duration) {
  // Convert duration to number and handle edge cases
  const numDuration = Number(duration) || 0;
  
  // Handle edge cases
  if (!isFinite(numDuration) || numDuration < 0) {
    return 0;
  }
  
  // Round to 2 decimal places for display purposes
  // This prevents long decimals like 0.3333333333333
  return Math.round(numDuration * 100) / 100;
}

export function formatDate(date, options = {}) {
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

export function getUrgencyColor(urgency, isDarkMode = true) {
  if (isDarkMode) {
    switch (urgency) {
      case 'low':
        return 'bg-green-900/30 text-green-400';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'high':
        return 'bg-orange-900/30 text-orange-400';
      case 'emergency':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  } else {
    // Light mode - darker backgrounds for better visibility
    switch (urgency) {
      case 'low':
        return 'bg-green-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'emergency':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }
}

export function getStatusColor(status, isDarkMode = true) {
  if (isDarkMode) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'accepted':
        return 'bg-green-900/30 text-green-400';
      case 'rejected':
        return 'bg-red-900/30 text-red-400';
      case 'in_progress':
        return 'bg-purple-900/30 text-purple-400';
      case 'completed':
        return 'bg-blue-900/30 text-blue-400';
      case 'cancelled':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  } else {
    // Light mode - darker backgrounds for better visibility
    switch (status) {
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'accepted':
        return 'bg-green-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'in_progress':
        return 'bg-purple-600 text-white';
      case 'completed':
        return 'bg-blue-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }
}

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone) {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function getTimeElapsed(date) {
  const now = new Date();
  const requestTime = new Date(date);
  const diffInMinutes = Math.floor((now - requestTime) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Filter doctors by distance from business location
export function filterDoctorsByDistance(doctors, businessLocation, maxDistanceMiles) {
  if (!businessLocation || !businessLocation.latitude || !businessLocation.longitude || maxDistanceMiles === -1) {
    return doctors; // Return all doctors if no location or no distance limit
  }

  return doctors.filter(doctor => {
    if (!doctor.latitude || !doctor.longitude) {
      return false; // Exclude doctors without location data
    }

    const distance = calculateDistance(
      businessLocation.latitude,
      businessLocation.longitude,
      doctor.latitude,
      doctor.longitude
    );

    return distance <= maxDistanceMiles;
  });
}

// Sort doctors by distance from business location
export function sortDoctorsByDistance(doctors, businessLocation) {
  if (!businessLocation || !businessLocation.latitude || !businessLocation.longitude) {
    return doctors; // Return original order if no location
  }

  return [...doctors].sort((a, b) => {
    // Doctors without location go to the end
    if (!a.latitude || !a.longitude) return 1;
    if (!b.latitude || !b.longitude) return -1;

    const distanceA = calculateDistance(
      businessLocation.latitude,
      businessLocation.longitude,
      a.latitude,
      a.longitude
    );

    const distanceB = calculateDistance(
      businessLocation.latitude,
      businessLocation.longitude,
      b.latitude,
      b.longitude
    );

    return distanceA - distanceB;
  });
}

// Get doctor distance from business
export function getDoctorDistance(doctor, businessLocation) {
  if (!businessLocation || !businessLocation.latitude || !businessLocation.longitude ||
      !doctor.latitude || !doctor.longitude) {
    return null;
  }

  return calculateDistance(
    businessLocation.latitude,
    businessLocation.longitude,
    doctor.latitude,
    doctor.longitude
  );
}

// Format distance for display
export function formatDistance(distanceMiles) {
  if (distanceMiles === null || distanceMiles === undefined) {
    return 'Distance unknown';
  }
  
  if (distanceMiles < 0.1) {
    // Convert to feet for very short distances (1 mile = 5280 feet)
    return `${Math.round(distanceMiles * 5280)}ft away`;
  } else if (distanceMiles < 10) {
    return `${distanceMiles.toFixed(1)} miles away`;
  } else {
    return `${Math.round(distanceMiles)} miles away`;
  }
}
