import { FC, useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  User,
  Settings,
  Copy,
  Check,
  X,
  Server,
  Volume2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { VoipConfig, VoipCallLog } from '../types/voip';
import { getVoipConfig, saveVoipConfig, initiateVoipCall } from '../utils/voipService';
import { toFaDigits } from '../utils/jalaali';

interface VoipCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  recipientName: string;
  recipientRole?: string;
  onOpenSettings?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const VoipCallModal: FC<VoipCallModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  recipientName,
  recipientRole = 'مخاطب',
  onOpenSettings,
  onShowToast,
}) => {
  const [config, setConfig] = useState<VoipConfig>(getVoipConfig());
  const [currentExt, setCurrentExt] = useState<string>(config.operatorExtension || '101');
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);

  // Reload config when opened
  useEffect(() => {
    if (isOpen) {
      const cfg = getVoipConfig();
      setConfig(cfg);
      setCurrentExt(cfg.operatorExtension || '101');
      setCallStatus('idle');
      setStatusMessage('');
      setCallDuration(0);
    }
  }, [isOpen]);

  // Call duration counter when active
  useEffect(() => {
    let timer: any;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  if (!isOpen) return null;

  const handleStartCall = async (overrideMode?: VoipConfig['mode']) => {
    const ext = currentExt.trim() || '101';
    const activeConfig = overrideMode
      ? { ...config, mode: overrideMode, operatorExtension: ext }
      : { ...config, operatorExtension: ext };
    
    // Auto-save extension if changed
    if (ext !== config.operatorExtension) {
      saveVoipConfig(activeConfig);
      setConfig(activeConfig);
    }

    setCallStatus('calling');
    setStatusMessage(
      activeConfig.mode === 'asterisk_ami'
        ? `در حال ارسال دستور تماس به سانترال ویپ (داخلی ${activeConfig.operatorExtension})...`
        : activeConfig.mode === 'ipphone_cti'
        ? `در حال ارسال فرمان شماره‌گیری به تلفن رومیزی (${activeConfig.ipPhoneIp})...`
        : 'در حال اجرای نرم‌افزار تلفنی ویندوز (MicroSIP / Zoiper)...'
    );

    try {
      const result = await initiateVoipCall(phoneNumber, recipientName, activeConfig);
      if (result.ok) {
        if (activeConfig.mode === 'asterisk_ami') {
          setCallStatus('ringing');
          setStatusMessage(result.message || `گوشی تلفن داخلی شما (${activeConfig.operatorExtension}) در حال زنگ خوردن است. لطفاً گوشی را بردارید تا شماره گرفته شود.`);
        } else if (activeConfig.mode === 'ipphone_cti') {
          setCallStatus('connected');
          setStatusMessage(`فرمان شماره‌گیری روی تلفن رومیزی (${activeConfig.ipPhoneIp}) فعال شد.`);
        } else {
          setCallStatus('connected');
          setStatusMessage('شماره‌گیری در نرم‌افزار تلفنی ویندوز با موفقیت آغاز شد.');
        }
        onShowToast?.('درخواست تماس ویپ صادر شد.', 'success');
      } else {
        setCallStatus('failed');
        setStatusMessage(result.message || 'خطا در برقراری ارتباط با سانترال');
        onShowToast?.(result.message || 'خطا در تماس ویپ', 'error');
      }
    } catch (err: any) {
      setCallStatus('failed');
      setStatusMessage('خطا: ' + (err.message || 'ارتباط با سرور برقرار نشد'));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onShowToast?.('شماره تلفن کپی شد.', 'info');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const modeLabels: Record<VoipConfig['mode'], string> = {
    softphone: 'سافت‌فون سیستم (MicroSIP / Zoiper)',
    asterisk_ami: `سانترال استریسک / ایزابل (داخلی ${config.operatorExtension})`,
    ipphone_cti: `تلفن تحت شبکه (${config.ipPhoneModel})`,
    webhook: 'وب‌هوک سانترال سازمانی',
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0d1629] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 p-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">تماس هوشمند با ویپ (Click-to-Call)</h3>
              <p className="text-[11px] text-slate-400">سامانه متصل به مرکز تلفن و تلفن‌های رومیزی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recipient Profile Card */}
        <div className="p-6 text-center border-b border-slate-800/80 bg-slate-900/40">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-blue-500/10 to-indigo-500/20 border border-slate-700 text-amber-300 mb-3 shadow-lg">
            <User className="w-8 h-8" />
          </div>

          <h2 className="text-base font-black text-white">{recipientName}</h2>
          <span className="inline-block mt-0.5 text-xs text-slate-400 font-medium">
            {recipientRole}
          </span>

          {/* Formatted Phone Number Box */}
          <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 font-mono text-base font-black text-emerald-300 tracking-wider">
            <span dir="ltr">{toFaDigits(phoneNumber)}</span>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white transition cursor-pointer"
              title="کپی شماره"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Live Call State Animation / Indicator */}
          {callStatus !== 'idle' && (
            <div className="mt-4 p-3 rounded-2xl bg-[#091120] border border-blue-500/30 text-xs">
              {callStatus === 'calling' && (
                <div className="flex items-center justify-center gap-2 text-sky-300 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>در حال برقراری ارتباط با سانترال ویپ...</span>
                </div>
              )}
              {callStatus === 'ringing' && (
                <div className="space-y-1.5 animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-black">
                    <Volume2 className="w-5 h-5 text-amber-400" />
                    <span>تلفن رومیزی شما در حال زنگ خوردن است!</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    گوشی تلفن داخلی خود ({config.operatorExtension}) را بردارید؛ تماس به صورت خودکار با شماره مقصد برقرار خواهد شد.
                  </p>
                </div>
              )}
              {callStatus === 'connected' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>تماس فعال است</span>
                    <span className="font-mono text-emerald-400 font-black mr-2">
                      ({formatTimer(callDuration)})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{statusMessage}</p>
                </div>
              )}
              {callStatus === 'failed' && (
                <div className="space-y-1 text-rose-300">
                  <div className="flex items-center justify-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>عدم برقراری تماس</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{statusMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialing Options & Action Buttons */}
        <div className="p-5 space-y-3">
          {/* Quick Desk Phone Extension Selector for Asterisk/Issabel Mode */}
          {config.mode === 'asterisk_ami' && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-amber-300 text-xs">تلفن داخلی میز شما:</div>
                  <div className="text-[10px] text-slate-400">ابتدا این تلفن زنگ می‌خورد، سپس وصل می‌شود</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-slate-400">داخلی:</span>
                <input
                  type="text"
                  value={currentExt}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setCurrentExt(val);
                    if (val) {
                      const updated = { ...config, operatorExtension: val };
                      setConfig(updated);
                      saveVoipConfig(updated);
                    }
                  }}
                  placeholder="101"
                  className="w-16 h-8 text-center font-mono font-black text-sm bg-slate-950 border border-amber-500/40 rounded-lg text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* Primary Dial Button */}
          <button
            type="button"
            onClick={() => handleStartCall()}
            disabled={callStatus === 'calling'}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 hover:from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            <Phone className="w-4 h-4" />
            <span>
              {config.mode === 'asterisk_ami'
                ? `برقراری تماس با تلفن رومیزی (داخلی ${currentExt || config.operatorExtension})`
                : config.mode === 'ipphone_cti'
                ? `شماره‌گیری روی گوشی رومیزی (${config.ipPhoneModel})`
                : 'شماره‌گیری با نرم‌افزار تلفنی (MicroSIP / Zoiper)'}
            </span>
          </button>

          {/* Quick Alternative Dialers */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {config.mode !== 'softphone' && (
              <button
                type="button"
                onClick={() => handleStartCall('softphone')}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="شماره‌گیری مستقیم در نرم‌افزار تلفنی ویندوز"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>سافت‌فون ویندوز</span>
              </button>
            )}

            {config.mode !== 'asterisk_ami' && (
              <button
                type="button"
                onClick={() => handleStartCall('asterisk_ami')}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="ارسال دستور تماس به سانترال ایزابل/استریسک"
              >
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>سانترال ویپ (AMI)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>کپی شماره</span>
            </button>
          </div>

          {/* Current Mode Info & Settings Shortcut */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>روش فعال: {modeLabels[config.mode]}</span>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <Settings className="w-3 h-3" />
                <span>تنظیمات ویپ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
