import { FC, useState, useEffect } from 'react';
import {
  X,
  PhoneCall,
  Server,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Volume2,
  Trash2,
  Clock,
  User,
  Shield,
  Smartphone,
  Check,
  Radio,
  Lock,
} from 'lucide-react';
import { VoipConfig, VoipMode, VoipCallLog, DEFAULT_VOIP_CONFIG } from '../types/voip';
import {
  getVoipConfig,
  saveVoipConfig,
  testVoipConnection,
  getVoipCallLogs,
  clearVoipCallLogs,
} from '../utils/voipService';
import { toFaDigits } from '../utils/jalaali';
import { AppUser } from '../types/auth';
import { canManageSystemSettings } from '../utils/authService';

interface VoipSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const VoipSettingsModal: FC<VoipSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
}) => {
  const [config, setConfig] = useState<VoipConfig>(getVoipConfig());
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'guide'>('config');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [callLogs, setCallLogs] = useState<VoipCallLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      setConfig(getVoipConfig());
      setTestResult(null);
      setCallLogs(getVoipCallLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (currentUser && !canManageSystemSettings(currentUser)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#0d1628] border border-rose-500/50 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl text-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">دسترسی مسدود است</h3>
          <p className="text-xs text-slate-300 mb-5 leading-relaxed">
            تنظیمات سانترال ویپ و کلمات عبور سرور فقط برای مدیران ارشد سیستم در دسترس است.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    saveVoipConfig(config);
    onShowToast?.('تنظیمات سیستم تلفنی ویپ با موفقیت ذخیره شد.', 'success');
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testVoipConnection(config);
      setTestResult(res);
      if (res.ok) {
        onShowToast?.(res.message, 'success');
      } else {
        onShowToast?.(res.message, 'error');
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'خطا در آزمون اتصال' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearLogs = () => {
    clearVoipCallLogs();
    setCallLogs([]);
    onShowToast?.('تاریخچه تماس‌ها پاک شد.', 'info');
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0c1424] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900/80 p-4 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-md">
              <PhoneCall className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">پیکربندی سیستم تلفنی ویپ (VoIP Click-to-Call)</h2>
              <p className="text-xs text-slate-400">اتصال مستقیم نرم‌افزار به تلفن‌های رومیزی، سانترال استریسک و ایزابل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex bg-[#080e1c] p-1 border-b border-slate-800 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>تنظیمات ارتباط با سانترال</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>تاریخچه تماس‌ها ({toFaDigits(callLogs.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>راهنمای راه‌اندازی (استریسک و یالینک)</span>
          </button>
        </div>

        {/* Tab Content - Scrollable */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5 text-xs">
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Operator Extension & Trunk Prefix Strip */}
              <div className="bg-[#111c30] p-4 rounded-2xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>مشخصات داخلی میز کار شما (Operator Extension)</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">اختصاصی اپراتور</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      شماره داخلی تلفن رومیزی شما (Extension)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={config.operatorExtension}
                      onChange={(e) => setConfig({ ...config, operatorExtension: e.target.value })}
                      placeholder="مثلاً 101 یا 102 یا 200"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-center text-sm font-bold focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      هنگام کلیک روی شماره، ابتدا این تلفن رومیزی زنگ می‌خورد.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      پیش‌شماره آزاد کردن خط شهری (Dial Prefix)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={config.dialPrefix}
                      onChange={(e) => setConfig({ ...config, dialPrefix: e.target.value })}
                      placeholder="مثلاً 9 یا خالی"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-center text-sm font-bold focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      در صورتی که سانترال برای خروج عدد ۹ می‌خواهد، اینجا وارد نمایید.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dialing Mode Selection */}
              <div>
                <label className="block text-slate-300 font-bold mb-2">
                  روش برقراری تماس با سیستم ویپ (Dialing Engine):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Mode 1: Softphone */}
                  <div
                    onClick={() => setConfig({ ...config, mode: 'softphone' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      config.mode === 'softphone'
                        ? 'bg-blue-950/40 border-blue-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>سافت‌فون ویندوز (MicroSIP / Zoiper)</span>
                        {config.mode === 'softphone' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        شماره‌گیری فوری در نرم‌افزارهای تلفنی کامپیوتر با یک کلیک (بدون نیاز به تنظیم سرور).
                      </p>
                    </div>
                  </div>

                  {/* Mode 2: Asterisk AMI */}
                  <div
                    onClick={() => setConfig({ ...config, mode: 'asterisk_ami' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      config.mode === 'asterisk_ami'
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>سانترال استریسک / ایزابل (AMI)</span>
                        {config.mode === 'asterisk_ami' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        زنگ خوردن مستقیم تلفن رومیزی روی میز کار (Asterisk / Issabel / FreePBX).
                      </p>
                    </div>
                  </div>

                  {/* Mode 3: Hardware IP Phone Direct CTI */}
                  <div
                    onClick={() => setConfig({ ...config, mode: 'ipphone_cti' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      config.mode === 'ipphone_cti'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>تلفن رومیزی تحت شبکه (Yealink / Grandstream)</span>
                        {config.mode === 'ipphone_cti' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        فرمان مستقیم به IP تلفن روی میز (Action URI) جهت شماره‌گیری روی اسپیکر.
                      </p>
                    </div>
                  </div>

                  {/* Mode 4: Custom Webhook */}
                  <div
                    onClick={() => setConfig({ ...config, mode: 'webhook' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      config.mode === 'webhook'
                        ? 'bg-purple-950/40 border-purple-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>وب‌هوک سفارشی سانترال (HTTP API)</span>
                        {config.mode === 'webhook' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        ارسال پارامترهای تماس به یک URL یا اسکریپت PHP بر روی سانترال ویپ.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode-Specific Sub-Settings */}
              {config.mode === 'softphone' && (
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="font-bold text-slate-200">تنظیمات پروتکل سافت‌فون سیستم‌عامل</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="softphoneProtocol"
                        checked={config.softphoneProtocol === 'tel'}
                        onChange={() => setConfig({ ...config, softphoneProtocol: 'tel' })}
                        className="text-blue-600"
                      />
                      <span>پروتکل استاندارد tel: (پیشنهادی برای MicroSIP و ویندوز)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="softphoneProtocol"
                        checked={config.softphoneProtocol === 'sip'}
                        onChange={() => setConfig({ ...config, softphoneProtocol: 'sip' })}
                        className="text-blue-600"
                      />
                      <span>پروتکل sip: (ویژه Zoiper و 3CX)</span>
                    </label>
                  </div>
                </div>
              )}

              {config.mode === 'asterisk_ami' && (
                <div className="p-4 bg-slate-900/70 rounded-2xl border border-amber-900/40 space-y-3.5">
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span>مشخصات اتصال به مرکز تلفن استریسک / ایزابل (Asterisk Manager)</span>
                    <span className="text-[11px] text-slate-400 font-mono">Port 5038</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">آدرس IP سرور سانترال (Host)</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={config.amiHost}
                        onChange={(e) => setConfig({ ...config, amiHost: e.target.value })}
                        placeholder="192.168.1.200"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">پورت AMI استریسک</label>
                      <input
                        type="number"
                        dir="ltr"
                        value={config.amiPort}
                        onChange={(e) => setConfig({ ...config, amiPort: parseInt(e.target.value, 10) || 5038 })}
                        placeholder="5038"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">نوع کانال داخلی (Channel)</label>
                      <select
                        value={config.channelType}
                        onChange={(e) => setConfig({ ...config, channelType: e.target.value as any })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="SIP">SIP (استاندارد ایزابل و الستیکس)</option>
                        <option value="PJSIP">PJSIP (استریسک‌های جدید و FreePBX)</option>
                        <option value="Local">Local (کانتکست داخلی)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">نام کاربری AMI (Username)</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={config.amiUser}
                        onChange={(e) => setConfig({ ...config, amiUser: e.target.value })}
                        placeholder="admin یا hamibar"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">رمز عبور AMI (Secret)</label>
                      <input
                        type="password"
                        dir="ltr"
                        value={config.amiSecret}
                        onChange={(e) => setConfig({ ...config, amiSecret: e.target.value })}
                        placeholder="رمز تعریف شده در manager.conf"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">کانتکست تماس (Context)</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={config.amiContext}
                        onChange={(e) => setConfig({ ...config, amiContext: e.target.value })}
                        placeholder="from-internal"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="autoAnswerChk"
                      checked={config.autoAnswer}
                      onChange={(e) => setConfig({ ...config, autoAnswer: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <label htmlFor="autoAnswerChk" className="text-slate-300 cursor-pointer">
                      فعال‌سازی پاسخگویی خودکار بلندگوی گوشی (Auto-Answer / Intercom) در صورت پشتیبانی تلفن
                    </label>
                  </div>
                </div>
              )}

              {config.mode === 'ipphone_cti' && (
                <div className="p-4 bg-slate-900/70 rounded-2xl border border-emerald-900/40 space-y-3.5">
                  <div className="font-bold text-emerald-300">پیکربندی کنترل مستقیم تلفن تحت شبکه رومیزی (Action URI)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">برند تلفن رومیزی</label>
                      <select
                        value={config.ipPhoneModel}
                        onChange={(e) => setConfig({ ...config, ipPhoneModel: e.target.value as any })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                      >
                        <option value="yealink">یالینک (Yealink T21/T23/T27/T46)</option>
                        <option value="grandstream">گرنداستریم (Grandstream GXP/GRP)</option>
                        <option value="fanvil">فنویل (Fanvil X Series)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">آدرس IP تلفن رومیزی</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={config.ipPhoneIp}
                        onChange={(e) => setConfig({ ...config, ipPhoneIp: e.target.value })}
                        placeholder="192.168.1.45"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">نام کاربری تلفن</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={config.ipPhoneUser}
                        onChange={(e) => setConfig({ ...config, ipPhoneUser: e.target.value })}
                        placeholder="admin"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">رمز عبور تلفن</label>
                      <input
                        type="password"
                        dir="ltr"
                        value={config.ipPhonePass}
                        onChange={(e) => setConfig({ ...config, ipPhonePass: e.target.value })}
                        placeholder="admin"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {config.mode === 'webhook' && (
                <div className="p-4 bg-slate-900/70 rounded-2xl border border-purple-900/40 space-y-3">
                  <div className="font-bold text-purple-300">تنظیمات آدرس وب‌هوک سانترال اختصاصی</div>
                  <div>
                    <label className="block text-slate-300 mb-1">آدرس URL وب‌هوک تماس</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={config.webhookUrl}
                      onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                      placeholder="http://192.168.1.200/call.php?from={from}&to={to}"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      می‌توانید از متغیرهای <code className="text-amber-300">{"{to}"}</code> (شماره مقصد) و <code className="text-amber-300">{"{from}"}</code> (داخلی اپراتور) در URL استفاده فرمایید.
                    </p>
                  </div>
                </div>
              )}

              {/* Test Result Message Box */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    testResult.ok
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              {/* Action Buttons: Test Connection & Save */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> : <Server className="w-4 h-4 text-blue-400" />}
                  <span>تست ارتباط با مرکز تلفن</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-900/30 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>ذخیره تنظیمات ویپ</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">آخرین تماس‌های خروجی ثبت‌شده از طریق سامانه:</span>
                {callLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>پاک کردن سوابق</span>
                  </button>
                )}
              </div>

              {callLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  هنوز تماسی ثبت نشده است. با کلیک روی شماره رانندگان یا پرسنل، تماس برقرار خواهد شد.
                </div>
              ) : (
                <div className="space-y-2">
                  {callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            log.status === 'connected'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : log.status === 'failed'
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-blue-500/15 text-blue-400'
                          }`}
                        >
                          <PhoneCall className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{log.recipientName}</span>
                            <span className="font-mono text-emerald-400 text-xs" dir="ltr">
                              {toFaDigits(log.phoneNumber)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            داخلی مبدأ: {toFaDigits(log.operatorExtension)} · {log.message}
                          </div>
                        </div>
                      </div>
                      <div className="text-left font-mono text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 leading-relaxed text-slate-300">
              <div className="bg-blue-950/30 p-4 rounded-2xl border border-blue-900/40 space-y-2">
                <h3 className="font-bold text-blue-300 text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span>راهنمای تماس خودکار به همراه زنگ خوردن تلفن رومیزی (Originate)</span>
                </h3>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  هنگامی که گزینه <strong>«استریسک / ایزابل (AMI)»</strong> را انتخاب می‌کنید، سامانه از طریق پروتکل مدیریت استریسک، به تلفن رومیزی شما زنگ می‌زند. به محض آنکه اپراتور گوشی را بردارد یا دکمه اسپیکر را لمس کند، سانترال بلافاصله شماره راننده را بدون نیاز به تایپ دستی شماره‌گیری می‌کند!
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs">۱. تنظیمات مرکز تلفن ایزابل (Issabel) یا استریسک:</h4>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <div className="text-slate-400"># فایل /etc/asterisk/manager.conf بر روی سرور ایزابل:</div>
                  <div className="text-amber-300">[hamibar]</div>
                  <div>secret = your_secure_password</div>
                  <div>deny = 0.0.0.0/0.0.0.0</div>
                  <div>permit = 192.168.1.0/255.255.255.0</div>
                  <div>read = system,call,log,verbose,command,agent,user,originate</div>
                  <div>write = system,call,log,verbose,command,agent,user,originate</div>
                </div>
                <p className="text-[11px] text-slate-400">
                  سپس در کنسول لینوکس سانترال دستور <code className="text-amber-300">asterisk -rx "manager reload"</code> را اجرا کنید.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">۲. تنظیمات تلفن رومیزی یالینک (Yealink Action URI):</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  اگر می‌خواهید مستقیماً تلفن رومیزی یالینک خود را کنترل کنید، وارد پنل وب تلفن یالینک خود شده، به منوی <strong>Features -&gt; Remote Control</strong> بروید و در بخش <strong>Action URI allow IP List</strong> عبارت <code className="text-amber-300">any</code> یا آی‌پی سرور برنامه حامی بار را وارد نمایید.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">۳. راه‌اندازی سریع در ویندوز با نرم‌افزار رایگان MicroSIP:</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  اگر تلفن رومیزی ندارید، نرم‌افزار رایگان <strong>MicroSIP</strong> را روی ویندوز نصب کرده و داخلی خود را در آن رجیستر کنید. با انتخاب حالت «سافت‌فون ویندوز»، با کلیک روی هر شماره تلفن در برنامه، میکرو‌سیپ بلافاصله اقدام به برقراری تماس می‌نماید.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
