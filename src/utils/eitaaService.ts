import { toFaDigits, getTodayJalaali } from './jalaali';

export interface EitaaTemplateContext {
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

export interface EitaaMessageTemplate {
  id: string;
  title: string;
  description: string;
  category: 'shift' | 'mission' | 'oil_service' | 'documents' | 'attendance' | 'settlement' | 'general';
  categoryLabel: string;
  icon: string;
  template: string;
}

export interface EitaaHistoryItem {
  id: string;
  recipientName: string;
  recipientPhone?: string;
  templateTitle: string;
  messageText: string;
  sentAt: string;
  sentMethod: 'eitaa_web' | 'clipboard' | 'bot' | 'native_share';
}

export interface EitaaBotConfig {
  botToken: string;
  channelOrChatId: string;
  isEnabled: boolean;
}

export const EITAA_MESSAGE_TEMPLATES: EitaaMessageTemplate[] = [
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
لطفاً در اولین فرصت و پیش از اعزام به سرویس بعدی به تعمیرگاه مرکزی شرکت مراجعه فرمایید.
تعویض به موقع روغن و فیلترها تضمین سلامت موتور خودروی شماست.

واحد نظارت فنی ناوگان {companyName}`,
  },
  {
    id: 'documents_expiry',
    title: 'یادآوری انقضای مدارک، گواهینامه یا بیمه',
    description: 'اعلام پایان اعتبار مدارک قانونی راننده یا خودرو',
    category: 'documents',
    categoryLabel: 'مدارک و تمدید',
    icon: 'FileText',
    template: `یادآوری اداری و تمدید مدارک 📄
همکار گرامی جناب آقای {driverName}
بدینوسیله به اطلاع می‌رساند با توجه به پایش سیستم جامع، تاریخ اعتبار مدارک پرونده شما در حال انقضا می‌باشد:
📌 وضعیت: {notes}

خواهشمند است حداکثر تا ۳ روز کاری آینده، تصویر تمدید مدارک را به واحد امور اداری تحویل یا در سامانه بارگذاری نمایید تا از مسدود شدن نوبت کاری جلوگیری شود.

امور اداری و رفاه رانندگان {companyName}`,
  },
  {
    id: 'attendance_notice',
    title: 'اطلاعیه وضعیت حضور و غیاب / شیفت',
    description: 'اعلام ثبت وضعیت غیبت، مرخصی یا تأخیر',
    category: 'attendance',
    categoryLabel: 'حضور و غیاب',
    icon: 'UserCheck',
    template: `جناب آقای {driverName} با سلام ⏱️
وضعیت حضور شما در تاریخ {date} به شرح زیر در دفتر آمار و حضور رانندگان ثبت گردید:
📋 وضعیت: {notes}

در صورت هرگونه مغایرت یا نیاز به ثبت مرخصی استحقاقی، لطفاً با سرپرست شیفت ({dispatcherName}) هماهنگ نمایید.
واحد منابع انسانی {companyName}`,
  },
  {
    id: 'trip_settlement',
    title: 'صورت‌حساب و اعلام تسویه مأموریت',
    description: 'خلاصه ساعات کارکرد و مبالغ کرایه و کارگر',
    category: 'settlement',
    categoryLabel: 'مالی و تسویه',
    icon: 'DollarSign',
    template: `صورت‌حساب مأموریت باربری 🧾💰
راننده محترم: {driverName} (کد: {vehicleCode})
تاریخ مأموریت: {date}
مقصد: {destination}

💵 مجموع صورت‌حساب مأموریت: {settlementAmount} تومان
توضیحات: {notes}
این مبلغ طبق ضوابط مالی شرکت در پایان دوره تسویه خواهد شد.
واحد حسابداری و دیسپچ {companyName}`,
  },
  {
    id: 'general_notice',
    title: 'بخشنامه و اطلاعیه عمومی رانندگان',
    description: 'ارسال مقررات، نکات ایمنی و پیام‌های عمومی',
    category: 'general',
    categoryLabel: 'عمومی و بخشنامه‌ها',
    icon: 'Sparkles',
    template: `اطلاعیه سراسری ناوگان باربری 📢🚛
همکاران محترم راننده و ناوگان شرکت {companyName}

با سلام و احترام،
{notes}

رعایت استانداردهای ایمنی، برخورد محترمانه با مشتریان و همراه داشتن برگه تعرفه مصوب الزامی است.
مدیریت ترابری و لجستیک`,
  },
];

/**
 * Fills template placeholders with actual context values
 */
export function fillEitaaTemplate(
  templateStr: string,
  ctx: EitaaTemplateContext
): string {
  const defaultCompanyName = 'صداقت بار';
  const defaultDispatcherName = 'دیسپچ مرکزی';
  const today = getTodayJalaali().fullFa;

  let res = templateStr;
  res = res.replace(/{driverName}/g, ctx.driverName || 'راننده گرامی');
  res = res.replace(/{driverPhone}/g, ctx.driverPhone || '');
  res = res.replace(/{driverCode}/g, ctx.driverCode || '—');
  res = res.replace(/{plateNumber}/g, ctx.plateNumber || '—');
  res = res.replace(/{vehicleCode}/g, ctx.vehicleCode ? String(ctx.vehicleCode) : '—');
  res = res.replace(/{vehicleType}/g, ctx.vehicleType || 'کامیونت');
  res = res.replace(/{queueNumber}/g, ctx.queueNumber ? toFaDigits(ctx.queueNumber) : '۱');
  res = res.replace(/{date}/g, ctx.date || today);
  res = res.replace(/{time}/g, ctx.time || '۰۸:۰۰');
  res = res.replace(/{mileage}/g, ctx.mileage ? toFaDigits(ctx.mileage) : '—');
  res = res.replace(/{destination}/g, ctx.destination || 'مسیر درون‌شهری تهران');
  res = res.replace(/{cargo}/g, ctx.cargo || 'اثاثیه منزل و اداری');
  res = res.replace(/{workerCount}/g, ctx.workerCount ? toFaDigits(ctx.workerCount) : '۲');
  res = res.replace(/{settlementAmount}/g, ctx.settlementAmount ? toFaDigits(ctx.settlementAmount) : '—');
  res = res.replace(/{notes}/g, ctx.notes || 'کلیه ضوابط ایمنی رعایت شود.');
  res = res.replace(/{dispatcherName}/g, ctx.dispatcherName || defaultDispatcherName);
  res = res.replace(/{companyName}/g, ctx.companyName || defaultCompanyName);

  return res;
}

/**
 * Generates Eitaa Web direct share link:
 * https://eitaa.com/share/url?text=...
 * In Eitaa Web and desktop/mobile client, this prompts recipient selection and inserts the text into chat!
 */
export function getEitaaShareUrl(message: string): string {
  const encodedText = encodeURIComponent(message);
  return `https://eitaa.com/share/url?text=${encodedText}`;
}

/**
 * Generates direct chat or profile link in Eitaa
 */
export function getEitaaDirectUrl(usernameOrPhone: string): string {
  const cleaned = usernameOrPhone.replace(/[^0-9a-zA-Z_]/g, '');
  if (!cleaned) return 'https://web.eitaa.com/';
  // If phone number starts with 09..., Eitaa link or web interface
  return `https://eitaa.com/${cleaned}`;
}

/**
 * Open Eitaa Web in a new tab with pre-filled message
 */
export function openEitaaWeb(message: string): void {
  const url = getEitaaShareUrl(message);
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
    // Fallback for older browsers
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
 * Share via native Web Share API if supported
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

// Storage keys
const EITAA_HISTORY_STORAGE_KEY = 'sedaghat_eitaa_history_v1';
const EITAA_BOT_STORAGE_KEY = 'sedaghat_eitaa_bot_config_v1';

/**
 * Get message history from localStorage
 */
export function getEitaaHistory(): EitaaHistoryItem[] {
  try {
    const raw = localStorage.getItem(EITAA_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EitaaHistoryItem[];
  } catch {
    return [];
  }
}

/**
 * Save new sent message to history
 */
export function saveEitaaHistoryItem(item: Omit<EitaaHistoryItem, 'id' | 'sentAt'>): EitaaHistoryItem {
  const history = getEitaaHistory();
  const newItem: EitaaHistoryItem = {
    ...item,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sentAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + getTodayJalaali().fullFa,
  };

  const updated = [newItem, ...history].slice(0, 50); // keep last 50
  try {
    localStorage.setItem(EITAA_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save eitaa history', e);
  }
  return newItem;
}

/**
 * Clear history
 */
export function clearEitaaHistory(): void {
  try {
    localStorage.removeItem(EITAA_HISTORY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear eitaa history', e);
  }
}

/**
 * Get Eitaa Bot config
 */
export function getEitaaBotConfig(): EitaaBotConfig {
  try {
    const raw = localStorage.getItem(EITAA_BOT_STORAGE_KEY);
    if (!raw) {
      return { botToken: '', channelOrChatId: '', isEnabled: false };
    }
    return JSON.parse(raw);
  } catch {
    return { botToken: '', channelOrChatId: '', isEnabled: false };
  }
}

/**
 * Save Eitaa Bot config
 */
export function saveEitaaBotConfig(config: EitaaBotConfig): void {
  try {
    localStorage.setItem(EITAA_BOT_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save eitaa bot config', e);
  }
}

/**
 * Send message via official Eitaa Bot API
 * Method: https://eitaa.com/api/{bot_token}/sendMessage
 */
export async function sendEitaaBotMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  if (!token || !chatId) {
    return { success: false, message: 'توکن ربات یا شناسه چت ایتا تنظیم نشده است.' };
  }

  try {
    const url = `https://eitaa.com/api/${encodeURIComponent(token)}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, message: 'پیام با موفقیت توسط ربات ایتا ارسال شد.' };
    } else {
      return { success: false, message: data.description || 'خطا در ارسال پیام توسط ربات ایتا' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'عدم برقراری ارتباط با سرور ایتا (ممکن است به دلیل محدودیت CORS مرورگر باشد؛ از ارسال مستقیم وب ایتا استفاده نمایید).',
    };
  }
}
