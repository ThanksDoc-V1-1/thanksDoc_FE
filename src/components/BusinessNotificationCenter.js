'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, XCircle, Clock, X, Check, ExternalLink, FileX, Upload } from 'lucide-react';

const BusinessNotificationCenter = ({ businessId, className = '' }) => {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!businessId) return;

    setLoading(true);
    setError(null);
    
    try {
      const [notificationsResponse, summaryResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/business/${businessId}/notifications`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/business/${businessId}/notifications/summary`)
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
      console.error('Error fetching business notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/business/${businessId}/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/business/${businessId}/notifications/read-all`, {
        method: 'PUT'
      });
      
      // Update local state
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setSummary(prev => ({ ...prev, unreadCount: 0 }));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Auto-refresh notifications
  useEffect(() => {
    fetchNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [businessId]);

  // Get icon for notification type
  const getNotificationIcon = (type, priority) => {
    const baseClass = "h-5 w-5";
    
    switch (type) {
      case 'document_missing':
        return <FileX className={`${baseClass} text-red-500`} />;
      case 'document_expiring':
        return <AlertTriangle className={`${baseClass} text-orange-500`} />;
      case 'document_expired':
        return <XCircle className={`${baseClass} text-red-600`} />;
      case 'upload_required':
        return <Upload className={`${baseClass} text-blue-500`} />;
      case 'verification_pending':
        return <Clock className={`${baseClass} text-yellow-500`} />;
      default:
        return <Bell className={`${baseClass} text-gray-500`} />;
    }
  };

  // Get notification color based on type and priority
  const getNotificationColor = (type, priority, isDarkMode) => {
    if (priority === 'high') {
      return isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200';
    }
    if (priority === 'medium') {
      return isDarkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200';
    }
    return isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200';
  };

  // Get readable time
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!businessId) return null;

  const unreadCount = summary?.unreadCount || 0;
  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className={`relative p-2 rounded-lg transition-colors ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-300' 
            : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className={`absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto rounded-lg shadow-lg border z-50 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Compliance Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className={`p-1 rounded hover:bg-gray-100 ${
                    isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading notifications...
                </div>
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm text-red-500">{error}</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle className={`h-12 w-12 mx-auto mb-3 ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <div className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  All caught up!
                </div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  No compliance notifications at the moment
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-l-4 ${
                      notification.read 
                        ? 'border-transparent' 
                        : getNotificationColor(notification.type, notification.priority, isDarkMode)
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      // Navigate to compliance documents if available
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </div>
                        <div className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        } mt-1`}>
                          {notification.message}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {getTimeAgo(notification.createdAt)}
                          </span>
                          {notification.actionUrl && (
                            <ExternalLink className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`px-4 py-3 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <a
                href="/business/compliance-documents"
                className={`text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center space-x-1`}
              >
                <span>View All Compliance Documents</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessNotificationCenter;
