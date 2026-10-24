import { FC, useState, useEffect, FormEvent } from 'react';
import {
  X,
  Truck,
  Car,
  FileText,
  Printer,
  Edit,
  Save,
  CheckCircle2,
  Calendar,
  Gauge,
  Shield,
  MapPin,
  User,
  UserCheck,
  UserX,
  ArrowLeftRight,
  Phone,
  Droplet,
  Info,
  Wrench,
  Hash,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VehicleItem, VEHICLE_TYPE_NAMES, DriverDirectoryItem } from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { PlateInput } from './PlateInput';
import {
  toFaDigits,
  parseJalaaliDate,
  calculateDaysBetweenJalaali,
  addJalaaliDays,
  formatJalaaliDate,
} from '../utils/jalaali';
import { PersianDatePicker } from './PersianDatePicker';
import { VehicleSpecPrintModal } from './VehicleSpecPrintModal';
import {
  getStoredServiceRules,
  getStoredMaintenanceItems,
  calculateMileageStatus,
  MaintenanceItemStandard,
  ServiceRule,
} from '../utils/maintenanceStandardsConfig';

interface VehicleSpecificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleItem | null;
  onUpdateVehicle: (updated: VehicleItem) => void;
  availableDrivers?: DriverDirectoryItem[];
  onAssignDriverToVehicle?: (vehicleId: string, driverNameOrNone: string, driverPhone?: string) => void;
  onOpenOilModal?: (vehicle: VehicleItem) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const VehicleSpecificationsModal: FC<VehicleSpecificationsModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onUpdateVehicle,
  availableDrivers = [],
  onAssignDriverToVehicle,
  onOpenOilModal,
  showToast,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<VehicleItem>>({});
  const [activeTab, setActiveTab] = useState<'TECH_SPECS' | 'DOCS_INSURANCE' | 'MAINTENANCE'>('TECH_SPECS');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedStandardItemId, setSelectedStandardItemId] = useState<string>('engine_oil');

  useEffect(() => {
    if (vehicle) {
      setFormData({ ...vehicle });
      setIsEditing(false);
    }
  }, [vehicle]);

  if (!isOpen || !vehicle) return null;

  const currentTypeLabel = VEHICLE_TYPE_NAMES[formData.vehicleType || vehicle.vehicleType] || formData.vehicleType || vehicle.vehicleType;

  const handleInputChange = (field: keyof VehicleItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const updated: VehicleItem = {
      ...vehicle,
      ...formData,
      code: Number(formData.code) || vehicle.code,
    } as VehicleItem;

    if (formData.driverName !== vehicle.driverName) {
      if (onAssignDriverToVehicle) {
        onAssignDriverToVehicle(vehicle.id, formData.driverName || 'بدون راننده', formData.driverPhone);
      }
    }

    onUpdateVehicle(updated);
    setIsEditing(false);
    if (showToast) {
      showToast(`مشخصات خودرو کد ${toFaDigits(updated.code)} با موفقیت ذخیره و به‌روزرسانی شد.`, 'success');
    }
  };

  const handleQuickUnassignDriver = () => {
    if (!vehicle) return;
    if (onAssignDriverToVehicle) {
      onAssignDriverToVehicle(vehicle.id, 'بدون راننده', '');
    } else {
      onUpdateVehicle({
        ...vehicle,
        driverName: 'بدون راننده',
        driverPhone: '',
      });
    }
    setFormData((prev) => ({
      ...prev,
      driverName: 'بدون راننده',
      driverPhone: '',
    }));
    showToast?.(`خودرو کد ${toFaDigits(vehicle.code)} از راننده قبلی لغو انتساب شد (فاقد راننده).`, 'info');
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 bg-[#0b1325] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  شناسنامه و مشخصات فنی خودرو کد {toFaDigits(vehicle.code)}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {currentTypeLabel}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  vehicle.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : vehicle.status === 'IN_MISSION'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : vehicle.status === 'IN_MAINTENANCE'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {vehicle.status === 'ACTIVE'
                    ? 'آماده به کار'
                    : vehicle.status === 'IN_MISSION'
                    ? 'در مأموریت'
                    : vehicle.status === 'IN_MAINTENANCE'
                    ? 'در تعمیرگاه'
                    : 'پارکینگ'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ثبت و نمایش جامع شماره شاسی، موتور، VIN، کاربری، بیمه‌نامه‌ها، راننده و سرویس
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs flex items-center gap-1.5"
              title="چاپ شناسنامه مشخصات خودرو"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">چاپ شناسنامه</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border transition text-xs font-bold flex items-center gap-1.5 ${
                isEditing
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-500/30'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{isEditing ? 'انصراف از ویرایش' : 'ویرایش مشخصات'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP PLATE & KEY SPECS SUMMARY BAR */}
        <div className="bg-[#111c34] px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">پلاک انتظامی:</span>
            {isEditing ? (
              <PlateInput
                value={formData.plateNumber || vehicle.plateNumber}
                onChange={(val) => handleInputChange('plateNumber', val)}
              />
            ) : (
              <IranianPlate plateNumber={vehicle.plateNumber} size="md" />
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">راننده:</span>
              <strong className="text-white font-sans">{formData.driverName || 'بدون راننده'}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">کیلومتر جاری:</span>
              <strong className="text-sky-300 font-bold">{toFaDigits(Number(formData.currentMileage || 0).toLocaleString())} km</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">سال ساخت:</span>
              <strong className="text-amber-300">{toFaDigits(formData.modelYear || 1398)}</strong>
            </div>
          </div>
        </div>

        {/* TABS HEADER */}
        <div className="px-3 sm:px-6 pt-2 bg-[#0d1629] border-b border-slate-800/90 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('TECH_SPECS')}
            className={`px-3 sm:px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'TECH_SPECS'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>مشخصات فنی و کاربری</span>
          </button>

          <button
            onClick={() => setActiveTab('DOCS_INSURANCE')}
            className={`px-3 sm:px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'DOCS_INSURANCE'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>بیمه‌ها، معاینه و اسناد</span>
          </button>

          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`px-3 sm:px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'MAINTENANCE'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>سرویس روغن و وضعیت نگهداری</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* TAB 1: TECHNICAL SPECS & CHASSIS */}
          {activeTab === 'TECH_SPECS' && (
            <div className="space-y-4">
              <div className="bg-[#111c34] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 border-b border-slate-800 pb-2">
                  <Truck className="w-4 h-4" />
                  <span>اطلاعات شناسنامه‌ای و سازنده خودرو</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  {/* Code */}
                  <div>
                    <label className="block text-slate-400 mb-1">کد سازمانی خودرو</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.code || ''}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-blue-400 font-mono font-bold">
                        {toFaDigits(formData.code || vehicle.code)}
                      </div>
                    )}
                  </div>

                  {/* Vehicle Type */}
                  <div>
                    <label className="block text-slate-400 mb-1">مدل و سازنده خودرو</label>
                    {isEditing ? (
                      <select
                        value={formData.vehicleType || vehicle.vehicleType}
                        onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      >
                        <option value="KHAAVAR">خاور بنز ۶۰۸ / ۸۰۸</option>
                        <option value="HYUNDAI">هیوندای HD۶۵ / HD۷۸</option>
                        <option value="ISUZU">ایسوزو ۵.۲ / ۶ تن</option>
                        <option value="NISSAN">وانت نیسان زامیاد</option>
                        <option value="CAR">سواری پژو / سمند</option>
                        <option value="VAN">ون</option>
                        <option value="PICKUP">وانت پیکان / پراید</option>
                      </select>
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-white font-medium">
                        {currentTypeLabel}
                      </div>
                    )}
                  </div>

                  {/* Model Year */}
                  <div>
                    <label className="block text-slate-400 mb-1">سال ساخت (مدل)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.modelYear || ''}
                        onChange={(e) => handleInputChange('modelYear', e.target.value)}
                        placeholder="مثلاً ۱۳۹۶"
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-amber-300 font-mono">
                        {toFaDigits(formData.modelYear || '۱۳۹۶')}
                      </div>
                    )}
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-slate-400 mb-1">رنگ بدنه</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.color || ''}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        placeholder="مثلاً سفید روغنی"
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-white">
                        {formData.color || 'سفید روغنی'}
                      </div>
                    )}
                  </div>

                  {/* Chassis Type */}
                  <div>
                    <label className="block text-slate-400 mb-1">نوع کاربری و شاسی</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.chassisType || ''}
                        onChange={(e) => handleInputChange('chassisType', e.target.value)}
                        placeholder="مثلاً مسقف فلزی، چادری، کفی"
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200">
                        {formData.chassisType || 'کامیونت مسقف فلزی'}
                      </div>
                    )}
                  </div>

                  {/* Capacity Tons */}
                  <div>
                    <label className="block text-slate-400 mb-1">ظرفیت بارگیری / تناژ</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.capacityTons || ''}
                        onChange={(e) => handleInputChange('capacityTons', e.target.value)}
                        placeholder="مثلاً ۵.۵ تن"
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-emerald-400 font-mono font-bold">
                        {toFaDigits(formData.capacityTons || '۵.۵ تن')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TECHNICAL SERIALS & NUMBERS */}
              <div className="bg-[#111c34] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 border-b border-slate-800 pb-2">
                  <Hash className="w-4 h-4" />
                  <span>شماره‌های اصالت فنی (شاسی، موتور و VIN)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  {/* Chassis Number */}
                  <div>
                    <label className="block text-slate-400 mb-1">شماره شاسی</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.chassisNumber || ''}
                        onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono uppercase"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200 font-mono tracking-wider">
                        {formData.chassisNumber || 'IR-CH-912847'}
                      </div>
                    )}
                  </div>

                  {/* Engine Number */}
                  <div>
                    <label className="block text-slate-400 mb-1">شماره موتور</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.engineNumber || ''}
                        onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono uppercase"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200 font-mono tracking-wider">
                        {formData.engineNumber || 'ENG-KHA-402911'}
                      </div>
                    )}
                  </div>

                  {/* VIN Number */}
                  <div>
                    <label className="block text-slate-400 mb-1">شماره شناسایی خودرو (VIN)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.vin || ''}
                        onChange={(e) => handleInputChange('vin', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono uppercase"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-sky-300 font-mono tracking-wider">
                        {formData.vin || 'NAAE14EXG100412'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DRIVER & DISPATCH ASSIGNMENT */}
              <div className="bg-[#111c34] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                    <UserCheck className="w-4 h-4" />
                    <span>راننده تحویل‌گیرنده و استقرار سازمانی</span>
                  </div>
                  {/* Quick Unassign Button if driver is assigned and not in editing mode */}
                  {!isEditing && formData.driverName && formData.driverName !== 'بدون راننده' && (
                    <button
                      type="button"
                      onClick={handleQuickUnassignDriver}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="لغو انتساب راننده و تبدیل وضعیت به بدون راننده"
                    >
                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                      <span>لغو انتساب راننده از این خودرو</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                  {/* Driver Name (Searchable / Pick from directory) */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">
                      نام راننده تحویل‌گیرنده (انتخاب از لیست رانندگان ناوگان)
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.driverName || 'بدون راننده'}
                        onChange={(e) => {
                          const chosenName = e.target.value;
                          if (!chosenName || chosenName === 'بدون راننده') {
                            handleInputChange('driverName', 'بدون راننده');
                            handleInputChange('driverPhone', '');
                          } else {
                            const matched = availableDrivers.find((d) => d.name === chosenName);
                            handleInputChange('driverName', chosenName);
                            handleInputChange('driverPhone', matched?.phone || '');
                          }
                        }}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-medium focus:border-blue-500 focus:outline-none"
                      >
                        <option value="بدون راننده">— بدون راننده (لغو انتساب و آزادسازی خودرو) —</option>
                        {availableDrivers.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name} {d.code ? `(کد: ${toFaDigits(d.code)})` : ''} {d.phone ? `- تلفن: ${toFaDigits(d.phone)}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-2 rounded-lg border border-slate-800 text-white font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span>{formData.driverName || 'بدون راننده'}</span>
                        </div>
                        {formData.driverName === 'بدون راننده' && (
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-normal cursor-pointer"
                          >
                            + اختصاص راننده
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Driver Phone */}
                  <div>
                    <label className="block text-slate-400 mb-1">شماره تماس راننده</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.driverPhone || ''}
                        onChange={(e) => handleInputChange('driverPhone', e.target.value)}
                        placeholder="0912..."
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-2 rounded-lg border border-slate-800 text-slate-300 font-mono">
                        {toFaDigits(formData.driverPhone || '—')}
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-slate-400 mb-1">محل استقرار / پارکینگ</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200">
                        {formData.location || 'پایانه مرکزی حامی'}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-slate-400 mb-1">وضعیت عملیاتی خودرو</label>
                    {isEditing ? (
                      <select
                        value={formData.status || vehicle.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      >
                        <option value="ACTIVE">آماده به کار / فعال</option>
                        <option value="IN_MISSION">در مأموریت</option>
                        <option value="PARKING">پارکینگ</option>
                        <option value="IN_MAINTENANCE">تعمیرگاه</option>
                        <option value="ON_LEAVE">مرخصی</option>
                        <option value="INACTIVE">غیرفعال</option>
                      </select>
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-emerald-400 font-bold">
                        {formData.status === 'ACTIVE'
                          ? 'آماده به کار'
                          : formData.status === 'IN_MISSION'
                          ? 'در مأموریت'
                          : formData.status === 'IN_MAINTENANCE'
                          ? 'تعمیرگاه'
                          : 'پارکینگ'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENTS & INSURANCE */}
          {activeTab === 'DOCS_INSURANCE' && (
            <div className="space-y-4">
              <div className="bg-[#111c34] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
                  <Shield className="w-4 h-4" />
                  <span>سررسید و شماره بیمه‌نامه‌های قانونی خودرو</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  {/* Third Party Insurance Expiry */}
                  <div>
                    <label className="block text-slate-400 mb-1">تاریخ انقضای بیمه شخص ثالث</label>
                    {isEditing ? (
                      <PersianDatePicker
                        value={formData.thirdPartyExpiry || ''}
                        onChange={(val) => handleInputChange('thirdPartyExpiry', val)}
                        placeholder="۱۴۰۶/۰۱/۰۱"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-emerald-400 font-mono font-bold">
                        {toFaDigits(formData.thirdPartyExpiry || '۱۴۰۶/۰۱/۰۱')}
                      </div>
                    )}
                  </div>

                  {/* Body Insurance Expiry */}
                  <div>
                    <label className="block text-slate-400 mb-1">تاریخ انقضای بیمه بدنه</label>
                    {isEditing ? (
                      <PersianDatePicker
                        value={formData.insuranceExpiry || ''}
                        onChange={(val) => handleInputChange('insuranceExpiry', val)}
                        placeholder="۱۴۰۶/۰۱/۰۱"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-sky-400 font-mono font-bold">
                        {toFaDigits(formData.insuranceExpiry || '۱۴۰۶/۰۱/۰۱')}
                      </div>
                    )}
                  </div>

                  {/* Insurance Company */}
                  <div>
                    <label className="block text-slate-400 mb-1">شرکت بیمه‌گر</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.insuranceCompany || ''}
                        onChange={(e) => handleInputChange('insuranceCompany', e.target.value)}
                        placeholder="بیمه ایران، آسیا، البرز..."
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200">
                        {formData.insuranceCompany || 'بیمه ایران'}
                      </div>
                    )}
                  </div>

                  {/* Insurance Policy Number */}
                  <div>
                    <label className="block text-slate-400 mb-1">شماره بیمه‌نامه</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.insurancePolicyNumber || ''}
                        onChange={(e) => handleInputChange('insurancePolicyNumber', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 font-mono">
                        {toFaDigits(formData.insurancePolicyNumber || `INS-۳۳${vehicle.code * 100}`)}
                      </div>
                    )}
                  </div>

                  {/* Inspection Expiry */}
                  <div>
                    <label className="block text-slate-400 mb-1">تاریخ انقضای معاینه فنی</label>
                    {isEditing ? (
                      <PersianDatePicker
                        value={formData.inspectionExpiry || ''}
                        onChange={(val) => handleInputChange('inspectionExpiry', val)}
                        placeholder="۱۴۰۵/۱۲/۲۹"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-amber-400 font-mono font-bold">
                        {toFaDigits(formData.inspectionExpiry || '۱۴۰۵/۱۲/۲۹')}
                      </div>
                    )}
                  </div>

                  {/* Inspection Number */}
                  <div>
                    <label className="block text-slate-400 mb-1">شماره برگه معاینه فنی</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.inspectionNumber || ''}
                        onChange={(e) => handleInputChange('inspectionNumber', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 font-mono">
                        {toFaDigits(formData.inspectionNumber || `INSP-۹۹${vehicle.code * 50}`)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* OWNERSHIP & TITLE DOCUMENTS */}
              <div className="bg-[#111c34] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 border-b border-slate-800 pb-2">
                  <FileText className="w-4 h-4" />
                  <span>اسناد مالکیت و شناسنامه انتظامی</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">شماره سند مالکیت / برگ سبز</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.documentNumber || ''}
                        onChange={(e) => handleInputChange('documentNumber', e.target.value)}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200 font-mono">
                        {formData.documentNumber || `DOC-${vehicle.code}-۱۴۰۵`}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">تاریخ صدور سند</label>
                    {isEditing ? (
                      <PersianDatePicker
                        value={formData.documentDate || ''}
                        onChange={(val) => handleInputChange('documentDate', val)}
                        placeholder="۱۴۰۵/۰۱/۱۵"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 font-mono">
                        {toFaDigits(formData.documentDate || '۱۴۰۵/۰۱/۱۵')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MAINTENANCE & OIL SERVICE SPECS */}
          {activeTab === 'MAINTENANCE' && (
            <div className="space-y-4">
              <div className="bg-[#111c34] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Droplet className="w-4 h-4" />
                    <span>مشخصات کارکرد، کیلومتر و تعویض روغن</span>
                  </div>

                  {onOpenOilModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOilModal(vehicle);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1"
                    >
                      <Droplet className="w-3 h-3" />
                      <span>ثبت مستقیم تعویض روغن</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                  {/* Current Mileage */}
                  <div>
                    <label className="block text-slate-400 mb-1">کیلومترشمار فعلی</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.currentMileage || 0}
                        onChange={(e) => handleInputChange('currentMileage', Number(e.target.value))}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-sky-400 font-mono font-bold text-sm">
                        {toFaDigits(Number(formData.currentMileage || 0).toLocaleString())} km
                      </div>
                    )}
                  </div>

                  {/* Last Change Mileage */}
                  <div>
                    <label className="block text-slate-400 mb-1">کیلومتر در زمان آخرین تعویض روغن</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.lastChangeMileage || 0}
                        onChange={(e) => handleInputChange('lastChangeMileage', Number(e.target.value))}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 font-mono">
                        {toFaDigits(Number(formData.lastChangeMileage || 0).toLocaleString())} km
                      </div>
                    )}
                  </div>

                  {/* Last Change Date */}
                  <div>
                    <label className="block text-slate-400 mb-1">تاریخ آخرین تعویض روغن</label>
                    {isEditing ? (
                      <PersianDatePicker
                        value={formData.lastChangeDate || ''}
                        onChange={(val) => handleInputChange('lastChangeDate', val)}
                        placeholder="۱۴۰۵/۰۶/۰۱"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 font-mono">
                        {toFaDigits(formData.lastChangeDate || '۱۴۰۵/۰۶/۰۱')}
                      </div>
                    )}
                  </div>

                  {/* Trips Since Change */}
                  <div>
                    <label className="block text-slate-400 mb-1">تعداد سفر پس از تعویض</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.tripsSinceChange || 0}
                        onChange={(e) => handleInputChange('tripsSinceChange', Number(e.target.value))}
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 font-mono">
                        {toFaDigits(formData.tripsSinceChange || 0)} سفر
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time calculated mileage difference & time summary with Item Standards Selector */}
                {(() => {
                  const curr = Number(formData.currentMileage || 0);
                  const last = Number(formData.lastChangeMileage || 0);

                  const storedRules = getStoredServiceRules();
                  const storedItems = getStoredMaintenanceItems();
                  const vRule: ServiceRule = storedRules[formData.vehicleType || vehicle.vehicleType] || storedRules.HYUNDAI || {
                    label: 'خودرو',
                    hasMileage: true,
                    maxMileage: 5000,
                    maxDays: 45,
                    maxTrips: 45,
                    warningMileage: 500,
                  };

                  // Find selected maintenance standard item
                  const activeItem = storedItems.find((it) => it.id === selectedStandardItemId) || storedItems[0];
                  // If selected item is engine_oil, use vehicle rule maxMileage if available, or item maxKm
                  const effectiveCeilingKm = (selectedStandardItemId === 'engine_oil' && vRule.hasMileage && vRule.maxMileage)
                    ? vRule.maxMileage
                    : (activeItem?.maxKm || 5000);
                  const effectiveMaxDays = (selectedStandardItemId === 'engine_oil' && vRule.maxDays)
                    ? vRule.maxDays
                    : (activeItem?.maxDays || 45);
                  const effectiveWarningKm = activeItem?.warningKm || 500;

                  const stats = calculateMileageStatus(curr, last, effectiveCeilingKm, effectiveWarningKm, formData.lastChangeDate, effectiveMaxDays);
                  const parsedDate = parseJalaaliDate(formData.lastChangeDate);
                  const nextDueDateObj = parsedDate ? addJalaaliDays(parsedDate, effectiveMaxDays) : null;
                  const nextDueDateStr = nextDueDateObj ? formatJalaaliDate(nextDueDateObj.jy, nextDueDateObj.jm, nextDueDateObj.jd) : '';

                  return (
                    <div className="space-y-2.5">
                      {/* Item Standard Selector Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#091120] p-2 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Gauge className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold">سنجش بر اساس استاندارد قطعه/سرویس:</span>
                        </div>
                        <select
                          value={selectedStandardItemId}
                          onChange={(e) => setSelectedStandardItemId(e.target.value)}
                          className="bg-[#0e172a] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                        >
                          {storedItems.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} (سقف: {toFaDigits(it.maxKm.toLocaleString())} km / {toFaDigits(it.maxDays)} روز)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4 Metric Boxes */}
                      <div className="bg-[#091120] border border-[#1b2b48] rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-[#0e172a] p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">کارکرد از آخرین سرویس</span>
                          <strong className="text-sky-300 font-mono font-bold text-xs">
                            {toFaDigits(stats.drivenKm.toLocaleString())} km
                          </strong>
                          <span className="block text-[9px] text-slate-500 mt-0.5">
                            سقف: {toFaDigits(effectiveCeilingKm.toLocaleString())} km
                          </span>
                        </div>

                        <div className="bg-[#0e172a] p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">کیلومتر سررسید بعدی</span>
                          <strong className="text-amber-300 font-mono font-bold text-xs">
                            {toFaDigits(stats.nextTargetKm.toLocaleString())} km
                          </strong>
                          <span className="block text-[9px] text-slate-500 mt-0.5">
                            مصرف: {toFaDigits(stats.wearPercent)}%
                          </span>
                        </div>

                        <div className="bg-[#0e172a] p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">
                            {stats.isInconsistent ? 'خطای کیلومتر' : stats.isOverdue ? 'اضافه پیمایش (تأخیر)' : 'باقیمانده تا سرویس'}
                          </span>
                          <strong className={stats.isInconsistent || stats.isOverdue ? 'text-rose-400 font-mono font-black text-xs' : 'text-emerald-400 font-mono font-bold text-xs'}>
                            {stats.isInconsistent
                              ? `ناهماهنگ (${toFaDigits(stats.discrepancyKm)} km)`
                              : stats.isOverdue
                              ? `+${toFaDigits(stats.overdueKm.toLocaleString())} km`
                              : `${toFaDigits(stats.remainingKm.toLocaleString())} km`}
                          </strong>
                          <span className="block text-[9px] text-slate-500 mt-0.5">
                            {stats.statusText}
                          </span>
                        </div>

                        <div className="bg-[#0e172a] p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">
                            زمان ({toFaDigits(stats.daysPassed)} از {toFaDigits(effectiveMaxDays)} روز)
                          </span>
                          <strong className="text-slate-200 font-mono text-xs">
                            {nextDueDateStr ? `سررسید: ${toFaDigits(nextDueDateStr)}` : '—'}
                          </strong>
                          <span className={`block text-[9px] mt-0.5 ${stats.isDaysOverdue ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                            {stats.isDaysOverdue ? `${toFaDigits(stats.daysOverdue)} روز تأخیر` : `${toFaDigits(stats.daysRemaining)} روز مانده`}
                          </span>
                        </div>
                      </div>

                      {/* Visual Wear Bar */}
                      <div className="bg-[#091120] p-2 rounded-xl border border-slate-800">
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              stats.isInconsistent || stats.wearPercent >= 100
                                ? 'bg-rose-500'
                                : stats.wearPercent >= 85
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${stats.isInconsistent ? 100 : stats.wearPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Oil Brand & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs pt-2">
                  <div>
                    <label className="block text-slate-400 mb-1">روغن موتور مصرفی و استاندارد</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.lastOilBrand || ''}
                        onChange={(e) => handleInputChange('lastOilBrand', e.target.value)}
                        placeholder="بهران دیزل سوپر ۱۵W۴۰"
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-200">
                        {formData.lastOilBrand || 'بهران دیزل سوپر ۱۵W۴۰'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">یادداشت فنی و نگهداری</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.notes || ''}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="توضیحات و یادداشت فنی..."
                        className="w-full bg-[#0a1120] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    ) : (
                      <div className="bg-[#0a1120] px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                        {formData.notes || 'سالم و فعال در ناوگان حمل و نقل'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              کد خودرو: <span className="font-mono text-white font-bold">{toFaDigits(vehicle.code)}</span>
            </div>

            <div className="flex items-center gap-2">
              {isEditing && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره مشخصات</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
              >
                بستن
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Laser-Optimized Vehicle Spec Print Modal with Customizable Watermark */}
      {isPrintModalOpen && (
        <VehicleSpecPrintModal
          vehicle={vehicle}
          onClose={() => setIsPrintModalOpen(false)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
