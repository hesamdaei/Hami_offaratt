import { FC, useState, useEffect, FormEvent, useMemo } from 'react';
import {
  Truck,
  X,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Wrench,
  AlertTriangle,
  FileText,
  Calendar,
  Save,
  RotateCcw,
  Sparkles,
  ParkingSquare,
  ShieldCheck,
  History,
  Layers,
  MapPin,
  FileCheck,
} from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import {
  VehicleItem,
  VehicleStatusHistoryRecord,
  VEHICLE_TYPE_NAMES,
  checkVehicleServiceEligibility,
  INITIAL_DRIVER_DIRECTORY,
} from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';

export const SearchableDriverSelect = ({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (name: string, code: string, phone: string) => void;
  disabled: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return INITIAL_DRIVER_DIRECTORY.filter(d => 
      d.name.includes(search) || d.code.includes(search) || d.phone.includes(search)
    );
  }, [search]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none disabled:opacity-50 text-right flex justify-between items-center"
      >
        <span>{value || 'بدون راننده'}</span>
        <span className="text-slate-500">▼</span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0a101f] border border-[#223555] rounded-lg shadow-xl overflow-hidden flex flex-col max-h-60">
          <div className="p-1.5 border-b border-[#223555]">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی نام، کد یا موبایل..."
              className="w-full bg-[#111c30] text-slate-200 border border-[#223555] rounded-md px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('بدون راننده', '', '');
                setIsOpen(false);
                setSearch('');
              }}
              className="w-full text-right px-3 py-2 text-xs text-slate-300 hover:bg-blue-500/20"
            >
              بدون راننده
            </button>
            {filtered.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onChange(d.name, d.code, d.phone);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="w-full text-right px-3 py-2 text-xs text-slate-300 hover:bg-blue-500/20 border-t border-[#1f2e4a] flex items-center justify-between"
              >
                <span>{d.name}</span>
                <span className="font-mono text-[10px] text-slate-500">{toFaDigits(d.code)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-slate-500">یافت نشد</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface VehicleStatusModalProps {
  vehicle: VehicleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveVehicle: (updated: VehicleItem) => void;
  onTriggerEndOfWork?: (vehicle: VehicleItem) => void;
  readOnlySpecs?: boolean;
}

export const VehicleStatusModal: FC<VehicleStatusModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onSaveVehicle,
  onTriggerEndOfWork,
  readOnlySpecs = false,
}) => {
  // Active sub-tab inside the status modal
  const [activeSubTab, setActiveSubTab] = useState<'STATUS_FORM' | 'HISTORY_RECORDS'>('STATUS_FORM');

  // Form states copied from vehicle
  const [formData, setFormData] = useState<VehicleItem>(() => (vehicle ? { ...vehicle } : ({} as VehicleItem)));

  // Sync form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setFormData({ ...vehicle });
      setActiveSubTab('STATUS_FORM');
    }
  }, [vehicle]);

  // Eligibility check
  const eligibility = useMemo(
    () => (vehicle ? checkVehicleServiceEligibility(formData) : { isEligible: true, issues: [] }),
    [formData, vehicle]
  );

  if (!isOpen || !vehicle) return null;

  // Reset form when vehicle changes
  const handleReset = () => {
    if (vehicle) {
      setFormData({ ...vehicle });
    }
  };

  // Set ready time to now
  const handleSetReadyTimeNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setFormData((prev) => ({
      ...prev,
      status: 'ACTIVE',
      readyDate: prev.readyDate || '1405/06/12',
      readyTime: `${h}:${m}`,
      lastStatusDate: '1405/06/12',
      lastStatusTime: `${h}:${m}`,
    }));
  };

  // Quick state changer
  const handleQuickStatusChange = (newStatus: VehicleItem['status']) => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${h}:${m}`;
    const currentDate = '1405/06/12';

    const isReady = newStatus === 'ACTIVE';

    setFormData((prev) => ({
      ...prev,
      status: newStatus,
      lastStatusDate: currentDate,
      lastStatusTime: currentTime,
      readyDate: isReady ? currentDate : prev.readyDate,
      readyTime: isReady ? currentTime : prev.readyTime,
    }));
  };

  // Save changes
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Create a history record if status or driver changed
    const statusChanged = formData.status !== vehicle.status;
    const driverChanged = formData.driverName !== vehicle.driverName;

    let updatedHistory = [...(vehicle.history || [])];

    if (statusChanged || driverChanged) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newRecord: VehicleStatusHistoryRecord = {
        id: `hist-${formData.code}-${Date.now()}`,
        rowNumber: updatedHistory.length + 1,
        date: formData.lastStatusDate || '1405/06/12',
        time: formData.lastStatusTime || timeStr,
        status: formData.status as any,
        statusTitle:
          formData.status === 'ACTIVE'
            ? 'آماده به کار'
            : formData.status === 'IN_MISSION'
            ? 'در حال مأموریت'
            : formData.status === 'PARKING'
            ? 'پارکینگ'
            : formData.status === 'IN_MAINTENANCE'
            ? 'تعمیرگاه'
            : 'غیرفعال',
        driverName: formData.driverName,
        driverCode: formData.driverCode,
        vehicleCode: formData.code,
        plateNumber: formData.plateNumber,
        vehicleType: VEHICLE_TYPE_NAMES[formData.vehicleType] || formData.vehicleType,
        handoverDate: formData.handoverDate,
        handoverTime: formData.handoverTime,
        queueDate: formData.queueDate,
        queueTime: formData.queueTime,
        readyDate: formData.readyDate,
        readyTime: formData.readyTime,
        location: formData.location || 'پارکینگ مرکزی',
        description: statusChanged
          ? `تغییر وضعیت دستی از «${vehicle.status}» به «${formData.status}»`
          : `تغییر راننده به «${formData.driverName}»`,
        recordedBy: 'سرپرست ناوگان / کاربر سیستم',
      };
      updatedHistory = [newRecord, ...updatedHistory];
    }

    const updatedVehicle: VehicleItem = {
      ...formData,
      history: updatedHistory,
    };

    onSaveVehicle(updatedVehicle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0b1220] border border-[#1e2e4a] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2e4a] bg-[#080d18]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  وضعیت ماشین و شناسنامه ناوگان (صداقت بار ۱۴۰۵)
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-xs font-bold">
                  کد وسیله: {toFaDigits(vehicle.code)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                مشاهده و ویرایش مشخصات فنی، زمان‌های واگذاری و آمادگی، و سوابق عملیاتی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick End-Of-Work Button */}
            {onTriggerEndOfWork && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerEndOfWork(formData);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>ثبت پایان کار و اعلام آمادگی</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Toolbar (matching the legacy Sedaqat Bar toolbar in the photo) */}
        <div className="px-5 py-2.5 bg-[#0f172a] border-b border-[#1e2e4a] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {/* Tab switchers */}
            <button
              type="button"
              onClick={() => setActiveSubTab('STATUS_FORM')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeSubTab === 'STATUS_FORM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#152238] text-slate-300 hover:text-white border border-[#223555]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>مشخصات و وضعیت ماشین</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY_RECORDS')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeSubTab === 'HISTORY_RECORDS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#152238] text-slate-300 hover:text-white border border-[#223555]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سوابق ناوگان و تغییرات وضعیت</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-900/60 text-blue-200 text-[10px] font-mono">
                {toFaDigits(formData.history?.length || 0)}
              </span>
            </button>
          </div>

          {/* Quick status toggle buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden sm:inline">تغییر سریع:</span>
            <button
              type="button"
              onClick={() => handleQuickStatusChange('ACTIVE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                formData.status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-[#152238] text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>آماده به کار</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickStatusChange('PARKING')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                formData.status === 'PARKING'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                  : 'bg-[#152238] text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <ParkingSquare className="w-3 h-3 text-purple-400" />
              <span>پارکینگ</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickStatusChange('IN_MAINTENANCE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                formData.status === 'IN_MAINTENANCE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-[#152238] text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3 h-3 text-amber-400" />
              <span>تعمیرگاه</span>
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeSubTab === 'STATUS_FORM' ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Main 2-Column Grid (Left: Timeline & Actions | Right: Technical Fields) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Column (Dispatch Timeline & Summary - exactly as in photo) */}
                <div className="lg:col-span-4 space-y-3">
                  {/* Plate & Identity Card */}
                  <div className="p-3.5 bg-[#111c30] border border-[#1f2e4a] rounded-xl text-center space-y-2">
                    <div className="text-[11px] text-slate-400">شماره پلاک ملی ایران</div>
                    <div className="flex justify-center">
                      <IranianPlate plateNumber={formData.plateNumber} size="md" />
                    </div>
                    <div className="text-xs text-slate-300 font-semibold pt-1">
                      {VEHICLE_TYPE_NAMES[formData.vehicleType] || formData.vehicleType} - {formData.color || 'قرمز - روغنی'}
                    </div>
                  </div>

                  {/* Operational Timings Box (آخرین وضعیت، زمان واگذاری، زمان آمادگی) */}
                  <div className="p-3.5 bg-[#111c30] border border-[#1f2e4a] rounded-xl space-y-3">
                    <div className="font-semibold text-slate-200 border-b border-[#1c2a42] pb-1.5 flex items-center justify-between">
                      <span>زمان‌بندی دیسپچ و آمادگی</span>
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                    </div>

                    {/* آخرین وضعیت */}
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">آخرین وضعیت (تاریخ و ساعت)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <DatePicker
                          calendar={persian}
                          locale={persian_fa}
                          format="YYYY/MM/DD"
                          value={formData.lastStatusDate || '1405/06/12'}
                          onChange={(dateObj: any) => {
                            if (dateObj) setFormData({ ...formData, lastStatusDate: dateObj.format('YYYY/MM/DD') });
                          }}
                          containerClassName="w-full"
                          inputClass="w-full bg-[#0a101f] border border-[#243553] text-slate-200 rounded-md px-2 py-1.5 text-center font-mono text-[11px] focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="time"
                          value={formData.lastStatusTime || '19:20'}
                          onChange={(e) => setFormData({ ...formData, lastStatusTime: e.target.value })}
                          className="bg-[#0a101f] border border-[#243553] text-slate-200 rounded-md px-2 py-1.5 text-center font-mono text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* زمان واگذاری */}
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">زمان واگذاری (تاریخ و ساعت)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <DatePicker
                          calendar={persian}
                          locale={persian_fa}
                          format="YYYY/MM/DD"
                          value={formData.handoverDate || '1405/06/10'}
                          onChange={(dateObj: any) => {
                            if (dateObj) setFormData({ ...formData, handoverDate: dateObj.format('YYYY/MM/DD') });
                          }}
                          containerClassName="w-full"
                          inputClass="w-full bg-[#0a101f] border border-[#243553] text-slate-200 rounded-md px-2 py-1.5 text-center font-mono text-[11px] focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="time"
                          value={formData.handoverTime || '10:50'}
                          onChange={(e) => setFormData({ ...formData, handoverTime: e.target.value })}
                          className="bg-[#0a101f] border border-[#243553] text-slate-200 rounded-md px-2 py-1.5 text-center font-mono text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* زمان آمادگی */}
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>زمان آمادگی (آماده کار جدید)</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleSetReadyTimeNow}
                          className="text-[10px] text-emerald-400 hover:text-emerald-200 underline"
                        >
                          تنظیم به اکنون
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <DatePicker
                          calendar={persian}
                          locale={persian_fa}
                          format="YYYY/MM/DD"
                          value={formData.readyDate || '1405/06/12'}
                          onChange={(dateObj: any) => {
                            if (dateObj) setFormData({ ...formData, readyDate: dateObj.format('YYYY/MM/DD') });
                          }}
                          containerClassName="w-full"
                          inputClass="w-full bg-[#0a101f] border border-emerald-500/40 text-emerald-200 rounded-md px-2 py-1.5 text-center font-mono text-[11px] focus:outline-none"
                        />
                        <input
                          type="time"
                          value={formData.readyTime || '19:30'}
                          onChange={(e) => setFormData({ ...formData, readyTime: e.target.value })}
                          className="bg-[#0a101f] border border-emerald-500/40 text-emerald-200 rounded-md px-2 py-1.5 text-center font-mono font-bold text-[11px] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dispatch Eligibility Status Callout */}
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed ${eligibility.statusBadgeColor}`}>
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <span>{eligibility.statusLabel}</span>
                    </div>
                    {eligibility.reason && (
                      <p className="text-[11px] opacity-90">{eligibility.reason}</p>
                    )}
                  </div>
                </div>

                {/* Right Column (Technical Dossier Fields - matching photo grid) */}
                <div className="lg:col-span-8 space-y-3">
                  {/* Row 1: Identification */}
                  <div className="p-3.5 bg-[#111c30] border border-[#1f2e4a] rounded-xl space-y-3">
                    <div className="font-semibold text-slate-200 border-b border-[#1c2a42] pb-1.5 flex items-center justify-between">
                      <span>مشخصات فنی و شناسنامه خودرو</span>
                      <span className="text-[11px] text-slate-400">سیستم ثبتی شماره ۱</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-slate-400 mb-0.5">کد وسیله</label>
                        <input
                          type="number"
                          disabled={readOnlySpecs}
                          value={formData.code || ''}
                          onChange={(e) => setFormData({ ...formData, code: Number(e.target.value) })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">سال ساخت</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.modelYear || '1375'}
                          onChange={(e) => setFormData({ ...formData, modelYear: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">نوع وسیله</label>
                        <select
                          disabled={readOnlySpecs}
                          value={formData.vehicleType}
                          onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        >
                          <option value="KHAAVAR">خاور</option>
                          <option value="HYUNDAI">هیوندا</option>
                          <option value="ISUZU">ایسوزو</option>
                          <option value="NISSAN">نیسان</option>
                          <option value="VAN">ون</option>
                          <option value="PICKUP">وانت</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">شماره شاسی</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.chassisNumber || '37405114419524'}
                          onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">شماره موتور</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.engineNumber || 'OM314-984210'}
                          onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">VIN</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.vin || 'irgc759k6p5419524'}
                          onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">نوع پلاک</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.plateType || 'عمومی'}
                          onChange={(e) => setFormData({ ...formData, plateType: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">شماره پلاک قبلی</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.previousPlate || '۵۸ س ۳۲۲ ایران ۱۱'}
                          onChange={(e) => setFormData({ ...formData, previousPlate: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">تعداد محور</label>
                        <input
                          type="number"
                          disabled={readOnlySpecs}
                          value={formData.axleCount || 2}
                          onChange={(e) => setFormData({ ...formData, axleCount: Number(e.target.value) })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">رنگ بدنه</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.color || 'قرمز - روغنی'}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">نوع شاسی</label>
                        <input
                          type="text"
                          disabled={readOnlySpecs}
                          value={formData.chassisType || 'کامیونت'}
                          onChange={(e) => setFormData({ ...formData, chassisType: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            disabled={readOnlySpecs}
                            checked={!!formData.hasViolation}
                            onChange={(e) => setFormData({ ...formData, hasViolation: e.target.checked })}
                            className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500 disabled:opacity-50"
                          />
                          <span className="text-rose-400 font-semibold">دارای تخلف</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Driver & Assignment */}
                  <div className="p-3.5 bg-[#111c30] border border-[#1f2e4a] rounded-xl space-y-3">
                    <div className="font-semibold text-slate-200 border-b border-[#1c2a42] pb-1.5 flex items-center justify-between">
                      <span>اطلاعات راننده و وضعیت عملیاتی</span>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-slate-400 mb-0.5">نام راننده</label>
                        <SearchableDriverSelect
                          disabled={formData.status === 'IN_MISSION'}
                          value={formData.driverName || ''}
                          onChange={(name, code, phone) => setFormData({ ...formData, driverName: name, driverCode: code, driverPhone: phone })}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">کد راننده (پرسنلی)</label>
                        <input
                          type="text"
                          disabled
                          value={formData.driverCode || ''}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">شماره تماس راننده</label>
                        <input
                          type="text"
                          disabled
                          value={formData.driverPhone || ''}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">وضعیت عملیاتی خودرو</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="ACTIVE">آماده به کار (فعال)</option>
                          <option value="IN_MISSION">در مأموریت</option>
                          <option value="PARKING">پارکینگ</option>
                          <option value="IN_MAINTENANCE">تعمیرگاه</option>
                          <option value="INACTIVE">غیرفعال</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">محل توقف</label>
                        <input
                          type="text"
                          value={formData.location || 'پارکینگ مرکزی'}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">گروه</label>
                        <input
                          type="text"
                          value={formData.group || 'گروه صداقت بار'}
                          onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1a273e]">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="checkbox"
                          checked={formData.queueStatus === 'IN_QUEUE'}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              queueStatus: e.target.checked ? 'IN_QUEUE' : 'NOT_QUEUED',
                              queueNumber: e.target.checked ? formData.queueNumber || 1 : undefined,
                            })
                          }
                          className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-blue-300">در نوبت بارنامه (صف نوبت بارگیری)</span>
                      </label>

                      {formData.queueStatus === 'IN_QUEUE' && (
                        <div className="text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
                          <span>شماره نوبت: {toFaDigits(formData.queueNumber || 1)}</span>
                          <span className="text-slate-500">|</span>
                          <span>ساعت نوبت: {toFaDigits(formData.queueTime || '16:37')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Insurance & Inspection */}
                  <div className="p-3.5 bg-[#111c30] border border-[#1f2e4a] rounded-xl space-y-3">
                    <div className="font-semibold text-slate-200 border-b border-[#1c2a42] pb-1.5 flex items-center justify-between">
                      <span>بیمه، معاینه فنی و مدارک قانونی</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-slate-400 mb-0.5">اعتبار بیمه نامه شخص ثالث</label>
                        <input
                          type="text"
                          value={formData.thirdPartyExpiry || '1405/08/28'}
                          onChange={(e) => setFormData({ ...formData, thirdPartyExpiry: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">شماره بیمه نامه</label>
                        <input
                          type="text"
                          value={formData.insurancePolicyNumber || '9375576'}
                          onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">اعتبار معاینه فنی</label>
                        <input
                          type="text"
                          value={formData.inspectionExpiry || '1405/07/17'}
                          onChange={(e) => setFormData({ ...formData, inspectionExpiry: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">شماره معاینه فنی</label>
                        <input
                          type="text"
                          value={formData.inspectionNumber || '4105822'}
                          onChange={(e) => setFormData({ ...formData, inspectionNumber: e.target.value })}
                          className="w-full bg-[#0a101f] border border-[#223555] text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-slate-400 mb-1">توضیحات کلی وسیله نقلیه</label>
                    <textarea
                      rows={2}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="توضیحات فنی، وضعیت لاستیک‌ها، لوازم همراه یا یادداشت دیسپچ..."
                      className="w-full bg-[#0a101f] border border-[#1f2e4a] text-slate-200 rounded-lg px-3 py-2 text-xs focus:border-blue-500 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Form Actions */}
              <div className="pt-3 border-t border-[#1e2e4a] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی به مقادیر اولیه</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-900/40 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>ثبت تغییرات ماشین</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Tab 2: سوابق ناوگان و تغییرات وضعیت (exact reproduction of top table in user photo) */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <span>جدول سوابق و تاریخچه عملیاتی خودرو کد {toFaDigits(formData.code)}</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (ثبت رویدادهای تغییر وضعیت، پایان کار، زمان‌های واگذاری و نوبت)
                  </span>
                </h4>
              </div>

              <div className="bg-[#111c30] border border-[#1f2e4a] rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0c1424] text-slate-400 border-b border-[#1f2e4a] font-semibold text-[11px]">
                        <th className="py-2.5 px-3 text-center w-12">ردیف</th>
                        <th className="py-2.5 px-2.5 text-center">ساعت نوبت</th>
                        <th className="py-2.5 px-2.5 text-center">تاریخ نوبت</th>
                        <th className="py-2.5 px-2.5 text-center">زمان واگذاری</th>
                        <th className="py-2.5 px-2.5 text-center">تاریخ واگذاری</th>
                        <th className="py-2.5 px-3 text-center">وضعیت</th>
                        <th className="py-2.5 px-2.5 text-center">ساعت وضعیت</th>
                        <th className="py-2.5 px-2.5 text-center">تاریخ وضعیت</th>
                        <th className="py-2.5 px-3">شرح ۱ (پلاک)</th>
                        <th className="py-2.5 px-3">نام و خانوادگی راننده</th>
                        <th className="py-2.5 px-2.5 text-center">زمان آمادگی</th>
                        <th className="py-2.5 px-3">توضیحات و شرح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#172338]">
                      {(!formData.history || formData.history.length === 0) ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-slate-500">
                            هنوز سابقه‌ای برای این خودرو ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        formData.history.map((record, index) => (
                          <tr
                            key={record.id || index}
                            className="hover:bg-[#152238] transition-colors text-slate-200"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {toFaDigits(record.rowNumber || index + 1)}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                              {record.queueTime ? toFaDigits(record.queueTime) : '—'}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                              {record.queueDate ? toFaDigits(record.queueDate) : '—'}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                              {record.handoverTime ? toFaDigits(record.handoverTime) : '—'}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                              {record.handoverDate ? toFaDigits(record.handoverDate) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  record.status === 'ACTIVE'
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : record.status === 'IN_MISSION'
                                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                    : record.status === 'PARKING'
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                    : record.status === 'IN_MAINTENANCE'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-slate-700/30 text-slate-300 border-slate-600'
                                }`}
                              >
                                {record.statusTitle || record.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                              {record.time ? toFaDigits(record.time) : '—'}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                              {record.date ? toFaDigits(record.date) : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs">
                              {record.plateNumber}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-100">
                              {record.driverName || 'بدون راننده'}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-emerald-400 font-bold text-[11px]">
                              {record.readyTime ? toFaDigits(record.readyTime) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                              {record.description || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
