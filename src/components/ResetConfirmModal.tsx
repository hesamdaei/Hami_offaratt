import { FC } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmResetDefaults: () => void;
  onConfirmClearAll: () => void;
}

export const ResetConfirmModal: FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmResetDefaults,
  onConfirmClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-rose-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              بازنشانی یا پاک‌سازی اطلاعات
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            لطفاً مشخص فرمایید مایل به بازگردانی رانندگان نمونه اولیه (حامی بار) هستید یا می‌خواهید کلیه اطلاعات کاملاً خالی شود:
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                onConfirmResetDefaults();
                onClose();
              }}
              className="w-full text-right p-3.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition flex flex-col gap-1"
            >
              <span className="text-xs font-bold text-amber-900">
                🔄 بازنشانی به داده‌های نمونه پیش‌فرض
              </span>
              <span className="text-[11px] text-amber-700">
                لیست ۴۲ راننده پیش‌فرض و روزهای نمونه لود خواهد شد.
              </span>
            </button>

            <button
              onClick={() => {
                onConfirmClearAll();
                onClose();
              }}
              className="w-full text-right p-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition flex flex-col gap-1"
            >
              <span className="text-xs font-bold text-rose-900">
                🗑️ پاک‌سازی کامل دیتابیس
              </span>
              <span className="text-[11px] text-rose-700">
                تمامی رانندگان و گزارش‌های حضور و غیاب به طور کامل پاک می‌شوند.
              </span>
            </button>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
