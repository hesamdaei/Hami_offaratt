export type VehicleHandoverItemStatus = 'HEALTHY' | 'DAMAGED' | 'NONE';

export type TruckBodyView = 'FRONT' | 'REAR' | 'RIGHT' | 'LEFT';

export type DamageType =
  | 'SCRATCH'      // خط و خش
  | 'DENT'         // قری و فرورفتگی
  | 'PAINT_CHIP'   // رنگ‌پریدگی یا پوسته شدن
  | 'CRACK'        // ترک‌خوردگی یا شکستگی
  | 'RUST'         // زنگ‌زدگی یا پوسیدگی
  | 'MISSING_PART' // کسری یا فقدان قطعه
  | 'OTHER';       // سایر موارد

export type DamageSeverity = 'MINOR' | 'MODERATE' | 'SEVERE';

export interface BodyDamageMarker {
  id: string;
  view: TruckBodyView;
  x: number; // درصد موقعیت افقی (۰ تا ۱۰۰)
  y: number; // درصد موقعیت عمودی (۰ تا ۱۰۰)
  damageType: DamageType;
  severity: DamageSeverity;
  partName?: string;
  description?: string;
  timestamp: string;
}

export interface VehicleHandoverRecord {
  id: string;
  receiptNumber: string; // شماره قبض
  date: string;          // تاریخ شمسی (مثلاً ۱۴۰۳/۰۸/۰۵)
  time: string;          // ساعت (مثلاً ۰۸:۳۰)
  address: string;       // آدرس پایانه/دفتر
  driverName: string;    // نام راننده
  driverLastName: string;// نام خانوادگی راننده
  driverFatherName: string; // نام پدر
  driverNationalId: string; // کد ملی راننده
  vehicleType: string;   // نوع وسیله (مثلاً خاور ۸۱۳، ایسوزو ۶ تن)
  vehicleCode: string;   // کد وسیله (مثلاً ۱۰۱)
  vehicleColor: string;  // رنگ (مثلاً سفید، زرد)
  vehiclePlate: string;  // پلاک انتظامی (مثلاً ۱۲ ع ۳۴۵ ایران ۶۸)
  checklist: Record<string, VehicleHandoverItemStatus>;
  damages: BodyDamageMarker[];
  affidavitText: string; // متن اقرارنامه و تعهدنامه
  delivererName: string; // نام تحویل‌دهنده
  receiverName: string;  // نام تحویل‌گیرنده
  delivererSignature?: string;
  receiverSignature?: string;
  notes?: string;
  createdAt: string;
}

export interface ChecklistItemDefinition {
  id: string;
  label: string;
  column: 1 | 2 | 3;
  row: number;
}

// ۶۶ قلم کامل دقیقاً منطبق بر فایل پی‌دی‌اف ارسالی
export const HANDOVER_CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
  // --- ستون اول (۲۲ قلم) ---
  { id: 'item_1', label: 'چراغ جلو شاگرد', column: 1, row: 1 },
  { id: 'item_2', label: 'چراغ جلو راننده', column: 1, row: 2 },
  { id: 'item_3', label: 'دور چراغ شاگرد', column: 1, row: 3 },
  { id: 'item_4', label: 'دور چراغ راننده', column: 1, row: 4 },
  { id: 'item_5', label: 'جلو پنجره', column: 1, row: 5 },
  { id: 'item_6', label: 'سینی جلو', column: 1, row: 6 },
  { id: 'item_7', label: 'راهنما جلو راننده', column: 1, row: 7 },
  { id: 'item_8', label: 'راهنما جلو شاگرد', column: 1, row: 8 },
  { id: 'item_9', label: 'گلگیر جلو راننده', column: 1, row: 9 },
  { id: 'item_10', label: 'گلگیر جلو شاگرد', column: 1, row: 10 },
  { id: 'item_11', label: 'آیینه بغل راننده', column: 1, row: 11 },
  { id: 'item_12', label: 'آیینه بغل شاگرد', column: 1, row: 12 },
  { id: 'item_13', label: 'پایه آینه راننده', column: 1, row: 13 },
  { id: 'item_14', label: 'پایه آینه شاگرد', column: 1, row: 14 },
  { id: 'item_15', label: 'پایه رکاب راننده', column: 1, row: 15 },
  { id: 'item_16', label: 'پایه رکاب شاگرد', column: 1, row: 16 },
  { id: 'item_17', label: 'آبگیر درب راننده', column: 1, row: 17 },
  { id: 'item_18', label: 'آبگیر درب شاگرد', column: 1, row: 18 },
  { id: 'item_19', label: 'لوپی جلو راننده', column: 1, row: 19 },
  { id: 'item_20', label: 'لوپی جلو شاگرد', column: 1, row: 20 },
  { id: 'item_21', label: 'آنتن', column: 1, row: 21 },
  { id: 'item_22', label: 'موکت داخل کانتین', column: 1, row: 22 },

  // --- ستون دوم (۲۲ قلم) ---
  { id: 'item_23', label: 'برف پاک کن راننده', column: 2, row: 1 },
  { id: 'item_24', label: 'برف پاک کن شاگرد', column: 2, row: 2 },
  { id: 'item_25', label: 'شیشه جلو', column: 2, row: 3 },
  { id: 'item_26', label: 'فنر جلو راننده', column: 2, row: 4 },
  { id: 'item_27', label: 'فنر جلو شاگرد', column: 2, row: 5 },
  { id: 'item_28', label: 'درب باک', column: 2, row: 6 },
  { id: 'item_29', label: 'شیشه سمت راننده', column: 2, row: 7 },
  { id: 'item_30', label: 'شیشه سمت شاگرد', column: 2, row: 8 },
  { id: 'item_31', label: 'سپر جلو', column: 2, row: 9 },
  { id: 'item_32', label: 'آینه داخل', column: 2, row: 10 },
  { id: 'item_33', label: 'چرخ جلو راننده', column: 2, row: 11 },
  { id: 'item_34', label: 'چرخ جلو شاگرد', column: 2, row: 12 },
  { id: 'item_35', label: 'درب سمت راننده', column: 2, row: 13 },
  { id: 'item_36', label: 'درب سمت شاگرد', column: 2, row: 14 },
  { id: 'item_37', label: 'داشبورد', column: 2, row: 15 },
  { id: 'item_38', label: 'کپسول گاز', column: 2, row: 16 },
  { id: 'item_39', label: 'قفل درب شاگرد', column: 2, row: 17 },
  { id: 'item_40', label: 'قفل درب راننده', column: 2, row: 18 },
  { id: 'item_41', label: 'پلاک انتظامی جلو', column: 2, row: 19 },
  { id: 'item_42', label: 'کولر', column: 2, row: 20 },
  { id: 'item_43', label: 'سقف کابین', column: 2, row: 21 },
  { id: 'item_44', label: 'پتو', column: 2, row: 22 },

  // --- ستون سوم (۲۲ قلم) ---
  { id: 'item_45', label: 'ضبط صوت', column: 3, row: 1 },
  { id: 'item_46', label: 'موتور خودرو', column: 3, row: 2 },
  { id: 'item_47', label: 'گیربکس', column: 3, row: 3 },
  { id: 'item_48', label: 'کاپوت', column: 3, row: 4 },
  { id: 'item_49', label: 'سپر عقب', column: 3, row: 5 },
  { id: 'item_50', label: 'چراغ خطر عقب راننده', column: 3, row: 6 },
  { id: 'item_51', label: 'چراغ خطر عقب شاگرد', column: 3, row: 7 },
  { id: 'item_52', label: 'دستگیره کانتین راست', column: 3, row: 8 },
  { id: 'item_53', label: 'دستگیره کانتین چپ', column: 3, row: 9 },
  { id: 'item_54', label: 'زاپاس', column: 3, row: 10 },
  { id: 'item_55', label: 'درب جعبه', column: 3, row: 11 },
  { id: 'item_56', label: 'تایر عقب راننده (د.ب)', column: 3, row: 12 },
  { id: 'item_57', label: 'تایر عقب شاگرد (د.ب)', column: 3, row: 13 },
  { id: 'item_58', label: 'گل پخش کن راست', column: 3, row: 14 },
  { id: 'item_59', label: 'گل پخش کن چپ', column: 3, row: 15 },
  { id: 'item_60', label: 'زه بغل نیسانی', column: 3, row: 16 },
  { id: 'item_61', label: 'جک', column: 3, row: 17 },
  { id: 'item_62', label: 'آچار چرخ', column: 3, row: 18 },
  { id: 'item_63', label: 'سوییچ', column: 3, row: 19 },
  { id: 'item_64', label: 'فنر عقب راست', column: 3, row: 20 },
  { id: 'item_65', label: 'فنر عقب چپ', column: 3, row: 21 },
  { id: 'item_66', label: 'چادر', column: 3, row: 22 },
];

export const DEFAULT_HANDOVER_AFFIDAVIT =
  'اینجانب طبق مندرجات جدول بالا ماشین فوق را رویت و تحویل گرفتم و از تاریخ تحویل، مسئولیت نگهداری و عواقب جانبی و خلافی خودروی مذکور به عهده اینجانب می‌باشد.';
