import { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { DriverDirectoryItem } from '../utils/fleetSeedData';
import { toFaDigits } from '../utils/jalaali';
import {
  IdCard,
  Printer,
  X,
  UserCheck,
  Building2,
} from 'lucide-react';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';

interface DriverCardPrintModalProps {
  driver: DriverDirectoryItem;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DriverCardPrintModal: FC<DriverCardPrintModalProps> = ({
  driver,
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'کارت شناسایی راننده',
    subText: getStoredPrintSettings().subText || 'OFFICIAL DRIVER ID',
  }));

  const handlePrint = () => {
    window.print();
  };

  const driverTypeLabel =
    driver.driverType === 'EMPLOYED'
      ? 'استخدامی رسمی شرکت'
      : driver.driverType === 'CONTRACTOR'
      ? 'پیمانکاری سازمانی'
      : 'راننده آزاد و همکار';

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header Toolbar */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-blue-400">
            <IdCard className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              کارت هویت و شناسنامه رسمی راننده: {driver.name} (کد: {toFaDigits(driver.code)})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ کارت رسمی</span>
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
          title="کارت شناسایی راننده"
          onShowToast={onShowToast}
        />

        {/* Printable Sheet (Laser-Printer Optimized: 100% White Paper, Zero Shadows, Zero Black Smudges) */}
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
              {/* Official Header */}
              <div className="border-b-2 border-black pb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <Building2 className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      شرکت حمل و نقل و لجستیک حامی بار
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      کارت شناسایی، هویت و صلاحیت تردد رانندگان ناوگان باری
                    </p>
                  </div>
                </div>

                <div className="text-left text-[11px] space-y-0.5 border border-black p-2 rounded bg-white">
                  <div>
                    <span className="font-bold">کد پرسنلی راننده: </span>
                    <strong className="font-mono text-xs">{toFaDigits(driver.code)}</strong>
                  </div>
                  <div>
                    <span className="font-bold">تاریخ صدور: </span>
                    <span className="font-mono">{toFaDigits('۱۴۰۴/۱۱/۰۱')}</span>
                  </div>
                  <div>
                    <span className="font-bold">اعتبار کارت: </span>
                    <span className="font-mono font-bold">{toFaDigits('۱۴۰۵/۱۲/۲۹')}</span>
                  </div>
                </div>
              </div>

              {/* Driver Primary Dossier Card (Dual Box: Badge Card + Details) */}
              <div className="border-2 border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black">
                  ۱. مشخصات هویتی، گواهینامه و صلاحیت حرفه‌ای راننده
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Driver Photo & Stamp */}
                  <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-l border-dotted border-black pb-3 md:pb-0 md:pl-4 space-y-2">
                    <div className="w-32 h-40 border-2 border-black rounded-md overflow-hidden bg-white flex items-center justify-center relative">
                      {driver.documents?.avatarPhoto ? (
                        <img
                          src={driver.documents.avatarPhoto}
                          alt={driver.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-white text-black font-black text-2xl">
                          <UserCheck className="w-12 h-12 text-black mb-1" />
                          <span>{driver.name.slice(0, 1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center font-bold text-xs text-black">
                      {driver.name}
                    </div>
                    <div className="text-[10px] text-black border border-black px-2 py-0.5 rounded font-mono">
                      کد: {toFaDigits(driver.code)}
                    </div>
                  </div>

                  {/* Driver Identity Details */}
                  <div className="md:col-span-2 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">نام و نام خانوادگی:</span>
                        <strong className="block px-2 py-1 text-black text-sm">{driver.name}</strong>
                      </div>

                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">کد ملی:</span>
                        <strong className="block px-2 py-1 font-mono text-black text-sm">{toFaDigits(driver.nationalCode)}</strong>
                      </div>

                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">شماره تماس مستقیم:</span>
                        <strong className="block px-2 py-1 font-mono text-black text-sm" style={{ direction: 'ltr' }}>
                          {toFaDigits(driver.phone)}
                        </strong>
                      </div>

                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">نوع قرارداد و همکاری:</span>
                        <span className="block px-2 py-1 text-black font-bold">{driverTypeLabel}</span>
                      </div>

                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">پایه گواهینامه رانندگی:</span>
                        <strong className="block px-2 py-1 font-mono text-black">
                          پایه یک ({toFaDigits(driver.licenseNumber || 'معتبر')})
                        </strong>
                      </div>

                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">کارت هوشمند راننده:</span>
                        <span className="block px-2 py-1 text-black font-bold">سازمان راهداری (فعال و مجاز)</span>
                      </div>

                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">تاییدیه طب کار و سلامت:</span>
                        <span className="block px-2 py-1 text-black font-bold">دارای گواهی عدم اعتیاد و سلامت</span>
                      </div>

                      <div className="border border-black bg-white">
                        <span className="laser-dot-header font-bold block text-[10px] text-black px-2 py-0.5">امتیاز عملکرد و رتبه:</span>
                        <strong className="block px-2 py-1 font-mono text-black">{toFaDigits(driver.rating)} از ۵.۰</strong>
                      </div>
                    </div>

                    {/* Assigned Fleet & Trips */}
                    <div className="border border-black p-2 bg-white flex items-center justify-between">
                      <div>
                        <span className="font-bold block text-[10px] text-black">ناوگان اختصاصی تحت اختیار:</span>
                        <span className="font-bold text-black">
                          {driver.assignedVehicles.length > 0
                            ? driver.assignedVehicles.join('، ')
                            : 'فاقد خودروی اختصاصی دائمی (آماده اعزام با ناوگان عمومی شرکت)'}
                        </span>
                      </div>
                      <div className="text-left font-mono font-bold text-xs">
                        {toFaDigits(driver.totalTrips)} سفر موفقیت‌آمیز
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact & Financial Details */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1 text-xs font-black">
                  ۲. مشخصات بانکی و اطلاعات تماس اضطراری
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="border-b sm:border-b-0 sm:border-l border-dotted border-black pb-2 sm:pb-0 sm:pl-3">
                    <span className="font-bold block text-[10px] text-black">شماره شبا جهت واریز کرایه و مطالبات:</span>
                    <span className="font-mono font-bold text-black" style={{ direction: 'ltr' }}>
                      {driver.sheba || 'IR000000000000000000000000'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-black">تماس و فرد پاسخگو در شرایط اضطراری:</span>
                    <span className="font-bold text-black">
                      {driver.emergencyName || 'ثبت شده در پرونده پرسنلی'} -{' '}
                      <span className="font-mono" style={{ direction: 'ltr' }}>
                        {toFaDigits(driver.emergencyPhone || driver.phone)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal Notes & Signatures */}
              <div className="border-t-2 border-black pt-3 text-[10px] leading-relaxed space-y-3 avoid-page-break">
                <div className="space-y-1">
                  <div className="font-bold text-black">قوانین و ضوابط تردد:</div>
                  <p className="text-black">
                    ۱. این کارت صرفاً متعلق به دارنده آن بوده و انتقال آن به غیر تخلف سازمانی و قانونی محسوب می‌گردد.
                  </p>
                  <p className="text-black">
                    ۲. راننده محترم موظف است در تمامی مأموریت‌های باربری بین‌شهری و درون‌شهری اصل مدارک هویتی، گواهینامه و کارت هوشمند را همراه داشته باشد.
                  </p>
                  <p className="text-black">
                    ۳. در صورت مفقودی کارت، مراتب فوراً به واحد منابع انسانی و دیسپاچینگ حامی بار اطلاع داده شود.
                  </p>
                </div>

                {/* Signatures & Barcode */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-dashed border-black text-center text-xs">
                  <div className="border border-black h-22 flex flex-col justify-between">
                    <span className="laser-dot-header py-1 font-bold text-black">امضاء دارنده کارت (راننده)</span>
                    <span className="pb-1.5 text-[10px] text-black">تاریخ و امضاء</span>
                  </div>

                  <div className="border border-black h-22 flex flex-col justify-between">
                    <span className="laser-dot-header py-1 font-bold text-black">واحد ناوگان و عملیات ترابری</span>
                    <span className="pb-1.5 text-[10px] text-black">مهر و امضاء رسمی</span>
                  </div>

                  <div className="border border-black h-22 flex flex-col items-center justify-between">
                    <span className="laser-dot-header w-full py-1 font-bold text-black">بارکد هویت سامانه</span>
                    <div className="font-mono text-[9px] tracking-widest text-black">
                      ||| |||| || ||||| ||| ||
                    </div>
                    <span className="pb-1 font-mono text-[10px] text-black">
                      {toFaDigits(driver.nationalCode)}
                    </span>
                  </div>
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
