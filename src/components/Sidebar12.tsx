import { FC, useMemo, ComponentType } from 'react';
import {
  CalendarDays,
  Users,
  UserCheck,
  Droplet,
  Truck,
  BookOpen,
  PanelRight,
  PanelLeft,
  Shield,
  SlidersHorizontal,
  X,
  Sun,
  Moon,
  LogOut,
  FileCheck,
  PhoneCall,
} from 'lucide-react';
import { ActiveAppTab } from './Header';
import { toFaDigits } from '../utils/jalaali';
import { AppUser } from '../types/auth';
import { isMasterAdmin, canViewModule, canManageUsers } from '../utils/authService';
import { VehicleItem } from '../utils/fleetSeedData';
import { getFleetInsuranceAlerts } from '../utils/insuranceAlerts';

interface Sidebar12Props {
  activeTab: ActiveAppTab;
  onTabChange: (tab: ActiveAppTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  totalVehiclesCount?: number;
  vehicles?: VehicleItem[];
  totalDrivers?: number;
  totalStaff?: number;
  todayActiveCount?: number;
  onOpenSpotlight?: () => void;
  onOpenBackup?: () => void;
  onOpenLanSharing?: () => void;
  onToggleThemeOrCompact?: () => void;
  isCompactTheme?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  currentUser?: AppUser | null;
  onOpenUserArea?: () => void;
  onOpenUserManagement?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
  onOpenBale?: () => void;
  onOpenEitaa?: () => void;
  onOpenMasterAdmin?: (initialTab?: 'network' | 'bale' | 'eitaa' | 'users' | 'backup') => void;
}

interface NavItemConfig {
  id: ActiveAppTab;
  label: string;
  subLabel?: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar12: FC<Sidebar12Props> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onClose,
  totalVehiclesCount = 0,
  vehicles = [],
  totalDrivers = 0,
  totalStaff = 0,
  todayActiveCount = 0,
  theme = 'dark',
  onToggleTheme,
  currentUser = null,
  onOpenUserArea,
  onLogout,
  onOpenMasterAdmin,
  onOpenLanSharing,
}) => {
  const insuranceAlertData = useMemo(() => {
    return getFleetInsuranceAlerts(vehicles, 7);
  }, [vehicles]);

  const unassignedVehiclesCount = useMemo(() => {
    return vehicles.filter(
      (v) => !v.driverName || v.driverName === 'بدون راننده' || v.driverName === 'NONE'
    ).length;
  }, [vehicles]);

  interface NavGroup {
    title: string;
    items: NavItemConfig[];
  }

  const navGroups: NavGroup[] = [
    {
      title: 'عملیات دیسپچ',
      items: [
        {
          id: 'ATTENDANCE',
          label: 'تابلوی حضور و غیاب',
          subLabel: 'رانندگان و پرسنل',
          icon: CalendarDays,
          badge: todayActiveCount > 0 ? `${toFaDigits(todayActiveCount)} حاضر` : undefined,
        },
        {
          id: 'VEHICLE_ASSIGNMENT',
          label: 'تخصیص خودرو و راننده',
          subLabel: 'واگذاری و انتساب ناوگان',
          icon: Truck,
          badge: unassignedVehiclesCount > 0 ? `${toFaDigits(unassignedVehiclesCount)} آزاد` : undefined,
        },
        {
          id: 'HANDOVER',
          label: 'برگه تحویل خودرو',
          subLabel: 'صورت‌جلسه ۶۶ قلمی و بدنه',
          icon: FileCheck,
          badge: '۶۶ قلم',
        },
      ],
    },
    {
      title: 'ناوگان و سرمایه انسانی',
      items: [
        {
          id: 'DRIVERS',
          label: 'پرونده رانندگان',
          subLabel: 'مشخصات و مدارک رانندگان',
          icon: Users,
          badge: totalDrivers > 0 ? toFaDigits(totalDrivers) : undefined,
        },
        {
          id: 'OIL_SERVICE',
          label: 'مدیریت ناوگان و خودروها',
          subLabel: 'بیمه، معاینه، مشخصات و سرویس',
          icon: Droplet,
          badge:
            insuranceAlertData.totalAlertsCount > 0
              ? `${toFaDigits(insuranceAlertData.totalAlertsCount)} هشدار`
              : totalVehiclesCount > 0
              ? toFaDigits(totalVehiclesCount)
              : undefined,
        },
        {
          id: 'STAFF',
          label: 'پرونده پرسنل',
          subLabel: 'کادر اداری و ستادی',
          icon: UserCheck,
          badge: totalStaff > 0 ? toFaDigits(totalStaff) : undefined,
        },
        {
          id: 'PHONEBOOK',
          label: 'دفترچه تلفن هوشمند',
          subLabel: 'مخاطبین، سانترال، امداد و تعمیرگاه',
          icon: PhoneCall,
          badge: 'جدید',
        },
      ],
    },
    {
      title: 'قوانین و نظارت',
      items: [
        {
          id: 'REGULATIONS',
          label: 'آیین‌نامه انضباطی',
          subLabel: 'ضوابط اداری و تعهدنامه',
          icon: BookOpen,
        },
        {
          id: 'USERS_LOGS',
          label: 'مدیریت کاربران و لاگ',
          subLabel: 'کاربران، امنیت و رهگیری',
          icon: Shield,
        },
      ],
    },
  ];

  // Filter groups and items based on user permissions
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!currentUser || isMasterAdmin(currentUser)) return true;
        switch (item.id) {
          case 'ATTENDANCE':
            return canViewModule(currentUser, 'attendance');
          case 'VEHICLE_ASSIGNMENT':
            return canViewModule(currentUser, 'drivers') || canViewModule(currentUser, 'oilService');
          case 'HANDOVER':
            return canViewModule(currentUser, 'drivers') || canViewModule(currentUser, 'regulations');
          case 'DRIVERS':
            return canViewModule(currentUser, 'drivers');
          case 'STAFF':
            return canViewModule(currentUser, 'staff');
          case 'OIL_SERVICE':
            return canViewModule(currentUser, 'oilService');
          case 'PHONEBOOK':
            return true;
          case 'REGULATIONS':
            return canViewModule(currentUser, 'regulations');
          case 'USERS_LOGS':
            return canManageUsers(currentUser) || isMasterAdmin(currentUser);
          default:
            return true;
        }
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      dir="rtl"
      className={`relative z-30 transition-all duration-200 shrink-0 select-none ${
        isCollapsed ? 'w-[68px]' : 'w-[250px]'
      }`}
    >
      <div
        className={`sticky top-3 flex flex-col bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] shadow-md dark:shadow-xl rounded-2xl transition-all duration-200 ${
          isCollapsed ? 'p-2' : 'p-3'
        }`}
      >
        {/* 1. COMPACT BRAND HEADER */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
                ح
              </div>
              <div className="truncate">
                <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                  حامی
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  منوی عملیات سامانه
                </div>
              </div>
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-7 h-7 transition cursor-pointer"
              title="بستن منو"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#162238] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer ${
              isCollapsed ? 'w-8 h-8 mx-auto' : 'w-7 h-7'
            }`}
            title={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          >
            {isCollapsed ? (
              <PanelRight className="w-4 h-4 text-amber-500" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 2. MAIN NAVIGATION GROUPS (Full Height, Uncrushed) */}
        <nav className="space-y-3 py-1">
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pb-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {group.title}
                </div>
              ) : groupIdx > 0 ? (
                <div className="border-t border-slate-100 dark:border-slate-800 my-1.5 mx-1" />
              ) : null}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 text-right cursor-pointer ${
                        isCollapsed ? 'h-10 justify-center px-0' : 'py-2 px-2.5'
                      } ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#162238]/80 font-medium'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'
                        }`}
                      />

                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0 gap-1">
                          <div className="truncate">
                            <div
                              className={`text-xs truncate ${
                                isActive ? 'text-slate-950 font-black' : 'text-slate-800 dark:text-slate-200 font-bold'
                              }`}
                            >
                              {item.label}
                            </div>
                            {item.subLabel && (
                              <div
                                className={`text-[10px] truncate ${
                                  isActive ? 'text-slate-800' : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {item.subLabel}
                              </div>
                            )}
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                isActive
                                  ? 'bg-slate-950/15 text-slate-950'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Tooltip when collapsed */}
                    {isCollapsed && (
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center z-50 pointer-events-none">
                        <div className="bg-slate-900 text-white border border-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                          {item.label}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 3. COMPACT SINGLE-ROW FOOTER */}
        <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1">
          {!isCollapsed && (
            <button
              type="button"
              onClick={onOpenUserArea}
              className="flex items-center gap-2 min-w-0 flex-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer text-right"
              title="حساب کاربری"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                {currentUser?.fullName ? currentUser.fullName.slice(0, 1) : 'ک'}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                {currentUser?.fullName || 'کاربر سیستم'}
              </span>
            </button>
          )}

          <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col mx-auto' : ''}`}>
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
                title={theme === 'light' ? 'حالت تیره' : 'حالت روشن'}
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            )}

            {isMasterAdmin(currentUser) && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenMasterAdmin) onOpenMasterAdmin('network');
                  else if (onOpenLanSharing) onOpenLanSharing();
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
                title="تنظیمات سیستم و شبکه"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
                title="خروج از حساب"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
