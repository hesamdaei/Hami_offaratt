export type ZoneType = 'INTERNAL' | 'SUBURB' | 'SPECIAL_SUBURB' | 'INTERCITY';
export type TehranZoneSector = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTER' | 'SUBURB' | 'SPECIAL_SUBURB';

export interface NeighborhoodItem {
  id: string;
  name: string;
  zoneType: ZoneType;
  sector: TehranZoneSector;
  sectorLabel: string;
  description?: string;
}

export interface ReservationRates {
  // Vehicle & Labor (Domestic / In-city Tehran)
  khavarDomestic: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  laborKhavarDomestic: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  nissanDomestic: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  laborNissanDomestic: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };

  // Suburbs / Hoomeh (Islamshahr, Karaj, Shahryar, Pardis, etc.)
  khavarSuburb: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  nissanSuburb: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  laborNissanSuburb: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };

  // Special / Far Suburbs (Hashtgerd, Gilavand, Damavand, Firoozkooh, Taleghan, etc.)
  khavarSpecialSuburb: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  nissanSpecialSuburb: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  laborSpecialSuburb: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };

  // Cross-Zone Long Distance Surcharge (e.g. Extreme East to Extreme West inside Tehran)
  crossZoneInternalSurcharge: number;

  // Specialized Labor
  technicianLabor: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  packerLabor: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  layoutLabor: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };
  cleaningLabor: {
    baseHours: number;
    basePrice: number;
    overtimeHourly: number;
  };

  // Packing Consumables
  packingSupplies: {
    packStandard: number; // پک متری
    packWalnut: number; // پک گردویی
    packLarge: number; // پک متری بزرگ
    cartonLaminate5Layer: number; // کارتن ۵ لایه لمینت
    cartonRegalWardrobe: number; // کارتن رگال دار
    cellophaneRoll: number; // سلفون
    bubbleWrapMeter: number; // بابل رول ضربه گیر
    carpetCoverMeter: number; // کاور فرش
    mattressCoverSingle: number; // کاور خوشخواب ۱ نفره
    mattressCoverDouble: number; // کاور خوشخواب ۲ نفره
    adhesiveTape: number; // چسب ۵ سانتی
  };

  // Heavy Items per floor
  heavyItemsFloorRate: {
    refrigeratorLarge: number; // ساید بای ساید و ۲۴ فوت به بالا
    diningGlassLarge: number; // میز شیشه ای ۶ نفره به بالا
    treadmill: number; // تردمیل
    buffetCabinet: number; // بوفه شیشه ای و کمد بزرگ
    sofaBed: number; // مبل تختخواب شو
  };

  // Safes tiers (گاوصندوق بر اساس وزن)
  safeRates: {
    under100KgFloor: number; // زیر ۱۰۰ کیلو
    from100To150KgFloor: number; // ۱۰۰ تا ۱۵۰ کیلو
    from150To250KgFloor: number; // ۱۵۰ تا ۲۵۰ کیلو
    above250KgFloor: number; // بالای ۲۵۰ کیلو
  };

  // Walking distance rules
  walkingDistance: {
    freeMetersThreshold: number; // متراژ پیاده روی مجاز رایگان (مثلا ۲۰ یا ۳۰ متر)
    feePerTotalMeter: number; // در صورت عبور از حد مجاز، کل متراژ ضربدر این مبلغ
  };

  // Insurance
  insurance: {
    perMillions: number; // به ازای هر ۱۰ یا ۵۰ میلیون تومان ارزش بار
    ratePerUnit: number; // مبلغ بیمه
  };

  // Intercity defaults
  intercity: {
    minLaborers: number; // حداقل کارگر (مثلا ۳ نفر: ۱ بارچین + ۲ حمل بار)
    vipMoquetteMarkupPercent: number; // اضافه بهای خاور مسقف VIP موکت شده
  };
}

export const TEHRAN_NEIGHBORHOODS: NeighborhoodItem[] = [
  // --- شمال تهران (داخلی) ---
  { id: 'n_niavaran', name: 'نیاوران', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_tajrish', name: 'تجریش', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_elahiye', name: 'الهیه', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_velenjak', name: 'ولنجک', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_saadatabad', name: 'سعادت‌آباد', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال و شمال‌غرب تهران' },
  { id: 'n_shahrakgharb', name: 'شهرک غرب', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال و شمال‌غرب تهران' },
  { id: 'n_gheytariyeh', name: 'قیطریه', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_zaferaniyeh', name: 'زعفرانیه', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_pasdaran', name: 'پاسداران', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال و شمال‌شرق تهران' },
  { id: 'n_farmaniyeh', name: 'فرمانیه', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_kamraniyeh', name: 'کامرانیه', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_vanak', name: 'ونک', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_darband', name: 'دربند', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_jordan', name: 'جردن (نلسون ماندلا)', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال تهران' },
  { id: 'n_lavizan', name: 'لویزان و ازگل', zoneType: 'INTERNAL', sector: 'NORTH', sectorLabel: 'شمال‌شرق تهران' },

  // --- غرب تهران (داخلی) ---
  { id: 'w_sadeghiyeh', name: 'صادقیه (آریاشهر)', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_poonak', name: 'پونک', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب و شمال‌غرب تهران' },
  { id: 'w_jannatabad', name: 'جنت‌آباد (شمالی، مرکزی، جنوبی)', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_marzdaran', name: 'مرزداران', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_chitgar', name: 'چیتگر و دریاچه چیتگر (منطقه ۲۲)', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_satarkhan', name: 'ستارخان', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_ekbatan', name: 'شهرک اکباتان', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_shahran', name: 'شهران', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'شمال‌غرب تهران' },
  { id: 'w_tarasht', name: 'طرشت', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_olympic', name: 'دهکده المپیک', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'غرب تهران' },
  { id: 'w_tehransar', name: 'تهرانسر', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'جنوب‌غرب تهران (داخلی)' },
  { id: 'w_vardavard', name: 'وردآورد', zoneType: 'INTERNAL', sector: 'WEST', sectorLabel: 'انتهای غرب تهران (داخلی)' },

  // --- شرق تهران (داخلی) ---
  { id: 'e_tehranpars', name: 'تهرانپارس (غربی و شرقی)', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق تهران' },
  { id: 'e_narmak', name: 'نارمک (هفت حوض)', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق تهران' },
  { id: 'e_resalat', name: 'رسالت و سرسبز', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق تهران' },
  { id: 'e_piroozi', name: 'پیروزی و نبرد', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق و جنوب‌شرق تهران' },
  { id: 'e_hakimiyeh', name: 'حکیمیه', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق تهران' },
  { id: 'e_majidieh', name: 'مجیدیه و شمس‌آباد', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق تهران' },
  { id: 'e_seyedkhandan', name: 'سیدخندان و جلفا', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق و مرکز تهران' },
  { id: 'e_heravi', name: 'هروی و ساقدوش', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شمال‌شرق تهران' },
  { id: 'e_hengameh', name: 'هنگام و دلاوران', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق تهران' },
  { id: 'e_tehranno', name: 'تهران‌نو و دماوند', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'شرق تهران' },
  { id: 'e_afsarieh', name: 'افسریه و مسعودیه', zoneType: 'INTERNAL', sector: 'EAST', sectorLabel: 'جنوب‌شرق تهران (داخلی)' },

  // --- مرکز تهران (داخلی) ---
  { id: 'c_enghlab', name: 'میدان انقلاب و کارگر', zoneType: 'INTERNAL', sector: 'CENTER', sectorLabel: 'مرکز تهران' },
  { id: 'c_valiasr', name: 'ولیعصر و فلسطین', zoneType: 'INTERNAL', sector: 'CENTER', sectorLabel: 'مرکز تهران' },
  { id: 'c_yousefabad', name: 'یوسف‌آباد', zoneType: 'INTERNAL', sector: 'CENTER', sectorLabel: 'مرکز تهران' },
  { id: 'c_motahari', name: 'مطهری و بهشتی (عباس‌آباد)', zoneType: 'INTERNAL', sector: 'CENTER', sectorLabel: 'مرکز تهران' },
  { id: 'c_fatemi', name: 'فاطمی و کارگر شمالی', zoneType: 'INTERNAL', sector: 'CENTER', sectorLabel: 'مرکز تهران' },
  { id: 'c_amirabad', name: 'امیرآباد (کارگر شمالی)', zoneType: 'INTERNAL', sector: 'CENTER', sectorLabel: 'مرکز تهران' },
  { id: 'c_haftetir', name: 'میدان هفت‌تیر و بهار', zoneType: 'INTERNAL', sector: 'CENTER', sectorLabel: 'مرکز تهران' },

  // --- جنوب تهران (داخلی) ---
  { id: 's_naziabad', name: 'نازی‌آباد', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب تهران' },
  { id: 's_khaniabad', name: 'خانی‌آباد نو', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب تهران' },
  { id: 's_shush', name: 'میدان شوش و فدائیان اسلام', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب تهران' },
  { id: 's_shahrerey', name: 'شهرری و دولت‌آباد', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب تهران (داخلی)' },
  { id: 's_fallah', name: 'فلاح و ابوذر', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب‌غرب تهران' },
  { id: 's_yakhchiabad', name: 'یاخچی‌آباد و بهمنیار', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب تهران' },
  { id: 's_navvab', name: 'نواب و بریانک', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب و مرکز تهران' },
  { id: 's_yaftabad', name: 'یافت‌آباد و بازار مبل', zoneType: 'INTERNAL', sector: 'SOUTH', sectorLabel: 'جنوب‌غرب تهران' },

  // --- حومه تهران (اسلامشهر، کرج، شهریار، پردیس و...) ---
  { id: 'sub_eslamshahr', name: 'اسلامشهر (واوان، زرافشان، قائمیه)', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه جنوب‌غرب (نیازمند بیعانه)' },
  { id: 'sub_karaj_center', name: 'کرج (مرکزی، جهانشهر، عظیمیه، گوهردشت)', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه غرب (نیازمند بیعانه)' },
  { id: 'sub_karaj_mehrshahr', name: 'کرج (مهرشهر، گلشهر، حصارک)', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه غرب (نیازمند بیعانه)' },
  { id: 'sub_fardis', name: 'فردیس کرج و ملارد', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه غرب (نیازمند بیعانه)' },
  { id: 'sub_shahriar', name: 'شهریار و کهنز', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه غرب (نیازمند بیعانه)' },
  { id: 'sub_andisheh', name: 'شهرک اندیشه (فاز ۱ تا ۶)', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه غرب (نیازمند بیعانه)' },
  { id: 'sub_shahrqods', name: 'شهر قدس (قلعه حسن‌خان)', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه غرب (نیازمند بیعانه)' },
  { id: 'sub_pardis', name: 'شهر جدید پردیس (فازهای ۱ تا ۱۱)', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه شرق (نیازمند بیعانه)' },
  { id: 'sub_robatkarim', name: 'رباط‌کریم و پرند قدیم', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه جنوب‌غرب (نیازمند بیعانه)' },
  { id: 'sub_varamin', name: 'ورامین و قرچک', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه جنوب‌شرق (نیازمند بیعانه)' },
  { id: 'sub_pakdasht', name: 'پاکدشت و شریف‌آباد', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه جنوب‌شرق (نیازمند بیعانه)' },
  { id: 'sub_kahrizak', name: 'کهریزک و باقرشهر', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه جنوب (نیازمند بیعانه)' },
  { id: 'sub_bomehen', name: 'بومهن و رودهن', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه شرق (نیازمند بیعانه)' },
  { id: 'sub_jajrood', name: 'جاجرود و خسروآباد', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه شرق (نیازمند بیعانه)' },
  { id: 'sub_lavasan', name: 'لواسانات و فشم', zoneType: 'SUBURB', sector: 'SUBURB', sectorLabel: 'حومه شمال‌شرق (نیازمند بیعانه)' },

  // --- حومه ویژه و دورتر (هشتگرد، گیلاوند، دماوند، فیروزکوه، طالقان و...) ---
  { id: 'sp_hashtgerd', name: 'هشتگرد (شهر قدیم و شهر جدید مهستان)', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه البرز غربی (تعرفه مسافت ویژه)' },
  { id: 'sp_gilavand', name: 'گیلاوند (دماوند)', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه شرق (تعرفه مسافت ویژه)' },
  { id: 'sp_damavand', name: 'شهر دماوند و آبسرد', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه شرق (تعرفه مسافت ویژه)' },
  { id: 'sp_firoozkooh', name: 'فیروزکوه', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه دور / ییلاقی' },
  { id: 'sp_taleghan', name: 'طالقان', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه کوهستانی' },
  { id: 'sp_nazarabad', name: 'نظرآباد و تنکمان', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه البرز غربی' },
  { id: 'sp_parand_far', name: 'پرند فازهای دور (فاز ۴ تا ۶) و فرودگاه امام', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه جنوب‌غرب' },
  { id: 'sp_abali', name: 'آبعلی و پیست اسکی', zoneType: 'SPECIAL_SUBURB', sector: 'SPECIAL_SUBURB', sectorLabel: 'حومه ویژه کوهستانی شرق' },
];

export const DEFAULT_RESERVATION_RATES: ReservationRates = {
  // داخلی (تهران)
  khavarDomestic: {
    baseHours: 3,
    basePrice: 1800000,
    overtimeHourly: 500000,
  },
  laborKhavarDomestic: {
    baseHours: 3,
    basePrice: 450000,
    overtimeHourly: 150000,
  },
  nissanDomestic: {
    baseHours: 2,
    basePrice: 900000,
    overtimeHourly: 350000,
  },
  laborNissanDomestic: {
    baseHours: 2,
    basePrice: 350000,
    overtimeHourly: 120000,
  },

  // حومه تهران (اسلامشهر، کرج، شهریار، پردیس و...)
  khavarSuburb: {
    baseHours: 3,
    basePrice: 2400000,
    overtimeHourly: 650000,
  },
  nissanSuburb: {
    baseHours: 2,
    basePrice: 1250000,
    overtimeHourly: 450000,
  },
  laborNissanSuburb: {
    baseHours: 2,
    basePrice: 420000,
    overtimeHourly: 150000,
  },

  // حومه ویژه و بخش‌های دورتر (هشتگرد، گیلاوند، دماوند، فیروزکوه، طالقان و...)
  khavarSpecialSuburb: {
    baseHours: 4,
    basePrice: 3200000,
    overtimeHourly: 800000,
  },
  nissanSpecialSuburb: {
    baseHours: 3,
    basePrice: 1850000,
    overtimeHourly: 550000,
  },
  laborSpecialSuburb: {
    baseHours: 3,
    basePrice: 550000,
    overtimeHourly: 180000,
  },

  // اضافه بهای تردد کراس‌زون شرق به غرب یا شمال به جنوب تهران
  crossZoneInternalSurcharge: 150000,

  // نیروهای تخصصی
  technicianLabor: {
    baseHours: 3,
    basePrice: 650000,
    overtimeHourly: 200000,
  },
  packerLabor: {
    baseHours: 3,
    basePrice: 500000,
    overtimeHourly: 160000,
  },
  layoutLabor: {
    baseHours: 3,
    basePrice: 480000,
    overtimeHourly: 150000,
  },
  cleaningLabor: {
    baseHours: 3,
    basePrice: 450000,
    overtimeHourly: 150000,
  },
  packingSupplies: {
    packStandard: 280000,
    packWalnut: 340000,
    packLarge: 420000,
    cartonLaminate5Layer: 85000,
    cartonRegalWardrobe: 220000,
    cellophaneRoll: 180000,
    bubbleWrapMeter: 45000,
    carpetCoverMeter: 35000,
    mattressCoverSingle: 120000,
    mattressCoverDouble: 175000,
    adhesiveTape: 45000,
  },
  heavyItemsFloorRate: {
    refrigeratorLarge: 140000,
    diningGlassLarge: 120000,
    treadmill: 150000,
    buffetCabinet: 110000,
    sofaBed: 100000,
  },
  safeRates: {
    under100KgFloor: 120000,
    from100To150KgFloor: 190000,
    from150To250KgFloor: 280000,
    above250KgFloor: 420000,
  },
  walkingDistance: {
    freeMetersThreshold: 20,
    feePerTotalMeter: 8000,
  },
  insurance: {
    perMillions: 10000000, // 10 Million Tomans
    ratePerUnit: 35000, // 35,000 Tomans per 10M
  },
  intercity: {
    minLaborers: 3,
    vipMoquetteMarkupPercent: 15,
  },
};

/**
 * Ensures complete, safe ReservationRates even if loaded from old localStorage or passed partially/undefined
 */
export function getSafeReservationRates(raw?: any): ReservationRates {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_RESERVATION_RATES;
  }
  return {
    khavarDomestic: { ...DEFAULT_RESERVATION_RATES.khavarDomestic, ...(raw.khavarDomestic || {}) },
    laborKhavarDomestic: { ...DEFAULT_RESERVATION_RATES.laborKhavarDomestic, ...(raw.laborKhavarDomestic || {}) },
    nissanDomestic: { ...DEFAULT_RESERVATION_RATES.nissanDomestic, ...(raw.nissanDomestic || {}) },
    laborNissanDomestic: { ...DEFAULT_RESERVATION_RATES.laborNissanDomestic, ...(raw.laborNissanDomestic || {}) },
    khavarSuburb: { ...DEFAULT_RESERVATION_RATES.khavarSuburb, ...(raw.khavarSuburb || {}) },
    nissanSuburb: { ...DEFAULT_RESERVATION_RATES.nissanSuburb, ...(raw.nissanSuburb || {}) },
    laborNissanSuburb: { ...DEFAULT_RESERVATION_RATES.laborNissanSuburb, ...(raw.laborNissanSuburb || {}) },
    khavarSpecialSuburb: { ...DEFAULT_RESERVATION_RATES.khavarSpecialSuburb, ...(raw.khavarSpecialSuburb || {}) },
    nissanSpecialSuburb: { ...DEFAULT_RESERVATION_RATES.nissanSpecialSuburb, ...(raw.nissanSpecialSuburb || {}) },
    laborSpecialSuburb: { ...DEFAULT_RESERVATION_RATES.laborSpecialSuburb, ...(raw.laborSpecialSuburb || {}) },
    crossZoneInternalSurcharge:
      typeof raw.crossZoneInternalSurcharge === 'number'
        ? raw.crossZoneInternalSurcharge
        : DEFAULT_RESERVATION_RATES.crossZoneInternalSurcharge,
    technicianLabor: { ...DEFAULT_RESERVATION_RATES.technicianLabor, ...(raw.technicianLabor || {}) },
    packerLabor: { ...DEFAULT_RESERVATION_RATES.packerLabor, ...(raw.packerLabor || {}) },
    layoutLabor: { ...DEFAULT_RESERVATION_RATES.layoutLabor, ...(raw.layoutLabor || {}) },
    cleaningLabor: { ...DEFAULT_RESERVATION_RATES.cleaningLabor, ...(raw.cleaningLabor || {}) },
    packingSupplies: { ...DEFAULT_RESERVATION_RATES.packingSupplies, ...(raw.packingSupplies || {}) },
    heavyItemsFloorRate: { ...DEFAULT_RESERVATION_RATES.heavyItemsFloorRate, ...(raw.heavyItemsFloorRate || {}) },
    safeRates: { ...DEFAULT_RESERVATION_RATES.safeRates, ...(raw.safeRates || {}) },
    walkingDistance: { ...DEFAULT_RESERVATION_RATES.walkingDistance, ...(raw.walkingDistance || {}) },
    insurance: { ...DEFAULT_RESERVATION_RATES.insurance, ...(raw.insurance || {}) },
    intercity: { ...DEFAULT_RESERVATION_RATES.intercity, ...(raw.intercity || {}) },
  };
}

export const ORIGINAL_GUIDE_TEXT = `راهنمای جامع و یکپارچه رزرواسیون حامی

بخش اول: مکالمه اولیه و ثبت درخواست مشتری
همیشه تماس مشتری را با جمله «درود، حامی بفرمایید» آغاز کنید. در همان ابتدای مکالمه بپرسید که جابجایی از کجا به کجاست، به ماشین خاور نیاز دارند یا نیسان، و آیا بار آنها بسته‌بندی شده است یا خیر. اگر مشتری درخواست نیسان داشت، حتماً نوع بار را بپرسید و سوال کنید که آیا به کارگر نیاز دارند یا نه. طبق قوانین، اگر مشتری یخچال ساید‌بای‌ساید داشته باشد و نیسان بخواهد، اعزام کارگر الزامی است.

بخش دوم: خدمات نیروی انسانی و تجهیزات بسته‌بندی
تیم نیروی انسانی شامل کارگر حمل بار، کارگر چیدمان (خانم و آقا) و کارگر نظافتی (خانم و آقا) است. برای خدمات بسته‌بندی، جهت اقلام ریز و شکستنی نیروی خانم و برای اقلام درشت نیروی آقا اعزام می‌شود. نیروهای بسته‌بندی تجهیزاتی مانند پک، وکیوم گردویی، ضربه‌گیر، سلفون و چسب را همراه خود می‌آورند. همچنین در صورت نیاز به نیروی فنی (تکنسین)، این نیرو وظیفه دارد اقلامی مانند ماشین لباسشویی، ظرفشویی، سرویس خواب، لوستر، پرده و تختخواب را در مبدا باز کرده و در مقصد ببندد.

بخش سوم: تعرفه‌های ماشین و کارگر (تفکیک مناطق تهران، حومه و حومه ویژه)
تمامی سرویس‌ها بر اساس زمان پایه و هزینه اضافه کار محاسبه می‌شوند:
 • سرویس‌های داخلی تهران (شمال، شرق، غرب، مرکز، جنوب): خاور داخلی برای ساعت پایه بابت یک بارگیری و تخلیه با نرخ مشخص و اضافه ساعت. کارگر خاور بابت ساعت پایه و اضافه ساعت. نیسان داخلی و کارگر نیسان نیز بر اساس ساعت پایه و اضافه کار محاسبه می‌گردد.
 • سرویس‌های حومه تهران (اسلامشهر، کرج، شهریار، پردیس، رباط‌کریم، شهر قدس، ورامین و...): ماشین خاور و نیسان برای حومه بر مبنای ساعت پایه و نرخ اضافه ساعت محاسبه شده و دریافت بیعانه الزامی است.
 • سرویس‌های حومه ویژه و دورتر (هشتگرد، گیلاوند، دماوند، فیروزکوه، طالقان و...): به دلیل بعد مسافت و زمان تردد، ماشین و کارگر دارای ساعت پایه بیشتر و تعرفه حومه ویژه اختصاصی می‌باشند.
 • نیروهای تخصصی: هزینه فنی‌کار، کارگر بسته‌بند، کارگر چیدمان و کارگر نظافت با پایه و اضافه کار محاسبه می‌شود.

بخش چهارم: تعرفه تجهیزات بسته‌بندی
هزینه اقلام مصرفی شامل: پک‌های متری، پک گردویی، کارتن‌های ۵ لایه لمینت، کارتن رگال‌دار، سلفون، بابل (ضربه گیر)، کاور فرش، کاور خوشخواب یک نفره و دو نفره و چسب پهن.

بخش پنجم: اقلام سنگین، پیاده‌روی و بیمه
برای اقلام سنگین مانند یخچال بالای ۲۴ فوت، ساید‌بای‌ساید، شیشه ناهارخوری بزرگ، تردمیل، بوفه و مبل تختخواب‌شو هزینه به ازای هر طبقه اخذ می‌شود. هزینه گاوصندوق بر اساس بازه‌های وزنی محاسبه می‌گردد. پیاده‌روی تا سقف مجاز رایگان بوده و در صورت عبور، کل متراژ ضربدر نرخ مشخص می‌گردد. همچنین بیمه به ازای ارزش بار محاسبه و دریافت می‌شود.

بخش ششم: بارهای شهرستان و قوانین داخلی دفتر
برای سرویس‌های شهرستان دو نوع ماشین خاور مسقف فلزی VIP (موکت شده) و خاور مسقف برزنتی ویژه وجود دارد. اعزام کارگر برای شهرستان حداقل ۳ نفر (شامل ۱ نفر بارچین و ۲ نفر حمل بار) است.
قوانین اکید دفتر:
 ۱. تماس با واحد اعزام برای پرسیدن وضعیت و موقعیت ماشین مشتری اکیداً ممنوع است و شماره راننده باید از طریق سیستم به مشتری داده شود.
 ۲. اگر مبدا یا مقصد بار در حومه یا حومه ویژه باشد، حتماً باید بیعانه دریافت کنید.
 ۳. بارنامه‌های روز بعد باید از روز قبل کنترل و نهایی شوند.
 ۴. تمامی واریزی‌ها و عودتی‌ها باید در دفاتر و سیستم ثبت گردند.`;

