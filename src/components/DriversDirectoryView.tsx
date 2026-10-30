import { FC, useState, useMemo, FormEvent } from 'react';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  Calendar,
  Send,
} from 'lucide-react';
import { DriverDirectoryItem, DriverDocuments, VehicleItem } from '../utils/fleetSeedData';
import { toFaDigits } from '../utils/jalaali';
import { DocumentUploaderModal, DocSlot } from './DocumentUploaderModal';
import { DriverCard } from './DriverCard';
import { DriverCardPrintModal } from './DriverCardPrintModal';
import { IranianPlate } from './IranianPlate';
import { TableListA4PrintModal, TableListColumn } from './TableListA4PrintModal';
import { VoipPhoneButton } from './VoipPhoneButton';
import * as XLSX from 'xlsx';

export type DriverSortField =
  | 'personnelCode'
  | 'joinedDate'
  | 'status'
  | 'name'
  | 'rating'
  | 'totalTrips'
  | 'driverType'
  | 'phone'
  | 'nationalCode'
  | 'vehicleCode';

export type DriverSortDirection = 'asc' | 'desc';

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
  onOpenHandover?: (driver: DriverDirectoryItem) => void;
  onCallPhone?: (phone: string, name?: string, role?: string) => void;
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
  onOpenHandover,
  onCallPhone,
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

  // View mode & Sort State
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [sortField, setSortField] = useState<DriverSortField>('personnelCode');
  const [sortDirection, setSortDirection] = useState<DriverSortDirection>('asc');
  const [isPrintListOpen, setIsPrintListOpen] = useState(false);

  const handleToggleSort = (field: DriverSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const driverPrintColumns: TableListColumn<DriverDirectoryItem>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'کد پرسنلی',
        width: '9%',
        align: 'center',
        render: (d) => toFaDigits(d.personnelCode || d.code),
      },
      {
        key: 'name',
        header: 'نام و نام خانوادگی',
        width: '18%',
        align: 'right',
        render: (d) => <span className="font-bold text-slate-950">{d.name}</span>,
      },
      {
        key: 'phone',
        header: 'شماره تماس',
        width: '13%',
        align: 'center',
        render: (d) => <span className="font-mono">{toFaDigits(d.phone)}</span>,
      },
      {
        key: 'nationalCode',
        header: 'کد ملی',
        width: '12%',
        align: 'center',
        render: (d) => <span className="font-mono">{toFaDigits(d.nationalCode)}</span>,
      },
      {
        key: 'licenseNumber',
        header: 'شماره گواهینامه',
        width: '12%',
        align: 'center',
        render: (d) => <span className="font-mono">{d.licenseNumber || '—'}</span>,
      },
      {
        key: 'driverType',
        header: 'نوع قرارداد',
        width: '11%',
        align: 'center',
        render: (d) =>
          d.driverType === 'EMPLOYED'
            ? 'استخدامی رسمی'
            : d.driverType === 'CONTRACTOR'
            ? 'پیمانکاری'
            : 'راننده کمکی',
      },
      {
        key: 'status',
        header: 'وضعیت',
        width: '10%',
        align: 'center',
        render: (d) =>
          d.status === 'AVAILABLE'
            ? 'آماده به کار'
            : d.status === 'ON_MISSION'
            ? 'در مأموریت'
            : 'در مرخصی',
      },
      {
        key: 'assignedVehicles',
        header: 'خودروی تحت اختیار',
        width: '15%',
        align: 'center',
        render: (d) =>
          d.assignedVehicles && d.assignedVehicles.length > 0
            ? d.assignedVehicles.join(' - ')
            : 'بدون خودرو',
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        d.name.includes(search) ||
        (d.phone && d.phone.includes(search)) ||
        (d.code && d.code.includes(search)) ||
        (d.personnelCode && d.personnelCode.includes(search)) ||
        (d.nationalCode && d.nationalCode.includes(search));
      const matchType = filterType === 'ALL' || d.driverType === filterType;
      const matchStatus = filterStatus === 'ALL' || d.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [drivers, search, filterType, filterStatus]);

  const sortedDrivers = useMemo(() => {
    const STATUS_PRIORITY: Record<string, number> = {
      AVAILABLE: 1,
      available: 1,
      active: 1,
      ACTIVE: 1,
      ON_MISSION: 2,
      mission: 2,
      ON_LEAVE: 3,
      leave: 3,
      OFF_DUTY: 4,
      inactive: 4,
      INACTIVE: 4,
    };

    const list = [...filtered];
    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'personnelCode': {
          const codeA = parseInt(a.personnelCode || a.code || '0', 10);
          const codeB = parseInt(b.personnelCode || b.code || '0', 10);
          if (!isNaN(codeA) && !isNaN(codeB)) {
            comparison = codeA - codeB;
          } else {
            comparison = (a.personnelCode || a.code || '').localeCompare(b.personnelCode || b.code || '', 'fa');
          }
          break;
        }
        case 'joinedDate':
          comparison = (a.joinedDate || '').localeCompare(b.joinedDate || '');
          break;
        case 'status': {
          const sA = STATUS_PRIORITY[a.status || 'AVAILABLE'] || 99;
          const sB = STATUS_PRIORITY[b.status || 'AVAILABLE'] || 99;
          comparison = sA - sB;
          break;
        }
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '', 'fa');
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'totalTrips': {
          const tA = a.totalTrips || a.tripsCount || 0;
          const tB = b.totalTrips || b.tripsCount || 0;
          comparison = tA - tB;
          break;
        }
        case 'driverType':
          comparison = (a.driverType || '').localeCompare(b.driverType || '', 'fa');
          break;
        case 'phone':
          comparison = (a.phone || '').localeCompare(b.phone || '', 'fa');
          break;
        case 'nationalCode':
          comparison = (a.nationalCode || '').localeCompare(b.nationalCode || '', 'fa');
          break;
        case 'vehicleCode': {
          const vehA = a.assignedVehicles?.[0] || '';
          const vehB = b.assignedVehicles?.[0] || '';
          comparison = vehA.localeCompare(vehB, 'fa');
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortDirection]);

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'رانندگان حامی');
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

          {/* Quick Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#0a101f] border border-[#1f2c45] rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">مرتب‌سازی:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as DriverSortField)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="personnelCode" className="bg-[#0f172a]">کد پرسنلی</option>
              <option value="name" className="bg-[#0f172a]">نام و نام خانوادگی</option>
              <option value="joinedDate" className="bg-[#0f172a]">تاریخ پیوستن / استخدام</option>
              <option value="status" className="bg-[#0f172a]">وضعیت کاری</option>
              <option value="driverType" className="bg-[#0f172a]">نوع قرارداد</option>
              <option value="phone" className="bg-[#0f172a]">شماره تماس</option>
              <option value="nationalCode" className="bg-[#0f172a]">کد ملی</option>
              <option value="vehicleCode" className="bg-[#0f172a]">خودروی تحت اختیار</option>
              <option value="rating" className="bg-[#0f172a]">امتیاز عملکرد</option>
              <option value="totalTrips" className="bg-[#0f172a]">تعداد سفرها</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="p-1 rounded bg-[#172542] hover:bg-slate-700 text-amber-400 transition cursor-pointer"
              title={sortDirection === 'asc' ? 'صعودی (کلیک جهت معکوس کردن)' : 'نزولی (کلیک جهت معکوس کردن)'}
            >
              {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0a101f] border border-[#1f2c45] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="نمایش در قالب جدول تفصیلی"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">جدول</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="نمایش در قالب کارت‌ها"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">کارت‌ها</span>
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>خروجی اکسل</span>
          </button>

          {/* Print List Button (Standard A4 Table List without web headers) */}
          <button
            type="button"
            onClick={() => setIsPrintListOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="چاپ لیست جدول رانندگان با استایل رسمی A4 بدون هدرهای سایت"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            <span>چاپ لیست</span>
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

      {/* Main Drivers List: Either Table View or Cards Grid */}
      {viewMode === 'TABLE' ? (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#0c1424] text-slate-300 border-b border-[#1f2c45] font-semibold select-none">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>

                  <th
                    onClick={() => handleToggleSort('personnelCode')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس کد پرسنلی"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>کد پرسنلی</span>
                      {sortField === 'personnelCode' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:bg-[#152238] transition-colors min-w-[170px]"
                    title="کلیک برای مرتب‌سازی بر اساس نام راننده"
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>نام و نام خانوادگی</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('joinedDate')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس تاریخ پیوستن"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>تاریخ پیوستن</span>
                      {sortField === 'joinedDate' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('status')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس وضعیت کاری"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>وضعیت کاری</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('driverType')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس نوع قرارداد"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>نوع قرارداد</span>
                      {sortField === 'driverType' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('phone')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس شماره تماس"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>شماره تماس</span>
                      {sortField === 'phone' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('nationalCode')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس کد ملی"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>کد ملی</span>
                      {sortField === 'nationalCode' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('vehicleCode')}
                    className="py-3 px-3 text-center min-w-[145px] cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس خودروی تحت اختیار"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>خودروی تحت اختیار</span>
                      {sortField === 'vehicleCode' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('rating')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس امتیاز و سفرها"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>امتیاز / سفر</span>
                      {sortField === 'rating' || sortField === 'totalTrips' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-3.5 text-center w-48">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172338]">
                {sortedDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      راننده‌ای مطابق با فیلترهای جستجو یافت نشد.
                    </td>
                  </tr>
                ) : (
                  sortedDrivers.map((d, idx) => {
                    const assignedPlate = d.assignedVehicles?.[0];
                    const matchedVeh = assignedPlate ? vehicles.find((v) => v.plateNumber === assignedPlate) : undefined;
                    const avatarSrc = d.avatarUrl || d.documents?.avatarPhoto;

                    const isAvailable = d.status === 'AVAILABLE' || d.status === 'available' || d.status === 'active';
                    const isMission = d.status === 'ON_MISSION' || d.status === 'mission';
                    const isLeave = d.status === 'ON_LEAVE' || d.status === 'leave';

                    return (
                      <tr key={d.id} className="hover:bg-[#152238] transition-colors text-slate-200">
                        {/* Row Index */}
                        <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {toFaDigits(idx + 1)}
                        </td>

                        {/* Personnel Code */}
                        <td className="py-3 px-3 text-center font-mono font-black text-amber-400 text-sm">
                          {toFaDigits(d.personnelCode || d.code || '')}
                        </td>

                        {/* Driver Name & Avatar */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                              {avatarSrc ? (
                                <img src={avatarSrc} alt={d.name} className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate">
                                {d.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                گواهینامه: {toFaDigits(d.licenseNumber || '---')}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-300">
                          {d.joinedDate ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{toFaDigits(d.joinedDate)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">۱۴۰۵/۰۱/۱۵</span>
                          )}
                        </td>

                        {/* Work Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isAvailable
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : isMission
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : isLeave
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAvailable
                                  ? 'bg-emerald-400'
                                  : isMission
                                  ? 'bg-blue-400 animate-pulse'
                                  : isLeave
                                  ? 'bg-amber-400'
                                  : 'bg-slate-500'
                              }`}
                            />
                            <span>
                              {isAvailable
                                ? 'آماده به کار'
                                : isMission
                                ? 'در مأموریت'
                                : isLeave
                                ? 'در مرخصی'
                                : 'غیرفعال'}
                            </span>
                          </span>
                        </td>

                        {/* Contract Type */}
                        <td className="py-3 px-3 text-center text-[11px] text-slate-400">
                          {d.driverType === 'EMPLOYED'
                            ? 'استخدامی'
                            : d.driverType === 'CONTRACTOR'
                            ? 'پیمانکاری'
                            : 'کمکی / آزاد'}
                        </td>

                        {/* Phone with VoIP Click-to-Call */}
                        <td className="py-3 px-3 text-center">
                          <VoipPhoneButton
                            phone={d.phone}
                            name={d.name}
                            role={`راننده (${toFaDigits(d.personnelCode || d.code || '')})`}
                            variant="table-cell"
                            showCopy={false}
                            onCall={onCallPhone}
                          />
                        </td>

                        {/* National ID */}
                        <td className="py-3 px-3 text-center font-mono text-slate-300 text-xs">
                          {toFaDigits(d.nationalCode || '---')}
                        </td>

                        {/* Assigned Vehicle */}
                        <td className="py-3 px-3 text-center">
                          {assignedPlate ? (
                            <div className="flex flex-col items-center gap-1">
                              <IranianPlate plateNumber={assignedPlate} size="sm" />
                              {matchedVeh && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  کد {toFaDigits(matchedVeh.code)} ({matchedVeh.vehicleType})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">فاقد خودرو</span>
                          )}
                        </td>

                        {/* Rating & Trips */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-amber-400 font-mono text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{toFaDigits(d.rating || 5.0)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {toFaDigits(d.totalTrips || d.tripsCount || 0)} سفر
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(d)}
                              className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition cursor-pointer"
                              title="ویرایش پرونده راننده"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {onOpenHandover && (
                              <button
                                type="button"
                                onClick={() => onOpenHandover(d)}
                                className="p-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 transition cursor-pointer"
                                title="صدور یا مشاهده برگه تحویل خودروی این راننده"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setViewingDocsDriver(d)}
                              className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                              title="مدارک و اسناد هویتی"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintingDriver(d)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                              title="چاپ کارت هوشمند راننده"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {onOpenBaleForDriver && (
                              <button
                                type="button"
                                onClick={() => onOpenBaleForDriver(d)}
                                className="p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
                                title="ارسال پیامک و اعلان پیام‌رسان بله"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Drivers Grid (Using Redesigned High-Contrast, Laser-Ready DriverCard) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedDrivers.map((d) => (
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
              onCallPhone={onCallPhone}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      )}

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

      {/* Official Table List A4 Print Modal (Zero Web Headers, Standard A4 Layout) */}
      <TableListA4PrintModal<DriverDirectoryItem>
        isOpen={isPrintListOpen}
        onClose={() => setIsPrintListOpen(false)}
        title="فهرست و گزارش رسمی رانندگان ناوگان"
        subtitle="مشخصات فردی، احراز هویت، شماره تماس، وضعیت کاری و خودروی تحت اختیار"
        categoryBadge="واحد ترابری و لجستیک"
        columns={driverPrintColumns}
        data={sortedDrivers}
        defaultOrientation="landscape"
        companyName="شرکت ترابری و لجستیک صداقت بار پیشرو"
        summaryCards={[
          { label: 'کل رانندگان', value: drivers.length },
          { label: 'آماده به کار', value: drivers.filter((d) => d.status === 'AVAILABLE').length },
          { label: 'در مأموریت', value: drivers.filter((d) => d.status === 'ON_MISSION').length },
          { label: 'در مرخصی', value: drivers.filter((d) => d.status === 'ON_LEAVE').length },
          { label: 'استخدامی رسمی', value: drivers.filter((d) => d.driverType === 'EMPLOYED').length },
          {
            label: 'دارای خودرو',
            value: drivers.filter((d) => d.assignedVehicles && d.assignedVehicles.length > 0).length,
          },
        ]}
      />
    </div>
  );
};
