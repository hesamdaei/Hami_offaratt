import { VehicleItem } from './fleetSeedData';
import { getTodayJalaali, parseJalaaliDate, diffJalaaliDays, toFaDigits } from './jalaali';

export interface PolicyExpiryDetail {
  type: 'thirdParty' | 'body' | 'inspection';
  title: string;
  expiryDate: string;
  daysRemaining: number;
  isExpired: boolean;
  isCritical: boolean; // <= 7 days
  statusBadge: string;
  statusColor: string;
}

export interface VehicleInsuranceAlert {
  vehicle: VehicleItem;
  policies: PolicyExpiryDetail[];
  minDaysRemaining: number;
  hasCriticalExpiry: boolean; // <= 7 days
  hasExpiredPolicy: boolean;
  summaryMessage: string;
}

/**
 * Check insurance policies of a single vehicle against today or reference Jalaali date
 */
export function checkVehicleInsurance(
  vehicle: VehicleItem,
  referenceDate?: { jy: number; jm: number; jd: number }
): VehicleInsuranceAlert {
  const today = referenceDate || getTodayJalaali();
  const policies: PolicyExpiryDetail[] = [];

  const checks = [
    { type: 'thirdParty' as const, title: 'بیمه شخص ثالث', dateStr: vehicle.thirdPartyExpiry },
    { type: 'body' as const, title: 'بیمه بدنه', dateStr: vehicle.bodyInsExpiry || vehicle.insuranceExpiry },
    { type: 'inspection' as const, title: 'معاینه فنی', dateStr: vehicle.inspectionExpiry },
  ];

  checks.forEach((chk) => {
    if (!chk.dateStr) return;
    const parsed = parseJalaaliDate(chk.dateStr);
    if (!parsed) return;

    const daysRemaining = diffJalaaliDays(today, parsed);
    const isExpired = daysRemaining < 0;
    const isCritical = daysRemaining <= 7;

    let statusBadge = '';
    let statusColor = '';

    if (isExpired) {
      statusBadge = `منقضی شده (${toFaDigits(Math.abs(daysRemaining))} روز قبل)`;
      statusColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    } else if (daysRemaining === 0) {
      statusBadge = 'سررسید امروز';
      statusColor = 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse';
    } else if (daysRemaining <= 7) {
      statusBadge = `${toFaDigits(daysRemaining)} روز تا سررسید`;
      statusColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
    } else if (daysRemaining <= 30) {
      statusBadge = `${toFaDigits(daysRemaining)} روز مانده`;
      statusColor = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    } else {
      statusBadge = 'معتبر';
      statusColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }

    policies.push({
      type: chk.type,
      title: chk.title,
      expiryDate: chk.dateStr,
      daysRemaining,
      isExpired,
      isCritical,
      statusBadge,
      statusColor,
    });
  });

  const criticalOrExpired = policies.filter((p) => p.isCritical);
  const minDaysRemaining = policies.length > 0 ? Math.min(...policies.map((p) => p.daysRemaining)) : 999;
  const hasCriticalExpiry = criticalOrExpired.length > 0;
  const hasExpiredPolicy = policies.some((p) => p.isExpired);

  let summaryMessage = '';
  if (hasExpiredPolicy) {
    const expiredNames = policies.filter((p) => p.isExpired).map((p) => p.title).join(' و ');
    summaryMessage = `${expiredNames} خودرو منقضی شده است.`;
  } else if (hasCriticalExpiry) {
    const criticalNames = criticalOrExpired.map((p) => `${p.title} (${toFaDigits(p.daysRemaining)} روز)`).join(' و ');
    summaryMessage = `سررسید ${criticalNames} نزدیک است.`;
  }

  return {
    vehicle,
    policies,
    minDaysRemaining,
    hasCriticalExpiry,
    hasExpiredPolicy,
    summaryMessage,
  };
}

/**
 * Filter fleet vehicles having insurance/inspection expiring in less than thresholdDays (default 7 days)
 */
export function getFleetInsuranceAlerts(
  vehicles: VehicleItem[],
  thresholdDays: number = 7,
  referenceDate?: { jy: number; jm: number; jd: number }
): {
  criticalVehicles: VehicleInsuranceAlert[];
  expiredCount: number;
  expiringCount: number;
  totalAlertsCount: number;
} {
  const alerts = vehicles.map((v) => checkVehicleInsurance(v, referenceDate));
  const criticalVehicles = alerts
    .filter((a) => a.minDaysRemaining <= thresholdDays)
    .sort((a, b) => a.minDaysRemaining - b.minDaysRemaining);

  const expiredCount = criticalVehicles.filter((a) => a.hasExpiredPolicy).length;
  const expiringCount = criticalVehicles.filter((a) => !a.hasExpiredPolicy && a.hasCriticalExpiry).length;

  return {
    criticalVehicles,
    expiredCount,
    expiringCount,
    totalAlertsCount: criticalVehicles.length,
  };
}

/**
 * Generate official reminder text for driver regarding insurance expiry
 */
export function generateInsuranceReminderMessage(
  vehicle: VehicleItem,
  policyTitle: string,
  expiryDate: string,
  daysRemaining: number
): string {
  const timeDesc =
    daysRemaining < 0
      ? `در تاریخ ${toFaDigits(expiryDate)} منقضی گردیده است (${toFaDigits(Math.abs(daysRemaining))} روز قبل)`
      : daysRemaining === 0
      ? `امروز (${toFaDigits(expiryDate)}) به پایان می‌رسد`
      : `در تاریخ ${toFaDigits(expiryDate)} (تنها ${toFaDigits(daysRemaining)} روز دیگر) به پایان می‌رسد`;

  return `همکار گرامی جناب آقای ${vehicle.driverName || 'راننده محترم'}
با سلام و احترام،
به اطلاع می‌رساند اعتبار «${policyTitle}» خودرو کد ${toFaDigits(vehicle.code)} (پلاک: ${vehicle.plateNumber}) ${timeDesc}.
خواهشمند است جهت تمدید بیمه‌نامه و ارسال تصویر آن، سریعاً با واحد مدیریت ناوگان و دیسپچ حامی‌بار هماهنگی فرمایید تا از بروز جریمه و توقف تردد خودرو جلوگیری شود.
با تشکر - مدیریت ترابری و ناوگان حامی‌بار`;
}
