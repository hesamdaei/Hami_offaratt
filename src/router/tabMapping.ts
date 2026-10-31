/**
 * سامانه لجستیک و ترابری «حامی» - نسخه Beta 1.1786.1
 * نقشه‌برداری دوطرفه میان شناسه‌های تب‌ها (ActiveAppTab) و مسیرهای استاندارد URL
 */

import { ActiveAppTab } from '../components/Header';

export const TAB_TO_PATH_MAP: Record<ActiveAppTab, string> = {
  DASHBOARD: '/dashboard',
  ATTENDANCE: '/attendance',
  VEHICLE_ASSIGNMENT: '/assignments',
  DRIVERS: '/drivers',
  STAFF: '/staff',
  OIL_SERVICE: '/trucks',
  HANDOVER: '/handover',
  CUSTOMERS: '/customers',
  ORDERS: '/orders',
  OPERATIONS: '/operations',
  FINANCE: '/finance',
  REPORTS: '/reports',
  USERS_LOGS: '/users',
  PHONEBOOK: '/phonebook',
  REGULATIONS: '/regulations',
};

export const PATH_TO_TAB_MAP: Record<string, ActiveAppTab> = {
  '/': 'DASHBOARD',
  '/dashboard': 'DASHBOARD',
  '/attendance': 'ATTENDANCE',
  '/assignments': 'VEHICLE_ASSIGNMENT',
  '/vehicle-assignments': 'VEHICLE_ASSIGNMENT',
  '/drivers': 'DRIVERS',
  '/drivers/new': 'DRIVERS',
  '/staff': 'STAFF',
  '/trucks': 'OIL_SERVICE',
  '/trucks/new': 'OIL_SERVICE',
  '/vehicles': 'OIL_SERVICE',
  '/vehicles/new': 'OIL_SERVICE',
  '/fleet': 'OIL_SERVICE',
  '/oil-service': 'OIL_SERVICE',
  '/handover': 'HANDOVER',
  '/customers': 'CUSTOMERS',
  '/orders': 'ORDERS',
  '/orders/new': 'ORDERS',
  '/operations': 'OPERATIONS',
  '/finance': 'FINANCE',
  '/reports': 'REPORTS',
  '/users': 'USERS_LOGS',
  '/activity-logs': 'USERS_LOGS',
  '/phonebook': 'PHONEBOOK',
  '/regulations': 'REGULATIONS',
};

export function tabToPath(tab: ActiveAppTab): string {
  return TAB_TO_PATH_MAP[tab] || '/dashboard';
}

export function pathToTab(path: string): ActiveAppTab {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (PATH_TO_TAB_MAP[clean]) {
    return PATH_TO_TAB_MAP[clean];
  }
  // تطبیق پیشوندها (مانند /drivers/:id یا /trucks/:id)
  if (clean.startsWith('/drivers/')) return 'DRIVERS';
  if (clean.startsWith('/trucks/') || clean.startsWith('/vehicles/')) return 'OIL_SERVICE';
  if (clean.startsWith('/orders/')) return 'ORDERS';

  return 'DASHBOARD';
}
