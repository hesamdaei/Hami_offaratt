import { ComponentType } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  PhoneCall,
  Compass,
  PackageCheck,
  ScanLine,
  Calculator,
  Truck,
  Droplet,
  FileCheck,
  Users,
  UserCheck,
  BookOpen,
  FileSpreadsheet,
  Shield,
  Code2,
  Activity,
  Layers,
  Wrench,
  FolderKanban,
  Settings,
} from 'lucide-react';
import { AppUser, SafeAppUser } from '../types/auth';
import { canAccessTab } from '../utils/authService';

export type ActiveAppTab =
  | 'DASHBOARD'
  | 'ATTENDANCE'
  | 'VEHICLE_ASSIGNMENT'
  | 'DRIVERS'
  | 'STAFF'
  | 'FLEET_MANAGEMENT'
  | 'OIL_SERVICE'
  | 'HANDOVER'
  | 'CUSTOMERS'
  | 'ORDERS'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'REGULATIONS'
  | 'REPORTS'
  | 'USERS_LOGS'
  | 'PHONEBOOK'
  | 'DEVELOPER_DOCS';

export type NavGroupId =
  | 'CORE_DAILY'
  | 'DISPATCH_CARGO'
  | 'FLEET_MAINTENANCE'
  | 'HR_DOSSIERS'
  | 'ADMIN_REPORTS';

export interface NavItemDefinition {
  id: ActiveAppTab;
  groupId: NavGroupId;
  label: string;
  shortLabel: string;
  description: string;
  keywords: string[];
  icon: ComponentType<{ className?: string }>;
  isQuickAccess?: boolean;
}

export interface NavGroupDefinition {
  id: NavGroupId;
  title: string;
  shortTitle: string;
  icon: ComponentType<{ className?: string }>;
  defaultExpanded?: boolean;
  items: NavItemDefinition[];
}

/**
 * معماری یکپارچه اطلاعات (Information Architecture) و ساختار منوهای سامانه حامی
 * منبع واحد حقیقت (Single Source of Truth) برای سایدبار، هدر، ناوبری موبایل، جستجوی سریع و مسیرهای URL
 */
export const NAVIGATION_GROUPS: NavGroupDefinition[] = [
  {
    id: 'CORE_DAILY',
    title: 'پیشخوان و عملیات روزمره',
    shortTitle: 'پیشخوان روزمره',
    icon: Activity,
    defaultExpanded: true,
    items: [
      {
        id: 'DASHBOARD',
        groupId: 'CORE_DAILY',
        label: 'داشبورد عملیات',
        shortLabel: 'داشبورد',
        description: 'نمای کلان وضعیت ناوگان، حضور و غیاب و هشدارهای سرویس',
        keywords: ['داشبورد', 'پیشخوان', 'آمار', 'پایش', 'dashboard'],
        icon: LayoutDashboard,
        isQuickAccess: true,
      },
      {
        id: 'ATTENDANCE',
        groupId: 'CORE_DAILY',
        label: 'تابلوی حضور و غیاب',
        shortLabel: 'حضور و غیاب',
        description: 'ثبت و مدیریت تردد روزانه رانندگان و پرسنل (حاضر، مرخصی، تعمیرگاه)',
        keywords: ['حضور', 'غیاب', 'مرخصی', 'تردد', 'شیفت', 'attendance'],
        icon: CalendarDays,
        isQuickAccess: true,
      },
      {
        id: 'PHONEBOOK',
        groupId: 'CORE_DAILY',
        label: 'دفترچه تلفن و تماس',
        shortLabel: 'دفترچه تلفن',
        description: 'جستجوی سریع مخاطبین، تماس مستقیم با رانندگان و سانترال ویپ',
        keywords: ['تلفن', 'تماس', 'مخاطبین', 'سانترال', 'ویپ', 'شماره', 'phonebook'],
        icon: PhoneCall,
        isQuickAccess: true,
      },
    ],
  },
  {
    id: 'FLEET_MAINTENANCE',
    title: 'ناوگان و نگهداری فنی',
    shortTitle: 'ناوگان و فنی',
    icon: Wrench,
    defaultExpanded: true,
    items: [
      {
        id: 'OIL_SERVICE',
        groupId: 'FLEET_MAINTENANCE',
        label: 'تعویض روغن و کارکرد',
        shortLabel: 'تعویض روغن',
        description: 'بروزرسانی کیلومتر و سفر، ثبت سریع تعویض روغن و هشدارهای سرویس',
        keywords: ['روغن', 'تعویض روغن', 'کیلومتر', 'سرویس', 'فیلتر', 'کارکرد', 'oil'],
        icon: Droplet,
        isQuickAccess: true,
      },
      {
        id: 'FLEET_MANAGEMENT',
        groupId: 'FLEET_MAINTENANCE',
        label: 'شناسنامه و بیمه ناوگان',
        shortLabel: 'مدیریت ناوگان',
        description: 'مشخصات فنی خودروها، تمدید بیمه‌نامه شخص ثالث، بدنه و معاینه فنی',
        keywords: ['ناوگان', 'خودرو', 'بیمه', 'معاینه فنی', 'پلاک', 'کامیونت', 'fleet'],
        icon: Truck,
        isQuickAccess: true,
      },
      {
        id: 'VEHICLE_ASSIGNMENT',
        groupId: 'FLEET_MAINTENANCE',
        label: 'تخصیص خودرو و راننده',
        shortLabel: 'تخصیص خودرو',
        description: 'واگذاری، جابجایی و انتساب خودروهای ناوگان به رانندگان',
        keywords: ['تخصیص', 'واگذاری', 'انتساب', 'تحویل', 'خودرو آزاد', 'assignment'],
        icon: Layers,
      },
      {
        id: 'HANDOVER',
        groupId: 'FLEET_MAINTENANCE',
        label: 'برگه تحویل خودرو',
        shortLabel: 'تحویل خودرو',
        description: 'صورت‌جلسه رسمی ۶۶ قلمی تجهیزات و بررسی سلامت بدنه خودرو',
        keywords: ['تحویل خودرو', 'صورتجلسه', '۶۶ قلم', 'چک لیست', 'بدنه', 'handover'],
        icon: FileCheck,
      },
    ],
  },
  {
    id: 'HR_DOSSIERS',
    title: 'پرونده‌ها و منابع انسانی',
    shortTitle: 'منابع انسانی',
    icon: FolderKanban,
    defaultExpanded: false,
    items: [
      {
        id: 'DRIVERS',
        groupId: 'HR_DOSSIERS',
        label: 'پرونده رانندگان',
        shortLabel: 'رانندگان',
        description: 'اطلاعات هویتی، گواهینامه، کارت هوشمند، سلامت و حساب کاربری رانندگان',
        keywords: ['رانندگان', 'پرونده راننده', 'گواهینامه', 'کارت سلامت', 'drivers'],
        icon: Users,
      },
      {
        id: 'STAFF',
        groupId: 'HR_DOSSIERS',
        label: 'پرونده پرسنل',
        shortLabel: 'پرسنل',
        description: 'پرونده کارگزینی کادر اداری و عملیاتی، سمت‌ها و دسترسی‌های سیستمی',
        keywords: ['پرسنل', 'کارکنان', 'اداری', 'کارگزینی', 'staff'],
        icon: UserCheck,
      },
      {
        id: 'REGULATIONS',
        groupId: 'HR_DOSSIERS',
        label: 'آیین‌نامه انضباطی',
        shortLabel: 'آیین‌نامه',
        description: 'ضوابط کاری، منشور اخلاقی و چاپ تعهدنامه رسمی رانندگان',
        keywords: ['آیین نامه', 'مقررات', 'انضباطی', 'تعهدنامه', 'قوانین', 'regulations'],
        icon: BookOpen,
      },
    ],
  },
  {
    id: 'DISPATCH_CARGO',
    title: 'عملیات بار و دیسپچ',
    shortTitle: 'عملیات بار',
    icon: Compass,
    defaultExpanded: false,
    items: [
      {
        id: 'OPERATIONS',
        groupId: 'DISPATCH_CARGO',
        label: 'اعزام و دیسپچ ناوگان',
        shortLabel: 'اعزام و دیسپچ',
        description: 'مدیریت میدانی مأموریت‌ها، وضعیت اعزام و هماهنگی سیر ناوگان',
        keywords: ['اعزام', 'دیسپچ', 'ماموریت', 'سیر', 'operations'],
        icon: Compass,
      },
      {
        id: 'ORDERS',
        groupId: 'DISPATCH_CARGO',
        label: 'سفارش‌ها و رزرو بار',
        shortLabel: 'سفارش‌ها',
        description: 'ثبت سفارش حمل، صدور حواله و پیگیری وضعیت بارنامه‌ها',
        keywords: ['سفارش', 'رزرو بار', 'بارنامه', 'حمل', 'orders'],
        icon: PackageCheck,
      },
      {
        id: 'CUSTOMERS',
        groupId: 'DISPATCH_CARGO',
        label: 'رهگیری مرسولات',
        shortLabel: 'رهگیری بار',
        description: 'استعلام لحظه‌ای وضعیت محموله با کد رهگیری ویژه مشتریان',
        keywords: ['مشتریان', 'رهگیری', 'مرسوله', 'پیگیری بار', 'customers'],
        icon: ScanLine,
      },
      {
        id: 'FINANCE',
        groupId: 'DISPATCH_CARGO',
        label: 'تعرفه و محاسبه کرایه',
        shortLabel: 'تعرفه و مالی',
        description: 'ماشین‌حساب هوشمند کرایه حمل، تعرفه مسیرها و صدور پیش‌فاکتور',
        keywords: ['مالی', 'تعرفه', 'کرایه', 'ماشین حساب', 'فاکتور', 'finance'],
        icon: Calculator,
      },
    ],
  },
  {
    id: 'ADMIN_REPORTS',
    title: 'گزارش‌ها و مدیریت سیستم',
    shortTitle: 'مدیریت سیستم',
    icon: Settings,
    defaultExpanded: false,
    items: [
      {
        id: 'REPORTS',
        groupId: 'ADMIN_REPORTS',
        label: 'گزارش‌های مدیریتی (اکسل)',
        shortLabel: 'گزارش‌ها',
        description: 'تحلیل جامع تردد و کارکرد ناوگان و خروجی اکسل (ویژه مدیر ارشد)',
        keywords: ['گزارش', 'اکسل', 'آمار', 'تحلیل', 'excel', 'reports'],
        icon: FileSpreadsheet,
      },
      {
        id: 'USERS_LOGS',
        groupId: 'ADMIN_REPORTS',
        label: 'کاربران و سطوح دسترسی',
        shortLabel: 'مدیریت کاربران',
        description: 'مدیریت یکپارچه حساب‌های کاربری، نقش‌ها، مجوزها و لاگ امنیتی سیستم',
        keywords: ['کاربران', 'دسترسی', 'امنیت', 'لاگ', 'نقش', 'رمز عبور', 'users'],
        icon: Shield,
      },
      {
        id: 'DEVELOPER_DOCS',
        groupId: 'ADMIN_REPORTS',
        label: 'مستندات فنی سیستم',
        shortLabel: 'مستندات فنی',
        description: 'معماری سامانه، راهنمای APIها، دیتابیس، سانترال ویپ و بروزرسانی',
        keywords: ['مستندات', 'فنی', 'راهنما', 'توسعه دهنده', 'api', 'docs'],
        icon: Code2,
      },
    ],
  },
];

export const ALL_NAVIGATION_ITEMS: NavItemDefinition[] = NAVIGATION_GROUPS.flatMap(
  (g) => g.items
);

export const VALID_APP_TABS = new Set<ActiveAppTab>(
  ALL_NAVIGATION_ITEMS.map((item) => item.id)
);

export function getNavItemByTab(tab: ActiveAppTab | string): NavItemDefinition | undefined {
  return ALL_NAVIGATION_ITEMS.find((item) => item.id === tab);
}

export function getNavGroupByTab(tab: ActiveAppTab | string): NavGroupDefinition | undefined {
  return NAVIGATION_GROUPS.find((group) => group.items.some((item) => item.id === tab));
}

/**
 * فیلتر کردن گروه‌ها و زیرمنوها بر اساس نقش و مجوزهای واقعی کاربر
 * گروه والد فقط زمانی نمایش داده می‌شود که دست‌کم یک زیرمنوی مجاز داشته باشد
 */
export function getVisibleNavigationGroups(
  user: AppUser | SafeAppUser | null | undefined
): NavGroupDefinition[] {
  return NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessTab(user, item.id)),
  })).filter((group) => group.items.length > 0);
}

export function getVisibleNavigationItems(
  user: AppUser | SafeAppUser | null | undefined
): NavItemDefinition[] {
  return ALL_NAVIGATION_ITEMS.filter((item) => canAccessTab(user, item.id));
}
