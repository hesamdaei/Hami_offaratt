import React, { FC, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { VehicleItem } from '../utils/fleetSeedData';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { checkVehicleInsurance } from '../utils/insuranceAlerts';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';
import { formatIranianPlateString } from './IranianPlate';

interface FleetInsuranceAlertsPrintModalProps {
  vehicles: VehicleItem[];
  filterMode?: 'ALL' | 'EXPIRED' | 'CRITICAL' | 'VALID';
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FleetInsuranceAlertsPrintModal: FC<FleetInsuranceAlertsPrintModalProps> = ({
  vehicles,
  filterMode = 'ALL',
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'گزارش رسمی بیمه‌نامه ناوگان',
    subText: getStoredPrintSettings().subText || 'FLEET INSURANCE AUDIT',
  }));

  const handlePrint = () => {
    window.print();
  };

  const todayStr = getTodayJalaali().fullFa;

  const analyzedVehicles = useMemo(() => {
    return vehicles.map((v) => ({
      vehicle: v,
      alert: checkVehicleInsurance(v),
    }));
  }, [vehicles]);

  const filteredItems = analyzedVehicles.filter(({ alert }) => {
    if (filterMode === 'EXPIRED') return alert.hasExpiredPolicy;
    if (filterMode === 'CRITICAL') return alert.hasCriticalExpiry && !alert.hasExpiredPolicy;
    if (filterMode === 'VALID') return !alert.hasCriticalExpiry && !alert.hasExpiredPolicy;
    return true;
  });

  const expiredCount = analyzedVehicles.filter((x) => x.alert.hasExpiredPolicy).length;
  const criticalCount = analyzedVehicles.filter(
    (x) => x.alert.hasCriticalExpiry && !x.alert.hasExpiredPolicy
  ).length;
  const validCount = analyzedVehicles.filter(
    (x) => !x.alert.hasCriticalExpiry && !x.alert.hasExpiredPolicy
  ).length;

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header (Screen Only) */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              گزارش رسمی پایش و سررسید بیمه‌نامه‌های ناوگان ترابری
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ گزارش (لیزری)</span>
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
          title="گزارش سررسید بیمه‌نامه و معاینه فنی"
          onShowToast={onShowToast}
        />

        {/* Printable Document Sheet (Zero Graphic Backgrounds, Laser High-Contrast) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className="w-full max-w-[210mm] bg-white text-black rounded-xl p-6 sm:p-8 border border-black shadow-md print:border-none print:shadow-none print:p-0 text-xs leading-relaxed relative overflow-hidden font-['Vazirmatn',sans-serif]"
            style={{ direction: 'rtl' }}
          >
            {/* Customizable Watermark */}
            <LaserPrintWatermark
              enabled={printSettings.enabled}
              text={printSettings.text}
              subText={printSettings.subText}
              opacity={printSettings.opacity}
              fontSizePt={printSettings.fontSizePt}
            />

            {/* Document Content Layer */}
            <div className="relative z-10 space-y-4">
              {/* Official Clean Monochrome Letterhead */}
              <div className="border-b-2 border-black pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <ShieldCheck className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      سامانه یکپارچه مدیریت ناوگان و ترابری
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      صورت وضعیت بازرسی و انقضای بیمه‌نامه‌ها (شخص ثالث، بدنه، معاینه فنی)
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono text-[11px] space-y-0.5 text-black border border-black px-2.5 py-1.5 rounded bg-white">
                  <div><strong>تاریخ تهیه گزارش:</strong> {toFaDigits(todayStr)}</div>
                  <div><strong>تعداد رکوردها:</strong> {toFaDigits(filteredItems.length)} خودرو</div>
                  <div><strong>شماره بازرسی:</strong> FLT-INS-{toFaDigits(todayStr.replace(/\//g, ''))}</div>
                </div>
              </div>

              {/* Statistical Summary Box with Laser Stipple Dotted Header */}
              <div className="grid grid-cols-4 border border-black text-center text-xs divide-x divide-x-reverse divide-black bg-white">
                <div className="bg-white text-black">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px] font-bold">کل خودروهای بررسی‌شده</div>
                  <div className="py-1.5 text-sm font-black font-mono">{toFaDigits(analyzedVehicles.length)}</div>
                </div>
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">منقضی شده (توقف اعزام)</div>
                  <div className="py-1.5 text-sm font-black font-mono underline">{toFaDigits(expiredCount)}</div>
                </div>
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">بحرانی (سررسید کمتر از ۷ روز)</div>
                  <div className="py-1.5 text-sm font-black font-mono underline">{toFaDigits(criticalCount)}</div>
                </div>
                <div className="bg-white text-black font-bold">
                  <div className="laser-dot-header py-1 px-1.5 text-[10px]">پوشش معتبر و جاری</div>
                  <div className="py-1.5 text-sm font-black font-mono">{toFaDigits(validCount)}</div>
                </div>
              </div>

              {/* Report Table: 100% Laser-Safe Crisp Black & White with Hatch Header */}
              <table className="w-full border-collapse border border-black text-right text-[11px]">
                <thead>
                  <tr className="laser-hatch-header border-b-2 border-black font-black text-center bg-white text-black">
                    <th className="border-l border-black p-1.5 w-8">ردیف</th>
                    <th className="border-l border-black p-1.5 w-14">کد خودرو</th>
                    <th className="border-l border-black p-1.5">نوع خودرو</th>
                    <th className="border-l border-black p-1.5">پلاک انتظامی</th>
                    <th className="border-l border-black p-1.5">راننده مسئول / تلفن</th>
                    <th className="border-l border-black p-1.5">بیمه شخص ثالث</th>
                    <th className="border-l border-black p-1.5">بیمه بدنه</th>
                    <th className="border-l border-black p-1.5">معاینه فنی</th>
                    <th className="p-1.5 w-24">وضعیت نهایی</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(({ vehicle, alert }, idx) => {
                    const tp = alert.policies.find((d) => d.type === 'thirdParty');
                    const bd = alert.policies.find((d) => d.type === 'body');
                    const ins = alert.policies.find((d) => d.type === 'inspection');

                    return (
                      <tr key={vehicle.id} className="border-b border-dotted border-black last:border-b-0">
                        <td className="border-l border-black p-1.5 text-center font-mono">{toFaDigits(idx + 1)}</td>
                        <td className="border-l border-black p-1.5 text-center font-mono font-bold">{toFaDigits(vehicle.code)}</td>
                        <td className="border-l border-black p-1.5 font-bold">{vehicle.model}</td>
                        <td className="border-l border-black p-1.5 text-center font-mono font-bold whitespace-nowrap">
                          {formatIranianPlateString(vehicle.plateNumber)}
                        </td>
                        <td className="border-l border-black p-1.5">
                          <div className="font-bold">{vehicle.driverName || 'بدون راننده'}</div>
                          <div className="font-mono text-[10px]">{toFaDigits(vehicle.driverPhone || '')}</div>
                        </td>
                        <td className="border-l border-black p-1.5">
                          {tp ? (
                            <div>
                              <div className="font-mono font-bold">{toFaDigits(tp.expiryDate)}</div>
                              <div className="text-[10px]">
                                {tp.daysRemaining < 0
                                  ? `منقضی (${toFaDigits(Math.abs(tp.daysRemaining))} روز قبل)`
                                  : `${toFaDigits(tp.daysRemaining)} روز باقیست`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px]">نامشخص</span>
                          )}
                        </td>
                        <td className="border-l border-black p-1.5">
                          {bd ? (
                            <div>
                              <div className="font-mono font-bold">{toFaDigits(bd.expiryDate)}</div>
                              <div className="text-[10px]">
                                {bd.daysRemaining < 0
                                  ? `منقضی (${toFaDigits(Math.abs(bd.daysRemaining))} روز قبل)`
                                  : `${toFaDigits(bd.daysRemaining)} روز باقیست`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px]">فاقد بیمه بدنه</span>
                          )}
                        </td>
                        <td className="border-l border-black p-1.5">
                          {ins ? (
                            <div>
                              <div className="font-mono font-bold">{toFaDigits(ins.expiryDate)}</div>
                              <div className="text-[10px]">
                                {ins.daysRemaining < 0
                                  ? `منقضی (${toFaDigits(Math.abs(ins.daysRemaining))} روز قبل)`
                                  : `${toFaDigits(ins.daysRemaining)} روز باقیست`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px]">نامشخص</span>
                          )}
                        </td>
                        <td className="p-1.5 text-center font-bold">
                          {alert.hasExpiredPolicy ? (
                            <span className="border border-black px-1.5 py-0.5 font-black underline">منقضی شده</span>
                          ) : alert.hasCriticalExpiry ? (
                            <span className="border border-dashed border-black px-1.5 py-0.5 font-bold">بحرانی (فوری)</span>
                          ) : (
                            <span className="font-mono">معتبر</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Directive / Notes Box */}
              <div className="border border-black bg-white text-[10px] avoid-page-break">
                <div className="laser-dot-header px-2.5 py-1 font-bold">دستورالعمل تردد ناوگان ترابری:</div>
                <div className="p-2.5 space-y-1">
                  <p>
                    ۱. هرگونه اعزام یا تردد خودروهای با وضعیت منقضی یا بدون بیمه‌نامه شخص ثالث معتبر اکیداً ممنوع بوده و مسئولیت کلیه خسارات احتمالی بر عهده سرپرست دیسپچ می‌باشد.
                  </p>
                  <p>
                    ۲. خودروهای در وضعیت بحرانی (کمتر از ۷ روز) موظفند ظرف حداکثر ۴۸ ساعت نسبت به تمدید و تسلیم بیمه‌نامه جدید اقدام نمایند.
                  </p>
                </div>
              </div>

              {/* Signatures & Approvals Footer (Crisp Black Lines) */}
              <div className="border-t-2 border-black pt-4 grid grid-cols-3 gap-6 text-center text-[11px] font-bold text-black mt-6 avoid-page-break">
                <div className="space-y-9">
                  <div>تنظیم‌کننده گزارش بازرسی ناوگان</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-9">
                  <div>سرپرست عملیات ترابری و اعزام</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-9">
                  <div>مدیریت ارشد لجستیک و ایمنی</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">مهر و امضاء رسمی</div>
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
