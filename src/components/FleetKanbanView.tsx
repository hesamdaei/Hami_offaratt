import { FC, useState, useMemo, DragEvent, FormEvent } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  Wrench,
  UserX,
  ArrowRightLeft,
  Phone,
  Search,
  AlertTriangle,
  MapPin,
  Package,
  Plus,
  FileText,
  Camera,
  X,
  Sparkles,
  Filter,
  Send,
  Navigation,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Activity,
  Calendar,
  AlertOctagon,
  KeyRound,
  Layers,
  Users,
  Coins,
  Info,
} from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import {
  VehicleItem,
  VEHICLE_TYPE_NAMES,
  VehicleDocuments,
  VehicleMission,
  checkVehicleServiceEligibility,
} from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';
import { DocumentUploaderModal, DocSlot, VEHICLE_FULL_SLOTS } from './DocumentUploaderModal';
import { EndOfWorkModal } from './EndOfWorkModal';
import { VehicleStatusModal } from './VehicleStatusModal';

const VEHICLE_DOC_SLOTS = VEHICLE_FULL_SLOTS;

interface FleetKanbanViewProps {
  vehicles: VehicleItem[];
  onUpdateVehicle: (updated: VehicleItem) => void;
}

type ColumnStatus = VehicleItem['status'] | 'UNASSIGNED';

interface KanbanColumnConfig {
  id: ColumnStatus;
  title: string;
  subTitle: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  headerBg: string;
  icon: any;
  accentGlow: string;
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'ACTIVE',
    title: 'آماده بارگیری و اعزام',
    subTitle: 'خودروهای آماده تحویل بار',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    borderColor: 'border-emerald-500/30',
    headerBg: 'bg-emerald-950/20',
    accentGlow: 'shadow-emerald-950/40',
    icon: CheckCircle2,
  },
  {
    id: 'IN_MISSION',
    title: 'در مأموریت و جاده',
    subTitle: 'در حال حمل بار و تردد جاده‌ای',
    color: 'text-sky-400',
    badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    borderColor: 'border-sky-500/30',
    headerBg: 'bg-sky-950/20',
    accentGlow: 'shadow-sky-950/40',
    icon: Navigation,
  },
  {
    id: 'PARKING',
    title: 'پارکینگ و نوبت‌دهی',
    subTitle: 'مستقر در انبار مرکزی / آماده‌باش',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    borderColor: 'border-purple-500/30',
    headerBg: 'bg-purple-950/20',
    accentGlow: 'shadow-purple-950/40',
    icon: Truck,
  },
  {
    id: 'IN_MAINTENANCE',
    title: 'تعمیرگاه و عیب‌یابی',
    subTitle: 'سرویس دوره‌ای یا رفع نقص فنی',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    borderColor: 'border-amber-500/30',
    headerBg: 'bg-amber-950/20',
    accentGlow: 'shadow-amber-950/40',
    icon: Wrench,
  },
  {
    id: 'UNASSIGNED',
    title: 'بدون راننده / نیاز به نیرو',
    subTitle: 'خودرو متوقف فاقد راننده',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    borderColor: 'border-rose-500/30',
    headerBg: 'bg-rose-950/20',
    accentGlow: 'shadow-rose-950/40',
    icon: UserX,
  },
];

export const FleetKanbanView: FC<FleetKanbanViewProps> = ({
  vehicles,
  onUpdateVehicle,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterAlertOnly, setFilterAlertOnly] = useState<boolean>(false);

  // Drag and Drop state
  const [draggedVehicleId, setDraggedVehicleId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);

  // Modals state
  const [dispatchVehicle, setDispatchVehicle] = useState<VehicleItem | null>(null);
  const [dispatchDestination, setDispatchDestination] = useState('');
  const [dispatchCargo, setDispatchCargo] = useState('');
  const [dispatchDepartureDate, setDispatchDepartureDate] = useState('1405/06/12');
  const [dispatchDepartureTime, setDispatchDepartureTime] = useState('14:00');
  const [dispatchStartTime, setDispatchStartTime] = useState('08:30');
  const [dispatchWorkerCount, setDispatchWorkerCount] = useState<number>(2);
  const [dispatchVehicleRate, setDispatchVehicleRate] = useState<number>(1800000);
  const [dispatchVehicleOvertime, setDispatchVehicleOvertime] = useState<number>(500000);
  const [dispatchWorkerRate, setDispatchWorkerRate] = useState<number>(450000);
  const [dispatchWorkerOvertime, setDispatchWorkerOvertime] = useState<number>(150000);

  const [maintenanceVehicle, setMaintenanceVehicle] = useState<VehicleItem | null>(null);
  const [maintenanceIssue, setMaintenanceIssue] = useState('سرویس دوره‌ای روغن و فیلترها');

  // Document uploader modal on Kanban
  const [viewingDocsVehicle, setViewingDocsVehicle] = useState<VehicleItem | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // End of Work & Vehicle Status modals
  const [endOfWorkVehicle, setEndOfWorkVehicle] = useState<VehicleItem | null>(null);
  const [statusVehicle, setStatusVehicle] = useState<VehicleItem | null>(null);

  // Filtering vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.code.toString().includes(search) ||
        v.driverName.includes(search) ||
        v.plateNumber.includes(search) ||
        v.driverPhone.includes(search) ||
        (v.currentMission?.destination && v.currentMission.destination.includes(search));

      const matchType = filterType === 'ALL' || v.vehicleType === filterType;

      const isExpiring =
        v.inspectionExpiry.startsWith('1405/04') ||
        v.inspectionExpiry.startsWith('1405/05') ||
        v.thirdPartyExpiry.startsWith('1405/04');

      const matchAlert = !filterAlertOnly || isExpiring;

      return matchSearch && matchType && matchAlert;
    });
  }, [vehicles, search, filterType, filterAlertOnly]);

  // Overall fleet stats
  const stats = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.status === 'ACTIVE' && v.driverName && v.driverName !== 'بدون راننده').length;
    const inMission = vehicles.filter((v) => v.status === 'IN_MISSION').length;
    const inParking = vehicles.filter((v) => v.status === 'PARKING' && v.driverName && v.driverName !== 'بدون راننده').length;
    const inRepair = vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length;
    const unassigned = vehicles.filter((v) => !v.driverName || v.driverName === 'بدون راننده').length;
    const operationalPercent = total > 0 ? Math.round(((active + inMission) / total) * 100) : 0;

    return { total, active, inMission, inParking, inRepair, unassigned, operationalPercent };
  }, [vehicles]);

  // Handle direct status change
  const handleMoveStatus = (v: VehicleItem, targetStatus: ColumnStatus) => {
    setBannerError(null);

    if (targetStatus === 'UNASSIGNED') {
      onUpdateVehicle({
        ...v,
        driverName: 'بدون راننده',
        driverPhone: '',
        status: 'PARKING',
        queueStatus: 'NOT_QUEUED',
        handoverStatus: 'RETURNED',
      });
      return;
    }

    if (targetStatus === 'IN_MISSION' || targetStatus === 'ACTIVE') {
      const eligibility = checkVehicleServiceEligibility(v);
      if (!eligibility.eligible) {
        setBannerError(`خطای عملیاتی ناوگان: ${eligibility.reason}`);
        return;
      }
    }

    // Moving from IN_MISSION to ACTIVE triggers End of Work workflow
    if (v.status === 'IN_MISSION' && targetStatus === 'ACTIVE') {
      setEndOfWorkVehicle(v);
      return;
    }

    if (targetStatus === 'IN_MISSION') {
      const isNissan = v.vehicleType === 'NISSAN';
      const nowTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
      setDispatchVehicle(v);
      setDispatchDestination(v.currentMission?.destination || 'تهران - انبار مرکزی');
      setDispatchCargo(v.currentMission?.cargo || 'کالای بازرگانی و کارتن');
      setDispatchStartTime(v.currentMission?.startTime || nowTime);
      setDispatchWorkerCount(v.currentMission?.workerCount ?? 2);
      setDispatchVehicleRate(v.currentMission?.baseVehicleRate ?? (isNissan ? 900000 : 1800000));
      setDispatchVehicleOvertime(v.currentMission?.hourlyOvertimeVehicle ?? (isNissan ? 350000 : 500000));
      setDispatchWorkerRate(v.currentMission?.baseWorkerRate ?? (isNissan ? 350000 : 450000));
      setDispatchWorkerOvertime(v.currentMission?.hourlyOvertimeWorker ?? (isNissan ? 120000 : 150000));
      return;
    }

    if (targetStatus === 'IN_MAINTENANCE') {
      setMaintenanceVehicle(v);
      setMaintenanceIssue(v.maintenanceNotes || 'سرویس دوره‌ای روغن و لنت');
      return;
    }

    onUpdateVehicle({
      ...v,
      status: targetStatus as VehicleItem['status'],
    });
  };

  // Drag and Drop handlers
  const handleDragStart = (e: DragEvent, vehicleId: string) => {
    setDraggedVehicleId(vehicleId);
    e.dataTransfer.setData('text/plain', vehicleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, colId: ColumnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent, targetCol: ColumnStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const vehicleId = e.dataTransfer.getData('text/plain') || draggedVehicleId;
    if (!vehicleId) return;

    const targetVehicle = vehicles.find((v) => v.id === vehicleId);
    if (!targetVehicle) return;

    handleMoveStatus(targetVehicle, targetCol);
    setDraggedVehicleId(null);
  };

  // Submit Mission Dispatch
  const handleConfirmDispatch = (e: FormEvent) => {
    e.preventDefault();
    if (!dispatchVehicle) return;

    const updated: VehicleItem = {
      ...dispatchVehicle,
      status: 'IN_MISSION',
      currentMission: {
        destination: dispatchDestination,
        cargo: dispatchCargo,
        departureTime: dispatchDepartureTime,
        departureDate: dispatchDepartureDate,
        startTime: dispatchStartTime,
        startDate: dispatchDepartureDate,
        baseHours: 3,
        workerCount: dispatchWorkerCount,
        baseVehicleRate: dispatchVehicleRate,
        hourlyOvertimeVehicle: dispatchVehicleOvertime,
        baseWorkerRate: dispatchWorkerRate,
        hourlyOvertimeWorker: dispatchWorkerOvertime,
        notes: `اعزام به مأموریت با ${dispatchWorkerCount} نفر کارگر. ۳ ساعت اول مشمول تعرفه پایه و پس از آن ساعت اضافه تفکیکی خودرو و کارگر.`,
      },
    };
    onUpdateVehicle(updated);
    setDispatchVehicle(null);
  };

  // Submit Maintenance Record
  const handleConfirmMaintenance = (e: FormEvent) => {
    e.preventDefault();
    if (!maintenanceVehicle) return;

    const updated: VehicleItem = {
      ...maintenanceVehicle,
      status: 'IN_MAINTENANCE',
      maintenanceNotes: maintenanceIssue,
    };
    onUpdateVehicle(updated);
    setMaintenanceVehicle(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Creative Control Bar & Metrics */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-lg space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-100 text-base">بورد کانبان هوشمند دیسپچ و ناوگان</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                  {toFaDigits(stats.operationalPercent)}٪ ضریب آمادگی ناوگان
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                قابلیت جابجایی کارت‌ها با درگ‌اند‌دراپ (Drag & Drop)، ثبت مأموریت، دیسپچ سریع و بررسی اسناد
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجوی کد، راننده، مقصد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-9 pl-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="ALL">همه انواع خودرو ({toFaDigits(vehicles.length)})</option>
              <option value="KHAAVAR">خاور باری</option>
              <option value="HYUNDAI">کامیونت هیوندا</option>
              <option value="ISUZU">ایسوزو ۵.۲</option>
              <option value="NISSAN">نیسان وانت</option>
            </select>

            <button
              onClick={() => setFilterAlertOnly(!filterAlertOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                filterAlertOnly
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs'
                  : 'bg-[#0a101f] text-slate-400 border-[#1f2c45] hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>فقط دارای هشدار تمدید</span>
            </button>
          </div>
        </div>

        {/* Mini progress tracker bar */}
        <div className="pt-2 border-t border-[#1a273f] grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-[#0a101f] p-2 rounded-xl border border-[#1a273f]">
            <span className="text-slate-400 text-[11px] block">آماده بارگیری:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{toFaDigits(stats.active)} دستگاه</span>
          </div>
          <div className="bg-[#0a101f] p-2 rounded-xl border border-[#1a273f]">
            <span className="text-slate-400 text-[11px] block">در مأموریت جاده:</span>
            <span className="font-bold text-sky-400 font-mono text-sm">{toFaDigits(stats.inMission)} دستگاه</span>
          </div>
          <div className="bg-[#0a101f] p-2 rounded-xl border border-[#1a273f]">
            <span className="text-slate-400 text-[11px] block">مستقر در پارکینگ:</span>
            <span className="font-bold text-purple-400 font-mono text-sm">{toFaDigits(stats.inParking)} دستگاه</span>
          </div>
          <div className="bg-[#0a101f] p-2 rounded-xl border border-[#1a273f]">
            <span className="text-slate-400 text-[11px] block">در دست تعمیر:</span>
            <span className="font-bold text-amber-400 font-mono text-sm">{toFaDigits(stats.inRepair)} دستگاه</span>
          </div>
          <div className="bg-[#0a101f] p-2 rounded-xl border border-[#1a273f] col-span-2 sm:col-span-1">
            <span className="text-slate-400 text-[11px] block">فاقد راننده:</span>
            <span className="font-bold text-rose-400 font-mono text-sm">{toFaDigits(stats.unassigned)} دستگاه</span>
          </div>
        </div>

        {bannerError && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{bannerError}</span>
            </div>
            <button
              onClick={() => setBannerError(null)}
              className="text-rose-400 hover:text-rose-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Kanban Multi-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start pb-8">
        {KANBAN_COLUMNS.map((col) => {
          const Icon = col.icon;
          const isOver = dragOverColumn === col.id;

          const columnVehicles = filteredVehicles.filter((v) => {
            if (col.id === 'UNASSIGNED') {
              return !v.driverName || v.driverName === 'بدون راننده';
            }
            if (!v.driverName || v.driverName === 'بدون راننده') {
              return false;
            }
            return v.status === col.id;
          });

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`bg-[#10192b] border rounded-2xl flex flex-col max-h-[calc(100vh-250px)] shadow-lg transition-all duration-200 ${
                isOver
                  ? `${col.borderColor} ring-2 ring-blue-500/50 bg-[#14233e] scale-[1.01]`
                  : 'border-[#1e2d47]'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-[#1e2d47] rounded-t-2xl ${col.headerBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${col.badgeBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-slate-100 text-xs truncate">{col.title}</h3>
                    <p className="text-[10px] text-slate-400 truncate">{col.subTitle}</p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0a101f] text-slate-200 font-mono border border-[#1f2c45]">
                  {toFaDigits(columnVehicles.length)}
                </span>
              </div>

              {/* Column Body / Drop Zone */}
              <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-[220px]">
                {isOver && (
                  <div className="border-2 border-dashed border-blue-400 bg-blue-500/10 rounded-xl p-3 text-center text-xs text-blue-300 font-bold animate-pulse">
                    برای انتقال به «{col.title}» اینجا رها کنید
                  </div>
                )}

                {columnVehicles.length === 0 && !isOver ? (
                  <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-[#1f2c45] rounded-xl flex flex-col items-center justify-center gap-1.5">
                    <Icon className="w-6 h-6 text-slate-600" />
                    <span>خودرویی در این وضعیت ثبت نیست</span>
                  </div>
                ) : (
                  columnVehicles.map((v) => {
                    const isExpiring =
                      v.inspectionExpiry.startsWith('1405/04') ||
                      v.inspectionExpiry.startsWith('1405/05') ||
                      v.thirdPartyExpiry.startsWith('1405/04');

                    const hasPhoto = !!v.documents?.vehiclePhoto;
                    const docCount = v.documents ? Object.values(v.documents).filter((x) => !!x).length : 0;

                    return (
                      <div
                        key={v.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, v.id)}
                        className={`bg-[#0a101f] border border-[#1c2940] hover:border-blue-500/60 rounded-xl p-3 shadow-md hover:shadow-xl transition-all space-y-2.5 cursor-grab active:cursor-grabbing group relative ${
                          draggedVehicleId === v.id ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        {/* Header: Vehicle Code & Type + Thumbnail */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Photo / Thumbnail Icon */}
                            <div
                              onClick={() => setViewingDocsVehicle(v)}
                              className="w-8 h-8 rounded-lg bg-[#121c2d] border border-[#233552] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-blue-400"
                              title="مشاهده و ثبت مدارک و تصویر خودرو"
                            >
                              {hasPhoto ? (
                                <img
                                  src={v.documents?.vehiclePhoto}
                                  alt={`خودرو ${v.code}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Truck className="w-4 h-4 text-blue-400" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-sm font-mono text-blue-400">
                                  کد {toFaDigits(v.code)}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#172338] text-slate-300 font-medium">
                                  {VEHICLE_TYPE_NAMES[v.vehicleType]}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isExpiring && (
                              <span
                                title="هشدار نزدیک بودن تاریخ انقضای معاینه یا بیمه"
                                className="p-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <button
                              onClick={() => setStatusVehicle(v)}
                              className="p-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] flex items-center gap-0.5"
                              title="وضعیت و سوابق خودرو"
                            >
                              <Layers className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => setViewingDocsVehicle(v)}
                              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] flex items-center gap-0.5"
                              title="مدارک و اسناد"
                            >
                              <FileText className="w-3 h-3" />
                              <span className="font-mono text-[9px]">{toFaDigits(docCount)}</span>
                            </button>
                          </div>
                        </div>

                        {/* Iranian Plate Component */}
                        <div className="flex justify-center py-0.5">
                          <IranianPlate plateNumber={v.plateNumber} size="sm" />
                        </div>

                        {/* Active Mission Destination Banner if in Mission */}
                        {v.status === 'IN_MISSION' && (
                          <div className="space-y-1.5">
                            <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="truncate">{v.currentMission?.destination || 'تهران - پایانه بار غرب'}</span>
                              </div>
                              
                              <div className="flex items-center justify-between text-[10px] text-sky-300/80">
                                <span>بار: {v.currentMission?.cargo || 'کالای تجاری'}</span>
                                <span className="font-mono">حرکت: {toFaDigits(v.currentMission?.departureTime || '۱۱:۳۰')}</span>
                              </div>

                              {/* Tariff rule & Timing Info */}
                              <div className="pt-1.5 border-t border-sky-500/20 flex items-center justify-between text-[10px]">
                                <span className="flex items-center gap-1 text-amber-300">
                                  <Clock className="w-3 h-3" />
                                  <span>شروع: {toFaDigits(v.currentMission?.startTime || v.currentMission?.departureTime || '۰۸:۳۰')}</span>
                                </span>
                                <span className="flex items-center gap-1 text-cyan-300">
                                  <Users className="w-3 h-3" />
                                  <span>{toFaDigits(v.currentMission?.workerCount ?? 2)} کارگر</span>
                                </span>
                              </div>

                              <div className="bg-sky-900/30 px-1.5 py-0.5 rounded text-[9px] text-slate-300 flex items-center justify-between">
                                <span>تعرفه پایه: ۳ ساعت اول</span>
                                <span className="text-amber-400 font-bold">+ اضافه‌کار مجزای خودرو و کارگر</span>
                              </div>
                            </div>

                            {/* Explicit End of Work Trigger Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEndOfWorkVehicle(v);
                              }}
                              className="w-full py-2 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>ثبت پایان کار و تسویه تعرفه و اضافه‌کار</span>
                            </button>
                          </div>
                        )}

                        {/* Maintenance Banner if in Repair */}
                        {v.status === 'IN_MAINTENANCE' && (
                          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-[11px]">
                              <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>تعمیرگاه مرکزی حامی</span>
                            </div>
                            <div className="text-[10px] text-amber-300/80 truncate">
                              {v.maintenanceNotes || 'سرویس دوره‌ای روغن و لنت ترمز'}
                            </div>
                          </div>
                        )}

                        {/* Morning Handover & Queue Status Pill */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {v.queueStatus === 'IN_QUEUE' ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              <span>در صف نوبت بارگیری (نوبت {toFaDigits(v.queueNumber || 1)})</span>
                            </span>
                          ) : v.driverName && v.driverName !== 'بدون راننده' ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span>تحویل صبحگاهی: {v.handoverStatus === 'DELIVERED' ? `انجام شد (${toFaDigits(v.handoverTime || '۰۶:۰۰')})` : 'در انتظار تحویل'}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                              <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />
                              <span>فاقد راننده (سرویس‌دهی مسدود)</span>
                            </span>
                          )}
                        </div>

                        {/* Driver Info & Quick Call */}
                        <div className="pt-1.5 border-t border-[#17243c] flex items-center justify-between text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 text-[11px] truncate">
                              {v.driverName}
                            </div>
                            {v.driverPhone && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-slate-500" />
                                <span>{toFaDigits(v.driverPhone)}</span>
                              </div>
                            )}
                          </div>

                          {v.driverPhone && (
                            <a
                              href={`tel:${v.driverPhone}`}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                              title={`تماس تلفنی با ${v.driverName}`}
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Interactive Status Transition Quick Bar */}
                        <div className="pt-2 border-t border-[#17243c] flex items-center justify-between gap-1">
                          <span className="text-[9px] text-slate-500 shrink-0">انتقال سریع:</span>
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {col.id !== 'ACTIVE' && (
                              <button
                                onClick={() => handleMoveStatus(v, 'ACTIVE')}
                                title="آماده به کار"
                                className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              >
                                آماده
                              </button>
                            )}
                            {col.id !== 'IN_MISSION' && (
                              <button
                                onClick={() => handleMoveStatus(v, 'IN_MISSION')}
                                title="اعزام به مأموریت"
                                className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30"
                              >
                                اعزام
                              </button>
                            )}
                            {col.id !== 'PARKING' && (
                              <button
                                onClick={() => handleMoveStatus(v, 'PARKING')}
                                title="پارکینگ"
                                className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              >
                                پارک
                              </button>
                            )}
                            {col.id !== 'IN_MAINTENANCE' && (
                              <button
                                onClick={() => handleMoveStatus(v, 'IN_MAINTENANCE')}
                                title="تعمیرگاه"
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              >
                                تعمیر
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mission Dispatch Modal */}
      {dispatchVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  اعزام به مأموریت: خودرو کد {toFaDigits(dispatchVehicle.code)}
                </h3>
              </div>
              <button
                onClick={() => setDispatchVehicle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#0a101f] rounded-xl border border-[#1f2c45] flex items-center justify-between">
                <div>
                  <div className="text-slate-400">راننده مجری:</div>
                  <div className="font-bold text-slate-100 text-sm mt-0.5">{dispatchVehicle.driverName}</div>
                </div>
                <div>
                  <IranianPlate plateNumber={dispatchVehicle.plateNumber} size="sm" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">مقصد بارگیری / تخلیه</label>
                <input
                  type="text"
                  required
                  value={dispatchDestination}
                  onChange={(e) => setDispatchDestination(e.target.value)}
                  placeholder="مثال: تهران - اصفهان (انبار شماره ۲)"
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نوع محموله و توضیحات بار</label>
                <input
                  type="text"
                  required
                  value={dispatchCargo}
                  onChange={(e) => setDispatchCargo(e.target.value)}
                  placeholder="مثال: مواد غذایی فاسدنشدنی / ۵ تن"
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Tariff Rule Banner */}
              <div className="p-3 bg-gradient-to-r from-blue-950/40 to-amber-950/20 border border-amber-500/30 rounded-xl flex items-start gap-2 text-slate-300 text-[11px] leading-relaxed">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block mb-0.5">قانون تعرفه اعزام رانندگان:</strong>
                  ۳ ساعت اول مشمول مبلغ تعرفه پایه بوده و پس از آن، ساعت اضافه به‌صورت جداگانه برای ماشین و کارگر محاسبه می‌شود.
                </div>
              </div>

              {/* Start Time & Workers */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#0a101f] rounded-xl border border-[#1f2c45]">
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">ساعت شروع به کار</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      required
                      value={dispatchStartTime}
                      onChange={(e) => setDispatchStartTime(e.target.value)}
                      placeholder="08:30"
                      className="w-full bg-[#111c30] border border-[#243553] text-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const n = new Date();
                        setDispatchStartTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] whitespace-nowrap hover:bg-slate-700"
                    >
                      اکنون
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">تعداد کارگر همراه</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDispatchWorkerCount((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-cyan-300 text-xs flex-1 text-center">
                      {toFaDigits(dispatchWorkerCount)} نفر
                    </span>
                    <button
                      type="button"
                      onClick={() => setDispatchWorkerCount((c) => Math.min(8, c + 1))}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Rates preview */}
              <div className="p-2.5 bg-[#0a101f] rounded-lg border border-slate-800 text-[10px] space-y-1 text-slate-400">
                <div className="flex items-center justify-between">
                  <span>تعرفه ۳ ساعت اول ماشین:</span>
                  <span className="text-amber-300 font-mono font-bold">{toFaDigits(dispatchVehicleRate.toLocaleString('fa-IR'))} ت (ساعت اضافه: {toFaDigits(dispatchVehicleOvertime.toLocaleString('fa-IR'))} ت)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>تعرفه ۳ ساعت اول کارگران ({toFaDigits(dispatchWorkerCount)} نفر):</span>
                  <span className="text-cyan-300 font-mono font-bold">{toFaDigits((dispatchWorkerCount * dispatchWorkerRate).toLocaleString('fa-IR'))} ت (هر ساعت اضافه: {toFaDigits((dispatchWorkerCount * dispatchWorkerOvertime).toLocaleString('fa-IR'))} ت)</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">زمان حرکت و پیش‌بینی ورود</label>
                <div className="flex gap-2">
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    format="YYYY/MM/DD"
                    value={dispatchDepartureDate}
                    onChange={(dateObj: any) => {
                      if (dateObj) setDispatchDepartureDate(dateObj.format('YYYY/MM/DD'));
                    }}
                    containerClassName="w-full flex-1"
                    inputClass="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={dispatchDepartureTime}
                    onChange={(e) => setDispatchDepartureTime(e.target.value)}
                    className="w-[120px] bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setDispatchVehicle(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-900/30 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>تایید و صدور حواله اعزام</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Record Modal */}
      {maintenanceVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  پذیرش تعمیرگاه: خودرو کد {toFaDigits(maintenanceVehicle.code)}
                </h3>
              </div>
              <button
                onClick={() => setMaintenanceVehicle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmMaintenance} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">علت ارجاع به تعمیرگاه / شرح عیب</label>
                <textarea
                  rows={3}
                  required
                  value={maintenanceIssue}
                  onChange={(e) => setMaintenanceIssue(e.target.value)}
                  placeholder="مثال: تعویض روغن موتور، فیلترها، تنظیم سیستم ترمز..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-[#0a101f] rounded-xl border border-[#1f2c45] text-slate-400">
                وضعیت خودرو پس از ثبت به حالت «تعمیرگاه و عیب‌یابی» تغییر کرده و تا اتمام سرویس، در لیست آماده به کار نشان داده نخواهد شد.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setMaintenanceVehicle(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-900/30 flex items-center gap-1.5"
                >
                  <Wrench className="w-4 h-4" />
                  <span>ثبت و پذیرش در تعمیرگاه</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Document Uploader Modal directly on Kanban */}
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

      {/* End of Work Modal on Kanban */}
      {endOfWorkVehicle && (
        <EndOfWorkModal
          isOpen={true}
          vehicle={endOfWorkVehicle}
          onConfirm={(updated) => {
            onUpdateVehicle(updated);
            setEndOfWorkVehicle(null);
          }}
          onClose={() => setEndOfWorkVehicle(null)}
        />
      )}

      {/* Vehicle Status & Technical Dossier Modal on Kanban */}
      {statusVehicle && (
        <VehicleStatusModal
          isOpen={true}
          vehicle={statusVehicle}
          readOnlySpecs={true}
          onSave={(updated) => {
            onUpdateVehicle(updated);
            setStatusVehicle(updated);
          }}
          onClose={() => setStatusVehicle(null)}
        />
      )}
    </div>
  );
};
