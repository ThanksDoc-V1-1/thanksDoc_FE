export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

export function formatCurrency(amount, currency = 'GBP') {
  // Always use pound sign for UK currency
  const numAmount = Number(amount) || 0;
  return `£${numAmount.toFixed(2)}`;
}

export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(date));
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
