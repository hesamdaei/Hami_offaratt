import { FC, useState, FormEvent } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  FileCheck,
  Star,
  Truck,
  Edit2,
  ShieldCheck,
  FileSpreadsheet,
  X,
  Camera,
  FileText,
  UserCheck,
  CreditCard,
  HeartPulse,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { DriverDirectoryItem, DriverDocuments, VehicleItem } from '../utils/fleetSeedData';
import { toFaDigits } from '../utils/jalaali';
import { DocumentUploaderModal, DocSlot } from './DocumentUploaderModal';
import { DriverCard } from './DriverCard';
import { DriverCardPrintModal } from './DriverCardPrintModal';
import * as XLSX from 'xlsx';

const DRIVER_DOC_SLOTS: DocSlot[] = [
  {
    key: 'avatarPhoto',
    label: 'عکس پرسنلی راننده',
    subLabel: 'تصویر پرسنلی جهت صدور کارت ورود و احراز هویت',
    icon: Camera,
  },
  {
    key: 'nationalCard',
    label: 'تصویر کارت ملی هوشمند',
    subLabel: 'روی کارت ملی جهت راستی‌آزمایی هویتی',
    icon: CreditCard,
  },
  {
    key: 'licenseCard',
    label: 'تصویر گواهینامه رانندگی',
    subLabel: 'گواهینامه پایه یک، دو یا سه معتبر',
    icon: FileText,
  },
  {
    key: 'smartCard',
    label: 'کارت هوشمند راننده (سازمان راهداری)',
    subLabel: 'کارت هوشمند فعال ناوگان باری کشور',
    icon: ShieldCheck,
  },
  {
    key: 'healthCard',
    label: 'کارت سلامت و طب کار',
    subLabel: 'تاییدیه معاینات پزشکی و عدم اعتیاد',
    icon: HeartPulse,
  },
];

interface DriversDirectoryViewProps {
  drivers: DriverDirectoryItem[];
  vehicles?: VehicleItem[];
  onAddDriver: (driver: DriverDirectoryItem) => void;
  onUpdateDriver: (driver: DriverDirectoryItem) => void;
  onAssignVehicleToDriver?: (driverId: string, vehiclePlateOrNone: string) => void;
  onOpenBaleForDriver?: (driver: DriverDirectoryItem) => void;
  onOpenEitaaForDriver?: (driver: DriverDirectoryItem) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DriversDirectoryView: FC<DriversDirectoryViewProps> = ({
  drivers,
  vehicles = [],
  onAddDriver,
  onUpdateDriver,
  onAssignVehicleToDriver,
  onOpenBaleForDriver,
  onOpenEitaaForDriver,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Register Modal & Tab
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverDirectoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'LICENSE' | 'BANK' | 'EMERGENCY'>('PERSONAL');

  // Document uploader modal
  const [viewingDocsDriver, setViewingDocsDriver] = useState<DriverDirectoryItem | null>(null);
  const [printingDriver, setPrintingDriver] = useState<DriverDirectoryItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    nationalCode: '',
    licenseNumber: '',
    driverType: 'EMPLOYED' as 'EMPLOYED' | 'CONTRACTOR' | 'EXTERNAL',
    status: 'AVAILABLE' as 'AVAILABLE' | 'ON_MISSION' | 'ON_LEAVE' | 'OFF_DUTY',
    sheba: 'IR000000000000000000000000',
    emergencyName: '',
    emergencyPhone: '',
    assignedVehicle: '',
  });

  const filtered = drivers.filter((d) => {
    const matchSearch =
      d.name.includes(search) ||
      d.phone.includes(search) ||
      d.code.includes(search) ||
      d.nationalCode.includes(search);
    const matchType = filterType === 'ALL' || d.driverType === filterType;
    const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      code: String(drivers.length + 1),
      phone: '',
      nationalCode: '',
      licenseNumber: '',
      driverType: 'EMPLOYED',
      status: 'AVAILABLE',
      sheba: 'IR',
      emergencyName: '',
      emergencyPhone: '',
      assignedVehicle: '',
    });
    setActiveTab('PERSONAL');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: DriverDirectoryItem) => {
    setEditingDriver(d);
    setFormData({
      name: d.name,
      code: d.code,
      phone: d.phone,
      nationalCode: d.nationalCode,
      licenseNumber: d.licenseNumber,
      driverType: d.driverType,
      status: d.status as any,
      sheba: 'IR650170000000123456789012',
      emergencyName: 'بستگان درجه یک',
      emergencyPhone: '09120000000',
      assignedVehicle: d.assignedVehicles[0] || '',
    });
    setActiveTab('PERSONAL');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      const updated: DriverDirectoryItem = {
        ...editingDriver,
        name: formData.name,
        code: formData.code,
        phone: formData.phone,
        nationalCode: formData.nationalCode,
        licenseNumber: formData.licenseNumber,
        driverType: formData.driverType,
        status: formData.status,
        assignedVehicles: formData.assignedVehicle ? [formData.assignedVehicle] : [],
      };
      onUpdateDriver(updated);
      if (formData.assignedVehicle !== (editingDriver.assignedVehicles?.[0] || '')) {
        onAssignVehicleToDriver?.(editingDriver.id, formData.assignedVehicle || 'NONE');
      }
    } else {
      const newDriver: DriverDirectoryItem = {
        id: `drv-${Date.now()}`,
        name: formData.name,
        code: formData.code || String(drivers.length + 1),
        phone: formData.phone,
        nationalCode: formData.nationalCode || '0012345678',
        licenseNumber: formData.licenseNumber || 'LIC-100',
        driverType: formData.driverType,
        status: formData.status,
        rating: 5.0,
        totalTrips: 0,
        assignedVehicles: formData.assignedVehicle ? [formData.assignedVehicle] : [],
      };
      onAddDriver(newDriver);
      if (formData.assignedVehicle) {
        onAssignVehicleToDriver?.(newDriver.id, formData.assignedVehicle);
      }
    }
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filtered.map((d) => ({
      'کد پرسنلی': d.code,
      'نام و نام خانوادگی': d.name,
      'شماره تماس': d.phone,
      'کد ملی': d.nationalCode,
      'شماره گواهینامه': d.licenseNumber,
      'نوع قرارداد':
        d.driverType === 'EMPLOYED'
          ? 'استخدامی شرکت'
          : d.driverType === 'CONTRACTOR'
          ? 'پیمانکاری'
          : 'راننده کمکی',
      'وضعیت فعالیت':
        d.status === 'AVAILABLE'
          ? 'آماده به کار'
          : d.status === 'ON_MISSION'
          ? 'در مأموریت'
          : d.status === 'ON_LEAVE'
          ? 'مرخصی'
          : 'غیرفعال',
      'امتیاز عملکرد': d.rating,
      'تعداد سفرهای انجام شده': d.totalTrips,
      'خودروهای تحت اختیار': d.assignedVehicles.join(' - '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'رانندگان حامی بار');
    XLSX.writeFile(workbook, `لیست_رانندگان_حامی_بار_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجوی راننده با نام، کدملی، شماره تماس، کد پرسنلی..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-sm rounded-lg pr-9 pl-4 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">همه قراردادها</option>
            <option value="EMPLOYED">استخدامی رسمی</option>
            <option value="CONTRACTOR">پیمانکاری</option>
            <option value="EXTERNAL">کمکی / آزاد</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="AVAILABLE">آماده به کار</option>
            <option value="ON_MISSION">در مأموریت</option>
            <option value="ON_LEAVE">در مرخصی</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>خروجی اکسل</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="چاپ کل صفحه و کارت‌های رانندگان روی کاغذ سفید بدون پس‌زمینه تیره"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>چاپ کارت‌ها و فهرست</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>ثبت پرونده راننده جدید</span>
          </button>
        </div>
      </div>

      {/* Drivers Grid (Using Redesigned High-Contrast, Laser-Ready DriverCard) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => (
          <DriverCard
            key={d.id}
            driver={d}
            vehicles={vehicles}
            onAssignVehicle={(drv, plate) => onAssignVehicleToDriver?.(drv.id, plate)}
            onUnassignVehicle={(drv) => onAssignVehicleToDriver?.(drv.id, 'NONE')}
            onEdit={handleOpenEdit}
            onViewDocuments={setViewingDocsDriver}
            onOpenBale={onOpenBaleForDriver}
            onOpenEitaa={onOpenEitaaForDriver}
            onPrintCard={setPrintingDriver}
            onShowToast={onShowToast}
          />
        ))}
      </div>

      {/* Multi-Tab Register / Edit Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  {editingDriver ? `ویرایش پرونده راننده: ${editingDriver.name}` : 'تشکیل پرونده راننده جدید'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Tabs */}
            <div className="flex border-b border-[#1f2c45] bg-[#0a101f] text-xs font-semibold text-slate-400">
              <button
                type="button"
                onClick={() => setActiveTab('PERSONAL')}
                className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 ${
                  activeTab === 'PERSONAL'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                مشخصات فردی
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('LICENSE')}
                className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 ${
                  activeTab === 'LICENSE'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                گواهینامه و مدارک
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('BANK')}
                className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 ${
                  activeTab === 'BANK'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                حساب بانکی و تسویه
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EMERGENCY')}
                className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 ${
                  activeTab === 'EMERGENCY'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                تماس اضطراری
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {activeTab === 'PERSONAL' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">نام و نام خانوادگی</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">کد پرسنلی</label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">شماره تلفن همراه</label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0912..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">کد ملی</label>
                      <input
                        type="text"
                        value={formData.nationalCode}
                        onChange={(e) => setFormData({ ...formData, nationalCode: e.target.value })}
                        placeholder="0012345678"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">نوع همکاری</label>
                      <select
                        value={formData.driverType}
                        onChange={(e) => setFormData({ ...formData, driverType: e.target.value as any })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="EMPLOYED">استخدامی رسمی شرکت</option>
                        <option value="CONTRACTOR">راننده پیمانکاری</option>
                        <option value="EXTERNAL">راننده آزاد / کمکی</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">خودروی اختصاصی تحویلی</label>
                      <select
                        value={formData.assignedVehicle}
                        onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">— فاقد خودروی اختصاصی (آزاد) —</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.plateNumber}>
                            کد {toFaDigits(v.code)} | {v.plateNumber} ({v.model || v.vehicleType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'LICENSE' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">شماره گواهینامه</label>
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        placeholder="LIC-998811"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">پایه گواهینامه</label>
                      <select className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                        <option value="BASE_1">پایه یکم (سنگین و تریلی)</option>
                        <option value="BASE_2">پایه دوم (کامیونت و خاور)</option>
                        <option value="BASE_3">پایه سوم (وانت و نیسان)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a101f] border border-[#1f2c45] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                      <span>کارت سلامت و هوشمند راننده معتبر است</span>
                    </div>
                    <span className="text-slate-400 font-mono">1405/10/20</span>
                  </div>
                </div>
              )}

              {activeTab === 'BANK' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-slate-400 mb-1">شماره شبا (IBAN)</label>
                    <input
                      type="text"
                      value={formData.sheba}
                      onChange={(e) => setFormData({ ...formData, sheba: e.target.value })}
                      placeholder="IR..."
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">نام بانک</label>
                      <input
                        type="text"
                        defaultValue="بانک ملت"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">صاحب حساب</label>
                      <input
                        type="text"
                        value={formData.name}
                        readOnly
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-400 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'EMERGENCY' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">نام بستگان اضطراری</label>
                      <input
                        type="text"
                        value={formData.emergencyName}
                        onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                        placeholder="نام همسر یا پدر"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">تلفن تماس اضطراری</label>
                      <input
                        type="text"
                        value={formData.emergencyPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                        placeholder="0912..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1f2c45]">
                <div className="flex items-center gap-1">
                  {activeTab !== 'PERSONAL' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'LICENSE') setActiveTab('PERSONAL');
                        if (activeTab === 'BANK') setActiveTab('LICENSE');
                        if (activeTab === 'EMERGENCY') setActiveTab('BANK');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                    >
                      مرحله قبل
                    </button>
                  )}
                  {activeTab !== 'EMERGENCY' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'PERSONAL') setActiveTab('LICENSE');
                        if (activeTab === 'LICENSE') setActiveTab('BANK');
                        if (activeTab === 'BANK') setActiveTab('EMERGENCY');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 text-xs"
                    >
                      مرحله بعد
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30"
                  >
                    {editingDriver ? 'ذخیره پرونده' : 'تکمیل و ثبت راننده'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Document & Photo Uploader Modal */}
      {viewingDocsDriver && (
        <DocumentUploaderModal
          isOpen={true}
          title={`مدارک و تصاویر هویتی: ${viewingDocsDriver.name}`}
          subTitle={`کد پرسنلی: ${toFaDigits(viewingDocsDriver.code)} | کدملی: ${toFaDigits(viewingDocsDriver.nationalCode)} | تماس: ${toFaDigits(viewingDocsDriver.phone)}`}
          slots={DRIVER_DOC_SLOTS}
          documents={(viewingDocsDriver.documents as any) || {}}
          onSave={(updatedDocs) => {
            const updatedDriver: DriverDirectoryItem = {
              ...viewingDocsDriver,
              documents: updatedDocs as any,
              avatarUrl: updatedDocs.avatarPhoto,
            };
            onUpdateDriver(updatedDriver);
            setViewingDocsDriver(updatedDriver);
          }}
          onClose={() => setViewingDocsDriver(null)}
        />
      )}

      {/* Official Driver ID Card Print Modal (Laser Optimized: 100% White Paper, Zero Dark Bleed) */}
      {printingDriver && (
        <DriverCardPrintModal
          driver={printingDriver}
          onClose={() => setPrintingDriver(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
