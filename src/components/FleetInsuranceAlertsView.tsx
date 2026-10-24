import { FC, useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  Search,
  Filter,
  RefreshCw,
  Send,
  Printer,
  Copy,
  Calendar,
  X,
  Phone,
  Check,
  FileText,
  Building2,
  Hash,
} from 'lucide-react';
import { VehicleItem } from '../utils/fleetSeedData';
import {
  checkVehicleInsurance,
  getFleetInsuranceAlerts,
  generateInsuranceReminderMessage,
  VehicleInsuranceAlert,
} from '../utils/insuranceAlerts';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { PersianDatePicker } from './PersianDatePicker';
import { recordAuditLog } from '../utils/auditLogger';
import { getStoredSession } from '../utils/authService';
import { FleetInsuranceAlertsPrintModal } from './FleetInsuranceAlertsPrintModal';
import { IranianPlate } from './IranianPlate';

interface FleetInsuranceAlertsViewProps {
  vehicles: VehicleItem[];
  onUpdateVehicle: (updated: VehicleItem) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  highlightedVehicleId?: string | null;
  onOpenSpecifications?: (vehicle: VehicleItem) => void;
  onOpenBaleForDriver?: (info: { name: string; phone?: string; vehicleCode?: number; plateNumber?: string }) => void;
}

type ExpiryFilter = 'ALL' | 'CRITICAL_7_DAYS' | 'EXPIRED' | 'EXPIRING_30_DAYS' | 'VALID';
type PolicyTypeFilter = 'ALL' | 'thirdParty' | 'body' | 'inspection';

export const FleetInsuranceAlertsView: FC<FleetInsuranceAlertsViewProps> = ({
  vehicles,
  onUpdateVehicle,
  showToast,
  highlightedVehicleId,
  onOpenSpecifications,
  onOpenBaleForDriver,
}) => {
  const todayInfo = getTodayJalaali();
  const currentUser = getStoredSession();

  // Filters & Search
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('CRITICAL_7_DAYS');
  const [policyTypeFilter, setPolicyTypeFilter] = useState<PolicyTypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [renewingVehicle, setRenewingVehicle] = useState<VehicleItem | null>(null);
  const [reminderModalData, setReminderModalData] = useState<{
    vehicle: VehicleItem;
    policyTitle: string;
    expiryDate: string;
    daysRemaining: number;
    messageText: string;
  } | null>(null);
  const [copiedReminder, setCopiedReminder] = useState(false);

  // Renewal form fields
  const [renewThirdPartyDate, setRenewThirdPartyDate] = useState('');
  const [renewBodyInsuranceDate, setRenewBodyInsuranceDate] = useState('');
  const [renewInspectionDate, setRenewInspectionDate] = useState('');
  const [renewCompany, setRenewCompany] = useState('');
  const [renewPolicyNumber, setRenewPolicyNumber] = useState('');

  // Compute all alerts for every vehicle
  const allAlerts: VehicleInsuranceAlert[] = useMemo(() => {
    return vehicles.map((v) => checkVehicleInsurance(v));
  }, [vehicles]);

  // Overall statistics
  const stats = useMemo(() => {
    const summary = getFleetInsuranceAlerts(vehicles, 7);
    const expiredCount = allAlerts.filter((a) => a.hasExpiredPolicy).length;
    const critical7DaysCount = allAlerts.filter((a) => a.minDaysRemaining >= 0 && a.minDaysRemaining <= 7).length;
    const expiring30DaysCount = allAlerts.filter((a) => a.minDaysRemaining > 7 && a.minDaysRemaining <= 30).length;
    const validCount = allAlerts.filter((a) => a.minDaysRemaining > 30).length;

    return {
      total: vehicles.length,
      urgentCount: summary.totalAlertsCount, // <= 7 days or expired
      expiredCount,
      critical7DaysCount,
      expiring30DaysCount,
      validCount,
    };
  }, [vehicles, allAlerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((alert) => {
      const v = alert.vehicle;

      // Status filter
      if (expiryFilter === 'CRITICAL_7_DAYS') {
        if (alert.minDaysRemaining > 7) return false;
      } else if (expiryFilter === 'EXPIRED') {
        if (!alert.hasExpiredPolicy) return false;
      } else if (expiryFilter === 'EXPIRING_30_DAYS') {
        if (alert.minDaysRemaining <= 7 || alert.minDaysRemaining > 30) return false;
      } else if (expiryFilter === 'VALID') {
        if (alert.minDaysRemaining <= 30) return false;
      }

      // Policy type filter
      if (policyTypeFilter !== 'ALL') {
        const hasMatchingPolicy = alert.policies.some((p) => p.type === policyTypeFilter);
        if (!hasMatchingPolicy) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeMatch = String(v.code).includes(q);
        const nameMatch = (v.driverName || '').toLowerCase().includes(q);
        const plateMatch = (v.plateNumber || '').toLowerCase().includes(q);
        const policyNoMatch = (v.insurancePolicyNumber || '').toLowerCase().includes(q);
        const companyMatch = (v.insuranceCompany || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !plateMatch && !policyNoMatch && !companyMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => a.minDaysRemaining - b.minDaysRemaining);
  }, [allAlerts, expiryFilter, policyTypeFilter, searchQuery]);

  // Open Quick Renewal Modal
  const handleOpenRenewModal = (vehicle: VehicleItem) => {
    setRenewingVehicle(vehicle);
    setRenewThirdPartyDate(vehicle.thirdPartyExpiry || '۱۴۰۶/۰۱/۰۱');
    setRenewBodyInsuranceDate(vehicle.insuranceExpiry || '۱۴۰۶/۰۱/۰۱');
    setRenewInspectionDate(vehicle.inspectionExpiry || '۱۴۰۶/۰۱/۰۱');
    setRenewCompany(vehicle.insuranceCompany || 'بیمه ایران');
    setRenewPolicyNumber(vehicle.insurancePolicyNumber || `INS-${toFaDigits(vehicle.code * 100)}`);
  };

  // Submit Renewal
  const handleSaveRenewal = () => {
    if (!renewingVehicle) return;

    const previousThirdParty = renewingVehicle.thirdPartyExpiry || '---';
    const previousBody = renewingVehicle.insuranceExpiry || '---';

    const updated: VehicleItem = {
      ...renewingVehicle,
      thirdPartyExpiry: renewThirdPartyDate,
      insuranceExpiry: renewBodyInsuranceDate,
      inspectionExpiry: renewInspectionDate,
      insuranceCompany: renewCompany,
      insurancePolicyNumber: renewPolicyNumber,
    };

    onUpdateVehicle(updated);

    // Record audit log
    recordAuditLog(currentUser, {
      action: 'OIL_SERVICE_UPDATE',
      module: 'OIL_SERVICE',
      title: `تمدید بیمه‌نامه خودرو کد ${toFaDigits(renewingVehicle.code)}`,
      description: `بیمه شخص ثالث از «${previousThirdParty}» به «${renewThirdPartyDate}» و بیمه بدنه از «${previousBody}» به «${renewBodyInsuranceDate}» به‌روزرسانی شد. (شرکت: ${renewCompany})`,
      targetId: renewingVehicle.id,
      targetName: `خودرو کد ${renewingVehicle.code} (${renewingVehicle.plateNumber})`,
      severity: 'SUCCESS',
      previousValue: `شخص ثالث: ${previousThirdParty} | بدنه: ${previousBody}`,
      newValue: `شخص ثالث: ${renewThirdPartyDate} | بدنه: ${renewBodyInsuranceDate} | شماره: ${renewPolicyNumber}`,
    });

    if (showToast) {
      showToast(
        `بیمه‌نامه خودرو کد ${toFaDigits(renewingVehicle.code)} (${renewingVehicle.plateNumber}) با موفقیت تمدید و ثبت گردید.`,
        'success'
      );
    }

    setRenewingVehicle(null);
  };

  // Open reminder modal
  const handleOpenReminderModal = (vehicle: VehicleItem, policy: { title: string; expiryDate: string; daysRemaining: number }) => {
    const text = generateInsuranceReminderMessage(vehicle, policy.title, policy.expiryDate, policy.daysRemaining);
    setReminderModalData({
      vehicle,
      policyTitle: policy.title,
      expiryDate: policy.expiryDate,
      daysRemaining: policy.daysRemaining,
      messageText: text,
    });
    setCopiedReminder(false);
  };

  const handleCopyReminder = () => {
    if (!reminderModalData) return;
    navigator.clipboard.writeText(reminderModalData.messageText);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2500);
    if (showToast) {
      showToast('متن هشدار رسمی در حافظه کپی شد.', 'info');
    }
  };

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handlePrintList = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Title */}
      <div className="bg-[#0e1628] border border-[#1e2d47] rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">سیستم هوشمند هشدار و پایش بیمه‌نامه‌های ناوگان</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  سررسید کمتر از ۷ روز
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                بررسی مستمر بیمه شخص ثالث، بیمه بدنه و معاینه فنی خودروها جهت جلوگیری از تردد بدون پوشش بیمه‌ای و توقیف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrintList}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-bold transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>چاپ گزارش هشدارها</span>
            </button>

            <div className="bg-[#070d19] border border-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                تاریخ سنجش: <strong className="text-white font-mono">{toFaDigits(todayInfo.fullFa)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          {/* Card 1: Critical (<= 7 days or expired) */}
          <div
            onClick={() => setExpiryFilter('CRITICAL_7_DAYS')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              expiryFilter === 'CRITICAL_7_DAYS'
                ? 'bg-rose-500/20 border-rose-500/50 ring-1 ring-rose-500/40'
                : 'bg-[#070d19] border-slate-800 hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-bold text-rose-300">🚨 سررسید بحرانی (&le; ۷ روز)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">
              {toFaDigits(stats.urgentCount)} <span className="text-xs font-normal text-rose-300">خودرو</span>
            </div>
            <div className="text-[10px] text-slate-400">
              شامل {toFaDigits(stats.expiredCount)} منقضی و {toFaDigits(stats.critical7DaysCount)} رو به پایان
            </div>
          </div>

          {/* Card 2: Expired */}
          <div
            onClick={() => setExpiryFilter('EXPIRED')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              expiryFilter === 'EXPIRED'
                ? 'bg-red-950/40 border-red-500/50 ring-1 ring-red-500/40'
                : 'bg-[#070d19] border-slate-800 hover:border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-medium text-red-300">منقضی شده (توقف تردد)</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400 font-mono">
              {toFaDigits(stats.expiredCount)} <span className="text-xs font-normal text-red-300">خودرو</span>
            </div>
            <div className="text-[10px] text-slate-400">اعتبار به پایان رسیده است</div>
          </div>

          {/* Card 3: Expiring 7 to 30 days */}
          <div
            onClick={() => setExpiryFilter('EXPIRING_30_DAYS')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              expiryFilter === 'EXPIRING_30_DAYS'
                ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30'
                : 'bg-[#070d19] border-slate-800 hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-medium text-amber-300">۷ الی ۳۰ روز مانده</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {toFaDigits(stats.expiring30DaysCount)} <span className="text-xs font-normal text-amber-300">خودرو</span>
            </div>
            <div className="text-[10px] text-slate-400">نیاز به هماهنگی صدور</div>
          </div>

          {/* Card 4: Valid (> 30 days) */}
          <div
            onClick={() => setExpiryFilter('VALID')}
            className={`p-3.5 rounded-xl border space-y-1 cursor-pointer transition-all ${
              expiryFilter === 'VALID'
                ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-[#070d19] border-slate-800 hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-medium text-emerald-300">وضعیت معتبر (&gt; ۳۰ روز)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {toFaDigits(stats.validCount)} <span className="text-xs font-normal text-emerald-300">خودرو</span>
            </div>
            <div className="text-[10px] text-slate-400">بدون نیاز به اقدام فوری</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b1222] border border-[#1b2943] rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Status Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 ml-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>فیلتر وضعیت:</span>
          </span>

          <button
            onClick={() => setExpiryFilter('CRITICAL_7_DAYS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              expiryFilter === 'CRITICAL_7_DAYS'
                ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-950/40 ring-1 ring-rose-400'
                : 'bg-[#070d19] text-rose-300 border border-rose-500/30 hover:bg-rose-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
            <span>بحرانی (&le; ۷ روز)</span>
            <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded text-[10px]">
              {toFaDigits(stats.urgentCount)}
            </span>
          </button>

          <button
            onClick={() => setExpiryFilter('EXPIRED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              expiryFilter === 'EXPIRED'
                ? 'bg-red-600 text-white font-black shadow-md shadow-red-950/40'
                : 'bg-[#070d19] text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>منقضی شده</span>
            <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded text-[10px] mr-1">
              {toFaDigits(stats.expiredCount)}
            </span>
          </button>

          <button
            onClick={() => setExpiryFilter('EXPIRING_30_DAYS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              expiryFilter === 'EXPIRING_30_DAYS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/40'
                : 'bg-[#070d19] text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>۷ الی ۳۰ روز</span>
            <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded text-[10px] mr-1">
              {toFaDigits(stats.expiring30DaysCount)}
            </span>
          </button>

          <button
            onClick={() => setExpiryFilter('VALID')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              expiryFilter === 'VALID'
                ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-950/40'
                : 'bg-[#070d19] text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>معتبر</span>
            <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded text-[10px] mr-1">
              {toFaDigits(stats.validCount)}
            </span>
          </button>

          <button
            onClick={() => setExpiryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              expiryFilter === 'ALL'
                ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-950/40'
                : 'bg-[#070d19] text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>همه ناوگان ({toFaDigits(stats.total)})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی پلاک، راننده، کد خودرو یا شماره بیمه..."
            className="w-full bg-[#070d19] border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 outline-none transition"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-8 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Vehicles Insurance Table / List */}
      <div className="bg-[#0b1222] border border-[#1b2943] rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 bg-[#0d162a] border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>فهرست پایش بیمه‌نامه‌های خودروها</span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono text-[11px]">
              {toFaDigits(filteredAlerts.length)} مورد
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            هشدارها بر اساس کمترین روز باقیمانده مرتب شده‌اند
          </span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div className="text-white font-bold text-sm">هیچ خودرویی با شرایط فیلتر انتخاب شده یافت نشد.</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              تمامی بیمه‌نامه‌های خودروها در محدوده استاندارد قرار دارند و موردی جهت نمایش وجود ندارد.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredAlerts.map((alert) => {
              const v = alert.vehicle;
              const isHighlighted = highlightedVehicleId === v.id;
              const thirdParty = alert.policies.find((p) => p.type === 'thirdParty');
              const bodyPolicy = alert.policies.find((p) => p.type === 'body');
              const inspection = alert.policies.find((p) => p.type === 'inspection');

              return (
                <div
                  key={v.id}
                  className={`p-4 transition-all hover:bg-[#0f1a33]/80 ${
                    alert.hasCriticalExpiry
                      ? 'bg-rose-950/10'
                      : alert.hasExpiredPolicy
                      ? 'bg-red-950/15'
                      : ''
                  } ${isHighlighted ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''}`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Vehicle Identity & Driver Info */}
                    <div className="flex items-start gap-3 min-w-[260px]">
                      {/* Authentic Iranian License Plate */}
                      <div className="shrink-0">
                        <IranianPlate plateNumber={v.plateNumber} size="sm" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">
                            کد {toFaDigits(v.code)} — {v.vehicleType}
                          </span>
                          {alert.hasExpiredPolicy && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                              منقضی
                            </span>
                          )}
                          {!alert.hasExpiredPolicy && alert.hasCriticalExpiry && (
                            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                              &le; ۷ روز
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>راننده: <strong className="text-slate-200">{v.driverName}</strong></span>
                          {v.driverPhone && (
                            <span className="text-[11px] text-slate-400 font-mono">({toFaDigits(v.driverPhone)})</span>
                          )}
                          {v.insuranceCompany && (
                            <span className="text-[10px] bg-slate-800 text-sky-300 px-1.5 py-0.2 rounded">
                              {v.insuranceCompany}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Policy Columns (Third Party, Body, Inspection) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 w-full max-w-2xl">
                      {/* Policy 1: Third-Party Insurance */}
                      <div className="bg-[#070d19] border border-slate-800/90 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">بیمه شخص ثالث:</span>
                          {thirdParty && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${thirdParty.statusColor}`}>
                              {thirdParty.statusBadge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white">
                            {toFaDigits(v.thirdPartyExpiry || 'ثبت نشده')}
                          </span>
                          {thirdParty && thirdParty.isCritical && (
                            <button
                              type="button"
                              onClick={() => handleOpenReminderModal(v, thirdParty)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 underline cursor-pointer"
                              title="ارسال پیامک یا پیام بله به راننده"
                            >
                              <Send className="w-3 h-3" />
                              <span>اخطار</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Policy 2: Body Insurance */}
                      <div className="bg-[#070d19] border border-slate-800/90 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">بیمه بدنه:</span>
                          {bodyPolicy && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${bodyPolicy.statusColor}`}>
                              {bodyPolicy.statusBadge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white">
                            {toFaDigits(v.insuranceExpiry || 'ثبت نشده')}
                          </span>
                          {bodyPolicy && bodyPolicy.isCritical && (
                            <button
                              type="button"
                              onClick={() => handleOpenReminderModal(v, bodyPolicy)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 underline cursor-pointer"
                              title="ارسال پیامک یا پیام بله به راننده"
                            >
                              <Send className="w-3 h-3" />
                              <span>اخطار</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Policy 3: Technical Inspection */}
                      <div className="bg-[#070d19] border border-slate-800/90 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">معاینه فنی:</span>
                          {inspection && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${inspection.statusColor}`}>
                              {inspection.statusBadge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white">
                            {toFaDigits(v.inspectionExpiry || 'ثبت نشده')}
                          </span>
                          {inspection && inspection.isCritical && (
                            <button
                              type="button"
                              onClick={() => handleOpenReminderModal(v, inspection)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 underline cursor-pointer"
                              title="ارسال پیامک یا پیام بله به راننده"
                            >
                              <Send className="w-3 h-3" />
                              <span>اخطار</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenRenewModal(v)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-amber-950/20 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>تمدید بیمه</span>
                      </button>

                      {onOpenSpecifications && (
                        <button
                          type="button"
                          onClick={() => onOpenSpecifications(v)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1 cursor-pointer"
                          title="مشاهده پرونده کامل فنی و مدارک"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span className="hidden sm:inline">پرونده فنی</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK RENEWAL MODAL */}
      {renewingVehicle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#1e293b] p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    تمدید و به‌روزرسانی بیمه‌نامه خودرو کد {toFaDigits(renewingVehicle.code)}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    پلاک {toFaDigits(renewingVehicle.plateNumber)} — راننده: {renewingVehicle.driverName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRenewingVehicle(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 text-xs">
              {/* Field 1: Third Party Expiry */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  تاریخ جدید انقضای بیمه‌نامه شخص ثالث (اجباری)
                </label>
                <PersianDatePicker
                  value={renewThirdPartyDate}
                  onChange={(val) => setRenewThirdPartyDate(val)}
                  placeholder="۱۴۰۶/۰۱/۰۱"
                />
              </div>

              {/* Field 2: Body Insurance Expiry */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  تاریخ جدید انقضای بیمه بدنه
                </label>
                <PersianDatePicker
                  value={renewBodyInsuranceDate}
                  onChange={(val) => setRenewBodyInsuranceDate(val)}
                  placeholder="۱۴۰۶/۰۱/۰۱"
                />
              </div>

              {/* Field 3: Inspection Expiry */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  تاریخ جدید معاینه فنی خودرو
                </label>
                <PersianDatePicker
                  value={renewInspectionDate}
                  onChange={(val) => setRenewInspectionDate(val)}
                  placeholder="۱۴۰۶/۰۱/۰۱"
                />
              </div>

              {/* Grid: Company & Policy Number */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">شرکت بیمه‌گر</label>
                  <select
                    value={renewCompany}
                    onChange={(e) => setRenewCompany(e.target.value)}
                    className="w-full bg-[#070d19] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="بیمه ایران">بیمه ایران</option>
                    <option value="بیمه آسیا">بیمه آسیا</option>
                    <option value="بیمه دانا">بیمه دانا</option>
                    <option value="بیمه البرز">بیمه البرز</option>
                    <option value="بیمه پارسیان">بیمه پارسیان</option>
                    <option value="بیمه رازی">بیمه رازی</option>
                    <option value="بیمه معلم">بیمه معلم</option>
                    <option value="بیمه کوثر">بیمه کوثر</option>
                    <option value="بیمه کارآفرین">بیمه کارآفرین</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">شماره بیمه‌نامه</label>
                  <input
                    type="text"
                    value={renewPolicyNumber}
                    onChange={(e) => setRenewPolicyNumber(e.target.value)}
                    placeholder="شماره قرارداد بیمه"
                    className="w-full bg-[#070d19] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#1e293b] p-4 flex items-center justify-end gap-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setRenewingVehicle(null)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveRenewal}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-amber-950/30 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>ثبت و تایید تمدید بیمه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER REMINDER MODAL */}
      {reminderModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1e293b] p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  ارسال اخطار سررسید بیمه به راننده
                </h3>
              </div>
              <button
                onClick={() => setReminderModalData(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="bg-[#070d19] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">{reminderModalData.vehicle.driverName}</div>
                  <div className="text-slate-400 font-mono mt-0.5">
                    همراه: {toFaDigits(reminderModalData.vehicle.driverPhone || 'بدون شماره')}
                  </div>
                </div>
                <div className="text-left font-mono text-amber-300 font-bold">
                  خودرو {toFaDigits(reminderModalData.vehicle.plateNumber)}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">متن رسمی اخطار تمدید بیمه:</label>
                <textarea
                  readOnly
                  rows={6}
                  value={reminderModalData.messageText}
                  className="w-full bg-[#070d19] border border-slate-700 rounded-xl p-3 text-slate-200 font-sans text-xs leading-relaxed outline-none"
                />
              </div>
            </div>

            <div className="bg-[#1e293b] p-4 flex items-center justify-between border-t border-slate-700">
              <button
                type="button"
                onClick={handleCopyReminder}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedReminder ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>کپی در حافظه</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {onOpenBaleForDriver && reminderModalData.vehicle.driverPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenBaleForDriver({
                        name: reminderModalData.vehicle.driverName,
                        phone: reminderModalData.vehicle.driverPhone,
                        vehicleCode: reminderModalData.vehicle.code,
                        plateNumber: reminderModalData.vehicle.plateNumber,
                      });
                      setReminderModalData(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/30"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال در پیام‌رسان بله</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setReminderModalData(null)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Laser-Optimized A4 Print Modal with Customizable Watermark */}
      {isPrintModalOpen && (
        <FleetInsuranceAlertsPrintModal
          vehicles={vehicles}
          filterType={expiryFilter === 'EXPIRING_30_DAYS' ? 'ALL' : expiryFilter}
          onClose={() => setIsPrintModalOpen(false)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
