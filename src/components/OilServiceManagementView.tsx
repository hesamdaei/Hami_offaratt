import React, { FC, useState, useMemo, useEffect, FormEvent } from 'react';
import {
  Droplet,
  Car,
  Truck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Gauge,
  Edit,
  History,
  Sliders,
  RotateCcw,
  Plus,
  X,
  Clock,
  Wrench,
  Check,
  FileText,
  Printer,
  Info,
  ShieldAlert,
  LayoutGrid,
  List,
  Zap,
} from 'lucide-react';
import { VehicleItem, VEHICLE_TYPE_NAMES, DriverDirectoryItem } from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import {
  toFaDigits,
  getTodayJalaali,
  parseJalaaliDate,
  calculateDaysBetweenJalaali,
  addJalaaliDays,
  formatJalaaliDate,
} from '../utils/jalaali';
import { VehicleSpecificationsModal } from './VehicleSpecificationsModal';
import { PersianDatePicker } from './PersianDatePicker';
import { getFleetInsuranceAlerts } from '../utils/insuranceAlerts';
import { FleetInsuranceAlertsView } from './FleetInsuranceAlertsView';
import { VehicleCard } from './VehicleCard';
import { VehicleSpecPrintModal } from './VehicleSpecPrintModal';
import { TableListA4PrintModal, TableListColumn } from './TableListA4PrintModal';
import {
  ServiceRule,
  DEFAULT_SERVICE_RULES,
  MaintenanceItemStandard,
  MaintenanceCategory,
  MAINTENANCE_CATEGORY_LABELS,
  DEFAULT_MAINTENANCE_ITEMS,
  getStoredServiceRules,
  saveStoredServiceRules,
  getStoredMaintenanceItems,
  saveStoredMaintenanceItems,
  resetMaintenanceItemsToDefault,
  resetServiceRulesToDefault,
  evaluateVehicleServiceStatus,
} from '../utils/maintenanceStandardsConfig';

export type { ServiceRule, MaintenanceItemStandard, MaintenanceCategory };
export { DEFAULT_SERVICE_RULES, DEFAULT_MAINTENANCE_ITEMS, MAINTENANCE_CATEGORY_LABELS };

export interface ServiceHistoryEntry {
  id?: string;
  date: string;
  mileage?: number;
  currentMileageAtService?: number;
  trips?: number;
  oilBrand?: string;
  oilFilterChanged?: boolean;
  airFilterChanged?: boolean;
  fuelFilterChanged?: boolean;
  technicianOrShop?: string;
  invoiceNumber?: string;
  cost?: number | string;
  notes?: string;
}

export interface OilUndoAction {
  id: string;
  actionType: 'QUICK_SERVICE' | 'MANUAL_ENTRY' | 'USAGE_UPDATE';
  vehicleId: string;
  vehicleCode: number;
  driverName: string;
  title: string;
  details: string;
  timestamp: string;
  previousVehicleState: VehicleItem;
}

export interface EnrichedVehicle extends VehicleItem {
  _rule: ServiceRule;
  _lastChangeDate: string;
  _daysPassed: number;
  _daysRemaining: number;
  _daysOverdue: number;
  _nextDueDateStr: string;
  _tripsDriven: number;
  _maxTrips: number;
  _tripsRemaining: number;
  _tripsOverdue: number;
  _mileageDriven: number;
  _currentMileage: number;
  _lastChangeMileage: number;
  _nextServiceMileage: number;
  _mileageRemaining: number;
  _mileageOverdue: number;
  _isMileageInconsistent: boolean;
  _mileagePercent: number;
  _serviceStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  _statusText: string;
  _hasCompletedOilChange: boolean;
}

interface OilServiceManagementViewProps {
  vehicles: VehicleItem[];
  onUpdateVehicle: (updated: VehicleItem) => void;
  availableDrivers?: DriverDirectoryItem[];
  onAssignDriverToVehicle?: (vehicleId: string, driverNameOrNone: string, driverPhone?: string) => void;
  onNavigateToFleet?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialSubTab?: SubTab;
  highlightedVehicleId?: string | null;
  onOpenBaleForDriver?: (info: { name: string; phone?: string; vehicleCode?: number; plateNumber?: string }) => void;
}

export type SubTab = 'SPECIFICATIONS' | 'DASHBOARD' | 'INSURANCE_ALERTS' | 'ENTRY' | 'HISTORY' | 'RULES';

export const OilServiceManagementView: FC<OilServiceManagementViewProps> = ({
  vehicles,
  onUpdateVehicle,
  availableDrivers = [],
  onAssignDriverToVehicle,
  showToast,
  initialSubTab,
  highlightedVehicleId,
  onOpenBaleForDriver,
}) => {
  const todayInfo = getTodayJalaali();
  const todayStr = `${todayInfo.jy}/${String(todayInfo.jm).padStart(2, '0')}/${String(todayInfo.jd).padStart(2, '0')}`;

  // Normalize legacy subTabs ('DASHBOARD' | 'ENTRY' | 'SPECIFICATIONS') into the unified 'SPECIFICATIONS' hub
  const normalizeSubTab = (tab?: SubTab): SubTab => {
    if (!tab) return 'SPECIFICATIONS';
    if (tab === 'DASHBOARD' || tab === 'ENTRY') return 'SPECIFICATIONS';
    return tab;
  };

  const [subTab, setSubTab] = useState<SubTab>(() => normalizeSubTab(initialSubTab));
  // Unified view mode inside the main Fleet Hub: 'TABLE' (compact operational list) or 'CARDS' (visual cards)
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>(() =>
    initialSubTab === 'SPECIFICATIONS' ? 'CARDS' : 'TABLE'
  );

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(normalizeSubTab(initialSubTab));
      if (initialSubTab === 'DASHBOARD' || initialSubTab === 'ENTRY') {
        setViewMode('TABLE');
      } else if (initialSubTab === 'SPECIFICATIONS') {
        setViewMode('CARDS');
      }
    }
  }, [initialSubTab]);

  // Compute fleet insurance alert metrics
  const insuranceAlertData = useMemo(() => {
    return getFleetInsuranceAlerts(vehicles, 7);
  }, [vehicles]);

  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'KHAAVAR_DUE' | 'HAS_MILEAGE'
  >('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modal 0: Vehicle Full Specifications Dossier Modal
  const [specsVehicle, setSpecsVehicle] = useState<VehicleItem | null>(null);
  const [printingVehicle, setPrintingVehicle] = useState<VehicleItem | null>(null);

  // Rules state (stored in localStorage)
  const [rules, setRules] = useState<Record<string, ServiceRule>>(() => getStoredServiceRules());

  // Maintenance items & components standards state (stored in localStorage)
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItemStandard[]>(() => getStoredMaintenanceItems());
  const [rulesCategory, setRulesCategory] = useState<'VEHICLES' | 'ITEMS'>('VEHICLES');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('ALL');
  const [itemSearch, setItemSearch] = useState<string>('');

  // Modal for editing individual maintenance item standard
  const [editingItemStandard, setEditingItemStandard] = useState<MaintenanceItemStandard | null>(null);

  // Modal for adding a new custom maintenance item standard
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<MaintenanceCategory>('FLUIDS');
  const [newItemMaxKm, setNewItemMaxKm] = useState(10000);
  const [newItemMaxDays, setNewItemMaxDays] = useState(180);
  const [newItemWarningKm, setNewItemWarningKm] = useState(1000);
  const [newItemDesc, setNewItemDesc] = useState('');

  // Modal for editing an existing vehicle type service rule
  const [editingRuleKey, setEditingRuleKey] = useState<string | null>(null);
  const [editRuleLabel, setEditRuleLabel] = useState('');
  const [editRuleDays, setEditRuleDays] = useState(45);
  const [editRuleTrips, setEditRuleTrips] = useState(45);
  const [editRuleMileage, setEditRuleMileage] = useState(5000);
  const [editRuleWarningMileage, setEditRuleWarningMileage] = useState(500);
  const [editRuleHasMileage, setEditRuleHasMileage] = useState(true);

  // Unified Action Modal (Combines Oil Change + Daily Usage/Odometer + Vehicle Service History in 1 clean window)
  const [manualOilVehicle, setManualOilVehicle] = useState<VehicleItem | null>(null);
  const [serviceModalTab, setServiceModalTab] = useState<'OIL_SERVICE' | 'USAGE' | 'HISTORY'>('OIL_SERVICE');

  // Oil Change Form States
  const [manualOilChangeMileage, setManualOilChangeMileage] = useState<number>(0);
  const [manualCurrentMileage, setManualCurrentMileage] = useState<number>(0);
  const [manualOilChangeDate, setManualOilChangeDate] = useState<string>('');
  const [manualTripsSinceChange, setManualTripsSinceChange] = useState<number>(0);
  const [manualOilBrand, setManualOilBrand] = useState<string>('بهران دیزل سوپر ۱۵W۴۰');
  const [manualOilFilter, setManualOilFilter] = useState<boolean>(true);
  const [manualAirFilter, setManualAirFilter] = useState<boolean>(true);
  const [manualFuelFilter, setManualFuelFilter] = useState<boolean>(false);
  const [manualShopName, setManualShopName] = useState<string>('');
  const [manualInvoiceNo, setManualInvoiceNo] = useState<string>('');
  const [manualCost, setManualCost] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Daily Usage Form States (inside unified modal)
  const [usageMileage, setUsageMileage] = useState<number>(0);
  const [usageTrips, setUsageTrips] = useState<number>(0);
  const [usageDate, setUsageDate] = useState<string>(todayStr);

  // Modal 4: Add New Service Rule
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleKey, setNewRuleKey] = useState('');
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [newRuleDays, setNewRuleDays] = useState(45);
  const [newRuleTrips, setNewRuleTrips] = useState(45);
  const [newRuleMileage, setNewRuleMileage] = useState(5000);
  const [newRuleHasMileage, setNewRuleHasMileage] = useState(true);

  // History search & date filters
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');

  // Undo Stack state for last oil service change
  const [undoStack, setUndoStack] = useState<OilUndoAction[]>([]);

  // Undo last action (or specific action)
  const handleUndo = (actionId?: string) => {
    if (undoStack.length === 0) return;
    const target = actionId ? undoStack.find((a) => a.id === actionId) : undoStack[0];
    if (!target) return;

    onUpdateVehicle(target.previousVehicleState);
    setUndoStack((prev) => prev.filter((a) => a.id !== target.id));

    if (showToast) {
      showToast(
        `عملیات «${target.title}» واگردانی شد و اطلاعات خودرو کد ${toFaDigits(target.vehicleCode)} به حالت قبل بازگشت.`,
        'info'
      );
    }
  };

  // Keyboard shortcut Ctrl+Z / Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoStack.length > 0 && !manualOilVehicle && !isAddRuleOpen) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, manualOilVehicle, isAddRuleOpen]);

  // Enriched vehicles using unified evaluateVehicleServiceStatus (fixes KHAAVAR vs mileage vehicle calculation)
  const enrichedVehicles: EnrichedVehicle[] = useMemo(() => {
    return vehicles.map((v) => {
      const evalResult = evaluateVehicleServiceStatus(v, rules);

      return {
        ...v,
        _rule: evalResult.rule,
        _lastChangeDate: evalResult.lastChangeDate,
        _daysPassed: evalResult.daysPassed,
        _daysRemaining: evalResult.daysRemaining,
        _daysOverdue: evalResult.daysOverdue,
        _nextDueDateStr: evalResult.nextDueDateStr,
        _tripsDriven: evalResult.tripsDriven,
        _maxTrips: evalResult.maxTrips,
        _tripsRemaining: evalResult.tripsRemaining,
        _tripsOverdue: evalResult.tripsOverdue,
        _mileageDriven: evalResult.drivenKm,
        _currentMileage: evalResult.currentMileage,
        _lastChangeMileage: evalResult.lastChangeMileage,
        _nextServiceMileage: evalResult.nextTargetKm,
        _mileageRemaining: evalResult.remainingKm,
        _mileageOverdue: evalResult.overdueKm,
        _isMileageInconsistent: evalResult.isInconsistent,
        _mileagePercent: evalResult.wearPercent,
        _serviceStatus: evalResult.status,
        _statusText: `${toFaDigits(evalResult.statusText)} (${toFaDigits(evalResult.statusReason)})`,
        _hasCompletedOilChange: evalResult.hasCompletedOilChange,
      };
    });
  }, [vehicles, rules]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return enrichedVehicles.filter((v) => {
      const matchSearch =
        v.code.toString().includes(search) ||
        v.driverName.includes(search) ||
        v.plateNumber.includes(search);
      const matchType = typeFilter === 'ALL' || v.vehicleType === typeFilter;

      let matchStatus = true;
      if (statusFilter === 'ALL') {
        matchStatus = true;
      } else if (statusFilter === 'HAS_MILEAGE') {
        matchStatus = v._rule.hasMileage;
      } else if (statusFilter === 'KHAAVAR_DUE') {
        matchStatus = !v._rule.hasMileage && (v._serviceStatus === 'CRITICAL' || v._serviceStatus === 'WARNING');
      } else {
        matchStatus = v._serviceStatus === statusFilter;
      }

      return matchSearch && matchType && matchStatus;
    });
  }, [enrichedVehicles, search, typeFilter, statusFilter]);

  // Overall statistics with accurate Khaavar vs Mileage breakdown
  const stats = useMemo(() => {
    const total = enrichedVehicles.length;
    const critical = enrichedVehicles.filter((v) => v._serviceStatus === 'CRITICAL').length;
    const warning = enrichedVehicles.filter((v) => v._serviceStatus === 'WARNING').length;
    const healthy = enrichedVehicles.filter((v) => v._serviceStatus === 'HEALTHY').length;
    const withMileage = enrichedVehicles.filter((v) => v._rule.hasMileage).length;
    const khaavarTotal = enrichedVehicles.filter((v) => !v._rule.hasMileage).length;
    const khaavarCritical = enrichedVehicles.filter((v) => !v._rule.hasMileage && v._serviceStatus === 'CRITICAL').length;
    const khaavarWarning = enrichedVehicles.filter((v) => !v._rule.hasMileage && v._serviceStatus === 'WARNING').length;
    const khaavarDue = khaavarCritical + khaavarWarning;
    const servicedCount = enrichedVehicles.filter((v) => v._hasCompletedOilChange).length;
    return {
      total,
      critical,
      warning,
      healthy,
      withMileage,
      khaavarTotal,
      khaavarCritical,
      khaavarWarning,
      khaavarDue,
      servicedCount,
    };
  }, [enrichedVehicles]);

  const [isPrintListOpen, setIsPrintListOpen] = useState(false);

  // Print Columns for Fleet Specifications List
  const fleetSpecPrintColumns: TableListColumn<VehicleItem>[] = useMemo(
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

  const fleetSpecSummaryCards = useMemo(
    () => [
      { label: 'کل ناوگان ثبت‌شده', value: `${toFaDigits(vehicles.length)} دستگاه`, color: 'text-blue-900' },
      {
        label: 'آماده به کار',
        value: `${toFaDigits(vehicles.filter((v) => v.status === 'ACTIVE').length)} دستگاه`,
        color: 'text-emerald-900',
      },
      {
        label: 'در مأموریت',
        value: `${toFaDigits(vehicles.filter((v) => v.status === 'IN_MISSION').length)} دستگاه`,
        color: 'text-sky-900',
      },
      {
        label: 'تعمیرگاه و سرویس',
        value: `${toFaDigits(vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length)} دستگاه`,
        color: 'text-amber-900',
      },
      {
        label: 'بدون راننده',
        value: `${toFaDigits(vehicles.filter((v) => !v.driverName || v.driverName === 'بدون راننده').length)} دستگاه`,
        color: 'text-rose-900',
      },
    ],
    [vehicles]
  );

  // Open Unified Service & Usage Modal
  const handleOpenManualOilModal = (
    v: VehicleItem,
    initialTab: 'OIL_SERVICE' | 'USAGE' | 'HISTORY' = 'OIL_SERVICE'
  ) => {
    const evalStatus = evaluateVehicleServiceStatus(v, rules);
    const hasMileage = evalStatus.rule.hasMileage;
    const currMil = evalStatus.currentMileage;
    const lastMil = evalStatus.lastChangeMileage;

    setManualOilVehicle(v);
    setServiceModalTab(initialTab);

    // Pre-fill Oil Service tab: default to today's date & current mileage for fast 1-step recording
    setManualOilChangeMileage(hasMileage ? currMil : 0);
    setManualCurrentMileage(hasMileage ? currMil : 0);
    setManualOilChangeDate(todayStr);
    setManualTripsSinceChange(0);
    setManualOilBrand(v.lastOilBrand || 'بهران دیزل سوپر ۱۵W۴۰');
    setManualOilFilter(v.oilFilterChanged !== false);
    setManualAirFilter(v.airFilterChanged !== false);
    setManualFuelFilter(!!v.fuelFilterChanged);
    setManualShopName('');
    setManualInvoiceNo('');
    setManualCost('');
    setManualNotes(v.serviceNotes || '');

    // Pre-fill Daily Usage tab
    setUsageMileage(hasMileage ? currMil : lastMil);
    setUsageTrips(evalStatus.tripsDriven);
    setUsageDate(v.lastStatusDate || todayStr);
  };

  // Quick 1-click Service Completed (Today) — handles both Khaavar (non-mileage) and Mileage vehicles accurately
  const handleQuickCompleteService = (v: VehicleItem) => {
    const evalStatus = evaluateVehicleServiceStatus(v, rules);
    const hasMileage = evalStatus.rule.hasMileage;
    const currMil = hasMileage ? evalStatus.currentMileage : 0;

    const undoItem: OilUndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actionType: 'QUICK_SERVICE',
      vehicleId: v.id,
      vehicleCode: v.code,
      driverName: v.driverName,
      title: `ثبت تعویض روغن خودرو کد ${toFaDigits(v.code)}`,
      details: hasMileage
        ? `کیلومتر ${toFaDigits(currMil.toLocaleString('fa-IR'))} در تاریخ ${toFaDigits(todayStr)}`
        : `تمدید دوره ۶۰ روزه و صفر شدن سفرها در تاریخ ${toFaDigits(todayStr)}`,
      timestamp: todayStr,
      previousVehicleState: { ...v },
    };
    setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);

    const newHistoryItem: ServiceHistoryEntry = {
      id: `srv-${Date.now()}`,
      date: todayStr,
      mileage: hasMileage ? currMil : undefined,
      currentMileageAtService: hasMileage ? currMil : undefined,
      trips: 0,
      oilBrand: v.lastOilBrand || 'بهران دیزل سوپر ۱۵W۴۰',
      oilFilterChanged: true,
      airFilterChanged: true,
      fuelFilterChanged: false,
      notes: hasMileage
        ? `تعویض روغن و فیلترها در تاریخ ${todayStr} در کیلومتر ${currMil.toLocaleString()}`
        : `تعویض روغن دوره‌ای خاور و فیلترها در تاریخ ${todayStr} (صفر شدن کارکرد روز و سفر)`,
    };

    const existingHistory: ServiceHistoryEntry[] = (v as any).serviceHistory || [];

    const updated: VehicleItem = {
      ...v,
      status: v.status === 'IN_MAINTENANCE' ? 'ACTIVE' : v.status,
      lastChangeDate: todayStr,
      lastChangeMileage: hasMileage ? currMil : 0,
      currentMileage: hasMileage ? currMil : 0,
      tripsSinceChange: 0,
      oilFilterChanged: true,
      airFilterChanged: true,
      serviceHistory: [newHistoryItem, ...existingHistory],
    };

    onUpdateVehicle(updated);
    if (manualOilVehicle?.id === v.id) {
      setManualOilVehicle(null);
    }
    if (showToast) {
      showToast(
        hasMileage
          ? `تعویض روغن خودرو کد ${toFaDigits(v.code)} در کیلومتر ${toFaDigits(currMil.toLocaleString())} ثبت شد.`
          : `تعویض روغن خاور کد ${toFaDigits(v.code)} در تاریخ ${toFaDigits(todayStr)} ثبت و شمارنده روز/سفر صفر شد.`,
        'success'
      );
    }
  };

  // Submit Manual Oil Change Form
  const handleSaveManualOilChange = (e: FormEvent) => {
    e.preventDefault();
    if (!manualOilVehicle) return;

    const v = manualOilVehicle;
    const vRule = rules[v.vehicleType] || DEFAULT_SERVICE_RULES[v.vehicleType];
    const hasMileage = vRule ? vRule.hasMileage : true;

    const oilMil = hasMileage ? Number(manualOilChangeMileage) || 0 : 0;
    const currMil = hasMileage ? Math.max(oilMil, Number(manualCurrentMileage) || oilMil) : 0;
    const trips = Number(manualTripsSinceChange) || 0;
    const date = manualOilChangeDate.trim() || todayStr;

    const undoItem: OilUndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actionType: 'MANUAL_ENTRY',
      vehicleId: v.id,
      vehicleCode: v.code,
      driverName: v.driverName,
      title: `ثبت تعویض روغن خودرو کد ${toFaDigits(v.code)}`,
      details: hasMileage
        ? `کیلومتر تعویض ${toFaDigits(oilMil.toLocaleString('fa-IR'))} - ${manualOilBrand}`
        : `تاریخ تعویض ${toFaDigits(date)} - ${manualOilBrand}`,
      timestamp: todayStr,
      previousVehicleState: { ...v },
    };
    setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);

    const newHistoryItem: ServiceHistoryEntry = {
      id: `srv-${Date.now()}`,
      date,
      mileage: hasMileage ? oilMil : undefined,
      currentMileageAtService: hasMileage ? currMil : undefined,
      trips,
      oilBrand: manualOilBrand,
      oilFilterChanged: manualOilFilter,
      airFilterChanged: manualAirFilter,
      fuelFilterChanged: manualFuelFilter,
      technicianOrShop: manualShopName.trim() || undefined,
      invoiceNumber: manualInvoiceNo.trim() || undefined,
      cost: manualCost ? Number(manualCost) : undefined,
      notes:
        manualNotes.trim() ||
        (hasMileage
          ? `ثبت تعویض روغن در کیلومتر ${oilMil.toLocaleString()}`
          : `ثبت تعویض روغن دوره‌ای در تاریخ ${date}`),
    };

    const existingHistory: ServiceHistoryEntry[] = (v as any).serviceHistory || [];

    const updated: VehicleItem = {
      ...v,
      status: v.status === 'IN_MAINTENANCE' ? 'ACTIVE' : v.status,
      currentMileage: currMil,
      lastChangeMileage: oilMil,
      lastChangeDate: date,
      tripsSinceChange: trips,
      lastOilBrand: manualOilBrand,
      oilFilterChanged: manualOilFilter,
      airFilterChanged: manualAirFilter,
      fuelFilterChanged: manualFuelFilter,
      serviceNotes: manualNotes,
      serviceHistory: [newHistoryItem, ...existingHistory],
    };

    onUpdateVehicle(updated);
    setManualOilVehicle(null);

    if (showToast) {
      showToast(
        hasMileage
          ? `تعویض روغن خودرو کد ${toFaDigits(v.code)} روی کیلومتر ${toFaDigits(oilMil.toLocaleString())} ثبت شد.`
          : `تعویض روغن خاور کد ${toFaDigits(v.code)} در تاریخ ${toFaDigits(date)} با موفقیت ثبت شد.`,
        'success'
      );
    }
  };

  // Save general mileage / trips usage update
  const handleSaveUsage = (e: FormEvent) => {
    e.preventDefault();
    if (!manualOilVehicle) return;

    const v = manualOilVehicle;
    const vRule = rules[v.vehicleType] || DEFAULT_SERVICE_RULES[v.vehicleType];
    const hasMileage = vRule ? vRule.hasMileage : true;
    const date = usageDate || todayStr;

    const undoItem: OilUndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actionType: 'USAGE_UPDATE',
      vehicleId: v.id,
      vehicleCode: v.code,
      driverName: v.driverName,
      title: `به‌روزرسانی کارکرد خودرو کد ${toFaDigits(v.code)}`,
      details: hasMileage
        ? `کیلومتر جدید ${toFaDigits(Number(usageMileage).toLocaleString('fa-IR'))} (${v.driverName})`
        : `تعداد سفر جدید: ${toFaDigits(usageTrips)} سفر (${v.driverName})`,
      timestamp: todayStr,
      previousVehicleState: { ...v },
    };
    setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);

    const updated: VehicleItem = {
      ...v,
      currentMileage: hasMileage ? Number(usageMileage) : v.currentMileage,
      tripsSinceChange: Number(usageTrips),
      lastStatusDate: date,
    };

    onUpdateVehicle(updated);
    setManualOilVehicle(null);
    if (showToast) {
      showToast(
        `کارکرد جاری خودرو کد ${toFaDigits(v.code)} در تاریخ ${toFaDigits(date)} به‌روزرسانی شد.`,
        'success'
      );
    }
  };

  // Save Rule changes
  const handleSaveRule = (key: string, updatedRule: ServiceRule) => {
    const newRules = { ...rules, [key]: updatedRule };
    setRules(newRules);
    saveStoredServiceRules(newRules);
  };

  // Add new Rule
  const handleAddRuleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newRuleKey || !newRuleLabel) return;
    const newRule: ServiceRule = {
      label: newRuleLabel,
      hasMileage: newRuleHasMileage,
      maxDays: Number(newRuleDays),
      maxTrips: Number(newRuleTrips),
      maxMileage: newRuleHasMileage ? Number(newRuleMileage) : undefined,
      warningMileage: newRuleHasMileage ? 500 : undefined,
    };
    handleSaveRule(newRuleKey.toUpperCase(), newRule);
    setIsAddRuleOpen(false);
    setNewRuleKey('');
    setNewRuleLabel('');
    if (showToast) {
      showToast(`استاندارد جدید برای ${newRuleLabel} ذخیره شد.`, 'success');
    }
  };

  // Open edit modal for an existing vehicle rule
  const handleEditRuleClick = (key: string) => {
    const rule = rules[key];
    if (!rule) return;
    setEditingRuleKey(key);
    setEditRuleLabel(rule.label);
    setEditRuleDays(rule.maxDays);
    setEditRuleTrips(rule.maxTrips ?? 45);
    setEditRuleMileage(rule.maxMileage ?? 5000);
    setEditRuleWarningMileage(rule.warningMileage ?? 500);
    setEditRuleHasMileage(rule.hasMileage);
  };

  // Save changes to an existing vehicle rule
  const handleSaveEditedRule = (e: FormEvent) => {
    e.preventDefault();
    if (!editingRuleKey) return;
    const updated: ServiceRule = {
      label: editRuleLabel.trim() || rules[editingRuleKey]?.label || editingRuleKey,
      hasMileage: editRuleHasMileage,
      maxDays: Math.max(1, Number(editRuleDays) || 45),
      maxTrips: Math.max(1, Number(editRuleTrips) || 45),
      maxMileage: editRuleHasMileage ? Math.max(100, Number(editRuleMileage) || 5000) : undefined,
      warningMileage: editRuleHasMileage ? Math.max(0, Number(editRuleWarningMileage) || 500) : undefined,
    };
    handleSaveRule(editingRuleKey, updated);
    setEditingRuleKey(null);
    if (showToast) {
      showToast(`استاندارد خودرو «${updated.label}» به‌روزرسانی شد.`, 'success');
    }
  };

  // Save changes to individual maintenance item standard
  const handleSaveItemStandard = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItemStandard) return;
    const updatedItems = maintenanceItems.map((it) => {
      if (it.id === editingItemStandard.id) {
        return {
          ...editingItemStandard,
          maxKm: Math.max(100, Number(editingItemStandard.maxKm) || 5000),
          maxDays: Math.max(1, Number(editingItemStandard.maxDays) || 30),
          warningKm: Math.max(0, Number(editingItemStandard.warningKm) || 500),
        };
      }
      return it;
    });
    setMaintenanceItems(updatedItems);
    saveStoredMaintenanceItems(updatedItems);
    const savedItem = editingItemStandard;
    setEditingItemStandard(null);
    if (showToast) {
      showToast(
        `سقف و استاندارد «${savedItem.name}» روی ${toFaDigits(savedItem.maxKm.toLocaleString())} کیلومتر ذخیره شد.`,
        'success'
      );
    }
  };

  // Add new custom maintenance item standard
  const handleAddCustomItemSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const id = `custom_${Date.now()}`;
    const categoryLabel = MAINTENANCE_CATEGORY_LABELS[newItemCategory] || 'سایر سرویس‌های دوره‌ای';
    const newItem: MaintenanceItemStandard = {
      id,
      name: newItemName.trim(),
      category: newItemCategory,
      categoryLabel,
      maxKm: Math.max(100, Number(newItemMaxKm) || 10000),
      maxDays: Math.max(1, Number(newItemMaxDays) || 180),
      warningKm: Math.max(0, Number(newItemWarningKm) || 1000),
      unit: 'کیلومتر',
      isCustom: true,
      description: newItemDesc.trim() || 'سرویس دوره‌ای استاندارد ناوگان',
    };
    const updated = [newItem, ...maintenanceItems];
    setMaintenanceItems(updated);
    saveStoredMaintenanceItems(updated);
    setIsAddItemOpen(false);
    setNewItemName('');
    setNewItemDesc('');
    if (showToast) {
      showToast(`قطعه و استاندارد جدید «${newItem.name}» به سیستم افزوده شد.`, 'success');
    }
  };

  // Delete custom maintenance item standard
  const handleDeleteItemStandard = (id: string, name: string) => {
    if (confirm(`آیا از حذف آیتم استاندارد «${name}» اطمینان دارید؟`)) {
      const updated = maintenanceItems.filter((it) => it.id !== id);
      setMaintenanceItems(updated);
      saveStoredMaintenanceItems(updated);
      if (showToast) {
        showToast(`آیتم استاندارد «${name}» حذف گردید.`, 'info');
      }
    }
  };

  // Reset maintenance item standards to factory defaults
  const handleResetMaintenanceItems = () => {
    if (confirm('آیا مایلید استانداردهای سقف کیلومتر کلیه اقلام و قطعات به مقادیر اولیه کارخانه بازگردد؟')) {
      const defaults = resetMaintenanceItemsToDefault();
      setMaintenanceItems(defaults);
      if (showToast) {
        showToast('استانداردهای سقف کیلومتر قطعات به حالت پیش‌فرض بازنشانی شدند.', 'info');
      }
    }
  };

  // Reset rules to defaults
  const handleResetRules = () => {
    if (confirm('آیا مایلید تنظیمات استانداردهای خودروها به حالت پیش‌فرض کارخانه بازگردد؟')) {
      const defaults = resetServiceRulesToDefault();
      setRules(defaults);
      if (showToast) {
        showToast('استانداردهای خودروها به پیش‌فرض بازنشانی شدند.', 'info');
      }
    }
  };

  const POPULAR_OIL_BRANDS = [
    'بهران دیزل سوپر ۱۵W۴۰',
    'اسپیدی توربو پلاس ۲۰W۵۰',
    'ایرانول کارو ۱۰W۴۰',
    'توتال روبیا TIR ۷۴۰۰',
    'کاسترول GTX دیزل',
    'بهران رانا ۵W۳۰',
  ];

  const isUnifiedFleetHub = subTab === 'SPECIFICATIONS' || subTab === 'DASHBOARD' || subTab === 'ENTRY';

  return (
    <div className="space-y-4">
      {/* Minimal & Unified Top Workspace Header */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                مدیریت یکپارچه ناوگان، تعویض روغن و بیمه‌نامه
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                پایش هوشمند سرویس خاورها (بر اساس سقف ۶۰ روز / ۸۰ سفر) و خودروهای کیلومتردار (بر اساس کیلومترشمار) در یک پنجره واحد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={() => handleUndo()}
                className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-bold transition cursor-pointer"
                title={`واگردانی آخرین تغییر: ${undoStack[0].title} (Ctrl+Z)`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>واگردانی ({toFaDigits(undoStack.length)})</span>
              </button>
            )}

            <div className="bg-[#0a101f] border border-[#1f2c45] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>امروز: <strong className="text-white font-mono">{toFaDigits(todayInfo.fullFa)}</strong></span>
            </div>
          </div>
        </div>

        {/* Streamlined 5-Column KPI Strip (Clickable quick filters) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSubTab('SPECIFICATIONS');
              setStatusFilter('ALL');
              setTypeFilter('ALL');
            }}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              isUnifiedFleetHub && statusFilter === 'ALL' && typeFilter === 'ALL'
                ? 'bg-blue-600/15 border-blue-500/50'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>کل ناوگان فعال</span>
              <Car className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white font-mono mt-1">{toFaDigits(stats.total)} دستگاه</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {toFaDigits(stats.khaavarTotal)} خاور • {toFaDigits(stats.withMileage)} کیلومتردار
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('SPECIFICATIONS');
              setStatusFilter('CRITICAL');
            }}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              isUnifiedFleetHub && statusFilter === 'CRITICAL'
                ? 'bg-rose-500/15 border-rose-500/50'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>موعد تعویض فوری</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-black text-rose-400 font-mono mt-1">{toFaDigits(stats.critical)} دستگاه</div>
            <div className="text-[10px] text-rose-300/80 mt-0.5">
              {stats.khaavarCritical > 0
                ? `شامل ${toFaDigits(stats.khaavarCritical)} خاور سررسید شده`
                : 'گذشته از سقف مجاز سرویس'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('SPECIFICATIONS');
              setStatusFilter('KHAAVAR_DUE');
              setTypeFilter('ALL');
            }}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              isUnifiedFleetHub && statusFilter === 'KHAAVAR_DUE'
                ? 'bg-amber-500/15 border-amber-500/50'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>خاورهای نیازمند سرویس</span>
              <Truck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-400 font-mono mt-1">
              {toFaDigits(stats.khaavarDue)} <span className="text-xs font-normal text-slate-400">از {toFaDigits(stats.khaavarTotal)} خاور</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {toFaDigits(stats.khaavarCritical)} فوری • {toFaDigits(stats.khaavarWarning)} در آستانه (۶۰ روز/۸۰ سفر)
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('SPECIFICATIONS');
              setStatusFilter('HEALTHY');
            }}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              isUnifiedFleetHub && statusFilter === 'HEALTHY'
                ? 'bg-emerald-500/15 border-emerald-500/50'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>وضعیت ایمن و استاندارد</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-400 font-mono mt-1">{toFaDigits(stats.healthy)} دستگاه</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              دارای مهلت زمانی و کیلومتر کافی
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('INSURANCE_ALERTS')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              subTab === 'INSURANCE_ALERTS'
                ? 'bg-rose-500/20 border-rose-500/60'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="text-rose-300 font-bold">هشدار بیمه و معاینه</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-black text-rose-400 font-mono mt-1">
              {toFaDigits(insuranceAlertData.totalAlertsCount)} دستگاه
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {insuranceAlertData.expiredCount > 0
                ? `${toFaDigits(insuranceAlertData.expiredCount)} منقضی • ${toFaDigits(insuranceAlertData.expiringCount)} نزدیک انقضا`
                : 'پایش سررسید کمتر از ۷ روز'}
            </div>
          </button>
        </div>

        {/* Minimal 4-Tab Navigation Bar */}
        <div className="pt-2 border-t border-[#1a273f] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setSubTab('SPECIFICATIONS')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isUnifiedFleetHub
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>فهرست ناوگان و سرویس روغن</span>
              <span className="font-mono text-[10px] opacity-80">({toFaDigits(vehicles.length)})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('INSURANCE_ALERTS')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'INSURANCE_ALERTS'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>بیمه‌نامه و معاینه فنی</span>
              {insuranceAlertData.totalAlertsCount > 0 && (
                <span className="text-rose-300 font-mono text-[10px] font-black">
                  ({toFaDigits(insuranceAlertData.totalAlertsCount)})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubTab('HISTORY')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'HISTORY'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>دفتر سوابق سرویس</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('RULES')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'RULES'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>استانداردها و قواعد سرویس</span>
            </button>
          </div>

          {/* View Mode Switcher & Print Button (visible in Unified Fleet Hub) */}
          {isUnifiedFleetHub && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#0a101f] p-1 rounded-xl border border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'TABLE' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>نمای جدولی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('CARDS')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'CARDS' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>نمای کارتی</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPrintListOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="چاپ رسمی فهرست ناوگان در قالب A4"
              >
                <Printer className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">چاپ فهرست</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: UNIFIED FLEET & OIL SERVICE HUB (TABLE + CARDS IN ONE PLACE) */}
      {isUnifiedFleetHub && (
        <div className="space-y-3">
          {/* Unified Filter & Search Toolbar */}
          <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#0a101f] text-slate-400 hover:text-white border border-[#1f2c45]'
                }`}
              >
                همه ({toFaDigits(stats.total)})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('CRITICAL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#0a101f] text-rose-300 hover:text-white border border-rose-500/25'
                }`}
              >
                تعویض فوری ({toFaDigits(stats.critical)})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('WARNING')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'WARNING'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#0a101f] text-amber-300 hover:text-white border border-amber-500/25'
                }`}
              >
                نزدیک موعد ({toFaDigits(stats.warning)})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('KHAAVAR_DUE')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'KHAAVAR_DUE'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
                }`}
              >
                خاورهای موعد سرویس ({toFaDigits(stats.khaavarDue)})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('HEALTHY')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'HEALTHY'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0a101f] text-emerald-300 hover:text-white border border-emerald-500/25'
                }`}
              >
                ایمن ({toFaDigits(stats.healthy)})
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">همه تیپ‌های خودرو</option>
                {Object.keys(rules).map((k) => (
                  <option key={k} value={k}>
                    {rules[k].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجوی کد، راننده، پلاک..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* VIEW MODE A: CLEAN OPERATIONAL TABLE */}
          {viewMode === 'TABLE' && (
            <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0a101f] text-slate-400 font-bold border-b border-[#1e2d47]">
                    <tr>
                      <th className="p-3 w-14 text-center">کد</th>
                      <th className="p-3">راننده و خودرو</th>
                      <th className="p-3 text-center">پلاک انتظامی</th>
                      <th className="p-3 text-center">آخرین تعویض روغن</th>
                      <th className="p-3 text-center">کارکرد فعلی (کیلومتر یا روز/سفر)</th>
                      <th className="p-3 text-center">وضعیت و باقیمانده تا سرویس</th>
                      <th className="p-3 text-center">عملیات سریع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#172338]">
                    {filteredVehicles.map((v) => {
                      const hasMileage = v._rule.hasMileage;
                      return (
                        <tr key={v.id} className="hover:bg-[#131f36] transition-colors">
                          <td className="p-3 text-center font-black font-mono text-sky-400 text-sm">
                            {toFaDigits(v.code)}
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{v.driverName}</span>
                              {(!v.driverName || v.driverName === 'بدون راننده') && (
                                <span className="text-[10px] text-amber-400 font-normal">(فاقد راننده)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{v._rule.label}</span>
                              {v.driverPhone && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-500">{toFaDigits(v.driverPhone)}</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <IranianPlate plateNumber={v.plateNumber} size="sm" />
                          </td>

                          {/* Last Oil Service Column */}
                          <td className="p-3 text-center font-mono">
                            <div className="text-slate-200 font-bold">{toFaDigits(v._lastChangeDate)}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {hasMileage
                                ? `در کیلومتر ${toFaDigits(v._lastChangeMileage.toLocaleString())}`
                                : `${toFaDigits(v._daysPassed)} روز پیش`}
                            </div>
                          </td>

                          {/* Current Usage Column — Accurate for KHAAVAR vs Mileage vehicles */}
                          <td className="p-3 text-center font-mono">
                            {hasMileage ? (
                              <div className="space-y-0.5">
                                <div className="text-white font-bold">
                                  {toFaDigits(v._currentMileage.toLocaleString())} <span className="text-[10px] text-slate-400">km</span>
                                </div>
                                <div className="text-[10px] text-sky-300">
                                  پیمایش: +{toFaDigits(v._mileageDriven.toLocaleString())} از {toFaDigits((v._rule.maxMileage || 5000).toLocaleString())} km
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="text-white font-bold">
                                  {toFaDigits(v._daysPassed)} <span className="text-[10px] text-slate-400">از {toFaDigits(v._rule.maxDays)} روز</span>
                                </div>
                                <div className="text-[10px] text-sky-300">
                                  کارکرد سفر: {toFaDigits(v._tripsDriven)} از {toFaDigits(v._maxTrips)} سفر
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Service Status & Remaining/Overdue Column */}
                          <td className="p-3 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span
                                className={`text-xs font-bold ${
                                  v._serviceStatus === 'CRITICAL'
                                    ? 'text-rose-400'
                                    : v._serviceStatus === 'WARNING'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {v._serviceStatus === 'CRITICAL'
                                  ? '● موعد تعویض فوری'
                                  : v._serviceStatus === 'WARNING'
                                  ? '● نزدیک سررسید'
                                  : '● ایمن و استاندارد'}
                              </span>

                              <span className="text-[11px] font-mono text-slate-300">
                                {v._statusText}
                              </span>

                              <div className="w-28 bg-slate-800 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    v._serviceStatus === 'CRITICAL'
                                      ? 'bg-rose-500'
                                      : v._serviceStatus === 'WARNING'
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, v._mileagePercent)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Streamlined Actions Column */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 1-Click Today Service Button for overdue/warning vehicles */}
                              {(v._serviceStatus === 'CRITICAL' || v._serviceStatus === 'WARNING') && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickCompleteService(v)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="ثبت فوری تعویض روغن در تاریخ امروز با ۱ کلیک"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>سرویس امروز</span>
                                </button>
                              )}

                              {/* Unified Oil & Usage Modal Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenManualOilModal(v, 'OIL_SERVICE')}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="ثبت تعویض روغن، به‌روزرسانی کارکرد و مشاهده سوابق در یک پنجره"
                              >
                                <Droplet className="w-3.5 h-3.5" />
                                <span>سرویس و کارکرد</span>
                              </button>

                              {/* Vehicle Technical Dossier Modal Button */}
                              <button
                                type="button"
                                onClick={() => setSpecsVehicle(v)}
                                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                                title="شناسنامه فنی، بیمه‌نامه و راننده"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">پرونده</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE B: CLEAN CARDS GRID */}
          {viewMode === 'CARDS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredVehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  availableDrivers={availableDrivers}
                  onAssignDriver={(target, driverName, driverPhone) =>
                    onAssignDriverToVehicle?.(target.id, driverName, driverPhone)
                  }
                  onUnassignDriver={(target) =>
                    onAssignDriverToVehicle?.(target.id, 'بدون راننده', '')
                  }
                  onOpenSpecifications={(target) => setSpecsVehicle(target)}
                  onOpenPrintModal={(target) => setPrintingVehicle(target)}
                  onOpenUsage={(target) => handleOpenManualOilModal(target, 'USAGE')}
                  onOpenOilService={(target) => handleOpenManualOilModal(target, 'OIL_SERVICE')}
                  onShowToast={showToast}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FLEET INSURANCE & INSPECTION ALERTS */}
      {subTab === 'INSURANCE_ALERTS' && (
        <div className="animate-in fade-in duration-150">
          <FleetInsuranceAlertsView
            vehicles={vehicles}
            onUpdateVehicle={onUpdateVehicle}
            showToast={showToast}
            highlightedVehicleId={highlightedVehicleId}
            onOpenSpecifications={(v) => setSpecsVehicle(v)}
            onOpenBaleForDriver={onOpenBaleForDriver}
          />
        </div>
      )}

      {/* TAB 3: CLEAN SERVICE HISTORY LOG TABLE (NO FAKE CHARTS) */}
      {subTab === 'HISTORY' && (
        <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl overflow-hidden shadow-md space-y-3 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#1f2c45]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              <h4 className="font-bold text-white text-sm">دفتر سوابق تعویض روغن و کارکرد ناوگان</h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-48">
                <PersianDatePicker
                  value={historyDateFilter}
                  onChange={(val) => setHistoryDateFilter(val)}
                  placeholder="فیلتر بر اساس تاریخ..."
                />
              </div>
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
                >
                  حذف فیلتر تاریخ
                </button>
              )}

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی کد، راننده، پلاک..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0a101f] text-slate-400 font-bold border-b border-[#1e2d47]">
                <tr>
                  <th className="p-2.5 text-center w-12">کد</th>
                  <th className="p-2.5">خودرو و راننده</th>
                  <th className="p-2.5 text-center">تاریخ آخرین تعویض</th>
                  <th className="p-2.5 text-center">کارکرد زمانی</th>
                  <th className="p-2.5 text-center">مبنای کارکرد (کیلومتر / سفر)</th>
                  <th className="p-2.5 text-center">وضعیت فعلی سرویس</th>
                  <th className="p-2.5">برند روغن و فیلترها</th>
                  <th className="p-2.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172338]">
                {enrichedVehicles
                  .filter((v) => {
                    const matchSearch =
                      v.code.toString().includes(historySearch) ||
                      v.driverName.includes(historySearch) ||
                      v.plateNumber.includes(historySearch);
                    const matchDate =
                      !historyDateFilter ||
                      v._lastChangeDate.includes(historyDateFilter) ||
                      (v.serviceHistory && v.serviceHistory.some((h) => h.date.includes(historyDateFilter)));
                    return matchSearch && matchDate;
                  })
                  .map((v) => (
                    <tr key={v.id} className="hover:bg-[#131f36] transition-colors">
                      <td className="p-2.5 text-center font-mono font-black text-sky-400">{toFaDigits(v.code)}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-200">{v.driverName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {v._rule.label} • {toFaDigits(v.plateNumber)}
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-200 font-bold">
                        {toFaDigits(v._lastChangeDate)}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        <div className="text-slate-200">
                          {toFaDigits(v._daysPassed)} از {toFaDigits(v._rule.maxDays)} روز
                        </div>
                        {v._daysOverdue > 0 ? (
                          <div className="text-[10px] text-rose-400 font-bold">
                            {toFaDigits(v._daysOverdue)} روز تأخیر
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-400">
                            {toFaDigits(v._daysRemaining)} روز مانده
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        {v._rule.hasMileage ? (
                          <div>
                            <div className="text-sky-300 font-bold">
                              {toFaDigits(v._currentMileage.toLocaleString())} km
                            </div>
                            <div className="text-[10px] text-slate-400">
                              تعویض قبلی: {toFaDigits(v._lastChangeMileage.toLocaleString())} (+{toFaDigits(v._mileageDriven.toLocaleString())} km)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sky-300 font-bold">
                              {toFaDigits(v._tripsDriven)} از {toFaDigits(v._maxTrips)} سفر
                            </div>
                            <div className="text-[10px] text-slate-400">فاقد کیلومترشمار (مبنای روز و سفر)</div>
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono text-[11px]">
                        <span
                          className={`font-bold ${
                            v._serviceStatus === 'CRITICAL'
                              ? 'text-rose-400'
                              : v._serviceStatus === 'WARNING'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {v._statusText}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">
                        <div className="text-[11px] text-slate-200">{v.lastOilBrand || 'بهران دیزل ۱۵W۴۰'}</div>
                        <div className="text-[10px] text-slate-500">
                          {[
                            v.oilFilterChanged ? 'فیلتر روغن' : null,
                            v.airFilterChanged ? 'فیلتر هوا' : null,
                            v.fuelFilterChanged ? 'فیلتر سوخت' : null,
                          ]
                            .filter(Boolean)
                            .join(' • ') || 'بدون ثبت فیلتر'}
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenManualOilModal(v, 'HISTORY')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold border border-slate-700 transition cursor-pointer"
                        >
                          سوابق و ویرایش
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RULES & STANDARDS */}
      {subTab === 'RULES' && (
        <div className="space-y-4">
          <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>استانداردها و سقف مجاز سرویس خودروها و قطعات</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعیین سقف روز، سفر و کیلومتر برای خاورها (بدون کیلومترشمار) و کامیونت‌های کیلومتردار
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-[#091120] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setRulesCategory('VEHICLES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  rulesCategory === 'VEHICLES'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>کلاس خودروها ({toFaDigits(Object.keys(rules).length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setRulesCategory('ITEMS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  rulesCategory === 'ITEMS'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>اقلام و قطعات مصرفی ({toFaDigits(maintenanceItems.length)})</span>
              </button>
            </div>
          </div>

          {/* VIEW A: VEHICLE TYPE SERVICE RULES */}
          {rulesCategory === 'VEHICLES' && (
            <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#1b2b48] pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    قواعد سرویس بر اساس تیپ خودرو
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    خاورها بر اساس سقف روز و تعداد سفر پایش می‌شوند و کامیونت‌های دارای کیلومترشمار بر اساس کیلومتر و روز
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetRules}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازنشانی پیش‌فرض</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddRuleOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن تیپ خودرو</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {Object.keys(rules).map((key) => {
                  const rule = rules[key];
                  return (
                    <div
                      key={key}
                      className="bg-[#0a101f] border border-[#1f2c45] hover:border-blue-500/40 rounded-2xl p-4 space-y-3 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2.5">
                          <span className="font-bold text-white text-sm">{rule.label}</span>
                          <span className="font-mono text-[10px] text-slate-400">{key}</span>
                        </div>

                        <div className="space-y-2 text-xs pt-2.5">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">سقف زمانی سرویس:</span>
                            <span className="font-bold text-white font-mono">{toFaDigits(rule.maxDays)} روز</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">حداکثر تعداد سفر:</span>
                            <span className="font-bold text-white font-mono">{toFaDigits(rule.maxTrips ?? 45)} سفر</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">مبنای کیلومترشمار:</span>
                            {rule.hasMileage ? (
                              <span className="font-bold text-sky-400 font-mono">
                                {toFaDigits((rule.maxMileage || 5000).toLocaleString())} km
                              </span>
                            ) : (
                              <span className="text-amber-300 font-medium text-[11px]">فاقد کیلومتر (روز/سفر)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#18263f]">
                        <button
                          type="button"
                          onClick={() => handleEditRuleClick(key)}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>ویرایش استاندارد</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW B: MAINTENANCE ITEMS STANDARDS */}
          {rulesCategory === 'ITEMS' && (
            <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-[#1b2b48] pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setItemCategoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      itemCategoryFilter === 'ALL'
                        ? 'bg-sky-600 text-white'
                        : 'bg-[#0a101f] text-slate-400 hover:text-white border border-[#1f2c45]'
                    }`}
                  >
                    همه ({toFaDigits(maintenanceItems.length)})
                  </button>
                  {(['FLUIDS', 'FILTERS', 'BRAKES_TIRES', 'MECHANICAL', 'ELECTRICAL'] as MaintenanceCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setItemCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          itemCategoryFilter === cat
                            ? 'bg-sky-600 text-white'
                            : 'bg-[#0a101f] text-slate-400 hover:text-white border border-[#1f2c45]'
                        }`}
                      >
                        {MAINTENANCE_CATEGORY_LABELS[cat]}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                  <div className="relative min-w-[180px] flex-1 lg:flex-none">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="جستجوی نام قطعه..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetMaintenanceItems}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">پیش‌فرض</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddItemOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>قطعه جدید</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {maintenanceItems
                  .filter((it) => {
                    const matchCategory = itemCategoryFilter === 'ALL' || it.category === itemCategoryFilter;
                    const matchSearch = it.name.includes(itemSearch) || it.description.includes(itemSearch);
                    return matchCategory && matchSearch;
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0a101f] border border-[#1f2c45] rounded-2xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-[#1b2b48] pb-2.5">
                          <div>
                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                            <span className="text-[10px] text-slate-400">{item.categoryLabel}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingItemStandard(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-2.5 text-center text-xs">
                          <div className="bg-[#070e1c] p-2 rounded-xl border border-[#15233a]">
                            <span className="text-slate-400 block text-[9px]">سقف کیلومتر</span>
                            <strong className="text-sky-300 font-mono">{toFaDigits(item.maxKm.toLocaleString())}</strong>
                          </div>
                          <div className="bg-[#070e1c] p-2 rounded-xl border border-[#15233a]">
                            <span className="text-slate-400 block text-[9px]">سقف روز</span>
                            <strong className="text-amber-300 font-mono">{toFaDigits(item.maxDays)}</strong>
                          </div>
                          <div className="bg-[#070e1c] p-2 rounded-xl border border-[#15233a]">
                            <span className="text-slate-400 block text-[9px]">هشدار قبل از</span>
                            <strong className="text-emerald-400 font-mono">{toFaDigits(item.warningKm.toLocaleString())}</strong>
                          </div>
                        </div>
                      </div>

                      {item.isCustom && (
                        <div className="pt-2 border-t border-[#18263f] flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteItemStandard(item.id, item.name)}
                            className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>حذف قطعه</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* UNIFIED SINGLE MODAL FOR OIL SERVICE, DAILY USAGE & VEHICLE HISTORY */}
      {manualOilVehicle && (() => {
        const evalStatus = evaluateVehicleServiceStatus(manualOilVehicle, rules);
        const vRule = evalStatus.rule;
        const hasMileage = vRule.hasMileage;
        const maxAllowedKm = vRule.maxMileage || 5000;
        const maxDays = vRule.maxDays || 60;
        const maxTrips = vRule.maxTrips || 80;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
            <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-right">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-white text-sm">
                        مدیریت سرویس و کارکرد خودرو کد {toFaDigits(manualOilVehicle.code)}
                      </h3>
                      <span className="text-[11px] text-sky-300 font-bold">({vRule.label})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>راننده: <strong className="text-slate-200">{manualOilVehicle.driverName}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{toFaDigits(manualOilVehicle.plateNumber)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManualOilVehicle(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Segmented Mode Switcher Inside Single Modal (Eliminates opening separate modals!) */}
              <div className="px-4 sm:px-5 py-2.5 bg-[#0a101f] border-b border-[#1f2c45] flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1 bg-[#111b2e] p-1 rounded-xl border border-[#1f2c45]">
                  <button
                    type="button"
                    onClick={() => setServiceModalTab('OIL_SERVICE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      serviceModalTab === 'OIL_SERVICE'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Droplet className="w-3.5 h-3.5" />
                    <span>ثبت تعویض روغن</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceModalTab('USAGE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      serviceModalTab === 'USAGE'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>به‌روزرسانی کارکرد جاری</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceModalTab('HISTORY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      serviceModalTab === 'HISTORY'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>سوابق ({toFaDigits(((manualOilVehicle as any).serviceHistory || []).length)})</span>
                  </button>
                </div>

                {/* 1-Click Instant Today Oil Service Button */}
                {serviceModalTab === 'OIL_SERVICE' && (
                  <button
                    type="button"
                    onClick={() => handleQuickCompleteService(manualOilVehicle)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>ثبت سریع تعویض امروز</span>
                  </button>
                )}
              </div>

              {/* MODE 1: OIL SERVICE REGISTRATION (Tailored for KHAAVAR vs Mileage vehicles) */}
              {serviceModalTab === 'OIL_SERVICE' && (
                <form onSubmit={handleSaveManualOilChange} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
                  {/* Current Status Summary Banner */}
                  <div className="bg-[#0a101f] border border-[#1f2c45] rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-[11px] text-slate-300">
                      <span>وضعیت فعلی: </span>
                      <strong
                        className={
                          evalStatus.status === 'CRITICAL'
                            ? 'text-rose-400'
                            : evalStatus.status === 'WARNING'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {toFaDigits(evalStatus.statusText)} ({toFaDigits(evalStatus.statusReason)})
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {hasMileage
                        ? `سقف مجاز: ${toFaDigits(maxAllowedKm.toLocaleString())} km یا ${toFaDigits(maxDays)} روز`
                        : `سقف مجاز خاور: ${toFaDigits(maxDays)} روز یا ${toFaDigits(maxTrips)} سفر`}
                    </div>
                  </div>

                  {/* Conditional Odometer Section: ONLY shown if vehicle type hasMileage === true */}
                  {hasMileage ? (
                    <div className="bg-[#0e172a] border border-sky-500/30 rounded-xl p-3.5 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-slate-200 font-bold">
                            کیلومتر هنگام تعویض روغن <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="0"
                              value={manualOilChangeMileage}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setManualOilChangeMileage(val);
                                if (val > manualCurrentMileage) setManualCurrentMileage(val);
                              }}
                              className="w-full bg-[#0a101f] border border-sky-500/50 focus:border-sky-400 text-white font-mono text-sm font-black rounded-lg px-3 py-2 focus:outline-none"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">km</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-slate-200 font-bold">
                            کیلومترشمار فعلی خودرو <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="0"
                              value={manualCurrentMileage}
                              onChange={(e) => setManualCurrentMileage(Number(e.target.value))}
                              className="w-full bg-[#0a101f] border border-[#1f2c45] focus:border-blue-500 text-white font-mono text-sm font-black rounded-lg px-3 py-2 focus:outline-none"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">km</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-[#1f2c45] font-mono">
                        <span>
                          سرویس بعدی در کیلومتر:{' '}
                          <strong className="text-amber-300">
                            {toFaDigits((manualOilChangeMileage + maxAllowedKm).toLocaleString())} km
                          </strong>
                        </span>
                        <span>
                          باقیمانده:{' '}
                          <strong className="text-emerald-400">
                            {toFaDigits(Math.max(0, manualOilChangeMileage + maxAllowedKm - manualCurrentMileage).toLocaleString())} km
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* KHAAVAR (Non-Mileage) Dedicated Time & Trips Notice */
                    <div className="bg-[#0e172a] border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-300 font-bold">مبنای محاسبه سرویس خاور (فاقد کیلومترشمار)</span>
                        <span className="font-mono text-slate-300">
                          آخرین سرویس قبلی: {toFaDigits(evalStatus.lastChangeDate)} ({toFaDigits(evalStatus.daysPassed)} روز پیش)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        با ثبت تاریخ تعویض روغن جدید، شمارنده روزهای سپری‌شده و تعداد سفرهای خاور از تاریخ انتخابی بازنشانی شده و سررسید بعدی بر اساس <strong>{toFaDigits(maxDays)} روز</strong> یا <strong>{toFaDigits(maxTrips)} سفر</strong> محاسبه می‌گردد.
                      </p>
                    </div>
                  )}

                  {/* Date & Trips Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <PersianDatePicker
                        label="تاریخ انجام تعویض روغن (شمسی)"
                        required
                        value={manualOilChangeDate}
                        onChange={(val) => setManualOilChangeDate(val)}
                        placeholder="انتخاب تاریخ تعویض روغن..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium text-xs mb-1">
                        تعداد سفر انجام‌شده پس از این تعویض (پیش‌فرض: ۰)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={manualTripsSinceChange}
                        onChange={(e) => setManualTripsSinceChange(Number(e.target.value))}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono text-xs focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Oil Brand & Filters */}
                  <div className="space-y-2 pt-2 border-t border-[#1f2c45]">
                    <label className="block text-slate-300 font-medium">برند روغن موتور و فیلترهای تعویض‌شده</label>
                    <input
                      type="text"
                      placeholder="مثال: بهران دیزل سوپر ۱۵W۴۰"
                      value={manualOilBrand}
                      onChange={(e) => setManualOilBrand(e.target.value)}
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 focus:border-sky-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {POPULAR_OIL_BRANDS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setManualOilBrand(b)}
                          className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer ${
                            manualOilBrand === b
                              ? 'bg-sky-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0a101f] border border-[#1f2c45] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manualOilFilter}
                          onChange={(e) => setManualOilFilter(e.target.checked)}
                          className="rounded border-slate-700 text-sky-500"
                        />
                        <span className="text-slate-200">فیلتر روغن</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0a101f] border border-[#1f2c45] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manualAirFilter}
                          onChange={(e) => setManualAirFilter(e.target.checked)}
                          className="rounded border-slate-700 text-sky-500"
                        />
                        <span className="text-slate-200">فیلتر هوا</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0a101f] border border-[#1f2c45] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manualFuelFilter}
                          onChange={(e) => setManualFuelFilter(e.target.checked)}
                          className="rounded border-slate-700 text-sky-500"
                        />
                        <span className="text-slate-200">فیلتر سوخت</span>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">توضیحات تکمیلی (اختیاری)</label>
                    <input
                      type="text"
                      placeholder="نام تعمیرگاه، شماره فاکتور یا توضیحات فنی..."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-3 py-1.5 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                    <button
                      type="button"
                      onClick={() => setManualOilVehicle(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>ذخیره سرویس تعویض روغن</span>
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 2: DAILY USAGE / ODOMETER & TRIPS UPDATE */}
              {serviceModalTab === 'USAGE' && (
                <form onSubmit={handleSaveUsage} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
                  <div className="bg-[#0a101f] border border-[#1f2c45] rounded-xl p-3 text-slate-300 leading-relaxed">
                    در این بخش فقط <strong>کارکرد جاری خودرو</strong> (بدون ثبت تعویض روغن جدید) به‌روزرسانی می‌شود.
                  </div>

                  <PersianDatePicker
                    label="تاریخ ثبت کارکرد (شمسی)"
                    required
                    value={usageDate}
                    onChange={(val) => setUsageDate(val)}
                  />

                  {hasMileage && (
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">
                        کیلومترشمار فعلی خودرو (روی داشبورد)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={usageMileage}
                        onChange={(e) => setUsageMileage(Number(e.target.value))}
                        className="w-full bg-[#0a101f] border border-slate-700 text-white font-mono font-bold text-base rounded-xl px-3 py-2 focus:border-sky-500 focus:outline-none"
                      />
                      <div className="text-[11px] text-slate-400 font-mono mt-1.5 flex items-center justify-between">
                        <span>آخرین تعویض: {toFaDigits(evalStatus.lastChangeMileage.toLocaleString())} km</span>
                        <span>
                          پیمایش از آخرین سرویس:{' '}
                          <strong className="text-sky-300">
                            {toFaDigits(Math.max(0, usageMileage - evalStatus.lastChangeMileage).toLocaleString())} km
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-200 font-bold mb-1">
                      تعداد سفرهای انجام‌شده از آخرین تعویض روغن
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={usageTrips}
                      onChange={(e) => setUsageTrips(Number(e.target.value))}
                      className="w-full bg-[#0a101f] border border-slate-700 text-white rounded-xl px-3 py-2 font-mono text-sm focus:border-sky-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      سقف مجاز سفر برای {vRule.label}: {toFaDigits(maxTrips)} سفر
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                    <button
                      type="button"
                      onClick={() => setManualOilVehicle(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>به‌روزرسانی کارکرد</span>
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 3: VEHICLE SERVICE HISTORY */}
              {serviceModalTab === 'HISTORY' && (
                <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto custom-scrollbar text-xs">
                  {((manualOilVehicle as any).serviceHistory || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      هنوز سابقه سرویسی در تاریخچه این خودرو ثبت نشده است.
                    </div>
                  ) : (
                    ((manualOilVehicle as any).serviceHistory || []).map((h: ServiceHistoryEntry, idx: number) => (
                      <div key={idx} className="p-3.5 bg-[#0a101f] rounded-xl border border-[#1f2c45] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400 font-mono text-sm">{toFaDigits(h.date)}</span>
                          {hasMileage && h.mileage ? (
                            <span className="text-sky-300 font-mono font-bold">
                              کیلومتر: {toFaDigits(h.mileage.toLocaleString())} km
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">سرویس دوره‌ای</span>
                          )}
                        </div>
                        <div className="text-slate-300 text-[11px]">
                          روغن: {h.oilBrand || 'بهران دیزل ۱۵W۴۰'}
                          {h.oilFilterChanged ? ' • فیلتر روغن' : ''}
                          {h.airFilterChanged ? ' • فیلتر هوا' : ''}
                        </div>
                        {h.notes && <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800/80">{h.notes}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: ADD RULE */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#1f2c45] bg-[#0d1524]">
              <h3 className="font-bold text-white text-sm">تعریف استاندارد جدید تعویض روغن</h3>
              <button
                type="button"
                onClick={() => setIsAddRuleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-300 font-medium mb-1">شناسه یکتا (انگلیسی)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: FOTON"
                  value={newRuleKey}
                  onChange={(e) => setNewRuleKey(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">عنوان فارسی خودرو</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: کامیونت فوتون ۶ تن"
                  value={newRuleLabel}
                  onChange={(e) => setNewRuleLabel(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">حداکثر روز مجاز</label>
                  <input
                    type="number"
                    required
                    value={newRuleDays}
                    onChange={(e) => setNewRuleDays(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">حداکثر تعداد سفر</label>
                  <input
                    type="number"
                    required
                    value={newRuleTrips}
                    onChange={(e) => setNewRuleTrips(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRuleHasMileage}
                    onChange={(e) => setNewRuleHasMileage(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600"
                  />
                  <span>این نوع خودرو دارای کیلومترشمار فعال است</span>
                </label>
              </div>

              {newRuleHasMileage && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">سقف کیلومتر پیمایش</label>
                  <input
                    type="number"
                    value={newRuleMileage}
                    onChange={(e) => setNewRuleMileage(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  ذخیره استاندارد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MAINTENANCE ITEM STANDARD */}
      {editingItemStandard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <h3 className="font-bold text-white text-sm">
                ویرایش سقف استاندارد: {editingItemStandard.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItemStandard(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemStandard} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نام قطعه یا خدمت سرویس</label>
                <input
                  type="text"
                  required
                  value={editingItemStandard.name}
                  onChange={(e) => setEditingItemStandard({ ...editingItemStandard, name: e.target.value })}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سقف پیمایش (کیلومتر)</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={editingItemStandard.maxKm}
                    onChange={(e) => setEditingItemStandard({ ...editingItemStandard, maxKm: Number(e.target.value) })}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-amber-300 font-bold rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سقف دوره زمانی (روز)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingItemStandard.maxDays}
                    onChange={(e) => setEditingItemStandard({ ...editingItemStandard, maxDays: Number(e.target.value) })}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">آستانه هشدار (کیلومتر مانده)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={editingItemStandard.warningKm}
                  onChange={(e) => setEditingItemStandard({ ...editingItemStandard, warningKm: Number(e.target.value) })}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setEditingItemStandard(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM MAINTENANCE ITEM STANDARD */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <h3 className="font-bold text-white text-sm">تعریف استاندارد قطعه مصرفی جدید</h3>
              <button
                type="button"
                onClick={() => setIsAddItemOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItemSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نام قطعه یا خدمت</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: چهارشاخه گاردان، صفحه کلاچ..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سقف کیلومتر</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={newItemMaxKm}
                    onChange={(e) => setNewItemMaxKm(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-emerald-400 font-bold rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سقف روز</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItemMaxDays}
                    onChange={(e) => setNewItemMaxDays(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  ثبت قطعه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VEHICLE TYPE SERVICE RULE */}
      {editingRuleKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <h3 className="font-bold text-white text-sm">ویرایش استاندارد: {editRuleLabel}</h3>
              <button
                type="button"
                onClick={() => setEditingRuleKey(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRule} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان فارسی نوع خودرو</label>
                <input
                  type="text"
                  required
                  value={editRuleLabel}
                  onChange={(e) => setEditRuleLabel(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editRuleHasMileage}
                    onChange={(e) => setEditRuleHasMileage(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600"
                  />
                  <span className="font-semibold">این نوع خودرو دارای کیلومترشمار فعال است</span>
                </label>
              </div>

              {editRuleHasMileage && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">سقف کیلومتر پیمایش</label>
                    <input
                      type="number"
                      required
                      min={100}
                      step={100}
                      value={editRuleMileage}
                      onChange={(e) => setEditRuleMileage(Number(e.target.value))}
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-sky-400 font-bold rounded-xl px-3 py-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">آستانه هشدار (km)</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={editRuleWarningMileage}
                      onChange={(e) => setEditRuleWarningMileage(Number(e.target.value))}
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">حداکثر روز مجاز</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editRuleDays}
                    onChange={(e) => setEditRuleDays(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">حداکثر تعداد سفر</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editRuleTrips}
                    onChange={(e) => setEditRuleTrips(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setEditingRuleKey(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Vehicle Specifications and Dossier */}
      <VehicleSpecificationsModal
        isOpen={!!specsVehicle}
        onClose={() => setSpecsVehicle(null)}
        vehicle={specsVehicle}
        availableDrivers={availableDrivers}
        onAssignDriverToVehicle={onAssignDriverToVehicle}
        onUpdateVehicle={(updated) => {
          if (specsVehicle) {
            const undoItem: OilUndoAction = {
              id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              actionType: 'USAGE_UPDATE',
              vehicleId: specsVehicle.id,
              vehicleCode: specsVehicle.code,
              driverName: specsVehicle.driverName,
              title: `ویرایش شناسنامه فنی خودرو کد ${toFaDigits(specsVehicle.code)}`,
              details: `به‌روزرسانی اطلاعات فنی در تاریخ ${toFaDigits(todayStr)}`,
              timestamp: todayStr,
              previousVehicleState: { ...specsVehicle },
            };
            setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);
          }
          onUpdateVehicle(updated);
          setSpecsVehicle(updated);
        }}
        onOpenOilModal={(v) => handleOpenManualOilModal(v, 'OIL_SERVICE')}
        showToast={showToast}
      />

      {/* Official Vehicle Technical Passport & Spec Print Modal */}
      {printingVehicle && (
        <VehicleSpecPrintModal
          vehicle={printingVehicle}
          onClose={() => setPrintingVehicle(null)}
          onShowToast={showToast}
        />
      )}

      {/* A4 Standard Print List Modal */}
      <TableListA4PrintModal<VehicleItem>
        isOpen={isPrintListOpen}
        onClose={() => setIsPrintListOpen(false)}
        title="فهرست و مشخصات فنی ناوگان خودرویی"
        subtitle="گزارش رسمی مشخصات ناوگان، رانندگان و وضعیت آماده‌به‌کاری و سرویس"
        categoryBadge="دایره تعمیرات و نگهداری ناوگان"
        columns={fleetSpecPrintColumns}
        data={filteredVehicles}
        summaryCards={fleetSpecSummaryCards}
        defaultOrientation="landscape"
        companyName="شرکت ترابری و لجستیک حامی"
      />
    </div>
  );
};
