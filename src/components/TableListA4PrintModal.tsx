import React, { FC, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  FileText,
  Building2,
  Calendar,
  Clock,
  Layers,
} from 'lucide-react';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';

export interface TableListColumn<T = any> {
  key: string;
  header: string;
  width?: string;
  align?: 'right' | 'center' | 'left';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface TableListA4PrintModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  categoryBadge?: string;
  columns: TableListColumn<T>[];
  data: T[];
  summaryCards?: { label: string; value: string | number; color?: string }[];
  defaultOrientation?: 'portrait' | 'landscape';
  companyName?: string;
  footerNote?: string;
}

export const TableListA4PrintModal: FC<TableListA4PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  categoryBadge,
  columns,
  data,
  summaryCards = [],
  defaultOrientation = 'landscape',
  companyName = 'شرکت ترابری و لجستیک صداقت بار پیشرو',
  footerNote,
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(defaultOrientation);

  const today = useMemo(() => getTodayJalaali(), []);
  const todayDateStr = useMemo(
    () => `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`,
    [today]
  );
  const nowTimeStr = useMemo(() => {
    return new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isLandscape = orientation === 'landscape';

  const modalContent = (
    <div
      dir="rtl"
      className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none"
    >
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Control Bar (Hidden on paper print) */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white">{title}</h2>
                {categoryBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                    {categoryBadge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تعداد ردیف‌های لیست: <strong className="font-mono text-slate-200">{toFaDigits(data.length)}</strong> دستگاه / ردیف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Orientation Toggle */}
            <div className="flex items-center bg-slate-950/70 border border-slate-700 rounded-xl p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  !isLandscape
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                چاپ عمودی (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isLandscape
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                چاپ افقی (Landscape)
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ مستقیم برگه A4</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-950/90 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="table-list-a4-sheet"
            data-printable-a4="true"
            className={`w-full bg-white text-slate-950 rounded-sm p-6 sm:p-8 border border-slate-300 shadow-2xl print:border-none print:shadow-none print:m-0 print:p-0 print:w-full print:max-w-none text-xs leading-normal relative overflow-visible ${
              isLandscape ? 'max-w-[297mm]' : 'max-w-[210mm]'
            }`}
            style={{
              boxSizing: 'border-box',
              fontFamily: "'B Nazanin', 'BNazanin', 'Vazirmatn', Tahoma, sans-serif",
            }}
          >
            {/* 1. OFFICIAL LETTERHEAD HEADER */}
            <div className="border-2 border-slate-900 rounded-lg p-3 mb-3 bg-white">
              <div className="flex items-center justify-between gap-4">
                {/* Right: Company Logo & Identity */}
                <div className="w-1/3 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                    ص
                  </div>
                  <div>
                    <div className="font-black text-slate-950 text-sm tracking-tight">
                      {companyName}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      سامانه جامع لجستیک، ترابری و دیسپچ هوشمند
                    </div>
                  </div>
                </div>

                {/* Center: Document Title & Badge */}
                <div className="w-1/3 text-center border-x-2 border-slate-300 px-3">
                  <div className="inline-block px-4 py-1 border-2 border-slate-900 rounded-md font-black text-sm text-slate-950 bg-slate-50">
                    {title}
                  </div>
                  {subtitle && (
                    <div className="text-[10.5px] text-slate-700 font-semibold mt-1">
                      {subtitle}
                    </div>
                  )}
                </div>

                {/* Left: Metadata & Date */}
                <div className="w-1/3 text-left space-y-1 font-mono text-[10.5px] text-slate-800">
                  <div className="text-right flex items-center justify-end gap-1.5">
                    <span className="font-bold text-slate-600">تاریخ صدور:</span>
                    <strong className="text-slate-950 font-black">{toFaDigits(todayDateStr)}</strong>
                  </div>
                  <div className="text-right flex items-center justify-end gap-1.5">
                    <span className="font-bold text-slate-600">ساعت گزارش:</span>
                    <strong className="text-slate-950 font-black">{toFaDigits(nowTimeStr)}</strong>
                  </div>
                  <div className="text-right flex items-center justify-end gap-1.5">
                    <span className="font-bold text-slate-600">تعداد رکوردها:</span>
                    <strong className="text-slate-950 font-black">{toFaDigits(data.length)} مورد</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. OPTIONAL SUMMARY STATS ROW */}
            {summaryCards.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                {summaryCards.map((sc, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-400 rounded-md p-1.5 text-center bg-slate-50/70"
                  >
                    <div className="text-[9.5px] text-slate-600 font-bold">{sc.label}</div>
                    <div className="text-xs font-black text-slate-950 font-mono mt-0.5">
                      {typeof sc.value === 'number' ? toFaDigits(sc.value) : sc.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. MAIN TABLE DATA (A4 Standard Print Layout) */}
            <div className="border border-slate-900 rounded-lg overflow-hidden mb-4">
              <table className="w-full border-collapse text-[10.5px] text-slate-900">
                <thead>
                  <tr className="bg-slate-200 border-b-2 border-slate-900 font-black text-slate-950 text-center">
                    <th className="py-2 px-1.5 border-l border-slate-400 w-10">ردیف</th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{ width: col.width }}
                        className={`py-2 px-2 border-l border-slate-400 last:border-l-0 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'left'
                            ? 'text-left'
                            : 'text-center'
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="py-8 text-center text-slate-500 font-medium"
                      >
                        هیچ داده‌ای برای چاپ یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, rowIdx) => {
                      const isEven = rowIdx % 2 === 0;
                      return (
                        <tr
                          key={rowIdx}
                          className={`border-b border-slate-300 break-inside-avoid ${
                            isEven ? 'bg-white' : 'bg-slate-50/70'
                          }`}
                        >
                          {/* Row Index */}
                          <td className="py-1.5 px-1 border-l border-slate-300 text-center font-mono font-bold text-slate-800">
                            {toFaDigits(rowIdx + 1)}
                          </td>

                          {/* Data Columns */}
                          {columns.map((col) => {
                            const val = (row as any)[col.key];
                            return (
                              <td
                                key={col.key}
                                className={`py-1.5 px-2 border-l border-slate-300 last:border-l-0 ${
                                  col.align === 'right'
                                    ? 'text-right'
                                    : col.align === 'left'
                                    ? 'text-left'
                                    : 'text-center'
                                }`}
                              >
                                {col.render
                                  ? col.render(row, rowIdx)
                                  : val !== undefined && val !== null && val !== ''
                                  ? typeof val === 'number'
                                    ? toFaDigits(val)
                                    : String(val)
                                  : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. OFFICIAL SIGNATURES & VALIDATION FOOTER */}
            <div className="mt-4 pt-3 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-[10.5px] font-bold text-slate-900">
              <div className="border border-slate-400 rounded-lg p-2.5 flex flex-col justify-between min-h-[70px] bg-slate-50/50">
                <div>تنظیم‌کننده / کارشناس دیسپچ و امور ناوگان</div>
                <div className="text-[9.5px] text-slate-600 font-normal">امضا و تاریخ:</div>
              </div>

              <div className="border border-slate-400 rounded-lg p-2.5 flex flex-col justify-between min-h-[70px] bg-slate-50/50">
                <div>سرپرست ترابری و لجستیک</div>
                <div className="text-[9.5px] text-slate-600 font-normal">امضا و تاریخ:</div>
              </div>

              <div className="border border-slate-400 rounded-lg p-2.5 flex flex-col justify-between min-h-[70px] bg-slate-50/50">
                <div>مدیرعامل / تأیید مدیریت صداقت بار پیشرو</div>
                <div className="text-[9.5px] text-slate-600 font-normal">امضا و مهر رسمی شرکت:</div>
              </div>
            </div>

            {/* 5. SYSTEM FOOTER NOTE */}
            <div className="mt-3 text-center text-[9px] text-slate-600 font-mono flex items-center justify-between border-t border-slate-300 pt-2">
              <div>
                {footerNote ||
                  'این گزارش چاپی استاندارد توسط سامانه رسمی مدیریت ناوگان و دیسپچ صداقت بار پیشرو صادر شده و معتبر است.'}
              </div>
              <div>
                تاریخ پرینت: {toFaDigits(todayDateStr)} • ساعت: {toFaDigits(nowTimeStr)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
