import { INITIAL_VEHICLES, RAW_SEED_VEHICLES, LEGACY_SEED_VEHICLES, INITIAL_DRIVER_DIRECTORY, VehicleItem, DriverDirectoryItem } from './fleetSeedData';
import { RAW_BACKUP_PAYLOAD, DECODED_BACKUP } from './backupDecoder';
import { getInitialDrivers } from './defaultDrivers';
import { INITIAL_ORDERS, OrderItem } from './ordersData';
import { StaffMember } from '../types';
import { normalizePersianDigits, getTodayJalaali, parseJalaaliDate, calculateDaysDifference, toFaDigits } from './jalaali';

export type DiagnosticSeverity = 'ERROR' | 'WARNING' | 'HEALTHY';

export type DiagnosticSource =
  | 'FLEET_SEED'
  | 'BACKUP_SEED'
  | 'DRIVERS_SEED'
  | 'ORDERS_DATA'
  | 'STAFF_SEED'
  | 'LOCAL_STORAGE';

export const DIAGNOSTIC_SOURCE_LABELS: Record<DiagnosticSource, string> = {
  FLEET_SEED: 'خودروهای ناوگان (fleetSeedData.ts)',
  BACKUP_SEED: 'پایگاه پشتیبان (backupDecoder.ts)',
  DRIVERS_SEED: 'دفترچه رانندگان (defaultDrivers.ts)',
  ORDERS_DATA: 'سفارشات و بارنامه‌ها (ordersData.ts)',
  STAFF_SEED: 'پرسنل سازمانی (staffSeedData.ts)',
  LOCAL_STORAGE: 'حافظه مرورگر (LocalStorage)',
};

export interface DiagnosticIssue {
  id: string;
  source: DiagnosticSource;
  sourceLabel: string;
  recordId: string;
  recordTitle: string;
  recordCode?: string | number;
  field: string;
  fieldLabel: string;
  severity: DiagnosticSeverity;
  currentValue: any;
  message: string;
  recommendation: string;
  isAutoFixable: boolean;
}

export interface DiagnosticReport {
  scannedAt: string;
  totalRecordsScanned: number;
  errorCount: number;
  warningCount: number;
  healthyCount: number;
  healthScore: number; // 0 to 100
  sourceStats: Record<
    DiagnosticSource,
    { total: number; errors: number; warnings: number; healthy: number }
  >;
  issues: DiagnosticIssue[];
}

/**
 * Validates a Jalali date string
 */
export function validateJalaliDate(
  dateStr: any,
  fieldName: string,
  isRequired: boolean = false
): {
  isValid: boolean;
  severity: DiagnosticSeverity;
  message: string;
  isAutoFixable: boolean;
  cleanFormatted?: string;
} {
  if (dateStr === null || dateStr === undefined || String(dateStr).trim() === '' || String(dateStr).trim() === '-') {
    if (isRequired) {
      return {
        isValid: false,
        severity: 'ERROR',
        message: `فیلد ${fieldName} اجباری است اما خالی یا خط تیره (-) ثبت شده است.`,
        isAutoFixable: true,
      };
    }
    return {
      isValid: true,
      severity: 'HEALTHY',
      message: 'تاریخ ثبت نشده است (اختیاری).',
      isAutoFixable: false,
    };
  }

  const str = String(dateStr).trim();
  const normalized = normalizePersianDigits(str);

  // Check for NaN or placeholder strings
  if (/^(nan|null|undefined)$/i.test(normalized)) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `مقدار نامعتبر "${dateStr}" در فیلد ${fieldName}.`,
      isAutoFixable: true,
    };
  }

  // Check structure: year/month/day
  const match = normalized.match(/^(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `فرمت تاریخ در ${fieldName} معتبر نیست (باید سال/ماه/روز باشد): "${dateStr}"`,
      isAutoFixable: false,
    };
  }

  let year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // 2-digit year conversion
  if (year < 100) {
    year = year < 50 ? 1400 + year : 1300 + year;
  }

  // Validate Jalali Year Range (e.g. 1350 to 1450)
  if (year < 1350 || year > 1450) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `سال تاریخ (${year}) خارج از محدوده مجاز تقویم شمسی (۱۳۵۰ تا ۱۴۵۰) است.`,
      isAutoFixable: false,
    };
  }

  // Validate Month Range (1-12)
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `ماه تاریخ (${month}) نامعتبر است (باید بین ۱ تا ۱۲ باشد).`,
      isAutoFixable: false,
    };
  }

  // Validate Day Range (1-31)
  if (day < 1 || day > 31) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `روز تاریخ (${day}) نامعتبر است (باید بین ۱ تا ۳۱ باشد).`,
      isAutoFixable: false,
    };
  }

  // Second-half of Jalali year has at most 30 days
  if (month >= 7 && month <= 11 && day > 30) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `ماه ${month} در تقویم خورشیدی حداکثر ۳۰ روز دارد اما روز ${day} ثبت شده است.`,
      isAutoFixable: true,
      cleanFormatted: `${year}/${String(month).padStart(2, '0')}/30`,
    };
  }

  // Esfand (month 12) has at most 29 or 30 days
  if (month === 12 && day > 30) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `اسفند حداکثر ۳۰ روز دارد اما روز ${day} ثبت شده است.`,
      isAutoFixable: true,
      cleanFormatted: `${year}/12/29`,
    };
  }

  const cleanFormatted = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

  // Check if date has Persian digits that can be standardized
  const hasPersianDigits = /[۰-۹]/.test(str);
  if (hasPersianDigits) {
    return {
      isValid: true,
      severity: 'WARNING',
      message: `تاریخ با اعداد فارسی ثبت شده است و بهتر است به استاندارد لاتین تبدیل شود.`,
      isAutoFixable: true,
      cleanFormatted,
    };
  }

  return {
    isValid: true,
    severity: 'HEALTHY',
    message: 'تاریخ معتبر و استاندارد است.',
    isAutoFixable: false,
    cleanFormatted,
  };
}

/**
 * Validates Iranian Mobile Phone Numbers
 */
export function validateIranianPhone(phone: any): {
  isValid: boolean;
  severity: DiagnosticSeverity;
  message: string;
  isAutoFixable: boolean;
  cleanPhone?: string;
} {
  if (!phone || String(phone).trim() === '' || String(phone).trim() === '-') {
    return {
      isValid: false,
      severity: 'WARNING',
      message: 'شماره تماس راننده ثبت نشده است.',
      isAutoFixable: false,
    };
  }

  const str = String(phone).trim();
  const normalized = normalizePersianDigits(str).replace(/[\s\-_]/g, '');

  // Handle multiple slash-separated numbers
  if (normalized.includes('/')) {
    const parts = normalized.split('/');
    const allValid = parts.every((p) => /^09\d{9}$/.test(p.trim()));
    if (allValid) {
      return {
        isValid: true,
        severity: 'HEALTHY',
        message: 'دو شماره تماس معتبر ثبت شده است.',
        isAutoFixable: false,
        cleanPhone: parts.map((p) => p.trim()).join(' / '),
      };
    }
  }

  if (/^09\d{9}$/.test(normalized)) {
    return {
      isValid: true,
      severity: 'HEALTHY',
      message: 'شماره موبایل استاندارد و معتبر است.',
      isAutoFixable: false,
      cleanPhone: normalized,
    };
  }

  if (/^9\d{9}$/.test(normalized)) {
    return {
      isValid: false,
      severity: 'WARNING',
      message: 'شماره تماس بدون پیش‌شماره صفر ثبت شده است.',
      isAutoFixable: true,
      cleanPhone: '0' + normalized,
    };
  }

  return {
    isValid: false,
    severity: 'WARNING',
    message: `ساختار شماره تماس "${phone}" مطابق الگوی ۱۱ رقمی استاندارد ایران نیست.`,
    isAutoFixable: false,
  };
}

/**
 * Validates Iranian National ID (کد ملی)
 */
export function validateNationalCode(code: any): {
  isValid: boolean;
  severity: DiagnosticSeverity;
  message: string;
} {
  if (!code || String(code).trim() === '' || String(code).trim() === '-') {
    return { isValid: true, severity: 'HEALTHY', message: 'کد ملی وارد نشده است.' };
  }
  const clean = normalizePersianDigits(String(code)).replace(/\D/g, '');
  if (clean.length !== 10) {
    return {
      isValid: false,
      severity: 'WARNING',
      message: `کد ملی باید دقیقاً ۱۰ رقم باشد (رقم ثبت شده: ${clean.length} رقم).`,
    };
  }
  // Check repeated digits
  if (/^(\d)\1{9}$/.test(clean)) {
    return { isValid: false, severity: 'WARNING', message: 'کد ملی دارای ارقام تکراری نامعتبر است.' };
  }
  // Check checksum
  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }
  const remainder = sum % 11;
  const valid = (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
  if (!valid) {
    return { isValid: false, severity: 'WARNING', message: 'کد ملی الگوریتم اعتبارسنجی ثبت‌احوال را پاس نمی‌کند.' };
  }
  return { isValid: true, severity: 'HEALTHY', message: 'کد ملی معتبر است.' };
}

/**
 * Validates Iranian Vehicle License Plate
 */
export function validateLicensePlate(plate: any): {
  isValid: boolean;
  severity: DiagnosticSeverity;
  message: string;
} {
  if (!plate || String(plate).trim() === '') {
    return {
      isValid: false,
      severity: 'ERROR',
      message: 'پلاک خودرو خالی است و ثبت نشده است.',
    };
  }
  const str = String(plate).trim();
  const normalized = normalizePersianDigits(str);
  // License plate should contain at least numbers and either letter or dash
  const hasDigits = /\d/.test(normalized);
  if (!hasDigits || str.length < 5) {
    return {
      isValid: false,
      severity: 'ERROR',
      message: `فرمت پلاک "${plate}" ناقص یا بسیار کوتاه است.`,
    };
  }
  return { isValid: true, severity: 'HEALTHY', message: 'پلاک خودرو معتبر است.' };
}

/**
 * Comprehensive Scanner Function
 * Scans fleetSeedData, backupDecoder, defaultDrivers, ordersData, staff, and active localStorage.
 */
export function runComprehensiveDiagnosticScan(): DiagnosticReport {
  const issues: DiagnosticIssue[] = [];
  const scannedAt = new Date().toISOString();
  const today = getTodayJalaali();
  const todayStr = `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`;

  const sourceStats: DiagnosticReport['sourceStats'] = {
    FLEET_SEED: { total: 0, errors: 0, warnings: 0, healthy: 0 },
    BACKUP_SEED: { total: 0, errors: 0, warnings: 0, healthy: 0 },
    DRIVERS_SEED: { total: 0, errors: 0, warnings: 0, healthy: 0 },
    ORDERS_DATA: { total: 0, errors: 0, warnings: 0, healthy: 0 },
    STAFF_SEED: { total: 0, errors: 0, warnings: 0, healthy: 0 },
    LOCAL_STORAGE: { total: 0, errors: 0, warnings: 0, healthy: 0 },
  };

  const addIssue = (
    source: DiagnosticSource,
    recordId: string,
    recordTitle: string,
    recordCode: string | number | undefined,
    field: string,
    fieldLabel: string,
    severity: DiagnosticSeverity,
    currentValue: any,
    message: string,
    recommendation: string,
    isAutoFixable: boolean
  ) => {
    issues.push({
      id: `diag-${source}-${recordId}-${field}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      source,
      sourceLabel: DIAGNOSTIC_SOURCE_LABELS[source],
      recordId,
      recordTitle,
      recordCode,
      field,
      fieldLabel,
      severity,
      currentValue,
      message,
      recommendation,
      isAutoFixable,
    });

    if (severity === 'ERROR') sourceStats[source].errors++;
    else if (severity === 'WARNING') sourceStats[source].warnings++;
    else sourceStats[source].healthy++;
  };

  // Helper to scan a vehicle object
  const inspectVehicleItem = (v: VehicleItem, source: DiagnosticSource) => {
    sourceStats[source].total++;
    const vTitle = `${v.plateNumber || 'بدون پلاک'} (کد ${v.code || '؟'})`;

    // 1. Check ID and Code
    if (!v.id) {
      addIssue(source, 'no-id', vTitle, v.code, 'id', 'شناسه خودرو', 'ERROR', v.id, 'شناسه خودرو (ID) وجود ندارد.', 'یک شناسه یکتا مانند v-XX اختصاص داده شود.', true);
    }
    if (v.code === undefined || v.code === null || isNaN(Number(v.code)) || Number(v.code) <= 0) {
      addIssue(source, v.id || 'code-err', vTitle, v.code, 'code', 'کد خودرو', 'ERROR', v.code, 'کد خودرو نامعتبر یا خالی است.', 'کد سازمانی عددی مثبت ثبت گردد.', false);
    }

    // 2. Check Plate
    const plateCheck = validateLicensePlate(v.plateNumber);
    if (!plateCheck.isValid) {
      addIssue(source, v.id, vTitle, v.code, 'plateNumber', 'شماره پلاک', plateCheck.severity, v.plateNumber, plateCheck.message, 'شماره پلاک معتبر استاندارد وارد شود.', false);
    }

    // 3. Check Vehicle Type
    const validTypes = ['KHAAVAR', 'HYUNDAI', 'ISUZU', 'NISSAN', 'VAN', 'PICKUP', 'CAR'];
    if (!v.vehicleType || !validTypes.includes(v.vehicleType)) {
      addIssue(source, v.id, vTitle, v.code, 'vehicleType', 'نوع خودرو', 'ERROR', v.vehicleType, `نوع خودرو "${v.vehicleType}" در فهرست انواع استاندارد تعریف نشده است.`, 'یکی از انواع خاور، هیوندا، ایسوزو، نیسان یا سواری تعیین شود.', true);
    }

    // 4. Check Dates
    // Third party insurance (thirdPartyExpiry or insuranceExpiry)
    const tpDate = v.thirdPartyExpiry || v.insuranceExpiry;
    const tpCheck = validateJalaliDate(tpDate, 'بیمه شخص ثالث', true);
    if (!tpCheck.isValid) {
      addIssue(source, v.id, vTitle, v.code, 'thirdPartyExpiry', 'بیمه شخص ثالث', tpCheck.severity, tpDate, tpCheck.message, 'تاریخ پایان بیمه شخص ثالث به فرمت ۱۴۰۶/۰۵/۲۸ اصلاح شود.', tpCheck.isAutoFixable);
    } else if (tpCheck.severity === 'WARNING') {
      addIssue(source, v.id, vTitle, v.code, 'thirdPartyExpiry', 'بیمه شخص ثالث', 'WARNING', tpDate, tpCheck.message, 'تبدیل ارقام فارسی به فرمت استاندارد.', true);
    } else if (tpCheck.cleanFormatted) {
      // Check expiration
      const daysDiff = calculateDaysDifference(todayStr, tpCheck.cleanFormatted);
      if (daysDiff < 0) {
        addIssue(source, v.id, vTitle, v.code, 'thirdPartyExpiry', 'بیمه شخص ثالث', 'WARNING', tpDate, `بیمه شخص ثالث این خودرو منقضی شده است (${Math.abs(daysDiff)} روز گذشته).`, 'بیمه‌نامه خودرو تمدید و تاریخ جدید ثبت گردد.', false);
      } else if (daysDiff <= 15) {
        addIssue(source, v.id, vTitle, v.code, 'thirdPartyExpiry', 'بیمه شخص ثالث', 'WARNING', tpDate, `تنها ${daysDiff} روز تا انقضای بیمه شخص ثالث باقی مانده است.`, 'اقدام فوری جهت تمدید بیمه‌نامه پیش از انقضا.', false);
      }
    }

    // Inspection expiry
    const inspCheck = validateJalaliDate(v.inspectionExpiry, 'معاینه فنی', true);
    if (!inspCheck.isValid) {
      addIssue(source, v.id, vTitle, v.code, 'inspectionExpiry', 'معاینه فنی', inspCheck.severity, v.inspectionExpiry, inspCheck.message, 'تاریخ پایان اعتبار معاینه فنی تعیین شود.', inspCheck.isAutoFixable);
    } else if (inspCheck.severity === 'WARNING') {
      addIssue(source, v.id, vTitle, v.code, 'inspectionExpiry', 'معاینه فنی', 'WARNING', v.inspectionExpiry, inspCheck.message, 'تبدیل به ارقام استاندارد.', true);
    } else if (inspCheck.cleanFormatted) {
      const daysDiff = calculateDaysDifference(todayStr, inspCheck.cleanFormatted);
      if (daysDiff < 0) {
        addIssue(source, v.id, vTitle, v.code, 'inspectionExpiry', 'معاینه فنی', 'WARNING', v.inspectionExpiry, `معاینه فنی منقضی شده است (${Math.abs(daysDiff)} روز گذشته).`, 'اخذ برگه معاینه فنی جدید و به‌روزرسانی تاریخ.', false);
      }
    }

    // Body Insurance (Optional for some)
    if (v.bodyInsExpiry && v.bodyInsExpiry.trim() !== '' && v.bodyInsExpiry.trim() !== '-') {
      const bodyCheck = validateJalaliDate(v.bodyInsExpiry, 'بیمه بدنه', false);
      if (!bodyCheck.isValid) {
        addIssue(source, v.id, vTitle, v.code, 'bodyInsExpiry', 'بیمه بدنه', bodyCheck.severity, v.bodyInsExpiry, bodyCheck.message, 'تاریخ بیمه بدنه اصلاح یا در صورت نداشتن خالی شود.', bodyCheck.isAutoFixable);
      }
    } else if (v.bodyInsExpiry === '-') {
      // Placeholder dash can cause parsing confusion
      addIssue(source, v.id, vTitle, v.code, 'bodyInsExpiry', 'بیمه بدنه', 'WARNING', '-', 'مقدار دارای علامت خط تیره (-) است و بهتر است به فیلد خالی تبدیل شود.', 'پاک‌سازی علامت خط تیره.', true);
    }

    // 5. Check Driver Assignment & Phone
    const hasDriver = v.driverName && v.driverName.trim() !== '' && v.driverName !== 'بدون راننده';
    if (v.status === 'IN_MISSION' && !hasDriver) {
      addIssue(source, v.id, vTitle, v.code, 'driverName', 'راننده خودرو', 'ERROR', v.driverName, 'خودرو در وضعیت مأموریت ثبت شده اما هیچ راننده‌ای برای آن مشخص نشده است.', 'راننده مورد نظر را تخصیص دهید.', false);
    }

    if (hasDriver) {
      const phoneCheck = validateIranianPhone(v.driverPhone);
      if (!phoneCheck.isValid) {
        addIssue(source, v.id, vTitle, v.code, 'driverPhone', 'شماره تماس راننده', phoneCheck.severity, v.driverPhone, phoneCheck.message, 'شماره همراه راننده با پیش‌شماره ۰۹ وارد شود.', phoneCheck.isAutoFixable);
      }
    }

    // 6. Check Mileage Inconsistencies
    const curMil = Number(v.currentMileage);
    const lastMil = Number(v.lastChangeMileage);
    if (isNaN(curMil) || curMil < 0) {
      addIssue(source, v.id, vTitle, v.code, 'currentMileage', 'کیلومتر فعلی', 'ERROR', v.currentMileage, 'مقدار کیلومتر فعلی خودرو عدد نامعتبر یا منفی است.', 'کیلومتر معتبر عددی بزرگتر یا مساوی صفر درج شود.', true);
    }
    if (isNaN(lastMil) || lastMil < 0) {
      addIssue(source, v.id, vTitle, v.code, 'lastChangeMileage', 'کیلومتر آخرین سرویس', 'ERROR', v.lastChangeMileage, 'مقدار کیلومتر تعویض روغن نامعتبر است.', 'کیلومتر عددی معتبر ثبت شود.', true);
    }
    if (!isNaN(curMil) && !isNaN(lastMil) && lastMil > curMil && curMil > 0) {
      addIssue(source, v.id, vTitle, v.code, 'lastChangeMileage', 'کیلومتر آخرین تعویض روغن', 'ERROR', `${lastMil} > ${curMil}`, `کیلومتر تعویض روغن (${lastMil}) از کیلومتر فعلی خودرو (${curMil}) بیشتر ثبت شده است!`, 'کیلومتر تعویض روغن با کیلومتر فعلی همگام یا کمتر از آن تنظیم شود.', true);
    }
  };

  // 1. SCAN: fleetSeedData.ts (INITIAL_VEHICLES & RAW_SEED_VEHICLES)
  INITIAL_VEHICLES.forEach((v) => inspectVehicleItem(v, 'FLEET_SEED'));

  // 2. SCAN: backupDecoder.ts (RAW_BACKUP_PAYLOAD.vehicles & drivers)
  (RAW_BACKUP_PAYLOAD.vehicles || []).forEach((rv: any, idx: number) => {
    sourceStats.BACKUP_SEED.total++;
    const rTitle = `خودرو پشتیبان کد ${rv.code || idx}`;
    // Check Persian dates in raw backup
    const insCheck = validateJalaliDate(rv.insuranceExpiry, 'اعتبار بیمه', true);
    if (!insCheck.isValid || insCheck.severity === 'WARNING') {
      addIssue('BACKUP_SEED', rv.id || `raw-${idx}`, rTitle, rv.code, 'insuranceExpiry', 'اعتبار بیمه', insCheck.severity, rv.insuranceExpiry, insCheck.message, 'استانداردسازی اعداد تاریخ.', insCheck.isAutoFixable);
    }
    const inspCheck = validateJalaliDate(rv.inspectionExpiry, 'اعتبار معاینه', false);
    if (!inspCheck.isValid) {
      addIssue('BACKUP_SEED', rv.id || `raw-${idx}`, rTitle, rv.code, 'inspectionExpiry', 'اعتبار معاینه', inspCheck.severity, rv.inspectionExpiry, inspCheck.message, 'اصلاح تاریخ معاینه.', inspCheck.isAutoFixable);
    }
  });

  // 3. SCAN: defaultDrivers.ts & driverDirectory
  const initialDrivers = getInitialDrivers();
  initialDrivers.forEach((d) => {
    sourceStats.DRIVERS_SEED.total++;
    const dTitle = `${d.name || 'راننده بی‌نام'} (کد ${d.code || '؟'})`;
    if (!d.name || d.name.trim() === '') {
      addIssue('DRIVERS_SEED', d.id, dTitle, d.code, 'name', 'نام راننده', 'ERROR', d.name, 'نام راننده خالی است.', 'نام کامل راننده را وارد کنید.', false);
    }
    if (!d.code || d.code.trim() === '') {
      addIssue('DRIVERS_SEED', d.id, dTitle, d.code, 'code', 'کد راننده', 'ERROR', d.code, 'کد شناسایی راننده خالی است.', 'کد یکتا اختصاص دهید.', false);
    }
    const phoneCheck = validateIranianPhone(d.phone);
    if (!phoneCheck.isValid) {
      addIssue('DRIVERS_SEED', d.id, dTitle, d.code, 'phone', 'شماره تماس', phoneCheck.severity, d.phone, phoneCheck.message, 'شماره تماس صحیح ثبت گردد.', phoneCheck.isAutoFixable);
    }
  });

  // Check driver directory for National ID
  INITIAL_DRIVER_DIRECTORY.forEach((dir) => {
    if (dir.nationalCode) {
      const ncCheck = validateNationalCode(dir.nationalCode);
      if (!ncCheck.isValid) {
        addIssue('DRIVERS_SEED', dir.id, dir.name, dir.code, 'nationalCode', 'کد ملی راننده', ncCheck.severity, dir.nationalCode, ncCheck.message, 'کد ملی ۱۰ رقمی صحیح وارد شود.', false);
      }
    }
  });

  // 4. SCAN: ordersData.ts
  INITIAL_ORDERS.forEach((o: OrderItem) => {
    sourceStats.ORDERS_DATA.total++;
    const oTitle = `سفارش ${o.orderNumber || o.id} (${o.customerName || 'مشتری نامشخص'})`;
    if (!o.orderNumber) {
      addIssue('ORDERS_DATA', o.id, oTitle, undefined, 'orderNumber', 'شماره سفارش', 'ERROR', o.orderNumber, 'شماره پیگیری سفارش ثبت نشده است.', 'شماره سفارش یکتا تعیین شود.', false);
    }
    if (!o.customerName) {
      addIssue('ORDERS_DATA', o.id, oTitle, undefined, 'customerName', 'نام مشتری', 'ERROR', o.customerName, 'نام مشتری مشخص نیست.', 'نام مشتری را تکمیل نمایید.', false);
    }
    if (o.estimatedFareRial !== undefined && (isNaN(o.estimatedFareRial) || o.estimatedFareRial < 0)) {
      addIssue('ORDERS_DATA', o.id, oTitle, undefined, 'estimatedFareRial', 'کرایه تخمینی', 'ERROR', o.estimatedFareRial, 'کرایه سفارش عدد نامعتبر یا منفی است.', 'مبلغ کرایه بر حسب ریال اصلاح شود.', true);
    }
    const dateCheck = validateJalaliDate(o.orderDate, 'تاریخ سفارش', true);
    if (!dateCheck.isValid) {
      addIssue('ORDERS_DATA', o.id, oTitle, undefined, 'orderDate', 'تاریخ سفارش', dateCheck.severity, o.orderDate, dateCheck.message, 'تاریخ سفارش به صورت استاندارد درج شود.', dateCheck.isAutoFixable);
    }
  });

  // 5. SCAN: staffSeedData.ts
  (DECODED_BACKUP.staffMembers || []).forEach((s: StaffMember) => {
    sourceStats.STAFF_SEED.total++;
    const sTitle = `${s.name || 'پرسنل بی‌نام'} (کد ${s.code || '؟'})`;
    if (!s.name) {
      addIssue('STAFF_SEED', s.id, sTitle, s.code, 'name', 'نام پرسنل', 'ERROR', s.name, 'نام پرسنل ثبت نشده است.', 'نام کامل پرسنل را وارد کنید.', false);
    }
    if (!s.code) {
      addIssue('STAFF_SEED', s.id, sTitle, s.code, 'code', 'کد پرسنلی', 'ERROR', s.code, 'کد پرسنلی خالی است.', 'کد پرسنلی اختصاص دهید.', false);
    }
    if (s.phone) {
      const phoneCheck = validateIranianPhone(s.phone);
      if (!phoneCheck.isValid) {
        addIssue('STAFF_SEED', s.id, sTitle, s.code, 'phone', 'شماره همراه پرسنل', phoneCheck.severity, s.phone, phoneCheck.message, 'شماره تلفن معتبر ثبت شود.', phoneCheck.isAutoFixable);
      }
    }
    if (s.nationalId) {
      const ncCheck = validateNationalCode(s.nationalId);
      if (!ncCheck.isValid) {
        addIssue('STAFF_SEED', s.id, sTitle, s.code, 'nationalId', 'کد ملی پرسنل', ncCheck.severity, s.nationalId, ncCheck.message, 'کد ملی ۱۰ رقمی وارد گردد.', false);
      }
    }
  });

  // 6. SCAN: Active LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const savedVehiclesStr = localStorage.getItem('hamibar_vehicles_list_v1');
      if (savedVehiclesStr) {
        const parsed = JSON.parse(savedVehiclesStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((lv: VehicleItem) => inspectVehicleItem(lv, 'LOCAL_STORAGE'));
        }
      }
    } catch (e: any) {
      addIssue('LOCAL_STORAGE', 'ls-corrupt', 'حافظه محلی خودروها', undefined, 'json', 'داده‌های ذخیره شده', 'ERROR', 'JSON Corrupted', `داده‌های خودرو در حافظه مرورگر مخدوش است: ${e?.message}`, 'بازنشانی حافظه لوکال خودروها از سید سالم.', true);
    }

    try {
      const savedDriversStr = localStorage.getItem('hamibar_drivers_list_v1');
      if (savedDriversStr) {
        const parsed = JSON.parse(savedDriversStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((ld: any) => {
            sourceStats.LOCAL_STORAGE.total++;
            if (!ld.name) {
              addIssue('LOCAL_STORAGE', ld.id || 'ld', 'راننده در حافظه مرورگر', ld.code, 'name', 'نام راننده', 'ERROR', ld.name, 'نام راننده در لوکال‌استوریج خالی است.', 'اصلاح نام راننده.', true);
            }
          });
        }
      }
    } catch (e: any) {
      addIssue('LOCAL_STORAGE', 'ls-drivers-corrupt', 'حافظه رانندگان', undefined, 'json', 'داده‌های راننده', 'ERROR', 'JSON Corrupted', `داده‌های راننده در مرورگر مخدوش است: ${e?.message}`, 'پاکسازی و بارگذاری مجدد.', true);
    }
  }

  // Calculate totals
  const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const totalScanned =
    sourceStats.FLEET_SEED.total +
    sourceStats.BACKUP_SEED.total +
    sourceStats.DRIVERS_SEED.total +
    sourceStats.ORDERS_DATA.total +
    sourceStats.STAFF_SEED.total +
    sourceStats.LOCAL_STORAGE.total;

  const healthyCount = Math.max(0, totalScanned - errorCount - warningCount);
  const healthScore = totalScanned > 0 ? Math.max(0, Math.min(100, Math.round(((totalScanned - errorCount * 1.5 - warningCount * 0.5) / totalScanned) * 100))) : 100;

  return {
    scannedAt,
    totalRecordsScanned: totalScanned,
    errorCount,
    warningCount,
    healthyCount,
    healthScore,
    sourceStats,
    issues,
  };
}

/**
 * Normalizes date string into clean Gregorian/English-digit standard "YYYY/MM/DD"
 */
export function normalizeDateString(dateStr: any): string {
  if (!dateStr || String(dateStr).trim() === '' || String(dateStr).trim() === '-') return '';
  const normalized = normalizePersianDigits(String(dateStr).trim());
  const match = normalized.match(/^(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return dateStr;
  let year = parseInt(match[1], 10);
  if (year < 100) year = year < 50 ? 1400 + year : 1300 + year;
  const month = Math.min(12, Math.max(1, parseInt(match[2], 10)));
  const day = Math.min(31, Math.max(1, parseInt(match[3], 10)));
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Normalizes phone number into clean 11-digit "09xxxxxxxxx"
 */
export function normalizePhoneNumber(phone: any): string {
  if (!phone || String(phone).trim() === '' || String(phone).trim() === '-') return '';
  const normalized = normalizePersianDigits(String(phone).trim()).replace(/[\s\-_]/g, '');
  if (normalized.includes('/')) {
    return normalized
      .split('/')
      .map((p) => normalizePhoneNumber(p.trim()))
      .join(' / ');
  }
  if (/^9\d{9}$/.test(normalized)) {
    return '0' + normalized;
  }
  return normalized;
}

/**
 * Automatic Repair Action:
 * Normalizes all dates, fixes NaN and inverted mileages, sanitizes phone numbers,
 * cleans placeholder dashes, and syncs clean state into localStorage.
 */
export function performAutoRepair(): {
  repairedCount: number;
  fixedFields: string[];
  message: string;
} {
  let repairedCount = 0;
  const fixedFields: string[] = [];

  const repairVehicle = (v: VehicleItem): VehicleItem => {
    let changed = false;
    const cloned = { ...v };

    // Standardize dates
    const cleanThirdParty = normalizeDateString(cloned.thirdPartyExpiry || cloned.insuranceExpiry);
    if (cleanThirdParty && cleanThirdParty !== cloned.thirdPartyExpiry) {
      cloned.thirdPartyExpiry = cleanThirdParty;
      changed = true;
      fixedFields.push(`تاریخ بیمه ثالث (${cloned.plateNumber})`);
    }

    const cleanInspection = normalizeDateString(cloned.inspectionExpiry);
    if (cleanInspection && cleanInspection !== cloned.inspectionExpiry) {
      cloned.inspectionExpiry = cleanInspection;
      changed = true;
      fixedFields.push(`تاریخ معاینه (${cloned.plateNumber})`);
    }

    // Clean body insurance
    if (cloned.bodyInsExpiry === '-' || cloned.bodyInsExpiry === 'null') {
      cloned.bodyInsExpiry = '';
      changed = true;
    } else if (cloned.bodyInsExpiry) {
      const cleanBody = normalizeDateString(cloned.bodyInsExpiry);
      if (cleanBody !== cloned.bodyInsExpiry) {
        cloned.bodyInsExpiry = cleanBody;
        changed = true;
      }
    }

    // Clean phone
    if (cloned.driverPhone) {
      const cleanPhone = normalizePhoneNumber(cloned.driverPhone);
      if (cleanPhone !== cloned.driverPhone) {
        cloned.driverPhone = cleanPhone;
        changed = true;
        fixedFields.push(`تلفن راننده (${cloned.plateNumber})`);
      }
    }

    // Mileage fixes
    let curMil = Number(cloned.currentMileage);
    let lastMil = Number(cloned.lastChangeMileage);
    if (isNaN(curMil) || curMil < 0) {
      cloned.currentMileage = 0;
      changed = true;
      curMil = 0;
    }
    if (isNaN(lastMil) || lastMil < 0) {
      cloned.lastChangeMileage = 0;
      changed = true;
      lastMil = 0;
    }
    if (lastMil > curMil && curMil > 0) {
      cloned.lastChangeMileage = curMil;
      changed = true;
      fixedFields.push(`تطبیق کیلومتر سرویس با کیلومتر جاری (${cloned.plateNumber})`);
    }

    if (changed) repairedCount++;
    return cloned;
  };

  // 1. Repair localStorage vehicles
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawVehicles = localStorage.getItem('hamibar_vehicles_list_v1');
      if (rawVehicles) {
        const vehicles: VehicleItem[] = JSON.parse(rawVehicles);
        if (Array.isArray(vehicles)) {
          const repaired = vehicles.map(repairVehicle);
          localStorage.setItem('hamibar_vehicles_list_v1', JSON.stringify(repaired));
        }
      } else {
        // Seed from repaired INITIAL_VEHICLES
        const repaired = INITIAL_VEHICLES.map(repairVehicle);
        localStorage.setItem('hamibar_vehicles_list_v1', JSON.stringify(repaired));
      }

      // Repair drivers
      const rawDrivers = localStorage.getItem('hamibar_drivers_list_v1');
      if (rawDrivers) {
        const drivers = JSON.parse(rawDrivers);
        if (Array.isArray(drivers)) {
          const repDrivers = drivers.map((d: any) => ({
            ...d,
            phone: normalizePhoneNumber(d.phone),
          }));
          localStorage.setItem('hamibar_drivers_list_v1', JSON.stringify(repDrivers));
        }
      }
    } catch (e: any) {
      return {
        repairedCount: 0,
        fixedFields: [],
        message: `خطا در بازنویسی حافظه محلی: ${e?.message}`,
      };
    }
  }

  return {
    repairedCount,
    fixedFields: Array.from(new Set(fixedFields)),
    message: `عملیات اصلاح خودکار با موفقیت انجام شد. تعداد ${toFaDigits(repairedCount)} رکورد بهینه‌سازی و ذخیره گردید.`,
  };
}

/**
 * Resets local storage fleet and drivers to pristine sanitized seed dataset
 */
export function resetStorageToCleanSeed(): { success: boolean; message: string } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, message: 'محیط مرورگر در دسترس نیست.' };
  }
  try {
    const cleanVehicles = INITIAL_VEHICLES.map((v) => ({
      ...v,
      thirdPartyExpiry: normalizeDateString(v.thirdPartyExpiry || v.insuranceExpiry),
      inspectionExpiry: normalizeDateString(v.inspectionExpiry),
      bodyInsExpiry: v.bodyInsExpiry === '-' ? '' : normalizeDateString(v.bodyInsExpiry),
      driverPhone: normalizePhoneNumber(v.driverPhone),
      currentMileage: Number(v.currentMileage) || 0,
      lastChangeMileage: Number(v.lastChangeMileage) || 0,
    }));

    const cleanDrivers = getInitialDrivers().map((d) => ({
      ...d,
      phone: normalizePhoneNumber(d.phone),
    }));

    localStorage.setItem('hamibar_vehicles_list_v1', JSON.stringify(cleanVehicles));
    localStorage.setItem('hamibar_drivers_list_v1', JSON.stringify(cleanDrivers));

    return {
      success: true,
      message: 'پایگاه داده مرورگر با موفقیت به نسخه پاکیزه و اعتبارسنجی شده سید اولیه بازنشانی شد.',
    };
  } catch (e: any) {
    return {
      success: false,
      message: `خطا در بازنشانی: ${e?.message}`,
    };
  }
}
