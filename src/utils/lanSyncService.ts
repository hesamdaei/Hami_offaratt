/**
 * سرویس همگام‌سازی شبکه محلی و دیتابیس متمرکز (LAN Sync Service)
 * ارتباط بلادرنگ کلاینت‌ها با سرور متمرکز جهت ذخیره‌سازی و اشتراک‌گذاری داده‌ها در شبکه
 */

export interface LanServerStatus {
  isConnected: boolean;
  name?: string;
  hostname?: string;
  port?: number;
  localIps?: Array<{ interface: string; address: string }>;
  hasData?: boolean;
  lastSaved?: string | null;
  serverTime?: string;
  version?: string;
  stats?: {
    driversCount: number;
    vehiclesCount: number;
    staffCount: number;
    lastSaved: string | null;
  } | null;
}

export interface SharedLanDatabasePayload {
  drivers: any[];
  records: Record<string, any>;
  vehicles: any[];
  driverDirectory: any[];
  staffMembers: any[];
  staffRecords: Record<string, any>;
  rules?: any;
  regulations?: any;
  affidavit?: string;
  rates?: any;
  trackings?: any;
  gpsVehicles?: any;
  savedBy?: string;
  version?: string;
  lastSavedAt?: string;
}

export interface LanSaveResponse {
  ok: boolean;
  version?: string;
  savedAt?: string;
  error?: string;
}

export interface LanVersionResponse {
  isConnected: boolean;
  version?: string;
  lastSavedAt?: string;
}

export const STORAGE_KEY_CUSTOM_SERVER = 'hamibar_custom_lan_server_v1';

/**
 * دریافت آدرس پایه سرور شبکه
 * در مرورگر به صورت پیش‌فرض آدرس همان صفحه (/api/...) است، مگر آنکه کاربر در پنجره اشتراک شبکه،
 * IP یک سرور اختصاصی دیگر را ثبت کرده باشد.
 */
export function getLanServerBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000';

  try {
    const custom = localStorage.getItem(STORAGE_KEY_CUSTOM_SERVER);
    if (custom && custom.trim().length > 0) {
      let trimmed = custom.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = `http://${trimmed}`;
      }
      return trimmed.replace(/\/+$/, '');
    }
  } catch {}

  // در مرورگر عادی از آدرس جاری استفاده می‌کنیم
  if (window.location && window.location.origin && window.location.origin.startsWith('http')) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

export function setCustomLanServerUrl(url: string | null) {
  try {
    if (!url || url.trim().length === 0) {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_SERVER);
    } else {
      let clean = url.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
      }
      localStorage.setItem(STORAGE_KEY_CUSTOM_SERVER, clean.replace(/\/+$/, ''));
    }
  } catch {}
}

export function getCustomLanServerUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_SERVER) || '';
  } catch {
    return '';
  }
}

/**
 * بررسی دسترسی‌پذیری و وضعیت سرور شبکه محلی
 */
export async function checkLanServerStatus(): Promise<LanServerStatus> {
  const baseUrl = getLanServerBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${baseUrl}/api/lan/status`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isConnected: true,
        name: data.name,
        hostname: data.hostname,
        port: data.port,
        localIps: data.localIps || [],
        hasData: data.hasData,
        lastSaved: data.lastSavedAt || data.stats?.lastSaved,
        serverTime: data.timestamp,
        version: data.version,
        stats: data.stats,
      };
    }
  } catch {
    // سرور در دسترس نیست
  }

  return {
    isConnected: false,
  };
}

/**
 * استعلام سریع و سبک نسخه دیتابیس (بدون انتقال حجم زیاد دیتا)
 * برای بررسی دوره‌ای تغییرات انجام شده توسط سایر سیستم‌ها در شبکه
 */
export async function checkLanServerVersion(): Promise<LanVersionResponse> {
  const baseUrl = getLanServerBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${baseUrl}/api/lan/version`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isConnected: true,
        version: data.version,
        lastSavedAt: data.lastSavedAt,
      };
    }
  } catch {}

  return { isConnected: false };
}

/**
 * دریافت اطلاعات دیتابیس مشترک از سرور
 */
export async function fetchSharedLanDatabase(): Promise<SharedLanDatabasePayload | null> {
  const baseUrl = getLanServerBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let res = await fetch(`${baseUrl}/api/lan/db`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${baseUrl}/api/db`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const json = await res.json();
      if (json.ok && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('عدم موفقیت در دریافت دیتابیس از سرور:', err);
  }
  return null;
}

/**
 * ذخیره داده‌های مشترک در دیتابیس سرور شبکه
 */
export async function saveSharedLanDatabase(payload: SharedLanDatabasePayload): Promise<LanSaveResponse> {
  const baseUrl = getLanServerBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const bodyStr = JSON.stringify({
      ...payload,
      clientTimestamp: new Date().toISOString(),
    });

    let res = await fetch(`${baseUrl}/api/lan/db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: bodyStr,
      signal: controller.signal,
    }).catch(() => null);

    // Fallback to /api/db if /api/lan/db failed or returned 404
    if (!res || !res.ok) {
      res = await fetch(`${baseUrl}/api/db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: bodyStr,
        signal: controller.signal,
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const json = await res.json();
      return {
        ok: !!json.ok,
        version: json.version,
        savedAt: json.savedAt || new Date().toISOString(),
      };
    } else if (res) {
      const errorJson = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: errorJson.error || `خطای سرور (${res.status})`,
      };
    }
  } catch (err: any) {
    console.warn('عدم ذخیره‌سازی در سرور شبکه (حالت آفلاین):', err);
    return {
      ok: false,
      error: err.message || 'خطای ارتباط با سرور شبکه',
    };
  }

  return {
    ok: false,
    error: 'سرور شبکه در دسترس نیست',
  };
}
