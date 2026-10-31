export type PhonebookCategory =
  | 'ALL'
  | 'FAVORITES'
  | 'DRIVER'        // رانندگان ناوگان
  | 'STAFF'         // کادر و پرسنل سازمانی
  | 'CONTRACTOR'    // باربری‌ها و پیمانکاران همکار
  | 'WORKSHOP'      // تعمیرگاه‌ها و امداد خودرو
  | 'CUSTOMER'      // مشتریان و نمایندگی‌ها
  | 'EMERGENCY'     // پلیس راه، اورژانس و امداد جاده‌ای
  | 'CUSTOM';       // مخاطب آزاد دیسپچ

export interface PhonebookContact {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  extension?: string;        // شماره داخلی سانترال ویپ (VoIP Extension e.g., 101, 102)
  category: PhonebookCategory;
  organization?: string;     // واحد سازمانی یا نام شرکت/تعمیرگاه
  role?: string;             // سمت سازمانی (مثلاً راننده کفی، مکانیک ارشد)
  email?: string;
  address?: string;
  notes?: string;
  avatarUrl?: string;
  isFavorite?: boolean;      // ستاره‌دار / دسترسی سریع
  isEmergency?: boolean;     // شماره اضطراری
  isCustom?: boolean;        // آیا مخاطب دستی اضافه شده است؟
  personnelCode?: string;    // کد پرسنلی (برای رانندگان و پرسنل)
  vehiclePlate?: string;     // پلاک خودرو (برای رانندگان)
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type PhonebookViewMode =
  | 'ROLODEX'     // کارت‌های تلفنی رولودکس با چیدمان شاخص
  | 'SPEED_DIAL'  // کلیدهای سریع تماس دیسپچ
  | 'TABLE'       // فهرست متراکم اطلاعاتی
  | 'CATEGORY';   // تفکیک سازمانی بر اساس بخش‌ها

export interface PhonebookCustomSettings {
  defaultViewMode: PhonebookViewMode;
  showExtensionsFirst: boolean;
  compactCards: boolean;
  quickDialColumns: 3 | 4 | 5 | 6;
  autoSyncWithFleet: boolean;
  sortBy: 'name' | 'category' | 'favorites' | 'extension';
}

export const DEFAULT_PHONEBOOK_SETTINGS: PhonebookCustomSettings = {
  defaultViewMode: 'ROLODEX',
  showExtensionsFirst: true,
  compactCards: false,
  quickDialColumns: 4,
  autoSyncWithFleet: true,
  sortBy: 'favorites',
};
