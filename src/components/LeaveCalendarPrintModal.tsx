import React, { FC, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  Calendar,
  Truck,
  Users,
  Filter,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
} from 'lucide-react';
import { Driver, StaffMember, AttendanceRecords, AttendanceStatus } from '../types';
import {
  toFaDigits,
  getTodayJalaali,
  getMonthDaysCount,
  getFirstWeekdayOfMonth,
  formatPersianDateKey,
  PERSIAN_MONTH_NAMES,
} from '../utils/jalaali';
import { STAFF_DEPARTMENTS } from '../utils/staffSeedData';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';

export type LeaveCalendarBoardMode = 'DRIVERS' | 'STAFF';

interface LeaveCalendarPrintModalProps {
  initialMode: LeaveCalendarBoardMode;
  initialYear: number;
  initialMonth: number;
  drivers: Driver[];
  driverRecords: AttendanceRecords;
  staffMembers: StaffMember[];
  staffRecords: AttendanceRecords;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const WEEKDAY_HEADERS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export const LeaveCalendarPrintModal: FC<LeaveCalendarPrintModalProps> = ({
  initialMode,
  initialYear,
  initialMonth,
  drivers,
  driverRecords,
  staffMembers,
  staffRecords,
  onClose,
  onShowToast,
}) => {
  const [boardMode, setBoardMode] = useState<LeaveCalendarBoardMode>(initialMode);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [includeRestWorkshop, setIncludeRestWorkshop] = useState<boolean>(false);

  const [driverVehicleFilter, setDriverVehicleFilter] = useState<'ALL' | 'WITH_VEHICLE' | 'WITHOUT_VEHICLE'>('ALL');

  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text:
      initialMode === 'DRIVERS'
        ? 'تقویم مرخصی رانندگان'
        : 'تقویم مرخصی پرسنل اداری',
    subText: 'MONTHLY LEAVE CALENDAR',
  }));

  const handleModeSwitch = (mode: LeaveCalendarBoardMode) => {
    setBoardMode(mode);
    setPrintSettings((prev) => ({
      ...prev,
      text: mode === 'DRIVERS' ? 'تقویم مرخصی رانندگان' : 'تقویم مرخصی پرسنل اداری',
    }));
  };

  const handlePrevMonth = () => {
    if (selectedMonth > 1) {
      setSelectedMonth((m) => m - 1);
    } else {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth < 12) {
      setSelectedMonth((m) => m + 1);
    } else {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const todayStr = getTodayJalaali().fullFa;
  const monthName = PERSIAN_MONTH_NAMES[selectedMonth - 1] || '';

  // Normalize status helper
  const isLeaveStatus = (raw?: AttendanceStatus): boolean => {
    if (!raw) return false;
    if (raw === 'leave' || raw === 'م') return true;
    if (includeRestWorkshop && (raw === 'workshop' || raw === 'ت')) return true;
    return false;
  };

  // Active list of people based on boardMode, department filter & vehicle filter
  // Crucial: Never exclude anyone who actually has a leave record in this month!
  const activePeople = useMemo(() => {
    if (boardMode === 'DRIVERS') {
      return drivers.filter((d) => {
        // Check if driver has any recorded leave this month
        const hasLeaveInMonth = Object.keys(driverRecords[d.id] || {}).some((k) => {
          const parts = k.split('/');
          return (
            parseInt(parts[0], 10) === selectedYear &&
            parseInt(parts[1], 10) === selectedMonth &&
            isLeaveStatus(driverRecords[d.id][k])
          );
        });

        // If inactive but has leave in this month, retain them for historical accuracy
        if (d.status === 'inactive' && !hasLeaveInMonth) return false;

        // Vehicle Filter: With vehicle vs Without vehicle (Reserve driver)
        const hasVehicle = Boolean(d.vehiclePlate && d.vehiclePlate.trim());
        if (driverVehicleFilter === 'WITH_VEHICLE' && !hasVehicle) return false;
        if (driverVehicleFilter === 'WITHOUT_VEHICLE' && hasVehicle) return false;

        return true;
      });
    }
    return staffMembers.filter((s) => {
      const hasLeaveInMonth = Object.keys(staffRecords[s.id] || {}).some((k) => {
        const parts = k.split('/');
        return (
          parseInt(parts[0], 10) === selectedYear &&
          parseInt(parts[1], 10) === selectedMonth &&
          isLeaveStatus(staffRecords[s.id][k])
        );
      });
      if (s.status === 'inactive' && !hasLeaveInMonth) return false;
      if (departmentFilter !== 'ALL' && s.department !== departmentFilter) return false;
      return true;
    });
  }, [
    boardMode,
    drivers,
    driverRecords,
    staffMembers,
    staffRecords,
    departmentFilter,
    driverVehicleFilter,
    selectedYear,
    selectedMonth,
    includeRestWorkshop,
  ]);

  const activeRecords = boardMode === 'DRIVERS' ? driverRecords : staffRecords;

  // Calendar Grid & Statistical Summary Calculation
  const calendarData = useMemo(() => {
    const daysInMonth = getMonthDaysCount(selectedYear, selectedMonth);
    const firstWeekday = getFirstWeekdayOfMonth(selectedYear, selectedMonth); // 0 = Saturday .. 6 = Friday

    const dailyLeaves: Record<number, string[]> = {};
    const personLeaveDaysMap: Record<
      string,
      { id: string; name: string; count: number; days: number[]; withoutVehicle?: boolean }
    > = {};

    let totalLeavePersonDays = 0;
    let daysWithLeaveCount = 0;
    let peakDay = 0;
    let peakDayCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatPersianDateKey(selectedYear, selectedMonth, day);
      const namesOnLeave: string[] = [];

      activePeople.forEach((person) => {
        const rawStatus = activeRecords[person.id]?.[dateKey];
        if (isLeaveStatus(rawStatus)) {
          const isDriver = 'vehiclePlate' in person || !('department' in person);
          const hasNoVehicle = isDriver && !(person as Driver).vehiclePlate;
          
          namesOnLeave.push(hasNoVehicle ? `${person.name}*` : person.name);
          totalLeavePersonDays++;

          if (!personLeaveDaysMap[person.id]) {
            personLeaveDaysMap[person.id] = {
              id: person.id,
              name: hasNoVehicle ? `${person.name} (بدون خودرو/ذخیره)` : person.name,
              count: 0,
              days: [],
              withoutVehicle: hasNoVehicle,
            };
          }
          personLeaveDaysMap[person.id].count += 1;
          personLeaveDaysMap[person.id].days.push(day);
        }
      });

      dailyLeaves[day] = namesOnLeave;

      if (namesOnLeave.length > 0) {
        daysWithLeaveCount++;
        if (namesOnLeave.length > peakDayCount) {
          peakDayCount = namesOnLeave.length;
          peakDay = day;
        }
      }
    }

    // Build week rows (each row has 7 cells: null for padding or day number 1..daysInMonth)
    const totalSlots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const weeks: Array<Array<number | null>> = [];
    let currentWeek: Array<number | null> = [];

    for (let slot = 0; slot < totalSlots; slot++) {
      const dayNum = slot - firstWeekday + 1;
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        currentWeek.push(dayNum);
      } else {
        currentWeek.push(null);
      }
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    const personSummaryList = Object.values(personLeaveDaysMap).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fa')
    );

    return {
      daysInMonth,
      weeks,
      dailyLeaves,
      totalLeavePersonDays,
      daysWithLeaveCount,
      peakDay,
      peakDayCount,
      personSummaryList,
    };
  }, [selectedYear, selectedMonth, activePeople, activeRecords, includeRestWorkshop]);

  const formTitle =
    boardMode === 'DRIVERS'
      ? 'تقویم رسمی مرخصی ماهانه رانندگان ناوگان'
      : 'تقویم رسمی مرخصی ماهانه کاربران و پرسنل اداری';

  const formSubTitle =
    boardMode === 'DRIVERS'
      ? `واحد عملیات ترابری و اعزام ناوگان — ${monthName} ماه ${toFaDigits(selectedYear)}`
      : `واحد منابع انسانی و امور اداری ${
          departmentFilter !== 'ALL' ? `(${departmentFilter})` : '(کلیه واحدها)'
        } — ${monthName} ماه ${toFaDigits(selectedYear)}`;

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Interactive Control Header (Screen Only) */}
        <div className="px-4 sm:px-5 py-3 bg-slate-800/95 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Calendar className="w-5 h-5 shrink-0" />
            <div>
              <h2 className="text-sm md:text-base font-bold text-white">
                {formTitle} ({monthName} {toFaDigits(selectedYear)})
              </h2>
              <p className="text-[11px] text-slate-300">
                طراحی عمودی A4 مخصوص چاپگر لیزری سیاه‌وسفید (درج نام و نام خانوادگی در هر روز + خلاصه آماری پایین صفحه)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ تقویم مرخصی (A4 لیزری)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode, Month/Year & Filter Selector Strip (Screen Only) */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          {/* Board Switcher: Drivers vs Staff/Users */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleModeSwitch('DRIVERS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                boardMode === 'DRIVERS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>تقویم مرخصی رانندگان ({toFaDigits(drivers.filter((d) => d.status !== 'inactive').length)})</span>
            </button>
            <button
              onClick={() => handleModeSwitch('STAFF')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                boardMode === 'STAFF'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>تقویم مرخصی کاربران و پرسنل ({toFaDigits(staffMembers.filter((s) => s.status !== 'inactive').length)})</span>
            </button>
          </div>

          {/* Month & Year Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                title="ماه قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-950 text-white font-bold px-2 py-0.5 rounded focus:outline-none cursor-pointer"
              >
                {PERSIAN_MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-950 text-amber-300 font-mono font-bold px-2 py-0.5 rounded focus:outline-none cursor-pointer"
              >
                {[1403, 1404, 1405, 1406].map((yr) => (
                  <option key={yr} value={yr}>
                    {toFaDigits(yr)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                title="ماه بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Driver Vehicle Filter */}
            {boardMode === 'DRIVERS' && (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <select
                  value={driverVehicleFilter}
                  onChange={(e) => setDriverVehicleFilter(e.target.value as 'ALL' | 'WITH_VEHICLE' | 'WITHOUT_VEHICLE')}
                  className="bg-slate-950 text-white font-medium focus:outline-none cursor-pointer"
                  title="فیلتر وضعیت خودروی رانندگان"
                >
                  <option value="ALL">همه رانندگان (با و بدون خودرو)</option>
                  <option value="WITH_VEHICLE">فقط رانندگان دارای خودرو</option>
                  <option value="WITHOUT_VEHICLE">فقط رانندگان بدون خودرو (ذخیره)</option>
                </select>
              </div>
            )}

            {/* Staff Department Filter */}
            {boardMode === 'STAFF' && (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-slate-950 text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">همه واحدهای سازمانی</option>
                  {STAFF_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggle to include Rest / Workshop */}
            <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRestWorkshop}
                onChange={(e) => setIncludeRestWorkshop(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>شامل استراحت / تعمیرگاه (ت)</span>
            </label>
          </div>
        </div>

        {/* Laser Print Control Toolbar */}
        <LaserPrintControlToolbar
          settings={printSettings}
          onChange={setPrintSettings}
          onPrint={handlePrint}
          title={formTitle}
          onShowToast={onShowToast}
        />

        {/* Printable A4 Portrait Sheet */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-950 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className="w-full max-w-[210mm] bg-white text-black rounded-xl p-5 sm:p-7 border border-black shadow-md print:border-none print:shadow-none print:p-0 text-xs leading-snug relative overflow-hidden font-['Vazirmatn',sans-serif] a4-single-page"
            style={{ direction: 'rtl' }}
          >
            {/* Customizable Laser Watermark */}
            <LaserPrintWatermark
              enabled={printSettings.enabled}
              text={printSettings.text}
              subText={printSettings.subText}
              opacity={printSettings.opacity}
              fontSizePt={printSettings.fontSizePt}
            />

            {/* Main Printable Content */}
            <div className="relative z-10 space-y-3">
              {/* Official Monochrome Letterhead */}
              <div className="border-b-2 border-black pb-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black shrink-0">
                    {boardMode === 'DRIVERS' ? (
                      <Truck className="w-6 h-6 text-black" />
                    ) : (
                      <Users className="w-6 h-6 text-black" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-sm sm:text-base font-black text-black">
                      {formTitle}
                    </h1>
                    <p className="text-[10.5px] text-black font-bold mt-0.5">
                      {formSubTitle}
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono text-[10px] space-y-0.5 text-black border border-black px-2.5 py-1.5 rounded bg-white">
                  <div>
                    <strong>دوره تقویمی:</strong> {monthName} {toFaDigits(selectedYear)}
                  </div>
                  <div>
                    <strong>تاریخ چاپ:</strong> {toFaDigits(todayStr)}
                  </div>
                  <div>
                    <strong>نوع فرم:</strong>{' '}
                    {boardMode === 'DRIVERS' ? 'ویژه رانندگان ناوگان' : 'ویژه پرسنل و کاربران'}
                  </div>
                </div>
              </div>

              {/* 7-Column Monthly Leave Calendar Table (A4 Portrait Optimized) */}
              <div className="border-2 border-black bg-white">
                <table className="w-full border-collapse table-fixed text-right">
                  <thead>
                    <tr className="laser-hatch-header border-b-2 border-black text-center font-black text-[10.5px] text-black">
                      {WEEKDAY_HEADERS.map((dayName, idx) => (
                        <th
                          key={dayName}
                          className={`py-1.5 px-1 ${
                            idx < 6 ? 'border-l border-black' : ''
                          } ${idx === 6 ? 'laser-dot-header' : ''}`}
                        >
                          {dayName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarData.weeks.map((week, wIdx) => (
                      <tr
                        key={`week-${wIdx}`}
                        className="border-b border-black last:border-b-0 align-top"
                      >
                        {week.map((dayNum, dIdx) => {
                          const isFriday = dIdx === 6;
                          const names = dayNum ? calendarData.dailyLeaves[dayNum] || [] : [];

                          if (dayNum === null) {
                            return (
                              <td
                                key={`empty-${wIdx}-${dIdx}`}
                                className={`${
                                  dIdx < 6 ? 'border-l border-black' : ''
                                } p-1 h-[92px] bg-white align-middle text-center`}
                              >
                                <span className="text-[10px] font-mono text-black/40">—</span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={`day-${dayNum}`}
                              className={`${
                                dIdx < 6 ? 'border-l border-black' : ''
                              } p-1 min-h-[92px] h-[92px] bg-white align-top`}
                            >
                              {/* Day Cell Header Strip */}
                              <div
                                className={`flex items-center justify-between pb-0.5 mb-1 border-b border-dotted border-black ${
                                  isFriday ? 'laser-dot-header px-1' : ''
                                }`}
                              >
                                <span className="font-mono font-black text-[11px] text-black leading-none">
                                  {toFaDigits(dayNum)}
                                </span>
                                {names.length > 0 ? (
                                  <span className="font-mono text-[9px] font-bold text-black leading-none">
                                    {toFaDigits(names.length)} نفر
                                  </span>
                                ) : isFriday ? (
                                  <span className="text-[8.5px] font-bold text-black leading-none">
                                    جمعه
                                  </span>
                                ) : null}
                              </div>

                              {/* Full Names Only List (Confirmed Choice 2: Maximum Legibility & Capacity) */}
                              {names.length > 0 ? (
                                <div className="space-y-0.5">
                                  {names.map((fullName, nIdx) => (
                                    <div
                                      key={`${dayNum}-${nIdx}-${fullName}`}
                                      className="text-[9.5px] leading-[1.22] font-bold text-black border-b border-dotted border-black/40 last:border-b-0 pb-0.5 truncate"
                                      title={fullName}
                                    >
                                      {toFaDigits(nIdx + 1)}. {fullName}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-12 flex items-center justify-center text-[9px] text-black/40 font-mono">
                                  -
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Driver Reserve Footnote */}
              {boardMode === 'DRIVERS' && (
                <div className="flex items-center justify-between text-[8.5px] text-black/80 font-medium px-1 -mt-2 mb-2">
                  <span>* علامت ستاره (*) در کنار نام، نشان‌دهنده راننده کمکی / نیروی آماده‌به‌کار (فاقد خودروی تحویلی) است که مرخصی ایشان ثبت و نگهداری شده است.</span>
                  <span className="font-mono text-[8px] text-black/60">واحد ترابری و لجستیک</span>
                </div>
              )}

              {/* Bottom Statistical Summary Strip (Confirmed Choice 1: Portrait A4 with Bottom Summary) */}
              <div className="grid grid-cols-4 border border-black text-center text-xs divide-x divide-x-reverse divide-black bg-white avoid-page-break">
                <div className="bg-white text-black">
                  <div className="laser-dot-header py-1 px-1.5 text-[9.5px] font-bold">
                    کل {boardMode === 'DRIVERS' ? 'رانندگان فعال' : 'پرسنل فعال'}
                  </div>
                  <div className="py-1.5 text-sm font-black font-mono">
                    {toFaDigits(activePeople.length)} نفر
                  </div>
                </div>
                <div className="bg-white text-black">
                  <div className="laser-dot-header py-1 px-1.5 text-[9.5px] font-bold">
                    مجموع نفر-روز مرخصی ماه
                  </div>
                  <div className="py-1.5 text-sm font-black font-mono">
                    {toFaDigits(calendarData.totalLeavePersonDays)} نفر-روز
                  </div>
                </div>
                <div className="bg-white text-black">
                  <div className="laser-dot-header py-1 px-1.5 text-[9.5px] font-bold">
                    روزهای دارای مرخصی
                  </div>
                  <div className="py-1.5 text-sm font-black font-mono">
                    {toFaDigits(calendarData.daysWithLeaveCount)} از {toFaDigits(calendarData.daysInMonth)} روز
                  </div>
                </div>
                <div className="bg-white text-black">
                  <div className="laser-dot-header py-1 px-1.5 text-[9.5px] font-bold">
                    بیشترین مرخصی هم‌زمان
                  </div>
                  <div className="py-1.5 text-xs font-black font-mono">
                    {calendarData.peakDay > 0
                      ? `${toFaDigits(calendarData.peakDayCount)} نفر (${toFaDigits(
                          calendarData.peakDay
                        )} ${monthName})`
                      : 'بدون مرخصی'}
                  </div>
                </div>
              </div>

              {/* Per-Person Monthly Leave Summary Box */}
              <div className="border border-black bg-white avoid-page-break">
                <div className="laser-hatch-header px-2.5 py-1 text-[10px] font-black text-black flex items-center justify-between">
                  <span>
                    خلاصه آماری نفرات استفاده کننده از مرخصی در {monthName} ماه {toFaDigits(selectedYear)} (
                    {toFaDigits(calendarData.personSummaryList.length)} نفر)
                  </span>
                  <span className="font-mono text-[9.5px]">
                    نام و نام خانوادگی : تعداد روز (روزهای ماه)
                  </span>
                </div>
                <div className="p-2">
                  {calendarData.personSummaryList.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-1 text-[9.5px]">
                      {calendarData.personSummaryList.map((item, idx) => (
                        <div
                          key={item.id}
                          className="border-b border-dotted border-black py-0.5 flex items-center justify-between gap-1"
                        >
                          <span className="font-bold text-black truncate">
                            {toFaDigits(idx + 1)}. {item.name}
                          </span>
                          <span className="font-mono font-black text-black whitespace-nowrap shrink-0">
                            {toFaDigits(item.count)} روز ({item.days.map((d) => toFaDigits(d)).join('،')})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-[10px] font-bold text-black">
                      در این ماه هیچ مورد مرخصی برای{' '}
                      {boardMode === 'DRIVERS' ? 'رانندگان ناوگان' : 'پرسنل اداری'} ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>

              {/* Official 3-Column Signatures Footer */}
              <div className="border-t-2 border-black pt-3 grid grid-cols-3 gap-5 text-center text-[10px] font-bold text-black avoid-page-break">
                <div className="space-y-7">
                  <div>مسئول ثبت و کنترل مرخصی‌ها</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[9.5px]">
                    نام، امضاء و تاریخ
                  </div>
                </div>
                <div className="space-y-7">
                  <div>
                    {boardMode === 'DRIVERS'
                      ? 'سرپرست ترابری و اعزام ناوگان'
                      : 'مدیر منابع انسانی و امور اداری'}
                  </div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[9.5px]">
                    بررسی و تأیید
                  </div>
                </div>
                <div className="space-y-7">
                  <div>مدیریت عامل / معاونت اجرایی</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[9.5px]">
                    مهر و امضاء نهایی
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
