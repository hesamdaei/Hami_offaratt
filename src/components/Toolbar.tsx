import { FC, useRef, ChangeEvent, useState } from 'react';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  FileSpreadsheet,
  LineChart,
  UserPlus,
  Download,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  X,
  Layers,
  Sparkles,
  MoreVertical,
} from 'lucide-react';
import { PERSIAN_MONTH_NAMES, toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { FilterView } from '../types';

interface ToolbarProps {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterView: FilterView;
  onFilterViewChange: (filter: FilterView) => void;
  filteredCount: number;
  totalCount: number;
  onOpenAddDriver: () => void;
  onOpenTimeline: () => void;
  onExportExcel: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  onReset: () => void;
  onOpenBatchAssign: () => void;
  activeDisplayMode?: 'matrix' | 'cards' | 'daily';
  onChangeDisplayMode?: (mode: 'matrix' | 'cards' | 'daily') => void;
}

export const Toolbar: FC<ToolbarProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  searchQuery,
  onSearchChange,
  filterView,
  onFilterViewChange,
  filteredCount,
  totalCount,
  onOpenAddDriver,
  onOpenTimeline,
  onExportExcel,
  onBackup,
  onRestore,
  onReset,
  onOpenBatchAssign,
  activeDisplayMode = 'matrix',
  onChangeDisplayMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const today = getTodayJalaali();
  const isCurrentMonth = today.jy === year && today.jm === month;

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(12);
      onYearChange(year - 1);
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(1);
      onYearChange(year + 1);
    } else {
      onMonthChange(month + 1);
    }
  };

  const handleGoToday = () => {
    onYearChange(today.jy);
    onMonthChange(today.jm);
  };

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestore(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-3.5 shadow-sm space-y-3 select-none">
      {/* Upper Row: Date Capsule + View Switcher + Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left / Date Capsule Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Unified Modern Date Capsule */}
          <div className="flex items-center bg-[#18263e] border border-slate-700/80 rounded-xl p-1 shadow-xs">
            {/* Prev month button */}
            <button
              onClick={handlePrevMonth}
              title="ماه قبل"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Month selector */}
            <select
              value={month}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="bg-transparent text-xs md:text-sm font-black text-white px-2 py-1 cursor-pointer focus:outline-none appearance-none text-center"
            >
              {PERSIAN_MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1} className="bg-[#111b2e] text-white">
                  {name}
                </option>
              ))}
            </select>

            {/* Year Input */}
            <div className="flex items-center px-1 border-r border-slate-700/80">
              <input
                type="number"
                value={year}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1350 && val <= 1450) {
                    onYearChange(val);
                  }
                }}
                min={1350}
                max={1450}
                className="w-13 bg-transparent text-xs md:text-sm font-mono font-bold text-amber-400 text-center focus:outline-none"
              />
            </div>

            {/* Next month button */}
            <button
              onClick={handleNextMonth}
              title="ماه بعد"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Today Button Pill */}
          <button
            onClick={handleGoToday}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              isCurrentMonth
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-[#18263e] border-slate-700 text-slate-300 hover:bg-[#203150] hover:text-white'
            }`}
            title="پرش به تاریخ امروز"
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>امروز</span>
            {isCurrentMonth && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Right / Primary Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeline Chart */}
          <button
            onClick={onOpenTimeline}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#18263e] hover:bg-[#203150] text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow-xs"
            title="مشاهده نمودار و روند غیبت و مرخصی"
          >
            <LineChart className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">تایم‌لاین</span>
          </button>

          {/* Range Batch Assignment */}
          <button
            onClick={onOpenBatchAssign}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#18263e] hover:bg-[#203150] text-blue-300 border border-blue-800/60 transition flex items-center gap-1.5 shadow-xs"
            title="ثبت مرخصی یا تعمیرگاه برای چند روز همزمان"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>ثبت بازه‌ای</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={onExportExcel}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 transition flex items-center gap-1.5 shadow-xs"
            title="دریافت فایل اکسل ماه جاری"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>اکسل</span>
          </button>

          {/* Add Driver Button */}
          <button
            onClick={onOpenAddDriver}
            className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-950" />
            <span>+ راننده جدید</span>
          </button>

          {/* More actions menu (Backup, Restore, Reset) */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-1.5 rounded-xl bg-[#18263e] hover:bg-[#203150] text-slate-400 hover:text-white border border-slate-700 transition"
              title="ابزارهای پشتیبان‌گیری و بیشتر"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1.5 w-48 bg-[#0f172a] border border-slate-700 rounded-xl shadow-xl p-1.5 z-50 animate-fadeIn text-right"
              >
                <button
                  onClick={() => {
                    onBackup();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>دانلود فایل پشتیبان (JSON)</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>بازیابی از فایل پشتیبان</span>
                </button>

                <div className="my-1 border-t border-slate-800" />

                <button
                  onClick={() => {
                    onReset();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/40 rounded-lg flex items-center gap-2 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>بازنشانی یا پاک‌سازی</span>
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Lower Row: Search Bar & Status Filter Badges & Display Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#1f2c45]">
        {/* Search input with live clear & counter */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="جستجوی سریع راننده، پلاک یا کد..."
              className="w-full bg-[#18263e] border border-slate-700 rounded-xl pr-8 pl-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-[#1a2b47] transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="پاک کردن جستجو"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap bg-[#18263e] px-2 py-1 rounded-lg border border-slate-700">
              {toFaDigits(filteredCount)} از {toFaDigits(totalCount)}
            </span>
          )}
        </div>

        {/* Filter Pills with Minimal Counters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] text-slate-400 font-semibold ml-1 hidden sm:flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <span>فیلتر:</span>
          </span>

          <button
            onClick={() => onFilterViewChange('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterView === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[#18263e] text-slate-300 hover:bg-[#203150] border border-slate-700'
            }`}
          >
            <span>همه</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-300">
              {toFaDigits(totalCount)}
            </span>
          </button>

          <button
            onClick={() => onFilterViewChange('has_leave')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
              filterView === 'has_leave'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                : 'bg-amber-950/30 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>دارای مرخصی (م)</span>
          </button>

          <button
            onClick={() => onFilterViewChange('has_workshop')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
              filterView === 'has_workshop'
                ? 'bg-orange-500 text-white border-orange-400 font-black shadow-xs'
                : 'bg-orange-950/30 text-orange-300 border-orange-800/60 hover:bg-orange-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>دارای تعمیرگاه (ت)</span>
          </button>
        </div>

        {/* Optional View Switcher Pill */}
        {onChangeDisplayMode && (
          <div className="flex items-center bg-[#18263e] p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => onChangeDisplayMode('matrix')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeDisplayMode === 'matrix'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای ماتریس ماهانه"
            >
              ماتریس
            </button>
            <button
              onClick={() => onChangeDisplayMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeDisplayMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای کارت‌های نواری رانندگان"
            >
              کارت‌ها
            </button>
            <button
              onClick={() => onChangeDisplayMode('daily')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeDisplayMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای تمرکز روی روز جاری"
            >
              امروز
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
