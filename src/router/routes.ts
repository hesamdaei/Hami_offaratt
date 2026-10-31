/**
 * سامانه لجستیک و ترابری «حامی» - نسخه Beta 1.1786.1
 * تعاریف رسمی و مستقل مسیرهای نرم‌افزار (Routing Architecture)
 */

import { ComponentType } from 'react';
import { AppUser } from '../types/auth';
import { isMasterAdmin, canViewModule, canManageUsers, canManageSystemSettings } from '../utils/authService';

export type AppRouteId =
  | 'DASHBOARD'
  | 'ATTENDANCE'
  | 'DRIVERS'
  | 'DRIVER_NEW'
  | 'DRIVER_DETAIL'
  | 'DRIVER_EDIT'
  | 'TRUCKS'
  | 'TRUCK_NEW'
  | 'TRUCK_DETAIL'
  | 'VEHICLE_ASSIGNMENT'
  | 'HANDOVER'
  | 'STAFF'
  | 'CUSTOMERS'
  | 'ORDERS'
  | 'ORDER_NEW'
  | 'ORDER_DETAIL'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'REPORTS'
  | 'USERS'
  | 'ACTIVITY_LOGS'
  | 'PHONEBOOK'
  | 'REGULATIONS'
  | 'SETTINGS'
  | 'NOT_FOUND';

export interface RouteConfig {
  id: AppRouteId;
  path: string; // e.g. "/drivers", "/drivers/:id"
  aliasPaths?: string[]; // e.g. ["/vehicles"] for "/trucks"
  title: string; // e.g. "پرونده رانندگان"
  browserTitle: string; // e.g. "حامی | رانندگان ناوگان"
  category: 'OPERATIONS' | 'FLEET_HUMAN' | 'MANAGEMENT' | 'SYSTEM';
  requiredPermission?: 'attendance' | 'drivers' | 'staff' | 'oilService' | 'regulations' | 'userManagement' | 'reports' | 'settings';
  masterAdminOnly?: boolean;
  navTabId?: string; // Maps to activeTab in header/sidebar
  breadcrumb: Array<{ label: string; path?: string }>;
}

export const APP_ROUTES: RouteConfig[] = [
  // 1. صفحه اصلی و داشبورد عملیات
  {
    id: 'DASHBOARD',
    path: '/dashboard',
    aliasPaths: ['/'],
    title: 'داشبورد عملیات',
    browserTitle: 'حامی | داشبورد عملیات و پایش ترابری',
    category: 'OPERATIONS',
    navTabId: 'DASHBOARD',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'داشبورد عملیات' }],
  },

  // 2. تابلوی حضور و غیاب
  {
    id: 'ATTENDANCE',
    path: '/attendance',
    title: 'حضور و غیاب رانندگان و پرسنل',
    browserTitle: 'حامی | تابلوی حضور و غیاب',
    category: 'OPERATIONS',
    requiredPermission: 'attendance',
    navTabId: 'ATTENDANCE',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'حضور و غیاب' }],
  },

  // 3. رانندگان ناوگان
  {
    id: 'DRIVERS',
    path: '/drivers',
    title: 'پرونده رانندگان',
    browserTitle: 'حامی | دایرکتوری و پرونده رانندگان',
    category: 'FLEET_HUMAN',
    requiredPermission: 'drivers',
    navTabId: 'DRIVERS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'رانندگان ناوگان' }],
  },
  {
    id: 'DRIVER_NEW',
    path: '/drivers/new',
    title: 'ثبت راننده جدید',
    browserTitle: 'حامی | ثبت پرونده راننده جدید',
    category: 'FLEET_HUMAN',
    requiredPermission: 'drivers',
    navTabId: 'DRIVERS',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'رانندگان', path: '/drivers' },
      { label: 'ثبت راننده جدید' },
    ],
  },
  {
    id: 'DRIVER_DETAIL',
    path: '/drivers/:id',
    title: 'مشاهده پرونده راننده',
    browserTitle: 'حامی | مشخصات و سوابق راننده',
    category: 'FLEET_HUMAN',
    requiredPermission: 'drivers',
    navTabId: 'DRIVERS',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'رانندگان', path: '/drivers' },
      { label: 'مشاهده پرونده' },
    ],
  },
  {
    id: 'DRIVER_EDIT',
    path: '/drivers/:id/edit',
    title: 'ویرایش پرونده راننده',
    browserTitle: 'حامی | ویرایش اطلاعات راننده',
    category: 'FLEET_HUMAN',
    requiredPermission: 'drivers',
    navTabId: 'DRIVERS',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'رانندگان', path: '/drivers' },
      { label: 'ویرایش اطلاعات' },
    ],
  },

  // 4. خودروها و ناوگان
  {
    id: 'TRUCKS',
    path: '/trucks',
    aliasPaths: ['/vehicles', '/fleet', '/oil-service'],
    title: 'مدیریت ناوگان و خودروها',
    browserTitle: 'حامی | ناوگان و سرویس‌های فنی',
    category: 'FLEET_HUMAN',
    requiredPermission: 'oilService',
    navTabId: 'OIL_SERVICE',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'ناوگان و خودروها' }],
  },
  {
    id: 'TRUCK_NEW',
    path: '/trucks/new',
    aliasPaths: ['/vehicles/new'],
    title: 'ثبت خودروی جدید',
    browserTitle: 'حامی | ثبت خودرو در ناوگان',
    category: 'FLEET_HUMAN',
    requiredPermission: 'oilService',
    navTabId: 'OIL_SERVICE',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'خودروها', path: '/trucks' },
      { label: 'ثبت خودرو' },
    ],
  },
  {
    id: 'TRUCK_DETAIL',
    path: '/trucks/:id',
    aliasPaths: ['/vehicles/:id'],
    title: 'پرونده فنی خودرو',
    browserTitle: 'حامی | مشخصات فنی خودرو',
    category: 'FLEET_HUMAN',
    requiredPermission: 'oilService',
    navTabId: 'OIL_SERVICE',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'خودروها', path: '/trucks' },
      { label: 'شناسنامه فنی' },
    ],
  },

  // 5. تخصیص و واگذاری خودروها
  {
    id: 'VEHICLE_ASSIGNMENT',
    path: '/assignments',
    aliasPaths: ['/vehicle-assignments'],
    title: 'تخصیص خودرو و راننده',
    browserTitle: 'حامی | واگذاری و انتساب ناوگان',
    category: 'OPERATIONS',
    requiredPermission: 'drivers',
    navTabId: 'VEHICLE_ASSIGNMENT',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'تخصیص خودرو و راننده' }],
  },

  // 6. صورت‌جلسه تحویل خودرو
  {
    id: 'HANDOVER',
    path: '/handover',
    title: 'صورت‌جلسه تحویل خودرو',
    browserTitle: 'حامی | برگه تحویل ۶۶ قلمی خودرو',
    category: 'OPERATIONS',
    requiredPermission: 'drivers',
    navTabId: 'HANDOVER',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'صورت‌جلسه تحویل خودرو' }],
  },

  // 7. پرسنل و کارکنان
  {
    id: 'STAFF',
    path: '/staff',
    title: 'پرونده پرسنل',
    browserTitle: 'حامی | مشخصات و احکام پرسنل',
    category: 'FLEET_HUMAN',
    requiredPermission: 'staff',
    navTabId: 'STAFF',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'پرونده پرسنل' }],
  },

  // 8. مشتریان و رهگیری بار
  {
    id: 'CUSTOMERS',
    path: '/customers',
    title: 'مشتریان و رهگیری بار',
    browserTitle: 'حامی | پرتال رهگیری مشتریان',
    category: 'OPERATIONS',
    navTabId: 'CUSTOMERS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'مشتریان و رهگیری' }],
  },

  // 9. سفارش‌ها و بارها
  {
    id: 'ORDERS',
    path: '/orders',
    title: 'سفارش‌ها و بارها',
    browserTitle: 'حامی | مدیریت سفارش‌ها و رزروها',
    category: 'OPERATIONS',
    navTabId: 'ORDERS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'سفارش‌ها و بارها' }],
  },
  {
    id: 'ORDER_NEW',
    path: '/orders/new',
    title: 'ثبت سفارش بار جدید',
    browserTitle: 'حامی | ثبت سفارش جدید',
    category: 'OPERATIONS',
    navTabId: 'ORDERS',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'سفارش‌ها', path: '/orders' },
      { label: 'ثبت سفارش جدید' },
    ],
  },
  {
    id: 'ORDER_DETAIL',
    path: '/orders/:id',
    title: 'مشاهده جزئیات سفارش',
    browserTitle: 'حامی | جزئیات سفارش و بارنامه',
    category: 'OPERATIONS',
    navTabId: 'ORDERS',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'سفارش‌ها', path: '/orders' },
      { label: 'مشاهده جزئیات سفارش' },
    ],
  },

  // 10. عملیات و اعزام دیسپچ
  {
    id: 'OPERATIONS',
    path: '/operations',
    title: 'عملیات و اعزام ناوگان',
    browserTitle: 'حامی | عملیات و اعزام دیسپچ',
    category: 'OPERATIONS',
    navTabId: 'OPERATIONS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'عملیات و اعزام' }],
  },

  // 11. امور مالی و تعرفه‌ها
  {
    id: 'FINANCE',
    path: '/finance',
    title: 'امور مالی و تعرفه‌ها',
    browserTitle: 'حامی | ماشین‌حساب تعرفه و پیش‌فاکتور',
    category: 'MANAGEMENT',
    navTabId: 'FINANCE',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'امور مالی و تعرفه‌ها' }],
  },

  // 12. گزارش‌های مدیریتی (صرفاً مدیر ارشد)
  {
    id: 'REPORTS',
    path: '/reports',
    title: 'گزارش‌های مدیریتی',
    browserTitle: 'حامی | گزارش‌های جامع مدیریتی',
    category: 'MANAGEMENT',
    requiredPermission: 'reports',
    masterAdminOnly: true,
    navTabId: 'REPORTS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'گزارش‌های مدیریتی' }],
  },

  // 13. مدیریت کاربران سازمانی
  {
    id: 'USERS',
    path: '/users',
    title: 'مدیریت کاربران',
    browserTitle: 'حامی | مدیریت کاربران و سطوح دسترسی',
    category: 'MANAGEMENT',
    requiredPermission: 'userManagement',
    navTabId: 'USERS_LOGS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'مدیریت کاربران' }],
  },

  // 14. سوابق فعالیت و ممیزی سیستم
  {
    id: 'ACTIVITY_LOGS',
    path: '/activity-logs',
    title: 'سوابق فعالیت و ممیزی سیستم',
    browserTitle: 'حامی | دفتر ممیزی و لاگ‌های امنیتی',
    category: 'MANAGEMENT',
    requiredPermission: 'userManagement',
    navTabId: 'USERS_LOGS',
    breadcrumb: [
      { label: 'سامانه حامی', path: '/dashboard' },
      { label: 'مدیریت کاربران', path: '/users' },
      { label: 'سوابق فعالیت سیستم' },
    ],
  },

  // 15. دفترچه تلفن و سانترال هوشمند
  {
    id: 'PHONEBOOK',
    path: '/phonebook',
    title: 'دفترچه تلفن هوشمند',
    browserTitle: 'حامی | دفترچه تلفن و سانترال VoIP',
    category: 'FLEET_HUMAN',
    navTabId: 'PHONEBOOK',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'دفترچه تلفن' }],
  },

  // 16. آیین‌نامه‌ها و قوانین ترابری
  {
    id: 'REGULATIONS',
    path: '/regulations',
    title: 'آیین‌نامه‌های انضباطی و ترابری',
    browserTitle: 'حامی | آیین‌نامه‌ها و ضوابط اداری',
    category: 'MANAGEMENT',
    requiredPermission: 'regulations',
    navTabId: 'REGULATIONS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'آیین‌نامه‌ها' }],
  },

  // 17. تنظیمات سامانه و شبکه
  {
    id: 'SETTINGS',
    path: '/settings',
    title: 'تنظیمات سامانه',
    browserTitle: 'حامی | تنظیمات شبکه و سرور',
    category: 'SYSTEM',
    requiredPermission: 'settings',
    navTabId: 'SETTINGS',
    breadcrumb: [{ label: 'سامانه حامی', path: '/dashboard' }, { label: 'تنظیمات سامانه' }],
  },
];

/**
 * تبدیل مسیر الگو به Regex جهت استخراج پارامترهای داینامیک
 */
function pathToRegex(pathPattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = pathPattern
    .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    })
    .replace(/\//g, '\\/');

  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
  };
}

export interface MatchedRouteResult {
  route: RouteConfig | null;
  params: Record<string, string>;
  is404: boolean;
  rawPath: string;
}

/**
 * تطبیق مسیر URL با جدول مسیرهای تعریف‌شده سامانه
 */
export function matchAppRoute(pathname: string): MatchedRouteResult {
  // پاک‌سازی اسلش‌های اضافی انتهایی
  let cleanPath = pathname.trim();
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  if (!cleanPath) cleanPath = '/';

  // جستجو در کلیه مسیرها
  for (const r of APP_ROUTES) {
    const allPatterns = [r.path, ...(r.aliasPaths || [])];
    for (const pattern of allPatterns) {
      const { regex, paramNames } = pathToRegex(pattern);
      const match = cleanPath.match(regex);
      if (match) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, idx) => {
          params[name] = decodeURIComponent(match[idx + 1] || '');
        });
        return {
          route: r,
          params,
          is404: false,
          rawPath: cleanPath,
        };
      }
    }
  }

  // در صورت عدم تطابق با هیچ مسیری: خطای ۴۰۴
  return {
    route: null,
    params: {},
    is404: true,
    rawPath: cleanPath,
  };
}

/**
 * بررسی مجوز دسترسی کاربر به یک مسیر
 */
export function canUserAccessRoute(user: AppUser | null | undefined, route: RouteConfig): boolean {
  if (!route) return false;

  // مسیرهای عمومی بدون نیاز به پرمیشن ویژه
  if (!route.requiredPermission && !route.masterAdminOnly) {
    return true;
  }

  // در صورت عدم احراز هویت، اجازه دسترسی به مسیرهای محافظت‌شده داده نمی‌شود
  if (!user) return false;

  // مدیر ارشد به همه مسیرها دسترسی کامل دارد
  if (isMasterAdmin(user)) return true;

  // مسیرهای انحصاری مدیر ارشد
  if (route.masterAdminOnly) {
    return false;
  }

  // بررسی بر اساس پرمیشن مشخص ماژول
  if (route.requiredPermission === 'reports') {
    return isMasterAdmin(user);
  }

  if (route.requiredPermission === 'userManagement') {
    return canManageUsers(user);
  }

  if (route.requiredPermission === 'settings') {
    return canManageSystemSettings(user);
  }

  return canViewModule(user, route.requiredPermission as any);
}
