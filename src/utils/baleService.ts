import { toFaDigits, getTodayJalaali } from './jalaali';

export interface BaleTemplateContext {
  driverName?: string;
  driverPhone?: string;
  driverCode?: string;
  plateNumber?: string;
  vehicleCode?: string | number;
  vehicleType?: string;
  queueNumber?: number | string;
  date?: string;
  time?: string;
  mileage?: number | string;
  destination?: string;
  cargo?: string;
  workerCount?: number | string;
  settlementAmount?: string;
  notes?: string;
  dispatcherName?: string;
  companyName?: string;
}

export interface BaleMessageTemplate {
  id: string;
  title: string;
  description: string;
  category: 'shift' | 'mission' | 'oil_service' | 'documents' | 'attendance' | 'settlement' | 'general';
  categoryLabel: string;
  icon: string;
  template: string;
}

export interface BaleHistoryItem {
  id: string;
  recipientName: string;
  recipientPhone?: string;
  templateTitle: string;
  messageText: string;
  sentAt: string;
  sentMethod: 'bale_web' | 'clipboard' | 'bot' | 'native_share';
}

export interface BaleBotConfig {
  botToken: string;
  channelOrChatId: string;
  isEnabled: boolean;
}

export const BALE_MESSAGE_TEMPLATES: BaleMessageTemplate[] = [
  {
    id: 'shift_queue',
    title: 'اعلام شیفت کاری و نوبت بارگیری',
    description: 'اطلاع‌رسانی شماره نوبت و ساعت حضور در پایانه/پارکینگ',
    category: 'shift',
    categoryLabel: 'شیفت و نوبت‌دهی',
    icon: 'Calendar',
    template: `سلام و احترام جناب آقای {driverName} عزیز 🌺
راننده محترم خودرو {vehicleType} به شماره پلاک {plateNumber} (کد: {vehicleCode})

📌 نوبت بارگیری شما در سامانه ثبت شد:
🔢 شماره نوبت: {queueNumber}
📅 تاریخ: {date}
⏰ ساعت حضور در پایانه: {time}

لطفاً رأس ساعت مقرر در محل بارگیری حضور به هم رسانید و سوییچ خودرو را از دیسپچ تحویل بگیرید.
با آرزوی سفری امن و پربرکت 🚛
واحد دیسپچ و ترابری {companyName}`,
  },
  {
    id: 'new_mission',
    title: 'ابلاغ مأموریت و اعزام به سرویس جدید',
    description: 'مشخصات بار، آدرس مقصد و تعداد کارگر اعزامی',
    category: 'mission',
    categoryLabel: 'اعزام و باربری',
    icon: 'Truck',
    template: `راننده گرامی جناب آقای {driverName} 📦
سرویس جدید باربری به شما اختصاص یافت:

🚚 خودرو: {vehicleType} - پلاک {plateNumber}
📍 مسیر / مقصد: {destination}
📦 نوع بار: {cargo}
👥 تعداد کارگر همراه: {workerCount} نفر
⏰ ساعت شروع به کار: {time} - تاریخ: {date}
📝 نکات و هماهنگی: {notes}

لطفاً پس از تحویل بار و پایان کار، برگه امضا شده بارنامه را ثبت نمایید.
باتشکر - دیسپچ {companyName}`,
  },
  {
    id: 'oil_service_alert',
    title: 'هشدار فوری موعد تعویض روغن و سرویس فنی',
    description: 'اطلاع‌رسانی عبور از حد مجاز کارکرد و مراجعه به تعمیرگاه',
    category: 'oil_service',
    categoryLabel: 'تعویض روغن و فنی',
    icon: 'Droplet',
    template: `هشدار مهم فنی و نگهداری ناوگان ⚠️🛢️
راننده محترم: {driverName}
کد خودرو: {vehicleCode} | پلاک: {plateNumber}

با توجه به بررسی کارکرد کیلومترشمار (کیلومتر فعلی: {mileage})، موعد سرویس دوره‌ای و تعویض روغن خودروی شما فرا رسیده است.
خواهشمند است در اسرع وقت جهت انجام سرویس فنی روغن موتور و فیلترها به واحد تعمیرگاه ترابری مراجعه نمایید.
سلامت و امنیت ناوگان اولویت ماست 🔧
مدیریت ترابری {companyName}`,
  },
  {
    id: 'leave_approval',
    title: 'تأییدیه درخواست مرخصی / ثبت تردد',
    description: 'اطلاع‌رسانی تأیید مرخصی ثبت‌شده در تابلوی حضور و غیاب',
    category: 'attendance',
    categoryLabel: 'حضور و غیاب',
    icon: 'UserCheck',
    template: `همکار گرامی: {driverName} 📋
به اطلاع می‌رساند وضعیت مرخصی شما در تاریخ {date} در سامانه ترابری به صورت رسمی ثبت و تأیید شد.

✅ نوع وضعیت: مرخصی تأیید شده
📅 بازه زمانی: {date}
باتشکر از هماهنگی شما با واحد کارگزینی و دیسپچ {companyName}`,
  },
  {
    id: 'settlement_notice',
    title: 'صورت‌حساب و اعلام تسویه کارکرد راننده',
    description: 'اطلاع‌رسانی تسویه حساب، دستمزد کارکرد و کمیسیون',
    category: 'settlement',
    categoryLabel: 'مالی و تسویه',
    icon: 'FileText',
    template: `راننده محترم جناب آقای {driverName} 💳
خلاصه تسویه حساب کارکرد دوره‌ای شما محاسبه گردید:

💰 مبلغ قابل پرداخت: {settlementAmount} ریال
📅 تاریخ محاسبه: {date}
کد خودرو: {vehicleCode}

جهت دریافت برگه مالی یا رسید بانکی به امور مالی دیسپچ مراجعه فرمایید.
امور مالی و حسابداری {companyName}`,
  },
  {
    id: 'disciplinary_notice',
    title: 'ابلاغیه آیین‌نامه انضباطی و تذکر اداری',
    description: 'ارسال ضوابط و تذکرات انضباطی به رانندگان و پرسنل',
    category: 'documents',
    categoryLabel: 'آیین‌نامه انضباطی',
    icon: 'BookOpen',
    template: `ابلاغیه انضباطی و یادآوری ضوابط کاری 📜
مخاطب: {driverName}

همکار گرامی، بر اساس آیین‌نامه انضباطی سامانه ترابری، رعایت نکات زیر الزامی می‌باشد:
{notes}

رعایت قوانین، ضامن نظم کاری و رضایت مشتریان است.
کمیته انضباطی و مدیریت ترابری {companyName}`,
  },
  {
    id: 'custom_message',
    title: 'پیام آزاد و یادداشت اختصاصی به راننده',
    description: 'نگارش آزادانه پیام با سربرگ رسمی دیسپچ',
    category: 'general',
    categoryLabel: 'پیام عمومی',
    icon: 'MessageSquare',
    template: `سلام و عرض ادب جناب {driverName} گرامی 🌺
کد خودرو: {vehicleCode} | پلاک: {plateNumber}

{notes}

با احترام
دیسپچ مرکزی {companyName} - {dispatcherName}`,
  },
];

/**
 * Fills placeholders in Bale template with contextual entity information
 */
export function fillBaleTemplate(
  templateStr: string,
  ctx: BaleTemplateContext,
  defaultCompanyName = 'سامانه حامی',
  defaultDispatcherName = 'دیسپچ مرکزی'
): string {
  const today = getTodayJalaali().fullFa;

  let res = templateStr;
  res = res.replace(/{driverName}/g, ctx.driverName || 'همکار گرامی');
  res = res.replace(/{vehicleType}/g, ctx.vehicleType || 'خاور / کامیونت');
  res = res.replace(/{plateNumber}/g, ctx.plateNumber || '—');
  res = res.replace(/{vehicleCode}/g, ctx.vehicleCode ? toFaDigits(ctx.vehicleCode) : '—');
  res = res.replace(/{queueNumber}/g, ctx.queueNumber ? toFaDigits(ctx.queueNumber) : '۱');
  res = res.replace(/{date}/g, ctx.date || today);
  res = res.replace(/{time}/g, ctx.time || '۰۸:۰۰');
  res = res.replace(/{mileage}/g, ctx.mileage ? toFaDigits(ctx.mileage) : '—');
  res = res.replace(/{destination}/g, ctx.destination || 'مسیر درون‌شهری');
  res = res.replace(/{cargo}/g, ctx.cargo || 'اثاثیه منزل و لوازم اداری');
  res = res.replace(/{workerCount}/g, ctx.workerCount ? toFaDigits(ctx.workerCount) : '۲');
  res = res.replace(/{settlementAmount}/g, ctx.settlementAmount ? toFaDigits(ctx.settlementAmount) : '—');
  res = res.replace(/{notes}/g, ctx.notes || 'کلیه ضوابط ایمنی رعایت شود.');
  res = res.replace(/{dispatcherName}/g, ctx.dispatcherName || defaultDispatcherName);
  res = res.replace(/{companyName}/g, ctx.companyName || defaultCompanyName);

  return res;
}

/**
 * Generates Bale Web direct share link:
 * https://ble.ir/share/url?text=...
 * In Bale Web and desktop/mobile client, this prompts recipient selection and inserts the text into chat!
 */
export function getBaleShareUrl(message: string): string {
  const encodedText = encodeURIComponent(message);
  return `https://ble.ir/share/url?text=${encodedText}`;
}

/**
 * Generates direct chat or profile link in Bale:
 * https://ble.ir/{username}
 */
export function getBaleDirectUrl(usernameOrPhone: string): string {
  const cleaned = usernameOrPhone.replace(/[^0-9a-zA-Z_]/g, '');
  if (!cleaned) return 'https://web.bale.ai/';
  return `https://ble.ir/${cleaned}`;
}

/**
 * Open Bale Web in a new tab with pre-filled message
 */
export function openBaleWeb(message: string): void {
  const url = getBaleShareUrl(message);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Copy text to clipboard with modern fallback
 */
export async function copyMessageToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Clipboard copy error:', err);
    return false;
  }
}

/**
 * Trigger native Web Share API if supported on device
 */
export async function shareViaWebShare(title: string, text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

const BALE_HISTORY_STORAGE_KEY = 'hamibar_bale_history_v1';
const BALE_BOT_STORAGE_KEY = 'hamibar_bale_bot_config_v1';

/**
 * Get dispatch history from localStorage
 */
export function getBaleHistory(): BaleHistoryItem[] {
  try {
    const raw = localStorage.getItem(BALE_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save new item to Bale dispatch history
 */
export function saveBaleHistoryItem(item: Omit<BaleHistoryItem, 'id' | 'sentAt'>): BaleHistoryItem {
  const history = getBaleHistory();
  const newItem: BaleHistoryItem = {
    ...item,
    id: `bale-hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sentAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  };

  const updated = [newItem, ...history.slice(0, 49)];
  try {
    localStorage.setItem(BALE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save bale history', e);
  }
  return newItem;
}

/**
 * Clear dispatch history
 */
export function clearBaleHistory(): void {
  try {
    localStorage.removeItem(BALE_HISTORY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear bale history', e);
  }
}

/**
 * Read Bale Bot Configuration
 */
export function getBaleBotConfig(): BaleBotConfig {
  try {
    const raw = localStorage.getItem(BALE_BOT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        botToken: parsed.botToken || '',
        channelOrChatId: parsed.channelOrChatId || '',
        isEnabled: Boolean(parsed.isEnabled),
      };
    }
  } catch {
    // fallback
  }

  return {
    botToken: '',
    channelOrChatId: '',
    isEnabled: false,
  };
}

/**
 * Save Bale Bot Configuration
 */
export function saveBaleBotConfig(config: BaleBotConfig): void {
  try {
    localStorage.setItem(BALE_BOT_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save bale bot config', e);
  }
}

/**
 * Send message via Bale Bot API
 * Endpoint: https://tapi.bale.ai/bot<token>/sendMessage
 * Payload: { chat_id: string | number, text: string }
 */
export async function sendBaleBotMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  if (!token.trim() || !chatId.trim() || !text.trim()) {
    return { success: false, message: 'توکن ربات، شناسه چت و متن پیام الزامی است.' };
  }

  try {
    // Try server-side secure proxy first to prevent token leakage
    try {
      const serverProxyRes = await fetch('/api/v1/messenger/bale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: text.trim(),
          token: token.trim(),
        }),
      });
      if (serverProxyRes.ok) {
        const proxyData = await serverProxyRes.json();
        if (proxyData.ok) {
          return { success: true, message: 'پیام با موفقیت از طریق پروکسی امن سرور ارسال شد.' };
        }
      }
    } catch {
      // Fallback to direct client call if server is unreachable
    }

    const cleanToken = token.trim().replace(/^bot/i, '');
    const url = `https://tapi.bale.ai/bot${encodeURIComponent(cleanToken)}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: text.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `خطای سرور بله (${response.status}): ${errorText.slice(0, 120)}`,
      };
    }

    const data = await response.json();
    if (data.ok) {
      return { success: true, message: 'پیام با موفقیت از طریق ربات بله ارسال گردید.' };
    } else {
      return { success: false, message: data.description || 'پاسخ ناموفق از سرور ربات بله.' };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `خطا در ارتباط با سرور بله: ${msg.slice(0, 100)}`,
    };
  }
}

/**
 * Generate a 5-digit cryptographically strong Bale verification code for Login
 */
const BALE_OTP_STORAGE_KEY = 'hamibar_bale_pending_otp';

export interface PendingBaleOtp {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

export function generateBaleLoginOtp(phone: string): { code: string; expiresAt: number } {
  let randomNum = Math.floor(10000 + Math.random() * 90000);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    randomNum = 10000 + (arr[0] % 90000);
  }
  const code = String(randomNum);
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes validity

  const otpData: PendingBaleOtp = {
    phone: phone.replace(/[^0-9]/g, ''),
    code,
    expiresAt,
    attempts: 0,
  };

  try {
    sessionStorage.setItem(BALE_OTP_STORAGE_KEY, JSON.stringify(otpData));
  } catch {
    // fallback
  }

  return { code, expiresAt };
}

export function verifyBaleLoginOtp(phone: string, inputCode: string): boolean {
  try {
    const raw = sessionStorage.getItem(BALE_OTP_STORAGE_KEY);
    if (!raw) return false; // Strictly reject when no OTP has been generated

    const data: PendingBaleOtp = JSON.parse(raw);
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Max 3 attempts
    data.attempts = (data.attempts || 0) + 1;
    if (data.attempts > 3) {
      sessionStorage.removeItem(BALE_OTP_STORAGE_KEY);
      return false;
    }
    sessionStorage.setItem(BALE_OTP_STORAGE_KEY, JSON.stringify(data));

    if (Date.now() > data.expiresAt) {
      sessionStorage.removeItem(BALE_OTP_STORAGE_KEY);
      return false;
    }

    if (data.phone && cleanPhone && data.phone !== cleanPhone) {
      return false;
    }

    // Strict verification - public 12345 backdoor is removed completely!
    if (data.code === inputCode.trim()) {
      sessionStorage.removeItem(BALE_OTP_STORAGE_KEY);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
