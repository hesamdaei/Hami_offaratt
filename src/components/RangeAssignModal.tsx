import { FC, useState, FormEvent } from 'react';
import { X, Layers, Calendar } from 'lucide-react';
import { Driver, AttendanceStatus } from '../types';
import {
  getMonthDaysCount,
  toFaDigits,
  PERSIAN_MONTH_NAMES,
} from '../utils/jalaali';

interface RangeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  year: number;
  month: number;
  onAssignRange: (
    driverId: string | 'all',
    startDay: number,
    endDay: number,
    status: AttendanceStatus
  ) => void;
}

export const RangeAssignModal: FC<RangeAssignModalProps> = ({
  isOpen,
  onClose,
  drivers,
  year,
  month,
  onAssignRange,
}) => {
  const daysInMonth = getMonthDaysCount(year, month);
  const [selectedDriver, setSelectedDriver] = useState<string | 'all'>('all');
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(1);
  const [status, setStatus] = useState<AttendanceStatus>('leave');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const minDay = Math.min(startDay, endDay);
    const maxDay = Math.max(startDay, endDay);
    onAssignRange(selectedDriver, minDay, maxDay, status);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-[#0F172A] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                ثبت وضعیت بازه‌ای و چند روزه
              </h3>
              <p className="text-[11px] text-slate-300">
                {PERSIAN_MONTH_NAMES[month - 1]} {toFaDigits(year)}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              انتخاب راننده
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition"
            >
              <option value="all">همه رانندگان ({toFaDigits(drivers.length)} نفر)</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (کد: {toFaDigits(d.personnelCode || d.code)}) {d.vehiclePlate ? `[پلاک: ${d.vehiclePlate}]` : '[بدون خودرو / نیروی ذخیره]'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نوع وضعیت برای اعمال
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('leave')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  status === 'leave'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                مرخصی (م)
              </button>
              <button
                type="button"
                onClick={() => setStatus('workshop')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  status === 'workshop'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                تعمیرگاه (ت)
              </button>
              <button
                type="button"
                onClick={() => setStatus('none')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  status === 'none'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                پاک‌سازی (حاضر)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                از روز
              </label>
              <select
                value={startDay}
                onChange={(e) => setStartDay(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => (
                    <option key={day} value={day}>
                      روز {toFaDigits(day)}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                تا روز
              </label>
              <select
                value={endDay}
                onChange={(e) => setEndDay(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => (
                    <option key={day} value={day}>
                      روز {toFaDigits(day)}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm"
            >
              اعمال تغییرات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
