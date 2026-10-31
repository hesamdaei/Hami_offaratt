import { FC, useState, useEffect } from 'react';
import {
  Network,
  Wifi,
  Copy,
  Check,
  X,
  Server,
  Laptop,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
  Terminal,
  FolderOpen,
  ArrowRight,
  Database,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Download,
  Wrench,
  Sparkles,
} from 'lucide-react';
import {
  checkLanServerStatus,
  LanServerStatus,
  getCustomLanServerUrl,
  setCustomLanServerUrl,
  getLanServerBaseUrl,
} from '../utils/lanSyncService';
import { toFaDigits } from '../utils/jalaali';

interface LanSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualSync?: () => Promise<void> | void;
  onForceSaveToDb?: () => Promise<void> | void;
  onForceFetchFromDb?: () => Promise<void> | void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  networkDbStatus?: 'CONNECTED' | 'SAVING' | 'SYNCED' | 'OFFLINE' | 'ERROR';
  lastDbSavedAt?: string | null;
}

export const LanSharingModal: FC<LanSharingModalProps> = ({
  isOpen,
  onClose,
  onManualSync,
  onForceSaveToDb,
  onForceFetchFromDb,
  onShowToast,
  networkDbStatus = 'OFFLINE',
  lastDbSavedAt,
}) => {
  const [status, setStatus] = useState<LanServerStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingAction, setSyncingAction] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'DATABASE' | 'ADDRESSES' | 'INSTALLER' | 'FIREWALL' | 'GUIDE'>('DATABASE');

  // Custom server configuration
  const [customServerInput, setCustomServerInput] = useState<string>('');
  const [isEditingServerUrl, setIsEditingServerUrl] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setCustomServerInput(getCustomLanServerUrl());
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await checkLanServerStatus();
      setStatus(res);
    } catch {
      setStatus({ isConnected: false });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const effectiveBaseUrl = getLanServerBaseUrl();
  const port = status?.port || 3000;

  // Build list of recommended URLs
  const urls: Array<{ label: string; url: string; desc: string; icon: typeof Laptop }> = [];

  // Localhost
  urls.push({
    label: 'سیستم میزبان (همین کامپیوتر)',
    url: typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `http://localhost:${port}`
      : currentOrigin,
    desc: 'مخصوص استفاده روی همین کامپیوتر',
    icon: Laptop,
  });

  // Network IPs from server
  if (status?.localIps && status.localIps.length > 0) {
    status.localIps.forEach((ip) => {
      urls.push({
        label: `شبکه محلی (${ip.interface})`,
        url: `http://${ip.address}:${port}`,
        desc: 'آدرس مخصوص سایر کامپیوترها و گوشی‌های متصل به مودم یا Wi-Fi',
        icon: Wifi,
      });
    });
  } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    urls.push({
      label: 'آدرس جاری سامانه',
      url: currentOrigin,
      desc: 'آدرس فعال در شبکه',
      icon: Network,
    });
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    onShowToast('آدرس در حافظه کپی شد.', 'info');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const firewallCmd = 'netsh advfirewall firewall add rule name="Hami LAN Port 3000" dir=in action=allow protocol=TCP localport=3000';

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(firewallCmd);
    setCopiedCmd(true);
    onShowToast('دستور فایروال کپی شد. آن را در CMD ویندوز (Run as admin) اجرا کنید.', 'success');
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleDownloadScript = (scriptName: string) => {
    const link = document.createElement('a');
    link.href = `/api/setup/download/${scriptName}`;
    link.setAttribute('download', scriptName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`فایل ${scriptName} در حال دانلود است.`, 'info');
  };

  const [copiedScriptCmd, setCopiedScriptCmd] = useState<string | null>(null);
  const handleCopyScriptCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedScriptCmd(id);
    onShowToast('دستور در حافظه کپی شد.', 'success');
    setTimeout(() => setCopiedScriptCmd(null), 2500);
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      if (onManualSync) {
        await onManualSync();
      }
      await loadStatus();
      onShowToast('همگام‌سازی با موفقیت انجام شد.', 'success');
    } catch {
      onShowToast('خطا در همگام‌سازی با سرور محلی.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerForceSave = async () => {
    if (!onForceSaveToDb) return;
    setSyncingAction('SAVE');
    try {
      await onForceSaveToDb();
      await loadStatus();
      onShowToast('اطلاعات با موفقیت در دیتابیس سرور ذخیره شد.', 'success');
    } catch {
      onShowToast('خطا در ذخیره‌سازی اطلاعات در دیتابیس سرور.', 'error');
    } finally {
      setSyncingAction(null);
    }
  };

  const handleTriggerForceFetch = async () => {
    if (!onForceFetchFromDb) return;
    setSyncingAction('FETCH');
    try {
      await onForceFetchFromDb();
      await loadStatus();
      onShowToast('اطلاعات با موفقیت از دیتابیس سرور بازیابی شد.', 'success');
    } catch {
      onShowToast('خطا در دریافت اطلاعات از دیتابیس سرور.', 'error');
    } finally {
      setSyncingAction(null);
    }
  };

  const handleSaveCustomServer = async () => {
    setCustomLanServerUrl(customServerInput.trim() || null);
    setIsEditingServerUrl(false);
    onShowToast('آدرس سرور ذخیره شد. در حال بررسی اتصال...', 'info');
    await loadStatus();
  };

  const handleResetCustomServer = async () => {
    setCustomLanServerUrl(null);
    setCustomServerInput('');
    setIsEditingServerUrl(false);
    onShowToast('آدرس سرور به حالت پیش‌فرض بازنشانی شد.', 'info');
    await loadStatus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#0b1324] border border-[#1d2d4f] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right font-sans my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#111e3b] via-[#14264d] to-[#0f1c38] px-4 sm:px-5 py-3 sm:py-4 border-b border-[#1f3560] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>مدیریت دیتابیس و شبکه (LAN)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  status?.isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {status?.isConnected ? 'دیتابیس متصل' : 'آفلاین'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                ذخیره بلادرنگ داده‌ها در دیتابیس سرور، همگام‌سازی چندکاربره و دسترسی شبکه
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Bar */}
        <div className="bg-[#0e182f] px-4 sm:px-5 py-2.5 border-b border-[#182847] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-200 font-bold text-[11px] sm:text-xs">
              {status?.isConnected
                ? 'ارتباط با دیتابیس سرور شبکه برقرار است (Auto-Sync فعال)'
                : 'سرور شبکه شناسایی نشد (داده‌ها موقتاً در مرورگر نگهداری می‌شوند)'}
            </span>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={loading}
            className="flex items-center gap-1.5 text-blue-300 hover:text-white bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-50 cursor-pointer self-end sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>بررسی وضعیت</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1b2b4d] bg-[#091122] px-3 sm:px-5 pt-2 gap-2 text-xs overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'DATABASE'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>دیتابیس متمرکز شبکه</span>
          </button>
          <button
            onClick={() => setActiveTab('ADDRESSES')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'ADDRESSES'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-4 h-4 text-sky-400" />
            <span>آدرس‌های اتصال شبکه</span>
          </button>
          <button
            onClick={() => setActiveTab('INSTALLER')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'INSTALLER'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>فایل ست‌آپ و نصاب (Setup)</span>
          </button>
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'GUIDE'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4 text-amber-400" />
            <span>اتصال همکاران</span>
          </button>
          <button
            onClick={() => setActiveTab('FIREWALL')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'FIREWALL'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>فایروال ویندوز</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar text-xs">
          
          {/* TAB 1: CENTRAL NETWORK DATABASE CONTROLS */}
          {activeTab === 'DATABASE' && (
            <div className="space-y-4">
              {/* Server DB Stats Card */}
              <div className="bg-[#101b33] border border-[#1e3052] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-white text-sm">وضعیت رکوردها در دیتابیس سرور:</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    آدرس فعال: {effectiveBaseUrl}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="bg-[#0a1120] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">خودروهای ناوگان</span>
                    <strong className="text-white text-base font-mono">
                      {toFaDigits(status?.stats?.vehiclesCount ?? '—')}
                    </strong>
                  </div>
                  <div className="bg-[#0a1120] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">رانندگان ثبت‌شده</span>
                    <strong className="text-sky-300 text-base font-mono">
                      {toFaDigits(status?.stats?.driversCount ?? '—')}
                    </strong>
                  </div>
                  <div className="bg-[#0a1120] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">پرسنل اداری</span>
                    <strong className="text-amber-300 text-base font-mono">
                      {toFaDigits(status?.stats?.staffCount ?? '—')}
                    </strong>
                  </div>
                  <div className="bg-[#0a1120] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">وضعیت دیتابیس</span>
                    <strong className="text-emerald-400 text-xs font-bold block mt-1">
                      {status?.isConnected ? 'دیتابیس آنلاین' : 'آفلاین'}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                  <span>
                    آخرین ذخیره‌سازی در دیتابیس سرور:{' '}
                    <strong className="text-slate-200 font-mono">
                      {status?.stats?.lastSaved
                        ? toFaDigits(status.stats.lastSaved.slice(0, 19).replace('T', ' '))
                        : 'ثبت نشده'}
                    </strong>
                  </span>
                  <span>
                    وضعیت همگام‌سازی لحظه‌ای:{' '}
                    <strong className="text-emerald-400">خودکار (Auto-Save)</strong>
                  </span>
                </div>
              </div>

              {/* Force Push / Pull Action Buttons */}
              <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 rounded-xl p-4 space-y-3">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-sky-400" />
                  <span>همگام‌سازی دستی و اعمال اجباری روی دیتابیس سرور</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  سیستم به طور خودکار پس از هر تغییر (تعویض روغن، حضور و غیاب، ثبت راننده) اطلاعات را در دیتابیس شبکه ذخیره می‌کند. با دکمه‌های زیر نیز می‌توانید اطلاعات را به صورت دستی ارسال یا دریافت کنید:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleTriggerForceSave}
                    disabled={syncingAction !== null}
                    className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 transition hover:scale-[1.02] cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>
                      {syncingAction === 'SAVE'
                        ? 'در حال ذخیره‌سازی در سرور...'
                        : 'ذخیره کل داده‌های جاری در دیتابیس سرور'}
                    </span>
                  </button>

                  <button
                    onClick={handleTriggerForceFetch}
                    disabled={syncingAction !== null}
                    className="p-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition hover:scale-[1.02] cursor-pointer"
                  >
                    <CloudDownload className="w-4 h-4" />
                    <span>
                      {syncingAction === 'FETCH'
                        ? 'در حال دریافت از سرور...'
                        : 'دریافت آخرین اطلاعات از دیتابیس سرور'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Custom Host Configuration for Secondary PCs */}
              <div className="bg-[#101b33] border border-[#1e3052] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span>تنظیم آدرس سرور برای سایر سیستم‌های داخل شبکه:</span>
                  </div>
                  {!isEditingServerUrl ? (
                    <button
                      onClick={() => setIsEditingServerUrl(true)}
                      className="text-xs text-sky-400 hover:underline cursor-pointer"
                    >
                      تغییر آدرس دستی
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingServerUrl(false)}
                      className="text-xs text-slate-400 hover:underline cursor-pointer"
                    >
                      انصراف
                    </button>
                  )}
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed">
                  اگر از یک سیستم فرعی در شبکه استفاده می‌کنید یا برنامه را با دسکتاپ اجرا کرده‌اید، می‌توانید IP کامپیوتر میزبان سرور (مثلاً <code className="text-amber-300 font-mono">http://192.168.1.100:3000</code>) را در اینجا وارد کنید تا مستقیماً به آن وصل شود:
                </p>

                {isEditingServerUrl && (
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={customServerInput}
                      onChange={(e) => setCustomServerInput(e.target.value)}
                      placeholder="http://192.168.1.100:3000"
                      className="w-full bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={handleResetCustomServer}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 cursor-pointer"
                      >
                        بازنشانی به پیش‌فرض
                      </button>
                      <button
                        onClick={handleSaveCustomServer}
                        className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 cursor-pointer"
                      >
                        ذخیره و تست اتصال
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: URL ADDRESSES */}
          {activeTab === 'ADDRESSES' && (
            <div className="space-y-4">
              <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 leading-relaxed text-xs">
                  برای دسترسی همکاران در دفتر، کافی است یکی از آدرس‌های زیر را به آن‌ها بدهید تا در مرورگر کامپیوتر یا گوشی خود (متصل به همان وای‌فای یا شبکه) وارد نمایند:
                </p>
              </div>

              {/* URL Cards */}
              <div className="space-y-2.5">
                {urls.map((item, idx) => {
                  const ItemIcon = item.icon;
                  const isCopied = copiedUrl === `url-${idx}`;
                  return (
                    <div
                      key={idx}
                      className="bg-[#101b33] border border-[#1e3052] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-500/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{item.label}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 dir-ltr text-right">
                            {item.url}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={() => handleCopy(item.url, `url-${idx}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30 transition cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'کپی شد' : 'کپی آدرس'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP GUIDE */}
          {activeTab === 'GUIDE' && (
            <div className="space-y-3">
              <div className="bg-[#101b33] border border-[#1e3052] rounded-xl p-4 space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">۱</span>
                  <span>اتصال سیستم‌ها به یک مودم یا سوییچ مشترک</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed pr-7">
                  سیستم سرور (ویندوز ۱۱) و سایر کامپیوترها، لپ‌تاپ‌ها یا گوشی‌های همکاران باید به یک مودم Wi-Fi یا کابل شبکه یکسان متصل باشند. نیاز به اینترنت فعال نیست و برنامه کاملاً در بستر آفلاین/محلی کار می‌کند.
                </p>
              </div>

              <div className="bg-[#101b33] border border-[#1e3052] rounded-xl p-4 space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">۲</span>
                  <span>راه‌اندازی ۱ کلیکی با فایل‌های Batch در ویندوز ۱۱</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed pr-7 space-y-1.5">
                  <div>
                    <span className="text-amber-300 font-mono font-bold">SETUP_FIREWALL.bat</span>: یک‌بار اجرا کنید تا فایروال ویندوز ۱۱ به صورت خودکار باز شود.
                  </div>
                  <div>
                    <span className="text-cyan-300 font-mono font-bold">CREATE_DESKTOP_SHORTCUT.bat</span>: آیکون میانبر سامانه را روی دسکتاپ ویندوز قرار می‌دهد.
                  </div>
                  <div>
                    <span className="text-emerald-300 font-mono font-bold">START_LAN_SERVER.bat</span>: سرور شبکه محلی را اجرا کرده و مرورگر را باز می‌کند.
                  </div>
                </div>
              </div>

              <div className="bg-[#101b33] border border-[#1e3052] rounded-xl p-4 space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">۳</span>
                  <span>ورود سایر کلاینت‌ها از طریق مرورگر</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed pr-7">
                  همکاران شما در مرورگر خود (کروم، فایرفاکس یا اج) آدرس IP سرور را وارد می‌کنند (مثلاً <code className="text-sky-300 font-mono">{urls[1]?.url || 'http://192.168.1.50:3000'}</code>).
                </p>
              </div>

              <div className="bg-[#101b33] border border-[#1e3052] rounded-xl p-4 space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">۴</span>
                  <span>تبادل داده و فایل‌های پشتیبان (Manual Backup)</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed pr-7">
                  هر کلاینت می‌تواند از بخش «پشتیبان‌گیری و بازیابی» فایل خروجی کامل JSON دریافت کند و در سایر سیستم‌ها با یک کلیک بارگذاری و بازگردانی نماید.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: FIREWALL PERMISSION */}
          {activeTab === 'FIREWALL' && (
            <div className="space-y-3">
              <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-slate-300 text-xs leading-relaxed">
                  اگر همکاران شما در اتصال با خطای <strong>«This site can&apos;t be reached»</strong> یا تایم‌اوت مواجه شدند، به دلیل مسدود بودن پورت ۳۰۰۰ در فایروال ویندوز ۱۱ است.
                </div>
              </div>

              <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-emerald-400 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>روش ۱ (سریع‌ترین): اجرای فایل SETUP_FIREWALL.bat</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  در پوشه اصلی سامانه، روی فایل <strong className="text-white">SETUP_FIREWALL.bat</strong> دوبار کلیک کنید. دسترسی ادمین به صورت خودکار درخواست شده و پورت ۳۰۰۰ برای تمامی کارت‌های شبکه باز می‌شود.
                </p>
              </div>

              <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="text-white font-bold text-xs">
                  روش ۲: اجرای دستی دستور فایروال در CMD (Run as administrator):
                </div>
                <div className="bg-[#040810] p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 dir-ltr text-left overflow-x-auto">
                  {firewallCmd}
                </div>
                <button
                  onClick={handleCopyCmd}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd ? 'دستور کپی شد' : 'کپی دستور فایروال'}</span>
                </button>
              </div>

              <div className="bg-[#101b33] border border-[#1e3052] rounded-xl p-3 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-amber-300">نکته حیاتی پروفایل شبکه در ویندوز ۱۱:</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  در تنظیمات ویندوز ۱۱ (Settings &gt; Network &amp; internet &gt; Wi-Fi / Ethernet)، نوع شبکه را از Public به <strong>Private network</strong> تغییر دهید تا ویندوز اجازه تبادل داده در شبکه محلی را صادر کند.
                </p>
              </div>
            </div>
          )}

          {/* TAB: SETUP INSTALLER WIZARD */}
          {activeTab === 'INSTALLER' && (
            <div className="space-y-4">
              {/* Intro banner */}
              <div className="bg-gradient-to-r from-emerald-950/40 to-blue-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-sm">نصب و راه‌اندازی خودکار سامانه (Setup Wizard)</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    فایل‌های نصاب جهت آماده‌سازی خودکار ویندوز ۱۰/۱۱ و لینوکس، باز کردن پورت ۳۰۰۰ در فایروال، نصب خودکار پیش‌نیازها و ساخت آیکون دسکتاپ.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadScript('SETUP_INSTALLER.bat')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/30 transition cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل ست‌آپ ویندوز (.bat)</span>
                </button>
              </div>

              {/* Installers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Windows 1-Click Installer */}
                <div className="bg-[#090f1d] border border-slate-800 hover:border-slate-700 transition rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-white text-xs">نصاب خودکار ویندوز (Batch)</span>
                    </div>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                      SETUP_INSTALLER.bat
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    با یک کلیک و مجوز Administrator، نودجی‌اس را بررسی کرده، کتابخانه‌ها را نصب، پورت ۳۰۰۰ فایروال را باز و شورتکات دسکتاپ را می‌سازد.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadScript('SETUP_INSTALLER.bat')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود فایل SETUP_INSTALLER.bat</span>
                    </button>
                  </div>
                </div>

                {/* PowerShell Setup */}
                <div className="bg-[#090f1d] border border-slate-800 hover:border-slate-700 transition rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-white text-xs">اسکریپت پاورشل (PowerShell)</span>
                    </div>
                    <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">
                      setup_installer.ps1
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    مناسب مدیران شبکه ویندوز ۱۱ جهت نصب از طریق خط فرمان PowerShell به همراه گزارش رنگی مراحل.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadScript('setup_installer.ps1')}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود</span>
                    </button>
                    <button
                      onClick={() => handleCopyScriptCommand('powershell -ExecutionPolicy Bypass -File setup_installer.ps1', 'ps1-cmd')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      {copiedScriptCmd === 'ps1-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScriptCmd === 'ps1-cmd' ? 'دستور کپی شد' : 'کپی دستور اجرای پاورشل'}</span>
                    </button>
                  </div>
                </div>

                {/* Linux / Ubuntu Server */}
                <div className="bg-[#090f1d] border border-slate-800 hover:border-slate-700 transition rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs">نصاب سرور لینوکس (systemd)</span>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                      setup_installer.sh
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    نصب خودکار روی اوبونتو و دبیان، ثبت سرویس سیستمی hami-fleet.service با قابلیت ری‌استارت خودکار ۲۴/۷ و باز کردن فایروال UFW.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadScript('setup_installer.sh')}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود</span>
                    </button>
                    <button
                      onClick={() => handleCopyScriptCommand('sudo bash setup_installer.sh', 'sh-cmd')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      {copiedScriptCmd === 'sh-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScriptCmd === 'sh-cmd' ? 'دستور کپی شد' : 'کپی دستور: sudo bash setup_installer.sh'}</span>
                    </button>
                  </div>
                </div>

                {/* Utilities: Startup & Firewall */}
                <div className="bg-[#090f1d] border border-slate-800 hover:border-slate-700 transition rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-xs">فایل‌های کمکی ویندوز</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                      Utilities
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    فایل‌های آماده جهت راه‌اندازی روزانه، باز کردن مستقل فایروال یا حذف و پاکسازی میانبرها.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleDownloadScript('START_LAN_SERVER.bat')}
                      className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>START_LAN_SERVER</span>
                    </button>
                    <button
                      onClick={() => handleDownloadScript('SETUP_FIREWALL.bat')}
                      className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>SETUP_FIREWALL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* What Setup installer does checklist */}
              <div className="bg-[#091122] border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="text-white font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>مراحل ۶ گانه انجام‌شده در فایل ست‌آپ اولیه (Setup Wizard):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2 bg-[#0c162c] p-2.5 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۱</span>
                    <div>
                      <strong className="text-white block">بررسی و نصب خودکار Node.js:</strong>
                      <span className="text-slate-400 text-[10px]">شناسایی نسخه LTS و در صورت نیاز دانلود و نصب خودکار via winget یا MSI رسمی.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[#0c162c] p-2.5 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۲</span>
                    <div>
                      <strong className="text-white block">پیکربندی محیط و پایگاه داده:</strong>
                      <span className="text-slate-400 text-[10px]">ایجاد فایل .env و ساخت دیتابیس اولیه data/hami-database.json از روی نسخه پیش‌فرض.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[#0c162c] p-2.5 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۳</span>
                    <div>
                      <strong className="text-white block">نصب کتابخانه‌ها (npm install):</strong>
                      <span className="text-slate-400 text-[10px]">دانلود و اعتبارسنجی کامل پکیج‌های پروژه و ابزارهای موردنیاز سرور.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[#0c162c] p-2.5 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۴</span>
                    <div>
                      <strong className="text-white block">کامپایل نسخه تولیدی (npm run build):</strong>
                      <span className="text-slate-400 text-[10px]">تولید پکیج بهینه‌سازی‌شده PWA و فایل‌های تحت وب در پوشه dist.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[#0c162c] p-2.5 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۵</span>
                    <div>
                      <strong className="text-white block">پیکربندی فایروال ویندوز:</strong>
                      <span className="text-slate-400 text-[10px]">باز کردن پورت ۳۰۰۰ (TCP Inbound) برای دسترسی فوری سایر سیستم‌ها و گوشی‌ها.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[#0c162c] p-2.5 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۶</span>
                    <div>
                      <strong className="text-white block">ساخت میانبر دسکتاپ و منوی استارت:</strong>
                      <span className="text-slate-400 text-[10px]">ایجاد شورتکات ۱ کلیکی «سامانه لجستیک حامی بار» روی دسکتاپ و اجرای خودکار.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#091122] px-5 py-3 border-t border-[#172338] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>دیتابیس مشترک حامی — نسخه یکپارچه شبکه</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
