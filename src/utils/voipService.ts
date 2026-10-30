import { VoipConfig, VoipCallLog, DEFAULT_VOIP_CONFIG } from '../types/voip';
import { normalizePersianDigits } from './jalaali';
import { getLanServerBaseUrl } from './lanSyncService';

const STORAGE_KEY_VOIP_CONFIG = 'hamibar_voip_config_v1';
const STORAGE_KEY_VOIP_LOGS = 'hamibar_voip_logs_v1';

/**
 * دریافت تنظیمات سیستم ویپ از حافظه کلاینت
 */
export function getVoipConfig(): VoipConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VOIP_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_VOIP_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('خطا در بارگذاری تنظیمات ویپ:', e);
  }
  return { ...DEFAULT_VOIP_CONFIG };
}

/**
 * ذخیره تنظیمات ویپ در حافظه کلاینت
 */
export function saveVoipConfig(config: VoipConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOIP_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('خطا در ذخیره تنظیمات ویپ:', e);
  }
}

/**
 * دریافت تاریخچه تماس‌های ثبت‌شده با ویپ
 */
export function getVoipCallLogs(): VoipCallLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOIP_LOGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

/**
 * ثبت یک تماس جدید در لاگ تماس‌ها
 */
export function addVoipCallLog(log: Omit<VoipCallLog, 'id' | 'timestamp'>): VoipCallLog {
  const fullLog: VoipCallLog = {
    ...log,
    id: 'call_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
  };

  try {
    const logs = getVoipCallLogs();
    const updated = [fullLog, ...logs].slice(0, 50); // حداکثر ۵۰ تماس اخیر
    localStorage.setItem(STORAGE_KEY_VOIP_LOGS, JSON.stringify(updated));
  } catch {}

  return fullLog;
}

/**
 * پاک‌سازی تاریخچه تماس‌ها
 */
export function clearVoipCallLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_VOIP_LOGS);
  } catch {}
}

/**
 * استانداردسازی و پاک‌سازی شماره تلفن جهت شماره‌گیری در سانترال ویپ
 */
export function sanitizePhoneNumber(phone: string, prefix = ''): string {
  if (!phone) return '';
  // تبدیل اعداد فارسی به انگلیسی
  let cleaned = normalizePersianDigits(phone).replace(/[^0-9+]/g, '');

  // تبدیل فرمت بین‌المللی +98 به 0
  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.substring(4);
  }

  // اضافه کردن پیش‌شماره خط شهری در صورت نیاز سانترال (مثلاً 9 یا 0)
  if (prefix && prefix.trim()) {
    const cleanPrefix = prefix.trim();
    if (!cleaned.startsWith(cleanPrefix)) {
      cleaned = cleanPrefix + cleaned;
    }
  }

  return cleaned;
}

export interface VoipCallResult {
  ok: boolean;
  mode: VoipConfig['mode'];
  message: string;
  details?: any;
  callLog?: VoipCallLog;
}

/**
 * آغاز فرآیند تماس کلیک به تماس (Click-to-Call) با ویپ
 */
export async function initiateVoipCall(
  rawPhoneNumber: string,
  recipientName: string,
  overrideConfig?: Partial<VoipConfig>
): Promise<VoipCallResult> {
  const currentConfig: VoipConfig = {
    ...getVoipConfig(),
    ...(overrideConfig || {}),
  };

  const dialNumber = sanitizePhoneNumber(rawPhoneNumber, currentConfig.dialPrefix);

  if (!dialNumber) {
    return {
      ok: false,
      mode: currentConfig.mode,
      message: 'شماره تلفن نامعتبر است.',
    };
  }

  // حالت ۱: شماره‌گیری سریع با پروتکل نرم‌افزارهای دسکتاپ (MicroSIP, Zoiper, 3CX, Phone Link)
  if (currentConfig.mode === 'softphone') {
    const protocol = currentConfig.softphoneProtocol || 'tel';
    const uri = `${protocol}:${dialNumber}`;

    try {
      // ایجاد لینک مخفی جهت باز شدن بدون بستن صفحه وب
      const a = document.createElement('a');
      a.href = uri;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);

      const log = addVoipCallLog({
        recipientName,
        phoneNumber: dialNumber,
        operatorExtension: currentConfig.operatorExtension || 'سافت‌فون',
        mode: 'softphone',
        status: 'initiated',
        message: `دستور تماس به نرم‌افزار تلفنی (${protocol.toUpperCase()}) سیستم‌عامل ارسال شد.`,
      });

      return {
        ok: true,
        mode: 'softphone',
        message: `شماره‌گیری در نرم‌افزار تلفنی (${protocol.toUpperCase()}) آغاز شد.`,
        callLog: log,
      };
    } catch (err: any) {
      return {
        ok: false,
        mode: 'softphone',
        message: 'خطا در فراخوانی نرم‌افزار سافت‌فون: ' + (err.message || err),
      };
    }
  }

  // حالت‌های ۲ و ۳ و ۴: تماس از طریق سرور سانترال (Asterisk AMI / Issabel / IP Phone / Webhook)
  // درخواست به بک‌اند اکسپرس سامانه حامی بار ارسال می‌شود تا سرور محلی مستقیماً با سانترال یا گوشی صحبت کند
  const baseUrl = getLanServerBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/voip/originate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: dialNumber,
        rawPhoneNumber,
        recipientName,
        config: currentConfig,
      }),
    });

    const data = await res.json();

    const log = addVoipCallLog({
      recipientName,
      phoneNumber: dialNumber,
      operatorExtension: currentConfig.operatorExtension,
      mode: currentConfig.mode,
      status: data.ok ? 'connected' : 'failed',
      message: data.message || (data.ok ? 'تماس با موفقیت برقرار شد' : 'خطا در برقراری تماس'),
    });

    return {
      ok: !!data.ok,
      mode: currentConfig.mode,
      message: data.message || (data.ok ? 'تلفن داخلی شما در حال زنگ خوردن است...' : 'خطا در سرور ویپ'),
      details: data.details,
      callLog: log,
    };
  } catch (err: any) {
    const log = addVoipCallLog({
      recipientName,
      phoneNumber: dialNumber,
      operatorExtension: currentConfig.operatorExtension,
      mode: currentConfig.mode,
      status: 'failed',
      message: 'عدم پاسخگویی سرور محلی: ' + (err.message || 'خطای شبکه'),
    });

    return {
      ok: false,
      mode: currentConfig.mode,
      message: 'خطا در ارتباط با سرور سامانه یا سانترال ویپ: ' + (err.message || err),
      callLog: log,
    };
  }
}

/**
 * تست اتصال به سانترال ویپ
 */
export async function testVoipConnection(config: VoipConfig): Promise<{ ok: boolean; message: string; details?: any }> {
  if (config.mode === 'softphone') {
    return {
      ok: true,
      message: 'حالت سافت‌فون نیازی به تنظیم سرور ندارد و با نرم‌افزارهای MicroSIP و Zoiper ویندوز آماده به کار است.',
    };
  }

  const baseUrl = getLanServerBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/voip/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      ok: false,
      message: 'عدم ارتباط با سرور: ' + (err.message || 'شبکه در دسترس نیست'),
    };
  }
}
