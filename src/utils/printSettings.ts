/**
 * Laser Printer Optimization & Customizable Watermark Settings
 * Centralized settings for high-contrast, zero-toner-waste printing on laser printers.
 */

export interface PrintWatermarkSettings {
  enabled: boolean;
  text: string;
  subText: string;
  opacity: number; // 0.02 - 0.10 (faint for laser toner)
  fontSizePt: number;
  laserMode: boolean; // true = pure monochrome high-contrast, zero graphic background fills
  companyTitle?: string;
}

export const DEFAULT_PRINT_SETTINGS: PrintWatermarkSettings = {
  enabled: true,
  text: 'ابلاغیه رسمی',
  subText: 'سامانه یکپارچه حمل و نقل و ترابری',
  opacity: 0.04,
  fontSizePt: 65,
  laserMode: true,
  companyTitle: '',
};

export const WATERMARK_PRESETS = [
  { label: 'ابلاغیه رسمی', text: 'ابلاغیه رسمی', subText: 'OFFICIAL DIRECTIVE' },
  { label: 'محرمانه و اداری', text: 'محرمانه و اداری', subText: 'CONFIDENTIAL' },
  { label: 'نسخه بایگانی دیسپچ', text: 'نسخه بایگانی دیسپچ', subText: 'DISPATCH ARCHIVE' },
  { label: 'پیش‌نویس غیر قابل استناد', text: 'پیش‌نویس موقت', subText: 'DRAFT COPY' },
  { label: 'تأییدیه امور مالی', text: 'تأییدیه مالی و حسابداری', subText: 'FINANCIAL APPROVAL' },
  { label: 'صورت‌حساب رسمی', text: 'صورتحساب رسمی', subText: 'OFFICIAL INVOICE' },
  { label: 'بارنامه معتبر', text: 'بارنامه رسمی جاده‌ای', subText: 'OFFICIAL WAYBILL' },
];

export const STORAGE_KEY_PRINT_SETTINGS = 'hamibar_laser_print_settings_v1';

/**
 * Retrieve user-registered print and watermark preferences from localStorage
 */
export function getStoredPrintSettings(): PrintWatermarkSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PRINT_SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_PRINT_SETTINGS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Error loading print settings:', e);
  }
  return DEFAULT_PRINT_SETTINGS;
}

/**
 * Save user watermark and laser print settings to localStorage
 */
export function saveStoredPrintSettings(settings: PrintWatermarkSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRINT_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving print settings:', e);
  }
}
