import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  Calculator,
  Truck,
} from 'lucide-react';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';

export interface QuotationDetails {
  quoteNumber: string;
  customerName?: string;
  customerPhone?: string;
  vehicleTypeName: string;
  serviceTypeName: string;
  originZone: string;
  destinationZone: string;
  durationHours: number;
  workersCount: number;
  baseFare: number;
  laborCost: number;
  extraHoursCost: number;
  heavyItemsCost: number;
  totalCost: number;
  depositRequired: number;
  notes?: string;
}

interface QuotationPrintModalProps {
  details: QuotationDetails;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const QuotationPrintModal: FC<QuotationPrintModalProps> = ({
  details,
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'پیش‌فاکتور رسمی استعلام',
    subText: getStoredPrintSettings().subText || 'PRICE QUOTATION ESTIMATE',
  }));

  const handlePrint = () => {
    window.print();
  };

  const todayStr = getTodayJalaali().fullFa;

  const formatCurrency = (val: number) => {
    return toFaDigits(val.toLocaleString('fa-IR')) + ' تومان';
  };

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Calculator className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              پیش‌فاکتور رسمی برآورد هزینه حمل و لجستیک (شماره: {toFaDigits(details.quoteNumber)})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ پیش‌فاکتور (لیزری)</span>
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
          title="پیش‌فاکتور برآورد هزینه"
          onShowToast={onShowToast}
        />

        {/* Printable Document Sheet (Zero Graphic Background, Crisp Black Lines) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className="w-full max-w-[210mm] bg-white text-black rounded-xl p-6 sm:p-8 border border-black shadow-md print:border-none print:shadow-none print:p-0 text-xs leading-relaxed relative overflow-hidden font-['Vazirmatn',sans-serif] a4-single-page"
            style={{ direction: 'rtl' }}
          >
            {/* Watermark */}
            <LaserPrintWatermark
              enabled={printSettings.enabled}
              text={printSettings.text}
              subText={printSettings.subText}
              opacity={printSettings.opacity}
              fontSizePt={printSettings.fontSizePt}
            />

            {/* Content */}
            <div className="relative z-10 space-y-4">
              {/* Letterhead */}
              <div className="border-b-2 border-black pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <Truck className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      سامانه حمل و نقل و لجستیک حامی بار
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      پیش‌فاکتور رسمی برآورد کرایه حمل، بارگیری و خدمات ویژه
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono text-[11px] space-y-0.5 text-black border border-black px-2.5 py-1.5 rounded bg-white">
                  <div><strong>شماره استعلام:</strong> {toFaDigits(details.quoteNumber)}</div>
                  <div><strong>تاریخ صدور:</strong> {toFaDigits(todayStr)}</div>
                  <div><strong>اعتبار پیش‌فاکتور:</strong> ۴۸ ساعت از زمان صدور</div>
                </div>
              </div>

              {/* Service & Route Details Grid */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black">
                  ۱. مشخصات مشتری و جزئیات مسیر و سرویس
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">مشتری / متقاضی:</span> {details.customerName || 'مشتری آزاد / شرکتی'}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">شماره تماس:</span> <span className="font-mono">{toFaDigits(details.customerPhone || '—')}</span></div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">نوع خودرو درخواستی:</span> {details.vehicleTypeName}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">نوع خدمات:</span> {details.serviceTypeName}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">مبدأ حرکت:</span> {details.originZone}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">مقصد تخلیه:</span> {details.destinationZone}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">مدت زمان پایه:</span> <span className="font-mono">{toFaDigits(details.durationHours)}</span> ساعت</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">تعداد کارگر بارچین:</span> <span className="font-mono">{toFaDigits(details.workersCount)}</span> نفر</div>
                </div>
              </div>

              {/* Itemized Cost Breakdown Table */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black">
                  ۲. جدول ریز هزینه‌ها و خدمات
                </div>
                <div className="p-3">
                  <table className="w-full border-collapse border border-black text-center text-[10px]">
                    <thead>
                      <tr className="laser-dot-header border-b border-black font-bold bg-white text-black">
                        <th className="border-l border-black p-1.5 w-8">ردیف</th>
                        <th className="border-l border-black p-1.5 text-right">شرح آیتم هزینه</th>
                        <th className="border-l border-black p-1.5">جزئیات / ضریب</th>
                        <th className="p-1.5 text-left w-36">مبلغ برآوردی</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dotted border-black">
                        <td className="border-l border-black p-1.5 font-mono">۱</td>
                        <td className="border-l border-black p-1.5 text-right font-bold">کرایه پایه خودرو و سوخت در محدوده مبدأ و مقصد</td>
                        <td className="border-l border-black p-1.5">{details.vehicleTypeName}</td>
                        <td className="p-1.5 text-left font-mono font-bold">{formatCurrency(details.baseFare)}</td>
                      </tr>
                      <tr className="border-b border-dotted border-black">
                        <td className="border-l border-black p-1.5 font-mono">۲</td>
                        <td className="border-l border-black p-1.5 text-right font-bold">دستمزد کادر بارگیری، تخلیه و حمل تخصصی</td>
                        <td className="border-l border-black p-1.5">{toFaDigits(details.workersCount)} نفر متخصص</td>
                        <td className="p-1.5 text-left font-mono font-bold">{formatCurrency(details.laborCost)}</td>
                      </tr>
                      {details.extraHoursCost > 0 && (
                        <tr className="border-b border-dotted border-black">
                          <td className="border-l border-black p-1.5 font-mono">۳</td>
                          <td className="border-l border-black p-1.5 text-right font-bold">هزینه ساعت اضافی مازاد بر سقف سرویس اولیه</td>
                          <td className="border-l border-black p-1.5">ساعات اضافی</td>
                          <td className="p-1.5 text-left font-mono font-bold">{formatCurrency(details.extraHoursCost)}</td>
                        </tr>
                      )}
                      {details.heavyItemsCost > 0 && (
                        <tr className="border-b border-dotted border-black">
                          <td className="border-l border-black p-1.5 font-mono">۴</td>
                          <td className="border-l border-black p-1.5 text-right font-bold">هزینه حمل اقلام سنگین و نامتعارف (گاوصندوق، پیانو، یخچال ساید)</td>
                          <td className="border-l border-black p-1.5">اقلام حساس</td>
                          <td className="p-1.5 text-left font-mono font-bold">{formatCurrency(details.heavyItemsCost)}</td>
                        </tr>
                      )}
                      <tr className="laser-hatch-header border-t-2 border-black font-black bg-white text-black">
                        <td colSpan={3} className="border-l border-black p-1.5 text-right font-bold">
                          جمع کل مبلغ برآوردی سرویس (بدون انعام اجباری):
                        </td>
                        <td className="p-1.5 text-left font-mono text-xs">{formatCurrency(details.totalCost)}</td>
                      </tr>
                      <tr className="border-t border-black bg-white text-black">
                        <td colSpan={3} className="border-l border-black p-1.5 text-right font-bold">
                          مبلغ بیعانه جهت رزرو قطعی اعزام ناوگان:
                        </td>
                        <td className="p-1.5 text-left font-mono text-xs font-black underline">{formatCurrency(details.depositRequired)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="border border-black bg-white text-[10px]">
                <div className="laser-dot-header px-2.5 py-1 font-bold">شرایط و قوانین رزرو سرویس:</div>
                <div className="p-2.5 space-y-1">
                  <p>• شروع ساعت کار از زمان رسیدن خودرو به آدرس مبدأ محاسبه می‌گردد.</p>
                  <p>• در صورت کنسلی سرویس کمتر از ۲ ساعت قبل از اعزام، مبلغ بیعانه به عنوان خسارت عدم اعزام منظور می‌گردد.</p>
                  <p>• بارگیری کلیه لوازم تحت پوشش بیمه باربری رسمی شرکت قرار دارد.</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="border-t-2 border-black pt-4 grid grid-cols-3 gap-6 text-center text-[11px] font-bold text-black mt-6 avoid-page-break">
                <div className="space-y-9">
                  <div>کارشناس برآورد و پاسخگویی</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-9">
                  <div>سرپرست پذیرش و رزرویشن</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-9">
                  <div>تأییدیه و پذیرش مشتری</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء مشتری</div>
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
