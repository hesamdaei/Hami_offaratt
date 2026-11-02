import React, { FC, useState, useEffect, useCallback, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  X,
  Loader2,
  Copy,
  Check,
  Settings,
  User,
  Zap,
  GripHorizontal,
  Minimize2,
  Maximize2,
  PhoneCall,
} from 'lucide-react';
import { VoipConfig } from '../types/voip';
import {
  getVoipConfig,
  saveVoipConfig,
  initiateVoipCall,
  hangupVoipCall,
  sanitizePhoneNumber,
} from '../utils/voipService';
import { toFaDigits } from '../utils/jalaali';
import { AppUser } from '../types/auth';

const STORAGE_KEY_VOIP_AUTODIAL = 'hamibar_voip_autodial_v1';

interface VoipCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  recipientName: string;
  recipientRole?: string;
  currentUser?: AppUser | null;
  onOpenSettings?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const VoipCallModal: FC<VoipCallModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  recipientName,
  recipientRole,
  currentUser,
  onOpenSettings,
  onShowToast,
}) => {
  const [config, setConfig] = useState<VoipConfig>(() => getVoipConfig(currentUser));
  const [dialPrefixInput, setDialPrefixInput] = useState<string>(config.dialPrefix || '');
  const [callState, setCallState] = useState<'IDLE' | 'CALLING' | 'CONNECTED' | 'ENDED' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('آماده برقراری تماس');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isHangingUp, setIsHangingUp] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Draggable separate popup window state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Auto-dial defaults to true so clicking "Call" immediately starts the call in this separate popup
  const [autoDialEnabled, setAutoDialEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOIP_AUTODIAL);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const cleanNumber = sanitizePhoneNumber(phoneNumber, '');
  const effectiveDialNumber = sanitizePhoneNumber(phoneNumber, dialPrefixInput);

  const handlePlaceCall = useCallback(
    async (prefixOverride?: string) => {
      const prefixToUse = prefixOverride !== undefined ? prefixOverride : dialPrefixInput.trim();
      const targetClean = sanitizePhoneNumber(phoneNumber, '');
      if (!targetClean) {
        setCallState('ERROR');
        setStatusMessage('شماره تماس نامعتبر است');
        return;
      }

      setCallState('CALLING');
      setStatusMessage('در حال شماره‌گیری...');
      setElapsedSeconds(0);

      const currentCfg = getVoipConfig(currentUser);
      const nextConfig: VoipConfig = {
        ...currentCfg,
        dialPrefix: prefixToUse,
      };
      if (currentCfg.dialPrefix !== prefixToUse) {
        saveVoipConfig(nextConfig, currentUser);
      }
      setConfig(nextConfig);

      const result = await initiateVoipCall(phoneNumber, recipientName, nextConfig, currentUser);

      if (result.ok) {
        setCallState('CONNECTED');
        setStatusMessage(result.message || 'تماس برقرار است');
        onShowToast?.(result.message, 'success');
      } else {
        setCallState('ERROR');
        setStatusMessage(result.message || 'خطا در برقراری تماس');
      }
    },
    [dialPrefixInput, phoneNumber, recipientName, currentUser, onShowToast]
  );

  // Sync config whenever modal opens or user's VoIP config is updated in VoipSettingsModal
  useEffect(() => {
    const syncUserVoip = () => {
      const fresh = getVoipConfig(currentUser);
      setConfig(fresh);
      setDialPrefixInput(fresh.dialPrefix || '');
    };
    window.addEventListener('hamibar:voip-config-updated', syncUserVoip);
    window.addEventListener('hamibar:users-updated', syncUserVoip);
    return () => {
      window.removeEventListener('hamibar:voip-config-updated', syncUserVoip);
      window.removeEventListener('hamibar:users-updated', syncUserVoip);
    };
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      const current = getVoipConfig(currentUser);
      setConfig(current);
      setDialPrefixInput(current.dialPrefix || '');
      setCallState('IDLE');
      setStatusMessage('آماده برقراری تماس');
      setElapsedSeconds(0);
      setIsHangingUp(false);
      setIsMinimized(false);
      setCopied(false);
      setPosition({ x: 0, y: 0 });

      if (autoDialEnabled && sanitizePhoneNumber(phoneNumber, '')) {
        const timer = setTimeout(() => {
          handlePlaceCall(current.dialPrefix || '');
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, phoneNumber, currentUser?.id]);

  // Window Drag Handlers
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPosition({
        x: dragStartRef.current.origX + dx,
        y: dragStartRef.current.origY + dy,
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleStartDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  // Call duration timer when connected
  useEffect(() => {
    if (callState !== 'CONNECTED') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Hangup and immediately remove the popup from screen
  const handleHangupAndRemovePopup = useCallback(async () => {
    if (isHangingUp) return;
    setIsHangingUp(true);
    setStatusMessage('در حال قطع تماس...');

    try {
      if (callState === 'CALLING' || callState === 'CONNECTED' || config.mode !== 'softphone') {
        await hangupVoipCall(
          {
            ...config,
            dialPrefix: dialPrefixInput.trim(),
          },
          currentUser
        );
      }
    } catch {
      // Ignore network errors on hangup so popup always closes cleanly
    }

    onShowToast?.(`تماس با «${recipientName}» پایان یافت.`, 'info');
    onClose();
  }, [isHangingUp, callState, config, dialPrefixInput, currentUser, recipientName, onShowToast, onClose]);

  // Keyboard shortcuts: Escape to close/hangup, Enter to dial when IDLE
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (callState === 'CALLING' || callState === 'CONNECTED') {
          handleHangupAndRemovePopup();
        } else {
          onClose();
        }
      } else if (e.key === 'Enter' && callState === 'IDLE') {
        e.preventDefault();
        handlePlaceCall();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, callState, handleHangupAndRemovePopup, handlePlaceCall, onClose]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleToggleAutoDial = () => {
    const next = !autoDialEnabled;
    setAutoDialEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY_VOIP_AUTODIAL, String(next));
    } catch {}
    onShowToast?.(
      next
        ? 'شماره‌گیری خودکار به محض باز شدن پنجره تماس فعال شد.'
        : 'شماره‌گیری خودکار غیرفعال شد.',
      'info'
    );
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(cleanNumber || phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onShowToast?.(`شماره ${toFaDigits(cleanNumber || phoneNumber)} کپی شد.`, 'info');
    } catch {}
  };

  const modeLabel =
    config.mode === 'asterisk_ami'
      ? `سانترال (${config.channelType || 'SIP'}/${toFaDigits(config.operatorExtension || '101')})`
      : config.mode === 'ipphone_cti'
      ? `تلفن رومیزی (${config.ipPhoneIp ? toFaDigits(config.ipPhoneIp) : 'بدون IP'})`
      : config.mode === 'webhook'
      ? `وب‌هوک (داخلی ${toFaDigits(config.operatorExtension || '101')})`
      : `سافت‌فون (${(config.softphoneProtocol || 'tel').toUpperCase()})`;

  // Minimized Floating Call Pill (separate from app environment at top-left/bottom-left)
  if (isMinimized) {
    return (
      <div
        dir="rtl"
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        className="fixed bottom-5 left-5 z-[165] w-80 bg-gradient-to-r from-[#0e192d] via-[#111f38] to-[#0a1222] border-2 border-emerald-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 text-slate-100 flex items-center justify-between gap-2 ring-1 ring-white/15 animate-fadeIn"
      >
        <div
          onMouseDown={handleStartDrag}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-move select-none"
          title="پنجره شناور تماس (برای جابجایی بکشید)"
        >
          <div className="relative w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
            <PhoneCall className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-white truncate">{recipientName}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono">
              <span>{toFaDigits(effectiveDialNumber)}</span>
              {callState === 'CONNECTED' && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40">
                  {toFaDigits(formatDuration(elapsedSeconds))}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer"
            title="باز کردن کامل پنجره پاپ‌آپ تماس"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={isHangingUp}
            onClick={handleHangupAndRemovePopup}
            className="px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black flex items-center gap-1 shadow-md transition cursor-pointer"
            title="قطع تماس و بستن پاپ‌آپ"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>قطع</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[165] pointer-events-none flex items-center justify-center p-3 animate-fadeIn"
      dir="rtl"
    >
      <div
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        className="pointer-events-auto relative bg-gradient-to-b from-[#131f38] via-[#0d1629] to-[#080e1c] border-2 border-cyan-500/40 rounded-3xl w-full max-w-[355px] shadow-[0_30px_90px_rgba(0,0,0,0.92)] overflow-hidden text-slate-100 ring-1 ring-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Separate Floating Window Title Bar (Draggable) */}
        <div
          onMouseDown={handleStartDrag}
          className="relative z-10 bg-[#070d19]/95 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between cursor-move select-none"
          title="پنجره پاپ‌آپ مستقل تماس — برای جابجایی پنجره روی صفحه بکشید"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black text-slate-200">
              پنجره پاپ‌آپ تماس تلفنی
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-blue-600/30 text-slate-300 hover:text-white border border-slate-700/70 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="تنظیمات سانترال و داخلی تلفن شما"
              >
                <Settings className="w-3 h-3 text-cyan-400" />
                <span>داخلی {toFaDigits(config.operatorExtension || '101')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition cursor-pointer"
              title="کوچک‌سازی پنجره تماس در گوشه تصویر"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (callState === 'CALLING' || callState === 'CONNECTED') {
                  handleHangupAndRemovePopup();
                } else {
                  onClose();
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/25 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition cursor-pointer"
              title="قطع تماس و حذف پنجره پاپ‌آپ (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ambient Status Glow */}
        <div
          className={`pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full blur-2xl opacity-35 transition-colors duration-500 ${
            callState === 'CONNECTED'
              ? 'bg-emerald-500'
              : callState === 'CALLING'
              ? 'bg-sky-500'
              : callState === 'ERROR'
              ? 'bg-rose-500'
              : 'bg-cyan-500'
          }`}
        />

        {/* Window Body */}
        <div className="p-4 space-y-3.5 relative z-10">
          {/* Active User PBX Profile + Auto-Dial Strip */}
          <div className="flex items-center justify-between gap-1.5">
            <div
              onClick={onOpenSettings}
              className="flex-1 flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-300 cursor-pointer transition min-w-0"
              title="برای تغییر حالت اتصال سانترال یا شماره داخلی کلیک کنید"
            >
              <span className="truncate font-semibold text-slate-400">
                اپراتور: <strong className="text-slate-200">{currentUser?.fullName || 'کاربر جاری'}</strong>
              </span>
              <span className="font-mono font-bold text-cyan-300 shrink-0">{modeLabel}</span>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoDial}
              className={`px-2 py-1.5 rounded-xl text-[10px] font-bold border flex items-center gap-1 transition cursor-pointer shrink-0 ${
                autoDialEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="برقراری خودکار تماس به محض باز شدن پاپ‌آپ"
            >
              <Zap className="w-3 h-3" />
              <span>تماس فوری</span>
            </button>
          </div>

          {/* 1. Avatar Ring + Driver/Contact Info + Phone Number */}
          <div className="relative text-center pt-0.5 flex flex-col items-center">
            <div className="relative mb-2.5">
              {(callState === 'CALLING' || callState === 'CONNECTED') && (
                <span
                  className={`absolute -inset-2 rounded-full animate-ping opacity-30 ${
                    callState === 'CONNECTED' ? 'bg-emerald-400' : 'bg-sky-400'
                  }`}
                />
              )}
              <div
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg transition-all duration-300 ${
                  callState === 'CONNECTED'
                    ? 'bg-gradient-to-br from-emerald-500/30 to-teal-600/30 border-emerald-400/60 text-emerald-300 shadow-emerald-500/25'
                    : callState === 'CALLING'
                    ? 'bg-gradient-to-br from-sky-500/30 to-blue-600/30 border-sky-400/60 text-sky-300 shadow-sky-500/25'
                    : callState === 'ERROR'
                    ? 'bg-gradient-to-br from-rose-500/30 to-red-600/30 border-rose-400/60 text-rose-300'
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-emerald-400'
                }`}
              >
                <Phone className={`w-6 h-6 ${callState === 'CALLING' ? 'animate-bounce' : ''}`} />
              </div>
            </div>

            <h3 className="text-base font-black text-white truncate max-w-[280px] tracking-tight">
              {recipientName || 'مخاطب بدون نام'}
            </h3>

            {recipientRole && (
              <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-[11px] font-bold text-slate-300 max-w-[280px] truncate">
                <User className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{recipientRole}</span>
              </div>
            )}

            {/* Number Box + Copy */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5 w-full">
              <div
                className="px-4 py-1.5 rounded-2xl bg-[#060b16]/90 border border-slate-800/90 shadow-inner text-base font-black font-mono text-emerald-400 tracking-widest select-all"
                dir="ltr"
              >
                {toFaDigits(effectiveDialNumber || '---')}
              </div>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white transition cursor-pointer"
                title="کپی شماره تلفن"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 2. Call Status Pill */}
          <div
            className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 text-center transition-all duration-300 ${
              callState === 'CALLING'
                ? 'bg-sky-500/15 border-sky-500/35 text-sky-300 shadow-sm shadow-sky-500/10'
                : callState === 'CONNECTED'
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 shadow-sm shadow-emerald-500/10'
                : callState === 'ENDED'
                ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                : callState === 'ERROR'
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                : 'bg-slate-900/75 border-slate-800/90 text-slate-400'
            }`}
          >
            {callState === 'CALLING' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-sky-400" />
            ) : callState === 'CONNECTED' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            ) : callState === 'ERROR' ? (
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
            )}
            <span className="truncate">{statusMessage}</span>
            {callState === 'CONNECTED' && (
              <span
                className="font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-500/30 shrink-0"
                dir="ltr"
              >
                {toFaDigits(formatDuration(elapsedSeconds))}
              </span>
            )}
          </div>

          {/* 3. Prefix Selector (پیش‌کد خط شهری سانترال) */}
          <div className="flex items-center justify-between gap-2 bg-[#070d19]/90 border border-slate-800/90 rounded-2xl px-3 py-2">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">پیش‌کد خط:</span>
            <div className="flex items-center gap-1">
              {[
                { label: 'بدون کد', val: '' },
                { label: '9', val: '9' },
                { label: '0', val: '0' },
              ].map((opt) => {
                const active = dialPrefixInput.trim() === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setDialPrefixInput(opt.val)}
                    className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white border-cyan-400/60 shadow-xs shadow-cyan-500/20'
                        : 'bg-[#0e172a] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {opt.label === 'بدون کد' ? 'بدون کد' : toFaDigits(opt.label)}
                  </button>
                );
              })}
              <input
                type="text"
                dir="ltr"
                maxLength={4}
                value={dialPrefixInput}
                onChange={(e) => setDialPrefixInput(e.target.value.replace(/[^0-9*#]/g, ''))}
                placeholder="کد"
                className="w-10 bg-[#0e172a] border border-slate-700/80 focus:border-cyan-400 rounded-xl px-1.5 py-1 text-center font-mono text-xs font-bold text-cyan-300 focus:outline-none transition"
              />
            </div>
          </div>

          {/* 4. Call & Hangup Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="button"
              disabled={callState === 'CALLING' || isHangingUp}
              onClick={() => handlePlaceCall()}
              className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/25 border border-emerald-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>{callState === 'CONNECTED' ? 'شماره‌گیری مجدد' : 'برقراری تماس'}</span>
            </button>

            <button
              type="button"
              disabled={isHangingUp}
              onClick={handleHangupAndRemovePopup}
              className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] disabled:opacity-60 text-white font-black text-xs shadow-lg shadow-rose-600/25 border border-rose-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isHangingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PhoneOff className="w-4 h-4" />
              )}
              <span>قطع تماس</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

