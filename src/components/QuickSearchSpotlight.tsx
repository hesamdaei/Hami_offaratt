import { FC, useState, useEffect, useMemo, useRef, ComponentType } from 'react';
import {
  Search,
  X,
  Users,
  Droplet,
  CornerDownLeft,
  Database,
} from 'lucide-react';
import { ActiveAppTab } from './Header';
import { toFaDigits, normalizePersianDigits } from '../utils/jalaali';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { formatIranianPlateString } from './IranianPlate';
import { AppUser } from '../types/auth';
import { canAccessBackup, canAccessTab } from '../utils/authService';
import { getVisibleNavigationItems, getNavGroupByTab } from '../constants/navigationConfig';

interface QuickSearchSpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveAppTab) => void;
  vehicles?: VehicleItem[];
  drivers?: DriverDirectoryItem[];
  currentUser?: AppUser | null;
  onOpenBackup?: () => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'منو و بخش‌های سامانه' | 'خودروهای ناوگان' | 'رانندگان';
  targetTab: ActiveAppTab;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}

export const QuickSearchSpotlight: FC<QuickSearchSpotlightProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  vehicles = [],
  drivers = [],
  currentUser = null,
  onOpenBackup,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build menu items dynamically from centralized navigation config filtered by user permissions
  const menuItems: SearchResultItem[] = useMemo(() => {
    const visibleNavs = getVisibleNavigationItems(currentUser);
    const list: SearchResultItem[] = visibleNavs.map((item) => {
      const group = getNavGroupByTab(item.id);
      return {
        id: `menu-${item.id}`,
        title: item.label,
        subtitle: item.description,
        category: 'منو و بخش‌های سامانه',
        targetTab: item.id,
        icon: item.icon,
        badge: group?.shortTitle || item.shortLabel,
      };
    });

    if (canAccessBackup(currentUser) && onOpenBackup) {
      list.push({
        id: 'menu-backup',
        title: 'پشتیبان‌گیری دستی و بازیابی اطلاعات (JSON Backup)',
        subtitle: 'دانلود نسخه پشتیبان دستی از کلیه اطلاعات سامانه یا بازیابی اطلاعات از فایل JSON',
        category: 'منو و بخش‌های سامانه',
        targetTab: 'DASHBOARD',
        icon: Database,
        badge: 'بک‌آپ دستی',
      });
    }

    return list;
  }, [currentUser, onOpenBackup]);

  // Filtered Results
  const searchResults = useMemo(() => {
    const rawQ = query.trim();
    const q = normalizePersianDigits(rawQ).toLowerCase();
    if (!q) {
      return menuItems;
    }

    const matches: SearchResultItem[] = [];

    // 1. Search in permitted menus
    menuItems.forEach((item) => {
      const hay = normalizePersianDigits(
        `${item.title} ${item.subtitle} ${item.badge || ''} ${item.targetTab}`
      ).toLowerCase();
      if (hay.includes(q)) {
        matches.push(item);
      }
    });

    // 2. Search in drivers directory (if user has access to DRIVERS or PHONEBOOK)
    if (canAccessTab(currentUser, 'DRIVERS') || canAccessTab(currentUser, 'PHONEBOOK')) {
      const targetDriverTab: ActiveAppTab = canAccessTab(currentUser, 'DRIVERS')
        ? 'DRIVERS'
        : 'PHONEBOOK';
      drivers.forEach((d) => {
        const hay = normalizePersianDigits(
          `${d.name || ''} ${d.phone || ''} ${d.nationalCode || ''} ${d.code || ''} ${d.personnelCode || ''}`
        ).toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            id: `driver-${d.id}`,
            title: d.name,
            subtitle: `کد: ${toFaDigits(d.code || d.personnelCode || '-')} | تماس: ${toFaDigits(
              d.phone || '-'
            )}`,
            category: 'رانندگان',
            targetTab: targetDriverTab,
            icon: Users,
            badge: d.status === 'INACTIVE' ? 'غیرفعال' : 'فعال',
          });
        }
      });
    }

    // 3. Search in vehicles (if user has access to OIL_SERVICE or FLEET_MANAGEMENT)
    if (canAccessTab(currentUser, 'OIL_SERVICE') || canAccessTab(currentUser, 'FLEET_MANAGEMENT')) {
      const targetVehicleTab: ActiveAppTab = canAccessTab(currentUser, 'OIL_SERVICE')
        ? 'OIL_SERVICE'
        : 'FLEET_MANAGEMENT';
      vehicles.forEach((v) => {
        const rawPlate = String(v.plateNumber || '');
        const plateStr = formatIranianPlateString(rawPlate);
        const hay = normalizePersianDigits(
          `${v.driverName || ''} ${v.model || ''} ${rawPlate} ${plateStr} ${v.code || ''}`
        ).toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            id: `vehicle-${v.id}`,
            title: `${v.model} (کد ${toFaDigits(v.code)})`,
            subtitle: `راننده: ${v.driverName || 'بدون راننده'} | پلاک: ${plateStr || rawPlate}`,
            category: 'خودروهای ناوگان',
            targetTab: targetVehicleTab,
            icon: Droplet,
            badge: 'ناوگان',
          });
        }
      });
    }

    return matches.slice(0, 30);
  }, [query, menuItems, drivers, vehicles, currentUser]);

  // Keyboard navigation & Shortcuts (ESC, Arrow keys, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + Math.max(1, searchResults.length)) % Math.max(1, searchResults.length)
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = searchResults[selectedIndex];
        if (item) {
          if (item.id === 'menu-backup' && onOpenBackup) {
            onOpenBackup();
          } else {
            onNavigateTab(item.targetTab);
          }
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults, onNavigateTab, onOpenBackup, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-6 sm:pt-20 px-2.5 sm:px-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0c1424] border border-[#1f2c45] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150 my-auto sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-[#1f2c45] flex items-center gap-2.5 sm:gap-3 bg-[#111b2e] shrink-0">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="جستجوی سریع منوها، رانندگان، کد خودرو یا شماره پلاک..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 bg-[#1a263d] text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded text-[11px] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
              <p>نتیجه‌ای برای «{query}» یافت نشد.</p>
              <p className="text-[11px] text-slate-500">
                نام بخش، نام راننده، کد خودرو یا شماره پلاک را امتحان کنید.
              </p>
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'menu-backup' && onOpenBackup) {
                      onOpenBackup();
                    } else {
                      onNavigateTab(item.targetTab);
                    }
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-right ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'hover:bg-[#131e33] text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-slate-950/15 text-slate-950' : 'bg-[#18263e] text-amber-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isSelected
                                ? 'bg-slate-950/20 text-slate-950'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span
                      className={`text-[10px] hidden sm:inline ${
                        isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {item.category}
                    </span>
                    <CornerDownLeft
                      className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-slate-600'}`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="p-2.5 bg-[#090f1c] border-t border-[#1f2c45] flex items-center justify-between text-[11px] text-slate-400 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-slate-300 font-mono">↑↓</strong> جابجایی
            </span>
            <span>
              <strong className="text-slate-300 font-mono">Enter</strong> انتخاب و ورود
            </span>
            <span>
              <strong className="text-slate-300 font-mono">ESC</strong> بستن
            </span>
          </div>
          <span className="text-slate-500">جستجوی یکپارچه سامانه حامی</span>
        </div>
      </div>
    </div>
  );
};
