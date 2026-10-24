import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { OrderItem, WaybillDetails } from '../utils/ordersData';
import { toFaDigits } from '../utils/jalaali';
import {
  FileText,
  Printer,
  X,
  Truck,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';
import { formatIranianPlateString } from './IranianPlate';

interface WaybillPrintModalProps {
  order: OrderItem;
  waybill: WaybillDetails;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const WaybillPrintModal: FC<WaybillPrintModalProps> = ({
  order,
  waybill,
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'بارنامه رسمی کشور',
    subText: getStoredPrintSettings().subText || 'OFFICIAL WAYBILL',
  }));

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val?: number) => {
    if (!val) return '۰';
    return toFaDigits(val.toLocaleString('fa-IR'));
  };

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-amber-400">
            <FileText className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              بارنامه و حواله رسمی حمل جاده‌ای (شماره: {toFaDigits(waybill.waybillNumber)})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ بارنامه (لیزری)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Laser Print & Customizable Watermark Control Toolbar */}
        <LaserPrintControlToolbar
          settings={printSettings}
          onChange={setPrintSettings}
          onPrint={handlePrint}
          title="بارنامه الکترونیکی رسمی"
          onShowToast={onShowToast}
        />

        {/* Printable Waybill Sheet (Laser-Printer Optimized: Zero Graphic Backgrounds, High-Contrast Black & White) */}
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
              {/* Header / Logo / Ministry banner (Clean Black & White Outline) */}
              <div className="border-b-2 border-black pb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <Truck className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      سامانه حمل و نقل و لجستیک حامی بار
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      بارنامه رسمی و الکترونیکی حمل بار جاده‌ای سراسری کشور
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono space-y-1 border border-black px-2.5 py-1.5 rounded bg-white">
                  <div className="text-xs font-black text-black">
                    شماره بارنامه: <span className="underline">{toFaDigits(waybill.waybillNumber)}</span>
                  </div>
                  <div className="text-[11px] text-black">
                    تاریخ صدور: {toFaDigits(waybill.issueDate)}
                  </div>
                  <div className="text-[10px] text-black">
                    شماره سفارش مرجع: {toFaDigits(order.orderNumber)}
                  </div>
                </div>
              </div>

              {/* Sender & Receiver Box (Laser-Safe 1px Black Borders, Pure White) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sender */}
                <div className="border border-black bg-white">
                  <div className="laser-hatch-header px-3 py-1.5 text-xs font-black text-black flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-black" />
                    <span>مشخصات فرستنده / مبدأ بارگیری:</span>
                  </div>
                  <div className="p-3 space-y-1 text-[11px] text-black">
                    <div className="border-b border-dotted border-black pb-0.5"><strong>فرستنده:</strong> {waybill.senderName}</div>
                    {waybill.senderPhone && (
                      <div className="border-b border-dotted border-black pb-0.5"><strong>تلفن تماس:</strong> <span className="font-mono">{toFaDigits(waybill.senderPhone)}</span></div>
                    )}
                    <div className="border-b border-dotted border-black pb-0.5"><strong>شهر مبدأ:</strong> {order.originCity}</div>
                    <div><strong>نشانی دقیق مبدأ:</strong> {waybill.senderAddress}</div>
                  </div>
                </div>

                {/* Receiver */}
                <div className="border border-black bg-white">
                  <div className="laser-hatch-header px-3 py-1.5 text-xs font-black text-black flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-black" />
                    <span>مشخصات گیرنده / مقصد تخلیه:</span>
                  </div>
                  <div className="p-3 space-y-1 text-[11px] text-black">
                    <div className="border-b border-dotted border-black pb-0.5"><strong>گیرنده:</strong> {waybill.receiverName}</div>
                    {waybill.receiverPhone && (
                      <div className="border-b border-dotted border-black pb-0.5"><strong>تلفن تماس:</strong> <span className="font-mono">{toFaDigits(waybill.receiverPhone)}</span></div>
                    )}
                    <div className="border-b border-dotted border-black pb-0.5"><strong>شهر مقصد:</strong> {order.destinationCity}</div>
                    <div><strong>نشانی دقیق مقصد:</strong> {waybill.receiverAddress}</div>
                  </div>
                </div>
              </div>

              {/* Cargo & Shipment Specifications Table */}
              <div className="border border-black overflow-hidden bg-white">
                <div className="laser-hatch-header px-3 py-1.5 font-black text-xs text-black">
                  مشخصات محموله و بسته‌بندی
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-black text-[11px] text-black text-center">
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">شرح کالا</span>
                    <strong className="text-black">{waybill.cargoType}</strong>
                  </div>
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">وزن بار (تن)</span>
                    <strong className="text-black font-mono">{toFaDigits(waybill.cargoWeightTon)} تن</strong>
                  </div>
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">تعداد بسته‌ها</span>
                    <strong className="text-black font-mono">{toFaDigits(waybill.cargoPackageCount || '-')}</strong>
                  </div>
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">ارزش ریالی اظهارشده</span>
                    <strong className="text-black font-mono">{formatCurrency(waybill.declaredValueRial)} ریال</strong>
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle Specifications */}
              <div className="border border-black overflow-hidden bg-white">
                <div className="laser-hatch-header px-3 py-1.5 font-black text-xs text-black">
                  مشخصات ناوگان و راننده مجری حمل
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-black text-[11px] text-black text-center">
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">نام راننده</span>
                    <strong className="text-black">{waybill.driverName}</strong>
                  </div>
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">شماره پلاک خودرو</span>
                    <strong className="text-black font-mono">{formatIranianPlateString(waybill.vehiclePlate)}</strong>
                  </div>
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">نوع ناوگان / کد</span>
                    <strong className="text-black">
                      {order.requestedVehicleType} {waybill.vehicleCode ? `(کد ${toFaDigits(waybill.vehicleCode)})` : ''}
                    </strong>
                  </div>
                  <div className="p-2">
                    <span className="laser-dot-header block text-[10px] py-0.5 mb-1 font-bold">بیمه حمل و مسئولیت</span>
                    <strong className="text-black font-black inline-flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      تحت پوشش بیمه باربری
                    </strong>
                  </div>
                </div>
              </div>

              {/* Freight and Financial Box (Pure White, Crisp Black Outline) */}
              <div className="bg-white border-2 border-black p-3 flex flex-wrap items-center justify-between gap-3 text-black">
                <div>
                  <span className="text-xs font-bold block">مبلغ کل کرایه حمل مصوب:</span>
                  <span className="text-base sm:text-lg font-black font-mono underline">
                    {formatCurrency(waybill.shippingCostRial)} ریال
                  </span>
                </div>
                <div className="text-left text-[11px] space-y-0.5">
                  <div>
                    نحوه پرداخت:{' '}
                    <strong>
                      {order.paymentType === 'PREPAID'
                        ? 'پیش‌کرایه'
                        : order.paymentType === 'POSTPAID'
                        ? 'پس‌کرایه در مقصد'
                        : 'اعتباری شرکتی'}
                    </strong>
                  </div>
                  <div>وضعیت حمل: <strong>تخلیه کامل و تحویل شده</strong></div>
                </div>
              </div>

              {/* Notes */}
              {waybill.notes && (
                <div className="text-[11px] text-black bg-white border border-black p-2.5">
                  <strong>توضیحات و شرایط اختصاصی بارنامه:</strong> {waybill.notes}
                </div>
              )}

              {/* Signatures & Stamp Blocks */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t-2 border-dashed border-black text-center text-[10px] text-black avoid-page-break">
                <div className="border border-black min-h-[70px] flex flex-col justify-between bg-white">
                  <span className="laser-dot-header py-1 font-bold">مهر و امضای فرستنده بار</span>
                  <span className="pb-2 text-black">........................</span>
                </div>
                <div className="border border-black min-h-[70px] flex flex-col justify-between bg-white">
                  <span className="laser-dot-header py-1 font-bold">امضای راننده و مسئول حمل</span>
                  <span className="pb-2 text-black">........................</span>
                </div>
                <div className="border border-black min-h-[70px] flex flex-col justify-between bg-white">
                  <span className="laser-dot-header py-1 font-bold">مهر و امضای شرکت حامی بار</span>
                  <span className="pb-2 font-mono font-black">تأییدیه الکترونیکی صادر شد</span>
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
