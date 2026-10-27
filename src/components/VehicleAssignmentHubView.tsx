import React, { FC, useState, useMemo } from 'react';
import {
  Truck,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  Shield,
  Phone,
  Hash,
  X,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Send,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  List,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { Driver } from '../types';
import { VehicleItem, DriverDirectoryItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import { toFaDigits } from '../utils/jalaali';
import { IranianPlate } from './IranianPlate';

interface VehicleAssignmentHubViewProps {
  vehicles: VehicleItem[];
  drivers: Driver[];
  driverDirectory: DriverDirectoryItem[];
  onAssignDriverToVehicle: (vehicleId: string, driverNameOrNone: string, driverPhone?: string) => void;
  onAssignVehicleToDriver: (driverId: string, vehiclePlateOrNone: string) => void;
  onUpdateVehicle?: (updated: VehicleItem) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onOpenBaleForDriver?: (recipient: {
    name?: string;
    phone?: string;
    vehicleCode?: string | number;
    plateNumber?: string;
    vehicleType?: string;
  }) => void;
  theme?: 'dark' | 'light';
}

type TabFilter = 'ALL' | 'UNASSIGNED_VEHICLES' | 'ASSIGNED_VEHICLES' | 'UNASSIGNED_DRIVERS' | 'ASSIGNED_DRIVERS';
type ViewLayout = 'TABLE' | 'VEHICLES' | 'DRIVERS' | 'COMPARATIVE' | 'SPLIT_DESK';

export type AssignmentSortField =
  | 'code'
  | 'plateNumber'
  | 'vehicleType'
  | 'driverName'
  | 'driverPhone'
  | 'status'
  | 'isAssigned';

export type AssignmentSortDirection = 'asc' | 'desc';

export const VehicleAssignmentHubView: FC<VehicleAssignmentHubViewProps> = ({
  vehicles,
  drivers,
  driverDirectory,
  onAssignDriverToVehicle,
  onAssignVehicleToDriver,
  onUpdateVehicle,
  showToast,
  onOpenBaleForDriver,
  theme = 'dark',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('ALL');
  // Default to TABLE (نمایش سطری با چینش ستون‌ها)
  const [viewLayout, setViewLayout] = useState<ViewLayout>('TABLE');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('ALL');

  // Sorting state for table view
  const [assignmentSortField, setAssignmentSortField] = useState<AssignmentSortField>('code');
  const [assignmentSortDir, setAssignmentSortDir] = useState<AssignmentSortDirection>('asc');

  const handleToggleSort = (field: AssignmentSortField) => {
    if (assignmentSortField === field) {
      setAssignmentSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setAssignmentSortField(field);
      setAssignmentSortDir('asc');
    }
  };

  // Modals & Popovers
  const [assigningVehicle, setAssigningVehicle] = useState<VehicleItem | null>(null);
  const [assigningDriver, setAssigningDriver] = useState<DriverDirectoryItem | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  // Unassign confirmation modal
  const [unassignConfirm, setUnassignConfirm] = useState<{
    type: 'VEHICLE' | 'DRIVER';
    vehicleId?: string;
    vehiclePlate?: string;
    vehicleCode?: number | string;
    driverId?: string;
    driverName?: string;
  } | null>(null);

  // Normalize Persian/Arabic characters and whitespace for reliable matching
  const normalizeName = (name?: string | null): string =>
    (name || '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\s+/g, ' ')
      .trim();

  const isVehicleAssigned = (driverName?: string | null): boolean => {
    const n = normalizeName(driverName);
    return Boolean(n && n !== 'بدون راننده' && n !== 'NONE' && n !== 'بدون خودرو' && n !== 'نامشخص' && n !== '---');
  };

  const findAssignedVehicleForDriver = (driverName?: string | null): VehicleItem | undefined => {
    const target = normalizeName(driverName);
    if (!target) return undefined;
    return vehicles.find((v) => isVehicleAssigned(v.driverName) && normalizeName(v.driverName) === target);
  };

  // Active drivers list (status !== 'inactive'), deduplicated by normalized name
  const activeDrivers = useMemo(() => {
    const byNameMap = new Map<string, DriverDirectoryItem>();

    // Check if a driver is marked inactive in the main `drivers` list
    const inactiveNames = new Set<string>();
    drivers.forEach((d) => {
      if (d.status === 'inactive') {
        inactiveNames.add(normalizeName(d.name));
      }
    });

    driverDirectory.forEach((d) => {
      const normName = normalizeName(d.name);
      if (!normName) return;
      if (d.status !== 'inactive' && d.status !== 'INACTIVE' && !inactiveNames.has(normName)) {
        const assignedCar = vehicles.find(
          (v) => isVehicleAssigned(v.driverName) && normalizeName(v.driverName) === normName
        );
        byNameMap.set(normName, {
          ...d,
          code: assignedCar ? String(assignedCar.code) : d.code,
          assignedVehicles: assignedCar ? [assignedCar.plateNumber] : [],
        });
      }
    });

    // Also include any active driver from `drivers` not already in byNameMap
    drivers.forEach((d) => {
      const normName = normalizeName(d.name);
      if (!normName || d.status === 'inactive') return;
      const assignedCar = vehicles.find(
        (v) => isVehicleAssigned(v.driverName) && normalizeName(v.driverName) === normName
      );
      if (!byNameMap.has(normName)) {
        byNameMap.set(normName, {
          id: d.id,
          name: d.name,
          code: assignedCar ? String(assignedCar.code) : d.code,
          phone: d.phone,
          personnelCode: d.personnelCode || d.code,
          assignedVehicles: assignedCar ? [assignedCar.plateNumber] : [],
          status: 'ACTIVE',
          rating: 5.0,
          tripsCount: 0,
        });
      }
    });

    return Array.from(byNameMap.values()).sort((a, b) => {
      const carA = findAssignedVehicleForDriver(a.name);
      const carB = findAssignedVehicleForDriver(b.name);
      if (Boolean(carA) !== Boolean(carB)) return carA ? -1 : 1;
      if (carA && carB && carA.code !== carB.code) return (carA.code || 0) - (carB.code || 0);

      const codeA = parseInt(a.code || a.personnelCode || '999', 10);
      const codeB = parseInt(b.code || b.personnelCode || '999', 10);
      if (!isNaN(codeA) && !isNaN(codeB) && codeA !== codeB) return codeA - codeB;
      return a.name.localeCompare(b.name, 'fa');
    });
  }, [driverDirectory, drivers, vehicles]);

  // Executive KPI stats
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const assignedVehicles = vehicles.filter((v) => isVehicleAssigned(v.driverName)).length;
    const unassignedVehicles = totalVehicles - assignedVehicles;

    const totalActiveDrivers = activeDrivers.length;
    const driversWithVehicle = activeDrivers.filter((d) => Boolean(findAssignedVehicleForDriver(d.name))).length;
    const driversWithoutVehicle = Math.max(0, totalActiveDrivers - driversWithVehicle);

    return {
      totalVehicles,
      assignedVehicles,
      unassignedVehicles,
      totalActiveDrivers,
      driversWithVehicle,
      driversWithoutVehicle,
      assignmentRate: totalVehicles > 0 ? Math.round((assignedVehicles / totalVehicles) * 100) : 0,
    };
  }, [vehicles, activeDrivers]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const isAssigned = Boolean(
        v.driverName && v.driverName.trim() && v.driverName !== 'بدون راننده' && v.driverName !== 'NONE'
      );

      // Tab filter
      if (tabFilter === 'UNASSIGNED_VEHICLES' && isAssigned) return false;
      if (tabFilter === 'ASSIGNED_VEHICLES' && !isAssigned) return false;
      if (tabFilter === 'UNASSIGNED_DRIVERS' || tabFilter === 'ASSIGNED_DRIVERS') {
        // In these driver-focused tabs, keep all or hide
      }

      // Vehicle type filter
      if (vehicleTypeFilter !== 'ALL' && v.vehicleType !== vehicleTypeFilter) {
        return false;
      }

      // Search query
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const codeStr = String(v.code || '');
      const plateStr = (v.plateNumber || '').toLowerCase();
      const driverStr = (v.driverName || '').toLowerCase();
      const phoneStr = (v.driverPhone || '');
      const typeStr = (VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType || '').toLowerCase();

      return (
        codeStr.includes(q) ||
        plateStr.includes(q) ||
        driverStr.includes(q) ||
        phoneStr.includes(q) ||
        typeStr.includes(q)
      );
    }).sort((a, b) => {
      // Unassigned first if in unassigned filter, else sort by vehicle code
      const isAssignedA = Boolean(a.driverName && a.driverName !== 'بدون راننده');
      const isAssignedB = Boolean(b.driverName && b.driverName !== 'بدون راننده');
      if (tabFilter === 'ALL') {
        // In ALL tab, sort assigned first, then unassigned
        if (isAssignedA !== isAssignedB) return isAssignedA ? -1 : 1;
      }
      return (a.code || 0) - (b.code || 0);
    });
  }, [vehicles, tabFilter, vehicleTypeFilter, searchQuery]);

  // Smart Sorted Vehicles for Row Table
  const sortedAssignmentVehicles = useMemo(() => {
    const list = [...filteredVehicles];
    return list.sort((a, b) => {
      let comparison = 0;
      switch (assignmentSortField) {
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
        case 'driverPhone':
          comparison = (a.driverPhone || '').localeCompare(b.driverPhone || '', 'fa');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '', 'fa');
          break;
        case 'isAssigned': {
          const isA = Boolean(a.driverName && a.driverName !== 'بدون راننده');
          const isB = Boolean(b.driverName && b.driverName !== 'بدون راننده');
          comparison = (isA === isB) ? 0 : isA ? -1 : 1;
          break;
        }
        default:
          comparison = 0;
      }
      return assignmentSortDir === 'asc' ? comparison : -comparison;
    });
  }, [filteredVehicles, assignmentSortField, assignmentSortDir]);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return activeDrivers.filter((d) => {
      const assignedCar = findAssignedVehicleForDriver(d.name);
      const hasVehicle = Boolean(assignedCar);

      // Tab filter
      if (tabFilter === 'UNASSIGNED_DRIVERS' && hasVehicle) return false;
      if (tabFilter === 'ASSIGNED_DRIVERS' && !hasVehicle) return false;

      // Search query
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const nameStr = (d.name || '').toLowerCase();
      const codeStr = String(assignedCar?.code || d.code || d.personnelCode || '');
      const phoneStr = d.phone || '';
      const plateStr = assignedCar ? assignedCar.plateNumber.toLowerCase() : '';

      return (
        nameStr.includes(q) ||
        codeStr.includes(q) ||
        phoneStr.includes(q) ||
        plateStr.includes(q)
      );
    }).sort((a, b) => {
      // First drivers with vehicle (sorted by vehicle code), then drivers without vehicle
      const assignedCarA = findAssignedVehicleForDriver(a.name);
      const assignedCarB = findAssignedVehicleForDriver(b.name);
      const hasVehicleA = Boolean(assignedCarA);
      const hasVehicleB = Boolean(assignedCarB);

      if (hasVehicleA !== hasVehicleB) {
        return hasVehicleA ? -1 : 1;
      }

      if (assignedCarA && assignedCarB && assignedCarA.code !== assignedCarB.code) {
        return (assignedCarA.code || 0) - (assignedCarB.code || 0);
      }

      const codeA = parseInt(a.code || a.personnelCode || '999', 10);
      const codeB = parseInt(b.code || b.personnelCode || '999', 10);
      if (!isNaN(codeA) && !isNaN(codeB) && codeA !== codeB) return codeA - codeB;
      return a.name.localeCompare(b.name, 'fa');
    });
  }, [activeDrivers, vehicles, tabFilter, searchQuery]);

  // Quick actions
  const handleConfirmUnassign = () => {
    if (!unassignConfirm) return;
    if (unassignConfirm.type === 'VEHICLE' && unassignConfirm.vehicleId) {
      onAssignDriverToVehicle(unassignConfirm.vehicleId, 'بدون راننده', '');
    } else if (unassignConfirm.type === 'DRIVER' && unassignConfirm.driverId) {
      onAssignVehicleToDriver(unassignConfirm.driverId, 'NONE');
    }
    setUnassignConfirm(null);
  };

  const handleExecuteAssignDriverToVehicle = (vehicle: VehicleItem, driver: DriverDirectoryItem) => {
    onAssignDriverToVehicle(vehicle.id, driver.name, driver.phone || '');
    setAssigningVehicle(null);
    setModalSearch('');
  };

  const handleExecuteAssignVehicleToDriver = (driver: DriverDirectoryItem, vehicle: VehicleItem) => {
    onAssignDriverToVehicle(vehicle.id, driver.name, driver.phone || '');
    setAssigningDriver(null);
    setModalSearch('');
  };

  const isLight = theme === 'light';

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* 1. Header Banner & Executive Overview */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-sm ${
          isLight
            ? 'bg-gradient-to-br from-white via-amber-50/20 to-white border-slate-200'
            : 'bg-gradient-to-br from-slate-900 via-[#0d1627] to-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl sm:text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  مرکز تخصیص و واگذاری ناوگان به راننده
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Fleet Assignment Hub
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                مدیریت جامع انتساب ماشین به راننده، لغو انتساب، پایش خودروهای آزاد و رانندگان بدون خودرو با همگام‌سازی لحظه‌ای تابلوی مرخصی
              </p>
            </div>
          </div>

          {/* Quick Layout View Mode Switcher */}
          <div
            className={`flex items-center p-1 rounded-xl border self-start md:self-auto ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewLayout('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'TABLE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="نمایش سطری در قالب جدول با چینش ستون‌ها"
            >
              <List className="w-3.5 h-3.5" />
              <span>نمایش سطری (جدول)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('VEHICLES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'VEHICLES'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="نمایش کارتی ناوگان"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>کارت‌های ناوگان</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('DRIVERS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'DRIVERS'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="نمایش کارتی رانندگان"
            >
              <Users className="w-3.5 h-3.5" />
              <span>کارت‌های رانندگان</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('SPLIT_DESK')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'SPLIT_DESK'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="میز تخصیص سریع دو ستونه"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>میز تخصیص سریع</span>
            </button>
          </div>
        </div>

        {/* 2. Executive KPI Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/70">
          {/* 1. Total Fleet */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>کل ناوگان</span>
              <Truck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-slate-900 dark:text-white">
              {toFaDigits(stats.totalVehicles)}{' '}
              <span className="text-[11px] font-normal text-slate-500">خودرو</span>
            </div>
          </div>

          {/* 2. Assigned Vehicles */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span>ناوگان واگذار شده</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-emerald-700 dark:text-emerald-300">
              {toFaDigits(stats.assignedVehicles)}{' '}
              <span className="text-[11px] font-normal text-emerald-600/80">دارای راننده</span>
            </div>
          </div>

          {/* 3. Unassigned Vehicles */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              stats.unassignedVehicles > 0
                ? isLight
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-amber-950/30 border-amber-800/50'
                : isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-800/50 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
              <span>خودروهای بدون راننده</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
              {toFaDigits(stats.unassignedVehicles)}{' '}
              <span className="text-[11px] font-normal text-amber-600/80">آزاد / پارکینگ</span>
            </div>
          </div>

          {/* 4. Active Drivers */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>رانندگان فعال</span>
              <Users className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-slate-900 dark:text-white">
              {toFaDigits(stats.totalActiveDrivers)}{' '}
              <span className="text-[11px] font-normal text-slate-500">نفر</span>
            </div>
          </div>

          {/* 5. Drivers With Vehicle */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              isLight ? 'bg-blue-50/60 border-blue-200' : 'bg-blue-950/20 border-blue-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-blue-700 dark:text-blue-400">
              <span>رانندگان دارای خودرو</span>
              <Check className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-blue-700 dark:text-blue-300">
              {toFaDigits(stats.driversWithVehicle)}{' '}
              <span className="text-[11px] font-normal text-blue-600/80">مستقر</span>
            </div>
          </div>

          {/* 6. Drivers Without Vehicle */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              stats.driversWithoutVehicle > 0
                ? isLight
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-rose-950/25 border-rose-800/40'
                : isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-800/50 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-400">
              <span>رانندگان بدون خودرو</span>
              <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-rose-600 dark:text-rose-300">
              {toFaDigits(stats.driversWithoutVehicle)}{' '}
              <span className="text-[11px] font-normal text-rose-600/80">آماده واگذاری</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Interactive Filter Controls */}
      <div
        className={`rounded-xl p-3 sm:p-4 border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با پلاک، نام راننده، شماره تماس، کد پرسنلی یا کد ماشین..."
              className={`w-full pr-9 pl-8 py-2 rounded-xl text-xs sm:text-sm border transition-all outline-hidden ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                  : 'bg-slate-800/80 border-slate-700 text-white focus:border-amber-400 focus:bg-slate-800'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tabFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              همه ({toFaDigits(vehicles.length)})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('UNASSIGNED_VEHICLES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tabFilter === 'UNASSIGNED_VEHICLES'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : isLight
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-800/50 hover:bg-amber-950/70'
              }`}
            >
              خودروهای بدون راننده ({toFaDigits(stats.unassignedVehicles)})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('ASSIGNED_VEHICLES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tabFilter === 'ASSIGNED_VEHICLES'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              دارای راننده ({toFaDigits(stats.assignedVehicles)})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('UNASSIGNED_DRIVERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tabFilter === 'UNASSIGNED_DRIVERS'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : isLight
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-950/70'
              }`}
            >
              رانندگان بدون خودرو ({toFaDigits(stats.driversWithoutVehicle)})
            </button>
          </div>

          {/* Quick Sort Controls */}
          <div className="flex items-center gap-1.5 bg-[#0a101f] border border-[#1f2c45] rounded-lg px-2.5 py-1.5 self-start lg:self-auto">
            <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">مرتب‌سازی ستونی:</span>
            <select
              value={assignmentSortField}
              onChange={(e) => setAssignmentSortField(e.target.value as AssignmentSortField)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="code" className="bg-[#0f172a]">کد خودرو</option>
              <option value="plateNumber" className="bg-[#0f172a]">پلاک انتظامی</option>
              <option value="vehicleType" className="bg-[#0f172a]">نوع خودرو</option>
              <option value="driverName" className="bg-[#0f172a]">نام راننده منتسب</option>
              <option value="driverPhone" className="bg-[#0f172a]">شماره تماس</option>
              <option value="status" className="bg-[#0f172a]">وضعیت کاری</option>
              <option value="isAssigned" className="bg-[#0f172a]">وضعیت واگذاری</option>
            </select>
            <button
              type="button"
              onClick={() => setAssignmentSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="p-1 rounded bg-[#172542] hover:bg-slate-700 text-amber-400 transition cursor-pointer"
              title={assignmentSortDir === 'asc' ? 'صعودی (کلیک برای معکوس)' : 'نزولی (کلیک برای معکوس)'}
            >
              {assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT DISPLAY (BASED ON LAYOUT) */}

      {/* LAYOUT: ROW-BASED TABLE VIEW WITH COLUMN SORTING */}
      {viewLayout === 'TABLE' && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl overflow-hidden shadow-lg space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#0c1424] text-slate-300 border-b border-[#1f2c45] font-semibold select-none">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>

                  <th
                    onClick={() => handleToggleSort('code')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس کد ماشین"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>کد خودرو</span>
                      {assignmentSortField === 'code' ? (
                        assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('plateNumber')}
                    className="py-3 px-3 text-center min-w-[150px] cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس پلاک ملی"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>پلاک انتظامی</span>
                      {assignmentSortField === 'plateNumber' ? (
                        assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('vehicleType')}
                    className="py-3 px-3 cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس نوع و مدل خودرو"
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>نوع خودرو</span>
                      {assignmentSortField === 'vehicleType' ? (
                        assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('driverName')}
                    className="py-3 px-3 cursor-pointer hover:bg-[#152238] transition-colors min-w-[170px]"
                    title="کلیک برای مرتب‌سازی بر اساس نام راننده"
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>راننده منتسب</span>
                      {assignmentSortField === 'driverName' ? (
                        assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('driverPhone')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس شماره تماس"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>شماره تماس</span>
                      {assignmentSortField === 'driverPhone' ? (
                        assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('status')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس وضعیت عملیاتی"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>وضعیت خودرو</span>
                      {assignmentSortField === 'status' ? (
                        assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('isAssigned')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#152238] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس وضعیت واگذاری"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>وضعیت واگذاری</span>
                      {assignmentSortField === 'isAssigned' ? (
                        assignmentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-3 text-center w-52">عملیات تخصیص و واگذاری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172338]">
                {sortedAssignmentVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      خودرویی مطابق با فیلترهای جستجو یافت نشد.
                    </td>
                  </tr>
                ) : (
                  sortedAssignmentVehicles.map((vehicle, idx) => {
                    const isAssigned = Boolean(
                      vehicle.driverName &&
                      vehicle.driverName.trim() &&
                      vehicle.driverName !== 'بدون راننده' &&
                      vehicle.driverName !== 'NONE'
                    );

                    return (
                      <tr key={vehicle.id} className="hover:bg-[#152238] transition-colors text-slate-200">
                        {/* Index */}
                        <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {toFaDigits(idx + 1)}
                        </td>

                        {/* Code */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                          {toFaDigits(vehicle.code)}
                        </td>

                        {/* Plate */}
                        <td className="py-3 px-3 text-center">
                          <IranianPlate plateNumber={vehicle.plateNumber} scale={0.75} />
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Truck className="w-3.5 h-3.5 text-blue-400" />
                            <span>{VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.vehicleType}</span>
                          </div>
                        </td>

                        {/* Driver */}
                        <td className="py-3 px-3">
                          {isAssigned ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                                {vehicle.driverName.slice(0, 1)}
                              </div>
                              <span className="font-bold text-white text-xs">{vehicle.driverName}</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              بدون راننده (آزاد)
                            </span>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs">
                          {vehicle.driverPhone ? toFaDigits(vehicle.driverPhone) : '---'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              vehicle.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : vehicle.status === 'IN_MISSION'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : vehicle.status === 'IN_MAINTENANCE'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                            }`}
                          >
                            {vehicle.status === 'ACTIVE'
                              ? 'آماده به کار'
                              : vehicle.status === 'IN_MISSION'
                              ? 'در مأموریت'
                              : vehicle.status === 'IN_MAINTENANCE'
                              ? 'تعمیرگاه'
                              : 'پارکینگ'}
                          </span>
                        </td>

                        {/* Assignment Status */}
                        <td className="py-3 px-3 text-center">
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تخصیص‌یافته</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              <span>آزاد / آماده واگذاری</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isAssigned ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setAssigningVehicle(vehicle)}
                                  className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="تغییر راننده منتسب به این خودرو"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>تغییر راننده</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUnassignConfirm({
                                      type: 'VEHICLE',
                                      vehicleId: vehicle.id,
                                      vehiclePlate: vehicle.plateNumber,
                                      vehicleCode: vehicle.code,
                                      driverName: vehicle.driverName,
                                    })
                                  }
                                  className="p-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                                  title="لغو واگذاری خودرو و بازگرداندن به حالت آزاد"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                                {onOpenBaleForDriver && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOpenBaleForDriver({
                                        name: vehicle.driverName,
                                        phone: vehicle.driverPhone,
                                        vehicleCode: vehicle.code,
                                        plateNumber: vehicle.plateNumber,
                                        vehicleType: VEHICLE_TYPE_NAMES[vehicle.vehicleType],
                                      })
                                    }
                                    className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                                    title="ارسال پیامک و مشخصات در بله"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAssigningVehicle(vehicle)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>واگذاری به راننده</span>
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
      )}

      {/* LAYOUT A: VEHICLES VIEW */}
      {viewLayout === 'VEHICLES' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              نمایش {toFaDigits(filteredVehicles.length)} خودرو بر اساس فیلتر
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredVehicles.map((vehicle) => {
              const isAssigned = Boolean(
                vehicle.driverName &&
                vehicle.driverName.trim() &&
                vehicle.driverName !== 'بدون راننده' &&
                vehicle.driverName !== 'NONE'
              );

              return (
                <div
                  key={vehicle.id}
                  className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                    isAssigned
                      ? isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
                      : isLight
                      ? 'bg-amber-50/40 border-amber-300/80 shadow-xs ring-1 ring-amber-400/20'
                      : 'bg-[#151a24] border-amber-500/40 shadow-sm ring-1 ring-amber-500/20'
                  }`}
                >
                  {/* Top Badge: Vehicle Code & Type */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-800 text-white dark:bg-slate-700 shadow-xs">
                          کد {toFaDigits(vehicle.code)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.vehicleType}
                        </span>
                      </div>

                      {/* Status indicator badge */}
                      {isAssigned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>دارای راننده</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>بدون راننده (آزاد)</span>
                        </span>
                      )}
                    </div>

                    {/* Iranian Plate Display */}
                    <div className="my-2 flex justify-center">
                      <IranianPlate plateNumber={vehicle.plateNumber} size="md" />
                    </div>

                    {/* Driver details card section */}
                    <div
                      className={`mt-3 p-3 rounded-xl border ${
                        isAssigned
                          ? isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-800/60 border-slate-700/60'
                          : isLight
                          ? 'bg-amber-50 border-amber-200/80'
                          : 'bg-amber-950/20 border-amber-900/40'
                      }`}
                    >
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        راننده منتسب:
                      </div>

                      {isAssigned ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                              {vehicle.driverName?.slice(0, 1) || 'ر'}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white">
                                {vehicle.driverName}
                              </div>
                              {vehicle.driverPhone && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span dir="ltr">{toFaDigits(vehicle.driverPhone)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Bale Messenger Button */}
                          {onOpenBaleForDriver && vehicle.driverPhone && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenBaleForDriver({
                                  name: vehicle.driverName,
                                  phone: vehicle.driverPhone,
                                  vehicleCode: vehicle.code,
                                  plateNumber: vehicle.plateNumber,
                                  vehicleType: vehicle.vehicleType,
                                })
                              }
                              title="ارسال پیامک / پیام بله به راننده"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs py-1">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>این خودرو در حال حاضر راننده‌ای ندارد و در پارکینگ متوقف است.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssigningVehicle(vehicle)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
                        isAssigned
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-sm'
                      }`}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>{isAssigned ? 'تغییر راننده' : 'تخصیص راننده به خودرو'}</span>
                    </button>

                    {isAssigned && (
                      <button
                        type="button"
                        onClick={() =>
                          setUnassignConfirm({
                            type: 'VEHICLE',
                            vehicleId: vehicle.id,
                            vehicleCode: vehicle.code,
                            vehiclePlate: vehicle.plateNumber,
                            driverName: vehicle.driverName,
                          })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isLight
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-rose-950/30 text-rose-300 border-rose-800/50 hover:bg-rose-950/60'
                        }`}
                        title="لغو انتساب راننده از این خودرو"
                      >
                        لغو واگذاری
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LAYOUT B: DRIVERS VIEW */}
      {viewLayout === 'DRIVERS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              نمایش {toFaDigits(filteredDrivers.length)} راننده فعال (ابتدا رانندگان دارای خودرو، سپس رانندگان بدون خودرو)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredDrivers.map((driver) => {
              const assignedVehicle = findAssignedVehicleForDriver(driver.name);
              const hasVehicle = Boolean(assignedVehicle);
              const plateDisplay = assignedVehicle?.plateNumber;

              return (
                <div
                  key={driver.id}
                  className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                    hasVehicle
                      ? isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
                      : isLight
                      ? 'bg-rose-50/40 border-rose-200/80 shadow-xs'
                      : 'bg-[#1a1419] border-rose-900/40 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Driver Header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500/20 to-blue-500/20 text-slate-900 dark:text-white flex items-center justify-center font-black text-sm border border-slate-300 dark:border-slate-700">
                          {driver.name.slice(0, 1)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {driver.name}
                          </h3>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>کد پرسنلی: {toFaDigits(driver.code || driver.personnelCode || '')}</span>
                            {driver.phone && (
                              <span dir="ltr" className="text-slate-500">
                                {toFaDigits(driver.phone)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasVehicle ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          دارای خودرو
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          بدون خودرو (ذخیره)
                        </span>
                      )}
                    </div>

                    {/* Assigned Vehicle Section */}
                    <div
                      className={`mt-3 p-3 rounded-xl border ${
                        hasVehicle
                          ? isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-800/50 border-slate-700/60'
                          : isLight
                          ? 'bg-rose-50 border-rose-200/60'
                          : 'bg-rose-950/20 border-rose-900/40'
                      }`}
                    >
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>ناوگان اختصاصی:</span>
                        {assignedVehicle && (
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            کد {toFaDigits(assignedVehicle.code)} (
                            {VEHICLE_TYPE_NAMES[assignedVehicle.vehicleType] || assignedVehicle.vehicleType})
                          </span>
                        )}
                      </div>

                      {hasVehicle && plateDisplay ? (
                        <div className="flex justify-center my-1">
                          <IranianPlate plateNumber={plateDisplay} size="sm" />
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-rose-600 dark:text-rose-400 py-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>خودرویی به این راننده اختصاص داده نشده است.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssigningDriver(driver)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
                        hasVehicle
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-sm'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{hasVehicle ? 'تغییر خودرو' : '+ واگذاری خودرو'}</span>
                    </button>

                    {hasVehicle && (
                      <button
                        type="button"
                        onClick={() =>
                          setUnassignConfirm({
                            type: 'DRIVER',
                            driverId: driver.id,
                            driverName: driver.name,
                            vehiclePlate: plateDisplay,
                          })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isLight
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-rose-950/30 text-rose-300 border-rose-800/50 hover:bg-rose-950/60'
                        }`}
                        title="لغو خودرو از این راننده"
                      >
                        لغو انتساب
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LAYOUT C: SPLIT DESK (SIDE BY SIDE FAST ASSIGNMENT) */}
      {viewLayout === 'SPLIT_DESK' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column 1: Unassigned / Available Vehicles */}
          <div
            className={`rounded-2xl p-4 border ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  خودروهای آزاد و بدون راننده ({toFaDigits(stats.unassignedVehicles)})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">آماده واگذاری فوری</span>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {vehicles
                .filter((v) => !v.driverName || v.driverName === 'بدون راننده' || v.driverName === 'NONE')
                .map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-black bg-slate-800 text-white">
                          کد {toFaDigits(vehicle.code)}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.vehicleType}
                        </span>
                      </div>
                      <IranianPlate plateNumber={vehicle.plateNumber} size="sm" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setAssigningVehicle(vehicle)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shrink-0"
                    >
                      + واگذاری راننده
                    </button>
                  </div>
                ))}

              {stats.unassignedVehicles === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                  تمامی خودروهای ناوگان در حال حاضر دارای راننده فعال می‌باشند.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Unassigned / Reserve Drivers */}
          <div
            className={`rounded-2xl p-4 border ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  رانندگان آزاد و بدون خودرو ({toFaDigits(stats.driversWithoutVehicle)})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">رانندگان ذخیره و آماده به‌کار</span>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {activeDrivers
                .filter((d) => !findAssignedVehicleForDriver(d.name))
                .map((driver) => (
                  <div
                    key={driver.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {driver.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        کد: {toFaDigits(driver.code || driver.personnelCode || '')} | {driver.phone || 'بدون تلفن'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAssigningDriver(driver)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shrink-0"
                    >
                      + واگذاری خودرو
                    </button>
                  </div>
                ))}

              {stats.driversWithoutVehicle === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                  همه رانندگان فعال دارای خودرو اختصاصی می‌باشند.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PICK DRIVER FOR VEHICLE */}
      {assigningVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl flex flex-col max-h-[85vh] ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-700'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    تخصیص راننده به خودرو کد {toFaDigits(assigningVehicle.code)}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>{VEHICLE_TYPE_NAMES[assigningVehicle.vehicleType] || assigningVehicle.vehicleType}</span>
                    <span>•</span>
                    <span dir="ltr">{toFaDigits(assigningVehicle.plateNumber)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssigningVehicle(null);
                  setModalSearch('');
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search in Drivers */}
            <div className="my-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="جستجوی راننده بر اساس نام یا کد..."
                  className={`w-full pr-8 pl-3 py-1.5 rounded-lg text-xs border ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            {/* Drivers list to choose from */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeDrivers
                .filter((d) => {
                  if (!modalSearch.trim()) return true;
                  const q = modalSearch.toLowerCase();
                  return (
                    d.name.toLowerCase().includes(q) ||
                    String(d.code || '').includes(q) ||
                    (d.phone && d.phone.includes(q))
                  );
                })
                .map((driver) => {
                  const currentlyHasVehicle = findAssignedVehicleForDriver(driver.name);
                  const isCurrentOfThisVehicle =
                    normalizeName(assigningVehicle.driverName) === normalizeName(driver.name);

                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => handleExecuteAssignDriverToVehicle(assigningVehicle, driver)}
                      className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isCurrentOfThisVehicle
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : isLight
                          ? 'hover:bg-amber-50 hover:border-amber-300 border-slate-200'
                          : 'hover:bg-slate-800 hover:border-slate-600 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{driver.name}</span>
                          {isCurrentOfThisVehicle && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                              راننده فعلی
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          کد: {toFaDigits(driver.code || driver.personnelCode || '')}
                          {driver.phone && ` | تلفن: ${toFaDigits(driver.phone)}`}
                        </div>
                      </div>

                      <div>
                        {currentlyHasVehicle && !isCurrentOfThisVehicle ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            در اختیار خودرو {toFaDigits(currentlyHasVehicle.code)}
                          </span>
                        ) : !currentlyHasVehicle ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            آزاد (بدون خودرو)
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAssigningVehicle(null);
                  setModalSearch('');
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PICK VEHICLE FOR DRIVER */}
      {assigningDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl flex flex-col max-h-[85vh] ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-700'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    واگذاری خودرو به راننده «{assigningDriver.name}»
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    کد پرسنلی: {toFaDigits(assigningDriver.code || assigningDriver.personnelCode || '')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssigningDriver(null);
                  setModalSearch('');
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="my-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="جستجوی پلاک، کد خودرو یا نوع ماشین..."
                  className={`w-full pr-8 pl-3 py-1.5 rounded-lg text-xs border ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            {/* Vehicles list to choose from */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {vehicles
                .filter((v) => {
                  if (!modalSearch.trim()) return true;
                  const q = modalSearch.toLowerCase();
                  return (
                    String(v.code || '').includes(q) ||
                    (v.plateNumber && v.plateNumber.toLowerCase().includes(q)) ||
                    (v.driverName && v.driverName.toLowerCase().includes(q))
                  );
                })
                .sort((a, b) => {
                  // Put unassigned vehicles first
                  const isFreeA = !a.driverName || a.driverName === 'بدون راننده';
                  const isFreeB = !b.driverName || b.driverName === 'بدون راننده';
                  if (isFreeA !== isFreeB) return isFreeA ? -1 : 1;
                  return (a.code || 0) - (b.code || 0);
                })
                .map((vehicle) => {
                  const isFree = !isVehicleAssigned(vehicle.driverName);
                  const isCurrentlyThisDriver =
                    normalizeName(vehicle.driverName) === normalizeName(assigningDriver.name);

                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => handleExecuteAssignVehicleToDriver(assigningDriver, vehicle)}
                      className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isCurrentlyThisDriver
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : isFree
                          ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
                          : isLight
                          ? 'hover:bg-slate-50 border-slate-200'
                          : 'hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-black bg-slate-800 text-white">
                            کد {toFaDigits(vehicle.code)}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.vehicleType}
                          </span>
                          {isFree && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold">
                              آزاد
                            </span>
                          )}
                        </div>
                        <IranianPlate plateNumber={vehicle.plateNumber} size="sm" />
                      </div>

                      <div className="text-left text-xs">
                        {isCurrentlyThisDriver ? (
                          <span className="text-emerald-500 font-bold">خودروی فعلی</span>
                        ) : !isFree ? (
                          <span className="text-slate-400 text-[11px]">
                            راننده فعلی: {vehicle.driverName}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-bold text-[11px]">+ انتخاب</span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAssigningDriver(null);
                  setModalSearch('');
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: UNASSIGN */}
      {unassignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأیید لغو واگذاری خودرو
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {unassignConfirm.type === 'VEHICLE' ? (
                <>
                  آیا از لغو انتساب خودرو کد{' '}
                  <span className="font-bold text-amber-500">
                    {toFaDigits(unassignConfirm.vehicleCode || '')}
                  </span>{' '}
                  (پلاک {unassignConfirm.vehiclePlate}) از راننده «{unassignConfirm.driverName}» اطمینان دارید؟ این خودرو به وضعیت «فاقد راننده» تغییر خواهد یافت.
                </>
              ) : (
                <>
                  آیا از لغو خودرو از پرونده راننده «
                  <span className="font-bold text-amber-500">{unassignConfirm.driverName}</span>» اطمینان دارید؟ راننده به حالت «بدون خودرو (ذخیره)» منتقل می‌شود.
                </>
              )}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUnassignConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassign}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm"
              >
                بله، لغو واگذاری انجام شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
