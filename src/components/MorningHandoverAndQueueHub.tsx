import React, { FC, useState, useMemo } from 'react';
import {
  VehicleItem,
  VEHICLE_TYPE_NAMES,
  checkVehicleServiceEligibility,
} from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';
import {
  Clock,
  KeyRound,
  CheckCircle2,
  AlertOctagon,
  Users,
  Truck,
  ArrowUp,
  ArrowDown,
  LogOut,
  Sparkles,
  FileText,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Phone,
  HelpCircle,
  PlusCircle,
} from 'lucide-react';

interface MorningHandoverAndQueueHubProps {
  vehicles: VehicleItem[];
  onUpdateVehicle: (updated: VehicleItem) => void;
  onNavigateToOrders?: () => void;
  onOpenCreateOrderWithVehicle?: (vehicle: VehicleItem) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const MorningHandoverAndQueueHub: FC<MorningHandoverAndQueueHubProps> = ({
  vehicles,
  onUpdateVehicle,
  onNavigateToOrders,
  onOpenCreateOrderWithVehicle,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'QUEUE' | 'HANDOVER' | 'UNASSIGNED'>('QUEUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const delivered = vehicles.filter(
      (v) => v.handoverStatus === 'DELIVERED' && v.driverName && v.driverName !== 'بدون راننده'
    ).length;
    const inQueue = vehicles.filter((v) => v.queueStatus === 'IN_QUEUE').length;
    const unassigned = vehicles.filter((v) => !v.driverName || v.driverName === 'بدون راننده').length;
    const inMission = vehicles.filter((v) => v.status === 'IN_MISSION').length;

    return { total, delivered, inQueue, unassigned, inMission };
  }, [vehicles]);

  // Queued vehicles sorted by queueNumber
  const queuedVehicles = useMemo(() => {
    return vehicles
      .filter((v) => v.queueStatus === 'IN_QUEUE')
      .sort((a, b) => (a.queueNumber || 999) - (b.queueNumber || 999));
  }, [vehicles]);

  // Handover pending or ready vehicles
  const handoverVehicles = useMemo(() => {
    return vehicles.filter(
      (v) => v.driverName && v.driverName !== 'بدون راننده' && v.status !== 'IN_MAINTENANCE'
    );
  }, [vehicles]);

  // Unassigned vehicles (NO DRIVER)
  const unassignedVehicles = useMemo(() => {
    return vehicles.filter((v) => !v.driverName || v.driverName === 'بدون راننده');
  }, [vehicles]);

  // Filtered by search and type
  const filterList = (list: VehicleItem[]) => {
    return list.filter((v) => {
      const matchSearch =
        v.code.toString().includes(searchQuery) ||
        v.driverName.includes(searchQuery) ||
        v.plateNumber.includes(searchQuery) ||
        v.driverPhone.includes(searchQuery);
      const matchType = filterType === 'ALL' || v.vehicleType === filterType;
      return matchSearch && matchType;
    });
  };

  // Action: Deliver Vehicle to Driver (Morning Handover)
  const handleDeliverVehicle = (v: VehicleItem) => {
    if (!v.driverName || v.driverName === 'بدون راننده') {
      if (showToast) {
        showToast('ماشین بدون راننده است و امکان تحویل صبحگاهی ندارد!', 'error');
      }
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Calculate next queue number
    const maxQueueNum = vehicles.reduce((max, cur) => Math.max(max, cur.queueNumber || 0), 0);
    const nextQueueNum = maxQueueNum + 1;

    const updated: VehicleItem = {
      ...v,
      status: 'ACTIVE',
      handoverStatus: 'DELIVERED',
      handoverTime: timeStr,
      queueStatus: 'IN_QUEUE',
      queueNumber: nextQueueNum,
      queueTime: timeStr,
    };

    onUpdateVehicle(updated);
    if (showToast) {
      showToast(
        `خودرو کد ${toFaDigits(v.code)} تحویل راننده «${v.driverName}» شد و با نوبت ${toFaDigits(nextQueueNum)} در صف بارنامه قرار گرفت.`,
        'success'
      );
    }
  };

  // Action: Manual Queue / Dequeue
  const handleToggleQueue = (v: VehicleItem) => {
    const eligibility = checkVehicleServiceEligibility(v);

    if (v.queueStatus === 'IN_QUEUE') {
      // Dequeue
      const updated: VehicleItem = {
        ...v,
        queueStatus: 'NOT_QUEUED',
        queueNumber: undefined,
        queueTime: undefined,
      };
      onUpdateVehicle(updated);
      if (showToast) {
        showToast(`خودرو کد ${toFaDigits(v.code)} از صف نوبت بارنامه خارج شد.`, 'info');
      }
    } else {
      // Must have driver and be delivered
      if (!v.driverName || v.driverName === 'بدون راننده') {
        if (showToast) {
          showToast('ماشینی که راننده ندارد امکان ورود به صف نوبت و اختصاص سرویس ندارد.', 'error');
        }
        return;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const maxQueueNum = vehicles.reduce((max, cur) => Math.max(max, cur.queueNumber || 0), 0);
      const nextQueueNum = maxQueueNum + 1;

      const updated: VehicleItem = {
        ...v,
        handoverStatus: 'DELIVERED',
        handoverTime: v.handoverTime || timeStr,
        queueStatus: 'IN_QUEUE',
        queueNumber: nextQueueNum,
        queueTime: timeStr,
      };
      onUpdateVehicle(updated);
      if (showToast) {
        showToast(
          `راننده «${v.driverName}» با شماره نوبت ${toFaDigits(nextQueueNum)} در صف بارنامه قرار گرفت.`,
          'success'
        );
      }
    }
  };

  // Action: Return vehicle at end of shift
  const handleReturnVehicle = (v: VehicleItem) => {
    const updated: VehicleItem = {
      ...v,
      handoverStatus: 'RETURNED',
      queueStatus: 'NOT_QUEUED',
      queueNumber: undefined,
      status: 'PARKING',
    };
    onUpdateVehicle(updated);
    if (showToast) {
      showToast(`خودرو کد ${toFaDigits(v.code)} عودت داده شد و در پارکینگ مستقر گردید.`, 'info');
    }
  };

  // Action: Move queue priority
  const handleMoveQueuePriority = (v: VehicleItem, direction: 'UP' | 'DOWN') => {
    if (!v.queueNumber) return;
    const currentNum = v.queueNumber;
    const targetNum = direction === 'UP' ? currentNum - 1 : currentNum + 1;

    if (targetNum < 1) return;

    // Find if another vehicle has the target queue number
    const otherVehicle = vehicles.find((item) => item.queueNumber === targetNum);

    if (otherVehicle) {
      onUpdateVehicle({ ...otherVehicle, queueNumber: currentNum });
    }
    onUpdateVehicle({ ...v, queueNumber: targetNum });

    if (showToast) {
      showToast(`نوبت راننده «${v.driverName}» به شماره ${toFaDigits(targetNum)} تغییر یافت.`, 'info');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Core Business Rule Explanation */}
      <div className="bg-gradient-to-r from-[#111c30] via-[#162540] to-[#0f1829] border border-amber-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">
                  میز تحویل خودرو و صف نوبت‌دهی صبحگاهی ناوگان
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                  دستورالعمل دیسپچ حامی بار
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                <strong className="text-amber-300 font-bold">فرایند کاری: </strong>
                راننده هر صبح مراجعه کرده، سوییچ و مدارک خودرو را تحویل می‌گیرد و با «در نوبت شدن»، در صف
                انتظار بارگیری قرار می‌گیرد تا بارنامه رسمی دریافت کند.{' '}
                <span className="text-rose-300 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                  ⛔ ماشینی که راننده ندارد، طبق قوانین سیستم امکان اختصاص سرویس و صدور بارنامه ندارد.
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToOrders && (
              <button
                onClick={onNavigateToOrders}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
              >
                <FileText className="w-4 h-4" />
                <span>مشاهده سفارشات و بارنامه‌ها</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>کل ناوگان ثبت‌شده</span>
          </div>
          <div className="text-xl font-black font-mono text-white mt-1">
            {toFaDigits(stats.total)}
          </div>
        </div>

        <div className="bg-[#111b2e] border border-emerald-500/30 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>تحویل شده به راننده</span>
          </div>
          <div className="text-xl font-black font-mono text-emerald-300 mt-1">
            {toFaDigits(stats.delivered)}
          </div>
        </div>

        <div className="bg-[#111b2e] border border-amber-500/30 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>حاضر در صف نوبت بارنامه</span>
          </div>
          <div className="text-xl font-black font-mono text-amber-300 mt-1">
            {toFaDigits(stats.inQueue)}
          </div>
        </div>

        <div className="bg-[#111b2e] border border-sky-500/30 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-sky-300 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-sky-400" />
            <span>در مأموریت / سرویس‌گرفته</span>
          </div>
          <div className="text-xl font-black font-mono text-sky-300 mt-1">
            {toFaDigits(stats.inMission)}
          </div>
        </div>

        <div className="bg-[#111b2e] border border-rose-500/30 rounded-xl p-3 shadow-md col-span-2 sm:col-span-1">
          <div className="text-[11px] text-rose-300 flex items-center gap-1">
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>بدون راننده (غیرمجاز)</span>
          </div>
          <div className="text-xl font-black font-mono text-rose-300 mt-1">
            {toFaDigits(stats.unassigned)}
          </div>
        </div>
      </div>

      {/* SubTabs & Search Bar */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-1.5 p-1 bg-[#0a101f] rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('QUEUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'QUEUE'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>صف زنده نوبت بارنامه ({toFaDigits(queuedVehicles.length)})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('HANDOVER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'HANDOVER'
                ? 'bg-blue-600 text-white font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>میز تحویل سوییچ به رانندگان ({toFaDigits(handoverVehicles.length)})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('UNASSIGNED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'UNASSIGNED'
                ? 'bg-rose-600 text-white font-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>خودروهای بدون راننده ({toFaDigits(unassignedVehicles.length)})</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجوی کد، راننده، پلاک..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-8 pl-3 py-1.5 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0a101f] border border-[#1f2c45] text-slate-300 text-xs rounded-xl px-2.5 py-1.5"
          >
            <option value="ALL">همه انواع خودرو</option>
            <option value="KHAAVAR">خاور</option>
            <option value="HYUNDAI">هیوندا</option>
            <option value="ISUZU">ایسوزو</option>
            <option value="NISSAN">نیسان</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: LIVE DISPATCH QUEUE (صف نوبت بارنامه) */}
      {/* ========================================================================= */}
      {activeSubTab === 'QUEUE' && (
        <div className="space-y-3">
          {queuedVehicles.length === 0 ? (
            <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-12 text-center">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-200">
                در حال حاضر هیچ خودرویی در صف نوبت بارنامه قرار ندارد.
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                از تب «میز تحویل سوییچ»، رانندگانی که سوییچ را تحویل گرفته‌اند به صف نوبت بارگیری اضافه کنید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filterList(queuedVehicles).map((v, idx) => {
                const eligibility = checkVehicleServiceEligibility(v);

                return (
                  <div
                    key={v.id}
                    className="bg-[#111b2e] border border-[#1f2c45] hover:border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all duration-200 relative overflow-hidden"
                  >
                    {/* Queue Priority Banner */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center font-mono shadow-md">
                          {toFaDigits(v.queueNumber || idx + 1)}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>نوبت {toFaDigits(v.queueNumber || idx + 1)} بارگیری</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              مجاز برای بارنامه
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            ساعت ورود به نوبت: {toFaDigits(v.queueTime || '۰۶:۱۵')}
                          </div>
                        </div>
                      </div>

                      {/* Move Priority Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveQueuePriority(v, 'UP')}
                          title="انتقال نوبت به اولویت بالاتر"
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveQueuePriority(v, 'DOWN')}
                          title="انتقال نوبت به اولویت پایین‌تر"
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Driver & Vehicle Details */}
                    <div className="py-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-400">راننده تحویل‌گیرنده:</div>
                          <div className="text-sm font-bold text-slate-100 mt-0.5">
                            {v.driverName}
                          </div>
                        </div>
                        {v.driverPhone && (
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-[#0d1524] px-2 py-1 rounded-lg border border-slate-800">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {toFaDigits(v.driverPhone)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-[#0a101f] p-2.5 rounded-xl border border-[#19243a]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-400 text-xs">
                            کد {toFaDigits(v.code)}
                          </span>
                          <span className="text-xs text-slate-300">
                            {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType}
                          </span>
                        </div>
                        <IranianPlate plateNumber={v.plateNumber} size="sm" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>تحویل صبحگاهی:</span>
                        <span className="text-emerald-400 font-bold font-mono">
                          {toFaDigits(v.handoverTime || '۰۵:۴۵')} (تأیید شده)
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions: Issue Waybill / Assign Service */}
                    <div className="pt-3 border-t border-[#1f2c45] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleQueue(v)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 text-[11px] font-semibold transition flex items-center gap-1"
                        title="خروج موقت از صف نوبت"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>خروج از نوبت</span>
                      </button>

                      {onOpenCreateOrderWithVehicle ? (
                        <button
                          onClick={() => onOpenCreateOrderWithVehicle(v)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>تخصیص بارنامه و سرویس</span>
                        </button>
                      ) : (
                        <button
                          onClick={onNavigateToOrders}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>تخصیص از سفارشات</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: MORNING HANDOVER DESK (میز تحویل سوییچ و مدارک صبحگاهی) */}
      {/* ========================================================================= */}
      {activeSubTab === 'HANDOVER' && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl overflow-hidden shadow-lg">
          <div className="p-3 bg-[#0d1627] border-b border-[#1f2c45] flex items-center justify-between">
            <div className="text-xs text-slate-300 font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>فهرست تحویل خودرو و ورود به صف نوبت رانندگان</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {toFaDigits(handoverVehicles.length)} خودرو دارای راننده
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#0c1424] text-slate-400 border-b border-[#1f2c45] font-semibold">
                  <th className="py-3 px-3.5 text-center w-14">کد</th>
                  <th className="py-3 px-3 text-center min-w-[155px]">پلاک خودرو</th>
                  <th className="py-3 px-3">نوع خودرو</th>
                  <th className="py-3 px-3">نام راننده</th>
                  <th className="py-3 px-3 text-center">وضعیت تحویل صبحگاهی</th>
                  <th className="py-3 px-3 text-center">ساعت تحویل</th>
                  <th className="py-3 px-3 text-center">وضعیت در نوبت</th>
                  <th className="py-3 px-3.5 text-center w-48">عملیات دیسپچ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172338]">
                {filterList(handoverVehicles).map((v) => {
                  const isDelivered = v.handoverStatus === 'DELIVERED';
                  const inQueue = v.queueStatus === 'IN_QUEUE';

                  return (
                    <tr key={v.id} className="hover:bg-[#152238] transition-colors text-slate-200">
                      <td className="py-3 px-3.5 text-center font-bold text-blue-400 font-mono">
                        {toFaDigits(v.code)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <IranianPlate plateNumber={v.plateNumber} size="sm" />
                      </td>
                      <td className="py-3 px-3 font-medium">
                        {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-100">{v.driverName}</div>
                        {v.driverPhone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {toFaDigits(v.driverPhone)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isDelivered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            تحویل سوییچ شده
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            در انتظار تحویل
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {v.handoverTime ? toFaDigits(v.handoverTime) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {inQueue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                            نوبت {toFaDigits(v.queueNumber || 1)}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] text-slate-500 bg-slate-800">
                            خارج از نوبت
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isDelivered ? (
                            <button
                              onClick={() => handleDeliverVehicle(v)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>تحویل سوییچ و در نوبت شدن</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleQueue(v)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                  inQueue
                                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                <span>{inQueue ? 'خروج از نوبت' : 'ورود به نوبت'}</span>
                              </button>

                              <button
                                onClick={() => handleReturnVehicle(v)}
                                title="عودت خودرو و پایان شیفت"
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              >
                                <LogOut className="w-3 h-3" />
                              </button>
                            </>
                          )}
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

      {/* ========================================================================= */}
      {/* SUB-TAB 3: UNASSIGNED VEHICLES (ماشین بدون راننده - فاقد امکان سرویس) */}
      {/* ========================================================================= */}
      {activeSubTab === 'UNASSIGNED' && (
        <div className="space-y-3">
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-rose-200">
                قانون قطعی سیستم: ماشینی که راننده ندارد، امکان اختصاص سرویس و صدور بارنامه ندارد
              </h3>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                خودروهای زیر بدون راننده هستند. این خودروها در کلیه فرم‌های ثبت سفارش، صدور بارنامه و
                دیسپچ عملیاتی به صورت خودکار مسدود می‌باشند و مجاز به بارگیری نیستند. برای فعال‌سازی،
                ابتدا راننده تخصیص دهید تا وارد چرخه تحویل صبحگاهی و نوبت‌دهی شوند.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedVehicles.map((v) => (
              <div
                key={v.id}
                className="bg-[#111b2e] border border-rose-500/30 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      کد {toFaDigits(v.code)}
                    </span>
                    <span className="text-xs text-slate-300 font-bold">
                      {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-black">
                    ⛔ فاقد راننده
                  </span>
                </div>

                <div className="flex justify-center py-1">
                  <IranianPlate plateNumber={v.plateNumber} size="sm" />
                </div>

                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>وضعیت راننده:</span>
                    <span className="text-rose-400 font-bold">بدون راننده</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>امکان اختصاص سرویس:</span>
                    <span className="text-rose-400 font-bold">مسدود (غیرمجاز)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>امکان ورود به صف نوبت:</span>
                    <span className="text-rose-400 font-bold">غیرفعال</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
