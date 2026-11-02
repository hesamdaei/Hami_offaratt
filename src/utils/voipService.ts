import { VoipConfig, VoipCallLog, DEFAULT_VOIP_CONFIG } from '../types/voip';
import { AppUser } from '../types/auth';
import { getStoredSession, getStoredUsers, updateSystemUser } from './authService';
import { normalizePersianDigits } from './jalaali';
import { getLanServerBaseUrl } from './lanSyncService';

const STORAGE_KEY_VOIP_CONFIG = 'hamibar_voip_config_v1';
const STORAGE_KEY_VOIP_USER_CONFIGS = 'hamibar_voip_user_configs_v1';
const STORAGE_KEY_VOIP_LOGS = 'hamibar_voip_logs_v1';

/**
 * دریافت تنظیمات پایه / سراسری مرکز تلفن (مقادیر پیش‌فرض سرور سانترال)
 */
export function getGlobalBaseVoipConfig(): VoipConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VOIP_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_VOIP_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('خطا در بارگذاری تنظیمات پایه ویپ:', e);
  }
  return { ...DEFAULT_VOIP_CONFIG };
}

/**
 * ذخیره تنظیمات پایه / سراسری مرکز تلفن
 */
export function saveGlobalBaseVoipConfig(config: Partial<VoipConfig>): void {
  try {
    const current = getGlobalBaseVoipConfig();
    const merged: VoipConfig = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY_VOIP_CONFIG, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('hamibar:voip-config-updated'));
  } catch (e) {
    console.error('خطا در ذخیره تنظیمات پایه ویپ:', e);
  }
}

/**
 * خواندن نقشه تنظیمات اختصاصی کاربران از localStorage
 */
function getPerUserVoipConfigMap(): Record<string, Partial<VoipConfig>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOIP_USER_CONFIGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}
  return {};
}

/**
 * تشخیص کاربر هدف (شناسه کاربر مشخص‌شده یا کاربر لاگین‌شده فعلی)
 */
function resolveTargetUser(userOrId?: AppUser | { id?: string; username?: string; voipConfig?: Partial<VoipConfig> } | string | null): {
  userId: string | null;
  username: string | null;
  userObj: AppUser | null;
} {
  if (userOrId === 'GLOBAL_DEFAULT') {
    return { userId: null, username: null, userObj: null };
  }

  const allUsers = getStoredUsers();

  if (typeof userOrId === 'string' && userOrId.trim()) {
    const clean = userOrId.trim();
    const found = allUsers.find(
      (u) => u.id === clean || u.username.toLowerCase() === clean.toLowerCase()
    );
    return {
      userId: found?.id || clean,
      username: found?.username || null,
      userObj: found || null,
    };
  }

  if (userOrId && typeof userOrId === 'object') {
    const found = allUsers.find(
      (u) =>
        (userOrId.id && u.id === userOrId.id) ||
        (userOrId.username && u.username.toLowerCase() === userOrId.username.toLowerCase())
    );
    return {
      userId: found?.id || userOrId.id || null,
      username: found?.username || userOrId.username || null,
      userObj: found || (userOrId as AppUser),
    };
  }

  // اگر آرگومان ارسال نشده باشد، کاربر فعال در نشست جاری را بررسی کن
  const session = getStoredSession();
  if (session && session.id) {
    const found = allUsers.find(
      (u) => u.id === session.id || u.username.toLowerCase() === session.username.toLowerCase()
    );
    return {
      userId: found?.id || session.id,
      username: found?.username || session.username,
      userObj: found || (session as AppUser),
    };
  }

  return { userId: null, username: null, userObj: null };
}

/**
 * دریافت تنظیمات مرکز تلفن برای یک کاربر مشخص (یا کاربر لاگین‌شده جاری)
 * هر کاربر تنظیمات اختصاصی خود (داخلی، پیش‌شماره خط، حالت اتصال، آی‌پی تلفن و...) را دارد
 * و در صورت عدم ثبت مقادیر سرور، از مقادیر پیش‌فرض مرکزی سانترال ارث‌بری می‌کند.
 */
export function getVoipConfig(
  userOrId?: AppUser | { id?: string; username?: string; voipConfig?: Partial<VoipConfig> } | string | null
): VoipConfig {
  const globalBase = getGlobalBaseVoipConfig();

  if (userOrId === 'GLOBAL_DEFAULT') {
    return globalBase;
  }

  try {
    const { userId, username, userObj } = resolveTargetUser(userOrId);
    if (!userId && !username) {
      return globalBase;
    }

    const userMap = getPerUserVoipConfigMap();
    const localPerUser =
      (userId && userMap[userId]) ||
      (username && userMap[username.toLowerCase()]) ||
      {};

    const storedInUserRecord = userObj?.voipConfig || {};

    return {
      ...DEFAULT_VOIP_CONFIG,
      ...globalBase,
      ...storedInUserRecord,
      ...localPerUser,
    };
  } catch (e) {
    console.warn('خطا در بارگذاری تنظیمات اختصاصی ویپ کاربر:', e);
    return globalBase;
  }
}

/**
 * ذخیره و اصلاح تنظیمات مرکز تلفن به صورت مجزا برای هر کاربر
 */
export function saveVoipConfig(
  config: VoipConfig,
  userOrId?: AppUser | { id?: string; username?: string; voipConfig?: Partial<VoipConfig> } | string | null,
  options?: { alsoUpdateGlobalServerDefaults?: boolean }
): void {
  try {
    if (userOrId === 'GLOBAL_DEFAULT') {
      localStorage.setItem(STORAGE_KEY_VOIP_CONFIG, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('hamibar:voip-config-updated'));
      return;
    }

    const { userId, username, userObj } = resolveTargetUser(userOrId);

    // ۱. اگر گزینه بروزرسانی پایه سرور فعال باشد یا کاربر مشخصی در کار نباشد، تنظیمات پایه سرور را هم ذخیره کن
    if (!userId || options?.alsoUpdateGlobalServerDefaults) {
      const currentGlobal = getGlobalBaseVoipConfig();
      const nextGlobal: VoipConfig = !userId
        ? config
        : {
            ...currentGlobal,
            amiHost: config.amiHost || currentGlobal.amiHost,
            amiPort: config.amiPort || currentGlobal.amiPort,
            amiUser: config.amiUser || currentGlobal.amiUser,
            amiSecret: config.amiSecret || currentGlobal.amiSecret,
            amiContext: config.amiContext || currentGlobal.amiContext,
            channelType: config.channelType || currentGlobal.channelType,
          };
      localStorage.setItem(STORAGE_KEY_VOIP_CONFIG, JSON.stringify(nextGlobal));
    }

    // ۲. ذخیره در نقشه اختصاصی کاربر در localStorage
    if (userId) {
      const userMap = getPerUserVoipConfigMap();
      userMap[userId] = { ...config };
      if (username) {
        userMap[username.toLowerCase()] = { ...config };
      }
      localStorage.setItem(STORAGE_KEY_VOIP_USER_CONFIGS, JSON.stringify(userMap));

      // ۳. ذخیره در رکورد کاربری (AppUser.voipConfig) جهت همگام‌سازی پایدار در سرور شبکه و نشست‌ها
      if (userObj) {
        updateSystemUser(userObj.id, {
          voipConfig: { ...config },
        });
      }
    }

    window.dispatchEvent(new CustomEvent('hamibar:voip-config-updated'));
  } catch (e) {
    console.error('خطا در ذخیره تنظیمات ویپ کاربر:', e);
  }
}

/**
 * بررسی اینکه آیا کاربر تنظیمات اختصاصی ثبت‌شده دارد یا از پیش‌فرض استفاده می‌کند
 */
export function hasCustomUserVoipConfig(userOrId: AppUser | string): boolean {
  const { userId, username, userObj } = resolveTargetUser(userOrId);
  if (!userId) return false;
  const userMap = getPerUserVoipConfigMap();
  const hasInMap = Boolean(
    (userId && userMap[userId] && Object.keys(userMap[userId]).length > 0) ||
      (username && userMap[username.toLowerCase()] && Object.keys(userMap[username.toLowerCase()]).length > 0)
  );
  const hasInRecord = Boolean(userObj?.voipConfig && Object.keys(userObj.voipConfig).length > 0);
  return hasInMap || hasInRecord;
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
  let cleaned = normalizePersianDigits(phone).replace(/[^0-9+*#]/g, '');

  // تبدیل فرمت بین‌المللی +98 به 0
  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.substring(4);
  }

  // اضافه کردن عدد آزاد کردن خط شهری سانترال (مثلاً 9 یا 0 در یالینک و سانترال‌ها)
  // توجه: حتی اگر شماره با 0 شروع شود (مثل 0912) و کد آزادسازی خط هم 0 باشد، باید به صورت 00912 شماره‌گیری شود
  if (prefix && prefix.trim()) {
    const cleanPrefix = normalizePersianDigits(prefix).trim().replace(/[^0-9*#,+]/g, '');
    if (cleanPrefix) {
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
 * آغاز فرآیند تماس کلیک به تماس (Click-to-Call) با ویپ (با استفاده از تنظیمات اختصاصی کاربر جاری)
 */
export async function initiateVoipCall(
  rawPhoneNumber: string,
  recipientName: string,
  overrideConfig?: Partial<VoipConfig>,
  userOrId?: AppUser | string | null
): Promise<VoipCallResult> {
  const currentConfig: VoipConfig = {
    ...getVoipConfig(userOrId),
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

/**
 * قطع تماس فعال (Hangup / Release) روی تلفن رومیزی یا سانترال
 */
export async function hangupVoipCall(overrideConfig?: Partial<VoipConfig>): Promise<{ ok: boolean; message: string }> {
  const currentConfig: VoipConfig = {
    ...getVoipConfig(),
    ...(overrideConfig || {}),
  };

  // ارسال مستقیم دستور قطع به گوشی یالینک در شبکه محلی (در صورت دسترسی مستقیم مرورگر) + ارسال به سرور
  if (currentConfig.mode === 'ipphone_cti' && currentConfig.ipPhoneIp) {
    const ip = currentConfig.ipPhoneIp.trim();
    try {
      if (currentConfig.ipPhoneModel === 'grandstream') {
        fetch(`http://${ip}/cgi-bin/api-phone_operation?cmd=endcall`, { mode: 'no-cors' }).catch(() => null);
      } else {
        fetch(`http://${ip}/servlet?key=RELEASE`, { mode: 'no-cors' }).catch(() => null);
        fetch(`http://${ip}/servlet?key=X`, { mode: 'no-cors' }).catch(() => null);
      }
    } catch {}
  }

  const baseUrl = getLanServerBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/voip/hangup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: currentConfig }),
    });
    const data = await res.json();
    return {
      ok: true,
      message: data.message || 'تماس قطع شد.',
    };
  } catch {
    return {
      ok: true,
      message: 'فرمان قطع تماس ارسال شد.',
    };
  }
}

