import { FC, useMemo } from 'react';
import {
  TrendingUp,
  Truck,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Users,
  ShieldCheck,
  Fuel,
  MapPin,
  Calendar,
  Palmtree,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { VehicleItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import { Driver, AttendanceRecords } from '../types';
import { IranianPlate } from './IranianPlate';
import { toFaDigits, getTodayJalaali, formatPersianDateKey } from '../utils/jalaali';
import { ActiveAppTab } from './Header';

interface OperationsDashboardViewProps {
  vehicles: VehicleItem[];
  drivers?: Driver[];
  records?: AttendanceRecords;
  onNavigateToTab: (tab: ActiveAppTab) => void;
}

export const OperationsDashboardView: FC<OperationsDashboardViewProps> = ({
  vehicles,
  drivers = [],
  records = {},
  onNavigateToTab,
}) => {
  const today = getTodayJalaali();
  const todayKey = formatPersianDateKey(today.jy, today.jm, today.jd);
  const todayAltSlash = `${today.jy}/${today.jm}/${today.jd}`;
  const todayDash = `${today.jy}-${String(today.jm).padStart(2, '0')}-${String(today.jd).padStart(2, '0')}`;

  const stats = useMemo(() => {
    const total = vehicles.length;
    let activeCount = 0;
    let inRepairCount = 0;
    let onLeaveCount = 0;

    vehicles.forEach((v) => {
      const matchedDriver = drivers.find(
        (d) =>
          (d.code && String(d.code) === String(v.code)) ||
          (d.vehiclePlate && d.vehiclePlate === v.plateNumber) ||
          (v.driverName && v.driverName !== 'بدون راننده' && d.name.trim() === v.driverName.trim())
      );
      const rec = matchedDriver ? records[matchedDriver.id] : undefined;
      const drvToday = rec ? rec[todayKey] || rec[todayAltSlash] || rec[todayDash] || 'none' : 'none';

      if (v.status === 'IN_MAINTENANCE' || drvToday === 'workshop') {
        inRepairCount++;
      } else if (v.status === 'ON_LEAVE' || drvToday === 'leave') {
        onLeaveCount++;
      } else {
        activeCount++;
      }
    });

    const inMission = vehicles.filter((v) => v.status === 'IN_MISSION').length;
    const inParking = vehicles.filter((v) => v.status === 'PARKING').length;
    const readinessRate = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    const expiringThirdParty = vehicles.filter(
      (v) =>
        v.thirdPartyExpiry.startsWith('1405/04') ||
        v.thirdPartyExpiry.startsWith('1405/05') ||
        v.thirdPartyExpiry.startsWith('1405/08')
    );
    const expiringInspection = vehicles.filter(
      (v) =>
        v.inspectionExpiry.startsWith('1405/04') ||
        v.inspectionExpiry.startsWith('1405/05') ||
        v.inspectionExpiry.startsWith('1405/08')
    );

    const typeBreakdown = {
      KHAAVAR: vehicles.filter((v) => v.vehicleType === 'KHAAVAR').length,
      HYUNDAI: vehicles.filter((v) => v.vehicleType === 'HYUNDAI').length,
      ISUZU: vehicles.filter((v) => v.vehicleType === 'ISUZU').length,
      NISSAN: vehicles.filter((v) => v.vehicleType === 'NISSAN').length,
    };

    const chartData = [
      { name: 'فعال', value: activeCount, color: '#10b981' },
      { name: 'در تعمیرگاه', value: inRepairCount, color: '#f59e0b' },
      { name: 'در مرخصی', value: onLeaveCount, color: '#38bdf8' },
    ];

    return {
      total,
      active: activeCount,
      inMission,
      inParking,
      inRepair: inRepairCount,
      onLeave: onLeaveCount,
      readinessRate,
      expiringThirdParty,
      expiringInspection,
      typeBreakdown,
      chartData,
    };
  }, [vehicles, drivers, records, todayKey, todayAltSlash, todayDash]);

  return (
    <div className="space-y-5">
      {/* Top Banner KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Readiness Rate */}
        <div className="bg-gradient-to-br from-[#13233f] to-[#0d1627] border border-blue-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-300 font-medium">ضریب آماده‌به‌کاری ناوگان</div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1">
              <span>{toFaDigits(stats.readinessRate)}%</span>
              <span className="text-xs text-emerald-400 font-normal">آماده</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {toFaDigits(stats.active)} از {toFaDigits(stats.total)} دستگاه فعال
            </div>
          </div>
          <div className="p-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Available Active */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 font-medium">ناوگان فعال و در خط</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {toFaDigits(stats.active)} <span className="text-xs text-slate-400 font-normal">خودرو</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">آماده تحویل و توزیع بار</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: In Repair */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-medium">در تعمیرگاه و سرویس</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {toFaDigits(stats.inRepair)} <span className="text-xs text-slate-400 font-normal">دستگاه</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">تحت تعمیر و سرویس دوره‌ای</div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: On Leave */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-sky-400 font-medium">در مرخصی</div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {toFaDigits(stats.onLeave)} <span className="text-xs text-slate-400 font-normal">دستگاه</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">بر اساس تابلوی حضور امروز</div>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
            <Palmtree className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Center Layout: Recharts Status Chart, Fleet Distribution & Mission Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Recharts Fleet Status Breakdown */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1f2c45] pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-sm">نمودار وضعیت فعلی ناوگان</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{toFaDigits(stats.total)} دستگاه</span>
          </div>

          <div className="h-44 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.chartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${toFaDigits(val)} دستگاه`, name]}
                  contentStyle={{
                    backgroundColor: '#0b1324',
                    borderColor: '#1f2c45',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                    textAlign: 'right',
                    direction: 'rtl',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {toFaDigits(stats.readinessRate)}٪
              </span>
              <span className="text-[10px] text-slate-400">فعال</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[#0a101f] border border-emerald-500/20">
              <span className="text-[10px] text-slate-400 block">فعال</span>
              <strong className="text-emerald-400 font-mono text-sm">{toFaDigits(stats.active)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0a101f] border border-amber-500/20">
              <span className="text-[10px] text-slate-400 block">در تعمیرگاه</span>
              <strong className="text-amber-400 font-mono text-sm">{toFaDigits(stats.inRepair)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0a101f] border border-sky-500/20">
              <span className="text-[10px] text-slate-400 block">در مرخصی</span>
              <strong className="text-sky-400 font-mono text-sm">{toFaDigits(stats.onLeave)}</strong>
            </div>
          </div>
        </div>

        {/* Column 2: Fleet Composition */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f2c45] pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-slate-100 text-sm">ترکیب و سهم ناوگان لجستیک</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('OIL_SERVICE')}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              مشاهده لیست
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Khaavar */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>خاور (بنز مسقف / روباز)</span>
                <span className="font-bold font-mono">{toFaDigits(stats.typeBreakdown.KHAAVAR)} دستگاه</span>
              </div>
              <div className="w-full bg-[#0a101f] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${(stats.typeBreakdown.KHAAVAR / Math.max(1, stats.total)) * 100}%` }}
                />
              </div>
            </div>

            {/* Hyundai */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>کامیونت هیوندا مایتی</span>
                <span className="font-bold font-mono">{toFaDigits(stats.typeBreakdown.HYUNDAI)} دستگاه</span>
              </div>
              <div className="w-full bg-[#0a101f] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(stats.typeBreakdown.HYUNDAI / Math.max(1, stats.total)) * 100}%` }}
                />
              </div>
            </div>

            {/* Isuzu */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>ایسوزو ۵.۲ و ۶ تن</span>
                <span className="font-bold font-mono">{toFaDigits(stats.typeBreakdown.ISUZU)} دستگاه</span>
              </div>
              <div className="w-full bg-[#0a101f] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${(stats.typeBreakdown.ISUZU / Math.max(1, stats.total)) * 100}%` }}
                />
              </div>
            </div>

            {/* Nissan */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>نیسان و وانت بار</span>
                <span className="font-bold font-mono">{toFaDigits(stats.typeBreakdown.NISSAN)} دستگاه</span>
              </div>
              <div className="w-full bg-[#0a101f] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${(stats.typeBreakdown.NISSAN / Math.max(1, stats.total)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#0a101f] border border-[#1f2c45] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Fuel className="w-4 h-4 text-amber-400" />
              <span>مصرف سوخت و کارت‌های ناوگان</span>
            </div>
            <span className="text-emerald-400 font-bold text-[11px]">سهمیه‌بندی فعال</span>
          </div>
        </div>

        {/* Column 3: Live Active Vehicles & Dispatches */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#1f2c45] pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-slate-100 text-sm">خودروهای فعال آماده اعزام</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('VEHICLE_ASSIGNMENT')}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              تخصیص خودرو ←
            </button>
          </div>

          <div className="space-y-2.5">
            {vehicles
              .filter((v) => v.status === 'ACTIVE' || v.status === 'IN_MISSION')
              .slice(0, 4)
              .map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-xl bg-[#0a101f] border border-[#1f2c45] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold font-mono">
                      {toFaDigits(v.code)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100">{v.driverName}</div>
                      <div className="text-[10px] text-slate-400">
                        {VEHICLE_TYPE_NAMES[v.vehicleType]}
                      </div>
                    </div>
                  </div>

                  <IranianPlate plateNumber={v.plateNumber} size="sm" />
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Document Expiry Alerts & Quick Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Document Expiry Warnings */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#1f2c45] pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-slate-100 text-sm">هشدارهای انقضای بیمه و معاینه فنی</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
              {toFaDigits(stats.expiringThirdParty.length + stats.expiringInspection.length)} مورد نزدیک
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {stats.expiringInspection.slice(0, 3).map((v) => (
              <div
                key={v.id}
                className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">خودرو {toFaDigits(v.code)} ({v.driverName})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 text-[11px]">معاینه: {toFaDigits(v.inspectionExpiry)}</span>
                  <button
                    onClick={() => onNavigateToTab('OIL_SERVICE')}
                    className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] cursor-pointer"
                  >
                    پیگیری
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launch Hub */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1f2c45] pb-3">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">دسترسی سریع به بخش‌های سامانه</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
            <button
              onClick={() => onNavigateToTab('ATTENDANCE')}
              className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45] hover:border-blue-500/50 flex flex-col items-start gap-1 text-right transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-blue-400">ماتریس حضور غیاب</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[11px] text-slate-400">ثبت مرخصی و تعمیرگاه ماهانه رانندگان</span>
            </button>

            <button
              onClick={() => onNavigateToTab('DRIVERS')}
              className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45] hover:border-blue-500/50 flex flex-col items-start gap-1 text-right transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-blue-400">بانک رانندگان</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[11px] text-slate-400">پرونده پرسنلی، شبا، مدارک و امتیازات</span>
            </button>

            <button
              onClick={() => onNavigateToTab('OIL_SERVICE')}
              className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45] hover:border-blue-500/50 flex flex-col items-start gap-1 text-right transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-blue-400">مدیریت ناوگان</span>
                <Truck className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-[11px] text-slate-400">جدول خودروها، سرویس روغن و بیمه‌نامه‌ها</span>
            </button>

            <button
              onClick={() => onNavigateToTab('VEHICLE_ASSIGNMENT')}
              className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45] hover:border-blue-500/50 flex flex-col items-start gap-1 text-right transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-blue-400">تخصیص خودرو و راننده</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[11px] text-slate-400">مدیریت انتساب و تحویل خودروها</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
