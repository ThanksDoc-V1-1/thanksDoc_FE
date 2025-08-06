'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, X, ExternalLink } from 'lucide-react';

const NotificationBanner = ({ doctorId, className = '' }) => {
  const [urgentNotifications, setUrgentNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch urgent notifications
  const fetchUrgentNotifications = async () => {
    if (!doctorId) return;

    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/doctors/${doctorId}/notifications`);
      
      if (response.ok) {
        const data = await response.json();
        const notifications = data.data.notifications || [];
        
        // Filter for urgent notifications (error type with action required)
        const urgent = notifications.filter(n => 
          (n.type === 'error' && n.actionRequired) || 
          (n.type === 'warning' && n.actionRequired && n.category === 'verification')
        );
        
        setUrgentNotifications(urgent);
      }
    } catch (err) {
      console.error('Error fetching urgent notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dismiss notification
  const dismissNotification = (notificationId) => {
    setDismissed(prev => new Set([...prev, notificationId]));
  };

  useEffect(() => {
    fetchUrgentNotifications();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchUrgentNotifications, 60000);
    return () => clearInterval(interval);
  }, [doctorId]);

  // Filter out dismissed notifications
  const visibleNotifications = urgentNotifications.filter(n => !dismissed.has(n.id));

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 mb-6 ${className}`}>
      {visibleNotifications.map((notification) => {
        const isError = notification.type === 'error';
        
        return (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border-l-4 ${
              isError
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className={`flex-shrink-0 ${
                  isError ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {isError ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium ${
                    isError 
                      ? 'text-red-800 dark:text-red-300' 
                      : 'text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {notification.title}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    isError 
                      ? 'text-red-700 dark:text-red-400' 
                      : 'text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {notification.message}
                  </p>
                  
                  {/* Action Button */}
                  {notification.actionUrl && (
                    <div className="mt-3">
                      <a
                        href={notification.actionUrl}
                        className={`inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                          isError
                            ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
                            : 'bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600'
                        }`}
                      >
                        {notification.actionText || 'Take Action'}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Dismiss Button */}
              <button
                onClick={() => dismissNotification(notification.id)}
                className={`flex-shrink-0 ml-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  isError 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationBanner;
