import { FC, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Shield,
  ShieldAlert,
  Calendar,
  Truck,
  Users,
  UserCheck,
  PhoneCall,
  History,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { AppUser } from '../types/auth';
import { isMasterAdmin } from '../utils/authService';
import { Driver, AttendanceRecords, StaffMember } from '../types';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { exportToExcel, exportStaffToExcel } from '../utils/excelExport';
import { exportAuditLogsToExcel, getAuditLogs } from '../utils/auditLogger';
import { assertMasterAdminExcelPermission } from '../utils/excelExportSecurity';
import { getTodayJalaali, PERSIAN_MONTH_NAMES, toFaDigits } from '../utils/jalaali';
import { APP_VERSION, APP_FULL_NAME } from '../constants/version';
import * as XLSX from 'xlsx';

interface ReportsManagementViewProps {
  currentUser: AppUser | null;
  drivers?: Driver[];
  driverDirectory?: DriverDirectoryItem[];
  staff?: StaffMember[];
  vehicles?: VehicleItem[];
  records?: AttendanceRecords;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ReportsManagementView: FC<ReportsManagementViewProps> = ({
  currentUser,
  drivers = [],
  driverDirectory = [],
  staff = [],
  vehicles = [],
  records = {},
  onShowToast,
}) => {
  const isMaster = isMasterAdmin(currentUser);
  const today = getTodayJalaali();
  const [selectedYear, setSelectedYear] = useState<number>(today.jy);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.jm);
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  const handleExportDriverAttendance = () => {
    try {
      assertMasterAdminExcelPermission(currentUser, 'حضور و غیاب رانندگان');
      setExportingReportId('driver_attendance');
      exportToExcel(drivers, records, selectedYear, selectedMonth, currentUser);
      onShowToast(
        `گزارش اکسل حضور و غیاب رانندگان (${PERSIAN_MONTH_NAMES[selectedMonth - 1]} ${toFaDigits(selectedYear)}) صادر شد.`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setExportingReportId(null);
    }
  };

  const handleExportStaffAttendance = () => {
    try {
      assertMasterAdminExcelPermission(currentUser, 'حضور و غیاب پرسنل');
      setExportingReportId('staff_attendance');
      const staffList = staff.map((s) => ({
        id: s.id,
        name: s.fullName,
        code: s.personnelCode,
        role: s.roleTitle,
        department: s.department,
      }));
      exportStaffToExcel(staffList, records, selectedYear, selectedMonth, currentUser);
      onShowToast(
        `گزارش اکسل حضور و غیاب پرسنل (${PERSIAN_MONTH_NAMES[selectedMonth - 1]} ${toFaDigits(selectedYear)}) صادر شد.`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setExportingReportId(null);
    }
  };

  const handleExportFleet = () => {
    try {
      assertMasterAdminExcelPermission(currentUser, 'ناوگان و سرویس روغن');
      setExportingReportId('fleet');
      const data = vehicles.map((v, index) => ({
        ردیف: toFaDigits(index + 1),
        'کد شناسایی خودرو': v.code,
        پلاک: v.plate,
        'مدل خودرو': v.model,
        'راننده منتسب': v.assignedDriverName || 'بدون راننده',
        'کیلومتر فعلی': toFaDigits(v.currentKm),
        'کیلومتر آخرین تعویض روغن': toFaDigits(v.lastOilChangeKm),
        'کیلومتر سرویس بعدی': toFaDigits(v.nextOilChangeKm),
        'کیلومتر باقیمانده تا سرویس': toFaDigits(v.nextOilChangeKm - v.currentKm),
        'نوع روغن مصرفی': v.oilType || '۱۰W-۴۰',
        'تاریخ آخرین سرویس': v.lastServiceDate || '---',
        'وضعیت عملیاتی':
          v.status === 'ACTIVE'
            ? 'فعال در خط'
            : v.status === 'PARKED'
            ? 'پارکینگ'
            : v.status === 'IN_MAINTENANCE'
            ? 'تعمیرگاه'
            : 'غیرفعال',
        'اعتبار بیمه شخص ثالث': v.thirdPartyExpiry || '---',
        'اعتبار معاینه فنی': v.inspectionExpiry || '---',
        'اعتبار بیمه بدنه': v.insuranceExpiry || '---',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ناوگان_حامی');
      XLSX.writeFile(workbook, `گزارش_ناوگان_و_روغن_حامی_${Date.now()}.xlsx`);
      onShowToast('گزارش اکسل ناوگان و سرویس با موفقیت استخراج شد.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setExportingReportId(null);
    }
  };

  const handleExportDriversDirectory = () => {
    try {
      assertMasterAdminExcelPermission(currentUser, 'پرونده رانندگان');
      setExportingReportId('drivers');
      const list = driverDirectory.length > 0 ? driverDirectory : drivers.map((d, i) => ({
        id: d.id,
        name: d.name,
        personnelCode: d.personnelCode || String(100 + i),
        nationalCode: '---',
        phone: '---',
        vehicleCode: d.vehicleCode || '---',
        vehiclePlate: '---',
        status: 'active' as const,
        joinedDate: '---',
        rating: 5,
        totalTrips: 0,
        driverType: 'کامیونت' as const,
        assignedVehicles: [],
      }));

      const data = list.map((d, index) => ({
        ردیف: toFaDigits(index + 1),
        'نام و نام خانوادگی': d.name,
        'کد پرسنلی': d.personnelCode,
        'کد ملی': d.nationalCode || '---',
        'شماره تماس': d.phone || '---',
        'نوع راننده': d.driverType,
        'کد ناوگان منتسب': d.vehicleCode || '---',
        'وضعیت فعالیت': d.status === 'active' ? 'فعال' : 'غیرفعال',
        'امتیاز عملکرد': d.rating,
        'تعداد کل سفرها': d.totalTrips,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'رانندگان_حامی');
      XLSX.writeFile(workbook, `پرونده_رانندگان_حامی_${Date.now()}.xlsx`);
      onShowToast('گزارش اکسل رانندگان با موفقیت صادر گردید.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setExportingReportId(null);
    }
  };

  const handleExportStaffDirectory = () => {
    try {
      assertMasterAdminExcelPermission(currentUser, 'پرونده پرسنل');
      setExportingReportId('staff');
      const data = staff.map((s, index) => ({
        ردیف: toFaDigits(index + 1),
        'کد پرسنلی': s.personnelCode,
        'نام و نام خانوادگی': s.fullName,
        'کد ملی': s.nationalCode || '---',
        'شماره تماس': s.phoneNumber || '---',
        'واحد سازمانی': s.department,
        'سمت / نقش شغلی': s.roleTitle,
        'تاریخ استخدام': s.hireDate || '---',
        'شماره بیمه تامین اجتماعی': s.insuranceNumber || '---',
        'وضعیت فعالیت': s.status === 'inactive' ? 'غیرفعال' : 'فعال',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'پرسنل_حامی');
      XLSX.writeFile(workbook, `پرونده_پرسنل_حامی_${Date.now()}.xlsx`);
      onShowToast('گزارش اکسل پرونده پرسنل با موفقیت استخراج شد.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setExportingReportId(null);
    }
  };

  const handleExportAuditLogs = () => {
    try {
      assertMasterAdminExcelPermission(currentUser, 'دفتر وقایع امنیتی');
      setExportingReportId('audit_logs');
      const logs = getAuditLogs();
      exportAuditLogsToExcel(logs, currentUser);
      onShowToast(`گزارش اکسل وقایع امنیتی با موفقیت دریافت شد.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'خطا در صدور گزارش اکسل', 'error');
    } finally {
      setExportingReportId(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-black text-white">گزارش‌های مدیریتی و خروجی‌های اکسل (Excel)</h1>
            <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {APP_VERSION}
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            مرکز استخراج گزارش‌های رسمی سازمانی، حضور و غیاب، وضعیت فنی ناوگان و ردپای ممیزی با اعمال سیاست حفاظت اطلاعات.
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 bg-[#080d1a] border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="text-slate-400 text-[11px] block">سیاست امنیتی:</span>
            <span className="font-bold text-amber-300 text-xs">منحصر به نقش مدیر ارشد</span>
          </div>
        </div>
      </div>

      {/* Access Guard Warning for Non-Master Admin */}
      {!isMaster && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-5 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-rose-300">محدودیت دسترسی به گزارش‌های مدیریتی</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              بر اساس استاندارد حفاظتی سامانه، استخراج و دانلود گزارش‌های جامع اکسل منحصراً در اختیار حساب
              <strong> «مدیر ارشد» </strong> می‌باشد. جهت دسترسی به این فایل‌ها، با نام کاربری دارای مجوز ارشد وارد شوید.
            </p>
          </div>
        </div>
      )}

      {/* Date Filter Bar for Monthly Attendance */}
      <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-white">دوره زمانی گزارش‌های حضور و غیاب:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">سال:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-[#070d18] border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
          >
            {[1402, 1403, 1404, 1405].map((y) => (
              <option key={y} value={y}>
                {toFaDigits(y)}
              </option>
            ))}
          </select>

          <label className="text-slate-400 mr-2">ماه:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-[#070d18] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
          >
            {PERSIAN_MONTH_NAMES.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Driver Attendance Report */}
        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-xs">گزارش حضور و غیاب رانندگان</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                .XLSX
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              کارکرد روزانه، مرخصی‌ها، غیبت‌ها و روزهای تعمیرگاه رانندگان ناوگان در ماه {PERSIAN_MONTH_NAMES[selectedMonth - 1]}.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              شامل {toFaDigits(drivers.length)} راننده ثبت‌شده
            </span>
            <button
              type="button"
              disabled={!isMaster || exportingReportId === 'driver_attendance'}
              onClick={handleExportDriverAttendance}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {!isMaster ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>دریافت اکسل</span>
            </button>
          </div>
        </div>

        {/* 2. Staff Attendance Report */}
        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-xs">حضور و غیاب پرسنل اداری</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                .XLSX
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              تابلوی حضور، مرخصی و مأموریت کارکنان اداری، حسابداری، دیسپچ و ترابری.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              شامل {toFaDigits(staff.length)} پرسنل سازمانی
            </span>
            <button
              type="button"
              disabled={!isMaster || exportingReportId === 'staff_attendance'}
              onClick={handleExportStaffAttendance}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {!isMaster ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>دریافت اکسل</span>
            </button>
          </div>
        </div>

        {/* 3. Fleet & Oil Service Report */}
        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-xs">گزارش ناوگان و تعویض روغن</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                .XLSX
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              کیلومتر روزانه، فواصل تعویض روغن، وضعیت معاینه فنی، انقضای بیمه‌نامه‌ها و وضعیت سرویس.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              شامل {toFaDigits(vehicles.length)} خودرو فعال
            </span>
            <button
              type="button"
              disabled={!isMaster || exportingReportId === 'fleet'}
              onClick={handleExportFleet}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {!isMaster ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>دریافت اکسل</span>
            </button>
          </div>
        </div>

        {/* 4. Drivers Directory Dossier */}
        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-xs">پرونده جامع رانندگان</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                .XLSX
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              کد ملی، شماره تماس، کد پرسنلی، سابقه سفرها، خودروهای تخصیص‌یافته و وضعیت فعالیت.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">بانک اطلاعات رانندگان</span>
            <button
              type="button"
              disabled={!isMaster || exportingReportId === 'drivers'}
              onClick={handleExportDriversDirectory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {!isMaster ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>دریافت اکسل</span>
            </button>
          </div>
        </div>

        {/* 5. Staff Personnel Dossier */}
        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-xs">پرونده اداری پرسنل</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                .XLSX
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              مشخصات پرسنلی، تاریخ استخدام، واحد سازمانی، سمت شغلی و وضعیت بیمه کارکنان.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">بانک اطلاعات پرسنلی</span>
            <button
              type="button"
              disabled={!isMaster || exportingReportId === 'staff'}
              onClick={handleExportStaffDirectory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {!isMaster ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>دریافت اکسل</span>
            </button>
          </div>
        </div>

        {/* 6. Audit Trail & Security Logs */}
        <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-xs">دفتر وقایع و لاگ‌های امنیتی</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                .XLSX
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              ردپای ممیزی، تغییرات دسترسی، لاگین‌ها، دستکاری رکوردها و هشدارهای امنیتی با جزئیات کامل.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">ممیزی امنیتی</span>
            <button
              type="button"
              disabled={!isMaster || exportingReportId === 'audit_logs'}
              onClick={handleExportAuditLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              {!isMaster ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>دریافت اکسل</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
