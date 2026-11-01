import { FC, useMemo } from 'react';
import {
  Truck,
  Users,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  CarFront,
  ShieldAlert,
  Navigation,
  Radio,
  PieChart as PieChartIcon,
  BarChart3,
  Palmtree,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
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
  const todayAltSlash = `${today.jy}/${today.jm}/${today.jd}`;
  const todayDash = `${today.jy}-${String(today.jm).padStart(2, '0')}-${String(today.jd).padStart(2, '0')}`;

  // Helper to get a driver's today attendance status across possible date key formats
  const getDriverTodayStatus = (driverId: string) => {
    const rec = records[driverId];
    if (!rec) return 'none';
    return rec[todayKey] || rec[todayAltSlash] || rec[todayDash] || 'none';
  };

  // Today Attendance metrics
  const todayLeaveDrivers = drivers.filter((d) => getDriverTodayStatus(d.id) === 'leave');
  const todayWorkshopDrivers = drivers.filter((d) => getDriverTodayStatus(d.id) === 'workshop');
  const todayActiveDrivers = Math.max(0, drivers.length - todayLeaveDrivers.length - todayWorkshopDrivers.length);
  const attendanceRate = drivers.length > 0 ? Math.round((todayActiveDrivers / drivers.length) * 100) : 100;

  // Unified Fleet Status Evaluation: Active (فعال), In Workshop (در تعمیرگاه), On Leave (در مرخصی)
  const fleetStatusBreakdown = useMemo(() => {
    const activeList: VehicleItem[] = [];
    const workshopList: VehicleItem[] = [];
    const leaveList: VehicleItem[] = [];

    vehicles.forEach((v) => {
      const matchedDriver = drivers.find(
        (d) =>
          (d.code && String(d.code) === String(v.code)) ||
          (d.vehiclePlate && d.vehiclePlate === v.plateNumber) ||
          (v.driverName && v.driverName !== 'بدون راننده' && d.name.trim() === v.driverName.trim())
      );
      const drvToday = matchedDriver ? getDriverTodayStatus(matchedDriver.id) : 'none';

      if (v.status === 'IN_MAINTENANCE' || drvToday === 'workshop') {
        workshopList.push(v);
      } else if (v.status === 'ON_LEAVE' || drvToday === 'leave') {
        leaveList.push(v);
      } else {
        activeList.push(v);
      }
    });

    const total = vehicles.length || 1;
    const pieData = [
      {
        name: 'فعال و آماده به کار',
        shortName: 'فعال',
        value: activeList.length,
        percentage: Math.round((activeList.length / total) * 100),
        color: '#10b981',
      },
      {
        name: 'در تعمیرگاه و سرویس',
        shortName: 'در تعمیرگاه',
        value: workshopList.length,
        percentage: Math.round((workshopList.length / total) * 100),
        color: '#f59e0b',
      },
      {
        name: 'در مرخصی',
        shortName: 'در مرخصی',
        value: leaveList.length,
        percentage: Math.round((leaveList.length / total) * 100),
        color: '#38bdf8',
      },
    ];

    // Breakdown by Vehicle Class for BarChart
    const typeKeys = ['KHAAVAR', 'HYUNDAI', 'ISUZU', 'NISSAN'];
    const barByTypeData = typeKeys.map((tKey) => {
      const ofType = vehicles.filter((v) =>
        tKey === 'NISSAN'
          ? v.vehicleType !== 'KHAAVAR' && v.vehicleType !== 'HYUNDAI' && v.vehicleType !== 'ISUZU'
          : v.vehicleType === tKey
      );
      const activeCnt = ofType.filter((v) => activeList.some((a) => a.id === v.id)).length;
      const workshopCnt = ofType.filter((v) => workshopList.some((w) => w.id === v.id)).length;
      const leaveCnt = ofType.filter((v) => leaveList.some((l) => l.id === v.id)).length;

      return {
        typeLabel:
          tKey === 'KHAAVAR'
            ? 'خاور'
            : tKey === 'HYUNDAI'
            ? 'هیوندای'
            : tKey === 'ISUZU'
            ? 'ایسوزو'
            : 'نیسان/سایر',
        فعال: activeCnt,
        'در تعمیرگاه': workshopCnt,
        'در مرخصی': leaveCnt,
        total: ofType.length,
      };
    });

    return {
      activeList,
      workshopList,
      leaveList,
      pieData,
      barByTypeData,
    };
  }, [vehicles, drivers, records, todayKey]);

  // Fleet operational status
  const activeVehicles = fleetStatusBreakdown.activeList;
  const missionVehicles = vehicles.filter((v) => v.status === 'IN_MISSION');
  const parkingVehicles = vehicles.filter((v) => v.status === 'PARKING');
  const maintenanceVehicles = fleetStatusBreakdown.workshopList;
  const leaveVehicles = fleetStatusBreakdown.leaveList;
  const unassignedVehicles = vehicles.filter((v) => !v.driverName || v.driverName === 'بدون راننده');

  // Document Expirations
  const expiringVehicles = vehicles.filter((v) => {
    return (
      v.inspectionExpiry.startsWith('1405/04') ||
      v.inspectionExpiry.startsWith('1405/05') ||
      v.inspectionExpiry.startsWith('1405/08') ||
      v.thirdPartyExpiry.startsWith('1405/04') ||
      v.thirdPartyExpiry.startsWith('1405/05') ||
      v.thirdPartyExpiry.startsWith('1405/08')
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
              onClick={() => onNavigateTab('CUSTOMERS')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-900/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>پیگیری زنده بار</span>
            </button>
            <button
              onClick={() => onNavigateTab('OPERATIONS')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>عملیات و اعزام</span>
            </button>
            <button
              onClick={() => onNavigateTab('ATTENDANCE')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>تابلوی حضور</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('OIL_SERVICE')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#1c2a47] hover:bg-[#25385e] border border-[#2b416d] text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>مدیریت ناوگان</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Vehicles */}
        <div
          onClick={() => onNavigateTab('OIL_SERVICE')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-blue-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>کل ناوگان ثبت‌شده</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{toFaDigits(vehicles.length)}</div>
          <div className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>مدیریت و پرونده‌ها</span>
          </div>
        </div>

        {/* Active Fleet */}
        <div
          onClick={() => onNavigateTab('OPERATIONS')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-emerald-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>ناوگان فعال</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{toFaDigits(activeVehicles.length)}</div>
          <div className="text-[10px] text-emerald-500 mt-1">آماده به کار و در سرویس</div>
        </div>

        {/* In Workshop */}
        <div
          onClick={() => onNavigateTab('OIL_SERVICE')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-amber-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>در تعمیرگاه</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{toFaDigits(maintenanceVehicles.length)}</div>
          <div className="text-[10px] text-amber-400 mt-1">تحت تعمیر و سرویس فنی</div>
        </div>

        {/* On Leave */}
        <div
          onClick={() => onNavigateTab('ATTENDANCE')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-sky-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>در مرخصی</span>
            <Palmtree className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">{toFaDigits(leaveVehicles.length)}</div>
          <div className="text-[10px] text-sky-400 mt-1">مرخصی روزانه راننده</div>
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
          onClick={() => onNavigateTab('OIL_SERVICE')}
          className="bg-[#111b2e] border border-[#1f2c45] hover:border-rose-500/50 p-4 rounded-xl shadow-xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>هشدار تمدید مدارک</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{toFaDigits(expiringVehicles.length)}</div>
          <div className="text-[10px] text-rose-400 mt-1">بیمه یا معاینه فنی نزدیک</div>
        </div>
      </div>

      {/* RECHARTS VISUAL ANALYTICS: CURRENT FLEET STATUS (فعال، در تعمیرگاه، در مرخصی) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Donut Chart Card: Overall Fleet Status */}
        <div className="lg:col-span-5 bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">نمودار وضعیت فعلی ناوگان</h3>
                <p className="text-[11px] text-slate-400">به تفکیک فعال، در تعمیرگاه و در مرخصی</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#0a101f] border border-[#1f2c45] text-[11px] font-mono text-slate-300">
              کل: {toFaDigits(vehicles.length)} دستگاه
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 my-3">
            <div className="h-52 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetStatusBreakdown.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={78}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {fleetStatusBreakdown.pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${toFaDigits(val)} دستگاه`, name]}
                    contentStyle={{
                      backgroundColor: '#0b1324',
                      borderColor: '#1f2c45',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                      textAlign: 'right',
                      direction: 'rtl',
                    }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Overlay Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {toFaDigits(fleetStatusBreakdown.pieData[0]?.percentage || 0)}٪
                </span>
                <span className="text-[10px] text-slate-400 font-bold">آماده‌به‌کاری</span>
              </div>
            </div>

            {/* Interactive Status Breakdown Legend */}
            <div className="space-y-2.5">
              {fleetStatusBreakdown.pieData.map((item) => (
                <div
                  key={item.shortName}
                  className="p-2.5 rounded-xl bg-[#0a101f] border border-[#19263e] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.shortName}</div>
                      <div className="text-[10px] text-slate-500">{item.name}</div>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-sm font-black text-white">{toFaDigits(item.value)}</div>
                    <div className="text-[10px] text-slate-400">{toFaDigits(item.percentage)}٪</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#1f2c45] flex items-center justify-between text-[11px] text-slate-400">
            <span>به‌روزرسانی زنده از تابلوی حضور و وضعیت ناوگان</span>
            <button
              onClick={() => onNavigateTab('ATTENDANCE')}
              className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
            >
              مدیریت وضعیت ←
            </button>
          </div>
        </div>

        {/* Bar Chart Card: Status by Vehicle Type */}
        <div className="lg:col-span-7 bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#1f2c45]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  تفکیک وضعیت عملیاتی بر اساس کلاس خودرو
                </h3>
                <p className="text-[11px] text-slate-400">
                  مقایسه تعداد خودروهای فعال، در تعمیرگاه و در مرخصی به تفکیک تیپ ناوگان
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                فعال
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                در تعمیرگاه
              </span>
              <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-400 inline-block" />
                در مرخصی
              </span>
            </div>
          </div>

          <div className="h-56 w-full my-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={fleetStatusBreakdown.barByTypeData}
                margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="typeLabel"
                  tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 700 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(30, 41, 59, 0.45)' }}
                  formatter={(val: any, name: any) => [`${toFaDigits(val)} دستگاه`, name]}
                  contentStyle={{
                    backgroundColor: '#0b1324',
                    borderColor: '#1f2c45',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                    textAlign: 'right',
                    direction: 'rtl',
                  }}
                />
                <Bar dataKey="فعال" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="در تعمیرگاه" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="در مرخصی" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2.5 border-t border-[#1f2c45] flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                فعال: <strong className="text-emerald-400 font-mono">{toFaDigits(activeVehicles.length)}</strong>
              </span>
              <span>•</span>
              <span>
                در تعمیرگاه: <strong className="text-amber-400 font-mono">{toFaDigits(maintenanceVehicles.length)}</strong>
              </span>
              <span>•</span>
              <span>
                در مرخصی: <strong className="text-sky-400 font-mono">{toFaDigits(leaveVehicles.length)}</strong>
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('OIL_SERVICE')}
              className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
            >
              مشاهده جزئیات ناوگان ←
            </button>
          </div>
        </div>
      </div>

      {/* Middle Grid: Operational Fleet Composition & Expiry Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fleet Composition by Vehicle Type */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-xs space-y-4">
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
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>وضعیت پویای خودروها</span>
            </div>
            <button
              onClick={() => onNavigateTab('OPERATIONS')}
              className="text-[11px] text-blue-400 hover:underline cursor-pointer"
            >
              مشاهده عملیات و اعزام
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-200">فعال و آماده به کار</span>
              </div>
              <span className="font-bold text-emerald-400 font-mono text-xs">{toFaDigits(activeVehicles.length)} دستگاه</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-200">در تعمیرگاه و سرویس</span>
              </div>
              <span className="font-bold text-amber-400 font-mono text-xs">{toFaDigits(maintenanceVehicles.length)} دستگاه</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                <span className="text-slate-200">در مرخصی (راننده)</span>
              </div>
              <span className="font-bold text-sky-400 font-mono text-xs">{toFaDigits(leaveVehicles.length)} دستگاه</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a101f] border border-[#19263e]">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span className="text-slate-200">در مأموریت / پارکینگ</span>
              </div>
              <span className="font-bold text-purple-400 font-mono text-xs">
                {toFaDigits(missionVehicles.length + parkingVehicles.length)} دستگاه
              </span>
            </div>
          </div>
        </div>

        {/* Expiry Alerts Watchlist */}
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-xs space-y-3">
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
            onClick={() => onNavigateTab('OIL_SERVICE')}
            className="w-full py-2 rounded-lg bg-[#142036] hover:bg-[#1a2a47] text-slate-300 text-xs font-semibold border border-[#203150] transition cursor-pointer"
          >
            مشاهده کامل و تمدید مدارک در بخش ناوگان
          </button>
        </div>
      </div>

      {/* Driver Profiles Quick Directory Preview */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-4.5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2c45]">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
            <Users className="w-4 h-4 text-blue-400" />
            <span>رانندگان برتر و فعال سامانه</span>
          </div>
          <button
            onClick={() => onNavigateTab('DRIVERS')}
            className="text-xs text-blue-400 hover:underline font-semibold cursor-pointer"
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
