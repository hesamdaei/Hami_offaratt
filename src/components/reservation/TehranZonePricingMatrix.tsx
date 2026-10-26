import React, { FC, useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Truck,
  Users,
  ShieldCheck,
  AlertTriangle,
  Info,
  Layers,
  ArrowRightLeft,
  DollarSign,
  Compass,
  CheckCircle2,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  ReservationRates,
  TEHRAN_NEIGHBORHOODS,
  NeighborhoodItem,
  ZoneType,
  TehranZoneSector,
  DEFAULT_RESERVATION_RATES,
  getSafeReservationRates,
} from '../../utils/reservationRates';
import { calculateRouteTariff, RouteTariffResult } from '../../utils/tehranZonePricing';
import { NeighborhoodPicker } from './NeighborhoodPicker';
import { toFaDigits } from '../../utils/jalaali';

interface TehranZonePricingMatrixProps {
  rates?: ReservationRates;
  onUpdateRates?: (newRates: ReservationRates) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TehranZonePricingMatrix: FC<TehranZonePricingMatrixProps> = ({
  rates: rawRates,
  onUpdateRates,
  showToast,
}) => {
  const rates = useMemo(() => getSafeReservationRates(rawRates), [rawRates]);

  // Simulator State
  const [simOrigin, setSimOrigin] = useState<NeighborhoodItem | null>(() => {
    return TEHRAN_NEIGHBORHOODS.find((n) => n.id === 'w_sadeghiyeh') || null;
  });
  const [simOriginText, setSimOriginText] = useState('صادقیه (آریاشهر)');

  const [simDest, setSimDest] = useState<NeighborhoodItem | null>(() => {
    return TEHRAN_NEIGHBORHOODS.find((n) => n.id === 'sp_gilavand') || null;
  });
  const [simDestText, setSimDestText] = useState('گیلاوند (دماوند)');

  const [simHours, setSimHours] = useState<number>(4);
  const [simLaborers, setSimLaborers] = useState<number>(3);

  // Editable rates state for quick editing
  const [editingRates, setEditingRates] = useState<ReservationRates>(() => getSafeReservationRates(rawRates));

  // Sync when rawRates changes
  useEffect(() => {
    setEditingRates(getSafeReservationRates(rawRates));
  }, [rawRates]);

  // Calculate live route tariff
  const routeTariff: RouteTariffResult = calculateRouteTariff(simOrigin, simDest, rates);

  // Overtime calculations for Khavar in simulator
  const khavarOvertimeHours = Math.max(0, simHours - routeTariff.khavarBaseHours);
  const khavarTotalCost = routeTariff.khavarBaseFare + khavarOvertimeHours * routeTariff.khavarOvertimeRate;

  // Overtime calculations for Labor in simulator
  const laborOvertimeHours = Math.max(0, simHours - routeTariff.laborBaseHours);
  const laborSingleCost = routeTariff.laborKhavarBaseWage + laborOvertimeHours * routeTariff.laborKhavarOvertimeWage;
  const laborTotalCost = laborSingleCost * simLaborers;

  // Nissan total in simulator
  const nissanOvertimeHours = Math.max(0, simHours - routeTariff.nissanBaseHours);
  const nissanTotalCost = routeTariff.nissanBaseFare + nissanOvertimeHours * routeTariff.nissanOvertimeRate;

  const grandSimTotal = khavarTotalCost + laborTotalCost;

  const handleSaveMatrixRates = () => {
    const safeUpdated = getSafeReservationRates(editingRates);
    if (onUpdateRates) {
      onUpdateRates(safeUpdated);
    }
    if (showToast) {
      showToast('تعرفه‌های مناطق سه‌گانه تهران و حومه با موفقیت ذخیره شد.', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-[#0d172a] via-[#111e38] to-[#0d172a] border border-[#233554] p-5 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  جدول و ماتریس قیمت‌گذاری جامع مناطق (تهران، حومه و حومه ویژه)
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  پایه‌گذاری منطقه‌ای حامی
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                تشخیص هوشمند دسته‌بندی مبدأ و مقصد، اعمال خودکار نرخ خاور و نیسان و کارگر بر اساس ۳ سطح جغرافیایی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">سطوح طبقه‌بندی:</span>
              <span className="text-xs text-amber-300 font-bold">داخلی • حومه • حومه ویژه</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. INTERACTIVE ROUTE TARIFF SIMULATOR */}
      {/* ========================================================================= */}
      <div className="bg-[#111b2e] border border-[#1f2c45] p-5 rounded-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>شبیه‌ساز و استعلام زنده تعرفه بر اساس مبدأ و مقصد محله‌ها</span>
          </h3>
          <span className="text-xs text-slate-400">
            انتخاب محله ➔ تطبیق خودکار زون ➔ صدور کرایه و قانون بیعانه
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Origin Picker (5 cols) */}
          <div className="md:col-span-5 bg-[#090f1d] p-3.5 rounded-xl border border-slate-800">
            <NeighborhoodPicker
              label="مبدأ بارگیری (محله تهران / حومه)"
              selectedNeighborhood={simOrigin}
              customText={simOriginText}
              onSelect={(item, text) => {
                setSimOrigin(item);
                setSimOriginText(text);
              }}
              placeholder="انتخاب مبدأ (مثال: صادقیه، نیاوران، کرج...)"
              isOrigin={true}
            />
          </div>

          {/* Center Route Arrow (2 cols) */}
          <div className="md:col-span-2 flex flex-col items-center justify-center py-2 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-bold">محاسبه مسیر</span>
          </div>

          {/* Destination Picker (5 cols) */}
          <div className="md:col-span-5 bg-[#090f1d] p-3.5 rounded-xl border border-slate-800">
            <NeighborhoodPicker
              label="مقصد تخلیه (محله تهران / حومه)"
              selectedNeighborhood={simDest}
              customText={simDestText}
              onSelect={(item, text) => {
                setSimDest(item);
                setSimDestText(text);
              }}
              placeholder="انتخاب مقصد (مثال: گیلاوند، هشتگرد، تهرانپارس...)"
              isOrigin={false}
            />
          </div>
        </div>

        {/* Route Detection Summary Banner */}
        <div className="bg-[#090f1d] border border-amber-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-300">نتیجه تحلیل جغرافیایی مسیر:</span>
              <span className="text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                {routeTariff.categoryTitle}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{routeTariff.description}</p>
          </div>

          {routeTariff.requiresDeposit && (
            <div className="bg-rose-950/60 border border-rose-500/50 px-3 py-1.5 rounded-xl flex items-center gap-2 text-rose-200 text-xs font-bold shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>اخذ بیعانه قبل از اعزام الزامی است</span>
            </div>
          )}
        </div>

        {/* Live Calculation Cards for the Route */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Khavar */}
          <div className="bg-[#0b1324] border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>تعرفه خاور مسقف</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                پایه {toFaDigits(routeTariff.khavarBaseHours)} ساعت
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>کرایه پایه خاور:</span>
                <span className="font-mono text-white font-bold">{routeTariff.khavarBaseFare.toLocaleString('fa-IR')} ت</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>هر ساعت اضافه:</span>
                <span className="font-mono text-amber-300">{routeTariff.khavarOvertimeRate.toLocaleString('fa-IR')} ت</span>
              </div>
              {khavarOvertimeHours > 0 && (
                <div className="flex justify-between text-amber-400 text-[11px]">
                  <span>اضافه کار ({toFaDigits(khavarOvertimeHours)} س):</span>
                  <span className="font-mono font-bold">{(khavarOvertimeHours * routeTariff.khavarOvertimeRate).toLocaleString('fa-IR')} ت</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                <span>جمع کل خودرو ({toFaDigits(simHours)} س):</span>
                <span className="font-mono text-amber-400">{khavarTotalCost.toLocaleString('fa-IR')} ت</span>
              </div>
            </div>
          </div>

          {/* Card 2: Labor */}
          <div className="bg-[#0b1324] border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>تعرفه کارگر حمل بار</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                پایه {toFaDigits(routeTariff.laborBaseHours)} ساعت
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>دستمزد پایه هر نفر:</span>
                <span className="font-mono text-white font-bold">{routeTariff.laborKhavarBaseWage.toLocaleString('fa-IR')} ت</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>اضافه کار هر نفر (ساعتی):</span>
                <span className="font-mono text-cyan-300">{routeTariff.laborKhavarOvertimeWage.toLocaleString('fa-IR')} ت</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>تعداد کارگر انتخابی:</span>
                <span className="font-bold text-white">{toFaDigits(simLaborers)} نفر</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                <span>جمع کل دستمزد نیروها:</span>
                <span className="font-mono text-cyan-400">{laborTotalCost.toLocaleString('fa-IR')} ت</span>
              </div>
            </div>
          </div>

          {/* Card 3: Nissan Alternative */}
          <div className="bg-[#0b1324] border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>تعرفه نیسان وانت</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                پایه {toFaDigits(routeTariff.nissanBaseHours)} ساعت
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>کرایه پایه نیسان:</span>
                <span className="font-mono text-white font-bold">{routeTariff.nissanBaseFare.toLocaleString('fa-IR')} ت</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>هر ساعت اضافه:</span>
                <span className="font-mono text-blue-300">{routeTariff.nissanOvertimeRate.toLocaleString('fa-IR')} ت</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                <span>جمع کل نیسان ({toFaDigits(simHours)} س):</span>
                <span className="font-mono text-blue-400">{nissanTotalCost.toLocaleString('fa-IR')} ت</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Estimate for this route */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs font-black text-white block">مجموع برآورد این سرویس (خاور + {toFaDigits(simLaborers)} کارگر برای {toFaDigits(simHours)} ساعت):</span>
              <span className="text-[11px] text-slate-300">بدون احتساب طبقات اقلام سنگین، پیاده‌روی و لوازم مصرفی بسته‌بندی</span>
            </div>
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {grandSimTotal.toLocaleString('fa-IR')} <span className="text-xs text-slate-400 font-normal">تومان</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE-TIER COMPREHENSIVE COMPARISON TABLE */}
      {/* ========================================================================= */}
      <div className="bg-[#111b2e] border border-[#1f2c45] p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>ماتریس مقایسه‌ای ۳ زون اصلی (داخلی تهران، حومه تهران و حومه ویژه)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#090f1d] text-slate-300 border-b border-slate-700">
                <th className="py-3 px-3.5 font-black">سطح جغرافیایی</th>
                <th className="py-3 px-3 font-bold">محدوده‌ها و محله‌های نمونه</th>
                <th className="py-3 px-3 font-bold">پایه خاور</th>
                <th className="py-3 px-3 font-bold">اضافه ساعت خاور</th>
                <th className="py-3 px-3 font-bold">کارگر خاور (پایه/اضافه)</th>
                <th className="py-3 px-3 font-bold">پایه نیسان</th>
                <th className="py-3 px-3 font-bold">قانون بیعانه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {/* Row 1: Internal */}
              <tr className="hover:bg-slate-800/40 transition">
                <td className="py-3.5 px-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-white">۱. داخلی تهران</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">شمال، شرق، غرب، مرکز، جنوب</span>
                </td>
                <td className="py-3.5 px-3 text-slate-300 max-w-xs leading-relaxed">
                  نیاوران، سعادت‌آباد، صادقیه، تهرانپارس، پونک، نازی‌آباد، ونک، پیروزی، ستارخان...
                </td>
                <td className="py-3.5 px-3 font-mono text-emerald-300 font-bold">
                  {rates.khavarDomestic.basePrice.toLocaleString('fa-IR')} ت
                  <span className="text-[10px] text-slate-400 block font-sans">({toFaDigits(rates.khavarDomestic.baseHours)} ساعت)</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.khavarDomestic.overtimeHourly.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.laborKhavarDomestic.basePrice.toLocaleString('fa-IR')} / {rates.laborKhavarDomestic.overtimeHourly.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.nissanDomestic.basePrice.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                    تسویه در مقصد
                  </span>
                </td>
              </tr>

              {/* Row 2: Suburb */}
              <tr className="hover:bg-slate-800/40 transition bg-orange-950/10">
                <td className="py-3.5 px-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                    <span className="font-bold text-white">۲. حومه تهران</span>
                  </div>
                  <span className="text-[10px] text-orange-400">شهرهای اقماری نزدیک</span>
                </td>
                <td className="py-3.5 px-3 text-slate-300 max-w-xs leading-relaxed">
                  اسلامشهر (واوان)، کرج (عظیمیه، جهانشهر، مهرشهر)، فردیس، شهریار، پردیس، اندیشه، شهر قدس، رباط‌کریم، ورامین...
                </td>
                <td className="py-3.5 px-3 font-mono text-orange-300 font-bold">
                  {rates.khavarSuburb.basePrice.toLocaleString('fa-IR')} ت
                  <span className="text-[10px] text-slate-400 block font-sans">({toFaDigits(rates.khavarSuburb.baseHours)} ساعت)</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.khavarSuburb.overtimeHourly.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.laborKhavarDomestic.basePrice.toLocaleString('fa-IR')} / {rates.laborKhavarDomestic.overtimeHourly.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.nissanSuburb.basePrice.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3">
                  <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                    بیعانه الزامی
                  </span>
                </td>
              </tr>

              {/* Row 3: Special Suburb */}
              <tr className="hover:bg-slate-800/40 transition bg-rose-950/10">
                <td className="py-3.5 px-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                    <span className="font-bold text-white">۳. حومه ویژه / دورتر</span>
                  </div>
                  <span className="text-[10px] text-rose-400">بخش‌های دورتر و ییلاقی</span>
                </td>
                <td className="py-3.5 px-3 text-slate-300 max-w-xs leading-relaxed">
                  هشتگرد (قدیم و مهستان)، گیلاوند، دماوند، آبسرد، فیروزکوه، طالقان، نظرآباد، پرند دور، آبعلی...
                </td>
                <td className="py-3.5 px-3 font-mono text-rose-300 font-bold">
                  {rates.khavarSpecialSuburb.basePrice.toLocaleString('fa-IR')} ت
                  <span className="text-[10px] text-rose-400 block font-sans font-bold">({toFaDigits(rates.khavarSpecialSuburb.baseHours)} ساعت پایه ویژه)</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.khavarSpecialSuburb.overtimeHourly.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.laborSpecialSuburb.basePrice.toLocaleString('fa-IR')} / {rates.laborSpecialSuburb.overtimeHourly.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">
                  {rates.nissanSpecialSuburb.basePrice.toLocaleString('fa-IR')} ت
                </td>
                <td className="py-3.5 px-3">
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                    بیعانه الزامی (۳۰٪)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. EDITABLE TARIFF MANAGER FOR ALL 3 ZONES */}
      {/* ========================================================================= */}
      <div className="bg-[#111b2e] border border-[#1f2c45] p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-400" />
            <span>تنظیم و ویرایش مبالغ تعرفه‌ای ۳ زون (داخلی، حومه و حومه ویژه)</span>
          </h3>
          <span className="text-xs text-slate-400">تمامی مبالغ به تومان می‌باشد</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Zone 1: Domestic */}
          <div className="bg-[#090f1d] p-4 rounded-xl border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs border-b border-slate-800 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>تعرفه‌های داخلی تهران (شمال، شرق، غرب...)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">پایه خاور داخلی (تومان)</label>
                <input
                  type="number"
                  value={editingRates.khavarDomestic.basePrice}
                  onChange={(e) =>
                    setEditingRates({
                      ...editingRates,
                      khavarDomestic: { ...editingRates.khavarDomestic, basePrice: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ساعت پایه خاور</label>
                  <input
                    type="number"
                    value={editingRates.khavarDomestic.baseHours}
                    onChange={(e) =>
                      setEditingRates({
                        ...editingRates,
                        khavarDomestic: { ...editingRates.khavarDomestic, baseHours: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت خاور</label>
                  <input
                    type="number"
                    value={editingRates.khavarDomestic.overtimeHourly}
                    onChange={(e) =>
                      setEditingRates({
                        ...editingRates,
                        khavarDomestic: { ...editingRates.khavarDomestic, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">اضافه بهای تردد کراس‌زون شرق↔غرب تهران</label>
                <input
                  type="number"
                  value={editingRates.crossZoneInternalSurcharge}
                  onChange={(e) =>
                    setEditingRates({
                      ...editingRates,
                      crossZoneInternalSurcharge: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Zone 2: Suburb */}
          <div className="bg-[#090f1d] p-4 rounded-xl border border-orange-500/30 space-y-3">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xs border-b border-slate-800 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
              <span>تعرفه‌های حومه تهران (کرج، اسلامشهر...)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">پایه خاور حومه (تومان)</label>
                <input
                  type="number"
                  value={editingRates.khavarSuburb.basePrice}
                  onChange={(e) =>
                    setEditingRates({
                      ...editingRates,
                      khavarSuburb: { ...editingRates.khavarSuburb, basePrice: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ساعت پایه خاور</label>
                  <input
                    type="number"
                    value={editingRates.khavarSuburb.baseHours}
                    onChange={(e) =>
                      setEditingRates({
                        ...editingRates,
                        khavarSuburb: { ...editingRates.khavarSuburb, baseHours: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت خاور</label>
                  <input
                    type="number"
                    value={editingRates.khavarSuburb.overtimeHourly}
                    onChange={(e) =>
                      setEditingRates({
                        ...editingRates,
                        khavarSuburb: { ...editingRates.khavarSuburb, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">پایه نیسان حومه (تومان)</label>
                <input
                  type="number"
                  value={editingRates.nissanSuburb.basePrice}
                  onChange={(e) =>
                    setEditingRates({
                      ...editingRates,
                      nissanSuburb: { ...editingRates.nissanSuburb, basePrice: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Zone 3: Special Suburb */}
          <div className="bg-[#090f1d] p-4 rounded-xl border border-rose-500/30 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs border-b border-slate-800 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span>تعرفه‌های حومه ویژه (هشتگرد، گیلاوند...)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">پایه خاور حومه ویژه (تومان)</label>
                <input
                  type="number"
                  value={editingRates.khavarSpecialSuburb.basePrice}
                  onChange={(e) =>
                    setEditingRates({
                      ...editingRates,
                      khavarSpecialSuburb: { ...editingRates.khavarSpecialSuburb, basePrice: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-rose-300 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ساعت پایه خاور</label>
                  <input
                    type="number"
                    value={editingRates.khavarSpecialSuburb.baseHours}
                    onChange={(e) =>
                      setEditingRates({
                        ...editingRates,
                        khavarSpecialSuburb: { ...editingRates.khavarSpecialSuburb, baseHours: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت خاور</label>
                  <input
                    type="number"
                    value={editingRates.khavarSpecialSuburb.overtimeHourly}
                    onChange={(e) =>
                      setEditingRates({
                        ...editingRates,
                        khavarSpecialSuburb: { ...editingRates.khavarSpecialSuburb, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">دستمزد پایه کارگر حومه ویژه</label>
                <input
                  type="number"
                  value={editingRates.laborSpecialSuburb.basePrice}
                  onChange={(e) =>
                    setEditingRates({
                      ...editingRates,
                      laborSpecialSuburb: { ...editingRates.laborSpecialSuburb, basePrice: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveMatrixRates}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ذخیره و اعمال تغییرات تعرفه مناطق در کل سامانه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
