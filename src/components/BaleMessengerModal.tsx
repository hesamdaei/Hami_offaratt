import { FC, useState, useMemo, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Truck,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Droplet,
  FileText,
  UserCheck,
  DollarSign,
  Sparkles,
  Bot,
  History,
  Phone,
  Settings,
  HelpCircle,
  Share2,
} from 'lucide-react';
import {
  BALE_MESSAGE_TEMPLATES,
  BaleMessageTemplate,
  BaleTemplateContext,
  fillBaleTemplate,
  getBaleShareUrl,
  openBaleWeb,
  copyMessageToClipboard,
  shareViaWebShare,
  getBaleHistory,
  saveBaleHistoryItem,
  clearBaleHistory,
  BaleHistoryItem,
  getBaleBotConfig,
  saveBaleBotConfig,
  sendBaleBotMessage,
} from '../utils/baleService';
import { DriverDirectoryItem, VehicleItem } from '../utils/fleetSeedData';
import { StaffMember } from '../types';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { AppUser } from '../types/auth';

interface BaleMessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers?: DriverDirectoryItem[];
  vehicles?: VehicleItem[];
  staff?: StaffMember[];
  initialRecipient?: {
    name?: string;
    phone?: string;
    vehicleCode?: string | number;
    plateNumber?: string;
    vehicleType?: string;
    mileage?: number;
    templateId?: string;
    customNote?: string;
  } | null;
  currentDispatcherName?: string;
  currentUser?: AppUser | null;
}

export const BaleMessengerModal: FC<BaleMessengerModalProps> = ({
  isOpen,
  onClose,
  drivers = [],
  vehicles = [],
  staff = [],
  initialRecipient = null,
  currentDispatcherName = 'دیسپچ مرکزی',
  currentUser = null,
}) => {
  // Navigation Tabs: Composer, History, Bot Settings, Guide
  const [activeTab, setActiveTab] = useState<'composer' | 'history' | 'bot' | 'guide'>('composer');

  // Selected template
  const [selectedTemplate, setSelectedTemplate] = useState<BaleMessageTemplate>(
    BALE_MESSAGE_TEMPLATES[0]
  );

  // Recipient selection mode: 'driver' | 'staff' | 'custom'
  const [recipientMode, setRecipientMode] = useState<'driver' | 'staff' | 'custom'>('driver');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected entity data
  const [selectedDriver, setSelectedDriver] = useState<DriverDirectoryItem | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Custom recipient input
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [customRecipientPhone, setCustomRecipientPhone] = useState('');

  // Editable parameters for template
  const [destination, setDestination] = useState('');
  const [cargo, setCargo] = useState('اثاثیه منزل و لوازم اداری');
  const [workerCount, setWorkerCount] = useState('۲');
  const [customNote, setCustomNote] = useState('');
  const [customTime, setCustomTime] = useState('۰۸:۳۰');
  const [customDate, setCustomDate] = useState(() => getTodayJalaali().fullFa);
  const [settlementAmount, setSettlementAmount] = useState('۲,۵۰۰,۰۰۰');

  // Final message text in editor (allows arbitrary edits before sending)
  const [messageBody, setMessageBody] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<BaleHistoryItem[]>([]);

  // Bot Config state
  const [botConfig, setBotConfig] = useState(getBaleBotConfig());
  const [isSendingBot, setIsSendingBot] = useState(false);

  // Initialize or update with initialRecipient prop
  useEffect(() => {
    if (!isOpen) return;

    setHistoryItems(getBaleHistory());
    setBotConfig(getBaleBotConfig());

    if (initialRecipient) {
      if (initialRecipient.templateId) {
        const foundTpl = BALE_MESSAGE_TEMPLATES.find((t) => t.id === initialRecipient.templateId);
        if (foundTpl) setSelectedTemplate(foundTpl);
      }

      if (initialRecipient.customNote) {
        setCustomNote(initialRecipient.customNote);
      }

      // Try matching driver
      if (initialRecipient.name) {
        const match = drivers.find((d) => d.name === initialRecipient.name);
        if (match) {
          setSelectedDriver(match);
          setRecipientMode('driver');
        } else {
          setCustomRecipientName(initialRecipient.name);
          setCustomRecipientPhone(initialRecipient.phone || '');
          setRecipientMode('custom');
        }
      }

      // Try matching vehicle
      if (initialRecipient.vehicleCode) {
        const matchedVeh = vehicles.find((v) => String(v.code) === String(initialRecipient.vehicleCode));
        if (matchedVeh) setSelectedVehicle(matchedVeh);
      }
    } else if (drivers.length > 0 && !selectedDriver) {
      setSelectedDriver(drivers[0]);
    }
  }, [isOpen, initialRecipient]);

  // When driver changes, auto-select their vehicle if available
  useEffect(() => {
    if (selectedDriver && selectedDriver.assignedVehicles && selectedDriver.assignedVehicles.length > 0) {
      const plate = selectedDriver.assignedVehicles[0];
      const matched = vehicles.find((v) => v.plate === plate);
      if (matched) {
        setSelectedVehicle(matched);
      }
    }
  }, [selectedDriver, vehicles]);

  // Re-generate message body whenever inputs or templates change
  useEffect(() => {
    const ctx: BaleTemplateContext = {
      dispatcherName: currentDispatcherName,
      companyName: 'سامانه ترابری حامی',
      date: customDate,
      time: customTime,
      destination: destination || undefined,
      cargo: cargo || undefined,
      workerCount: workerCount || undefined,
      settlementAmount: settlementAmount || undefined,
      notes: customNote || undefined,
    };

    if (recipientMode === 'driver' && selectedDriver) {
      ctx.driverName = selectedDriver.name;
      ctx.driverPhone = selectedDriver.phone;
      ctx.driverCode = selectedDriver.code;
      if (selectedVehicle) {
        ctx.plateNumber = selectedVehicle.plate;
        ctx.vehicleCode = selectedVehicle.code;
        ctx.vehicleType = selectedVehicle.model || selectedVehicle.type;
        ctx.mileage = selectedVehicle.mileage;
      }
    } else if (recipientMode === 'staff' && selectedStaff) {
      ctx.driverName = selectedStaff.name;
      ctx.driverPhone = selectedStaff.phone;
      ctx.notes = `${selectedStaff.role} | ${customNote || 'واحد اداری'}`;
    } else if (recipientMode === 'custom') {
      ctx.driverName = customRecipientName || 'مخاطب گرامی';
      ctx.driverPhone = customRecipientPhone || undefined;
      if (selectedVehicle) {
        ctx.plateNumber = selectedVehicle.plate;
        ctx.vehicleCode = selectedVehicle.code;
        ctx.vehicleType = selectedVehicle.model;
      }
    }

    const compiled = fillBaleTemplate(selectedTemplate.template, ctx);
    setMessageBody(compiled);
  }, [
    selectedTemplate,
    recipientMode,
    selectedDriver,
    selectedVehicle,
    selectedStaff,
    customRecipientName,
    customRecipientPhone,
    destination,
    cargo,
    workerCount,
    customNote,
    customTime,
    customDate,
    settlementAmount,
    currentDispatcherName,
  ]);

  if (!isOpen) return null;

  // Filter lists based on search
  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.phone && d.phone.includes(searchQuery)) ||
      (d.code && String(d.code).includes(searchQuery))
  );

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.role && s.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.phone && s.phone.includes(searchQuery))
  );

  const getRecipientDisplayName = () => {
    if (recipientMode === 'driver') return selectedDriver ? selectedDriver.name : 'راننده انتخاب نشده';
    if (recipientMode === 'staff') return selectedStaff ? selectedStaff.name : 'پرسنل انتخاب نشده';
    return customRecipientName || 'مخاطب سفارشی';
  };

  const getRecipientPhone = () => {
    if (recipientMode === 'driver') return selectedDriver?.phone;
    if (recipientMode === 'staff') return selectedStaff?.phone;
    return customRecipientPhone;
  };

  // Actions
  const handleOpenBaleWeb = () => {
    if (!messageBody.trim()) return;

    openBaleWeb(messageBody);

    const saved = saveBaleHistoryItem({
      recipientName: getRecipientDisplayName(),
      recipientPhone: getRecipientPhone(),
      templateTitle: selectedTemplate.title,
      messageText: messageBody,
      sentMethod: 'bale_web',
    });

    setHistoryItems((prev) => [saved, ...prev]);
    setStatusFeedback({
      type: 'success',
      text: 'صفحه اشتراک‌گذاری پیام‌رسان بله وب در تب جدید باز شد.',
    });
  };

  const handleCopy = async () => {
    if (!messageBody.trim()) return;
    const ok = await copyMessageToClipboard(messageBody);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);

      const saved = saveBaleHistoryItem({
        recipientName: getRecipientDisplayName(),
        recipientPhone: getRecipientPhone(),
        templateTitle: selectedTemplate.title,
        messageText: messageBody,
        sentMethod: 'clipboard',
      });
      setHistoryItems((prev) => [saved, ...prev]);

      setStatusFeedback({
        type: 'info',
        text: 'متن پیام در حافظه موقت (Clipboard) کپی شد. می‌توانید در چت بله Paste کنید.',
      });
    }
  };

  const handleNativeShare = async () => {
    if (!messageBody.trim()) return;
    const ok = await shareViaWebShare(`پیام دیسپچ حامی - ${selectedTemplate.title}`, messageBody);
    if (ok) {
      const saved = saveBaleHistoryItem({
        recipientName: getRecipientDisplayName(),
        recipientPhone: getRecipientPhone(),
        templateTitle: selectedTemplate.title,
        messageText: messageBody,
        sentMethod: 'native_share',
      });
      setHistoryItems((prev) => [saved, ...prev]);
    }
  };

  const handleSendViaBot = async () => {
    if (!botConfig.botToken || !botConfig.channelOrChatId) {
      setStatusFeedback({
        type: 'error',
        text: 'توکن ربات بله یا شناسه چت تنظیم نشده است. لطفاً به تب «تنظیمات ربات بله» مراجعه فرمایید.',
      });
      return;
    }

    setIsSendingBot(true);
    setStatusFeedback(null);

    const res = await sendBaleBotMessage(
      botConfig.botToken,
      botConfig.channelOrChatId,
      messageBody
    );

    setIsSendingBot(false);

    if (res.success) {
      const saved = saveBaleHistoryItem({
        recipientName: getRecipientDisplayName(),
        recipientPhone: getRecipientPhone(),
        templateTitle: selectedTemplate.title,
        messageText: messageBody,
        sentMethod: 'bot',
      });
      setHistoryItems((prev) => [saved, ...prev]);

      setStatusFeedback({
        type: 'success',
        text: res.message,
      });
    } else {
      setStatusFeedback({
        type: 'error',
        text: res.message,
      });
    }
  };

  const handleSaveBotSettings = () => {
    saveBaleBotConfig(botConfig);
    setStatusFeedback({
      type: 'success',
      text: 'تنظیمات ربات بله با موفقیت ذخیره شد.',
    });
  };

  const handleClearHistoryConfirm = () => {
    clearBaleHistory();
    setHistoryItems([]);
    setStatusFeedback({
      type: 'info',
      text: 'تاریخچه ارسال پیام‌های بله پاک‌سازی گردید.',
    });
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#0c1424] border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL HEADER */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-[#0c261e] via-[#0d1e22] to-[#0c1424] border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/25 shrink-0 border border-emerald-400/30">
              ب
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  ارسال پیام‌های آماده در پیام‌رسان بله (Bale Dispatcher)
                </h2>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Bale Web & Bot
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ابلاغ نوبت بارگیری، شیفت کاری، تعویض روغن، تسویه حساب و هماهنگی سریع با رانندگان
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

        {/* 2. NAVIGATION TABS (Segmented Control) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-2.5 border-b border-slate-800 bg-[#090f1e] text-xs font-semibold">
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto touch-scroll">
            <button
              onClick={() => setActiveTab('composer')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'composer'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال پیام جدید</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>تاریخچه ارسالی‌ها</span>
              {historyItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-950/70 text-emerald-300">
                  {toFaDigits(historyItems.length)}
                </span>
              )}
            </button>

            {currentUser?.isMasterAdmin && (
              <button
                onClick={() => setActiveTab('bot')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'bot'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>تنظیمات ربات بله</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>راهنمای کارکرد</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>دیسپچر:</span>
            <span className="text-emerald-300 font-bold">{currentDispatcherName}</span>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {statusFeedback && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
              statusFeedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : statusFeedback.type === 'error'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusFeedback.text}</span>
            </div>
            <button
              onClick={() => setStatusFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: COMPOSER */}
        {activeTab === 'composer' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {/* 1. RECIPIENT SELECTOR BAR */}
            <div className="p-3.5 rounded-2xl bg-[#090f1e] border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>مخاطب پیام:</span>
                  </span>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    {getRecipientDisplayName()}
                  </span>
                </div>

                {/* Recipient Mode Tabs */}
                <div className="flex gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('driver')}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      recipientMode === 'driver' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    رانندگان ({toFaDigits(drivers.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('staff')}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      recipientMode === 'staff' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    پرسنل ({toFaDigits(staff.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('custom')}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      recipientMode === 'custom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    مخاطب دلخواه
                  </button>
                </div>
              </div>

              {/* Recipient Picker Details */}
              {recipientMode === 'driver' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجوی راننده بر اساس نام، شماره تلفن یا کد..."
                      className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {filteredDrivers.map((d) => {
                      const isSel = selectedDriver?.code === d.code;
                      return (
                        <button
                          key={d.code}
                          type="button"
                          onClick={() => setSelectedDriver(d)}
                          className={`shrink-0 flex items-center gap-2 p-2 rounded-xl border text-right transition cursor-pointer ${
                            isSel
                              ? 'bg-emerald-600/20 border-emerald-500/60 text-white shadow-xs'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSel ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {d.name.slice(0, 1)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold leading-tight">{d.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              کد: {toFaDigits(d.code)} | {d.phone || 'بدون شماره'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {recipientMode === 'staff' && (
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {filteredStaff.map((s) => {
                    const isSel = selectedStaff?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStaff(s)}
                        className={`shrink-0 flex items-center gap-2 p-2 rounded-xl border text-right transition cursor-pointer ${
                          isSel
                            ? 'bg-emerald-600/20 border-emerald-500/60 text-white shadow-xs'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isSel ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {s.name.slice(0, 1)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.role} | {s.phone || 'بدون تلفن'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {recipientMode === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">نام یا عنوان مخاطب:</label>
                    <input
                      type="text"
                      value={customRecipientName}
                      onChange={(e) => setCustomRecipientName(e.target.value)}
                      placeholder="مثال: آقای رضایی (راننده مهمان)"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">شماره همراه یا آیدی بله:</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={customRecipientPhone}
                      onChange={(e) => setCustomRecipientPhone(e.target.value)}
                      placeholder="0912... یا @username"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. TEMPLATES SELECTOR GRID */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>انتخاب قالب پیام دیسپچ بله:</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {BALE_MESSAGE_TEMPLATES.map((tpl) => {
                  const isSel = selectedTemplate.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                        isSel
                          ? 'bg-emerald-600/15 border-emerald-500/60 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-[#090f1e] border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold truncate">{tpl.title}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400/80 mt-2 block">
                        {tpl.categoryLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CONTEXTUAL PARAMETERS & LIVE EDITOR SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Parameters form (5 Cols) */}
              <div className="lg:col-span-5 p-3.5 rounded-2xl bg-[#090f1e] border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white block pb-1 border-b border-slate-800">
                  متغیرهای پویا و اطلاعات سرویس:
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">تاریخ سرویس:</label>
                    <input
                      type="text"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">ساعت حضور:</label>
                    <input
                      type="text"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>

                {selectedTemplate.id === 'new_mission' && (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-slate-400 text-[11px] block mb-1">مسیر / آدرس مقصد:</label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="مثال: تهران، ونک، خ ملاصدرا"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">نوع بار:</label>
                        <input
                          type="text"
                          value={cargo}
                          onChange={(e) => setCargo(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">تعداد کارگر:</label>
                        <input
                          type="text"
                          value={workerCount}
                          onChange={(e) => setWorkerCount(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedTemplate.id === 'settlement_notice' && (
                  <div className="text-xs">
                    <label className="text-slate-400 text-[11px] block mb-1">مبلغ تسویه (ریال):</label>
                    <input
                      type="text"
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-emerald-400"
                    />
                  </div>
                )}

                <div className="text-xs">
                  <label className="text-slate-400 text-[11px] block mb-1">یادداشت و توضیحات تکمیلی:</label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="نکات اضافه، هماهنگی بارنامه، شماره تماس انبار و..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white resize-none"
                  />
                </div>
              </div>

              {/* Live Message Textarea & Direct Dispatch (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col p-3.5 rounded-2xl bg-[#090f1e] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>پیش‌نمایش زنده متن پیام در پیام‌رسان بله:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {toFaDigits(messageBody.length)} کاراکتر
                  </span>
                </div>

                <textarea
                  rows={9}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full flex-1 p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-xs leading-relaxed font-sans resize-none focus:outline-none focus:border-emerald-500"
                />

                {/* Dispatch Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {/* Primary Bale Web Button */}
                    <button
                      type="button"
                      onClick={handleOpenBaleWeb}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                      title="بازکردن پیام‌رسان بله وب با پیام آماده"
                    >
                      <div className="w-4 h-4 rounded-full bg-white text-emerald-700 flex items-center justify-center text-[9px] font-black">
                        ب
                      </div>
                      <span>ارسال در پیام‌رسان بله (وب / اپلیکیشن)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    {/* Bot Send if configured */}
                    {botConfig.botToken && (
                      <button
                        type="button"
                        onClick={handleSendViaBot}
                        disabled={isSendingBot}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="ارسال مستقیم از طریق سرور ربات بله (Bale Bot API)"
                      >
                        <Bot className="w-4 h-4 text-emerald-400" />
                        <span>{isSendingBot ? 'درحال ارسال...' : 'ارسال با ربات بله'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs"
                      title="کپی کردن متن پیام"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span className="hidden sm:inline">{isCopied ? 'کپی شد' : 'کپی'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="اشتراک‌گذاری سیستمی"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white">
                تاریخچه پیام‌های ارسال شده از طریق سامانه بله ({toFaDigits(historyItems.length)})
              </span>
              {historyItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistoryConfirm}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold transition cursor-pointer"
                >
                  پاک‌سازی تاریخچه
                </button>
              )}
            </div>

            {historyItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                هنوز پیامی از طریق پیام‌رسان بله ارسال نشده است.
              </div>
            ) : (
              <div className="space-y-2">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#090f1e] border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{item.recipientName}</span>
                        {item.recipientPhone && (
                          <span className="text-slate-400 font-mono text-[10px]">
                            {item.recipientPhone}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {item.templateTitle}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3 font-sans whitespace-pre-line">
                        {item.messageText}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2 text-slate-400 text-[10px] font-mono">
                      <span>{item.sentAt}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMessageBody(item.messageText);
                          setActiveTab('composer');
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 transition cursor-pointer"
                      >
                        ارسال مجدد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BOT SETTINGS (Strictly for admin) */}
        {activeTab === 'bot' && currentUser?.isMasterAdmin && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            <div className="p-4 rounded-2xl bg-[#090f1e] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">تنظیمات ربات پیام‌رسان بله (Bale Bot API)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                با اتصال ربات بله، سامانه قادر است پیام‌ها و کدهای ورود (OTP) را بدون نیاز به باز شدن مرورگر، مستقیماً از طریق پروتکل رسمی Bot API بله به شناسه کاربری یا کانال شما ارسال نماید.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    توکن ربات بله (Bot Token از BotFather بله):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={botConfig.botToken}
                    onChange={(e) => setBotConfig({ ...botConfig, botToken: e.target.value })}
                    placeholder="مثال: 123456789:ABCdefGhIjkLmNoPqRsTuVwXyZ"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    شناسه چت یا کانال پیش‌فرض (Chat ID):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={botConfig.channelOrChatId}
                    onChange={(e) => setBotConfig({ ...botConfig, channelOrChatId: e.target.value })}
                    placeholder="مثال: 987654321 یا @my_fleet_channel"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="baleBotEnable"
                    checked={botConfig.isEnabled}
                    onChange={(e) => setBotConfig({ ...botConfig, isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="baleBotEnable" className="text-slate-300 font-bold cursor-pointer">
                    فعال‌سازی ارسال اعلان‌های ورود و پیام‌های خودکار با این ربات بله
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveBotSettings}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    ذخیره تنظیمات ربات بله
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GUIDE */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar text-xs leading-relaxed text-slate-300">
            <div className="p-4 rounded-2xl bg-[#090f1e] border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>راهنمای کارکرد پیام‌رسان بله در سامانه حامی</span>
              </h3>
              <p>
                پیام‌رسان بله (Bale) یکی از امن‌ترین و در دسترس‌ترین پیام‌رسان‌های بومی کشور است. این افزونه به شما امکان می‌دهد تا بدون نیاز به تایپ دستی و تکراری، کلیه بخشنامه‌ها، نوبت‌های بارگیری و هشدارهای تعویض روغن را در کسری از ثانیه برای رانندگان یا گروه‌های دیسپچ ارسال کنید.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pt-2">
                <li>
                  <strong>ارسال مستقیم در بله وب:</strong> با کلیک روی دکمه سبز، متن به صورت خودکار به محیط چت یا اشتراک‌گذاری بله (<code className="text-emerald-300 font-mono">ble.ir/share/url</code>) منتقل می‌شود.
                </li>
                <li>
                  <strong>کپی در حافظه:</strong> متن فرمت‌شده و زیبا برای هر مخاطب آماده شده و با زدن دکمه کپی، در هر نرم‌افزاری قابل الصاق (Paste) است.
                </li>
                <li>
                  <strong>ورود با بله:</strong> کاربران و رانندگان می‌توانند با شماره ثبت‌شده در بله و کد تأیید ورود ۵ رقمی، بدون نیاز به حفظ رمز عبور به سامانه وارد شوند.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
