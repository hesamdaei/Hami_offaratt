import { FC, useState, useMemo, FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  X,
  ParkingSquare,
  Wrench,
  Sparkles,
  MapPin,
  Calendar,
  FileCheck,
  AlertCircle,
  Users,
  Calculator,
  Coins,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  VehicleItem,
  VehicleStatusHistoryRecord,
  VEHICLE_TYPE_NAMES,
  ServiceSettlementBreakdown,
} from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';
import { PersianDatePicker } from './PersianDatePicker';

interface EndOfWorkModalProps {
  vehicle: VehicleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmEndOfWork: (updatedVehicle: VehicleItem, historyEntry: VehicleStatusHistoryRecord) => void;
}

// Helper to calculate difference in hours between two HH:mm strings
function calculateTimeDifferenceHours(startStr: string, endStr: string): number {
  try {
    const [startH, startM] = startStr.split(':').map((v) => parseInt(v.trim(), 10));
    const [endH, endM] = endStr.split(':').map((v) => parseInt(v.trim(), 10));

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return 3;
    }

    let diffMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (diffMinutes < 0) {
      // In case the service spanned past midnight
      diffMinutes += 24 * 60;
    }

    const hours = diffMinutes / 60;
    return Math.max(0.5, Math.round(hours * 10) / 10);
  } catch {
    return 3;
  }
}

// Helper to add minutes to an HH:mm string
function addHoursToTime(timeStr: string, hoursToAdd: number): string {
  try {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v.trim(), 10));
    if (isNaN(h) || isNaN(m)) return '13:00';

    const totalMin = Math.round(h * 60 + m + hoursToAdd * 60);
    const newH = Math.floor((totalMin / 60) % 24);
    const newM = Math.floor(totalMin % 60);

    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  } catch {
    return '13:00';
  }
}

export const EndOfWorkModal: FC<EndOfWorkModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onConfirmEndOfWork,
}) => {
  if (!isOpen || !vehicle) return null;

  const isNissan = vehicle.vehicleType === 'NISSAN';

  // Compute default start time from mission or default 08:30
  const initialStartTime =
    vehicle.currentMission?.startTime ||
    vehicle.currentMission?.departureTime ||
    vehicle.handoverTime ||
    '08:30';

  // Compute default completion time
  const now = new Date();
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMinute = String(now.getMinutes()).padStart(2, '0');
  const defaultTime = `${currentHour}:${currentMinute}`;
  const defaultDate = vehicle.currentMission?.startDate || '1405/06/12';

  // Time & Duration States
  const [startTime, setStartTime] = useState(initialStartTime);
  const [completionDate, setCompletionDate] = useState(defaultDate);
  const [completionTime, setCompletionTime] = useState(defaultTime);

  // Status & Fleet states
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'PARKING' | 'IN_MAINTENANCE'>('ACTIVE');
  const [autoQueue, setAutoQueue] = useState(true);
  const [destinationLocation, setDestinationLocation] = useState('پارکینگ مرکزی شرکت');
  const [odometer, setOdometer] = useState('');

  // Tariff & Overtime calculation state (3 hours base + separate vehicle & worker overtime)
  const [workerCount, setWorkerCount] = useState<number>(
    vehicle.currentMission?.workerCount ?? 2
  );

  // Rates with sensible defaults (can be edited if rates customize)
  const defaultBaseVehicle = vehicle.currentMission?.baseVehicleRate ?? (isNissan ? 900000 : 1800000);
  const defaultVehicleOvertime = vehicle.currentMission?.hourlyOvertimeVehicle ?? (isNissan ? 350000 : 500000);
  const defaultBaseWorker = vehicle.currentMission?.baseWorkerRate ?? (isNissan ? 350000 : 450000);
  const defaultWorkerOvertime = vehicle.currentMission?.hourlyOvertimeWorker ?? (isNissan ? 120000 : 150000);

  const [baseVehicleRate, setBaseVehicleRate] = useState<number>(defaultBaseVehicle);
  const [hourlyOvertimeVehicle, setHourlyOvertimeVehicle] = useState<number>(defaultVehicleOvertime);
  const [baseWorkerRate, setBaseWorkerRate] = useState<number>(defaultBaseWorker);
  const [hourlyOvertimeWorker, setHourlyOvertimeWorker] = useState<number>(defaultWorkerOvertime);
  const [showRatesEditor, setShowRatesEditor] = useState(false);

  // Calculate elapsed total hours, base 3 hours, and overtime
  const durationHours = useMemo(() => {
    return calculateTimeDifferenceHours(startTime, completionTime);
  }, [startTime, completionTime]);

  // Company Rule: 3 base hours, after that overtime applies
  const BASE_HOURS = 3;
  const overtimeHours = useMemo(() => {
    return Math.max(0, Math.round((durationHours - BASE_HOURS) * 10) / 10);
  }, [durationHours]);

  // Financial Breakdown calculations
  const breakdown: ServiceSettlementBreakdown = useMemo(() => {
    // 1. Vehicle share
    const vehicleBaseFare = baseVehicleRate; // First 3 hours base tariff
    const vehicleOvertimeTotal = Math.round(overtimeHours * hourlyOvertimeVehicle);
    const vehicleTotalAmount = vehicleBaseFare + vehicleOvertimeTotal;

    // 2. Worker share
    const workerBaseTotal = workerCount * baseWorkerRate; // First 3 hours base tariff for all workers
    const workerOvertimeTotal = Math.round(overtimeHours * workerCount * hourlyOvertimeWorker);
    const workerTotalAmount = workerBaseTotal + workerOvertimeTotal;

    // 3. Grand Total
    const grandTotal = vehicleTotalAmount + workerTotalAmount;

    return {
      startTime,
      completionTime,
      totalDurationHours: durationHours,
      baseHours: BASE_HOURS,
      overtimeHours,
      vehicleBaseFare,
      vehicleOvertimeRate: hourlyOvertimeVehicle,
      vehicleOvertimeTotal,
      vehicleTotalAmount,
      workerCount,
      workerBaseRate: baseWorkerRate,
      workerOvertimeRate: hourlyOvertimeWorker,
      workerBaseTotal,
      workerOvertimeTotal,
      workerTotalAmount,
      grandTotal,
    };
  }, [
    startTime,
    completionTime,
    durationHours,
    overtimeHours,
    baseVehicleRate,
    hourlyOvertimeVehicle,
    workerCount,
    baseWorkerRate,
    hourlyOvertimeWorker,
  ]);

  // Notes state
  const [notes, setNotes] = useState(() => {
    return `اتمام بارنامه و تحویل بار به مشتری. مدت کارکرد: ${toFaDigits(durationHours)} ساعت. خودرو در صحت کامل و آماده دریافت سرویس بعدی است.`;
  });

  // Handle Preset Hours click
  const handlePresetDuration = (hours: number) => {
    const newEnd = addHoursToTime(startTime, hours);
    setCompletionTime(newEnd);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const isReady = targetStatus === 'ACTIVE';
    const isParking = targetStatus === 'PARKING';

    const statusTitle = isReady ? 'آماده به کار' : isParking ? 'پارکینگ' : 'تعمیرگاه';

    const summaryText = notes.trim()
      ? notes.trim()
      : `[اتمام سرویس و تسویه]: شروع ${startTime} الی ${completionTime} (${toFaDigits(durationHours)} ساعت کارکرد). ۳ ساعت تعرفه پایه + ${toFaDigits(overtimeHours)} ساعت اضافه. ماشین: ${toFaDigits(breakdown.vehicleTotalAmount.toLocaleString('fa-IR'))} ت | کارگران (${toFaDigits(workerCount)} نفر): ${toFaDigits(breakdown.workerTotalAmount.toLocaleString('fa-IR'))} ت | مجموع: ${toFaDigits(breakdown.grandTotal.toLocaleString('fa-IR'))} ت.`;

    // Create history entry with full settlement breakdown
    const newHistoryRecord: VehicleStatusHistoryRecord = {
      id: `hist-${vehicle.code}-${Date.now()}`,
      rowNumber: (vehicle.history?.length || 0) + 1,
      date: completionDate,
      time: completionTime,
      status: targetStatus,
      statusTitle,
      driverName: vehicle.driverName,
      driverCode: vehicle.driverCode || String(vehicle.code),
      vehicleCode: vehicle.code,
      plateNumber: vehicle.plateNumber,
      vehicleType: VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.vehicleType,
      handoverDate: vehicle.handoverDate || completionDate,
      handoverTime: vehicle.handoverTime || completionTime,
      queueDate: isReady && autoQueue ? completionDate : undefined,
      queueTime: isReady && autoQueue ? completionTime : undefined,
      readyDate: isReady ? completionDate : undefined,
      readyTime: isReady ? completionTime : undefined,
      location: destinationLocation,
      description: summaryText,
      recordedBy: 'دیسپچر / اپراتور اعزام',
      settlementBreakdown: breakdown,
      serviceDurationHours: durationHours,
      serviceOvertimeHours: overtimeHours,
    };

    // Calculate updated vehicle
    const updatedVehicle: VehicleItem = {
      ...vehicle,
      status: targetStatus,
      lastStatusDate: completionDate,
      lastStatusTime: completionTime,
      location: destinationLocation,
      currentMission: undefined, // Clear ongoing mission
      readyDate: isReady ? completionDate : vehicle.readyDate,
      readyTime: isReady ? completionTime : vehicle.readyTime,
      handoverStatus: isParking ? 'RETURNED' : vehicle.handoverStatus,
      queueStatus: isReady && autoQueue ? 'IN_QUEUE' : 'NOT_QUEUED',
      queueDate: isReady && autoQueue ? completionDate : undefined,
      queueTime: isReady && autoQueue ? completionTime : undefined,
      queueNumber: isReady && autoQueue ? vehicle.queueNumber || 1 : undefined,
      history: [newHistoryRecord, ...(vehicle.history || [])],
    };

    onConfirmEndOfWork(updatedVehicle, newHistoryRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e293b] bg-[#0c1322] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>ثبت پایان کار و محاسبه تعرفه و اضافه‌کار</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono">
                  کد {toFaDigits(vehicle.code)}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                قانون ۳ ساعت تعرفه پایه + محاسبه تفکیکی ساعت اضافه خودرو و کارگر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Vehicle Badge Summary */}
        <div className="px-5 py-2.5 bg-[#131d33] border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <IranianPlate plateNumber={vehicle.plateNumber} size="sm" />
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>{VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.vehicleType}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">راننده: {vehicle.driverName}</span>
              </div>
              {vehicle.currentMission?.destination && (
                <div className="text-[11px] text-sky-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>مقصد: {vehicle.currentMission.destination}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right font-mono text-[11px] text-slate-400">
            <div>ساعت شروع ثبت‌شده: <strong className="text-amber-300">{toFaDigits(startTime)}</strong></div>
            <div className="text-emerald-400">سقف تعرفه پایه: ۳ ساعت</div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar">
          
          {/* Dispatch Tariff Rule Highlight Banner */}
          <div className="p-3 bg-gradient-to-r from-blue-950/40 via-amber-950/20 to-blue-950/40 border border-amber-500/30 rounded-xl flex items-start gap-2.5 shadow-sm">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-slate-300">
              <strong className="text-amber-300 font-bold block mb-0.5">
                قانون رسمی اعزام رانندگان به سرویس:
              </strong>
              از زمان شروع کار تا ۳ ساعت اول مشمول مبلغ تعرفه پایه بوده و در صورت ادامه کار، ساعت اضافه به‌صورت کاملاً جداگانه برای ماشین و کارگر محاسبه می‌گردد.
            </div>
          </div>

          {/* Timing & Duration Engine Card */}
          <div className="bg-[#111c30] border border-[#1f2c45] p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>محاسبه زمان سرویس و اضافه‌کار</span>
              </span>
              <div className="w-48">
                <PersianDatePicker
                  value={completionDate}
                  onChange={(val) => setCompletionDate(val)}
                  placeholder="انتخاب تاریخ اتمام..."
                />
              </div>
            </div>

            {/* Time inputs: Start and End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">
                  ساعت شروع به کار (زمان اعزام)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="08:30"
                    className="w-full bg-[#0a101f] border border-[#243553] text-amber-300 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setStartTime('08:30')}
                    className="px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap"
                  >
                    ۰۸:۳۰
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  ساعت پایان کار (زمان اتمام سرویس)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    required
                    value={completionTime}
                    onChange={(e) => setCompletionTime(e.target.value)}
                    placeholder="13:30"
                    className="w-full bg-[#0a101f] border border-[#243553] text-emerald-300 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const n = new Date();
                      setCompletionTime(
                        `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
                      );
                    }}
                    className="px-2 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] whitespace-nowrap"
                  >
                    اکنون
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Duration Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400">میانبرهای زمان:</span>
              <button
                type="button"
                onClick={() => handlePresetDuration(3)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                  durationHours === 3
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-[#0a101f] border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                ۳ ساعت (تعرفه پایه)
              </button>
              <button
                type="button"
                onClick={() => handlePresetDuration(3.5)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold border transition ${
                  durationHours === 3.5
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#0a101f] border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                ۳.۵ س (۳۰ دقیقه اضافه)
              </button>
              <button
                type="button"
                onClick={() => handlePresetDuration(4)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold border transition ${
                  durationHours === 4
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#0a101f] border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                ۴ س (۱ س اضافه)
              </button>
              <button
                type="button"
                onClick={() => handlePresetDuration(5)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold border transition ${
                  durationHours === 5
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#0a101f] border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                ۵ س (۲ س اضافه)
              </button>
            </div>

            {/* Duration Meter & Overtime Status Banner */}
            <div className="p-3 bg-[#0a101f] rounded-lg border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">کل مدت سرویس:</span>
                  <span className="font-mono font-black text-white text-sm">
                    {toFaDigits(durationHours)} ساعت
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-800"></div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ساعات مشمول تعرفه پایه:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {toFaDigits(Math.min(durationHours, BASE_HOURS))} ساعت (۳ س اول)
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-800"></div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ساعت اضافه (اضافه‌کار):</span>
                  <span
                    className={`font-mono font-bold ${
                      overtimeHours > 0 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {overtimeHours > 0 ? `${toFaDigits(overtimeHours)} ساعت` : 'بدون ساعت اضافه'}
                  </span>
                </div>
              </div>

              <div>
                {overtimeHours > 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                    ⚡ {toFaDigits(overtimeHours)} ساعت اضافه‌کار فعال
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                    ✓ سقف ۳ ساعت پایه
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Worker Count & Parameters Configuration */}
          <div className="bg-[#111c30] border border-[#1f2c45] p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200">تعداد کارگران اعزامی همراه راننده:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWorkerCount((c) => Math.max(0, c - 1))}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <span className="font-mono font-bold text-cyan-300 text-sm w-8 text-center">
                  {toFaDigits(workerCount)} نفر
                </span>
                <button
                  type="button"
                  onClick={() => setWorkerCount((c) => Math.min(8, c + 1))}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Toggle Rates Customizer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                نرخ پایه ماشین: {toFaDigits(baseVehicleRate.toLocaleString('fa-IR'))} ت | نرخ اضافه: {toFaDigits(hourlyOvertimeVehicle.toLocaleString('fa-IR'))} ت
              </span>
              <button
                type="button"
                onClick={() => setShowRatesEditor(!showRatesEditor)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <span>{showRatesEditor ? 'بستن تنظیم نرخ‌ها' : 'تنظیم و ویرایش مبالغ تعرفه'}</span>
                {showRatesEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Collapsible Rate Editor */}
            {showRatesEditor && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800 bg-[#0c1322] p-2.5 rounded-lg">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">تعرفه ۳ ساعت اول ماشین</label>
                  <input
                    type="number"
                    step={50000}
                    value={baseVehicleRate}
                    onChange={(e) => setBaseVehicleRate(Number(e.target.value) || 0)}
                    className="w-full bg-[#111c30] border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-amber-300 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نرخ هر ساعت اضافه ماشین</label>
                  <input
                    type="number"
                    step={50000}
                    value={hourlyOvertimeVehicle}
                    onChange={(e) => setHourlyOvertimeVehicle(Number(e.target.value) || 0)}
                    className="w-full bg-[#111c30] border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-amber-300 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">تعرفه ۳ ساعت اول هر کارگر</label>
                  <input
                    type="number"
                    step={25000}
                    value={baseWorkerRate}
                    onChange={(e) => setBaseWorkerRate(Number(e.target.value) || 0)}
                    className="w-full bg-[#111c30] border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-cyan-300 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نرخ هر ساعت اضافه هر کارگر</label>
                  <input
                    type="number"
                    step={25000}
                    value={hourlyOvertimeWorker}
                    onChange={(e) => setHourlyOvertimeWorker(Number(e.target.value) || 0)}
                    className="w-full bg-[#111c30] border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-cyan-300 text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DUAL COLUMN TARIFF & OVERTIME BREAKDOWN (ماشین و کارگر جداگانه) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Column 1: Vehicle (ماشین) */}
            <div className="bg-[#111c30] border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <Truck className="w-4 h-4" />
                  <span>محاسبه سهم ماشین ({VEHICLE_TYPE_NAMES[vehicle.vehicleType] || 'خودرو'})</span>
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.2 rounded">
                  پایه ۳ ساعت
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>تعرفه ۳ ساعت اول (پایه):</span>
                  <span className="font-mono text-white">
                    {toFaDigits(breakdown.vehicleBaseFare.toLocaleString('fa-IR'))} ت
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    ساعت اضافه ({toFaDigits(breakdown.overtimeHours)} س ×{' '}
                    {toFaDigits(breakdown.vehicleOvertimeRate.toLocaleString('fa-IR'))} ت):
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      breakdown.vehicleOvertimeTotal > 0 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    + {toFaDigits(breakdown.vehicleOvertimeTotal.toLocaleString('fa-IR'))} ت
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-xs">
                  <span className="text-amber-300">جمع کل سهم ماشین:</span>
                  <span className="font-mono text-amber-400 text-sm">
                    {toFaDigits(breakdown.vehicleTotalAmount.toLocaleString('fa-IR'))} تومان
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Workers (کارگر / کارگران) */}
            <div className="bg-[#111c30] border border-cyan-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4" />
                  <span>محاسبه سهم کارگران ({toFaDigits(workerCount)} نفر)</span>
                </span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.2 rounded">
                  پایه ۳ ساعت
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    تعرفه ۳ ساعت اول ({toFaDigits(workerCount)} نفر ×{' '}
                    {toFaDigits(baseWorkerRate.toLocaleString('fa-IR'))} ت):
                  </span>
                  <span className="font-mono text-white">
                    {toFaDigits(breakdown.workerBaseTotal.toLocaleString('fa-IR'))} ت
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    ساعت اضافه ({toFaDigits(breakdown.overtimeHours)} س × {toFaDigits(workerCount)} نفر):
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      breakdown.workerOvertimeTotal > 0 ? 'text-cyan-400' : 'text-slate-500'
                    }`}
                  >
                    + {toFaDigits(breakdown.workerOvertimeTotal.toLocaleString('fa-IR'))} ت
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-xs">
                  <span className="text-cyan-300">جمع کل سهم کارگران:</span>
                  <span className="font-mono text-cyan-400 text-sm">
                    {toFaDigits(breakdown.workerTotalAmount.toLocaleString('fa-IR'))} تومان
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Total Bar */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-[#102035] to-emerald-950/40 border-2 border-emerald-500/50 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs font-black text-white block">
                  مجموع صورتحساب نهایی سرویس مأموریت:
                </span>
                <span className="text-[10px] text-slate-400">
                  سهم ماشین: {toFaDigits(breakdown.vehicleTotalAmount.toLocaleString('fa-IR'))} ت + سهم کارگران: {toFaDigits(breakdown.workerTotalAmount.toLocaleString('fa-IR'))} ت
                </span>
              </div>
            </div>
            <div className="text-left font-mono">
              <span className="text-base font-black text-emerald-400">
                {toFaDigits(breakdown.grandTotal.toLocaleString('fa-IR'))}
              </span>
              <span className="text-xs text-slate-300 mr-1">تومان</span>
            </div>
          </div>

          {/* Target Status Choice */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              وضعیت جدید خودرو پس از اتمام سرویس:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Option 1: READY / ACTIVE */}
              <button
                type="button"
                onClick={() => setTargetStatus('ACTIVE')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  targetStatus === 'ACTIVE'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-[#111c30] border-[#1f2c45] text-slate-300 hover:bg-[#16233b]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>آماده به کار</span>
                  </span>
                  {targetStatus === 'ACTIVE' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 leading-relaxed">
                  ثبت آنی زمان آمادگی و امکان دریافت بارنامه بعدی
                </span>
              </button>

              {/* Option 2: PARKING */}
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('PARKING');
                  setAutoQueue(false);
                }}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  targetStatus === 'PARKING'
                    ? 'bg-purple-500/15 border-purple-500/50 text-white shadow-md shadow-purple-950/40'
                    : 'bg-[#111c30] border-[#1f2c45] text-slate-300 hover:bg-[#16233b]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-purple-400 flex items-center gap-1">
                    <ParkingSquare className="w-3.5 h-3.5" />
                    <span>پارکینگ</span>
                  </span>
                  {targetStatus === 'PARKING' && (
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 leading-relaxed">
                  پایان شیفت کاری راننده و پارک در توقفگاه
                </span>
              </button>

              {/* Option 3: MAINTENANCE */}
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('IN_MAINTENANCE');
                  setAutoQueue(false);
                }}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  targetStatus === 'IN_MAINTENANCE'
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md shadow-amber-950/40'
                    : 'bg-[#111c30] border-[#1f2c45] text-slate-300 hover:bg-[#16233b]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>تعمیرگاه / سرویس</span>
                  </span>
                  {targetStatus === 'IN_MAINTENANCE' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 leading-relaxed">
                  نیاز به تعویض روغن یا رفع نقص فنی خودرو
                </span>
              </button>
            </div>
          </div>

          {/* Location & Optional Odometer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">محل توقف / موقعیت فعلی</label>
              <input
                type="text"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                placeholder="مثلاً: پارکینگ مرکزی، پایانه غرب، انبار شورآباد"
                className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">کیلومتر پایان مأموریت (اختیاری)</label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="مثلاً: 245300"
                className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes & Mission Report */}
          <div>
            <label className="block text-slate-400 mb-1">شرح پایان کار و توضیحات مأموریت</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شرح عملیات انجام شده، وضعیت سلامت خودرو، تحویل مدارک و..."
              className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-3 py-2 text-xs focus:border-blue-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Auto Queue Checkbox if ACTIVE */}
          {targetStatus === 'ACTIVE' && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-300 text-xs">
                    ورود مستقیم به صف نوبت بارگیری (در نوبت شدن)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    با ثبت ساعت آمادگی {toFaDigits(completionTime)}، خودرو آماده دریافت حواله بارنامه جدید می‌شود.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoQueue}
                  onChange={(e) => setAutoQueue(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#1e293b] flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأیید پایان کار و تسویه تعرفه</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
