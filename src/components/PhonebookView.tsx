import { FC, useState, useMemo, useEffect, FormEvent, useRef } from 'react';
import {
  BookOpen,
  Search,
  Phone,
  PhoneCall,
  Star,
  Plus,
  Edit3,
  Trash2,
  Users,
  Truck,
  Wrench,
  Building2,
  ShieldAlert,
  UserCheck,
  Sparkles,
  LayoutGrid,
  List,
  Table2,
  SlidersHorizontal,
  Copy,
  Check,
  X,
  Download,
  Hash,
  Minimize2,
  Maximize2,
  ArrowUpDown,
  Clock,
  Delete,
  Keyboard,
} from 'lucide-react';
import {
  PhonebookContact,
  PhonebookCategory,
  PhonebookViewMode,
  PhonebookCustomSettings,
} from '../types/phonebook';
import {
  buildUnifiedPhonebook,
  getCustomPhonebookContacts,
  saveCustomPhonebookContacts,
  getPhonebookSettings,
  savePhonebookSettings,
  toggleContactFavorite,
  CATEGORY_META,
  assignContactExtension,
} from '../utils/phonebookService';
import { getVoipCallLogs } from '../utils/voipService';
import { DriverDirectoryItem } from '../utils/fleetSeedData';
import { StaffMember } from '../types';
import { toFaDigits, normalizePersianDigits } from '../utils/jalaali';
import { PhonebookContactModal } from './PhonebookContactModal';
import { AppUser } from '../types/auth';
import { canExportExcel } from '../utils/authService';

interface PhonebookViewProps {
  drivers: DriverDirectoryItem[];
  staffMembers: StaffMember[];
  isStandalone?: boolean;
  isPopupMode?: boolean;
  onOpenPopupModal?: () => void;
  onClosePopup?: () => void;
  currentUser?: AppUser | null;
  onCallPhone: (phone: string, recipientName: string, recipientRole?: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const PERSIAN_LETTERS = [
  'همه',
  'آ',
  'ا',
  'ب',
  'پ',
  'ت',
  'ث',
  'ج',
  'چ',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'ژ',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ک',
  'گ',
  'ل',
  'م',
  'ن',
  'و',
  'ه',
  'ی',
];

export const PhonebookView: FC<PhonebookViewProps> = ({
  drivers,
  staffMembers,
  isPopupMode = false,
  onOpenPopupModal,
  onClosePopup,
  currentUser,
  onCallPhone,
  onShowToast,
}) => {
  const [settings, setSettings] = useState<PhonebookCustomSettings>(() => getPhonebookSettings());
  const [viewMode, setViewMode] = useState<PhonebookViewMode>(
    isPopupMode ? 'MINIMAL' : settings.defaultViewMode || 'MINIMAL'
  );
  const [activeCategory, setActiveCategory] = useState<PhonebookCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState('همه');
  const [refreshTick, setRefreshTick] = useState(0);

  // Quick Dial & Keypad Popover state
  const [directDialInput, setDirectDialInput] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  // Inline extension quick-edit state
  const [editingExtId, setEditingExtId] = useState<string | null>(null);
  const [editingExtVal, setEditingExtVal] = useState('');

  // Modals & Drawers
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PhonebookContact | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const allowExport = canExportExcel(currentUser);

  // Keyboard shortcut "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build unified contacts
  const allContacts = useMemo(() => {
    void refreshTick;
    return buildUnifiedPhonebook(drivers, staffMembers);
  }, [drivers, staffMembers, refreshTick]);

  // Recent VoIP Call Logs (for quick redial strip)
  const recentCalls = useMemo(() => {
    void refreshTick;
    const logs = getVoipCallLogs();
    const uniqueByPhone = new Map<string, { name: string; phone: string }>();
    for (const log of logs) {
      const clean = normalizePersianDigits(log.phoneNumber).replace(/[^0-9]/g, '');
      if (clean && !uniqueByPhone.has(clean)) {
        uniqueByPhone.set(clean, {
          name: log.recipientName || log.phoneNumber,
          phone: log.phoneNumber,
        });
      }
      if (uniqueByPhone.size >= 6) break;
    }
    return Array.from(uniqueByPhone.values());
  }, [refreshTick]);

  // Favorite Contacts (for quick access strip)
  const favoriteContacts = useMemo(() => {
    return allContacts.filter((c) => c.isFavorite).slice(0, 10);
  }, [allContacts]);

  // Filter & Sort Contacts (normalizing Persian/Arabic digits for effortless search)
  const filteredContacts = useMemo(() => {
    const rawQ = searchQuery.trim();
    const normQ = normalizePersianDigits(rawQ).toLowerCase();

    const list = allContacts.filter((c) => {
      // Category filter
      if (activeCategory === 'FAVORITES') {
        if (!c.isFavorite) return false;
      } else if (activeCategory !== 'ALL' && c.category !== activeCategory) {
        return false;
      }

      // Alphabet filter
      if (activeLetter !== 'همه') {
        const cleanName = c.name.trim();
        if (activeLetter === 'آ' || activeLetter === 'ا') {
          if (!cleanName.startsWith('آ') && !cleanName.startsWith('ا')) return false;
        } else if (!cleanName.startsWith(activeLetter)) {
          return false;
        }
      }

      // Search filter (normalizes Persian & English digits)
      if (normQ) {
        const haystack = normalizePersianDigits(
          [
            c.name,
            c.phone,
            c.altPhone,
            c.extension,
            c.organization,
            c.role,
            c.personnelCode,
            c.vehiclePlate,
            ...(c.tags || []),
          ]
            .filter(Boolean)
            .join(' ')
        ).toLowerCase();

        if (!haystack.includes(normQ)) return false;
      }

      return true;
    });

    // Sort
    return [...list].sort((a, b) => {
      if (settings.sortBy === 'code') {
        const numA = parseInt(normalizePersianDigits(a.personnelCode || ''), 10);
        const numB = parseInt(normalizePersianDigits(b.personnelCode || ''), 10);
        const validA = !isNaN(numA);
        const validB = !isNaN(numB);
        if (validA && validB && numA !== numB) return numA - numB;
        if (validA && !validB) return -1;
        if (!validA && validB) return 1;
        return a.name.localeCompare(b.name, 'fa');
      }
      if (settings.sortBy === 'favorites') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
      }
      if (settings.sortBy === 'extension') {
        if (a.extension && !b.extension) return -1;
        if (!a.extension && b.extension) return 1;
        if (a.extension && b.extension) {
          return a.extension.localeCompare(b.extension, undefined, { numeric: true });
        }
      }
      if (settings.sortBy === 'category') {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
      }
      return a.name.localeCompare(b.name, 'fa');
    });
  }, [allContacts, activeCategory, activeLetter, searchQuery, settings.sortBy]);

  // Category Counts
  const counts = useMemo(() => {
    const map: Record<PhonebookCategory, number> = {
      ALL: allContacts.length,
      FAVORITES: allContacts.filter((c) => c.isFavorite).length,
      DRIVER: allContacts.filter((c) => c.category === 'DRIVER').length,
      STAFF: allContacts.filter((c) => c.category === 'STAFF').length,
      WORKSHOP: allContacts.filter((c) => c.category === 'WORKSHOP').length,
      CONTRACTOR: allContacts.filter((c) => c.category === 'CONTRACTOR').length,
      CUSTOMER: allContacts.filter((c) => c.category === 'CUSTOMER').length,
      EMERGENCY: allContacts.filter((c) => c.category === 'EMERGENCY').length,
      CUSTOM: allContacts.filter((c) => c.category === 'CUSTOM').length,
    };
    return map;
  }, [allContacts]);

  // Check if searchQuery looks like a dialable phone number
  const searchAsPhoneNumber = useMemo(() => {
    const digits = normalizePersianDigits(searchQuery).replace(/[^0-9+*#]/g, '');
    return digits.length >= 3 ? digits : '';
  }, [searchQuery]);

  // Helper to build informative role/subtitle for VoIP Call Popup
  const buildContactCallSubtitle = (c: PhonebookContact) => {
    const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
    const parts: string[] = [];
    if (c.personnelCode) parts.push(`کد ${toFaDigits(c.personnelCode)}`);
    if (c.role) parts.push(c.role);
    else parts.push(catMeta.shortLabel);
    if (c.vehiclePlate) parts.push(`پلاک ${c.vehiclePlate}`);
    return parts.join(' • ');
  };

  // Handlers
  const handleUpdateSettings = (patch: Partial<PhonebookCustomSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    savePhonebookSettings(next);
    if (patch.defaultViewMode) {
      setViewMode(patch.defaultViewMode);
    }
  };

  const handleToggleFav = (id: string) => {
    const isNowFav = toggleContactFavorite(id);
    setRefreshTick((t) => t + 1);
    onShowToast?.(
      isNowFav ? 'به مخاطبین برگزیده (دسترسی سریع) اضافه شد.' : 'از لیست برگزیده‌ها خارج شد.',
      'info'
    );
  };

  const handleSaveContact = (contact: PhonebookContact) => {
    const customList = getCustomPhonebookContacts();
    const exists = customList.some((item) => item.id === contact.id);
    const updated = exists
      ? customList.map((item) => (item.id === contact.id ? contact : item))
      : [contact, ...customList];

    saveCustomPhonebookContacts(updated);
    if (contact.extension !== undefined) {
      assignContactExtension(contact.id, contact.extension);
    }
    setRefreshTick((t) => t + 1);
    setEditingContact(null);
    onShowToast?.(
      exists
        ? `اطلاعات «${contact.name}» بروزرسانی شد.`
        : `مخاطب «${contact.name}» به دفترچه تلفن اضافه شد.`,
      'success'
    );
  };

  const handleSaveInlineExtension = (contactId: string) => {
    assignContactExtension(contactId, editingExtVal);
    setEditingExtId(null);
    setEditingExtVal('');
    setRefreshTick((t) => t + 1);
    onShowToast?.('شماره داخلی ویپ ذخیره شد.', 'success');
  };

  const handleExportCsv = () => {
    if (!allowExport) {
      onShowToast?.('خروجی اکسل تنها برای نقش مدیر ارشد مجاز است.', 'error');
      return;
    }
    const headers = ['کد', 'نام مخاطب', 'دسته‌بندی', 'سمت/پلاک', 'شماره تماس', 'داخلی ویپ'];
    const rows = filteredContacts.map((c) => [
      c.personnelCode || '',
      c.name,
      CATEGORY_META[c.category]?.shortLabel || c.category,
      c.vehiclePlate ? `${c.role || ''} (${c.vehiclePlate})` : c.role || '',
      c.phone,
      c.extension || '',
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hami-phonebook-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.('فایل اکسل دفترچه تلفن دانلود شد.', 'success');
  };

  const handleDirectDialSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const clean = normalizePersianDigits(directDialInput).trim().replace(/[^0-9+*#]/g, '');
    if (!clean) {
      onShowToast?.('لطفاً شماره تلفن یا داخلی مورد نظر را وارد کنید.', 'warning');
      return;
    }
    const matched = allContacts.find(
      (c) =>
        normalizePersianDigits(c.phone).replace(/[^0-9]/g, '') === clean ||
        normalizePersianDigits(c.extension || '') === clean
    );
    onCallPhone(
      clean,
      matched ? matched.name : `شماره‌گیری مستقیم (${toFaDigits(clean)})`,
      matched ? buildContactCallSubtitle(matched) : 'شماره‌گیری آزاد دیسپچ'
    );
    setIsKeypadOpen(false);
  };

  const handleDeleteCustomContact = (contact: PhonebookContact) => {
    if (!contact.isCustom) return;
    if (!window.confirm(`آیا از حذف مخاطب «${contact.name}» اطمینان دارید؟`)) return;
    const customList = getCustomPhonebookContacts().filter((item) => item.id !== contact.id);
    saveCustomPhonebookContacts(customList);
    setRefreshTick((t) => t + 1);
    onShowToast?.(`مخاطب «${contact.name}» حذف شد.`, 'info');
  };

  const handleCopyPhone = async (id: string, phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      onShowToast?.(`شماره ${toFaDigits(phone)} کپی شد.`, 'info');
    } catch {}
  };

  const renderCategoryIcon = (cat: PhonebookCategory, className = 'w-4 h-4') => {
    switch (cat) {
      case 'DRIVER':
        return <Truck className={className} />;
      case 'STAFF':
        return <Users className={className} />;
      case 'WORKSHOP':
        return <Wrench className={className} />;
      case 'CONTRACTOR':
        return <Building2 className={className} />;
      case 'CUSTOMER':
        return <UserCheck className={className} />;
      case 'EMERGENCY':
        return <ShieldAlert className={className} />;
      case 'FAVORITES':
        return <Star className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const renderColorBadge = (color: string) => {
    switch (color) {
      case 'sky':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'indigo':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'orange':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'rose':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'amber':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* 1. COMPACT HEADER & UNIFIED SEARCH + QUICK DIALER */}
      <div className="bg-gradient-to-l from-[#111c33] via-[#0e172a] to-[#13203b] border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-lg space-y-3">
        {/* Top Row: Title + Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white">
                  دفترچه تلفن هوشمند و تماس با رانندگان
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {toFaDigits(allContacts.length)} مخاطب فعال
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                جستجوی آنی با نام، کد راننده، پلاک یا شماره تلفن • تماس مستقیم پاپ‌آپ با یک کلیک
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Open as Minimal Floating Popup */}
            {!isPopupMode && onOpenPopupModal && (
              <button
                type="button"
                onClick={onOpenPopupModal}
                className="px-2.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="باز کردن دفترچه تلفن در پنجره شناور سریع"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">پنجره شناور</span>
              </button>
            )}

            {/* Close Popup Button when in popup mode */}
            {isPopupMode && onClosePopup && (
              <button
                type="button"
                onClick={onClosePopup}
                className="px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>بستن</span>
              </button>
            )}

            {/* Export CSV (Senior Admin only) */}
            {allowExport && !isPopupMode && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="خروجی اکسل مخاطبین"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">خروجی اکسل</span>
              </button>
            )}

            {/* Customize View Settings */}
            <button
              type="button"
              onClick={() => setIsCustomizeOpen((v) => !v)}
              className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isCustomizeOpen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="شخصی‌سازی چیدمان"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">تنظیمات نما</span>
            </button>

            {/* Add Custom Contact */}
            <button
              type="button"
              onClick={() => {
                setEditingContact(null);
                setIsContactModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>مخاطب جدید</span>
            </button>
          </div>
        </div>

        {/* Unified Search Bar + Direct Dial + Keypad Popover */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Smart Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام راننده، کد پرسنلی (مثلاً ۱۰۴)، پلاک، شماره همراه یا داخلی... (کلید /)"
              className="w-full min-h-[42px] bg-[#080d1a] border border-slate-700/80 focus:border-emerald-500 rounded-xl pr-10 pl-28 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchAsPhoneNumber && (
                <button
                  type="button"
                  onClick={() =>
                    onCallPhone(
                      searchAsPhoneNumber,
                      `شماره‌گیری (${toFaDigits(searchAsPhoneNumber)})`,
                      'تماس مستقیم از جستجو'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 shadow-sm transition cursor-pointer"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>تماس با {toFaDigits(searchAsPhoneNumber)}</span>
                </button>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="پاک کردن جستجو"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Direct Dial Form + Interactive Keypad Toggle */}
          <div className="relative flex items-center gap-1.5">
            <form
              onSubmit={handleDirectDialSubmit}
              className="flex items-center gap-1 bg-[#080d1a] border border-slate-700/80 focus-within:border-cyan-500/60 rounded-xl px-2.5 py-1 min-h-[42px] w-full md:w-auto"
            >
              <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <input
                type="tel"
                dir="ltr"
                value={directDialInput}
                onChange={(e) => setDirectDialInput(e.target.value)}
                placeholder="شماره‌گیری مستقیم..."
                className="w-full md:w-36 bg-transparent text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none text-left px-1"
              />
              {directDialInput && (
                <button
                  type="button"
                  onClick={() => setDirectDialInput('')}
                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 transition cursor-pointer shrink-0"
                title="تماس فوری با شماره وارد شده"
              >
                <PhoneCall className="w-3 h-3" />
                <span>تماس</span>
              </button>
              <button
                type="button"
                onClick={() => setIsKeypadOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                  isKeypadOpen
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="صفحه‌کلید شماره‌گیری تلفنی"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Floating Keypad Popover */}
            {isKeypadOpen && (
              <div
                className="absolute left-0 top-full mt-2 z-50 w-64 bg-[#0b1324] border border-slate-700 rounded-2xl p-3 shadow-2xl space-y-2.5 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    صفحه‌کلید شماره‌گیری
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsKeypadOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div
                  className="bg-[#060a14] border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between font-mono text-sm font-black text-emerald-400"
                  dir="ltr"
                >
                  <span className="truncate">{toFaDigits(directDialInput || '---')}</span>
                  {directDialInput && (
                    <button
                      type="button"
                      onClick={() => setDirectDialInput((prev) => prev.slice(0, -1))}
                      className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                      title="پاک کردن رقم آخر"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5" dir="ltr">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => setDirectDialInput((prev) => prev + digit)}
                      className="py-2.5 rounded-xl bg-[#111c35] hover:bg-slate-800 active:scale-95 border border-slate-800 text-white font-mono text-sm font-black transition cursor-pointer"
                    >
                      {toFaDigits(digit)}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleDirectDialSubmit()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>برقراری تماس</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. QUICK ACCESS STRIP: FAVORITES & RECENT CALLS (When not actively searching) */}
        {!searchQuery.trim() && (favoriteContacts.length > 0 || recentCalls.length > 0) && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
            {/* Favorites Quick Dial Strip */}
            {favoriteContacts.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <span className="text-[10px] font-black text-amber-400 flex items-center gap-1 shrink-0 pl-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  تماس سریع ویژه:
                </span>
                {favoriteContacts.map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    onClick={() => onCallPhone(fav.phone, fav.name, buildContactCallSubtitle(fav))}
                    className="group shrink-0 px-2.5 py-1 rounded-xl bg-[#091020] hover:bg-emerald-950/50 border border-slate-800 hover:border-emerald-500/50 flex items-center gap-1.5 transition cursor-pointer"
                    title={`تماس فوری با ${fav.name} (${fav.phone})`}
                  >
                    <PhoneCall className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition" />
                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-white">
                      {fav.name}
                    </span>
                    {fav.personnelCode && (
                      <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1 rounded">
                        {toFaDigits(fav.personnelCode)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Recent Calls Quick Redial Strip */}
            {recentCalls.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <span className="text-[10px] font-black text-cyan-400 flex items-center gap-1 shrink-0 pl-1">
                  <Clock className="w-3 h-3" />
                  تماس‌های اخیر:
                </span>
                {recentCalls.map((rc, idx) => (
                  <button
                    key={`${rc.phone}-${idx}`}
                    type="button"
                    onClick={() => onCallPhone(rc.phone, rc.name, 'تماس مجدد از تاریخچه')}
                    className="group shrink-0 px-2.5 py-1 rounded-xl bg-[#091020]/70 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/40 flex items-center gap-1.5 transition cursor-pointer"
                    title={`شماره‌گیری مجدد ${rc.name} (${rc.phone})`}
                  >
                    <Phone className="w-2.5 h-2.5 text-cyan-400" />
                    <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">
                      {rc.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                      {toFaDigits(rc.phone)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. CUSTOMIZATION DRAWER */}
      {isCustomizeOpen && (
        <div className="bg-[#0d1526] border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
              <SlidersHorizontal className="w-4 h-4" />
              <span>تنظیمات و شخصی‌سازی نمایش دفترچه تلفن</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Default View Mode */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="text-slate-400 font-bold block">حالت نمایش پیش‌فرض:</label>
              <select
                value={settings.defaultViewMode}
                onChange={(e) =>
                  handleUpdateSettings({ defaultViewMode: e.target.value as PhonebookViewMode })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none"
              >
                <option value="MINIMAL">نمای سریع دیسپچ (پیشنهادی)</option>
                <option value="ROLODEX">کارت‌های کامل (رولودکس)</option>
                <option value="SPEED_DIAL">شبکه شماره‌گیری سریع</option>
                <option value="TABLE">جدول متراکم سازمانی</option>
                <option value="CATEGORY">تفکیک بر اساس واحدها</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="text-slate-400 font-bold block">مرتب‌سازی پیش‌فرض:</label>
              <select
                value={settings.sortBy}
                onChange={(e) =>
                  handleUpdateSettings({
                    sortBy: e.target.value as PhonebookCustomSettings['sortBy'],
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none"
              >
                <option value="code">بر اساس کد راننده / پرسنلی</option>
                <option value="favorites">ابتدا مخاطبین ستاره‌دار ⭐</option>
                <option value="name">حروف الفبا (نام مخاطب)</option>
                <option value="extension">شماره داخلی سانترال ویپ</option>
                <option value="category">دسته‌بندی سازمانی</option>
              </select>
            </div>

            {/* Grid Columns for Speed Dial */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="text-slate-400 font-bold block">تعداد ستون‌های شماره‌گیر سریع:</label>
              <div className="flex items-center gap-1.5">
                {([3, 4, 5, 6] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleUpdateSettings({ quickDialColumns: col })}
                    className={`flex-1 py-1.5 rounded-lg font-mono font-bold border transition cursor-pointer ${
                      settings.quickDialColumns === col
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {toFaDigits(col)}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-3 flex flex-col justify-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showExtensionsFirst}
                  onChange={(e) =>
                    handleUpdateSettings({ showExtensionsFirst: e.target.checked })
                  }
                  className="rounded accent-emerald-500"
                />
                <span className="text-slate-300 font-bold">برجسته‌سازی شماره داخلی ویپ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.compactCards}
                  onChange={(e) => handleUpdateSettings({ compactCards: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
                <span className="text-slate-300 font-bold">چیدمان فشرده کارت‌ها</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 4. CATEGORY TABS + SORT + VIEW MODE SWITCHER */}
      <div className="bg-[#0e172a] border border-slate-800/90 rounded-2xl p-2.5 space-y-2.5 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {(
              [
                'ALL',
                'DRIVER',
                'STAFF',
                'FAVORITES',
                'WORKSHOP',
                'CONTRACTOR',
                'CUSTOMER',
                'EMERGENCY',
              ] as PhonebookCategory[]
            ).map((cat) => {
              const meta = CATEGORY_META[cat];
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border transition cursor-pointer ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-[#090f1d] text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {renderCategoryIcon(cat, 'w-3.5 h-3.5')}
                  <span>{meta.shortLabel}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      active ? 'bg-emerald-500/30 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {toFaDigits(counts[cat] || 0)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort & View Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Quick Sort Buttons */}
            <div className="flex items-center gap-1 bg-[#080d1a] border border-slate-800 rounded-xl p-1">
              <span className="text-[10px] text-slate-400 px-1.5 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-cyan-400" />
              </span>
              {[
                { id: 'code', label: 'کد' },
                { id: 'name', label: 'الفبا' },
                { id: 'favorites', label: 'ویژه' },
                { id: 'extension', label: 'داخلی' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    handleUpdateSettings({
                      sortBy: s.id as PhonebookCustomSettings['sortBy'],
                    })
                  }
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    settings.sortBy === s.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#080d1a] p-1 rounded-xl border border-slate-800">
              {[
                { id: 'MINIMAL', label: 'سریع', icon: Minimize2 },
                { id: 'ROLODEX', label: 'کارت', icon: LayoutGrid },
                { id: 'SPEED_DIAL', label: 'شماره‌گیر', icon: PhoneCall },
                { id: 'TABLE', label: 'جدول', icon: Table2 },
                { id: 'CATEGORY', label: 'واحدها', icon: List },
              ].map((m) => {
                const Icon = m.icon;
                const active = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewMode(m.id as PhonebookViewMode)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={m.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alphabet Index Strip (Hidden in popup mode for compactness) */}
        {!isPopupMode && (
          <div className="flex items-center gap-1 overflow-x-auto pt-1.5 border-t border-slate-800/70 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 ml-1 shrink-0">حروف:</span>
            {PERSIAN_LETTERS.map((letter) => {
              const active = activeLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setActiveLetter(letter)}
                  className={`min-w-[24px] h-6 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center transition cursor-pointer ${
                    active
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                      : 'bg-[#090f1d] text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. CONTACTS CONTENT AREA */}
      {filteredContacts.length === 0 ? (
        <div className="bg-[#0e172a] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Phone className="w-9 h-9 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">
            مخاطبی با مشخصات واردشده یافت نشد.
          </div>
          {searchAsPhoneNumber && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  onCallPhone(
                    searchAsPhoneNumber,
                    `شماره‌گیری (${toFaDigits(searchAsPhoneNumber)})`,
                    'تماس مستقیم'
                  )
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>تماس مستقیم با شماره {toFaDigits(searchAsPhoneNumber)}</span>
              </button>
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('ALL');
                setActiveLetter('همه');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold transition cursor-pointer"
            >
              نمایش همه مخاطبین
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* MODE 0: MINIMAL HIGH-SPEED DISPATCH VIEW */}
          {viewMode === 'MINIMAL' && (
            <div
              className={`grid gap-2 ${
                isPopupMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
              }`}
            >
              {filteredContacts.map((c) => {
                const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
                const callSubtitle = buildContactCallSubtitle(c);
                return (
                  <div
                    key={c.id}
                    className={`bg-[#0e172a] hover:bg-[#131f38] border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition group ${
                      c.isEmergency
                        ? 'border-rose-500/40'
                        : c.isFavorite
                        ? 'border-amber-500/35'
                        : 'border-slate-800/90 hover:border-emerald-500/40'
                    }`}
                  >
                    {/* Right: Code + Name + Role/Plate + Extension */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {c.personnelCode ? (
                        <span
                          className="min-w-[38px] h-9 px-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-black flex items-center justify-center shrink-0"
                          title="کد راننده / پرسنلی"
                        >
                          {toFaDigits(c.personnelCode)}
                        </span>
                      ) : (
                        <span
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${renderColorBadge(
                            catMeta.color
                          )}`}
                        >
                          {renderCategoryIcon(c.category, 'w-4 h-4')}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white truncate">
                            {c.name}
                          </span>
                          {c.vehiclePlate && (
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold shrink-0">
                              {toFaDigits(c.vehiclePlate)}
                            </span>
                          )}
                          {!c.vehiclePlate && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${renderColorBadge(
                                catMeta.color
                              )}`}
                            >
                              {catMeta.shortLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 truncate">
                          {c.role && <span className="truncate">{c.role}</span>}
                          {/* Inline Extension Quick Edit */}
                          {editingExtId === c.id ? (
                            <span className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                dir="ltr"
                                value={editingExtVal}
                                onChange={(e) =>
                                  setEditingExtVal(e.target.value.replace(/[^0-9]/g, ''))
                                }
                                placeholder="داخلی"
                                className="w-14 bg-slate-950 border border-cyan-500/50 rounded px-1 py-0.2 text-[10px] font-mono text-cyan-300 focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineExtension(c.id)}
                                className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold cursor-pointer"
                              >
                                ثبت
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExtId(null)}
                                className="text-slate-400 hover:text-white cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ) : c.extension ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExtId(c.id);
                                setEditingExtVal(c.extension || '');
                              }}
                              className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[9px] font-bold hover:bg-cyan-500/25 transition cursor-pointer shrink-0"
                              title="ویرایش سریع شماره داخلی"
                            >
                              داخلی {toFaDigits(c.extension)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExtId(c.id);
                                setEditingExtVal('');
                              }}
                              className="opacity-0 group-hover:opacity-100 text-[9px] text-slate-500 hover:text-cyan-300 transition cursor-pointer shrink-0"
                            >
                              + داخلی
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Left: Phone Number + Favorite + Copy + Big Call Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onCallPhone(c.phone, c.name, callSubtitle)}
                        className="font-mono text-xs sm:text-sm font-black text-slate-200 hover:text-emerald-400 px-1.5 py-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
                        dir="ltr"
                        title="کلیک جهت باز کردن پنجره تماس"
                      >
                        {toFaDigits(c.phone)}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyPhone(c.id, c.phone)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer hidden sm:inline-flex"
                        title="کپی شماره"
                      >
                        {copiedId === c.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFav(c.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                        title="افزودن به مخاطبین ویژه"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            c.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => onCallPhone(c.phone, c.name, callSubtitle)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20 cursor-pointer"
                        title={`تماس با ${c.name}`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>تماس</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE A: ROLODEX CARDS */}
          {viewMode === 'ROLODEX' && (
            <div
              className={`grid gap-3 ${
                settings.compactCards
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-1 lg:grid-cols-2'
              }`}
            >
              {filteredContacts.map((c) => {
                const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
                const callSubtitle = buildContactCallSubtitle(c);
                return (
                  <div
                    key={c.id}
                    className={`bg-[#0e172a] border rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition hover:border-slate-600 shadow-md ${
                      c.isEmergency
                        ? 'border-rose-500/40 bg-gradient-to-br from-[#0e172a] to-rose-950/20'
                        : c.isFavorite
                        ? 'border-amber-500/35'
                        : 'border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${renderColorBadge(
                            catMeta.color
                          )}`}
                        >
                          {renderCategoryIcon(c.category, 'w-5 h-5')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-black text-white truncate">{c.name}</h3>
                            {c.isEmergency && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                اضطراری
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {c.role || catMeta.label}
                            {c.organization ? ` • ${c.organization}` : ''}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${renderColorBadge(
                                catMeta.color
                              )}`}
                            >
                              {catMeta.shortLabel}
                            </span>
                            {c.personnelCode && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                کد: {toFaDigits(c.personnelCode)}
                              </span>
                            )}
                            {c.extension && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                <Hash className="w-2.5 h-2.5" />
                                داخلی {toFaDigits(c.extension)}
                              </span>
                            )}
                            {c.vehiclePlate && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {toFaDigits(c.vehiclePlate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Star & Edit/Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleFav(c.id)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            c.isFavorite
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-slate-900/80 text-slate-500 border-slate-800 hover:text-slate-300'
                          }`}
                          title="ستاره‌دار / دسترسی سریع"
                        >
                          <Star className={`w-3.5 h-3.5 ${c.isFavorite ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingContact(c);
                            setIsContactModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition cursor-pointer"
                          title="ویرایش مخاطب یا تنظیم شماره داخلی"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {c.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomContact(c)}
                            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                            title="حذف مخاطب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {c.notes && (
                      <div className="text-[11px] text-slate-400 bg-[#090f1d] border border-slate-800/80 rounded-xl px-2.5 py-1.5 line-clamp-1">
                        {c.notes}
                      </div>
                    )}

                    {/* Bottom Call Bar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="font-mono text-xs sm:text-sm font-black text-emerald-400 tracking-wide truncate"
                          dir="ltr"
                        >
                          {toFaDigits(c.phone)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(c.id, c.phone)}
                          className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                          title="کپی شماره"
                        >
                          {copiedId === c.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {c.altPhone && (
                          <button
                            type="button"
                            onClick={() => onCallPhone(c.altPhone!, c.name, callSubtitle)}
                            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition cursor-pointer"
                            title={`شماره دوم: ${c.altPhone}`}
                          >
                            خط ۲
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onCallPhone(c.phone, c.name, callSubtitle)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>تماس</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE B: SPEED DIAL PAD */}
          {viewMode === 'SPEED_DIAL' && (
            <div
              className={`grid gap-2.5 ${
                settings.quickDialColumns === 3
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : settings.quickDialColumns === 5
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
                  : settings.quickDialColumns === 6
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {filteredContacts.map((c) => {
                const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onCallPhone(c.phone, c.name, buildContactCallSubtitle(c))}
                    className="group text-right bg-[#0e172a] hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3 transition flex flex-col justify-between gap-2 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-start justify-between w-full gap-1.5">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white group-hover:text-emerald-300 truncate">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {c.role || catMeta.shortLabel}
                        </div>
                      </div>
                      {c.personnelCode ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black shrink-0">
                          {toFaDigits(c.personnelCode)}
                        </span>
                      ) : c.extension ? (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-black shrink-0">
                          #{toFaDigits(c.extension)}
                        </span>
                      ) : null}
                    </div>

                    <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="font-mono text-xs font-bold text-slate-200" dir="ltr">
                        {toFaDigits(c.phone)}
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center transition">
                        <PhoneCall className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* MODE C: DENSE TABLE VIEW */}
          {viewMode === 'TABLE' && (
            <div className="bg-[#0e172a] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#090f1d] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">★</th>
                      <th className="py-2.5 px-3 w-16 text-center">کد</th>
                      <th className="py-2.5 px-3">نام مخاطب</th>
                      <th className="py-2.5 px-3">واحد / پلاک / سمت</th>
                      <th className="py-2.5 px-3 text-center">داخلی</th>
                      <th className="py-2.5 px-3 text-left">شماره تماس</th>
                      <th className="py-2.5 px-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredContacts.map((c) => {
                      const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
                      const callSubtitle = buildContactCallSubtitle(c);
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFav(c.id)}
                              className="cursor-pointer"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  c.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {c.personnelCode ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px]">
                                {toFaDigits(c.personnelCode)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-white">{c.name}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${renderColorBadge(
                                catMeta.color
                              )}`}
                            >
                              {catMeta.shortLabel}
                            </span>
                            {c.vehiclePlate && (
                              <span className="text-sky-300 text-[11px] font-bold mr-1.5">
                                {toFaDigits(c.vehiclePlate)}
                              </span>
                            )}
                            {c.role && (
                              <span className="text-slate-400 text-[11px] mr-1.5">{c.role}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {c.extension ? (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold text-[10px]">
                                {toFaDigits(c.extension)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td
                            className="py-2 px-3 text-left font-mono font-bold text-emerald-400"
                            dir="ltr"
                          >
                            {toFaDigits(c.phone)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onCallPhone(c.phone, c.name, callSubtitle)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>تماس</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(c.id, c.phone)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                title="کپی"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContact(c);
                                  setIsContactModalOpen(true);
                                }}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                title="ویرایش"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODE D: GROUPED BY DEPARTMENT / CATEGORY */}
          {viewMode === 'CATEGORY' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {(
                [
                  'EMERGENCY',
                  'DRIVER',
                  'STAFF',
                  'WORKSHOP',
                  'CONTRACTOR',
                  'CUSTOMER',
                  'CUSTOM',
                ] as PhonebookCategory[]
              ).map((cat) => {
                const groupItems = filteredContacts.filter((c) => c.category === cat);
                if (groupItems.length === 0) return null;
                const meta = CATEGORY_META[cat];
                return (
                  <div
                    key={cat}
                    className="bg-[#0e172a] border border-slate-800 rounded-2xl overflow-hidden shadow-md flex flex-col"
                  >
                    <div className="px-3.5 py-2.5 bg-[#090f1d] border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg border ${renderColorBadge(meta.color)}`}>
                          {renderCategoryIcon(cat, 'w-3.5 h-3.5')}
                        </span>
                        <h3 className="text-xs font-black text-white">{meta.label}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                        {toFaDigits(groupItems.length)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                      {groupItems.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 hover:bg-slate-800/40 transition flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {c.personnelCode && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono text-[9px] font-bold">
                                  {toFaDigits(c.personnelCode)}
                                </span>
                              )}
                              <span className="text-xs font-bold text-white truncate">
                                {c.name}
                              </span>
                              {c.extension && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[9px] font-bold">
                                  داخلی {toFaDigits(c.extension)}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {c.vehiclePlate
                                ? `پلاک ${toFaDigits(c.vehiclePlate)} • ${c.role || ''}`
                                : c.role || c.organization}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-xs font-bold text-slate-300" dir="ltr">
                              {toFaDigits(c.phone)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onCallPhone(c.phone, c.name, buildContactCallSubtitle(c))
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="تماس"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>تماس</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Contact Modal */}
      <PhonebookContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setEditingContact(null);
        }}
        initialContact={editingContact}
        onSave={handleSaveContact}
      />
    </div>
  );
};
