import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  Users,
  Clock,
} from 'lucide-react';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';

export interface AttendancePrintItem {
  id: string;
  code: string;
  name: string;
  role: string;
  department?: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'REST' | 'NOT_JOINED';
  shift?: string;
  notes?: string;
  presentDaysCount?: number;
  absentDaysCount?: number;
  leaveDaysCount?: number;
}

interface AttendanceSheetPrintModalProps {
  title: string;
  subTitle: string;
  items: AttendancePrintItem[];
  year: number;
  month: string;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AttendanceSheetPrintModal: FC<AttendanceSheetPrintModalProps> = ({
  title,
  subTitle,
  items,
  year,
  month,
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'صورت‌جلسه حضور و غیاب',
    subText: getStoredPrintSettings().subText || 'ATTENDANCE AUDIT SHEET',
  }));

  const handlePrint = () => {
    window.print();
  };

  const todayStr = getTodayJalaali().fullFa;

  const getStatusLabel = (status: AttendancePrintItem['status']) => {
    switch (status) {
      case 'PRESENT':
        return 'حاضر (فعال)';
      case 'ABSENT':
        return 'غیبت غیرموجه';
      case 'LEAVE':
        return 'مرخصی (م)';
      case 'REST':
        return 'تعمیرگاه / استراحت (ت)';
      case 'NOT_JOINED':
        return 'قبل از شروع به کار (—)';
      default:
        return 'حاضر (فعال)';
    }
  };

  const presentTotal = items.filter((i) => i.status === 'PRESENT').length;
  const absentTotal = items.filter((i) => i.status === 'ABSENT').length;
  const leaveTotal = items.filter((i) => i.status === 'LEAVE').length;
  const restTotal = items.filter((i) => i.status === 'REST').length;

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-sky-400">
            <Users className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              {title} - دوره {month} {toFaDigits(year)}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ کارکرد (لیزری)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Laser Print Control Toolbar */}
        <LaserPrintControlToolbar
          settings={printSettings}
          onChange={setPrintSettings}
          onPrint={handlePrint}
          title={title}
          onShowToast={onShowToast}
        />

        {/* Printable Sheet */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className="w-full max-w-[210mm] bg-white text-black rounded-xl p-6 sm:p-8 border border-black shadow-md print:border-none print:shadow-none print:p-0 text-xs leading-relaxed relative overflow-hidden font-['Vazirmatn',sans-serif]"
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

            {/* Document Content */}
            <div className="relative z-10 space-y-4">
              {/* Header Letterhead (Zero Dark Smudge) */}
              <div className="border-b-2 border-black pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <Clock className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      سامانه مدیریت منابع انسانی، ترابری و امور اداری
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      {title} — {subTitle}
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono text-[11px] space-y-0.5 text-black border border-black px-2.5 py-1.5 rounded bg-white">
                  <div><strong>دوره کارکرد:</strong> {month} {toFaDigits(year)}</div>
                  <div><strong>تاریخ چاپ:</strong> {toFaDigits(todayStr)}</div>
                  <div><strong>کل نفرات در لیست:</strong> {toFaDigits(items.length)} نفر</div>
                </div>
              </div>

              {/* Statistics Box with Laser Stipple Dotted Header */}
              <div className="grid grid-cols-5 border border-black text-center text-xs divide-x divide-x-reverse divide-black bg-white">
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">کل نفرات لیست</div>
                  <div className="py-1.5 text-sm font-black font-mono">{toFaDigits(items.length)}</div>
                </div>
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">حاضر و فعال</div>
                  <div className="py-1.5 text-sm font-black font-mono">{toFaDigits(presentTotal)}</div>
                </div>
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">مرخصی (م)</div>
                  <div className="py-1.5 text-sm font-black font-mono">{toFaDigits(leaveTotal)}</div>
                </div>
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">تعمیرگاه / استراحت (ت)</div>
                  <div className="py-1.5 text-sm font-black font-mono">{toFaDigits(restTotal)}</div>
                </div>
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">غیبت غیرموجه</div>
                  <div className="py-1.5 text-sm font-black font-mono underline">{toFaDigits(absentTotal)}</div>
                </div>
              </div>

              {/* Attendance Table with Laser Hatch Header */}
              <table className="w-full border-collapse border border-black text-right text-[11px]">
                <thead>
                  <tr className="laser-hatch-header border-b-2 border-black font-black text-center bg-white text-black">
                    <th className="border-l border-black p-1.5 w-8">ردیف</th>
                    <th className="border-l border-black p-1.5 w-20">کد پرسنلی</th>
                    <th className="border-l border-black p-1.5">نام و نام خانوادگی</th>
                    <th className="border-l border-black p-1.5">واحد سازمانی / پلاک</th>
                    <th className="border-l border-black p-1.5">شیفت کاری</th>
                    <th className="border-l border-black p-1.5">وضعیت روز انتخابی</th>
                    <th className="border-l border-black p-1.5 text-center w-32">خلاصه کارکرد ماه</th>
                    <th className="p-1.5 w-20">امضاء / تأیید</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-dotted border-black last:border-b-0">
                      <td className="border-l border-black p-1.5 text-center font-mono">{toFaDigits(idx + 1)}</td>
                      <td className="border-l border-black p-1.5 text-center font-mono font-bold">{toFaDigits(item.code)}</td>
                      <td className="border-l border-black p-1.5 font-bold">{item.name}</td>
                      <td className="border-l border-black p-1.5">{item.department || item.role}</td>
                      <td className="border-l border-black p-1.5">{item.shift || 'شیفت عادی'}</td>
                      <td className="border-l border-black p-1.5 font-bold">
                        <span className={item.status === 'ABSENT' || item.status === 'LEAVE' ? 'underline font-black' : ''}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="border-l border-black p-1.5 text-center font-mono text-[9.5px]">
                        <span>
                          حاضر:{toFaDigits(item.presentDaysCount ?? 0)} | مرخصی:{toFaDigits(item.leaveDaysCount ?? 0)} | غیبت:{toFaDigits(item.absentDaysCount ?? 0)}
                        </span>
                      </td>
                      <td className="p-1.5 text-center">
                        <span className="text-[10px] text-black">.........</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Official Signatures */}
              <div className="border-t-2 border-black pt-4 grid grid-cols-3 gap-6 text-center text-[11px] font-bold text-black mt-6 avoid-page-break">
                <div className="space-y-8">
                  <div>مسئول ثبت و کنترل کارکرد</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-8">
                  <div>مدیر منابع انسانی / ترابری</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-8">
                  <div>معاونت مالی و اداری</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">مهر و امضاء نهایی</div>
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
