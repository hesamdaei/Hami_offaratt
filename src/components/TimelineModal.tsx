import { FC } from 'react';
import { X, TrendingUp, Calendar, UserX, Wrench, BarChart2 } from 'lucide-react';
import { Driver, AttendanceRecords } from '../types';
import {
  getMonthDaysCount,
  PERSIAN_MONTH_NAMES,
  toFaDigits,
  getPersianWeekday,
  formatPersianDateKey,
} from '../utils/jalaali';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  records: AttendanceRecords;
  year: number;
  month: number;
}

export const TimelineModal: FC<TimelineModalProps> = ({
  isOpen,
  onClose,
  drivers,
  records,
  year,
  month,
}) => {
  if (!isOpen) return null;

  const daysInMonth = getMonthDaysCount(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Daily statistics for the chart
  const dailyData = daysArray.map((day) => {
    let leave = 0;
    let workshop = 0;
    drivers.forEach((driver) => {
      const dateKey = formatPersianDateKey(year, month, day);
      const st = records[driver.id]?.[dateKey];
      if (st === 'leave') leave++;
      if (st === 'workshop') workshop++;
    });
    const active = Math.max(0, drivers.length - leave - workshop);
    return {
      day,
      weekday: getPersianWeekday(year, month, day),
      leave,
      workshop,
      active,
    };
  });

  // Calculate totals
  const totalLeaves = dailyData.reduce((acc, d) => acc + d.leave, 0);
  const totalWorkshops = dailyData.reduce((acc, d) => acc + d.workshop, 0);
  const maxDayLeave = Math.max(...dailyData.map((d) => d.leave), 1);
  const maxDayWorkshop = Math.max(...dailyData.map((d) => d.workshop), 1);
  const maxCapacity = Math.max(...dailyData.map((d) => d.leave + d.workshop), 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-slideUp my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-[#0F172A] text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-white">
                تحلیل و نمودار ماهانه وضعیت ناوگان
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300">
                {PERSIAN_MONTH_NAMES[month - 1]} {toFaDigits(year)} - تعداد کل رانندگان:{' '}
                <span className="font-mono font-bold text-amber-400">{toFaDigits(drivers.length)}</span> نفر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
                <span>کل مرخصی‌های ثبت‌شده</span>
                <UserX className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {toFaDigits(totalLeaves)}
                <span className="text-xs font-normal mr-1">نفر-روز</span>
              </div>
              <div className="text-[11px] text-amber-600/80 mt-1">
                بیشترین در یک روز: {toFaDigits(maxDayLeave)} نفر
              </div>
            </div>

            <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-orange-800 text-xs font-semibold mb-1">
                <span>کل روزهای تعمیرگاه</span>
                <Wrench className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-2xl font-black text-orange-700 font-mono">
                {toFaDigits(totalWorkshops)}
                <span className="text-xs font-normal mr-1">دستگاه-روز</span>
              </div>
              <div className="text-[11px] text-orange-600/80 mt-1">
                بیشترین در یک روز: {toFaDigits(maxDayWorkshop)} دستگاه
              </div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
                <span>میانگین ناوگان فعال روزانه</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {toFaDigits(
                  Math.round(
                    dailyData.reduce((acc, d) => acc + d.active, 0) / daysInMonth
                  )
                )}
                <span className="text-xs font-normal mr-1">راننده</span>
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-1">
                آماده به کار و فعال
              </div>
            </div>
          </div>

          {/* Bar Chart Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-800">
                  توزیع روزانه مرخصی‌ها و تعمیرگاه‌ها
                </h4>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-slate-600">مرخصی (م)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-orange-500" />
                  <span className="text-slate-600">تعمیرگاه (ت)</span>
                </div>
              </div>
            </div>

            {/* Custom Scaled Bar Chart */}
            <div className="pt-6 pb-2 overflow-x-auto custom-scrollbar">
              <div className="flex items-end gap-1.5 min-w-[620px] h-48 border-b border-slate-200 px-2">
                {dailyData.map((d) => {
                  const leaveHeight = (d.leave / maxCapacity) * 100;
                  const workshopHeight = (d.workshop / maxCapacity) * 100;
                  const isFriday = d.weekday === 'جمعه';

                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-md px-2 py-1 z-20 whitespace-nowrap shadow-lg">
                        <span className="font-bold">{d.weekday} {toFaDigits(d.day)} {PERSIAN_MONTH_NAMES[month - 1]}</span>
                        <span className="text-amber-300">مرخصی: {toFaDigits(d.leave)}</span>
                        <span className="text-orange-300">تعمیرگاه: {toFaDigits(d.workshop)}</span>
                        <span className="text-emerald-300">فعال: {toFaDigits(d.active)}</span>
                      </div>

                      {/* Stacked Bars */}
                      <div className="w-full max-w-[20px] flex flex-col justify-end h-full">
                        {d.workshop > 0 && (
                          <div
                            style={{ height: `${Math.max(workshopHeight, 8)}%` }}
                            className="bg-orange-500 rounded-t-sm w-full transition-all group-hover:bg-orange-600"
                            title={`تعمیرگاه: ${d.workshop}`}
                          />
                        )}
                        {d.leave > 0 && (
                          <div
                            style={{ height: `${Math.max(leaveHeight, 8)}%` }}
                            className={`bg-amber-500 w-full transition-all group-hover:bg-amber-600 ${
                              d.workshop === 0 ? 'rounded-t-sm' : ''
                            }`}
                            title={`مرخصی: ${d.leave}`}
                          />
                        )}
                        {d.leave === 0 && d.workshop === 0 && (
                          <div className="h-1 bg-slate-200 w-full rounded-full" />
                        )}
                      </div>

                      {/* Day Label */}
                      <span
                        className={`text-[10px] font-mono font-bold mt-1 ${
                          isFriday ? 'text-rose-500' : 'text-slate-600'
                        }`}
                      >
                        {toFaDigits(d.day)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
