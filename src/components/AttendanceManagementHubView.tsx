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
} from 'lucide-react';
import { Driver, AttendanceRecords, AttendanceStatus, StaffMember } from '../types';
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
import { AttendanceSheetPrintModal, AttendancePrintItem } from './AttendanceSheetPrintModal';
import { LeaveCalendarPrintModal, LeaveCalendarBoardMode } from './LeaveCalendarPrintModal';

interface AttendanceManagementHubViewProps {
  drivers: Driver[];
  driverRecords: AttendanceRecords;
  staffMembers: StaffMember[];
  staffRecords: AttendanceRecords;
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
  const [accountStatusFilter, setAccountStatusFilter] = useState<AccountStatusFilter>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<FilterVehicle>('ALL');
  const [shiftFilter, setShiftFilter] = useState<FilterShift>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Animation feedback states for smooth status changes
  const [animatingPersonId, setAnimatingPersonId] = useState<string | null>(null);
  const [animatingCellKey, setAnimatingCellKey] = useState<string | null>(null);

  // User Management Center Modal & State
  const [isUserManagerOpen, setIsUserManagerOpen] = useState(false);
  const [userManagerTab, setUserManagerTab] = useState<'DRIVERS' | 'STAFF'>('DRIVERS');
  const [userManagerSearch, setUserManagerSearch] = useState('');
  const [userManagerAccountFilter, setUserManagerAccountFilter] = useState<AccountStatusFilter>('ALL');

  // Direct Add Driver Modal
  const [isDirectAddDriverOpen, setIsDirectAddDriverOpen] = useState(false);
  const [newDriverForm, setNewDriverForm] = useState({
    name: '',
    personnelCode: '',
    vehiclePlate: '',
    phone: '',
    nationalId: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Edit User Personal Info Modal
  const [editingUserInfo, setEditingUserInfo] = useState<{
    type: 'driver' | 'staff';
    id: string;
    name: string;
    code: string;
    phone?: string;
    vehiclePlate?: string;
    department?: string;
    role?: string;
    shift?: 'day' | 'night' | 'morning' | 'evening';
    status: 'active' | 'inactive';
  } | null>(null);

  // Delete confirmation target
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'driver' | 'staff';
    id: string;
    name: string;
    code?: string;
  } | null>(null);

  // Modal states
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
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

  // New staff form state
  const [newStaffForm, setNewStaffForm] = useState<Partial<StaffMember>>({
    name: '',
    code: `EMP-${Math.floor(117 + Math.random() * 80)}`,
    department: STAFF_DEPARTMENTS[0],
    role: '',
    phone: '',
    shift: 'night',
    entryTime: '20:00',
    exitTime: '06:00',
    notes: '',
  });

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

  // Helper to normalize status
  const getStatus = (records: AttendanceRecords, id: string, dateKey: string): AttendanceStatus => {
    const raw = records[id]?.[dateKey];
    if (!raw || raw === 'none') return 'none';
    if (raw === 'م' || raw === 'leave') return 'leave';
    if (raw === 'ت' || raw === 'workshop') return 'workshop';
    if (raw === 'absent') return 'absent';
    return 'none';
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
      const isBeforeStart = isDateBeforeStart(d.createdAt, selectedYear, selectedMonth, selectedDay);
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
  }, [drivers, driverRecords, activeDateKey, isFutureActiveDate, selectedYear, selectedMonth, selectedDay]);

  // Staff Statistics for the active day (do NOT mark unrecorded future days or days before creation as present)
  const staffStats = useMemo(() => {
    let present = 0;
    let leave = 0;
    let workshop = 0;
    let absent = 0;
    let beforeCreation = 0;

    staffMembers.forEach((s) => {
      // If the selected date is before staff hire/creation date, do not mark or count as present
      const isBeforeStart = isDateBeforeStart(s.hireDate || s.createdAt, selectedYear, selectedMonth, selectedDay);
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

  // Active & Inactive Headcounts & Vehicle Assignment Counts
  const activeDriversCount = useMemo(() => drivers.filter((d) => d.status !== 'inactive').length, [drivers]);
  const inactiveDriversCount = useMemo(() => drivers.filter((d) => d.status === 'inactive').length, [drivers]);
  const driversWithVehicleCount = useMemo(
    () => drivers.filter((d) => Boolean(d.vehiclePlate && d.vehiclePlate.trim())).length,
    [drivers]
  );
  const driversWithoutVehicleCount = useMemo(
    () => drivers.filter((d) => !d.vehiclePlate || !d.vehiclePlate.trim()).length,
    [drivers]
  );
  const activeStaffCount = useMemo(() => staffMembers.filter((s) => s.status !== 'inactive').length, [staffMembers]);
  const inactiveStaffCount = useMemo(() => staffMembers.filter((s) => s.status === 'inactive').length, [staffMembers]);

  // Filtered Drivers (Drivers without vehicles stay visible in attendance until set to inactive)
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        driver.name.toLowerCase().includes(q) ||
        (driver.code && driver.code.toLowerCase().includes(q)) ||
        (driver.personnelCode && driver.personnelCode.toLowerCase().includes(q)) ||
        (driver.vehiclePlate && driver.vehiclePlate.toLowerCase().includes(q)) ||
        (driver.phone && driver.phone.includes(q)) ||
        ((!driver.vehiclePlate || !driver.vehiclePlate.trim()) && ('بدون خودرو'.includes(q) || 'ذخیره'.includes(q) || 'کمکی'.includes(q)));

      if (!matchesSearch) return false;

      // Account Status Filter (active / inactive) - only inactive hides drivers from attendance
      if (accountStatusFilter === 'ACTIVE' && driver.status === 'inactive') return false;
      if (accountStatusFilter === 'INACTIVE' && driver.status !== 'inactive') return false;

      // Optional Vehicle Assignment Filter (defaults to ALL so unassigned drivers are never excluded)
      const hasVehicle = Boolean(driver.vehiclePlate && driver.vehiclePlate.trim());
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
    });
  }, [drivers, driverRecords, activeDateKey, searchQuery, statusFilter, accountStatusFilter, vehicleFilter, selectedYear, selectedMonth, selectedDay, isFutureActiveDate]);

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

  // Add new staff handler
  const handleSaveNewStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name?.trim()) {
      onShowToast('لطفاً نام پرسنل را وارد کنید', 'error');
      return;
    }
    const staffId = `staff-${Date.now()}`;
    const todayStr = formatPersianDateKey(today.jy, today.jm, today.jd);
    const newMember: StaffMember = {
      id: staffId,
      name: newStaffForm.name.trim(),
      code: newStaffForm.code?.trim() || `EMP-${toFaDigits(staffMembers.length + 101)}`,
      department: newStaffForm.department || STAFF_DEPARTMENTS[0],
      role: newStaffForm.role?.trim() || 'کارشناس عملیات',
      phone: newStaffForm.phone?.trim() || '',
      shift: newStaffForm.shift || 'night',
      entryTime: newStaffForm.entryTime || '20:00',
      exitTime: newStaffForm.exitTime || '06:00',
      notes: newStaffForm.notes?.trim() || '',
      status: 'active',
      missionsCountToday: 0,
      avatarColor: 'from-blue-600 to-indigo-700',
      hireDate: todayStr,
      createdAt: todayStr,
    };

    onAddStaffMember(newMember);
    setIsAddStaffModalOpen(false);
    setNewStaffForm({
      name: '',
      code: `EMP-${Math.floor(120 + Math.random() * 80)}`,
      department: STAFF_DEPARTMENTS[0],
      role: '',
      phone: '',
      shift: 'night',
      entryTime: '20:00',
      exitTime: '06:00',
      notes: '',
    });
    onShowToast(`پرسنل «${newMember.name}» با موفقیت افزوده شد`, 'success');
  };

  // Save detailed edit person
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

  // Toggle Active/Inactive status
  const handleToggleActive = (type: 'driver' | 'staff', id: string) => {
    if (type === 'driver') {
      if (onToggleDriverActive) {
        onToggleDriverActive(id);
      } else {
        onShowToast('امکان تغییر وضعیت راننده مهیا نیست', 'error');
      }
    } else {
      if (onToggleStaffActive) {
        onToggleStaffActive(id);
      } else {
        onShowToast('امکان تغییر وضعیت پرسنل مهیا نیست', 'error');
      }
    }
  };

  // Request Delete handler
  const handleRequestDelete = (type: 'driver' | 'staff', id: string, name: string, code?: string) => {
    setDeleteConfirmTarget({ type, id, name, code });
  };

  // Confirm Delete handler
  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    const { type, id } = deleteConfirmTarget;
    if (type === 'driver') {
      if (onDeleteDriver) {
        onDeleteDriver(id);
      }
    } else {
      if (onDeleteStaffMember) {
        onDeleteStaffMember(id);
      }
    }
    setDeleteConfirmTarget(null);
  };

  // Direct Add Driver handler
  const handleSaveDriverDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverForm.name.trim()) {
      onShowToast('نام و نام خانوادگی راننده الزامی است', 'error');
      return;
    }
    if (!newDriverForm.personnelCode.trim()) {
      onShowToast('کد پرسنلی راننده الزامی است', 'error');
      return;
    }

    if (onAddDriverDirect) {
      onAddDriverDirect({
        name: newDriverForm.name.trim(),
        code: newDriverForm.personnelCode.trim(),
        personnelCode: newDriverForm.personnelCode.trim(),
        vehiclePlate: newDriverForm.vehiclePlate.trim() || undefined,
        phone: newDriverForm.phone.trim() || undefined,
        nationalId: newDriverForm.nationalId.trim() || undefined,
        status: newDriverForm.status || 'active',
        createdAt: formatPersianDateKey(today.jy, today.jm, today.jd),
      });
    } else {
      onAddDriver();
    }

    setIsDirectAddDriverOpen(false);
    setNewDriverForm({
      name: '',
      personnelCode: '',
      vehiclePlate: '',
      phone: '',
      nationalId: '',
      status: 'active',
    });
  };

  // Save User Account Information
  const handleSaveUserInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserInfo) return;

    if (editingUserInfo.type === 'driver') {
      const targetDriver = drivers.find((d) => d.id === editingUserInfo.id);
      if (targetDriver && onUpdateDriver) {
        onUpdateDriver({
          ...targetDriver,
          name: editingUserInfo.name.trim(),
          code: editingUserInfo.code.trim(),
          personnelCode: editingUserInfo.code.trim(),
          phone: editingUserInfo.phone?.trim() || undefined,
          vehiclePlate: editingUserInfo.vehiclePlate?.trim() || undefined,
          status: editingUserInfo.status,
        });
      }
    } else {
      const targetStaff = staffMembers.find((s) => s.id === editingUserInfo.id);
      if (targetStaff) {
        onUpdateStaffMember({
          ...targetStaff,
          name: editingUserInfo.name.trim(),
          code: editingUserInfo.code.trim(),
          phone: editingUserInfo.phone?.trim() || undefined,
          department: editingUserInfo.department || targetStaff.department,
          role: editingUserInfo.role?.trim() || targetStaff.role,
          shift: editingUserInfo.shift || targetStaff.shift,
          status: editingUserInfo.status,
        });
      }
    }

    setEditingUserInfo(null);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. TOP EXECUTIVE HEADER BANNER (Inspired by Nightly Driver Dashboard Design) */}
      <div className="bg-gradient-to-r from-[#0d172c] via-[#101e38] to-[#0a1222] border border-[#22365e] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-1/4 w-96 h-36 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title & Live Status */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0 border border-blue-400/30">
              {activeBoard === 'DRIVERS' ? (
                <Truck className="w-6 h-6 text-white" />
              ) : (
                <Users className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  تابلوی حضور و غیاب و عملکرد عملیاتی
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  پایش برخط شیفت شب و روز
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                کنترل تردد، تفکیک رانندگان ناوگان و کادر ستادی، ثبت وضعیت حضور و کارکرد روزانه
              </p>
            </div>
          </div>

          {/* Date Navigator Box */}
          <div className="flex items-center gap-2 self-stretch lg:self-auto justify-between lg:justify-end bg-[#0a1222]/80 backdrop-blur border border-[#1e2f52] p-1.5 rounded-xl">
            <button
              onClick={handlePrevDay}
              title="روز قبل"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-[#13223f] border border-blue-500/30 rounded-lg text-center">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-white">
                  {activeWeekdayName}، {toFaDigits(selectedDay)} {PERSIAN_MONTH_NAMES[selectedMonth - 1]} {toFaDigits(selectedYear)}
                </div>
                <div className="text-[10px] text-blue-300">
                  {selectedYear === today.jy && selectedMonth === today.jm && selectedDay === today.jd ? 'تاریخ امروز' : `روز ${toFaDigits(selectedDay)} از ${toFaDigits(daysInCurrentMonth)}`}
                </div>
              </div>
            </div>

            <button
              onClick={handleNextDay}
              title="روز بعد"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {(selectedYear !== today.jy || selectedMonth !== today.jm || selectedDay !== today.jd) && (
              <button
                onClick={handleResetToToday}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
              >
                امروز
              </button>
            )}
          </div>
        </div>

        {/* PRIMARY BOARD SELECTOR TABS: Drivers vs Staff */}
        <div className="mt-5 pt-4 border-t border-[#1e2f52]/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-[#09101f] border border-[#1d2d4c] rounded-xl self-start">
            <button
              onClick={() => setActiveBoard('DRIVERS')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeBoard === 'DRIVERS'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>تابلوی رانندگان ناوگان</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeBoard === 'DRIVERS' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {toFaDigits(drivers.length)} راننده
              </span>
            </button>

            <button
              onClick={() => setActiveBoard('STAFF')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeBoard === 'STAFF'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>تابلوی پرسنل و کادر ستادی</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeBoard === 'STAFF' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {toFaDigits(staffMembers.length)} پرسنل
              </span>
            </button>
          </div>

          {/* Quick Header Actions: Mark All Present, Excel, Print, Add Person */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleMarkAllPresent}
              title="ثبت حضور تمام افراد با یک کلیک"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ثبت حضور همه</span>
            </button>

            <button
              onClick={handleExport}
              title="دریافت فایل اکسل"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#142340] hover:bg-[#1a2d52] text-slate-200 border border-[#273d6b] transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>خروجی اکسل</span>
            </button>

            {onOpenBackup && (
              <button
                onClick={onOpenBackup}
                title="پشتیبان‌گیری دستی از کل داده‌های برنامه (JSON)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#142340] hover:bg-[#1a2d52] text-amber-300 border border-amber-500/30 transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>بک‌آپ دستی (JSON)</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              title="چاپ برگه حضور و غیاب شیفت (سیاه‌وسفید لیزری)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#142340] hover:bg-[#1a2d52] text-slate-200 border border-[#273d6b] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>چاپ لیست کارکرد</span>
            </button>

            <button
              onClick={() => setLeaveCalendarPrintMode('DRIVERS')}
              title="چاپ فرم تقویم ماهانه مرخصی رانندگان (A4 عمودی)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>تقویم چاپی مرخصی رانندگان</span>
            </button>

            <button
              onClick={() => setLeaveCalendarPrintMode('STAFF')}
              title="چاپ فرم تقویم ماهانه مرخصی کاربران و پرسنل (A4 عمودی)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/35 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>تقویم چاپی مرخصی پرسنل</span>
            </button>

            {/* Direct User & Member Management Center button */}
            <button
              onClick={() => {
                setUserManagerTab(activeBoard);
                setIsUserManagerOpen(true);
              }}
              title="مدیریت کاربران، حذف، افزودن و فعال/غیرفعال‌سازی"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 transition-colors shadow-sm"
            >
              <UserCog className="w-3.5 h-3.5 text-indigo-400" />
              <span>مدیریت اعضا و کاربران</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/30 text-white rounded-full font-mono">
                {toFaDigits(activeBoard === 'DRIVERS' ? drivers.length : staffMembers.length)}
              </span>
            </button>

            {activeBoard === 'DRIVERS' ? (
              <button
                onClick={() => setIsDirectAddDriverOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>افزودن راننده</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>افزودن پرسنل</span>
              </button>
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
          <div className="text-[10px] text-slate-400 mt-1">ناوگان رسمی و ستاد حامی‌بار</div>
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
                    const isBeforeCreation = isDateBeforeStart(driver.createdAt, selectedYear, selectedMonth, selectedDay);
                    const isPresent = !isBeforeCreation && !isFutureActiveDate && st === 'none';
                    const isLeave = st === 'leave';
                    const isWorkshop = st === 'workshop';
                    const isAbsent = st === 'absent';
                    const isDriverActive = driver.status !== 'inactive';
                    const isDriverAnimating = animatingPersonId === driver.id;

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
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>کد راننده: {toFaDigits(driver.code)}</span>
                                  {driver.personnelCode && (
                                    <>
                                      <span>•</span>
                                      <span>کد پرسنلی: {toFaDigits(driver.personnelCode)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* User Management Actions & Attendance Status Pill */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {/* Direct user management quick bar */}
                              <div className="flex items-center gap-1 bg-[#091120] p-0.5 rounded-lg border border-[#1b2b48]">
                                {/* Toggle Active / Inactive */}
                                <button
                                  onClick={() => handleToggleActive('driver', driver.id)}
                                  title={isDriverActive ? 'غیرفعال کردن حساب کاربری راننده' : 'فعال‌سازی مجدد حساب کاربری راننده'}
                                  className={`p-1 rounded transition-colors ${
                                    isDriverActive
                                      ? 'text-emerald-400 hover:text-amber-400 hover:bg-amber-500/20'
                                      : 'text-rose-400 hover:text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  <Power className="w-3 h-3" />
                                </button>

                                {/* Edit Driver Info */}
                                <button
                                  onClick={() =>
                                    setEditingUserInfo({
                                      type: 'driver',
                                      id: driver.id,
                                      name: driver.name,
                                      code: driver.code,
                                      phone: driver.phone,
                                      vehiclePlate: driver.vehiclePlate,
                                      status: driver.status || 'active',
                                    })
                                  }
                                  title="ویرایش پرونده و مشخصات راننده"
                                  className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-blue-600/20 transition-colors"
                                >
                                  <UserCog className="w-3 h-3" />
                                </button>

                                {/* Delete Driver */}
                                <button
                                  onClick={() =>
                                    handleRequestDelete('driver', driver.id, driver.name, driver.code)
                                  }
                                  title="حذف دائمی راننده"
                                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-600/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Current Status Pill with Fast Smooth CSS Animation */}
                              <div key={`${st}-${isDriverAnimating}-${isBeforeCreation}`} className={isDriverAnimating ? 'animate-status-switch' : 'animate-status-pop'}>
                                {isBeforeCreation ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60" title={`تاریخ شروع به کار: ${driver.createdAt || 'نامشخص'}`}>
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    قبل از شروع به کار (ثبت‌نشده)
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
                          <div className="bg-[#091120] border border-[#1a2947] rounded-lg p-2 mb-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-[10px] text-slate-400 mb-0.5">وضعیت خودرو / پلاک:</div>
                              {driver.vehiclePlate ? (
                                <div className="scale-85 origin-right">
                                  <IranianPlate plateNumber={driver.vehiclePlate} size="sm" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-blue-500/10 border border-blue-500/25">
                                  <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <div>
                                    <div className="text-[11px] font-bold text-blue-300">بدون خودرو (نیروی آماده‌به‌کار / ذخیره)</div>
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
                        </div>

                        {/* Bottom Actions: Clean 4-Button Status Setter (حاضر / مرخصی / تعمیرگاه / غایب) */}
                        <div>
                          <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                            <span>تعیین وضعیت تاریخ {toFaDigits(selectedDay)} {PERSIAN_MONTH_NAMES[selectedMonth - 1]}:</span>
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
                              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                            >
                              <Edit className="w-2.5 h-2.5" />
                              جزئیات
                            </button>
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
                    const isBeforeCreation = isDateBeforeStart(staff.hireDate || staff.createdAt, selectedYear, selectedMonth, selectedDay);
                    const isPresent = !isBeforeCreation && !isFutureActiveDate && st === 'none';
                    const isLeave = st === 'leave';
                    const isWorkshop = st === 'workshop';
                    const isAbsent = st === 'absent';
                    const isStaffActive = staff.status !== 'inactive';
                    const isStaffAnimating = animatingPersonId === staff.id;

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

                            {/* User Management Actions & Attendance Status Badge */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {/* Direct user management quick bar */}
                              <div className="flex items-center gap-1 bg-[#091120] p-0.5 rounded-lg border border-[#1b2b48]">
                                {/* Toggle Active / Inactive */}
                                <button
                                  onClick={() => handleToggleActive('staff', staff.id)}
                                  title={isStaffActive ? 'غیرفعال کردن حساب پرسنل' : 'فعال‌سازی مجدد حساب پرسنل'}
                                  className={`p-1 rounded transition-colors ${
                                    isStaffActive
                                      ? 'text-emerald-400 hover:text-amber-400 hover:bg-amber-500/20'
                                      : 'text-rose-400 hover:text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  <Power className="w-3 h-3" />
                                </button>

                                {/* Edit Staff Member Details */}
                                <button
                                  onClick={() =>
                                    setEditingUserInfo({
                                      type: 'staff',
                                      id: staff.id,
                                      name: staff.name,
                                      code: staff.code,
                                      department: staff.department,
                                      role: staff.role,
                                      shift: staff.shift,
                                      phone: staff.phone,
                                      status: staff.status || 'active',
                                    })
                                  }
                                  title="ویرایش پرونده و اطلاعات پرسنل"
                                  className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-blue-600/20 transition-colors"
                                >
                                  <UserCog className="w-3 h-3" />
                                </button>

                                {/* Delete Staff Member */}
                                <button
                                  onClick={() =>
                                    handleRequestDelete('staff', staff.id, staff.name, staff.code)
                                  }
                                  title="حذف پرسنل از سیستم"
                                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-600/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Current Status Badge with Fast Smooth CSS Animation */}
                              <div key={`${st}-${isStaffAnimating}-${isBeforeCreation}`} className={isStaffAnimating ? 'animate-status-switch' : 'animate-status-pop'}>
                                {isBeforeCreation ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60" title={`تاریخ شروع به کار: ${staff.hireDate || staff.createdAt || 'نامشخص'}`}>
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    قبل از شروع به کار (ثبت‌نشده)
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

                        {/* Bottom Actions: Clean 4-Button Status Setter (حاضر / مرخصی / استراحت / غایب) */}
                        <div>
                          <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                            <span>تعیین وضعیت تاریخ {toFaDigits(selectedDay)} {PERSIAN_MONTH_NAMES[selectedMonth - 1]}:</span>
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
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                            >
                              <Edit className="w-2.5 h-2.5" />
                              تنظیم ساعات و یادداشت
                            </button>
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
                برای تغییر وضعیت هر روز، روی خانه مورد نظر کلیک نمایید.
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
                <span className="w-3 h-3 rounded bg-slate-900/80 border border-dotted border-slate-700/60 text-slate-600 flex items-center justify-center text-[8px]">
                  —
                </span>
                قبل از تاریخ شروع/استخدام
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-center text-xs border-collapse select-none">
              <thead className="bg-[#091120] sticky top-0 z-20 text-slate-300 font-bold border-b border-[#1e2f52]">
                <tr>
                  <th className="py-2.5 px-3 text-right sticky right-0 bg-[#091120] z-30 min-w-[140px] shadow-sm">
                    نام و مشخصات
                  </th>
                  <th className="py-2.5 px-2 min-w-[75px] text-slate-400">کد</th>
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
                {(activeBoard === 'DRIVERS' ? filteredDrivers : filteredStaff).map((person, idx) => {
                  const records = activeBoard === 'DRIVERS' ? driverRecords : staffRecords;
                  let presentCount = 0;
                  let leaveCount = 0;
                  let workshopCount = 0;
                  let elapsedDaysCount = 0;

                  return (
                    <tr key={person.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name column */}
                      <td className="py-2 px-3 text-right sticky right-0 bg-[#0e172a] z-10 font-medium text-white shadow-sm flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center shrink-0">
                            {toFaDigits(idx + 1)}
                          </span>
                          <div className="truncate max-w-[130px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={person.status === 'inactive' ? 'line-through text-slate-400' : ''}>
                                {person.name}
                              </span>
                              {person.status === 'inactive' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                  غیرفعال
                                </span>
                              )}
                              {activeBoard === 'DRIVERS' && !(person as Driver).vehiclePlate && (
                                <span
                                  className="text-[8.5px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                                  title="راننده بدون خودروی تحویلی (نیروی ذخیره)"
                                >
                                  بدون خودرو
                                </span>
                              )}
                            </div>
                            {'role' in person && (
                              <div className="text-[10px] text-slate-400 font-normal">{person.role}</div>
                            )}
                          </div>
                        </div>

                        {/* Quick User Management Actions in Table */}
                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleToggleActive(activeBoard === 'DRIVERS' ? 'driver' : 'staff', person.id)}
                            title={person.status === 'inactive' ? 'فعال‌سازی کاربر' : 'غیرفعال‌سازی کاربر'}
                            className={`p-1 rounded transition-colors ${
                              person.status === 'inactive'
                                ? 'text-rose-400 hover:text-emerald-400 hover:bg-emerald-500/20'
                                : 'text-emerald-400 hover:text-rose-400 hover:bg-rose-500/20'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              handleRequestDelete(
                                activeBoard === 'DRIVERS' ? 'driver' : 'staff',
                                person.id,
                                person.name,
                                person.code
                              )
                            }
                            title="حذف از سیستم"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-2 px-1 text-slate-400 font-mono text-[11px]">
                        {toFaDigits(person.code)}
                      </td>

                      {/* Days */}
                      {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((day) => {
                        const isFuture = isDayInFuture(day);
                        const personStartDate =
                          activeBoard === 'DRIVERS'
                            ? (person as Driver).createdAt
                            : ((person as StaffMember).hireDate || (person as StaffMember).createdAt);
                        const isBeforeCreation = isDateBeforeStart(personStartDate, selectedYear, selectedMonth, day);

                        if (!isFuture && !isBeforeCreation) elapsedDaysCount++;

                        const dateKey = formatPersianDateKey(selectedYear, selectedMonth, day);
                        const st = getStatus(records, person.id, dateKey);

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
                            onShowToast(`این روز قبل از تاریخ ایجاد/استخدام (${toFaDigits(personStartDate || '---')}) است`, 'info');
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
                            className={`p-0.5 ${isBeforeCreation ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} transition-colors group/cell ${
                              isSelectedDay ? 'bg-blue-600/10' : ''
                            } ${isCellAnimating ? 'bg-blue-500/20 ring-1 ring-blue-400/50' : ''}`}
                            title={
                              isBeforeCreation
                                ? `${person.name} - روز ${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]} - قبل از تاریخ ثبت/شروع به کار (${toFaDigits(personStartDate || '---')})`
                                : isCellEmptyFuture
                                ? `${person.name} - روز ${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]} - روز پیش‌رو (خالی / برای ثبت مرخصی کلیک کنید)`
                                : `${person.name} - روز ${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[selectedMonth - 1]} - وضعیت: ${
                                    st === 'none'
                                      ? 'حاضر'
                                      : st === 'leave'
                                      ? 'مرخصی'
                                      : st === 'workshop'
                                      ? (activeBoard === 'DRIVERS' ? 'تعمیرگاه' : 'استراحت')
                                      : 'غایب'
                                  }`
                            }
                          >
                            <div
                              key={`${st}-${isCellAnimating}-${isCellEmptyFuture}-${isBeforeCreation}`}
                              className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-[10px] font-bold matrix-status-cell ${
                                isCellAnimating
                                  ? 'animate-status-switch ring-2 ring-blue-400/80 shadow-md scale-110'
                                  : 'animate-status-pop'
                              } ${
                                isBeforeCreation
                                  ? 'bg-slate-900/60 text-slate-600 border border-dotted border-slate-700/60'
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
                              {isBeforeCreation ? (
                                <span className="text-[10px] text-slate-600 font-mono">—</span>
                              ) : isCellEmptyFuture ? (
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
              {activeBoard === 'DRIVERS' ? 'پایش آماده‌به‌کاری ناوگان حامی‌بار' : 'تفکیک پرسنل در واحدهای عملیاتی'}
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

      {/* 8. MODAL: ADD NEW STAFF MEMBER */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f192e] border border-[#22365e] rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                افزودن پرسنل جدید به کادر ستادی و عملیاتی
              </h3>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewStaff} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffForm.name || ''}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                    placeholder="مثال: مهدی حسینی"
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">کد پرسنلی:</label>
                  <input
                    type="text"
                    value={newStaffForm.code || ''}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, code: e.target.value })}
                    placeholder="EMP-..."
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">واحد سازمانی:</label>
                  <select
                    value={newStaffForm.department}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, department: e.target.value })}
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white focus:outline-none"
                  >
                    {STAFF_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">سمت / شغل:</label>
                  <input
                    type="text"
                    value={newStaffForm.role || ''}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                    placeholder="مثال: سرپرست شیفت شب دیسپچ"
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">شیفت کاری:</label>
                  <select
                    value={newStaffForm.shift}
                    onChange={(e) =>
                      setNewStaffForm({
                        ...newStaffForm,
                        shift: e.target.value as 'day' | 'night',
                      })
                    }
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value="day">شیفت روز (۰۷:۰۰ الی ۱۹:۰۰ ☀️)</option>
                    <option value="night">شیفت شب (۱۹:۰۰ الی ۰۷:۰۰ 🌙)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">ساعت ورود:</label>
                  <input
                    type="time"
                    value={newStaffForm.entryTime || '20:00'}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, entryTime: e.target.value })}
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">ساعت خروج:</label>
                  <input
                    type="time"
                    value={newStaffForm.exitTime || '06:00'}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, exitTime: e.target.value })}
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">شماره تماس همراه:</label>
                <input
                  type="text"
                  value={newStaffForm.phone || ''}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                  placeholder="0912..."
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">شرح وظایف و یادداشت:</label>
                <textarea
                  rows={2}
                  value={newStaffForm.notes || ''}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, notes: e.target.value })}
                  placeholder="توضیحات و وظایف اصلی در شرکت حامی‌بار..."
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2 text-white focus:outline-none"
                />
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  ثبت پرسنل جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: COMPREHENSIVE USER MANAGEMENT CENTER (مدیریت کاربران، حذف، اضافه، فعال/غیرفعال) */}
      {isUserManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b1325] border border-[#20345b] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2b48] bg-[#080e1c]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md border border-indigo-400/30">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    مدیریت کاربران و اعضا (رانندگان و پرسنل)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    حذف، افزودن، ویرایش مشخصات، و فعال یا غیرفعال‌سازی حساب کاربری اعضا
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUserManagerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs & Search/Action Bar */}
            <div className="p-4 border-b border-[#1a2947] bg-[#0c152a] space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Tab Switcher */}
                <div className="inline-flex p-1 bg-[#070d1a] border border-[#1a2947] rounded-xl self-start">
                  <button
                    onClick={() => setUserManagerTab('DRIVERS')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      userManagerTab === 'DRIVERS'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>رانندگان ناوگان</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
                      {toFaDigits(drivers.length)}
                    </span>
                  </button>

                  <button
                    onClick={() => setUserManagerTab('STAFF')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      userManagerTab === 'STAFF'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>پرسنل و کادر سازمانی</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
                      {toFaDigits(staffMembers.length)}
                    </span>
                  </button>
                </div>

                {/* Add New Member Button */}
                {userManagerTab === 'DRIVERS' ? (
                  <button
                    onClick={() => setIsDirectAddDriverOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors self-end sm:self-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ افزودن راننده جدید</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddStaffModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors self-end sm:self-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ افزودن پرسنل جدید</span>
                  </button>
                )}
              </div>

              {/* Filters row: Search + Active/Inactive Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={userManagerSearch}
                    onChange={(e) => setUserManagerSearch(e.target.value)}
                    placeholder="جستجو بر اساس نام، کد پرسنلی، شماره تلفن یا پلاک..."
                    className="w-full bg-[#080f1e] border border-[#1b2b48] rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {userManagerSearch && (
                    <button
                      onClick={() => setUserManagerSearch('')}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Account Status Filter */}
                <div className="flex items-center gap-1 bg-[#080f1e] p-1 rounded-xl border border-[#1b2b48] text-xs">
                  <button
                    onClick={() => setUserManagerAccountFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      userManagerAccountFilter === 'ALL'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    همه (
                    {toFaDigits(
                      userManagerTab === 'DRIVERS' ? drivers.length : staffMembers.length
                    )}
                    )
                  </button>
                  <button
                    onClick={() => setUserManagerAccountFilter('ACTIVE')}
                    className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                      userManagerAccountFilter === 'ACTIVE'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    فعال (
                    {toFaDigits(
                      userManagerTab === 'DRIVERS' ? activeDriversCount : activeStaffCount
                    )}
                    )
                  </button>
                  <button
                    onClick={() => setUserManagerAccountFilter('INACTIVE')}
                    className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                      userManagerAccountFilter === 'INACTIVE'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                    غیرفعال (
                    {toFaDigits(
                      userManagerTab === 'DRIVERS' ? inactiveDriversCount : inactiveStaffCount
                    )}
                    )
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body: Users Table */}
            <div className="overflow-y-auto flex-1 p-4">
              {(() => {
                const q = userManagerSearch.trim().toLowerCase();
                if (userManagerTab === 'DRIVERS') {
                  const list = drivers.filter((d) => {
                    const matchQ =
                      !q ||
                      d.name.toLowerCase().includes(q) ||
                      d.code.toLowerCase().includes(q) ||
                      (d.personnelCode && d.personnelCode.toLowerCase().includes(q)) ||
                      (d.phone && d.phone.includes(q)) ||
                      (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(q));
                    if (!matchQ) return false;
                    if (userManagerAccountFilter === 'ACTIVE' && d.status === 'inactive') return false;
                    if (userManagerAccountFilter === 'INACTIVE' && d.status !== 'inactive') return false;
                    return true;
                  });

                  if (list.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400">
                        <UserX className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                        <div className="text-white font-bold">هیچ راننده‌ای یافت نشد</div>
                        <div className="text-xs text-slate-500 mt-1">
                          فیلترها یا عبارت جستجو را تغییر دهید.
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="border border-[#1a2947] rounded-xl overflow-hidden shadow">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#091122] text-slate-300 font-bold border-b border-[#1a2947]">
                          <tr>
                            <th className="py-2.5 px-3">ردیف</th>
                            <th className="py-2.5 px-3">نام راننده</th>
                            <th className="py-2.5 px-3">کد راننده / پرسنلی</th>
                            <th className="py-2.5 px-3">پلاک خودرو</th>
                            <th className="py-2.5 px-3">شماره تماس</th>
                            <th className="py-2.5 px-3 text-center">وضعیت کاربری (سوئیچ)</th>
                            <th className="py-2.5 px-3 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#172542] bg-[#0c152a]">
                          {list.map((driver, idx) => {
                            const isActive = driver.status !== 'inactive';
                            return (
                              <tr
                                key={driver.id}
                                className={`hover:bg-[#121e38] transition-colors ${
                                  !isActive ? 'opacity-70 bg-[#08101e]' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-slate-400 font-mono">
                                  {toFaDigits(idx + 1)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span className={!isActive ? 'line-through text-slate-400' : ''}>
                                      {driver.name}
                                    </span>
                                    {!isActive && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                        غیرفعال
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 font-mono">
                                  {toFaDigits(driver.personnelCode || driver.code)}
                                </td>
                                <td className="py-2.5 px-3">
                                  {driver.vehiclePlate ? (
                                    <span className="scale-80 origin-right inline-block">
                                      <IranianPlate plateNumber={driver.vehiclePlate} size="xs" />
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 font-mono">
                                  {driver.phone ? toFaDigits(driver.phone) : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {/* Toggle Active Switch */}
                                  <button
                                    onClick={() => handleToggleActive('driver', driver.id)}
                                    title={isActive ? 'کلیک کنید تا غیرفعال شود' : 'کلیک کنید تا فعال شود'}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                                      isActive
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                    }`}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                      }`}
                                    />
                                    <span>{isActive ? 'فعال' : 'غیرفعال'}</span>
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() =>
                                        setEditingUserInfo({
                                          type: 'driver',
                                          id: driver.id,
                                          name: driver.name,
                                          code: driver.code,
                                          phone: driver.phone,
                                          vehiclePlate: driver.vehiclePlate,
                                          status: driver.status || 'active',
                                        })
                                      }
                                      title="ویرایش مشخصات"
                                      className="p-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleRequestDelete('driver', driver.id, driver.name, driver.code)
                                      }
                                      title="حذف راننده"
                                      className="p-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors"
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
                  );
                } else {
                  const list = staffMembers.filter((s) => {
                    const matchQ =
                      !q ||
                      s.name.toLowerCase().includes(q) ||
                      s.code.toLowerCase().includes(q) ||
                      s.role.toLowerCase().includes(q) ||
                      s.department.toLowerCase().includes(q) ||
                      (s.phone && s.phone.includes(q));
                    if (!matchQ) return false;
                    if (userManagerAccountFilter === 'ACTIVE' && s.status === 'inactive') return false;
                    if (userManagerAccountFilter === 'INACTIVE' && s.status !== 'inactive') return false;
                    return true;
                  });

                  if (list.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400">
                        <UserX className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                        <div className="text-white font-bold">هیچ عضوی از پرسنل یافت نشد</div>
                        <div className="text-xs text-slate-500 mt-1">
                          فیلترها یا عبارت جستجو را تغییر دهید.
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="border border-[#1a2947] rounded-xl overflow-hidden shadow">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#091122] text-slate-300 font-bold border-b border-[#1a2947]">
                          <tr>
                            <th className="py-2.5 px-3">ردیف</th>
                            <th className="py-2.5 px-3">نام پرسنل</th>
                            <th className="py-2.5 px-3">کد پرسنلی</th>
                            <th className="py-2.5 px-3">واحد سازمانی / سمت</th>
                            <th className="py-2.5 px-3">شیفت کاری</th>
                            <th className="py-2.5 px-3">شماره تماس</th>
                            <th className="py-2.5 px-3 text-center">وضعیت کاربری (سوئیچ)</th>
                            <th className="py-2.5 px-3 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#172542] bg-[#0c152a]">
                          {list.map((staff, idx) => {
                            const isActive = staff.status !== 'inactive';
                            return (
                              <tr
                                key={staff.id}
                                className={`hover:bg-[#121e38] transition-colors ${
                                  !isActive ? 'opacity-70 bg-[#08101e]' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-slate-400 font-mono">
                                  {toFaDigits(idx + 1)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span className={!isActive ? 'line-through text-slate-400' : ''}>
                                      {staff.name}
                                    </span>
                                    {!isActive && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                        غیرفعال
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 font-mono">
                                  {toFaDigits(staff.code)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="text-white font-medium">{staff.role}</div>
                                  <div className="text-[10px] text-slate-400">{staff.department}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[11px] font-semibold text-slate-300">
                                    {staff.shift === 'night' ? '🌙 شیفت شب' : '☀️ شیفت روز'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 font-mono">
                                  {staff.phone ? toFaDigits(staff.phone) : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {/* Toggle Active Switch */}
                                  <button
                                    onClick={() => handleToggleActive('staff', staff.id)}
                                    title={isActive ? 'کلیک کنید تا غیرفعال شود' : 'کلیک کنید تا فعال شود'}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                                      isActive
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                    }`}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                      }`}
                                    />
                                    <span>{isActive ? 'فعال' : 'غیرفعال'}</span>
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() =>
                                        setEditingUserInfo({
                                          type: 'staff',
                                          id: staff.id,
                                          name: staff.name,
                                          code: staff.code,
                                          department: staff.department,
                                          role: staff.role,
                                          shift: staff.shift,
                                          phone: staff.phone,
                                          status: staff.status || 'active',
                                        })
                                      }
                                      title="ویرایش مشخصات"
                                      className="p-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleRequestDelete('staff', staff.id, staff.name, staff.code)
                                      }
                                      title="حذف پرسنل"
                                      className="p-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors"
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
                  );
                }
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 px-5 bg-[#080e1c] border-t border-[#1b2b48] flex items-center justify-between text-xs text-slate-400">
              <div>
                💡 <span className="text-slate-300">نکته:</span> غیرفعال کردن عضو، پرونده و رکوردهای او را حفظ می‌کند اما او را از برنامه‌ریزی جاری معلق می‌نماید.
              </div>
              <button
                onClick={() => setIsUserManagerOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: DIRECT ADD DRIVER MODAL (افزودن راننده جدید به حضور و غیاب) */}
      {isDirectAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-[#22365e] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                افزودن راننده جدید به سیستم
              </h3>
              <button
                onClick={() => setIsDirectAddDriverOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverDirect} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  نام و نام خانوادگی راننده <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newDriverForm.name}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, name: e.target.value })}
                  placeholder="مثال: عباس محمدی"
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    کد پرسنلی / راننده <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={newDriverForm.personnelCode}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, personnelCode: e.target.value })}
                    placeholder="مثال: 104"
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">شماره تماس همراه:</label>
                  <input
                    type="text"
                    value={newDriverForm.phone}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                    placeholder="0912..."
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">پلاک خودرو تخصیص‌یافته (اختیاری):</label>
                  {newDriverForm.vehiclePlate && (
                    <button
                      type="button"
                      onClick={() => setNewDriverForm({ ...newDriverForm, vehiclePlate: '' })}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                    >
                      ثبت به عنوان راننده بدون خودرو
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={newDriverForm.vehiclePlate}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, vehiclePlate: e.target.value })}
                  placeholder="اختیاری - در صورت راننده کمکی/بدون خودرو خالی بگذارید"
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                />
                {!newDriverForm.vehiclePlate && (
                  <p className="text-[10.5px] text-amber-300/80 mt-1">
                    در صورت عدم تخصیص خودرو، راننده به عنوان نیروی ذخیره ثبت شده و مرخصی‌های او به طور کامل در تقویم و گزارش‌ها نگهداری خواهد شد.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">کد ملی راننده (اختیاری):</label>
                <input
                  type="text"
                  value={newDriverForm.nationalId}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, nationalId: e.target.value })}
                  placeholder="کد ۱۰ رقمی..."
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">وضعیت اولیه حساب کاربری:</label>
                <select
                  value={newDriverForm.status}
                  onChange={(e) =>
                    setNewDriverForm({
                      ...newDriverForm,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="active">حساب کاربری فعال (آماده‌به‌کار)</option>
                  <option value="inactive">حساب کاربری غیرفعال (تعلیق موقت)</option>
                </select>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDirectAddDriverOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                >
                  افزودن و ذخیره راننده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL: EDIT USER/MEMBER PERSONAL DETAILS (ویرایش مشخصات فردی) */}
      {editingUserInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-[#22365e] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                ویرایش مشخصات {editingUserInfo.type === 'driver' ? 'راننده' : 'عضو پرسنل'}
              </h3>
              <button
                onClick={() => setEditingUserInfo(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserInfo} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={editingUserInfo.name}
                  onChange={(e) => setEditingUserInfo({ ...editingUserInfo, name: e.target.value })}
                  className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">کد پرسنلی / کاربری:</label>
                  <input
                    type="text"
                    required
                    value={editingUserInfo.code}
                    onChange={(e) => setEditingUserInfo({ ...editingUserInfo, code: e.target.value })}
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">شماره تماس همراه:</label>
                  <input
                    type="text"
                    value={editingUserInfo.phone || ''}
                    onChange={(e) => setEditingUserInfo({ ...editingUserInfo, phone: e.target.value })}
                    placeholder="0912..."
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {editingUserInfo.type === 'driver' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">پلاک خودرو تخصیص‌یافته:</label>
                    {editingUserInfo.vehiclePlate && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingUserInfo({ ...editingUserInfo, vehiclePlate: '' })
                        }
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                      >
                        عدم تخصیص خودرو (راننده بدون خودرو)
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editingUserInfo.vehiclePlate || ''}
                    onChange={(e) =>
                      setEditingUserInfo({ ...editingUserInfo, vehiclePlate: e.target.value })
                    }
                    placeholder="اختیاری - در صورت راننده کمکی/بدون خودرو خالی بگذارید"
                    className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  {!editingUserInfo.vehiclePlate && (
                    <p className="text-[10.5px] text-amber-300/80 mt-1">
                      این راننده به عنوان نیروی کمکی/ذخیره ذخیره شده و مرخصی‌ها و سوابق حضور ایشان در سامانه محفوظ خواهد ماند.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">واحد سازمانی:</label>
                      <select
                        value={editingUserInfo.department}
                        onChange={(e) =>
                          setEditingUserInfo({ ...editingUserInfo, department: e.target.value })
                        }
                        className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white focus:outline-none"
                      >
                        {STAFF_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">سمت / شغل:</label>
                      <input
                        type="text"
                        value={editingUserInfo.role || ''}
                        onChange={(e) =>
                          setEditingUserInfo({ ...editingUserInfo, role: e.target.value })
                        }
                        className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white focus:outline-none"
                      >
                      </input>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">شیفت کاری:</label>
                    <select
                      value={editingUserInfo.shift}
                      onChange={(e) =>
                        setEditingUserInfo({
                          ...editingUserInfo,
                          shift: e.target.value as 'day' | 'night',
                        })
                      }
                      className="w-full bg-[#0a1222] border border-[#1f2f50] rounded-lg p-2.5 text-white focus:outline-none"
                    >
                      <option value="day">شیفت روز (۰۷:۰۰ الی ۱۹:۰۰ ☀️)</option>
                      <option value="night">شیفت شب (۱۹:۰۰ الی ۰۷:۰۰ 🌙)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Status active/inactive switch */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">وضعیت حساب کاربری:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUserInfo({ ...editingUserInfo, status: 'active' })}
                    className={`p-2.5 rounded-lg font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      editingUserInfo.status === 'active'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                        : 'bg-[#0a1222] text-slate-400 border-[#1f2f50] hover:text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>فعال (آماده‌به‌کار)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingUserInfo({ ...editingUserInfo, status: 'inactive' })}
                    className={`p-2.5 rounded-lg font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      editingUserInfo.status === 'inactive'
                        ? 'bg-rose-600 text-white border-rose-500 shadow'
                        : 'bg-[#0a1222] text-slate-400 border-[#1f2f50] hover:text-white'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    <span>غیرفعال (تعلیق)</span>
                  </button>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUserInfo(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                >
                  ذخیره تغییرات مشخصات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. DIALOG: CONFIRM DELETE USER (تأییدیه حذف قطعی) */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-rose-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-base">
              حذف قطعی {deleteConfirmTarget.type === 'driver' ? 'راننده' : 'عضو پرسنل'}
            </h4>
            <p className="text-xs text-slate-300 mt-2">
              آیا از حذف «<strong className="text-white">{deleteConfirmTarget.name}</strong>»
              {deleteConfirmTarget.code && ` (کد: ${toFaDigits(deleteConfirmTarget.code)})`} از سیستم و تابلوی حضور و غیاب اطمینان دارید؟
            </p>
            <p className="text-[11px] text-rose-400/90 mt-1.5 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              توجه: این اقدام غیرقابل بازگشت است و رکوردهای وضعیت این کاربر نیز پاک خواهند شد. اگر می‌خواهید فرد موقتاً در شیفت‌ها نباشد، می‌توانید او را «غیرفعال» کنید.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                بله، برای همیشه حذف کن
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
