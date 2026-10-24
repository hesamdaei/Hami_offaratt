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
  Layers,
  Sliders,
  RotateCcw,
  Plus,
  X,
  Clock,
  TrendingUp,
  Filter,
  Wrench,
  Check,
  Calendar,
  FileText,
  DollarSign,
  Printer,
  ChevronDown,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  Bookmark,
  Shield,
  ShieldAlert,
  Hash,
  User,
  Phone,
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
import { DECODED_BACKUP } from '../utils/backupDecoder';
import { VehicleSpecificationsModal } from './VehicleSpecificationsModal';
import { PersianDatePicker } from './PersianDatePicker';
import { checkVehicleInsurance, getFleetInsuranceAlerts } from '../utils/insuranceAlerts';
import { FleetInsuranceAlertsView } from './FleetInsuranceAlertsView';
import { VehicleCard } from './VehicleCard';
import { VehicleSpecPrintModal } from './VehicleSpecPrintModal';
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
  calculateMileageStatus,
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
  _mileageDriven: number;
  _currentMileage: number;
  _lastChangeMileage: number;
  _nextServiceMileage: number;
  _mileageRemaining: number;
  _mileageOverdue: number;
  _isMileageInconsistent: boolean;
  _mileagePercent: number;
  _serviceStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY';
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

// Calculate exact days between past date and today using Julian Day Numbers
function calculateDaysPassed(pastDateStr?: string): number {
  return calculateDaysBetweenJalaali(pastDateStr);
}

export const OilServiceManagementView: FC<OilServiceManagementViewProps> = ({
  vehicles,
  onUpdateVehicle,
  availableDrivers = [],
  onAssignDriverToVehicle,
  onNavigateToFleet,
  showToast,
  initialSubTab,
  highlightedVehicleId,
  onOpenBaleForDriver,
}) => {
  const todayInfo = getTodayJalaali();
  const todayStr = `${todayInfo.jy}/${String(todayInfo.jm).padStart(2, '0')}/${String(todayInfo.jd).padStart(2, '0')}`;

  const [subTab, setSubTab] = useState<SubTab>(initialSubTab || 'SPECIFICATIONS');

  // Sync with initialSubTab changes
  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Compute fleet insurance alert metrics
  const insuranceAlertData = useMemo(() => {
    return getFleetInsuranceAlerts(vehicles, 7);
  }, [vehicles]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'HAS_MILEAGE' | 'SERVICED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modal 0: Vehicle Full Specifications Dossier Modal
  const [specsVehicle, setSpecsVehicle] = useState<VehicleItem | null>(null);
  const [printingVehicle, setPrintingVehicle] = useState<VehicleItem | null>(null);

  // Rules state (stored in localStorage)
  const [rules, setRules] = useState<Record<string, ServiceRule>>(() => getStoredServiceRules());

  // Maintenance items & components standards state (stored in localStorage)
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItemStandard[]>(() => getStoredMaintenanceItems());
  const [rulesCategory, setRulesCategory] = useState<'ITEMS' | 'VEHICLES'>('ITEMS');
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

  // Modal 1: Edit Daily Usage (Current Mileage & Trips)
  const [editingUsageVehicle, setEditingUsageVehicle] = useState<VehicleItem | null>(null);
  const [usageMileage, setUsageMileage] = useState<number>(0);
  const [usageTrips, setUsageTrips] = useState<number>(0);
  const [usageDate, setUsageDate] = useState<string>(todayStr);

  // Modal 2: Dedicated Manual Oil Change Entry Modal (کیلومتر تعویض روغن دستی)
  const [manualOilVehicle, setManualOilVehicle] = useState<VehicleItem | null>(null);
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

  // Modal 3: Vehicle Service History
  const [historyVehicle, setHistoryVehicle] = useState<VehicleItem | null>(null);

  // Modal 4: Add New Service Rule
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleKey, setNewRuleKey] = useState('');
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [newRuleDays, setNewRuleDays] = useState(45);
  const [newRuleTrips, setNewRuleTrips] = useState(45);
  const [newRuleMileage, setNewRuleMileage] = useState(5000);
  const [newRuleHasMileage, setNewRuleHasMileage] = useState(true);

  // History time period & date filters
  const [historyPeriod, setHistoryPeriod] = useState<'DAY' | 'MONTH'>('DAY');
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
        `عملیات «${target.title}» واگردانی شد و اطلاعات خودرو کد ${toFaDigits(target.vehicleCode)} با موفقیت به حالت قبل بازگشت.`,
        'info'
      );
    }
  };

  // Keyboard shortcut Ctrl+Z / Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoStack.length > 0 && !editingUsageVehicle && !manualOilVehicle && !isAddRuleOpen) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, editingUsageVehicle, manualOilVehicle, isAddRuleOpen]);

  // Enriched vehicles with calculated status
  const enrichedVehicles: EnrichedVehicle[] = useMemo(() => {
    return vehicles.map((v) => {
      const rule = rules[v.vehicleType] || DEFAULT_SERVICE_RULES[v.vehicleType] || {
        label: VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType,
        hasMileage: false,
        maxDays: 45,
        maxTrips: 45,
        warningMileage: 500,
      };

      const lastChangeDate = v.lastChangeDate || '1405/05/01';
      const parsedLastDate = parseJalaaliDate(lastChangeDate);
      const nextDueDateObj = parsedLastDate ? addJalaaliDays(parsedLastDate, rule.maxDays) : null;
      const nextDueDateStr = nextDueDateObj ? formatJalaaliDate(nextDueDateObj.jy, nextDueDateObj.jm, nextDueDateObj.jd) : '';

      const currentMileage = typeof v.currentMileage === 'number' ? v.currentMileage : 125000;
      const lastChangeMileage = typeof v.lastChangeMileage === 'number' ? v.lastChangeMileage : Math.max(0, currentMileage - 3500);

      const maxMil = rule.maxMileage || 5000;
      const warnMil = rule.warningMileage || 500;
      const mStats = calculateMileageStatus(
        currentMileage,
        lastChangeMileage,
        maxMil,
        warnMil,
        lastChangeDate,
        rule.maxDays
      );

      const daysPassed = mStats.daysPassed;
      const daysRemaining = mStats.daysRemaining;
      const daysOverdue = mStats.daysOverdue;
      const tripsDriven = typeof v.tripsSinceChange === 'number' ? v.tripsSinceChange : Math.min(daysPassed * 2, 50);

      const isTripsCritical = rule.maxTrips ? tripsDriven >= rule.maxTrips : false;
      const isTripsWarning = rule.maxTrips ? tripsDriven >= rule.maxTrips - 5 : false;

      let finalStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY' = mStats.status;
      if (!rule.hasMileage) {
        if (mStats.isDaysOverdue || isTripsCritical) {
          finalStatus = 'CRITICAL';
        } else if (daysPassed >= (rule.maxDays - 7) || isTripsWarning) {
          finalStatus = 'WARNING';
        } else {
          finalStatus = 'HEALTHY';
        }
      } else {
        if (isTripsCritical) finalStatus = 'CRITICAL';
        else if (isTripsWarning && finalStatus === 'HEALTHY') finalStatus = 'WARNING';
      }

      const hasCompletedOilChange = Boolean(v.lastChangeMileage || v.lastChangeDate || (v.serviceHistory && v.serviceHistory.length > 0));

      return {
        ...v,
        _rule: rule,
        _lastChangeDate: lastChangeDate,
        _daysPassed: daysPassed,
        _daysRemaining: daysRemaining,
        _daysOverdue: daysOverdue,
        _nextDueDateStr: nextDueDateStr,
        _tripsDriven: tripsDriven,
        _mileageDriven: mStats.drivenKm,
        _currentMileage: currentMileage,
        _lastChangeMileage: lastChangeMileage,
        _nextServiceMileage: mStats.nextTargetKm,
        _mileageRemaining: mStats.remainingKm,
        _mileageOverdue: mStats.overdueKm,
        _isMileageInconsistent: mStats.isInconsistent,
        _mileagePercent: mStats.wearPercent,
        _serviceStatus: finalStatus,
        _hasCompletedOilChange: hasCompletedOilChange,
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
      } else if (statusFilter === 'SERVICED') {
        matchStatus = v._hasCompletedOilChange;
      } else {
        matchStatus = v._serviceStatus === statusFilter;
      }

      return matchSearch && matchType && matchStatus;
    });
  }, [enrichedVehicles, search, typeFilter, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = enrichedVehicles.length;
    const critical = enrichedVehicles.filter((v) => v._serviceStatus === 'CRITICAL').length;
    const warning = enrichedVehicles.filter((v) => v._serviceStatus === 'WARNING').length;
    const healthy = enrichedVehicles.filter((v) => v._serviceStatus === 'HEALTHY').length;
    const withMileage = enrichedVehicles.filter((v) => v._rule.hasMileage).length;
    const servicedCount = enrichedVehicles.filter((v) => v._hasCompletedOilChange).length;
    return { total, critical, warning, healthy, withMileage, servicedCount };
  }, [enrichedVehicles]);

  // Open the Manual Oil Change Modal with pre-loaded values
  const handleOpenManualOilModal = (v: VehicleItem) => {
    const currMil = typeof v.currentMileage === 'number' ? v.currentMileage : 125000;
    const lastMil = typeof v.lastChangeMileage === 'number' ? v.lastChangeMileage : Math.max(0, currMil - 3500);
    const lastDate = v.lastChangeDate || todayStr;

    setManualOilVehicle(v);
    setManualOilChangeMileage(lastMil);
    setManualCurrentMileage(currMil);
    setManualOilChangeDate(lastDate);
    setManualTripsSinceChange(typeof v.tripsSinceChange === 'number' ? v.tripsSinceChange : 0);
    setManualOilBrand(v.lastOilBrand || 'بهران دیزل سوپر ۱۵W۴۰');
    setManualOilFilter(v.oilFilterChanged !== false);
    setManualAirFilter(v.airFilterChanged !== false);
    setManualFuelFilter(!!v.fuelFilterChanged);
    setManualShopName('');
    setManualInvoiceNo('');
    setManualCost('');
    setManualNotes(v.serviceNotes || '');
  };

  // Quick 1-click Service Completed (Today)
  const handleQuickCompleteService = (v: VehicleItem) => {
    const currMil = typeof v.currentMileage === 'number' ? v.currentMileage : 125000;

    // Snapshot previous vehicle state for Undo
    const undoItem: OilUndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actionType: 'QUICK_SERVICE',
      vehicleId: v.id,
      vehicleCode: v.code,
      driverName: v.driverName,
      title: `سرویس سریع تعویض روغن خودرو کد ${toFaDigits(v.code)}`,
      details: `کیلومتر ${toFaDigits(currMil.toLocaleString('fa-IR'))} در تاریخ ${toFaDigits(todayStr)}`,
      timestamp: todayStr,
      previousVehicleState: { ...v },
    };
    setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);

    const newHistoryItem: ServiceHistoryEntry = {
      id: `srv-${Date.now()}`,
      date: todayStr,
      mileage: currMil,
      currentMileageAtService: currMil,
      trips: 0,
      oilBrand: v.lastOilBrand || 'بهران دیزل سوپر ۱۵W۴۰',
      oilFilterChanged: true,
      airFilterChanged: true,
      fuelFilterChanged: false,
      notes: `تعویض روغن و فیلترها در تاریخ ${todayStr} در کیلومتر ${currMil.toLocaleString()}`,
    };

    const existingHistory: ServiceHistoryEntry[] = (v as any).serviceHistory || [];

    const updated: VehicleItem = {
      ...v,
      status: v.status === 'IN_MAINTENANCE' ? 'ACTIVE' : v.status,
      lastChangeDate: todayStr,
      lastChangeMileage: currMil,
      tripsSinceChange: 0,
      oilFilterChanged: true,
      airFilterChanged: true,
      serviceHistory: [newHistoryItem, ...existingHistory],
    };

    onUpdateVehicle(updated);
    if (showToast) {
      showToast(
        `سرویس تعویض روغن خودرو کد ${toFaDigits(v.code)} در کیلومتر ${toFaDigits(currMil.toLocaleString())} با موفقیت ثبت شد. (امکان واگردانی)`,
        'success'
      );
    }
  };

  // Submit Manual Oil Change Form
  const handleSaveManualOilChange = (e: FormEvent) => {
    e.preventDefault();
    if (!manualOilVehicle) return;

    const v = manualOilVehicle;
    const oilMil = Number(manualOilChangeMileage) || 0;
    // Current mileage should be at least oil change mileage
    const currMil = Math.max(oilMil, Number(manualCurrentMileage) || oilMil);
    const trips = Number(manualTripsSinceChange) || 0;
    const date = manualOilChangeDate.trim() || todayStr;

    // Snapshot previous vehicle state for Undo
    const undoItem: OilUndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actionType: 'MANUAL_ENTRY',
      vehicleId: v.id,
      vehicleCode: v.code,
      driverName: v.driverName,
      title: `ثبت دستی تعویض روغن خودرو کد ${toFaDigits(v.code)}`,
      details: `کیلومتر تعویض ${toFaDigits(oilMil.toLocaleString('fa-IR'))} - روغن ${manualOilBrand}`,
      timestamp: todayStr,
      previousVehicleState: { ...v },
    };
    setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);

    const newHistoryItem: ServiceHistoryEntry = {
      id: `srv-${Date.now()}`,
      date,
      mileage: oilMil,
      currentMileageAtService: currMil,
      trips,
      oilBrand: manualOilBrand,
      oilFilterChanged: manualOilFilter,
      airFilterChanged: manualAirFilter,
      fuelFilterChanged: manualFuelFilter,
      technicianOrShop: manualShopName.trim() || undefined,
      invoiceNumber: manualInvoiceNo.trim() || undefined,
      cost: manualCost ? Number(manualCost) : undefined,
      notes: manualNotes.trim() || `ثبت دستی تعویض روغن در کیلومتر ${oilMil.toLocaleString()}`,
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
        `کیلومتر تعویض روغن خودرو کد ${toFaDigits(v.code)} با موفقیت روی ${toFaDigits(oilMil.toLocaleString())} کیلومتر ثبت شد. (امکان واگردانی)`,
        'success'
      );
    }
  };

  // Save general mileage / usage update
  const handleSaveUsage = (e: FormEvent) => {
    e.preventDefault();
    if (!editingUsageVehicle) return;

    const date = usageDate || todayStr;

    // Snapshot previous vehicle state for Undo
    const undoItem: OilUndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actionType: 'USAGE_UPDATE',
      vehicleId: editingUsageVehicle.id,
      vehicleCode: editingUsageVehicle.code,
      driverName: editingUsageVehicle.driverName,
      title: `به‌روزرسانی کیلومتر جاری خودرو کد ${toFaDigits(editingUsageVehicle.code)}`,
      details: `کیلومتر جدید ${toFaDigits(Number(usageMileage).toLocaleString('fa-IR'))} (${editingUsageVehicle.driverName})`,
      timestamp: todayStr,
      previousVehicleState: { ...editingUsageVehicle },
    };
    setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);

    const updated: VehicleItem = {
      ...editingUsageVehicle,
      currentMileage: Number(usageMileage),
      tripsSinceChange: Number(usageTrips),
      lastStatusDate: date,
    };

    onUpdateVehicle(updated);
    setEditingUsageVehicle(null);
    if (showToast) {
      showToast(
        `کیلومتر جاری خودرو کد ${toFaDigits(editingUsageVehicle.code)} در تاریخ ${toFaDigits(date)} به‌روزرسانی شد. (امکان واگردانی)`,
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
      showToast(`استاندارد خودرو «${updated.label}» با سقف ${toFaDigits((updated.maxMileage || 0).toLocaleString())} km به‌روزرسانی شد.`, 'success');
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
      showToast(`سقف و استاندارد «${savedItem.name}» با موفقیت روی ${toFaDigits(savedItem.maxKm.toLocaleString())} کیلومتر ذخیره شد.`, 'success');
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
        showToast('استانداردهای سقف کیلومتر قطعات با موفقیت به حالت پیش‌فرض بازنشانی شدند.', 'info');
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

  // Popular oil brands for quick selection
  const POPULAR_OIL_BRANDS = [
    'بهران دیزل سوپر ۱۵W۴۰',
    'اسپیدی توربو پلاس ۲۰W۵۰',
    'ایرانول کارو ۱۰W۴۰',
    'توتال روبیا TIR ۷۴۰۰',
    'کاسترول GTX دیزل',
    'بهران رانا ۵W۳۰',
  ];

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Droplet className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">سامانه هوشمند پایش و تعویض روغن ناوگان</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  سرویس‌های دوره‌ای و کیلومتر دستی
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ثبت دقیق و دستی کیلومتر تعویض روغن، محاسبه خودکار پیمایش پس از سرویس، فیلترها و سررسیدهای مجاز
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={() => handleUndo()}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2 font-bold transition shadow-md shadow-amber-950/20 cursor-pointer animate-pulse hover:animate-none"
                title={`واگردانی آخرین تغییر: ${undoStack[0].title} (میانبر کیبورد: Ctrl+Z)`}
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>واگردانی آخرین تغییر (Undo)</span>
                <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black">
                  {toFaDigits(undoStack.length)}
                </span>
              </button>
            )}

            <div className="bg-[#0a101f] border border-[#1f2c45] px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>
                تاریخ امروز: <strong className="text-white font-mono">{toFaDigits(todayInfo.fullFa)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              statusFilter === 'ALL'
                ? 'bg-blue-600/15 border-blue-500/40 ring-1 ring-blue-500/30'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>کل ناوگان تحت پایش</span>
              <Car className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white font-mono">{toFaDigits(stats.total)} دستگاه</div>
            <div className="text-[10px] text-slate-500">پایش سرویس‌های دوره‌ای روغن</div>
          </div>

          <div
            onClick={() => setStatusFilter('HAS_MILEAGE')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              statusFilter === 'HAS_MILEAGE'
                ? 'bg-sky-600/15 border-sky-500/40 ring-1 ring-sky-500/30'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-sky-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>دارای کیلومترشمار</span>
              <Gauge className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-black text-sky-400 font-mono">{toFaDigits(stats.withMileage)} دستگاه</div>
            <div className="text-[10px] text-slate-400">سنجش مستقیم بر حسب کیلومتر</div>
          </div>

          <div
            onClick={() => setStatusFilter('CRITICAL')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              statusFilter === 'CRITICAL'
                ? 'bg-rose-500/15 border-rose-500/40 ring-1 ring-rose-500/30'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>تعویض فوری (سررسید)</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400 font-mono">{toFaDigits(stats.critical)} دستگاه</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full"
                style={{ width: `${stats.total > 0 ? (stats.critical / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('WARNING')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              statusFilter === 'WARNING'
                ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>هشدار سررسید (نزدیک)</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400 font-mono">{toFaDigits(stats.warning)} دستگاه</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${stats.total > 0 ? (stats.warning / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('HEALTHY')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              statusFilter === 'HEALTHY'
                ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-[#0a101f] border-[#1f2c45] hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>وضعیت ایمن و استاندارد</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono">{toFaDigits(stats.healthy)} دستگاه</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${stats.total > 0 ? (stats.healthy / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Card 6: Insurance Expiry Alerts */}
          <div
            onClick={() => setSubTab('INSURANCE_ALERTS')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              subTab === 'INSURANCE_ALERTS'
                ? 'bg-rose-500/25 border-rose-500/60 ring-2 ring-rose-500/40'
                : 'bg-[#0a101f] border-rose-500/30 hover:border-rose-500/60'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span className="text-rose-300 font-bold">هشدار بیمه‌نامه (&le; ۷ روز)</span>
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="text-xl font-black text-rose-400 font-mono">
              {toFaDigits(insuranceAlertData.totalAlertsCount)} <span className="text-xs font-normal text-rose-300">دستگاه</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {insuranceAlertData.expiredCount > 0
                ? `${toFaDigits(insuranceAlertData.expiredCount)} منقضی، ${toFaDigits(insuranceAlertData.expiringCount)} نزدیک سررسید`
                : 'پایش سررسید کمتر از ۷ روز'}
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="pt-2 border-t border-[#1a273f] flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setSubTab('SPECIFICATIONS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'SPECIFICATIONS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>مشخصات و شناسنامه فنی خودروها</span>
            <span className="bg-slate-900/60 px-1.5 py-0.2 rounded text-[10px] font-mono">
              {toFaDigits(vehicles.length)}
            </span>
          </button>

          {/* New Prominent Insurance & Inspection Alert Tab */}
          <button
            onClick={() => setSubTab('INSURANCE_ALERTS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'INSURANCE_ALERTS'
                ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-950/40 ring-1 ring-rose-400'
                : 'bg-[#0a101f] text-rose-300 hover:text-white border border-rose-500/30 hover:bg-rose-500/10'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>سیستم هشدار و پایش بیمه‌نامه</span>
            {insuranceAlertData.totalAlertsCount > 0 && (
              <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black animate-pulse">
                {toFaDigits(insuranceAlertData.totalAlertsCount)}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('DASHBOARD')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'DASHBOARD'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-[#0a101f] text-slate-400 hover:text-slate-200 border border-[#1f2c45]'
            }`}
          >
            <Droplet className="w-4 h-4" />
            <span>پایش وضعیت سرویس و کیلومتر</span>
          </button>

          <button
            onClick={() => setSubTab('ENTRY')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'ENTRY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-[#0a101f] text-slate-400 hover:text-slate-200 border border-[#1f2c45]'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>ثبت دستی کیلومتر تعویض روغن</span>
          </button>

          <button
            onClick={() => setSubTab('HISTORY')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-[#0a101f] text-slate-400 hover:text-slate-200 border border-[#1f2c45]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>تاریخچه و سوابق تعویض روغن</span>
          </button>

          <button
            onClick={() => setSubTab('RULES')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'RULES'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-[#0a101f] text-slate-400 hover:text-slate-200 border border-[#1f2c45]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>استانداردها و سقف کیلومتر</span>
          </button>
        </div>
      </div>

      {/* SUB TAB: FLEET INSURANCE & INSPECTION ALERTS */}
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

      {/* SUB TAB 0: VEHICLE SPECIFICATIONS & TECHNICAL DOSSIERS */}
      {subTab === 'SPECIFICATIONS' && (
        <div className="space-y-4">
          {/* Top Filter and Search Bar */}
          <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-300 ml-1">فیلتر نوع خودرو:</span>
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  typeFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'bg-[#0a101f] text-slate-300 hover:text-white border border-[#1f2c45]'
                }`}
              >
                همه ناوگان ({toFaDigits(vehicles.length)})
              </button>
              {Object.keys(rules).map((k) => (
                <button
                  key={k}
                  onClick={() => setTypeFilter(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    typeFilter === k
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-[#0a101f] text-slate-400 hover:text-white border border-[#1f2c45]'
                  }`}
                >
                  {rules[k].label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="چاپ کل صفحه و مشخصات ناوگان روی کاغذ سفید بدون پس‌زمینه تیره"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>چاپ کارت‌ها و فهرست</span>
              </button>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی کد، پلاک، راننده..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-8 pl-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Cards Grid (Using Redesigned High-Contrast, Laser-Ready VehicleCard) */}
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
                onOpenOilService={(target) => handleOpenManualOilModal(target)}
                onShowToast={showToast}
              />
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 1: DASHBOARD OVERVIEW TABLE */}
      {subTab === 'DASHBOARD' && (
        <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl overflow-hidden shadow-lg space-y-3">
          <div className="p-4 border-b border-[#1e2d47] flex flex-wrap items-center justify-between gap-3 bg-[#0c1322]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#0a101f] text-slate-400 hover:text-white border border-[#1f2c45]'
                }`}
              >
                همه وضعیت‌ها ({toFaDigits(stats.total)})
              </button>

              <button
                onClick={() => setStatusFilter('HAS_MILEAGE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  statusFilter === 'HAS_MILEAGE'
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                }`}
              >
                <Gauge className="w-3 h-3" />
                <span>دارای کیلومترشمار ({toFaDigits(stats.withMileage)})</span>
              </button>

              <button
                onClick={() => setStatusFilter('SERVICED')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  statusFilter === 'SERVICED'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>تعویض روغن انجام داده‌ها ({toFaDigits(stats.servicedCount)})</span>
              </button>

              <button
                onClick={() => setStatusFilter('CRITICAL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  statusFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                تعویض فوری ({toFaDigits(stats.critical)})
              </button>

              <button
                onClick={() => setStatusFilter('WARNING')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  statusFilter === 'WARNING'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}
              >
                هشدار ({toFaDigits(stats.warning)})
              </button>

              <button
                onClick={() => setStatusFilter('HEALTHY')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  statusFilter === 'HEALTHY'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                }`}
              >
                ایمن ({toFaDigits(stats.healthy)})
              </button>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-2.5 py-1"
              >
                <option value="ALL">همه انواع خودرو</option>
                {Object.keys(rules).map((k) => (
                  <option key={k} value={k}>
                    {rules[k].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجوی کد، راننده، پلاک..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0a101f] text-slate-400 font-bold border-b border-[#1e2d47]">
                <tr>
                  <th className="p-3 w-12 text-center">کد</th>
                  <th className="p-3">راننده و تماس</th>
                  <th className="p-3">نوع خودرو و سقف</th>
                  <th className="p-3 text-center">پلاک انتظامی</th>
                  <th className="p-3 text-center">کیلومتر جاری و آخرین تعویض</th>
                  <th className="p-3 text-center">پیمایش، هدف بعدی و باقیمانده</th>
                  <th className="p-3 text-center">وضعیت سرویس</th>
                  <th className="p-3 text-center">عملیات ثبت و ویرایش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172338]">
                {filteredVehicles.map((v) => {
                  return (
                    <tr key={v.id} className="hover:bg-[#131f36] transition-colors">
                      <td className="p-3 text-center font-black font-mono text-blue-400 text-sm">
                        {toFaDigits(v.code)}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{v.driverName}</span>
                          {v.driverName === 'بدون راننده' && (
                            <span className="px-1.5 py-0.2 text-[9px] rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              فاقد راننده
                            </span>
                          )}
                        </div>
                        {v.driverPhone && (
                          <div className="text-[10px] text-slate-500 font-mono">{toFaDigits(v.driverPhone)}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#16243a] text-slate-300 w-max font-bold">
                            {v._rule.label}
                          </span>
                          {v._rule.hasMileage ? (
                            <span className="text-[10px] text-sky-400 font-mono">
                              سقف: {toFaDigits((v._rule.maxMileage || 5000).toLocaleString())} km
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500">سقف: {toFaDigits(v._rule.maxDays)} روز</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <IranianPlate plateNumber={v.plateNumber} size="sm" />
                      </td>
                      <td className="p-3 text-center">
                        <div className="space-y-1.5 max-w-[170px] mx-auto">
                          {v._rule.hasMileage && (
                            <div className="flex items-center justify-between bg-[#070e1c] px-2 py-0.5 rounded-md border border-[#1b2b48]">
                              <span className="text-[10px] text-slate-400">کیلومتر جاری:</span>
                              <div className="flex items-center gap-1">
                                <strong className="text-white font-mono text-[11px] font-bold">
                                  {toFaDigits(v._currentMileage.toLocaleString())}
                                </strong>
                                <button
                                  onClick={() => {
                                    setEditingUsageVehicle(v);
                                    setUsageMileage(v._currentMileage);
                                    setUsageTrips(v.tripsSinceChange || 0);
                                  }}
                                  className="text-slate-400 hover:text-amber-300 p-0.5 transition cursor-pointer"
                                  title="به‌روزرسانی کیلومتر جاری خودرو"
                                >
                                  <Gauge className="w-2.5 h-2.5 text-amber-400" />
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono bg-[#0c1628] px-2 py-0.5 rounded border border-[#182742]">
                            <span className="text-slate-400">آخرین تعویض:</span>
                            <div className="flex items-center gap-1">
                              <strong className="text-sky-300">
                                {toFaDigits(v._lastChangeMileage.toLocaleString())} km
                              </strong>
                              <button
                                onClick={() => handleOpenManualOilModal(v)}
                                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                                title="ویرایش دستی کیلومتر تعویض روغن"
                              >
                                <Edit className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono">
                            تاریخ: {toFaDigits(v._lastChangeDate)}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="space-y-1.5">
                          {/* Driven distance & time pill */}
                          <div className="flex items-center justify-between text-[10px] font-mono bg-[#0a101f] px-2 py-0.5 rounded border border-[#1f2c45]">
                            <span className="text-slate-400">پیمایش از سرویس:</span>
                            <strong className="text-sky-300 font-bold">
                              {v._rule.hasMileage ? `+${toFaDigits(v._mileageDriven.toLocaleString())} km` : `${toFaDigits(v._tripsDriven)} سفر`}
                            </strong>
                            <span className="text-slate-500">({toFaDigits(v._daysPassed)} روز)</span>
                          </div>

                          {/* Next target mileage */}
                          {v._rule.hasMileage && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                              <span>کیلومتر هدف بعدی:</span>
                              <strong className="text-slate-200">
                                {toFaDigits(v._nextServiceMileage.toLocaleString())} km
                              </strong>
                            </div>
                          )}

                          {/* Remaining vs Overdue indicator */}
                          {v._isMileageInconsistent ? (
                            <div className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              ⚠️ ناهماهنگی کیلومتر ({toFaDigits(v._mileageOverdue)} km)
                            </div>
                          ) : v._mileageOverdue > 0 ? (
                            <div className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-black flex items-center justify-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>+{toFaDigits(v._mileageOverdue.toLocaleString())} km تأخیر</span>
                            </div>
                          ) : (
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center gap-1 ${
                              v._mileageRemaining <= (v._rule.warningMileage || 500)
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              <span>{toFaDigits(v._mileageRemaining.toLocaleString())} km باقیمانده</span>
                            </div>
                          )}

                          {v._rule.hasMileage && (
                            <div className="w-full max-w-[200px] mx-auto space-y-0.5">
                              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                                <span>مصرف: {toFaDigits(v._mileagePercent)}%</span>
                                <span className="text-slate-500">سقف: {toFaDigits((v._rule.maxMileage || 5000).toLocaleString())}</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    v._mileagePercent >= 100
                                      ? 'bg-rose-500'
                                      : v._mileagePercent >= 85
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${v._mileagePercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {v._serviceStatus === 'CRITICAL' && (
                          <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 w-max mx-auto">
                            <AlertCircle className="w-3 h-3" />
                            تعویض فوری
                          </span>
                        )}
                        {v._serviceStatus === 'WARNING' && (
                          <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1 w-max mx-auto">
                            <AlertTriangle className="w-3 h-3" />
                            هشدار سررسید
                          </span>
                        )}
                        {v._serviceStatus === 'HEALTHY' && (
                          <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 w-max mx-auto">
                            <CheckCircle2 className="w-3 h-3" />
                            ایمن
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Dedicated Vehicle Specifications Button */}
                          <button
                            onClick={() => setSpecsVehicle(v)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs"
                            title="مشاهده و ویرایش مشخصات فنی و شناسنامه خودرو"
                          >
                            <FileText className="w-3 h-3 text-amber-400" />
                            <span>مشخصات خودرو</span>
                          </button>

                          {/* Main Button: Manual Oil Change Mileage Entry */}
                          <button
                            onClick={() => handleOpenManualOilModal(v)}
                            className="px-2 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                            title="ثبت یا ویرایش دستی کیلومتر تعویض روغن"
                          >
                            <Droplet className="w-3 h-3 text-sky-400" />
                            <span>ثبت روغن</span>
                          </button>

                          {/* Quick Service Completed */}
                          <button
                            onClick={() => handleQuickCompleteService(v)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all"
                            title="سرویس شد سریع (تعویض در تاریخ امروز)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Daily Usage (Current Mileage) */}
                          <button
                            onClick={() => {
                              setEditingUsageVehicle(v);
                              setUsageMileage(v._currentMileage);
                              setUsageTrips(v._tripsDriven);
                              setUsageDate(v.lastStatusDate || todayStr);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            title="ثبت کیلومتر فعلی و تعداد سفر"
                          >
                            <Gauge className="w-3.5 h-3.5" />
                          </button>

                          {/* View History */}
                          <button
                            onClick={() => setHistoryVehicle(v)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
                            title="مشاهده تاریخچه سرویس"
                          >
                            <History className="w-3.5 h-3.5" />
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

      {/* SUB TAB 2: ENTRY / DAILY USAGE & MANUAL OIL CHANGE RECORDING */}
      {subTab === 'ENTRY' && (
        <div className="space-y-4">
          {/* Banner Explaining Manual Oil Change */}
          <div className="bg-gradient-to-r from-sky-950/40 via-blue-900/30 to-[#10192b] border border-sky-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  ثبت دستی کیلومتر تعویض روغن برای خودروهای دارای کیلومترشمار
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  برای خودروهایی نظیر نیسان وانت، هیوندا و ایسوزو که تعویض روغن انجام داده‌اند، می‌توانید عدد دقیق کیلومترشمار در زمان تعویض را به صورت دستی ثبت کنید. پیمایش پس از تعویض به صورت زنده محاسبه می‌شود.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const firstWithMileage = enrichedVehicles.find((v) => v._rule.hasMileage);
                if (firstWithMileage) handleOpenManualOilModal(firstWithMileage);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-900/30 flex items-center gap-1.5 shrink-0 transition"
            >
              <Droplet className="w-4 h-4 fill-current" />
              <span>ثبت جدید تعویض روغن</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Column 1: Manual Oil Change Recording for Vehicles with Mileage */}
            <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-sky-400" />
                  <span>ثبت دستی کیلومتر تعویض روغن خودروها</span>
                </h3>
                <span className="text-[10px] bg-sky-500/10 text-sky-300 px-2.5 py-1 rounded-full border border-sky-500/20">
                  {toFaDigits(stats.withMileage)} خودرو کیلومتری
                </span>
              </div>
              <p className="text-xs text-slate-400">
                با کلیک بر روی هر خودرو، پنجره ثبت دستی کیلومتر تعویض، تاریخ، برند روغن و وضعیت فیلترها باز می‌شود.
              </p>

              <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar">
                {enrichedVehicles
                  .filter((v) => v._rule.hasMileage || v._hasCompletedOilChange)
                  .map((v) => (
                    <div
                      key={v.id}
                      className="bg-[#0a101f] p-3.5 rounded-xl border border-[#1c2940] hover:border-sky-500/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-blue-400 text-sm">کد {toFaDigits(v.code)}</span>
                          <span className="font-bold text-slate-200 text-xs truncate">{v.driverName}</span>
                          <span className="text-[10px] text-slate-400">({v._rule.label})</span>
                          {v._hasCompletedOilChange && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                              سرویس شده
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                          <span>
                            کیلومتر تعویض روغن:{' '}
                            <strong className="text-sky-300 font-bold">
                              {toFaDigits(v._lastChangeMileage.toLocaleString())}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            کیلومتر فعلی:{' '}
                            <strong className="text-white">
                              {toFaDigits(v._currentMileage.toLocaleString())}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            پیمایش:{' '}
                            <strong className="text-amber-300">
                              {toFaDigits(v._mileageDriven.toLocaleString())} km
                            </strong>
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono">
                          تاریخ آخرین تعویض: {toFaDigits(v._lastChangeDate)} ({toFaDigits(v._daysPassed)} روز پیش)
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenManualOilModal(v)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-900/30 flex items-center gap-1 transition"
                        >
                          <Droplet className="w-3.5 h-3.5 fill-current" />
                          <span>ثبت دستی کیلومتر</span>
                        </button>

                        <button
                          onClick={() => handleQuickCompleteService(v)}
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition"
                          title="سرویس شد سریع در تاریخ امروز"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: Current Odometer & Trips Input */}
            <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-400" />
                  <span>ثبت کیلومترشمار فعلی و کارکرد روزانه</span>
                </h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/20">
                  {toFaDigits(stats.total)} خودرو
                </span>
              </div>
              <p className="text-xs text-slate-400">
                عدد جاری کیلومترشمار خودرو را وارد نمایید تا کارکرد روزانه و فاصله تا سررسید سرویس به‌روزرسانی شود.
              </p>

              <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar">
                {enrichedVehicles.map((v) => (
                  <div
                    key={v.id}
                    className="bg-[#0a101f] p-3.5 rounded-xl border border-[#1c2940] flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-blue-400 text-sm">کد {toFaDigits(v.code)}</span>
                        <span className="font-bold text-slate-200 text-xs truncate">{v.driverName}</span>
                        <span className="text-[10px] text-slate-400">({v._rule.label})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>
                          کیلومتر جاری: <strong className="text-white">{toFaDigits(v._currentMileage.toLocaleString())}</strong>
                        </span>
                        <span>
                          سفرها: <strong className="text-white">{toFaDigits(v._tripsDriven)}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingUsageVehicle(v);
                        setUsageMileage(v._currentMileage);
                        setUsageTrips(v._tripsDriven);
                        setUsageDate(v.lastStatusDate || todayStr);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>ثبت عدد جاری</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 3: HISTORY & ANALYTICS */}
      {subTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>روند تعویض روغن و سرویس‌های انجام‌شده در ناوگان</span>
              </h3>

              <div className="flex items-center gap-1 bg-[#0a101f] p-1 rounded-xl border border-[#1f2c45]">
                <button
                  onClick={() => setHistoryPeriod('DAY')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    historyPeriod === 'DAY' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  روزانه
                </button>
                <button
                  onClick={() => setHistoryPeriod('MONTH')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    historyPeriod === 'MONTH' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  ماهانه
                </button>
              </div>
            </div>

            {/* Visual Bars Simulation */}
            <div className="h-40 bg-[#0a101f] rounded-xl border border-[#1f2c45] p-4 flex items-end justify-between gap-2 overflow-x-auto custom-scrollbar">
              {[
                { label: 'شنبه', count: 4 },
                { label: 'یکشنبه', count: 7 },
                { label: 'دوشنبه', count: 3 },
                { label: 'سه‌شنبه', count: 6 },
                { label: 'چهارشنبه', count: 9 },
                { label: 'پنج‌شنبه', count: 5 },
                { label: 'جمعه', count: 1 },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-[40px]">
                  <span className="text-[11px] font-bold text-sky-400 font-mono">{toFaDigits(item.count)}</span>
                  <div
                    className="w-full max-w-[36px] bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-lg transition-all hover:brightness-125"
                    style={{ height: `${(item.count / 10) * 100}%` }}
                  />
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Fleet Oil Change Log Table */}
          <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl overflow-hidden shadow-lg space-y-3 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#1f2c45]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h4 className="font-bold text-white text-xs">دفتر ثبت سوابق تعویض روغن و سرویس‌های ناوگان</h4>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Date Picker Filter */}
                <div className="w-48">
                  <PersianDatePicker
                    value={historyDateFilter}
                    onChange={(val) => setHistoryDateFilter(val)}
                    placeholder="فیلتر بر اساس تاریخ..."
                  />
                </div>
                {historyDateFilter && (
                  <button
                    onClick={() => setHistoryDateFilter('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20"
                  >
                    حذف فیلتر تاریخ
                  </button>
                )}

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="جستجو در سوابق تعویض روغن..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-blue-500"
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
                    <th className="p-2.5 text-center">محاسبه زمان (تفاضل روز)</th>
                    <th className="p-2.5 text-center">کیلومتر هنگام تعویض</th>
                    <th className="p-2.5 text-center">کیلومتر فعلی</th>
                    <th className="p-2.5 text-center">تفاضل کارکرد (پیمایش)</th>
                    <th className="p-2.5 text-center">وضعیت سررسید کیلومتر</th>
                    <th className="p-2.5">برند روغن / فیلترها</th>
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
                        <td className="p-2.5 text-center font-mono font-black text-blue-400">{toFaDigits(v.code)}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-200">{v.driverName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{v.plateNumber}</div>
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-300">
                          {toFaDigits(v._lastChangeDate)}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-sky-300 font-bold">{toFaDigits(v._daysPassed)} روز سپری‌شده</span>
                            {v._daysOverdue > 0 ? (
                              <span className="text-[10px] text-rose-400 font-bold">
                                {toFaDigits(v._daysOverdue)} روز تأخیر
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400">
                                {toFaDigits(v._daysRemaining)} روز باقیمانده
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-sky-300">
                          {toFaDigits(v._lastChangeMileage.toLocaleString())} km
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-300">
                          {toFaDigits(v._currentMileage.toLocaleString())} km
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {v._isMileageInconsistent ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold text-[11px] inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>تعارض ({toFaDigits(v._lastChangeMileage - v._currentMileage)} km-)</span>
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-md ${
                                v._serviceStatus === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-300 font-bold'
                                  : 'bg-[#0a101f] text-slate-300'
                              }`}
                            >
                              {toFaDigits(v._mileageDriven.toLocaleString())} km
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px]">
                          {v._rule.hasMileage ? (
                            v._isMileageInconsistent ? (
                              <span className="text-rose-400 font-bold">نیاز به تصحیح کیلومتر</span>
                            ) : v._currentMileage >= v._nextServiceMileage ? (
                              <span className="text-rose-400 font-black">
                                +{toFaDigits(v._mileageOverdue.toLocaleString())} km اضافه
                              </span>
                            ) : (
                              <span className={v._mileageRemaining <= 500 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                                {toFaDigits(v._mileageRemaining.toLocaleString())} km باقیمانده
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">مبنای زمان/سفر</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-slate-200">{v.lastOilBrand || 'بهران دیزل ۱۵W۴۰'}</span>
                            {v.oilFilterChanged && (
                              <span className="px-1.5 py-0.2 text-[9px] bg-blue-500/20 text-blue-300 rounded">
                                فیلتر روغن
                              </span>
                            )}
                            {v.airFilterChanged && (
                              <span className="px-1.5 py-0.2 text-[9px] bg-sky-500/20 text-sky-300 rounded">
                                فیلتر هوا
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleOpenManualOilModal(v)}
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-bold border border-slate-700 transition"
                          >
                            ویرایش کیلومتر
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 4: RULES & STANDARDS - FULLY CUSTOMIZABLE ITEMS & VEHICLES CEILINGS */}
      {subTab === 'RULES' && (
        <div className="space-y-4">
          {/* Top Switcher: Items vs Fleet Vehicle Types */}
          <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-sky-400" />
                  <span>استانداردها، سقف کیلومتر و دوره‌های سرویس ناوگان</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تنظیم و سفارشی‌سازی سقف مجاز کیلومتر، سقف زمانی و آستانه هشدار برای تک‌تک قطعات فنی و انواع خودروها
                </p>
              </div>

              {/* Category Tab Buttons */}
              <div className="flex items-center gap-2 bg-[#091120] p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRulesCategory('ITEMS')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    rulesCategory === 'ITEMS'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>سقف کیلومتر قطعات و اقلام مصرفی</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
                    {toFaDigits(maintenanceItems.length)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRulesCategory('VEHICLES')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    rulesCategory === 'VEHICLES'
                      ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-900/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>استانداردهای انواع خودروها</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
                    {toFaDigits(Object.keys(rules).length)}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW A: MAINTENANCE ITEMS & COMPONENTS STANDARDS */}
          {rulesCategory === 'ITEMS' && (
            <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-[#1b2b48] pb-3">
                {/* Category Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 ml-1">دسته‌بندی:</span>
                  <button
                    onClick={() => setItemCategoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      itemCategoryFilter === 'ALL'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-[#0a101f] text-slate-400 hover:text-white border border-[#1f2c45]'
                    }`}
                  >
                    همه اقلام ({toFaDigits(maintenanceItems.length)})
                  </button>
                  {(['FLUIDS', 'FILTERS', 'BRAKES_TIRES', 'MECHANICAL', 'ELECTRICAL'] as MaintenanceCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setItemCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        itemCategoryFilter === cat
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-[#0a101f] text-slate-400 hover:text-white border border-[#1f2c45]'
                      }`}
                    >
                      {MAINTENANCE_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
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
                    onClick={handleResetMaintenanceItems}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                    title="بازنشانی استانداردهای اقلام به حالت پیش‌فرض کارخانه"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">بازنشانی کارخانه</span>
                  </button>

                  <button
                    onClick={() => setIsAddItemOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-md shadow-amber-950/20 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن قطعه جدید</span>
                  </button>
                </div>
              </div>

              {/* Items Grid */}
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
                      className="bg-[#0a101f] border border-[#1f2c45] hover:border-amber-500/50 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md transition-all group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-[#1b2b48] pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                                {item.name}
                              </h4>
                              <span className="text-[10px] text-slate-400">
                                {item.categoryLabel}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {item.isCustom && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                سفارشی
                              </span>
                            )}
                            <button
                              onClick={() => setEditingItemStandard(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white border border-slate-700 transition cursor-pointer"
                              title="ویرایش سقف کیلومتر و استاندارد این قطعه"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Metric ceilings */}
                        <div className="grid grid-cols-3 gap-2 py-3 text-center">
                          <div className="bg-[#070e1c] p-2 rounded-xl border border-[#15233a]">
                            <span className="text-slate-400 block text-[9px]">سقف کیلومتر</span>
                            <strong className="text-sky-300 font-mono font-bold text-xs">
                              {toFaDigits(item.maxKm.toLocaleString())}
                            </strong>
                            <span className="text-[9px] text-slate-500 block">km</span>
                          </div>

                          <div className="bg-[#070e1c] p-2 rounded-xl border border-[#15233a]">
                            <span className="text-slate-400 block text-[9px]">سقف زمانی</span>
                            <strong className="text-amber-300 font-mono font-bold text-xs">
                              {toFaDigits(item.maxDays)}
                            </strong>
                            <span className="text-[9px] text-slate-500 block">روز</span>
                          </div>

                          <div className="bg-[#070e1c] p-2 rounded-xl border border-[#15233a]">
                            <span className="text-slate-400 block text-[9px]">آستانه هشدار</span>
                            <strong className="text-emerald-400 font-mono font-bold text-xs">
                              {toFaDigits(item.warningKm.toLocaleString())}
                            </strong>
                            <span className="text-[9px] text-slate-500 block">km قبل</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed bg-[#070e1c]/60 p-2 rounded-lg border border-[#141f33]">
                          {item.description}
                        </p>
                      </div>

                      {/* Footer actions */}
                      <div className="pt-2 border-t border-[#18263f] flex items-center justify-between gap-2">
                        <button
                          onClick={() => setEditingItemStandard(item)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>تغییر سقف استاندارد</span>
                        </button>

                        {item.isCustom && (
                          <button
                            onClick={() => handleDeleteItemStandard(item.id, item.name)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition"
                            title="حذف این قطعه سفارشی"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* VIEW B: VEHICLE TYPE SERVICE RULES */}
          {rulesCategory === 'VEHICLES' && (
            <div className="bg-[#10192b] border border-[#1e2d47] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#1b2b48] pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    استانداردهای سرویس دوره‌ای بر اساس مدل و نوع خودروهای ناوگان
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تعیین سقف کیلومتر، سقف روز و تعداد سفر برای هر یک از کلاس‌های خودرویی
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetRules}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازنشانی پیش‌فرض</span>
                  </button>

                  <button
                    onClick={() => setIsAddRuleOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-900/30 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تعریف استاندارد جدید</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {Object.keys(rules).map((key) => {
                  const rule = rules[key];
                  return (
                    <div
                      key={key}
                      className="bg-[#0a101f] border border-[#1f2c45] hover:border-blue-500/50 rounded-2xl p-4 space-y-3 shadow-md flex flex-col justify-between group transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2.5">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-blue-400" />
                            <span className="font-bold text-white text-sm group-hover:text-sky-300 transition-colors">
                              {rule.label}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
                            {key}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs pt-2">
                          <div className="flex items-center justify-between text-slate-300 bg-[#070e1c] p-2 rounded-lg border border-[#141f33]">
                            <span>حداکثر زمان مجاز سرویس:</span>
                            <span className="font-bold text-white font-mono">{toFaDigits(rule.maxDays)} روز</span>
                          </div>

                          {rule.maxTrips !== undefined && (
                            <div className="flex items-center justify-between text-slate-300 bg-[#070e1c] p-2 rounded-lg border border-[#141f33]">
                              <span>حداکثر تعداد سرویس / سفر:</span>
                              <span className="font-bold text-white font-mono">{toFaDigits(rule.maxTrips)} سفر</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-slate-300 bg-[#070e1c] p-2 rounded-lg border border-[#141f33]">
                            <span>سقف کیلومتر پیمایش:</span>
                            {rule.hasMileage ? (
                              <span className="font-bold text-sky-400 font-mono">
                                {toFaDigits((rule.maxMileage || 5000).toLocaleString())} کیلومتر
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium">فاقد کیلومترشمار (بر حسب روز)</span>
                            )}
                          </div>

                          {rule.hasMileage && (
                            <div className="flex items-center justify-between text-slate-400 text-[11px] px-1">
                              <span>آستانه هشدار زودهنگام:</span>
                              <span className="font-mono font-bold text-amber-300">
                                {toFaDigits((rule.warningMileage || 500).toLocaleString())} km قبل
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#18263f]">
                        <button
                          type="button"
                          onClick={() => handleEditRuleClick(key)}
                          className="w-full py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>ویرایش سقف و استاندارد</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: EDIT DAILY USAGE (CURRENT MILEAGE & TRIPS) */}
      {editingUsageVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="line-clamp-1">
                  ثبت کیلومترشمار جاری خودرو کد {toFaDigits(editingUsageVehicle.code)} ({editingUsageVehicle.driverName})
                </span>
              </h3>
              <button
                onClick={() => setEditingUsageVehicle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUsage} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Persian DatePicker for recording date */}
              <div>
                <PersianDatePicker
                  label="تاریخ ثبت کیلومترشمار (شمسی)"
                  required
                  value={usageDate}
                  onChange={(val) => setUsageDate(val)}
                  placeholder="انتخاب تاریخ ثبت..."
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  کیلومترشمار فعلی خودرو (کیلومتر)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={usageMileage}
                  onChange={(e) => setUsageMileage(Number(e.target.value))}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Real-time calculated mileage difference & service remaining */}
              {(() => {
                const lastMil = typeof editingUsageVehicle.lastChangeMileage === 'number'
                  ? editingUsageVehicle.lastChangeMileage
                  : Math.max(0, usageMileage - 3500);
                const rule = rules[editingUsageVehicle.vehicleType] || DEFAULT_SERVICE_RULES[editingUsageVehicle.vehicleType];
                const maxMil = rule?.maxMileage || 5000;
                const nextMil = lastMil + maxMil;
                const diff = usageMileage - lastMil;
                const isConflict = usageMileage < lastMil;
                const remaining = Math.max(0, nextMil - usageMileage);
                const overdue = Math.max(0, usageMileage - nextMil);

                return (
                  <div className="bg-[#091120] border border-[#1a2842] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">کیلومتر آخرین تعویض روغن:</span>
                      <strong className="text-sky-300 font-mono font-bold">
                        {toFaDigits(lastMil.toLocaleString())} km
                      </strong>
                    </div>

                    {isConflict ? (
                      <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>هشدار: کیلومتر جاری کمتر از آخرین تعویض روغن ثبت شده است!</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">تفاضل پیمایش پس از تعویض:</span>
                          <strong className="text-white font-mono font-bold">
                            {toFaDigits(diff.toLocaleString())} km
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                          <span className="text-slate-400">
                            {usageMileage >= nextMil ? 'اضافه پیمایش (سررسید گذشته):' : 'باقیمانده تا تعویض بعدی:'}
                          </span>
                          {usageMileage >= nextMil ? (
                            <strong className="text-rose-400 font-mono font-bold">
                              +{toFaDigits(overdue.toLocaleString())} km
                            </strong>
                          ) : (
                            <strong className={remaining <= 500 ? 'text-amber-400 font-mono font-bold' : 'text-emerald-400 font-mono font-bold'}>
                              {toFaDigits(remaining.toLocaleString())} km
                            </strong>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  تعداد سفرهای انجام‌شده از آخرین تعویض روغن
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={usageTrips}
                  onChange={(e) => setUsageTrips(Number(e.target.value))}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setEditingUsageVehicle(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  ذخیره کارکرد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEDICATED MANUAL OIL CHANGE RECORDING MODAL (ثبت دستی کیلومتر تعویض روغن) */}
      {manualOilVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Droplet className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span>ثبت دستی مشخصات تعویض روغن</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 font-mono">
                      کد {toFaDigits(manualOilVehicle.code)}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>راننده: <strong className="text-slate-200">{manualOilVehicle.driverName}</strong></span>
                    <span>•</span>
                    <span>{VEHICLE_TYPE_NAMES[manualOilVehicle.vehicleType] || manualOilVehicle.vehicleType}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setManualOilVehicle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleSaveManualOilChange} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Iranian Plate and Vehicle Info Bar */}
              <div className="bg-[#0a101f] border border-[#1f2c45] rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <IranianPlate plateNumber={manualOilVehicle.plateNumber} size="sm" />
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                  <span>سقف مجاز روغن: <strong className="text-sky-300">{toFaDigits(5000)} km</strong></span>
                  <span>•</span>
                  <span>حداکثر زمان: <strong className="text-slate-200">{toFaDigits(45)} روز</strong></span>
                </div>
              </div>

              {/* CORE SECTION: OIL CHANGE MILEAGE & CURRENT MILEAGE */}
              <div className="bg-[#0e172a] border border-sky-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-300 font-bold text-xs">
                    <Gauge className="w-4 h-4" />
                    <span>ورود مستقیم کیلومتر تعویض روغن و کیلومتر فعلی</span>
                  </div>
                  <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    محاسبه هوشمند پیمایش
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field: Oil Change Mileage */}
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
                        onChange={(e) => setManualOilChangeMileage(Number(e.target.value))}
                        className="w-full bg-[#0a101f] border-2 border-sky-500/50 focus:border-sky-400 text-white font-mono text-base font-black rounded-lg px-3 py-2 focus:outline-none"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                        km
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setManualOilChangeMileage(manualCurrentMileage)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 px-2 py-0.5 rounded border border-slate-700"
                      >
                        برابر با کیلومتر فعلی
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualOilChangeMileage(Math.max(0, manualCurrentMileage - 3500))}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                      >
                        ۳,۵۰۰ کیلومتر قبل
                      </button>
                    </div>
                  </div>

                  {/* Field: Current Vehicle Mileage */}
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
                        className="w-full bg-[#0a101f] border border-[#1f2c45] focus:border-blue-500 text-white font-mono text-base font-black rounded-lg px-3 py-2 focus:outline-none"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                        km
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      کیلومتر کارکرد فعلی نمایش‌داده‌شده روی داشبورد ماشین
                    </p>
                  </div>
                </div>

                {/* Real-time calculated mileage difference & time indicator */}
                {(() => {
                  const rule = manualOilVehicle
                    ? rules[manualOilVehicle.vehicleType] || DEFAULT_SERVICE_RULES[manualOilVehicle.vehicleType]
                    : { maxMileage: 5000, maxDays: 45 };
                  const maxAllowed = rule?.maxMileage || 5000;
                  const maxDays = rule?.maxDays || 45;

                  const isWarning = manualOilChangeMileage > manualCurrentMileage;
                  const driven = Math.max(0, manualCurrentMileage - manualOilChangeMileage);
                  const nextServiceMil = manualOilChangeMileage + maxAllowed;
                  const remaining = Math.max(0, nextServiceMil - manualCurrentMileage);
                  const overdueMileage = Math.max(0, manualCurrentMileage - nextServiceMil);
                  const percent = Math.min(100, Math.round((driven / maxAllowed) * 100));

                  const daysSinceChange = calculateDaysBetweenJalaali(manualOilChangeDate);
                  const parsedManualDate = parseJalaaliDate(manualOilChangeDate);
                  const nextDueDateObj = parsedManualDate ? addJalaaliDays(parsedManualDate, maxDays) : null;
                  const nextDueDateStr = nextDueDateObj ? formatJalaaliDate(nextDueDateObj.jy, nextDueDateObj.jm, nextDueDateObj.jd) : '';
                  const daysRemaining = Math.max(0, maxDays - daysSinceChange);
                  const daysOverdue = Math.max(0, daysSinceChange - maxDays);

                  return (
                    <div className="pt-2 border-t border-[#1f2c45] space-y-3">
                      {isWarning ? (
                        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>
                              <strong>هشدار تعارض کیلومتر:</strong> کیلومتر تعویض ({toFaDigits(manualOilChangeMileage.toLocaleString())}) نمی‌تواند از کیلومتر فعلی ({toFaDigits(manualCurrentMileage.toLocaleString())}) بیشتر باشد.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setManualCurrentMileage(manualOilChangeMileage)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shrink-0 transition"
                          >
                            همگام‌سازی کیلومتر فعلی
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Box 1: Mileage Metrics */}
                          <div className="bg-[#0a101f] p-3 rounded-xl border border-[#1c2940] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">پیمایش پس از تعویض:</span>
                              <strong className="text-sky-300 font-mono text-sm font-black">
                                {toFaDigits(driven.toLocaleString())} km
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">کیلومتر سررسید بعدی:</span>
                              <strong className="text-amber-300 font-mono font-bold">
                                {toFaDigits(nextServiceMil.toLocaleString())} km
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                              <span className="text-slate-400">
                                {manualCurrentMileage >= nextServiceMil ? 'اضافه پیمایش (تأخیر):' : 'باقیمانده تا تعویض:'}
                              </span>
                              {manualCurrentMileage >= nextServiceMil ? (
                                <strong className="text-rose-400 font-mono font-black">
                                  +{toFaDigits(overdueMileage.toLocaleString())} km
                                </strong>
                              ) : (
                                <strong className={remaining <= 500 ? 'text-amber-400 font-mono font-bold' : 'text-emerald-400 font-mono font-bold'}>
                                  {toFaDigits(remaining.toLocaleString())} km
                                </strong>
                              )}
                            </div>
                          </div>

                          {/* Box 2: Time & Days Metrics */}
                          <div className="bg-[#0a101f] p-3 rounded-xl border border-[#1c2940] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">زمان سپری‌شده:</span>
                              <strong className="text-sky-300 font-mono text-sm font-black">
                                {toFaDigits(daysSinceChange)} روز
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">تاریخ سررسید بعدی:</span>
                              <strong className="text-amber-300 font-mono font-bold">
                                {nextDueDateStr ? toFaDigits(nextDueDateStr) : '—'}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                              <span className="text-slate-400">
                                {daysSinceChange >= maxDays ? 'تأخیر زمانی:' : 'مهلت باقیمانده:'}
                              </span>
                              {daysSinceChange >= maxDays ? (
                                <strong className="text-rose-400 font-mono font-black">
                                  {toFaDigits(daysOverdue)} روز تأخیر
                                </strong>
                              ) : (
                                <strong className={daysRemaining <= 7 ? 'text-amber-400 font-mono font-bold' : 'text-emerald-400 font-mono font-bold'}>
                                  {toFaDigits(daysRemaining)} روز
                                </strong>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Visual gauge bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>میزان استهلاک روغن: {toFaDigits(percent)}%</span>
                          <span>سقف مجاز: {toFaDigits(maxAllowed.toLocaleString())} km ({toFaDigits(maxDays)} روز)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 100 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DATE & TRIPS SECTION WITH PERSIAN DATEPICKER */}
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
                    تعداد سفرهای اعزامی پس از تعویض روغن
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualTripsSinceChange}
                    onChange={(e) => setManualTripsSinceChange(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* OIL BRAND & FILTERS CHANGED */}
              <div className="space-y-2 pt-1 border-t border-[#1f2c45]">
                <label className="block text-slate-300 font-medium">برند و نوع روغن موتور مصرفی</label>
                <input
                  type="text"
                  placeholder="مثال: بهران دیزل سوپر ۱۵W۴۰"
                  value={manualOilBrand}
                  onChange={(e) => setManualOilBrand(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                />

                {/* Popular brand pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500">انتخاب سریع:</span>
                  {POPULAR_OIL_BRANDS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setManualOilBrand(b)}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition ${
                        manualOilBrand === b
                          ? 'bg-sky-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters Changed Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <span className="block text-slate-300 font-medium">اقلام تعویض‌شده در این سرویس:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0a101f] border border-[#1f2c45] cursor-pointer hover:border-slate-600">
                    <input
                      type="checkbox"
                      checked={manualOilFilter}
                      onChange={(e) => setManualOilFilter(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span className="text-slate-200">فیلتر روغن</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0a101f] border border-[#1f2c45] cursor-pointer hover:border-slate-600">
                    <input
                      type="checkbox"
                      checked={manualAirFilter}
                      onChange={(e) => setManualAirFilter(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span className="text-slate-200">فیلتر هوا</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0a101f] border border-[#1f2c45] cursor-pointer hover:border-slate-600">
                    <input
                      type="checkbox"
                      checked={manualFuelFilter}
                      onChange={(e) => setManualFuelFilter(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span className="text-slate-200">فیلتر گازوئیل / سوخت</span>
                  </label>
                </div>
              </div>

              {/* OPTIONAL INVOICE & TECHNICIAN DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-[#1f2c45]">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">نام تعویض‌روغنی / تکنسین</label>
                  <input
                    type="text"
                    placeholder="اتوسرویس البرز"
                    value={manualShopName}
                    onChange={(e) => setManualShopName(e.target.value)}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">شماره فاکتور</label>
                  <input
                    type="text"
                    placeholder="INV-9821"
                    value={manualInvoiceNo}
                    onChange={(e) => setManualInvoiceNo(e.target.value)}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">هزینه کل سرویس (تومان)</label>
                  <input
                    type="number"
                    placeholder="مثال: ۸۵۰۰۰۰"
                    value={manualCost}
                    onChange={(e) => setManualCost(e.target.value)}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">توضیحات و یادداشت دیسپچر</label>
                <input
                  type="text"
                  placeholder="نکات تکمیلی تعویض روغن یا وضعیت سلامت موتور..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-lg px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* MODAL FOOTER */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#1f2c45] shrink-0">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="line-clamp-1">داده‌ها بلافاصله در داشبورد و سوابق ثبت می‌شوند.</span>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setManualOilVehicle(null)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-center"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-900/30 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>ثبت تعویض روغن</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SERVICE HISTORY */}
      {historyVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="line-clamp-1">
                  تاریخچه سرویس‌های خودرو کد {toFaDigits(historyVehicle.code)} ({historyVehicle.driverName})
                </span>
              </h3>
              <button
                onClick={() => setHistoryVehicle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto custom-scrollbar text-xs">
              {((historyVehicle as any).serviceHistory || []).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  تاریخچه‌ای برای این خودرو ثبت نشده است. با ثبت «کیلومتر تعویض روغن»، رویدادها در این بخش ذخیره می‌شوند.
                </div>
              ) : (
                ((historyVehicle as any).serviceHistory || []).map((h: ServiceHistoryEntry, idx: number) => (
                  <div key={idx} className="p-3.5 bg-[#0a101f] rounded-xl border border-[#1f2c45] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 font-mono text-sm">{toFaDigits(h.date)}</span>
                      {h.mileage && (
                        <span className="text-sky-300 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          کیلومتر تعویض: {toFaDigits(h.mileage.toLocaleString())} km
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-300 text-[11px] flex-wrap">
                      {h.oilBrand && (
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200">
                          روغن: {h.oilBrand}
                        </span>
                      )}
                      {h.oilFilterChanged && (
                        <span className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">
                          فیلتر روغن تعویض شد
                        </span>
                      )}
                      {h.airFilterChanged && (
                        <span className="bg-sky-500/10 text-sky-300 px-1.5 py-0.5 rounded text-[10px]">
                          فیلتر هوا تعویض شد
                        </span>
                      )}
                    </div>

                    {h.technicianOrShop && (
                      <div className="text-[10px] text-slate-400">
                        تعمیرگاه/سرویس‌کار: {h.technicianOrShop}
                        {h.invoiceNumber && ` (فاکتور: ${h.invoiceNumber})`}
                      </div>
                    )}

                    {h.notes && <div className="text-slate-300 text-[11px] pt-1 border-t border-slate-800">{h.notes}</div>}
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-[#1f2c45] bg-[#0d1524] shrink-0">
              <button
                onClick={() => {
                  const target = historyVehicle;
                  setHistoryVehicle(null);
                  if (target) handleOpenManualOilModal(target);
                }}
                className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold text-center"
              >
                ثبت سرویس جدید برای این خودرو
              </button>

              <button
                onClick={() => setHistoryVehicle(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs text-center hover:bg-slate-700"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD RULE */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
              <h3 className="font-bold text-white text-sm">تعریف استاندارد جدید تعویض روغن</h3>
              <button
                onClick={() => setIsAddRuleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>این نوع خودرو دارای سقف کیلومتر پیمایش است</span>
                </label>
              </div>

              {newRuleHasMileage && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">سقف کیلومتر پیمایش (کیلومتر)</label>
                  <input
                    type="number"
                    value={newRuleMileage}
                    onChange={(e) => setNewRuleMileage(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  ویرایش سقف استاندارد: {editingItemStandard.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItemStandard(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">دسته‌بندی فنی</label>
                <select
                  value={editingItemStandard.category}
                  onChange={(e) => {
                    const cat = e.target.value as MaintenanceCategory;
                    setEditingItemStandard({
                      ...editingItemStandard,
                      category: cat,
                      categoryLabel: MAINTENANCE_CATEGORY_LABELS[cat] || cat,
                    });
                  }}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="FLUIDS">روغن‌ها و مایعات مصرفی</option>
                  <option value="FILTERS">فیلترها و صافی‌ها</option>
                  <option value="BRAKES">سیستم ترمز و ایمنی</option>
                  <option value="TIRES">لاستیک و تایرها</option>
                  <option value="MECHANICAL">قطعات مکانیکی و تسمه‌ها</option>
                  <option value="ELECTRICAL">برق، باتری و جرقه‌زنی</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">سقف پیمایش مجاز (کیلومتر)</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={editingItemStandard.maxKm}
                    onChange={(e) => setEditingItemStandard({ ...editingItemStandard, maxKm: Number(e.target.value) })}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-amber-300 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">معادل {toFaDigits(editingItemStandard.maxKm.toLocaleString())} کیلومتر</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">سقف دوره زمانی (روز)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingItemStandard.maxDays}
                    onChange={(e) => setEditingItemStandard({ ...editingItemStandard, maxDays: Number(e.target.value) })}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">معادل تقریبی {toFaDigits(Math.round(editingItemStandard.maxDays / 30))} ماه</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  آستانه هشدار زرد رنگ (کیلومتر مانده به سررسید)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={editingItemStandard.warningKm}
                  onChange={(e) => setEditingItemStandard({ ...editingItemStandard, warningKm: Number(e.target.value) })}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  زمانی که باقیمانده به کمتر از این عدد برسد، نشانگر وضعیت به رنگ زرد (هشدار) درمی‌آید.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">توضیحات و مشخصات توصیه شده</label>
                <textarea
                  rows={2}
                  value={editingItemStandard.description || ''}
                  onChange={(e) => setEditingItemStandard({ ...editingItemStandard, description: e.target.value })}
                  placeholder="مثال: گرید روغن، استاندارد تعویض فیلتر، برند مورد تأیید..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45] shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItemStandard(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  ذخیره تغییرات استاندارد
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">تعریف استاندارد و سقف قطعه مصرفی جدید</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddItemOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItemSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نام قطعه یا خدمت جدید</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: چهارشاخه گاردان، صفحه کلاچ، آب رادیاتور..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">دسته‌بندی فنی</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as MaintenanceCategory)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="FLUIDS">روغن‌ها و مایعات مصرفی</option>
                  <option value="FILTERS">فیلترها و صافی‌ها</option>
                  <option value="BRAKES">سیستم ترمز و ایمنی</option>
                  <option value="TIRES">لاستیک و تایرها</option>
                  <option value="MECHANICAL">قطعات مکانیکی و تسمه‌ها</option>
                  <option value="ELECTRICAL">برق، باتری و جرقه‌زنی</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">سقف کیلومتر پیمایش مجاز</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={newItemMaxKm}
                    onChange={(e) => setNewItemMaxKm(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-emerald-400 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">معادل {toFaDigits(newItemMaxKm.toLocaleString())} کیلومتر</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">سقف دوره زمانی (روز)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItemMaxDays}
                    onChange={(e) => setNewItemMaxDays(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">معادل تقریبی {toFaDigits(Math.round(newItemMaxDays / 30))} ماه</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  آستانه هشدار زرد رنگ (کیلومتر مانده به سررسید)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={newItemWarningKm}
                  onChange={(e) => setNewItemWarningKm(Number(e.target.value))}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">توضیحات و راهنمای تکمیلی</label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="مشخصات استاندارد قطعه، دستورالعمل بازرسی..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-900/30 cursor-pointer"
                >
                  ثبت قطعه در استاندارد ناوگان
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2c45] bg-[#0d1524] shrink-0">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">
                  ویرایش استاندارد تیپ: {editRuleLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRuleKey(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 rounded-xl px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editRuleHasMileage}
                    onChange={(e) => setEditRuleHasMileage(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold">این نوع خودرو دارای سقف کیلومتر پیمایش است</span>
                </label>
              </div>

              {editRuleHasMileage && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-semibold">سقف کیلومتر پیمایش</label>
                    <input
                      type="number"
                      required
                      min={100}
                      step={100}
                      value={editRuleMileage}
                      onChange={(e) => setEditRuleMileage(Number(e.target.value))}
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-sky-400 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">معادل {toFaDigits(editRuleMileage.toLocaleString())} km</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-300 font-semibold">آستانه هشدار زرد (km)</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={editRuleWarningMileage}
                      onChange={(e) => setEditRuleWarningMileage(Number(e.target.value))}
                      className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">{toFaDigits(editRuleWarningMileage)} کیلومتر مانده</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">حداکثر روز مجاز (سقف تقویمی)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editRuleDays}
                    onChange={(e) => setEditRuleDays(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">{toFaDigits(editRuleDays)} روز</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">حداکثر تعداد سفر مجاز</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editRuleTrips}
                    onChange={(e) => setEditRuleTrips(Number(e.target.value))}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-100 font-bold rounded-xl px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">{toFaDigits(editRuleTrips)} سفر</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2c45] shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingRuleKey(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-900/30 cursor-pointer"
                >
                  ذخیره تغییرات استاندارد
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
              details: `به‌روزرسانی اطلاعات فنی و مشخصات در تاریخ ${toFaDigits(todayStr)}`,
              timestamp: todayStr,
              previousVehicleState: { ...specsVehicle },
            };
            setUndoStack((prev) => [undoItem, ...prev.slice(0, 19)]);
          }
          onUpdateVehicle(updated);
        }}
        onOpenOilModal={handleOpenManualOilModal}
        showToast={showToast}
      />

      {/* Floating Interactive Undo Bar */}
      {undoStack.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d172a]/95 border-2 border-amber-500/60 shadow-2xl shadow-black/80 rounded-2xl px-5 py-3 flex items-center gap-4 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 max-w-lg w-full text-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-black flex items-center gap-2 truncate">
              <span>{undoStack[0].title}</span>
              <span className="text-[10px] text-amber-300 font-mono font-normal">
                ({toFaDigits(undoStack[0].timestamp)})
              </span>
            </div>
            <div className="text-[11px] text-slate-300 truncate mt-0.5">
              {undoStack[0].details}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-700">
            <button
              type="button"
              onClick={() => handleUndo()}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition hover:scale-105 cursor-pointer"
              title="واگردانی این تغییر (کلید میانبر Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
              <span>واگردانی (Undo)</span>
            </button>
            <button
              type="button"
              onClick={() => setUndoStack([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              title="بستن این پیام"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Official Vehicle Technical Passport & Spec Print Modal (Laser-Ready White Paper) */}
      {printingVehicle && (
        <VehicleSpecPrintModal
          vehicle={printingVehicle}
          onClose={() => setPrintingVehicle(null)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
