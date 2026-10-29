import { FC, useState, useMemo, FormEvent } from 'react';
import {
  Truck,
  Search,
  Plus,
  FileSpreadsheet,
  Edit2,
  UserCheck,
  UserX,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  X,
  Phone,
  ShieldCheck,
  Calendar,
  Image as ImageIcon,
  Camera,
  Sparkles,
  History,
  Layers,
  ParkingSquare,
  Navigation,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  List,
  LayoutGrid,
  Printer,
} from 'lucide-react';
import {
  VehicleItem,
  VehicleStatusHistoryRecord,
  VEHICLE_TYPE_NAMES,
  VehicleDocuments,
} from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { PlateInput } from './PlateInput';
import { toFaDigits } from '../utils/jalaali';
import { DocumentUploaderModal, DocSlot, VEHICLE_FULL_SLOTS } from './DocumentUploaderModal';
import { EndOfWorkModal } from './EndOfWorkModal';
import { VehicleStatusModal, SearchableDriverSelect } from './VehicleStatusModal';
import { PersianDatePicker } from './PersianDatePicker';
import { TableListA4PrintModal, TableListColumn } from './TableListA4PrintModal';
import * as XLSX from 'xlsx';

const VEHICLE_DOC_SLOTS = VEHICLE_FULL_SLOTS;

export type VehicleSortField =
  | 'code'
  | 'plateNumber'
  | 'vehicleType'
  | 'driverName'
  | 'status'
  | 'readyTime'
  | 'lastStatusDate'
  | 'thirdPartyExpiry'
  | 'inspectionExpiry'
  | 'bodyInsExpiry';

export type SortDirection = 'asc' | 'desc';

interface FleetManagementViewProps {
  vehicles: VehicleItem[];
  onUpdateVehicle: (updated: VehicleItem) => void;
  onAddVehicle: (newVehicle: VehicleItem) => void;
  onDeleteVehicle?: (id: string) => void;
}

export const FleetManagementView: FC<FleetManagementViewProps> = ({
  vehicles,
  onUpdateVehicle,
  onAddVehicle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [onlyExpiring, setOnlyExpiring] = useState(false);
  const [viewMode, setViewMode] = useState<'FLEET_LIST' | 'HISTORY_LOG'>('FLEET_LIST');
  // Sub display mode: Row Table vs Cards
  const [fleetDisplayMode, setFleetDisplayMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
  const [assigningVehicle, setAssigningVehicle] = useState<VehicleItem | null>(null);
  const [viewingDocsVehicle, setViewingDocsVehicle] = useState<VehicleItem | null>(null);
  const [statusVehicle, setStatusVehicle] = useState<VehicleItem | null>(null);
  const [endOfWorkVehicle, setEndOfWorkVehicle] = useState<VehicleItem | null>(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState<Partial<VehicleItem>>({
    code: 0,
    plateNumber: '',
    vehicleType: 'KHAAVAR',
    driverName: 'بدون راننده',
    driverPhone: '',
    status: 'ACTIVE',
    insuranceExpiry: '1405/06/01',
    inspectionExpiry: '1405/06/01',
    thirdPartyExpiry: '1405/06/01',
  });

  // Assign modal state
  const [assignDriverName, setAssignDriverName] = useState('');
  const [assignDriverPhone, setAssignDriverPhone] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<VehicleSortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleToggleSort = (field: VehicleSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.code.toString().includes(searchQuery) ||
        v.driverName.includes(searchQuery) ||
        v.driverPhone.includes(searchQuery) ||
        v.plateNumber.includes(searchQuery) ||
        (VEHICLE_TYPE_NAMES[v.vehicleType] && VEHICLE_TYPE_NAMES[v.vehicleType].includes(searchQuery));

      const matchType = selectedType === 'ALL' || v.vehicleType === selectedType;
      const matchStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'UNASSIGNED' && (!v.driverName || v.driverName === 'بدون راننده')) ||
        v.status === selectedStatus;

      const isSoonExpiring =
        v.inspectionExpiry.startsWith('1405/04') ||
        v.inspectionExpiry.startsWith('1405/05') ||
        v.thirdPartyExpiry.startsWith('1405/04') ||
        v.thirdPartyExpiry.startsWith('1405/05');

      const matchExpiring = !onlyExpiring || isSoonExpiring;

      return matchSearch && matchType && matchStatus && matchExpiring;
    });
  }, [vehicles, searchQuery, selectedType, selectedStatus, onlyExpiring]);

  // Smart Sorted vehicles
  const sortedVehicles = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = {
      ACTIVE: 1,
      IN_MISSION: 2,
      PARKING: 3,
      IN_MAINTENANCE: 4,
    };

    const list = [...filteredVehicles];
    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'code':
          comparison = (a.code || 0) - (b.code || 0);
          break;
        case 'plateNumber':
          comparison = (a.plateNumber || '').localeCompare(b.plateNumber || '', 'fa');
          break;
        case 'vehicleType':
          comparison = (VEHICLE_TYPE_NAMES[a.vehicleType] || a.vehicleType).localeCompare(
            VEHICLE_TYPE_NAMES[b.vehicleType] || b.vehicleType,
            'fa'
          );
          break;
        case 'driverName': {
          const isAUnassigned = !a.driverName || a.driverName === 'بدون راننده';
          const isBUnassigned = !b.driverName || b.driverName === 'بدون راننده';
          if (isAUnassigned && !isBUnassigned) comparison = 1;
          else if (!isAUnassigned && isBUnassigned) comparison = -1;
          else comparison = (a.driverName || '').localeCompare(b.driverName || '', 'fa');
          break;
        }
        case 'status': {
          const orderA = STATUS_ORDER[a.status] || 99;
          const orderB = STATUS_ORDER[b.status] || 99;
          comparison = orderA - orderB;
          break;
        }
        case 'readyTime': {
          const tA = `${a.readyDate || ''} ${a.readyTime || ''}`;
          const tB = `${b.readyDate || ''} ${b.readyTime || ''}`;
          comparison = tA.localeCompare(tB);
          break;
        }
        case 'lastStatusDate': {
          const dA = `${a.lastStatusDate || ''} ${a.lastStatusTime || ''}`;
          const dB = `${b.lastStatusDate || ''} ${b.lastStatusTime || ''}`;
          comparison = dA.localeCompare(dB);
          break;
        }
        case 'thirdPartyExpiry':
          comparison = (a.thirdPartyExpiry || a.insuranceExpiry || '').localeCompare(
            b.thirdPartyExpiry || b.insuranceExpiry || ''
          );
          break;
        case 'inspectionExpiry':
          comparison = (a.inspectionExpiry || '').localeCompare(b.inspectionExpiry || '');
          break;
        case 'bodyInsExpiry':
          comparison = (a.bodyInsExpiry || '').localeCompare(b.bodyInsExpiry || '');
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredVehicles, sortField, sortDirection]);

  // Statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.status === 'ACTIVE').length;
    const inMission = vehicles.filter((v) => v.status === 'IN_MISSION').length;
    const inParking = vehicles.filter((v) => v.status === 'PARKING').length;
    const inRepair = vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length;
    const unassigned = vehicles.filter((v) => !v.driverName || v.driverName === 'بدون راننده').length;
    const expiringCount = vehicles.filter(
      (v) =>
        v.inspectionExpiry.startsWith('1405/04') ||
        v.inspectionExpiry.startsWith('1405/05') ||
        v.thirdPartyExpiry.startsWith('1405/04')
    ).length;

    return { total, active, inMission, inParking, inRepair, unassigned, expiringCount };
  }, [vehicles]);

  const [isPrintListOpen, setIsPrintListOpen] = useState(false);

  // Print Columns for Fleet A4 List
  const fleetPrintColumns: TableListColumn<VehicleItem>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'کد ناوگان',
        width: '8%',
        align: 'center',
        render: (v) => <span className="font-bold text-slate-950 font-mono">{toFaDigits(v.code)}</span>,
      },
      {
        key: 'plateNumber',
        header: 'پلاک انتظامی',
        width: '18%',
        align: 'center',
        render: (v) => <span className="font-bold font-mono">{toFaDigits(v.plateNumber)}</span>,
      },
      {
        key: 'vehicleType',
        header: 'نوع خودرو',
        width: '12%',
        align: 'center',
        render: (v) => VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType,
      },
      {
        key: 'driverName',
        header: 'راننده تحت اختیار',
        width: '18%',
        align: 'right',
        render: (v) => (
          <span
            className={`font-semibold ${
              !v.driverName || v.driverName === 'بدون راننده' ? 'text-amber-800' : 'text-slate-950'
            }`}
          >
            {v.driverName || 'بدون راننده'}
          </span>
        ),
      },
      {
        key: 'driverPhone',
        header: 'شماره تماس',
        width: '13%',
        align: 'center',
        render: (v) => <span className="font-mono">{v.driverPhone ? toFaDigits(v.driverPhone) : '—'}</span>,
      },
      {
        key: 'status',
        header: 'وضعیت عملیاتی',
        width: '11%',
        align: 'center',
        render: (v) =>
          v.status === 'ACTIVE'
            ? 'آماده به کار'
            : v.status === 'IN_MISSION'
            ? 'در مأموریت'
            : v.status === 'PARKING'
            ? 'پارکینگ'
            : v.status === 'IN_MAINTENANCE'
            ? 'تعمیرگاه'
            : 'غیرفعال',
      },
      {
        key: 'thirdPartyExpiry',
        header: 'بیمه شخص ثالث',
        width: '10%',
        align: 'center',
        render: (v) => <span className="font-mono">{toFaDigits(v.thirdPartyExpiry || '—')}</span>,
      },
      {
        key: 'inspectionExpiry',
        header: 'معاینه فنی',
        width: '10%',
        align: 'center',
        render: (v) => <span className="font-mono">{toFaDigits(v.inspectionExpiry || '—')}</span>,
      },
    ],
    []
  );

  const fleetPrintSummaryCards = useMemo(
    () => [
      { label: 'کل ناوگان', value: `${toFaDigits(stats.total)} دستگاه`, color: 'text-blue-900' },
      { label: 'آماده به کار', value: `${toFaDigits(stats.active)} دستگاه`, color: 'text-emerald-900' },
      { label: 'در مأموریت', value: `${toFaDigits(stats.inMission)} دستگاه`, color: 'text-sky-900' },
      { label: 'تعمیرگاه / سرویس', value: `${toFaDigits(stats.inRepair)} دستگاه`, color: 'text-amber-900' },
      { label: 'بدون راننده', value: `${toFaDigits(stats.unassigned)} دستگاه`, color: 'text-rose-900' },
    ],
    [stats]
  );

  // Aggregate fleet history across all vehicles (matching legacy Sedaqat Bar history ledger)
  const allFleetHistory = useMemo(() => {
    const list: VehicleStatusHistoryRecord[] = [];
    vehicles.forEach((v) => {
      if (v.history && v.history.length > 0) {
        list.push(...v.history);
      } else {
        list.push({
          id: `hist-${v.code}-default`,
          rowNumber: 1,
          date: v.lastStatusDate || '1405/06/12',
          time: v.lastStatusTime || '19:20',
          status: v.status as any,
          statusTitle:
            v.status === 'ACTIVE'
              ? 'آماده به کار'
              : v.status === 'IN_MISSION'
              ? 'در حال مأموریت'
              : v.status === 'PARKING'
              ? 'پارکینگ'
              : v.status === 'IN_MAINTENANCE'
              ? 'تعمیرگاه'
              : 'غیرفعال',
          driverName: v.driverName,
          driverCode: v.driverCode,
          vehicleCode: v.code,
          plateNumber: v.plateNumber,
          vehicleType: VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType,
          handoverDate: v.handoverDate,
          handoverTime: v.handoverTime,
          queueDate: v.queueDate,
          queueTime: v.queueTime,
          readyDate: v.readyDate,
          readyTime: v.readyTime,
          location: v.location || 'پارکینگ مرکزی',
          description: v.status === 'IN_MISSION' ? 'در مأموریت' : 'آماده به کار',
          recordedBy: 'سیستم ناوگان',
        });
      }
    });
    return list;
  }, [vehicles]);

  // Handle confirming end of work from EndOfWorkModal
  const handleConfirmEndOfWork = (updatedVehicle: VehicleItem, historyEntry: VehicleStatusHistoryRecord) => {
    onUpdateVehicle(updatedVehicle);
    setEndOfWorkVehicle(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (v: VehicleItem) => {
    setEditingVehicle(v);
    setFormData({ ...v });
  };

  // Open Assign Modal
  const handleOpenAssign = (v: VehicleItem) => {
    if (v.status === 'IN_MISSION') {
      alert('این خودرو در حال حاضر در ماموریت است و امکان تغییر راننده وجود ندارد. پس از پایان کار امکان تغییر فراهم می‌شود.');
      return;
    }
    setAssigningVehicle(v);
    setAssignDriverName(v.driverName === 'بدون راننده' ? '' : v.driverName);
    setAssignDriverPhone(v.driverPhone);
  };

  // Save Edit
  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    const updated: VehicleItem = {
      ...editingVehicle,
      ...formData,
      code: Number(formData.code) || editingVehicle.code,
    } as VehicleItem;
    onUpdateVehicle(updated);
    setEditingVehicle(null);
  };

  // Save Add
  const handleSaveAdd = (e: FormEvent) => {
    e.preventDefault();
    const nextCode = formData.code ? Number(formData.code) : Math.max(...vehicles.map((v) => v.code), 0) + 1;
    const newItem: VehicleItem = {
      id: `v-${Date.now()}`,
      code: nextCode,
      plateNumber: formData.plateNumber || '۵۵-۱۱۱ع۱۱',
      vehicleType: formData.vehicleType || 'KHAAVAR',
      driverName: formData.driverName || 'بدون راننده',
      driverPhone: formData.driverPhone || '',
      status: formData.status || 'ACTIVE',
      insuranceExpiry: formData.insuranceExpiry || '1405/12/29',
      inspectionExpiry: formData.inspectionExpiry || '1405/12/29',
      thirdPartyExpiry: formData.thirdPartyExpiry || '1405/12/29',
    };
    onAddVehicle(newItem);
    setIsAddModalOpen(false);
  };

  // Save Assignment
  const handleSaveAssignment = (e: FormEvent) => {
    e.preventDefault();
    if (!assigningVehicle) return;
    const updated: VehicleItem = {
      ...assigningVehicle,
      driverName: assignDriverName.trim() || 'بدون راننده',
      driverPhone: assignDriverPhone.trim(),
      status: assignDriverName.trim() ? 'ACTIVE' : 'PARKING',
    };
    onUpdateVehicle(updated);
    setAssigningVehicle(null);
  };

  // Revoke Assignment
  const handleRevokeAssignment = (v: VehicleItem) => {
    if (v.status === 'IN_MISSION') {
      alert('این خودرو در حال حاضر در ماموریت است و امکان تغییر/لغو راننده وجود ندارد. پس از پایان کار امکان تغییر فراهم می‌شود.');
      return;
    }
    if (confirm(`آیا از لغو انتصاب راننده «${v.driverName}» از خودرو کد ${v.code} اطمینان دارید؟`)) {
      const updated: VehicleItem = {
        ...v,
        driverName: 'بدون راننده',
        driverPhone: '',
        status: 'PARKING',
      };
      onUpdateVehicle(updated);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredVehicles.map((v) => ({
      'کد خودرو': v.code,
      'شماره پلاک': v.plateNumber,
      'نوع خودرو': VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType,
      'نام راننده': v.driverName,
      'شماره تماس': v.driverPhone,
      'وضعیت عملیاتی':
        v.status === 'ACTIVE'
          ? 'آماده به کار'
          : v.status === 'IN_MISSION'
          ? 'در مأموریت'
          : v.status === 'PARKING'
          ? 'پارکینگ'
          : v.status === 'IN_MAINTENANCE'
          ? 'تعمیرگاه'
          : 'غیرفعال',
      'اعتبار بیمه شخص ثالث': v.thirdPartyExpiry,
      'اعتبار معاینه فنی': v.inspectionExpiry,
      'اعتبار بیمه بدنه': v.insuranceExpiry,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ناوگان حامی');
    XLSX.writeFile(workbook, `گزارش_ناوگان_حامی_بار_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#111b2e] border border-[#1f2c45] p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">کل ناوگان</div>
            <div className="text-xl font-bold text-white mt-1">{toFaDigits(stats.total)} <span className="text-xs font-normal text-slate-400">دستگاه</span></div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 font-medium">آماده به کار</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{toFaDigits(stats.active)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-sky-400 font-medium">در مأموریت</div>
            <div className="text-xl font-bold text-sky-400 mt-1">{toFaDigits(stats.inMission)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-medium">تعمیرگاه</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{toFaDigits(stats.inRepair)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-400 font-medium">بدون راننده</div>
            <div className="text-xl font-bold text-purple-400 mt-1">{toFaDigits(stats.unassigned)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-rose-400 font-medium">هشدار انقضا</div>
            <div className="text-xl font-bold text-rose-400 mt-1">{toFaDigits(stats.expiringCount)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3.5 space-y-3 shadow-md">
        {/* Upper View Switcher & Quick Launchers */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2a42] pb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('FLEET_LIST')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'FLEET_LIST'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>لیست ناوگان خودرویی</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-900/60 text-blue-200 text-[10px] font-mono">
                {toFaDigits(vehicles.length)}
              </span>
            </button>

            <button
              onClick={() => setViewMode('HISTORY_LOG')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'HISTORY_LOG'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
              }`}
            >
              <History className="w-4 h-4 text-amber-400" />
              <span>سوابق ناوگان و تغییرات وضعیت (حامی)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-900/60 text-amber-200 text-[10px] font-mono">
                {toFaDigits(allFleetHistory.length)}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick End of Work button */}
            <button
              onClick={() => {
                // Pick first mission vehicle or first active vehicle
                const candidate = vehicles.find((v) => v.status === 'IN_MISSION') || vehicles[0];
                if (candidate) setEndOfWorkVehicle(candidate);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>ثبت پایان کار و اعلام آمادگی</span>
            </button>

            {/* Quick Vehicle Status button */}
            <button
              onClick={() => {
                const candidate = vehicles.find((v) => v.code === 1) || vehicles[0];
                if (candidate) setStatusVehicle(candidate);
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>وضعیت و شناسنامه ماشین</span>
            </button>
          </div>
        </div>

        {/* Lower Row: Search, Filters & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو با کد خودرو، نام راننده، شماره پلاک، موبایل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-sm rounded-lg pr-9 pl-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">همه انواع خودرو</option>
              <option value="KHAAVAR">خاور</option>
              <option value="HYUNDAI">هیوندا</option>
              <option value="ISUZU">ایسوزو</option>
              <option value="NISSAN">نیسان</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="ACTIVE">آماده به کار</option>
              <option value="IN_MISSION">در مأموریت</option>
              <option value="PARKING">پارکینگ</option>
              <option value="IN_MAINTENANCE">تعمیرگاه</option>
              <option value="UNASSIGNED">بدون راننده</option>
            </select>

            {/* Expiring Toggle */}
            <button
              onClick={() => setOnlyExpiring(!onlyExpiring)}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                onlyExpiring
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs'
                  : 'bg-[#0a101f] text-slate-400 border-[#1f2c45] hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>نیاز به تمدید مدارک</span>
            </button>

            {/* Quick Smart Sort Selector */}
            <div className="flex items-center gap-1.5 bg-[#0a101f] border border-[#1f2c45] rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">مرتب‌سازی:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as VehicleSortField)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="code" className="bg-[#0f172a]">کد خودرو</option>
                <option value="status" className="bg-[#0f172a]">وضعیت کاری / عملیاتی</option>
                <option value="driverName" className="bg-[#0f172a]">نام راننده</option>
                <option value="plateNumber" className="bg-[#0f172a]">شماره پلاک</option>
                <option value="vehicleType" className="bg-[#0f172a]">نوع خودرو</option>
                <option value="thirdPartyExpiry" className="bg-[#0f172a]">بیمه شخص ثالث</option>
                <option value="inspectionExpiry" className="bg-[#0f172a]">معاینه فنی</option>
                <option value="readyTime" className="bg-[#0f172a]">زمان آمادگی</option>
                <option value="lastStatusDate" className="bg-[#0f172a]">تاریخ آخرین وضعیت</option>
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
          </div>

          {/* Actions & Display Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode: Row Table vs Cards */}
            <div className="flex items-center bg-[#0a101f] border border-[#1f2c45] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setFleetDisplayMode('TABLE')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  fleetDisplayMode === 'TABLE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمایش سطری در قالب جدول با چینش ستون‌ها"
              >
                <List className="w-3.5 h-3.5" />
                <span>نمایش سطری (جدول)</span>
              </button>
              <button
                type="button"
                onClick={() => setFleetDisplayMode('CARDS')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  fleetDisplayMode === 'CARDS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمایش در قالب کارت‌های ناوگان"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>نمایش کارتی</span>
              </button>
            </div>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>خروجی اکسل</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintListOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="چاپ لیست جدول ناوگان با استایل رسمی A4 بدون هدرهای سایت"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span>چاپ لیست</span>
            </button>

            <button
              onClick={() => {
                setFormData({
                  code: Math.max(...vehicles.map((v) => v.code), 0) + 1,
                  plateNumber: '۶۶-۱۲۳ع۴۵',
                  vehicleType: 'KHAAVAR',
                  driverName: 'بدون راننده',
                  driverPhone: '',
                  status: 'ACTIVE',
                  insuranceExpiry: '1405/09/01',
                  inspectionExpiry: '1405/09/01',
                  thirdPartyExpiry: '1405/09/01',
                });
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن خودرو جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Either FLEET_LIST or HISTORY_LOG */}
      {viewMode === 'FLEET_LIST' ? (
        fleetDisplayMode === 'TABLE' ? (
          /* Main Fleet Table */
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#0c1424] text-slate-300 border-b border-[#1f2c45] font-semibold select-none">
                <th
                  onClick={() => handleToggleSort('code')}
                  className="py-3 px-3.5 text-center w-14 cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس کد خودرو"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>کد</span>
                    {sortField === 'code' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('plateNumber')}
                  className="py-3 px-3 text-center min-w-[155px] cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس پلاک ملی"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>پلاک ملی</span>
                    {sortField === 'plateNumber' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('vehicleType')}
                  className="py-3 px-3 cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس نوع خودرو"
                >
                  <div className="flex items-center gap-1">
                    <span>نوع خودرو</span>
                    {sortField === 'vehicleType' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('driverName')}
                  className="py-3 px-3 cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس نام راننده"
                >
                  <div className="flex items-center gap-1">
                    <span>راننده تخصیص‌یافته</span>
                    {sortField === 'driverName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('status')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس وضعیت کاری / عملیاتی"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>وضعیت عملیاتی</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('readyTime')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس زمان آمادگی"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>زمان آمادگی</span>
                    {sortField === 'readyTime' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('lastStatusDate')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس آخرین وضعیت"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>آخرین وضعیت</span>
                    {sortField === 'lastStatusDate' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('thirdPartyExpiry')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس بیمه شخص ثالث"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>بیمه شخص ثالث</span>
                    {sortField === 'thirdPartyExpiry' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('inspectionExpiry')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس معاینه فنی"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>معاینه فنی</span>
                    {sortField === 'inspectionExpiry' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleToggleSort('bodyInsExpiry')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                  title="کلیک برای مرتب‌سازی بر اساس بیمه بدنه"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>بیمه بدنه</span>
                    {sortField === 'bodyInsExpiry' ? (
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
              {sortedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    خودرویی مطابق با فیلترهای جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedVehicles.map((v) => {
                  const isUnassigned = !v.driverName || v.driverName === 'بدون راننده';
                  const isInspectionExpiring =
                    v.inspectionExpiry.startsWith('1405/04') || v.inspectionExpiry.startsWith('1405/05');
                  const isThirdPartyExpiring =
                    v.thirdPartyExpiry.startsWith('1405/04') || v.thirdPartyExpiry.startsWith('1405/05');

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-[#152238] transition-colors text-slate-200"
                    >
                      {/* Code */}
                      <td className="py-3 px-3.5 text-center font-bold text-blue-400 font-mono text-sm">
                        {toFaDigits(v.code)}
                      </td>

                      {/* Plate */}
                      <td className="py-3 px-3 text-center">
                        <IranianPlate plateNumber={v.plateNumber} size="sm" />
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#18263e] border border-[#243757] text-slate-300">
                          <Truck className="w-3.5 h-3.5 text-blue-400" />
                          {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType}
                        </span>
                      </td>

                      {/* Driver */}
                      <td className="py-3 px-3">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 text-slate-500 italic">
                            <UserX className="w-3.5 h-3.5" />
                            بدون راننده
                          </span>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{v.driverName}</span>
                            </div>
                            {v.driverPhone && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-slate-500" />
                                {toFaDigits(v.driverPhone)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            v.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : v.status === 'IN_MISSION'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                              : v.status === 'PARKING'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : v.status === 'IN_MAINTENANCE'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-slate-700/20 text-slate-400 border-slate-700'
                          }`}
                        >
                          {v.status === 'ACTIVE' && 'آماده به کار'}
                          {v.status === 'IN_MISSION' && 'در مأموریت'}
                          {v.status === 'PARKING' && 'پارکینگ'}
                          {v.status === 'IN_MAINTENANCE' && 'تعمیرگاه'}
                          {v.status === 'INACTIVE' && 'غیرفعال'}
                        </span>
                      </td>

                      {/* Ready Time (زمان آمادگی) */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-mono text-emerald-300 text-[11px] font-semibold">
                          {toFaDigits(v.readyTime || '۰۸:۰۰')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {toFaDigits(v.readyDate || '1405/06/13')}
                        </div>
                      </td>

                      {/* Last Status Time */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                        <div>{toFaDigits(v.lastStatusTime || '۱۹:۲۰')}</div>
                        <div className="text-[10px] text-slate-500">{toFaDigits(v.lastStatusDate || '1405/06/12')}</div>
                      </td>

                      {/* Third Party Expiry */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                            isThirdPartyExpiring
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {toFaDigits(v.thirdPartyExpiry)}
                        </span>
                      </td>

                      {/* Inspection Expiry */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                            isInspectionExpiring
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {toFaDigits(v.inspectionExpiry)}
                        </span>
                      </td>

                      {/* Body Insurance Expiry */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {toFaDigits(v.insuranceExpiry)}
                      </td>

                      {/* Operations */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* End of Work / Ready transition button */}
                          <button
                            onClick={() => setEndOfWorkVehicle(v)}
                            title="ثبت پایان کار و اعلام آمادگی (اتمام سرویس)"
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Legacy Vehicle Status & Dossier Modal */}
                          <button
                            onClick={() => setStatusVehicle(v)}
                            title="مشاهده وضعیت، زمان واگذاری و شناسنامه ماشین (حامی)"
                            className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {/* Assign / Change driver */}
                          <button
                            onClick={() => handleOpenAssign(v)}
                            title={isUnassigned ? 'تخصیص راننده' : 'تغییر راننده'}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke driver if assigned */}
                          {!isUnassigned && (
                            <button
                              onClick={() => handleRevokeAssignment(v)}
                              title="لغو انتصاب راننده"
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit vehicle */}
                          <button
                            onClick={() => handleOpenEdit(v)}
                            title="ویرایش مشخصات"
                            className="p-1.5 rounded-lg bg-slate-700/40 text-slate-300 hover:bg-slate-700 border border-slate-600/40 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Docs & Photos */}
                          <button
                            onClick={() => setViewingDocsVehicle(v)}
                            title="مشاهده مدارک و تصاویر"
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
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
          /* Cards Grid View for Fleet */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sortedVehicles.map((v) => {
              const isUnassigned = !v.driverName || v.driverName === 'بدون راننده';
              return (
                <div
                  key={v.id}
                  className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4 shadow-md hover:border-blue-500/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 font-mono text-sm">
                        {toFaDigits(v.code)}
                      </div>
                      <span className="font-bold text-white text-xs">{VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        v.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : v.status === 'IN_MISSION'
                          ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                          : v.status === 'PARKING'
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : v.status === 'IN_MAINTENANCE'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-slate-700/20 text-slate-400 border-slate-700'
                      }`}
                    >
                      {v.status === 'ACTIVE' && 'آماده به کار'}
                      {v.status === 'IN_MISSION' && 'در مأموریت'}
                      {v.status === 'PARKING' && 'پارکینگ'}
                      {v.status === 'IN_MAINTENANCE' && 'تعمیرگاه'}
                      {v.status === 'INACTIVE' && 'غیرفعال'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center py-1">
                    <IranianPlate plateNumber={v.plateNumber} scale={0.8} />
                  </div>

                  <div className="bg-[#0a101f] border border-[#1f2c45] rounded-lg p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">راننده منتسب:</span>
                      <span className={`font-bold ${isUnassigned ? 'text-amber-400' : 'text-slate-200'}`}>
                        {v.driverName}
                      </span>
                    </div>
                    {v.driverPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">شماره تماس:</span>
                        <span className="font-mono text-slate-300">{toFaDigits(v.driverPhone)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-[#1a263d] text-[10px] font-mono text-slate-400">
                      <span>بیمه ثالث: {toFaDigits(v.thirdPartyExpiry)}</span>
                      <span>معاینه فنی: {toFaDigits(v.inspectionExpiry)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#1f2c45]">
                    <button
                      onClick={() => setEndOfWorkVehicle(v)}
                      title="ثبت پایان کار و اعلام آمادگی روزانه"
                      className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>اعلام آمادگی</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setStatusVehicle(v)}
                        title="مشاهده وضعیت و شناسنامه ماشین"
                        className="p-1 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenAssign(v)}
                        title={isUnassigned ? 'تخصیص راننده' : 'تغییر راننده'}
                        className="p-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(v)}
                        title="ویرایش مشخصات"
                        className="p-1 rounded-lg bg-slate-700/40 text-slate-300 hover:bg-slate-700 border border-slate-600/40 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewingDocsVehicle(v)}
                        title="مشاهده مدارک و تصاویر"
                        className="p-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Comprehensive Fleet History Ledger (Replicating the exact Sedaqat Bar screen top table) */
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl overflow-hidden shadow-lg">
          <div className="p-3.5 bg-[#0c1424] border-b border-[#1f2c45] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200 text-xs">
                دفتر کل سوابق و تاریخچه تغییرات وضعیت ناوگان
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({toFaDigits(allFleetHistory.length)} رکورد ثبتی)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              شامل تاریخ نوبت، زمان واگذاری، وضعیت، ساعت وضعیت، شرح پلاک، راننده، زمان آمادگی و محل توقف
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#09101d] text-slate-300 border-b border-[#1f2c45] font-semibold text-[11px]">
                  <th className="py-2.5 px-3 text-center w-12">ردیف</th>
                  <th className="py-2.5 px-2.5 text-center">ساعت نوبت</th>
                  <th className="py-2.5 px-2.5 text-center">تاریخ نوبت</th>
                  <th className="py-2.5 px-2.5 text-center">زمان واگذاری</th>
                  <th className="py-2.5 px-2.5 text-center">تاریخ واگذاری</th>
                  <th className="py-2.5 px-3 text-center">وضعیت</th>
                  <th className="py-2.5 px-2.5 text-center">ساعت وضعیت</th>
                  <th className="py-2.5 px-2.5 text-center">تاریخ وضعیت</th>
                  <th className="py-2.5 px-2 text-center">کد</th>
                  <th className="py-2.5 px-3">شرح ۱ (شماره پلاک)</th>
                  <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                  <th className="py-2.5 px-3 text-center">زمان آمادگی</th>
                  <th className="py-2.5 px-3">محل توقف / توضیحات</th>
                  <th className="py-2.5 px-2.5 text-center w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172338]">
                {allFleetHistory.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-500">
                      هیچ سابقه‌ای ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  allFleetHistory.map((h, idx) => {
                    const vehicleMatch = vehicles.find((v) => v.code === h.vehicleCode);
                    return (
                      <tr
                        key={h.id || idx}
                        className="hover:bg-[#152238] transition-colors text-slate-200"
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                          {toFaDigits(idx + 1)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                          {toFaDigits(h.queueTime || '۰۸:۰۰')}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">
                          {toFaDigits(h.queueDate || '1405/06/12')}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-sky-300 font-bold">
                          {toFaDigits(h.handoverTime || '۰۶:۰۰')}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">
                          {toFaDigits(h.handoverDate || '1405/06/12')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {h.status === 'ACTIVE' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              آماده به کار
                            </span>
                          )}
                          {h.status === 'IN_MISSION' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              در حال مأموریت
                            </span>
                          )}
                          {h.status === 'PARKING' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              پارکینگ
                            </span>
                          )}
                          {h.status === 'IN_MAINTENANCE' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              تعمیرگاه
                            </span>
                          )}
                          {h.status === 'INACTIVE' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                              غیرفعال
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-200">
                          {toFaDigits(h.time)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">
                          {toFaDigits(h.date)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-400">
                          {toFaDigits(h.vehicleCode)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-100">
                          {toFaDigits(h.plateNumber)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {h.driverName}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono text-emerald-400 font-bold">
                            {toFaDigits(h.readyTime || '۰۸:۰۰')}
                          </span>
                          <span className="text-[10px] text-slate-400 mr-1 font-mono">
                            ({toFaDigits(h.readyDate || '1405/06/13')})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-[280px]">
                          <div className="truncate" title={h.description}>
                            {h.location ? `[${h.location}] ` : ''}{h.description}
                          </div>
                          {h.settlementBreakdown && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                                کارکرد: {toFaDigits(h.settlementBreakdown.totalDurationHours)} س ({toFaDigits(h.settlementBreakdown.baseHours)} س پایه + {toFaDigits(h.settlementBreakdown.overtimeHours)} س اضافه)
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
                                ماشین: {toFaDigits(h.settlementBreakdown.vehicleTotalAmount.toLocaleString('fa-IR'))} ت
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                                کارگر ({toFaDigits(h.settlementBreakdown.workerCount)}): {toFaDigits(h.settlementBreakdown.workerTotalAmount.toLocaleString('fa-IR'))} ت
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {vehicleMatch && (
                            <button
                              onClick={() => setStatusVehicle(vehicleMatch)}
                              className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] transition-colors"
                            >
                              وضعیت ماشین
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {(isAddModalOpen || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  {editingVehicle ? `ویرایش خودرو کد ${editingVehicle.code}` : 'افزودن خودرو جدید به ناوگان'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingVehicle(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingVehicle ? handleSaveEdit : handleSaveAdd} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">کد شناسایی خودرو</label>
                  <input
                    type="number"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: Number(e.target.value) })}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نوع خودرو</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="KHAAVAR">خاور</option>
                    <option value="HYUNDAI">هیوندا</option>
                    <option value="ISUZU">ایسوزو ۵.۲</option>
                    <option value="NISSAN">نیسان</option>
                    <option value="VAN">ون</option>
                    <option value="PICKUP">وانت</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">شماره پلاک ملی و سازمانی</label>
                <PlateInput
                  value={formData.plateNumber || '۶۶-۵۳۳ع۲۵'}
                  onChange={(val) => setFormData({ ...formData, plateNumber: val })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">نام راننده تخصیص‌یافته</label>
                  <SearchableDriverSelect
                    disabled={formData.status === 'IN_MISSION'}
                    value={formData.driverName || ''}
                    onChange={(name, code, phone) => setFormData({ ...formData, driverName: name, driverCode: code, driverPhone: phone })}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">شماره تماس راننده</label>
                  <input
                    type="text"
                    disabled
                    value={formData.driverPhone || ''}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">وضعیت عملیاتی</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="ACTIVE">آماده به کار</option>
                  <option value="IN_MISSION">در مأموریت</option>
                  <option value="PARKING">پارکینگ</option>
                  <option value="IN_MAINTENANCE">تعمیرگاه</option>
                  <option value="INACTIVE">غیرفعال</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <PersianDatePicker
                    label="بیمه شخص ثالث"
                    value={formData.thirdPartyExpiry || ''}
                    onChange={(val) => setFormData({ ...formData, thirdPartyExpiry: val })}
                    placeholder="انتخاب تاریخ انقضا..."
                  />
                </div>

                <div>
                  <PersianDatePicker
                    label="معاینه فنی"
                    value={formData.inspectionExpiry || ''}
                    onChange={(val) => setFormData({ ...formData, inspectionExpiry: val })}
                    placeholder="انتخاب تاریخ انقضا..."
                  />
                </div>

                <div>
                  <PersianDatePicker
                    label="بیمه بدنه"
                    value={formData.insuranceExpiry || ''}
                    onChange={(val) => setFormData({ ...formData, insuranceExpiry: val })}
                    placeholder="انتخاب تاریخ انقضا..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30"
                >
                  {editingVehicle ? 'ذخیره تغییرات' : 'افزودن خودرو'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Change Driver Modal */}
      {assigningVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  تخصیص یا تغییر راننده برای خودرو {assigningVehicle.code}
                </h3>
              </div>
              <button
                onClick={() => setAssigningVehicle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-[#0a101f] border border-[#1f2c45] flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[11px]">خودرو انتخابی</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {VEHICLE_TYPE_NAMES[assigningVehicle.vehicleType]} (کد {toFaDigits(assigningVehicle.code)})
                  </div>
                </div>
                <IranianPlate plateNumber={assigningVehicle.plateNumber} size="sm" />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">نام و نام خانوادگی راننده</label>
                <SearchableDriverSelect
                  disabled={false}
                  value={assignDriverName || ''}
                  onChange={(name, code, phone) => {
                    setAssignDriverName(name);
                    setAssignDriverPhone(phone);
                  }}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">شماره همراه راننده</label>
                <input
                  type="text"
                  disabled
                  value={assignDriverPhone}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono focus:border-blue-500 focus:outline-none text-sm disabled:opacity-50"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-[11px] leading-relaxed">
                سامانه حامی امکان تخصیص چندین خودرو به یک راننده یا اختصاص رانندگان چرخشی را پشتیبانی می‌کند.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setAssigningVehicle(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30"
                >
                  تایید و تخصیص راننده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Document & Photo Uploader Modal for Vehicle */}
      {viewingDocsVehicle && (
        <DocumentUploaderModal
          isOpen={true}
          title={`مدارک و تصاویر خودرو کد ${toFaDigits(viewingDocsVehicle.code)} (${toFaDigits(viewingDocsVehicle.plateNumber)})`}
          subTitle={`راننده: ${viewingDocsVehicle.driverName || 'بدون راننده'} | نوع: ${VEHICLE_TYPE_NAMES[viewingDocsVehicle.vehicleType] || viewingDocsVehicle.vehicleType}`}
          slots={VEHICLE_DOC_SLOTS}
          documents={(viewingDocsVehicle.documents as any) || {}}
          onSave={(updatedDocs) => {
            const updatedVehicle: VehicleItem = {
              ...viewingDocsVehicle,
              documents: updatedDocs as any,
            };
            onUpdateVehicle(updatedVehicle);
            setViewingDocsVehicle(updatedVehicle);
          }}
          onClose={() => setViewingDocsVehicle(null)}
        />
      )}

      {/* End of Work / Ready Status Transition Modal */}
      {endOfWorkVehicle && (
        <EndOfWorkModal
          isOpen={true}
          vehicle={endOfWorkVehicle}
          onConfirm={handleConfirmEndOfWork}
          onClose={() => setEndOfWorkVehicle(null)}
        />
      )}

      {/* Comprehensive Vehicle Status & Technical Dossier Modal (Sedaqat Bar Legacy Screen) */}
      {statusVehicle && (
        <VehicleStatusModal
          isOpen={true}
          vehicle={statusVehicle}
          onSave={(updated) => {
            onUpdateVehicle(updated);
            setStatusVehicle(updated);
          }}
          onClose={() => setStatusVehicle(null)}
        />
      )}

      {/* A4 Standard Print List Modal */}
      <TableListA4PrintModal<VehicleItem>
        isOpen={isPrintListOpen}
        onClose={() => setIsPrintListOpen(false)}
        title="فهرست و مشخصات جامع ناوگان خودرویی"
        subtitle="گزارش رسمی مشخصات فنی، پلاک انتظامی، رانندگان منتسب و وضعیت عملیاتی ناوگان"
        categoryBadge="دایره ترابری و لجستیک"
        columns={fleetPrintColumns}
        data={sortedVehicles}
        summaryCards={fleetPrintSummaryCards}
        defaultOrientation="landscape"
        companyName="شرکت ترابری و لجستیک صداقت بار پیشرو"
      />
    </div>
  );
};
