import { VoipConfig } from './voip';

export type ModulePermission = 'full' | 'view' | 'none';

export type PermissionModuleKey =
  | 'attendance'
  | 'vehicleAssignment'
  | 'drivers'
  | 'staff'
  | 'fleetManagement'
  | 'oilService'
  | 'orders'
  | 'operations'
  | 'handover'
  | 'customers'
  | 'finance'
  | 'regulations'
  | 'phonebook'
  | 'reports'
  | 'developerDocs';

export interface UserPermissions {
  // ماژول‌ها و منوهای واقعی سامانه
  attendance: ModulePermission;
  vehicleAssignment?: ModulePermission;
  drivers: ModulePermission;
  staff: ModulePermission;
  fleetManagement?: ModulePermission;
  oilService: ModulePermission;
  orders?: ModulePermission; // سفارش‌ها و رزرو بار (پیش‌فرض: فقط ادمین اصلی مگر اعطا شود)
  operations?: ModulePermission; // عملیات و اعزام دیسپچ
  handover?: ModulePermission; // برگه و صورت‌جلسه ۶۶ قلمی تحویل خودرو
  customers?: ModulePermission; // مشتریان و رهگیری بار
  finance?: ModulePermission; // امور مالی و تعرفه‌ها (پیش‌فرض: فقط ادمین اصلی مگر اعطا شود)
  regulations: ModulePermission;
  phonebook?: ModulePermission; // دفترچه تلفن هوشمند و سانترال
  reports?: ModulePermission; // مشاهده بخش گزارش‌ها (خروجی اکسل منحصراً ویژه مدیر ارشد)
  developerDocs?: ModulePermission; // مستندات فنی و راهنمای توسعه

  // مجوزهای عملیات حساس و سیستمی (مستقل از مجوز مشاهده/ویرایش عادی)
  canDeleteRecords?: boolean; // مجوز حذف رکوردها (پرونده، سفارش، کارکرد، لاگ)
  canExportExcel?: boolean; // مجوز دریافت گزارش اکسل (منحصراً برای مدیر ارشد اعمال می‌شود)
  backupRestore: boolean;
  userManagement: boolean;
  networkSettings: boolean; // Reserved for master admin in UI and execution
  voipSettings?: boolean;
}

export interface AppUser {
  id: string;
  username: string; // unique & immutable after creation
  email?: string; // for password recovery & notifications
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
  updatedAt?: string;
  lastLoginAt?: string;
  avatarColor?: string;
  sessionToken?: string;
  expiresAt?: string; // ISO 8601 session expiration timestamp
  isRevoked?: boolean;
  recoveryCode?: string;
  recoveryCodeExpiresAt?: string;

  // اتصال یکپارچه حساب کاربری سیستمی با پرونده پرسنلی / راننده
  staffId?: string; // شناسه پرونده پرسنل متصل (در صورت وجود)
  driverId?: string; // شناسه پرونده راننده متصل (در صورت وجود)
  personnelCode?: string; // کد پرسنلی مرتبط
  dossierType?: 'STAFF' | 'DRIVER' | 'SYSTEM'; // نوع پرونده متصل
  createdFrom?: 'USER_MANAGEMENT' | 'STAFF_DOSSIER' | 'DRIVER_DOSSIER' | 'SYSTEM_SEED'; // محل ایجاد حساب

  // تنظیمات اختصاصی مرکز تلفن و داخلی ویپ برای هر کاربر به صورت مجزا
  voipConfig?: Partial<VoipConfig>;
}

export type SafeAppUser = Omit<AppUser, 'password' | 'passwordHash' | 'recoveryCode'>;

export const DEFAULT_MASTER_USER: AppUser = {
  id: 'usr-master-admin',
  username: 'admin',
  email: 'hesam.daei@gmail.com',
  password: 'hesam1090',
  fullName: 'مدیر ارشد سامانه',
  roleTitle: 'مدیریت ارشد سیستم',
  phoneNumber: '09120000000',
  isMasterAdmin: true,
  isActive: true,
  dossierType: 'SYSTEM',
  createdFrom: 'SYSTEM_SEED',
  permissions: {
    attendance: 'full',
    vehicleAssignment: 'full',
    drivers: 'full',
    staff: 'full',
    fleetManagement: 'full',
    oilService: 'full',
    orders: 'full',
    operations: 'full',
    handover: 'full',
    customers: 'full',
    finance: 'full',
    regulations: 'full',
    phonebook: 'full',
    reports: 'full',
    developerDocs: 'full',
    canDeleteRecords: true,
    canExportExcel: true,
    backupRestore: true,
    userManagement: true,
    networkSettings: true,
    voipSettings: true,
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
    dossierType: 'SYSTEM',
    createdFrom: 'SYSTEM_SEED',
    permissions: {
      attendance: 'full',
      vehicleAssignment: 'view',
      drivers: 'view',
      staff: 'view',
      fleetManagement: 'view',
      oilService: 'none',
      orders: 'none',
      operations: 'view',
      handover: 'view',
      customers: 'view',
      finance: 'none',
      regulations: 'view',
      phonebook: 'view',
      reports: 'none',
      developerDocs: 'view',
      canDeleteRecords: false,
      canExportExcel: false,
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
      voipSettings: false,
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
    dossierType: 'SYSTEM',
    createdFrom: 'SYSTEM_SEED',
    permissions: {
      attendance: 'view',
      vehicleAssignment: 'full',
      drivers: 'full',
      staff: 'none',
      fleetManagement: 'full',
      oilService: 'full',
      orders: 'none',
      operations: 'full',
      handover: 'full',
      customers: 'view',
      finance: 'none',
      regulations: 'full',
      phonebook: 'view',
      reports: 'none',
      developerDocs: 'view',
      canDeleteRecords: false,
      canExportExcel: false,
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
      voipSettings: false,
    },
    createdAt: '1403/07/15',
    avatarColor: 'from-emerald-500 to-teal-600',
  },
];


