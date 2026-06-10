/**
 * Notification Center
 * Displays toast notifications
 */

import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

// Notification store (simple implementation)
const notifications = [];
const listeners = new Set();

export const notificationStore = {
  notifications: [],
  
  addNotification: (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: notification.type || 'info',
      message: notification.message,
      duration: notification.duration || 5000,
      timestamp: Date.now()
    };
    
    notifications.push(newNotification);
    listeners.forEach(listener => listener([...notifications]));
    
    // Auto-remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        notificationStore.removeNotification(id);
      }, newNotification.duration);
    }
    
    return id;
  },
  
  removeNotification: (id) => {
    const index = notifications.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.splice(index, 1);
      listeners.forEach(listener => listener([...notifications]));
    }
  },
  
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  
  getNotifications: () => [...notifications]
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(setNotifications);
    setNotifications(notificationStore.getNotifications());
    return unsubscribe;
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-center">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => notificationStore.removeNotification(notification.id)}
        >
          <div className="notification-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✗'}
            {notification.type === 'warning' && '⚠'}
            {notification.type === 'info' && 'ℹ'}
          </div>
          <div className="notification-message">
            {typeof notification.message === 'string' 
              ? notification.message 
              : notification.message?.message || String(notification.message || 'Notification')}
          </div>
          <button 
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              notificationStore.removeNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// Export helper function for easy notification creation
export const notify = (notification, type = null, duration = 5000) => {
  // Handle both object and string formats
  if (typeof notification === 'string') {
    return notificationStore.addNotification({ message: notification, type: type || 'info', duration });
  } else if (typeof notification === 'object' && notification !== null) {
    // Extract message, type, and title from notification object
    const message = notification.message || notification.title || String(notification);
    const notificationType = notification.type || type || 'info';
    return notificationStore.addNotification({ 
      message: typeof message === 'string' ? message : String(message),
      type: notificationType,
      duration: notification.duration || duration
    });
  } else {
    // Fallback for other types
    return notificationStore.addNotification({ 
      message: String(notification), 
      type: type || 'info', 
      duration 
    });
  }
};

