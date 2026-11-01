import { FC, useState, useMemo, useEffect, FormEvent } from 'react';
import {
  Phone,
  PhoneCall,
  Search,
  Star,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Truck,
  Users,
  Wrench,
  ShieldAlert,
  Briefcase,
  UserCheck,
  LayoutGrid,
  List,
  Zap,
  FolderKanban,
  SlidersHorizontal,
  Hash,
  Download,
  X,
  Minimize2,
  Maximize2,
  Rows3,
} from 'lucide-react';
import {
  PhonebookContact,
  PhonebookCategory,
  PhonebookViewMode,
  PhonebookCustomSettings,
} from '../types/phonebook';
import {
  buildUnifiedPhonebook,
  getPhonebookSettings,
  savePhonebookSettings,
  upsertCustomContact,
  deleteCustomContact,
  toggleContactFavorite,
  assignContactExtension,
  CATEGORY_META,
} from '../utils/phonebookService';
import { DriverDirectoryItem } from '../utils/fleetSeedData';
import { StaffMember } from '../types';
import { toFaDigits } from '../utils/jalaali';
import { PhonebookContactModal } from './PhonebookContactModal';
import { AppUser } from '../types/auth';

interface PhonebookViewProps {
  drivers: DriverDirectoryItem[];
  staffMembers: StaffMember[];
  isStandalone?: boolean;
  isPopupMode?: boolean;
  onClosePopup?: () => void;
  onOpenPopupModal?: () => void;
  currentUser?: AppUser | null;
  onCallPhone: (phone: string, name: string, role: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const PhonebookView: FC<PhonebookViewProps> = ({
  drivers,
  staffMembers,
  isStandalone = false,
  isPopupMode = false,
  onClosePopup,
  onOpenPopupModal,
  onCallPhone,
  onShowToast,
}) => {
  const [settings, setSettings] = useState<PhonebookCustomSettings>(() => getPhonebookSettings());
  const [viewMode, setViewMode] = useState<PhonebookViewMode>(() =>
    isPopupMode ? 'MINIMAL' : settings.defaultViewMode || 'MINIMAL'
  );
  const [activeCategory, setActiveCategory] = useState<PhonebookCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [refreshTick, setRefreshTick] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Direct Dial input
  const [quickDialNumber, setQuickDialNumber] = useState('');

  // Modals & Popovers
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PhonebookContact | null>(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [editingExtId, setEditingExtId] = useState<string | null>(null);
  const [extInputValue, setExtInputValue] = useState('');

  // Listen for cross-window storage updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('hamibar_phonebook_')) {
        setRefreshTick((t) => t + 1);
        setSettings(getPhonebookSettings());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Build unified contacts list
  const allContacts = useMemo(() => {
    return buildUnifiedPhonebook(drivers, staffMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, staffMembers, refreshTick]);

  // Filter & Sort Contacts
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = allContacts.filter((c) => {
      if (activeCategory === 'FAVORITES') {
        if (!c.isFavorite) return false;
      } else if (activeCategory !== 'ALL') {
        if (c.category !== activeCategory) return false;
      }

      if (selectedLetter !== 'ALL') {
        if (!c.name.trim().startsWith(selectedLetter)) return false;
      }

      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q) || (c.altPhone && c.altPhone.includes(q));
        const matchExt = c.extension && c.extension.includes(q);
        const matchOrg = c.organization && c.organization.toLowerCase().includes(q);
        const matchRole = c.role && c.role.toLowerCase().includes(q);
        const matchPlate = c.vehiclePlate && c.vehiclePlate.includes(q);
        const matchCode = c.personnelCode && c.personnelCode.includes(q);
        return matchName || matchPhone || matchExt || matchOrg || matchRole || matchPlate || matchCode;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (settings.sortBy === 'favorites') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
      }
      if (settings.sortBy === 'extension') {
        const extA = parseInt(a.extension || '99999', 10);
        const extB = parseInt(b.extension || '99999', 10);
        if (extA !== extB) return extA - extB;
      }
      if (settings.sortBy === 'category') {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name, 'fa');
    });
  }, [allContacts, activeCategory, selectedLetter, searchQuery, settings.sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<PhonebookCategory, number> = {
      ALL: allContacts.length,
      FAVORITES: allContacts.filter((c) => c.isFavorite).length,
      DRIVER: allContacts.filter((c) => c.category === 'DRIVER').length,
      STAFF: allContacts.filter((c) => c.category === 'STAFF').length,
      CONTRACTOR: allContacts.filter((c) => c.category === 'CONTRACTOR').length,
      WORKSHOP: allContacts.filter((c) => c.category === 'WORKSHOP').length,
      CUSTOMER: allContacts.filter((c) => c.category === 'CUSTOMER').length,
      EMERGENCY: allContacts.filter((c) => c.category === 'EMERGENCY').length,
      CUSTOM: allContacts.filter((c) => c.category === 'CUSTOM').length,
    };
    return counts;
  }, [allContacts]);

  // Available Persian first letters for Rolodex index
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    allContacts.forEach((c) => {
      const first = c.name.trim().charAt(0);
      if (first) set.add(first);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [allContacts]);

  // Handlers
  const handleUpdateSettings = (partial: Partial<PhonebookCustomSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    savePhonebookSettings(next);
    if (partial.defaultViewMode) {
      setViewMode(partial.defaultViewMode);
    }
  };

  const handleToggleFav = (id: string) => {
    toggleContactFavorite(id);
    setRefreshTick((t) => t + 1);
  };

  const handleSaveContact = (contactData: Omit<PhonebookContact, 'id'> & { id?: string }) => {
    upsertCustomContact(contactData);
    setRefreshTick((t) => t + 1);
    onShowToast?.(
      contactData.id ? `مخاطب «${contactData.name}» بروزرسانی شد.` : `مخاطب جدید «${contactData.name}» به دفترچه تلفن اضافه شد.`,
      'success'
    );
  };

  const handleDeleteContact = (contact: PhonebookContact) => {
    if (!contact.isCustom) {
      onShowToast?.('مخاطبین سیستمی از بخش رانندگان/پرسنل مدیریت می‌شوند.', 'warning');
      return;
    }
    deleteCustomContact(contact.id);
    setRefreshTick((t) => t + 1);
    onShowToast?.(`مخاطب «${contact.name}» حذف شد.`, 'info');
  };

  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard?.writeText(phone);
    setCopiedId(id);
    onShowToast?.(`شماره ${toFaDigits(phone)} کپی شد.`, 'info');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveInlineExtension = (contactId: string) => {
    assignContactExtension(contactId, extInputValue);
    setEditingExtId(null);
    setRefreshTick((t) => t + 1);
    onShowToast?.(`داخلی ویپ ${toFaDigits(extInputValue || 'حذف')} ثبت شد.`, 'success');
  };

  const handleQuickDirectDial = (e: FormEvent) => {
    e.preventDefault();
    const clean = quickDialNumber.trim();
    if (!clean) return;
    // Check if matches any contact by extension or phone
    const matched = allContacts.find(
      (c) => c.extension === clean || c.phone === clean || c.altPhone === clean
    );
    if (matched) {
      onCallPhone(matched.phone || clean, matched.name, matched.role || matched.organization || 'دفترچه تلفن');
    } else {
      onCallPhone(clean, `شماره مستقیم (${toFaDigits(clean)})`, 'شماره‌گیری سریع');
    }
  };

  // Launch Standalone Compact Desktop Window (420x680 minimal dialer)
  const handleOpenStandaloneWindow = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'PHONEBOOK');
    url.searchParams.set('standalone', 'true');
    url.searchParams.set('popup', 'minimal');
    window.open(
      url.toString(),
      'HamiPhonebookStandalone',
      'width=430,height=700,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['نام مخاطب', 'شماره تماس', 'شماره دوم', 'داخلی ویپ', 'واحد/سازمان', 'سمت', 'پلاک خودرو'];
    const rows = filteredContacts.map((c) => [
      c.name,
      c.phone,
      c.altPhone || '',
      c.extension || '',
      c.organization || '',
      c.role || '',
      c.vehiclePlate || '',
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hami-phonebook-${Date.now()}.csv`;
    link.click();
    onShowToast?.('فایل اکسل (CSV) دفترچه تلفن دانلود شد.', 'success');
  };

  const renderCategoryIcon = (cat: PhonebookCategory, className = 'w-3.5 h-3.5') => {
    switch (cat) {
      case 'FAVORITES':
        return <Star className={className} />;
      case 'DRIVER':
        return <Truck className={className} />;
      case 'STAFF':
        return <UserCheck className={className} />;
      case 'CONTRACTOR':
        return <Building2 className={className} />;
      case 'WORKSHOP':
        return <Wrench className={className} />;
      case 'EMERGENCY':
        return <ShieldAlert className={className} />;
      case 'CUSTOMER':
        return <Briefcase className={className} />;
      default:
        return <Users className={className} />;
    }
  };

  const renderColorBadge = (color: string) => {
    const map: Record<string, string> = {
      amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      slate: 'bg-slate-800 text-slate-300 border-slate-700',
    };
    return map[color] || map.slate;
  };

  return (
    <div className={`space-y-3 ${isStandalone ? 'p-3 bg-[#0a101f] min-h-screen text-slate-100' : ''}`} dir="rtl">
      {/* 1. COMPACT HEADER & QUICK DIRECT DIAL BAR */}
      <div className="bg-[#0e172a] border border-[#1e293b] rounded-2xl p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Count */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white">
                    دفترچه تلفن و سانترال
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                    {toFaDigits(allContacts.length)} مخاطب
                  </span>
                </div>
                {!isPopupMode && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    جستجو، شماره‌گیری سریع با ۱ کلیک و مدیریت داخلی‌های ویپ
                  </p>
                )}
              </div>
            </div>

            {isPopupMode && onClosePopup && (
              <button
                type="button"
                onClick={onClosePopup}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="بستن پاپ‌آپ"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Direct Dial Input + Primary Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Direct Dial Form */}
            <form onSubmit={handleQuickDirectDial} className="flex items-center bg-[#090f1d] border border-slate-700/80 rounded-xl p-0.5 focus-within:border-emerald-500/60">
              <input
                type="text"
                dir="ltr"
                value={quickDialNumber}
                onChange={(e) => setQuickDialNumber(e.target.value)}
                placeholder="شماره یا داخلی..."
                className="w-28 sm:w-36 bg-transparent px-2.5 py-1 text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!quickDialNumber.trim()}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="تماس فوری با شماره وارد شده"
              >
                <Phone className="w-3 h-3" />
                <span>تماس</span>
              </button>
            </form>

            {/* Add New Contact */}
            <button
              type="button"
              onClick={() => {
                setEditingContact(null);
                setIsContactModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
              title="افزودن مخاطب جدید"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>مخاطب جدید</span>
            </button>

            {!isPopupMode && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen((p) => !p)}
                  className={`p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isCustomizeOpen
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="تنظیمات چیدمان"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="خروجی اکسل"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Open Minimal Popup / Standalone Dialer */}
            {!isPopupMode && onOpenPopupModal && (
              <button
                type="button"
                onClick={onOpenPopupModal}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="نمایش دفترچه تلفن به صورت پاپ‌آپ مینیمال شناور"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>پاپ‌آپ مینیمال</span>
              </button>
            )}

            {!isStandalone && (
              <button
                type="button"
                onClick={handleOpenStandaloneWindow}
                className="p-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="باز کردن پنجره مستقل دسکتاپ (۴۳۰x۷۰۰)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Customization Drawer */}
        {isCustomizeOpen && !isPopupMode && (
          <div className="mt-3 pt-3 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-fadeIn">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">حالت نمایش پیش‌فرض:</label>
              <select
                value={settings.defaultViewMode}
                onChange={(e) => handleUpdateSettings({ defaultViewMode: e.target.value as PhonebookViewMode })}
                className="w-full bg-[#0a101f] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="MINIMAL">نمای مینیمال و فشرده (پیشنهادی)</option>
                <option value="ROLODEX">کارت‌های رولودکس</option>
                <option value="SPEED_DIAL">کلیدهای تماس سریع</option>
                <option value="TABLE">جدول کامل</option>
                <option value="CATEGORY">تفکیک واحدها</option>
              </select>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">مرتب‌سازی بر اساس:</label>
              <select
                value={settings.sortBy}
                onChange={(e) => handleUpdateSettings({ sortBy: e.target.value as any })}
                className="w-full bg-[#0a101f] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="favorites">ستاره‌دارها در ابتدا</option>
                <option value="name">حروف الفبا (نام)</option>
                <option value="extension">شماره داخلی ویپ</option>
                <option value="category">واحد سازمانی</option>
              </select>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">تعداد ستون‌های شماره‌گیر:</label>
              <div className="flex items-center gap-1">
                {([3, 4, 5, 6] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleUpdateSettings({ quickDialColumns: col })}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      settings.quickDialColumns === col
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-[#0a101f] text-slate-400 border-slate-800'
                    }`}
                  >
                    {toFaDigits(col)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">کارت‌های فشرده:</span>
              <input
                type="checkbox"
                checked={settings.compactCards}
                onChange={(e) => handleUpdateSettings({ compactCards: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Search & View Switcher Bar */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام، موبایل، داخلی، پلاک یا کد..."
              className="w-full bg-[#090f1d] border border-slate-700/80 focus:border-emerald-500 rounded-xl pr-8 pl-7 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#090f1d] p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
            {[
              { id: 'MINIMAL' as PhonebookViewMode, label: 'مینیمال', icon: Rows3 },
              { id: 'SPEED_DIAL' as PhonebookViewMode, label: 'شماره‌گیر', icon: Zap },
              { id: 'ROLODEX' as PhonebookViewMode, label: 'کارت‌ها', icon: LayoutGrid },
              { id: 'TABLE' as PhonebookViewMode, label: 'جدول', icon: List },
              { id: 'CATEGORY' as PhonebookViewMode, label: 'واحدها', icon: FolderKanban },
            ].map((m) => {
              const Icon = m.icon;
              const active = viewMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewMode(m.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                    active
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              'ALL',
              'FAVORITES',
              'DRIVER',
              'STAFF',
              'WORKSHOP',
              'CONTRACTOR',
              'CUSTOMER',
              'EMERGENCY',
              'CUSTOM',
            ] as PhonebookCategory[]
          ).map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = categoryCounts[cat] || 0;
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {renderCategoryIcon(cat, 'w-3 h-3')}
                <span>{meta.shortLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {toFaDigits(count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Persian Alphabet Index Bar (only shown in ROLODEX mode) */}
        {viewMode === 'ROLODEX' && availableLetters.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 ml-1 shrink-0">حروف:</span>
            <button
              type="button"
              onClick={() => setSelectedLetter('ALL')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer shrink-0 ${
                selectedLetter === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              همه
            </button>
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(letter === selectedLetter ? 'ALL' : letter)}
                className={`w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center transition cursor-pointer shrink-0 ${
                  selectedLetter === letter
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. CONTACTS DISPLAY AREA */}
      {filteredContacts.length === 0 ? (
        <div className="bg-[#0e172a] border border-slate-800 rounded-2xl p-8 text-center">
          <Phone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-300">مخاطبی با این مشخصات یافت نشد</h3>
        </div>
      ) : (
        <>
          {/* MODE 0: MINIMAL HIGH-DENSITY LIST (مینیمال و فشرده) */}
          {viewMode === 'MINIMAL' && (
            <div className="bg-[#0e172a] border border-slate-800 rounded-2xl overflow-hidden shadow-lg divide-y divide-slate-800/70">
              {filteredContacts.map((c) => {
                const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
                return (
                  <div
                    key={c.id}
                    className="px-3 py-2 hover:bg-slate-800/40 transition flex items-center justify-between gap-2 group"
                  >
                    {/* Right: Favorite + Name + Role/Plate */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleFav(c.id)}
                        className={`p-1 rounded transition cursor-pointer shrink-0 ${
                          c.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title="ستاره‌دار"
                      >
                        <Star className={`w-3.5 h-3.5 ${c.isFavorite ? 'fill-amber-400' : ''}`} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{c.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${renderColorBadge(
                              catMeta.color
                            )}`}
                          >
                            {catMeta.shortLabel}
                          </span>
                          {c.personnelCode && (
                            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 rounded">
                              کد {toFaDigits(c.personnelCode)}
                            </span>
                          )}
                          {c.vehiclePlate && (
                            <span className="hidden sm:inline text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 rounded border border-slate-800">
                              {toFaDigits(c.vehiclePlate)}
                            </span>
                          )}
                        </div>
                        {(c.role || c.organization) && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {c.role} {c.organization ? `• ${c.organization}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Left: Extension + Phone + Quick Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Inline Extension Badge */}
                      {editingExtId === c.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            dir="ltr"
                            value={extInputValue}
                            onChange={(e) => setExtInputValue(e.target.value)}
                            placeholder="101"
                            className="w-12 bg-slate-950 border border-cyan-500 rounded px-1.5 py-0.5 text-[10px] font-mono text-center text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineExtension(c.id)}
                            className="px-1.5 py-0.5 rounded bg-cyan-600 text-white text-[10px] font-bold cursor-pointer"
                          >
                            ثبت
                          </button>
                        </div>
                      ) : c.extension ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExtId(c.id);
                            setExtInputValue(c.extension || '');
                          }}
                          className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold hover:bg-cyan-500/25 transition cursor-pointer"
                          title="ویرایش داخلی ویپ"
                        >
                          داخلی {toFaDigits(c.extension)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExtId(c.id);
                            setExtInputValue('');
                          }}
                          className="hidden sm:inline-flex px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300 text-[9px] transition cursor-pointer opacity-0 group-hover:opacity-100"
                          title="ثبت داخلی"
                        >
                          + داخلی
                        </button>
                      )}

                      {/* Phone Number + Copy */}
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(c.id, c.phone)}
                        className="px-2 py-1 rounded-lg bg-[#090f1d] hover:bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        dir="ltr"
                        title="کلیک برای کپی شماره"
                      >
                        <span>{toFaDigits(c.phone)}</span>
                        {copiedId === c.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500" />
                        )}
                      </button>

                      {/* Edit Contact Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingContact(c);
                          setIsContactModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                        title="ویرایش مخاطب"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* 1-Click Call Button */}
                      <button
                        type="button"
                        onClick={() => onCallPhone(c.phone, c.name, c.role || catMeta.label)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                        title="تماس تلفنی"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">تماس</span>
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
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {filteredContacts.map((c) => {
                const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
                return (
                  <div
                    key={c.id}
                    className="bg-[#0e172a] hover:bg-[#131f38] border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 transition flex flex-col justify-between shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-amber-400 shrink-0">
                            {c.name.trim().charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-black text-white truncate">{c.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${renderColorBadge(
                                  catMeta.color
                                )}`}
                              >
                                {catMeta.shortLabel}
                              </span>
                              {c.role && <span className="text-[10px] text-slate-400 truncate">{c.role}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleFav(c.id)}
                          className={`p-1 rounded-lg transition cursor-pointer ${
                            c.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${c.isFavorite ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      <div className="mt-2.5 bg-[#090f1d] border border-slate-800/90 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-black font-mono text-emerald-400 tracking-wide" dir="ltr">
                          {toFaDigits(c.phone)}
                        </div>
                        <div className="flex items-center gap-1">
                          {c.extension && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                              داخلی {toFaDigits(c.extension)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(c.id, c.phone)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            title="کپی شماره"
                          >
                            {copiedId === c.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => onCallPhone(c.phone, c.name, c.role || catMeta.label)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>تماس</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingContact(c);
                          setIsContactModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        title="ویرایش"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {c.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(c)}
                          className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 transition cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                    onClick={() => onCallPhone(c.phone, c.name, c.role || catMeta.label)}
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
                      {c.extension && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-black shrink-0">
                          #{toFaDigits(c.extension)}
                        </span>
                      )}
                    </div>

                    <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="font-mono text-xs font-bold text-slate-200" dir="ltr">
                        {toFaDigits(c.phone)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center transition">
                        <PhoneCall className="w-3 h-3" />
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
                      <th className="py-2.5 px-3">نام مخاطب</th>
                      <th className="py-2.5 px-3">واحد / سمت</th>
                      <th className="py-2.5 px-3 text-center">داخلی</th>
                      <th className="py-2.5 px-3 text-left">شماره تماس</th>
                      <th className="py-2.5 px-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredContacts.map((c) => {
                      const catMeta = CATEGORY_META[c.category] || CATEGORY_META.CUSTOM;
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
                          <td className="py-2 px-3 font-bold text-white">{c.name}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${renderColorBadge(
                                catMeta.color
                              )}`}
                            >
                              {catMeta.shortLabel}
                            </span>
                            {c.role && <span className="text-slate-400 text-[11px] mr-1.5">{c.role}</span>}
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
                          <td className="py-2 px-3 text-left font-mono font-bold text-emerald-400" dir="ltr">
                            {toFaDigits(c.phone)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onCallPhone(c.phone, c.name, c.role || catMeta.label)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
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
                ['EMERGENCY', 'STAFF', 'DRIVER', 'WORKSHOP', 'CONTRACTOR', 'CUSTOMER', 'CUSTOM'] as PhonebookCategory[]
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
                              <span className="text-xs font-bold text-white truncate">{c.name}</span>
                              {c.extension && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[9px] font-bold">
                                  داخلی {toFaDigits(c.extension)}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {c.role || c.organization}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-xs font-bold text-slate-300" dir="ltr">
                              {toFaDigits(c.phone)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onCallPhone(c.phone, c.name, c.role || meta.label)}
                              className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                              title="تماس"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
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
