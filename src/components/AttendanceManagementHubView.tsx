import React, { FC, useState, useMemo } from 'react';
import {
  Users,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserX,
  Sparkles,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Printer,
  Plus,
  Moon,
  Sun,
  Sunrise,
  Layers,
  BarChart3,
  Edit,
  ShieldCheck,
  Check,
  Phone,
  Briefcase,
  SlidersHorizontal,
  X,
  Compass,
  Wrench,
  Activity,
  UserCheck,
  Trash2,
  Power,
  UserPlus,
  UserCog,
  Ban,
  Shield,
  CreditCard,
  Hash,
  Database,
  FileText,
  StickyNote,
} from 'lucide-react';
import { Driver, AttendanceRecords, AttendanceStatus, StaffMember, AttendanceNotes } from '../types';
import {
  toFaDigits,
  getTodayJalaali,
  getMonthDaysCount,
  getPersianWeekday,
  formatPersianDateKey,
  PERSIAN_MONTH_NAMES,
  isDateBeforeStart,
} from '../utils/jalaali';
import { IranianPlate } from './IranianPlate';
import { exportToExcel, exportStaffToExcel } from '../utils/excelExport';
import { STAFF_DEPARTMENTS, StaffDepartment } from '../utils/staffSeedData';
import { VehicleItem, VEHICLE_TYPE_NAMES, DriverDirectoryItem } from '../utils/fleetSeedData';
import { AttendanceSheetPrintModal, AttendancePrintItem } from './AttendanceSheetPrintModal';
import { LeaveCalendarPrintModal, LeaveCalendarBoardMode } from './LeaveCalendarPrintModal';

interface AttendanceManagementHubViewProps {
  drivers: Driver[];
  driverRecords: AttendanceRecords;
  staffMembers: StaffMember[];
  staffRecords: AttendanceRecords;
  vehicles?: VehicleItem[];
  driverDirectory?: DriverDirectoryItem[];
  attendanceNotes?: AttendanceNotes;
  onUpdateAttendanceNote?: (personId: string, dateKey: string, noteText: string) => void;
  onAssignDriverToVehicle?: (vehicleId: string, driverNameOrNone: string, driverPhone?: string) => void;
  onAssignVehicleToDriver?: (driverId: string, vehiclePlateOrNone: string) => void;
  onNavigateToVehicleAssignment?: () => void;
  onNavigateToDriversDirectory?: () => void;
  onNavigateToStaffDirectory?: () => void;
  onUpdateDriverStatus: (driverId: string, dateKey: string, status: AttendanceStatus) => void;
  onUpdateStaffStatus: (staffId: string, dateKey: string, status: AttendanceStatus) => void;
  onAddDriver: () => void;
  onAddDriverDirect?: (newDriver: Omit<Driver, 'id'>) => void;
  onUpdateDriver?: (updatedDriver: Driver) => void;
  onDeleteDriver?: (driverId: string) => void;
  onToggleDriverActive?: (driverId: string) => void;
  onAddStaffMember: (newStaff: StaffMember) => void;
  onUpdateStaffMember: (updatedStaff: StaffMember) => void;
  onDeleteStaffMember?: (staffId: string) => void;
  onToggleStaffActive?: (staffId: string) => void;
  onOpenBackup?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type BoardType = 'DRIVERS' | 'STAFF';
type ViewMode = 'CARDS' | 'MATRIX' | 'ANALYTICS';
type FilterStatus = 'ALL' | 'PRESENT' | 'LEAVE' | 'WORKSHOP' | 'ABSENT';
type FilterShift = 'ALL' | 'DAY' | 'NIGHT' | 'MORNING' | 'EVENING';
type AccountStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type FilterVehicle = 'ALL' | 'WITH_VEHICLE' | 'WITHOUT_VEHICLE';

export const AttendanceManagementHubView: FC<AttendanceManagementHubViewProps> = ({
  drivers,
  driverRecords,
  staffMembers,
  staffRecords,
  vehicles = [],
  driverDirectory = [],
  attendanceNotes = {},
  onUpdateAttendanceNote,
  onNavigateToVehicleAssignment,
  onNavigateToDriversDirectory,
  onNavigateToStaffDirectory,
  onUpdateDriverStatus,
  onUpdateStaffStatus,
  onAddDriver,
  onAddDriverDirect,
  onUpdateDriver,
  onDeleteDriver,
  onToggleDriverActive,
  onAddStaffMember,
  onUpdateStaffMember,
  onDeleteStaffMember,
  onToggleStaffActive,
  onOpenBackup,
  onShowToast,
}) => {
  const today = useMemo(() => getTodayJalaali(), []);

  // Board selection: Drivers vs Staff
  const [activeBoard, setActiveBoard] = useState<BoardType>('DRIVERS');

  // Sub-view: Cards vs Monthly Matrix vs Analytics
  const [viewMode, setViewMode] = useState<ViewMode>('CARDS');

  // Selected date for daily roll-call cards
  const [selectedYear, setSelectedYear] = useState<number>(today.jy);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.jm);
  const [selectedDay, setSelectedDay] = useState<number>(today.jd);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [accountStatusFilter, setAccountStatusFilter] = useState<AccountStatusFilter>('ACTIVE');
  const [vehicleFilter, setVehicleFilter] = useState<FilterVehicle>('ALL');
  const [shiftFilter, setShiftFilter] = useState<FilterShift>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Animation feedback states for smooth status changes
  const [animatingPersonId, setAnimatingPersonId] = useState<string | null>(null);
  const [animatingCellKey, setAnimatingCellKey] = useState<string | null>(null);

  // Modal states for roll-call editing
  const [editingPerson, setEditingPerson] = useState<{
    type: 'driver' | 'staff';
    id: string;
    name: string;
    code: string;
    entryTime?: string;
    exitTime?: string;
    missionsCount?: number;
    notes?: string;
    phone?: string;
    status: AttendanceStatus;
  } | null>(null);

  // Active Date Key for the selected day
  const activeDateKey = useMemo(() => {
    return formatPersianDateKey(selectedYear, selectedMonth, selectedDay);
  }, [selectedYear, selectedMonth, selectedDay]);

  const daysInCurrentMonth = useMemo(() => {
    return getMonthDaysCount(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const activeWeekdayName = useMemo(() => {
    return getPersianWeekday(selectedYear, selectedMonth, selectedDay);
  }, [selectedYear, selectedMonth, selectedDay]);

  // Check if currently selected date is in the future
  const isFutureActiveDate = useMemo(() => {
    if (selectedYear > today.jy) return true;
    if (selectedYear === today.jy && selectedMonth > today.jm) return true;
    if (selectedYear === today.jy && selectedMonth === today.jm && selectedDay > today.jd) return true;
    return false;
  }, [selectedYear, selectedMonth, selectedDay, today]);

  // Helper to determine if a specific day of the selected month/year is in the future
  const isDayInFuture = (day: number) => {
    if (selectedYear > today.jy) return true;
    if (selectedYear === today.jy && selectedMonth > today.jm) return true;
    if (selectedYear === today.jy && selectedMonth === today.jm && day > today.jd) return true;
    return false;
  };

  // Navigate Days
  const handlePrevDay = () => {
    if (selectedDay > 1) {
      setSelectedDay((prev) => prev - 1);
    } else {
      if (selectedMonth > 1) {
        const prevMonth = selectedMonth - 1;
        const prevMonthDays = getMonthDaysCount(selectedYear, prevMonth);
        setSelectedMonth(prevMonth);
        setSelectedDay(prevMonthDays);
      } else {
        const prevYear = selectedYear - 1;
        setSelectedYear(prevYear);
        setSelectedMonth(12);
        setSelectedDay(getMonthDaysCount(prevYear, 12));
      }
    }
  };

  const handleNextDay = () => {
    if (selectedDay < daysInCurrentMonth) {
      setSelectedDay((prev) => prev + 1);
    } else {
      if (selectedMonth < 12) {
        setSelectedMonth((prev) => prev + 1);
        setSelectedDay(1);
      } else {
        setSelectedYear((prev) => prev + 1);
        setSelectedMonth(1);
        setSelectedDay(1);
      }
    }
  };

  const handleResetToToday = () => {
    setSelectedYear(today.jy);
    setSelectedMonth(today.jm);
    setSelectedDay(today.jd);
    onShowToast('تاریخ روی امروز تنظیم شد', 'info');
  };

  // Helper to resolve start / creation date of driver or staff
  const getPersonStartDate = (person: Driver | StaffMember): string | undefined => {
    if ('hireDate' in person && (person as StaffMember).hireDate) {
      return (person as StaffMember).hireDate;
    }
    if (person.createdAt) {
      return person.createdAt;
    }
    if (driverDirectory && driverDirectory.length > 0) {
      const dir = driverDirectory.find(
        (d) => d.id === person.id || (d.name && person.name && d.name.trim() === person.name.trim())
      );
      if (dir?.joinedDate) return dir.joinedDate;
    }
    return undefined;
  };

  // Helper to normalize status
  const getStatus = (records: AttendanceRecords, id: string, dateKey: string): AttendanceStatus => {
    const raw = records[id]?.[dateKey];
    if (!raw || raw === 'none') return 'none';
    if (raw === 'م' || raw === 'leave') return 'leave';
    if (raw === 'ت' || raw === 'workshop') return 'workshop';
    if (raw === 'absent') return 'absent';
    return 'none';
  };

  // Day Note Modal State (Right-click on any day in Matrix or click in Cards)
  const [dayNoteModal, setDayNoteModal] = useState<{
    isOpen: boolean;
    personId: string;
    personName: string;
    personCode: string;
    day: number;
    month: number;
    year: number;
    dateKey: string;
    initialNote: string;
    isStaff: boolean;
  } | null>(null);
  const [dayNoteInput, setDayNoteInput] = useState('');

  const handleOpenDayNote = (
    person: Driver | StaffMember,
    day: number,
    dateKey: string
  ) => {
    const existing = attendanceNotes?.[person.id]?.[dateKey] || '';
    setDayNoteInput(existing);
    setDayNoteModal({
      isOpen: true,
      personId: person.id,
      personName: person.name,
      personCode: person.code,
      day,
      month: selectedMonth,
      year: selectedYear,
      dateKey,
      initialNote: existing,
      isStaff: activeBoard === 'STAFF',
    });
  };

  const handleSaveDayNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayNoteModal) return;
    if (onUpdateAttendanceNote) {
      onUpdateAttendanceNote(dayNoteModal.personId, dayNoteModal.dateKey, dayNoteInput);
    }
    if (dayNoteInput.trim()) {
      onShowToast(
        `نوت روز ${toFaDigits(dayNoteModal.day)} ${PERSIAN_MONTH_NAMES[dayNoteModal.month - 1]} برای «${dayNoteModal.personName}» ثبت شد.`,
        'success'
      );
    } else {
      onShowToast(`نوت روز ${toFaDigits(dayNoteModal.day)} حذف گردید.`, 'info');
    }
    setDayNoteModal(null);
  };

  const handleDeleteDayNote = () => {
    if (!dayNoteModal) return;
    if (onUpdateAttendanceNote) {
      onUpdateAttendanceNote(dayNoteModal.personId, dayNoteModal.dateKey, '');
    }
    onShowToast(`نوت روز ${toFaDigits(dayNoteModal.day)} پاک شد.`, 'info');
    setDayNoteModal(null);
  };

  // Drivers Statistics for the active day (do NOT mark unrecorded future days or days before creation as present)
  const driversStats = useMemo(() => {
    let present = 0;
    let leave = 0;
    let workshop = 0;
    let absent = 0;
    let beforeCreation = 0;

    drivers.forEach((d) => {
      // If the selected date is before the driver's creation/hire date, do not mark or count as present
      const startDate = getPersonStartDate(d);
      const isBeforeStart = isDateBeforeStart(startDate, selectedYear, selectedMonth, selectedDay);
      if (isBeforeStart) {
        beforeCreation++;
        return;
      }

      const st = getStatus(driverRecords, d.id, activeDateKey);
      if (st === 'none') {
        if (!isFutureActiveDate) present++;
      } else if (st === 'leave') leave++;
      else if (st === 'workshop') workshop++;
      else if (st === 'absent') absent++;
    });

    const total = drivers.length;
    const active = present;
    const eligibleCount = Math.max(1, total - beforeCreation);
    const rate = eligibleCount > 0 ? (isFutureActiveDate ? 0 : Math.round((active / eligibleCount) * 100)) : 100;

    return { total, present, leave, workshop, absent, active, rate, isFuture: isFutureActiveDate, beforeCreation };
  }, [drivers, driverRecords, activeDateKey, isFutureActiveDate, selectedYear, selectedMonth, selectedDay, driverDirectory]);

  // Staff Statistics for the active day (do NOT mark unrecorded future days or days before creation as present)
  const staffStats = useMemo(() => {
    let present = 0;
    let leave = 0;
    let workshop = 0;
    let absent = 0;
    let beforeCreation = 0;

    staffMembers.forEach((s) => {
      // If the selected date is before staff hire/creation date, do not mark or count as present
      const startDate = getPersonStartDate(s);
      const isBeforeStart = isDateBeforeStart(startDate, selectedYear, selectedMonth, selectedDay);
      if (isBeforeStart) {
        beforeCreation++;
        return;
      }

      const st = getStatus(staffRecords, s.id, activeDateKey);
      if (st === 'none') {
        if (!isFutureActiveDate) present++;
      } else if (st === 'leave') leave++;
      else if (st === 'workshop') workshop++;
      else if (st === 'absent') absent++;
    });

    const total = staffMembers.length;
    const active = present;
    const eligibleCount = Math.max(1, total - beforeCreation);
    const rate = eligibleCount > 0 ? (isFutureActiveDate ? 0 : Math.round((active / eligibleCount) * 100)) : 100;

    return { total, present, leave, workshop, absent, active, rate, isFuture: isFutureActiveDate, beforeCreation };
  }, [staffMembers, staffRecords, activeDateKey, isFutureActiveDate, selectedYear, selectedMonth, selectedDay]);

  // Current Board Stats
  const currentStats = activeBoard === 'DRIVERS' ? driversStats : staffStats;

  // Normalize Persian/Arabic characters for reliable driver-vehicle matching
  const normalizeName = (name?: string | null): string =>
    (name || '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\s+/g, ' ')
      .trim();

  const isValidAssignedName = (name?: string | null): boolean => {
    const n = normalizeName(name);
    return Boolean(n && n !== 'بدون راننده' && n !== 'NONE' && n !== 'بدون خودرو' && n !== 'نامشخص' && n !== '---');
  };

  // Live resolver: determines a driver's assigned vehicle directly from `vehicles` (or fallback `driver.vehiclePlate`)
  const getDriverVehicleInfo = useMemo(() => {
    return (driver: Driver): {
      hasVehicle: boolean;
      vehicle?: VehicleItem;
      plate: string;
      vehicleCode: string;
      vehicleTypeName: string;
    } => {
      const normDriverName = normalizeName(driver.name);
      if (vehicles && vehicles.length > 0) {
        const matchedByDriverName = vehicles.find(
          (v) => isValidAssignedName(v.driverName) && normalizeName(v.driverName) === normDriverName
        );
        if (matchedByDriverName) {
          return {
            hasVehicle: true,
            vehicle: matchedByDriverName,
            plate: matchedByDriverName.plateNumber,
            vehicleCode: String(matchedByDriverName.code),
            vehicleTypeName:
              VEHICLE_TYPE_NAMES[matchedByDriverName.vehicleType] || matchedByDriverName.vehicleType || '',
          };
        }
        // If `vehicles` is populated and no vehicle has this driver's name, check if driver has a custom plate not in fleet
        const rawPlate = (driver.vehiclePlate || '').trim();
        const isValidPlate =
          Boolean(rawPlate) && rawPlate !== 'بدون خودرو' && rawPlate !== 'NONE' && rawPlate !== 'بدون راننده';
        if (isValidPlate) {
          const fleetCarWithPlate = vehicles.find((v) => v.plateNumber === rawPlate);
          // Only count it if that fleet car isn't explicitly unassigned or assigned to someone else
          if (!fleetCarWithPlate) {
            return {
              hasVehicle: true,
              plate: rawPlate,
              vehicleCode: driver.code || driver.personnelCode || '',
              vehicleTypeName: '',
            };
          }
        }
        return {
          hasVehicle: false,
          plate: '',
          vehicleCode: '',
          vehicleTypeName: '',
        };
      }

      // Fallback when `vehicles` prop is empty
      const rawPlate = (driver.vehiclePlate || '').trim();
      const hasPlate =
        Boolean(rawPlate) && rawPlate !== 'بدون خودرو' && rawPlate !== 'NONE' && rawPlate !== 'بدون راننده';
      return {
        hasVehicle: hasPlate,
        plate: hasPlate ? rawPlate : '',
        vehicleCode: hasPlate ? driver.code || driver.personnelCode || '' : '',
        vehicleTypeName: '',
      };
    };
  }, [vehicles]);

  // Active & Inactive Headcounts & Vehicle Assignment Counts
  const activeDriversCount = useMemo(() => drivers.filter((d) => d.status !== 'inactive').length, [drivers]);
  const inactiveDriversCount = useMemo(() => drivers.filter((d) => d.status === 'inactive').length, [drivers]);
  const driversWithVehicleCount = useMemo(
    () => drivers.filter((d) => d.status !== 'inactive' && getDriverVehicleInfo(d).hasVehicle).length,
    [drivers, getDriverVehicleInfo]
  );
  const driversWithoutVehicleCount = useMemo(
    () => drivers.filter((d) => d.status !== 'inactive' && !getDriverVehicleInfo(d).hasVehicle).length,
    [drivers, getDriverVehicleInfo]
  );
  const activeStaffCount = useMemo(() => staffMembers.filter((s) => s.status !== 'inactive').length, [staffMembers]);
  const inactiveStaffCount = useMemo(() => staffMembers.filter((s) => s.status === 'inactive').length, [staffMembers]);

  // Filtered Drivers:
  // قانون محوری: هر راننده‌ای که در لیست رانندگان غیرفعال نشده در تابلو مرخصی است
  // ترتیب نمایش: اول رانندگان دارای خودرو (مرتب بر اساس کد خودرو)، سپس رانندگان بدون خودرو
  const filteredDrivers = useMemo(() => {
    return drivers
      .filter((driver) => {
        const q = searchQuery.trim().toLowerCase();
        const vInfo = getDriverVehicleInfo(driver);
        const hasVehicle = vInfo.hasVehicle;

        const matchesSearch =
          !q ||
          driver.name.toLowerCase().includes(q) ||
          (vInfo.vehicleCode && vInfo.vehicleCode.toLowerCase().includes(q)) ||
          (driver.code && driver.code.toLowerCase().includes(q)) ||
          (driver.personnelCode && driver.personnelCode.toLowerCase().includes(q)) ||
          (vInfo.plate && vInfo.plate.toLowerCase().includes(q)) ||
          (driver.phone && driver.phone.includes(q)) ||
          (!hasVehicle && ('بدون خودرو'.includes(q) || 'ذخیره'.includes(q) || 'کمکی'.includes(q)));

        if (!matchesSearch) return false;

        // Account Status Filter:
        if (accountStatusFilter === 'INACTIVE') {
          if (driver.status !== 'inactive') return false;
        } else {
          if (driver.status === 'inactive') return false;
        }

        // Optional Vehicle Assignment Filter
        if (vehicleFilter === 'WITH_VEHICLE' && !hasVehicle) return false;
        if (vehicleFilter === 'WITHOUT_VEHICLE' && hasVehicle) return false;

        const isBeforeStart = isDateBeforeStart(driver.createdAt, selectedYear, selectedMonth, selectedDay);
        const st = getStatus(driverRecords, driver.id, activeDateKey);

        if (statusFilter === 'PRESENT') {
          if (isBeforeStart || isFutureActiveDate || st !== 'none') return false;
        }
        if (statusFilter === 'LEAVE' && st !== 'leave') return false;
        if (statusFilter === 'WORKSHOP' && st !== 'workshop') return false;
        if (statusFilter === 'ABSENT' && st !== 'absent') return false;

        return true;
      })
      .sort((a, b) => {
        // ۱. ترتیب اصلی: اول رانندگان دارای خودرو، سپس رانندگان بدون خودرو
        const infoA = getDriverVehicleInfo(a);
        const infoB = getDriverVehicleInfo(b);

        if (infoA.hasVehicle && !infoB.hasVehicle) return -1;
        if (!infoA.hasVehicle && infoB.hasVehicle) return 1;

        // ۲. اگر هر دو دارای خودرو هستند: بر اساس کد خودروی تخصیص‌یافته مرتب شوند
        if (infoA.hasVehicle && infoB.hasVehicle) {
          const vCodeA = parseInt(infoA.vehicleCode || a.code || '9999', 10);
          const vCodeB = parseInt(infoB.vehicleCode || b.code || '9999', 10);
          if (!isNaN(vCodeA) && !isNaN(vCodeB) && vCodeA !== vCodeB) {
            return vCodeA - vCodeB;
          }
        }

        // ۳. مرتب‌سازی فرعی: بر اساس کد پرسنلی یا نام
        const codeA = parseInt(a.personnelCode || a.code || '9999', 10);
        const codeB = parseInt(b.personnelCode || b.code || '9999', 10);
        if (!isNaN(codeA) && !isNaN(codeB) && codeA !== codeB) {
          return codeA - codeB;
        }
        return a.name.localeCompare(b.name, 'fa');
      });
  }, [
    drivers,
    driverRecords,
    getDriverVehicleInfo,
    activeDateKey,
    searchQuery,
    statusFilter,
    accountStatusFilter,
    vehicleFilter,
    selectedYear,
    selectedMonth,
    selectedDay,
    isFutureActiveDate,
  ]);

  // Filtered Staff Members
  const filteredStaff = useMemo(() => {
    return staffMembers.filter((staff) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        staff.name.toLowerCase().includes(q) ||
        staff.code.toLowerCase().includes(q) ||
        staff.role.toLowerCase().includes(q) ||
        staff.department.toLowerCase().includes(q) ||
        (staff.phone && staff.phone.includes(q));

      if (!matchesSearch) return false;

      // Account Status Filter (active / inactive)
      if (accountStatusFilter === 'ACTIVE' && staff.status === 'inactive') return false;
      if (accountStatusFilter === 'INACTIVE' && staff.status !== 'inactive') return false;

      const isBeforeStart = isDateBeforeStart(staff.hireDate || staff.createdAt, selectedYear, selectedMonth, selectedDay);
      const st = getStatus(staffRecords, staff.id, activeDateKey);

      if (statusFilter === 'PRESENT') {
        if (isBeforeStart || isFutureActiveDate || st !== 'none') return false;
      }
      if (statusFilter === 'LEAVE' && st !== 'leave') return false;
      if (statusFilter === 'WORKSHOP' && st !== 'workshop') return false;
      if (statusFilter === 'ABSENT' && st !== 'absent') return false;

      if (shiftFilter !== 'ALL') {
        const staffShift = staff.shift?.toLowerCase();
        if (shiftFilter === 'DAY' && staffShift !== 'day' && staffShift !== 'morning' && staffShift !== 'evening') return false;
        if (shiftFilter === 'NIGHT' && staffShift !== 'night') return false;
        if (shiftFilter === 'MORNING' && staffShift !== 'morning' && staffShift !== 'day') return false;
        if (shiftFilter === 'EVENING' && staffShift !== 'evening' && staffShift !== 'day') return false;
      }

      if (departmentFilter !== 'ALL' && staff.department !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [staffMembers, staffRecords, activeDateKey, searchQuery, statusFilter, shiftFilter, departmentFilter, accountStatusFilter, selectedYear, selectedMonth, selectedDay, isFutureActiveDate]);

  // Quick 1-click status setter for driver
  const handleQuickSetDriver = (driverId: string, status: AttendanceStatus) => {
    setAnimatingPersonId(driverId);
    setTimeout(() => {
      setAnimatingPersonId((prev) => (prev === driverId ? null : prev));
    }, 400);

    onUpdateDriverStatus(driverId, activeDateKey, status);
    const label =
      status === 'none'
        ? 'حاضر'
        : status === 'leave'
        ? 'مرخصی'
        : status === 'workshop'
        ? 'تعمیرگاه / استراحت'
        : 'غایب';
    onShowToast(`وضعیت راننده به «${label}» به‌روزرسانی شد`, 'success');
  };

  // Quick 1-click status setter for staff
  const handleQuickSetStaff = (staffId: string, status: AttendanceStatus) => {
    setAnimatingPersonId(staffId);
    setTimeout(() => {
      setAnimatingPersonId((prev) => (prev === staffId ? null : prev));
    }, 400);

    onUpdateStaffStatus(staffId, activeDateKey, status);
    const label =
      status === 'none'
        ? 'حاضر'
        : status === 'leave'
        ? 'مرخصی'
        : status === 'workshop'
        ? 'استراحت / شیفت بعد'
        : 'غایب';
    onShowToast(`وضعیت پرسنل به «${label}» به‌روزرسانی شد`, 'success');
  };

  // Mark all present in currently active board
  const handleMarkAllPresent = () => {
    if (activeBoard === 'DRIVERS') {
      filteredDrivers.forEach((d) => {
        onUpdateDriverStatus(d.id, activeDateKey, 'none');
      });
      onShowToast(`تمامی ${toFaDigits(filteredDrivers.length)} راننده به عنوان «حاضر» ثبت شدند`, 'success');
    } else {
      filteredStaff.forEach((s) => {
        onUpdateStaffStatus(s.id, activeDateKey, 'none');
      });
      onShowToast(`تمامی ${toFaDigits(filteredStaff.length)} پرسنل به عنوان «حاضر» ثبت شدند`, 'success');
    }
  };

  // Export Excel
  const handleExport = () => {
    if (activeBoard === 'DRIVERS') {
      exportToExcel(drivers, driverRecords, selectedYear, selectedMonth);
      onShowToast('فایل اکسل حضور و غیاب رانندگان با موفقیت دریافت شد', 'success');
    } else {
      exportStaffToExcel(staffMembers, staffRecords, selectedYear, selectedMonth);
      onShowToast('فایل اکسل حضور و غیاب پرسنل با موفقیت دریافت شد', 'success');
    }
  };

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [leaveCalendarPrintMode, setLeaveCalendarPrintMode] = useState<LeaveCalendarBoardMode | null>(null);

  // Print roll-call sheet (Laser Printer Optimized)
  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  // Save detailed edit person (roll-call daily times, missions, notes)
  const handleSavePersonEdit = () => {
    if (!editingPerson) return;
    if (editingPerson.type === 'driver') {
      onUpdateDriverStatus(editingPerson.id, activeDateKey, editingPerson.status);
    } else {
      onUpdateStaffStatus(editingPerson.id, activeDateKey, editingPerson.status);
      const targetStaff = staffMembers.find((s) => s.id === editingPerson.id);
      if (targetStaff) {
        onUpdateStaffMember({
          ...targetStaff,
          entryTime: editingPerson.entryTime,
          exitTime: editingPerson.exitTime,
          missionsCountToday: editingPerson.missionsCount,
          notes: editingPerson.notes,
          phone: editingPerson.phone,
        });
      }
    }
    onShowToast('تغییرات با موفقیت ذخیره شد', 'success');
    setEditingPerson(null);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. COMPACT & CLEAN TOP HEADER BAR */}
      <div className="bg-[#0d172c] border border-[#22365e] rounded-2xl p-3.5 sm:p-4 shadow-lg">
        {/* Row 1: Board Switcher + Date Navigator */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Board Switcher (Drivers vs Staff) */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex p-1 bg-[#09101f] border border-[#1d2d4c] rounded-xl">
              <button
                onClick={() => setActiveBoard('DRIVERS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeBoard === 'DRIVERS'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>رانندگان ({toFaDigits(activeDriversCount)})</span>
              </button>

              <button
                onClick={() => setActiveBoard('STAFF')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeBoard === 'STAFF'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>پرسنل ({toFaDigits(activeStaffCount)})</span>
              </button>
            </div>

            {/* Compact Date Navigator */}
            <div className="flex items-center gap-1 bg-[#09101f] border border-[#1d2d4c] p-1 rounded-xl">
              <button
                onClick={handlePrevDay}
                title="روز قبل"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  {activeWeekdayName} {toFaDigits(selectedDay)} {PERSIAN_MONTH_NAMES[selectedMonth - 1]}{' '}
                  {toFaDigits(selectedYear)}
                </span>
              </div>

              <button
                onClick={handleNextDay}
                title="روز بعد"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {(selectedYear !== today.jy || selectedMonth !== today.jm || selectedDay !== today.jd) && (
                <button
                  onClick={handleResetToToday}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                >
                  امروز
                </button>
              )}
            </div>
          </div>

          {/* Essential Quick Actions */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={handleMarkAllPresent}
              title="ثبت حضور تمام افراد با یک کلیک"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>حضور همه</span>
            </button>

            <button
              onClick={() => setLeaveCalendarPrintMode(activeBoard)}
              title="چاپ فرم تقویم ماهانه مرخصی (A4)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#142340] hover:bg-[#1a2d52] text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>چاپ تقویم مرخصی</span>
            </button>

            <button
              onClick={handlePrint}
              title="چاپ برگه حضور و غیاب روزانه"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#142340] hover:bg-[#1a2d52] text-slate-200 border border-[#273d6b] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">چاپ روزانه</span>
            </button>

            <button
              onClick={handleExport}
              title="دریافت فایل اکسل"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#142340] hover:bg-[#1a2d52] text-slate-200 border border-[#273d6b] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">اکسل</span>
            </button>

            {activeBoard === 'DRIVERS' ? (
              onNavigateToDriversDirectory && (
                <button
                  onClick={onNavigateToDriversDirectory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors cursor-pointer"
                  title="ورود به پرونده و بانک اطلاعات رانندگان (بخش تخصصی ثبت و ویرایش رانندگان)"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>بانک اطلاعات رانندگان (ثبت و ویرایش) ←</span>
                </button>
              )
            ) : (
              onNavigateToStaffDirectory && (
                <button
                  onClick={onNavigateToStaffDirectory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
                  title="ورود به پرونده و بانک اطلاعات پرسنل (بخش تخصصی ثبت و ویرایش پرسنل)"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>بانک اطلاعات پرسنل (ثبت و ویرایش) ←</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPIS GRID (Clean 5-Metric Executive Dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Total Headcount */}
        <div className="bg-[#101b33] border border-[#1e2f52] rounded-xl p-3 shadow-md hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>کل {activeBoard === 'DRIVERS' ? 'رانندگان' : 'پرسنل'}</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1.5">
            {toFaDigits(currentStats.total)}
            <span className="text-xs text-slate-400 font-normal mr-1">نفر</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">ناوگان رسمی و ستاد حامی</div>
        </div>

        {/* KPI 2: Present on Shift */}
        <div className="bg-[#101b33] border border-emerald-500/30 rounded-xl p-3 shadow-md hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>حاضر و فعال</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1.5">
            {toFaDigits(currentStats.present)}
            <span className="text-xs text-emerald-400/80 font-normal mr-1">
              ({toFaDigits(Math.round((currentStats.present / Math.max(1, currentStats.total)) * 100))}%)
            </span>
          </div>
          <div className="text-[10px] text-emerald-400/70 mt-1">آماده دریافت دستور کار</div>
        </div>

        {/* KPI 3: On Leave */}
        <div className="bg-[#101b33] border border-amber-500/30 rounded-xl p-3 shadow-md hover:border-amber-500/50 transition-colors">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>مرخصی</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1.5">
            {toFaDigits(currentStats.leave)}
            <span className="text-xs text-amber-400/80 font-normal mr-1">نفر</span>
          </div>
          <div className="text-[10px] text-amber-400/70 mt-1">استحقاقی یا استعلاجی</div>
        </div>

        {/* KPI 4: Workshop / Rest */}
        <div className="bg-[#101b33] border border-orange-500/30 rounded-xl p-3 shadow-md hover:border-orange-500/50 transition-colors">
          <div className="flex items-center justify-between text-orange-400 text-xs font-medium">
            <span>{activeBoard === 'DRIVERS' ? 'تعمیرگاه / نقص' : 'استراحت / شیفت بعد'}</span>
            <Wrench className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-300 mt-1.5">
            {toFaDigits(currentStats.workshop)}
            <span className="text-xs text-orange-400/80 font-normal mr-1">نفر</span>
          </div>
          <div className="text-[10px] text-orange-400/70 mt-1">غیرآماده برای اعزام</div>
        </div>

        {/* KPI 5: Overall Attendance Rate % */}
        <div className="bg-[#101b33] border border-indigo-500/30 rounded-xl p-3 shadow-md hover:border-indigo-500/50 transition-colors">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-medium">
            <span>ضریب حضور شیفت</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-1.5 flex items-baseline gap-1">
            <span>{toFaDigits(currentStats.rate)}%</span>
            <span className="text-[10px] text-emerald-400 font-normal">
              {currentStats.rate >= 85 ? 'مطلوب' : 'متوسط'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                currentStats.rate >= 85
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : currentStats.rate >= 65
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${currentStats.rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. SUB-VIEW MODE TOGGLE & ADVANCED FILTER CONTROLS */}
      <div className="bg-[#0f192e] border border-[#1e2f52] rounded-xl p-3 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: View Modes (Cards vs Monthly Matrix vs Analytics) */}
        <div className="inline-flex p-1 bg-[#091120] border border-[#1b2b48] rounded-lg self-start">
          <button
            onClick={() => setViewMode('CARDS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'CARDS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>کارت‌های شیفت و عملکرد</span>
          </button>

          <button
            onClick={() => setViewMode('MATRIX')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'MATRIX'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>ماتریس روزشمار ماه ({PERSIAN_MONTH_NAMES[selectedMonth - 1]})</span>
          </button>

          <button
            onClick={() => setViewMode('ANALYTICS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'ANALYTICS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>تحلیل آماری و رتبه‌بندی</span>
          </button>
        </div>

        {/* Right: Search Input */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeBoard === 'DRIVERS'
                  ? 'جستجوی نام راننده، کد پرسنلی، پلاک خودرو...'
                  : 'جستجوی نام پرسنل، کد پرسنلی، واحد، سمت...'
              }
              className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg pr-9 pl-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER PILLS (Status & Shifts & Department) */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium">
          <Filter className="w-3 h-3 text-blue-400" />
          فیلتر وضعیت:
        </span>

        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            statusFilter === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-[#121d33] text-slate-400 hover:text-white border border-[#1f2e4d]'
          }`}
        >
          همه ({activeBoard === 'DRIVERS' ? toFaDigits(drivers.length) : toFaDigits(staffMembers.length)})
        </button>

        <button
          onClick={() => setStatusFilter('PRESENT')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            statusFilter === 'PRESENT'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#121d33] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
          }`}
        >
          حاضر ({toFaDigits(currentStats.present)})
        </button>

        <button
          onClick={() => setStatusFilter('LEAVE')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            statusFilter === 'LEAVE'
              ? 'bg-amber-600 text-white'
              : 'bg-[#121d33] text-amber-400 hover:text-amber-300 border border-amber-500/30'
          }`}
        >
          مرخصی ({toFaDigits(currentStats.leave)})
        </button>

        <button
          onClick={() => setStatusFilter('WORKSHOP')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            statusFilter === 'WORKSHOP'
              ? 'bg-orange-600 text-white'
              : 'bg-[#121d33] text-orange-400 hover:text-orange-300 border border-orange-500/30'
          }`}
        >
          {activeBoard === 'DRIVERS' ? 'تعمیرگاه' : 'استراحت'} ({toFaDigits(currentStats.workshop)})
        </button>

        <button
          onClick={() => setStatusFilter('ABSENT')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            statusFilter === 'ABSENT'
              ? 'bg-rose-600 text-white'
              : 'bg-[#121d33] text-rose-400 hover:text-rose-300 border border-rose-500/30'
          }`}
        >
          غایب ({toFaDigits(currentStats.absent)})
        </button>

        {/* Account Status Filter: All / Active / Inactive */}
        <div className="flex items-center gap-1 bg-[#101b33] p-0.5 rounded-lg border border-[#1e2f52]">
          <span className="text-[10px] text-slate-400 px-1 font-medium">حساب کاربری:</span>
          <button
            onClick={() => setAccountStatusFilter('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              accountStatusFilter === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            همه
          </button>
          <button
            onClick={() => setAccountStatusFilter('ACTIVE')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              accountStatusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <Check className="w-3 h-3" />
            فعال ({toFaDigits(activeBoard === 'DRIVERS' ? activeDriversCount : activeStaffCount)})
          </button>
          <button
            onClick={() => setAccountStatusFilter('INACTIVE')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              accountStatusFilter === 'INACTIVE'
                ? 'bg-rose-600 text-white'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            <Ban className="w-3 h-3" />
            غیرفعال ({toFaDigits(activeBoard === 'DRIVERS' ? inactiveDriversCount : inactiveStaffCount)})
          </button>
        </div>

        {/* Driver Vehicle Assignment Filter: All / With Vehicle / Without Vehicle */}
        {activeBoard === 'DRIVERS' && (
          <div className="flex items-center gap-1 bg-[#101b33] p-0.5 rounded-lg border border-[#1e2f52]">
            <span className="text-[10px] text-slate-400 px-1 font-medium flex items-center gap-1">
              <Truck className="w-3 h-3 text-blue-400" />
              تخصیص خودرو:
            </span>
            <button
              onClick={() => setVehicleFilter('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                vehicleFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              همه ({toFaDigits(drivers.length)})
            </button>
            <button
              onClick={() => setVehicleFilter('WITH_VEHICLE')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                vehicleFilter === 'WITH_VEHICLE'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="رانندگان دارای خودروی ثابت تحویلی"
            >
              دارای خودرو ({toFaDigits(driversWithVehicleCount)})
            </button>
            <button
              onClick={() => setVehicleFilter('WITHOUT_VEHICLE')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                vehicleFilter === 'WITHOUT_VEHICLE'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
              title="رانندگان بدون خودروی تحویلی (نیروی آماده‌به‌کار / کمکی / ذخیره) - سوابق مرخصی ایشان ثبت و نگهداری می‌شود"
            >
              <span>بدون خودرو (ذخیره)</span>
              <span
                className={`text-[10px] px-1 rounded-full font-mono ${
                  vehicleFilter === 'WITHOUT_VEHICLE'
                    ? 'bg-black/20 text-black'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {toFaDigits(driversWithoutVehicleCount)}
              </span>
            </button>
            {onNavigateToVehicleAssignment && (
              <button
                onClick={onNavigateToVehicleAssignment}
                className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer mr-1"
                title="ورود به منوی اختصاصی واگذاری و تغییر خودروی رانندگان"
              >
                مدیریت تخصیص خودرو ←
              </button>
            )}
          </div>
        )}

        {activeBoard === 'STAFF' && (
          <div className="flex items-center gap-2 mr-auto flex-wrap">
            {/* Shift filters */}
            <div className="flex items-center gap-1 bg-[#101b33] p-0.5 rounded-lg border border-[#1e2f52]">
              <button
                onClick={() => setShiftFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  shiftFilter === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                همه شیفت‌ها
              </button>
              <button
                onClick={() => setShiftFilter('DAY')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition ${
                  shiftFilter === 'DAY' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                شیفت روز (Day)
              </button>
              <button
                onClick={() => setShiftFilter('NIGHT')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition ${
                  shiftFilter === 'NIGHT' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                شیفت شب (Night)
              </button>
            </div>

            {/* Department dropdown */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-[#101b33] border border-[#1e2f52] rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">همه دپارتمان‌ها</option>
              {STAFF_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. MAIN VIEW CONTENTS */}
      {viewMode === 'CARDS' && (
        <div>
          {/* DRIVERS CARDS GRID */}
          {activeBoard === 'DRIVERS' && (
            <div>
              {filteredDrivers.length === 0 ? (
                <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-8 text-center">
                  <UserX className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <div className="text-white font-bold">هیچ راننده‌ای با این مشخصات یافت نشد</div>
                  <div className="text-xs text-slate-400 mt-1">
                    عبارت جستجو یا فیلترهای اعمال شده را تغییر دهید.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredDrivers.map((driver) => {
                    const st = getStatus(driverRecords, driver.id, activeDateKey);
                    const driverStartDate = getPersonStartDate(driver);
                    const isBeforeCreation = isDateBeforeStart(driverStartDate, selectedYear, selectedMonth, selectedDay);
                    const isPresent = !isBeforeCreation && !isFutureActiveDate && st === 'none';
                    const isLeave = st === 'leave';
                    const isWorkshop = st === 'workshop';
                    const isAbsent = st === 'absent';
                    const isDriverActive = driver.status !== 'inactive';
                    const isDriverAnimating = animatingPersonId === driver.id;
                    const activeDayNote = attendanceNotes?.[driver.id]?.[activeDateKey];

                    return (
                      <div
                        key={driver.id}
                        className={`bg-[#0f192e] rounded-xl border p-4 shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                          isDriverAnimating
                            ? 'ring-2 ring-blue-400/60 scale-[1.015] shadow-xl animate-card-pulse'
                            : ''
                        } ${
                          !isDriverActive
                            ? 'border-slate-800/80 bg-[#091120]/90 opacity-75 hover:opacity-100'
                            : isBeforeCreation
                            ? 'border-slate-800/70 bg-[#091120]/80'
                            : isFutureActiveDate && st === 'none'
                            ? 'border-slate-800 bg-[#0c1426]/70 hover:border-slate-700'
                            : isPresent
                            ? 'border-emerald-500/30 hover:border-emerald-500/60'
                            : isLeave
                            ? 'border-amber-500/30 hover:border-amber-500/60'
                            : isWorkshop
                            ? 'border-orange-500/30 hover:border-orange-500/60'
                            : 'border-rose-500/30 hover:border-rose-500/60'
                        }`}
                      >
                        {/* Top driver header */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar squircle */}
                              <div
                                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                                  isDriverActive
                                    ? 'from-slate-700 to-slate-900 border-slate-600'
                                    : 'from-slate-800 to-slate-950 border-slate-700 text-slate-500'
                                } border flex items-center justify-center text-white font-bold text-sm shadow`}
                              >
                                {driver.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                                  <span className={!isDriverActive ? 'text-slate-400 line-through' : ''}>
                                    {driver.name}
                                  </span>
                                  {!isDriverActive ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                      <Ban className="w-2.5 h-2.5" />
                                      غیرفعال
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      فعال
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                  {(() => {
                                    const vInfo = getDriverVehicleInfo(driver);
                                    return vInfo.hasVehicle ? (
                                      <span className="text-emerald-400 font-bold">
                                        کد خودرو: {toFaDigits(vInfo.vehicleCode || driver.code)}
                                      </span>
                                    ) : (
                                      <span className="text-amber-400 font-semibold">بدون خودرو (ذخیره)</span>
                                    );
                                  })()}
                                  {driver.personnelCode && (
                                    <>
                                      <span>•</span>
                                      <span>کد پرسنلی: {toFaDigits(driver.personnelCode)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Attendance Status Pill */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">

                              {/* Current Status Pill with Fast Smooth CSS Animation */}
                              <div key={`${st}-${isDriverAnimating}-${isBeforeCreation}`} className={isDriverAnimating ? 'animate-status-switch' : 'animate-status-pop'}>
                                {isBeforeCreation ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60" title={`تاریخ ثبت در سامانه: ${toFaDigits(driverStartDate || 'نامشخص')}`}>
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    بدون حضور (قبل از ایجاد کاربر)
                                  </span>
                                ) : isFutureActiveDate && st === 'none' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/70 text-slate-400 border border-slate-700/60">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    پیش‌رو (ثبت‌نشده)
                                  </span>
                                ) : isPresent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-status-ripple-present">
                                    <CheckCircle2 className="w-3 h-3" />
                                    حاضر
                                  </span>
                                ) : null}
                                {isLeave && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-status-ripple-leave">
                                    <Clock className="w-3 h-3" />
                                    مرخصی
                                  </span>
                                )}
                                {isWorkshop && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 animate-status-ripple-workshop">
                                    <Wrench className="w-3 h-3" />
                                    تعمیرگاه
                                  </span>
                                )}
                                {isAbsent && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-status-ripple-absent">
                                    <AlertTriangle className="w-3 h-3" />
                                    غایب
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Iranian Plate & Phone Row */}
                          {(() => {
                            const vInfo = getDriverVehicleInfo(driver);
                            return (
                              <div className="bg-[#091120] border border-[#1a2947] rounded-lg p-2 mb-3 flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1.5">
                                    <span>وضعیت خودرو / پلاک:</span>
                                    {vInfo.hasVehicle && vInfo.vehicleCode && (
                                      <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                                        کد {toFaDigits(vInfo.vehicleCode)}
                                        {vInfo.vehicleTypeName ? ` (${vInfo.vehicleTypeName})` : ''}
                                      </span>
                                    )}
                                  </div>
                                  {vInfo.hasVehicle && vInfo.plate ? (
                                    <div className="scale-85 origin-right">
                                      <IranianPlate plateNumber={vInfo.plate} size="sm" />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
                                      <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <div>
                                        <div className="text-[11px] font-bold text-amber-300">بدون خودرو (نیروی آماده‌به‌کار / ذخیره)</div>
                                        <div className="text-[9.5px] text-slate-400">سوابق مرخصی و کارکرد در سامانه ثبت و نگهداری می‌شود</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="text-left text-[11px] text-slate-300">
                                  {driver.phone ? (
                                    <div className="flex items-center gap-1 font-mono text-slate-300">
                                      <span>{toFaDigits(driver.phone)}</span>
                                      <Phone className="w-3 h-3 text-blue-400" />
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">بدون شماره</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Day Note Display if exists */}
                        {activeDayNote && (
                          <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2 mb-2 flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 text-[11px] text-amber-200">
                              <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span className="leading-relaxed break-words">{activeDayNote}</span>
                            </div>
                            <button
                              onClick={() => handleOpenDayNote(driver, selectedDay, activeDateKey)}
                              className="text-[10px] text-amber-300 hover:text-white underline shrink-0 font-medium cursor-pointer"
                            >
                              ویرایش
                            </button>
                          </div>
                        )}

                        {/* Bottom Actions: Clean 4-Button Status Setter (حاضر / مرخصی / تعمیرگاه / غایب) */}
                        <div>
                          <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                            <span>تعیین وضعیت تاریخ {toFaDigits(selectedDay)} {PERSIAN_MONTH_NAMES[selectedMonth - 1]}:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenDayNote(driver, selectedDay, activeDateKey)}
                                className={`text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${
                                  activeDayNote ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-amber-300'
                                }`}
                                title="ثبت یا ویرایش یادداشت برای این روز (همچنین با کلیک راست در ماتریس)"
                              >
                                <FileText className="w-2.5 h-2.5 text-amber-400" />
                                {activeDayNote ? 'ویرایش نوت' : 'ثبت نوت'}
                              </button>
                              <span className="text-slate-600">|</span>
                              <button
                                onClick={() =>
                                  setEditingPerson({
                                    type: 'driver',
                                    id: driver.id,
                                    name: driver.name,
                                    code: driver.code,
                                    phone: driver.phone,
                                    status: st,
                                  })
                                }
                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit className="w-2.5 h-2.5" />
                                جزئیات
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                            <button
                              onClick={() => handleQuickSetDriver(driver.id, 'none')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isPresent
                                  ? `bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/40 ${
                                      isDriverAnimating ? 'animate-status-switch ring-2 ring-emerald-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-present`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-emerald-600/30 hover:text-emerald-300'
                              }`}
                            >
                              حاضر
                            </button>

                            <button
                              onClick={() => handleQuickSetDriver(driver.id, 'leave')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isLeave
                                  ? `bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/40 ${
                                      isDriverAnimating ? 'animate-status-switch ring-2 ring-amber-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-leave`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-amber-600/30 hover:text-amber-300'
                              }`}
                            >
                              مرخصی
                            </button>

                            <button
                              onClick={() => handleQuickSetDriver(driver.id, 'workshop')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isWorkshop
                                  ? `bg-orange-600 text-white shadow-md shadow-orange-900/40 ring-1 ring-orange-400/40 ${
                                      isDriverAnimating ? 'animate-status-switch ring-2 ring-orange-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-workshop`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-orange-600/30 hover:text-orange-300'
                              }`}
                            >
                              تعمیرگاه
                            </button>

                            <button
                              onClick={() => handleQuickSetDriver(driver.id, 'absent')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isAbsent
                                  ? `bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400/40 ${
                                      isDriverAnimating ? 'animate-status-switch ring-2 ring-rose-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-absent`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-rose-600/30 hover:text-rose-300'
                              }`}
                            >
                              غایب
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STAFF CARDS GRID */}
          {activeBoard === 'STAFF' && (
            <div>
              {filteredStaff.length === 0 ? (
                <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-8 text-center">
                  <UserX className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <div className="text-white font-bold">هیچ عضوی از پرسنل با این مشخصات یافت نشد</div>
                  <div className="text-xs text-slate-400 mt-1">
                    عبارت جستجو یا فیلترهای شیفت و دپارتمان را بررسی کنید.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredStaff.map((staff) => {
                    const st = getStatus(staffRecords, staff.id, activeDateKey);
                    const staffStartDate = getPersonStartDate(staff);
                    const isBeforeCreation = isDateBeforeStart(staffStartDate, selectedYear, selectedMonth, selectedDay);
                    const isPresent = !isBeforeCreation && !isFutureActiveDate && st === 'none';
                    const isLeave = st === 'leave';
                    const isWorkshop = st === 'workshop';
                    const isAbsent = st === 'absent';
                    const isStaffActive = staff.status !== 'inactive';
                    const isStaffAnimating = animatingPersonId === staff.id;
                    const activeDayNote = attendanceNotes?.[staff.id]?.[activeDateKey];

                    const shiftBadge =
                      staff.shift === 'night'
                        ? { label: 'شیفت شب', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', icon: Moon }
                        : { label: 'شیفت روز', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Sun };

                    const ShiftIcon = shiftBadge.icon;

                    return (
                      <div
                        key={staff.id}
                        className={`bg-[#0f192e] rounded-xl border p-4 shadow-lg transition-all relative overflow-hidden flex flex-col justify-between ${
                          isStaffAnimating
                            ? 'ring-2 ring-emerald-400/60 scale-[1.015] shadow-xl animate-card-pulse'
                            : ''
                        } ${
                          !isStaffActive
                            ? 'border-slate-800/80 bg-[#091120]/90 opacity-75 hover:opacity-100'
                            : isBeforeCreation
                            ? 'border-slate-800/70 bg-[#091120]/80'
                            : isFutureActiveDate && st === 'none'
                            ? 'border-slate-800 bg-[#0c1426]/70 hover:border-slate-700'
                            : isPresent
                            ? 'border-emerald-500/30 hover:border-emerald-500/60'
                            : isLeave
                            ? 'border-amber-500/30 hover:border-amber-500/60'
                            : isWorkshop
                            ? 'border-orange-500/30 hover:border-orange-500/60'
                            : 'border-rose-500/30 hover:border-rose-500/60'
                        }`}
                      >
                        <div>
                          {/* Staff Header */}
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar */}
                              <div
                                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                                  isStaffActive
                                    ? staff.avatarColor || 'from-emerald-600 to-teal-700'
                                    : 'from-slate-800 to-slate-950 text-slate-500'
                                } border border-white/20 flex items-center justify-center text-white font-bold text-sm shadow`}
                              >
                                {staff.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                                  <span className={!isStaffActive ? 'text-slate-400 line-through' : ''}>
                                    {staff.name}
                                  </span>
                                  {!isStaffActive ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                      <Ban className="w-2.5 h-2.5" />
                                      غیرفعال
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      فعال
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>کد پرسنلی: {toFaDigits(staff.code)}</span>
                                  <span>•</span>
                                  <span className="text-slate-300 font-medium">{staff.role}</span>
                                </div>
                              </div>
                            </div>

                            {/* Attendance Status Badge */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">

                              {/* Current Status Badge with Fast Smooth CSS Animation */}
                              <div key={`${st}-${isStaffAnimating}-${isBeforeCreation}`} className={isStaffAnimating ? 'animate-status-switch' : 'animate-status-pop'}>
                                {isBeforeCreation ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60" title={`تاریخ استخدام/ثبت: ${toFaDigits(staffStartDate || 'نامشخص')}`}>
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    بدون حضور (قبل از ایجاد کاربر)
                                  </span>
                                ) : isFutureActiveDate && st === 'none' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/70 text-slate-400 border border-slate-700/60">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    پیش‌رو (ثبت‌نشده)
                                  </span>
                                ) : isPresent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-status-ripple-present">
                                    <CheckCircle2 className="w-3 h-3" />
                                    حاضر
                                  </span>
                                ) : null}
                                {isLeave && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-status-ripple-leave">
                                    <Clock className="w-3 h-3" />
                                    مرخصی
                                  </span>
                                )}
                                {isWorkshop && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 animate-status-ripple-workshop">
                                    <Wrench className="w-3 h-3" />
                                    استراحت
                                  </span>
                                )}
                                {isAbsent && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-status-ripple-absent">
                                    <AlertTriangle className="w-3 h-3" />
                                    غایب
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Department & Shift & Hours info box */}
                          <div className="bg-[#091120] border border-[#1a2947] rounded-lg p-2.5 mb-3 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                                {staff.department}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${shiftBadge.color}`}
                              >
                                <ShiftIcon className="w-3 h-3" />
                                {shiftBadge.label}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                              <span className="text-slate-400">
                                ورود/خروج:{' '}
                                <span className="font-mono text-white">
                                  {toFaDigits(staff.entryTime || '—')} الی {toFaDigits(staff.exitTime || '—')}
                                </span>
                              </span>
                              {staff.phone && (
                                <span className="font-mono text-slate-400">{toFaDigits(staff.phone)}</span>
                              )}
                            </div>

                            {staff.notes && (
                              <div className="text-[10px] text-slate-400 truncate bg-slate-800/40 px-1.5 py-0.5 rounded">
                                وظیفه: {staff.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Day Note Display if exists */}
                        {activeDayNote && (
                          <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2 mb-2 flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 text-[11px] text-amber-200">
                              <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span className="leading-relaxed break-words">{activeDayNote}</span>
                            </div>
                            <button
                              onClick={() => handleOpenDayNote(staff, selectedDay, activeDateKey)}
                              className="text-[10px] text-amber-300 hover:text-white underline shrink-0 font-medium cursor-pointer"
                            >
                              ویرایش
                            </button>
                          </div>
                        )}

                        {/* Bottom Actions: Clean 4-Button Status Setter (حاضر / مرخصی / استراحت / غایب) */}
                        <div>
                          <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                            <span>تعیین وضعیت تاریخ {toFaDigits(selectedDay)} {PERSIAN_MONTH_NAMES[selectedMonth - 1]}:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenDayNote(staff, selectedDay, activeDateKey)}
                                className={`text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${
                                  activeDayNote ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-amber-300'
                                }`}
                                title="ثبت یا ویرایش یادداشت برای این روز (همچنین با کلیک راست در ماتریس)"
                              >
                                <FileText className="w-2.5 h-2.5 text-amber-400" />
                                {activeDayNote ? 'ویرایش نوت' : 'ثبت نوت'}
                              </button>
                              <span className="text-slate-600">|</span>
                              <button
                                onClick={() =>
                                  setEditingPerson({
                                    type: 'staff',
                                    id: staff.id,
                                    name: staff.name,
                                    code: staff.code,
                                    phone: staff.phone,
                                    entryTime: staff.entryTime,
                                    exitTime: staff.exitTime,
                                    missionsCount: staff.missionsCountToday || 0,
                                    notes: staff.notes,
                                    status: st,
                                  })
                                }
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit className="w-2.5 h-2.5" />
                                ساعات/وظیفه
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                            <button
                              onClick={() => handleQuickSetStaff(staff.id, 'none')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isPresent
                                  ? `bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/40 ${
                                      isStaffAnimating ? 'animate-status-switch ring-2 ring-emerald-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-present`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-emerald-600/30 hover:text-emerald-300'
                              }`}
                            >
                              حاضر
                            </button>

                            <button
                              onClick={() => handleQuickSetStaff(staff.id, 'leave')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isLeave
                                  ? `bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/40 ${
                                      isStaffAnimating ? 'animate-status-switch ring-2 ring-amber-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-leave`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-amber-600/30 hover:text-amber-300'
                              }`}
                            >
                              مرخصی
                            </button>

                            <button
                              onClick={() => handleQuickSetStaff(staff.id, 'workshop')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isWorkshop
                                  ? `bg-orange-600 text-white shadow-md shadow-orange-900/40 ring-1 ring-orange-400/40 ${
                                      isStaffAnimating ? 'animate-status-switch ring-2 ring-orange-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-workshop`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-orange-600/30 hover:text-orange-300'
                              }`}
                            >
                              استراحت
                            </button>

                            <button
                              onClick={() => handleQuickSetStaff(staff.id, 'absent')}
                              className={`py-1.5 rounded-lg font-bold matrix-status-cell ${
                                isAbsent
                                  ? `bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400/40 ${
                                      isStaffAnimating ? 'animate-status-switch ring-2 ring-rose-300 scale-105' : 'animate-status-pop'
                                    } animate-status-ripple-absent`
                                  : 'bg-[#15233e] text-slate-300 hover:bg-rose-600/30 hover:text-rose-300'
                              }`}
                            >
                              غایب
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. MONTHLY MATRIX VIEW (30/31 Days Full Calendar Table) */}
      {viewMode === 'MATRIX' && (
        <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e2f52] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0a1222]">
            <div>
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                ماتریس حضور و غیاب ماهانه {PERSIAN_MONTH_NAMES[selectedMonth - 1]} {toFaDigits(selectedYear)}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                برای تغییر وضعیت هر روز کلیک کنید. با <span className="text-amber-400 font-bold">کلیک راست</span> روی هر روز می‌توانید یادداشت (نوت) ثبت نمایید.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-300 flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
                حاضر
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500 text-amber-300 flex items-center justify-center text-[9px] font-bold">
                  ر
                </span>
                مرخصی
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500 text-orange-300 flex items-center justify-center text-[9px] font-bold">
                  ت
                </span>
                {activeBoard === 'DRIVERS' ? 'تعمیرگاه' : 'استراحت'}
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500 text-rose-300 flex items-center justify-center text-[9px] font-bold">
                  غ
                </span>
                غایب
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded bg-slate-900/60 border border-dashed border-slate-700 text-slate-500 flex items-center justify-center text-[8px]">
                  -
                </span>
                روزهای پیش‌رو (خالی)
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-3 rounded bg-[#091122]/40 border border-slate-800 text-slate-600 flex items-center justify-center text-[8px]">
                  &nbsp;
                </span>
                بدون حضور (قبل از ایجاد کاربر)
              </span>
              <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                <span className="w-3 h-3 rounded bg-amber-500/25 border border-amber-400 text-amber-300 flex items-center justify-center text-[9px] font-bold">
                  ✎
                </span>
                کلیک راست: ثبت نوت روز
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-center text-xs border-collapse select-none">
              <thead className="bg-[#091120] sticky top-0 z-20 text-slate-300 font-bold border-b border-[#1e2f52]">
                <tr>
                  <th className="py-2.5 px-3 text-right sticky right-0 bg-[#091120] z-30 min-w-[165px] shadow-sm">
                    نام و مشخصات
                  </th>
                  <th className="py-2.5 px-2 min-w-[115px] text-slate-400">
                    {activeBoard === 'DRIVERS' ? 'کد و پلاک خودرو' : 'کد پرسنلی'}
                  </th>
                  {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((day) => {
                    const isSelected = day === selectedDay;
                    const isToday =
                      selectedYear === today.jy && selectedMonth === today.jm && day === today.jd;
                    const isFuture = isDayInFuture(day);
                    const weekday = getPersianWeekday(selectedYear, selectedMonth, day).slice(0, 1);
                    return (
                      <th
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`py-2 px-1 min-w-[32px] cursor-pointer hover:bg-blue-600/20 transition-colors ${
                          isSelected ? 'bg-blue-600/30 text-blue-300 border-x border-blue-500/40' : ''
                        } ${isFuture ? 'bg-slate-900/40 text-slate-400' : ''}`}
                        title={isFuture ? `روز پیش‌رو (${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]}) - خالی` : undefined}
                      >
                        <div className={`text-[10px] ${isFuture ? 'text-slate-500' : 'text-slate-400'}`}>{weekday}</div>
                        <div className={`font-bold text-xs ${isToday ? 'text-amber-400 underline font-black' : isFuture ? 'text-slate-400 font-normal' : 'text-slate-200'}`}>
                          {toFaDigits(day)}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-2 min-w-[55px] text-emerald-400">حضور</th>
                  <th className="py-2.5 px-2 min-w-[55px] text-amber-400">مرخصی</th>
                  <th className="py-2.5 px-2 min-w-[55px] text-orange-400">تعمیر/استراحت</th>
                  <th className="py-2.5 px-2 min-w-[55px] text-indigo-400">درصد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172542]">
                {(activeBoard === 'DRIVERS' ? filteredDrivers : filteredStaff).map((person, idx, arr) => {
                  const records = activeBoard === 'DRIVERS' ? driverRecords : staffRecords;
                  let presentCount = 0;
                  let leaveCount = 0;
                  let workshopCount = 0;
                  let elapsedDaysCount = 0;

                  const driverVehicleInfo =
                    activeBoard === 'DRIVERS' ? getDriverVehicleInfo(person as Driver) : null;
                  const prevDriverVehicleInfo =
                    activeBoard === 'DRIVERS' && idx > 0
                      ? getDriverVehicleInfo(arr[idx - 1] as Driver)
                      : null;

                  const showWithVehicleHeader =
                    activeBoard === 'DRIVERS' &&
                    driverVehicleInfo?.hasVehicle &&
                    (idx === 0 || !prevDriverVehicleInfo?.hasVehicle);

                  const showWithoutVehicleHeader =
                    activeBoard === 'DRIVERS' &&
                    !driverVehicleInfo?.hasVehicle &&
                    (idx === 0 || prevDriverVehicleInfo?.hasVehicle);

                  const totalColSpan = daysInCurrentMonth + 6;

                  return (
                    <React.Fragment key={person.id}>
                      {showWithVehicleHeader && (
                        <tr className="bg-emerald-950/35 border-y border-emerald-500/30">
                          <td
                            colSpan={totalColSpan}
                            className="py-1.5 px-3 text-right text-[11px] font-bold text-emerald-300 sticky right-0"
                          >
                            <div className="flex items-center gap-2">
                              <Truck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                رانندگان دارای خودروی تحویلی ({toFaDigits(
                                  filteredDrivers.filter((d) => getDriverVehicleInfo(d).hasVehicle).length
                                )} نفر) — مرتب بر اساس کد خودرو
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {showWithoutVehicleHeader && (
                        <tr className="bg-amber-950/35 border-y border-amber-500/30">
                          <td
                            colSpan={totalColSpan}
                            className="py-1.5 px-3 text-right text-[11px] font-bold text-amber-300 sticky right-0"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-amber-400" />
                              <span>
                                رانندگان بدون خودرو / نیروی ذخیره ({toFaDigits(
                                  filteredDrivers.filter((d) => !getDriverVehicleInfo(d).hasVehicle).length
                                )} نفر)
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        {/* Name column */}
                        <td className="py-2 px-3 text-right sticky right-0 bg-[#0e172a] z-10 font-medium text-white shadow-sm flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center shrink-0">
                              {toFaDigits(idx + 1)}
                            </span>
                            <div className="truncate max-w-[145px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={person.status === 'inactive' ? 'line-through text-slate-400' : ''}>
                                  {person.name}
                                </span>
                                {person.status === 'inactive' && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                    غیرفعال
                                  </span>
                                )}
                                {activeBoard === 'DRIVERS' && driverVehicleInfo && (
                                  driverVehicleInfo.hasVehicle ? (
                                    <span
                                      className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30"
                                      title={`دارای خودرو کد ${driverVehicleInfo.vehicleCode} - پلاک: ${driverVehicleInfo.plate}`}
                                    >
                                      دارای خودرو
                                    </span>
                                  ) : (
                                    <span
                                      className="text-[8.5px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                                      title="راننده بدون خودروی تحویلی (نیروی ذخیره)"
                                    >
                                      بدون خودرو
                                    </span>
                                  )
                                )}
                              </div>
                              {'role' in person && (
                                <div className="text-[10px] text-slate-400 font-normal">{person.role}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Code & Vehicle Plate column */}
                        <td className="py-1.5 px-1.5 text-slate-300 font-mono text-[11px]">
                          {activeBoard === 'DRIVERS' && driverVehicleInfo ? (
                            driverVehicleInfo.hasVehicle ? (
                              <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30 whitespace-nowrap">
                                  کد {toFaDigits(driverVehicleInfo.vehicleCode || person.code)}
                                </span>
                                <span
                                  className="text-[9.5px] text-slate-400 font-sans whitespace-nowrap"
                                  dir="ltr"
                                  title={driverVehicleInfo.plate}
                                >
                                  {toFaDigits(driverVehicleInfo.plate)}
                                </span>
                              </div>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/90 text-[9.5px] font-sans font-bold border border-amber-500/25 whitespace-nowrap">
                                بدون خودرو
                              </span>
                            )
                          ) : (
                            toFaDigits(person.code)
                          )}
                        </td>

                      {/* Days */}
                      {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((day) => {
                        const isFuture = isDayInFuture(day);
                        const personStartDate = getPersonStartDate(person);
                        const isBeforeCreation = isDateBeforeStart(personStartDate, selectedYear, selectedMonth, day);

                        if (!isFuture && !isBeforeCreation) elapsedDaysCount++;

                        const dateKey = formatPersianDateKey(selectedYear, selectedMonth, day);
                        const st = getStatus(records, person.id, dateKey);
                        const dayNote = attendanceNotes?.[person.id]?.[dateKey];
                        const hasNote = Boolean(dayNote && dayNote.trim().length > 0);

                        // Count statuses (do NOT mark unrecorded future days OR days before creation as present!)
                        if (isBeforeCreation) {
                          // Before user creation/hire date: not counted as present
                        } else if (st === 'leave') {
                          leaveCount++;
                        } else if (st === 'workshop') {
                          workshopCount++;
                        } else if (st === 'absent') {
                          // absent
                        } else if (st === 'none') {
                          if (!isFuture) {
                            presentCount++;
                          }
                        }

                        const isSelectedDay = day === selectedDay;

                        // Cycle on click:
                        // On upcoming days: empty (none) -> leave (مرخصی) -> workshop -> absent -> none
                        // On past/today: none (present) -> leave -> workshop -> absent -> none
                        const handleCellClick = () => {
                          if (isBeforeCreation) {
                            onShowToast(
                              `این روز قبل از ایجاد کاربر در سامانه (${toFaDigits(personStartDate || '---')}) است. برای ثبت یادداشت کلیک راست کنید.`,
                              'info'
                            );
                            return;
                          }

                          let nextStatus: AttendanceStatus = 'none';
                          if (isFuture) {
                            if (st === 'none') nextStatus = 'leave';
                            else if (st === 'leave') nextStatus = 'workshop';
                            else if (st === 'workshop') nextStatus = 'absent';
                            else if (st === 'absent') nextStatus = 'none';
                          } else {
                            if (st === 'none') nextStatus = 'leave';
                            else if (st === 'leave') nextStatus = 'workshop';
                            else if (st === 'workshop') nextStatus = 'absent';
                            else if (st === 'absent') nextStatus = 'none';
                          }

                          const cellKey = `${person.id}-${dateKey}`;
                          setAnimatingCellKey(cellKey);
                          setTimeout(() => {
                            setAnimatingCellKey((prev) => (prev === cellKey ? null : prev));
                          }, 350);

                          if (activeBoard === 'DRIVERS') {
                            onUpdateDriverStatus(person.id, dateKey, nextStatus);
                          } else {
                            onUpdateStaffStatus(person.id, dateKey, nextStatus);
                          }
                        };

                        const isCellAnimating = animatingCellKey === `${person.id}-${dateKey}`;
                        const isCellEmptyFuture = isFuture && st === 'none';

                        return (
                          <td
                            key={day}
                            onClick={handleCellClick}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenDayNote(person, day, dateKey);
                            }}
                            className={`p-0.5 ${
                              isBeforeCreation
                                ? 'cursor-context-menu opacity-25 hover:opacity-75'
                                : 'cursor-pointer'
                            } transition-colors group/cell ${
                              isSelectedDay ? 'bg-blue-600/10' : ''
                            } ${isCellAnimating ? 'bg-blue-500/20 ring-1 ring-blue-400/50' : ''}`}
                            title={
                              isBeforeCreation
                                ? `${person.name} - روز ${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]} - بدون حضور (قبل از ایجاد کاربر در سامانه: ${toFaDigits(personStartDate || '---')})${hasNote ? `\n📝 یادداشت روز: ${dayNote}` : '\n(برای ثبت یا ویرایش نوت کلیک راست کنید)'}`
                                : isCellEmptyFuture
                                ? `${person.name} - روز ${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]} - روز پیش‌رو (خالی)${hasNote ? `\n📝 یادداشت روز: ${dayNote}` : '\n(برای ثبت نوت کلیک راست کنید)'}`
                                : `${person.name} - روز ${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]} - وضعیت: ${
                                    st === 'none'
                                      ? 'حاضر'
                                      : st === 'leave'
                                      ? 'مرخصی'
                                      : st === 'workshop'
                                      ? (activeBoard === 'DRIVERS' ? 'تعمیرگاه' : 'استراحت')
                                      : 'غایب'
                                  }${hasNote ? `\n📝 یادداشت روز: ${dayNote}` : '\n(برای ثبت نوت کلیک راست کنید)'}`
                            }
                          >
                            <div
                              key={`${st}-${isCellAnimating}-${isCellEmptyFuture}-${isBeforeCreation}-${hasNote}`}
                              className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-[10px] font-bold relative matrix-status-cell ${
                                isCellAnimating
                                  ? 'animate-status-switch ring-2 ring-blue-400/80 shadow-md scale-110'
                                  : 'animate-status-pop'
                              } ${
                                isBeforeCreation
                                  ? 'bg-transparent text-transparent hover:bg-slate-800/40'
                                  : isCellEmptyFuture
                                  ? 'bg-[#091122]/40 text-slate-600 border border-dashed border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/50'
                                  : st === 'none'
                                  ? `bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 ${
                                      isCellAnimating ? 'animate-status-ripple-present' : ''
                                    }`
                                  : st === 'leave'
                                  ? `bg-amber-500/25 text-amber-300 hover:bg-amber-500/45 border border-amber-500/40 ${
                                      isCellAnimating ? 'animate-status-ripple-leave' : ''
                                    }`
                                  : st === 'workshop'
                                  ? `bg-orange-500/25 text-orange-300 hover:bg-orange-500/45 border border-orange-500/40 ${
                                      isCellAnimating ? 'animate-status-ripple-workshop' : ''
                                    }`
                                  : `bg-rose-500/25 text-rose-300 hover:bg-rose-500/45 border border-rose-500/40 ${
                                      isCellAnimating ? 'animate-status-ripple-absent' : ''
                                    }`
                              }`}
                            >
                              {/* Amber Note Pin */}
                              {hasNote && (
                                <span
                                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[#091120] shadow flex items-center justify-center text-[7px] text-slate-950 font-black z-10 animate-pulse"
                                  title={`یادداشت روز: ${dayNote}`}
                                >
                                  ✎
                                </span>
                              )}

                              {isBeforeCreation ? null : isCellEmptyFuture ? (
                                <span className="opacity-0 group-hover/cell:opacity-40 text-[9px] text-slate-500">-</span>
                              ) : st === 'none' ? (
                                '✓'
                              ) : st === 'leave' ? (
                                'ر'
                              ) : st === 'workshop' ? (
                                'ت'
                              ) : (
                                'غ'
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Row totals */}
                      <td className="py-2 px-1 text-emerald-400 font-bold font-mono">
                        {toFaDigits(presentCount)}
                      </td>
                      <td className="py-2 px-1 text-amber-400 font-bold font-mono">
                        {toFaDigits(leaveCount)}
                      </td>
                      <td className="py-2 px-1 text-orange-400 font-bold font-mono">
                        {toFaDigits(workshopCount)}
                      </td>
                      <td className="py-2 px-1 text-indigo-300 font-bold font-mono" title={elapsedDaysCount > 0 ? `بر اساس ${toFaDigits(elapsedDaysCount)} روز گذشته از ماه` : 'ماه پیش‌رو'}>
                        {elapsedDaysCount > 0 ? `${toFaDigits(Math.round((presentCount / elapsedDaysCount) * 100))}%` : '---'}
                      </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. ANALYTICS & SHIFT PERFORMANCE VIEW */}
      {viewMode === 'ANALYTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Shift Breakdown */}
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              توزیع حضور بر اساس وضعیت و آمادگی عملیاتی
            </h3>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>حاضر و آماده‌به‌کار</span>
                  <span className="font-bold text-emerald-400">
                    {toFaDigits(currentStats.present)} نفر ({toFaDigits(Math.round((currentStats.present / Math.max(1, currentStats.total)) * 100))}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${(currentStats.present / Math.max(1, currentStats.total)) * 100}%`,
                    }}
                  />
                </div>
              </div>



              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>مرخصی</span>
                  <span className="font-bold text-amber-400">
                    {toFaDigits(currentStats.leave)} نفر ({toFaDigits(Math.round((currentStats.leave / Math.max(1, currentStats.total)) * 100))}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{
                      width: `${(currentStats.leave / Math.max(1, currentStats.total)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>تعمیرگاه / نقص فنی / استراحت</span>
                  <span className="font-bold text-orange-400">
                    {toFaDigits(currentStats.workshop)} نفر ({toFaDigits(Math.round((currentStats.workshop / Math.max(1, currentStats.total)) * 100))}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${(currentStats.workshop / Math.max(1, currentStats.total)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Organizational Unit Breakdown */}
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {activeBoard === 'DRIVERS' ? 'پایش آماده‌به‌کاری ناوگان حامی' : 'تفکیک پرسنل در واحدهای عملیاتی'}
            </h3>

            {activeBoard === 'STAFF' ? (
              <div className="space-y-3">
                {STAFF_DEPARTMENTS.map((dept) => {
                  const deptStaff = staffMembers.filter((s) => s.department === dept);
                  const eligibleDeptStaff = deptStaff.filter((s) => {
                    const isBefore = isDateBeforeStart(s.hireDate || s.createdAt, selectedYear, selectedMonth, selectedDay);
                    return !isBefore;
                  });
                  const deptPresent = eligibleDeptStaff.filter((s) => {
                    const st = getStatus(staffRecords, s.id, activeDateKey);
                    return st === 'none';
                  }).length;
                  const pct = eligibleDeptStaff.length > 0 ? Math.round((deptPresent / eligibleDeptStaff.length) * 100) : 100;

                  return (
                    <div key={dept} className="flex items-center justify-between text-xs p-2 bg-[#121c33] rounded-lg">
                      <div className="text-slate-300 font-medium">{dept}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">
                          {toFaDigits(deptPresent)} از {toFaDigits(deptStaff.length)} حاضر
                        </span>
                        <span className="font-bold text-emerald-400 font-mono">{toFaDigits(pct)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#121c33] rounded-lg">
                  <div className="text-slate-300 font-bold mb-1">شاخص انضباطی حضور رانندگان</div>
                  <div className="text-slate-400 text-[11px]">
                    رانندگانی که در شیفت شب فعال هستند باید حداکثر تا ساعت ۲۰:۳۰ در پایانه حاضر و آمادگی تحویل خودرو را اعلام نمایند.
                  </div>
                </div>

                <div className="p-3 bg-[#121c33] rounded-lg">
                  <div className="text-slate-300 font-bold mb-1">سیاست سرویس و تعمیرگاه</div>
                  <div className="text-slate-400 text-[11px]">
                    خودروهایی که نیاز به تعویض روغن یا تعمیرات دوره‌ای دارند با علامت (ت) ثبت شده و به واحد فنی معرفی می‌گردند.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL: EDIT PERSON SHIFT & DETAILS */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f192e] border border-[#22365e] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" />
                تنظیم وضعیت {editingPerson.type === 'driver' ? 'راننده' : 'پرسنل'}: {editingPerson.name}
              </h3>
              <button
                onClick={() => setEditingPerson(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  وضعیت در تاریخ {toFaDigits(selectedDay)} {PERSIAN_MONTH_NAMES[selectedMonth - 1]}:
                </label>
                <select
                  value={editingPerson.status}
                  onChange={(e) =>
                    setEditingPerson({
                      ...editingPerson,
                      status: e.target.value as AttendanceStatus,
                    })
                  }
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 font-bold"
                >
                  <option value="none">حاضر و فعال (آماده‌به‌کار)</option>
                  <option value="leave">مرخصی (استحقاقی / استعلاجی)</option>
                  <option value="workshop">
                    {editingPerson.type === 'driver' ? 'تعمیرگاه / نقص فنی' : 'استراحت / شیفت بعد'}
                  </option>
                  <option value="absent">غیبت غیرموجه</option>
                </select>
              </div>

              {editingPerson.type === 'staff' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">ساعت ورود ثبت‌شده:</label>
                      <input
                        type="time"
                        value={editingPerson.entryTime || '20:00'}
                        onChange={(e) =>
                          setEditingPerson({
                            ...editingPerson,
                            entryTime: e.target.value,
                          })
                        }
                        className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">ساعت خروج ثبت‌شده:</label>
                      <input
                        type="time"
                        value={editingPerson.exitTime || '06:00'}
                        onChange={(e) =>
                          setEditingPerson({
                            ...editingPerson,
                            exitTime: e.target.value,
                          })
                        }
                        className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">تعداد مأموریت‌ها / تسک‌های امروز:</label>
                    <input
                      type="number"
                      value={editingPerson.missionsCount || 0}
                      onChange={(e) =>
                        setEditingPerson({
                          ...editingPerson,
                          missionsCount: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">توضیحات و گزارش شیفت:</label>
                    <textarea
                      rows={2}
                      value={editingPerson.notes || ''}
                      onChange={(e) =>
                        setEditingPerson({
                          ...editingPerson,
                          notes: e.target.value,
                        })
                      }
                      placeholder="یادداشت‌های اختصاصی مدیر شیفت..."
                      className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingPerson(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                انصراف
              </button>
              <button
                onClick={handleSavePersonEdit}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Laser-Optimized A4 Attendance & Roll-Call Print Modal with Customizable Watermark */}
      {isPrintModalOpen && (
        <AttendanceSheetPrintModal
          title={activeBoard === 'DRIVERS' ? 'صورت‌جلسه و کارکرد ناوگان و رانندگان' : 'صورت‌جلسه کارکرد ماهانه پرسنل اداری و عملیات'}
          subTitle={`تابلوی حضور و غیاب روز ${toFaDigits(selectedDay)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]} ${toFaDigits(selectedYear)}`}
          year={selectedYear}
          month={PERSIAN_MONTH_NAMES[selectedMonth - 1]}
          items={(activeBoard === 'DRIVERS' ? filteredDrivers : filteredStaff).map((p) => {
            const activeRecordsMap = activeBoard === 'DRIVERS' ? driverRecords : staffRecords;
            const rawDaySt = getStatus(activeRecordsMap, p.id, activeDateKey);
            const personStartDate =
              activeBoard === 'DRIVERS'
                ? (p as Driver).createdAt
                : ((p as StaffMember).hireDate || (p as StaffMember).createdAt);
            const isTodayBeforeStart = isDateBeforeStart(personStartDate, selectedYear, selectedMonth, selectedDay);

            const mappedStatus: AttendancePrintItem['status'] =
              isTodayBeforeStart
                ? 'NOT_JOINED'
                : rawDaySt === 'leave'
                ? 'LEAVE'
                : rawDaySt === 'workshop'
                ? 'REST'
                : rawDaySt === 'absent'
                ? 'ABSENT'
                : 'PRESENT';

            let presentDaysCount = 0;
            let leaveDaysCount = 0;
            let absentDaysCount = 0;

            for (let d = 1; d <= daysInCurrentMonth; d++) {
              if (isDateBeforeStart(personStartDate, selectedYear, selectedMonth, d)) {
                continue;
              }
              const dKey = formatPersianDateKey(selectedYear, selectedMonth, d);
              const st = getStatus(activeRecordsMap, p.id, dKey);
              if (st === 'leave') leaveDaysCount++;
              else if (st === 'absent') absentDaysCount++;
              else if (st === 'workshop') {
                // rest/workshop counted separately
              } else if (!isDayInFuture(d)) {
                presentDaysCount++;
              }
            }

            const personShift = 'shift' in p ? (p as StaffMember).shift : undefined;

            return {
              id: p.id,
              code: p.code || (p as Driver).personnelCode || '',
              name: p.name,
              role: 'role' in p && p.role ? p.role : activeBoard === 'DRIVERS' ? 'راننده ناوگان' : 'پرسنل اداری',
              department:
                'department' in p
                  ? (p as StaffMember).department
                  : (p as Driver).vehiclePlate
                  ? `پلاک: ${(p as Driver).vehiclePlate}`
                  : 'بدون خودرو (راننده کمکی/ذخیره)',
              status: mappedStatus,
              shift: personShift
                ? personShift === 'night'
                  ? 'شیفت شب'
                  : 'شیفت روز'
                : 'شیفت روزانه',
              presentDaysCount,
              leaveDaysCount,
              absentDaysCount,
            };
          })}
          onClose={() => setIsPrintModalOpen(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* Day Note Modal (Opened via right-click in Matrix or button in Cards) */}
      {dayNoteModal && dayNoteModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDayNoteModal(null)}
        >
          <div
            className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1e2f52] bg-[#0a1222] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    ثبت یادداشت روزانه
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {dayNoteModal.personName} {dayNoteModal.personCode ? `(کد: ${toFaDigits(dayNoteModal.personCode)})` : ''} • {toFaDigits(dayNoteModal.day)} {PERSIAN_MONTH_NAMES[dayNoteModal.month - 1]} {toFaDigits(dayNoteModal.year)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDayNoteModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDayNote} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  متن یادداشت / نوت:
                </label>
                <textarea
                  value={dayNoteInput}
                  onChange={(e) => setDayNoteInput(e.target.value)}
                  placeholder="مثال: تاخیر با هماهنگی، ماموریت خارج از شهر، اضافه کار، کسری کارکرد، استعلاجی، شیفت کمکی..."
                  rows={4}
                  autoFocus
                  className="w-full bg-[#080d19] border border-[#1b2b48] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 leading-relaxed resize-none"
                />
              </div>

              {/* Quick Tags for speed */}
              <div>
                <div className="text-[10px] text-slate-400 mb-1.5 font-medium">برچسب‌های سریع:</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['ماموریت', 'مرخصی ساعتی', 'تاخیر با هماهنگی', 'استعلاجی', 'کسری کارکرد', 'کشیک شب', 'تعویض شیفت'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setDayNoteInput((prev) => (prev ? `${prev} - ${tag}` : tag));
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 transition cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hint */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">💡 راهنما:</span>
                <span>
                  این یادداشت در ماتریس با نشان <span className="text-amber-300 font-bold">✎</span> مشخص شده و با نگه داشتن موس روی روز قابل مشاهده است. همچنین با کلیک راست در هر زمان می‌توانید آن را ویرایش یا حذف کنید.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1e2f52]">
                {dayNoteModal.initialNote ? (
                  <button
                    type="button"
                    onClick={handleDeleteDayNote}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف نوت
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDayNoteModal(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md shadow-amber-900/40 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ذخیره یادداشت
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A4 Portrait Monthly Leave Calendar Print Modal (Drivers & Staff Separately) */}
      {leaveCalendarPrintMode && (
        <LeaveCalendarPrintModal
          initialMode={leaveCalendarPrintMode}
          initialYear={selectedYear}
          initialMonth={selectedMonth}
          drivers={drivers}
          driverRecords={driverRecords}
          staffMembers={staffMembers}
          staffRecords={staffRecords}
          onClose={() => setLeaveCalendarPrintMode(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
