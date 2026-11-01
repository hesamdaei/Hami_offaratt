import { FC, useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  X,
  Loader2,
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
  onShowToast,
}) => {
  const [config, setConfig] = useState<VoipConfig>(() => getVoipConfig());
  const [dialPrefixInput, setDialPrefixInput] = useState<string>(config.dialPrefix || '');
  const [callState, setCallState] = useState<'IDLE' | 'CALLING' | 'CONNECTED' | 'ENDED' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('آماده شماره‌گیری');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      const current = getVoipConfig();
      setConfig(current);
      setDialPrefixInput(current.dialPrefix || '');
      setCallState('IDLE');
      setStatusMessage('آماده شماره‌گیری');
      setElapsedSeconds(0);
    }
  }, [isOpen, phoneNumber]);

  // Call duration timer when connected
  useEffect(() => {
    if (callState !== 'CONNECTED') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  if (!isOpen) return null;

  const cleanNumber = sanitizePhoneNumber(phoneNumber, '');
  const effectiveDialNumber = sanitizePhoneNumber(phoneNumber, dialPrefixInput);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handlePlaceCall = async () => {
    if (!cleanNumber) {
      setCallState('ERROR');
      setStatusMessage('شماره نامعتبر است');
      return;
    }

    setCallState('CALLING');
    setStatusMessage('در حال شماره‌گیری...');
    setElapsedSeconds(0);

    const nextConfig: VoipConfig = {
      ...config,
      dialPrefix: dialPrefixInput.trim(),
    };
    saveVoipConfig(nextConfig);
    setConfig(nextConfig);

    const result = await initiateVoipCall(phoneNumber, recipientName, nextConfig);

    if (result.ok) {
      setCallState('CONNECTED');
      setStatusMessage('تماس فعال است');
      onShowToast?.(result.message, 'success');
    } else {
      setCallState('ERROR');
      setStatusMessage(result.message || 'خطا در برقراری تماس');
    }
  };

  const handleHangupCall = async () => {
    setStatusMessage('در حال قطع تماس...');
    const res = await hangupVoipCall({
      ...config,
      dialPrefix: dialPrefixInput.trim(),
    });
    setCallState('ENDED');
    setStatusMessage(res.message || 'تماس قطع شد');
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 animate-fadeIn"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-b from-[#131e36] via-[#0d1629] to-[#080e1c] border border-slate-700/80 rounded-3xl w-full max-w-[310px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100 p-5 space-y-4 ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div
          className={`pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-44 h-28 rounded-full blur-2xl opacity-35 transition-colors duration-500 ${
            callState === 'CONNECTED'
              ? 'bg-emerald-500'
              : callState === 'CALLING'
              ? 'bg-sky-500'
              : callState === 'ERROR'
              ? 'bg-rose-500'
              : 'bg-cyan-500'
          }`}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 left-3.5 p-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/90 text-slate-400 hover:text-white border border-slate-700/60 transition cursor-pointer z-10"
          title="بستن"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* 1. Avatar Ring + Name + Phone Number */}
        <div className="relative text-center pt-1 flex flex-col items-center">
          <div className="relative mb-2.5">
            {(callState === 'CALLING' || callState === 'CONNECTED') && (
              <span
                className={`absolute -inset-1.5 rounded-full animate-ping opacity-30 ${
                  callState === 'CONNECTED' ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
              />
            )}
            <div
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition-all duration-300 ${
                callState === 'CONNECTED'
                  ? 'bg-gradient-to-br from-emerald-500/25 to-teal-600/25 border-emerald-400/50 text-emerald-300 shadow-emerald-500/20'
                  : callState === 'CALLING'
                  ? 'bg-gradient-to-br from-sky-500/25 to-blue-600/25 border-sky-400/50 text-sky-300 shadow-sky-500/20'
                  : callState === 'ERROR'
                  ? 'bg-gradient-to-br from-rose-500/25 to-red-600/25 border-rose-400/50 text-rose-300'
                  : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-emerald-400'
              }`}
            >
              <Phone className={`w-5 h-5 ${callState === 'CALLING' ? 'animate-bounce' : ''}`} />
            </div>
          </div>

          <h3 className="text-base font-black text-white truncate max-w-[240px] tracking-tight">
            {recipientName}
          </h3>

          <div
            className="mt-2 px-4 py-1.5 rounded-2xl bg-[#060b16]/90 border border-slate-800/90 shadow-inner text-base font-black font-mono text-emerald-400 tracking-widest"
            dir="ltr"
          >
            {toFaDigits(effectiveDialNumber || '---')}
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
          <span>{statusMessage}</span>
          {callState === 'CONNECTED' && (
            <span className="font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-500/30" dir="ltr">
              {toFaDigits(formatDuration(elapsedSeconds))}
            </span>
          )}
        </div>

        {/* 3. Prefix Selector (پیش‌کد خط) */}
        <div className="flex items-center justify-between gap-2 bg-[#070d19]/90 border border-slate-800/90 rounded-2xl px-3 py-2">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">پیش‌کد:</span>
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

        {/* 4. Call & Hangup Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <button
            type="button"
            disabled={callState === 'CALLING'}
            onClick={handlePlaceCall}
            className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/25 border border-emerald-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>تماس</span>
          </button>

          <button
            type="button"
            onClick={handleHangupCall}
            className="py-3 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-rose-600/25 border border-rose-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>قطع تماس</span>
          </button>
        </div>
      </div>
    </div>
  );
};
