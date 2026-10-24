import { FC, useMemo, ComponentType } from 'react';
import {
  CalendarDays,
  Users,
  UserCheck,
  Droplet,
  BookOpen,
  PanelRight,
  PanelLeft,
  Search,
  Sliders,
  Database,
  Download,
  Network,
  User,
  Bell,
  Shield,
  ShieldAlert,
  LogOut,
  Sparkles,
  SlidersHorizontal,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { ActiveAppTab } from './Header';
import { toFaDigits } from '../utils/jalaali';
import { AppUser } from '../types/auth';
import { isMasterAdmin, canViewModule, canAccessBackup, canManageUsers } from '../utils/authService';
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
  onOpenSpotlight,
  onOpenBackup,
  onOpenLanSharing,
  onToggleThemeOrCompact,
  isCompactTheme = false,
  theme = 'dark',
  onToggleTheme,
  currentUser = null,
  onOpenUserArea,
  onOpenUserManagement,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onLogout,
  onOpenBale,
  onOpenEitaa,
  onOpenMasterAdmin,
}) => {
  // Fleet Insurance Alerts
  const insuranceAlertData = useMemo(() => {
    return getFleetInsuranceAlerts(vehicles, 7);
  }, [vehicles]);

  // Grouped navigation items by Information Architecture
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
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        },
      ],
    },
    {
      title: 'ناوگان و سرمایه انسانی',
      items: [
        {
          id: 'DRIVERS',
          label: 'پرونده رانندگان',
          subLabel: 'Driver Directory',
          icon: Users,
          badge: totalDrivers > 0 ? toFaDigits(totalDrivers) : undefined,
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        },
        {
          id: 'OIL_SERVICE',
          label: 'مدیریت ناوگان و خودروها',
          subLabel: 'بیمه، معاینه، مشخصات و سرویس',
          icon: Droplet,
          badge:
            insuranceAlertData.totalAlertsCount > 0
              ? `⚠️ ${toFaDigits(insuranceAlertData.totalAlertsCount)} بیمه`
              : totalVehiclesCount > 0
              ? toFaDigits(totalVehiclesCount)
              : undefined,
          badgeColor:
            insuranceAlertData.totalAlertsCount > 0
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        {
          id: 'STAFF',
          label: 'پرونده پرسنل',
          subLabel: 'Staff Directory',
          icon: UserCheck,
          badge: totalStaff > 0 ? toFaDigits(totalStaff) : undefined,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        },
      ],
    },
    {
      title: 'قوانین و مستندات',
      items: [
        {
          id: 'REGULATIONS',
          label: 'آیین‌نامه انضباطی',
          subLabel: 'ضوابط اداری و رانندگان',
          icon: BookOpen,
          badge: 'ویرایش',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        },
      ],
    },
    {
      title: 'مدیریت و نظارت',
      items: [
        {
          id: 'USERS_LOGS',
          label: 'مدیریت کاربران و لاگ',
          subLabel: 'کاربران، امنیت و رهگیری تغییرات',
          icon: Shield,
          badge: 'امنیت',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
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
          case 'DRIVERS':
            return canViewModule(currentUser, 'drivers');
          case 'STAFF':
            return canViewModule(currentUser, 'staff');
          case 'OIL_SERVICE':
            return canViewModule(currentUser, 'oilService');
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
      className={`relative z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 select-none ${
        isCollapsed ? 'w-[74px]' : 'w-[275px]'
      }`}
    >
      {/* Floating Card Container adhering to frontend-joe sidebar-12 architecture */}
      <div
        className={`h-full max-h-[calc(100vh-28px)] sticky top-3 flex flex-col bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] shadow-lg dark:shadow-2xl rounded-[24px] overflow-hidden transition-all duration-300 ${
          isCollapsed ? 'p-2' : 'p-3.5'
        }`}
      >
        {/* 1. BRAND HEADER */}
        <div className="flex items-center justify-between min-h-[50px] mb-2 px-1 relative">
          {/* Brand Mark & Title */}
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-linear-to-br from-blue-600 to-indigo-700 p-0.5 shadow-md flex items-center justify-center shrink-0 border border-blue-400/30">
              <svg viewBox="0 0 32 32" className="w-5 h-5 text-white" aria-hidden="true">
                <rect width="32" height="32" rx="9" fill="transparent" />
                <path
                  d="M13 11.5V10a3 3 0 0 1 6 0v1.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M8.5 11.5h15v6.2a6.5 6.5 0 0 1-6.5 6.5h-2a6.5 6.5 0 0 1-6.5-6.5z"
                  fill="#ffffff"
                />
              </svg>
            </div>

            {/* Brand Name Text (hidden when collapsed) */}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-white font-sans">
                    حامی
                  </span>
                  <span className="text-[9px] font-extrabold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 px-1.5 py-0.2 rounded-md uppercase">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  سامانه مدیریت اداری و رانندگان
                </span>
              </div>
            )}
          </div>

          {/* Close button on Mobile */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden flex items-center justify-center rounded-[12px] bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white hover:bg-rose-100 dark:hover:bg-rose-500/25 w-8 h-8 transition cursor-pointer"
              title="بستن منو"
              aria-label="بستن منو"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Collapse Toggle Button (Desktop) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center justify-center rounded-[12px] bg-slate-100 hover:bg-slate-200 dark:bg-[#162238] border border-slate-200 dark:border-slate-700/60 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 transition-all cursor-pointer ${
              isCollapsed ? 'w-9 h-9 mx-auto mt-1' : 'w-8 h-8'
            }`}
            title={isCollapsed ? 'گسترش منوی سایدبار' : 'جمع‌کردن سایدبار'}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <PanelRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <PanelLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            )}
          </button>
        </div>

        {/* 2. USER PROFILE / USER AREA SECTION */}
        <div
          onClick={onOpenUserArea}
          className={`flex items-center gap-2.5 p-2 rounded-[16px] bg-slate-50 hover:bg-slate-100 dark:bg-[#142036] dark:hover:bg-[#1a2b49] border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/40 mb-3 transition-all cursor-pointer group ${
            isCollapsed ? 'justify-center p-1.5' : ''
          }`}
          title="مشاهده ناحیه کاربری، وضعیت دسترسی‌ها و اطلاعات حساب"
        >
          {/* Avatar with Ring */}
          <div className="relative shrink-0">
            <div className="w-[40px] h-[40px] rounded-full bg-linear-to-tr from-amber-500 to-orange-600 p-[2px] shadow-lg flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white dark:bg-[#0d1526] flex items-center justify-center text-slate-900 dark:text-white font-black text-xs">
                {currentUser?.fullName ? currentUser.fullName.slice(0, 1) : 'د'}
              </div>
            </div>
            {/* Active Status Beacon */}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111b2e] shadow-xs"></span>
          </div>

          {/* Profile Name and Role */}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  {currentUser?.fullName || 'مدیریت سامانه'}
                </span>
                <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                  آنلاین
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {currentUser?.roleTitle || 'مدیریت سامانه'}
              </span>
            </div>
          )}
        </div>

        {/* 3. QUICK SPOTLIGHT SEARCH ACTION */}
        {onOpenSpotlight && (
          <button
            type="button"
            onClick={onOpenSpotlight}
            className={`w-full flex items-center gap-2 mb-2 rounded-[13px] bg-slate-50 hover:bg-slate-100 dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition text-xs font-medium cursor-pointer ${
              isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between'
            }`}
            title="جستجوی سریع در کل سیستم (Ctrl+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {!isCollapsed && <span>جستجوی سریع...</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono bg-white dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                ⌘K
              </span>
            )}
          </button>
        )}

        <hr className="border-t border-slate-200 dark:border-[#1e2d48] my-1" />

        {/* 4. NAVIGATION LIST (Grouped by Information Architecture) */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar my-1.5 space-y-3">
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.title} className="space-y-1">
              {/* Group Section Header */}
              {!isCollapsed ? (
                <div className="px-2 pt-1 pb-0.5 flex items-center justify-between text-[10px] font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">
                  <span>{group.title}</span>
                  <span className="w-8 h-px bg-slate-200 dark:bg-slate-800/80"></span>
                </div>
              ) : groupIdx > 0 ? (
                <div className="border-t border-slate-200 dark:border-[#1e2d48]/60 my-2 mx-1" />
              ) : null}

              {/* Group Items */}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`relative w-full flex items-center gap-3 rounded-[14px] transition-all duration-200 text-right cursor-pointer ${
                        isCollapsed ? 'h-[46px] justify-center px-0' : 'h-[46px] px-3'
                      } ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#162238]/70 font-medium'
                      }`}
                    >
                      {/* Active edge indicator */}
                      {isActive && (
                        <span className="absolute top-1/2 -translate-y-1/2 right-0 w-[4px] h-[24px] rounded-l-full bg-slate-950 shadow-xs"></span>
                      )}

                      {/* Icon */}
                      <div
                        className={`w-[22px] h-[22px] flex items-center justify-center shrink-0 transition-transform ${
                          isActive ? 'scale-110 text-slate-950' : 'text-amber-500 dark:text-amber-400 group-hover:scale-105'
                        }`}
                      >
                        <Icon className="w-[19px] h-[19px]" />
                      </div>

                      {/* Label & SubLabel */}
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
                          <div className="flex flex-col truncate">
                            <span className={`text-xs truncate ${isActive ? 'text-slate-950 font-black' : 'text-slate-800 dark:text-slate-200'}`}>
                              {item.label}
                            </span>
                            {item.subLabel && (
                              <span className={`text-[9px] font-mono tracking-tight truncate ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                                {item.subLabel}
                              </span>
                            )}
                          </div>

                          {/* Badge if available */}
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                                isActive
                                  ? 'bg-slate-950/80 text-amber-300 border-slate-900'
                                  : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Tooltip on hover when collapsed */}
                    {isCollapsed && (
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover:flex items-center z-50 pointer-events-none">
                        <div className="bg-[#0b1322]/95 backdrop-blur-md text-white border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap flex items-center gap-2 animate-fadeIn">
                          <span className="text-[10px] text-slate-400">{group.title}:</span>
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 5. FOOTER: ACTIONS & SYSTEM CONTROLS */}
        <div className="pt-2 border-t border-[#1e2d48] shrink-0 mt-1 space-y-2">
          {/* Notification Center Trigger */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className={`w-full flex items-center rounded-[14px] bg-[#142036] hover:bg-[#192842] border border-slate-800 hover:border-amber-500/30 text-slate-300 hover:text-white transition ${
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
              }`}
              title="مرکز اعلان‌ها و یادآوری‌ها"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-slate-200">مرکز اعلان‌ها</span>
                    <span className="text-[9px] text-slate-400">Notifications</span>
                  </div>
                )}
              </div>
              {unreadNotificationsCount > 0 && !isCollapsed && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black">
                  {toFaDigits(unreadNotificationsCount)}
                </span>
              )}
            </button>
          )}

          {/* Bale Web Messenger Action */}
          {(onOpenBale || onOpenEitaa) && (
            <button
              type="button"
              onClick={onOpenBale || onOpenEitaa}
              className={`w-full flex items-center rounded-[14px] bg-[#0c1f19] hover:bg-[#122e25] border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-white transition cursor-pointer ${
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
              }`}
              title="ارسال پیام آماده به رانندگان در پیام‌رسان بله (Bale Web)"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-xs shadow-emerald-500/20">
                  ب
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-emerald-200">پیام‌رسان بله</span>
                    <span className="text-[9px] text-emerald-400/80">Bale Dispatcher</span>
                  </div>
                )}
              </div>
            </button>
          )}

          {/* Master Admin Panel (Network, Bale, Users, Backup) - Master Admin Only */}
          {isMasterAdmin(currentUser) && (
            <button
              type="button"
              onClick={() => {
                if (onOpenMasterAdmin) onOpenMasterAdmin('network');
                else if (onOpenLanSharing) onOpenLanSharing();
              }}
              className={`w-full flex items-center rounded-[14px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition cursor-pointer ${
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
              }`}
              title="تنظیمات زیرساخت، شبکه LAN، پیام‌رسان بله و مدیریت سیستم"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">تنظیمات و مدیریت سیستم</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">شبکه، بله و پایگاه‌داده</span>
                  </div>
                )}
              </div>
            </button>
          )}

          {/* User Management Action (only for permitted managers) */}
          {!isMasterAdmin(currentUser) && onOpenUserManagement && canManageUsers(currentUser) && (
            <button
              type="button"
              onClick={onOpenUserManagement}
              className={`w-full flex items-center rounded-[14px] bg-indigo-50 hover:bg-indigo-100 dark:bg-[#141b38] border border-indigo-200 dark:border-indigo-500/20 text-indigo-800 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white hover:border-indigo-300 dark:hover:border-indigo-500/40 transition cursor-pointer ${
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
              }`}
              title="مدیریت کاربران و تعیین دسترسی‌ها"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">مدیریت کاربران</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400/80">User Access Control</span>
                  </div>
                )}
              </div>
            </button>
          )}

          {/* Manual Backup Action (only for permitted users) */}
          {!isMasterAdmin(currentUser) && onOpenBackup && canAccessBackup(currentUser) && (
            <button
              type="button"
              onClick={onOpenBackup}
              className={`w-full flex items-center rounded-[14px] bg-slate-100 hover:bg-slate-200 dark:bg-[#142036] border border-slate-200 dark:border-blue-500/20 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:border-slate-300 dark:hover:border-blue-500/40 transition cursor-pointer ${
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
              }`}
              title="پشتیبان‌گیری دستی و بازیابی اطلاعات کل برنامه (JSON Backup)"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">بک‌آپ دستی (JSON)</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">Backup & Restore</span>
                  </div>
                )}
              </div>
              {!isCollapsed && <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
            </button>
          )}

          {/* Light Mode / Dark Mode Theme Switch */}
          {onToggleTheme && (
            <div
              onClick={onToggleTheme}
              className={`w-full flex items-center rounded-[14px] bg-slate-100 hover:bg-slate-200 dark:bg-[#142036] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition ${
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
              }`}
              title={theme === 'light' ? 'تغییر به حالت تیره (حالت شب)' : 'تغییر به حالت روشن (حالت روز)'}
            >
              <div className="flex items-center gap-2">
                {theme === 'light' ? (
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                {!isCollapsed && (
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      {theme === 'light' ? 'پوسته روشن' : 'پوسته تیره'}
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">
                      {theme === 'light' ? 'حالت روز فعال است' : 'روشن / تیره'}
                    </span>
                  </div>
                )}
              </div>

              {/* iOS-Style Slider Switch */}
              <div
                className={`relative shrink-0 w-[42px] h-[22px] rounded-full transition-colors duration-250 ${
                  theme === 'light' ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-[2px] right-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-transform duration-250 ${
                    theme === 'light' ? '-translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          )}

          <div
            onClick={onToggleThemeOrCompact}
            className={`w-full flex items-center rounded-[14px] bg-slate-100 hover:bg-slate-200 dark:bg-[#142036] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition ${
              isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
            }`}
            title="تغییر تراکم نمایش / حالت فشرده"
          >
            {/* Label and Icon */}
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">حالت کاربری فشرده</span>
                  <span className="text-[9px] text-slate-500">Compact Density</span>
                </div>
              )}
            </div>

            {/* iOS-Style Slider Switch */}
            <div
              className={`relative shrink-0 w-[42px] h-[22px] rounded-full transition-colors duration-250 ${
                isCompactTheme ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-[2px] right-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-transform duration-250 ${
                  isCompactTheme ? '-translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
