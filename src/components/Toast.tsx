import { FC, useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
  duration?: number;
}

export const Toast: FC<ToastProps> = ({ toast, onClose, duration = 3500 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const onCloseRef = useRef(onClose);

  // Keep onClose reference up to date without triggering timer restarts
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle toast appearance and reliable auto-dismissal
  useEffect(() => {
    if (!toast) {
      setIsVisible(false);
      setIsExiting(false);
      return;
    }

    // New toast arrived
    setIsVisible(true);
    setIsExiting(false);

    // Auto-dismiss countdown timer
    const dismissTimer = setTimeout(() => {
      // Start exit animation
      setIsExiting(true);

      // Remove after transition finishes
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
        onCloseRef.current();
      }, 300);

      return () => clearTimeout(removeTimer);
    }, Math.max(1500, duration));

    return () => {
      clearTimeout(dismissTimer);
    };
  }, [toast?.id, toast?.message, duration]);

  const handleManualClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onCloseRef.current();
    }, 250);
  };

  if (!toast || !isVisible) return null;

  return (
    <div
      dir="rtl"
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-6 left-6 z-[9999] transition-all duration-300 ease-out select-none ${
        isExiting
          ? 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <div
        className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold max-w-md overflow-hidden backdrop-blur-xl ${
          toast.type === 'success'
            ? 'bg-[#061715]/95 text-emerald-100 border-emerald-500/40 shadow-emerald-950/50'
            : toast.type === 'error'
            ? 'bg-[#1e0a12]/95 text-rose-100 border-rose-500/40 shadow-rose-950/50'
            : 'bg-[#0f172a]/95 text-slate-100 border-slate-700/80 shadow-slate-950/60'
        }`}
      >
        {/* Type Icon */}
        <div className="shrink-0">
          {toast.type === 'success' ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          ) : toast.type === 'error' ? (
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/30">
              <Info className="w-4 h-4 text-amber-400" />
            </div>
          )}
        </div>

        {/* Message */}
        <div className="flex-1 pr-1 leading-relaxed text-right">
          <p className="text-xs sm:text-[13px]">{toast.message}</p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleManualClose}
          type="button"
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
          title="بستن اعلان"
          aria-label="بستن اعلان"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Countdown Progress Bar */}
        <div
          className={`absolute bottom-0 right-0 left-0 h-[2.5px] opacity-80 ${
            toast.type === 'success'
              ? 'bg-emerald-400'
              : toast.type === 'error'
              ? 'bg-rose-400'
              : 'bg-amber-400'
          }`}
          style={{
            animation: `toastProgressBar ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes toastProgressBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
