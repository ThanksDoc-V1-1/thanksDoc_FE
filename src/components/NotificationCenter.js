'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, XCircle, Clock, X, Check, ExternalLink } from 'lucide-react';

const NotificationCenter = ({ doctorId, className = '' }) => {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!doctorId) return;

    setLoading(true);
    setError(null);
    
    try {
      const [notificationsResponse, summaryResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/doctors/${doctorId}/notifications`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/doctors/${doctorId}/notifications/summary`)
      ]);

      if (notificationsResponse.ok && summaryResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const summaryData = await summaryResponse.json();
        
        setNotifications(notificationsData.data.notifications || []);
        setSummary(summaryData.data);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/doctors/${doctorId}/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      // Update summary
      if (summary) {
        setSummary(prev => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance-documents/doctors/${doctorId}/notifications/read-all`, {
        method: 'PUT'
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      // Update summary
      if (summary) {
        setSummary(prev => ({ ...prev, unreadCount: 0 }));
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Get icon for notification type
  const getIcon = (type, iconName) => {
    const iconProps = { className: "h-5 w-5" };
    
    if (iconName === 'CheckCircle') return <CheckCircle {...iconProps} />;
    if (iconName === 'AlertTriangle') return <AlertTriangle {...iconProps} />;
    if (iconName === 'XCircle') return <XCircle {...iconProps} />;
    if (iconName === 'Clock') return <Clock {...iconProps} />;
    
    // Default icons by type
    switch (type) {
      case 'success': return <CheckCircle {...iconProps} />;
      case 'warning': return <AlertTriangle {...iconProps} />;
      case 'error': return <XCircle {...iconProps} />;
      case 'info': return <Clock {...iconProps} />;
      default: return <Bell {...iconProps} />;
    }
  };

  // Get color classes for notification type
  const getTypeColors = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
          title: 'text-green-800 dark:text-green-300'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-800 dark:text-yellow-300'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-800 dark:text-red-300'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-800 dark:text-blue-300'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          icon: 'text-gray-600 dark:text-gray-400',
          title: 'text-gray-800 dark:text-gray-300'
        };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [doctorId]);

  const unreadCount = summary?.unreadCount || 0;
  const hasUrgent = summary?.hasUrgentNotifications || false;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="h-6 w-6" />
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 h-5 w-5 text-xs font-medium text-white rounded-full flex items-center justify-center ${
            hasUrgent ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div
          className="fixed left-2 right-2 top-14 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 w-auto max-w-[92vw] sm:max-w-none max-h-[70vh] sm:max-h-96 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  title="Mark all as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Try Again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const colors = getTypeColors(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-200 dark:border-gray-800 last:border-b-0 ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    } hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 ${colors.icon}`}>
                        {getIcon(notification.type, notification.icon)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-medium ${colors.title} truncate`}>
                            {notification.title}
                          </h4>
                          
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        
                        {/* Action Button */}
                        {notification.actionRequired && notification.actionUrl && (
                          <div className="mt-2">
                            <a
                              href={notification.actionUrl}
                              className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                            >
                              {notification.actionText || 'Take Action'}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        )}
                        
                        {/* Timestamp */}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={fetchNotifications}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              >
                Refresh Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
