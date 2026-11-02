import { AppUser } from '../types/auth';
import { isMasterAdmin } from './authService';
import { recordAuditLog } from './auditLogger';

export interface ExcelSecurityResult {
  allowed: boolean;
  errorMessage?: string;
}

/**
 * بررسی دسترسی مجاز برای دریافت و استخراج گزارش‌های اکسل
 * طبق الزام امنیتی فاز ۶: تمام گزارش‌های مدیریتی Excel منحصراً برای نقش «مدیر ارشد» مجاز می‌باشد.
 */
export function canExportExcel(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return isMasterAdmin(user);
}

/**
 * اعتبارسنجی قطعی در لایه اجرا (Execution Boundary)
 * در صورت عدم داشتن دسترسی مدیر ارشد، اقدام به ثبت لاگ امنیتی کرده و خطا پرتاب می‌کند.
 */
export function assertMasterAdminExcelPermission(
  user: AppUser | null | undefined,
  reportName: string = 'گزارش اکسل',
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void
): boolean {
  if (!canExportExcel(user)) {
    const message = `خطای دسترسی: دریافت و تولید گزارش‌های اکسل (${reportName}) منحصراً در اختیار نقش «مدیر ارشد» سامانه می‌باشد.`;
    // ثبت تلاش غیرمجاز در دفتر وقایع امنیتی
    try {
      recordAuditLog(user, {
        module: 'SECURITY',
        action: 'SECURITY_ACCESS_DENIED',
        title: 'تلاش غیرمجاز برای دانلود اکسل',
        severity: 'WARNING',
        description: `تلاش غیرمجاز برای دریافت گزارش اکسل «${reportName}» توسط کاربر بدون نقش مدیر ارشد مسدود گردید.`,
      });
    } catch (e) {
      console.warn('Could not record security audit log for excel export rejection:', e);
    }

    if (onShowToast) {
      onShowToast(message, 'error');
      return false;
    }

    const err = new Error(message);
    err.name = 'SecurityAccessDeniedError';
    throw err;
  }
  return true;
}
