import React, { FC, useState, useEffect } from 'react';
import {
  Droplet,
  Gauge,
  Route,
  Calendar,
  Check,
  RotateCcw,
  Save,
  History,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { VehicleItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { PersianDatePicker } from './PersianDatePicker';
import {
  toFaDigits,
  getTodayJalaali,
  parseJalaaliDate,
  formatJalaaliDate,
} from '../utils/jalaali';
import {
  ServiceRule,
  evaluateVehicleServiceStatus,
} from '../utils/maintenanceStandardsConfig';

const toEnDigits = (str: string | number): string =>
  String(str)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export interface OilServiceCardProps {
  vehicle: VehicleItem;
  rules?: Record<string, ServiceRule>;
  onUpdateUsageSingleStep: (vehicle: VehicleItem, newCurrentMileage: number, newTrips: number) => void;
  onChangeOilDate: (vehicle: VehicleItem, newDate: string) => void;
  onQuickRegisterOilChange: (
    vehicle: VehicleItem,
    newServiceMileage: number,
    serviceDate: string
  ) => void;
  onOpenHistoryModal?: (vehicle: VehicleItem) => void;
}

export const OilServiceCard: FC<OilServiceCardProps> = ({
  vehicle,
  rules,
  onUpdateUsageSingleStep,
  onChangeOilDate,
  onQuickRegisterOilChange,
  onOpenHistoryModal,
}) => {
  const today = getTodayJalaali();
  const todayStr = `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`;

  const evalResult = evaluateVehicleServiceStatus(vehicle, rules);
  const {
    rule,
    hasMileage,
    lastChangeDate,
    nextDueDateStr,
    daysPassed,
    maxDays,
    daysRemaining,
    daysOverdue,
    tripsDriven,
    maxTrips,
    currentMileage,
    lastChangeMileage,
    drivenKm,
    ceilingKm,
    nextTargetKm,
    remainingKm,
    overdueKm,
    wearPercent,
    status,
  } = evalResult;

  // Local state for 1-step daily usage update (current mileage + trips)
  const [draftMileage, setDraftMileage] = useState<string>(String(currentMileage || 0));
  const [draftTrips, setDraftTrips] = useState<string>(String(tripsDriven || 0));

  // Local state for changing last oil change date
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [draftOilDate, setDraftOilDate] = useState<string>(lastChangeDate);

  // Sync local inputs when vehicle prop updates from outside
  useEffect(() => {
    setDraftMileage(String(evalResult.currentMileage || 0));
    setDraftTrips(String(evalResult.tripsDriven || 0));
    setDraftOilDate(evalResult.lastChangeDate);
  }, [
    vehicle.id,
    evalResult.currentMileage,
    evalResult.tripsDriven,
    evalResult.lastChangeDate,
  ]);

  const parsedDraftMileage = Math.max(
    0,
    parseInt(toEnDigits(draftMileage).replace(/[^0-9]/g, ''), 10) || 0
  );
  const parsedDraftTrips = Math.max(
    0,
    parseInt(toEnDigits(draftTrips).replace(/[^0-9]/g, ''), 10) || 0
  );

  const isUsageDirty =
    (hasMileage && parsedDraftMileage !== currentMileage) || parsedDraftTrips !== tripsDriven;

  const handleSaveDailyUsage = () => {
    onUpdateUsageSingleStep(
      vehicle,
      hasMileage ? parsedDraftMileage : currentMileage,
      parsedDraftTrips
    );
  };

  const handleSaveNewOilDate = () => {
    const clean = draftOilDate.trim();
    const parsed = parseJalaaliDate(clean);
    if (!parsed) return;
    const formatted = formatJalaaliDate(parsed.jy, parsed.jm, parsed.jd);
    onChangeOilDate(vehicle, formatted);
    setIsEditingDate(false);
  };

  const handleQuickOilServiceClick = () => {
    const targetMileage = hasMileage ? Math.max(parsedDraftMileage, currentMileage) : 0;
    onQuickRegisterOilChange(vehicle, targetMileage, todayStr);
  };

  const adjustTrips = (delta: number) => {
    const next = Math.max(0, parsedDraftTrips + delta);
    setDraftTrips(String(next));
  };

  const adjustMileage = (delta: number) => {
    const next = Math.max(0, parsedDraftMileage + delta);
    setDraftMileage(String(next));
  };

  const typeLabel = VEHICLE_TYPE_NAMES[vehicle.vehicleType] || rule.label || vehicle.vehicleType;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-3.5 ${
        status === 'CRITICAL'
          ? 'bg-[#121829] border-rose-500/45 shadow-md shadow-rose-950/20'
          : status === 'WARNING'
          ? 'bg-[#121a2d] border-amber-500/40 shadow-md shadow-amber-950/15'
          : 'bg-[#10192b] border-[#1e2d47] hover:border-slate-700'
      }`}
    >
      {/* 1. Card Top Header: Vehicle Code, Driver, Plate & Status */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center font-mono shrink-0 ${
                status === 'CRITICAL'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : status === 'WARNING'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-[#0a101f] border-slate-800 text-sky-400'
              }`}
            >
              <span className="text-[9px] text-slate-400 font-sans leading-none">کد</span>
              <span className="text-base font-black leading-tight tabular-nums">
                {toFaDigits(vehicle.code)}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-white text-sm truncate">
                  {vehicle.driverName || 'بدون راننده'}
                </h3>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-300 font-semibold">{typeLabel}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] mt-1">
                {status === 'CRITICAL' ? (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      موعد تعویض فوری (
                      {hasMileage && overdueKm > 0
                        ? `${toFaDigits(overdueKm.toLocaleString())} km اضافه`
                        : `${toFaDigits(daysOverdue)} روز گذشته`}
                      )
                    </span>
                  </span>
                ) : status === 'WARNING' ? (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      نزدیک به سرویس ({toFaDigits(daysRemaining)} روز مانده)
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      سرویس معتبر ({toFaDigits(daysRemaining)} روز تا سررسید)
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <IranianPlate plateNumber={vehicle.plateNumber} size="sm" />
          </div>
        </div>

        {/* 2. Oil Service Summary & Progress Bar */}
        <div className="bg-[#0a101f] border border-[#19263e] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400">آخرین تعویض روغن:</span>
              <strong className="font-mono font-black text-white tabular-nums">
                {toFaDigits(lastChangeDate)}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => {
                setDraftOilDate(lastChangeDate);
                setIsEditingDate((prev) => !prev);
              }}
              className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
            >
              {isEditingDate ? 'انصراف' : 'تغییر تاریخ تعویض'}
            </button>
          </div>

          {/* Inline Date Editor when "تغییر تاریخ تعویض" is clicked */}
          {isEditingDate && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 animate-in fade-in duration-150">
              <div className="flex-1">
                <PersianDatePicker
                  value={draftOilDate}
                  onChange={(val) => setDraftOilDate(val)}
                  placeholder="انتخاب تاریخ تعویض..."
                />
              </div>
              <button
                type="button"
                onClick={handleSaveNewOilDate}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ثبت تاریخ</span>
              </button>
            </div>
          )}

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
            <div className="bg-[#111b2e] border border-[#1e2d47] rounded-lg px-2 py-1.5 text-center">
              <div className="text-slate-400 text-[10px]">روز سپری‌شده</div>
              <div className="font-mono font-bold text-slate-100 tabular-nums mt-0.5">
                {toFaDigits(daysPassed)} <span className="text-slate-500">/ {toFaDigits(maxDays)}</span>
              </div>
            </div>

            {hasMileage ? (
              <div className="bg-[#111b2e] border border-[#1e2d47] rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-400 text-[10px]">کیلومتر تعویض قبلی</div>
                <div className="font-mono font-bold text-slate-100 tabular-nums mt-0.5">
                  {toFaDigits(lastChangeMileage.toLocaleString())}
                </div>
              </div>
            ) : (
              <div className="bg-[#111b2e] border border-[#1e2d47] rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-400 text-[10px]">سررسید بعدی</div>
                <div className="font-mono font-bold text-amber-300 tabular-nums mt-0.5">
                  {toFaDigits(nextDueDateStr)}
                </div>
              </div>
            )}

            <div className="bg-[#111b2e] border border-[#1e2d47] rounded-lg px-2 py-1.5 text-center">
              <div className="text-slate-400 text-[10px]">
                {hasMileage ? 'پیمایش از تعویض' : 'تعداد سفر'}
              </div>
              <div className="font-mono font-bold text-sky-300 tabular-nums mt-0.5">
                {hasMileage
                  ? `${toFaDigits(drivenKm.toLocaleString())} km`
                  : `${toFaDigits(tripsDriven)} / ${toFaDigits(maxTrips)}`}
              </div>
            </div>
          </div>

          {/* Wear Progress Bar */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>میزان کارکرد دوره فعلی روغن</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">
                {toFaDigits(wearPercent)}٪
              </span>
            </div>
            <div className="w-full bg-slate-800/90 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  status === 'CRITICAL'
                    ? 'bg-rose-500'
                    : status === 'WARNING'
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(6, wearPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. SINGLE-STEP DAILY USAGE UPDATE (بروزرسانی کیلومتر جاری و تعداد سفر در یک مرحله) */}
        <div className="bg-[#0a101f] border border-[#1f2c45] rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>بروزرسانی یک‌مرحله‌ای کارکرد روزانه</span>
            </span>
            {isUsageDirty && (
              <span className="text-[10px] text-amber-400 font-semibold">تغییر ذخیره نشده</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Current Mileage Input */}
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400">
                {hasMileage ? 'کیلومتر جاری خودرو (km)' : 'کیلومتر جاری (خاور بدون کیلومتر)'}
              </label>
              {hasMileage ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={draftMileage}
                    onChange={(e) => setDraftMileage(toEnDigits(e.target.value))}
                    className="w-full bg-[#111b2e] border border-[#243554] focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => adjustMileage(500)}
                    className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold transition cursor-pointer shrink-0"
                    title="افزایش ۵۰۰ کیلومتر"
                  >
                    +500
                  </button>
                </div>
              ) : (
                <div className="bg-[#111b2e]/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-500 text-center">
                  مبنای ۶۰ روز و ۸۰ سفر
                </div>
              )}
            </div>

            {/* Trips Count Input with +/- Stepper */}
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400">
                تعداد سفر از آخرین تعویض
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustTrips(-1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
                  title="کاهش ۱ سفر"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={draftTrips}
                  onChange={(e) => setDraftTrips(toEnDigits(e.target.value))}
                  className="w-full bg-[#111b2e] border border-[#243554] focus:border-sky-500 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => adjustTrips(1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
                  title="افزایش ۱ سفر"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 1-Step Save Usage Button */}
          <button
            type="button"
            onClick={handleSaveDailyUsage}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isUsageDirty
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                : 'bg-[#152238] hover:bg-[#1c2d4a] text-sky-300 border border-sky-500/25'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>بروزرسانی کیلومتر جاری و تعداد سفر</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom Action Bar: Quick Oil Change Registration (New Mileage + Zero Trips) & History */}
      <div className="pt-2 border-t border-slate-800/90 flex items-center gap-2">
        <button
          type="button"
          onClick={handleQuickOilServiceClick}
          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          title="ثبت فوری تعویض روغن با کیلومتر جدید، تاریخ امروز و صفر کردن شمارنده سفر"
        >
          <Droplet className="w-3.5 h-3.5" />
          <span>ثبت سریع تعویض روغن (صفر کردن سفر)</span>
        </button>

        {onOpenHistoryModal && (
          <button
            type="button"
            onClick={() => onOpenHistoryModal(vehicle)}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0"
            title="مشاهده سوابق و جزئیات کامل سرویس"
          >
            <History className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
