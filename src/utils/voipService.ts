import { VoipConfig, VoipCallLog, DEFAULT_VOIP_CONFIG } from '../types/voip';
import { AppUser } from '../types/auth';
import { getStoredSession, getStoredUsers, updateSystemUser } from './authService';
import { normalizePersianDigits } from './jalaali';
import { getLanServerBaseUrl } from './lanSyncService';

const STORAGE_KEY_VOIP_CONFIG = 'hamibar_voip_config_v1';
const STORAGE_KEY_VOIP_USER_CONFIGS = 'hamibar_voip_user_configs_v1';
const STORAGE_KEY_VOIP_LOGS = 'hamibar_voip_logs_v1';

/**
 * نرمال‌سازی و پاک‌سازی مقادیر تنظیمات ویپ (تبدیل اعداد فارسی به انگلیسی برای داخلی، آی‌پی، پورت و پیش‌شماره)
 */
export function sanitizeVoipConfig(
  raw: Partial<VoipConfig> | undefined | null,
  fallback: VoipConfig = DEFAULT_VOIP_CONFIG
): VoipConfig {
  const src = raw || {};
  const cleanStr = (val: unknown, def = ''): string => {
    if (val === undefined || val === null) return def;
    return normalizePersianDigits(String(val)).trim();
  };

  const validModes: VoipConfig['mode'][] = ['softphone', 'asterisk_ami', 'ipphone_cti', 'webhook'];
  const mode: VoipConfig['mode'] =
    src.mode && validModes.includes(src.mode) ? src.mode : fallback.mode || 'softphone';

  const validChannels: VoipConfig['channelType'][] = ['SIP', 'PJSIP', 'Local'];
  const channelType: VoipConfig['channelType'] =
    src.channelType && validChannels.includes(src.channelType)
      ? src.channelType
      : fallback.channelType || 'SIP';

  const validPhoneModels: VoipConfig['ipPhoneModel'][] = ['yealink', 'grandstream', 'fanvil'];
  const ipPhoneModel: VoipConfig['ipPhoneModel'] =
    src.ipPhoneModel && validPhoneModels.includes(src.ipPhoneModel)
      ? src.ipPhoneModel
      : fallback.ipPhoneModel || 'yealink';

  const softphoneProtocol: VoipConfig['softphoneProtocol'] =
    src.softphoneProtocol === 'sip' || src.softphoneProtocol === 'tel'
      ? src.softphoneProtocol
      : fallback.softphoneProtocol || 'tel';

  const rawPort = src.amiPort !== undefined ? cleanStr(src.amiPort, '5038') : String(fallback.amiPort || 5038);
  const parsedPort = parseInt(rawPort.replace(/[^0-9]/g, ''), 10);

  return {
    enabled: src.enabled !== undefined ? Boolean(src.enabled) : fallback.enabled !== false,
    mode,
    operatorExtension: cleanStr(
      src.operatorExtension !== undefined ? src.operatorExtension : fallback.operatorExtension,
      '101'
    ).replace(/[^0-9A-Za-z_.-]/g, '') || '101',
    dialPrefix: cleanStr(
      src.dialPrefix !== undefined ? src.dialPrefix : fallback.dialPrefix,
      ''
    ).replace(/[^0-9*#,+]/g, ''),
    callerId:
      src.callerId !== undefined && String(src.callerId).trim()
        ? String(src.callerId).trim()
        : fallback.callerId || 'HamiBar Dispatch',
    softphoneProtocol,
    amiHost: cleanStr(
      src.amiHost !== undefined ? src.amiHost : fallback.amiHost,
      '192.168.1.200'
    ).replace(/\s+/g, ''),
    amiPort: !isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 5038,
    amiUser: cleanStr(src.amiUser !== undefined ? src.amiUser : fallback.amiUser, 'admin'),
    amiSecret:
      src.amiSecret !== undefined ? String(src.amiSecret).trim() : fallback.amiSecret || '',
    amiContext:
      cleanStr(
        src.amiContext !== undefined ? src.amiContext : fallback.amiContext,
        'from-internal'
      ) || 'from-internal',
    channelType,
    autoAnswer:
      src.autoAnswer !== undefined ? Boolean(src.autoAnswer) : Boolean(fallback.autoAnswer),
    ipPhoneModel,
    ipPhoneIp: cleanStr(
      src.ipPhoneIp !== undefined ? src.ipPhoneIp : fallback.ipPhoneIp,
      ''
    ).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\s+/g, ''),
    ipPhoneUser: cleanStr(
      src.ipPhoneUser !== undefined ? src.ipPhoneUser : fallback.ipPhoneUser,
      'admin'
    ),
    ipPhonePass:
      src.ipPhonePass !== undefined
        ? String(src.ipPhonePass).trim()
        : fallback.ipPhonePass || 'admin',
    webhookUrl: cleanStr(
      src.webhookUrl !== undefined ? src.webhookUrl : fallback.webhookUrl,
      ''
    ),
    webhookMethod:
      src.webhookMethod === 'POST' || src.webhookMethod === 'GET'
        ? src.webhookMethod
        : fallback.webhookMethod || 'GET',
  };
}

/**
 * دریافت تنظیمات پایه / سراسری مرکز تلفن (مقادیر پیش‌فرض سرور سانترال)
 */
export function getGlobalBaseVoipConfig(): VoipConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VOIP_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return sanitizeVoipConfig(parsed, DEFAULT_VOIP_CONFIG);
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
    const merged = sanitizeVoipConfig({ ...current, ...config }, current);
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
 * همگام‌سازی کش تنظیمات ویپ کاربر در localStorage (فراخوانی هنگام بارگذاری یا ادغام کاربران)
 */
export function syncUserVoipConfigToLocalMap(
  userId: string,
  username: string | undefined,
  voipConfig: Partial<VoipConfig> | undefined
): void {
  if (!userId || !voipConfig || Object.keys(voipConfig).length === 0) return;
  try {
    const userMap = getPerUserVoipConfigMap();
    const globalBase = getGlobalBaseVoipConfig();
    const cleanCfg = sanitizeVoipConfig(
      { ...(userMap[userId] || {}), ...voipConfig },
      globalBase
    );
    userMap[userId] = cleanCfg;
    if (username && username.trim()) {
      userMap[username.trim().toLowerCase()] = cleanCfg;
    }
    localStorage.setItem(STORAGE_KEY_VOIP_USER_CONFIGS, JSON.stringify(userMap));
  } catch {}
}

/**
 * تشخیص کاربر هدف (شناسه کاربر مشخص‌شده یا کاربر لاگین‌شده فعلی)
 */
function resolveTargetUser(
  userOrId?:
    | AppUser
    | { id?: string; username?: string; voipConfig?: Partial<VoipConfig> }
    | string
    | null
): {
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
    // اگر شیء کاربر ارسال‌شده دارای voipConfig جدیدتر باشد با رکورد ذخیره شده ادغام شود
    const mergedUserObj = found
      ? ({
          ...found,
          voipConfig:
            found.voipConfig || userOrId.voipConfig
              ? { ...(userOrId.voipConfig || {}), ...(found.voipConfig || {}) }
              : undefined,
        } as AppUser)
      : (userOrId as AppUser);

    return {
      userId: found?.id || userOrId.id || null,
      username: found?.username || userOrId.username || null,
      userObj: mergedUserObj,
    };
  }

  // اگر آرگومان ارسال نشده باشد، کاربر فعال در نشست جاری را بررسی کن
  const session = getStoredSession();
  if (session && (session.id || session.username)) {
    const found = allUsers.find(
      (u) =>
        (session.id && u.id === session.id) ||
        (session.username && u.username.toLowerCase() === session.username.toLowerCase())
    );
    return {
      userId: found?.id || session.id || null,
      username: found?.username || session.username || null,
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
  userOrId?:
    | AppUser
    | { id?: string; username?: string; voipConfig?: Partial<VoipConfig> }
    | string
    | null
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

    // ادغام تنظیمات پایه سانترال با تنظیمات اختصاصی کاربر (رکورد کاربر و کش محلی)
    const rawMerged: Partial<VoipConfig> = {
      ...DEFAULT_VOIP_CONFIG,
      ...globalBase,
      ...localPerUser,
      ...storedInUserRecord,
    };

    return sanitizeVoipConfig(rawMerged, globalBase);
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
  userOrId?:
    | AppUser
    | { id?: string; username?: string; voipConfig?: Partial<VoipConfig> }
    | string
    | null,
  options?: { alsoUpdateGlobalServerDefaults?: boolean }
): VoipConfig {
  const globalBase = getGlobalBaseVoipConfig();
  const cleanConfig = sanitizeVoipConfig(config, globalBase);

  try {
    if (userOrId === 'GLOBAL_DEFAULT') {
      localStorage.setItem(STORAGE_KEY_VOIP_CONFIG, JSON.stringify(cleanConfig));
      window.dispatchEvent(
        new CustomEvent('hamibar:voip-config-updated', {
          detail: { userId: 'GLOBAL_DEFAULT', config: cleanConfig },
        })
      );
      return cleanConfig;
    }

    const { userId, username, userObj } = resolveTargetUser(userOrId);

    // ۱. اگر کاربر مشخصی در کار نباشد یا صراحتاً درخواست بروزرسانی پارامترهای مشترک سرور AMI شده باشد:
    // توجه مهم: هرگز حالت تماس (mode)، شماره داخلی (operatorExtension)، پیش‌شماره (dialPrefix) یا IP تلفن یک کاربر
    // نباید تنظیمات پیش‌فرض سایر کاربران سیستم را بازنویسی کند!
    if (!userId) {
      localStorage.setItem(STORAGE_KEY_VOIP_CONFIG, JSON.stringify(cleanConfig));
    } else if (options?.alsoUpdateGlobalServerDefaults) {
      const nextGlobal: VoipConfig = sanitizeVoipConfig(
        {
          ...globalBase,
          amiHost: cleanConfig.amiHost || globalBase.amiHost,
          amiPort: cleanConfig.amiPort || globalBase.amiPort,
          amiUser: cleanConfig.amiUser || globalBase.amiUser,
          amiSecret: cleanConfig.amiSecret || globalBase.amiSecret,
          amiContext: cleanConfig.amiContext || globalBase.amiContext,
          channelType: cleanConfig.channelType || globalBase.channelType,
        },
        globalBase
      );
      localStorage.setItem(STORAGE_KEY_VOIP_CONFIG, JSON.stringify(nextGlobal));
    }

    // ۲. ذخیره در نقشه اختصاصی کاربر در localStorage
    if (userId) {
      const userMap = getPerUserVoipConfigMap();
      userMap[userId] = { ...cleanConfig };
      if (username) {
        userMap[username.toLowerCase()] = { ...cleanConfig };
      }
      localStorage.setItem(STORAGE_KEY_VOIP_USER_CONFIGS, JSON.stringify(userMap));

      // ۳. ذخیره در رکورد کاربری (AppUser.voipConfig) جهت همگام‌سازی پایدار در سرور شبکه و نشست‌ها
      const targetId = userObj?.id || userId;
      updateSystemUser(targetId, {
        voipConfig: { ...cleanConfig },
      });
    }

    window.dispatchEvent(
      new CustomEvent('hamibar:voip-config-updated', {
        detail: { userId: userId || 'GLOBAL_DEFAULT', config: cleanConfig },
      })
    );
  } catch (e) {
    console.error('خطا در ذخیره تنظیمات ویپ کاربر:', e);
  }

  return cleanConfig;
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
      (username &&
        userMap[username.toLowerCase()] &&
        Object.keys(userMap[username.toLowerCase()]).length > 0)
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
  const baseUserConfig = getVoipConfig(userOrId);
  const currentConfig: VoipConfig = sanitizeVoipConfig(
    {
      ...baseUserConfig,
      ...(overrideConfig || {}),
    },
    baseUserConfig
  );

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
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch {}
      }, 300);

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
        message: `شماره‌گیری در نرم‌افزار تلفنی (${protocol.toUpperCase()}) برای داخلی ${currentConfig.operatorExtension || '—'} آغاز شد.`,
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

  // اعتبارسنجی پیش از ارسال برای تلفن تحت شبکه (IP Phone CTI)
  if (currentConfig.mode === 'ipphone_cti') {
    if (!currentConfig.ipPhoneIp) {
      return {
        ok: false,
        mode: 'ipphone_cti',
        message:
          'آدرس IP تلفن رومیزی برای کاربری شما ثبت نشده است. از دکمه تنظیمات (⚙️) آی‌پی تلفن خود را وارد کنید.',
      };
    }

    // ارسال مستقیم دستور Action URI از مرورگر اپراتور به تلفن رومیزی در شبکه محلی (LAN)
    const ip = currentConfig.ipPhoneIp;
    try {
      const directCtiUrl =
        currentConfig.ipPhoneModel === 'grandstream'
          ? `http://${ip}/cgi-bin/api-make_call?phonenumber=${encodeURIComponent(dialNumber)}`
          : `http://${ip}/servlet?key=number=${encodeURIComponent(dialNumber)}`;
      fetch(directCtiUrl, { mode: 'no-cors' }).catch(() => null);
    } catch {}
  }

  // اعتبارسنجی پیش از ارسال برای سانترال استریسک / ایزابل (AMI)
  if (currentConfig.mode === 'asterisk_ami') {
    if (!currentConfig.amiHost) {
      return {
        ok: false,
        mode: 'asterisk_ami',
        message:
          'آدرس IP سرور سانترال (AMI Host) در تنظیمات وارد نشده است. لطفاً تنظیمات مرکز تلفن را تکمیل کنید.',
      };
    }
    if (!currentConfig.operatorExtension) {
      return {
        ok: false,
        mode: 'asterisk_ami',
        message: 'شماره داخلی تلفن شما (Extension) جهت زنگ خوردن در سانترال مشخص نشده است.',
      };
    }
  }

  // اعتبارسنجی پیش از ارسال برای وب‌هوک سفارشی
  if (currentConfig.mode === 'webhook' && !currentConfig.webhookUrl) {
    return {
      ok: false,
      mode: 'webhook',
      message: 'آدرس URL وب‌هوک سانترال در تنظیمات شما تعریف نشده است.',
    };
  }

  // حالت‌های ۲ و ۳ و ۴: تماس از طریق سرور سانترال (Asterisk AMI / Issabel / IP Phone / Webhook)
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
    const isSuccess = Boolean(data.ok);

    const log = addVoipCallLog({
      recipientName,
      phoneNumber: dialNumber,
      operatorExtension: currentConfig.operatorExtension,
      mode: currentConfig.mode,
      status: isSuccess ? 'connected' : 'failed',
      message:
        data.message ||
        data.error ||
        (isSuccess ? 'تماس با موفقیت برقرار شد' : 'خطا در برقراری تماس'),
    });

    return {
      ok: isSuccess,
      mode: currentConfig.mode,
      message:
        data.message ||
        data.error ||
        (isSuccess
          ? `تلفن داخلی شما (${currentConfig.operatorExtension}) در حال زنگ خوردن است...`
          : 'خطا در سرور ویپ'),
      details: data.details,
      callLog: log,
    };
  } catch (err: any) {
    // اگر در حالت تلفن تحت شبکه (ipphone_cti) دستور مستقیم مرورگر ارسال شده باشد، حتی در صورت آفلاین بودن بک‌اند، فرمان به گوشی ارسال شده است
    if (currentConfig.mode === 'ipphone_cti' && currentConfig.ipPhoneIp) {
      const log = addVoipCallLog({
        recipientName,
        phoneNumber: dialNumber,
        operatorExtension: currentConfig.operatorExtension,
        mode: 'ipphone_cti',
        status: 'initiated',
        message: `فرمان شماره‌گیری مستقیم به تلفن رومیزی (${currentConfig.ipPhoneIp}) ارسال شد.`,
      });
      return {
        ok: true,
        mode: 'ipphone_cti',
        message: `فرمان شماره‌گیری (${dialNumber}) به تلفن رومیزی (${currentConfig.ipPhoneIp}) ارسال شد.`,
        callLog: log,
      };
    }

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
export async function testVoipConnection(
  config: VoipConfig
): Promise<{ ok: boolean; message: string; details?: any }> {
  const cleanConfig = sanitizeVoipConfig(config, DEFAULT_VOIP_CONFIG);

  if (cleanConfig.mode === 'softphone') {
    return {
      ok: true,
      message: `حالت سافت‌فون (پروتکل ${cleanConfig.softphoneProtocol.toUpperCase()} - داخلی ${cleanConfig.operatorExtension}) آماده به کار است.`,
    };
  }

  const baseUrl = getLanServerBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/voip/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: cleanConfig }),
    });
    const data = await res.json();
    return {
      ok: Boolean(data.ok),
      message: data.message || data.error || 'پاسخی از سرور دریافت نشد.',
      details: data.details,
    };
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
export async function hangupVoipCall(
  overrideConfig?: Partial<VoipConfig>,
  userOrId?: AppUser | string | null
): Promise<{ ok: boolean; message: string }> {
  const baseUserConfig = getVoipConfig(userOrId);
  const currentConfig: VoipConfig = sanitizeVoipConfig(
    {
      ...baseUserConfig,
      ...(overrideConfig || {}),
    },
    baseUserConfig
  );

  // ارسال مستقیم دستور قطع به گوشی یالینک/گرنداستریم در شبکه محلی (در صورت دسترسی مستقیم مرورگر) + ارسال به سرور
  if (currentConfig.mode === 'ipphone_cti' && currentConfig.ipPhoneIp) {
    const ip = currentConfig.ipPhoneIp.trim();
    try {
      if (currentConfig.ipPhoneModel === 'grandstream') {
        fetch(`http://${ip}/cgi-bin/api-phone_operation?cmd=endcall`, { mode: 'no-cors' }).catch(
          () => null
        );
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


