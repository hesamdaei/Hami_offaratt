import React, { FC, useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  getTodayJalaali,
  getMonthDaysCount,
  getFirstWeekdayOfMonth,
  parseJalaaliDate,
  formatJalaaliDate,
  toFaDigits,
  PERSIAN_MONTH_NAMES,
} from '../utils/jalaali';

interface PersianDatePickerProps {
  value?: string;
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  align?: 'right' | 'left';
  minYear?: number;
  maxYear?: number;
}

const PERSIAN_SHORT_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const PersianDatePicker: FC<PersianDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ...',
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  align = 'right',
  minYear = 1390,
  maxYear = 1415,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => getTodayJalaali(), []);

  // Parse current value or fallback to today
  const parsedValue = useMemo(() => {
    return parseJalaaliDate(value);
  }, [value]);

  // Viewing month and year in the calendar
  const [viewYear, setViewYear] = useState<number>(() => parsedValue?.jy || today.jy);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedValue?.jm || today.jm);

  // Sync view when opened with current value
  useEffect(() => {
    if (isOpen && parsedValue) {
      setViewYear(parsedValue.jy);
      setViewMonth(parsedValue.jm);
    }
  }, [isOpen, parsedValue]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Select day
  const handleSelectDay = (day: number) => {
    const formatted = formatJalaaliDate(viewYear, viewMonth, day);
    onChange(formatted);
    setIsOpen(false);
  };

  // Quick Today
  const handleSelectToday = () => {
    const formatted = formatJalaaliDate(today.jy, today.jm, today.jd);
    onChange(formatted);
    setViewYear(today.jy);
    setViewMonth(today.jm);
    setIsOpen(false);
  };

  // Clear
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Calendar calculations
  const daysInMonth = getMonthDaysCount(viewYear, viewMonth);
  const firstDayWeekday = getFirstWeekdayOfMonth(viewYear, viewMonth); // 0 = Saturday ... 6 = Friday

  // Year options list
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [minYear, maxYear]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-slate-300 font-medium text-xs mb-1">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      {/* Input Display Button */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full bg-[#0a101f] border border-[#1f2c45] hover:border-slate-600 focus:border-blue-500 text-slate-100 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 transition-all select-none ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${inputClassName}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarIcon className="w-4 h-4 text-sky-400 shrink-0" />
            <span className={`font-mono truncate ${value ? 'text-white font-bold' : 'text-slate-400'}`}>
              {value ? toFaDigits(value) : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                title="پاک کردن تاریخ"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <span className="text-[10px] bg-slate-800/80 text-sky-300 px-1.5 py-0.5 rounded font-sans border border-slate-700">
              تقویم
            </span>
          </div>
        </button>
      </div>

      {/* Floating Popover Calendar Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 w-72 bg-[#0e172a] border border-[#223554] rounded-2xl shadow-2xl shadow-black/70 p-3.5 animate-in fade-in zoom-in-95 duration-150 select-none ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {/* Header Controls: Month & Year Selectors with Next/Prev */}
          <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2.5 border-b border-[#1e2f4a]">
            {/* Next Month (in RTL, Right arrow goes forward / next month) */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="ماه بعدی"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-[#091120] border border-[#1f2c45] text-white text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {PERSIAN_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-[#091120] border border-[#1f2c45] text-white text-xs font-bold font-mono rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {toFaDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            {/* Prev Month (in RTL, Left arrow goes backwards / prev month) */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="ماه قبلی"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5 text-[11px] font-bold text-slate-400">
            {PERSIAN_SHORT_WEEKDAYS.map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-1 ${idx === 6 ? 'text-rose-400 font-extrabold' : ''}`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank offset placeholders */}
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`blank-${i}`} className="w-8 h-8" />
            ))}

            {/* Day buttons */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                parsedValue &&
                parsedValue.jy === viewYear &&
                parsedValue.jm === viewMonth &&
                parsedValue.jd === day;
              const isToday =
                today.jy === viewYear &&
                today.jm === viewMonth &&
                today.jd === day;
              const dayOfWeek = (firstDayWeekday + i) % 7;
              const isFriday = dayOfWeek === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center relative ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-600/40 ring-1 ring-sky-300 scale-105 font-black'
                      : isToday
                      ? 'bg-slate-800 text-amber-300 ring-1 ring-amber-400/60 font-black'
                      : isFriday
                      ? 'text-rose-400 hover:bg-rose-950/40'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{toFaDigits(day)}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action Bar */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#1e2f4a] text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>امروز ({toFaDigits(today.jd)} {PERSIAN_MONTH_NAMES[today.jm - 1]})</span>
            </button>

            <div className="flex items-center gap-2">
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-rose-400 transition"
                >
                  پاک‌کردن
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
