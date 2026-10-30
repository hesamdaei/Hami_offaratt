import React, { FC, useState } from 'react';
import {
  Users,
  Phone,
  FileCheck,
  Star,
  Edit2,
  Trash2,
  Truck,
  MessageSquare,
  Camera,
  Copy,
  Check,
  ShieldCheck,
  IdCard,
  Printer,
  HeartPulse,
  Award,
  ExternalLink,
  ArrowLeftRight,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { DriverDirectoryItem, VehicleItem } from '../utils/fleetSeedData';
import { toFaDigits } from '../utils/jalaali';
import { DriverCardPrintModal } from './DriverCardPrintModal';
import { IranianPlate } from './IranianPlate';
import { VoipPhoneButton } from './VoipPhoneButton';

interface DriverCardProps {
  driver: DriverDirectoryItem;
  vehicles?: VehicleItem[];
  onAssignVehicle?: (driver: DriverDirectoryItem, vehiclePlateOrNone: string) => void;
  onUnassignVehicle?: (driver: DriverDirectoryItem) => void;
  onEdit?: (driver: DriverDirectoryItem) => void;
  onDelete?: (driver: DriverDirectoryItem) => void;
  onViewDocuments?: (driver: DriverDirectoryItem) => void;
  onOpenBale?: (driver: DriverDirectoryItem) => void;
  onOpenEitaa?: (driver: DriverDirectoryItem) => void;
  onPrintCard?: (driver: DriverDirectoryItem) => void;
  onCallPhone?: (phone: string, name?: string, role?: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DriverCard: FC<DriverCardProps> = ({
  driver,
  vehicles = [],
  onAssignVehicle,
  onUnassignVehicle,
  onEdit,
  onDelete,
  onViewDocuments,
  onOpenBale,
  onOpenEitaa,
  onPrintCard,
  onCallPhone,
  onShowToast,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAssignVehicleModalOpen, setIsAssignVehicleModalOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!driver.phone) return;
    navigator.clipboard.writeText(driver.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
    onShowToast?.(`شماره تماس ${driver.name} در حافظه کپی شد.`, 'info');
  };

  const handlePrintClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPrintCard) {
      onPrintCard(driver);
    } else {
      setIsPrintModalOpen(true);
    }
  };

  const docsCount = driver.documents
    ? Object.values(driver.documents).filter((v) => Boolean(v)).length
    : 0;

  const isAvailable = driver.status === 'AVAILABLE';
  const isMission = driver.status === 'ON_MISSION';
  const isLeave = driver.status === 'ON_LEAVE';

  return (
    <>
      <div className="driver-card-print bg-[#0f172a] hover:bg-[#131f38] border border-[#1e293b] hover:border-blue-500/60 rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between group relative text-slate-100 print:bg-white print:border-2 print:border-black print:text-black print:shadow-none print:break-inside-avoid print:p-4">
        {/* Top Header: Avatar, Name, Badges & Rating */}
        <div>
          <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#1e2c45] print:border-black">
            <div className="flex items-center gap-3">
              {/* Photo Frame with Status Indicator */}
              <div
                onClick={() => onViewDocuments?.(driver)}
                className="relative w-13 h-13 rounded-xl bg-[#090f1d] border border-[#243552] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group-hover:border-blue-500 transition-colors shadow-inner print:bg-white print:border-black"
                title="مشاهده مدارک، عکس پرسنلی و پرونده راننده"
              >
                {driver.documents?.avatarPhoto ? (
                  <img
                    src={driver.documents.avatarPhoto}
                    alt={driver.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-blue-300 font-black text-lg print:bg-white print:text-black">
                    {driver.name.slice(0, 1)}
                  </div>
                )}
                {/* Live Operational Status Dot */}
                <span
                  className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full ring-2 ring-[#0f172a] print:hidden ${
                    isAvailable
                      ? 'bg-emerald-400 ring-emerald-950'
                      : isMission
                      ? 'bg-sky-400 ring-sky-950 animate-pulse'
                      : 'bg-amber-400 ring-amber-950'
                  }`}
                  title={isAvailable ? 'آماده به کار' : isMission ? 'در مأموریت' : 'مرخصی'}
                />
              </div>

              {/* Driver Name, Code & Employment */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-white text-base group-hover:text-blue-300 transition-colors print:text-black">
                    {driver.name}
                  </h3>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 print:bg-white print:border-black print:text-black">
                    کد: {toFaDigits(driver.code)}
                  </span>
                </div>

                {/* Metadata details */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 print:text-black">
                  <span className="font-medium text-slate-300 print:text-black">
                    {driver.driverType === 'EMPLOYED' && 'استخدامی رسمی'}
                    {driver.driverType === 'CONTRACTOR' && 'پیمانکاری سازمانی'}
                    {driver.driverType === 'EXTERNAL' && 'راننده همکار آزاد'}
                  </span>
                  <span aria-hidden="true" className="text-slate-600 print:text-black">·</span>
                  <span className="font-mono text-[11px]">
                    کد ملی: {toFaDigits(driver.nationalCode)}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Star Rating */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-300 text-xs font-bold font-mono shrink-0 print:bg-white print:border-black print:text-black">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 print:text-black print:fill-black" />
              <span>{toFaDigits(driver.rating)}</span>
            </div>
          </div>

          {/* Core Driver Information Grid */}
          <div className="py-3.5 space-y-2.5 text-xs">
            {/* Direct Phone Number Row with VoIP Click-to-Call */}
            <div className="flex items-center justify-between bg-[#0a1120] p-2.5 rounded-xl border border-[#1c2a44] print:bg-white print:border-black">
              <div className="flex items-center gap-2 text-slate-300 print:text-black">
                <span className="text-[11px] text-slate-400 print:text-black">تماس VoIP:</span>
                <VoipPhoneButton
                  phone={driver.phone}
                  name={driver.name}
                  role={`راننده (${driver.code || '---'})`}
                  variant="chip"
                  showCopy={true}
                  onCall={onCallPhone}
                />
              </div>
            </div>

            {/* Assigned Vehicles Box with Quick Assign & Unassign Controls */}
            <div className="p-2.5 rounded-xl bg-[#0a1120] border border-[#1c2a44] print:bg-white print:border-black space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 print:text-black">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                  <span className="font-bold">خودروی اختصاصی:</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold print:text-black">
                  {toFaDigits(driver.totalTrips)} سفر موفق
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-200 text-xs truncate print:text-black flex-1 min-w-0">
                  {driver.assignedVehicles && driver.assignedVehicles.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {driver.assignedVehicles.map((plate) => (
                        <span
                          key={plate}
                          className="px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-sky-300 font-mono text-[11px] font-bold"
                        >
                          {plate}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-[11px] print:text-black">
                      فاقد خودروی اختصاصی (آماده اعزام)
                    </span>
                  )}
                </div>

                {/* Quick Vehicle Assign & Unassign Actions */}
                <div className="flex items-center gap-1 shrink-0 print:hidden text-[11px]">
                  {driver.assignedVehicles && driver.assignedVehicles.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsAssignVehicleModalOpen(true)}
                        className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white border border-blue-500/25 flex items-center gap-1 transition cursor-pointer"
                        title="تغییر یا واگذاری خودروی دیگر"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-blue-400" />
                        <span>تغییر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onUnassignVehicle) onUnassignVehicle(driver);
                          else onAssignVehicle?.(driver, 'NONE');
                        }}
                        className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 transition cursor-pointer"
                        title="لغو انتساب خودرو از این راننده"
                      >
                        <X className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAssignVehicleModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                      title="اختصاص یک خودرو از ناوگان به این راننده"
                    >
                      <Truck className="w-3 h-3 text-emerald-400" />
                      <span>+ اختصاص خودرو</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* License & Health Validation Row */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-[#0a1120] border border-[#1c2a44] flex items-center gap-1.5 text-slate-300 print:bg-white print:border-black print:text-black">
                <IdCard className="w-3.5 h-3.5 text-blue-400 print:text-black shrink-0" />
                <span className="truncate">پایه یک: {toFaDigits(driver.licenseNumber || 'معتبر')}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#0a1120] border border-[#1c2a44] flex items-center gap-1.5 text-emerald-300 print:bg-white print:border-black print:text-black">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-black shrink-0" />
                <span className="truncate">طب کار و سلامت: معتبر</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Operational Status Badge & Action Toolbar */}
        <div className="pt-3 border-t border-[#1e2c45] flex items-center justify-between gap-2 print:border-black">
          {/* Status Indicator Badge */}
          <span
            className={`text-xs font-bold px-3 py-1 rounded-xl border print:bg-white print:text-black print:border-black ${
              isAvailable
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : isMission
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {isAvailable && '🟢 آماده به کار'}
            {isMission && '🔵 در مأموریت'}
            {isLeave && '🟠 مرخصی'}
          </span>

          {/* Action Buttons Toolbar (Hidden when printing on paper) */}
          <div className="flex items-center gap-1.5 no-print">
            {/* Dedicated Print Driver ID Card Button */}
            <button
              type="button"
              onClick={handlePrintClick}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="چاپ کارت شناسایی رسمی راننده (بهینه لیزری کاغذ سفید بدون پس‌زمینه)"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-bold">چاپ کارت</span>
            </button>

            {/* Messenger Button (Bale/Eitaa) */}
            {(onOpenBale || onOpenEitaa) && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenBale) onOpenBale(driver);
                  else if (onOpenEitaa) onOpenEitaa(driver);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="ارسال پیام آماده‌باش در بله"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] hidden lg:inline">بله</span>
              </button>
            )}

            {/* Documents Button */}
            <button
              type="button"
              onClick={() => onViewDocuments?.(driver)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="مشاهده و بارگذاری مدارک و پرونده راننده"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">مدارک ({toFaDigits(docsCount)})</span>
            </button>

            {/* Edit Button */}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(driver)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                title="ویرایش پرونده راننده"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(driver)}
                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                title="حذف راننده"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Driver ID Card Print Modal */}
      {isPrintModalOpen && (
        <DriverCardPrintModal
          driver={driver}
          onClose={() => setIsPrintModalOpen(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* Interactive Quick Vehicle Assignment Modal */}
      {isAssignVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0a1120]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    اختصاص خودرو به راننده: {driver.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    کد پرسنلی: {toFaDigits(driver.code)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAssignVehicleModalOpen(false);
                  setVehicleSearch('');
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
                  placeholder="جستجوی خودرو بر اساس پلاک، کد یا مدل..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full bg-[#0a101f] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Vehicles List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {/* Option to unassign if driver currently has vehicle */}
              {driver.assignedVehicles && driver.assignedVehicles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (onUnassignVehicle) onUnassignVehicle(driver);
                    else onAssignVehicle?.(driver, 'NONE');
                    setIsAssignVehicleModalOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 flex items-center justify-between text-xs transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-400" />
                    <span className="font-bold">لغو انتساب خودرو (تبدیل به راننده بدون خودرو)</span>
                  </div>
                  <span className="text-[10px] text-rose-400/80">لغو انتساب</span>
                </button>
              )}

              {vehicles
                .filter((v) => {
                  if (!vehicleSearch) return true;
                  return (
                    v.plateNumber.includes(vehicleSearch) ||
                    String(v.code).includes(vehicleSearch) ||
                    (v.model && v.model.includes(vehicleSearch))
                  );
                })
                .map((veh) => {
                  const isCurrent = driver.assignedVehicles?.includes(veh.plateNumber);
                  return (
                    <div
                      key={veh.id}
                      onClick={() => {
                        onAssignVehicle?.(driver, veh.plateNumber);
                        setIsAssignVehicleModalOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600/15 border-blue-500/50 text-white'
                          : 'bg-[#0a1120] hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs text-amber-300">
                          {toFaDigits(veh.code)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                            <span>{veh.plateNumber}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-blue-500 text-white rounded font-sans">
                                خودروی فعلی
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {veh.model} {veh.driverName && veh.driverName !== 'بدون راننده' && veh.driverName !== driver.name ? `(در اختیار: ${veh.driverName})` : ''}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow transition cursor-pointer"
                      >
                        {isCurrent ? 'اختصاص یافته' : 'انتخاب'}
                      </button>
                    </div>
                  );
                })}

              {vehicles.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  هیچ خودرویی در سامانه یافت نشد.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#0a1120] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAssignVehicleModalOpen(false);
                  setVehicleSearch('');
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
