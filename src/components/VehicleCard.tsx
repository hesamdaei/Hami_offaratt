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
import { evaluateVehicleServiceStatus } from '../utils/maintenanceStandardsConfig';

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

  // Unified Oil Service & Mileage/Trips evaluation (handles KHAAVAR non-mileage vs mileage vehicles accurately)
  const serviceEval = evaluateVehicleServiceStatus(vehicle);
  const {
    hasMileage,
    currentMileage,
    drivenKm,
    ceilingKm,
    remainingKm,
    overdueKm,
    wearPercent,
    isMileageOverdue,
    isInconsistent,
    daysPassed,
    maxDays,
    daysRemaining,
    daysOverdue,
    isDaysOverdue,
    tripsDriven,
    maxTrips,
    status: serviceStatus,
  } = serviceEval;

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
      <div className="vehicle-card-print bg-[#0b1325] hover:bg-[#0e172e] border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 transition-colors flex flex-col justify-between group relative text-slate-100 print:bg-white print:border print:border-black print:text-black print:p-4">
        {/* Top Header: Code, Model, Plate & Operational Status */}
        <div>
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80 print:border-black">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center font-mono text-amber-400 shrink-0 print:bg-white print:border print:border-black print:text-black">
                <span className="text-[8px] text-slate-500 font-sans leading-tight">کد</span>
                <span className="text-sm font-bold leading-none">{toFaDigits(vehicle.code)}</span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors print:text-black">
                    {typeLabel}
                  </h3>
                  {vehicle.modelYear && (
                    <span className="text-[11px] text-slate-500 font-mono print:text-black">
                      · {toFaDigits(vehicle.modelYear)}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 print:text-black flex items-center gap-1.5">
                  <span>{vehicle.color || 'سفید'}</span>
                  {vehicle.capacityTons && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-slate-300">{toFaDigits(vehicle.capacityTons)}</span>
                    </>
                  )}
                  <span className="text-slate-600">·</span>
                  <span
                    className={`font-medium ${
                      isReady
                        ? 'text-emerald-400'
                        : isMission
                        ? 'text-sky-400'
                        : isMaintenance
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {isReady && 'آماده به کار'}
                    {isMission && 'در مأموریت'}
                    {isMaintenance && 'تعمیرگاه'}
                    {isParking && 'پارکینگ'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <IranianPlate plateNumber={vehicle.plateNumber} size="sm" />
            </div>
          </div>

          {/* Details Section */}
          <div className="py-3 space-y-2.5 text-xs">
            {/* Driver Row - Minimal single-line with quick action */}
            <div className="flex items-center justify-between gap-2 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/80 print:bg-white print:border-black">
              <div className="flex items-center gap-2 min-w-0">
                <User className={`w-3.5 h-3.5 shrink-0 ${isAssigned ? 'text-sky-400' : 'text-slate-500'}`} />
                <div className="min-w-0 truncate">
                  {isAssigned ? (
                    <span className="font-semibold text-slate-200 truncate">{vehicle.driverName}</span>
                  ) : (
                    <span className="text-slate-500">بدون راننده</span>
                  )}
                  {vehicle.driverPhone && (
                    <span
                      onClick={handleCopyPhone}
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-mono mr-2 cursor-pointer"
                      title="کلیک برای کپی شماره"
                    >
                      ({toFaDigits(vehicle.driverPhone)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition cursor-pointer"
                >
                  {isAssigned ? 'تغییر راننده' : '+ تخصیص راننده'}
                </button>
                {isAssigned && (
                  <button
                    type="button"
                    onClick={() => (onUnassignDriver ? onUnassignDriver(vehicle) : onAssignDriver?.(vehicle, 'بدون راننده', ''))}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                    title="لغو انتساب راننده"
                  >
                    <UserX className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Insurance & Technical Inspection Details for Fleet Management */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-2.5 space-y-1.5 text-[11px] print:bg-white print:border-black">
              {(() => {
                const tpPolicy = alert.policies.find((p) => p.type === 'thirdParty');
                const bodyPolicy = alert.policies.find((p) => p.type === 'body');
                const inspPolicy = alert.policies.find((p) => p.type === 'inspection');
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">بیمه شخص ثالث:</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          tpPolicy?.isExpired
                            ? 'text-rose-400'
                            : tpPolicy?.isCritical
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {toFaDigits(vehicle.thirdPartyExpiry || '—')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">بیمه بدنه:</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          bodyPolicy?.isExpired
                            ? 'text-rose-400'
                            : bodyPolicy?.isCritical
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {toFaDigits(vehicle.bodyInsExpiry || vehicle.insuranceExpiry || '—')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">معاینه فنی:</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          inspPolicy?.isExpired
                            ? 'text-rose-400'
                            : inspPolicy?.isCritical
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {toFaDigits(vehicle.inspectionExpiry || '—')}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Footer: Direct, Clean Fleet Dossier & Print Action Bar */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {alert.hasExpiredPolicy || alert.hasCriticalExpiry ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>نیازمند تمدید مدارک</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>مدارک و بیمه‌نامه معتبر</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onOpenSpecifications && (
              <button
                type="button"
                onClick={() => onOpenSpecifications(vehicle)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="مشاهده و ویرایش شناسنامه خودرو"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>شناسنامه و مدارک</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintClick}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="چاپ شناسنامه خودرو A4"
            >
              <Printer className="w-3.5 h-3.5" />
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
