import { FC, useState, useEffect } from 'react';
import {
  X,
  Shield,
  Network,
  MessageSquare,
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
} from 'lucide-react';
import { DataIntegrityDiagnosticTab } from './DataIntegrityDiagnosticTab';
import { AppUser } from '../types/auth';
import { isMasterAdmin } from '../utils/authService';
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
import { toFaDigits } from '../utils/jalaali';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  initialTab?: 'network' | 'bale' | 'eitaa' | 'users' | 'backup' | 'debug';
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
  initialTab = 'network',
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
  const effectiveTab = initialTab === 'eitaa' ? 'bale' : initialTab;
  const [activeTab, setActiveTab] = useState<'network' | 'bale' | 'users' | 'backup' | 'debug'>(effectiveTab as any);

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

  // Load state when opened
  useEffect(() => {
    if (!isOpen) return;
    const tabToSet = initialTab === 'eitaa' ? 'bale' : initialTab;
    setActiveTab(tabToSet as any);
    setBotConfig(getBaleBotConfig());
    setHistoryCount(getBaleHistory().length);
    setCustomServerUrl(getCustomLanServerUrl());

    // Fetch LAN status
    setLoadingLan(true);
    checkLanServerStatus().then((res) => {
      setLanStatus(res);
      setLoadingLan(false);
    });
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Strict Security Check: Only Master Admin can view or use this modal
  if (!isMasterAdmin(currentUser)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
        <div className="bg-[#0f172a] border border-rose-500/50 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">دسترسی مسدود است</h3>
          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            این بخش شامل تنظیمات زیرساختی شبکه و سرور مرکزی است و منحصراً برای حساب کاربری مدیر ارشد مجاز می‌باشد.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            بازگشت به برنامه
          </button>
        </div>
      </div>
    );
  }

  // Handlers
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0c1427] border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#17233f] via-[#111c33] to-[#0c1427] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  مدیریت زیرساخت، شبکه و پیام‌رسان
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  مدیریت سیستم
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مدیریت شبکه LAN، تنظیمات ربات بله، سطوح دسترسی، پشتیبان‌گیری و عیب‌یابی داده‌ها
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS (Segmented Control) */}
        <div className="p-3 bg-[#090f1e] border-b border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('network')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'network'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>شبکه LAN</span>
            </button>
            <button
              onClick={() => setActiveTab('bale')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'bale'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-black text-white">
                ب
              </div>
              <span>ربات بله</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>کاربران</span>
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>بک‌آپ</span>
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'debug'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
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
          {/* TAB 1: NETWORK SETTINGS */}
          {activeTab === 'network' && (
            <div className="space-y-4">
              {/* Server Status Box */}
              <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">وضعیت سرور مرکزی شبکه LAN</span>
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
                    <span className="text-[10px] text-slate-400 block mb-0.5">آخرین ذخیره موفقیت‌آمیز:</span>
                    <span className="font-mono text-slate-200">
                      {lastDbSavedAt ? toFaDigits(lastDbSavedAt) : 'هنوز ثبت نشده است'}
                    </span>
                  </div>
                </div>

                {/* Force sync buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleManualSyncAction('save')}
                    disabled={isSyncingAction !== null}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{isSyncingAction === 'save' ? 'درحال ارسال...' : 'ارسال و ذخیره فوری روی سرور'}</span>
                  </button>

                  <button
                    onClick={() => handleManualSyncAction('fetch')}
                    disabled={isSyncingAction !== null}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <CloudDownload className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isSyncingAction === 'fetch' ? 'درحال دریافت...' : 'دریافت آخرین داده‌ها از سرور'}</span>
                  </button>
                </div>
              </div>

              {/* Custom URL Setting */}
              <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 block">
                  تنظیم آدرس اختصاصی سرور شبکه محلی (در صورت تغییر IP یا پورت):
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={customServerUrl}
                    onChange={(e) => setCustomServerUrl(e.target.value)}
                    placeholder="مثال: http://192.168.1.100:3000"
                    className="flex-1 px-3 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    onClick={handleSaveCustomUrl}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition"
                  >
                    ذخیره آدرس
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  اگر خالی بگذارید، از آدرس اتوماتیک هاست جاری سامانه استفاده خواهد شد.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: BALE SETTINGS */}
          {activeTab === 'bale' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">تنظیمات ربات رسمی پیام‌رسان بله (Bale Bot API)</span>
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
                      توکن ربات بله (دریافتی از @BotFather در بله):
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
                    <span>{isSendingBot ? 'درحال ارسال تست...' : 'تست ارسال به بله'}</span>
                  </button>
                </div>
              </div>

              {/* History & Cache management */}
              <div className="p-3.5 rounded-xl bg-[#111a30] border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200 block">تاریخچه پیام‌های ارسالی بله:</span>
                  <span className="text-[11px] text-slate-400">
                    تعداد پیام‌های ثبت شده: {toFaDigits(historyCount)} پیام
                  </span>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs transition cursor-pointer"
                >
                  پاک‌سازی تاریخچه
                </button>
              </div>

              {/* In-app Bale Integration Guide Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1a2e] to-[#0f243d] border border-blue-500/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-400 font-bold">
                    <BookOpen className="w-4 h-4" />
                    <span>راهنمای اتصال به بله (فایل BALE_INTEGRATION_GUIDE.md)</span>
                  </div>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">
                    Bale Bot API
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  مستندات کامل گام‌به‌گام در ریشه پروژه با نام <code className="text-amber-300 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">BALE_INTEGRATION_GUIDE.md</code> ذخیره شد. خلاصه مراحل اتصال:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                  <div className="bg-[#081220]/70 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-white block mb-0.5">۱. ساخت ربات در @BotFather</strong>
                    در پیام‌رسان بله به <span className="text-sky-300 font-mono">@BotFather</span> پیام داده و با دستور <code className="text-amber-300 font-mono">/newbot</code> توکن اختصاصی بگیرید.
                  </div>
                  <div className="bg-[#081220]/70 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-white block mb-0.5">۲. تعیین Chat ID گیرنده</strong>
                    ربات را به کانال رانندگان اضافه کنید (مانند <span className="text-sky-300 font-mono">@channel_id</span>) یا راننده یک‌بار در ربات Start بزند.
                  </div>
                  <div className="bg-[#081220]/70 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-white block mb-0.5">۳. ثبت توکن و ذخیره</strong>
                    توکن و Chat ID را در کادرهای بالا وارد کرده، تیک فعال‌سازی را بزنید و ذخیره نمایید.
                  </div>
                  <div className="bg-[#081220]/70 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-white block mb-0.5">۴. ارسال مستقیم در سیستم</strong>
                    در نوبت‌دهی صبحگاهی، اعزام بار، پایش تعویض روغن یا مرخصی‌ها با یک کلیک پیام ارسال کنید.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS ACCESS */}
          {activeTab === 'users' && (
            <div className="p-4 rounded-xl bg-[#111a30] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">مدیریت کاربران و سطوح دسترسی</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تعریف کاربران جدید، تعیین رمز عبور، فعال/غیرفعال کردن و اعطای دسترسی به بخش‌های مختلف
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenUserManagement) onOpenUserManagement();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
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
                    دریافت فایل JSON از کلیه اطلاعات ناوگان، رانندگان، پرسنل و تاریخچه سرویس‌ها
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenBackup) onOpenBackup();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
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
            پنل اختصاصی مدیریت سامانه • کلیه تغییرات بر روی مرورگر و دیتابیس مرکزی اعمال می‌گردد.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
