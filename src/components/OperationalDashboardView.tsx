import { FC } from 'react';
import {
  Truck,
  Users,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  CarFront,
  ShieldAlert,
  Navigation,
  Radio,
} from 'lucide-react';
import { VehicleItem, DriverDirectoryItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import { AttendanceRecords, Driver } from '../types';
import { toFaDigits, getTodayJalaali, formatPersianDateKey } from '../utils/jalaali';
import { IranianPlate } from './IranianPlate';
import { ActiveAppTab } from './Header';

interface OperationalDashboardViewProps {
  vehicles: VehicleItem[];
  drivers: Driver[];
  driverDirectory: DriverDirectoryItem[];
  records: AttendanceRecords;
  onNavigateTab: (tab: ActiveAppTab) => void;
}

export const OperationalDashboardView: FC<OperationalDashboardViewProps> = ({
  vehicles,
  drivers,
  driverDirectory,
  records,
  onNavigateTab,
}) => {
  const today = getTodayJalaali();
  const todayKey = formatPersianDateKey(today.jy, today.jm, today.jd);

  // Today Attendance metrics
  const todayLeaveDrivers = drivers.filter((d) => records[d.id]?.[todayKey] === 'leave');
  const todayWorkshopDrivers = drivers.filter((d) => records[d.id]?.[todayKey] === 'workshop');
  const todayActiveDrivers = Math.max(0, drivers.length - todayLeaveDrivers.length - todayWorkshopDrivers.length);
  const attendanceRate = drivers.length > 0 ? Math.round((todayActiveDrivers / drivers.length) * 100) : 100;

  // Fleet operational status
  const activeVehicles = vehicles.filter((v) => v.status === 'ACTIVE');
  const missionVehicles = vehicles.filter((v) => v.status === 'IN_MISSION');
  const parkingVehicles = vehicles.filter((v) => v.status === 'PARKING');
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'IN_MAINTENANCE');
  const unassignedVehicles = vehicles.filter((v) => !v.driverName || v.driverName === 'بدون راننده');

  // Document Expirations
  const expiringVehicles = vehicles.filter((v) => {
    return (
      v.inspectionExpiry.startsWith('1405/04') ||
      v.inspectionExpiry.startsWith('1405/05') ||
      v.thirdPartyExpiry.startsWith('1405/04') ||
      v.thirdPartyExpiry.startsWith('1405/05')
    );
  });

  // Type Distribution
  const typeDistribution: Record<string, number> = {};
  vehicles.forEach((v) => {
    typeDistribution[v.vehicleType] = (typeDistribution[v.vehicleType] || 0) + 1;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner with Quick Highlights */}
      <div className="bg-gradient-to-l from-[#0f1b31] via-[#111e38] to-[#0c1527] border border-[#1f2f4e] rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                مرکز پایش و کنترل عملیات لجستیک
              </span>
              <span className="text-slate-400 text-xs font-mono">{today.fullFa}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white mt-1.5">
              داشبورد عملکرد روزانه ناوگان حامی
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              نمای یکپارچه از وضعیت آماده‌به‌کاری {toFaDigits(vehicles.length)} دستگاه خودروی باری، ضریب حضور {toFaDigits(attendanceRate)}٪ رانندگان و هشدارهای نگهداری و اسناد.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
            <button
              onClick={() => onNavigateTab('CARGO_TRACKING')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-900/30 flex items-center justify-center gap-2 transition"
            >
              <Radio className="w-4 h-4" />
              <span>پیگیری زنده بار</span>
            </button>
            <button
              onClick={() => onNavigateTab('LIVE_MAP')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 transition"
            >
              <Navigation className="w-4 h-4" />
              <span>نقشه آنلاین GPS</span>
            </button>
            <button
              onClick={() => onNavigateTab('ATTENDANCE')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 transition"
            >
              <span>تابلوی حضور</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('KANBAN')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#1c2a47] hover:bg-[#25385e] border border-[#2b416d] text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <span>بورد کانبان</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Vehicles */}
        <div
          onClick={() => onNavigateTab('FLEET')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-blue-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>کل ناوگان فعال</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{toFaDigits(vehicles.length)}</div>
          <div className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>مدیریت و پرونده‌ها</span>
          </div>
        </div>

        {/* Ready to Service */}
        <div
          onClick={() => onNavigateTab('KANBAN')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-emerald-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>آماده بارگیری</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{toFaDigits(activeVehicles.length)}</div>
          <div className="text-[10px] text-emerald-500 mt-1">خودرو مستقر در انبار</div>
        </div>

        {/* In Mission */}
        <div
          onClick={() => onNavigateTab('KANBAN')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-sky-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>در حال اعزام و سفر</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">{toFaDigits(missionVehicles.length)}</div>
          <div className="text-[10px] text-sky-400 mt-1">سفرهای فعال شبکه</div>
        </div>

        {/* In Maintenance */}
        <div
          onClick={() => onNavigateTab('FLEET')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-amber-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>تعمیرگاه و سرویس</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{toFaDigits(maintenanceVehicles.length)}</div>
          <div className="text-[10px] text-amber-400 mt-1">نیازمند ترخیص</div>
        </div>

        {/* Drivers Attendance */}
        <div
          onClick={() => onNavigateTab('ATTENDANCE')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-indigo-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>ضریب حضور رانندگان</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 font-mono">{toFaDigits(attendanceRate)}٪</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {toFaDigits(todayActiveDrivers)} نفر از {toFaDigits(drivers.length)} راننده
          </div>
        </div>

        {/* Document alerts */}
        <div
          onClick={() => onNavigateTab('FLEET')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-rose-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>هشدار تمدید مدارک</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{toFaDigits(expiringVehicles.length)}</div>
          <div className="text-[10px] text-rose-400 mt-1">بیمه یا معاینه فنی منقضی</div>
        </div>
      </div>

      {/* Middle Grid: Operational Fleet Composition & Expiry Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fleet Composition by Vehicle Type */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <CarFront className="w-4 h-4 text-blue-400" />
              <span>ترکیب ناوگان حامی</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{toFaDigits(vehicles.length)} کل</span>
          </div>

          <div className="space-y-3">
            {Object.entries(typeDistribution).map(([typeKey, count]) => {
              const percentage = Math.round((count / vehicles.length) * 100);
              return (
                <div key={typeKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      {VEHICLE_TYPE_NAMES[typeKey] || typeKey}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {toFaDigits(count)} دستگاه ({toFaDigits(percentage)}٪)
                    </span>
                  </div>
                  <div className="w-full bg-[#0a101f] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#1f2c45] flex items-center justify-between text-xs text-slate-400">
            <span>ناوگان بدون راننده:</span>
            <span className="font-bold text-amber-400 font-mono">{toFaDigits(unassignedVehicles.length)} دستگاه</span>
          </div>
        </div>

        {/* Operational Status Breakdown */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>وضعیت پویای خودروها</span>
            </div>
            <button
              onClick={() => onNavigateTab('KANBAN')}
              className="text-[11px] text-blue-400 hover:underline"
            >
              مشاهده بورد کانبان
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-200">آماده به کار و فعال</span>
              </div>
              <span className="font-bold text-emerald-400 font-mono text-xs">{toFaDigits(activeVehicles.length)} دستگاه</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span className="text-slate-200">در حال مأموریت جاده‌ای</span>
              </div>
              <span className="font-bold text-sky-400 font-mono text-xs">{toFaDigits(missionVehicles.length)} دستگاه</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span className="text-slate-200">پارکینگ و در نوبت</span>
              </div>
              <span className="font-bold text-purple-400 font-mono text-xs">{toFaDigits(parkingVehicles.length)} دستگاه</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-200">تعمیرگاه و عیب‌یابی</span>
              </div>
              <span className="font-bold text-amber-400 font-mono text-xs">{toFaDigits(maintenanceVehicles.length)} دستگاه</span>
            </div>
          </div>
        </div>

        {/* Expiry Alerts Watchlist */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>هشدارهای بیمه و معاینه فنی</span>
            </div>
            <span className="text-[11px] text-rose-400 font-mono font-bold">{toFaDigits(expiringVehicles.length)} مورد</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
            {expiringVehicles.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                تمامی مدارک و بیمه‌نامه‌ها دارای اعتبار می‌باشند.
              </div>
            ) : (
              expiringVehicles.slice(0, 5).map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-lg bg-[#0a101f] border border-[#1a2842] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <span>کد {toFaDigits(v.code)}</span>
                      <span className="text-slate-400 font-normal">({v.driverName})</span>
                    </div>
                    <div className="text-[10px] text-rose-400 mt-0.5 font-mono">
                      معاینه: {toFaDigits(v.inspectionExpiry)} | ثالث: {toFaDigits(v.thirdPartyExpiry)}
                    </div>
                  </div>
                  <IranianPlate plateNumber={v.plateNumber} size="sm" />
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigateTab('FLEET')}
            className="w-full py-2 rounded-lg bg-[#142036] hover:bg-[#1a2a47] text-slate-300 text-xs font-semibold border border-[#203150] transition"
          >
            مشاهده کامل و تمدید مدارک در بخش ناوگان
          </button>
        </div>
      </div>

      {/* Driver Profiles Quick Directory Preview */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
            <Users className="w-4 h-4 text-blue-400" />
            <span>رانندگان برتر و فعال سامانه</span>
          </div>
          <button
            onClick={() => onNavigateTab('DRIVERS')}
            className="text-xs text-blue-400 hover:underline font-semibold"
          >
            مشاهده پرونده تمام {toFaDigits(driverDirectory.length)} راننده
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {driverDirectory.slice(0, 4).map((d) => (
            <div
              key={d.id}
              className="p-3 rounded-xl bg-[#0a101f] border border-[#19263e] space-y-2 hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-xs">{d.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#16233b] text-blue-300 font-mono">
                  کد {toFaDigits(d.code)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{d.assignedVehicles[0] || 'ناوگان عمومی'}</span>
                <span className="text-emerald-400 font-bold font-mono">{toFaDigits(d.totalTrips)} سفر</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
