import { FC } from 'react';
import { Printer, X, Download, ShieldCheck, Check } from 'lucide-react';
import {
  VehicleHandoverRecord,
  HANDOVER_CHECKLIST_ITEMS,
} from '../types/vehicleHandover';
import { toFaDigits } from '../utils/jalaali';
import { IranianPlate } from './IranianPlate';

interface VehicleHandoverA4PrintModalProps {
  record: VehicleHandoverRecord;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VehicleHandoverA4PrintModal: FC<VehicleHandoverA4PrintModalProps> = ({
  record,
  onClose,
  onShowToast,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Divide the 66 items into 3 columns of 22 items
  const col1Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 1);
  const col2Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 2);
  const col3Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 3);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="no-print sticky top-2 z-30 w-full max-w-4xl bg-[#0f192e] border border-[#22365e] rounded-2xl p-3 mb-3 shadow-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">
            پیش‌نمایش فرم استاندارد A4 تحویل خودرو
          </span>
          <span className="text-slate-400 font-mono">
            (قبض شماره: {toFaDigits(record.receiptNumber)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black shadow-lg shadow-blue-900/40 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ برگه A4</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div
        id="handover-a4-sheet"
        dir="rtl"
        className="a4-print-sheet bg-white text-slate-900 p-6 rounded-sm shadow-2xl w-full max-w-[210mm] min-h-[297mm] mx-auto text-[11px] font-sans leading-tight border border-slate-300 print:border-none print:shadow-none print:m-0 print:p-6"
        style={{ boxSizing: 'border-box' }}
      >
        {/* ================= HEADER SECTION ================= */}
        <div className="border border-slate-900 rounded-lg p-3 mb-2 flex items-center justify-between">
          {/* Right Logo / Brand */}
          <div className="w-1/3 flex flex-col items-start justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-base">
                ح
              </div>
              <div>
                <div className="font-black text-slate-900 text-sm tracking-tight">
                  ترابری و لجستیک حامی
                </div>
                <div className="text-[9px] text-slate-600 font-mono">
                  تلفن تماس: ۱۷۸۶
                </div>
              </div>
            </div>
          </div>

          {/* Center Title & Date/Time */}
          <div className="w-1/3 text-center border-x border-slate-300 px-2">
            <div className="inline-block px-4 py-1 border border-slate-900 rounded font-black text-base text-slate-950 mb-1 bg-slate-50">
              تحویل خودرو
            </div>
            <div className="text-[10px] text-slate-700 font-bold flex items-center justify-center gap-3">
              <span>تاریخ: <strong className="font-mono">{toFaDigits(record.date)}</strong></span>
              <span>ساعت: <strong className="font-mono">{toFaDigits(record.time)}</strong></span>
            </div>
          </div>

          {/* Left Receipt & Address */}
          <div className="w-1/3 text-left space-y-1 font-mono text-[10.5px]">
            <div className="text-right">
              <span className="font-bold text-slate-800">شماره قبض: </span>
              <span className="font-black text-slate-950 text-xs">{toFaDigits(record.receiptNumber)}</span>
            </div>
            <div className="text-right text-[10px] text-slate-600 truncate">
              <span className="font-bold">آدرس: </span>
              <span>{record.address || 'پایانه مرکزی ناوگان حامی'}</span>
            </div>
          </div>
        </div>

        {/* ================= DRIVER & VEHICLE INFO SECTION ================= */}
        <div className="border border-slate-900 rounded-lg p-2.5 mb-2 relative">
          <div className="grid grid-cols-4 gap-2 text-slate-900 text-[11px] mb-2 pb-2 border-b border-slate-200">
            <div>
              <span className="text-slate-600 font-medium">نام راننده: </span>
              <strong className="font-bold text-slate-950">{record.driverName}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">نام خانوادگی: </span>
              <strong className="font-bold text-slate-950">{record.driverLastName}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">نام پدر: </span>
              <strong className="font-bold text-slate-950">{record.driverFatherName || '---'}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">کد ملی: </span>
              <strong className="font-mono font-bold text-slate-950">{toFaDigits(record.driverNationalId) || '---'}</strong>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 items-center text-[11px]">
            <div>
              <span className="text-slate-600 font-medium">نوع وسیله: </span>
              <strong className="font-bold text-slate-950">{record.vehicleType || 'کامیونت'}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">کد وسیله: </span>
              <strong className="font-mono font-bold text-slate-950">{toFaDigits(record.vehicleCode) || '---'}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">رنگ: </span>
              <strong className="font-bold text-slate-950">{record.vehicleColor || 'سفید'}</strong>
            </div>
            <div className="flex items-center justify-end">
              {record.vehiclePlate ? (
                <div className="scale-85 origin-left inline-block">
                  <IranianPlate plateNumber={record.vehiclePlate} size="sm" />
                </div>
              ) : (
                <span className="text-slate-400 font-mono">بدون پلاک</span>
              )}
            </div>
          </div>
        </div>

        {/* ================= 3-COLUMN 66-ITEM CHECKLIST TABLE ================= */}
        <div className="border border-slate-900 rounded-lg overflow-hidden mb-2">
          <table className="w-full border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 font-black text-center">
                {/* Column 1 Headers */}
                <th className="py-1 px-1 border-l border-slate-400 text-right w-[15%]">شرح</th>
                <th className="py-1 px-1 border-l border-slate-400 w-[5%]">سالم</th>
                <th className="py-1 px-1 border-l border-slate-400 w-[7%]">خسارتی</th>
                <th className="py-1 px-1 border-l-2 border-slate-900 w-[6%]">ندارد</th>

                {/* Column 2 Headers */}
                <th className="py-1 px-1 border-l border-slate-400 text-right w-[15%]">شرح</th>
                <th className="py-1 px-1 border-l border-slate-400 w-[5%]">سالم</th>
                <th className="py-1 px-1 border-l border-slate-400 w-[7%]">خسارتی</th>
                <th className="py-1 px-1 border-l-2 border-slate-900 w-[6%]">ندارد</th>

                {/* Column 3 Headers */}
                <th className="py-1 px-1 border-l border-slate-400 text-right w-[16%]">شرح</th>
                <th className="py-1 px-1 border-l border-slate-400 w-[5%]">سالم</th>
                <th className="py-1 px-1 border-l border-slate-400 w-[7%]">خسارتی</th>
                <th className="py-1 px-1 w-[6%]">ندارد</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 22 }).map((_, rowIdx) => {
                const item1 = col1Items[rowIdx];
                const item2 = col2Items[rowIdx];
                const item3 = col3Items[rowIdx];

                const st1 = item1 ? record.checklist[item1.id] || 'HEALTHY' : 'HEALTHY';
                const st2 = item2 ? record.checklist[item2.id] || 'HEALTHY' : 'HEALTHY';
                const st3 = item3 ? record.checklist[item3.id] || 'HEALTHY' : 'HEALTHY';

                const isEven = rowIdx % 2 === 0;

                return (
                  <tr
                    key={rowIdx}
                    className={`border-b border-slate-300 text-center ${
                      isEven ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {/* Item 1 */}
                    <td className="py-0.8 px-1 text-right font-medium text-slate-900 border-l border-slate-300 truncate">
                      {item1 ? item1.label : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l border-slate-300">
                      {st1 === 'HEALTHY' ? <span className="font-black text-slate-900">✓</span> : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l border-slate-300">
                      {st1 === 'DAMAGED' ? <span className="font-black text-slate-900">✗</span> : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l-2 border-slate-900">
                      {st1 === 'NONE' ? <span className="font-bold text-slate-900">—</span> : ''}
                    </td>

                    {/* Item 2 */}
                    <td className="py-0.8 px-1 text-right font-medium text-slate-900 border-l border-slate-300 truncate">
                      {item2 ? item2.label : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l border-slate-300">
                      {st2 === 'HEALTHY' ? <span className="font-black text-slate-900">✓</span> : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l border-slate-300">
                      {st2 === 'DAMAGED' ? <span className="font-black text-slate-900">✗</span> : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l-2 border-slate-900">
                      {st2 === 'NONE' ? <span className="font-bold text-slate-900">—</span> : ''}
                    </td>

                    {/* Item 3 */}
                    <td className="py-0.8 px-1 text-right font-medium text-slate-900 border-l border-slate-300 truncate">
                      {item3 ? item3.label : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l border-slate-300">
                      {st3 === 'HEALTHY' ? <span className="font-black text-slate-900">✓</span> : ''}
                    </td>
                    <td className="py-0.8 px-1 border-l border-slate-300">
                      {st3 === 'DAMAGED' ? <span className="font-black text-slate-900">✗</span> : ''}
                    </td>
                    <td className="py-0.8 px-1">
                      {st3 === 'NONE' ? <span className="font-bold text-slate-900">—</span> : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ================= 4-VIEW BODY DAMAGES SUMMARY SECTION ================= */}
        <div className="border border-slate-900 rounded-lg p-2.5 mb-2 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
            <span className="font-black text-slate-900 text-[10.5px]">
              وضعیت بدنه و آسیب‌های مشهود در ۴ وجه کامیونت (جلو، عقب، راست، چپ):
            </span>
            <span className="text-[10px] text-slate-600 font-mono">
              تعداد موارد آسیب: <strong>{toFaDigits(record.damages.length)}</strong>
            </span>
          </div>

          {record.damages.length === 0 ? (
            <div className="text-center py-1 text-slate-500 text-[10px] font-bold">
              بدنه خودرو در هر ۴ وجه فاقد هرگونه خط و خش، قِری، شکستگی و تصادف قبلی رویت گردید (کاملاً سالم).
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9.5px]">
              {record.damages.map((dmg, idx) => (
                <div
                  key={dmg.id}
                  className="bg-white border border-slate-300 p-1.5 rounded flex items-start gap-1"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-900 text-white font-mono text-[9px] flex items-center justify-center shrink-0">
                    {toFaDigits(idx + 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {dmg.partName || (dmg.view === 'FRONT' ? 'جلو' : dmg.view === 'REAR' ? 'عقب' : dmg.view === 'RIGHT' ? 'راست' : 'چپ')}
                    </div>
                    <div className="text-slate-600 text-[8.5px]">
                      {dmg.damageType === 'SCRATCH'
                        ? 'خط و خش'
                        : dmg.damageType === 'DENT'
                        ? 'قِری و فرورفتگی'
                        : dmg.damageType === 'CRACK'
                        ? 'شکستگی'
                        : dmg.damageType === 'PAINT_CHIP'
                        ? 'رنگ‌پریدگی'
                        : 'آسیب بدنه'}
                      {dmg.description ? ` (${dmg.description})` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= AFFIDAVIT TEXT SECTION ================= */}
        <div className="border border-slate-900 rounded-lg p-2.5 mb-3 bg-white">
          <p className="text-justify text-[10.5px] leading-relaxed text-slate-900 font-medium">
            اینجانب <strong className="font-black text-slate-950 underline px-1">{record.driverName} {record.driverLastName}</strong> فرزند <strong className="font-black text-slate-950 underline px-1">{record.driverFatherName || '................'}</strong> به شماره ملی <strong className="font-mono font-black text-slate-950 underline px-1">{toFaDigits(record.driverNationalId) || '................'}</strong> طبق مندرجات جدول بالا ماشین فوق را رویت و تحویل گرفتم و از تاریخ <strong className="font-mono font-black text-slate-950 underline px-1">{toFaDigits(record.date)}</strong> مسئولیت نگهداری و عواقب جانبی و خلافی خودروی مذکور به عهده اینجانب می‌باشد.
          </p>
        </div>

        {/* ================= SIGNATURES SECTION ================= */}
        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-900 pt-2 border-t-2 border-slate-900">
          <div className="flex flex-col items-center justify-between min-h-[60px]">
            <div>تحویل دهنده: <span className="font-normal">{record.delivererName || 'مسئول ناوگان ترابری'}</span></div>
            <div className="text-[10px] text-slate-500 font-normal">امضا و اثر انگشت:</div>
          </div>

          <div className="flex flex-col items-center justify-between min-h-[60px]">
            <div>تحویل گیرنده: <span className="font-normal">{record.receiverName || `${record.driverName} ${record.driverLastName}`}</span></div>
            <div className="text-[10px] text-slate-500 font-normal">امضا و اثر انگشت:</div>
          </div>
        </div>
      </div>
    </div>
  );
};
