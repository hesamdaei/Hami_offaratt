import {
  PhonebookContact,
  PhonebookCustomSettings,
  DEFAULT_PHONEBOOK_SETTINGS,
} from '../types/phonebook';
import { DriverDirectoryItem } from './fleetSeedData';
import { StaffMember } from '../types';

export const STORAGE_KEY_PHONEBOOK_CUSTOM = 'hamibar_phonebook_custom_contacts_v1';
export const STORAGE_KEY_PHONEBOOK_SETTINGS = 'hamibar_phonebook_settings_v1';
export const STORAGE_KEY_PHONEBOOK_FAVORITES = 'hamibar_phonebook_favorites_v1';

// Seed Custom Logistics Contacts (تعمیرگاه‌های تخصصی، امداد خودرو، پلیس راه، بیمه‌گران، باربری‌های همکار و مراکز درمانی)
export const INITIAL_CUSTOM_LOGISTICS_CONTACTS: PhonebookContact[] = [
  {
    id: 'cnt-emergency-110',
    name: 'مرکز فوریت‌های پلیسی ۱۱۰',
    phone: '110',
    category: 'EMERGENCY',
    organization: 'فراجا',
    role: 'فوریت‌های پلیسی و حوادث',
    isEmergency: true,
    isFavorite: true,
    isCustom: true,
    notes: 'گزارش تصادفات، سرقت محموله و حوادث جاده‌ای',
    tags: ['پلیس', 'فوریتی', 'شبانه_روزی'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-emergency-115',
    name: 'اورژانس جاده‌ای و شهری ۱۱۵',
    phone: '115',
    category: 'EMERGENCY',
    organization: 'وزارت بهداشت',
    role: 'امداد و فوریت‌های پزشکی',
    isEmergency: true,
    isFavorite: true,
    isCustom: true,
    notes: 'امداد مصدومین تصادفات و سوانح ترافیکی',
    tags: ['اورژانس', 'درمانی'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-traffic-police-center',
    name: 'مرکز کنترل ترافیک و پلیس راهور',
    phone: '021120',
    altPhone: '02188255555',
    category: 'EMERGENCY',
    organization: 'پلیس راهنمایی و رانندگی',
    role: 'استعلام ترافیک جاده‌ای و انسداد معابر',
    isEmergency: true,
    isFavorite: true,
    isCustom: true,
    notes: 'اطلاع از وضعیت محورهای کوهستانی و برفی',
    tags: ['پلیس_راه', 'استعلام_راه'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-roadside-assistance-iran',
    name: 'امداد خودرو و یدک‌کش شبانه‌روزی دیزل',
    phone: '0216428',
    altPhone: '09121112233',
    extension: '400',
    category: 'WORKSHOP',
    organization: 'امداد لجستیک جاده‌ای',
    role: 'جرثقیل سنگین و یدک‌کش کفی',
    isFavorite: true,
    isCustom: true,
    notes: 'پوشش کلیه محورهای تهران، کرج، ساوه و اتوبان قم',
    tags: ['امداد_سیار', 'جرثقیل', 'دیزل'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-workshop-diesel-tehran',
    name: 'تعمیرگاه تخصصی ایفا و هیوندای غرب',
    phone: '02144501234',
    altPhone: '09123456789',
    extension: '402',
    category: 'WORKSHOP',
    organization: 'تعمیرگاه مجاز مرکزی',
    role: 'مهندس اکبری - عیب‌یابی انژکتور و موتور',
    isFavorite: true,
    isCustom: true,
    notes: 'طرف قرارداد شرکت حامی بار با تخفیف سازمانی',
    tags: ['مکانیک', 'هیوندای', 'انژکتور'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-tires-heavy',
    name: 'آپاراتی و لاستیک‌فروشی سنگین شورآباد',
    phone: '02156543210',
    altPhone: '09127778899',
    category: 'WORKSHOP',
    organization: 'خدمات لاستیک جاده قدیم',
    role: 'استاد مرادی - بالانس و پنچرگیری سنگین',
    isCustom: true,
    notes: 'سرویس‌دهی ۲۴ ساعته به کامیونت‌ها و تریلرها',
    tags: ['لاستیک', 'شورآباد', 'آپاراتی'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-insurance-asia-damage',
    name: 'کارشناس خسارت بیمه آسیا (شعبه ترابری)',
    phone: '02188901234',
    altPhone: '09128889900',
    extension: '315',
    category: 'CONTRACTOR',
    organization: 'بیمه آسیا - واحد ترابری',
    role: 'مهندس حسینی - صدور الحاقیه و کارشناسی',
    isFavorite: true,
    isCustom: true,
    notes: 'رسیدگی به حوادث بار و بارنامه آنلاین',
    tags: ['بیمه', 'خسارت', 'بارنامه'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-custom-wh-kahrizak',
    name: 'انبار لجستیک و بارانداز مرکزی کهریزک',
    phone: '02156529876',
    altPhone: '09124445566',
    extension: '210',
    category: 'CONTRACTOR',
    organization: 'هلدینگ پخش سراسری',
    role: 'حاج داوود رستمی - سرپرست بارانداز',
    isCustom: true,
    notes: 'تخلیه و بارگیری شبانه - هماهنگی قبل از اعزام',
    tags: ['انبار', 'کهریزک', 'بارگیری'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-clinic-occupational',
    name: 'درمانگاه طب کار و آزمایشگاه عدم اعتیاد',
    phone: '02166554433',
    extension: '105',
    category: 'EMERGENCY',
    organization: 'مرکز طب کار رازی',
    role: 'دکتر امینی - صدور کارت سلامت رانندگان',
    isCustom: true,
    notes: 'انجام معاینات ادواری رانندگان و آزمایش سلامت',
    tags: ['طب_کار', 'کارت_سلامت'],
    createdAt: '1405/01/01',
  },
  {
    id: 'cnt-dispatch-hq',
    name: 'میز دیسپچ و کنترل مرکزی حامی بار',
    phone: '02144001090',
    altPhone: '02144001091',
    extension: '100',
    category: 'STAFF',
    organization: 'دفتر مرکزی دیسپچ',
    role: 'هماهنگی تردد ناوگان و اعزام',
    isFavorite: true,
    isCustom: true,
    notes: 'خط ویژه رانندگان و شیفت اپراتوری',
    tags: ['دیسپچ', 'مرکزی', 'داخلی_۱۰۰'],
    createdAt: '1405/01/01',
  },
];

/**
 * دریافت مخاطبین سفارشی ثبت شده از حافظه کلاینت
 */
export function getCustomPhonebookContacts(): PhonebookContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHONEBOOK_CUSTOM);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  saveCustomPhonebookContacts(INITIAL_CUSTOM_LOGISTICS_CONTACTS);
  return INITIAL_CUSTOM_LOGISTICS_CONTACTS;
}

/**
 * ذخیره مخاطبین سفارشی در حافظه کلاینت
 */
export function saveCustomPhonebookContacts(contacts: PhonebookContact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PHONEBOOK_CUSTOM, JSON.stringify(contacts));
  } catch (e) {
    console.error('خطا در ذخیره مخاطبین دفترچه تلفن:', e);
  }
}

/**
 * دریافت تنظیمات کاستومایز دفترچه تلفن
 */
export function getPhonebookSettings(): PhonebookCustomSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHONEBOOK_SETTINGS);
    if (raw) {
      return { ...DEFAULT_PHONEBOOK_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_PHONEBOOK_SETTINGS };
}

/**
 * ذخیره تنظیمات کاستومایز دفترچه تلفن
 */
export function savePhonebookSettings(settings: PhonebookCustomSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_PHONEBOOK_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('خطا در ذخیره تنظیمات دفترچه تلفن:', e);
  }
}

/**
 * دریافت لیست شناسه‌های مخاطبین ستاره‌دار / برگزیده
 */
export function getFavoriteContactIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHONEBOOK_FAVORITES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return ['cnt-emergency-110', 'cnt-emergency-115', 'cnt-dispatch-hq'];
}

/**
 * ذخیره لیست شناسه‌های مخاطبین ستاره‌دار
 */
export function saveFavoriteContactIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PHONEBOOK_FAVORITES, JSON.stringify(ids));
  } catch {}
}

export const STORAGE_KEY_PHONEBOOK_EXTENSIONS = 'hamibar_phonebook_extensions_v1';

export const CATEGORY_META: Record<
  PhonebookContact['category'],
  { label: string; shortLabel: string; color: string }
> = {
  ALL: { label: 'همه مخاطبین', shortLabel: 'همه', color: 'slate' },
  FAVORITES: { label: 'ستاره‌دارها و برگزیده', shortLabel: 'ستاره‌دار', color: 'amber' },
  DRIVER: { label: 'رانندگان ناوگان', shortLabel: 'رانندگان', color: 'sky' },
  STAFF: { label: 'کادر و پرسنل سازمانی', shortLabel: 'پرسنل', color: 'indigo' },
  WORKSHOP: { label: 'تعمیرگاه‌ها و امداد خودرو', shortLabel: 'تعمیرگاه و امداد', color: 'orange' },
  CONTRACTOR: { label: 'باربری‌ها و پیمانکاران همکار', shortLabel: 'پیمانکاران', color: 'emerald' },
  CUSTOMER: { label: 'مشتریان و نمایندگی‌ها', shortLabel: 'مشتریان', color: 'purple' },
  EMERGENCY: { label: 'فوریت‌ها، پلیس راه و اورژانس', shortLabel: 'اضطراری', color: 'rose' },
  CUSTOM: { label: 'سایر مخاطبین دیسپچ', shortLabel: 'سایر', color: 'cyan' },
};

export function getExtensionOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHONEBOOK_EXTENSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

export function assignContactExtension(contactId: string, extension: string): void {
  try {
    const map = getExtensionOverrides();
    const clean = extension.trim();
    if (clean) {
      map[contactId] = clean;
    } else {
      delete map[contactId];
    }
    localStorage.setItem(STORAGE_KEY_PHONEBOOK_EXTENSIONS, JSON.stringify(map));

    // Also update in custom contacts if it exists there
    const customs = getCustomPhonebookContacts();
    const idx = customs.findIndex((c) => c.id === contactId);
    if (idx !== -1) {
      customs[idx] = { ...customs[idx], extension: clean || undefined };
      saveCustomPhonebookContacts(customs);
    }
  } catch {}
}

export function toggleContactFavorite(contactId: string): boolean {
  const favs = getFavoriteContactIds();
  const exists = favs.includes(contactId);
  const next = exists ? favs.filter((id) => id !== contactId) : [...favs, contactId];
  saveFavoriteContactIds(next);
  return !exists;
}

export function upsertCustomContact(
  contactData: Omit<PhonebookContact, 'id'> & { id?: string }
): PhonebookContact {
  const customs = getCustomPhonebookContacts();
  const id = contactData.id || `cnt-custom-${Date.now()}`;
  const existingIdx = customs.findIndex((c) => c.id === id);

  const savedContact: PhonebookContact = {
    ...contactData,
    id,
    isCustom: contactData.id?.startsWith('drv-') || contactData.id?.startsWith('stf-') ? false : true,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    customs[existingIdx] = { ...customs[existingIdx], ...savedContact };
  } else {
    customs.unshift({ ...savedContact, createdAt: savedContact.createdAt || new Date().toISOString() });
  }

  saveCustomPhonebookContacts(customs);
  if (contactData.extension !== undefined) {
    assignContactExtension(id, contactData.extension || '');
  }
  if (contactData.isFavorite !== undefined) {
    const favs = getFavoriteContactIds();
    if (contactData.isFavorite && !favs.includes(id)) {
      saveFavoriteContactIds([...favs, id]);
    } else if (!contactData.isFavorite && favs.includes(id)) {
      saveFavoriteContactIds(favs.filter((f) => f !== id));
    }
  }

  return savedContact;
}

export function deleteCustomContact(contactId: string): void {
  const customs = getCustomPhonebookContacts().filter((c) => c.id !== contactId);
  saveCustomPhonebookContacts(customs);
}

/**
 * تبدیل هوشمند رانندگان و پرسنل به مخاطبین دفترچه تلفن و ادغام با مخاطبین سفارشی
 */
export function buildUnifiedPhonebook(
  driverDirectory: DriverDirectoryItem[],
  staffMembers: StaffMember[],
  customContacts: PhonebookContact[] = getCustomPhonebookContacts(),
  favoriteIds: string[] = getFavoriteContactIds()
): PhonebookContact[] {
  const result: PhonebookContact[] = [];
  const favSet = new Set(favoriteIds);
  const extMap = getExtensionOverrides();
  const overrideMap = new Map<string, PhonebookContact>();

  // 1. اضافه کردن مخاطبین سفارشی لجستیک (و تفکیک اوررایدهای سیستمی)
  for (const c of customContacts) {
    if (c.id.startsWith('drv-') || c.id.startsWith('stf-')) {
      overrideMap.set(c.id, c);
      continue;
    }
    result.push({
      ...c,
      extension: extMap[c.id] !== undefined ? extMap[c.id] : c.extension,
      isFavorite: favSet.has(c.id) || !!c.isFavorite,
    });
  }

  // 2. همگام‌سازی خودکار رانندگان ناوگان
  for (const d of driverDirectory) {
    if (!d.name || !d.phone) continue;
    const driverId = `drv-${d.id}`;
    const assignedPlate = d.assignedVehicles?.[0];
    const override = overrideMap.get(driverId);

    result.push({
      id: driverId,
      name: override?.name || d.name,
      phone: override?.phone || d.phone,
      altPhone: override?.altPhone,
      extension: extMap[driverId] || override?.extension,
      category: override?.category || 'DRIVER',
      organization: override?.organization || 'ناوگان حمل‌ونقل حامی بار',
      role:
        override?.role ||
        `راننده ${d.driverType === 'EMPLOYED' ? 'استخدامی' : d.driverType === 'CONTRACTOR' ? 'پیمانکاری' : 'آزاد'}${
          d.code ? ` (کد ${d.code})` : ''
        }`,
      personnelCode: d.personnelCode || d.code,
      vehiclePlate: assignedPlate,
      avatarUrl: d.documents?.avatarPhoto || d.avatarUrl,
      isFavorite: favSet.has(driverId),
      notes: override?.notes || (d.licenseNumber ? `شماره گواهینامه: ${d.licenseNumber}` : undefined),
      tags: ['راننده', assignedPlate ? `پلاک_${assignedPlate}` : 'بدون_خودرو'],
    });
  }

  // 3. همگام‌سازی خودکار کادر و پرسنل سازمانی
  for (const s of staffMembers) {
    if (!s.name || (!s.phone && !s.officePhone)) continue;
    const staffId = `stf-${s.id}`;
    const override = overrideMap.get(staffId);
    const defaultExt = s.officePhone ? s.officePhone.replace(/[^0-9]/g, '') : undefined;

    result.push({
      id: staffId,
      name: override?.name || s.name,
      phone: override?.phone || s.phone || s.officePhone || '',
      altPhone: override?.altPhone || (s.officePhone && s.officePhone !== s.phone ? s.officePhone : undefined),
      extension: extMap[staffId] || override?.extension || defaultExt,
      category: override?.category || 'STAFF',
      organization: override?.organization || s.department || 'مدیریت و دفتر مرکزی',
      role: override?.role || s.role,
      personnelCode: s.code,
      avatarUrl: s.photoUrl,
      isFavorite: favSet.has(staffId),
      notes:
        override?.notes ||
        `شیفت: ${s.shift === 'night' ? 'شب' : 'روز'} - وضعیت: ${s.status === 'inactive' ? 'غیرفعال' : 'فعال'}`,
      tags: ['پرسنل', s.department || 'اداری'],
    });
  }

  return result;
}

// Persian Alphabet List for Fast Alphabetical Jump Ribbon
export const PERSIAN_ALPHABET = [
  'همه',
  '⭐️ برگزیدگان',
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

/**
 * تشخیص حرف اول فارسی برای فیلتر الفبایی
 */
export function getPersianFirstChar(name: string): string {
  if (!name) return '';
  const clean = name.trim();
  const first = clean.charAt(0);
  if (first === 'آ' || first === 'ا') return 'ا';
  return first;
}
