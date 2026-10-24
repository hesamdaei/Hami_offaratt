import { AppNotification } from '../types/notification';
import { VehicleItem, DriverDirectoryItem } from './fleetSeedData';
import { Driver, AttendanceRecords } from '../types';
import { AppUser } from '../types/auth';
import { toFaDigits } from './jalaali';
import { getFleetInsuranceAlerts } from './insuranceAlerts';

const NOTIFICATIONS_STORAGE_KEY = 'hamibar_read_notifications_v1';

/**
 * Play a gentle, pleasant notification chime using Web Audio API
 */
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.06);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (err) {
    // AudioContext might be blocked before first user gesture
    console.debug('Notification sound deferred:', err);
  }
}

/**
 * Get read notification IDs from storage
 */
export function getReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set<string>(arr.map(String));
      }
    }
  } catch {
    // ignore
  }
  return new Set<string>();
}

/**
 * Save read notification IDs to storage
 */
export function saveReadNotificationIds(ids: Set<string>): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

/**
 * Build dynamic real-time system notifications from current state
 */
export function generateSystemNotifications(params: {
  currentUser: AppUser | null;
  drivers: Driver[];
  records: AttendanceRecords;
  vehicles: VehicleItem[];
  driverDirectory: DriverDirectoryItem[];
  networkDbStatus?: string;
  todayDateFa?: string;
}): AppNotification[] {
  const {
    currentUser,
    drivers,
    records,
    vehicles,
    networkDbStatus,
    todayDateFa = 'امروز',
  } = params;

  const readIds = getReadNotificationIds();
  const list: AppNotification[] = [];

  // 1. Attendance Shift Summary Notification
  const todayKey = 'today_summary';
  const total = drivers.length;
  let present = 0;
  let leave = 0;
  let workshop = 0;
  let absent = 0;

  drivers.forEach((d) => {
    const status = records[todayKey]?.[d.id] || 'none';
    if (status === 'leave' || status === 'م') leave++;
    else if (status === 'workshop' || status === 'ت') workshop++;
    else if (status === 'absent') absent++;
    else present++;
  });

  list.push({
    id: `notif-attendance-${todayDateFa}`,
    title: 'خلاصه حضور و غیاب شیفت امروز',
    message: `از مجموع ${toFaDigits(total)} راننده، تعداد ${toFaDigits(present)} نفر حاضر، ${toFaDigits(leave)} نفر در مرخصی و ${toFaDigits(workshop)} نفر در تعمیرگاه ثبت شده‌اند.`,
    type: 'info',
    category: 'attendance',
    timestamp: 'هم‌اکنون',
    read: readIds.has(`notif-attendance-${todayDateFa}`),
    actionTab: 'ATTENDANCE',
    actionLabel: 'مشاهده تابلوی حضور',
    badge: `${toFaDigits(present)} حاضر`,
  });

  // 2. Oil Service Warnings
  // Find vehicles that need oil change (distance since last change >= 8000km or remaining < 1000km)
  const urgentOilVehicles = vehicles.filter((v) => {
    const current = v.currentMileage || 0;
    const last = v.lastChangeMileage || 0;
    const diff = current - last;
    return diff >= 7000;
  });

  if (urgentOilVehicles.length > 0) {
    const firstV = urgentOilVehicles[0];
    const diffKm = (firstV.currentMileage || 0) - (firstV.lastChangeMileage || 0);
    list.push({
      id: `notif-oil-urgent-${firstV.id}`,
      title: 'هشدار موعد سرویس روغن خودروها',
      message: `تعداد ${toFaDigits(urgentOilVehicles.length)} خودرو نیاز به بررسی تعویض روغن دارند. خودروی پلاک ${firstV.plateNumber} با کارکرد ${toFaDigits(diffKm)} کیلومتر پس از آخرین سرویس در وضعیت هشدار قرار دارد.`,
      type: 'warning',
      category: 'oil_service',
      timestamp: 'نیاز به اقدام',
      read: readIds.has(`notif-oil-urgent-${firstV.id}`),
      actionTab: 'OIL_SERVICE',
      actionLabel: 'بررسی سرویس‌های روغن',
      badge: `${toFaDigits(urgentOilVehicles.length)} خودرو`,
    });
  }

  // 3. Vehicle Insurance Expiry Alerts (سیستم هشدار سررسید بیمه‌نامه و معاینه کمتر از ۷ روز)
  const insuranceAlertData = getFleetInsuranceAlerts(vehicles, 7);
  if (insuranceAlertData.totalAlertsCount > 0) {
    const { criticalVehicles, expiredCount } = insuranceAlertData;
    const topVehicle = criticalVehicles[0];
    const topV = topVehicle.vehicle;
    const minDays = topVehicle.minDaysRemaining;

    // A. Main Fleet Insurance Summary Notification
    const summaryId = `notif-fleet-insurance-summary-${todayDateFa}`;
    const daysLabel =
      minDays < 0
        ? `منقضی شده (${toFaDigits(Math.abs(minDays))} روز قبل)`
        : minDays === 0
        ? 'سررسید امروز'
        : `فقط ${toFaDigits(minDays)} روز مانده`;

    list.push({
      id: summaryId,
      title: 'هشدار سررسید بیمه‌نامه خودروهای ناوگان (کمتر از ۷ روز)',
      message: `تعداد ${toFaDigits(criticalVehicles.length)} خودرو دارای بیمه‌نامه یا معاینه فنی در آستانه انقضا یا منقضی‌شده می‌باشند (از جمله خودروی پلاک ${topV.plateNumber} - راننده: ${topV.driverName} با وضعیت ${daysLabel}). لطفاً جهت تمدید فوری اقدام فرمایید.`,
      type: expiredCount > 0 ? 'alert' : 'warning',
      category: 'fleet',
      timestamp: 'کمتر از ۷ روز',
      read: readIds.has(summaryId),
      actionTab: 'OIL_SERVICE',
      actionLabel: 'مدیریت ناوگان و تمدید بیمه',
      badge: `${toFaDigits(criticalVehicles.length)} خودرو`,
    });

    // B. Individual notification for each critical/expired vehicle
    criticalVehicles.slice(0, 4).forEach((item) => {
      const v = item.vehicle;
      const vId = `notif-fleet-insurance-v-${v.id}`;
      const critPolicy = item.policies.find((p) => p.isCritical) || item.policies[0];
      const dRemaining = critPolicy.daysRemaining;

      list.push({
        id: vId,
        title: `سررسید ${critPolicy.title} خودرو ${v.plateNumber}`,
        message: `اعتبار ${critPolicy.title} خودرو کد ${toFaDigits(v.code)} (${v.plateNumber} - راننده: ${v.driverName}) در تاریخ ${toFaDigits(critPolicy.expiryDate)} ${
          dRemaining < 0
            ? `منقضی شده است (${toFaDigits(Math.abs(dRemaining))} روز پیش)`
            : dRemaining === 0
            ? 'امروز به پایان می‌رسد'
            : `تنها ${toFaDigits(dRemaining)} روز دیگر پایان می‌یابد`
        }.`,
        type: dRemaining <= 3 ? 'alert' : 'warning',
        category: 'fleet',
        timestamp: dRemaining < 0 ? 'منقضی' : `${toFaDigits(dRemaining)} روز مانده`,
        read: readIds.has(vId),
        actionTab: 'OIL_SERVICE',
        actionLabel: 'مشاهده مشخصات خودرو',
        badge: dRemaining < 0 ? 'منقضی' : `${toFaDigits(dRemaining)} روز`,
      });
    });
  }

  // 4. User Login Security Notification
  if (currentUser) {
    list.push({
      id: `notif-user-login-${currentUser.id}`,
      title: 'ورود موفق به ناحیه کاربری',
      message: `کاربر «${currentUser.fullName}» (${currentUser.roleTitle || 'کاربر سیستم'}) با دسترسی‌های فعال وارد سامانه گردید.`,
      type: 'success',
      category: 'security',
      timestamp: 'امروز',
      read: readIds.has(`notif-user-login-${currentUser.id}`),
      badge: currentUser.isMasterAdmin ? 'مدیریت' : 'آنلاین',
    });
  }

  // 4. LAN Database Network Status Notification
  if (currentUser?.isMasterAdmin) {
    list.push({
      id: 'notif-network-status-admin',
      title: 'وضعیت شبکه و اشتراک‌گذاری داده‌ها',
      message:
        networkDbStatus === 'SYNCED'
          ? 'دیتابیس شبکه LAN با موفقیت متصل و با سرور محلی همگام می‌باشد.'
          : networkDbStatus === 'SAVING'
          ? 'دیتابیس در حال ارسال آخرین تغییرات به سرور شبکه محلی است.'
          : 'سامانه در حالت استفاده از حافظه محلی مرورگر (Local Storage) است. تنظیمات شبکه در اختیار مدیر سیستم است.',
      type: networkDbStatus === 'SYNCED' ? 'success' : 'info',
      category: 'system',
      timestamp: 'زیرساخت شبکه',
      read: readIds.has('notif-network-status-admin'),
      badge: 'شبکه محلی',
    });
  }

  // 5. General Discipline Regulations Reminder
  list.push({
    id: 'notif-regulations-update',
    title: 'آیین‌نامه انضباطی رانندگان بروزرسانی شد',
    message: 'نسخه رسمی آیین‌نامه انضباطی، قوانین تردد، کسورات و فرم‌های تعهدنامه با فرمت چاپی A4 در دسترس می‌باشد.',
    type: 'info',
    category: 'system',
    timestamp: 'اطلاعیه اداری',
    read: readIds.has('notif-regulations-update'),
    actionTab: 'REGULATIONS',
    actionLabel: 'مشاهده آیین‌نامه',
  });

  return list;
}
