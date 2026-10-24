import { FC, useState, useEffect, useMemo, useRef, ComponentType } from 'react';
import {
  Search,
  X,
  Users,
  CalendarDays,
  UserCheck,
  Droplet,
  BookOpen,
  CornerDownLeft,
  Database,
} from 'lucide-react';
import { ActiveAppTab } from './Header';
import { toFaDigits } from '../utils/jalaali';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { formatIranianPlateString } from './IranianPlate';

interface QuickSearchSpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveAppTab) => void;
  vehicles?: VehicleItem[];
  drivers?: DriverDirectoryItem[];
  onOpenBackup?: () => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'منو و ماژول‌ها' | 'خودروها' | 'رانندگان';
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
  onOpenBackup,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
        setSelectedIndex((prev) => (prev - 1 + Math.max(1, searchResults.length)) % Math.max(1, searchResults.length));
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
  }, [isOpen, selectedIndex]);

  // Static Menu Items for preserved modules
  const menuItems: SearchResultItem[] = useMemo(
    () => [
      {
        id: 'menu-attendance',
        title: 'تابلوی حضور، غیاب و مرخصی',
        subtitle: 'ثبت وضعیت روزانه رانندگان و پرسنل (حاضر، مرخصی، تعمیرگاه، غیبت)',
        category: 'منو و ماژول‌ها',
        targetTab: 'ATTENDANCE',
        icon: CalendarDays,
        badge: 'حضور و غیاب',
      },
      {
        id: 'menu-drivers',
        title: 'پرونده و سوابق رانندگان',
        subtitle: 'مشخصات هویتی، گواهینامه، کارت سلامت و سوابق رانندگان',
        category: 'منو و ماژول‌ها',
        targetTab: 'DRIVERS',
        icon: Users,
        badge: 'رانندگان',
      },
      {
        id: 'menu-staff',
        title: 'پرونده پرسنل و کارکنان اداری و عملیاتی',
        subtitle: 'احکام کارگزینی، شناسنامه جامع پرسنل، مدارک استخدامی و امور مالی',
        category: 'منو و ماژول‌ها',
        targetTab: 'STAFF',
        icon: UserCheck,
        badge: 'پرسنل',
      },
      {
        id: 'menu-oil',
        title: 'پایش سرویس و تعویض روغن',
        subtitle: 'کیلومتر کارکرد، فیلتر روغن، واسکازین، تاریخچه و هشدارهای تعویض روغن',
        category: 'منو و ماژول‌ها',
        targetTab: 'OIL_SERVICE',
        icon: Droplet,
        badge: 'سرویس روغن',
      },
      {
        id: 'menu-regulations',
        title: 'آیین‌نامه انضباطی قابل ویرایش',
        subtitle: 'مشاهده، ویرایش، افزودن و حذف بندهای قانونی، جرایم و تعهدنامه رانندگان',
        category: 'منو و ماژول‌ها',
        targetTab: 'REGULATIONS',
        icon: BookOpen,
        badge: 'آیین‌نامه',
      },
      {
        id: 'menu-backup',
        title: 'پشتیبان‌گیری دستی و بازیابی اطلاعات (JSON Backup)',
        subtitle: 'دانلود نسخه پشتیبان دستی از کلیه اطلاعات سامانه یا بازیابی اطلاعات از فایل JSON',
        category: 'منو و ماژول‌ها',
        targetTab: 'ATTENDANCE',
        icon: Database,
        badge: 'بک‌آپ دستی',
      },
    ],
    []
  );

  // Filtered Results
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return menuItems;
    }

    const matches: SearchResultItem[] = [];

    // 1. Search in menus
    menuItems.forEach((item) => {
      if (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.targetTab.toLowerCase().includes(q)
      ) {
        matches.push(item);
      }
    });

    // 2. Search in drivers directory
    drivers.forEach((d) => {
      if (
        d.name?.toLowerCase().includes(q) ||
        d.phone?.includes(q) ||
        d.nationalId?.includes(q) ||
        d.personnelCode?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `driver-${d.id}`,
          title: d.name,
          subtitle: `کد پرسنلی: ${toFaDigits(d.personnelCode || '')} | تماس: ${toFaDigits(d.phone || '')}`,
          category: 'رانندگان',
          targetTab: 'DRIVERS',
          icon: Users,
          badge: d.status === 'active' ? 'فعال' : 'غیرفعال',
        });
      }
    });

    // 3. Search in vehicles for oil service
    vehicles.forEach((v) => {
      const rawPlate = String(v.plateNumber || '');
      const plateStr = formatIranianPlateString(rawPlate);
      const vehicleCodeStr = String(v.code || '');
      if (
        v.driverName?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        rawPlate.toLowerCase().includes(q) ||
        plateStr.toLowerCase().includes(q) ||
        vehicleCodeStr.includes(q)
      ) {
        matches.push({
          id: `vehicle-${v.id}`,
          title: `${v.model} (کد ${toFaDigits(v.code)})`,
          subtitle: `راننده: ${v.driverName || 'بدون راننده'} | پلاک: ${plateStr || rawPlate}`,
          category: 'خودروها',
          targetTab: 'OIL_SERVICE',
          icon: Droplet,
          badge: 'پایش روغن',
        });
      }
    });

    return matches;
  }, [query, menuItems, drivers, vehicles]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-24 px-2.5 sm:px-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-[#0c1424] border border-[#1f2c45] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 my-auto sm:my-0"
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
            placeholder="جستجوی سریع در بخش‌ها، رانندگان و سرویس‌های روغن..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-white"
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
              <p className="text-[11px] text-slate-500">کلمات کلیدی مثل نام راننده، شماره پلاک یا نام بخش را امتحان کنید.</p>
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'menu-backup' && onOpenBackup) {
                      onOpenBackup();
                    } else {
                      onNavigateTab(item.targetTab);
                    }
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition text-right ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'hover:bg-[#131e33] text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-[#18263e] text-amber-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isSelected
                                ? 'bg-slate-950 text-amber-300'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-slate-900 font-normal' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 mr-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.category}
                    </span>
                    <CornerDownLeft
                      className={`w-3.5 h-3.5 mr-1 ${isSelected ? 'text-slate-950' : 'text-slate-500'}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-[#080e1c] border-t border-[#1f2c45] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 px-1.5 py-0.2 rounded text-[10px] border border-slate-700">↑</kbd>
              <kbd className="bg-slate-800 px-1.5 py-0.2 rounded text-[10px] border border-slate-700">↓</kbd>
              <span>پیمایش</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 px-1.5 py-0.2 rounded text-[10px] border border-slate-700">Enter</kbd>
              <span>انتخاب</span>
            </span>
          </div>
          <span>حامی • سامانه یکپارچه</span>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
