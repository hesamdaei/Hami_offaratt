import { FC, useState } from 'react';
import { Printer, X, FileText, CheckSquare, Square, FileSpreadsheet, Download } from 'lucide-react';
import {
  VehicleHandoverRecord,
  HANDOVER_CHECKLIST_ITEMS,
} from '../types/vehicleHandover';
import { toFaDigits } from '../utils/jalaali';
import { IranianPlate } from './IranianPlate';
import { Truck4ViewPrintableSchematic } from './Truck4ViewPrintableSchematic';
import { exportHandoverToWord, exportHandoverToExcel } from '../utils/handoverDocExporter';

interface VehicleHandoverA4PrintModalProps {
  record: VehicleHandoverRecord;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  defaultBlank?: boolean;
}

export const VehicleHandoverA4PrintModal: FC<VehicleHandoverA4PrintModalProps> = ({
  record,
  onClose,
  onShowToast,
  defaultBlank = false,
}) => {
  const [isBlankForm, setIsBlankForm] = useState<boolean>(defaultBlank);

  const handlePrint = () => {
    window.print();
  };

  // Divide the 66 items into 3 columns of 22 items
  const col1Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 1);
  const col2Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 2);
  const col3Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 3);

  return (
    <div className="print-modal-container fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      {/* Top Action Toolbar (Hidden completely during print) */}
      <div className="no-print sticky top-2 z-30 w-full max-w-4xl bg-[#0f192e] border border-[#22365e] rounded-2xl p-3 mb-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">
            پیش‌نمایش فرم استاندارد A4 تحویل خودرو
          </span>
          <span className="text-slate-400 font-mono">
            {isBlankForm ? '(نسخه خام و سفید بدون علامت)' : `(قبض: ${toFaDigits(record.receiptNumber)})`}
          </span>
        </div>

        {/* Mode Switcher: Blank vs Filled */}
        <div className="flex items-center gap-1.5 bg-[#080d19] p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setIsBlankForm(false)}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              !isBlankForm
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>چاپ برگه تکمیل‌شده</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBlankForm(true)}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isBlankForm
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>چاپ فرم خام (سفید / بدون علامت)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Word Document */}
          <button
            type="button"
            onClick={() => {
              exportHandoverToWord(record, isBlankForm);
              if (onShowToast) onShowToast(isBlankForm ? 'فایل Word فرم خام تحویل دانلود شد.' : 'فایل Word فرم تحویل دانلود شد.', 'success');
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="دانلود دقیق این صورت‌جلسه در قالب فایل Word (.doc / .docx)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>خروجی Word (DOC)</span>
          </button>

          {/* Download Excel Sheet */}
          <button
            type="button"
            onClick={() => {
              exportHandoverToExcel(record, isBlankForm);
              if (onShowToast) onShowToast(isBlankForm ? 'فایل اکسل فرم خام تحویل دانلود شد.' : 'فایل اکسل فرم تحویل دانلود شد.', 'success');
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="دانلود دقیق این صورت‌جلسه در قالب فایل اکسل (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>خروجی اکسل (XLSX)</span>
          </button>

          {/* Print A4 Sheet */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ برگه A4</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A4 Sheet Container - Starts strictly at the top of the page */}
      <div
        id="handover-a4-sheet"
        dir="rtl"
        className="a4-print-sheet bg-white text-slate-900 p-4 sm:p-6 rounded-sm shadow-2xl w-full max-w-[210mm] min-h-[297mm] mx-auto text-[10.5px] font-sans leading-tight border border-slate-300 print:border-none print:shadow-none print:m-0 print:p-0 print:pt-0 print:w-full print:max-w-none print:top-0"
        style={{ boxSizing: 'border-box' }}
      >
        {/* ================= 1. HEADER SECTION ================= */}
        <div className="border border-slate-900 rounded-lg p-2.5 mb-2 flex items-center justify-between">
          {/* Right Logo / Brand */}
          <div className="w-1/3 flex flex-col items-start justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0">
                ص
              </div>
              <div>
                <div className="font-black text-slate-950 text-xs sm:text-sm tracking-tight">
                  شرکت ترابری و لجستیک صداقت بار پیشرو
                </div>
                <div className="text-[9px] text-slate-600 font-mono">
                  تلفن تماس: ۱۷۸۶ | پشتیبانی ناوگان
                </div>
              </div>
            </div>
          </div>

          {/* Center Title & Date/Time */}
          <div className="w-1/3 text-center border-x border-slate-300 px-2">
            <div className="inline-block px-3 py-0.5 border border-slate-900 rounded font-black text-sm text-slate-950 mb-0.5 bg-slate-50">
              صورت‌جلسه تحویل و تحول خودرو
            </div>
            <div className="text-[9.5px] text-slate-700 font-bold flex items-center justify-center gap-2">
              <span>تاریخ: <strong className="font-mono">{isBlankForm ? '.... / .... / ....' : toFaDigits(record.date)}</strong></span>
              <span>•</span>
              <span>ساعت: <strong className="font-mono">{isBlankForm ? '.... : ....' : toFaDigits(record.time)}</strong></span>
            </div>
          </div>

          {/* Left Receipt & Address */}
          <div className="w-1/3 text-left space-y-0.5 font-mono text-[10px]">
            <div className="text-right">
              <span className="font-bold text-slate-800">شماره قبض: </span>
              <span className="font-black text-slate-950 text-xs">
                {isBlankForm ? '................' : toFaDigits(record.receiptNumber)}
              </span>
            </div>
            <div className="text-right text-[9.5px] text-slate-600 truncate">
              <span className="font-bold">محل تحویل: </span>
              <span>{isBlankForm ? 'پایانه مرکزی ناوگان صداقت بار پیشرو' : (record.address || 'پایانه مرکزی صداقت بار پیشرو')}</span>
            </div>
          </div>
        </div>

        {/* ================= 2. DRIVER & VEHICLE INFO SECTION (Coherent & Interlinked) ================= */}
        <div className="border border-slate-900 rounded-lg p-2 mb-2 bg-slate-50/50 space-y-1.5">
          {/* Section A: Driver Info */}
          <div>
            <div className="text-[9.5px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block" />
              <span>الف) مشخصات فردی راننده (تحویل‌گیرنده خودرو):</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-slate-900 text-[10.5px] bg-white p-1.5 rounded border border-slate-200">
              <div>
                <span className="text-slate-600 font-medium">نام: </span>
                <strong className="font-bold text-slate-950">
                  {isBlankForm ? '........................' : (record.driverName || '........................')}
                </strong>
              </div>
              <div>
                <span className="text-slate-600 font-medium">نام خانوادگی: </span>
                <strong className="font-bold text-slate-950">
                  {isBlankForm ? '........................' : (record.driverLastName || '........................')}
                </strong>
              </div>
              <div>
                <span className="text-slate-600 font-medium">نام پدر: </span>
                <strong className="font-bold text-slate-950">
                  {isBlankForm ? '........................' : (record.driverFatherName || '........................')}
                </strong>
              </div>
              <div>
                <span className="text-slate-600 font-medium">شماره ملی: </span>
                <strong className="font-mono font-bold text-slate-950">
                  {isBlankForm ? '........................' : (toFaDigits(record.driverNationalId) || '........................')}
                </strong>
              </div>
            </div>
          </div>

          {/* Section B: Vehicle & Plate Info */}
          <div>
            <div className="text-[9.5px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block" />
              <span>ب) مشخصات کامیونت و پلاک انتظامی (مورد تحویل):</span>
            </div>
            <div className="grid grid-cols-4 gap-2 items-center text-[10.5px] bg-white p-1.5 rounded border border-slate-200">
              <div>
                <span className="text-slate-600 font-medium">نوع وسیله: </span>
                <strong className="font-bold text-slate-950">
                  {isBlankForm ? '........................' : (record.vehicleType || 'کامیونت کانتینردار ایسوزو')}
                </strong>
              </div>
              <div>
                <span className="text-slate-600 font-medium">کد ناوگان: </span>
                <strong className="font-mono font-bold text-slate-950">
                  {isBlankForm ? '................' : (record.vehicleCode ? toFaDigits(record.vehicleCode) : '۱')}
                </strong>
              </div>
              <div>
                <span className="text-slate-600 font-medium">رنگ بدنه: </span>
                <strong className="font-bold text-slate-950">
                  {isBlankForm ? '................' : (record.vehicleColor || 'سفید روغنی')}
                </strong>
              </div>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-slate-600 font-medium text-[10px]">پلاک انتظامی: </span>
                <div className="scale-75 origin-left inline-block">
                  <IranianPlate
                    plateNumber={record.vehiclePlate || '۶۶-۵۳۳ع۲۵'}
                    size="sm"
                    isBlank={isBlankForm}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 3. 3-COLUMN 66-ITEM CHECKLIST TABLE ================= */}
        <div className="border border-slate-900 rounded-lg overflow-hidden mb-2">
          <div className="bg-slate-100 border-b border-slate-900 py-0.5 px-2 text-center font-bold text-[10px] text-slate-900 flex items-center justify-between">
            <span>چک‌لیست رسمی سلامت قطعات، تجهیزات، ادوات فنی و اسناد خودرو (۶۶ قلم استاندارد صداقت بار پیشرو)</span>
            {isBlankForm && (
              <span className="text-[9px] text-slate-600 font-normal">
                (جهت بازرسی حضوری: داخل مربع مربوطه را با خودکار علامت بزنید)
              </span>
            )}
          </div>

          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-900 text-slate-900 font-black text-center">
                {/* Column 1 Headers */}
                <th className="py-1 px-1 border-l border-slate-400 text-right w-[15%]">شرح قطعه (فنی و موتور)</th>
                <th className="py-1 px-0.5 border-l border-slate-400 w-[5%]">سالم</th>
                <th className="py-1 px-0.5 border-l border-slate-400 w-[6%]">نقص</th>
                <th className="py-1 px-0.5 border-l-2 border-slate-900 w-[6%]">ندارد</th>

                {/* Column 2 Headers */}
                <th className="py-1 px-1 border-l border-slate-400 text-right w-[15%]">شرح قطعه (بدنه و کابین)</th>
                <th className="py-1 px-0.5 border-l border-slate-400 w-[5%]">سالم</th>
                <th className="py-1 px-0.5 border-l border-slate-400 w-[6%]">نقص</th>
                <th className="py-1 px-0.5 border-l-2 border-slate-900 w-[6%]">ندارد</th>

                {/* Column 3 Headers */}
                <th className="py-1 px-1 border-l border-slate-400 text-right w-[16%]">شرح قطعه (اسناد و ادوات)</th>
                <th className="py-1 px-0.5 border-l border-slate-400 w-[5%]">سالم</th>
                <th className="py-1 px-0.5 border-l border-slate-400 w-[6%]">نقص</th>
                <th className="py-1 px-0.5 w-[6%]">ندارد</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 22 }).map((_, rowIdx) => {
                const item1 = col1Items[rowIdx];
                const item2 = col2Items[rowIdx];
                const item3 = col3Items[rowIdx];

                const st1 = !isBlankForm && item1 ? record.checklist[item1.id] || 'HEALTHY' : null;
                const st2 = !isBlankForm && item2 ? record.checklist[item2.id] || 'HEALTHY' : null;
                const st3 = !isBlankForm && item3 ? record.checklist[item3.id] || 'HEALTHY' : null;

                const isEven = rowIdx % 2 === 0;

                return (
                  <tr
                    key={rowIdx}
                    className={`border-b border-slate-300 text-center ${
                      isEven ? 'bg-white' : 'bg-slate-50/60'
                    }`}
                  >
                    {/* Column 1 Title */}
                    <td className="py-0.5 px-1 text-right font-medium text-slate-900 border-l border-slate-300 truncate">
                      {item1 ? `${toFaDigits(item1.id.replace(/^item_/, ''))}. ${item1.label}` : ''}
                    </td>
                    <td className="py-0.5 px-0.5 border-l border-slate-300 font-bold">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-500 rounded-xs" />
                      ) : st1 === 'HEALTHY' ? (
                        <span className="font-black text-slate-900">✓</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="py-0.5 px-0.5 border-l border-slate-300 font-bold">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-500 rounded-xs" />
                      ) : st1 === 'DAMAGED' ? (
                        <span className="font-black text-red-700">✗</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="py-0.5 px-0.5 border-l-2 border-slate-900">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-400 rounded-xs" />
                      ) : st1 === 'NONE' ? (
                        <span className="font-bold text-slate-500">—</span>
                      ) : (
                        ''
                      )}
                    </td>

                    {/* Column 2 Title */}
                    <td className="py-0.5 px-1 text-right font-medium text-slate-900 border-l border-slate-300 truncate">
                      {item2 ? `${toFaDigits(item2.id.replace(/^item_/, ''))}. ${item2.label}` : ''}
                    </td>
                    <td className="py-0.5 px-0.5 border-l border-slate-300 font-bold">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-500 rounded-xs" />
                      ) : st2 === 'HEALTHY' ? (
                        <span className="font-black text-slate-900">✓</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="py-0.5 px-0.5 border-l border-slate-300 font-bold">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-500 rounded-xs" />
                      ) : st2 === 'DAMAGED' ? (
                        <span className="font-black text-red-700">✗</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="py-0.5 px-0.5 border-l-2 border-slate-900">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-400 rounded-xs" />
                      ) : st2 === 'NONE' ? (
                        <span className="font-bold text-slate-500">—</span>
                      ) : (
                        ''
                      )}
                    </td>

                    {/* Column 3 Title */}
                    <td className="py-0.5 px-1 text-right font-medium text-slate-900 border-l border-slate-300 truncate">
                      {item3 ? `${toFaDigits(item3.id.replace(/^item_/, ''))}. ${item3.label}` : ''}
                    </td>
                    <td className="py-0.5 px-0.5 border-l border-slate-300 font-bold">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-500 rounded-xs" />
                      ) : st3 === 'HEALTHY' ? (
                        <span className="font-black text-slate-900">✓</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="py-0.5 px-0.5 border-l border-slate-300 font-bold">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-500 rounded-xs" />
                      ) : st3 === 'DAMAGED' ? (
                        <span className="font-black text-red-700">✗</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="py-0.5 px-0.5">
                      {isBlankForm ? (
                        <span className="inline-block w-2.5 h-2.5 border border-slate-400 rounded-xs" />
                      ) : st3 === 'NONE' ? (
                        <span className="font-bold text-slate-500">—</span>
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ================= 4. PRINTABLE 4-VIEW TRUCK BODY SCHEMATIC ================= */}
        <div className="mb-2">
          <Truck4ViewPrintableSchematic
            damages={record.damages}
            isBlankForm={isBlankForm}
          />
        </div>

        {/* ================= 5. AFFIDAVIT TEXT SECTION ================= */}
        <div className="border border-slate-900 rounded-lg p-2 mb-2 bg-white">
          <p className="text-justify text-[9.5px] leading-relaxed text-slate-900 font-medium">
            اینجانب{' '}
            <strong className="font-black text-slate-950 underline px-1">
              {isBlankForm ? '........................................................' : `${record.driverName} ${record.driverLastName}`}
            </strong>{' '}
            فرزند{' '}
            <strong className="font-black text-slate-950 underline px-1">
              {isBlankForm ? '........................' : (record.driverFatherName || '........................')}
            </strong>{' '}
            به شماره ملی{' '}
            <strong className="font-mono font-black text-slate-950 underline px-1">
              {isBlankForm ? '........................' : (toFaDigits(record.driverNationalId) || '........................')}
            </strong>{' '}
            طبق مندرجات چک‌لیست و شماتیک ۴ وجه فوق، خودروی مذکور را با کلیه متعلقات سالم تحویل گرفتم و از تاریخ{' '}
            <strong className="font-mono font-black text-slate-950 underline px-1">
              {isBlankForm ? '.... / .... / ....' : toFaDigits(record.date)}
            </strong>{' '}
            مسئولیت حفظ، نگهداری فنی، بدنه، عواقب جانبی، خلافی و جرایم رانندگی خودروی موصوف تماماً به عهده اینجانب می‌باشد.
          </p>
        </div>

        {/* ================= 6. SIGNATURES SECTION ================= */}
        <div className="border border-slate-900 rounded-lg p-2.5 grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-900 bg-slate-50/50">
          <div className="flex flex-col items-center justify-between min-h-[50px] border-l border-slate-300 pl-3">
            <div>
              نماینده تحویل‌دهنده (شرکت ترابری و لجستیک صداقت بار پیشرو):{' '}
              <span className="font-normal">{record.delivererName || 'مسئول اعزام و ترابری'}</span>
            </div>
            <div className="text-[9px] text-slate-600 font-normal">امضا و مهر رسمی شرکت:</div>
          </div>

          <div className="flex flex-col items-center justify-between min-h-[50px] pr-3">
            <div>
              تحویل‌گیرنده (راننده کامیونت):{' '}
              <span className="font-normal">
                {isBlankForm ? '............................................' : (record.receiverName || `${record.driverName} ${record.driverLastName}`)}
              </span>
            </div>
            <div className="text-[9px] text-slate-600 font-normal">امضا و اثر انگشت:</div>
          </div>
        </div>
      </div>
    </div>
  );
};
