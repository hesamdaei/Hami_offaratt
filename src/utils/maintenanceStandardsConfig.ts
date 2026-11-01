import { DECODED_BACKUP } from './backupDecoder';
import { calculateDaysBetweenJalaali, calculateNextDueDateJalaali, formatJalaaliDate, parseJalaaliDate } from './jalaali';

export interface ServiceRule {
  label: string;
  hasMileage: boolean;
  maxMileage?: number;
  maxTrips?: number;
  maxDays: number;
  warningMileage?: number;
}

export const DEFAULT_SERVICE_RULES: Record<string, ServiceRule> = {
  KHAAVAR: { label: 'خاور بنز', hasMileage: false, maxTrips: 80, maxDays: 60, warningMileage: 500 },
  HYUNDAI: { label: 'هیوندا', hasMileage: true, maxMileage: 5000, maxTrips: 60, maxDays: 45, warningMileage: 500 },
  ISUZU: { label: 'ایسوزو ۵.۲', hasMileage: true, maxMileage: 5000, maxTrips: 80, maxDays: 45, warningMileage: 500 },
  NISSAN: { label: 'نیسان', hasMileage: true, maxMileage: 5000, maxTrips: 50, maxDays: 30, warningMileage: 500 },
  INSPECTOR_CAR: { label: 'خودرو بازرس', hasMileage: true, maxMileage: 7000, maxDays: 180, warningMileage: 700 },
  INSPECTOR_MOTOR: { label: 'موتور بازرس', hasMileage: true, maxMileage: 3000, maxDays: 180, warningMileage: 300 },
  SEDAN: { label: 'سواری', hasMileage: true, maxMileage: 5000, maxDays: 180, warningMileage: 500 },
  PEUGEOT: { label: 'پژو', hasMileage: true, maxMileage: 5000, maxDays: 180, warningMileage: 500 },
  ...(DECODED_BACKUP?.rules || {}),
};

export type MaintenanceCategory = 'FLUIDS' | 'FILTERS' | 'BRAKES_TIRES' | 'MECHANICAL' | 'ELECTRICAL' | 'OTHER';

export interface MaintenanceItemStandard {
  id: string;
  name: string;
  category: MaintenanceCategory;
  categoryLabel: string;
  maxKm: number;
  maxDays: number;
  warningKm: number;
  unit: string;
  isCustom?: boolean;
  description: string;
}

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  FLUIDS: 'روغن‌ها و مایعات مصرفی',
  FILTERS: 'فیلترها و صافی‌ها',
  BRAKES_TIRES: 'ترمز، چرخ و لاستیک‌ها',
  MECHANICAL: 'مکانیکی، تسمه‌ها و انتقال قدرت',
  ELECTRICAL: 'برق و باتری',
  OTHER: 'سایر سرویس‌های دوره‌ای',
};

export const DEFAULT_MAINTENANCE_ITEMS: MaintenanceItemStandard[] = [
  {
    id: 'engine_oil',
    name: 'روغن موتور (دیزل / بنزینی)',
    category: 'FLUIDS',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.FLUIDS,
    maxKm: 5000,
    maxDays: 90,
    warningKm: 500,
    unit: 'کیلومتر',
    description: 'تعویض به موقع روغن موتور به همراه فیلتر روغن جهت جلوگیری از استهلاک رینگ و پیستون',
  },
  {
    id: 'oil_filter',
    name: 'فیلتر روغن موتور',
    category: 'FILTERS',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.FILTERS,
    maxKm: 5000,
    maxDays: 90,
    warningKm: 500,
    unit: 'کیلومتر',
    description: 'توصیه اکید بر تعویض همزمان با هر بار تعویض روغن موتور ناوگان',
  },
  {
    id: 'air_filter',
    name: 'فیلتر هوا',
    category: 'FILTERS',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.FILTERS,
    maxKm: 10000,
    maxDays: 120,
    warningKm: 1000,
    unit: 'کیلومتر',
    description: 'جلوگیری از ورود گرد و غبار به موتور و کاهش محسوس مصرف سوخت',
  },
  {
    id: 'fuel_filter',
    name: 'فیلتر گازوئیل / سوخت (صافی بنزین)',
    category: 'FILTERS',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.FILTERS,
    maxKm: 15000,
    maxDays: 180,
    warningKm: 1500,
    unit: 'کیلومتر',
    description: 'حفاظت از پمپ انژکتور، سوزن‌های دیزل و مدار سوخت‌رسانی خودرو',
  },
  {
    id: 'gearbox_oil',
    name: 'واسکازین و روغن گیربکس',
    category: 'FLUIDS',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.FLUIDS,
    maxKm: 40000,
    maxDays: 365,
    warningKm: 3000,
    unit: 'کیلومتر',
    description: 'روان‌کاری چرخ‌دنده‌های جعبه‌دنده و سهولت تعویض دنده‌ها در بارهای سنگین',
  },
  {
    id: 'brake_pads',
    name: 'لنت ترمز چرخ‌ها (جلو و عقب)',
    category: 'BRAKES_TIRES',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.BRAKES_TIRES,
    maxKm: 30000,
    maxDays: 365,
    warningKm: 2500,
    unit: 'کیلومتر',
    description: 'بازدید دوره‌ای ضخامت گوشت لنت، دیسک‌ها و بوستر ترمز جهت ایمنی ناوگان',
  },
  {
    id: 'tires_rotation',
    name: 'جابجایی ضربدری لاستیک‌ها (Rotation)',
    category: 'BRAKES_TIRES',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.BRAKES_TIRES,
    maxKm: 20000,
    maxDays: 180,
    warningKm: 2000,
    unit: 'کیلومتر',
    description: 'تعادل سایش عاج تایرها و افزایش طول عمر مفید لاستیک‌های خودرو',
  },
  {
    id: 'tires_replacement',
    name: 'سقف تعویض کامل لاستیک‌ها',
    category: 'BRAKES_TIRES',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.BRAKES_TIRES,
    maxKm: 60000,
    maxDays: 730,
    warningKm: 5000,
    unit: 'کیلومتر',
    description: 'تعویض به موقع تایرهای مستهلک قبل از کاهش آج و خطر ترکیدگی در جاده',
  },
  {
    id: 'timing_belt',
    name: 'تسمه تایم، تسمه پروانه و دینام',
    category: 'MECHANICAL',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.MECHANICAL,
    maxKm: 60000,
    maxDays: 730,
    warningKm: 5000,
    unit: 'کیلومتر',
    description: 'کنترل سلامت تسمه‌ها و پولی‌ها برای جلوگیری از پاره‌شدن ناگهانی در مأموریت',
  },
  {
    id: 'differential_oil',
    name: 'روغن دیفرانسیل (واسکازین دف)',
    category: 'FLUIDS',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.FLUIDS,
    maxKm: 50000,
    maxDays: 365,
    warningKm: 3000,
    unit: 'کیلومتر',
    description: 'روان‌کاری کرانویل و پینیون دیفرانسیل خودروهای باری سنگین و نیمه‌سنگین',
  },
  {
    id: 'suspension_grease',
    name: 'گریس‌کاری شاسی، سیبک‌ها و اتصالات تعلیق',
    category: 'MECHANICAL',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.MECHANICAL,
    maxKm: 10000,
    maxDays: 60,
    warningKm: 1000,
    unit: 'کیلومتر',
    description: 'تزریق گریس نسوز به کاسه‌نمدها، چهارشاخ گاردان و مفصل‌های زیربندی',
  },
  {
    id: 'radiator_coolant',
    name: 'مایع ضدیخ و شستشوی رادیاتور',
    category: 'FLUIDS',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.FLUIDS,
    maxKm: 40000,
    maxDays: 365,
    warningKm: 2000,
    unit: 'کیلومتر',
    description: 'تخلیه و تعویض محلول ضدیخ/ضدجوش جهت محافظت از سرسیلندر و واترپمپ',
  },
  {
    id: 'spark_plugs',
    name: 'شمع و وایر سیستم جرقه‌زنی (بنزینی)',
    category: 'ELECTRICAL',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.ELECTRICAL,
    maxKm: 30000,
    maxDays: 365,
    warningKm: 2000,
    unit: 'کیلومتر',
    description: 'تنظیم دهانه و تعویض شمع‌ها برای شتاب استاندارد و احتراق بهینه موتور',
  },
  {
    id: 'battery_check',
    name: 'تست شارژ دینام و تعویض باتری',
    category: 'ELECTRICAL',
    categoryLabel: MAINTENANCE_CATEGORY_LABELS.ELECTRICAL,
    maxKm: 50000,
    maxDays: 540,
    warningKm: 3000,
    unit: 'کیلومتر',
    description: 'سنجش سلامت استارت، دینام، بست‌ها و تست ولتاژ باتری در شرایط زمستانی',
  },
];

const STORAGE_KEY_RULES = 'hamibar_service_rules_v1';
const STORAGE_KEY_ITEMS = 'hamibar_maintenance_items_v1';

// Load stored service rules or defaults
export function getStoredServiceRules(): Record<string, ServiceRule> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RULES);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with default rules so newly added types are present
      return { ...DEFAULT_SERVICE_RULES, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SERVICE_RULES;
}

// Save service rules to localStorage
export function saveStoredServiceRules(rules: Record<string, ServiceRule>): void {
  localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
}

// Load stored maintenance items or defaults
export function getStoredMaintenanceItems(): MaintenanceItemStandard[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_MAINTENANCE_ITEMS;
}

// Save maintenance items to localStorage
export function saveStoredMaintenanceItems(items: MaintenanceItemStandard[]): void {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
}

// Reset maintenance items to defaults
export function resetMaintenanceItemsToDefault(): MaintenanceItemStandard[] {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(DEFAULT_MAINTENANCE_ITEMS));
  return DEFAULT_MAINTENANCE_ITEMS;
}

// Reset rules to defaults
export function resetServiceRulesToDefault(): Record<string, ServiceRule> {
  localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(DEFAULT_SERVICE_RULES));
  return DEFAULT_SERVICE_RULES;
}

// Comprehensive Mileage & Maintenance Calculation Result
export interface MileageCalculationResult {
  currentMileage: number;
  lastChangeMileage: number;
  drivenKm: number;
  ceilingKm: number;
  nextTargetKm: number;
  remainingKm: number;
  overdueKm: number;
  wearPercent: number;
  isOverdue: boolean;
  isWarning: boolean;
  isHealthy: boolean;
  isInconsistent: boolean;
  discrepancyKm: number;
  status: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  statusText: string;
  daysPassed: number;
  maxDays: number;
  daysRemaining: number;
  daysOverdue: number;
  isDaysOverdue: boolean;
}

/**
 * Robust, unified mileage calculation function
 * Handles all edge cases:
 * - current < last (meter rollback / replacement / human error)
 * - overdue distance
 * - remaining distance
 * - wear percentage
 * - days passed & days remaining
 */
export interface VehicleServiceEvaluation {
  rule: ServiceRule;
  hasMileage: boolean;
  lastChangeDate: string;
  nextDueDateStr: string;
  daysPassed: number;
  maxDays: number;
  daysRemaining: number;
  daysOverdue: number;
  isDaysOverdue: boolean;
  isDaysWarning: boolean;
  tripsDriven: number;
  maxTrips: number;
  tripsRemaining: number;
  tripsOverdue: number;
  isTripsOverdue: boolean;
  isTripsWarning: boolean;
  currentMileage: number;
  lastChangeMileage: number;
  drivenKm: number;
  ceilingKm: number;
  nextTargetKm: number;
  remainingKm: number;
  overdueKm: number;
  isMileageOverdue: boolean;
  isMileageWarning: boolean;
  isInconsistent: boolean;
  discrepancyKm: number;
  wearPercent: number;
  status: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  statusText: string;
  statusReason: string;
  hasCompletedOilChange: boolean;
}

/**
 * Evaluate exact oil service status for ANY vehicle (including KHAAVAR without odometer, or HYUNDAI/ISUZU/NISSAN with odometer).
 * Ensures 100% consistent calculation across all tables, cards, modals, notifications, and exports.
 */
export function evaluateVehicleServiceStatus(
  vehicle: {
    vehicleType: string;
    currentMileage?: number;
    currentKm?: number;
    lastChangeMileage?: number;
    lastOilChangeKm?: number;
    lastChangeDate?: string;
    tripsSinceChange?: number;
    serviceHistory?: any[];
  },
  customRules?: Record<string, ServiceRule>
): VehicleServiceEvaluation {
  const rulesMap = customRules || getStoredServiceRules();
  const baseRule = rulesMap[vehicle.vehicleType] || DEFAULT_SERVICE_RULES[vehicle.vehicleType] || {
    label: vehicle.vehicleType,
    hasMileage: vehicle.vehicleType !== 'KHAAVAR',
    maxDays: vehicle.vehicleType === 'KHAAVAR' ? 60 : 45,
    maxTrips: vehicle.vehicleType === 'KHAAVAR' ? 80 : 60,
    maxMileage: 5000,
    warningMileage: 500,
  };

  // Force KHAAVAR to respect hasMileage (default false unless explicitly configured with positive mileage)
  const hasMileage = Boolean(baseRule.hasMileage);
  const maxDays = Math.max(1, Number(baseRule.maxDays) || (vehicle.vehicleType === 'KHAAVAR' ? 60 : 45));
  const maxTrips = Math.max(1, Number(baseRule.maxTrips) || (vehicle.vehicleType === 'KHAAVAR' ? 80 : 60));
  const ceilingKm = Math.max(100, Number(baseRule.maxMileage) || 5000);
  const warningKmThreshold = Math.max(0, Number(baseRule.warningMileage) || 500);

  // Resolve latest date from vehicle.lastChangeDate (primary source of truth) or serviceHistory[0]?.date
  const historyList = Array.isArray(vehicle.serviceHistory) ? vehicle.serviceHistory : [];
  const latestHistoryDate = historyList.length > 0 && historyList[0]?.date ? String(historyList[0].date) : '';
  const propDate = vehicle.lastChangeDate ? String(vehicle.lastChangeDate) : '';

  const rawLastChangeDate = propDate || latestHistoryDate || '1405/06/15';
  const parsedLastChange = parseJalaaliDate(rawLastChangeDate);
  const lastChangeDate = parsedLastChange
    ? formatJalaaliDate(parsedLastChange.jy, parsedLastChange.jm, parsedLastChange.jd)
    : rawLastChangeDate;

  // Time calculations
  const daysPassed = calculateDaysBetweenJalaali(lastChangeDate);
  const nextDueDateStr = calculateNextDueDateJalaali(lastChangeDate, maxDays);
  const isDaysOverdue = daysPassed >= maxDays;
  const daysRemaining = Math.max(0, maxDays - daysPassed);
  const daysOverdue = Math.max(0, daysPassed - maxDays);
  const isDaysWarning = !isDaysOverdue && daysRemaining <= 7;

  // Trips calculations
  const rawTrips = typeof vehicle.tripsSinceChange === 'number' && !isNaN(vehicle.tripsSinceChange)
    ? Math.max(0, vehicle.tripsSinceChange)
    : 0;
  const tripsDriven = rawTrips;
  const isTripsOverdue = maxTrips > 0 && tripsDriven >= maxTrips;
  const tripsRemaining = Math.max(0, maxTrips - tripsDriven);
  const tripsOverdue = Math.max(0, tripsDriven - maxTrips);
  const isTripsWarning = !isTripsOverdue && maxTrips > 0 && tripsRemaining <= 8;

  // Mileage calculations (only active if hasMileage is true)
  const rawCurrentKm = typeof vehicle.currentMileage === 'number'
    ? vehicle.currentMileage
    : typeof vehicle.currentKm === 'number'
    ? vehicle.currentKm
    : 0;
  const rawLastKm = typeof vehicle.lastChangeMileage === 'number'
    ? vehicle.lastChangeMileage
    : typeof vehicle.lastOilChangeKm === 'number'
    ? vehicle.lastOilChangeKm
    : 0;

  const currentMileage = hasMileage ? rawCurrentKm : 0;
  const lastChangeMileage = hasMileage ? rawLastKm : 0;

  const isInconsistent = hasMileage && currentMileage < lastChangeMileage;
  const discrepancyKm = isInconsistent ? lastChangeMileage - currentMileage : 0;
  const drivenKm = hasMileage && !isInconsistent ? Math.max(0, currentMileage - lastChangeMileage) : 0;
  const nextTargetKm = hasMileage ? lastChangeMileage + ceilingKm : 0;

  const isMileageOverdue = hasMileage && !isInconsistent && currentMileage >= nextTargetKm;
  const overdueKm = hasMileage
    ? isInconsistent
      ? discrepancyKm
      : isMileageOverdue
      ? currentMileage - nextTargetKm
      : 0
    : 0;
  const remainingKm = hasMileage && !isInconsistent && !isMileageOverdue
    ? Math.max(0, nextTargetKm - currentMileage)
    : 0;
  const isMileageWarning = hasMileage && !isMileageOverdue && !isInconsistent && remainingKm <= warningKmThreshold;

  // Wear percentage:
  // For mileage vehicles: max of mileage % or days %
  // For non-mileage vehicles (KHAAVAR): max of days % or trips %
  const daysPercent = Math.min(100, Math.round((daysPassed / maxDays) * 100));
  const tripsPercent = maxTrips > 0 ? Math.min(100, Math.round((tripsDriven / maxTrips) * 100)) : 0;
  const kmPercent = hasMileage
    ? isInconsistent
      ? 100
      : Math.min(100, Math.round((drivenKm / ceilingKm) * 100))
    : 0;

  const wearPercent = hasMileage
    ? Math.max(kmPercent, daysPercent)
    : Math.max(daysPercent, tripsPercent);

  let status: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
  let statusText = 'ایمن و استاندارد';
  let statusReason = '';

  if (!hasMileage) {
    // KHAAVAR / Non-mileage evaluation (strictly based on days & trips)
    if (isDaysOverdue && isTripsOverdue) {
      status = 'CRITICAL';
      statusText = 'فرارسیده (زمان و سفر)';
      statusReason = `${daysOverdue} روز و ${tripsOverdue} سفر گذشته`;
    } else if (isDaysOverdue) {
      status = 'CRITICAL';
      statusText = 'موعد تعویض (گذشت زمان)';
      statusReason = `${daysOverdue} روز از سقف ${maxDays} روز گذشته`;
    } else if (isTripsOverdue) {
      status = 'CRITICAL';
      statusText = 'موعد تعویض (تکمیل سفر)';
      statusReason = `${tripsDriven} سفر از سقف ${maxTrips} سفر`;
    } else if (isDaysWarning || isTripsWarning) {
      status = 'WARNING';
      statusText = 'نزدیک موعد سرویس';
      statusReason = isDaysWarning
        ? `${daysRemaining} روز تا سررسید`
        : `${tripsRemaining} سفر تا سررسید`;
    } else {
      status = 'HEALTHY';
      statusText = 'ایمن';
      statusReason = `${daysRemaining} روز مانده (${tripsDriven}/${maxTrips} سفر)`;
    }
  } else {
    // Mileage-based vehicles evaluation (HYUNDAI, ISUZU, NISSAN, etc.)
    if (isInconsistent) {
      status = 'CRITICAL';
      statusText = 'خطای کیلومترشمار';
      statusReason = `کیلومتر فعلی کمتر از آخرین تعویض است`;
    } else if (isMileageOverdue) {
      status = 'CRITICAL';
      statusText = 'موعد تعویض (کیلومتر)';
      statusReason = `+${overdueKm.toLocaleString()} km اضافه پیمایش`;
    } else if (isDaysOverdue) {
      status = 'CRITICAL';
      statusText = 'موعد تعویض (زمان)';
      statusReason = `${daysOverdue} روز تأخیر زمانی`;
    } else if (isTripsOverdue) {
      status = 'CRITICAL';
      statusText = 'موعد تعویض (سفر)';
      statusReason = `تکمیل سقف ${maxTrips} سفر`;
    } else if (isMileageWarning || isDaysWarning || isTripsWarning) {
      status = 'WARNING';
      statusText = 'نزدیک موعد سرویس';
      statusReason = isMileageWarning
        ? `${remainingKm.toLocaleString()} km مانده`
        : `${daysRemaining} روز مانده`;
    } else {
      status = 'HEALTHY';
      statusText = 'ایمن';
      statusReason = `${remainingKm.toLocaleString()} km مانده`;
    }
  }

  const hasCompletedOilChange = Boolean(
    vehicle.lastChangeDate ||
    vehicle.lastChangeMileage ||
    (Array.isArray(vehicle.serviceHistory) && vehicle.serviceHistory.length > 0)
  );

  return {
    rule: baseRule,
    hasMileage,
    lastChangeDate,
    nextDueDateStr,
    daysPassed,
    maxDays,
    daysRemaining,
    daysOverdue,
    isDaysOverdue,
    isDaysWarning,
    tripsDriven,
    maxTrips,
    tripsRemaining,
    tripsOverdue,
    isTripsOverdue,
    isTripsWarning,
    currentMileage,
    lastChangeMileage,
    drivenKm,
    ceilingKm,
    nextTargetKm,
    remainingKm,
    overdueKm,
    isMileageOverdue,
    isMileageWarning,
    isInconsistent,
    discrepancyKm,
    wearPercent,
    status,
    statusText,
    statusReason,
    hasCompletedOilChange,
  };
}

/**
 * Robust, unified mileage calculation function
 */
export function calculateMileageStatus(
  currentMileage: number,
  lastChangeMileage: number,
  ceilingKm: number,
  warningKmThreshold = 500,
  lastChangeDate?: string,
  maxDays = 45,
  hasMileage = true,
  tripsDriven = 0,
  maxTrips = 80
): MileageCalculationResult {
  const cur = typeof currentMileage === 'number' && !isNaN(currentMileage) ? currentMileage : 0;
  const last = typeof lastChangeMileage === 'number' && !isNaN(lastChangeMileage) ? lastChangeMileage : 0;
  const ceiling = typeof ceilingKm === 'number' && ceilingKm > 0 ? ceilingKm : 5000;
  const warningThreshold = typeof warningKmThreshold === 'number' && warningKmThreshold >= 0 ? warningKmThreshold : 500;

  // Time-based calculations
  const daysPassed = calculateDaysBetweenJalaali(lastChangeDate);
  const effectiveMaxDays = maxDays > 0 ? maxDays : 45;
  const isDaysOverdue = daysPassed >= effectiveMaxDays;
  const daysRemaining = Math.max(0, effectiveMaxDays - daysPassed);
  const daysOverdue = Math.max(0, daysPassed - effectiveMaxDays);
  const isDaysWarning = !isDaysOverdue && daysRemaining <= 7;

  if (!hasMileage) {
    const effectiveMaxTrips = maxTrips > 0 ? maxTrips : 80;
    const isTripsOverdue = tripsDriven >= effectiveMaxTrips;
    const isTripsWarning = !isTripsOverdue && (effectiveMaxTrips - tripsDriven) <= 8;
    const daysPct = Math.min(100, Math.round((daysPassed / effectiveMaxDays) * 100));
    const tripsPct = Math.min(100, Math.round((tripsDriven / effectiveMaxTrips) * 100));
    const wearPercent = Math.max(daysPct, tripsPct);

    let status: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
    let statusText = 'ایمن و استاندارد (زمان/سفر)';
    if (isDaysOverdue || isTripsOverdue) {
      status = 'CRITICAL';
      statusText = isDaysOverdue ? `سررسید گذشته (${daysOverdue} روز تأخیر)` : `تکمیل سقف سفر (${tripsDriven} سفر)`;
    } else if (isDaysWarning || isTripsWarning) {
      status = 'WARNING';
      statusText = isDaysWarning ? `نزدیک موعد (${daysRemaining} روز مانده)` : `نزدیک سقف سفر`;
    }

    return {
      currentMileage: 0,
      lastChangeMileage: 0,
      drivenKm: 0,
      ceilingKm: 0,
      nextTargetKm: 0,
      remainingKm: 0,
      overdueKm: 0,
      wearPercent,
      isOverdue: isDaysOverdue || isTripsOverdue,
      isWarning: status === 'WARNING',
      isHealthy: status === 'HEALTHY',
      isInconsistent: false,
      discrepancyKm: 0,
      status,
      statusText,
      daysPassed,
      maxDays: effectiveMaxDays,
      daysRemaining,
      daysOverdue,
      isDaysOverdue,
    };
  }

  const isInconsistent = cur < last;
  const discrepancyKm = isInconsistent ? (last - cur) : 0;

  // Real driven mileage since last change
  const drivenKm = isInconsistent ? 0 : Math.max(0, cur - last);
  const nextTargetKm = last + ceiling;

  const isOverdue = !isInconsistent && cur >= nextTargetKm;
  const overdueKm = isInconsistent ? discrepancyKm : (isOverdue ? cur - nextTargetKm : 0);
  const remainingKm = (!isInconsistent && !isOverdue) ? Math.max(0, nextTargetKm - cur) : 0;

  const wearPercent = isInconsistent
    ? 100
    : Math.min(100, Math.round((drivenKm / ceiling) * 100));

  const isMileageWarning = !isOverdue && !isInconsistent && remainingKm <= warningThreshold;

  let status: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
  let statusText = 'ایمن و استاندارد';

  if (isInconsistent) {
    status = 'CRITICAL';
    statusText = 'خطای کیلومترشمار (کمتر از تعویض)';
  } else if (isOverdue || isDaysOverdue) {
    status = 'CRITICAL';
    statusText = isOverdue && isDaysOverdue
      ? 'سررسید گذشته (کیلومتر و زمان)'
      : isOverdue
      ? 'اضافه پیمایش (سررسید کیلومتر)'
      : 'سررسید گذشته (زمان)';
  } else if (isMileageWarning || isDaysWarning) {
    status = 'WARNING';
    statusText = isMileageWarning ? 'نزدیک موعد سرویس (کیلومتر)' : 'نزدیک موعد سرویس (زمان)';
  }

  const isWarning = status === 'WARNING';
  const isHealthy = status === 'HEALTHY';

  return {
    currentMileage: cur,
    lastChangeMileage: last,
    drivenKm,
    ceilingKm: ceiling,
    nextTargetKm,
    remainingKm,
    overdueKm,
    wearPercent,
    isOverdue: isOverdue || isDaysOverdue,
    isWarning,
    isHealthy,
    isInconsistent,
    discrepancyKm,
    status,
    statusText,
    daysPassed,
    maxDays: effectiveMaxDays,
    daysRemaining,
    daysOverdue,
    isDaysOverdue,
  };
}

