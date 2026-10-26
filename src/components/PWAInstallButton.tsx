import React, { FC, useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
  onInstalled?: () => void;
}

export const PWAInstallButton: FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
  onInstalled,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA on the home screen, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (success && onInstalled) {
          onInstalled();
        }
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // In desktop or browsers without prompt event, show guide modal
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className={`bg-gradient-to-r from-amber-500/20 via-blue-900/40 to-slate-900 border border-amber-500/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-md ${className}`}>
          <div className="flex items-center gap-3 text-right">
            <img
              src="/pwa-192x192.png"
              alt="لوگوی حامی"
              className="w-12 h-12 rounded-xl border border-amber-400/50 shadow-md shrink-0 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">نصب اپلیکیشن حامی روی گوشی</h4>
                <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  نسخه موبایل PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                دسترسی سریع و تمام‌صفحه بدون نیاز به دانلود از بازار یا گوگل‌پلی
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isInstalling ? 'در حال نصب...' : 'نصب مستقیم روی گوشی'}</span>
          </button>
        </div>
      ) : variant === 'full' ? (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-950/30 transition hover:scale-105 active:scale-95 cursor-pointer ${className}`}
        >
          <img src="/pwa-192x192.png" alt="Icon" className="w-4 h-4 rounded-md object-cover" />
          <span>{isInstalling ? 'درحال نصب...' : 'نصب اپلیکیشن'}</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white transition text-xs font-bold shadow-xs active:scale-95 cursor-pointer ${className}`}
          title="نصب اپلیکیشن روی گوشی یا دسکتاپ (PWA)"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">نصب اپلیکیشن</span>
          <span className="sm:hidden">نصب</span>
        </button>
      )}

      {/* Guide Modal for iOS Safari / Manual Installation */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#0b1324] border border-[#1d2d4f] rounded-2xl w-full max-w-sm p-5 shadow-2xl text-right font-sans text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img
                  src="/pwa-192x192.png"
                  alt="Hami Icon"
                  className="w-8 h-8 rounded-lg border border-amber-400/40 object-cover"
                />
                <h3 className="font-bold text-sm text-white">راهنمای افزودن به صفحه اصلی گوشی</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="flex items-start gap-3 bg-[#111e3b] p-3 rounded-xl border border-blue-900/40">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                  ۱
                </div>
                <div>
                  <strong className="text-white block">مرحله اول:</strong>
                  <span className="text-slate-300">
                    در مرورگر گوشی (سافاری یا کروم)، دکمه <strong className="text-amber-400">Share</strong> (اشتراک‌گذاری در پایین یا منوی سه نقطه) را لمس کنید.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#111e3b] p-3 rounded-xl border border-blue-900/40">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                  ۲
                </div>
                <div>
                  <strong className="text-white block">مرحله دوم:</strong>
                  <span className="text-slate-300">
                    در منوی باز شده به پایین اسکرول کرده و گزینه <strong className="text-emerald-400">Add to Home Screen (افزودن به صفحه اصلی)</strong> را انتخاب نمایید.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#111e3b] p-3 rounded-xl border border-blue-900/40">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                  ۳
                </div>
                <div>
                  <strong className="text-white block">مرحله سوم:</strong>
                  <span className="text-slate-300">
                    روی گزینه <strong className="text-blue-400">Add (افزودن)</strong> کلیک کنید تا آیکون زرین حامی روی صفحه گوشی شما قرار گیرد و مثل یک اپلیکیشن بومی باز شود.
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
