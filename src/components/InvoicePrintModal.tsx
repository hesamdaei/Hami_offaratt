import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { InvoiceDetails, OrderItem } from '../utils/ordersData';
import { toFaDigits } from '../utils/jalaali';
import {
  Receipt,
  Printer,
  X,
  Building2,
} from 'lucide-react';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';

interface InvoicePrintModalProps {
  order: OrderItem;
  invoice: InvoiceDetails;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const InvoicePrintModal: FC<InvoicePrintModalProps> = ({
  order,
  invoice,
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'صورتحساب رسمی',
    subText: getStoredPrintSettings().subText || 'OFFICIAL INVOICE',
  }));

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '۰';
    return toFaDigits(val.toLocaleString('fa-IR'));
  };

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Receipt className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              صورتحساب و فاکتور رسمی خدمات لجستیک (شماره: {toFaDigits(invoice.invoiceNumber)})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فاکتور (لیزری)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Laser Print & Customizable Watermark Toolbar */}
        <LaserPrintControlToolbar
          settings={printSettings}
          onChange={setPrintSettings}
          onPrint={handlePrint}
          title="فاکتور رسمی خدمات باربری"
          onShowToast={onShowToast}
        />

        {/* Printable Invoice Sheet (Laser-Printer Optimized: Zero Graphic Backgrounds, High-Contrast Black & White) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className="w-full max-w-[210mm] bg-white text-black rounded-xl p-6 sm:p-8 border border-black shadow-md print:border-none print:shadow-none print:p-0 text-xs leading-relaxed relative overflow-hidden font-['Vazirmatn',sans-serif] a4-single-page"
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

            {/* Document Content Layer */}
            <div className="relative z-10 space-y-4">
              {/* Header: Clean Monochrome Bordered Letterhead (Zero Dark Smudges) */}
              <div className="border-b-2 border-black pb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <Receipt className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      شرکت حمل و نقل و لجستیک حامی
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      صورتحساب رسمی فروش خدمات حمل کالا و جابجایی جاده‌ای
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono space-y-1 border border-black px-2.5 py-1.5 rounded bg-white">
                  <div className="text-xs font-black text-black">
                    شماره صورتحساب: <span className="underline">{toFaDigits(invoice.invoiceNumber)}</span>
                  </div>
                  <div className="text-[11px] text-black">
                    تاریخ صدور: {toFaDigits(invoice.issueDate)}
                  </div>
                  {invoice.dueDate && (
                    <div className="text-[11px] text-black font-bold">
                      سررسید پرداخت: {toFaDigits(invoice.dueDate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Seller & Buyer Details (Laser-Friendly 1px Black Outlines, White Background) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Seller */}
                <div className="border border-black bg-white">
                  <div className="laser-hatch-header px-3 py-1.5 text-xs font-black text-black flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-black" />
                    <span>مشخصات ارائه‌دهنده خدمت (فروشنده):</span>
                  </div>
                  <div className="p-3 space-y-1 text-[11px] text-black">
                    <div className="border-b border-dotted border-black pb-0.5"><strong>نام شخص حقوقی:</strong> شرکت لجستیک و حمل‌ونقل حامی</div>
                    <div className="border-b border-dotted border-black pb-0.5"><strong>شناسه ملی / کد اقتصادی:</strong> <span className="font-mono">{toFaDigits('۱۴۰۱۰۹۸۷۶۵۴')}</span></div>
                    <div className="border-b border-dotted border-black pb-0.5"><strong>تلفن پشتیبانی و مالی:</strong> <span className="font-mono">{toFaDigits('۰۲۱-۸۸۹۹۰۰۱۱')}</span></div>
                    <div><strong>نشانی:</strong> تهران، بزرگراه فتح، کیلومتر ۶، مجتمع ترابری حامی</div>
                  </div>
                </div>

                {/* Buyer / Customer */}
                <div className="border border-black bg-white">
                  <div className="laser-hatch-header px-3 py-1.5 text-xs font-black text-black flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-black" />
                    <span>مشخصات خریدار (طرف حساب):</span>
                  </div>
                  <div className="p-3 space-y-1 text-[11px] text-black">
                    <div className="border-b border-dotted border-black pb-0.5"><strong>مشتری / شرکت:</strong> {invoice.customerName} {order.customerCompany ? `(${order.customerCompany})` : ''}</div>
                    {invoice.customerEconomicCode && (
                      <div className="border-b border-dotted border-black pb-0.5"><strong>کد اقتصادی / شناسه ملی:</strong> <span className="font-mono">{toFaDigits(invoice.customerEconomicCode)}</span></div>
                    )}
                    <div className="border-b border-dotted border-black pb-0.5"><strong>شماره تماس:</strong> <span className="font-mono">{toFaDigits(invoice.customerPhone || order.customerPhone)}</span></div>
                    <div><strong>نشانی:</strong> {invoice.customerAddress || order.originAddress}</div>
                  </div>
                </div>
              </div>

              {/* Service Items Table (Pure White Background, Crisp Black Lines, Laser Hatch Header) */}
              <div className="border border-black overflow-hidden bg-white">
                <table className="w-full text-right border-collapse">
                  <thead className="laser-hatch-header bg-white text-black font-black border-b-2 border-black">
                    <tr>
                      <th className="p-2 text-center w-10 border-l border-black">ردیف</th>
                      <th className="p-2 border-l border-black">شرح خدمت لجستیک</th>
                      <th className="p-2 text-center border-l border-black">مسیر حمل</th>
                      <th className="p-2 text-center border-l border-black">تعداد / تناژ</th>
                      <th className="p-2 text-left">مبلغ (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    <tr className="border-b border-dotted border-black last:border-b-0">
                      <td className="p-2 text-center font-mono font-bold border-l border-black">۱</td>
                      <td className="p-2 font-medium border-l border-black">
                        کرایه پایه حمل محموله «{order.cargoDescription}» با {order.requestedVehicleType}
                      </td>
                      <td className="p-2 text-center font-mono border-l border-black">
                        {order.originCity} ← {order.destinationCity}
                      </td>
                      <td className="p-2 text-center font-mono font-bold border-l border-black">
                        {toFaDigits(order.cargoWeightTon)} تن
                      </td>
                      <td className="p-2 text-left font-mono font-bold">
                        {formatCurrency(invoice.baseFreightRial)}
                      </td>
                    </tr>

                    {(invoice.loadingUnloadingCostRial || 0) > 0 && (
                      <tr className="border-b border-dotted border-black last:border-b-0">
                        <td className="p-2 text-center font-mono border-l border-black">۲</td>
                        <td className="p-2 border-l border-black">خدمات بارگیری / تخلیه و کارگری ویژه</td>
                        <td className="p-2 text-center border-l border-black">-</td>
                        <td className="p-2 text-center font-mono border-l border-black">۱ سرویس</td>
                        <td className="p-2 text-left font-mono font-bold">
                          {formatCurrency(invoice.loadingUnloadingCostRial)}
                        </td>
                      </tr>
                    )}

                    {(invoice.insuranceFeeRial || 0) > 0 && (
                      <tr className="border-b border-dotted border-black last:border-b-0">
                        <td className="p-2 text-center font-mono border-l border-black">۳</td>
                        <td className="p-2 border-l border-black">حق بیمه و پوشش مسئولیت باربری</td>
                        <td className="p-2 text-center border-l border-black">-</td>
                        <td className="p-2 text-center font-mono border-l border-black">۱ فقره</td>
                        <td className="p-2 text-left font-mono font-bold">
                          {formatCurrency(invoice.insuranceFeeRial)}
                        </td>
                      </tr>
                    )}

                    {(invoice.stopoverCostRial || 0) > 0 && (
                      <tr className="border-b border-dotted border-black last:border-b-0">
                        <td className="p-2 text-center font-mono border-l border-black">۴</td>
                        <td className="p-2 border-l border-black">هزینه توقف و معطلی خودرو در مقصد</td>
                        <td className="p-2 text-center border-l border-black">-</td>
                        <td className="p-2 text-center font-mono border-l border-black">-</td>
                        <td className="p-2 text-left font-mono font-bold">
                          {formatCurrency(invoice.stopoverCostRial)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Calculation Box (Zero Gray Toner-Waste, Clean High-Contrast) */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 avoid-page-break">
                {/* Payment Status & Details */}
                <div className="flex-1 bg-white border border-black text-[11px] w-full">
                  <div className="laser-dot-header px-3 py-1.5 font-bold text-black flex items-center justify-between">
                    <span>وضعیت و شرایط پرداخت:</span>
                    <span className="font-black underline">
                      {invoice.paymentStatus === 'PAID'
                        ? 'تسویه شده کامل'
                        : invoice.paymentStatus === 'CREDIT_30_DAYS'
                        ? 'اعتباری ۳۰ روزه'
                        : 'در انتظار واریز'}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div>
                      روش تسویه:{' '}
                      <strong>
                        {invoice.paymentMethod === 'BANK_TRANSFER'
                          ? 'حواله پایا / ساتنا'
                          : invoice.paymentMethod === 'CHEQUE'
                          ? 'چک صیادی'
                          : 'نقدی / پوز'}
                      </strong>
                    </div>
                    {invoice.notes && <div><strong>یادداشت مالی:</strong> {invoice.notes}</div>}
                  </div>
                </div>

                {/* Summary Numbers */}
                <div className="w-full sm:w-72 bg-white border-2 border-black p-3 space-y-2 text-[11px]">
                  <div className="flex justify-between text-black border-b border-dotted border-black pb-1">
                    <span>جمع خدمات (ناخالص):</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(
                        (invoice.baseFreightRial || 0) +
                          (invoice.loadingUnloadingCostRial || 0) +
                          (invoice.insuranceFeeRial || 0) +
                          (invoice.stopoverCostRial || 0)
                      )}{' '}
                      ریال
                    </span>
                  </div>
                  {(invoice.discountRial || 0) > 0 && (
                    <div className="flex justify-between text-black font-bold border-b border-dotted border-black pb-1">
                      <span>تخفیف توافقی:</span>
                      <span className="font-mono">- {formatCurrency(invoice.discountRial)} ریال</span>
                    </div>
                  )}
                  <div className="flex justify-between text-black border-b border-dotted border-black pb-1">
                    <span>مالیات بر ارزش افزوده ({toFaDigits(invoice.taxPercent)}٪):</span>
                    <span className="font-mono font-bold">{formatCurrency(invoice.taxAmountRial)} ریال</span>
                  </div>
                  <div className="border-t-2 border-black pt-2 flex justify-between font-black text-sm text-black">
                    <span>مبلغ کل قابل پرداخت:</span>
                    <span className="font-mono underline">{formatCurrency(invoice.totalPayableRial)} ریال</span>
                  </div>
                </div>
              </div>

              {/* Official Signatures & Stamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-dashed border-black text-center text-[10px] text-black avoid-page-break">
                <div className="border border-black min-h-[70px] flex flex-col justify-between bg-white">
                  <span className="laser-dot-header py-1 font-bold">مهر و امضای امور مالی شرکت حامی</span>
                  <span className="pb-2 font-mono font-black">تأییدیه سیستم یکپارچه مالی و حسابداری</span>
                </div>
                <div className="border border-black min-h-[70px] flex flex-col justify-between bg-white">
                  <span className="laser-dot-header py-1 font-bold">مهر و امضای تأیید خریدار / حسابداری مشتری</span>
                  <span className="pb-2 text-black">...................................................</span>
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
