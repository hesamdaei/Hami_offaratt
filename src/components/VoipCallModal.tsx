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
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 animate-fadeIn"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-[300px] shadow-2xl overflow-hidden text-slate-100 p-4 space-y-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Close button + Name & Phone Number */}
        <div className="relative text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 left-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-sm font-black text-white truncate px-6">{recipientName}</h3>
          <div className="mt-1.5 inline-block px-3 py-1 rounded-xl bg-[#090f1d] border border-slate-800 text-sm font-black font-mono text-emerald-400 tracking-wider" dir="ltr">
            {toFaDigits(effectiveDialNumber || '---')}
          </div>
        </div>

        {/* 2. Call Status */}
        <div
          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 text-center ${
            callState === 'CALLING'
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              : callState === 'CONNECTED'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : callState === 'ENDED'
              ? 'bg-slate-800/80 border-slate-700 text-slate-300'
              : callState === 'ERROR'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-slate-900/70 border-slate-800 text-slate-400'
          }`}
        >
          {callState === 'CALLING' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
          {callState === 'CONNECTED' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          )}
          <span>{statusMessage}</span>
          {callState === 'CONNECTED' && (
            <span className="font-mono text-emerald-400" dir="ltr">
              ({formatDuration(elapsedSeconds)})
            </span>
          )}
        </div>

        {/* 3. Prefix (پیش‌کد) */}
        <div className="flex items-center justify-between gap-2 bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2">
          <span className="text-xs font-bold text-slate-300 shrink-0">پیش‌کد:</span>
          <div className="flex items-center gap-1">
            {[
              { label: 'بدون کد', val: '' },
              { label: '9', val: '9' },
              { label: '0', val: '0' },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setDialPrefixInput(opt.val)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                  dialPrefixInput.trim() === opt.val
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'bg-[#0a101f] text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {opt.label === 'بدون کد' ? 'بدون کد' : toFaDigits(opt.label)}
              </button>
            ))}
            <input
              type="text"
              dir="ltr"
              maxLength={4}
              value={dialPrefixInput}
              onChange={(e) => setDialPrefixInput(e.target.value.replace(/[^0-9*#]/g, ''))}
              placeholder="کد"
              className="w-10 bg-[#0a101f] border border-slate-700 focus:border-cyan-500 rounded-lg px-1.5 py-1 text-center font-mono text-xs font-bold text-cyan-300 focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Call & Hangup Buttons Only */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            disabled={callState === 'CALLING'}
            onClick={handlePlaceCall}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>تماس</span>
          </button>

          <button
            type="button"
            onClick={handleHangupCall}
            className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>قطع تماس</span>
          </button>
        </div>
      </div>
    </div>
  );
};
