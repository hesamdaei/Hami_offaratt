import { FC, useState, useEffect } from 'react';
import {
  X,
  Shield,
  Network,
  Users,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  KeyRound,
  ExternalLink,
  Bot,
  Copy,
  Check,
  Send,
  CloudUpload,
  CloudDownload,
  Settings,
  Lock,
  BookOpen,
  Activity,
  PhoneCall,
  Phone,
  Volume2,
  Trash2,
  Clock,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { DataIntegrityDiagnosticTab } from './DataIntegrityDiagnosticTab';
import { AppUser } from '../types/auth';
import { isMasterAdmin, canManageSystemSettings } from '../utils/authService';
import {
  checkLanServerStatus,
  LanServerStatus,
  getCustomLanServerUrl,
  setCustomLanServerUrl,
  getLanServerBaseUrl,
} from '../utils/lanSyncService';
import {
  getBaleBotConfig,
  saveBaleBotConfig,
  sendBaleBotMessage,
  clearBaleHistory,
  getBaleHistory,
} from '../utils/baleService';
import { VoipConfig, VoipMode, VoipCallLog, DEFAULT_VOIP_CONFIG } from '../types/voip';
import {
  getVoipConfig,
  saveVoipConfig,
  testVoipConnection,
  getVoipCallLogs,
  clearVoipCallLogs,
} from '../utils/voipService';
import { toFaDigits } from '../utils/jalaali';

export type MasterAdminTab = 'api' | 'voip' | 'users' | 'backup' | 'debug';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  initialTab?: 'api' | 'network' | 'bale' | 'eitaa' | 'voip' | 'users' | 'backup' | 'debug';
  // Network sync callbacks
  onManualSync?: () => Promise<void> | void;
  onForceSaveToDb?: () => Promise<void> | void;
  onForceFetchFromDb?: () => Promise<void> | void;
  networkDbStatus?: 'CONNECTED' | 'SAVING' | 'SYNCED' | 'OFFLINE' | 'ERROR';
  lastDbSavedAt?: string | null;
  // User Management trigger
  onOpenUserManagement?: () => void;
  // Backup trigger
  onOpenBackup?: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onDataRepaired?: () => void;
}

export const MasterAdminModal: FC<MasterAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTab = 'api',
  onManualSync,
  onForceSaveToDb,
  onForceFetchFromDb,
  networkDbStatus = 'OFFLINE',
  lastDbSavedAt,
  onOpenUserManagement,
  onOpenBackup,
  onShowToast,
  onDataRepaired,
}) => {
  const normalizeTab = (t?: string): MasterAdminTab => {
    if (t === 'network' || t === 'bale' || t === 'eitaa' || t === 'api') return 'api';
    if (t === 'voip') return 'voip';
    if (t === 'users') return 'users';
    if (t === 'backup') return 'backup';
    if (t === 'debug') return 'debug';
    return 'api';
  };

  const [activeTab, setActiveTab] = useState<MasterAdminTab>(normalizeTab(initialTab));

  // Network State
  const [lanStatus, setLanStatus] = useState<LanServerStatus | null>(null);
  const [loadingLan, setLoadingLan] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [isSyncingAction, setIsSyncingAction] = useState<string | null>(null);

  // Bale Bot State
  const [botConfig, setBotConfig] = useState(getBaleBotConfig());
  const [testBotMessage, setTestBotMessage] = useState('سلام، این یک پیام آزمایشی از سامانه حامی در پیام‌رسان بله است.');
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  // VoIP PBX State
  const [voipConfig, setVoipConfig] = useState<VoipConfig>(getVoipConfig());
  const [isTestingVoip, setIsTestingVoip] = useState(false);
  const [voipTestResult, setVoipTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [voipLogs, setVoipLogs] = useState<VoipCallLog[]>([]);

  // Load state when opened
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(normalizeTab(initialTab));
    setBotConfig(getBaleBotConfig());
    setHistoryCount(getBaleHistory().length);
    setCustomServerUrl(getCustomLanServerUrl());
    setVoipConfig(getVoipConfig());
    setVoipTestResult(null);
    setVoipLogs(getVoipCallLogs());

    // Fetch LAN status
    setLoadingLan(true);
    checkLanServerStatus().then((res) => {
      setLanStatus(res);
      setLoadingLan(false);
    });
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Strict Security Check: Only Master Admin or authorized system manager can view or use this modal
  if (!canManageSystemSettings(currentUser)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="bg-[#0d1628] border border-rose-500/50 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl text-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">دسترسی مسدود است</h3>
          <p className="text-xs text-slate-300 mb-5 leading-relaxed">
            این بخش شامل تنظیمات زیرساختی، کلیدهای API، توکن‌های وب‌سرویس و سانترال ویپ است و منحصراً برای حساب کاربری مدیر ارشد مجاز می‌باشد.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            بازگشت به برنامه
          </button>
        </div>
      </div>
    );
  }

  // Handlers for Network & API
  const handleSaveCustomUrl = () => {
    setCustomLanServerUrl(customServerUrl);
    onShowToast('آدرس سرور شبکه ذخیره شد.', 'success');
    setLoadingLan(true);
    checkLanServerStatus().then((res) => {
      setLanStatus(res);
      setLoadingLan(false);
    });
  };

  const handleManualSyncAction = async (type: 'save' | 'fetch') => {
    setIsSyncingAction(type);
    try {
      if (type === 'save' && onForceSaveToDb) {
        await onForceSaveToDb();
        onShowToast('داده‌ها با موفقیت بر روی سرور مرکزی ذخیره شدند.', 'success');
      } else if (type === 'fetch' && onForceFetchFromDb) {
        await onForceFetchFromDb();
        onShowToast('آخرین تغییرات با موفقیت از سرور مرکزی دریافت شد.', 'success');
      }
    } catch {
      onShowToast('خطا در برقراری ارتباط با سرور شبکه.', 'error');
    } finally {
      setIsSyncingAction(null);
    }
  };

  const handleSaveBotSettings = () => {
    saveBaleBotConfig(botConfig);
    onShowToast('تنظیمات ربات بله با موفقیت ذخیره شد.', 'success');
  };

  const handleTestBotSend = async () => {
    if (!botConfig.botToken || !botConfig.channelOrChatId) {
      onShowToast('لطفاً ابتدا توکن ربات بله و شناسه چت را وارد نمایید.', 'error');
      return;
    }
    setIsSendingBot(true);
    const res = await sendBaleBotMessage(botConfig.botToken, botConfig.channelOrChatId, testBotMessage);
    setIsSendingBot(false);
    if (res.success) {
      onShowToast(res.message, 'success');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  const handleClearHistory = () => {
    clearBaleHistory();
    setHistoryCount(0);
    onShowToast('تاریخچه پیام‌های بله پاک‌سازی شد.', 'info');
  };

  // Handlers for VoIP
  const handleSaveVoip = () => {
    saveVoipConfig(voipConfig);
    onShowToast('تنظیمات سانترال ویپ با موفقیت ذخیره شد.', 'success');
  };

  const handleTestVoip = async () => {
    setIsTestingVoip(true);
    setVoipTestResult(null);
    try {
      const res = await testVoipConnection(voipConfig);
      setVoipTestResult(res);
      if (res.ok) {
        onShowToast(res.message, 'success');
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (e: any) {
      setVoipTestResult({ ok: false, message: e.message || 'خطا در ارتباط با سانترال' });
    } finally {
      setIsTestingVoip(false);
    }
  };

  const handleClearVoipLogs = () => {
    clearVoipCallLogs();
    setVoipLogs([]);
    onShowToast('تاریخچه تماس‌های ویپ پاک‌سازی شد.', 'info');
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] bg-[#0c1424] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-[#0d1629] to-slate-900 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  مرکز یکپارچه تنظیمات پیشرفته و امنیت سیستم
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  دسترسی اختصاصی ادمین
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                پیکربندی وب‌سرویس‌ها، توکن‌های API، سانترال تلفن ویپ (VoIP)، شبکه، کاربران و عیب‌یابی
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS (Segmented Control) */}
        <div className="p-2.5 bg-[#080e1c] border-b border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            {/* 1. API & Network */}
            <button
              onClick={() => setActiveTab('api')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>وب‌سرویس‌ها و API</span>
            </button>

            {/* 2. VoIP PBX */}
            <button
              onClick={() => setActiveTab('voip')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'voip'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>سانترال ویپ (VoIP)</span>
            </button>

            {/* 3. Users */}
            <button
              onClick={() => setActiveTab('users')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>کاربران و سطوح دسترسی</span>
            </button>

            {/* 4. Backup */}
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>پشتیبان‌گیری</span>
            </button>

            {/* 5. Diagnostics */}
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'debug'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>عیب‌یابی داده‌ها</span>
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: APIS & NETWORK (Unified APIs, Bale Bot, LAN Server) */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Section 1: Central Database LAN Server API */}
              <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">سرور مرکزی و وب‌سرویس همگام‌سازی شبکه (LAN DB API)</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      networkDbStatus === 'SYNCED'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : networkDbStatus === 'SAVING'
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {networkDbStatus === 'SYNCED'
                      ? 'همگام و متصل'
                      : networkDbStatus === 'SAVING'
                      ? 'درحال ذخیره‌سازی...'
                      : 'آماده ارتباط / آفلاین'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="bg-[#0b1222] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">آدرس فعال سرور:</span>
                    <span className="font-mono text-emerald-400 font-bold">{getLanServerBaseUrl()}</span>
                  </div>
                  <div className="bg-[#0b1222] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">آخرین ذخیره موفق:</span>
                    <span className="font-mono text-slate-200">
                      {lastDbSavedAt ? toFaDigits(lastDbSavedAt) : 'هنوز ثبت نشده است'}
                    </span>
                  </div>
                </div>

                {/* Force sync buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => handleManualSyncAction('save')}
                    disabled={isSyncingAction !== null}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{isSyncingAction === 'save' ? 'درحال ارسال...' : 'ارسال و ذخیره فوری روی سرور'}</span>
                  </button>

                  <button
                    onClick={() => handleManualSyncAction('fetch')}
                    disabled={isSyncingAction !== null}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <CloudDownload className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isSyncingAction === 'fetch' ? 'درحال دریافت...' : 'دریافت آخرین داده‌ها از سرور'}</span>
                  </button>
                </div>

                {/* Custom Server URL */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <label className="block text-[11px] text-slate-400">
                    آدرس سفارشی سرور مرکزی (در صورت استفاده از سرور اختصاصی شبکه شرکت):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={customServerUrl}
                      onChange={(e) => setCustomServerUrl(e.target.value)}
                      placeholder="http://192.168.1.100:3000"
                      className="flex-1 px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-amber-500"
                    />
                    <button
                      onClick={handleSaveCustomUrl}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      ذخیره URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Bale Messenger Official Bot API */}
              <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">وب‌سرویس و ربات رسمی بله (Bale Bot API)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={botConfig.isEnabled}
                      onChange={(e) => setBotConfig({ ...botConfig, isEnabled: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>فعال‌سازی ارسال با ربات</span>
                  </label>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      توکن اختصاصی ربات بله (دریافتی از @BotFather):
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={botConfig.botToken}
                      onChange={(e) => setBotConfig({ ...botConfig, botToken: e.target.value })}
                      placeholder="123456789:ABCdefGhIjkLmNoPqRsTuVwXyZ"
                      className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      شناسه کانال یا چت پیش‌فرض (Chat ID):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={botConfig.channelOrChatId}
                      onChange={(e) => setBotConfig({ ...botConfig, channelOrChatId: e.target.value })}
                      placeholder="مثال: 987654321 یا @my_fleet_channel"
                      className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <button
                    onClick={handleSaveBotSettings}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    ذخیره تنظیمات بله
                  </button>

                  <button
                    onClick={handleTestBotSend}
                    disabled={isSendingBot || !botConfig.botToken}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSendingBot ? 'درحال ارسال تست...' : 'تست وب‌سرویس بله'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VOIP PBX (Unified Asterisk AMI, CTI, Test & Guide) */}
          {activeTab === 'voip' && (
            <div className="space-y-4">
              {/* VoIP Mode Selector */}
              <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">شیوه برقراری تماس و پروتکل ارتباطی</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voipConfig.enabled}
                      onChange={(e) => setVoipConfig({ ...voipConfig, enabled: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>سیستم ویپ فعال است</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setVoipConfig({ ...voipConfig, mode: 'asterisk_ami' })}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer ${
                      voipConfig.mode === 'asterisk_ami'
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-white shadow-sm ring-1 ring-emerald-500/40'
                        : 'bg-[#0b1222] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">۱. سانترال استریسک / ایزابل (AMI)</span>
                      <Server className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      ابتدا گوشی رومیزی شما زنگ می‌خورد، با برداشتن گوشی به مخاطب وصل می‌شوید (پیش‌فرض پیشنهادی).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoipConfig({ ...voipConfig, mode: 'softphone' })}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer ${
                      voipConfig.mode === 'softphone'
                        ? 'bg-blue-950/50 border-blue-500/60 text-white shadow-sm ring-1 ring-blue-500/40'
                        : 'bg-[#0b1222] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">۲. سافت‌فون سیستم (MicroSIP / Zoiper)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      شماره‌گیری مستقیم در نرم‌افزار تلفنی نصب‌شده روی ویندوز از طریق پروتکل tel: بدون نیاز به رمز سانترال.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoipConfig({ ...voipConfig, mode: 'ipphone_cti' })}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer ${
                      voipConfig.mode === 'ipphone_cti'
                        ? 'bg-purple-950/50 border-purple-500/60 text-white shadow-sm ring-1 ring-purple-500/40'
                        : 'bg-[#0b1222] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">۳. تلفن تحت شبکه CTI (یالینک/گرنداستریم)</span>
                      <Radio className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      فرمان مستقیم HTTP Action URI به آی‌پی گوشی رومیزی اپراتور (Yealink / Grandstream).
                    </p>
                  </button>
                </div>
              </div>

              {/* Asterisk AMI Configuration Box */}
              {voipConfig.mode === 'asterisk_ami' && (
                <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">مشخصات اتصال به Asterisk Manager Interface (AMI)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      پورت استاندارد: ۵۰۳۸
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">آدرس IP سرور ویپ (ایزابل / استریسک):</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={voipConfig.amiHost}
                        onChange={(e) => setVoipConfig({ ...voipConfig, amiHost: e.target.value })}
                        placeholder="192.168.1.200"
                        className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">پورت AMI سرور:</label>
                      <input
                        type="number"
                        dir="ltr"
                        value={voipConfig.amiPort}
                        onChange={(e) => setVoipConfig({ ...voipConfig, amiPort: parseInt(e.target.value, 10) || 5038 })}
                        placeholder="5038"
                        className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">نام کاربری AMI (Manager User):</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={voipConfig.amiUser}
                        onChange={(e) => setVoipConfig({ ...voipConfig, amiUser: e.target.value })}
                        placeholder="admin یا hamibar"
                        className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">رمز عبور AMI (Secret):</label>
                      <input
                        type="password"
                        dir="ltr"
                        value={voipConfig.amiSecret}
                        onChange={(e) => setVoipConfig({ ...voipConfig, amiSecret: e.target.value })}
                        placeholder="رمز امنیتی سرور ویپ"
                        className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">شماره داخلی پیش‌فرض دیسپچ:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={voipConfig.operatorExtension}
                        onChange={(e) => setVoipConfig({ ...voipConfig, operatorExtension: e.target.value })}
                        placeholder="101"
                        className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-amber-300 font-mono font-bold text-center focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">پیش‌شماره خط شهری (Trunk Prefix):</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={voipConfig.dialPrefix}
                        onChange={(e) => setVoipConfig({ ...voipConfig, dialPrefix: e.target.value })}
                        placeholder="9 یا 0 (در صورت نیاز)"
                        className="w-full px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-center focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voipConfig.autoAnswer}
                        onChange={(e) => setVoipConfig({ ...voipConfig, autoAnswer: e.target.checked })}
                        className="rounded accent-emerald-500"
                      />
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>پاسخگویی خودکار بلندگوی تلفن (Intercom / Auto-Answer)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">نوع کانال داخلی:</span>
                      <select
                        value={voipConfig.channelType}
                        onChange={(e) => setVoipConfig({ ...voipConfig, channelType: e.target.value as any })}
                        className="px-2 py-1 bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 text-xs font-mono"
                      >
                        <option value="SIP">chan_sip (SIP)</option>
                        <option value="PJSIP">chan_pjsip (PJSIP)</option>
                        <option value="Local">Local Context</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* IP Phone CTI Configuration Box */}
              {voipConfig.mode === 'ipphone_cti' && (
                <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">تنظیمات مستقیم تلفن رومیزی تحت شبکه (CTI Action URI)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">مدل تلفن:</label>
                      <select
                        value={voipConfig.ipPhoneModel}
                        onChange={(e) => setVoipConfig({ ...voipConfig, ipPhoneModel: e.target.value as any })}
                        className="w-full px-3 py-1.5 bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200"
                      >
                        <option value="yealink">یالینک (Yealink T-Series / SIP-T3)</option>
                        <option value="grandstream">گرنداستریم (Grandstream GXP / GRP)</option>
                        <option value="fanvil">فانویل (Fanvil X-Series)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">آدرس IP تلفن رومیزی:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={voipConfig.ipPhoneIp}
                        onChange={(e) => setVoipConfig({ ...voipConfig, ipPhoneIp: e.target.value })}
                        placeholder="192.168.1.45"
                        className="w-full px-3 py-1.5 bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">رمز وب تلفن (پیش‌فرض admin):</label>
                      <input
                        type="password"
                        dir="ltr"
                        value={voipConfig.ipPhonePass}
                        onChange={(e) => setVoipConfig({ ...voipConfig, ipPhonePass: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons & Live Test Box */}
              <div className="p-4 rounded-xl bg-[#091122] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveVoip}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ذخیره تنظیمات ویپ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestVoip}
                    disabled={isTestingVoip}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isTestingVoip ? 'animate-spin' : ''}`} />
                    <span>{isTestingVoip ? 'درحال آزمایش...' : 'تست اتصال به سرور ویپ'}</span>
                  </button>
                </div>

                {/* Test Result Message */}
                {voipTestResult && (
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      voipTestResult.ok
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {voipTestResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{voipTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Call History & IT Guide */}
              <div className="p-3.5 rounded-xl bg-[#111a30] border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200 block">سوابق تماس‌های خروجی ویپ:</span>
                  <span className="text-[11px] text-slate-400">
                    تعداد تماس‌های ثبت شده در این سیستم: {toFaDigits(voipLogs.length)} مورد
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearVoipLogs}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs transition cursor-pointer"
                >
                  پاک‌سازی سوابق تماس
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: USERS ACCESS */}
          {activeTab === 'users' && (
            <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">مدیریت کاربران و سطوح دسترسی (RBAC)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تعریف کاربران جدید، تعیین رمز عبور امن، فعال/غیرفعال کردن حساب‌ها و اعطای مجوز به ماژول‌های سامانه
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenUserManagement) onOpenUserManagement();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>باز کردن پنجره مدیریت کاربران</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & DATA */}
          {activeTab === 'backup' && (
            <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">پشتیبان‌گیری و ایمنی داده‌ها</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    دریافت فایل JSON از کلیه اطلاعات ناوگان، رانندگان، پرسنل، لاگ‌ها و سوابق عملیاتی
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenBackup) onOpenBackup();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>مدیریت فایل‌های پشتیبان</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: DATA INTEGRITY & DEBUG */}
          {activeTab === 'debug' && (
            <DataIntegrityDiagnosticTab
              onShowToast={onShowToast}
              onDataRepaired={onDataRepaired}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-[#090f1e] border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            پنل اختصاصی مدیریت سامانه • دسترسی محدود به مدیران ارشد سیستم
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
