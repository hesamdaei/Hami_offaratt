export type ModulePermission = 'full' | 'view' | 'none';

export interface UserPermissions {
  // Modules access
  attendance: ModulePermission;
  drivers: ModulePermission;
  staff: ModulePermission;
  oilService: ModulePermission;
  regulations: ModulePermission;

  // Administrative / System permissions
  backupRestore: boolean;
  userManagement: boolean;
  networkSettings: boolean; // Reserved for master admin in UI and execution
}

export interface AppUser {
  id: string;
  username: string; // unique
  password?: string; // deprecated plaintext (auto-migrated to PBKDF2)
  passwordHash?: string; // PBKDF2-SHA256 hashed password
  fullName: string;
  roleTitle: string; // e.g. 'مدیریت ارشد سیستم'
  phoneNumber?: string;
  baleId?: string;
  isMasterAdmin: boolean; // true for master admin, cannot be deleted or restricted
  isActive: boolean;
  permissions: UserPermissions;
  createdAt: string;
  lastLoginAt?: string;
  avatarColor?: string;
  sessionToken?: string;
  expiresAt?: string; // ISO 8601 session expiration timestamp
  isRevoked?: boolean;
}

export type SafeAppUser = Omit<AppUser, 'password' | 'passwordHash'>;

export const DEFAULT_MASTER_USER: AppUser = {
  id: 'usr-master-admin',
  username: 'admin',
  password: 'hesam1090',
  fullName: 'مدیر ارشد سامانه',
  roleTitle: 'مدیریت ارشد سیستم',
  isMasterAdmin: true,
  isActive: true,
  permissions: {
    attendance: 'full',
    drivers: 'full',
    staff: 'full',
    oilService: 'full',
    regulations: 'full',
    backupRestore: true,
    userManagement: true,
    networkSettings: true,
  },
  createdAt: '1403/01/01',
  avatarColor: 'from-amber-500 to-orange-600',
};

export const INITIAL_USERS: AppUser[] = [
  DEFAULT_MASTER_USER,
  {
    id: 'usr-operator-01',
    username: 'operator',
    password: '123',
    fullName: 'کارشناس ثبت حضور و تردد',
    roleTitle: 'اپراتور شیفت',
    isMasterAdmin: false,
    isActive: true,
    permissions: {
      attendance: 'full',
      drivers: 'view',
      staff: 'view',
      oilService: 'none',
      regulations: 'view',
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
    },
    createdAt: '1403/07/01',
    avatarColor: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'usr-fleet-02',
    username: 'fleet_admin',
    password: '123',
    fullName: 'مسئول ناوگان و خودروها',
    roleTitle: 'مدیر فنی و ترابری',
    isMasterAdmin: false,
    isActive: true,
    permissions: {
      attendance: 'view',
      drivers: 'full',
      staff: 'none',
      oilService: 'full',
      regulations: 'full',
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
    },
    createdAt: '1403/07/15',
    avatarColor: 'from-emerald-500 to-teal-600',
  },
];
