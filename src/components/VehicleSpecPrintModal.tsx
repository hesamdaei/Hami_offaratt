import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  Truck,
} from 'lucide-react';
import { VehicleItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { checkVehicleInsurance } from '../utils/insuranceAlerts';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';
import { IranianPlate } from './IranianPlate';
import { getStoredServiceRules } from '../utils/maintenanceStandardsConfig';

interface VehicleSpecPrintModalProps {
  vehicle: VehicleItem;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VehicleSpecPrintModal: FC<VehicleSpecPrintModalProps> = ({
  vehicle,
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'شناسنامه فنی خودرو',
    subText: getStoredPrintSettings().subText || 'TECHNICAL VEHICLE DOSSIER',
  }));

  const handlePrint = () => {
    window.print();
  };

  const todayStr = getTodayJalaali().fullFa;
  const insuranceAlert = checkVehicleInsurance(vehicle);
  const typeLabel = VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.model;

  // Safe mileage calculations with full fallback support based on configured fleet standards
  const currentMileage = (vehicle as any).currentKm ?? vehicle.currentMileage ?? 0;
  const lastServiceMileage =
    (vehicle as any).lastServiceKm ??
    (vehicle as any).lastOilChangeKm ??
    vehicle.lastChangeMileage ??
    Math.max(0, currentMileage - 4200);

  const storedRules = getStoredServiceRules();
  const vRule = storedRules[vehicle.vehicleType] || storedRules.HYUNDAI || { maxMileage: 5000 };
  const ceilingKm = vRule.maxMileage || 5000;
  const nextServiceMileage = (vehicle as any).nextServiceKm ?? (lastServiceMileage + ceilingKm);
  const modelYear = vehicle.modelYear || (vehicle as any).year || 1398;
  const capacityText = vehicle.capacityTons
    ? `${toFaDigits(vehicle.capacityTons)} تن`
    : (vehicle as any).capacityKg
    ? `${toFaDigits((vehicle as any).capacityKg)} کیلوگرم`
    : '۵ تن';

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Truck className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              شناسنامه فنی و پرونده مشخصات خودرو کد {toFaDigits(vehicle.code)} ({vehicle.model})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ شناسنامه (لیزری)</span>
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
          title={`شناسنامه خودرو کد ${vehicle.code}`}
          onShowToast={onShowToast}
        />

        {/* Printable Document */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className="w-full max-w-[210mm] bg-white text-black rounded-xl p-6 sm:p-8 border border-black shadow-md print:border-none print:shadow-none print:p-0 text-xs leading-relaxed relative overflow-hidden font-['Vazirmatn',sans-serif] a4-single-page"
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

            {/* Document Content */}
            <div className="relative z-10 space-y-4">
              {/* Letterhead */}
              <div className="border-b-2 border-black pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <Truck className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      سامانه مدیریت فنی ناوگان و ترابری
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      شناسنامه فنی، وضعیت بیمه‌نامه‌ها و کارنامه سرویس دوره‌ای
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono text-[11px] space-y-0.5 text-black border border-black px-2.5 py-1.5 rounded bg-white">
                  <div><strong>تاریخ استعلام:</strong> {toFaDigits(todayStr)}</div>
                  <div><strong>کد اختصاصی:</strong> {toFaDigits(vehicle.code)}</div>
                  <div><strong>وضعیت عملیاتی:</strong> {(vehicle as any).status === 'INACTIVE' ? 'متوقف / تعمیرات' : 'فعال در خط'}</div>
                </div>
              </div>

              {/* Vehicle Specifications Grid */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black flex justify-between items-center">
                  <span>۱. مشخصات فنی، اسنادی و هویتی خودرو</span>
                  <div className="flex items-center gap-2 bg-white px-2 py-0.5 border border-black rounded">
                    <span className="text-[10px] font-bold text-black">پلاک انتظامی:</span>
                    <IranianPlate plateNumber={vehicle.plateNumber} size="sm" showScrew={false} />
                  </div>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">مدل و تیپ:</span> {vehicle.model}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">دسته کاربری:</span> {typeLabel}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">سال ساخت:</span> <span className="font-mono">{toFaDigits(modelYear)}</span></div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">شماره شاسی:</span> <span className="font-mono">{vehicle.vin ? toFaDigits(vehicle.vin) : 'ثبت در کارت سبز'}</span></div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">شماره موتور:</span> <span className="font-mono">{vehicle.engineNumber ? toFaDigits(vehicle.engineNumber) : 'مطابق سند'}</span></div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">ظرفیت بارگیری:</span> {capacityText}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">کیلومتر کارکرد فعلی:</span> <span className="font-mono">{toFaDigits(currentMileage.toLocaleString('fa-IR'))}</span> کیلومتر</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">راننده سازمانی:</span> {vehicle.driverName || 'بدون راننده ثابت'}</div>
                  <div className="border-b border-dotted border-black pb-1"><span className="font-bold">تلفن همراه راننده:</span> <span className="font-mono">{toFaDigits(vehicle.driverPhone || (vehicle as any).phone || '—')}</span></div>
                </div>
              </div>

              {/* Insurance & Inspection Details Table */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black">
                  ۲. وضعیت قانونی پوشش‌های بیمه‌ای و معاینه فنی
                </div>
                <div className="p-3">
                  <table className="w-full border-collapse border border-black text-center text-[10px]">
                    <thead>
                      <tr className="laser-dot-header border-b border-black font-bold">
                        <th className="border-l border-black p-1.5 text-right">عنوان پوشش قانونی</th>
                        <th className="border-l border-black p-1.5">شماره بیمه‌نامه / گواهی</th>
                        <th className="border-l border-black p-1.5">شرکت بیمه‌گر</th>
                        <th className="border-l border-black p-1.5">تاریخ سررسید انقضاء</th>
                        <th className="border-l border-black p-1.5">روزهای باقیمانده</th>
                        <th className="p-1.5">وضعیت اعتبار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insuranceAlert.policies.map((d) => (
                        <tr key={d.type} className="border-b border-dotted border-black last:border-b-0">
                          <td className="border-l border-black p-1.5 text-right font-bold">{d.title}</td>
                          <td className="border-l border-black p-1.5 font-mono">
                            {d.type === 'thirdParty'
                              ? toFaDigits(vehicle.insuranceNumber || '—')
                              : d.type === 'inspection'
                              ? toFaDigits(vehicle.inspectionNumber || '—')
                              : '—'}
                          </td>
                          <td className="border-l border-black p-1.5">{vehicle.insuranceCompany || 'بیمه ایران'}</td>
                          <td className="border-l border-black p-1.5 font-mono font-bold">{toFaDigits(d.expiryDate)}</td>
                          <td className="border-l border-black p-1.5 font-mono">
                            {d.daysRemaining < 0
                              ? `منقضی (${toFaDigits(Math.abs(d.daysRemaining))} روز قبل)`
                              : `${toFaDigits(d.daysRemaining)} روز`}
                          </td>
                          <td className="p-1.5 font-bold">
                            {d.isExpired ? (
                              <span className="underline font-black">منقضی شده</span>
                            ) : d.isCritical ? (
                              <span className="font-black">بحرانی (فوری)</span>
                            ) : (
                              <span>معتبر</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lubricant / Oil Service Record */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black">
                  ۳. وضعیت سرویس روغن و نگهداری دوره‌ای (PM)
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-center">
                  <div className="border border-black">
                    <div className="laser-dot-header py-1 font-bold">آخرین تعویض روغن</div>
                    <div className="py-1.5 font-mono font-bold">{toFaDigits(lastServiceMileage.toLocaleString('fa-IR'))} km</div>
                  </div>
                  <div className="border border-black">
                    <div className="laser-dot-header py-1 font-bold">سرویس دوره بعدی</div>
                    <div className="py-1.5 font-mono font-bold">{toFaDigits(nextServiceMileage.toLocaleString('fa-IR'))} km</div>
                  </div>
                  <div className="border border-black">
                    <div className="laser-dot-header py-1 font-bold">کیلومتر کارکرد فعلی</div>
                    <div className="py-1.5 font-mono font-bold">{toFaDigits(currentMileage.toLocaleString('fa-IR'))} km</div>
                  </div>
                  <div className="border border-black font-bold">
                    <div className="laser-dot-header py-1">وضعیت سرویس</div>
                    <div className="py-1.5">{currentMileage >= nextServiceMileage ? 'نیاز فوری به تعویض' : 'عادی و در محدوده'}</div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="border-t-2 border-black pt-4 grid grid-cols-3 gap-6 text-center text-[11px] font-bold text-black mt-6 avoid-page-break">
                <div className="space-y-9">
                  <div>کارشناس فنی و نگهداری ناوگان</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-9">
                  <div>سرپرست ترابری و لجستیک</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-9">
                  <div>مهر رسمی واحد ایمنی و نقلیه</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">مهر شرکت</div>
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
