import { FC, useState, useMemo, useEffect, FormEvent } from 'react';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Truck,
  User,
  Clock,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  FileCheck,
  Check,
  Eye,
  RotateCcw,
  Hash,
  MapPin,
  ShieldCheck,
  Download,
  Square,
  FileSpreadsheet,
} from 'lucide-react';
import {
  VehicleHandoverRecord,
  HANDOVER_CHECKLIST_ITEMS,
  VehicleHandoverItemStatus,
  BodyDamageMarker,
  DEFAULT_HANDOVER_AFFIDAVIT,
} from '../types/vehicleHandover';
import { Truck4ViewBodyInspector } from './Truck4ViewBodyInspector';
import { Truck4ViewPrintableSchematic } from './Truck4ViewPrintableSchematic';
import { VehicleHandoverA4PrintModal } from './VehicleHandoverA4PrintModal';
import { IranianPlate } from './IranianPlate';
import { exportHandoverToWord, exportHandoverToExcel } from '../utils/handoverDocExporter';
import { VehicleItem, DriverDirectoryItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import { Driver } from '../types';
import { toFaDigits, getTodayJalaali, formatPersianDateKey } from '../utils/jalaali';

interface VehicleHandoverManagerProps {
  vehicles?: VehicleItem[];
  drivers?: Driver[];
  driverDirectory?: DriverDirectoryItem[];
  initialVehicle?: VehicleItem | null;
  initialDriver?: Driver | DriverDirectoryItem | null;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSyncCentralDb?: () => void;
}

const STORAGE_KEY_HANDOVER = 'hamibar_vehicle_handover_records_v1';

export const VehicleHandoverManager: FC<VehicleHandoverManagerProps> = ({
  vehicles = [],
  drivers = [],
  driverDirectory = [],
  initialVehicle = null,
  initialDriver = null,
  onShowToast,
  onSyncCentralDb,
}) => {
  const today = useMemo(() => getTodayJalaali(), []);
  const todayDateStr = useMemo(
    () => formatPersianDateKey(today.jy, today.jm, today.jd),
    [today]
  );

  // Load records from localStorage
  const [records, setRecords] = useState<VehicleHandoverRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HANDOVER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    // Initial sample seed record for demonstration
    return [
      {
        id: 'rec-init-1',
        receiptNumber: '10482',
        date: formatPersianDateKey(today.jy, today.jm, today.jd),
        time: '۰۸:۳۰',
        address: 'پایانه مرکزی ناوگان صداقت بار پیشرو',
        driverName: 'رحیم',
        driverLastName: 'بدرلو',
        driverFatherName: 'علی',
        driverNationalId: '۰۰۷۲۱۴۵۸۹۲',
        vehicleType: 'خاور مسقف کانتینردار',
        vehicleCode: '1',
        vehicleColor: 'سفید روغنی',
        vehiclePlate: '۶۶-۵۳۳ع۲۵',
        checklist: HANDOVER_CHECKLIST_ITEMS.reduce((acc, item) => {
          acc[item.id] = 'HEALTHY';
          return acc;
        }, {} as Record<string, VehicleHandoverItemStatus>),
        damages: [
          {
            id: 'dmg-sample-1',
            view: 'FRONT',
            x: 23,
            y: 65,
            damageType: 'SCRATCH',
            severity: 'MINOR',
            partName: 'گلگیر جلو شاگرد',
            description: 'خط و خش جزیی روی لبه گلگیر',
            timestamp: '۰۸:۳۵',
          },
        ],
        affidavitText: DEFAULT_HANDOVER_AFFIDAVIT,
        delivererName: 'مسئول اعزام و ترابری صداقت بار پیشرو',
        receiverName: 'رحیم بدرلو',
        createdAt: formatPersianDateKey(today.jy, today.jm, today.jd),
      },
    ];
  });

  const saveRecords = (newRecords: VehicleHandoverRecord[]) => {
    setRecords(newRecords);
    try {
      localStorage.setItem(STORAGE_KEY_HANDOVER, JSON.stringify(newRecords));
    } catch (e) {
      console.error(e);
    }
    if (onSyncCentralDb) {
      onSyncCentralDb();
    }
  };

  // View Mode: Default to 'FORM' so the user immediately gets the interactive form!
  const [handoverViewMode, setHandoverViewMode] = useState<'FORM' | 'SHEET_VIEW' | 'ARCHIVE_LIST'>('FORM');
  const [selectedRecordIdForView, setSelectedRecordIdForView] = useState<string>('rec-init-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDamageStatus, setFilterDamageStatus] = useState<'ALL' | 'DAMAGED' | 'CLEAN'>('ALL');

  // Active print record for A4 Modal
  const [activePrintRecord, setActivePrintRecord] = useState<VehicleHandoverRecord | null>(null);
  const [activePrintIsBlank, setActivePrintIsBlank] = useState<boolean>(false);

  // Form Fields State
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState(() => String(Math.floor(10000 + Math.random() * 89999)));
  const [handoverDate, setHandoverDate] = useState(todayDateStr);
  const [handoverTime, setHandoverTime] = useState(() =>
    new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  );
  const [address, setAddress] = useState('پایانه مرکزی ناوگان صداقت بار پیشرو');

  const [driverName, setDriverName] = useState('');
  const [driverLastName, setDriverLastName] = useState('');
  const [driverFatherName, setDriverFatherName] = useState('');
  const [driverNationalId, setDriverNationalId] = useState('');

  const [vehicleType, setVehicleType] = useState('خاور کانتینردار');
  const [vehicleCode, setVehicleCode] = useState('');
  const [vehicleColor, setVehicleColor] = useState('سفید');
  const [vehiclePlate, setVehiclePlate] = useState('');

  // Default checklist with all items HEALTHY
  const [checklist, setChecklist] = useState<Record<string, VehicleHandoverItemStatus>>(() => {
    const initCheck: Record<string, VehicleHandoverItemStatus> = {};
    HANDOVER_CHECKLIST_ITEMS.forEach((i) => {
      initCheck[i.id] = 'HEALTHY';
    });
    return initCheck;
  });

  const [damages, setDamages] = useState<BodyDamageMarker[]>([]);
  const [affidavitText, setAffidavitText] = useState(DEFAULT_HANDOVER_AFFIDAVIT);
  const [delivererName, setDelivererName] = useState('مسئول اعزام و ترابری صداقت بار پیشرو');
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-fill when initialVehicle or initialDriver are passed
  useEffect(() => {
    if (initialVehicle) {
      setHandoverViewMode('FORM');
      setVehiclePlate(initialVehicle.plateNumber || '');
      setVehicleCode(String(initialVehicle.code || ''));
      setVehicleType(VEHICLE_TYPE_NAMES[initialVehicle.vehicleType] || initialVehicle.vehicleType || 'خاور کانتینردار');
      if (initialVehicle.color) setVehicleColor(initialVehicle.color);

      if (initialVehicle.driverName && initialVehicle.driverName !== 'بدون راننده' && initialVehicle.driverName !== 'NONE') {
        const parts = initialVehicle.driverName.trim().split(' ');
        if (parts.length > 1) {
          setDriverName(parts[0]);
          setDriverLastName(parts.slice(1).join(' '));
        } else {
          setDriverName(initialVehicle.driverName);
          setDriverLastName('');
        }
        setReceiverName(initialVehicle.driverName);

        // Find driver details if available
        const found =
          drivers.find((d) => d.name.trim() === initialVehicle.driverName?.trim()) ||
          driverDirectory.find((d) => d.name.trim() === initialVehicle.driverName?.trim());
        if (found) {
          if (found.nationalId) setDriverNationalId(found.nationalId);
          if ('fatherName' in found && found.fatherName) setDriverFatherName(found.fatherName);
        }
      }
    }
  }, [initialVehicle, drivers, driverDirectory]);

  useEffect(() => {
    if (initialDriver) {
      setHandoverViewMode('FORM');
      const parts = initialDriver.name.trim().split(' ');
      if (parts.length > 1) {
        setDriverName(parts[0]);
        setDriverLastName(parts.slice(1).join(' '));
      } else {
        setDriverName(initialDriver.name);
        setDriverLastName('');
      }
      setReceiverName(initialDriver.name);

      if (initialDriver.nationalId) setDriverNationalId(initialDriver.nationalId);
      if ('nationalCode' in initialDriver && initialDriver.nationalCode) {
        setDriverNationalId(initialDriver.nationalCode);
      }
      if ('fatherName' in initialDriver && initialDriver.fatherName) {
        setDriverFatherName(initialDriver.fatherName);
      }

      if ('vehiclePlate' in initialDriver && initialDriver.vehiclePlate) {
        setVehiclePlate(initialDriver.vehiclePlate);
        const matchV = vehicles.find((v) => v.plateNumber === initialDriver.vehiclePlate);
        if (matchV) {
          setVehicleCode(String(matchV.code));
          setVehicleType(VEHICLE_TYPE_NAMES[matchV.vehicleType] || 'خاور کانتینردار');
          if (matchV.color) setVehicleColor(matchV.color);
        }
      }
    }
  }, [initialDriver, vehicles]);

  // Reset form to clear state
  const handleResetForm = () => {
    const nextReceiptNum = String(Math.floor(10000 + Math.random() * 89999));
    const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    setEditingRecordId(null);
    setReceiptNumber(nextReceiptNum);
    setHandoverDate(todayDateStr);
    setHandoverTime(nowTime);
    setAddress('پایانه مرکزی ناوگان صداقت بار پیشرو');

    setDriverName('');
    setDriverLastName('');
    setDriverFatherName('');
    setDriverNationalId('');

    setVehicleType('خاور کانتینردار');
    setVehicleCode('');
    setVehicleColor('سفید');
    setVehiclePlate('');

    const defaultCheck: Record<string, VehicleHandoverItemStatus> = {};
    HANDOVER_CHECKLIST_ITEMS.forEach((item) => {
      defaultCheck[item.id] = 'HEALTHY';
    });
    setChecklist(defaultCheck);

    setDamages([]);
    setAffidavitText(DEFAULT_HANDOVER_AFFIDAVIT);
    setDelivererName('مسئول اعزام و ترابری صداقت بار پیشرو');
    setReceiverName('');
    setNotes('');

    if (onShowToast) onShowToast('فرم تحویل جدید با شماره قبض جدید آماده شد.', 'info');
  };

  // Quick auto-fill from Driver
  const handleSelectDriverQuick = (dId: string) => {
    const driver = drivers.find((d) => d.id === dId) || driverDirectory.find((d) => d.id === dId);
    if (!driver) return;

    const parts = driver.name.trim().split(' ');
    if (parts.length > 1) {
      setDriverName(parts[0]);
      setDriverLastName(parts.slice(1).join(' '));
    } else {
      setDriverName(driver.name);
      setDriverLastName('');
    }

    if (driver.nationalId) setDriverNationalId(driver.nationalId);
    if ('nationalCode' in driver && driver.nationalCode) setDriverNationalId(driver.nationalCode);
    if ('fatherName' in driver && driver.fatherName) setDriverFatherName(driver.fatherName);

    if ('vehiclePlate' in driver && driver.vehiclePlate) {
      setVehiclePlate(driver.vehiclePlate);
      const matchVehicle = vehicles.find((v) => v.plateNumber === driver.vehiclePlate);
      if (matchVehicle) {
        setVehicleCode(String(matchVehicle.code));
        setVehicleType(VEHICLE_TYPE_NAMES[matchVehicle.vehicleType] || 'خاور کانتینردار');
        if (matchVehicle.color) setVehicleColor(matchVehicle.color);
      }
    }
    setReceiverName(driver.name);
    if (onShowToast) onShowToast(`اطلاعات راننده «${driver.name}» درج شد.`, 'info');
  };

  // Quick auto-fill from Vehicle
  const handleSelectVehicleQuick = (vId: string) => {
    const vehicle = vehicles.find((v) => v.id === vId);
    if (!vehicle) return;

    setVehiclePlate(vehicle.plateNumber);
    setVehicleCode(String(vehicle.code));
    setVehicleType(VEHICLE_TYPE_NAMES[vehicle.vehicleType] || 'خاور کانتینردار');
    if (vehicle.color) setVehicleColor(vehicle.color);

    if (vehicle.driverName && vehicle.driverName !== 'بدون راننده' && vehicle.driverName !== 'NONE') {
      const parts = vehicle.driverName.trim().split(' ');
      if (parts.length > 1) {
        setDriverName(parts[0]);
        setDriverLastName(parts.slice(1).join(' '));
      } else {
        setDriverName(vehicle.driverName);
        setDriverLastName('');
      }
      setReceiverName(vehicle.driverName);

      // Find driver info if available
      const found =
        drivers.find((d) => d.name.trim() === vehicle.driverName.trim()) ||
        driverDirectory.find((d) => d.name.trim() === vehicle.driverName.trim());
      if (found) {
        if (found.nationalId) setDriverNationalId(found.nationalId);
        if ('nationalCode' in found && found.nationalCode) setDriverNationalId(found.nationalCode);
        if ('fatherName' in found && found.fatherName) setDriverFatherName(found.fatherName);
      }
    }
    if (onShowToast) onShowToast(`اطلاعات خودروی کد ${toFaDigits(vehicle.code)} درج شد.`, 'info');
  };

  // Set single checklist item status
  const handleSetItemStatus = (itemId: string, status: VehicleHandoverItemStatus) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: status,
    }));
  };

  // Mark all 66 items healthy
  const handleMarkAllHealthy = () => {
    const allHealthy: Record<string, VehicleHandoverItemStatus> = {};
    HANDOVER_CHECKLIST_ITEMS.forEach((i) => {
      allHealthy[i.id] = 'HEALTHY';
    });
    setChecklist(allHealthy);
    if (onShowToast) onShowToast('تمام ۶۶ قلم چک‌لیست به عنوان «سالم» ثبت شدند.', 'success');
  };

  // Save Handover Record
  const handleSaveForm = (openPrintModalAfterSave: boolean = false) => {
    if (!driverName.trim()) {
      if (onShowToast) onShowToast('لطفاً نام راننده را وارد نمایید.', 'error');
      return;
    }
    if (!receiptNumber.trim()) {
      if (onShowToast) onShowToast('شماره قبض الزامی است.', 'error');
      return;
    }

    const recToSave: VehicleHandoverRecord = {
      id: editingRecordId || `handover-${Date.now()}`,
      receiptNumber: receiptNumber.trim(),
      date: handoverDate,
      time: handoverTime,
      address: address.trim(),
      driverName: driverName.trim(),
      driverLastName: driverLastName.trim(),
      driverFatherName: driverFatherName.trim(),
      driverNationalId: driverNationalId.trim(),
      vehicleType: vehicleType.trim(),
      vehicleCode: vehicleCode.trim(),
      vehicleColor: vehicleColor.trim(),
      vehiclePlate: vehiclePlate.trim(),
      checklist,
      damages,
      affidavitText,
      delivererName: delivererName.trim() || 'مسئول تحویل',
      receiverName: receiverName.trim() || `${driverName.trim()} ${driverLastName.trim()}`,
      notes: notes.trim(),
      createdAt: handoverDate,
    };

    if (editingRecordId) {
      const updatedList = records.map((r) => (r.id === editingRecordId ? recToSave : r));
      saveRecords(updatedList);
      if (onShowToast) onShowToast('صورت‌جلسه تحویل با موفقیت به‌روزرسانی شد.', 'success');
    } else {
      const updatedList = [recToSave, ...records];
      saveRecords(updatedList);
      if (onShowToast) onShowToast(`صورت‌جلسه قبض ${toFaDigits(recToSave.receiptNumber)} با موفقیت ثبت شد.`, 'success');
    }

    setSelectedRecordIdForView(recToSave.id);

    if (openPrintModalAfterSave) {
      setActivePrintRecord(recToSave);
    }
  };

  // Load record into Form for editing
  const handleLoadRecordToForm = (rec: VehicleHandoverRecord) => {
    setEditingRecordId(rec.id);
    setReceiptNumber(rec.receiptNumber);
    setHandoverDate(rec.date);
    setHandoverTime(rec.time);
    setAddress(rec.address);

    setDriverName(rec.driverName);
    setDriverLastName(rec.driverLastName);
    setDriverFatherName(rec.driverFatherName || '');
    setDriverNationalId(rec.driverNationalId || '');

    setVehicleType(rec.vehicleType);
    setVehicleCode(rec.vehicleCode);
    setVehicleColor(rec.vehicleColor);
    setVehiclePlate(rec.vehiclePlate);

    setChecklist(rec.checklist || {});
    setDamages(rec.damages || []);
    setAffidavitText(rec.affidavitText || DEFAULT_HANDOVER_AFFIDAVIT);
    setDelivererName(rec.delivererName);
    setReceiverName(rec.receiverName);
    setNotes(rec.notes || '');

    setHandoverViewMode('FORM');
    if (onShowToast) onShowToast(`صورت‌جلسه قبض ${toFaDigits(rec.receiptNumber)} جهت ویرایش بارگذاری شد.`, 'info');
  };

  // Delete Record
  const handleDeleteRecord = (id: string, num: string) => {
    if (window.confirm(`آیا از حذف صورت‌جلسه قبض شماره ${toFaDigits(num)} اطمینان دارید؟`)) {
      const remaining = records.filter((r) => r.id !== id);
      saveRecords(remaining);
      if (selectedRecordIdForView === id && remaining.length > 0) {
        setSelectedRecordIdForView(remaining[0].id);
      }
      if (onShowToast) onShowToast(`صورت‌جلسه قبض ${toFaDigits(num)} حذف گردید.`, 'info');
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const damagedVehiclesCount = records.filter((r) => r.damages && r.damages.length > 0).length;
    const cleanVehiclesCount = total - damagedVehiclesCount;
    return { total, damagedVehiclesCount, cleanVehiclesCount };
  }, [records]);

  // Form Checklist Counts
  const formChecklistCounts = useMemo(() => {
    let healthy = 0;
    let damaged = 0;
    let none = 0;
    Object.values(checklist).forEach((st) => {
      if (st === 'HEALTHY') healthy++;
      else if (st === 'DAMAGED') damaged++;
      else if (st === 'NONE') none++;
    });
    return { healthy, damaged, none };
  }, [checklist]);

  // Filtered Archive Records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      const fullDriver = `${r.driverName} ${r.driverLastName}`.toLowerCase();
      const matchSearch =
        !q ||
        fullDriver.includes(q) ||
        r.receiptNumber.includes(q) ||
        toFaDigits(r.receiptNumber).includes(q) ||
        r.vehiclePlate.toLowerCase().includes(q) ||
        r.vehicleCode.includes(q) ||
        (r.driverNationalId && r.driverNationalId.includes(q));

      if (!matchSearch) return false;

      if (filterDamageStatus === 'DAMAGED') {
        return r.damages && r.damages.length > 0;
      }
      if (filterDamageStatus === 'CLEAN') {
        return !r.damages || r.damages.length === 0;
      }
      return true;
    });
  }, [records, searchQuery, filterDamageStatus]);

  const viewingRecord = useMemo(() => {
    return records.find((r) => r.id === selectedRecordIdForView) || records[0];
  }, [records, selectedRecordIdForView]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Header & Quick Overview */}
      <div className="bg-[#101b33] border border-[#1f2c45] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
              <FileCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-white text-base sm:text-lg">
                  فرم رسمی تحویل و تحول کامیونت به رانندگان
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  چک‌لیست ۶۶ گانه + نقشه ۴ وجه بدنه
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                ثبت دقیق مشخصات خودرو و راننده، بازرسی سلامت قطعات، نشانه‌گذاری تعاملی آسیب‌های بدنه و صدور نسخه رسمی چاپی A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {handoverViewMode !== 'FORM' && (
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setHandoverViewMode('FORM');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ صدور برگه تحویل جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1b2b48]">
          <div className="bg-[#0a101f] border border-[#1b2b48] rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">کل صورت‌جلسات ثبت شده:</span>
            <span className="font-mono font-black text-white text-sm">
              {toFaDigits(stats.total)} فقره
            </span>
          </div>

          <div className="bg-[#0a101f] border border-[#1b2b48] rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">خودروهای کاملاً سالم (بدون عارضه):</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {toFaDigits(stats.cleanVehiclesCount)} دستگاه
            </span>
          </div>

          <div className="bg-[#0a101f] border border-[#1b2b48] rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">خودروهای دارای آسیب ثبت‌شده:</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {toFaDigits(stats.damagedVehiclesCount)} دستگاه
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="bg-[#0f1a30] border border-[#1f2c45] rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2 no-print shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setHandoverViewMode('FORM')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              handoverViewMode === 'FORM'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Edit2 className="w-4 h-4 text-emerald-300" />
            <span>فرم ثبت و صدور تحویل خودرو</span>
            {editingRecordId && (
              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[10px] font-bold">
                در حال ویرایش
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setHandoverViewMode('SHEET_VIEW')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              handoverViewMode === 'SHEET_VIEW'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4 text-cyan-300" />
            <span>مشاهده مستقیم و چاپ برگه رسمی (A4)</span>
          </button>

          <button
            type="button"
            onClick={() => setHandoverViewMode('ARCHIVE_LIST')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              handoverViewMode === 'ARCHIVE_LIST'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>آرشیو صورت‌جلسات تحویل</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-300 text-[10px] font-mono">
              {toFaDigits(records.length)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActivePrintIsBlank(true);
              setActivePrintRecord(viewingRecord || records[0]);
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="چاپ فرم سفید و خام بدون علامت جهت بازرسی میدانی و تکمیل دستی با خودکار"
          >
            <Square className="w-3.5 h-3.5" />
            <span>چاپ فرم خام (سفید)</span>
          </button>

          {handoverViewMode === 'FORM' && (
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>پاکسازی فرم و برگه جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: INTERACTIVE DIRECT HANDOVER FORM                                */}
      {/* ========================================================================= */}
      {handoverViewMode === 'FORM' && (
        <div className="space-y-4">
          {/* Quick Auto-Fill Bar */}
          <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/30 rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-xs sm:text-sm">تکمیل هوشمند و سریع مشخصات:</span>
                <p className="text-[11px] text-slate-400">خودرو یا راننده موردنظر را انتخاب کنید تا کلیه فیلدها خودکار تکمیل شوند</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Select Vehicle */}
              {vehicles.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[#090f1e] border border-blue-500/40 rounded-xl px-2.5 py-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <select
                    onChange={(e) => handleSelectVehicleQuick(e.target.value)}
                    defaultValue=""
                    className="bg-transparent text-blue-200 text-xs focus:outline-none cursor-pointer max-w-[200px]"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      انتخاب خودرو از ناوگان...
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                        کد {toFaDigits(v.code)} - پلاک {v.plateNumber} ({VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Select Driver */}
              {(drivers.length > 0 || driverDirectory.length > 0) && (
                <div className="flex items-center gap-1.5 bg-[#090f1e] border border-emerald-500/40 rounded-xl px-2.5 py-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <select
                    onChange={(e) => handleSelectDriverQuick(e.target.value)}
                    defaultValue=""
                    className="bg-transparent text-emerald-200 text-xs focus:outline-none cursor-pointer max-w-[190px]"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      انتخاب راننده از پرونده‌ها...
                    </option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                        {d.name} {d.personnelCode ? `(کد: ${toFaDigits(d.personnelCode)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-[#0b1324] border border-[#1b2b48] rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
            {/* Box 1: Document Metadata & Identity Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">مشخصات صورت‌جلسه، راننده و کامیونت</h3>
                </div>
                {editingRecordId && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    شناسه ثبت: {editingRecordId}
                  </span>
                )}
              </div>

              {/* Top Row: Receipt, Date, Time, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    شماره قبض رسمی <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="مثال: 10482"
                    className="w-full bg-[#080d19] border border-[#1e3052] rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">تاریخ تحویل:</label>
                  <input
                    type="text"
                    value={handoverDate}
                    onChange={(e) => setHandoverDate(e.target.value)}
                    placeholder="۱۴۰۳/۰۸/۰۵"
                    className="w-full bg-[#080d19] border border-[#1e3052] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">ساعت تحویل:</label>
                  <input
                    type="text"
                    value={handoverTime}
                    onChange={(e) => setHandoverTime(e.target.value)}
                    placeholder="۰۸:۳۰"
                    className="w-full bg-[#080d19] border border-[#1e3052] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">محل و پایانه تحویل:</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="پایانه مرکزی ناوگان حامی..."
                    className="w-full bg-[#080d19] border border-[#1e3052] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Driver Details Row */}
              <div className="bg-[#0f192e] border border-[#1a2b4b] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <User className="w-3.5 h-3.5" />
                  <span>مشخصات فردی راننده (تحویل‌گیرنده)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">نام *:</label>
                    <input
                      type="text"
                      required
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="مثال: رحیم"
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">نام خانوادگی:</label>
                    <input
                      type="text"
                      value={driverLastName}
                      onChange={(e) => setDriverLastName(e.target.value)}
                      placeholder="مثال: بدرلو"
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">نام پدر:</label>
                    <input
                      type="text"
                      value={driverFatherName}
                      onChange={(e) => setDriverFatherName(e.target.value)}
                      placeholder="مثال: علی"
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">شماره ملی (۱۰ رقمی):</label>
                    <input
                      type="text"
                      value={driverNationalId}
                      onChange={(e) => setDriverNationalId(e.target.value)}
                      placeholder="۰۰۷۲۱۴۵۸۹۲"
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Details Row */}
              <div className="bg-[#0f192e] border border-[#1a2b4b] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                  <Truck className="w-3.5 h-3.5" />
                  <span>مشخصات کامیونت واگذار شده</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">نوع وسیله:</label>
                    <input
                      type="text"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      placeholder="خاور ۸۱۳، ایسوزو ۶ تن..."
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">کد ناوگان خودرو:</label>
                    <input
                      type="text"
                      value={vehicleCode}
                      onChange={(e) => setVehicleCode(e.target.value)}
                      placeholder="مثال: 1"
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">رنگ بدنه:</label>
                    <input
                      type="text"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="سفید، زرد، آبی..."
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">پلاک انتظامی ایران:</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="۶۶-۵۳۳ع۲۵"
                      className="w-full bg-[#070c17] border border-[#21355c] rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {vehiclePlate && (
                  <div className="flex justify-start pt-1">
                    <IranianPlate plateNumber={vehiclePlate} scale={0.8} />
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: 66-Item Checklist */}
            <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>چک‌لیست رسمی ۶۶ گانه سلامت قطعات و تجهیزات:</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      سالم: {toFaDigits(formChecklistCounts.healthy)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      خسارتی: {toFaDigits(formChecklistCounts.damaged)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      ندارد: {toFaDigits(formChecklistCounts.none)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMarkAllHealthy}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>علامت‌گذاری تمام ۶۶ قلم به عنوان «سالم»</span>
                </button>
              </div>

              {/* 3 Columns Grid for 66 Items */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {[1, 2, 3].map((colNum) => {
                  const colItems = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === colNum);
                  const colTitle =
                    colNum === 1
                      ? 'ستون اول: موتور، ترمز و فنی'
                      : colNum === 2
                      ? 'ستون دوم: بدنه، کابین و چراغ‌ها'
                      : 'ستون سوم: اسناد، تجهیزات و متعلقات';

                  return (
                    <div
                      key={colNum}
                      className="border border-[#1b2b48] rounded-xl overflow-hidden bg-[#090f1d] flex flex-col"
                    >
                      <div className="bg-[#070b16] px-3 py-2 font-bold text-slate-200 text-xs border-b border-[#1b2b48] flex items-center justify-between">
                        <span>{colTitle}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {toFaDigits(colItems.length)} قلم
                        </span>
                      </div>

                      <div className="divide-y divide-[#15233c] max-h-[460px] overflow-y-auto custom-scrollbar">
                        {colItems.map((item) => {
                          const currentStatus = checklist[item.id] || 'HEALTHY';
                          return (
                            <div
                              key={item.id}
                              className={`px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                                currentStatus === 'DAMAGED'
                                  ? 'bg-rose-950/25 border-r-2 border-rose-500'
                                  : currentStatus === 'NONE'
                                  ? 'bg-slate-900/40 text-slate-500'
                                  : 'hover:bg-[#0d1627]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] text-slate-500 shrink-0">
                                  {toFaDigits(item.id.replace(/^item_/, ''))}.
                                </span>
                                <span
                                  className={`text-xs truncate font-medium ${
                                    currentStatus === 'DAMAGED'
                                      ? 'text-rose-300 font-bold'
                                      : 'text-slate-200'
                                  }`}
                                  title={item.label}
                                >
                                  {item.label}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSetItemStatus(item.id, 'HEALTHY')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    currentStatus === 'HEALTHY'
                                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                                      : 'bg-[#060a14] text-slate-400 border-[#1a2845] hover:text-white'
                                  }`}
                                >
                                  سالم
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetItemStatus(item.id, 'DAMAGED')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    currentStatus === 'DAMAGED'
                                      ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                                      : 'bg-[#060a14] text-slate-400 border-[#1a2845] hover:text-white'
                                  }`}
                                >
                                  نقص
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetItemStatus(item.id, 'NONE')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    currentStatus === 'NONE'
                                      ? 'bg-slate-700 text-white border-slate-600'
                                      : 'bg-[#060a14] text-slate-500 border-[#1a2845] hover:text-white'
                                  }`}
                                >
                                  ندارد
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Box 3: 4-View Interactive Truck Body Schematic */}
            <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white text-sm">
                    دیاگرام تعاملی ۴ وجه بدنه کامیونت (جلو، عقب، راست، چپ)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  جهت ثبت دقیق آسیب، روی بدنه خودرو در هر وجه کلیک کنید
                </span>
              </div>

              <Truck4ViewBodyInspector
                damages={damages}
                onChangeDamages={setDamages}
                readOnly={false}
              />
            </div>

            {/* Box 4: Official Undertaking & Signatures */}
            <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="font-bold text-amber-300 text-xs border-b border-slate-800 pb-2">
                متن تعهدنامه رسمی و امضای طرفین تحویل خودرو
              </div>

              <div>
                <textarea
                  rows={3}
                  value={affidavitText}
                  onChange={(e) => setAffidavitText(e.target.value)}
                  className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-3 text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    نام نماینده تحویل‌دهنده (شرکت):
                  </label>
                  <input
                    type="text"
                    value={delivererName}
                    onChange={(e) => setDelivererName(e.target.value)}
                    placeholder="مسئول اعزام و ترابری حامی"
                    className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    نام تحویل‌گیرنده (راننده):
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder={driverName ? `${driverName} ${driverLastName}` : 'نام راننده...'}
                    className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">
                  ملاحظات و توضیحات تکمیلی تحویل:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="هرگونه شرط خاص، کسری مدارک یا هماهنگی ویژه..."
                  className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Bottom Form Actions Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#1a2b4b]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  پاکسازی و فرم جدید
                </button>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSaveForm(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
                >
                  ذخیره در آرشیو
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveForm(true)}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>ثبت صورت‌جلسه و چاپ رسمی A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 2: DIRECT OFFICIAL A4 SHEET PREVIEW & PRINT                        */}
      {/* ========================================================================= */}
      {handoverViewMode === 'SHEET_VIEW' && (
        <div className="space-y-3">
          {/* Record Selector & Actions */}
          <div className="bg-[#0f192e] border border-[#22365e] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">انتخاب برگه جهت مشاهده:</span>
              <select
                value={selectedRecordIdForView}
                onChange={(e) => setSelectedRecordIdForView(e.target.value)}
                className="bg-[#09101f] border border-[#233862] text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500 max-w-[280px]"
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    قبض {toFaDigits(r.receiptNumber)} - {r.driverName} {r.driverLastName} ({r.vehiclePlate || r.vehicleType})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {viewingRecord && (
                <>
                  <button
                    type="button"
                    onClick={() => handleLoadRecordToForm(viewingRecord)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>ویرایش در فرم</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportHandoverToWord(viewingRecord, false);
                      if (onShowToast) onShowToast('فایل Word صورت‌جلسه دانلود شد.', 'success');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="دانلود فایل Word قابل ویرایش (.doc)"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>خروجی Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportHandoverToExcel(viewingRecord, false);
                      if (onShowToast) onShowToast('فایل اکسل صورت‌جلسه دانلود شد.', 'success');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="دانلود فایل اکسل رسمی (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>خروجی اکسل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePrintIsBlank(true);
                      setActivePrintRecord(viewingRecord);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>چاپ فرم خام (سفید)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePrintIsBlank(false);
                      setActivePrintRecord(viewingRecord);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black shadow-md flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ رسمی این برگه A4</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Paper View */}
          {viewingRecord ? (
            <div className="bg-slate-900/60 p-2 sm:p-6 rounded-2xl border border-slate-800 flex justify-center overflow-x-auto">
              <div
                dir="rtl"
                className="bg-white text-slate-900 p-6 rounded-sm shadow-2xl w-full max-w-[210mm] min-h-[297mm] mx-auto text-[11px] font-sans leading-tight border border-slate-300"
                style={{ boxSizing: 'border-box' }}
              >
                {/* Header */}
                <div className="border border-slate-900 rounded-lg p-3 mb-2 flex items-center justify-between">
                  <div className="w-1/3 flex flex-col items-start justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-base">
                        ص
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm tracking-tight">
                          ترابری و لجستیک صداقت بار پیشرو
                        </div>
                        <div className="text-[9px] text-slate-600 font-mono">
                          تلفن تماس: ۱۷۸۶
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-1/3 text-center border-x border-slate-300 px-2">
                    <div className="inline-block px-4 py-1 border border-slate-900 rounded font-black text-base text-slate-950 mb-1 bg-slate-50">
                      صورت‌جلسه تحویل خودرو
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold flex items-center justify-center gap-3">
                      <span>
                        تاریخ: <strong className="font-mono">{toFaDigits(viewingRecord.date)}</strong>
                      </span>
                      <span>
                        ساعت: <strong className="font-mono">{toFaDigits(viewingRecord.time)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="w-1/3 text-left space-y-1 font-mono text-[10.5px]">
                    <div className="text-right">
                      <span className="font-bold text-slate-800">شماره قبض: </span>
                      <span className="font-black text-slate-950 text-xs">{toFaDigits(viewingRecord.receiptNumber)}</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-600 truncate">
                      <span className="font-bold">آدرس: </span>
                      <span>{viewingRecord.address || 'پایانه مرکزی ناوگان صداقت بار پیشرو'}</span>
                    </div>
                  </div>
                </div>

                {/* Driver & Vehicle Box */}
                <div className="border border-slate-900 rounded-lg p-2.5 mb-2 relative">
                  <div className="grid grid-cols-4 gap-2 text-slate-900 text-[11px] mb-2 pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-slate-600 font-medium">نام راننده: </span>
                      <strong className="font-bold text-slate-950">{viewingRecord.driverName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">نام خانوادگی: </span>
                      <strong className="font-bold text-slate-950">{viewingRecord.driverLastName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">نام پدر: </span>
                      <strong className="font-bold text-slate-950">{viewingRecord.driverFatherName || '---'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">کد ملی: </span>
                      <strong className="font-mono font-bold text-slate-950">
                        {toFaDigits(viewingRecord.driverNationalId) || '---'}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-slate-900 text-[11px] items-center">
                    <div>
                      <span className="text-slate-600 font-medium">نوع خودرو: </span>
                      <strong className="font-bold text-slate-950">{viewingRecord.vehicleType}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">کد ناوگان: </span>
                      <strong className="font-mono font-bold text-slate-950">
                        {toFaDigits(viewingRecord.vehicleCode) || '---'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">رنگ بدنه: </span>
                      <strong className="font-bold text-slate-950">{viewingRecord.vehicleColor || 'سفید'}</strong>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600 font-medium">پلاک: </span>
                      {viewingRecord.vehiclePlate ? (
                        <div className="scale-75 origin-left inline-block">
                          <IranianPlate plateNumber={viewingRecord.vehiclePlate} size="sm" />
                        </div>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 66 Checklist Items Table */}
                <div className="border border-slate-900 rounded-lg p-2 mb-2">
                  <div className="bg-slate-100 border border-slate-300 rounded px-2 py-1 text-center font-bold text-[11.5px] text-slate-900 mb-2">
                    چک‌لیست سلامت قطعات، تجهیزات، ادوات فنی و اسناد خودرو (۶۶ قلم استاندارد)
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((colNum) => {
                      const colItems = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === colNum);
                      return (
                        <div key={colNum} className="border border-slate-300 rounded overflow-hidden">
                          <table className="w-full border-collapse text-[9.5px]">
                            <thead>
                              <tr className="bg-slate-200 border-b border-slate-300 text-slate-800">
                                <th className="py-1 px-1 text-right font-bold">شرح قطعه</th>
                                <th className="py-1 px-0.5 text-center font-bold w-7">سالم</th>
                                <th className="py-1 px-0.5 text-center font-bold w-7">نقص</th>
                                <th className="py-1 px-0.5 text-center font-bold w-7">ندارد</th>
                              </tr>
                            </thead>
                            <tbody>
                              {colItems.map((item, idx) => {
                                const st = viewingRecord.checklist?.[item.id] || 'HEALTHY';
                                return (
                                  <tr
                                    key={item.id}
                                    className={`border-b border-slate-200 ${
                                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                    }`}
                                  >
                                    <td className="py-0.5 px-1 truncate max-w-[125px] text-slate-900 font-medium">
                                      <span className="font-mono text-slate-500 ml-1 text-[9px]">
                                        {toFaDigits(item.id.replace(/^item_/, ''))}.
                                      </span>
                                      {item.label}
                                    </td>
                                    <td className="py-0.5 text-center">
                                      {st === 'HEALTHY' && (
                                        <span className="font-bold text-emerald-700">✓</span>
                                      )}
                                    </td>
                                    <td className="py-0.5 text-center">
                                      {st === 'DAMAGED' && (
                                        <span className="font-bold text-rose-700">✗</span>
                                      )}
                                    </td>
                                    <td className="py-0.5 text-center">
                                      {st === 'NONE' && (
                                        <span className="text-slate-400 font-bold">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4-View Body Damage Schematic */}
                <div className="mb-2">
                  <Truck4ViewPrintableSchematic
                    damages={viewingRecord.damages}
                    isBlankForm={false}
                  />
                </div>

                {/* Affidavit Text */}
                <div className="border border-slate-900 rounded-lg p-2.5 mb-2 bg-slate-50">
                  <div className="font-bold text-slate-950 text-[10.5px] mb-1">
                    تعهدنامه و اقرارنامه رسمی راننده:
                  </div>
                  <p className="text-slate-800 text-[9.5px] leading-relaxed text-justify">
                    {viewingRecord.affidavitText || DEFAULT_HANDOVER_AFFIDAVIT}
                  </p>
                </div>

                {/* Signatures */}
                <div className="border border-slate-900 rounded-lg p-3 grid grid-cols-2 gap-6 text-[10.5px]">
                  <div className="text-center border-l border-slate-300 pl-4 space-y-8">
                    <div className="font-bold text-slate-900">
                      نماینده تحویل‌دهنده (شرکت ترابری و لجستیک صداقت بار پیشرو):
                    </div>
                    <div className="text-slate-700 font-semibold">{viewingRecord.delivererName}</div>
                    <div className="text-[9.5px] text-slate-500">امضا و اثر انگشت:</div>
                  </div>

                  <div className="text-center pr-4 space-y-8">
                    <div className="font-bold text-slate-900">تحویل‌گیرنده (راننده خودرو):</div>
                    <div className="text-slate-700 font-semibold">{viewingRecord.receiverName}</div>
                    <div className="text-[9.5px] text-slate-500">امضا و اثر انگشت:</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              صورت‌جلسه‌ای جهت نمایش یافت نشد.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 3: ARCHIVE LIST                                                    */}
      {/* ========================================================================= */}
      {handoverViewMode === 'ARCHIVE_LIST' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-[#101b33] border border-[#1f2c45] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو با نام راننده، شماره قبض، پلاک خودرو یا کدملی..."
                  className="w-full bg-[#0a101f] border border-[#1b2b48] rounded-lg pr-9 pl-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterDamageStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterDamageStatus === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#0a101f] text-slate-400 hover:text-white'
                }`}
              >
                همه ({toFaDigits(records.length)})
              </button>

              <button
                type="button"
                onClick={() => setFilterDamageStatus('CLEAN')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterDamageStatus === 'CLEAN'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0a101f] text-slate-400 hover:text-white'
                }`}
              >
                بدون آسیب ({toFaDigits(stats.cleanVehiclesCount)})
              </button>

              <button
                type="button"
                onClick={() => setFilterDamageStatus('DAMAGED')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterDamageStatus === 'DAMAGED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#0a101f] text-slate-400 hover:text-white'
                }`}
              >
                دارای خسارت ({toFaDigits(stats.damagedVehiclesCount)})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0b1324] border border-[#1b2b48] rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#0e172a] border-b border-[#1b2b48] text-slate-300 font-bold">
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-3 text-center">شماره قبض</th>
                    <th className="py-3 px-3">تاریخ و ساعت</th>
                    <th className="py-3 px-3">نام راننده</th>
                    <th className="py-3 px-3 text-center">پلاک و خودرو</th>
                    <th className="py-3 px-3 text-center">وضعیت ۶۶ قلم</th>
                    <th className="py-3 px-3 text-center">آسیب‌های بدنه</th>
                    <th className="py-3 px-3 text-center w-52">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#15233c] text-slate-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        موردی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec, idx) => {
                      const damagedCount = rec.damages?.length || 0;
                      return (
                        <tr key={rec.id} className="hover:bg-[#121e36] transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {toFaDigits(idx + 1)}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                            {toFaDigits(rec.receiptNumber)}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-mono text-white text-xs">{toFaDigits(rec.date)}</div>
                            <div className="text-[10px] text-slate-500">{toFaDigits(rec.time)}</div>
                          </td>

                          <td className="py-3 px-3 font-bold text-white">
                            {rec.driverName} {rec.driverLastName}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {rec.vehiclePlate ? (
                                <IranianPlate plateNumber={rec.vehiclePlate} scale={0.7} />
                              ) : (
                                <span className="font-bold text-slate-300">{rec.vehicleType}</span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                کد {toFaDigits(rec.vehicleCode)} - {rec.vehicleType}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>بازرسی کامل</span>
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            {damagedCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{toFaDigits(damagedCount)} آسیب</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span>کاملاً سالم</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecordIdForView(rec.id);
                                  setHandoverViewMode('SHEET_VIEW');
                                }}
                                className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="مشاهده برگه رسمی A4"
                              >
                                <Eye className="w-3 h-3" />
                                <span>برگه A4</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActivePrintIsBlank(false);
                                  setActivePrintRecord(rec);
                                }}
                                className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                                title="چاپ برگه تکمیل‌شده"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActivePrintIsBlank(true);
                                  setActivePrintRecord(rec);
                                }}
                                className="p-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/40 transition cursor-pointer"
                                title="چاپ فرم سفید (خام)"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLoadRecordToForm(rec)}
                                className="p-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition cursor-pointer"
                                title="ویرایش در فرم"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(rec.id, rec.receiptNumber)}
                                className="p-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                                title="حذف صورت‌جلسه"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* 6. A4 Printable Modal */}
      {activePrintRecord && (
        <VehicleHandoverA4PrintModal
          record={activePrintRecord}
          defaultBlank={activePrintIsBlank}
          onClose={() => {
            setActivePrintRecord(null);
            setActivePrintIsBlank(false);
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
