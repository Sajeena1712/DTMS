import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const openNotifications = useCallback(() => setIsNotificationOpen(true), []);
  const closeNotifications = useCallback(() => setIsNotificationOpen(false), []);

  return (
    <NotificationContext.Provider value={{ isNotificationOpen, openNotifications, closeNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
