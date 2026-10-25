import { FC, useState, useEffect, useMemo, ComponentType, useRef } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Wrench,
  CalendarDays,
  Users,
  Droplet,
  BookOpen,
  Search,
  ChevronDown,
  Menu,
  X,
  Activity,
  PanelRight,
  Database,
  Truck,
  Sparkles,
  Network,
  RefreshCw,
  Bell,
  User,
  LogOut,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Settings,
  MessageSquare,
  Bot,
  Printer,
  Sun,
  Moon,
} from 'lucide-react';
import { getTodayJalaali, toFaDigits } from '../utils/jalaali';
import { QuickSearchSpotlight } from './QuickSearchSpotlight';
import { PWAInstallButton } from './PWAInstallButton';
import { PrintSettingsModal } from './PrintSettingsModal';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { FilterView } from '../types';
import { AppUser } from '../types/auth';
import { isMasterAdmin, canViewModule, canAccessBackup, canManageUsers } from '../utils/authService';
import { getFleetInsuranceAlerts } from '../utils/insuranceAlerts';

export type ActiveAppTab =
  | 'ATTENDANCE'
  | 'VEHICLE_ASSIGNMENT'
  | 'DRIVERS'
  | 'STAFF'
  | 'OIL_SERVICE'
  | 'REGULATIONS'
  | 'USERS_LOGS';

export interface HeaderProps {
  activeTab?: ActiveAppTab;
  onTabChange?: (tab: ActiveAppTab) => void;
  totalDrivers?: number;
  totalStaff?: number;
  todayLeaveCount?: number;
  todayWorkshopCount?: number;
  totalVehiclesCount?: number;
  vehicles?: VehicleItem[];
  driverDirectory?: DriverDirectoryItem[];
  onFilterChange?: (filter: FilterView) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenBackup?: () => void;
  onOpenLanSharing?: () => void;
  networkDbStatus?: 'CONNECTED' | 'SAVING' | 'SYNCED' | 'OFFLINE' | 'ERROR';
  lastDbSavedAt?: string | null;
  // User Area & Notifications & Access Control
  currentUser?: AppUser | null;
  onOpenUserArea?: () => void;
  onOpenUserManagement?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
  onOpenBale?: () => void;
  onOpenMasterAdmin?: (initialTab?: 'network' | 'bale' | 'eitaa' | 'users' | 'backup') => void;
  onNavigateToInsuranceAlerts?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface NavItemConfig {
  id: ActiveAppTab;
  title: string;
  shortTitle: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const Header: FC<HeaderProps> = ({
  activeTab = 'ATTENDANCE',
  onTabChange,
  totalDrivers = 0,
  totalStaff = 0,
  todayLeaveCount = 0,
  todayWorkshopCount = 0,
  totalVehiclesCount = 0,
  vehicles = [],
  driverDirectory = [],
  onFilterChange,
  isSidebarOpen,
  onToggleSidebar,
  onOpenBackup,
  onOpenLanSharing,
  networkDbStatus = 'OFFLINE',
  lastDbSavedAt,
  currentUser = null,
  onOpenUserArea,
  onOpenUserManagement,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onLogout,
  onOpenBale,
  onOpenEitaa,
  onOpenMasterAdmin,
  onNavigateToInsuranceAlerts,
  isMobileMenuOpen: propIsMobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  theme = 'dark',
  onToggleTheme,
}) => {
  const todayInfo = getTodayJalaali();
  const todayActiveCount = Math.max(0, totalDrivers - todayLeaveCount - todayWorkshopCount);

  // Spotlight Search Modal
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  // Mobile drawer local fallback state
  const [localMobileMenuOpen, setLocalMobileMenuOpen] = useState(false);
  const isMobileMenuOpen = propIsMobileMenuOpen !== undefined ? propIsMobileMenuOpen : localMobileMenuOpen;
  const toggleMobileMenu = onToggleMobileMenu || (() => setLocalMobileMenuOpen((prev) => !prev));
  const closeMobileMenu = onCloseMobileMenu || (() => setLocalMobileMenuOpen(false));

  // Master Admin Dropdown Menu
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const masterMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (masterMenuRef.current && !masterMenuRef.current.contains(event.target as Node)) {
        setIsMasterMenuOpen(false);
      }
    };
    if (isMasterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMasterMenuOpen]);

  // Keyboard shortcut for Spotlight (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSpotlightOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fleet Insurance Expiry Alerts check (< 7 days)
  const insuranceAlertData = useMemo(() => {
    return getFleetInsuranceAlerts(vehicles, 7);
  }, [vehicles]);

  const unassignedVehiclesCount = useMemo(() => {
    return vehicles.filter(
      (v) => !v.driverName || v.driverName === 'بدون راننده' || v.driverName === 'NONE'
    ).length;
  }, [vehicles]);

  // Navigation modules definition
  const navModules: NavItemConfig[] = [
    {
      id: 'ATTENDANCE',
      title: 'حضور و غیاب رانندگان و پرسنل',
      shortTitle: 'حضور و غیاب',
      icon: CalendarDays,
      badge: totalDrivers > 0 ? toFaDigits(totalDrivers) : undefined,
    },
    {
      id: 'VEHICLE_ASSIGNMENT',
      title: 'تخصیص و واگذاری ناوگان به راننده',
      shortTitle: 'تخصیص خودرو',
      icon: Truck,
      badge: unassignedVehiclesCount > 0 ? `${toFaDigits(unassignedVehiclesCount)} آزاد` : undefined,
    },
    {
      id: 'DRIVERS',
      title: 'پرونده جامع رانندگان',
      shortTitle: 'رانندگان',
      icon: Users,
      badge: driverDirectory.length > 0 ? toFaDigits(driverDirectory.length) : undefined,
    },
    {
      id: 'STAFF',
      title: 'پرونده پرسنل و کارگزینی',
      shortTitle: 'پرسنل',
      icon: UserCheck,
      badge: totalStaff > 0 ? toFaDigits(totalStaff) : undefined,
    },
    {
      id: 'OIL_SERVICE',
      title: 'مدیریت ناوگان و سرویس خودروها',
      shortTitle: 'مدیریت ناوگان',
      icon: Droplet,
      badge:
        insuranceAlertData.totalAlertsCount > 0
          ? `⚠️ ${toFaDigits(insuranceAlertData.totalAlertsCount)} بیمه`
          : totalVehiclesCount > 0
          ? toFaDigits(totalVehiclesCount)
          : undefined,
    },
    {
      id: 'REGULATIONS',
      title: 'آیین‌نامه انضباطی',
      shortTitle: 'آیین‌نامه',
      icon: BookOpen,
    },
    {
      id: 'USERS_LOGS',
      title: 'مدیریت کاربران و لاگ سیستم',
      shortTitle: 'کاربران و لاگ',
      icon: Shield,
    },
  ];

  // Filter modules based on logged-in user permissions
  const visibleNavModules = navModules.filter((item) => {
    if (!currentUser || isMasterAdmin(currentUser)) return true;
    switch (item.id) {
      case 'ATTENDANCE':
        return canViewModule(currentUser, 'attendance');
      case 'VEHICLE_ASSIGNMENT':
        return canViewModule(currentUser, 'drivers') || canViewModule(currentUser, 'oilService');
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
  });

  const handleTabClick = (tab: ActiveAppTab) => {
    if (typeof onTabChange === 'function') {
      onTabChange(tab);
    }
  };

  const handleTriggerMasterModal = (tab: 'network' | 'bale' | 'eitaa' | 'users' | 'backup') => {
    setIsMasterMenuOpen(false);
    if (onOpenMasterAdmin) {
      onOpenMasterAdmin(tab);
    } else if (tab === 'network' && onOpenLanSharing) {
      onOpenLanSharing();
    } else if (tab === 'users' && onOpenUserManagement) {
      onOpenUserManagement();
    } else if (tab === 'backup' && onOpenBackup) {
      onOpenBackup();
    } else if (tab === 'eitaa' && onOpenEitaa) {
      onOpenEitaa();
    }
  };

  return (
    <header className="mb-4 select-none">
      {/* RESPONSIVE NON-COLLIDING UNIFIED HEADER BAR */}
      <div className="bg-white/95 dark:bg-[#0b1325]/95 backdrop-blur-md text-slate-900 dark:text-white rounded-2xl shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-800/80 px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 relative">
        {/* RIGHT (RTL): Brand Logo & Contextual Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          {/* Brand Identity */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-xl overflow-hidden border border-amber-500/40 shadow-xs shadow-amber-500/20 bg-slate-100 dark:bg-[#070b14] flex items-center justify-center p-0.5">
              <img src="/brand-logo.png" alt="حامی" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="flex flex-col text-right leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">حامی</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="سیستم برخط"></span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden xl:inline mt-0.5 font-medium truncate">
                سامانه هوشمند ترابری و دیسپچ
              </span>
            </div>
          </div>

          {/* Breadcrumb Contextual Navigation (Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 text-xs min-w-0">
            <span className="text-slate-400 dark:text-slate-600">/</span>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-xs truncate">
              {(() => {
                const currentActive = navModules.find((m) => m.id === activeTab) || navModules[0];
                const ItemIcon = currentActive.icon;
                return (
                  <>
                    <ItemIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white text-xs hidden lg:inline truncate">{currentActive.title}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs lg:hidden truncate">{currentActive.shortTitle}</span>
                    {currentActive.badge && (
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                        {currentActive.badge}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* LEFT (LTR): Minimal Actions, Search, Notifications, Bale, and Master Menu */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Attendance Counters (Visible only on ultra-wide screens to prevent squeezing) */}
          <div className="hidden 2xl:flex items-center gap-2 text-[11px] font-mono bg-slate-100 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-sans font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{toFaDigits(todayActiveCount)} راننده حاضر</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-amber-700 dark:text-amber-400 font-sans font-medium">{toFaDigits(todayLeaveCount)} مرخصی</span>
            {todayWorkshopCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-sky-700 dark:text-sky-400 font-sans font-medium">{toFaDigits(todayWorkshopCount)} تعمیرگاه</span>
              </>
            )}
          </div>

          {/* Quick Fleet Insurance Alert Button (< 7 days) */}
          {insuranceAlertData.totalAlertsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateToInsuranceAlerts) onNavigateToInsuranceAlerts();
                else handleTabClick('OIL_SERVICE');
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition animate-pulse cursor-pointer shadow-xs"
              title={`${toFaDigits(insuranceAlertData.totalAlertsCount)} خودرو دارای بیمه‌نامه در آستانه سررسید یا منقضی (کلیک برای مشاهده)`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden 2xl:inline font-bold">هشدار بیمه</span>
              <span className="bg-rose-500 text-white dark:text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black">
                {toFaDigits(insuranceAlertData.totalAlertsCount)}
              </span>
            </button>
          )}

          {/* Minimalist Spotlight Search Button */}
          <button
            onClick={() => setIsSpotlightOpen(true)}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 transition flex items-center gap-1.5 text-xs cursor-pointer active:scale-95"
            title="جستجوی سریع (Ctrl + K)"
            aria-label="جستجوی سریع"
          >
            <Search className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <kbd className="hidden 2xl:inline text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-800">
              Ctrl+K
            </kbd>
          </button>

          {/* Light / Dark Mode Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 transition flex items-center gap-1.5 text-xs cursor-pointer active:scale-95"
              title={theme === 'light' ? 'تغییر به حالت تیره (حالت شب)' : 'تغییر به حالت روشن (حالت روز)'}
              aria-label="تغییر پوسته روشن و تیره"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden 2xl:inline text-[11px] font-bold">حالت شب</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="hidden 2xl:inline text-[11px] font-bold">حالت روز</span>
                </>
              )}
            </button>
          )}

          {/* Notification Bell with Badge */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 transition active:scale-95 cursor-pointer"
              title="مرکز اعلان‌ها و یادآوری‌ها"
              aria-label="اعلان‌ها"
            >
              <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-white dark:border-[#090e1a] animate-pulse">
                  {toFaDigits(unreadNotificationsCount)}
                </span>
              )}
            </button>
          )}

          {/* Bale Messenger Button (Desktop / Tablet) */}
          {(onOpenBale || onOpenEitaa) && (
            <button
              type="button"
              onClick={onOpenBale || onOpenEitaa}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 px-2 sm:px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 transition text-xs font-bold cursor-pointer active:scale-95"
              title="ارسال پیام‌های آماده در پیام‌رسان بله (Bale Web) به رانندگان"
            >
              <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-[8px] font-black text-white shrink-0 shadow-xs">
                ب
              </div>
              <span className="hidden 2xl:inline">بله</span>
            </button>
          )}

          {/* PWA Compact Button */}
          <div className="hidden xl:block">
            <PWAInstallButton variant="compact" />
          </div>

          {/* Laser Print & Watermark Settings Quick Button */}
          <button
            type="button"
            onClick={() => setIsPrintSettingsOpen(true)}
            title="ثبت متن واترمارک و تنظیمات چاپگر لیزری"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition text-xs font-bold cursor-pointer active:scale-95 shadow-xs"
            aria-label="چاپ و واترمارک"
          >
            <Printer className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="hidden 2xl:inline text-[11px]">چاپ و واترمارک</span>
          </button>

          {/* MANAGEMENT MENU DROPDOWN (تنظیمات شبکه، بله و مدیریت سیستم) */}
          {currentUser && isMasterAdmin(currentUser) && (
            <div className="relative" ref={masterMenuRef}>
              <button
                type="button"
                onClick={() => setIsMasterMenuOpen(!isMasterMenuOpen)}
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border transition text-xs font-bold cursor-pointer active:scale-95 ${
                  isMasterMenuOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border-slate-200 dark:border-slate-700/80'
                }`}
                title="تنظیمات سیستم، شبکه LAN و پیام‌رسان بله"
              >
                <SlidersHorizontal className={`w-3.5 h-3.5 ${isMasterMenuOpen ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}`} />
                <span className="font-semibold text-xs hidden md:inline">تنظیمات</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    networkDbStatus === 'SYNCED'
                      ? 'bg-emerald-500 animate-pulse'
                      : networkDbStatus === 'SAVING'
                      ? 'bg-sky-500 animate-spin'
                      : 'bg-amber-500'
                  }`}
                  title={networkDbStatus === 'SYNCED' ? 'دیتابیس شبکه همگام است' : 'وضعیت شبکه'}
                ></span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isMasterMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Master Dropdown Menu Panel (Anchored cleanly to left edge so it never overflows viewport) */}
              {isMasterMenuOpen && (
                <div className="absolute left-0 right-auto top-full mt-2 w-64 bg-white dark:bg-[#0d1629] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-right">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>تنظیمات و مدیریت سیستم</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">شبکه LAN، پیام‌رسان بله و پایگاه‌داده</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    {/* Item 1: Network & Central DB */}
                    <button
                      type="button"
                      onClick={() => handleTriggerMasterModal('network')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition group text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <div className="font-bold">تنظیمات شبکه LAN</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">همگام‌سازی و آدرس سرور مرکزی</div>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          networkDbStatus === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : networkDbStatus === 'SAVING'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {networkDbStatus === 'SYNCED' ? 'همگام' : 'LAN'}
                      </span>
                    </button>

                    {/* Item 2: Bale Bot & Settings */}
                    <button
                      type="button"
                      onClick={() => handleTriggerMasterModal('bale')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition group text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <div className="font-bold">تنظیمات پیام‌رسان بله</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">توکن بات بله، Chat ID و اعلان‌ها</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                        Bale Bot
                      </span>
                    </button>

                    {/* Item 3: Users Management */}
                    <button
                      type="button"
                      onClick={() => handleTriggerMasterModal('users')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition group text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <div className="font-bold">مدیریت کاربران و دسترسی‌ها</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">تعریف رمز، سطح دسترسی و فعال‌سازی</div>
                        </div>
                      </div>
                    </button>

                    {/* Item 4: Backup & Restore */}
                    <button
                      type="button"
                      onClick={() => handleTriggerMasterModal('backup')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition group text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-bold">بک‌آپ و بازیابی داده‌ها</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">دانلود و ریستور فایل JSON</div>
                        </div>
                      </div>
                    </button>

                    {/* Item 5: Watermark & Laser Print Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        setIsPrintSettingsOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition group text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <div>
                          <div className="font-bold">ثبت واتر مارک و چاپ لیزری</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">شخصی‌سازی متن واترمارک و چاپ کم‌مصرف</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.2 rounded font-bold">
                        لیزری
                      </span>
                    </button>

                    {/* Item 6: User Area */}
                    {onOpenUserArea && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMasterMenuOpen(false);
                          onOpenUserArea();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition group text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <div>
                            <div className="font-bold">ناحیه کاربری</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">تغییر رمز عبور و اطلاعات حساب</div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Logout option */}
                  {onLogout && (
                    <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMasterMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition text-xs font-bold text-right cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>خروج از حساب</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* REGULAR USER PROFILE CHIP */}
          {currentUser && !isMasterAdmin(currentUser) && onOpenUserArea && (
            <button
              type="button"
              onClick={onOpenUserArea}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/70 transition text-xs cursor-pointer"
              title="مشاهده اطلاعات حساب کاربری و دسترسی‌ها"
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                {currentUser.fullName ? currentUser.fullName.slice(0, 1) : 'ک'}
              </div>
              <span className="font-bold truncate max-w-[80px] hidden sm:inline">{currentUser.fullName}</span>
            </button>
          )}

          {/* Quick Logout */}
          {currentUser && !isMasterAdmin(currentUser) && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800/60 transition cursor-pointer"
              title="خروج از سیستم"
              aria-label="خروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Sidebar Toggle Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`hidden sm:flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border transition text-xs font-bold cursor-pointer ${
                isSidebarOpen
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 dark:text-slate-300 border-slate-200 dark:border-slate-700/60'
              }`}
              title="تغییر وضعیت سایدبار"
              aria-label="تغییر وضعیت سایدبار"
            >
              <PanelRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={toggleMobileMenu}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 lg:hidden transition cursor-pointer"
            aria-label="منوی موبایل"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* PERSISTENT CRITICAL FLEET INSURANCE ALERT BANNER (< 7 DAYS) */}
      {insuranceAlertData.totalAlertsCount > 0 && (
        <div className="mt-2 bg-rose-50 dark:bg-gradient-to-r dark:from-rose-950/90 dark:via-[#181124] dark:to-[#0d1628] border border-rose-300 dark:border-rose-500/40 rounded-2xl px-3.5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md shadow-rose-950/10 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-rose-900 dark:text-white">
                  هشدار سررسید بیمه‌نامه خودروهای ناوگان (کمتر از ۷ روز)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white dark:bg-rose-500 dark:text-slate-950 font-mono animate-pulse">
                  {toFaDigits(insuranceAlertData.totalAlertsCount)} خودرو نیازمند تمدید
                </span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-200/80 mt-0.5">
                {insuranceAlertData.expiredCount > 0
                  ? `تعداد ${toFaDigits(insuranceAlertData.expiredCount)} خودرو منقضی‌شده و ${toFaDigits(insuranceAlertData.expiringCount)} خودرو کمتر از ۷ روز مهلت دارند (تردد بدون بیمه شخص ثالث غیرمجاز است).`
                  : `اعتبار بیمه‌نامه یا معاینه فنی ${toFaDigits(insuranceAlertData.totalAlertsCount)} خودرو در آستانه سررسید فوری (کمتر از ۷ روز) قرار دارد.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToInsuranceAlerts) onNavigateToInsuranceAlerts();
                else handleTabClick('OIL_SERVICE');
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500 dark:hover:bg-rose-400 dark:text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-rose-950/20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>مشاهده و تمدید در مدیریت ناوگان</span>
            </button>
          </div>
        </div>
      )}

      {/* MOBILE SLIDE-OVER DRAWER */}
      {isMobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex lg:hidden animate-in fade-in duration-150"
        >
          <div
            className="fixed inset-y-0 right-0 w-[85%] max-w-xs bg-[#0d1629] border-l border-slate-800 h-full p-4 overflow-y-auto space-y-4 shadow-2xl z-50 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950">
                  <Truck className="w-4 h-4 text-slate-950" />
                </div>
                <span className="font-black text-white text-sm">منوی سامانه و دسترسی‌ها</span>
              </div>
              <button
                onClick={closeMobileMenu}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile User Profile Card */}
            {currentUser && (
              <div className="p-3 rounded-2xl bg-[#111e38] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-black text-slate-950 shadow-md">
                    {currentUser.fullName ? currentUser.fullName.slice(0, 1) : 'م'}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-bold text-xs text-white truncate">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {currentUser.roleTitle}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
                  {onOpenUserArea && (
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileMenu();
                        onOpenUserArea();
                      }}
                      className="px-2 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold text-center transition flex items-center justify-center gap-1"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>ناحیه کاربری</span>
                    </button>
                  )}

                  {onOpenNotifications && (
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileMenu();
                        onOpenNotifications();
                      }}
                      className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold text-center transition flex items-center justify-center gap-1"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>اعلان‌ها ({toFaDigits(unreadNotificationsCount)})</span>
                    </button>
                  )}
                </div>

                {(onOpenBale || onOpenEitaa) && (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      if (onOpenBale) onOpenBale();
                      else if (onOpenEitaa) onOpenEitaa();
                    }}
                    className="w-full mt-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold text-center transition flex items-center justify-center gap-1.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black">ب</span>
                    <span>پیام‌رسان بله (پیام‌های آماده)</span>
                  </button>
                )}
              </div>
            )}

            {/* SPECIAL SETTINGS SECTION IN MOBILE DRAWER */}
            {currentUser && isMasterAdmin(currentUser) && (
              <div className="p-3 rounded-2xl bg-[#111e38] border border-slate-700/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>تنظیمات شبکه و مدیریت سیستم</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      handleTriggerMasterModal('network');
                    }}
                    className="p-2 rounded-xl bg-[#0e172a] hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>شبکه LAN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      handleTriggerMasterModal('bale');
                    }}
                    className="p-2 rounded-xl bg-[#0e172a] hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5"
                  >
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تنظیمات بله</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      handleTriggerMasterModal('users');
                    }}
                    className="p-2 rounded-xl bg-[#0e172a] hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>کاربران</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      handleTriggerMasterModal('backup');
                    }}
                    className="p-2 rounded-xl bg-[#0e172a] hover:bg-slate-800 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>بک‌آپ JSON</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Nav Modules */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 px-1 mb-1">ماژول‌های کاری</div>
              {visibleNavModules.map((item) => {
                const ItemIcon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabClick(item.id);
                      closeMobileMenu();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs text-right transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon className="w-4 h-4" />
                      <div>
                        <div className="font-bold">{item.title}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                          {item.shortTitle}
                        </div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/60 text-slate-300 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* PWA banner in mobile menu */}
            <div className="pt-2 border-t border-slate-800">
              <PWAInstallButton variant="banner" className="w-full" />
            </div>

            {/* Logout button in mobile */}
            {onLogout && (
              <button
                onClick={() => {
                  closeMobileMenu();
                  onLogout();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج از حساب کاربری</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Spotlight Search Modal Mount */}
      <QuickSearchSpotlight
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        vehicles={vehicles}
        driverDirectory={driverDirectory}
        onNavigateTab={(tab) => {
          handleTabClick(tab);
          setIsSpotlightOpen(false);
        }}
      />

      {/* Laser Print & Watermark Settings Modal */}
      <PrintSettingsModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />
    </header>
  );
};
