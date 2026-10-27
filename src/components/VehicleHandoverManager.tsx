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
} from 'lucide-react';
import {
  VehicleHandoverRecord,
  HANDOVER_CHECKLIST_ITEMS,
  VehicleHandoverItemStatus,
  BodyDamageMarker,
  DEFAULT_HANDOVER_AFFIDAVIT,
} from '../types/vehicleHandover';
import { Truck4ViewBodyInspector } from './Truck4ViewBodyInspector';
import { VehicleHandoverA4PrintModal } from './VehicleHandoverA4PrintModal';
import { IranianPlate } from './IranianPlate';
import { VehicleItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import { Driver } from '../types';
import { toFaDigits, getTodayJalaali, formatPersianDateKey } from '../utils/jalaali';

interface VehicleHandoverManagerProps {
  vehicles?: VehicleItem[];
  drivers?: Driver[];
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSyncCentralDb?: () => void;
}

const STORAGE_KEY_HANDOVER = 'hamibar_vehicle_handover_records_v1';

export const VehicleHandoverManager: FC<VehicleHandoverManagerProps> = ({
  vehicles = [],
  drivers = [],
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
        return JSON.parse(saved);
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
        address: 'پایانه مرکزی ناوگان ترابری حامی',
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
        delivererName: 'مسئول تحویل و ترابری حامی',
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

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Active modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [activePrintRecord, setActivePrintRecord] = useState<VehicleHandoverRecord | null>(null);

  // Form Fields
  const [receiptNumber, setReceiptNumber] = useState('');
  const [handoverDate, setHandoverDate] = useState(todayDateStr);
  const [handoverTime, setHandoverTime] = useState('۰۸:۰۰');
  const [address, setAddress] = useState('پایانه مرکزی ناوگان حامی');

  const [driverName, setDriverName] = useState('');
  const [driverLastName, setDriverLastName] = useState('');
  const [driverFatherName, setDriverFatherName] = useState('');
  const [driverNationalId, setDriverNationalId] = useState('');

  const [vehicleType, setVehicleType] = useState('خاور کانتینردار');
  const [vehicleCode, setVehicleCode] = useState('');
  const [vehicleColor, setVehicleColor] = useState('سفید');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const [checklist, setChecklist] = useState<Record<string, VehicleHandoverItemStatus>>({});
  const [damages, setDamages] = useState<BodyDamageMarker[]>([]);
  const [affidavitText, setAffidavitText] = useState(DEFAULT_HANDOVER_AFFIDAVIT);
  const [delivererName, setDelivererName] = useState('مسئول ناوگان حامی');
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');

  // Open Form to Create New Record
  const handleOpenCreateNew = () => {
    const nextReceiptNum = String(Math.floor(10000 + Math.random() * 89999));
    const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    setEditingRecordId(null);
    setReceiptNumber(nextReceiptNum);
    setHandoverDate(todayDateStr);
    setHandoverTime(nowTime);
    setAddress('پایانه مرکزی ناوگان حامی');

    setDriverName('');
    setDriverLastName('');
    setDriverFatherName('');
    setDriverNationalId('');

    setVehicleType('خاور کانتینردار');
    setVehicleCode('');
    setVehicleColor('سفید');
    setVehiclePlate('');

    // Default all items to HEALTHY
    const defaultCheck: Record<string, VehicleHandoverItemStatus> = {};
    HANDOVER_CHECKLIST_ITEMS.forEach((item) => {
      defaultCheck[item.id] = 'HEALTHY';
    });
    setChecklist(defaultCheck);

    setDamages([]);
    setAffidavitText(DEFAULT_HANDOVER_AFFIDAVIT);
    setDelivererName('مسئول ناوگان حامی');
    setReceiverName('');
    setNotes('');

    setIsFormModalOpen(true);
  };

  // Open Form to Edit Existing Record
  const handleOpenEdit = (rec: VehicleHandoverRecord) => {
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

    setIsFormModalOpen(true);
  };

  // Auto-fill from Driver selection
  const handleSelectDriverQuick = (dId: string) => {
    const driver = drivers.find((d) => d.id === dId);
    if (!driver) return;

    // Split name into first and last if possible
    const parts = driver.name.trim().split(' ');
    if (parts.length > 1) {
      setDriverName(parts[0]);
      setDriverLastName(parts.slice(1).join(' '));
    } else {
      setDriverName(driver.name);
      setDriverLastName('');
    }

    if (driver.nationalId) setDriverNationalId(driver.nationalId);
    if (driver.vehiclePlate) {
      setVehiclePlate(driver.vehiclePlate);
      // Find matching vehicle
      const matchVehicle = vehicles.find((v) => v.plateNumber === driver.vehiclePlate);
      if (matchVehicle) {
        setVehicleCode(String(matchVehicle.code));
        setVehicleType(VEHICLE_TYPE_NAMES[matchVehicle.vehicleType] || 'خاور کانتینردار');
        if (matchVehicle.color) setVehicleColor(matchVehicle.color);
      }
    }
    setReceiverName(driver.name);
  };

  // Auto-fill from Vehicle selection
  const handleSelectVehicleQuick = (vId: string) => {
    const vehicle = vehicles.find((v) => v.id === vId);
    if (!vehicle) return;

    setVehiclePlate(vehicle.plateNumber);
    setVehicleCode(String(vehicle.code));
    setVehicleType(VEHICLE_TYPE_NAMES[vehicle.vehicleType] || 'خاور کانتینردار');
    if (vehicle.color) setVehicleColor(vehicle.color);

    if (vehicle.driverName && vehicle.driverName !== 'بدون راننده') {
      const parts = vehicle.driverName.trim().split(' ');
      if (parts.length > 1) {
        setDriverName(parts[0]);
        setDriverLastName(parts.slice(1).join(' '));
      } else {
        setDriverName(vehicle.driverName);
        setDriverLastName('');
      }
      setReceiverName(vehicle.driverName);
    }
  };

  // Toggle single item status
  const handleSetItemStatus = (itemId: string, status: VehicleHandoverItemStatus) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: status,
    }));
  };

  // Mark all 66 items healthy in one click
  const handleMarkAllHealthy = () => {
    const allHealthy: Record<string, VehicleHandoverItemStatus> = {};
    HANDOVER_CHECKLIST_ITEMS.forEach((i) => {
      allHealthy[i.id] = 'HEALTHY';
    });
    setChecklist(allHealthy);
    if (onShowToast) onShowToast('تمام ۶۶ قلم به عنوان «سالم» ثبت شدند.', 'info');
  };

  // Save Handover Record
  const handleSaveRecord = (e: FormEvent) => {
    e.preventDefault();

    if (!driverName.trim()) {
      if (onShowToast) onShowToast('لطفاً نام راننده را وارد نمایید.', 'error');
      return;
    }
    if (!receiptNumber.trim()) {
      if (onShowToast) onShowToast('شماره قبض الزامی است.', 'error');
      return;
    }

    const newRecord: VehicleHandoverRecord = {
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
      saveRecords(records.map((r) => (r.id === editingRecordId ? newRecord : r)));
      if (onShowToast) onShowToast('صورت‌جلسه تحویل با موفقیت ویرایش شد.', 'success');
    } else {
      saveRecords([newRecord, ...records]);
      if (onShowToast) onShowToast(`صورت‌جلسه قبض ${toFaDigits(newRecord.receiptNumber)} ثبت گردید.`, 'success');
    }

    setIsFormModalOpen(false);
  };

  // Delete Record
  const handleDeleteRecord = (id: string, num: string) => {
    if (window.confirm(`آیا از حذف صورت‌جلسه قبض شماره ${toFaDigits(num)} اطمینان دارید؟`)) {
      saveRecords(records.filter((r) => r.id !== id));
      if (onShowToast) onShowToast(`صورت‌جلسه قبض ${toFaDigits(num)} حذف شد.`, 'info');
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const fullDriver = `${r.driverName} ${r.driverLastName}`.toLowerCase();
      return (
        fullDriver.includes(q) ||
        r.receiptNumber.includes(q) ||
        toFaDigits(r.receiptNumber).includes(q) ||
        r.vehiclePlate.toLowerCase().includes(q) ||
        r.vehicleCode.includes(q) ||
        r.driverNationalId.includes(q)
      );
    });
  }, [records, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const damagedVehiclesCount = records.filter((r) => r.damages && r.damages.length > 0).length;
    const cleanVehiclesCount = total - damagedVehiclesCount;
    return { total, damagedVehiclesCount, cleanVehiclesCount };
  }, [records]);

  // Checklist counts for active form
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

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Header & KPI Banners */}
      <div className="bg-[#101b33] border border-[#1f2c45] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base sm:text-lg">
                  سامانه رسمی تحویل و تحول خودرو (چک‌لیست ۶۶ گانه و وضعیت بدنه)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  منطبق بر استاندارد حامی
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ثبت دقیق سلامت قطعات، نشانه‌گذاری تعاملی آسیب‌های بدنه در ۴ وجه کامیونت و صدور برگه A4
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateNew}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ صدور صورت‌جلسه جدید</span>
          </button>
        </div>

        {/* 3 Metric Mini KPI Strip */}
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
            <span className="text-xs text-slate-400">خودروهای دارای ثبت آسیب بدنه:</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {toFaDigits(stats.damagedVehiclesCount)} دستگاه
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search & List Section */}
      <div className="bg-[#0d1627] border border-[#1f2c45] rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام راننده، شماره قبض، شماره پلاک یا کد ملی..."
              className="w-full bg-[#080e1b] border border-[#1e2f52] rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400">
            نمایش {toFaDigits(filteredRecords.length)} مورد از {toFaDigits(records.length)} صورت‌جلسه
          </span>
        </div>

        {/* Table of Records */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-white font-bold text-sm">هیچ صورت‌جلسه تحویلی یافت نشد</div>
            <p className="text-xs text-slate-500">
              با کلیک روی دکمه «+ صدور صورت‌جلسه جدید» اولین قبض تحویل ناوگان را ایجاد کنید.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#1b2b48] rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#09101e] text-slate-300 font-bold border-b border-[#1b2b48]">
                <tr>
                  <th className="py-2.5 px-3">شماره قبض</th>
                  <th className="py-2.5 px-3">تاریخ و ساعت</th>
                  <th className="py-2.5 px-3">نام و مشخصات راننده</th>
                  <th className="py-2.5 px-3">وسیله و پلاک</th>
                  <th className="py-2.5 px-3 text-center">آسیب‌های بدنه</th>
                  <th className="py-2.5 px-3 text-center">وضعیت اقلام</th>
                  <th className="py-2.5 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172542] bg-[#0b1426]">
                {filteredRecords.map((rec) => {
                  const damagesCount = rec.damages?.length || 0;
                  return (
                    <tr key={rec.id} className="hover:bg-[#121e38] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                        {toFaDigits(rec.receiptNumber)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono">
                        <div>{toFaDigits(rec.date)}</div>
                        <div className="text-[10px] text-slate-500">{toFaDigits(rec.time)}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.driverName} {rec.driverLastName}</span>
                        </div>
                        {rec.driverNationalId && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            کد ملی: {toFaDigits(rec.driverNationalId)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-white font-medium flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.vehicleType}</span>
                          {rec.vehicleCode && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-mono">
                              کد {toFaDigits(rec.vehicleCode)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          {rec.vehiclePlate ? (
                            <span className="scale-75 origin-right inline-block">
                              <IranianPlate plateNumber={rec.vehiclePlate} size="xs" />
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {damagesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            {toFaDigits(damagesCount)} آسیب ثبت‌شده
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            بدون آسیب (سالم)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-mono">
                        ۶۶ قلم چک‌لیست
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print A4 */}
                          <button
                            type="button"
                            onClick={() => setActivePrintRecord(rec)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 transition cursor-pointer"
                            title="مشاهده و چاپ رسمی A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            title="ویرایش صورت‌جلسه"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec.id, rec.receiptNumber)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                            title="حذف صورت‌جلسه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Modal: Create / Edit Handover Session (Full Width Modal) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0c1424] border border-[#21355c] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#080d19] border-b border-[#1c2a47] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {editingRecordId ? 'ویرایش صورت‌جلسه تحویل خودرو' : 'صدور فرم و صورت‌جلسه رسمی تحویل خودرو'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    چک‌لیست کامل ۶۶ گانه، شماتیک ۴ وجهی بدنه و متن تعهدنامه راننده
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveRecord} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs custom-scrollbar">
              {/* Box 1: Receipt Header & Quick Auto-Fill Pickers */}
              <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    مشخصات سربرگ و اطلاعات فردی و خودرو
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Auto-fill from drivers */}
                    {drivers.length > 0 && (
                      <select
                        onChange={(e) => handleSelectDriverQuick(e.target.value)}
                        defaultValue=""
                        className="bg-[#090e1b] border border-blue-500/40 text-blue-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="" disabled>انتخاب سریع از لیست رانندگان...</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.personnelCode ? `(کد: ${toFaDigits(d.personnelCode)})` : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Auto-fill from vehicles */}
                    {vehicles.length > 0 && (
                      <select
                        onChange={(e) => handleSelectVehicleQuick(e.target.value)}
                        defaultValue=""
                        className="bg-[#090e1b] border border-emerald-500/40 text-emerald-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="" disabled>انتخاب سریع از ناوگان...</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            کد {toFaDigits(v.code)} - پلاک {v.plateNumber}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Top Row: Receipt, Date, Time, Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">شماره قبض *:</label>
                    <input
                      type="text"
                      required
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="مثلاً: 10482"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">تاریخ تحویل:</label>
                    <input
                      type="text"
                      value={handoverDate}
                      onChange={(e) => setHandoverDate(e.target.value)}
                      placeholder="۱۴۰۳/۰۸/۰۵"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">ساعت تحویل:</label>
                    <input
                      type="text"
                      value={handoverTime}
                      onChange={(e) => setHandoverTime(e.target.value)}
                      placeholder="۰۸:۳۰"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">آدرس پایانه / مبدا:</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="پایانه مرکزی حامی..."
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Driver Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#1a2742]">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نام راننده *:</label>
                    <input
                      type="text"
                      required
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="مثال: رحیم"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نام خانوادگی راننده:</label>
                    <input
                      type="text"
                      value={driverLastName}
                      onChange={(e) => setDriverLastName(e.target.value)}
                      placeholder="مثال: بدرلو"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نام پدر:</label>
                    <input
                      type="text"
                      value={driverFatherName}
                      onChange={(e) => setDriverFatherName(e.target.value)}
                      placeholder="مثال: علی"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">کد ملی راننده:</label>
                    <input
                      type="text"
                      value={driverNationalId}
                      onChange={(e) => setDriverNationalId(e.target.value)}
                      placeholder="۱۰ رقم کد ملی..."
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Vehicle Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#1a2742]">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نوع وسیله:</label>
                    <input
                      type="text"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      placeholder="خاور ۸۱۳، ایسوزو ۶ تن..."
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">کد وسیله:</label>
                    <input
                      type="text"
                      value={vehicleCode}
                      onChange={(e) => setVehicleCode(e.target.value)}
                      placeholder="مثلاً: 1"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رنگ بدنه:</label>
                    <input
                      type="text"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="سفید، زرد..."
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">پلاک انتظامی ایران:</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="۶۶-۵۳۳ع۲۵"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: 3-Column 66-Item Checklist Table */}
              <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      چک‌لیست کامل ۶۶ گانه سلامت خودرو و تجهیزات:
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                      سالم: {toFaDigits(formChecklistCounts.healthy)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono">
                      خسارتی: {toFaDigits(formChecklistCounts.damaged)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      ندارد: {toFaDigits(formChecklistCounts.none)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleMarkAllHealthy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>علامت‌گذاری تمام ۶۶ قلم به عنوان «سالم»</span>
                  </button>
                </div>

                {/* 3 Columns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map((colNum) => {
                    const colItems = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === colNum);
                    return (
                      <div key={colNum} className="border border-[#1b2b48] rounded-xl overflow-hidden bg-[#090f1d]">
                        <div className="bg-[#070b16] px-3 py-1.5 font-bold text-slate-300 text-xs border-b border-[#1b2b48] flex items-center justify-between">
                          <span>ستون {colNum === 1 ? 'اول' : colNum === 2 ? 'دوم' : 'سوم'} ({toFaDigits(colItems.length)} قلم)</span>
                          <span className="text-[10px] text-slate-500">سالم | خسارتی | ندارد</span>
                        </div>

                        <div className="divide-y divide-[#15233c] max-h-[380px] overflow-y-auto custom-scrollbar">
                          {colItems.map((item) => {
                            const currentStatus = checklist[item.id] || 'HEALTHY';
                            return (
                              <div
                                key={item.id}
                                className={`px-2.5 py-1.5 flex items-center justify-between transition-colors ${
                                  currentStatus === 'DAMAGED'
                                    ? 'bg-rose-950/20'
                                    : currentStatus === 'NONE'
                                    ? 'bg-slate-900/40'
                                    : 'hover:bg-[#0d1627]'
                                }`}
                              >
                                <span className={`text-[11.5px] truncate max-w-[140px] font-medium ${
                                  currentStatus === 'DAMAGED' ? 'text-rose-300 font-bold' : 'text-slate-200'
                                }`}>
                                  {item.label}
                                </span>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Healthy */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetItemStatus(item.id, 'HEALTHY')}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                      currentStatus === 'HEALTHY'
                                        ? 'bg-emerald-600 text-white border-emerald-500'
                                        : 'bg-[#060a14] text-slate-400 border-[#1a2845] hover:text-white'
                                    }`}
                                  >
                                    سالم
                                  </button>

                                  {/* Damaged */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetItemStatus(item.id, 'DAMAGED')}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                      currentStatus === 'DAMAGED'
                                        ? 'bg-rose-600 text-white border-rose-500'
                                        : 'bg-[#060a14] text-slate-400 border-[#1a2845] hover:text-white'
                                    }`}
                                  >
                                    خسارتی
                                  </button>

                                  {/* None */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetItemStatus(item.id, 'NONE')}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
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

              {/* Box 3: 4-View Interactive Truck Body Damage Inspector */}
              <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4">
                <Truck4ViewBodyInspector
                  damages={damages}
                  onChangeDamages={setDamages}
                  readOnly={false}
                />
              </div>

              {/* Box 4: Affidavit, Deliverer & Receiver */}
              <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 space-y-3">
                <div className="font-bold text-amber-300 text-xs border-b border-slate-800 pb-1.5">
                  متن تعهدنامه و امضای طرفین تحویل
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={affidavitText}
                    onChange={(e) => setAffidavitText(e.target.value)}
                    className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2.5 text-white leading-relaxed focus:outline-none focus:border-amber-400 text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1a2742]">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نام نماینده تحویل‌دهنده:</label>
                    <input
                      type="text"
                      value={delivererName}
                      onChange={(e) => setDelivererName(e.target.value)}
                      placeholder="مسئول اعزام و ترابری حامی"
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نام تحویل‌گیرنده (راننده):</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder={`${driverName} ${driverLastName}`}
                      className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-[#0c1424] border-t border-[#1e2f52] pt-3 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                >
                  ذخیره و ثبت نهایی صورت‌جلسه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. A4 Printable Modal */}
      {activePrintRecord && (
        <VehicleHandoverA4PrintModal
          record={activePrintRecord}
          onClose={() => setActivePrintRecord(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
