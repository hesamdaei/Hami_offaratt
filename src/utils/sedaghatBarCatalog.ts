export type CatalogCategory =
  | 'VEHICLE'
  | 'WORKER'
  | 'HEAVY_ITEM'
  | 'PACKING_MATERIAL'
  | 'SPECIAL_SERVICE';

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: CatalogCategory;
  categoryName: string;
  unit: string;
  unitPriceRial: number;
  baseHours?: number;
  extraHourRateRial?: number;
  floorExtraRateRial?: number;
  requiresFloors?: boolean;
  description?: string;
}

export interface OrderLineItem {
  id: string;
  catalogItemId: string;
  code: string;
  name: string;
  categoryName: string;
  unit: string;
  quantity: number;
  unitPriceRial: number;
  baseHours?: number;
  extraHours?: number;
  extraHourRateRial?: number;
  floorCount?: number;
  floorExtraRateRial?: number;
  totalPriceRial: number;
  notes?: string;
}

export const SEDAGHAT_SERVICES_CATALOG: CatalogItem[] = [
  // 1. Vehicles
  {
    id: 'cat-khavar',
    code: 'KH-01',
    name: 'خاور (کامیونت مسقف موکت‌کاری شده)',
    category: 'VEHICLE',
    categoryName: 'ماشین',
    unit: 'دستگاه',
    unitPriceRial: 51800000,
    baseHours: 3,
    extraHourRateRial: 20000000,
    floorExtraRateRial: 0,
    requiresFloors: false,
    description: 'کامیونت اتاق بزرگ ۵.۵ متری مجهز به ۱۰۰ عدد پتو و ضربه‌گیر',
  },

  // 2. Workers
  {
    id: 'cat-wrk-packing',
    code: 'WRK-01',
    name: 'کارگر بسته بندی',
    category: 'WORKER',
    categoryName: 'کارگر',
    unit: 'نفر',
    unitPriceRial: 18000000,
    baseHours: 3,
    extraHourRateRial: 3000000,
    floorExtraRateRial: 0,
    requiresFloors: false,
    description: 'تکنسین متخصص پک اثاثیه با وکیوم و بابل‌رپ',
  },
  {
    id: 'cat-wrk-khavar',
    code: 'WRK-02',
    name: 'کارگر خاور (چیدمان و تخلیه بار)',
    category: 'WORKER',
    categoryName: 'کارگر',
    unit: 'نفر',
    unitPriceRial: 13000000,
    baseHours: 3,
    extraHourRateRial: 3000000,
    floorExtraRateRial: 0,
    requiresFloors: false,
    description: 'کارگر حمل و بارگیری داخل کامیون',
  },
  {
    id: 'cat-wrk-moving',
    code: 'WRK-03',
    name: 'کارگر حمل بار و جابجایی',
    category: 'WORKER',
    categoryName: 'کارگر',
    unit: 'نفر',
    unitPriceRial: 18000000,
    baseHours: 3,
    extraHourRateRial: 3000000,
    floorExtraRateRial: 0,
    requiresFloors: false,
    description: 'کارگر مجرب حمل طبقات و جابجایی سنگین',
  },
  {
    id: 'cat-wrk-catering',
    code: 'WRK-04',
    name: 'کارگر پذیرایی و چیدمان نهایی',
    category: 'WORKER',
    categoryName: 'کارگر',
    unit: 'نفر',
    unitPriceRial: 18000000,
    baseHours: 3,
    extraHourRateRial: 3000000,
    floorExtraRateRial: 0,
    requiresFloors: false,
    description: 'خدمات پذیرایی و چیدمان تخصصی لوازم منزل',
  },

  // 3. Heavy & Special Items
  {
    id: 'cat-hvy-side',
    code: 'HVY-03',
    name: 'یخچال ساید بای ساید',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 7000000,
    floorExtraRateRial: 3500000,
    requiresFloors: true,
    description: 'حمل طبقات یخچال ساید و فرنچ با پتوپیچی کامل',
  },
  {
    id: 'cat-hvy-safe-100',
    code: 'HVY-01',
    name: 'گاوصندوق زیر ۱۰۰ کیلوگرم',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 20000000,
    floorExtraRateRial: 14000000,
    requiresFloors: true,
    description: 'حمل گاوصندوق تا وزن ۱۰۰ کیلو با طناب و تسمه مخصوص',
  },
  {
    id: 'cat-hvy-safe-300',
    code: 'HVY-02',
    name: 'گاوصندوق ۲۰۰ تا ۳۰۰ کیلوگرم',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 24000000,
    floorExtraRateRial: 14000000,
    requiresFloors: true,
    description: 'حمل گاوصندوق‌های سنگین بانکی و تجاری',
  },
  {
    id: 'cat-hvy-treadmill',
    code: 'HVY-04',
    name: 'تردمیل و لوازم بدنسازی خانگی',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 20000000,
    floorExtraRateRial: 14000000,
    requiresFloors: true,
    description: 'تردمیل، الپتیکال و دوچرخه ثابت سنگین',
  },
  {
    id: 'cat-hvy-tv-50',
    code: 'HVY-05',
    name: 'تلویزیون ۵۰ اینچ و بالاتر',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 20000000,
    floorExtraRateRial: 14000000,
    requiresFloors: true,
    description: 'حمل ایمن با جعبه یا فوم ضد ضربه مخصوص',
  },
  {
    id: 'cat-hvy-piano-dig',
    code: 'HVY-06',
    name: 'پیانو دیجیتال کوچک',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 30000000,
    floorExtraRateRial: 14000000,
    requiresFloors: true,
    description: 'پیانو برقی پایه‌دار یا کیبورد حرفه‌ای',
  },
  {
    id: 'cat-hvy-piano-wall',
    code: 'HVY-07',
    name: 'پیانو متوسط دیواری (آکوستیک)',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 40000000,
    floorExtraRateRial: 15000000,
    requiresFloors: true,
    description: 'حمل تخصصی پیانو دیواری مکانیکی سنگین',
  },
  {
    id: 'cat-hvy-partition',
    code: 'HVY-08',
    name: 'پارتیشن شیشه‌ای / میز کنفرانس بزرگ',
    category: 'HEAVY_ITEM',
    categoryName: 'اقلام هزینه دار',
    unit: 'عدد',
    unitPriceRial: 24000000,
    floorExtraRateRial: 14000000,
    requiresFloors: true,
    description: 'حمل قطعات شیشه‌ای، آینه‌های قدی و شیشه‌های میز ناهارخوری',
  },

  // 4. Packing Materials
  {
    id: 'cat-pkg-vac-25',
    code: 'PKG-01',
    name: 'وکیوم ۲۵ متری گردویی (ضخیم)',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 25000000,
    description: 'رول حبابدار ۳ لایه درجه یک با تراکم بالا',
  },
  {
    id: 'cat-pkg-vac-20',
    code: 'PKG-02',
    name: 'وکیوم ۲۰ متری درجه یک',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 21800000,
    description: 'رول ضربه‌گیر نایلون حبابدار استاندارد',
  },
  {
    id: 'cat-pkg-box-lam',
    code: 'PKG-03',
    name: 'کارتن حمل بار ۵ لایه لمینتی',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 4600000,
    description: 'کارتن ضخیم ۵ لایه صادراتی جهت شکستنی‌ها و کتاب',
  },
  {
    id: 'cat-pkg-box-wardrobe',
    code: 'PKG-04',
    name: 'کارتن و میله رگال لباس (رگال‌دار)',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 12400000,
    description: 'کارتن ایستاده کمدی مخصوص کت‌وشلوار و لباس‌های مجلسی',
  },
  {
    id: 'cat-pkg-stretch',
    code: 'PKG-05',
    name: 'استرچ سلفون ۵۰۰ متری (کره‌ای)',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 14800000,
    description: 'سلفون ضد خش و ضد گردوغبار برای مبلمان و تشک',
  },
  {
    id: 'cat-pkg-tape',
    code: 'PKG-06',
    name: 'چسب پهن ۹۰ یاردی ۵ سانتی',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 2000000,
    description: 'چسب کریستال پرچسب با چسبندگی فوق‌العاده',
  },
  {
    id: 'cat-pkg-bubble-90',
    code: 'PKG-07',
    name: 'بابل ۹۰ متری صادراتی',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 48800000,
    description: 'رول بابل رپ صنعتی بزرگ برای کل لوازم ویلا یا منزل',
  },
  {
    id: 'cat-pkg-bed-bag',
    code: 'PKG-08',
    name: 'ساک رختخواب زیپ‌دار و کاور تشک',
    category: 'PACKING_MATERIAL',
    categoryName: 'کالا',
    unit: 'عدد',
    unitPriceRial: 11800000,
    description: 'کاور برزنتی نفوذناپذیر مخصوص پتو و رختخواب',
  },

  // 5. Special Services & Technical
  {
    id: 'cat-srv-door-2',
    code: 'SRV-01',
    name: 'باز و بست درب ساید ۲ درب',
    category: 'SPECIAL_SERVICE',
    categoryName: 'خدمات',
    unit: 'عدد',
    unitPriceRial: 25000000,
    description: 'توسط تکنسین تاسیسات و سرمایش جهت عبور از راه‌پله‌های باریک',
  },
  {
    id: 'cat-srv-door-4',
    code: 'SRV-02',
    name: 'باز و بست درب ساید ۴ درب (فرنچ)',
    category: 'SPECIAL_SERVICE',
    categoryName: 'خدمات',
    unit: 'عدد',
    unitPriceRial: 45000000,
    description: 'باز کردن و مونتاژ دقیق لوله‌ها و سیم‌کشی‌های دیجیتال ۴ درب',
  },
  {
    id: 'cat-srv-stopover',
    code: 'SRV-03',
    name: 'توقف و تخلیه در مسیر دوم (حومه/شهری)',
    category: 'SPECIAL_SERVICE',
    categoryName: 'خدمات',
    unit: 'مرتبه',
    unitPriceRial: 10000000,
    description: 'توقف در مقصد میانی یا انبار بین‌راهی',
  },
  {
    id: 'cat-srv-insurance',
    code: 'INS-01',
    name: 'بیمه تکمیلی اثاثیه و تضمین خسارت',
    category: 'SPECIAL_SERVICE',
    categoryName: 'خدمات',
    unit: 'میلیون ریال',
    unitPriceRial: 30000,
    description: 'بیمه رسمی به ازای هر ۱،۰۰۰،۰۰۰ ریال ارزش اظهار شده',
  },
  {
    id: 'cat-srv-tip',
    code: 'TIP-01',
    name: 'انعام و پاداش پرسنل',
    category: 'SPECIAL_SERVICE',
    categoryName: 'خدمات',
    unit: 'ریال',
    unitPriceRial: 0,
    description: 'پاداش اختیاری کارگران و راننده',
  },
];

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  VEHICLE: 'ماشین و ناوگان',
  WORKER: 'پرسنل و کارگران',
  HEAVY_ITEM: 'اقلام سنگین و حجیم',
  PACKING_MATERIAL: 'لوازم و ملزومات بسته‌بندی',
  SPECIAL_SERVICE: 'خدمات فنی و جانبی',
};
