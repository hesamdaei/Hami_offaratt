import React, { FC, useState } from 'react';
import {
  Truck,
  Phone,
  Calendar,
  Clock,
  Printer,
  Edit,
  Droplet,
  ShieldCheck,
  ShieldAlert,
  User,
  UserCheck,
  UserX,
  Search,
  ArrowLeftRight,
  X,
  Wrench,
  CheckCircle2,
  Gauge,
  Sparkles,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { VehicleItem, VEHICLE_TYPE_NAMES, DriverDirectoryItem } from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';
import { checkVehicleInsurance } from '../utils/insuranceAlerts';
import { VehicleSpecPrintModal } from './VehicleSpecPrintModal';
import { getStoredServiceRules, calculateMileageStatus } from '../utils/maintenanceStandardsConfig';

interface VehicleCardProps {
  vehicle: VehicleItem;
  availableDrivers?: DriverDirectoryItem[];
  onAssignDriver?: (vehicle: VehicleItem, driverName: string, driverPhone?: string) => void;
  onUnassignDriver?: (vehicle: VehicleItem) => void;
  onOpenSpecifications?: (vehicle: VehicleItem) => void;
  onOpenPrintModal?: (vehicle: VehicleItem) => void;
  onOpenEndOfWork?: (vehicle: VehicleItem) => void;
  onOpenStatusModal?: (vehicle: VehicleItem) => void;
  onOpenOilService?: (vehicle: VehicleItem) => void;
  onOpenUsage?: (vehicle: VehicleItem) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VehicleCard: FC<VehicleCardProps> = ({
  vehicle,
  availableDrivers = [],
  onAssignDriver,
  onUnassignDriver,
  onOpenSpecifications,
  onOpenPrintModal,
  onOpenEndOfWork,
  onOpenStatusModal,
  onOpenOilService,
  onOpenUsage,
  onShowToast,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');

  const alert = checkVehicleInsurance(vehicle);
  const typeLabel = VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.model;

  const isAssigned = vehicle.driverName && vehicle.driverName !== 'بدون راننده';
  const isReady = vehicle.status === 'ACTIVE';
  const isMission = vehicle.status === 'IN_MISSION';
  const isMaintenance = vehicle.status === 'IN_MAINTENANCE';
  const isParking = vehicle.status === 'PARKING';

  // Dynamic Oil service & Mileage calculation based on configurable fleet standards
  const currentKm = vehicle.currentKm || vehicle.currentMileage || 0;
  const lastOilKm = vehicle.lastOilChangeKm || vehicle.lastChangeMileage || 0;
  const storedRules = getStoredServiceRules();
  const vRule = storedRules[vehicle.vehicleType] || storedRules.HYUNDAI || { maxMileage: 5000, maxDays: 45, warningMileage: 500 };
  const ceilingKm = vRule.maxMileage || 5000;
  const warningKm = vRule.warningMileage || 500;
  const mileageStats = calculateMileageStatus(currentKm, lastOilKm, ceilingKm, warningKm, vehicle.lastChangeDate, vRule.maxDays);
  const { drivenKm, nextTargetKm, remainingKm, overdueKm, wearPercent, isOverdue, isInconsistent } = mileageStats;

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vehicle.driverPhone) return;
    navigator.clipboard.writeText(vehicle.driverPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
    onShowToast?.(`شماره تماس ${vehicle.driverName} در حافظه کپی شد.`, 'info');
  };

  const handlePrintClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenPrintModal) {
      onOpenPrintModal(vehicle);
    } else {
      setIsPrintModalOpen(true);
    }
  };

  return (
    <>
      <div className="vehicle-card-print bg-[#0b1325] hover:bg-[#0e172e] border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-colors flex flex-col justify-between group relative text-slate-100 print:bg-white print:border print:border-black print:text-black print:p-4">
        {/* Top Header: Code Badge, Model, Plate & Status */}
        <div>
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80 print:border-black">
            <div className="flex items-center gap-2.5">
              {/* Minimal Vehicle Code Badge */}
              <div className="w-11 h-11 rounded-lg bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-center font-mono text-amber-300 shrink-0 print:bg-white print:border print:border-black print:text-black">
                <span className="text-[8px] text-slate-400 font-sans leading-tight">کد</span>
                <span className="text-sm font-bold leading-none">{toFaDigits(vehicle.code)}</span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors print:text-black">
                    {typeLabel}
                  </h3>
                  {vehicle.modelYear && (
                    <span className="text-[10px] text-slate-400 font-mono print:text-black">
                      ({toFaDigits(vehicle.modelYear)})
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 print:text-black flex items-center gap-1">
                  <span>{vehicle.color || 'سفید'}</span>
                  {vehicle.chassisType && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span>{vehicle.chassisType}</span>
                    </>
                  )}
                  {vehicle.capacityTons && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-slate-300">
                        {toFaDigits(vehicle.capacityTons)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Iranian Plate & Minimal Status Pill */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <IranianPlate plateNumber={vehicle.plateNumber} size="sm" />
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md border print:bg-white print:text-black print:border-black flex items-center gap-1 ${
                  isReady
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isMission
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : isMaintenance
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isReady ? 'bg-emerald-400' : isMission ? 'bg-sky-400' : isMaintenance ? 'bg-amber-400' : 'bg-purple-400'
                }`} />
                <span>
                  {isReady && 'آماده بارگیری'}
                  {isMission && 'در مأموریت'}
                  {isMaintenance && 'تعمیرگاه'}
                  {isParking && 'پارکینگ'}
                </span>
              </span>
            </div>
          </div>

          {/* Details Section */}
          <div className="py-3 space-y-2.5 text-xs">
            {/* Driver Assignment Row */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 print:bg-white print:border-black space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 print:text-black">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isAssigned ? 'bg-sky-500/10 text-sky-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {isAssigned ? <UserCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 print:text-black truncate">
                      {isAssigned ? (
                        <span className="truncate">{vehicle.driverName}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">فاقد راننده</span>
                      )}
                    </div>
                    {vehicle.driverPhone ? (
                      <div
                        className="text-[10px] text-slate-400 font-mono mt-0.5 print:text-black flex items-center gap-1"
                        style={{ direction: 'ltr' }}
                      >
                        <span>{toFaDigits(vehicle.driverPhone)}</span>
                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer print:hidden"
                          title="کپی شماره تماس"
                        >
                          {copiedPhone ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        آماده تخصیص
                      </div>
                    )}
                  </div>
                </div>

                {/* Ready Time & Date */}
                <div className="text-left font-mono text-[10px] shrink-0 print:text-black">
                  <div className="text-emerald-400 font-medium flex items-center gap-1 justify-end print:text-black">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{toFaDigits(vehicle.readyTime || '۰۸:۰۰')}</span>
                  </div>
                  <div className="text-slate-500 print:text-black">
                    {toFaDigits(vehicle.readyDate || 'امروز')}
                  </div>
                </div>
              </div>

              {/* Action Strip for Driver Assignment (no-print) */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 print:hidden gap-1 text-[11px]">
                {isAssigned ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-[10px] flex items-center gap-1 transition cursor-pointer"
                      title="تعویض راننده خودرو"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5 text-sky-400" />
                      <span>تغییر راننده</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUnassignDriver ? onUnassignDriver(vehicle) : onAssignDriver?.(vehicle, 'بدون راننده', '')}
                      className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 text-[10px] flex items-center gap-1 transition cursor-pointer"
                      title="آزادسازی خودرو"
                    >
                      <UserX className="w-2.5 h-2.5 text-rose-400" />
                      <span>لغو انتساب</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="w-full py-1 px-2.5 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 hover:text-white border border-sky-500/30 font-medium text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <UserCheck className="w-3 h-3 text-sky-400" />
                    <span>+ تخصیص راننده</span>
                  </button>
                )}
              </div>
            </div>

            {/* Insurance & Inspection Minimal Trio */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              {/* Third Party Insurance */}
              <div
                className={`p-1.5 rounded-lg border flex flex-col justify-between print:bg-white print:border-black ${
                  alert.hasExpiredPolicy
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : alert.hasCriticalExpiry
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="text-[9px] text-slate-400 print:text-black">شخص ثالث</div>
                <div className="font-mono font-medium text-[10px] mt-0.5 text-emerald-400 print:text-black">
                  {toFaDigits(vehicle.thirdPartyExpiry || '—')}
                </div>
              </div>

              {/* Technical Inspection */}
              <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-300 flex flex-col justify-between print:bg-white print:border-black">
                <div className="text-[9px] text-slate-400 print:text-black">معاینه فنی</div>
                <div className="font-mono font-medium text-[10px] mt-0.5 text-sky-400 print:text-black">
                  {toFaDigits(vehicle.inspectionExpiry || '—')}
                </div>
              </div>

              {/* Body Insurance */}
              <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-300 flex flex-col justify-between print:bg-white print:border-black">
                <div className="text-[9px] text-slate-400 print:text-black">بیمه بدنه</div>
                <div className="font-mono font-medium text-[10px] mt-0.5 text-amber-400 print:text-black">
                  {toFaDigits(vehicle.insuranceExpiry || 'دارد')}
                </div>
              </div>
            </div>

            {/* Mileage & Wear Indicator - Minimal Layout (Click to Quick-Register Mileage) */}
            <div
              onClick={() => onOpenUsage?.(vehicle)}
              className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/30 transition-colors cursor-pointer group/km print:bg-white print:border-black space-y-1.5"
              title="برای ثبت یا به‌روزرسانی سریع کیلومترشمار کلیک کنید"
            >
              <div className="flex items-center justify-between text-[11px] print:text-black">
                <div className="flex items-center gap-1.5 text-slate-300 print:text-black">
                  <Gauge className="w-3.5 h-3.5 text-sky-400 print:text-black shrink-0" />
                  <span className="text-[10px] text-slate-400">کیلومترشمار:</span>
                  <strong className="font-mono text-white print:text-black font-semibold text-xs group-hover/km:text-sky-300 transition-colors">
                    {toFaDigits(currentKm.toLocaleString('fa-IR'))}
                  </strong>
                  <span className="text-[9px] text-slate-500">km</span>
                </div>

                {isInconsistent ? (
                  <span className="text-[9px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                    ⚠️ نیاز به اصلاح
                  </span>
                ) : isOverdue ? (
                  <span className="text-[9px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded font-mono">
                    +{toFaDigits(overdueKm.toLocaleString('fa-IR'))} km تأخیر
                  </span>
                ) : (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    remainingKm <= warningKm
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  }`}>
                    {toFaDigits(remainingKm.toLocaleString('fa-IR'))} km مانده
                  </span>
                )}
              </div>

              {/* Sub-metrics: Driven since last service */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-0.5 print:text-black">
                <span>پیمایش از سرویس قبلی:</span>
                <span className="text-sky-400 font-semibold print:text-black">
                  {toFaDigits(drivenKm.toLocaleString('fa-IR'))} km (سقف: {toFaDigits(ceilingKm.toLocaleString('fa-IR'))} km)
                </span>
              </div>

              {/* Minimal Progress Bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden print:hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isInconsistent || wearPercent >= 100
                      ? 'bg-rose-500'
                      : wearPercent >= 85
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${isInconsistent ? 100 : wearPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Capacity & Minimal Clear Action Buttons */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 print:border-black">
          <div className="text-[10px] text-slate-400 font-mono print:text-black">
            ظرفیت: {vehicle.capacityKg ? `${toFaDigits(vehicle.capacityKg)} kg` : vehicle.capacityTons || '۶ تن'}
          </div>

          {/* Action Buttons Toolbar (Minimalist, Distinct, Separated Actions) */}
          <div className="flex items-center gap-1 no-print">
            {/* 1. SEPARATE BUTTON: Quick Daily Mileage / Usage Registration ONLY (فقط ثبت کارکرد بدون تعویض روغن) */}
            {onOpenUsage && (
              <button
                type="button"
                onClick={() => onOpenUsage(vehicle)}
                className="px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-white border border-sky-500/25 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                title="ثبت کیلومتر روزانه و کارکرد خودرو (فقط ثبت کارکرد بدون تغییر در تعویض روغن)"
              >
                <Gauge className="w-3 h-3 text-sky-400" />
                <span>ثبت کیلومتر</span>
              </button>
            )}

            {/* 2. SEPARATE BUTTON: Oil Service & Filter Change (مخصوص ثبت انجام تعویض روغن و فیلترها) */}
            {onOpenOilService && (
              <button
                type="button"
                onClick={() => onOpenOilService(vehicle)}
                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/25 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                title="ثبت تعویض روغن و فیلترهای خودرو"
              >
                <Droplet className="w-3 h-3 text-amber-400" />
                <span>تعویض روغن</span>
              </button>
            )}

            {/* 3. Specifications Dossier Button */}
            {onOpenSpecifications && (
              <button
                type="button"
                onClick={() => onOpenSpecifications(vehicle)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition cursor-pointer"
                title="مشاهده و ویرایش شناسنامه فنی خودرو"
              >
                <FileText className="w-3 h-3" />
              </button>
            )}

            {/* 4. Dedicated Print Vehicle Passport Button */}
            <button
              type="button"
              onClick={handlePrintClick}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition cursor-pointer"
              title="چاپ شناسنامه رسمی خودرو A4"
            >
              <Printer className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle Specification & Passport Print Modal */}
      {isPrintModalOpen && (
        <VehicleSpecPrintModal
          vehicle={vehicle}
          onClose={() => setIsPrintModalOpen(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* Interactive Quick Driver Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a1120]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    اختصاص راننده به خودرو کد {toFaDigits(vehicle.code)}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    پلاک {vehicle.plateNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setDriverSearch('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-800 bg-[#0d1527]">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی راننده بر اساس نام، شماره تلفن یا کد..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="w-full bg-[#0a101f] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Drivers List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {/* Option to unassign if vehicle already has driver */}
              {isAssigned && (
                <button
                  type="button"
                  onClick={() => {
                    if (onUnassignDriver) {
                      onUnassignDriver(vehicle);
                    } else if (onAssignDriver) {
                      onAssignDriver(vehicle, 'بدون راننده', '');
                    }
                    setIsAssignModalOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 flex items-center justify-between text-xs transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-rose-400" />
                    <span className="font-bold">حذف راننده (تبدیل به خودروی بدون راننده)</span>
                  </div>
                  <span className="text-[10px] text-rose-400/80">لغو انتساب</span>
                </button>
              )}

              {availableDrivers
                .filter((d) => {
                  if (!driverSearch) return true;
                  return (
                    d.name.includes(driverSearch) ||
                    d.phone.includes(driverSearch) ||
                    d.code.includes(driverSearch)
                  );
                })
                .map((driver) => {
                  const isCurrent = vehicle.driverName === driver.name;
                  return (
                    <div
                      key={driver.id}
                      onClick={() => {
                        onAssignDriver?.(vehicle, driver.name, driver.phone);
                        setIsAssignModalOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600/15 border-blue-500/50 text-white'
                          : 'bg-[#0a1120] hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                          {driver.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span className="text-white">{driver.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-blue-500 text-white rounded font-mono">
                                راننده کنونی
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5" style={{ direction: 'ltr' }}>
                            {toFaDigits(driver.phone)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          کد: {toFaDigits(driver.code)}
                        </span>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow transition cursor-pointer"
                        >
                          {isCurrent ? 'انتخاب شده' : 'انتخاب'}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {availableDrivers.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  هیچ راننده‌ای در سامانه یافت نشد.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#0a1120] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setDriverSearch('');
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
