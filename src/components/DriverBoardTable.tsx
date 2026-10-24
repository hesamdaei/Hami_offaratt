import { FC, useState, useMemo } from 'react';
import {
  Driver,
  AttendanceRecords,
  AttendanceStatus,
  DailySummary,
  STATUS_LABELS,
} from '../types';
import {
  getMonthDaysCount,
  toFaDigits,
  getPersianWeekday,
  formatPersianDateKey,
  getTodayJalaali,
} from '../utils/jalaali';
import {
  Trash2,
  CalendarCheck,
  Wrench,
  UserX,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface DriverBoardTableProps {
  drivers: Driver[];
  records: AttendanceRecords;
  year: number;
  month: number;
  onToggleCell: (driverId: string, day: number) => void;
  onSetStatus: (driverId: string, day: number, status: AttendanceStatus) => void;
  onDeleteDriver: (driverId: string) => void;
  displayMode?: 'matrix' | 'cards' | 'daily';
}

export const DriverBoardTable: FC<DriverBoardTableProps> = ({
  drivers,
  records,
  year,
  month,
  onToggleCell,
  onSetStatus,
  onDeleteDriver,
  displayMode = 'matrix',
}) => {
  const daysInMonth = getMonthDaysCount(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = getTodayJalaali();
  const isCurrentMonth = today.jy === year && today.jm === month;

  const [activeMenuCell, setActiveMenuCell] = useState<{
    driverId: string;
    day: number;
  } | null>(null);

  // Fast smooth status change animation state
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);

  const handleCellToggleWithAnimation = (driverId: string, day: number) => {
    setAnimatingCell(`${driverId}-${day}`);
    onToggleCell(driverId, day);
    setTimeout(() => {
      setAnimatingCell((prev) => (prev === `${driverId}-${day}` ? null : prev));
    }, 350);
  };

  const handleSetStatusWithAnimation = (driverId: string, day: number, status: AttendanceStatus) => {
    setAnimatingCell(`${driverId}-${day}`);
    onSetStatus(driverId, day, status);
    setTimeout(() => {
      setAnimatingCell((prev) => (prev === `${driverId}-${day}` ? null : prev));
    }, 350);
  };

  // Calculate daily totals for footer & metrics (do NOT count future days as active/present)
  const dailySummaries: DailySummary[] = useMemo(() => {
    return daysArray.map((day) => {
      let leave = 0;
      let workshop = 0;
      const isFuture =
        year > today.jy ||
        (year === today.jy && month > today.jm) ||
        (year === today.jy && month === today.jm && day > today.jd);

      drivers.forEach((driver) => {
        const dateKey = formatPersianDateKey(year, month, day);
        const st = records[driver.id]?.[dateKey];
        if (st === 'leave' || st === 'م') leave++;
        if (st === 'workshop' || st === 'ت') workshop++;
      });
      return {
        day,
        weekday: getPersianWeekday(year, month, day),
        leaveCount: leave,
        workshopCount: workshop,
        activeCount: isFuture ? 0 : Math.max(0, drivers.length - leave - workshop),
        isFuture,
      };
    });
  }, [daysArray, drivers, records, year, month, today]);

  // Calculate driver monthly statistics based on elapsed days (do NOT assume future days are present)
  const getDriverMonthStats = (driverId: string) => {
    let leave = 0;
    let workshop = 0;
    let elapsedDays = 0;
    daysArray.forEach((day) => {
      const isFuture =
        year > today.jy ||
        (year === today.jy && month > today.jm) ||
        (year === today.jy && month === today.jm && day > today.jd);
      if (!isFuture) elapsedDays++;

      const dateKey = formatPersianDateKey(year, month, day);
      const st = records[driverId]?.[dateKey];
      if (st === 'leave' || st === 'م') leave++;
      if (st === 'workshop' || st === 'ت') workshop++;
    });
    const present = elapsedDays > 0 ? Math.max(0, elapsedDays - leave - workshop) : 0;
    const presentRate = elapsedDays > 0 ? Math.round((present / elapsedDays) * 100) : 100;
    return { leave, workshop, totalOff: leave + workshop, present, presentRate, elapsedDays };
  };

  // Month-wide totals
  const totalMonthLeaves = useMemo(
    () => dailySummaries.reduce((sum, d) => sum + d.leaveCount, 0),
    [dailySummaries]
  );
  const totalMonthWorkshops = useMemo(
    () => dailySummaries.reduce((sum, d) => sum + d.workshopCount, 0),
    [dailySummaries]
  );

  // Today snapshot numbers
  const todaySummary = useMemo(() => {
    if (!isCurrentMonth) return null;
    return dailySummaries.find((d) => d.day === today.jd) || null;
  }, [dailySummaries, isCurrentMonth, today.jd]);

  if (drivers.length === 0) {
    return (
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-12 text-center shadow-sm">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3.5">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">هیچ راننده‌ای یافت نشد</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          راننده‌ای مطابق با فیلتر یا عبارت جستجوی شما پیدا نشد. برای اضافه کردن راننده جدید از دکمه «+ راننده جدید» استفاده نمایید.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: "Driver Strip Cards" (کارت‌های نواری رانندگان)
  // -------------------------------------------------------------
  if (displayMode === 'cards') {
    return (
      <div className="space-y-2.5 select-none">
        {/* Minimal Stats Header */}
        <div className="bg-[#111b2e] p-3 rounded-2xl border border-[#1f2c45] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>نمای نواری رانندگان:</span>
            </span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>مرخصی ({toFaDigits(totalMonthLeaves)})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>تعمیرگاه ({toFaDigits(totalMonthWorkshops)})</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            💡 با کلیک روی هر خانه روز، وضعیت آن به صورت نوبتی تغییر می‌کند.
          </span>
        </div>

        {/* Drivers Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {drivers.map((driver, idx) => {
            const stats = getDriverMonthStats(driver.id);
            return (
              <div
                key={driver.id}
                className="bg-[#111b2e] border border-[#1f2c45] hover:border-slate-600/80 rounded-2xl p-3.5 transition-all shadow-xs space-y-3"
              >
                {/* Driver Info Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                      {toFaDigits(idx + 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{driver.name}</span>
                        {driver.personnelCode && (
                          <span className="text-[10px] font-mono text-slate-400 bg-[#18263e] px-1.5 py-0.2 rounded border border-slate-700/60">
                            کد: {toFaDigits(driver.personnelCode)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {driver.vehiclePlate ? `پلاک ${driver.vehiclePlate}` : 'راننده ناوگان حامی بار'}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Rate */}
                  <div className="text-left font-mono">
                    <div className="text-xs font-black text-emerald-400">
                      {toFaDigits(stats.presentRate)}٪
                    </div>
                    <div className="text-[9px] text-slate-400 font-sans">نرخ حضور</div>
                  </div>
                </div>

                {/* 30-Day Strip Timeline */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                    <span>تقویم ماه ({toFaDigits(daysInMonth)} روز)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-mono">م: {toFaDigits(stats.leave)}</span>
                      <span className="text-orange-400 font-mono">ت: {toFaDigits(stats.workshop)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-16 gap-1 p-1.5 bg-[#0e1627] rounded-xl border border-slate-800">
                    {daysArray.map((day) => {
                      const dateKey = formatPersianDateKey(year, month, day);
                      const status = records[driver.id]?.[dateKey] || 'none';
                      const isToday = isCurrentMonth && today.jd === day;
                      const isLeave = status === 'leave' || status === 'م';
                      const isWorkshop = status === 'workshop' || status === 'ت';

                      const isAnimating = animatingCell === `${driver.id}-${day}`;

                      return (
                        <button
                          key={day}
                          onClick={() => handleCellToggleWithAnimation(driver.id, day)}
                          className={`h-6 rounded-md flex items-center justify-center font-mono text-[10px] font-bold matrix-status-cell relative ${
                            isAnimating ? 'animate-status-switch ring-2 ring-blue-400' : ''
                          } ${
                            isLeave
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs scale-105 animate-status-ripple-leave'
                              : isWorkshop
                              ? 'bg-orange-500 text-white font-black shadow-xs scale-105 animate-status-ripple-workshop'
                              : isToday
                              ? 'bg-slate-700 text-amber-300 ring-1 ring-amber-400'
                              : 'bg-[#18263e] text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                          title={`روز ${day} - ${driver.name} (${STATUS_LABELS[status] || 'حاضر'})`}
                        >
                          {isLeave ? 'م' : isWorkshop ? 'ت' : toFaDigits(day)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: "Today Focus & Availability" (داشبورد حضور امروز)
  // -------------------------------------------------------------
  if (displayMode === 'daily') {
    const todayDay = isCurrentMonth ? today.jd : 1;
    const todayDateKey = formatPersianDateKey(year, month, todayDay);

    const onLeaveDrivers = drivers.filter((d) => {
      const st = records[d.id]?.[todayDateKey];
      return st === 'leave' || st === 'م';
    });

    const onWorkshopDrivers = drivers.filter((d) => {
      const st = records[d.id]?.[todayDateKey];
      return st === 'workshop' || st === 'ت';
    });

    const activeDrivers = drivers.filter((d) => {
      const st = records[d.id]?.[todayDateKey];
      return !st || st === 'none';
    });

    return (
      <div className="space-y-3 select-none">
        {/* Today Header Banner */}
        <div className="bg-[#111b2e] border border-[#1f2c45] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                وضعیت حضور امروز ({toFaDigits(todayDay)} {month} {year})
              </h3>
              <p className="text-xs text-slate-400">
                بررسی فوری رانندگان حاضر، در مرخصی و در تعمیرگاه در شیفت کاری امروز
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#0e1627] px-4 py-2 rounded-xl border border-slate-800 font-mono">
            <div className="text-center">
              <div className="text-xs font-black text-emerald-400">
                {toFaDigits(activeDrivers.length)}
              </div>
              <div className="text-[10px] text-slate-400 font-sans">حاضر و فعال</div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="text-center">
              <div className="text-xs font-black text-amber-400">
                {toFaDigits(onLeaveDrivers.length)}
              </div>
              <div className="text-[10px] text-slate-400 font-sans">مرخصی (م)</div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="text-center">
              <div className="text-xs font-black text-orange-400">
                {toFaDigits(onWorkshopDrivers.length)}
              </div>
              <div className="text-[10px] text-slate-400 font-sans">تعمیرگاه (ت)</div>
            </div>
          </div>
        </div>

        {/* 3 Columns for Today */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Active Column */}
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2 text-emerald-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>حاضر و در دسترس ({toFaDigits(activeDrivers.length)})</span>
              </span>
            </div>
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto custom-scrollbar">
              {activeDrivers.map((d) => (
                <div
                  key={d.id}
                  className="bg-[#142036] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{d.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      کد: {toFaDigits(d.personnelCode || '---')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSetStatusWithAnimation(d.id, todayDay, 'leave')}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 active:scale-90 text-[10px] font-bold transition-all duration-150"
                      title="ثبت مرخصی امروز"
                    >
                      + مرخصی
                    </button>
                    <button
                      onClick={() => handleSetStatusWithAnimation(d.id, todayDay, 'workshop')}
                      className="px-2 py-1 rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/40 active:scale-90 text-[10px] font-bold transition-all duration-150"
                      title="ثبت تعمیرگاه امروز"
                    >
                      + تعمیرگاه
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Column */}
          <div className="bg-[#111b2e] border border-amber-900/40 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2 text-amber-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <UserX className="w-4 h-4" />
                <span>در مرخصی امروز ({toFaDigits(onLeaveDrivers.length)})</span>
              </span>
            </div>
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto custom-scrollbar">
              {onLeaveDrivers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  امروز راننده‌ای در مرخصی نیست.
                </div>
              ) : (
                onLeaveDrivers.map((d) => (
                  <div
                    key={d.id}
                    className="bg-amber-950/20 p-2.5 rounded-xl border border-amber-800/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-amber-200">{d.name}</div>
                      <div className="text-[10px] text-amber-400/70 mt-0.5">
                        کد: {toFaDigits(d.personnelCode || '---')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSetStatusWithAnimation(d.id, todayDay, 'none')}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white active:scale-90 text-[10px] transition-all duration-150"
                    >
                      لغو و حاضر
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Workshop Column */}
          <div className="bg-[#111b2e] border border-orange-900/40 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2 text-orange-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Wrench className="w-4 h-4" />
                <span>در تعمیرگاه امروز ({toFaDigits(onWorkshopDrivers.length)})</span>
              </span>
            </div>
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto custom-scrollbar">
              {onWorkshopDrivers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  امروز راننده‌ای در تعمیرگاه نیست.
                </div>
              ) : (
                onWorkshopDrivers.map((d) => (
                  <div
                    key={d.id}
                    className="bg-orange-950/20 p-2.5 rounded-xl border border-orange-800/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-orange-200">{d.name}</div>
                      <div className="text-[10px] text-orange-400/70 mt-0.5">
                        کد: {toFaDigits(d.personnelCode || '---')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSetStatusWithAnimation(d.id, todayDay, 'none')}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white active:scale-90 text-[10px] transition-all duration-150"
                    >
                      لغو و حاضر
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 1 (Default): "Creative Minimal Matrix View" (ماتریس مینیمال ماهانه)
  // -------------------------------------------------------------
  return (
    <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl shadow-lg overflow-hidden flex flex-col select-none">
      {/* 1. Minimal Legend & Quick Info Bar */}
      <div className="px-4 py-2.5 bg-[#142036] border-b border-[#1f2c45] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3.5">
          <span className="font-bold text-slate-300">راهنمای علائم:</span>

          {/* Leave pill */}
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[11px] shadow-xs">
              م
            </span>
            <span className="text-slate-300 font-medium">مرخصی</span>
            <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-950/50 px-1.5 py-0.2 rounded-full border border-amber-800/50">
              {toFaDigits(totalMonthLeaves)}
            </span>
          </div>

          {/* Workshop pill */}
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black flex items-center justify-center text-[11px] shadow-xs">
              ت
            </span>
            <span className="text-slate-300 font-medium">تعمیرگاه</span>
            <span className="font-mono text-[10px] text-orange-400 font-bold bg-orange-950/50 px-1.5 py-0.2 rounded-full border border-orange-800/50">
              {toFaDigits(totalMonthWorkshops)}
            </span>
          </div>

          {/* Present */}
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#18263e] border border-slate-700 text-slate-400 flex items-center justify-center text-[10px]">
              -
            </span>
            <span className="text-slate-300 font-medium">حاضر</span>
          </div>
        </div>

        <div className="text-slate-400 text-[11px] hidden md:flex items-center gap-2">
          <span>💡 کلیک مستقیم: تغییر نوبتی وضعیت</span>
          <span>•</span>
          <span>کلیک راست: منوی سریع</span>
        </div>
      </div>

      {/* 2. Main Matrix Table with Smooth Sticky Scroll */}
      <div className="overflow-x-auto overflow-y-auto max-h-[640px] custom-scrollbar bg-[#0c1322]">
        <table className="w-full text-right border-collapse text-xs select-none">
          {/* Table Header */}
          <thead className="sticky top-0 z-30 bg-[#142036] text-white shadow-md">
            <tr>
              {/* Sticky Row Index */}
              <th className="sticky right-0 z-40 bg-[#142036] p-2 text-center font-bold text-slate-400 w-10 border-b border-[#1f2c45] border-l border-[#1f2c45]">
                #
              </th>

              {/* Sticky Driver Name & Vehicle Info */}
              <th className="sticky right-10 z-40 bg-[#142036] p-2.5 font-bold text-white min-w-[200px] border-b border-[#1f2c45] border-l border-[#1f2c45] shadow-md">
                نام و مشخصات راننده
              </th>

              {/* Day Columns 1..N */}
              {daysArray.map((day) => {
                const weekday = getPersianWeekday(year, month, day);
                const isFriday = weekday === 'جمعه';
                const isToday = isCurrentMonth && today.jd === day;

                return (
                  <th
                    key={day}
                    className={`p-1 text-center border-b border-l border-[#1f2c45] min-w-[32px] transition ${
                      isToday
                        ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
                        : isFriday
                        ? 'bg-rose-950/60 text-rose-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <div className="text-[9px] font-bold opacity-80 leading-none mb-0.5">
                      {weekday.slice(0, 1)}
                    </div>
                    <div className="text-xs font-mono font-bold leading-none">
                      {toFaDigits(day)}
                    </div>
                  </th>
                );
              })}

              {/* Summary Columns */}
              <th className="p-2 text-center font-bold text-amber-400 bg-[#111b2e] border-b border-l border-[#1f2c45] min-w-[44px]">
                جمع (م)
              </th>
              <th className="p-2 text-center font-bold text-orange-400 bg-[#111b2e] border-b border-l border-[#1f2c45] min-w-[44px]">
                جمع (ت)
              </th>
              <th className="p-2 text-center font-bold text-slate-400 bg-[#111b2e] border-b border-[#1f2c45] min-w-[38px]">
                حذف
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#1a273f]">
            {drivers.map((driver, idx) => {
              const driverStats = getDriverMonthStats(driver.id);
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={driver.id}
                  className={`hover:bg-[#182845] transition-colors group ${
                    isEven ? 'bg-[#0f172a]' : 'bg-[#111b2e]'
                  }`}
                >
                  {/* Row index - sticky */}
                  <td className="sticky right-0 z-20 p-2 text-center font-mono text-slate-400 font-semibold bg-inherit border-l border-[#1a273f]">
                    {toFaDigits(idx + 1)}
                  </td>

                  {/* Driver Name - sticky */}
                  <td className="sticky right-10 z-20 p-2 font-bold text-white bg-inherit border-l border-[#1a273f] shadow-sm">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs truncate font-bold text-slate-100" title={driver.name}>
                          {driver.name}
                        </span>
                        {driver.personnelCode && (
                          <span className="text-[9px] font-mono text-slate-400 bg-[#18263e] px-1 py-0.2 rounded border border-slate-700/60 shrink-0">
                            {toFaDigits(driver.personnelCode)}
                          </span>
                        )}
                      </div>

                      {/* Mini attendance spark meter */}
                      <span
                        className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/50 px-1 py-0.2 rounded shrink-0"
                        title={`نرخ حضور: ${driverStats.presentRate}٪`}
                      >
                        {toFaDigits(driverStats.presentRate)}٪
                      </span>
                    </div>
                  </td>

                  {/* Day Status Cells */}
                  {daysArray.map((day) => {
                    const dateKey = formatPersianDateKey(year, month, day);
                    const status: AttendanceStatus = records[driver.id]?.[dateKey] || 'none';
                    const weekday = getPersianWeekday(year, month, day);
                    const isFriday = weekday === 'جمعه';
                    const isToday = isCurrentMonth && today.jd === day;

                    const isLeave = status === 'leave' || status === 'م';
                    const isWorkshop = status === 'workshop' || status === 'ت';
                    const isFutureDay =
                      year > today.jy ||
                      (year === today.jy && month > today.jm) ||
                      (year === today.jy && month === today.jm && day > today.jd);
                    const isCellEmptyFuture = isFutureDay && (status === 'none' || !status);

                    const isCellAnimating = animatingCell === `${driver.id}-${day}`;

                    return (
                      <td
                        key={day}
                        onClick={() => handleCellToggleWithAnimation(driver.id, day)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActiveMenuCell({ driverId: driver.id, day });
                        }}
                        className={`p-0.5 text-center border-l border-[#1a273f] cursor-pointer transition-all duration-150 relative group/cell ${
                          isToday
                            ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-400/40'
                            : isFriday
                            ? 'bg-rose-950/20'
                            : ''
                        } ${isCellAnimating ? 'bg-blue-500/25 ring-1 ring-blue-400/50' : ''}`}
                        title={
                          isCellEmptyFuture
                            ? `${driver.name} - روز ${toFaDigits(day)} ${month} - روز پیش‌رو (خالی / ثبت‌نشده)`
                            : `${driver.name} - روز ${toFaDigits(day)} ${month} - وضعیت: ${STATUS_LABELS[status] || 'حاضر'}`
                        }
                      >
                        {/* Rounded Minimal Interactive Chip with Smooth Fast Animation Switch Effect */}
                        <div
                          key={`${status}-${isCellEmptyFuture}`}
                          className={`w-full h-7 rounded-md flex items-center justify-center font-black matrix-status-cell ${
                            isCellAnimating ? 'animate-status-switch ring-2 ring-blue-400/80 shadow-md scale-110' : 'animate-status-pop'
                          } ${
                            isLeave
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 animate-status-ripple-leave'
                              : isWorkshop
                              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 animate-status-ripple-workshop'
                              : isCellEmptyFuture
                              ? 'text-slate-600/30 hover:bg-[#18233a] hover:text-slate-400'
                              : 'text-slate-500 hover:bg-[#1c2c48] hover:text-slate-300 text-xs'
                          }`}
                        >
                          {isLeave ? (
                            <span className="text-xs font-black">م</span>
                          ) : isWorkshop ? (
                            <span className="text-xs font-black">ت</span>
                          ) : isCellEmptyFuture ? (
                            <span className="opacity-0 group-hover/cell:opacity-40 text-[9px] text-slate-600">-</span>
                          ) : (
                            <span className="opacity-0 group-hover/cell:opacity-40 text-[9px]">
                              -
                            </span>
                          )}
                        </div>

                        {/* Minimal Popover Menu on Right Click */}
                        {activeMenuCell?.driverId === driver.id && activeMenuCell.day === day && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-full right-0 z-50 mt-1 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl p-1.5 min-w-[140px] animate-fadeIn text-right"
                          >
                            <div className="text-[10px] text-slate-400 font-bold px-2 py-1 border-b border-slate-800 mb-1">
                              روز {toFaDigits(day)} {month}
                            </div>
                            <button
                              onClick={() => {
                                handleSetStatusWithAnimation(driver.id, day, 'leave');
                                setActiveMenuCell(null);
                              }}
                              className="w-full text-right px-2 py-1 text-xs text-amber-400 hover:bg-amber-950/50 rounded-lg flex items-center gap-1.5 font-bold transition active:scale-95"
                            >
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              مرخصی (م)
                            </button>
                            <button
                              onClick={() => {
                                handleSetStatusWithAnimation(driver.id, day, 'workshop');
                                setActiveMenuCell(null);
                              }}
                              className="w-full text-right px-2 py-1 text-xs text-orange-400 hover:bg-orange-950/50 rounded-lg flex items-center gap-1.5 font-bold transition active:scale-95"
                            >
                              <span className="w-2 h-2 rounded-full bg-orange-500" />
                              تعمیرگاه (ت)
                            </button>
                            <button
                              onClick={() => {
                                handleSetStatusWithAnimation(driver.id, day, 'none');
                                setActiveMenuCell(null);
                              }}
                              className="w-full text-right px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                            >
                              <span className="w-2 h-2 rounded-full bg-slate-500" />
                              حاضر و پاک‌کردن
                            </button>
                            <button
                              onClick={() => setActiveMenuCell(null)}
                              className="w-full text-center mt-1 pt-1 text-[10px] text-slate-400 hover:text-white border-t border-slate-800 transition"
                            >
                              بستن
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Total Leave for Driver */}
                  <td className="p-2 text-center font-mono font-bold text-amber-400 bg-amber-950/20 border-l border-[#1a273f]">
                    {driverStats.leave > 0 ? toFaDigits(driverStats.leave) : '-'}
                  </td>

                  {/* Total Workshop for Driver */}
                  <td className="p-2 text-center font-mono font-bold text-orange-400 bg-orange-950/20 border-l border-[#1a273f]">
                    {driverStats.workshop > 0 ? toFaDigits(driverStats.workshop) : '-'}
                  </td>

                  {/* Delete driver */}
                  <td className="p-1 text-center">
                    <button
                      onClick={() => onDeleteDriver(driver.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                      title="حذف راننده"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Sticky Minimal Footer */}
          <tfoot className="sticky bottom-0 z-30 bg-[#0e1627] text-white shadow-2xl border-t-2 border-[#1f2c45]">
            {/* Leave Total Row */}
            <tr>
              <td
                colSpan={2}
                className="sticky right-0 z-40 bg-[#0e1627] p-2 font-bold text-amber-400 border-l border-[#1f2c45] text-right pr-3"
              >
                <div className="flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5" />
                  <span>مجموع مرخصی‌ها (م):</span>
                </div>
              </td>

              {dailySummaries.map((summary) => {
                const isToday = isCurrentMonth && today.jd === summary.day;
                return (
                  <td
                    key={summary.day}
                    className={`p-1 text-center font-mono font-bold text-xs border-l border-[#1f2c45] ${
                      isToday
                        ? 'bg-amber-500 text-slate-950'
                        : summary.leaveCount > 0
                        ? 'text-amber-400 bg-amber-950/30'
                        : 'text-slate-500'
                    }`}
                  >
                    {summary.leaveCount > 0 ? toFaDigits(summary.leaveCount) : '-'}
                  </td>
                );
              })}

              <td className="p-2 text-center font-mono font-black text-amber-400 bg-[#0c1322] border-l border-[#1f2c45]">
                {toFaDigits(totalMonthLeaves)}
              </td>
              <td className="bg-[#0c1322] border-l border-[#1f2c45]"></td>
              <td className="bg-[#0c1322]"></td>
            </tr>

            {/* Workshop Total Row */}
            <tr>
              <td
                colSpan={2}
                className="sticky right-0 z-40 bg-[#0e1627] p-2 font-bold text-orange-400 border-l border-[#1f2c45] text-right pr-3"
              >
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>مجموع تعمیرگاه‌ها (ت):</span>
                </div>
              </td>

              {dailySummaries.map((summary) => {
                const isToday = isCurrentMonth && today.jd === summary.day;
                return (
                  <td
                    key={summary.day}
                    className={`p-1 text-center font-mono font-bold text-xs border-l border-[#1f2c45] ${
                      isToday
                        ? 'bg-orange-500 text-white'
                        : summary.workshopCount > 0
                        ? 'text-orange-400 bg-orange-950/30'
                        : 'text-slate-500'
                    }`}
                  >
                    {summary.workshopCount > 0 ? toFaDigits(summary.workshopCount) : '-'}
                  </td>
                );
              })}

              <td className="bg-[#0c1322] border-l border-[#1f2c45]"></td>
              <td className="p-2 text-center font-mono font-black text-orange-400 bg-[#0c1322] border-l border-[#1f2c45]">
                {toFaDigits(totalMonthWorkshops)}
              </td>
              <td className="bg-[#0c1322]"></td>
            </tr>

            {/* Total Active Row */}
            <tr className="bg-[#080d1a]">
              <td
                colSpan={2}
                className="sticky right-0 z-40 bg-[#080d1a] p-2 font-bold text-emerald-400 border-l border-[#1f2c45] text-right pr-3"
              >
                <div className="flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>رانندگان فعال و حاضر:</span>
                </div>
              </td>

              {dailySummaries.map((summary) => {
                const isToday = isCurrentMonth && today.jd === summary.day;
                return (
                  <td
                    key={summary.day}
                    className={`p-1 text-center font-mono font-bold text-xs border-l border-[#1f2c45] ${
                      isToday ? 'bg-emerald-600 text-white' : 'text-emerald-400'
                    }`}
                  >
                    {toFaDigits(summary.activeCount)}
                  </td>
                );
              })}

              <td
                colSpan={3}
                className="p-2 text-center font-mono text-[10px] text-slate-400 bg-[#080d1a]"
              >
                ناوگان حامی بار
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
