import { FC, useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  Menu,
  X,
  PanelRight,
  Database,
  Truck,
  Bell,
  User,
  LogOut,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Printer,
  Sun,
  Moon,
  Send,
  PhoneCall,
  KeyRound,
  Activity,
  Users,
  LayoutGrid,
} from 'lucide-react';
import { toFaDigits } from '../utils/jalaali';
import { QuickSearchSpotlight } from './QuickSearchSpotlight';
import { PWAInstallButton } from './PWAInstallButton';
import { PrintSettingsModal } from './PrintSettingsModal';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { FilterView } from '../types';
import { AppUser } from '../types/auth';
import {
  isMasterAdmin,
  canManageUsers,
  canManageSystemSettings,
  canAccessBackup,
} from '../utils/authService';
import { getFleetInsuranceAlerts } from '../utils/insuranceAlerts';
import {
  ActiveAppTab,
  getVisibleNavigationGroups,
  getVisibleNavigationItems,
  getNavItemByTab,
  getNavGroupByTab,
} from '../constants/navigationConfig';

export type { ActiveAppTab };

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
  onOpenMasterAdmin?: (
    initialTab?: 'api' | 'voip' | 'network' | 'bale' | 'eitaa' | 'users' | 'backup' | 'debug'
  ) => void;
  onNavigateToInsuranceAlerts?: () => void;
  onOpenVoipSettings?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: FC<HeaderProps> = ({
  activeTab = 'DASHBOARD',
  onTabChange,
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
  onOpenVoipSettings,
  isMobileMenuOpen: propIsMobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [localMobileMenuOpen, setLocalMobileMenuOpen] = useState(false);
  const isMobileMenuOpen =
    propIsMobileMenuOpen !== undefined ? propIsMobileMenuOpen : localMobileMenuOpen;
  const toggleMobileMenu =
    onToggleMobileMenu || (() => setLocalMobileMenuOpen((prev) => !prev));
  const closeMobileMenu = onCloseMobileMenu || (() => setLocalMobileMenuOpen(false));

  // Tools & Account Dropdown
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(false);
  // All Modules Megamenu Popover (useful when sidebar is closed or on tablet)
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);

  const masterMenuRef = useRef<HTMLDivElement>(null);
  const modulesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (masterMenuRef.current && !masterMenuRef.current.contains(event.target as Node)) {
        setIsMasterMenuOpen(false);
      }
      if (modulesMenuRef.current && !modulesMenuRef.current.contains(event.target as Node)) {
        setIsModulesMenuOpen(false);
      }
    };
    if (isMasterMenuOpen || isModulesMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMasterMenuOpen, isModulesMenuOpen]);

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

  const insuranceAlertData = useMemo(() => {
    return getFleetInsuranceAlerts(vehicles, 7);
  }, [vehicles]);

  // Permitted navigation groups & items from centralized config
  const visibleGroups = useMemo(() => {
    return getVisibleNavigationGroups(currentUser);
  }, [currentUser]);

  const visibleItems = useMemo(() => {
    return getVisibleNavigationItems(currentUser);
  }, [currentUser]);

  // Quick-access pinned bar items (Core daily items + current active tab if it's a specialized module)
  const quickBarItems = useMemo(() => {
    const baseQuick = visibleItems.filter((item) => item.isQuickAccess);
    const currentItem = getNavItemByTab(activeTab);
    if (
      currentItem &&
      visibleItems.some((v) => v.id === currentItem.id) &&
      !baseQuick.some((q) => q.id === currentItem.id)
    ) {
      return [...baseQuick, currentItem];
    }
    return baseQuick;
  }, [visibleItems, activeTab]);

  const currentNavItem = useMemo(() => getNavItemByTab(activeTab), [activeTab]);
  const currentNavGroup = useMemo(() => getNavGroupByTab(activeTab), [activeTab]);

  const handleTabClick = (tab: ActiveAppTab) => {
    if (typeof onTabChange === 'function') {
      onTabChange(tab);
    }
  };

  const handleTriggerMasterModal = (
    tab: 'api' | 'voip' | 'network' | 'bale' | 'eitaa' | 'users' | 'backup' | 'debug'
  ) => {
    setIsMasterMenuOpen(false);
    if (onOpenMasterAdmin) {
      onOpenMasterAdmin(tab);
    } else if ((tab === 'network' || tab === 'api') && onOpenLanSharing) {
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
    <header className="relative z-40 mb-3 select-none" dir="rtl">
      <div className="relative z-40 bg-white/95 dark:bg-[#0b1325]/95 backdrop-blur-md text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-sm">
        {/* RIGHT (RTL): Sidebar Toggle + Brand + Contextual Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-xl transition cursor-pointer shrink-0 ${
                isSidebarOpen
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70'
              }`}
              title={isSidebarOpen ? 'بستن منوی کناری' : 'باز کردن منوی کناری'}
              aria-label="تغییر وضعیت منوی کناری"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => handleTabClick('DASHBOARD')}
            className="flex items-center gap-2 shrink-0 cursor-pointer group"
            title="بازگشت به داشبورد عملیات"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070b14] flex items-center justify-center p-0.5">
              <img
                src="/brand-logo.png"
                alt="حامی"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white group-hover:text-amber-500 transition">
              حامی
            </span>
          </button>

          {/* Contextual Breadcrumb (Current Group > Current Page) */}
          {currentNavItem && (
            <nav
              aria-label="مسیر صفحه جاری"
              className="hidden sm:flex items-center gap-1.5 pr-2 mr-1 border-r border-slate-200 dark:border-slate-800 text-xs min-w-0"
            >
              {currentNavGroup && (
                <>
                  <span className="text-slate-400 dark:text-slate-500 font-bold truncate hidden xl:inline">
                    {currentNavGroup.shortTitle}
                  </span>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0 hidden xl:inline" />
                </>
              )}
              <span className="font-extrabold text-amber-600 dark:text-amber-400 truncate">
                {currentNavItem.label}
              </span>
            </nav>
          )}
        </div>

        {/* CENTER: Focused Quick-Access Bar + Grouped "All Modules" Selector */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-1">
          {quickBarItems.map((item) => {
            const ItemIcon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                aria-current={isSelected ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}

          {/* Grouped All-Modules Popover Button */}
          <div className="relative" ref={modulesMenuRef}>
            <button
              type="button"
              onClick={() => setIsModulesMenuOpen((prev) => !prev)}
              aria-expanded={isModulesMenuOpen}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition cursor-pointer ${
                isModulesMenuOpen
                  ? 'bg-slate-900 text-white border-slate-800 dark:bg-slate-800 dark:text-amber-400 dark:border-amber-500/40'
                  : 'bg-slate-50 dark:bg-[#111c33] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              title="مشاهده دسته‌بندی کامل تمام بخش‌های سامانه"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
              <span>همه بخش‌ها</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isModulesMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isModulesMenuOpen && (
              <div className="fixed sm:absolute right-2 sm:right-auto left-2 sm:left-0 top-14 sm:top-full mt-1 sm:w-[540px] max-h-[80vh] overflow-y-auto bg-white dark:bg-[#0d1629] border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl p-3 z-[110] text-right">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleGroups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <div
                        key={group.id}
                        className="bg-slate-50/70 dark:bg-[#09101f] border border-slate-200/70 dark:border-slate-800/80 rounded-xl p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-600 dark:text-amber-400 pb-1 border-b border-slate-200/70 dark:border-slate-800">
                          <GroupIcon className="w-3.5 h-3.5" />
                          <span>{group.title}</span>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((mod) => {
                            const ModIcon = mod.icon;
                            const isSelected = activeTab === mod.id;
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => {
                                  setIsModulesMenuOpen(false);
                                  handleTabClick(mod.id);
                                }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition text-right cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/80'
                                }`}
                              >
                                <ModIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{mod.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LEFT (LTR): Action Controls & Tools/User Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. Insurance Alert Indicator */}
          {insuranceAlertData.totalAlertsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateToInsuranceAlerts) onNavigateToInsuranceAlerts();
                else handleTabClick('FLEET_MANAGEMENT');
              }}
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-xs font-bold transition cursor-pointer"
              title={`${toFaDigits(insuranceAlertData.totalAlertsCount)} خودرو نیازمند تمدید بیمه یا معاینه فنی`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden xl:inline">بیمه:</span>
              <span>{toFaDigits(insuranceAlertData.totalAlertsCount)}</span>
            </button>
          )}

          {/* 2. Spotlight Quick Search (Ctrl+K) */}
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer gap-1.5"
            title="جستجوی سریع در منوها، رانندگان و خودروها (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden xl:inline text-slate-500 dark:text-slate-400">جستجو</span>
          </button>

          {/* 3. Phonebook & Unified PBX Button (Opens Phonebook View) */}
          <button
            type="button"
            onClick={() => handleTabClick('PHONEBOOK')}
            className={`flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 rounded-xl text-xs font-bold transition cursor-pointer gap-1.5 ${
              activeTab === 'PHONEBOOK'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-500/40'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
            }`}
            title="دفترچه تلفن هوشمند و ارتباط با رانندگان"
          >
            <PhoneCall className={`w-3.5 h-3.5 ${activeTab === 'PHONEBOOK' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className="hidden xl:inline">تلفن</span>
          </button>

          {/* 4. Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 transition cursor-pointer"
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

          {/* 5. Notification Bell */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 transition cursor-pointer"
              title="اعلان‌ها"
              aria-label="اعلان‌ها"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          )}

          {/* 6. Unified Tools & Account Dropdown (No duplicate 17-item module grid) */}
          <div className="relative z-50" ref={masterMenuRef}>
            <button
              type="button"
              onClick={() => setIsMasterMenuOpen((prev) => !prev)}
              aria-expanded={isMasterMenuOpen}
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-xl border transition text-xs font-bold cursor-pointer ${
                isMasterMenuOpen
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/70'
              }`}
              title="ابزارهای کمکی، تنظیمات و حساب کاربری"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline max-w-[95px] truncate">ابزارها و حساب</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  networkDbStatus === 'SYNCED'
                    ? 'bg-emerald-500'
                    : networkDbStatus === 'SAVING'
                    ? 'bg-sky-500 animate-spin'
                    : 'bg-amber-500'
                }`}
              />
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isMasterMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isMasterMenuOpen && (
              <div className="absolute left-0 right-auto top-full mt-2 w-72 max-h-[82vh] overflow-y-auto bg-white dark:bg-[#0d1629] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-[100] text-right">
                {currentUser && (
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.fullName}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isMasterAdmin(currentUser)
                          ? 'مدیر ارشد سیستم'
                          : currentUser.roleTitle || 'کاربر سامانه'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      {networkDbStatus === 'SYNCED' ? 'شبکه متصل' : 'حافظه محلی'}
                    </span>
                  </div>
                )}

                {/* Operational Tools */}
                <div className="space-y-0.5 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    ابزارهای عملیاتی و ارتباطی
                  </div>

                  {(onOpenBale || onOpenEitaa) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        const fn = onOpenBale || onOpenEitaa;
                        if (fn) fn();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold">ارسال پیام در بله</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          ارسال پیام‌های آماده به رانندگان
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMasterMenuOpen(false);
                      setIsPrintSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold">تنظیمات چاپ و سربرگ</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        چاپگر لیزری و واترمارک گزارش‌ها
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMasterMenuOpen(false);
                      onOpenVoipSettings?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold">تنظیمات سانترال و داخلی تلفن (VoIP)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        ثبت شماره داخلی، پیش‌کد خط و تلفن رومیزی هر کاربر
                      </div>
                    </div>
                  </button>

                  {currentUser && canAccessBackup(currentUser) && !canManageSystemSettings(currentUser) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenBackup?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div>
                        <div className="font-bold">پشتیبان‌گیری و بازیابی</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          مدیریت فایل پشتیبان داده‌ها
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Admin Infrastructure, APIs, VoIP and Security Section */}
                  {currentUser &&
                    (canManageSystemSettings(currentUser) || canManageUsers(currentUser)) && (
                      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5">
                        <div className="px-2.5 py-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 flex items-center justify-between">
                          <span>مدیریت زیرساخت و امنیت</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-bold">
                            مدیریتی
                          </span>
                        </div>

                        {canManageSystemSettings(currentUser) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTriggerMasterModal('api')}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div>
                                <div className="font-bold">تنظیمات شبکه، وب‌سرویس و API</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  سرور LAN، سینک دیتابیس و ربات بله
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsMasterMenuOpen(false);
                                onOpenVoipSettings?.();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                            >
                              <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div>
                                <div className="font-bold">مدیریت داخلی همه کاربران و سانترال</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  اتصال AMI، ایزابل/استریسک و جدول داخلی‌ها
                                </div>
                              </div>
                            </button>
                          </>
                        )}

                        {canManageUsers(currentUser) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMasterMenuOpen(false);
                              handleTabClick('USERS_LOGS');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                          >
                            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <div>
                              <div className="font-bold">کاربران و سطوح دسترسی</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                مدیریت حساب‌های کاربری و لاگ سیستم
                              </div>
                            </div>
                          </button>
                        )}

                        {canAccessBackup(currentUser) && (
                          <button
                            type="button"
                            onClick={() => handleTriggerMasterModal('backup')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                          >
                            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div>
                              <div className="font-bold">پشتیبان‌گیری و بازیابی داده‌ها</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                دانلود و ریستور فایل JSON و پایگاه داده
                              </div>
                            </div>
                          </button>
                        )}

                        {canManageSystemSettings(currentUser) && (
                          <button
                            type="button"
                            onClick={() => handleTriggerMasterModal('debug')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                          >
                            <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <div>
                              <div className="font-bold">پایش سلامت و عیب‌یابی داده‌ها</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                بررسی یکپارچگی رکوردها و رفع مغایرت
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    )}

                  {onOpenUserArea && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onOpenUserArea();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-right cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div>
                        <div className="font-bold">ناحیه کاربری من</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          مشخصات کاربری و تغییر رمز عبور
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {onLogout && (
                  <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMasterMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition text-xs font-bold text-right cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج از سامانه</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger (Opens unified grouped Sidebar on mobile) */}
          <button
            type="button"
            onClick={() => {
              if (onToggleSidebar) {
                onToggleSidebar();
              } else {
                toggleMobileMenu();
              }
            }}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-xl lg:hidden transition cursor-pointer"
            aria-label="منوی اصلی موبایل"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Fallback Mobile Drawer (if used standalone without Sidebar12) */}
      {isMobileMenuOpen && !onToggleSidebar && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex lg:hidden animate-in fade-in duration-150"
        >
          <div
            className="fixed inset-y-0 right-0 w-[82%] max-w-xs bg-white dark:bg-[#0d1629] border-l border-slate-200 dark:border-slate-800 h-full p-4 overflow-y-auto space-y-4 shadow-2xl z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950">
                  <Truck className="w-4 h-4 text-slate-950" />
                </div>
                <span className="font-black text-slate-900 dark:text-white text-sm">حامی</span>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {visibleGroups.map((group) => (
                <div key={group.id} className="space-y-1">
                  <div className="text-[11px] font-bold text-amber-500 px-1">{group.title}</div>
                  {group.items.map((item) => {
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
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-right transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4" />
                        <span className="font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <PWAInstallButton variant="banner" className="w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Spotlight Search Modal */}
      <QuickSearchSpotlight
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        vehicles={vehicles}
        drivers={driverDirectory}
        currentUser={currentUser}
        onOpenBackup={onOpenBackup}
        onNavigateTab={(tab) => handleTabClick(tab)}
      />

      {/* Laser Print & Watermark Settings Modal */}
      <PrintSettingsModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />
    </header>
  );
};
