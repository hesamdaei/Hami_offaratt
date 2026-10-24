export type AuditActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_PASSWORD_RESET'
  | 'USER_TOGGLE_ACTIVE'
  | 'ATTENDANCE_STATUS_CHANGE'
  | 'ATTENDANCE_RANGE_ASSIGN'
  | 'DRIVER_CREATE'
  | 'DRIVER_UPDATE'
  | 'DRIVER_DELETE'
  | 'DRIVER_TOGGLE_ACTIVE'
  | 'STAFF_CREATE'
  | 'STAFF_UPDATE'
  | 'STAFF_DELETE'
  | 'STAFF_TOGGLE_ACTIVE'
  | 'OIL_SERVICE_UPDATE'
  | 'VEHICLE_ASSIGN_DRIVER'
  | 'VEHICLE_UNASSIGN_DRIVER'
  | 'REGULATION_UPDATE'
  | 'BACKUP_EXPORT'
  | 'BACKUP_RESTORE'
  | 'NETWORK_SYNC';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';

export type AuditModule =
  | 'AUTH'
  | 'USERS'
  | 'ATTENDANCE'
  | 'DRIVERS'
  | 'STAFF'
  | 'OIL_SERVICE'
  | 'FLEET'
  | 'REGULATIONS'
  | 'BACKUP'
  | 'SYSTEM';

export interface AuditLogItem {
  id: string;
  timestamp: string; // ISO string
  jalaaliDate: string; // e.g. 1403/07/26
  time: string; // e.g. 15:42:19
  userId: string;
  userName: string;
  userFullName: string;
  userRole?: string;
  userAvatarColor?: string;
  action: AuditActionType;
  module: AuditModule;
  title: string; // Brief Persian summary
  description: string; // Detailed Persian description
  targetId?: string;
  targetName?: string;
  severity: AuditSeverity;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
  clientIp?: string;
  device?: string;
}

export interface AuditFilterState {
  searchQuery: string;
  userId: string; // 'ALL' or specific userId
  module: AuditModule | 'ALL';
  severity: AuditSeverity | 'ALL';
  startDate?: string;
  endDate?: string;
}
