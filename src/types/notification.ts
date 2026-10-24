export type NotificationType = 'alert' | 'warning' | 'info' | 'success';

export type NotificationCategory = 'attendance' | 'oil_service' | 'fleet' | 'security' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  timestamp: string; // Jalali or relative string
  read: boolean;
  actionTab?: 'ATTENDANCE' | 'DRIVERS' | 'STAFF' | 'OIL_SERVICE' | 'REGULATIONS';
  actionLabel?: string;
  badge?: string;
}
