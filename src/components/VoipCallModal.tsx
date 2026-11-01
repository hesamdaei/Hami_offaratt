import { FC, useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  X,
  Headphones,
  Server,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';
import { VoipConfig } from '../types/voip';
import {
  getVoipConfig,
  saveVoipConfig,
  initiateVoipCall,
  sanitizePhoneNumber,
} from '../utils/voipService';
import { toFaDigits } from '../utils/jalaali';
import { AppUser } from '../types/auth';
import { canManageSystemSettings } from '../utils/authService';

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
  recipientRole = 'راننده / مخاطب',
  currentUser,
  onOpenSettings,
  onShowToast,
}) => {
  const [config, setConfig] = useState<VoipConfig>(() => getVoipConfig());
  const [extensionInput, setExtensionInput] = useState<string>(config.operatorExtension || '101');
  const [dialPrefixInput, setDialPrefixInput] = useState<string>(config.dialPrefix || '');
  const [callState, setCallState] = useState<'IDLE' | 'CALLING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const canConfigureVoip = canManageSystemSettings(currentUser);

  useEffect(() => {
    if (isOpen) {
      const current = getVoipConfig();
      setConfig(current);
      setExtensionInput(current.operatorExtension || '101');
      setDialPrefixInput(current.dialPrefix || '');
      setCallState('IDLE');
      setStatusMessage('');
      setCopied(false);
    }
  }, [isOpen, phoneNumber]);

  if (!isOpen) return null;

  const cleanNumber = sanitizePhoneNumber(phoneNumber, '');
  const effectiveDialNumber = sanitizePhoneNumber(
    phoneNumber,
    config.mode === 'ipphone_cti' ? dialPrefixInput : config.dialPrefix
  );

  const handleCopyNumber = () => {
    navigator.clipboard?.writeText(cleanNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handlePlaceCall = async (overrideMode?: VoipConfig['mode']) => {
    if (!cleanNumber) {
      setCallState('ERROR');
      setStatusMessage('شماره تماس معتبر نیست.');
      return;
    }

    setCallState('CALLING');
    setStatusMessage('در حال برقراری تماس...');

    const nextConfig: VoipConfig = {
      ...config,
      operatorExtension: extensionInput || config.operatorExtension,
      dialPrefix: dialPrefixInput.trim(),
    };
    saveVoipConfig(nextConfig);
    setConfig(nextConfig);

    const result = await initiateVoipCall(phoneNumber, recipientName, {
      ...nextConfig,
      mode: overrideMode || nextConfig.mode,
    });

    if (result.ok) {
      setCallState('SUCCESS');
      setStatusMessage(result.message);
      if (onShowToast) {
        onShowToast(result.message, 'success');
      }
      if ((overrideMode || nextConfig.mode) === 'softphone') {
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } else {
      setCallState('ERROR');
      setStatusMessage(result.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 animate-fadeIn"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-[340px] shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Compact Header */}
        <div className="px-4 py-3 bg-[#131e36] border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-white truncate">{recipientName}</h3>
              <p className="text-[10px] text-slate-400 truncate">{recipientRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Body */}
        <div className="p-3.5 space-y-3">
          {/* Phone Number Bar with Copy */}
          <div className="flex items-center justify-between gap-2 bg-[#0a101f] border border-slate-800 rounded-xl px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-black font-mono text-emerald-400 tracking-wider" dir="ltr">
                {toFaDigits(effectiveDialNumber || '---')}
              </div>
              {dialPrefixInput.trim() && (
                <div className="text-[9px] text-cyan-400 font-mono">
                  کد آزادسازی خط {toFaDigits(dialPrefixInput.trim())} + {toFaDigits(cleanNumber)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopyNumber}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0 flex items-center gap-1 text-[10px]"
              title="کپی شماره"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'کپی شد' : 'کپی'}</span>
            </button>
          </div>

          {/* Mode-Specific Compact Control */}
          {config.mode === 'ipphone_cti' ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>تلفن {config.ipPhoneModel === 'yealink' ? 'Yealink' : config.ipPhoneModel === 'grandstream' ? 'Grandstream' : 'Fanvil'} ({config.ipPhoneIp || 'بدون IP'})</span>
                <span className="text-cyan-400 font-bold">کد آزادسازی خط:</span>
              </div>
              <div className="flex items-center gap-1.5">
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
                    {opt.label}
                  </button>
                ))}
                <input
                  type="text"
                  dir="ltr"
                  maxLength={4}
                  value={dialPrefixInput}
                  onChange={(e) => setDialPrefixInput(e.target.value.replace(/[^0-9*#]/g, ''))}
                  placeholder="عدد"
                  className="w-14 bg-[#0a101f] border border-slate-700 focus:border-cyan-500 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold text-cyan-300 focus:outline-none mr-auto"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-[11px] text-slate-400">داخلی اپراتور:</span>
              <input
                type="text"
                dir="ltr"
                value={extensionInput}
                onChange={(e) => setExtensionInput(e.target.value)}
                placeholder="101"
                className="w-20 bg-[#0a101f] border border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold text-white focus:outline-none"
              />
            </div>
          )}

          {/* Status Feedback */}
          {callState !== 'IDLE' && (
            <div
              className={`px-3 py-2 rounded-xl border text-[11px] flex items-center gap-2 ${
                callState === 'CALLING'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : callState === 'SUCCESS'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {callState === 'CALLING' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              {callState === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              {callState === 'ERROR' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span className="leading-snug">{statusMessage}</span>
            </div>
          )}

          {/* Primary Call Action */}
          <button
            type="button"
            disabled={callState === 'CALLING'}
            onClick={() => handlePlaceCall()}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>
              {config.mode === 'asterisk_ami'
                ? `تماس از داخلی ${toFaDigits(extensionInput || '101')}`
                : config.mode === 'ipphone_cti'
                ? `شماره‌گیری روی تلفن (${config.ipPhoneModel === 'yealink' ? 'Yealink' : config.ipPhoneModel === 'grandstream' ? 'Grandstream' : 'Fanvil'})`
                : 'برقراری تماس فوری'}
            </span>
          </button>

          {/* Compact Secondary Actions */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => handlePlaceCall('softphone')}
              className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              title="سافت‌فون ویندوز / موبایل"
            >
              <Headphones className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">سافت‌فون</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlaceCall('ipphone_cti')}
              className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              title="ارسال به تلفن رومیزی Yealink / Grandstream"
            >
              <Smartphone className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">تلفن رومیزی</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlaceCall('asterisk_ami')}
              className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              title="تماس از طریق سرور سانترال ایزابل"
            >
              <Server className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">سانترال</span>
            </button>
          </div>
        </div>

        {/* Minimal Footer */}
        {canConfigureVoip && onOpenSettings && (
          <div className="px-3.5 py-2 bg-[#0b1120] border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">
              حالت فعلی: {config.mode === 'ipphone_cti' ? 'تلفن رومیزی' : config.mode === 'asterisk_ami' ? 'سانترال AMI' : 'سافت‌فون'}
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>تنظیمات ویپ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
