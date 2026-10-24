import React, { FC, useState, useEffect, useRef } from 'react';
import {
  Radio,
  Navigation,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  Copy,
  Check,
  Send,
  MessageSquare,
  Phone,
  Truck,
  ShieldCheck,
  ExternalLink,
  Sliders,
  ChevronRight,
  AlertTriangle,
  LocateFixed,
  Zap,
} from 'lucide-react';
import {
  CargoTrackingItem,
  getCargoTracking,
  loadAllCargoTrackings,
  updateDriverLiveCoordinates,
  updateMilestoneStatus,
  advanceSimulationStep,
  toggleDriverLiveBroadcast,
  generateCustomerShareUrl,
  TrackingMilestone,
  MILESTONE_CONFIG,
} from '../utils/cargoTrackingService';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';

interface CargoTrackingDriverPortalProps {
  orderNumber?: string;
  isStandalone?: boolean;
  onBackToApp?: () => void;
  onOpenCustomerView?: (orderNumber: string) => void;
}

export const CargoTrackingDriverPortal: FC<CargoTrackingDriverPortalProps> = ({
  orderNumber = 'ORD-1403/9201',
  isStandalone = false,
  onBackToApp,
  onOpenCustomerView,
}) => {
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>(orderNumber);
  const [tracking, setTracking] = useState<CargoTrackingItem | null>(() =>
    getCargoTracking(orderNumber)
  );
  const [isRealGpsActive, setIsRealGpsActive] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [driverNoteInput, setDriverNoteInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const simTimerRef = useRef<any>(null);

  // Sync state whenever selected order changes
  useEffect(() => {
    const item = getCargoTracking(selectedOrderNo);
    if (item) {
      setTracking(item);
      setDriverNoteInput(item.driverNote || '');
    }
  }, [selectedOrderNo]);

  // Real GPS tracking via navigator.geolocation
  useEffect(() => {
    if (!isRealGpsActive) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setStatusMessage('مرورگر شما از موقعیت مکانی GPS پشتیبانی نمی‌کند.');
      setIsRealGpsActive(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        const speedKmh = speed ? Math.round(speed * 3.6) : 35;
        const updated = updateDriverLiveCoordinates(
          selectedOrderNo,
          latitude,
          longitude,
          speedKmh,
          heading || 45,
          accuracy || 10,
          true
        );
        if (updated) setTracking({ ...updated });
        setStatusMessage(`موقعیت واقعی ماهواره‌ای با دقت ${Math.round(accuracy)} متر مخابره شد.`);
      },
      (err) => {
        setStatusMessage(`خطای دریافت GPS: ${err.message}. می‌توانید از حالت شبیه‌ساز استفاده کنید.`);
        setIsRealGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isRealGpsActive, selectedOrderNo]);

  // Simulator interval
  useEffect(() => {
    if (!isSimulating) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      return;
    }

    const intervalMs = Math.max(800, Math.round(2500 / simSpeed));
    simTimerRef.current = setInterval(() => {
      const updated = advanceSimulationStep(selectedOrderNo);
      if (updated) {
        setTracking({ ...updated });
        if (updated.status === 'DELIVERED') {
          setIsSimulating(false);
          setStatusMessage('سفر به پایان رسید و بار تحویل داده شد.');
        }
      }
    }, intervalMs);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating, simSpeed, selectedOrderNo]);

  const handleMilestoneChange = (status: TrackingMilestone) => {
    const updated = updateMilestoneStatus(selectedOrderNo, status, driverNoteInput);
    if (updated) {
      setTracking({ ...updated });
      setStatusMessage(`وضعیت بار به «${MILESTONE_CONFIG[status].label}» تغییر یافت.`);
    }
  };

  const handleSaveDriverNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tracking) return;
    const updated = updateMilestoneStatus(selectedOrderNo, tracking.status, driverNoteInput);
    if (updated) {
      setTracking({ ...updated });
      setStatusMessage('پیام شما برای مشتری و مرکز ارسال شد.');
    }
  };

  const handleCopyLink = () => {
    const url = generateCustomerShareUrl(selectedOrderNo);
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendSms = () => {
    if (!tracking) return;
    const url = generateCustomerShareUrl(selectedOrderNo);
    const body = encodeURIComponent(
      `مشتری گرامی ${tracking.customerName}، راننده شما (${tracking.driverName}) بارگیری را انجام داد. موقعیت لحظه‌ای بار شما روی نقشه:\n${url}`
    );
    window.open(`sms:${tracking.customerPhone}?body=${body}`, '_blank');
  };

  const handleSendWhatsApp = () => {
    if (!tracking) return;
    const url = generateCustomerShareUrl(selectedOrderNo);
    const text = encodeURIComponent(
      `سلام ${tracking.customerName} عزیز،\nبار شما (${tracking.cargoDescription}) توسط خودرو ${tracking.vehicleType} بارگیری شد.\nموقعیت زنده کامیون روی نقشه حامی بار:\n${url}`
    );
    window.open(`https://wa.me/98${tracking.customerPhone.replace(/^0/, '')}?text=${text}`, '_blank');
  };

  const allAvailable = loadAllCargoTrackings();
  const availableOrders = Object.values(allAvailable);

  return (
    <div
      className={`w-full flex flex-col bg-[#080e1e] text-slate-100 ${
        isStandalone ? 'min-h-screen' : 'h-[calc(100vh-140px)] rounded-2xl border border-slate-800'
      } overflow-y-auto font-sans`}
      dir="rtl"
    >
      {/* Top Header */}
      <header className="bg-[#0e172a] border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
            >
              <ChevronRight className="w-4 h-4" />
              <span>بازگشت</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white">پنل اختصاصی راننده و فرستنده موقعیت</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                فرستنده زنده (GPS Beacon)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ارسال خودکار موقعیت مکانی لحظه‌ای به مشتری و دیسپچینگ حامی بار
            </p>
          </div>
        </div>

        {/* Mission Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">سفارش انتخابی:</span>
            <select
              value={selectedOrderNo}
              onChange={(e) => setSelectedOrderNo(e.target.value)}
              className="bg-transparent text-cyan-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              {availableOrders.map((ord) => (
                <option key={ord.orderNumber} value={ord.orderNumber} className="bg-slate-900 text-white">
                  {ord.orderNumber} ({ord.customerName})
                </option>
              ))}
            </select>
          </div>

          {onOpenCustomerView && (
            <button
              onClick={() => onOpenCustomerView(selectedOrderNo)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="مشاهده همان صفحه‌ای که مشتری می‌بیند"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>مشاهده نمای مشتری</span>
            </button>
          )}
        </div>
      </header>

      {/* Notification Banner */}
      {statusMessage && (
        <div className="bg-cyan-950/40 border-b border-cyan-800/40 px-4 py-2 text-xs text-cyan-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {tracking && (
        <div className="max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
          {/* Mission Overview Hero Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{tracking.driverName}</span>
                    <span className="text-xs text-slate-400 font-mono">({tracking.orderNumber})</span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>خودرو: {tracking.vehicleType}</span>
                    <span>•</span>
                    <span>مشتری: {tracking.customerName} ({tracking.customerPhone})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <IranianPlate plateNumber={tracking.vehiclePlate} size="sm" />
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400">وضعیت فعلی بار</div>
                  <div className="text-xs font-black text-cyan-400">
                    {MILESTONE_CONFIG[tracking.status].label}
                  </div>
                </div>
              </div>
            </div>

            {/* GPS Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Option 1: Real Phone GPS */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <LocateFixed className="w-4 h-4 text-emerald-400" />
                      <span>ارسال مستقیم موقعیت GPS گوشی</span>
                    </div>
                    {isRealGpsActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    لوکیشن لحظه‌ای گوشی هوشمند راننده را مستقیم از طریق ماهواره مخابره می‌کند.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsRealGpsActive(!isRealGpsActive);
                      if (!isRealGpsActive) setIsSimulating(false);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isRealGpsActive
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                    }`}
                  >
                    {isRealGpsActive ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>قطع ارسال GPS واقعی</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>روشن‌کردن GPS گوشی راننده</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 2: Smart Simulation Mode (for testing/desktop) */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Play className="w-4 h-4 text-cyan-400" />
                      <span>شبیه‌ساز هوشمند حرکت در مسیر</span>
                    </div>
                    {isSimulating && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                        در حال حرکت ({simSpeed}x)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    مناسب برای تست روی دسکتاپ و شبیه‌سازی حرکت خودکار کامیون روی خیابان‌ها و اتوبان‌ها.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsSimulating(!isSimulating);
                      if (!isSimulating) setIsRealGpsActive(false);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isSimulating
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30'
                    }`}
                  >
                    {isSimulating ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>توقف شبیه‌ساز</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>شروع شبیه‌سازی حرکت</span>
                      </>
                    )}
                  </button>

                  {/* Step Button */}
                  <button
                    onClick={() => {
                      advanceSimulationStep(selectedOrderNo);
                      const updated = getCargoTracking(selectedOrderNo);
                      if (updated) setTracking(updated);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1"
                    title="یک گام جلوتر در مسیر"
                  >
                    <FastForward className="w-4 h-4" />
                    <span>گام بعد</span>
                  </button>

                  {/* Speed Selector */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
                    {[1, 2, 4].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setSimSpeed(spd)}
                        className={`px-2 py-1 rounded-lg transition ${
                          simSpeed === spd
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Milestone Update Buttons */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>تغییر وضعیت مرحله حمل بار (اقدام سریع راننده)</span>
            </h2>
            <p className="text-xs text-slate-400">
              با کلیک روی هر مرحله، وضعیت بار برای مشتری و دیسپچینگ بلافاصله به‌روزرسانی می‌شود:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  'LOADING',
                  'IN_TRANSIT',
                  'ARRIVED_DESTINATION',
                  'DELIVERED',
                ] as TrackingMilestone[]
              ).map((milestone) => {
                const conf = MILESTONE_CONFIG[milestone];
                const isCurrent = tracking.status === milestone;
                return (
                  <button
                    key={milestone}
                    onClick={() => handleMilestoneChange(milestone)}
                    className={`p-3.5 rounded-2xl border text-right transition flex flex-col justify-between gap-2 ${
                      isCurrent
                        ? `${conf.badgeBg} border-cyan-500 ring-2 ring-cyan-500/30 text-white font-bold`
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">{conf.label}</span>
                      {isCurrent && (
                        <Check className="w-4 h-4 text-cyan-400 stroke-[3]" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {conf.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Share Links & Customer Communication */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Share Link Card */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>ارسال لینک پیگیری به مشتری</span>
              </h2>
              <p className="text-xs text-slate-400">
                مشتری می‌تواند بدون نیاز به نصب اپلیکیشن، نقشه زنده بار را در مرورگر موبایل خود ببیند.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={generateCustomerShareUrl(selectedOrderNo)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    isCopied
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                  }`}
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'کپی شد' : 'کپی'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSendSms}
                  className="flex-1 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>پیامک به مشتری ({tracking.customerPhone})</span>
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="flex-1 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>ارسال در واتساپ</span>
                </button>
              </div>
            </div>

            {/* Driver Note to Customer Form */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>پیام یا وضعیت لحظه‌ای راننده</span>
              </h2>
              <p className="text-xs text-slate-400">
                این پیام به صورت زنده در کادر وضعیت بالای صفحه مشتری و دیسپچر نمایش داده می‌شود:
              </p>

              <form onSubmit={handleSaveDriverNote} className="space-y-2 pt-1">
                <input
                  type="text"
                  value={driverNoteInput}
                  onChange={(e) => setDriverNoteInput(e.target.value)}
                  placeholder="مثلاً: در حال عبور از عوارضی، یا تا ۱۵ دقیقه دیگر می‌رسم..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1.5 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => setDriverNoteInput('بارگیری انجام شد و به سمت مقصد در حرکتم.')}
                      className="hover:text-cyan-400 underline"
                    >
                      شروع حرکت
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setDriverNoteInput('به محل تخلیه رسیدم، لطفاً هماهنگ کنید.')}
                      className="hover:text-cyan-400 underline"
                    >
                      رسیدم دم در
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="py-1.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-900/30 transition"
                  >
                    ثبت و ارسال پیام
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
