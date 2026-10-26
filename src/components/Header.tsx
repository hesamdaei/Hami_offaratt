import { FC, useState, useEffect, useMemo, ComponentType, useRef } from 'react';
import {
  UserCheck,
  CalendarDays,
  Users,
  Droplet,
  BookOpen,
  Search,
  ChevronDown,
  Menu,
  X,
  PanelRight,
  Database,
  Truck,
  Network,
  Bell,
  User,
  LogOut,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Bot,
  Printer,
  Sun,
  Moon,
  Send,
} from 'lucide-react';
import { toFaDigits } from '../utils/jalaali';
import { QuickSearchSpotlight } from './QuickSearchSpotlight';
import { PWAInstallButton } from './PWAInstallButton';
import { PrintSettingsModal } from './PrintSettingsModal';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { FilterView } from '../types';
import { AppUser } from '../types/auth';
import { isMasterAdmin, canViewModule, canManageUsers } from '../utils/authService';
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
  currentUser?: AppUser | null;
  onOpenUserArea?: () => void;
  onOpenUserManagement?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
  onOpenBale?: () => void;
  onOpenEitaa?: () => void;
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
  totalVehiclesCount = 0,
  vehicles = [],
  driverDirectory = [],
  isSidebarOpen,
  onToggleSidebar,
  onOpenBackup,
  onOpenLanSharing,
  networkDbStatus,
  currentUser,
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
  // Spotlight Search Modal
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  // Mobile drawer local fallback state
  const [localMobileMenuOpen, setLocalMobileMenuOpen] = useState(false);
  const isMobileMenuOpen = propIsMobileMenuOpen !== undefined ? propIsMobileMenuOpen : localMobileMenuOpen;
  const toggleMobileMenu = onToggleMobileMenu || (() => setLocalMobileMenuOpen((prev) => !prev));
  const closeMobileMenu = onCloseMobileMenu || (() => setLocalMobileMenuOpen(false));

  // Unified Tools & Settings Dropdown Menu
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
      title: 'تابلوی حضور و غیاب',
      shortTitle: 'حضور و غیاب',
      icon: CalendarDays,
      badge: totalDrivers > 0 ? toFaDigits(totalDrivers) : undefined,
    },
    {
      id: 'VEHICLE_ASSIGNMENT',
      title: 'تخصیص خودرو و راننده',
      shortTitle: 'تخصیص خودرو',
      icon: Truck,
      badge: unassignedVehiclesCount > 0 ? `${toFaDigits(unassignedVehiclesCount)} آزاد` : undefined,
    },
    {
      id: 'DRIVERS',
      title: 'پرونده رانندگان',
      shortTitle: 'رانندگان',
      icon: Users,
      badge: driverDirectory.length > 0 ? toFaDigits(driverDirectory.length) : undefined,
    },
    {
      id: 'STAFF',
      title: 'پرونده پرسنل',
      shortTitle: 'پرسنل',
      icon: UserCheck,
      badge: totalStaff > 0 ? toFaDigits(totalStaff) : undefined,
    },
    {
      id: 'OIL_SERVICE',
      title: 'مدیریت ناوگان و خودروها',
      shortTitle: 'مدیریت ناوگان',
      icon: Droplet,
      badge: totalVehiclesCount > 0 ? toFaDigits(totalVehiclesCount) : undefined,
    },
    {
      id: 'REGULATIONS',
      title: 'آیین‌نامه انضباطی',
      shortTitle: 'آیین‌نامه',
      icon: BookOpen,
    },
    {
      id: 'USERS_LOGS',
      title: 'مدیریت کاربران و لاگ',
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

  const currentActive = navModules.find((m) => m.id === activeTab) || navModules[0];
  const ActiveIcon = currentActive.icon;

  return (
    <header className="mb-3 select-none">
      {/* CLEAN, MINIMALSINGLE-ROW TOP BAR */}
      <div className="bg-white/95 dark:bg-[#0b1325]/95 backdrop-blur-md text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 h-13 flex items-center justify-between gap-3">
        {/* RIGHT (RTL): Sidebar Toggle + Brand + Active Page Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70 transition cursor-pointer"
              title="باز/بستن منوی کناری"
              aria-label="تغییر وضعیت سایدبار"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          {/* Brand Identity */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070b14] flex items-center justify-center p-0.5">
              <img src="/brand-logo.png" alt="حامی" className="w-full h-full object-contain rounded" />
            </div>
            <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
              حامی
            </span>
          </div>

          {/* Clean Unboxed Breadcrumb */}
          <span className="text-slate-300 dark:text-slate-700 text-sm">/</span>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <ActiveIcon className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">
              {currentActive.title}
            </span>
          </div>
        </div>

        {/* LEFT (LTR): Clean 4-Control Action Group */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. Compact Insurance Alert Indicator (Only if alerts > 0) */}
          {insuranceAlertData.totalAlertsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateToInsuranceAlerts) onNavigateToInsuranceAlerts();
                else handleTabClick('OIL_SERVICE');
              }}
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
              title={`${toFaDigits(insuranceAlertData.totalAlertsCount)} خودرو نیازمند تمدید بیمه یا معاینه فنی`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden md:inline">بیمه:</span>
              <span>{toFaDigits(insuranceAlertData.totalAlertsCount)}</span>
            </button>
          )}

          {/* 2. Spotlight Quick Search */}
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer"
            title="جستجوی سریع (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">جستجو...</span>
          </button>

          {/* 3. Theme Toggle (Icon Only) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 transition cursor-pointer"
              title={theme === 'light' ? 'حالت تیره' : 'حالت روشن'}
              aria-label="تغییر پوسته"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          )}

          {/* 4. Notification Bell (Icon Only) */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 transition cursor-pointer"
              title="اعلان‌ها"
              aria-label="اعلان‌ها"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          )}

          {/* 5. Unified Tools, Settings & User Dropdown */}
          <div className="relative" ref={masterMenuRef}>
            <button
              type="button"
              onClick={() => setIsMasterMenuOpen(!isMasterMenuOpen)}
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border transition text-xs font-bold cursor-pointer ${
                isMasterMenuOpen
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/70'
              }`}
              title="منوی ابزارها، تنظیمات و حساب کاربری"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline max-w-[90px] truncate">
                {currentUser?.fullName || 'امکانات'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  networkDbStatus === 'SYNCED'
                    ? 'bg-emerald-500'
                    : networkDbStatus === 'SAVING'
                    ? 'bg-sky-500 animate-spin'
                    : 'bg-amber-500'
                }`}
              />
              <ChevronDown className={`w-3 h-3 transition-transform ${isMasterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMasterMenuOpen && (
              <div className="absolute left-0 right-auto top-full mt-1.5 w-64 bg-white dark:bg-[#0d1629] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl p-1.5 z-50 text-right">
                {currentUser && (
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentUser.fullName}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isMasterAdmin(currentUser) ? 'مدیر ارشد سیستم' : 'کارشناس دیسپچ'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {networkDbStatus === 'SYNCED' ? 'شبکه متصل' : 'محلی'}
                    </span>
                  </div>
                )}

                <div className="space-y-0.5 text-xs">
                  {/* Bale Messenger */}
                  {(onOpenBale || onOpenEitaa) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        const fn = onOpenBale || onOpenEitaa;
                        if (fn) fn();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold">ارسال پیام در بله</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">پیام آماده به رانندگان</div>
                      </div>
                    </button>
                  )}

                  {/* Print & Watermark */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMasterMenuOpen(false);
                      setIsPrintSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold">تنظیمات چاپ و واترمارک</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">چاپگر لیزری و متن سربرگ</div>
                    </div>
                  </button>

                  {currentUser && isMasterAdmin(currentUser) && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTriggerMasterModal('network')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                      >
                        <Network className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold">تنظیمات شبکه LAN</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">همگام‌سازی سرور مرکزی</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerMasterModal('bale')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                      >
                        <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold">ربات پیام‌رسان بله</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">توکن بات و اعلان خودکار</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerMasterModal('users')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-bold">مدیریت کاربران</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">سطح دسترسی و رمزها</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerMasterModal('backup')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                      >
                        <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div>
                          <div className="font-bold">بک‌آپ و بازیابی اطلاعات</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">دانلود و ریستور فایل JSON</div>
                        </div>
                      </button>
                    </>
                  )}

                  {onOpenUserArea && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenUserArea();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div>
                        <div className="font-bold">حساب کاربری</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">تغییر رمز عبور</div>
                      </div>
                    </button>
                  )}
                </div>

                {onLogout && (
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition text-xs font-bold text-right cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج از سامانه</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-lg lg:hidden transition cursor-pointer"
            aria-label="منوی موبایل"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {isMobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex lg:hidden animate-in fade-in duration-150"
        >
          <div
            className="fixed inset-y-0 right-0 w-[82%] max-w-xs bg-white dark:bg-[#0d1629] border-l border-slate-200 dark:border-slate-800 h-full p-4 overflow-y-auto space-y-4 shadow-2xl z-50 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950">
                  <Truck className="w-4 h-4 text-slate-950" />
                </div>
                <span className="font-black text-slate-900 dark:text-white text-sm">منوی سامانه حامی</span>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Modules */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 px-1 mb-1">بخش‌های سامانه</div>
              {visibleNavModules.map((item) => {
                const ItemIcon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleTabClick(item.id);
                      closeMobileMenu();
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-right transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon className="w-4 h-4" />
                      <span className="font-bold">{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] opacity-80 font-mono">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <PWAInstallButton variant="banner" className="w-full" />
            </div>

            {onLogout && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onLogout();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج از حساب کاربری</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spotlight Search Modal */}
      <QuickSearchSpotlight
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        vehicles={vehicles}
        drivers={driverDirectory}
        onSelectTab={(tab) => handleTabClick(tab)}
      />

      {/* Laser Print & Watermark Settings Modal */}
      <PrintSettingsModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />
    </header>
  );
};
