import { FC, useState, useMemo, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Search,
  Star,
  Users,
  Truck,
  Building2,
  Wrench,
  ShieldAlert,
  Plus,
  SlidersHorizontal,
  ExternalLink,
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  Edit2,
  Trash2,
  Bookmark,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  PhoneForwarded,
  X,
  ChevronDown,
  Tag,
  ArrowUpDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  PhonebookContact,
  PhonebookCategory,
  PhonebookViewMode,
  PhonebookCustomSettings,
} from '../types/phonebook';
import {
  getCustomPhonebookContacts,
  saveCustomPhonebookContacts,
  getPhonebookSettings,
  savePhonebookSettings,
  getFavoriteContactIds,
  saveFavoriteContactIds,
  buildUnifiedPhonebook,
  PERSIAN_ALPHABET,
  getPersianFirstChar,
} from '../utils/phonebookService';
import { DriverDirectoryItem } from '../utils/fleetSeedData';
import { StaffMember } from '../types';
import { toFaDigits } from '../utils/jalaali';
import { VoipPhoneButton } from './VoipPhoneButton';
import { PhonebookContactModal } from './PhonebookContactModal';
import * as XLSX from 'xlsx';

interface PhonebookViewProps {
  drivers: DriverDirectoryItem[];
  staffMembers: StaffMember[];
  isStandalone?: boolean;
  onCallPhone?: (phone: string, name?: string, role?: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PhonebookView: FC<PhonebookViewProps> = ({
  drivers = [],
  staffMembers = [],
  isStandalone = false,
  onCallPhone,
  onShowToast,
}) => {
  // Settings & Storage
  const [settings, setSettings] = useState<PhonebookCustomSettings>(getPhonebookSettings());
  const [customContacts, setCustomContacts] = useState<PhonebookContact[]>(getCustomPhonebookContacts());
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavoriteContactIds());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PhonebookCategory>('ALL');
  const [selectedLetter, setSelectedLetter] = useState<string>('همه');
  const [viewMode, setViewMode] = useState<PhonebookViewMode>(settings.defaultViewMode || 'ROLODEX');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Contact Modal (Add / Edit)
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PhonebookContact | null>(null);

  // Build unified contacts list from drivers + staff + custom
  const allContacts = useMemo(() => {
    return buildUnifiedPhonebook(drivers, staffMembers, customContacts, favoriteIds);
  }, [drivers, staffMembers, customContacts, favoriteIds]);

  // Save changes to localStorage
  const handleSaveContact = (contact: PhonebookContact) => {
    setCustomContacts((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === contact.id);
      let updated: PhonebookContact[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = contact;
      } else {
        updated = [contact, ...prev];
      }
      saveCustomPhonebookContacts(updated);
      return updated;
    });
  };

  const handleDeleteContact = (contactId: string) => {
    if (window.confirm('آیا از حذف این مخاطب از دفترچه تلفن اطمینان دارید؟')) {
      setCustomContacts((prev) => {
        const filtered = prev.filter((c) => c.id !== contactId);
        saveCustomPhonebookContacts(filtered);
        return filtered;
      });
      onShowToast?.('مخاطب با موفقیت حذف شد.', 'info');
    }
  };

  const handleToggleFavorite = (contactId: string) => {
    setFavoriteIds((prev) => {
      let updated: string[];
      if (prev.includes(contactId)) {
        updated = prev.filter((id) => id !== contactId);
      } else {
        updated = [...prev, contactId];
      }
      saveFavoriteContactIds(updated);
      return updated;
    });
  };

  // Letter count mapping for fast Persian alphabetical ribbon
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let favCount = 0;

    for (const c of allContacts) {
      if (c.isFavorite) favCount++;
      const first = getPersianFirstChar(c.name);
      if (first) {
        counts[first] = (counts[first] || 0) + 1;
      }
    }
    counts['همه'] = allContacts.length;
    counts['⭐️ برگزیدگان'] = favCount;
    return counts;
  }, [allContacts]);

  // Filtering
  const filteredContacts = useMemo(() => {
    let list = [...allContacts];

    // 1. Category Filter
    if (selectedCategory === 'FAVORITES') {
      list = list.filter((c) => c.isFavorite);
    } else if (selectedCategory !== 'ALL') {
      list = list.filter((c) => c.category === selectedCategory);
    }

    // 2. Alphabet Filter
    if (selectedLetter === '⭐️ برگزیدگان') {
      list = list.filter((c) => c.isFavorite);
    } else if (selectedLetter !== 'همه') {
      list = list.filter((c) => getPersianFirstChar(c.name) === selectedLetter);
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchAlt = c.altPhone?.includes(q);
        const matchExt = c.extension?.includes(q);
        const matchOrg = c.organization?.toLowerCase().includes(q);
        const matchRole = c.role?.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);
        const matchTags = c.tags?.some((t) => t.toLowerCase().includes(q));
        const matchPlate = c.vehiclePlate?.includes(q);
        return (
          matchName ||
          matchPhone ||
          matchAlt ||
          matchExt ||
          matchOrg ||
          matchRole ||
          matchNotes ||
          matchTags ||
          matchPlate
        );
      });
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name, 'fa');
    });

    return list;
  }, [allContacts, selectedCategory, selectedLetter, searchQuery]);

  // Open standalone popup window for multi-monitor workstations
  const handleOpenStandalone = () => {
    const url = `${window.location.origin}${window.location.pathname}?tab=PHONEBOOK&standalone=true`;
    window.open(url, '_blank', 'width=1280,height=850,menubar=no,toolbar=no,location=no');
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportRows = filteredContacts.map((c, idx) => ({
        ردیف: idx + 1,
        'نام و نام خانوادگی': c.name,
        'شماره تماس': c.phone,
        'شماره دوم / ثابت': c.altPhone || '',
        'داخلی سانترال': c.extension || '',
        دسته‌بندی:
          c.category === 'DRIVER'
            ? 'راننده'
            : c.category === 'STAFF'
            ? 'پرسنل'
            : c.category === 'WORKSHOP'
            ? 'تعمیرگاه و امداد'
            : c.category === 'CONTRACTOR'
            ? 'پیمانکار و باربری'
            : c.category === 'CUSTOMER'
            ? 'مشتری'
            : c.category === 'EMERGENCY'
            ? 'اضطراری'
            : 'سفارشی',
        'سازمان / شرکت': c.organization || '',
        'سمت یا فعالیت': c.role || '',
        برگزیده: c.isFavorite ? 'بله' : 'خیر',
        یادداشت: c.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'دفترچه_تلفن');
      XLSX.writeFile(wb, `Hamibar_Phonebook_${new Date().toISOString().slice(0, 10)}.xlsx`);
      onShowToast?.('فایل اکسل دفترچه تلفن با موفقیت صادر شد.', 'success');
    } catch {
      onShowToast?.('خطا در صدور فایل اکسل.', 'error');
    }
  };

  // Category Badge Helper
  const getCategoryMeta = (cat: PhonebookCategory) => {
    switch (cat) {
      case 'DRIVER':
        return { label: 'راننده', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Truck };
      case 'STAFF':
        return { label: 'پرسنل', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', icon: Users };
      case 'WORKSHOP':
        return { label: 'تعمیرگاه/امداد', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Wrench };
      case 'CONTRACTOR':
        return { label: 'باربری/پیمانکار', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Building2 };
      case 'EMERGENCY':
        return { label: 'اضطراری', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: ShieldAlert };
      default:
        return { label: 'سفارشی', color: 'bg-slate-800 text-slate-300 border-slate-700', icon: Phone };
    }
  };

  return (
    <div
      dir="rtl"
      className={`space-y-4 animate-in fade-in duration-150 ${
        isStandalone ? 'p-4 sm:p-6 min-h-screen bg-[#070d1a] text-slate-100' : ''
      }`}
    >
      {/* 1. TOP HEADER STRIP: Title, Stats, Add Button & Pop-out Launcher */}
      <div className="bg-gradient-to-r from-[#0d1629] via-[#101b33] to-[#0c1424] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-950/40 shrink-0">
            <PhoneCall className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white">
                دفترچه تلفن هوشمند و دایرکتوری دیسپچ
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                {toFaDigits(allContacts.length)} مخاطب
              </span>
              {isStandalone && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  پنجره مستقل دیسپچ
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              مجموعه کامل شماره تماس رانندگان، پرسنل، امداد خودرو، بیمه، باربری‌ها و کلیک برای تماس (VoIP)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Custom Contact */}
          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setIsAddEditModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>افزودن مخاطب جدید</span>
          </button>

          {/* Standalone Window Pop-Out Button */}
          {!isStandalone && (
            <button
              type="button"
              onClick={handleOpenStandalone}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="باز کردن دفترچه تلفن در یک تب/پنجره مستقل برای کار با دو مانیتور"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>باز در تب جداگانه</span>
            </button>
          )}

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="دریافت فایل اکسل مخاطبین"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">اکسل</span>
          </button>

          {/* Quick Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="چاپ دفترچه تلفن"
          >
            <Printer className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* 2. FAST PERSIAN ALPHABET RIBBON (چیدمان متمایز الفبایی) */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-xl p-2.5 overflow-x-auto shadow-md">
        <div className="flex items-center gap-1 min-w-max">
          <span className="text-[11px] font-bold text-slate-400 ml-2 shrink-0">فهرست الفبا:</span>
          {PERSIAN_ALPHABET.map((letter) => {
            const count = letterCounts[letter] || 0;
            const isSelected = selectedLetter === letter;
            const hasContacts = count > 0;

            return (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(letter)}
                disabled={!hasContacts && letter !== 'همه'}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                    : hasContacts
                    ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                    : 'opacity-35 text-slate-600 cursor-not-allowed'
                }`}
                title={`${letter} (${count} مخاطب)`}
              >
                <span>{letter}</span>
                {count > 0 && letter !== 'همه' && (
                  <span
                    className={`text-[9px] px-1 rounded-full font-mono ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {toFaDigits(count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTROL & SEARCH BAR: Categories, Search Input, and View Mode Switches */}
      <div className="bg-[#0d1629] border border-slate-800 rounded-2xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو با نام، شماره، داخلی سانترال، سازمان، پلاک خودرو، سمت..."
            className="w-full bg-[#070d1c] border border-slate-700/80 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'ALL', label: 'همه مخاطبین', icon: Users },
            { id: 'FAVORITES', label: '⭐️ برگزیدگان', icon: Star },
            { id: 'DRIVER', label: 'رانندگان', icon: Truck },
            { id: 'STAFF', label: 'پرسنل', icon: Building2 },
            { id: 'WORKSHOP', label: 'تعمیرگاه/امداد', icon: Wrench },
            { id: 'CONTRACTOR', label: 'باربری/پیمانکار', icon: Layers },
            { id: 'EMERGENCY', label: 'اضطراری', icon: ShieldAlert },
          ].map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isCatActive
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-[#091020] hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Switches (کاستومایز چیدمان) */}
        <div className="flex items-center gap-1 bg-[#070d1c] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('ROLODEX')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'ROLODEX'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="چیدمان کارت تلفنی رولودکس"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">رولودکس</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('SPEED_DIAL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'SPEED_DIAL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="کلیدهای تماس سریع دیسپچ"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تماس سریع</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="چیدمان جدولی فشرده"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">جدول</span>
          </button>
        </div>
      </div>

      {/* 4. ACTIVE RESULTS CONTENT */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 text-center bg-[#0d1629] border border-slate-800 rounded-2xl">
          <PhoneCall className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">مخاطبی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 mb-4">
            عبارت جستجو را تغییر دهید یا از دکمه «افزودن مخاطب جدید» برای ثبت شماره استفاده کنید.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedLetter('همه');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            پاک کردن فیلترها
          </button>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: ROLODEX CARDS (چیدمان شاخص و متمایز کارت‌های رولودکس) */}
          {viewMode === 'ROLODEX' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredContacts.map((contact) => {
                const meta = getCategoryMeta(contact.category);
                const Icon = meta.icon;

                return (
                  <div
                    key={contact.id}
                    className="group relative bg-[#0e172a] hover:bg-[#121d36] border border-slate-700/80 hover:border-amber-500/50 rounded-2xl p-4 shadow-lg transition-all duration-200 flex flex-col justify-between"
                  >
                    {/* Header Strip: Avatar/Badge + Pin Favorite */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {contact.avatarUrl ? (
                            <img
                              src={contact.avatarUrl}
                              alt={contact.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-black text-sm shrink-0">
                              {contact.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
                              {contact.name}
                            </h3>
                            <div className="text-[11px] text-slate-400 truncate">
                              {contact.role || contact.organization || 'مخاطب سازمانی'}
                            </div>
                          </div>
                        </div>

                        {/* Star Favorite Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(contact.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-amber-400 transition cursor-pointer"
                          title={contact.isFavorite ? 'حذف از برگزیدگان' : 'افزودن به برگزیدگان'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              contact.isFavorite
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Badges: Category & Extension */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${meta.color} flex items-center gap-1`}>
                          <Icon className="w-3 h-3" />
                          <span>{meta.label}</span>
                        </span>

                        {contact.extension && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <PhoneForwarded className="w-2.5 h-2.5" />
                            <span>داخلی {toFaDigits(contact.extension)}</span>
                          </span>
                        )}

                        {contact.personnelCode && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            کد: {toFaDigits(contact.personnelCode)}
                          </span>
                        )}
                      </div>

                      {/* Notes / Organization info */}
                      {contact.notes && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed bg-[#070d1c] p-2 rounded-lg border border-slate-800/80 mb-3">
                          {contact.notes}
                        </p>
                      )}
                    </div>

                    {/* Footer: Direct Call Action Button & Tooling */}
                    <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <VoipPhoneButton
                          phone={contact.phone}
                          name={contact.name}
                          role={contact.role || contact.organization}
                          variant="chip"
                          showCopy={true}
                          onCall={onCallPhone}
                        />

                        {contact.altPhone && (
                          <VoipPhoneButton
                            phone={contact.altPhone}
                            name={`${contact.name} (شماره دوم)`}
                            role={contact.role}
                            variant="icon"
                            onCall={onCallPhone}
                          />
                        )}
                      </div>

                      {/* Edit / Delete if custom */}
                      {contact.isCustom && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContact(contact);
                              setIsAddEditModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="ویرایش"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: SPEED DIAL GRID (کلیدهای لمسی بزرگ برای شیفت شلوغ دیسپچ) */}
          {viewMode === 'SPEED_DIAL' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onCallPhone?.(contact.phone, contact.name, contact.role)}
                  className="group relative p-3 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#121e38] hover:from-emerald-950/70 hover:to-emerald-900/60 border border-slate-700/80 hover:border-emerald-500/60 transition-all text-right shadow-md cursor-pointer flex flex-col justify-between min-h-[105px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition-colors font-bold">
                      <PhoneCall className="w-4 h-4 animate-pulse" />
                    </div>
                    {contact.extension && (
                      <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        داخلی {toFaDigits(contact.extension)}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="font-black text-white text-xs truncate group-hover:text-emerald-300">
                      {contact.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {contact.role || contact.organization || 'تماس سریع'}
                    </div>
                    <div className="font-mono font-bold text-xs text-emerald-400 mt-1 dir-ltr text-right">
                      {toFaDigits(contact.phone)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* VIEW MODE 3: COMPACT TABLE (فهرست متراکم داده‌ها) */}
          {viewMode === 'TABLE' && (
            <div className="bg-[#0e172a] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-[#080e1c] text-slate-300 border-b border-slate-800 font-bold select-none">
                      <th className="py-3 px-3 w-10 text-center">⭐️</th>
                      <th className="py-3 px-3">نام و مشخصات</th>
                      <th className="py-3 px-3">سازمان / سمت</th>
                      <th className="py-3 px-3 text-center">دسته‌بندی</th>
                      <th className="py-3 px-3 text-center">داخلی</th>
                      <th className="py-3 px-3 text-center">شماره تماس (VoIP)</th>
                      <th className="py-3 px-3 text-center">شماره دوم</th>
                      <th className="py-3 px-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredContacts.map((c) => {
                      const meta = getCategoryMeta(c.category);

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(c.id)}
                              className="text-slate-500 hover:text-amber-400 cursor-pointer"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  c.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{c.name}</span>
                              {c.personnelCode && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({toFaDigits(c.personnelCode)})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {c.role || c.organization || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${meta.color}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                            {c.extension ? toFaDigits(c.extension) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <VoipPhoneButton
                              phone={c.phone}
                              name={c.name}
                              role={c.role || c.organization}
                              variant="table-cell"
                              onCall={onCallPhone}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {c.altPhone ? toFaDigits(c.altPhone) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {c.isCustom ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingContact(c);
                                    setIsAddEditModalOpen(true);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-white"
                                  title="ویرایش"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContact(c.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-400"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">سیستمی</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Contact Modal */}
      <PhonebookContactModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingContact(null);
        }}
        contactToEdit={editingContact}
        onSave={handleSaveContact}
        onShowToast={onShowToast}
      />
    </div>
  );
};
