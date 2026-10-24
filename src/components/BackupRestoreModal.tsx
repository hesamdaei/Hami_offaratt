import { FC, useState, useRef, ChangeEvent } from 'react';
import {
  Database,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  X,
  ShieldCheck,
  Users,
  Truck,
  Package,
  Calendar,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { Driver, AttendanceRecords, StaffMember } from '../types';
import { VehicleItem } from '../utils/fleetSeedData';
import { DriverDirectoryItem } from '../utils/fleetSeedData';
import { OrderItem } from '../utils/ordersData';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { DECODED_BACKUP } from '../utils/backupDecoder';

export interface FullBackupData {
  version: number;
  appName: string;
  system: string;
  exportedAt: string;
  exportDateJalali: string;
  stats: {
    totalDrivers: number;
    totalStaff: number;
    totalVehicles: number;
    totalOrders: number;
    hasDriverRecords: boolean;
    hasStaffRecords: boolean;
  };
  data: {
    drivers: Driver[];
    records: AttendanceRecords;
    staffMembers: StaffMember[];
    staffRecords: AttendanceRecords;
    vehicles: VehicleItem[];
    driverDirectory: DriverDirectoryItem[];
    orders: OrderItem[];
    reservationRates?: any;
    serviceRules?: any;
    cargoTracking?: any;
    gpsVehicles?: any;
  };
}

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  records: AttendanceRecords;
  staffMembers: StaffMember[];
  staffRecords: AttendanceRecords;
  vehicles: VehicleItem[];
  driverDirectory: DriverDirectoryItem[];
  orders: OrderItem[];
  onRestoreData: (backup: FullBackupData, mode: 'overwrite' | 'merge') => void;
  onResetDefaults?: () => void;
  onApplyDecodedBackup?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BackupRestoreModal: FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  drivers,
  records,
  staffMembers,
  staffRecords,
  vehicles,
  driverDirectory,
  orders,
  onRestoreData,
  onResetDefaults,
  onApplyDecodedBackup,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'RESTORE' | 'RESET'>('BACKUP');
  const [isCopied, setIsCopied] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');

  // File parsing state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedBackup, setParsedBackup] = useState<FullBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  if (!isOpen) return null;

  const today = getTodayJalaali();

  // Helper to read auxiliary stored items safely
  const getAuxiliaryData = () => {
    let reservationRates = undefined;
    let serviceRules = undefined;
    let cargoTracking = undefined;
    let gpsVehicles = undefined;

    try {
      const savedRates = localStorage.getItem('sedaghatbar_reservation_rates_v1');
      if (savedRates) reservationRates = JSON.parse(savedRates);
    } catch {
      // ignore
    }

    try {
      const savedRules = localStorage.getItem('hamibar_service_rules_v1');
      if (savedRules) serviceRules = JSON.parse(savedRules);
    } catch {
      // ignore
    }

    try {
      const savedTrack = localStorage.getItem('sedaghatbar_cargo_tracking_v1');
      if (savedTrack) cargoTracking = JSON.parse(savedTrack);
    } catch {
      // ignore
    }

    try {
      const savedGps = localStorage.getItem('sedaghatbar_gps_fleet_v1');
      if (savedGps) gpsVehicles = JSON.parse(savedGps);
    } catch {
      // ignore
    }

    return { reservationRates, serviceRules, cargoTracking, gpsVehicles };
  };

  // Build the complete JSON backup payload
  const buildBackupPayload = (): FullBackupData => {
    const aux = getAuxiliaryData();
    return {
      version: 4,
      appName: 'سامانه یکپارچه مدیریت ترابری و لجستیک حامی بار',
      system: 'HamiBar Logistics Enterprise Suite',
      exportedAt: new Date().toISOString(),
      exportDateJalali: today.fullFa,
      stats: {
        totalDrivers: drivers.length,
        totalStaff: staffMembers.length,
        totalVehicles: vehicles.length,
        totalOrders: orders.length,
        hasDriverRecords: Object.keys(records || {}).length > 0,
        hasStaffRecords: Object.keys(staffRecords || {}).length > 0,
      },
      data: {
        drivers,
        records,
        staffMembers,
        staffRecords,
        vehicles,
        driverDirectory,
        orders,
        ...aux,
      },
    };
  };

  const handleDownloadBackup = () => {
    try {
      const payload = buildBackupPayload();
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hamibar-backup-${today.jy}-${String(today.jm).padStart(2, '0')}-${String(today.jd).padStart(2, '0')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowToast('فایل پشتیبان کامل JSON با موفقیت دانلود شد.', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('خطا در ایجاد فایل پشتیبان.', 'error');
    }
  };

  const handleCopyJson = () => {
    try {
      const payload = buildBackupPayload();
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onShowToast('داده‌های فایل پشتیبان در حافظه موقت (Clipboard) کپی شد.', 'info');
    } catch {
      onShowToast('خطا در کپی داده‌ها.', 'error');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    setParsedBackup(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Normalize v4 and legacy v1-v3 formats
        let normalizedDrivers: Driver[] = [];
        let normalizedRecords: AttendanceRecords = {};
        let normalizedStaff: StaffMember[] = [];
        let normalizedStaffRecords: AttendanceRecords = {};
        let normalizedVehicles: VehicleItem[] = [];
        let normalizedDriverDir: DriverDirectoryItem[] = [];
        let normalizedOrders: OrderItem[] = [];
        let reservationRates = undefined;
        let serviceRules = undefined;
        let cargoTracking = undefined;
        let gpsVehicles = undefined;

        if (parsed.data) {
          // v4 format
          normalizedDrivers = Array.isArray(parsed.data.drivers) ? parsed.data.drivers : [];
          normalizedRecords = parsed.data.records || {};
          normalizedStaff = Array.isArray(parsed.data.staffMembers) ? parsed.data.staffMembers : [];
          normalizedStaffRecords = parsed.data.staffRecords || {};
          normalizedVehicles = Array.isArray(parsed.data.vehicles) ? parsed.data.vehicles : [];
          normalizedDriverDir = Array.isArray(parsed.data.driverDirectory) ? parsed.data.driverDirectory : [];
          normalizedOrders = Array.isArray(parsed.data.orders) ? parsed.data.orders : [];
          reservationRates = parsed.data.reservationRates;
          serviceRules = parsed.data.serviceRules;
          cargoTracking = parsed.data.cargoTracking;
          gpsVehicles = parsed.data.gpsVehicles;
        } else if (Array.isArray(parsed.drivers) || Array.isArray(parsed.staffMembers)) {
          // Legacy v1-v3 format
          normalizedDrivers = Array.isArray(parsed.drivers) ? parsed.drivers : [];
          normalizedRecords = parsed.records || {};
          normalizedStaff = Array.isArray(parsed.staffMembers) ? parsed.staffMembers : [];
          normalizedStaffRecords = parsed.staffRecords || {};
          normalizedVehicles = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
          normalizedDriverDir = Array.isArray(parsed.driverDirectory) ? parsed.driverDirectory : [];
          normalizedOrders = Array.isArray(parsed.orders) ? parsed.orders : [];
        } else {
          throw new Error('ساختار فایل پشتیبان معتبر نیست.');
        }

        const validBackup: FullBackupData = {
          version: parsed.version || 3,
          appName: parsed.appName || 'سامانه حامی بار',
          system: parsed.system || 'HamiBar',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          exportDateJalali: parsed.exportDateJalali || 'نامشخص',
          stats: {
            totalDrivers: normalizedDrivers.length,
            totalStaff: normalizedStaff.length,
            totalVehicles: normalizedVehicles.length,
            totalOrders: normalizedOrders.length,
            hasDriverRecords: Object.keys(normalizedRecords).length > 0,
            hasStaffRecords: Object.keys(normalizedStaffRecords).length > 0,
          },
          data: {
            drivers: normalizedDrivers,
            records: normalizedRecords,
            staffMembers: normalizedStaff,
            staffRecords: normalizedStaffRecords,
            vehicles: normalizedVehicles,
            driverDirectory: normalizedDriverDir,
            orders: normalizedOrders,
            reservationRates,
            serviceRules,
            cargoTracking,
            gpsVehicles,
          },
        };

        setParsedBackup(validBackup);
      } catch (err: any) {
        console.error(err);
        setParseError('فایل نامعتبر است یا فرمت JSON صحیح نیست: ' + (err.message || ''));
      }
    };
    reader.onerror = () => {
      setParseError('خطا در خواندن فایل.');
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!parsedBackup) return;
    onRestoreData(parsedBackup, restoreMode);
    onShowToast('اطلاعات با موفقیت از فایل پشتیبان بازگردانی شد.', 'success');
    setIsConfirmingRestore(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" dir="rtl">
      <div className="bg-[#0b1324] border border-[#1e2e4f] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0e1930] border-b border-[#1e2e4f] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <Database className="w-5 h-5 font-black" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>مرکز پشتیبان‌گیری و بازیابی داده‌ها</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  JSON v4
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                تهیه نسخه پشتیبان دستی از کل اطلاعات رانندگان، پرسنل، ناوگان، سفارشات و حضور و غیاب
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live System Data Counters Strip */}
        <div className="bg-[#070e1c] px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#182642] grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 text-center text-xs shrink-0">
          <div className="bg-[#0e1930]/80 border border-slate-800 rounded-lg p-1.5 sm:p-2">
            <span className="text-slate-400 block text-[10px] sm:text-[11px]">رانندگان</span>
            <span className="text-white font-bold text-xs sm:text-sm">{toFaDigits(drivers.length)} نفر</span>
          </div>
          <div className="bg-[#0e1930]/80 border border-slate-800 rounded-lg p-1.5 sm:p-2">
            <span className="text-slate-400 block text-[10px] sm:text-[11px]">پرسنل</span>
            <span className="text-white font-bold text-xs sm:text-sm">{toFaDigits(staffMembers.length)} نفر</span>
          </div>
          <div className="bg-[#0e1930]/80 border border-slate-800 rounded-lg p-1.5 sm:p-2">
            <span className="text-slate-400 block text-[10px] sm:text-[11px]">ناوگان خودروها</span>
            <span className="text-white font-bold text-xs sm:text-sm">{toFaDigits(vehicles.length)} دستگاه</span>
          </div>
          <div className="bg-[#0e1930]/80 border border-slate-800 rounded-lg p-1.5 sm:p-2">
            <span className="text-slate-400 block text-[10px] sm:text-[11px]">سفارشات</span>
            <span className="text-white font-bold text-xs sm:text-sm">{toFaDigits(orders.length)}</span>
          </div>
          <div className="bg-[#0e1930]/80 border border-slate-800 rounded-lg p-1.5 sm:p-2 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[10px] sm:text-[11px]">پرونده‌های فعال</span>
            <span className="text-white font-bold text-xs sm:text-sm">{toFaDigits(driverDirectory.length)} پرونده</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e2e4f] bg-[#0c162b] px-3 sm:px-6 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition shrink-0 ${
              activeTab === 'BACKUP'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>دانلود پشتیبان (JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('RESTORE')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition shrink-0 ${
              activeTab === 'RESTORE'
                ? 'border-blue-400 text-blue-400 bg-blue-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>بازیابی اطلاعات (Restore)</span>
          </button>
          <button
            onClick={() => setActiveTab('RESET')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition shrink-0 mr-auto ${
              activeTab === 'RESET'
                ? 'border-rose-400 text-rose-400 bg-rose-400/5'
                : 'border-transparent text-slate-400 hover:text-rose-300'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>بازنشانی داده‌ها</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* TAB 1: BACKUP */}
          {activeTab === 'BACKUP' && (
            <div className="space-y-4">
              <div className="bg-[#111e38] border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">فایل خروجی پشتیبان شامل چه مواردی است؟</p>
                  <p className="leading-relaxed">
                    این فایل JSON حاوی تمامی رکوردهای رانندگان، مشخصات پرونده‌ها و گواهینامه‌ها، اطلاعات پرسنل با تمام جزئیات احراز هویت، شماره بیمه و حساب‌های بانکی، ناوگان خودروها، بارنامه‌ها و سفارشات ثبت‌شده، سوابق حضور و غیاب ماهانه و تعرفه‌های سیستم می‌باشد.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleDownloadBackup}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 px-6 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-98 text-sm"
                >
                  <Download className="w-5 h-5" />
                  دانلود فایل پشتیبان کامل JSON (یک کلیک)
                </button>

                <button
                  onClick={handleCopyJson}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#142340] hover:bg-[#1a2d52] border border-[#233860] text-slate-200 font-bold py-3 px-4 rounded-xl transition text-xs"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  {isCopied ? 'کپی شد!' : 'کپی متن JSON در حافظه'}
                </button>

                <button
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#142340] hover:bg-[#1a2d52] border border-[#233860] text-slate-200 font-bold py-3 px-4 rounded-xl transition text-xs"
                >
                  <FileJson className="w-4 h-4 text-blue-400" />
                  {showJsonPreview ? 'بستن پیش‌نمایش' : 'مشاهده ساختار'}
                </button>
              </div>

              {/* Collapsible JSON Preview */}
              {showJsonPreview && (
                <div className="bg-[#050914] border border-[#1b2b4d] rounded-xl p-3 text-left dir-ltr max-h-56 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-emerald-400/90 whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        version: 4,
                        appName: 'سامانه حامی بار',
                        exportedAt: new Date().toISOString(),
                        stats: {
                          totalDrivers: drivers.length,
                          totalStaff: staffMembers.length,
                          totalVehicles: vehicles.length,
                          totalOrders: orders.length,
                        },
                        data: {
                          drivers_count: drivers.length,
                          staff_count: staffMembers.length,
                          vehicles_count: vehicles.length,
                          orders_count: orders.length,
                          sample_driver: drivers[0]?.name || null,
                          sample_staff: staffMembers[0]?.name || null,
                        },
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {/* Security & Reliability Note */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-[#091224] p-3 rounded-lg border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  فایل‌های پشتیبان مستقیماً در مرورگر شما تولید می‌شوند و به هیچ سرور خارجی ارسال نمی‌گردند. نگهداری دوره‌ای این فایل از بروز هرگونه فقدان اطلاعات پیشگیری می‌کند.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-4">
              {/* Quick apply decoded backup */}
              {onApplyDecodedBackup && (
                <div className="bg-linear-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/40 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-right flex-1">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>اعمال مستقیم آخرین بک‌آپ دریافتی سیستم (رمزگشایی‌شده)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans">
                        آماده بارگذاری
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      این نسخه شامل اطلاعات کامل <span className="font-bold text-amber-300">{toFaDigits(DECODED_BACKUP.vehicles.length)} خودرو</span> (با کیلومتر، سوابق تعویض روغن، انقضای بیمه و معاینه فنی)، <span className="font-bold text-amber-300">{toFaDigits(DECODED_BACKUP.drivers.length)} راننده</span>، پرسنل دیسپچ، و تمامی <span className="font-bold text-amber-300">مرخصی‌ها و تعمیرات شهریور و مهر ۱۴۰۵</span> می‌باشد.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyDecodedBackup();
                      onClose();
                    }}
                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs py-2.5 px-5 rounded-xl shadow-md shadow-blue-600/30 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>اعمال فوری این بک‌آپ</span>
                  </button>
                </div>
              )}

              <div className="bg-[#111e38] border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">راهنمای بازیابی فایل پشتیبان</p>
                  <p className="leading-relaxed">
                    فایل قبلی دانلودشده با پسوند <span className="font-mono text-amber-300">.json</span> را انتخاب نمایید. سیستم پس از بررسی اعتبار ساختار، پیش‌نمایشی از تعداد رکوردهای موجود را نمایش می‌دهد تا با اطمینان کامل آن را اعمال نمایید.
                  </p>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#24375e] hover:border-blue-500/60 rounded-xl p-6 text-center cursor-pointer bg-[#0e1930]/50 hover:bg-[#0e1930] transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileJson className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white mb-1">
                  {fileName ? fileName : 'جهت انتخاب فایل پشتیبان JSON اینجا کلیک کنید'}
                </div>
                <div className="text-xs text-slate-400">یا فایل را به این قسمت بکشید و رها کنید (Drag & Drop)</div>
              </div>

              {/* Parse Error */}
              {parseError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Successfully Parsed Preview */}
              {parsedBackup && (
                <div className="bg-[#0f1d38] border border-emerald-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      فایل پشتیبان با موفقیت اعتبارسنجی شد
                    </div>
                    <span className="text-[11px] text-slate-400">نسخه: v{parsedBackup.version}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-[#091224] p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">رانندگان موجود:</span>
                      <span className="text-white font-bold">{toFaDigits(parsedBackup.stats.totalDrivers)} نفر</span>
                    </div>
                    <div className="bg-[#091224] p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">پرسنل موجود:</span>
                      <span className="text-white font-bold">{toFaDigits(parsedBackup.stats.totalStaff)} نفر</span>
                    </div>
                    <div className="bg-[#091224] p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">ناوگان موجود:</span>
                      <span className="text-white font-bold">{toFaDigits(parsedBackup.stats.totalVehicles)} دستگاه</span>
                    </div>
                    <div className="bg-[#091224] p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">سفارشات موجود:</span>
                      <span className="text-white font-bold">{toFaDigits(parsedBackup.stats.totalOrders)} مورد</span>
                    </div>
                  </div>

                  {/* Restore Mode Options */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-300 mb-2">نحوه اعمال داده‌های پشتیبان:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          restoreMode === 'overwrite'
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-[#091224] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="overwrite"
                          checked={restoreMode === 'overwrite'}
                          onChange={() => setRestoreMode('overwrite')}
                          className="mt-0.5"
                        />
                        <div className="text-xs">
                          <span className="font-bold block">جایگزینی کامل (توصیه شده)</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            تمامی اطلاعات فعلی با اطلاعات موجود در فایل پشتیبان جایگزین می‌شوند.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          restoreMode === 'merge'
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-[#091224] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5"
                        />
                        <div className="text-xs">
                          <span className="font-bold block">ادغام هوشمند (Merge)</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            رکوردهای جدید اضافه شده و رکوردهای تکراری به‌روزرسانی می‌گردند.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Restore Confirmation Trigger */}
                  {!isConfirmingRestore ? (
                    <button
                      onClick={() => setIsConfirmingRestore(true)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition text-xs mt-3 shadow-lg shadow-emerald-600/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      تأیید و اجرای بازیابی داده‌ها
                    </button>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl mt-3 space-y-2">
                      <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        آیا از بازیابی اطلاعات اطمینان دارید؟
                      </div>
                      <p className="text-[11px] text-slate-300">
                        با اجرای این عملیات، داده‌های فعلی با اطلاعات فایل بک‌آپ جایگزین خواهند شد.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleConfirmRestore}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs transition"
                        >
                          بله، بازیابی شود
                        </button>
                        <button
                          onClick={() => setIsConfirmingRestore(false)}
                          className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 rounded-lg text-xs transition"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESET TO FACTORY DEFAULTS */}
          {activeTab === 'RESET' && (
            <div className="space-y-4">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-rose-200">بازنشانی اطلاعات به حالت کارخانه‌ای و داده‌های اولیه</p>
                  <p className="leading-relaxed">
                    در صورتی که مایل هستید کل داده‌های پایگاه به نمونه‌های پیش‌فرض سامانه بازگردد، می‌توانید از این گزینه استفاده کنید. توصیه می‌شود پیش از بازنشانی، حتماً یک بک‌آپ JSON دانلود فرمایید.
                  </p>
                </div>
              </div>

              {!isConfirmingReset ? (
                <button
                  onClick={() => setIsConfirmingReset(true)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600/80 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition text-xs shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  بارگذاری داده‌های اولیه کارخانه‌ای
                </button>
              ) : (
                <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-xl space-y-3">
                  <p className="text-xs text-rose-300 font-bold">
                    آیا کاملاً مطمئن هستید؟ داده‌های ثبت‌شده فعلی به حالت پیش‌فرض بازخواهند گشت.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onResetDefaults?.();
                        setIsConfirmingReset(false);
                        onClose();
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg text-xs transition"
                    >
                      بله، بازنشانی قطعی انجام شود
                    </button>
                    <button
                      onClick={() => setIsConfirmingReset(false)}
                      className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-xs transition"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0a1224] border-t border-[#182642] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>پشتیبان‌گیری یکپارچه حامی بار</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-medium"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
