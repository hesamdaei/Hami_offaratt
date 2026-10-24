import { DECODED_BACKUP } from './backupDecoder';

export interface VehicleDocuments {
  // تصاویر ۵ جهته خودرو (چهار جهت اصلی + داشبورد و کابین)
  photoFront?: string; // نمای جلو (Front View)
  photoRear?: string; // نمای عقب / پشت (Rear View)
  photoRight?: string; // نمای بغل راست (Right Side View)
  photoLeft?: string; // نمای بغل چپ (Left Side View)
  photoDashboard?: string; // نمای داشبورد و کیلومترشمار (Dashboard & Interior)

  // سازگاری با عکس شاخص و اسناد قانونی
  vehiclePhoto?: string; // عکس اصلی / نمای جلو
  vehicleCard?: string; // کارت خودرو
  greenPaper?: string; // برگ سبز
  thirdPartyInsurance?: string; // بیمه شخص ثالث
  bodyInsurance?: string; // بیمه بدنه
  inspectionCert?: string; // برگه معاینه فنی
}

export interface ServiceSettlementBreakdown {
  startTime: string; // ساعت شروع به کار اعزام (مثلاً ۰۸:۳۰)
  completionTime: string; // ساعت پایان کار (مثلاً ۱۳:۰۰)
  totalDurationHours: number; // کل ساعت کارکرد (مثلاً ۴.۵ ساعت)
  baseHours: number; // ۳ ساعت تعرفه پایه
  overtimeHours: number; // ساعت اضافه کارکرد (مازاد بر ۳ ساعت)

  // تفکیک ماشین (خودرو)
  vehicleBaseFare: number; // مبلغ تعرفه پایه ماشین (۳ ساعت اول)
  vehicleOvertimeRate: number; // نرخ هر ساعت اضافه ماشین
  vehicleOvertimeTotal: number; // جمع اضافه کار ماشین
  vehicleTotalAmount: number; // مجموع سهم ماشین

  // تفکیک کارگر / کارگران
  workerCount: number; // تعداد کارگر اعزامی
  workerBaseRate: number; // تعرفه ۳ ساعت پایه هر کارگر
  workerOvertimeRate: number; // نرخ هر ساعت اضافه هر کارگر
  workerBaseTotal: number; // جمع تعرفه پایه کارگران
  workerOvertimeTotal: number; // جمع اضافه کار کارگران
  workerTotalAmount: number; // مجموع سهم کارگران

  // جمع کل صورت‌حساب مأموریت
  grandTotal: number;
}

export interface VehicleMission {
  destination?: string;
  cargo?: string;
  departureTime?: string;
  departureDate?: string;
  startTime?: string; // ساعت شروع به کار
  startDate?: string; // تاریخ اعزام
  notes?: string;

  // قواعد تعرفه اعزام (۳ ساعت اول تعرفه پایه + ساعت اضافه تفکیکی خودرو و کارگر)
  baseHours?: number; // ۳ ساعت پیش‌فرض
  workerCount?: number; // تعداد کارگر همراه (مثلاً ۲ یا ۳ نفر)
  baseVehicleRate?: number; // تعرفه ۳ ساعت اول ماشین
  hourlyOvertimeVehicle?: number; // نرخ هر ساعت اضافه ماشین
  baseWorkerRate?: number; // تعرفه ۳ ساعت اول هر کارگر
  hourlyOvertimeWorker?: number; // نرخ هر ساعت اضافه هر کارگر
}

export interface VehicleStatusHistoryRecord {
  id: string;
  rowNumber?: number; // ردیف
  date: string; // تاریخ وضعیت (مثلاً ۱۴۰۵/۰۶/۱۲)
  time: string; // ساعت وضعیت (مثلاً ۱۹:۲۰)
  status: 'ACTIVE' | 'IN_MISSION' | 'PARKING' | 'IN_MAINTENANCE' | 'END_OF_WORK' | 'CHANGE_LOCATION';
  statusTitle: string; // عنوان وضعیت (پارکینگ، آماده به کار، پایان کار، در مأموریت، تغییر موقعیت)
  driverName: string;
  driverCode?: string;
  vehicleCode: number;
  plateNumber: string;
  vehicleType: string;
  handoverDate?: string;
  handoverTime?: string;
  queueDate?: string;
  queueTime?: string;
  readyDate?: string;
  readyTime?: string; // زمان آمادگی
  location?: string; // محل توقف / موقعیت
  description?: string; // شرح و توضیحات
  recordedBy?: string;
  settlementBreakdown?: ServiceSettlementBreakdown; // جزئیات تسویه مالی، تعرفه ۳ ساعته و اضافه کار تفکیکی
  serviceDurationHours?: number; // مجموع ساعات کارکرد
  serviceOvertimeHours?: number; // ساعات اضافه کار
}

export interface VehicleItem {
  id: string;
  code: number;
  plateNumber: string;
  vehicleType: 'KHAAVAR' | 'HYUNDAI' | 'ISUZU' | 'NISSAN' | 'VAN' | 'PICKUP' | 'CAR';
  driverName: string;
  driverPhone: string;
  driverCode?: string; // کد پرسنلی راننده
  driverLastName?: string;
  driverFirstName?: string;
  status: 'ACTIVE' | 'IN_MISSION' | 'PARKING' | 'IN_MAINTENANCE' | 'ON_LEAVE' | 'INACTIVE';
  insuranceExpiry: string; // بیمه بدنه
  inspectionExpiry: string; // معاینه فنی
  thirdPartyExpiry: string; // بیمه شخص ثالث
  bodyInsExpiry?: string; // تاریخ انقضای بیمه بدنه
  model?: string; // مدل یا تیپ خودرو
  documents?: VehicleDocuments;
  currentMission?: VehicleMission;
  maintenanceNotes?: string;

  // مشخصات شناسنامه فنی خودرو (مطابق سیستم صداقت بار ۱۴۰۵)
  modelYear?: string | number; // سال ساخت
  capacityTons?: string | number; // ظرفیت بارگیری / تناژ
  chassisNumber?: string; // شماره شاسی
  engineNumber?: string; // شماره موتور
  vin?: string; // VIN
  documentNumber?: string; // شماره سند
  documentDate?: string; // تاریخ ثبت سند
  axleCount?: number; // تعداد محور
  hasViolation?: boolean; // دارای تخلف
  previousPlate?: string; // شماره پلاک قبلی
  plateType?: string; // نوع پلاک (عمومی، شخصی، ...)
  chassisType?: string; // نوع شاسی (کامیونت، تریلی، وانت)
  color?: string; // رنگ بدنه (قرمز - روغنی، سفید روغنی...)
  inspectionNumber?: string; // شماره معاینه
  insurancePolicyNumber?: string; // شماره بیمه نامه
  insuranceCompany?: string; // شرکت بیمه‌گر (آسیا، ایران، البرز...)
  location?: string; // محل توقف (پارکینگ، پایانه غرب، انبار مرکزی)
  group?: string; // گروه ناوگان
  isActive?: boolean; // فعال / غیرفعال
  notes?: string; // توضیحات

  // زمان‌ها و آخرین وضعیت‌های دیسپچ و پایان کار
  lastStatusDate?: string; // تاریخ آخرین وضعیت
  lastStatusTime?: string; // ساعت آخرین وضعیت
  handoverDate?: string; // تاریخ واگذاری
  handoverTime?: string; // زمان / ساعت واگذاری
  readyDate?: string; // تاریخ آمادگی
  readyTime?: string; // زمان آمادگی (ساعت آمادگی برای کار جدید)

  // جریان کاری تحویل صبحگاهی و نوبت‌دهی (Morning Handover & Queueing Workflow)
  handoverStatus?: 'PENDING_DELIVERY' | 'DELIVERED' | 'RETURNED'; // وضعیت تحویل سوییچ به راننده
  queueStatus?: 'NOT_QUEUED' | 'IN_QUEUE' | 'SERVICED'; // وضعیت در نوبت بودن
  queueNumber?: number; // شماره نوبت نوبت‌دهی بارگیری
  queueDate?: string; // تاریخ نوبت
  queueTime?: string; // ساعت ورود به صف نوبت

  // پایش سرویس‌های دوره‌ای و تعویض روغن ناوگان
  currentMileage?: number; // کیلومترشمار فعلی خودرو
  lastChangeMileage?: number; // کیلومتر ثبت شده در زمان آخرین تعویض روغن
  lastChangeDate?: string; // تاریخ آخرین تعویض روغن
  tripsSinceChange?: number; // تعداد سفرهای انجام شده پس از تعویض روغن
  lastOilBrand?: string; // برند و نوع روغن موتور
  oilFilterChanged?: boolean; // تعویض فیلتر روغن
  airFilterChanged?: boolean; // تعویض فیلتر هوا
  fuelFilterChanged?: boolean; // تعویض فیلتر سوخت / گازوئیل
  serviceNotes?: string; // یادداشت سرویس
  serviceHistory?: any[]; // سوابق تاریخچه سرویس

  // سوابق تغییر وضعیت و مأموریت‌ها (تاریخچه ناوگان)
  history?: VehicleStatusHistoryRecord[];
}

export type HandoverStatus = 'PENDING_DELIVERY' | 'DELIVERED' | 'RETURNED';
export type QueueStatus = 'NOT_QUEUED' | 'IN_QUEUE' | 'SERVICED';

export interface VehicleEligibilityResult {
  canReceiveService: boolean;
  eligible: boolean;
  reason?: string;
  statusLabel: string;
  statusBadgeColor: string;
}

/**
 * اعتبارسنجی قانون محوری دیسپچ:
 * ۱. ماشینی که راننده ندارد امکان اختصاص سرویس ندارد.
 * ۲. راننده هر صبح باید ماشین را تحویل بگیرد (تحویل صبحگاهی).
 * ۳. با در نوبت شدن، امکان دریافت بارنامه دارد.
 */
export function checkVehicleServiceEligibility(
  vehicle: VehicleItem | undefined
): VehicleEligibilityResult {
  if (!vehicle) {
    return {
      canReceiveService: false,
      eligible: false,
      reason: 'هیچ خودرویی انتخاب نشده است.',
      statusLabel: 'عدم انتخاب',
      statusBadgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  }

  // ۱. بررسی قطعی داشتن راننده
  const hasDriver =
    !!vehicle.driverName &&
    vehicle.driverName.trim() !== '' &&
    vehicle.driverName !== 'بدون راننده';

  if (!hasDriver) {
    return {
      canReceiveService: false,
      eligible: false,
      reason: 'ماشینی که راننده ندارد امکان اختصاص سرویس ندارد.',
      statusLabel: '⛔ فاقد راننده (غیرمجاز برای سرویس)',
      statusBadgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };
  }

  // ۲. بررسی عدم توقف در تعمیرگاه
  if (vehicle.status === 'IN_MAINTENANCE') {
    return {
      canReceiveService: false,
      eligible: false,
      reason: 'خودرو به دلیل نقص فنی در تعمیرگاه است و بارگیری مسدود است.',
      statusLabel: '🔧 در تعمیرگاه',
      statusBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  // ۳. بررسی تحویل صبحگاهی خودرو به راننده
  const isDelivered = vehicle.handoverStatus === 'DELIVERED';
  if (!isDelivered && vehicle.status !== 'IN_MISSION') {
    return {
      canReceiveService: false,
      eligible: false,
      reason: 'راننده هنوز خودرو و سوییچ را در شیفت صبح تحویل نگرفته است.',
      statusLabel: '⏳ در انتظار تحویل خودرو',
      statusBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  // ۴. بررسی در نوبت بودن راننده برای دریافت بارنامه
  const inQueue =
    vehicle.queueStatus === 'IN_QUEUE' ||
    vehicle.queueStatus === 'SERVICED' ||
    vehicle.status === 'IN_MISSION';

  if (!inQueue) {
    return {
      canReceiveService: false,
      eligible: false,
      reason: 'راننده باید ابتدا وارد صف نوبت بارنامه شود (در نوبت شدن).',
      statusLabel: '📋 خارج از نوبت بارنامه',
      statusBadgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    };
  }

  return {
    canReceiveService: true,
    eligible: true,
    statusLabel: vehicle.queueNumber
      ? `✅ در نوبت (نوبت ${vehicle.queueNumber})`
      : '✅ مجاز برای بارنامه',
    statusBadgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
}

export const VEHICLE_TYPE_NAMES: Record<string, string> = {
  KHAAVAR: 'خاور',
  HYUNDAI: 'هیوندا',
  ISUZU: 'ایسوزو ۵.۲',
  NISSAN: 'نیسان',
  VAN: 'ون',
  PICKUP: 'وانت',
  CAR: 'سواری',
};

// Seed dataset extracted from seed.js
export const RAW_SEED_VEHICLES: VehicleItem[] = [
  { id: 'v-1', code: 1, plateNumber: '۶۶-۵۳۳ع۲۵', vehicleType: 'KHAAVAR', driverName: 'رحیم بدرلو', driverPhone: '09144820718', status: 'ACTIVE', insuranceExpiry: '1406/05/28', inspectionExpiry: '1405/10/15', thirdPartyExpiry: '1406/05/28', bodyInsExpiry: '' },
  { id: 'v-2', code: 2, plateNumber: '۵۵-۹۳۶ع۵۳', vehicleType: 'KHAAVAR', driverName: 'بهروز حیدری', driverPhone: '09166971552', status: 'ACTIVE', insuranceExpiry: '1405/08/28', inspectionExpiry: '1405/08/10', thirdPartyExpiry: '1405/08/28', bodyInsExpiry: '' },
  { id: 'v-4', code: 4, plateNumber: '۶۶-۴۱۶ع۵۶', vehicleType: 'KHAAVAR', driverName: 'سید اقبال هدیه', driverPhone: '09192436320', status: 'ACTIVE', insuranceExpiry: '1406/02/02', inspectionExpiry: '1405/10/11', thirdPartyExpiry: '1406/02/02', bodyInsExpiry: '' },
  { id: 'v-5', code: 5, plateNumber: '۵۱-۷۹۱ع۴۵', vehicleType: 'KHAAVAR', driverName: 'نادر صابون پز', driverPhone: '09361779261', status: 'ACTIVE', insuranceExpiry: '1405/08/13', inspectionExpiry: '1405/08/06', thirdPartyExpiry: '1405/08/13', bodyInsExpiry: '' },
  { id: 'v-6', code: 6, plateNumber: '۴۴-۱۶۵ع۱۱', vehicleType: 'KHAAVAR', driverName: 'بدون راننده', driverPhone: '', status: 'PARKING', insuranceExpiry: '1406/03/13', inspectionExpiry: '1405/08/04', thirdPartyExpiry: '1406/03/13', bodyInsExpiry: '' },
  { id: 'v-7', code: 7, plateNumber: '۵۱-۷۶۵ع۵۵', vehicleType: 'KHAAVAR', driverName: 'محسن مقدسی / علی کشاورز', driverPhone: '09352234010 / 09305386757', status: 'ACTIVE', insuranceExpiry: '1406/05/29', inspectionExpiry: '1405/10/04', thirdPartyExpiry: '1406/05/29', bodyInsExpiry: '' },
  { id: 'v-8', code: 8, plateNumber: '۶۶-۱۸۹ع۶۲', vehicleType: 'KHAAVAR', driverName: 'مهدی رضائی ده', driverPhone: '09056379934', status: 'ACTIVE', insuranceExpiry: '1405/10/16', inspectionExpiry: '1405/09/30', thirdPartyExpiry: '1405/10/16', bodyInsExpiry: '' },
  { id: 'v-9', code: 9, plateNumber: '۶۶-۹۸۱ع۳۵', vehicleType: 'KHAAVAR', driverName: 'امین تندیس', driverPhone: '09168440549', status: 'ACTIVE', insuranceExpiry: '1406/03/20', inspectionExpiry: '1405/08/06', thirdPartyExpiry: '1406/03/20', bodyInsExpiry: '' },
  { id: 'v-10', code: 10, plateNumber: '۴۴-۹۶۹ع۶۵', vehicleType: 'KHAAVAR', driverName: 'بدون راننده', driverPhone: '', status: 'PARKING', insuranceExpiry: '1406/02/05', inspectionExpiry: '1405/08/20', thirdPartyExpiry: '1406/02/05', bodyInsExpiry: '' },
  { id: 'v-11', code: 11, plateNumber: '۶۶-۵۷۲ع۳۲', vehicleType: 'KHAAVAR', driverName: 'حمید خاکی', driverPhone: '09909486156', status: 'ACTIVE', insuranceExpiry: '1405/09/30', inspectionExpiry: '1405/09/29', thirdPartyExpiry: '1405/09/30', bodyInsExpiry: '' },
  { id: 'v-12', code: 12, plateNumber: '۵۵-۹۳۶ع۱۳', vehicleType: 'KHAAVAR', driverName: 'سید مجتبی امجدیان', driverPhone: '09193281288', status: 'ACTIVE', insuranceExpiry: '1405/05/15', inspectionExpiry: '1405/09/07', thirdPartyExpiry: '1405/09/07' },
  { id: 'v-13', code: 13, plateNumber: '۵۵-۳۷۶ع۲۸', vehicleType: 'KHAAVAR', driverName: 'پوریا ویس پور', driverPhone: '09941088027', status: 'ACTIVE', insuranceExpiry: '1405/06/23', inspectionExpiry: '1405/04/28', thirdPartyExpiry: '1405/04/28' },
  { id: 'v-14', code: 14, plateNumber: '۵۵-۳۴۲ع۸۶', vehicleType: 'KHAAVAR', driverName: 'امین تندیس', driverPhone: '09168440549', status: 'ACTIVE', insuranceExpiry: '1405/05/08', inspectionExpiry: '1405/11/29', thirdPartyExpiry: '1405/11/29' },
  { id: 'v-15', code: 15, plateNumber: '۵۵-۷۵۲ع۹۱', vehicleType: 'KHAAVAR', driverName: 'مهدی نعیمی خواه', driverPhone: '09179162410', status: 'ACTIVE', insuranceExpiry: '1405/04/17', inspectionExpiry: '1405/09/08', thirdPartyExpiry: '1405/09/08' },
  { id: 'v-17', code: 17, plateNumber: '۶۶-۵۸۷ع۴۱', vehicleType: 'KHAAVAR', driverName: 'حجت یوسفی', driverPhone: '09169019438', status: 'ACTIVE', insuranceExpiry: '1405/07/06', inspectionExpiry: '1406/03/08', thirdPartyExpiry: '1406/03/08' },
  { id: 'v-18', code: 18, plateNumber: '۶۶-۳۳۱ع۴۳', vehicleType: 'KHAAVAR', driverName: 'سلام حسینی', driverPhone: '09375936250', status: 'IN_MAINTENANCE', insuranceExpiry: '1405/05/13', inspectionExpiry: '1405/12/01', thirdPartyExpiry: '1405/12/01' },
  
  { id: 'v-50', code: 50, plateNumber: '۵۵-۵۶۵ع۸۶', vehicleType: 'HYUNDAI', driverName: 'سید مجتبی', driverPhone: '09193281288', status: 'ACTIVE', insuranceExpiry: '1406/05/23', inspectionExpiry: '1405/10/18', thirdPartyExpiry: '1406/05/23', bodyInsExpiry: '1406/02/04' },
  { id: 'v-51', code: 51, plateNumber: '۶۶-۹۵۹ع۲۲', vehicleType: 'HYUNDAI', driverName: 'مجتبی رضایی', driverPhone: '09191817665', status: 'ACTIVE', insuranceExpiry: '1405/09/19', inspectionExpiry: '1405/09/09', thirdPartyExpiry: '1405/09/19', bodyInsExpiry: '1406/02/22' },
  { id: 'v-52', code: 52, plateNumber: '۶۶-۴۴۸ع۱۷', vehicleType: 'HYUNDAI', driverName: 'بدون راننده', driverPhone: '', status: 'PARKING', insuranceExpiry: '1406/02/22', inspectionExpiry: '1405/04/22', thirdPartyExpiry: '1405/11/04' },
  { id: 'v-53', code: 53, plateNumber: '۵۱-۱۸۴ع۶۷', vehicleType: 'HYUNDAI', driverName: 'شهرام فرهادنژاد', driverPhone: '09338211138', status: 'ACTIVE', insuranceExpiry: '1406/02/30', inspectionExpiry: '1405/06/09', thirdPartyExpiry: '1405/12/06' },
  { id: 'v-54', code: 54, plateNumber: '۵۵-۱۸۷ع۸۳', vehicleType: 'HYUNDAI', driverName: 'نادر حسابی نامقی', driverPhone: '09930978534', status: 'IN_MISSION', insuranceExpiry: '1405/08/11', inspectionExpiry: '1405/05/19', thirdPartyExpiry: '1405/11/14' },
  { id: 'v-55', code: 55, plateNumber: '۵۵-۹۳۸ع۷۸', vehicleType: 'HYUNDAI', driverName: 'عباس بیراوند', driverPhone: '09385998380', status: 'ACTIVE', insuranceExpiry: '1405/08/11', inspectionExpiry: '1405/07/06', thirdPartyExpiry: '1405/04/24' },
  { id: 'v-56', code: 56, plateNumber: '۵۵-۷۱۲ع۹۱', vehicleType: 'HYUNDAI', driverName: 'رضا نیک نام', driverPhone: '09308934483', status: 'ACTIVE', insuranceExpiry: '1406/02/22', inspectionExpiry: '1405/04/11', thirdPartyExpiry: '1406/01/25' },
  { id: 'v-57', code: 57, plateNumber: '۵۵-۷۸۸ع۶۴', vehicleType: 'HYUNDAI', driverName: 'علیرضا پور ابراهیم', driverPhone: '09192021821', status: 'ACTIVE', insuranceExpiry: '1406/03/17', inspectionExpiry: '1405/07/02', thirdPartyExpiry: '1405/07/18' },
  { id: 'v-58', code: 58, plateNumber: '۵۵-۷۵۶ع۹۱', vehicleType: 'HYUNDAI', driverName: 'فریبرز جعفری', driverPhone: '09932488984', status: 'ACTIVE', insuranceExpiry: '1405/12/01', inspectionExpiry: '1405/05/07', thirdPartyExpiry: '1405/10/29' },
  { id: 'v-59', code: 59, plateNumber: '۵۵-۵۳۶ع۹۶', vehicleType: 'HYUNDAI', driverName: 'محمد صدیق عباسی', driverPhone: '09184500745', status: 'ACTIVE', insuranceExpiry: '1406/03/03', inspectionExpiry: '1405/04/16', thirdPartyExpiry: '1406/02/29' },
  { id: 'v-60', code: 60, plateNumber: '۵۵-۴۸۲ع۹۶', vehicleType: 'HYUNDAI', driverName: 'حسین شهنازی', driverPhone: '09378423850', status: 'ACTIVE', insuranceExpiry: '1405/04/12', inspectionExpiry: '1405/05/26', thirdPartyExpiry: '1405/07/06' },
  { id: 'v-61', code: 61, plateNumber: '۵۵-۳۳۷ع۸۸', vehicleType: 'HYUNDAI', driverName: 'یوسف نامی زاده', driverPhone: '09017111820', status: 'ACTIVE', insuranceExpiry: '1405/06/02', inspectionExpiry: '1405/04/18', thirdPartyExpiry: '1405/04/12' },
  { id: 'v-62', code: 62, plateNumber: '۵۵-۶۸۳ع۸۹', vehicleType: 'HYUNDAI', driverName: 'مجتبی علی آبادی', driverPhone: '09133718309', status: 'ACTIVE', insuranceExpiry: '1405/06/11', inspectionExpiry: '1405/04/15', thirdPartyExpiry: '1405/05/15' },
  { id: 'v-63', code: 63, plateNumber: '۵۱-۴۱۴ع۴۵', vehicleType: 'HYUNDAI', driverName: 'حسین سیاح', driverPhone: '09915303308', status: 'ACTIVE', insuranceExpiry: '1406/03/19', inspectionExpiry: '1405/04/26', thirdPartyExpiry: '1406/03/27' },
  { id: 'v-64', code: 64, plateNumber: '۴۴-۸۳۵ع۸۸', vehicleType: 'HYUNDAI', driverName: 'جمال سیاحی', driverPhone: '09370182658', status: 'IN_MISSION', insuranceExpiry: '1406/03/08', inspectionExpiry: '1405/05/08', thirdPartyExpiry: '1405/09/24' },
  { id: 'v-65', code: 65, plateNumber: '۵۵-۳۱۳ع۲۳', vehicleType: 'HYUNDAI', driverName: 'محمد مهدی قربانی', driverPhone: '09125408190', status: 'ACTIVE', insuranceExpiry: '1405/07/21', inspectionExpiry: '1405/06/23', thirdPartyExpiry: '1405/10/06' },
  { id: 'v-66', code: 66, plateNumber: '۵۱-۲۸۶ع۷۲', vehicleType: 'HYUNDAI', driverName: 'علی گنج پرور', driverPhone: '09144331676', status: 'ACTIVE', insuranceExpiry: '1406/03/07', inspectionExpiry: '1405/06/23', thirdPartyExpiry: '1406/01/17' },
  { id: 'v-67', code: 67, plateNumber: '۵۵-۵۳۲ع۷۶', vehicleType: 'HYUNDAI', driverName: 'منوچهر سلیمی پور', driverPhone: '09232491066', status: 'ACTIVE', insuranceExpiry: '1405/05/04', inspectionExpiry: '1405/04/17', thirdPartyExpiry: '1405/04/21' },
  { id: 'v-68', code: 68, plateNumber: '۵۵-۶۸۱ع۷۶', vehicleType: 'HYUNDAI', driverName: 'امیر حسین مصلحی', driverPhone: '09190830052', status: 'ACTIVE', insuranceExpiry: '1405/05/02', inspectionExpiry: '1405/04/23', thirdPartyExpiry: '1405/12/19' },
  { id: 'v-69', code: 69, plateNumber: '۵۵-۷۳۴ع۷۶', vehicleType: 'HYUNDAI', driverName: 'رضا ملک پور', driverPhone: '09101311132', status: 'ACTIVE', insuranceExpiry: '1405/07/03', inspectionExpiry: '1405/05/07', thirdPartyExpiry: '1405/10/18' },
  { id: 'v-70', code: 70, plateNumber: '۵۵-۴۶۵ع۸۴', vehicleType: 'HYUNDAI', driverName: 'مجید همت', driverPhone: '09331121934', status: 'ACTIVE', insuranceExpiry: '1405/12/01', inspectionExpiry: '1405/05/07', thirdPartyExpiry: '1405/11/29' },
  { id: 'v-71', code: 71, plateNumber: '۶۶-۷۳۴ع۳۵', vehicleType: 'HYUNDAI', driverName: 'میلاد الله دادیان', driverPhone: '09138728047', status: 'ACTIVE', insuranceExpiry: '1405/07/05', inspectionExpiry: '1405/06/23', thirdPartyExpiry: '1405/08/16' },
  { id: 'v-73', code: 73, plateNumber: '۶۶-۴۱۵ع۵۳', vehicleType: 'HYUNDAI', driverName: 'یزدان حبیبی', driverPhone: '09196672919', status: 'ACTIVE', insuranceExpiry: '1405/05/07', inspectionExpiry: '1405/07/06', thirdPartyExpiry: '1405/12/17' },
  { id: 'v-74', code: 74, plateNumber: '۶۶-۴۵۱ع۵۵', vehicleType: 'HYUNDAI', driverName: 'مسعود مسعودی فر', driverPhone: '09167703074', status: 'ACTIVE', insuranceExpiry: '1405/07/15', inspectionExpiry: '1405/05/01', thirdPartyExpiry: '1405/10/25' },

  { id: 'v-100', code: 100, plateNumber: '۵۵-۱۲۷ع۸۸', vehicleType: 'ISUZU', driverName: 'مهدی عزیز زاده', driverPhone: '09351063188', status: 'ACTIVE', insuranceExpiry: '1406/03/02', inspectionExpiry: '1405/04/26', thirdPartyExpiry: '1406/02/28' },
  { id: 'v-101', code: 101, plateNumber: '۶۶-۴۴۱ع۱۸', vehicleType: 'ISUZU', driverName: 'سید محمد علی قیصریان', driverPhone: '09197215199', status: 'ACTIVE', insuranceExpiry: '1405/05/12', inspectionExpiry: '1405/06/26', thirdPartyExpiry: '1405/09/29' },
  { id: 'v-102', code: 102, plateNumber: '۵۱-۵۲۳ع۶۷', vehicleType: 'ISUZU', driverName: 'مصطفی شیرزاد', driverPhone: '09385014711', status: 'ACTIVE', insuranceExpiry: '1406/03/09', inspectionExpiry: '1405/05/16', thirdPartyExpiry: '1406/01/23' },
  { id: 'v-103', code: 103, plateNumber: '۵۱-۱۸۱ع۶۷', vehicleType: 'ISUZU', driverName: 'مهرداد کمالی', driverPhone: '09358859221', status: 'ACTIVE', insuranceExpiry: '1406/03/09', inspectionExpiry: '1405/04/19', thirdPartyExpiry: '1406/03/03' },
  { id: 'v-104', code: 104, plateNumber: '۵۵-۷۹۴ع۶۴', vehicleType: 'ISUZU', driverName: 'شهرام فرهادنژاد', driverPhone: '09338211138', status: 'ACTIVE', insuranceExpiry: '1405/06/19', inspectionExpiry: '1405/06/11', thirdPartyExpiry: '1405/09/14' },
  { id: 'v-105', code: 105, plateNumber: '۵۵-۱۲۲ع۵۴', vehicleType: 'ISUZU', driverName: 'ابراهیم ابراهیمی', driverPhone: '09145163854', status: 'ACTIVE', insuranceExpiry: '1405/09/12', inspectionExpiry: '1405/04/26', thirdPartyExpiry: '1405/04/16' },
  { id: 'v-107', code: 107, plateNumber: '۵۵-۴۴۸ع۶۲', vehicleType: 'ISUZU', driverName: 'مرتضی مظفری زاد', driverPhone: '09190054760', status: 'ACTIVE', insuranceExpiry: '1406/03/07', inspectionExpiry: '1405/04/15', thirdPartyExpiry: '1405/12/01' },

  { id: 'v-150', code: 150, plateNumber: '۶۰-۷۳۷د۶۲', vehicleType: 'NISSAN', driverName: 'پیمان سلیمی مقدم', driverPhone: '09193160198', status: 'ACTIVE', insuranceExpiry: '1405/09/17', inspectionExpiry: '1406/01/24', thirdPartyExpiry: '1405/09/17', bodyInsExpiry: '1406/05/24' },
  { id: 'v-151', code: 151, plateNumber: '۲۰-۴۷۵ل۳۲', vehicleType: 'NISSAN', driverName: 'جعفر خزائی', driverPhone: '09926222153', status: 'ACTIVE', insuranceExpiry: '1405/07/01', inspectionExpiry: '1405/10/17', thirdPartyExpiry: '1406/01/20' },
  { id: 'v-152', code: 152, plateNumber: '۷۷-۳۸۴ی۹۴', vehicleType: 'NISSAN', driverName: 'سعید خادمی', driverPhone: '09128301096', status: 'ACTIVE', insuranceExpiry: '1406/03/02', inspectionExpiry: '1405/11/06', thirdPartyExpiry: '1406/03/02', bodyInsExpiry: '1406/03/09' },
  { id: 'v-153', code: 153, plateNumber: '۱۰-۴۱۱ی۴۸', vehicleType: 'NISSAN', driverName: 'مهدی ترکمانی', driverPhone: '09355730544', status: 'ACTIVE', insuranceExpiry: '1406/03/06', inspectionExpiry: '1405/10/16', thirdPartyExpiry: '1406/03/06', bodyInsExpiry: '1406/03/04' },
  { id: 'v-202', code: 202, plateNumber: '۵۰-۱۲۴ن۸۵', vehicleType: 'CAR', driverName: 'محمد مرادی', driverPhone: '09966565988', status: 'ACTIVE', insuranceExpiry: '1406/07/14', inspectionExpiry: '1405/07/19', thirdPartyExpiry: '1406/07/14', bodyInsExpiry: '' },
  { id: 'v-250', code: 250, plateNumber: '۱۵۸-۵۲۶۱۵', vehicleType: 'CAR', driverName: 'محمد مرادی', driverPhone: '09966565988', status: 'ACTIVE', insuranceExpiry: '1406/07/16', inspectionExpiry: '1408/01/01', thirdPartyExpiry: '1406/07/16', bodyInsExpiry: '' },
  { id: 'v-502', code: 502, plateNumber: '۶۶-۹۹۳س۷۲', vehicleType: 'CAR', driverName: 'فرزاد رضایی', driverPhone: '', status: 'ACTIVE', insuranceExpiry: '1406/01/25', inspectionExpiry: '1406/01/26', thirdPartyExpiry: '1406/01/25', bodyInsExpiry: '1405/11/01' },
];

export const LEGACY_SEED_VEHICLES: VehicleItem[] = RAW_SEED_VEHICLES.map((v, index) => {
  const isNoDriver = !v.driverName || v.driverName === 'بدون راننده';
  const isMaintenance = v.status === 'IN_MAINTENANCE';
  const isMission = v.status === 'IN_MISSION';

  // Specific data for vehicle code 1 directly matching the Sedaqat Bar legacy photo
  const isCode1 = v.code === 1;

  const modelYear = isCode1 ? 1375 : 1380 + (index % 15);
  const chassisNumber = isCode1 ? '37405114419524' : `37405${10000000 + v.code * 8421}`;
  const engineNumber = isCode1 ? 'OM314-984210' : `ENG-${v.code * 314 + 10200}`;
  const vin = isCode1 ? 'irgc759k6p5419524' : `IRGC${v.code}K6P${5419000 + index}`;
  const chassisType = v.vehicleType === 'NISSAN' ? 'وانت نیسان' : v.vehicleType === 'KHAAVAR' ? 'کامیونت' : 'کامیونت مسقف';
  const color = isCode1 ? 'قرمز - روغنی' : index % 3 === 0 ? 'سفید روغنی' : index % 3 === 1 ? 'زرد قناری' : 'آبی کاربنی';
  const insurancePolicyNumber = isCode1 ? '9375576' : `${8100000 + v.code * 123}`;
  const inspectionNumber = isCode1 ? '4105822' : `${6300000 + v.code * 456}`;
  const documentNumber = isCode1 ? 'DOC-94218' : `DOC-${50000 + v.code}`;
  const documentDate = isCode1 ? '1392/07/16' : '1395/04/10';
  const driverCode = isCode1 ? '3588' : isNoDriver ? '' : `${3500 + v.code}`;
  const location = isMaintenance ? 'تعمیرگاه مرکزی' : isMission ? 'در مسیر مقصد' : 'پارکینگ مرکزی شرکت';
  const group = 'گروه لجستیک صداقت بار';

  const lastStatusDate = '1405/06/12';
  const lastStatusTime = isCode1 ? '19:20' : `1${(index % 8) + 1}:${String(index * 7 % 60).padStart(2, '0')}`;
  const handoverDate = '1405/06/10';
  const handoverTime = isCode1 ? '10:50' : '05:45';
  const readyDate = '1405/06/12';
  const readyTime = isCode1 ? '19:30' : '18:15';

  // Oil change and mileage initialization for fleet management
  const baseMil = v.vehicleType === 'NISSAN' ? 95000 : v.vehicleType === 'KHAAVAR' ? 240000 : 130000;
  const currentMileage = baseMil + ((v.code * 1350) % 45000);
  const drivenSince = 1200 + ((v.code * 620) % 4800);
  const lastChangeMileage = currentMileage - drivenSince;
  const lastChangeDate = '1405/05/' + String((v.code % 25) + 1).padStart(2, '0');
  const tripsSinceChange = Math.max(1, Math.floor(drivenSince / 80));
  const oilBrands = ['بهران دیزل سوپر ۱۵W۴۰', 'اسپیدی توربو پلاس', 'ایرانول کارو', 'توتال روبیا TIR', 'کاسترول GTX'];
  const lastOilBrand = oilBrands[v.code % oilBrands.length];

  // Initial history records replicating the Sedaqat Bar legacy table in photo
  const initialHistory: VehicleStatusHistoryRecord[] = [
    {
      id: `hist-${v.code}-1`,
      rowNumber: 1,
      date: '1405/06/12',
      time: lastStatusTime,
      status: v.status as any,
      statusTitle:
        v.status === 'ACTIVE'
          ? 'آماده به کار'
          : v.status === 'IN_MISSION'
          ? 'در حال مأموریت'
          : v.status === 'PARKING'
          ? 'پارکینگ'
          : 'تعمیرگاه',
      driverName: v.driverName,
      driverCode,
      vehicleCode: v.code,
      plateNumber: v.plateNumber,
      vehicleType: VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType,
      handoverDate,
      handoverTime,
      queueDate: '1405/06/12',
      queueTime: '16:37',
      readyDate,
      readyTime,
      location,
      description: isMission
        ? 'اعزام به مقصد مشتری و در حال حمل بار'
        : isMaintenance
        ? 'پذیرش در تعمیرگاه جهت سرویس'
        : 'پایان سرویس قبلی و آماده دریافت بارنامه جدید',
      recordedBy: 'دیسپچر شیفت',
    },
    {
      id: `hist-${v.code}-2`,
      rowNumber: 2,
      date: '1405/06/10',
      time: '10:50',
      status: 'CHANGE_LOCATION',
      statusTitle: 'تغییر موقعیت',
      driverName: v.driverName,
      driverCode,
      vehicleCode: v.code,
      plateNumber: v.plateNumber,
      vehicleType: VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType,
      handoverDate: '1405/06/10',
      handoverTime: '10:50',
      queueDate: '1405/06/10',
      queueTime: '11:15',
      readyDate: '1405/06/10',
      readyTime: '11:00',
      location: 'پایانه غرب',
      description: 'واگذاری خودرو به راننده و حرکت به پایانه غرب',
      recordedBy: 'سرپرست ناوگان',
    },
  ];

  if (isNoDriver || isMaintenance) {
    return {
      ...v,
      modelYear,
      chassisNumber,
      engineNumber,
      vin,
      chassisType,
      color,
      insurancePolicyNumber,
      inspectionNumber,
      documentNumber,
      documentDate,
      driverCode,
      location,
      group,
      axleCount: 2,
      hasViolation: false,
      plateType: 'عمومی',
      isActive: true,
      lastStatusDate,
      lastStatusTime,
      handoverDate: '',
      handoverTime: '',
      readyDate: '',
      readyTime: '',
      handoverStatus: 'PENDING_DELIVERY' as const,
      queueStatus: 'NOT_QUEUED' as const,
      queueNumber: undefined,
      currentMileage,
      lastChangeMileage,
      lastChangeDate,
      tripsSinceChange,
      lastOilBrand,
      oilFilterChanged: true,
      airFilterChanged: true,
      serviceHistory: [
        {
          date: lastChangeDate,
          mileage: lastChangeMileage,
          trips: tripsSinceChange,
          oilBrand: lastOilBrand,
          oilFilterChanged: true,
          airFilterChanged: true,
          notes: `سرویس دوره‌ای تعویض روغن و تعویض فیلترها در کیلومتر ${lastChangeMileage}`,
        },
      ],
      history: initialHistory,
    };
  }

  if (isMission) {
    const isNissan = v.vehicleType === 'NISSAN';
    const missionStartTime = v.code === 6 ? '08:30' : v.code === 11 ? '09:15' : '10:00';
    const missionWorkerCount = v.code === 6 ? 3 : v.code === 11 ? 2 : 2;

    return {
      ...v,
      modelYear,
      chassisNumber,
      engineNumber,
      vin,
      chassisType,
      color,
      insurancePolicyNumber,
      inspectionNumber,
      documentNumber,
      documentDate,
      driverCode,
      location,
      group,
      axleCount: 2,
      hasViolation: false,
      plateType: 'عمومی',
      isActive: true,
      lastStatusDate,
      lastStatusTime,
      handoverDate,
      handoverTime,
      readyDate: '',
      readyTime: '',
      handoverStatus: 'DELIVERED' as const,
      queueStatus: 'SERVICED' as const,
      queueNumber: undefined,
      currentMileage,
      lastChangeMileage,
      lastChangeDate,
      tripsSinceChange,
      lastOilBrand,
      oilFilterChanged: true,
      airFilterChanged: true,
      serviceHistory: [
        {
          date: lastChangeDate,
          mileage: lastChangeMileage,
          trips: tripsSinceChange,
          oilBrand: lastOilBrand,
          oilFilterChanged: true,
          airFilterChanged: true,
          notes: `سرویس دوره‌ای تعویض روغن در کیلومتر ${lastChangeMileage}`,
        },
      ],
      currentMission: {
        destination: v.code === 6 ? 'تهران - سعادت‌آباد به تهرانپارس' : v.code === 11 ? 'تهران - مرزداران به پاسداران' : 'تهران - شهرک غرب به ولنجک',
        cargo: 'اثاثیه لوکس منزل و جهیزیه',
        departureTime: missionStartTime,
        departureDate: '1405/06/12',
        startTime: missionStartTime,
        startDate: '1405/06/12',
        baseHours: 3,
        workerCount: missionWorkerCount,
        baseVehicleRate: isNissan ? 900000 : 1800000,
        hourlyOvertimeVehicle: isNissan ? 350000 : 500000,
        baseWorkerRate: isNissan ? 350000 : 450000,
        hourlyOvertimeWorker: isNissan ? 120000 : 150000,
        notes: `اعزام به مأموریت با ${missionWorkerCount} کارگر ماهر حمل بار. مشمول ۳ ساعت اول تعرفه پایه و پس از آن ساعت اضافه تفکیکی خودرو و کارگر.`,
      },
      history: initialHistory,
    };
  }

  // Active / Ready vehicles with drivers: first 14 get sequential queue numbers
  const inQueue = index < 14;
  return {
    ...v,
    modelYear,
    chassisNumber,
    engineNumber,
    vin,
    chassisType,
    color,
    insurancePolicyNumber,
    inspectionNumber,
    documentNumber,
    documentDate,
    driverCode,
    location,
    group,
    axleCount: 2,
    hasViolation: false,
    plateType: 'عمومی',
    isActive: true,
    lastStatusDate,
    lastStatusTime,
    handoverDate,
    handoverTime,
    readyDate,
    readyTime,
    handoverStatus: 'DELIVERED' as const,
    queueStatus: inQueue ? ('IN_QUEUE' as const) : ('NOT_QUEUED' as const),
    queueNumber: inQueue ? index + 1 : undefined,
    queueDate: '1405/06/12',
    queueTime: inQueue ? `۰۶:${String(10 + (index % 10) * 3).padStart(2, '0')}` : undefined,
    currentMileage,
    lastChangeMileage,
    lastChangeDate,
    tripsSinceChange,
    lastOilBrand,
    oilFilterChanged: true,
    airFilterChanged: true,
    serviceHistory: [
      {
        date: lastChangeDate,
        mileage: lastChangeMileage,
        trips: tripsSinceChange,
        oilBrand: lastOilBrand,
        oilFilterChanged: true,
        airFilterChanged: true,
        notes: `تعویض روغن دوره‌ای و فیلترها در کیلومتر ${lastChangeMileage}`,
      },
    ],
    history: initialHistory,
  };
});

export interface DriverDocuments {
  avatarPhoto?: string;
  licenseCard?: string;
  nationalCard?: string;
  smartCard?: string;
  healthCard?: string;
}

export interface DriverDirectoryItem {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  nationalCode?: string;
  licenseNumber?: string;
  driverType?: 'EMPLOYED' | 'CONTRACTOR' | 'EXTERNAL';
  status?: string;
  rating?: number;
  totalTrips?: number;
  tripsCount?: number;
  assignedVehicles?: string[];
  documents?: DriverDocuments;
  avatarUrl?: string;
  joinedDate?: string;
  personnelCode?: string;
}

export const INITIAL_VEHICLES: VehicleItem[] = DECODED_BACKUP.vehicles.length > 0 ? DECODED_BACKUP.vehicles : LEGACY_SEED_VEHICLES;

export const INITIAL_DRIVER_DIRECTORY: DriverDirectoryItem[] = DECODED_BACKUP.driverDirectory;

