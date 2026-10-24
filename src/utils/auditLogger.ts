import * as XLSX from 'xlsx';
import { AuditLogItem, AuditModule, AuditSeverity } from '../types/auditLog';
import { getTodayJalaali, toFaDigits } from './jalaali';
import { AppUser } from '../types/auth';

const STORAGE_KEY_AUDIT_LOGS = 'hamibar_system_audit_logs_v2';
const MAX_LOGS_COUNT = 1500;

// Helper to get current Persian date and time formatted
export function getCurrentPersianDateTime() {
  const today = getTodayJalaali();
  const dateStr = `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  return { dateStr, timeStr };
}

// Initial realistic seed logs for initial display
const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-seed-01',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    jalaaliDate: '1403/07/26',
    time: '12:05:30',
    userId: 'usr-master-admin',
    userName: 'admin',
    userFullName: 'مدیر ارشد سامانه',
    userRole: 'مدیریت ارشد سیستم',
    userAvatarColor: 'from-amber-500 to-orange-600',
    action: 'AUTH_LOGIN',
    module: 'AUTH',
    title: 'ورود موفق به سامانه',
    description: 'کاربر مدیر ارشد با نام کاربری admin و احراز هویت داخلی وارد سامانه شد.',
    severity: 'INFO',
    clientIp: '192.168.1.105',
    device: 'مرورگر دسکتاپ - Chrome Windows',
  },
  {
    id: 'log-seed-02',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    jalaaliDate: '1403/07/26',
    time: '11:32:15',
    userId: 'usr-operator-01',
    userName: 'operator',
    userFullName: 'کارشناس ثبت حضور و تردد',
    userRole: 'اپراتور شیفت',
    userAvatarColor: 'from-blue-500 to-cyan-600',
    action: 'ATTENDANCE_STATUS_CHANGE',
    module: 'ATTENDANCE',
    title: 'تغییر وضعیت راننده',
    description: 'وضعیت راننده «حسام حسامی» در تاریخ ۱۴۰۳/۰۷/۲۶ به «مرخصی استحقاقی» تغییر یافت.',
    targetId: 'drv-01',
    targetName: 'حسام حسامی',
    severity: 'WARNING',
    previousValue: 'حاضر (none)',
    newValue: 'مرخصی (leave)',
    clientIp: '192.168.1.112',
    device: 'تبلت عملیاتی دیسپچ',
  },
  {
    id: 'log-seed-03',
    timestamp: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    jalaaliDate: '1403/07/26',
    time: '10:07:44',
    userId: 'usr-fleet-02',
    userName: 'fleet_admin',
    userFullName: 'مسئول ناوگان و خودروها',
    userRole: 'مدیر فنی و ترابری',
    userAvatarColor: 'from-emerald-500 to-teal-600',
    action: 'OIL_SERVICE_UPDATE',
    module: 'OIL_SERVICE',
    title: 'ثبت سرویس روغن و فیلتر',
    description: 'سرویس تعویض روغن موتور خودرو بنز اکسور با شماره پلاک ۲۱ع۵۴۴ ایران ۶۸ در کیلومتر ۲۴۵,۰۰۰ ثبت شد.',
    targetId: 'veh-02',
    targetName: 'بنز اکسور - ۲۱ع۵۴۴ ایران ۶۸',
    severity: 'SUCCESS',
    previousValue: 'کیلومتر ۲۳۵,۰۰۰',
    newValue: 'کیلومتر ۲۴۵,۰۰۰ (سرویس کامل)',
    clientIp: '192.168.1.118',
    device: 'مرورگر موبایل - Safari iOS',
  },
  {
    id: 'log-seed-04',
    timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    jalaaliDate: '1403/07/26',
    time: '07:01:10',
    userId: 'usr-master-admin',
    userName: 'admin',
    userFullName: 'مدیر ارشد سامانه',
    userRole: 'مدیریت ارشد سیستم',
    userAvatarColor: 'from-amber-500 to-orange-600',
    action: 'BACKUP_EXPORT',
    module: 'BACKUP',
    title: 'پشتیبان‌گیری کامل از پایگاه داده',
    description: 'یک نسخه پشتیبان کامل از کلیه رکوردهای تردد، رانندگان و تنظیمات به فرمت JSON دریافت شد.',
    severity: 'INFO',
    clientIp: '192.168.1.105',
    device: 'مرورگر دسکتاپ - Chrome Windows',
  },
  {
    id: 'log-seed-05',
    timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    jalaaliDate: '1403/07/25',
    time: '14:20:00',
    userId: 'usr-master-admin',
    userName: 'admin',
    userFullName: 'مدیر ارشد سامانه',
    userRole: 'مدیریت ارشد سیستم',
    userAvatarColor: 'from-amber-500 to-orange-600',
    action: 'USER_CREATE',
    module: 'USERS',
    title: 'ایجاد کاربر جدید در سیستم',
    description: 'کاربر جدید «مسئول ناوگان و خودروها» با نام کاربری fleet_admin و مجوزهای ترابری تعریف گردید.',
    targetId: 'usr-fleet-02',
    targetName: 'fleet_admin',
    severity: 'SUCCESS',
    clientIp: '192.168.1.105',
    device: 'مرورگر دسکتاپ - Chrome Windows',
  },
];

/**
 * Get all stored audit logs
 */
export function getAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    if (raw) {
      const parsed: AuditLogItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
    }
  } catch (err) {
    console.error('Error reading audit logs:', err);
  }

  // Fallback to seed logs
  saveAuditLogs(INITIAL_AUDIT_LOGS);
  return INITIAL_AUDIT_LOGS;
}

/**
 * Save audit logs to localStorage
 */
export function saveAuditLogs(logs: AuditLogItem[]): void {
  try {
    const trimmed = logs.slice(0, MAX_LOGS_COUNT);
    localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving audit logs:', err);
  }
}

/**
 * Record a new audit log entry
 */
export function recordAuditLog(
  currentUser: AppUser | null | undefined,
  entry: {
    action: AuditLogItem['action'];
    module: AuditModule;
    title: string;
    description: string;
    targetId?: string;
    targetName?: string;
    severity?: AuditSeverity;
    previousValue?: string;
    newValue?: string;
    metadata?: Record<string, any>;
  }
): AuditLogItem {
  const { dateStr, timeStr } = getCurrentPersianDateTime();
  const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newLog: AuditLogItem = {
    id,
    timestamp: new Date().toISOString(),
    jalaaliDate: dateStr,
    time: timeStr,
    userId: currentUser?.id || 'usr-system',
    userName: currentUser?.username || 'سیستم خودکار',
    userFullName: currentUser?.fullName || 'سیستم',
    userRole: currentUser?.roleTitle || (currentUser?.isMasterAdmin ? 'مدیریت ارشد' : 'کاربر سیستم'),
    userAvatarColor: currentUser?.avatarColor || 'from-slate-600 to-slate-800',
    action: entry.action,
    module: entry.module,
    title: entry.title,
    description: entry.description,
    targetId: entry.targetId,
    targetName: entry.targetName,
    severity: entry.severity || 'INFO',
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    metadata: entry.metadata,
    clientIp: '192.168.1.' + Math.floor(100 + (Date.now() % 50)),
    device: navigator.userAgent.includes('Mobile') ? 'دستگاه موبایل' : 'مرورگر وب دسکتاپ',
  };

  try {
    const existing = getAuditLogs();
    const updated = [newLog, ...existing];
    saveAuditLogs(updated);
  } catch (err) {
    console.error('Failed to append audit log:', err);
  }

  return newLog;
}

/**
 * Clear all audit logs
 */
export function clearAuditLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_AUDIT_LOGS);
  } catch (err) {
    console.error('Failed to clear audit logs:', err);
  }
}

/**
 * Export audit logs to Excel
 */
export function exportAuditLogsToExcel(logs: AuditLogItem[]): void {
  const today = getTodayJalaali();
  const dateStr = `${today.jy}-${today.jm}-${today.jd}`;

  const headers = [
    'ردیف',
    'شناسه لاگ',
    'تاریخ شمسی',
    'ساعت',
    'نام کاربر',
    'نام کاربری',
    'نقش / سمت',
    'بخش مربوطه',
    'عنوان عملیات',
    'شرح تغییرات انجام شده',
    'مقدار قبلی',
    'مقدار جدید',
    'سطح اهمیت',
    'دستگاه / کلاینت',
  ];

  const rows = logs.map((log, idx) => [
    toFaDigits(idx + 1),
    log.id,
    toFaDigits(log.jalaaliDate),
    toFaDigits(log.time),
    log.userFullName,
    log.userName,
    log.userRole || '—',
    getModuleLabel(log.module),
    log.title,
    log.description,
    log.previousValue || '—',
    log.newValue || '—',
    getSeverityLabel(log.severity),
    log.device || '—',
  ]);

  const worksheetData = [
    [`گزارش جامع وقایع و لاگ تغییرات سامانه حامی بار (تاریخ استخراج: ${toFaDigits(dateStr)})`],
    [],
    headers,
    ...rows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'لاگ_تغییرات');

  const fileName = `HamiBar_Audit_Logs_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// Helpers for Persian display
export function getModuleLabel(module: AuditModule): string {
  switch (module) {
    case 'AUTH':
      return 'ورود و امنیت';
    case 'USERS':
      return 'مدیریت کاربران';
    case 'ATTENDANCE':
      return 'حضور و غیاب';
    case 'DRIVERS':
      return 'پرونده رانندگان';
    case 'STAFF':
      return 'پرونده پرسنل';
    case 'OIL_SERVICE':
      return 'سرویس روغن و خودرو';
    case 'FLEET':
      return 'مدیریت ناوگان و خودروها';
    case 'REGULATIONS':
      return 'آیین‌نامه و ضوابط';
    case 'BACKUP':
      return 'پشتیبان و بازیابی';
    case 'SYSTEM':
      return 'هسته سامانه';
    default:
      return module;
  }
}

export function getSeverityLabel(severity: AuditSeverity): string {
  switch (severity) {
    case 'INFO':
      return 'عادی';
    case 'SUCCESS':
      return 'موفق';
    case 'WARNING':
      return 'هشدار تغییرات';
    case 'CRITICAL':
      return 'عملیات حساس';
    default:
      return severity;
  }
}

/**
 * Format relative time (e.g. ۵ دقیقه پیش)
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'هم‌اکنون';
    if (diffMin < 60) return `${toFaDigits(diffMin)} دقیقه پیش`;
    if (diffHour < 24) return `${toFaDigits(diffHour)} ساعت پیش`;
    if (diffDay === 1) return 'دیروز';
    if (diffDay < 30) return `${toFaDigits(diffDay)} روز پیش`;
    return 'بیش از یک ماه پیش';
  } catch {
    return '—';
  }
}
