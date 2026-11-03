import { FC, useState, useMemo, useEffect } from 'react';
import {
  PanelRight,
  PanelLeft,
  SlidersHorizontal,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Search,
  ChevronsUpDown,
} from 'lucide-react';
import { ActiveAppTab } from './Header';
import { toFaDigits } from '../utils/jalaali';
import { AppUser } from '../types/auth';
import { isMasterAdmin, canManageSystemSettings } from '../utils/authService';
import { VehicleItem } from '../utils/fleetSeedData';
import { getFleetInsuranceAlerts } from '../utils/insuranceAlerts';
import {
  NavGroupId,
  getVisibleNavigationGroups,
  getNavGroupByTab,
} from '../constants/navigationConfig';

const STORAGE_KEY_EXPANDED_GROUPS = 'hamibar_nav_expanded_groups_v1';

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
  const [menuSearch, setMenuSearch] = useState('');

  // Load persisted expanded groups (defaulting to CORE_DAILY, FLEET_MAINTENANCE, and the active tab's group)
  const [expandedGroups, setExpandedGroups] = useState<Record<NavGroupId, boolean>>(() => {
    const activeGroup = getNavGroupByTab(activeTab)?.id || 'CORE_DAILY';
    const defaults: Record<NavGroupId, boolean> = {
      CORE_DAILY: true,
      FLEET_MAINTENANCE: true,
      HR_DOSSIERS: activeGroup === 'HR_DOSSIERS',
      DISPATCH_CARGO: activeGroup === 'DISPATCH_CARGO',
      ADMIN_REPORTS: activeGroup === 'ADMIN_REPORTS',
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPANDED_GROUPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed, [activeGroup]: true };
      }
    } catch {}
    return defaults;
  });

  // Automatically ensure the parent group of activeTab is expanded when activeTab changes (e.g. via URL, Back/Forward, or Spotlight)
  useEffect(() => {
    const parentGroup = getNavGroupByTab(activeTab);
    if (parentGroup && !expandedGroups[parentGroup.id]) {
      setExpandedGroups((prev) => {
        const next = { ...prev, [parentGroup.id]: true };
        try {
          localStorage.setItem(STORAGE_KEY_EXPANDED_GROUPS, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [activeTab]);

  const toggleGroup = (groupId: NavGroupId) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem(STORAGE_KEY_EXPANDED_GROUPS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const insuranceAlertData = useMemo(() => {
    return getFleetInsuranceAlerts(vehicles, 7);
  }, [vehicles]);

  const unassignedVehiclesCount = useMemo(() => {
    return vehicles.filter(
      (v) => !v.driverName || v.driverName === 'بدون راننده' || v.driverName === 'NONE'
    ).length;
  }, [vehicles]);

  // Dynamic badge resolver for specific items
  const getItemBadge = (tabId: ActiveAppTab): { text: string; isAlert?: boolean } | null => {
    switch (tabId) {
      case 'ATTENDANCE':
        return todayActiveCount > 0 ? { text: `${toFaDigits(todayActiveCount)} حاضر` } : null;
      case 'FLEET_MANAGEMENT':
        if (insuranceAlertData.totalAlertsCount > 0) {
          return {
            text: `${toFaDigits(insuranceAlertData.totalAlertsCount)} هشدار`,
            isAlert: true,
          };
        }
        return totalVehiclesCount > 0 ? { text: toFaDigits(totalVehiclesCount) } : null;
      case 'VEHICLE_ASSIGNMENT':
        return unassignedVehiclesCount > 0
          ? { text: `${toFaDigits(unassignedVehiclesCount)} آزاد` }
          : null;
      case 'DRIVERS':
        return totalDrivers > 0 ? { text: toFaDigits(totalDrivers) } : null;
      case 'STAFF':
        return totalStaff > 0 ? { text: toFaDigits(totalStaff) } : null;
      case 'PHONEBOOK':
        return null;
      default:
        return null;
    }
  };

  // Filter groups and items based on user permissions and optional sidebar search query
  const visibleGroups = useMemo(() => {
    const permittedGroups = getVisibleNavigationGroups(currentUser);
    const q = menuSearch.trim().toLowerCase();
    if (!q) return permittedGroups;

    return permittedGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.shortLabel.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.toLowerCase().includes(q))
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [currentUser, menuSearch]);

  const allExpanded = useMemo(() => {
    return visibleGroups.every((g) => expandedGroups[g.id]);
  }, [visibleGroups, expandedGroups]);

  const handleToggleAllGroups = () => {
    const targetState = !allExpanded;
    const activeGroup = getNavGroupByTab(activeTab)?.id;
    const next: Record<NavGroupId, boolean> = {
      CORE_DAILY: targetState || activeGroup === 'CORE_DAILY',
      FLEET_MAINTENANCE: targetState || activeGroup === 'FLEET_MAINTENANCE',
      HR_DOSSIERS: targetState || activeGroup === 'HR_DOSSIERS',
      DISPATCH_CARGO: targetState || activeGroup === 'DISPATCH_CARGO',
      ADMIN_REPORTS: targetState || activeGroup === 'ADMIN_REPORTS',
    };
    setExpandedGroups(next);
    try {
      localStorage.setItem(STORAGE_KEY_EXPANDED_GROUPS, JSON.stringify(next));
    } catch {}
  };

  return (
    <aside
      dir="rtl"
      aria-label="منوی اصلی ناوبری سامانه حامی"
      className={`relative z-30 transition-all duration-200 shrink-0 select-none ${
        isCollapsed ? 'w-[68px]' : 'w-[260px]'
      }`}
    >
      <div
        className={`sticky top-3 flex flex-col bg-white dark:bg-[#0f182a] border border-slate-200 dark:border-[#1e2c46] shadow-md dark:shadow-xl rounded-2xl transition-all duration-200 max-h-[calc(100vh-24px)] ${
          isCollapsed ? 'p-2' : 'p-3'
        }`}
      >
        {/* 1. BRAND HEADER & COLLAPSE TOGGLE */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-xs">
                ح
              </div>
              <div className="truncate">
                <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                  سامانه حامی
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  مدیریت یکپارچه ناوگان و تردد
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <button
                type="button"
                onClick={handleToggleAllGroups}
                className="flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#162238] dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white w-7 h-7 transition cursor-pointer"
                title={allExpanded ? 'جمع کردن گروه‌های فرعی' : 'باز کردن همه گروه‌ها'}
                aria-label={allExpanded ? 'جمع کردن گروه‌های فرعی' : 'باز کردن همه گروه‌ها'}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-7 h-7 transition cursor-pointer"
                title="بستن منو"
                aria-label="بستن منو"
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
              title={isCollapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری'}
              aria-label={isCollapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری'}
            >
              {isCollapsed ? (
                <PanelRight className="w-4 h-4 text-amber-500" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 1.5 QUICK FILTER IN SIDEBAR (When Expanded) */}
        {!isCollapsed && (
          <div className="relative mb-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="فیلتر سریع منو..."
              aria-label="فیلتر سریع منوها"
              className="w-full bg-slate-50 dark:bg-[#09101f] border border-slate-200 dark:border-slate-800 focus:border-amber-500/60 rounded-xl pr-8 pl-6 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition"
            />
            {menuSearch && (
              <button
                type="button"
                onClick={() => setMenuSearch('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                aria-label="پاک کردن فیلتر منو"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* 2. COLLAPSIBLE TASK-BASED NAVIGATION GROUPS */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-2 py-0.5 pr-0.5">
          {visibleGroups.map((group, groupIdx) => {
            const GroupIcon = group.icon;
            const hasActiveChild = group.items.some((item) => item.id === activeTab);
            const isExpanded = Boolean(menuSearch.trim()) || expandedGroups[group.id] || hasActiveChild;

            return (
              <div
                key={group.id}
                className={`rounded-xl transition-colors ${
                  !isCollapsed && hasActiveChild
                    ? 'bg-slate-50/70 dark:bg-[#131f35]/50 border border-slate-200/60 dark:border-slate-800/80 p-1'
                    : ''
                }`}
              >
                {/* Group Header */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                      hasActiveChild
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GroupIcon className="w-3.5 h-3.5 shrink-0 opacity-85" />
                      <span className="truncate">{group.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {hasActiveChild && !isExpanded && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>
                ) : groupIdx > 0 ? (
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1.5 mx-1" />
                ) : null}

                {/* Group Items */}
                {(isCollapsed || isExpanded) && (
                  <div className={`space-y-0.5 ${!isCollapsed ? 'mt-0.5' : ''}`}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const badge = getItemBadge(item.id);

                      return (
                        <div key={item.id} className="relative group/item">
                          <button
                            type="button"
                            onClick={() => onTabChange(item.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 text-right cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                              isCollapsed ? 'h-10 justify-center px-0' : 'py-2 px-2.5'
                            } ${
                              isActive
                                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#162238]/80 font-medium'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive
                                  ? 'text-slate-950'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            />

                            {!isCollapsed && (
                              <div className="flex-1 flex items-center justify-between min-w-0 gap-1">
                                <span
                                  className={`text-xs truncate ${
                                    isActive
                                      ? 'text-slate-950 font-black'
                                      : 'text-slate-800 dark:text-slate-200 font-bold'
                                  }`}
                                >
                                  {item.label}
                                </span>

                                {badge && (
                                  <span
                                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                                      isActive
                                        ? 'bg-slate-950/15 text-slate-950'
                                        : badge.isAlert
                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {badge.text}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>

                          {/* Accessible Flyout Tooltip when sidebar is collapsed */}
                          {isCollapsed && (
                            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:flex items-center z-50 pointer-events-none">
                              <div className="bg-slate-900 text-white border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap flex flex-col gap-0.5">
                                <span className="text-[9px] text-amber-400 font-normal">
                                  {group.shortTitle}
                                </span>
                                <span>{item.label}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 3. COMPACT USER & SYSTEM FOOTER */}
        <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 shrink-0">
          {!isCollapsed && (
            <button
              type="button"
              onClick={onOpenUserArea}
              className="flex items-center gap-2 min-w-0 flex-1 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer text-right"
              title="ناحیه کاربری و تغییر رمز"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                {currentUser?.fullName ? currentUser.fullName.slice(0, 1) : 'ک'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {currentUser?.fullName || 'کاربر سیستم'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {isMasterAdmin(currentUser) ? 'مدیر ارشد' : currentUser?.roleTitle || 'کاربر'}
                </div>
              </div>
            </button>
          )}

          <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col mx-auto' : ''}`}>
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
                title={theme === 'light' ? 'حالت تیره' : 'حالت روشن'}
                aria-label="تغییر پوسته"
              >
                {theme === 'light' ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>
            )}

            {canManageSystemSettings(currentUser) && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenMasterAdmin) onOpenMasterAdmin('network');
                  else if (onOpenLanSharing) onOpenLanSharing();
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
                title="تنظیمات زیرساخت و شبکه"
                aria-label="تنظیمات سیستم"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
                title="خروج از حساب کاربری"
                aria-label="خروج از حساب کاربری"
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
