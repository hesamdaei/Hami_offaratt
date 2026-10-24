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
  EITAA_MESSAGE_TEMPLATES,
  EitaaMessageTemplate,
  EitaaTemplateContext,
  fillEitaaTemplate,
  getEitaaShareUrl,
  openEitaaWeb,
  copyMessageToClipboard,
  shareViaWebShare,
  getEitaaHistory,
  saveEitaaHistoryItem,
  clearEitaaHistory,
  EitaaHistoryItem,
  getEitaaBotConfig,
  saveEitaaBotConfig,
  sendEitaaBotMessage,
} from '../utils/eitaaService';
import { DriverDirectoryItem, VehicleItem } from '../utils/fleetSeedData';
import { StaffMember } from '../types';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { AppUser } from '../types/auth';
import { isMasterAdmin } from '../utils/authService';

interface EitaaMessengerModalProps {
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

export const EitaaMessengerModal: FC<EitaaMessengerModalProps> = ({
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
  const [selectedTemplate, setSelectedTemplate] = useState<EitaaMessageTemplate>(
    EITAA_MESSAGE_TEMPLATES[0]
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
  const [historyItems, setHistoryItems] = useState<EitaaHistoryItem[]>([]);

  // Bot Config state
  const [botConfig, setBotConfig] = useState(getEitaaBotConfig());
  const [isSendingBot, setIsSendingBot] = useState(false);

  // Initialize or update with initialRecipient prop
  useEffect(() => {
    if (!isOpen) return;

    setHistoryItems(getEitaaHistory());
    setBotConfig(getEitaaBotConfig());

    if (initialRecipient) {
      if (initialRecipient.templateId) {
        const foundTpl = EITAA_MESSAGE_TEMPLATES.find((t) => t.id === initialRecipient.templateId);
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

      if (initialRecipient.vehicleCode) {
        const vMatch = vehicles.find((v) => String(v.code) === String(initialRecipient.vehicleCode));
        if (vMatch) setSelectedVehicle(vMatch);
      }
    } else if (!selectedDriver && drivers.length > 0) {
      // Pick first driver as default
      setSelectedDriver(drivers[0]);
    }
  }, [isOpen, initialRecipient, drivers, vehicles]);

  // When selectedDriver changes, auto-pair with their vehicle if known
  useEffect(() => {
    if (selectedDriver) {
      // Try to find vehicle assigned to this driver
      const vMatch = vehicles.find(
        (v) => v.driverName === selectedDriver.name || (v.driverPhone && v.driverPhone === selectedDriver.phone)
      );
      if (vMatch) {
        setSelectedVehicle(vMatch);
      }
    }
  }, [selectedDriver, vehicles]);

  // Recompute generated message body when inputs change
  useEffect(() => {
    const ctx: EitaaTemplateContext = {
      driverName:
        recipientMode === 'driver'
          ? selectedDriver?.name || 'راننده گرامی'
          : recipientMode === 'staff'
          ? selectedStaff?.name || 'همکار گرامی'
          : customRecipientName || 'مخاطب گرامی',
      driverPhone:
        recipientMode === 'driver'
          ? selectedDriver?.phone
          : recipientMode === 'staff'
          ? selectedStaff?.phone
          : customRecipientPhone,
      driverCode: selectedDriver?.code || selectedStaff?.code,
      plateNumber: selectedVehicle?.plateNumber || (selectedDriver?.assignedVehicles?.[0] ?? '—'),
      vehicleCode: selectedVehicle?.code,
      vehicleType: selectedVehicle?.vehicleType || 'کامیونت مسقف',
      queueNumber: selectedVehicle?.queueNumber || 1,
      date: customDate,
      time: customTime,
      mileage: selectedVehicle?.currentMileage,
      destination: destination || 'تهران - مبدأ شرکت به نشانی مقصد',
      cargo: cargo,
      workerCount: workerCount,
      settlementAmount: settlementAmount,
      notes: customNote || (selectedTemplate.id === 'oil_service_alert' ? 'کیلومتر سرویس قبلی تکمیل شده است' : 'طبق دستورالعمل سازمانی اقدام فرمایید'),
      dispatcherName: currentDispatcherName,
      companyName: 'صداقت بار',
    };

    const generated = fillEitaaTemplate(selectedTemplate.template, ctx);
    setMessageBody(generated);
  }, [
    selectedTemplate,
    selectedDriver,
    selectedVehicle,
    selectedStaff,
    recipientMode,
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

  // Filtered lists for selection
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    const q = searchQuery.toLowerCase();
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.phone && d.phone.includes(q)) ||
        (d.code && d.code.includes(q)) ||
        (d.assignedVehicles && d.assignedVehicles.some((v) => v.includes(q)))
    );
  }, [drivers, searchQuery]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const q = searchQuery.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        s.department.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
    );
  }, [staff, searchQuery]);

  // Handler: Send via Eitaa Web
  const handleSendEitaaWeb = () => {
    const recipientName =
      recipientMode === 'driver'
        ? selectedDriver?.name || 'راننده'
        : recipientMode === 'staff'
        ? selectedStaff?.name || 'پرسنل'
        : customRecipientName || 'کاربر';

    const recipientPhone =
      recipientMode === 'driver'
        ? selectedDriver?.phone
        : recipientMode === 'staff'
        ? selectedStaff?.phone
        : customRecipientPhone;

    // 1. Copy to clipboard automatically for convenient backup paste
    copyMessageToClipboard(messageBody);

    // 2. Open Eitaa Web with share URL
    openEitaaWeb(messageBody);

    // 3. Save to history
    const saved = saveEitaaHistoryItem({
      recipientName,
      recipientPhone,
      templateTitle: selectedTemplate.title,
      messageText: messageBody,
      sentMethod: 'eitaa_web',
    });
    setHistoryItems((prev) => [saved, ...prev]);

    setStatusFeedback({
      type: 'success',
      text: 'پیام‌رسان ایتا وب باز شد و متن پیام در حافظه کپی گردید. گفتگو یا کانال مورد نظر را انتخاب و پیام را ارسال نمایید.',
    });

    setTimeout(() => {
      setStatusFeedback(null);
    }, 6000);
  };

  // Handler: Copy only
  const handleCopyMessage = async () => {
    const ok = await copyMessageToClipboard(messageBody);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);

      const recipientName =
        recipientMode === 'driver'
          ? selectedDriver?.name || 'راننده'
          : recipientMode === 'staff'
          ? selectedStaff?.name || 'پرسنل'
          : customRecipientName || 'کاربر';

      const saved = saveEitaaHistoryItem({
        recipientName,
        templateTitle: selectedTemplate.title,
        messageText: messageBody,
        sentMethod: 'clipboard',
      });
      setHistoryItems((prev) => [saved, ...prev]);

      setStatusFeedback({
        type: 'info',
        text: 'متن پیام با موفقیت در کلیپ‌بورد کپی شد. می‌توانید در گفتگوی ایتا Paste (جای‌گذاری) نمایید.',
      });
      setTimeout(() => setStatusFeedback(null), 4000);
    }
  };

  // Handler: Native Share
  const handleNativeShare = async () => {
    const success = await shareViaWebShare(`پیام صداقت بار به ${selectedDriver?.name || ''}`, messageBody);
    if (success) {
      setStatusFeedback({
        type: 'success',
        text: 'پیام در منوی اشتراک‌گذاری دستگاه باز شد.',
      });
      setTimeout(() => setStatusFeedback(null), 3000);
    }
  };

  // Handler: Send via Bot API
  const handleSendViaBot = async () => {
    if (!botConfig.botToken || !botConfig.channelOrChatId) {
      setStatusFeedback({
        type: 'error',
        text: 'لطفاً ابتدا توکن ربات و شناسه چت/کانال ایتا را در بخش تنظیمات بات وارد فرمایید.',
      });
      setActiveTab('bot');
      return;
    }

    setIsSendingBot(true);
    const res = await sendEitaaBotMessage(botConfig.botToken, botConfig.channelOrChatId, messageBody);
    setIsSendingBot(false);

    if (res.success) {
      setStatusFeedback({
        type: 'success',
        text: res.message,
      });
      const saved = saveEitaaHistoryItem({
        recipientName: botConfig.channelOrChatId,
        templateTitle: selectedTemplate.title,
        messageText: messageBody,
        sentMethod: 'bot',
      });
      setHistoryItems((prev) => [saved, ...prev]);
    } else {
      setStatusFeedback({
        type: 'error',
        text: res.message,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER WITH EITAA BRANDING */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#1e293b] via-[#1a2333] to-[#0f172a] border-b border-slate-800">
          <div className="flex items-center gap-3">
            {/* Eitaa Logo Icon representation */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-lg">
              <span>ایتا</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  ارسال پیام‌های آماده در پیام‌رسان ایتا وب
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Eitaa Web Dispatcher
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ارسال سریع اطلاعیه‌ها، مأموریت‌ها، نوبت‌دهی و هشدار سرویس به رانندگان و کارکنان
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS (Segmented Control) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-2.5 border-b border-slate-800 bg-[#090f1e] text-xs font-semibold">
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto touch-scroll">
            <button
              onClick={() => setActiveTab('composer')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'composer'
                  ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
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
                  ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>تاریخچه ارسالی‌ها</span>
              {historyItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-950/70 text-orange-300">
                  {toFaDigits(historyItems.length)}
                </span>
              )}
            </button>

            {/* Bot Settings Tab - Strictly for Master Admin only */}
            {isMasterAdmin(currentUser) && (
              <button
                onClick={() => setActiveTab('bot')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'bot'
                    ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>تنظیمات ربات ایتا</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>راهنمای کارکرد</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>دیسپچر:</span>
            <span className="text-orange-300 font-bold">{currentDispatcherName}</span>
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
              className="text-xs opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: COMPOSER */}
        {activeTab === 'composer' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* 1. RECIPIENT SELECTOR BAR */}
            <div className="p-3.5 rounded-xl bg-[#141f36] border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-orange-400" />
                    انتخاب مخاطب / راننده گیرنده:
                  </span>
                  <div className="inline-flex rounded-lg bg-[#0b1324] p-0.5 border border-slate-700/60 text-xs">
                    <button
                      onClick={() => setRecipientMode('driver')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        recipientMode === 'driver'
                          ? 'bg-orange-500 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      رانندگان ناوگان ({toFaDigits(drivers.length)})
                    </button>
                    <button
                      onClick={() => setRecipientMode('staff')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        recipientMode === 'staff'
                          ? 'bg-orange-500 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      پرسنل ({toFaDigits(staff.length)})
                    </button>
                    <button
                      onClick={() => setRecipientMode('custom')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        recipientMode === 'custom'
                          ? 'bg-orange-500 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      شماره / نام آزاد
                    </button>
                  </div>
                </div>

                {recipientMode !== 'custom' && (
                  <div className="relative w-full sm:w-56">
                    <input
                      type="text"
                      placeholder="جستجوی نام، تلفن یا خودرو..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-orange-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                )}
              </div>

              {/* Recipient options */}
              {recipientMode === 'driver' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1">
                  {filteredDrivers.map((d) => {
                    const isSelected = selectedDriver?.id === d.id || selectedDriver?.name === d.name;
                    return (
                      <button
                        key={d.id || d.name}
                        onClick={() => setSelectedDriver(d)}
                        className={`text-right p-2 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-orange-500/15 border-orange-500 text-orange-200 font-bold shadow-sm'
                            : 'bg-[#0b1324] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="truncate font-semibold text-slate-100">{d.name}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span className="font-mono">{toFaDigits(d.phone || '')}</span>
                          <span>{d.assignedVehicles?.[0] || 'ناوگان'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {recipientMode === 'staff' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1">
                  {filteredStaff.map((s) => {
                    const isSelected = selectedStaff?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStaff(s)}
                        className={`text-right p-2 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-orange-500/15 border-orange-500 text-orange-200 font-bold shadow-sm'
                            : 'bg-[#0b1324] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="truncate font-semibold text-slate-100">{s.name}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{s.department}</span>
                          <span className="font-mono">{toFaDigits(s.phone || '')}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {recipientMode === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نام یا عنوان مخاطب:</label>
                    <input
                      type="text"
                      placeholder="مثال: آقای حسینی (راننده آزاد یا مشتری)"
                      value={customRecipientName}
                      onChange={(e) => setCustomRecipientName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">شماره تماس یا آیدی ایتا:</label>
                    <input
                      type="text"
                      placeholder="مثال: 09121234567 یا @username"
                      value={customRecipientPhone}
                      onChange={(e) => setCustomRecipientPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-orange-500 font-mono text-left"
                    />
                  </div>
                </div>
              )}

              {/* Selected summary badge */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">مخاطب انتخاب شده:</span>
                  <span className="font-bold text-orange-400">
                    {recipientMode === 'driver'
                      ? selectedDriver?.name || 'انتخاب نشده'
                      : recipientMode === 'staff'
                      ? selectedStaff?.name || 'انتخاب نشده'
                      : customRecipientName || 'کاربر آزاد'}
                  </span>
                  {(selectedDriver?.phone || selectedStaff?.phone || customRecipientPhone) && (
                    <span className="font-mono text-slate-300 text-[11px] bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {toFaDigits(
                        recipientMode === 'driver'
                          ? selectedDriver?.phone || ''
                          : recipientMode === 'staff'
                          ? selectedStaff?.phone || ''
                          : customRecipientPhone
                      )}
                    </span>
                  )}
                </div>

                {selectedVehicle && recipientMode === 'driver' && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>کد خودرو: {toFaDigits(selectedVehicle.code)}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-200 font-semibold">{toFaDigits(selectedVehicle.plateNumber)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. TEMPLATES SELECTOR CHIPS */}
            <div>
              <div className="text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  قالب‌های پیام آماده (انتخاب کنید):
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  اطلاعات راننده و خودرو به صورت خودکار در متن جایگذاری می‌شود
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {EITAA_MESSAGE_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`text-right p-2.5 rounded-xl border text-xs transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-orange-500 text-orange-200 font-bold shadow-md shadow-orange-500/10'
                          : 'bg-[#141f36] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#182542]'
                      }`}
                    >
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5 mb-1">
                        {tpl.id === 'shift_queue' && <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                        {tpl.id === 'new_mission' && <Truck className="w-3.5 h-3.5 text-emerald-400" />}
                        {tpl.id === 'oil_service_alert' && <Droplet className="w-3.5 h-3.5 text-amber-400" />}
                        {tpl.id === 'documents_expiry' && <FileText className="w-3.5 h-3.5 text-rose-400" />}
                        {tpl.id === 'attendance_notice' && <UserCheck className="w-3.5 h-3.5 text-cyan-400" />}
                        {tpl.id === 'trip_settlement' && <DollarSign className="w-3.5 h-3.5 text-purple-400" />}
                        {tpl.id === 'general_notice' && <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
                        <span className="truncate">{tpl.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. DYNAMIC PARAMETERS ADJUSTER (ACCORDING TO CHOSEN TEMPLATE) */}
            <div className="p-3 rounded-xl bg-[#141f36] border border-slate-800 text-xs">
              <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Settings className="w-3 h-3 text-orange-400" />
                تنظیم متغیرهای این قالب:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ساعت حضور / مأموریت:</label>
                  <input
                    type="text"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">تاریخ ابلاغ:</label>
                  <input
                    type="text"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200 font-mono"
                  />
                </div>

                {selectedTemplate.id === 'new_mission' && (
                  <>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">مسیر / مقصد:</label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="تهران به سعادت‌آباد"
                        className="w-full px-2.5 py-1 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">تعداد کارگر:</label>
                      <input
                        type="text"
                        value={workerCount}
                        onChange={(e) => setWorkerCount(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200"
                      />
                    </div>
                  </>
                )}

                {selectedTemplate.id === 'trip_settlement' && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">مبلغ تسویه (تومان):</label>
                    <input
                      type="text"
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1">توضیحات و نکات تکمیلی پیام:</label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="نکات خاص مأموریت، آدرس دقیق، مهلت مراجعه و..."
                    className="w-full px-2.5 py-1 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* 4. LIVE MESSAGE PREVIEW & EDITOR (EITAA CHAT BUBBLE STYLE) */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  پیش‌نمایش زنده و ویرایش نهایی متن پیام:
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {toFaDigits(messageBody.length)} کاراکتر • {toFaDigits(messageBody.split('\n').length)} سطر
                </span>
              </div>

              {/* Chat bubble styled like Eitaa Web */}
              <div className="relative rounded-2xl bg-[#0b1324] border-2 border-orange-500/30 p-3 sm:p-4 shadow-inner">
                <div className="text-[11px] text-orange-400/80 mb-2 flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>قالب آماده جهت ارسال در ایتا وب (قابل ویرایش مستقیم در کادر زیر)</span>
                  </div>
                  <button
                    onClick={handleCopyMessage}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'کپی شد!' : 'کپی سریع متن'}</span>
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full bg-transparent text-slate-100 text-xs sm:text-sm font-sans leading-relaxed focus:outline-hidden resize-y min-h-[160px]"
                  placeholder="متن پیام را در اینجا مشاهده و ویرایش کنید..."
                  dir="rtl"
                />

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                  <span>فرمت سازگار با کلیه نسخه‌های ایتا (وب، اندروید، ویندوز و iOS)</span>
                  <span className="font-mono text-slate-400">{getTodayJalaali().fullFa}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SENT HISTORY */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <History className="w-4 h-4 text-orange-400" />
                تاریخچه پیام‌های ارسال شده اخیر
              </h3>
              {historyItems.length > 0 && (
                <button
                  onClick={() => {
                    clearEitaaHistory();
                    setHistoryItems([]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs transition-colors"
                >
                  پاک‌سازی تاریخچه
                </button>
              )}
            </div>

            {historyItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">هنوز هیچ پیامی از این بخش ارسال نشده است.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  پیام‌هایی که در ایتا وب باز می‌کنید یا کپی می‌نمایید، در این بخش بایگانی می‌شوند.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#141f36] border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100">{item.recipientName}</span>
                        {item.recipientPhone && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                            {toFaDigits(item.recipientPhone)}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {item.templateTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{item.sentAt}</span>
                        <button
                          onClick={() => {
                            setMessageBody(item.messageText);
                            setActiveTab('composer');
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                        >
                          بارگذاری در ویرایشگر
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-line bg-[#0b1324] p-2.5 rounded-lg border border-slate-800/80 max-h-28 overflow-y-auto font-sans leading-relaxed">
                      {item.messageText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EITAA BOT SETTINGS */}
        {activeTab === 'bot' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="p-4 rounded-xl bg-[#141f36] border border-slate-800">
              <div className="flex items-center gap-2.5 mb-3">
                <Bot className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-bold text-slate-100">تنظیمات ربات رسمی پیام‌رسان ایتا (اختیاری)</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                پیام‌رسان ایتا امکان ارسال پیام‌های اتوماتیک از طریق Bot API را فراهم کرده است. اگر از پدر بات ایتا (<code className="text-orange-400 font-mono">@BotFather</code>) یک ربات ایجاد کرده‌اید، می‌توانید توکن آن را در اینجا وارد نمایید تا علاوه بر دکمه «ارسال به ایتا وب»، امکان ارسال خودکار نیز فعال شود.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    توکن ربات ایتا (Bot Token):
                  </label>
                  <input
                    type="password"
                    placeholder="bot123456:AAFlK..."
                    value={botConfig.botToken}
                    onChange={(e) => setBotConfig({ ...botConfig, botToken: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    شناسه کانال یا چت پیش‌فرض (Chat ID):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: @sedaghat_drivers یا عدد شناسه چت"
                    value={botConfig.channelOrChatId}
                    onChange={(e) => setBotConfig({ ...botConfig, channelOrChatId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#0b1324] border border-slate-700 rounded-lg text-slate-200 font-mono text-left focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      saveEitaaBotConfig(botConfig);
                      setStatusFeedback({
                        type: 'success',
                        text: 'تنظیمات ربات ایتا ذخیره گردید.',
                      });
                      setTimeout(() => setStatusFeedback(null), 3000);
                    }}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors shadow-md shadow-orange-500/20"
                  >
                    ذخیره تنظیمات ربات
                  </button>

                  <button
                    onClick={handleSendViaBot}
                    disabled={isSendingBot || !botConfig.botToken}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-orange-400" />
                    <span>{isSendingBot ? 'در حال ارسال...' : 'تست ارسال با ربات'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: USAGE GUIDE */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-[#141f36] border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                نحوه کارکرد ارسال پیام به رانندگان در «ایتا وب (Eitaa Web)»:
              </h3>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ۱
                  </span>
                  <div>
                    <strong className="text-slate-100">ارسال مستقیم با یک کلیک در ایتا وب:</strong>
                    <p className="text-slate-400 mt-0.5">
                      با فشردن دکمه نارنجی «ارسال مستقیم در ایتا وب»، سیستم از پروتکل رسمی اشتراک‌گذاری وب ایتا (<code className="font-mono text-orange-300">eitaa.com/share/url</code>) استفاده کرده و تب جدیدی باز می‌کند که کادر انتخاب مخاطب/گروه راننده را باز کرده و متن پیام آماده را به صورت خودکار در کادر چت تایپ می‌کند.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ۲
                  </span>
                  <div>
                    <strong className="text-slate-100">پشتیبان‌گیری هوشمند در کلیپ‌بورد:</strong>
                    <p className="text-slate-400 mt-0.5">
                      جهت اطمینان ۱۰۰٪، در هنگام کلیک روی دکمه ارسال، متن پیام همزمان در حافظه سیستم شما نیز کپی می‌شود تا چنانچه در نرم‌افزار ویندوز یا موبایل ایتا هستید، کافی باشد کلید Paste (یا <code className="font-mono text-slate-200">Ctrl+V</code>) را بزنید.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ۳
                  </span>
                  <div>
                    <strong className="text-slate-100">جایگذاری خودکار مشخصات راننده و خودرو:</strong>
                    <p className="text-slate-400 mt-0.5">
                      با انتخاب هر راننده از کادر بالا، نام، شماره پلاک خودرو، نوع خودرو، نوبت بارگیری، کیلومتر تعویض روغن و تاریخ جاری به صورت خودکار در پیام قالب‌بندی می‌شوند بدون اینکه نیازی به تایپ دستی داشته باشید.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER WITH ACTION BUTTONS */}
        <div className="p-3.5 sm:p-4 bg-[#0d1629] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMessage}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{isCopied ? 'کپی شد!' : 'کپی متن پیام'}</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                title="اشتراک‌گذاری در اپلیکیشن‌های گوشی"
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">اشتراک‌گذاری</span>
              </button>
            )}

            {botConfig.botToken && (
              <button
                onClick={handleSendViaBot}
                disabled={isSendingBot}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Bot className="w-4 h-4 text-orange-400" />
                <span>{isSendingBot ? 'در حال ارسال...' : 'ارسال با ربات'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              انصراف
            </button>

            {/* PRIMARY ACTION: SEND VIA EITAA WEB */}
            <button
              onClick={handleSendEitaaWeb}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-98"
            >
              <ExternalLink className="w-4 h-4" />
              <span>ارسال مستقیم در ایتا وب (Eitaa Web)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
