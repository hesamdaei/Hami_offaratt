import { FC, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Driver,
  AttendanceRecords,
  AttendanceStatus,
  FilterView,
  ToastMessage,
  StaffMember,
  AttendanceNotes,
} from './types';
import {
  getInitialDrivers,
  getInitialAttendanceRecords,
} from './utils/defaultDrivers';
import {
  VehicleItem,
  DriverDirectoryItem,
  INITIAL_VEHICLES,
  INITIAL_DRIVER_DIRECTORY,
} from './utils/fleetSeedData';
import {
  INITIAL_STAFF_MEMBERS,
  getInitialStaffAttendanceRecords,
} from './utils/staffSeedData';
import { toFaDigits, getTodayJalaali, formatPersianDateKey } from './utils/jalaali';
import { DECODED_BACKUP } from './utils/backupDecoder';
import { exportToExcel } from './utils/excelExport';
import { Header, ActiveAppTab } from './components/Header';
import { AttendanceManagementHubView } from './components/AttendanceManagementHubView';
import { VehicleAssignmentHubView } from './components/VehicleAssignmentHubView';
import { DriversDirectoryView } from './components/DriversDirectoryView';
import { StaffDirectoryView } from './components/StaffDirectoryView';
import { OilServiceManagementView } from './components/OilServiceManagementView';
import { DriverRegulationsView } from './components/DriverRegulationsView';
import { VehicleHandoverManager } from './components/VehicleHandoverManager';
import { TimelineModal } from './components/TimelineModal';
import { AddDriverModal } from './components/AddDriverModal';
import { RangeAssignModal } from './components/RangeAssignModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { BackupRestoreModal, FullBackupData } from './components/BackupRestoreModal';
import { LanSharingModal } from './components/LanSharingModal';
import {
  fetchSharedLanDatabase,
  saveSharedLanDatabase,
  checkLanServerVersion,
} from './utils/lanSyncService';
import { Sidebar12 } from './components/Sidebar12';
import { Toast } from './components/Toast';
import { CalendarDays, Users, UserCheck, Droplet, BookOpen, Clock, Truck, Menu } from 'lucide-react';
import { AppUser } from './types/auth';
import {
  getStoredSession,
  saveStoredSession,
  logoutUser,
  isMasterAdmin,
  canViewModule,
  canManageUsers,
} from './utils/authService';
import { LoginView } from './components/LoginView';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationPopover } from './components/NotificationPopover';
import { UserManagementModal } from './components/UserManagementModal';
import { IntegratedUserAndAuditHubView } from './components/IntegratedUserAndAuditHubView';
import { recordAuditLog } from './utils/auditLogger';
import { BaleMessengerModal } from './components/BaleMessengerModal';
import { MasterAdminModal } from './components/MasterAdminModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppNotification } from './types/notification';
import { generateSystemNotifications } from './utils/notificationService';

const STORAGE_KEY_DRIVERS = 'hamibar_drivers_list_v1';
const STORAGE_KEY_RECORDS = 'hamibar_attendance_records_v1';
const STORAGE_KEY_VEHICLES = 'hamibar_vehicles_list_v1';
const STORAGE_KEY_DRIVER_DIRECTORY = 'hamibar_driver_directory_v1';
const STORAGE_KEY_STAFF_MEMBERS = 'hamibar_staff_members_v1';
const STORAGE_KEY_STAFF_RECORDS = 'hamibar_staff_records_v1';
const STORAGE_KEY_ATTENDANCE_NOTES = 'hamibar_attendance_notes_v1';
const BACKUP_APPLIED_KEY = 'hami_backup_applied_v2';
const PDF_SYNC_KEY = 'hamibar_fleet_pdf_14050722_sync_v4';

export const App: FC = () => {
  const today = useMemo(() => getTodayJalaali(), []);

  // Main active navigation tab (default to Attendance Hub)
  const [activeTab, setActiveTab] = useState<ActiveAppTab>('ATTENDANCE');
  const [fleetSubTab, setFleetSubTab] = useState<'SPECIFICATIONS' | 'DASHBOARD' | 'INSURANCE_ALERTS' | 'ENTRY' | 'HISTORY' | 'RULES'>('SPECIFICATIONS');
  const [highlightedInsuranceVehicleId, setHighlightedInsuranceVehicleId] = useState<string | null>(null);

  const handleTabChange = (tab: ActiveAppTab) => {
    setActiveTab(tab);
  };

  const handleNavigateToFleetInsurance = (vehicleId?: string) => {
    setActiveTab('OIL_SERVICE');
    setFleetSubTab('INSURANCE_ALERTS');
    if (vehicleId) {
      setHighlightedInsuranceVehicleId(vehicleId);
    }
  };

  // Preselected Vehicle / Driver for Vehicle Handover Form
  const [preselectedHandoverVehicle, setPreselectedHandoverVehicle] = useState<VehicleItem | null>(null);
  const [preselectedHandoverDriver, setPreselectedHandoverDriver] = useState<Driver | DriverDirectoryItem | null>(null);

  const handleOpenHandoverForVehicle = (vehicle: VehicleItem, driverName?: string) => {
    setPreselectedHandoverVehicle(vehicle);
    if (driverName) {
      const foundDriver =
        drivers.find((d) => d.name.trim() === driverName.trim()) ||
        driverDirectory.find((d) => d.name.trim() === driverName.trim());
      setPreselectedHandoverDriver(foundDriver || null);
    } else {
      setPreselectedHandoverDriver(null);
    }
    setActiveTab('HANDOVER');
  };

  const handleOpenHandoverForDriver = (driver: DriverDirectoryItem) => {
    setPreselectedHandoverDriver(driver);
    if (driver.assignedVehicles && driver.assignedVehicles.length > 0) {
      const v = vehicles.find((veh) => veh.plateNumber === driver.assignedVehicles[0]);
      setPreselectedHandoverVehicle(v || null);
    } else {
      setPreselectedHandoverVehicle(null);
    }
    setActiveTab('HANDOVER');
  };

  // Active viewing period (Jalaali Year & Month)
  const [activeYear, setActiveYear] = useState<number>(today.jy);
  const [activeMonth, setActiveMonth] = useState<number>(today.jm);

  // Drivers and Attendance Data from localStorage
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const isPdfSynced = localStorage.getItem(PDF_SYNC_KEY);
      if (isPdfSynced !== 'true') {
        return DECODED_BACKUP.drivers.length > 0 ? DECODED_BACKUP.drivers : getInitialDrivers();
      }
      const isApplied = localStorage.getItem(BACKUP_APPLIED_KEY);
      const saved = localStorage.getItem(STORAGE_KEY_DRIVERS);
      if (isApplied === 'true' && saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 20) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DECODED_BACKUP.drivers.length > 0 ? DECODED_BACKUP.drivers : getInitialDrivers();
  });

  const [records, setRecords] = useState<AttendanceRecords>(() => {
    try {
      const isApplied = localStorage.getItem(BACKUP_APPLIED_KEY);
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (isApplied === 'true' && saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return Object.keys(DECODED_BACKUP.records).length > 0 ? DECODED_BACKUP.records : getInitialAttendanceRecords();
  });

  // Vehicles dataset state (for Oil Service tracking)
  const [vehicles, setVehicles] = useState<VehicleItem[]>(() => {
    try {
      const isPdfSynced = localStorage.getItem(PDF_SYNC_KEY);
      if (isPdfSynced !== 'true') {
        return DECODED_BACKUP.vehicles.length > 0 ? DECODED_BACKUP.vehicles : INITIAL_VEHICLES;
      }
      const isApplied = localStorage.getItem(BACKUP_APPLIED_KEY);
      const saved = localStorage.getItem(STORAGE_KEY_VEHICLES);
      if (isApplied === 'true' && saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 20) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DECODED_BACKUP.vehicles.length > 0 ? DECODED_BACKUP.vehicles : INITIAL_VEHICLES;
  });

  // Driver Directory (Dossier) dataset state
  const [driverDirectory, setDriverDirectory] = useState<DriverDirectoryItem[]>(() => {
    try {
      const isPdfSynced = localStorage.getItem(PDF_SYNC_KEY);
      if (isPdfSynced !== 'true') {
        return DECODED_BACKUP.driverDirectory.length > 0 ? DECODED_BACKUP.driverDirectory : INITIAL_DRIVER_DIRECTORY;
      }
      const isApplied = localStorage.getItem(BACKUP_APPLIED_KEY);
      const saved = localStorage.getItem(STORAGE_KEY_DRIVER_DIRECTORY);
      if (isApplied === 'true' && saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 20) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DECODED_BACKUP.driverDirectory.length > 0 ? DECODED_BACKUP.driverDirectory : INITIAL_DRIVER_DIRECTORY;
  });

  // Staff dataset state (Separate Attendance & Dossiers)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    try {
      const isApplied = localStorage.getItem(BACKUP_APPLIED_KEY);
      const saved = localStorage.getItem(STORAGE_KEY_STAFF_MEMBERS);
      if (isApplied === 'true' && saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_STAFF_MEMBERS;
  });

  const [staffRecords, setStaffRecords] = useState<AttendanceRecords>(() => {
    try {
      const isApplied = localStorage.getItem(BACKUP_APPLIED_KEY);
      const saved = localStorage.getItem(STORAGE_KEY_STAFF_RECORDS);
      if (isApplied === 'true' && saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return getInitialStaffAttendanceRecords();
  });

  // Daily Attendance Notes state (Right-click day notes per person)
  const [attendanceNotes, setAttendanceNotes] = useState<AttendanceNotes>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATTENDANCE_NOTES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE_NOTES, JSON.stringify(attendanceNotes));
    } catch {
      // ignore
    }
  }, [attendanceNotes]);

  const handleUpdateAttendanceNote = (personId: string, dateKey: string, noteText: string) => {
    setAttendanceNotes((prev) => {
      const personNotes = { ...(prev[personId] || {}) };
      const trimmed = noteText.trim();
      if (!trimmed) {
        delete personNotes[dateKey];
      } else {
        personNotes[dateKey] = trimmed;
      }
      return {
        ...prev,
        [personId]: personNotes,
      };
    });
  };

  // Filter State (Attendance)
  const [filterView, setFilterView] = useState<FilterView>('all');

  // Modals state
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isRangeAssignOpen, setIsRangeAssignOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isLanModalOpen, setIsLanModalOpen] = useState(false);

  // Network Central Database Sync States
  const [networkDbStatus, setNetworkDbStatus] = useState<'CONNECTED' | 'SAVING' | 'SYNCED' | 'OFFLINE' | 'ERROR'>('OFFLINE');
  const [lastDbSavedAt, setLastDbSavedAt] = useState<string | null>(null);
  const localDbVersionRef = useRef<string>('');
  const isInitialLoadDoneRef = useRef<boolean>(false);
  const isSyncingFromRemoteRef = useRef<boolean>(false);
  const isSaveInFlightRef = useRef<boolean>(false);
  const hasLocalPendingEditsRef = useRef<boolean>(false);

  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredSession());

  // User Area, User Management, and Notification Popover states
  const [isUserAreaOpen, setIsUserAreaOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Bale Messenger Modal State
  const [isBaleModalOpen, setIsBaleModalOpen] = useState(false);
  const [baleRecipient, setBaleRecipient] = useState<{
    name?: string;
    phone?: string;
    vehicleCode?: string | number;
    plateNumber?: string;
    vehicleType?: string;
    templateId?: string;
    customNote?: string;
  } | null>(null);

  const handleOpenBale = (recipient?: {
    name?: string;
    phone?: string;
    vehicleCode?: string | number;
    plateNumber?: string;
    vehicleType?: string;
    templateId?: string;
    customNote?: string;
  } | null) => {
    setBaleRecipient(recipient || null);
    setIsBaleModalOpen(true);
  };
  const handleOpenEitaa = handleOpenBale;

  // Master Admin Modal State (Infrastructure, Bale Bot, Users, Backup, Debug)
  const [isMasterAdminOpen, setIsMasterAdminOpen] = useState(false);
  const [masterAdminTab, setMasterAdminTab] = useState<'network' | 'bale' | 'users' | 'backup' | 'debug'>('network');

  const handleOpenMasterAdmin = (tab: 'network' | 'bale' | 'users' | 'backup' | 'debug' = 'network') => {
    setMasterAdminTab(tab);
    setIsMasterAdminOpen(true);
  };

  const handleReloadAfterDataRepair = () => {
    try {
      const vStr = localStorage.getItem(STORAGE_KEY_VEHICLES);
      if (vStr) {
        const parsed = JSON.parse(vStr);
        if (Array.isArray(parsed)) setVehicles(parsed);
      }
      const dStr = localStorage.getItem(STORAGE_KEY_DRIVERS);
      if (dStr) {
        const parsed = JSON.parse(dStr);
        if (Array.isArray(parsed)) setDrivers(parsed);
      }
    } catch {
      // ignore
    }
  };

  // Dynamic Real-time Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    generateSystemNotifications({
      currentUser: getStoredSession(),
      drivers: DECODED_BACKUP.drivers.length > 0 ? DECODED_BACKUP.drivers : getInitialDrivers(),
      records: Object.keys(DECODED_BACKUP.records).length > 0 ? DECODED_BACKUP.records : getInitialAttendanceRecords(),
      vehicles: INITIAL_VEHICLES,
      driverDirectory: INITIAL_DRIVER_DIRECTORY,
      networkDbStatus: 'OFFLINE',
    })
  );

  // Sync notifications whenever state changes
  useEffect(() => {
    if (currentUser) {
      setNotifications((prev) => {
        const fresh = generateSystemNotifications({
          currentUser,
          drivers,
          records,
          vehicles,
          driverDirectory,
          networkDbStatus,
          todayDateFa: today.fullFa,
        });
        const readIds = new Set(prev.filter((n) => n.read).map((n) => n.id));
        return fresh.map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
      });
    }
  }, [currentUser, drivers, records, vehicles, driverDirectory, networkDbStatus, today.fullFa]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Handle Login & Logout
  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    saveStoredSession(user);
    showToast(`خوش آمدید، ${user.fullName} (${user.roleTitle || 'کاربر سامانه'})`, 'success');

    recordAuditLog(user, {
      action: 'AUTH_LOGIN',
      module: 'AUTH',
      title: 'ورود موفق به سامانه',
      description: `کاربر «${user.fullName}» با نام کاربری ${user.username} وارد سامانه شد.`,
      severity: 'INFO',
    });
  };

  const handleLogout = () => {
    if (currentUser) {
      recordAuditLog(currentUser, {
        action: 'AUTH_LOGOUT',
        module: 'AUTH',
        title: 'خروج از حساب کاربری',
        description: `کاربر «${currentUser.fullName}» از سامانه خارج شد.`,
        severity: 'INFO',
      });
    }
    logoutUser();
    setCurrentUser(null);
    setIsUserAreaOpen(false);
    setIsUserManagementOpen(false);
    setIsNotificationsOpen(false);
    showToast('با موفقیت از حساب کاربری خارج شدید.', 'info');
  };

  // Automatically divert user if current activeTab is not permitted
  useEffect(() => {
    if (!currentUser || isMasterAdmin(currentUser)) return;
    const isCurrentTabAllowed = () => {
      switch (activeTab) {
        case 'ATTENDANCE':
          return canViewModule(currentUser, 'attendance');
        case 'VEHICLE_ASSIGNMENT':
          return canViewModule(currentUser, 'drivers') || canViewModule(currentUser, 'oilService');
        case 'DRIVERS':
          return canViewModule(currentUser, 'drivers');
        case 'STAFF':
          return canViewModule(currentUser, 'staff');
        case 'OIL_SERVICE':
          return canViewModule(currentUser, 'oilService');
        case 'HANDOVER':
          return canViewModule(currentUser, 'drivers') || canViewModule(currentUser, 'regulations');
        case 'REGULATIONS':
          return canViewModule(currentUser, 'regulations');
        case 'USERS_LOGS':
          return canManageUsers(currentUser) || isMasterAdmin(currentUser);
        default:
          return true;
      }
    };
    if (!isCurrentTabAllowed()) {
      if (canViewModule(currentUser, 'attendance')) setActiveTab('ATTENDANCE');
      else if (canViewModule(currentUser, 'drivers')) setActiveTab('DRIVERS');
      else if (canViewModule(currentUser, 'staff')) setActiveTab('STAFF');
      else if (canViewModule(currentUser, 'oilService')) setActiveTab('OIL_SERVICE');
      else if (canViewModule(currentUser, 'regulations')) setActiveTab('REGULATIONS');
      else if (canManageUsers(currentUser)) setActiveTab('USERS_LOGS');
    }
  }, [currentUser, activeTab]);

  // Helper to read auxiliary modules (regulations, affidavit, rules) from localStorage for central DB
  const getAuxiliaryModulesData = () => {
    let savedRegulations = null;
    let savedAffidavit = null;
    let savedRules = null;
    try {
      const regRaw = localStorage.getItem('hamibar_editable_regulations_v2');
      if (regRaw) savedRegulations = JSON.parse(regRaw);
      const affRaw = localStorage.getItem('hamibar_editable_affidavit_v2');
      if (affRaw) savedAffidavit = affRaw;
      const rulesRaw = localStorage.getItem('hamibar_service_rules_v1');
      if (rulesRaw) savedRules = JSON.parse(rulesRaw);
    } catch {}
    return { regulations: savedRegulations, affidavit: savedAffidavit, rules: savedRules };
  };

  // One-time Sync for Fleet & Driver dataset from official PDF (14050722__c79532b9.pdf)
  useEffect(() => {
    try {
      const isPdfSynced = localStorage.getItem(PDF_SYNC_KEY);
      if (isPdfSynced !== 'true') {
        setDrivers(DECODED_BACKUP.drivers);
        setVehicles(DECODED_BACKUP.vehicles);
        setDriverDirectory(DECODED_BACKUP.driverDirectory);
        localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(DECODED_BACKUP.drivers));
        localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(DECODED_BACKUP.vehicles));
        localStorage.setItem(STORAGE_KEY_DRIVER_DIRECTORY, JSON.stringify(DECODED_BACKUP.driverDirectory));
        localStorage.setItem(BACKUP_APPLIED_KEY, 'true');
        localStorage.setItem(PDF_SYNC_KEY, 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const normalizeDriverName = useCallback((name?: string): string => {
    if (!name) return '';
    return name
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const isAssignedDriverName = useCallback(
    (name?: string): boolean => {
      const clean = normalizeDriverName(name);
      return Boolean(clean && clean !== 'بدون راننده' && clean !== 'NONE' && clean !== 'فاقد راننده');
    },
    [normalizeDriverName]
  );

  // 1. Auto-sync: Ensure every active driver in driverDirectory or vehicles is present in drivers list (for Attendance Board)
  useEffect(() => {
    const existingNormNames = new Set(drivers.map((d) => normalizeDriverName(d.name)));
    const missingActiveDrivers: Driver[] = [];

    driverDirectory.forEach((dirDriver) => {
      const normName = normalizeDriverName(dirDriver.name);
      const isDirActive = dirDriver.status !== 'inactive' && dirDriver.status !== 'INACTIVE';
      if (isDirActive && normName && !existingNormNames.has(normName)) {
        existingNormNames.add(normName);
        const assignedVehicle = vehicles.find(
          (v) => isAssignedDriverName(v.driverName) && normalizeDriverName(v.driverName) === normName
        );
        const plate = assignedVehicle ? assignedVehicle.plateNumber : '';
        const vehicleCode = assignedVehicle ? String(assignedVehicle.code) : dirDriver.code || dirDriver.personnelCode || '';
        missingActiveDrivers.push({
          id: dirDriver.id || `drv-sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: dirDriver.name.trim(),
          code: vehicleCode,
          personnelCode: dirDriver.personnelCode || dirDriver.code || vehicleCode,
          phone: dirDriver.phone || assignedVehicle?.driverPhone || '',
          status: 'active',
          vehiclePlate: plate,
          createdAt: dirDriver.joinedDate || formatPersianDateKey(today.jy, today.jm, today.jd),
        });
      }
    });

    vehicles.forEach((v) => {
      const normName = normalizeDriverName(v.driverName);
      if (isAssignedDriverName(v.driverName) && normName && !existingNormNames.has(normName)) {
        existingNormNames.add(normName);
        missingActiveDrivers.push({
          id: `drv-veh-${v.id}`,
          name: v.driverName.trim(),
          code: String(v.code),
          personnelCode: v.driverCode || String(v.code),
          phone: v.driverPhone || '',
          status: 'active',
          vehiclePlate: v.plateNumber,
          createdAt: formatPersianDateKey(today.jy, today.jm, today.jd),
        });
      }
    });

    if (missingActiveDrivers.length > 0) {
      setDrivers((prev) => [...prev, ...missingActiveDrivers]);
    }
  }, [driverDirectory, vehicles, drivers, today, normalizeDriverName, isAssignedDriverName]);

  // 2. Auto-sync: Synchronize vehiclePlate & vehicle code in drivers and driverDirectory whenever vehicles list changes
  useEffect(() => {
    setDrivers((prevDrivers) => {
      let changed = false;
      const updated = prevDrivers.map((d) => {
        const normName = normalizeDriverName(d.name);
        const assignedVehicle = vehicles.find(
          (v) => isAssignedDriverName(v.driverName) && normalizeDriverName(v.driverName) === normName
        );
        const expectedPlate = assignedVehicle ? assignedVehicle.plateNumber : '';
        const expectedCode = assignedVehicle ? String(assignedVehicle.code) : d.code;
        const preservedPersonnelCode = d.personnelCode || d.code;

        if ((d.vehiclePlate || '') !== expectedPlate || d.code !== expectedCode) {
          changed = true;
          return {
            ...d,
            vehiclePlate: expectedPlate,
            code: expectedCode,
            personnelCode: preservedPersonnelCode,
          };
        }
        return d;
      });
      return changed ? updated : prevDrivers;
    });

    setDriverDirectory((prevDir) => {
      let dirChanged = false;
      const updatedDir = prevDir.map((dir) => {
        const normName = normalizeDriverName(dir.name);
        const matchedVehicles = vehicles.filter(
          (v) => isAssignedDriverName(v.driverName) && normalizeDriverName(v.driverName) === normName
        );
        const expectedPlates = matchedVehicles.map((v) => v.plateNumber);
        const expectedCode = matchedVehicles.length > 0 ? String(matchedVehicles[0].code) : dir.code;
        const currentPlates = dir.assignedVehicles || [];

        const platesDiffer =
          currentPlates.length !== expectedPlates.length ||
          currentPlates.some((p, i) => p !== expectedPlates[i]);

        if (platesDiffer || dir.code !== expectedCode) {
          dirChanged = true;
          return {
            ...dir,
            assignedVehicles: expectedPlates,
            code: expectedCode,
            personnelCode: dir.personnelCode || dir.code,
          };
        }
        return dir;
      });
      return dirChanged ? updatedDir : prevDir;
    });
  }, [vehicles, normalizeDriverName, isAssignedDriverName]);

  // Initial load from Central Network Database on startup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const remoteData = await fetchSharedLanDatabase();
        if (!isMounted) return;

        if (remoteData && (
          (Array.isArray(remoteData.drivers) && remoteData.drivers.length > 0) ||
          (Array.isArray(remoteData.vehicles) && remoteData.vehicles.length > 0)
        )) {
          isSyncingFromRemoteRef.current = true;
          if (Array.isArray(remoteData.drivers) && remoteData.drivers.length > 0) {
            setDrivers(remoteData.drivers);
            localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(remoteData.drivers));
          }
          if (remoteData.records) {
            setRecords(remoteData.records);
            localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(remoteData.records));
          }
          if (Array.isArray(remoteData.vehicles) && remoteData.vehicles.length > 0) {
            setVehicles(remoteData.vehicles);
            localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(remoteData.vehicles));
          }
          if (Array.isArray(remoteData.driverDirectory) && remoteData.driverDirectory.length > 0) {
            setDriverDirectory(remoteData.driverDirectory);
            localStorage.setItem(STORAGE_KEY_DRIVER_DIRECTORY, JSON.stringify(remoteData.driverDirectory));
          }
          if (Array.isArray(remoteData.staffMembers) && remoteData.staffMembers.length > 0) {
            setStaffMembers(remoteData.staffMembers);
            localStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(remoteData.staffMembers));
          }
          if (remoteData.staffRecords) {
            setStaffRecords(remoteData.staffRecords);
            localStorage.setItem(STORAGE_KEY_STAFF_RECORDS, JSON.stringify(remoteData.staffRecords));
          }
          if (remoteData.regulations) {
            localStorage.setItem('hamibar_editable_regulations_v2', JSON.stringify(remoteData.regulations));
          }
          if (remoteData.affidavit) {
            localStorage.setItem('hamibar_editable_affidavit_v2', remoteData.affidavit);
          }
          if (remoteData.rules) {
            localStorage.setItem('hamibar_service_rules_v1', JSON.stringify(remoteData.rules));
          }

          const versionToUse = remoteData.version || Date.now().toString();
          localDbVersionRef.current = versionToUse;
          setLastDbSavedAt(remoteData.lastSavedAt || new Date().toISOString());
          setNetworkDbStatus('SYNCED');
          setTimeout(() => {
            isSyncingFromRemoteRef.current = false;
          }, 800);
        } else {
          // If server database is reachable but empty, initialize it with current data
          const aux = getAuxiliaryModulesData();
          const saveRes = await saveSharedLanDatabase({
            drivers,
            records,
            vehicles,
            driverDirectory,
            staffMembers,
            staffRecords,
            ...aux,
          });
          if (saveRes.ok) {
            localDbVersionRef.current = saveRes.version || Date.now().toString();
            setLastDbSavedAt(saveRes.savedAt || new Date().toISOString());
            setNetworkDbStatus('SYNCED');
          } else {
            setNetworkDbStatus('OFFLINE');
          }
        }
      } catch {
        setNetworkDbStatus('OFFLINE');
      } finally {
        isInitialLoadDoneRef.current = true;
      }
    })();

    return () => { isMounted = false; };
  }, []);

  // Background polling: check if other network clients updated the database
  useEffect(() => {
    const interval = setInterval(async () => {
      // Don't poll or override if user has in-flight save, pending edits, or initial load in progress
      if (!isInitialLoadDoneRef.current || isSyncingFromRemoteRef.current || isSaveInFlightRef.current || hasLocalPendingEditsRef.current) {
        return;
      }

      try {
        const ver = await checkLanServerVersion();
        if (ver.isConnected) {
          if (ver.version && localDbVersionRef.current && ver.version !== localDbVersionRef.current) {
            const freshData = await fetchSharedLanDatabase();
            if (freshData) {
              isSyncingFromRemoteRef.current = true;
              if (Array.isArray(freshData.drivers)) {
                setDrivers(freshData.drivers);
                localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(freshData.drivers));
              }
              if (freshData.records) {
                setRecords(freshData.records);
                localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(freshData.records));
              }
              if (Array.isArray(freshData.vehicles)) {
                setVehicles(freshData.vehicles);
                localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(freshData.vehicles));
              }
              if (Array.isArray(freshData.driverDirectory)) {
                setDriverDirectory(freshData.driverDirectory);
                localStorage.setItem(STORAGE_KEY_DRIVER_DIRECTORY, JSON.stringify(freshData.driverDirectory));
              }
              if (Array.isArray(freshData.staffMembers)) {
                setStaffMembers(freshData.staffMembers);
                localStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(freshData.staffMembers));
              }
              if (freshData.staffRecords) {
                setStaffRecords(freshData.staffRecords);
                localStorage.setItem(STORAGE_KEY_STAFF_RECORDS, JSON.stringify(freshData.staffRecords));
              }
              if (freshData.regulations) {
                localStorage.setItem('hamibar_editable_regulations_v2', JSON.stringify(freshData.regulations));
              }
              if (freshData.affidavit) {
                localStorage.setItem('hamibar_editable_affidavit_v2', freshData.affidavit);
              }
              if (freshData.rules) {
                localStorage.setItem('hamibar_service_rules_v1', JSON.stringify(freshData.rules));
              }

              localDbVersionRef.current = freshData.version || ver.version;
              setLastDbSavedAt(freshData.lastSavedAt || ver.lastSavedAt || new Date().toISOString());
              setNetworkDbStatus('SYNCED');
              showToast('تغییرات جدید از سایر سیستم‌های شبکه دریافت و اعمال شد.', 'info');
              setTimeout(() => {
                isSyncingFromRemoteRef.current = false;
              }, 800);
            }
          } else {
            if (ver.version && !localDbVersionRef.current) {
              localDbVersionRef.current = ver.version;
            }
            setNetworkDbStatus('SYNCED');
          }
        } else {
          setNetworkDbStatus('OFFLINE');
        }
      } catch {
        setNetworkDbStatus('OFFLINE');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Force manual push to Central Network Database
  const handleForceSaveToNetworkDb = async () => {
    setNetworkDbStatus('SAVING');
    isSaveInFlightRef.current = true;
    try {
      const aux = getAuxiliaryModulesData();
      const res = await saveSharedLanDatabase({
        drivers,
        records,
        vehicles,
        driverDirectory,
        staffMembers,
        staffRecords,
        ...aux,
      });
      if (res.ok) {
        if (res.version) localDbVersionRef.current = res.version;
        setLastDbSavedAt(res.savedAt || new Date().toISOString());
        setNetworkDbStatus('SYNCED');
        hasLocalPendingEditsRef.current = false;
        showToast('اطلاعات با موفقیت در دیتابیس سرور شبکه ذخیره شد.', 'success');
      } else {
        setNetworkDbStatus('OFFLINE');
        showToast(`خطا در ذخیره‌سازی: ${res.error || 'عدم دسترسی به سرور'}`, 'error');
      }
    } catch {
      setNetworkDbStatus('OFFLINE');
      showToast('خطا در ارتباط با سرور شبکه.', 'error');
    } finally {
      isSaveInFlightRef.current = false;
    }
  };

  // Force manual pull from Central Network Database
  const handleForceFetchFromNetworkDb = async () => {
    setNetworkDbStatus('SAVING');
    try {
      const freshData = await fetchSharedLanDatabase();
      if (freshData) {
        isSyncingFromRemoteRef.current = true;
        if (Array.isArray(freshData.drivers)) {
          setDrivers(freshData.drivers);
          localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(freshData.drivers));
        }
        if (freshData.records) {
          setRecords(freshData.records);
          localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(freshData.records));
        }
        if (Array.isArray(freshData.vehicles)) {
          setVehicles(freshData.vehicles);
          localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(freshData.vehicles));
        }
        if (Array.isArray(freshData.driverDirectory)) {
          setDriverDirectory(freshData.driverDirectory);
          localStorage.setItem(STORAGE_KEY_DRIVER_DIRECTORY, JSON.stringify(freshData.driverDirectory));
        }
        if (Array.isArray(freshData.staffMembers)) {
          setStaffMembers(freshData.staffMembers);
          localStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(freshData.staffMembers));
        }
        if (freshData.staffRecords) {
          setStaffRecords(freshData.staffRecords);
          localStorage.setItem(STORAGE_KEY_STAFF_RECORDS, JSON.stringify(freshData.staffRecords));
        }
        if (freshData.regulations) {
          localStorage.setItem('hamibar_editable_regulations_v2', JSON.stringify(freshData.regulations));
        }
        if (freshData.affidavit) {
          localStorage.setItem('hamibar_editable_affidavit_v2', freshData.affidavit);
        }
        if (freshData.rules) {
          localStorage.setItem('hamibar_service_rules_v1', JSON.stringify(freshData.rules));
        }

        localDbVersionRef.current = freshData.version || Date.now().toString();
        setLastDbSavedAt(freshData.lastSavedAt || new Date().toISOString());
        setNetworkDbStatus('SYNCED');
        hasLocalPendingEditsRef.current = false;
        showToast('اطلاعات با موفقیت از دیتابیس سرور بازیابی و جایگزین شد.', 'success');
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 800);
      } else {
        showToast('عدم دسترسی به دیتابیس سرور یا خالی بودن آن.', 'error');
      }
    } catch {
      showToast('خطا در دریافت اطلاعات از سرور.', 'error');
    }
  };

  // Sidebar-12 Navigation States (closed by default on mobile for clean UX)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        return false;
      }
      const saved = localStorage.getItem('hamibar_sidebar_open_v1');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return false;
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hamibar_sidebar_collapsed_v1');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isCompactTheme, setIsCompactTheme] = useState<boolean>(false);

  // App Theme State: Dark Mode vs Light Mode (persisted to localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem('hamibar_theme_mode');
      return savedTheme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    }
    try {
      localStorage.setItem('hamibar_theme_mode', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hamibar_sidebar_open_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hamibar_sidebar_collapsed_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Toast notifications
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7),
      message,
      type,
    });
  }, []);

  const handleCloseToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-save states to LocalStorage & Debounced Push to Central Network DB
  useEffect(() => {
    // Immediately persist to localStorage for offline safety
    try {
      localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(drivers));
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
      localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
      localStorage.setItem(STORAGE_KEY_DRIVER_DIRECTORY, JSON.stringify(driverDirectory));
      localStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(staffMembers));
      localStorage.setItem(STORAGE_KEY_STAFF_RECORDS, JSON.stringify(staffRecords));
    } catch (e) {
      console.error(e);
    }

    // Only sync to network DB if initial load has finished and we are not processing remote pull
    if (!isInitialLoadDoneRef.current || isSyncingFromRemoteRef.current) return;

    hasLocalPendingEditsRef.current = true;
    setNetworkDbStatus('SAVING');
    const timer = setTimeout(async () => {
      try {
        isSaveInFlightRef.current = true;
        const aux = getAuxiliaryModulesData();
        const res = await saveSharedLanDatabase({
          drivers,
          records,
          vehicles,
          driverDirectory,
          staffMembers,
          staffRecords,
          ...aux,
        });
        if (res.ok) {
          if (res.version) localDbVersionRef.current = res.version;
          setLastDbSavedAt(res.savedAt || new Date().toISOString());
          setNetworkDbStatus('SYNCED');
          hasLocalPendingEditsRef.current = false;
        } else {
          setNetworkDbStatus('OFFLINE');
        }
      } catch {
        setNetworkDbStatus('OFFLINE');
      } finally {
        isSaveInFlightRef.current = false;
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [drivers, records, vehicles, driverDirectory, staffMembers, staffRecords]);

  // Today stats for driver attendance
  const todayKey = formatPersianDateKey(today.jy, today.jm, today.jd);
  const todayLeaveCount = useMemo(() => {
    return drivers.filter((d) => d.status === 'active' && records[d.id]?.[todayKey] === 'leave').length;
  }, [drivers, records, todayKey]);

  const todayWorkshopCount = useMemo(() => {
    return drivers.filter((d) => d.status === 'active' && records[d.id]?.[todayKey] === 'workshop').length;
  }, [drivers, records, todayKey]);

  const todayActiveCount = Math.max(0, drivers.length - todayLeaveCount - todayWorkshopCount);

  // Driver Handlers
  const handleAddDriver = (newDriver: (Omit<Driver, 'id'> & { id?: string }) | Driver) => {
    const todayStr = formatPersianDateKey(today.jy, today.jm, today.jd);
    const id = newDriver.id || `driver-${Date.now()}`;
    const cleanPlate = newDriver.vehiclePlate?.trim() || '';
    const matchedVehicle = cleanPlate
      ? vehicles.find((v) => v.plateNumber === cleanPlate || String(v.code) === cleanPlate)
      : undefined;

    const fullDriver: Driver = {
      ...newDriver,
      id,
      name: newDriver.name.trim(),
      code: matchedVehicle ? String(matchedVehicle.code) : newDriver.code || newDriver.personnelCode || id.slice(-4),
      personnelCode: newDriver.personnelCode || newDriver.code || id.slice(-4),
      vehiclePlate: matchedVehicle ? matchedVehicle.plateNumber : cleanPlate,
      createdAt: newDriver.createdAt || todayStr,
      status: newDriver.status || 'active',
    };

    setDrivers((prev) => [fullDriver, ...prev]);

    // Sync to directory without duplicates
    setDriverDirectory((prev) => {
      const norm = normalizeDriverName(fullDriver.name);
      if (prev.some((d) => normalizeDriverName(d.name) === norm)) {
        return prev.map((d) =>
          normalizeDriverName(d.name) === norm
            ? {
                ...d,
                phone: fullDriver.phone || d.phone,
                assignedVehicles: fullDriver.vehiclePlate ? [fullDriver.vehiclePlate] : d.assignedVehicles,
              }
            : d
        );
      }
      return [
        {
          id: fullDriver.id,
          name: fullDriver.name,
          code: fullDriver.code,
          personnelCode: fullDriver.personnelCode,
          phone: fullDriver.phone || '',
          nationalCode: fullDriver.nationalId || '0012345678',
          licenseNumber: `LIC-${fullDriver.code}`,
          driverType: 'EMPLOYED',
          status: fullDriver.status === 'inactive' ? 'INACTIVE' : 'AVAILABLE',
          joinedDate: fullDriver.createdAt || todayStr,
          assignedVehicles: fullDriver.vehiclePlate ? [fullDriver.vehiclePlate] : [],
          rating: 5.0,
          tripsCount: 0,
          totalTrips: 0,
        },
        ...prev,
      ];
    });

    if (matchedVehicle) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === matchedVehicle.id
            ? {
                ...v,
                driverName: fullDriver.name,
                driverPhone: fullDriver.phone || v.driverPhone || '',
                driverCode: String(matchedVehicle.code),
              }
            : v
        )
      );
    }

    if (currentUser) {
      recordAuditLog(currentUser, {
        action: 'DRIVER_CREATE',
        module: 'DRIVERS',
        title: `ثبت راننده جدید: ${fullDriver.name}`,
        description: `راننده جدید «${fullDriver.name}» (کد ${fullDriver.code || fullDriver.id}) توسط کاربر افزوده شد.`,
        targetId: fullDriver.id,
        targetName: fullDriver.name,
        severity: 'SUCCESS',
      });
    }
    showToast(`راننده "${fullDriver.name}" با موفقیت اضافه شد.`, 'success');
  };

  const handleUpdateDriver = (updatedDriver: Driver) => {
    const oldDriver = drivers.find((d) => d.id === updatedDriver.id);
    const cleanPlate = updatedDriver.vehiclePlate?.trim() || '';
    const matchedVehicle = cleanPlate
      ? vehicles.find((v) => v.plateNumber === cleanPlate || String(v.code) === cleanPlate)
      : undefined;

    const finalDriver: Driver = {
      ...updatedDriver,
      name: updatedDriver.name.trim(),
      vehiclePlate: matchedVehicle ? matchedVehicle.plateNumber : cleanPlate,
      code: matchedVehicle ? String(matchedVehicle.code) : updatedDriver.code,
      personnelCode: updatedDriver.personnelCode || updatedDriver.code,
    };

    setDrivers((prev) => prev.map((d) => (d.id === finalDriver.id ? finalDriver : d)));

    const oldNormName = normalizeDriverName(oldDriver?.name);
    const newNormName = normalizeDriverName(finalDriver.name);

    setDriverDirectory((prev) =>
      prev.map((d) =>
        d.id === finalDriver.id || normalizeDriverName(d.name) === oldNormName
          ? {
              ...d,
              name: finalDriver.name,
              code: finalDriver.code,
              phone: finalDriver.phone || d.phone,
              status: finalDriver.status === 'inactive' ? 'INACTIVE' : 'AVAILABLE',
              assignedVehicles: finalDriver.vehiclePlate ? [finalDriver.vehiclePlate] : [],
            }
          : d
      )
    );

    // Also keep vehicles in sync if name or vehiclePlate changed
    setVehicles((prev) =>
      prev.map((v) => {
        if (matchedVehicle && v.id === matchedVehicle.id) {
          return {
            ...v,
            driverName: finalDriver.name,
            driverPhone: finalDriver.phone || v.driverPhone || '',
            driverCode: String(v.code),
          };
        }
        const vNorm = normalizeDriverName(v.driverName);
        if (vNorm === oldNormName || vNorm === newNormName) {
          if (!cleanPlate) {
            return { ...v, driverName: 'بدون راننده', driverPhone: '', driverCode: '' };
          }
          if (matchedVehicle && v.id !== matchedVehicle.id) {
            return { ...v, driverName: 'بدون راننده', driverPhone: '', driverCode: '' };
          }
          return {
            ...v,
            driverName: finalDriver.name,
            driverPhone: finalDriver.phone || v.driverPhone || '',
          };
        }
        return v;
      })
    );

    if (currentUser) {
      recordAuditLog(currentUser, {
        action: 'DRIVER_UPDATE',
        module: 'DRIVERS',
        title: `ویرایش مشخصات راننده: ${finalDriver.name}`,
        description: `اطلاعات راننده «${finalDriver.name}» توسط ${currentUser.fullName} به‌روزرسانی شد.`,
        targetId: finalDriver.id,
        targetName: finalDriver.name,
        severity: 'INFO',
      });
    }
    showToast(`اطلاعات راننده "${finalDriver.name}" به‌روز شد.`, 'success');
  };

  const handleDeleteDriver = (driverId: string) => {
    const target = drivers.find((d) => d.id === driverId);
    if (!target) return;
    if (window.confirm(`آیا از حذف راننده "${target.name}" از تابلوی حضور و غیاب اطمینان دارید؟`)) {
      const targetNorm = normalizeDriverName(target.name);
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
      setDriverDirectory((prev) =>
        prev.filter((d) => d.id !== driverId && normalizeDriverName(d.name) !== targetNorm)
      );
      setVehicles((prev) =>
        prev.map((v) =>
          normalizeDriverName(v.driverName) === targetNorm
            ? { ...v, driverName: 'بدون راننده', driverPhone: '', driverCode: '' }
            : v
        )
      );
      setRecords((prev) => {
        const copy = { ...prev };
        delete copy[driverId];
        return copy;
      });
      if (currentUser) {
        recordAuditLog(currentUser, {
          action: 'DRIVER_DELETE',
          module: 'DRIVERS',
          title: `حذف راننده: ${target.name}`,
          description: `راننده «${target.name}» (شناسه ${target.id}) و کلیه رکوردهای تردد وی از سیستم حذف شد.`,
          targetId: target.id,
          targetName: target.name,
          severity: 'CRITICAL',
        });
      }
      showToast(`راننده "${target.name}" با موفقیت حذف شد.`, 'info');
    }
  };

  const handleToggleDriverActive = (driverId: string) => {
    const target = drivers.find((d) => d.id === driverId);
    const targetNorm = normalizeDriverName(target?.name);
    const nextStatus = target?.status === 'inactive' ? 'active' : 'inactive';

    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === driverId) {
          if (currentUser) {
            recordAuditLog(currentUser, {
              action: 'DRIVER_TOGGLE_ACTIVE',
              module: 'DRIVERS',
              title: `تغییر وضعیت راننده: ${d.name}`,
              description: `وضعیت کاری راننده «${d.name}» به «${nextStatus === 'active' ? 'فعال' : 'غیرفعال'}» تغییر یافت.`,
              targetId: d.id,
              targetName: d.name,
              severity: 'WARNING',
              previousValue: d.status === 'active' ? 'فعال' : 'غیرفعال',
              newValue: nextStatus === 'active' ? 'فعال' : 'غیرفعال',
            });
          }
          showToast(
            `وضعیت راننده "${d.name}" به «${nextStatus === 'active' ? 'فعال' : 'غیرفعال'}» تغییر یافت.`,
            nextStatus === 'active' ? 'success' : 'info'
          );
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );

    if (targetNorm) {
      setDriverDirectory((prev) =>
        prev.map((d) =>
          d.id === driverId || normalizeDriverName(d.name) === targetNorm
            ? { ...d, status: nextStatus === 'inactive' ? 'INACTIVE' : 'AVAILABLE' }
            : d
        )
      );
    }
  };

  // Staff Handlers
  const handleAddStaffMember = (newStaff: StaffMember) => {
    const todayStr = formatPersianDateKey(today.jy, today.jm, today.jd);
    const fullStaff: StaffMember = {
      ...newStaff,
      hireDate: newStaff.hireDate || todayStr,
      status: newStaff.status || 'active',
    };
    setStaffMembers((prev) => [fullStaff, ...prev]);
    if (currentUser) {
      recordAuditLog(currentUser, {
        action: 'STAFF_CREATE',
        module: 'STAFF',
        title: `ثبت پرسنل جدید: ${fullStaff.name}`,
        description: `پرسنل جدید «${fullStaff.name}» با نقش «${fullStaff.role}» به سیستم افزوده شد.`,
        targetId: fullStaff.id,
        targetName: fullStaff.name,
        severity: 'SUCCESS',
      });
    }
    showToast(`پرسنل "${fullStaff.name}" با موفقیت اضافه شد.`, 'success');
  };

  const handleUpdateStaffMember = (updatedStaff: StaffMember) => {
    setStaffMembers((prev) => prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
    if (currentUser) {
      recordAuditLog(currentUser, {
        action: 'STAFF_UPDATE',
        module: 'STAFF',
        title: `ویرایش پرسنل: ${updatedStaff.name}`,
        description: `اطلاعات پرونده پرسنل «${updatedStaff.name}» به‌روزرسانی شد.`,
        targetId: updatedStaff.id,
        targetName: updatedStaff.name,
        severity: 'INFO',
      });
    }
    showToast(`اطلاعات پرسنل "${updatedStaff.name}" با موفقیت ویرایش شد.`, 'success');
  };

  const handleDeleteStaffMember = (staffId: string) => {
    const target = staffMembers.find((s) => s.id === staffId);
    if (!target) return;
    if (window.confirm(`آیا از حذف پرسنل "${target.name}" اطمینان دارید؟`)) {
      setStaffMembers((prev) => prev.filter((s) => s.id !== staffId));
      setStaffRecords((prev) => {
        const copy = { ...prev };
        delete copy[staffId];
        return copy;
      });
      if (currentUser) {
        recordAuditLog(currentUser, {
          action: 'STAFF_DELETE',
          module: 'STAFF',
          title: `حذف پرسنل: ${target.name}`,
          description: `پرسنل «${target.name}» و رکوردهای تردد وی از سیستم حذف شد.`,
          targetId: target.id,
          targetName: target.name,
          severity: 'CRITICAL',
        });
      }
      showToast(`پرسنل "${target.name}" با موفقیت حذف شد.`, 'info');
    }
  };

  const handleToggleStaffActive = (staffId: string) => {
    setStaffMembers((prev) =>
      prev.map((s) => {
        if (s.id === staffId) {
          const nextStatus = s.status === 'inactive' ? 'active' : 'inactive';
          if (currentUser) {
            recordAuditLog(currentUser, {
              action: 'STAFF_TOGGLE_ACTIVE',
              module: 'STAFF',
              title: `تغییر وضعیت پرسنل: ${s.name}`,
              description: `وضعیت پرسنل «${s.name}» به «${nextStatus === 'active' ? 'فعال' : 'غیرفعال'}» تغییر یافت.`,
              targetId: s.id,
              targetName: s.name,
              severity: 'WARNING',
              previousValue: s.status === 'active' ? 'فعال' : 'غیرفعال',
              newValue: nextStatus === 'active' ? 'فعال' : 'غیرفعال',
            });
          }
          showToast(
            `وضعیت پرسنل "${s.name}" به «${nextStatus === 'active' ? 'فعال' : 'غیرفعال'}» تغییر یافت.`,
            nextStatus === 'active' ? 'success' : 'info'
          );
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  // Attendance Status Updaters
  const handleUpdateDriverStatus = (driverId: string, dateKey: string, status: AttendanceStatus) => {
    const driver = drivers.find((d) => d.id === driverId) || driverDirectory.find((d) => d.id === driverId);
    const prevStatus = records[driverId]?.[dateKey] || 'none';
    setRecords((prev) => ({
      ...prev,
      [driverId]: {
        ...(prev[driverId] || {}),
        [dateKey]: status,
      },
    }));

    if (currentUser) {
      const statusFa: Record<string, string> = {
        none: 'حاضر (عادی)',
        leave: 'مرخصی استحقاقی',
        workshop: 'تعمیرگاه/فنی',
        absent: 'غیبت',
        mission: 'مأموریت کاری',
      };
      recordAuditLog(currentUser, {
        action: 'ATTENDANCE_STATUS_CHANGE',
        module: 'ATTENDANCE',
        title: `تغییر تردد: ${driver?.name || driverId}`,
        description: `وضعیت راننده «${driver?.name || driverId}» در تاریخ ${toFaDigits(dateKey)} از «${statusFa[prevStatus] || prevStatus}» به «${statusFa[status] || status}» تغییر یافت.`,
        targetId: driverId,
        targetName: driver?.name,
        severity: status === 'leave' || status === 'absent' ? 'WARNING' : 'INFO',
        previousValue: statusFa[prevStatus] || prevStatus,
        newValue: statusFa[status] || status,
      });
    }
  };

  const handleUpdateStaffStatus = (staffId: string, dateKey: string, status: AttendanceStatus) => {
    const staff = staffMembers.find((s) => s.id === staffId);
    const prevStatus = staffRecords[staffId]?.[dateKey] || 'none';
    setStaffRecords((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || {}),
        [dateKey]: status,
      },
    }));

    if (currentUser) {
      const statusFa: Record<string, string> = {
        none: 'حاضر (عادی)',
        leave: 'مرخصی استحقاقی',
        workshop: 'تعمیرگاه/فنی',
        absent: 'غیبت',
        mission: 'مأموریت کاری',
      };
      recordAuditLog(currentUser, {
        action: 'ATTENDANCE_STATUS_CHANGE',
        module: 'STAFF',
        title: `تغییر تردد پرسنل: ${staff?.name || staffId}`,
        description: `وضعیت پرسنل «${staff?.name || staffId}» در تاریخ ${toFaDigits(dateKey)} از «${statusFa[prevStatus] || prevStatus}» به «${statusFa[status] || status}» تغییر یافت.`,
        targetId: staffId,
        targetName: staff?.name,
        severity: status === 'leave' || status === 'absent' ? 'WARNING' : 'INFO',
        previousValue: statusFa[prevStatus] || prevStatus,
        newValue: statusFa[status] || status,
      });
    }
  };

  // Directory handlers
  const handleAddDirectoryDriver = (item: DriverDirectoryItem) => {
    const todayStr = formatPersianDateKey(today.jy, today.jm, today.jd);
    const assignedPlate = item.assignedVehicles?.[0] || '';
    const matchedVeh = assignedPlate
      ? vehicles.find((v) => v.plateNumber === assignedPlate)
      : undefined;

    const finalItem: DriverDirectoryItem = {
      ...item,
      name: item.name.trim(),
      code: matchedVeh ? String(matchedVeh.code) : item.code,
      personnelCode: item.personnelCode || item.code,
    };

    setDriverDirectory((prev) => [finalItem, ...prev]);

    // Also add or update in drivers (Attendance Board)
    setDrivers((prev) => {
      const norm = normalizeDriverName(finalItem.name);
      if (prev.some((d) => normalizeDriverName(d.name) === norm)) {
        return prev.map((d) =>
          normalizeDriverName(d.name) === norm
            ? {
                ...d,
                code: finalItem.code || d.code,
                phone: finalItem.phone || d.phone,
                vehiclePlate: assignedPlate || d.vehiclePlate,
                status: finalItem.status === 'INACTIVE' || finalItem.status === 'inactive' ? 'inactive' : 'active',
              }
            : d
        );
      }
      return [
        {
          id: finalItem.id,
          name: finalItem.name,
          code: finalItem.code || '',
          personnelCode: finalItem.personnelCode || finalItem.code || '',
          phone: finalItem.phone || '',
          status: finalItem.status === 'INACTIVE' || finalItem.status === 'inactive' ? 'inactive' : 'active',
          vehiclePlate: assignedPlate,
          createdAt: finalItem.joinedDate || todayStr,
        },
        ...prev,
      ];
    });

    if (matchedVeh) {
      handleAssignDriverToVehicle(matchedVeh.id, finalItem.name, finalItem.phone);
    } else {
      showToast(`پرونده راننده "${finalItem.name}" ثبت شد.`, 'success');
    }
  };

  const handleUpdateDirectoryDriver = (item: DriverDirectoryItem) => {
    const oldDir = driverDirectory.find((d) => d.id === item.id);
    const oldNorm = normalizeDriverName(oldDir?.name);

    setDriverDirectory((prev) => prev.map((d) => (d.id === item.id ? item : d)));
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === item.id || normalizeDriverName(d.name) === oldNorm
          ? {
              ...d,
              name: item.name.trim(),
              phone: item.phone || d.phone,
              status: item.status === 'INACTIVE' || item.status === 'inactive' ? 'inactive' : 'active',
            }
          : d
      )
    );
    showToast(`پرونده راننده "${item.name}" ویرایش شد.`, 'success');
  };

  // Vehicle Update (Oil service)
  const handleUpdateVehicle = (updated: VehicleItem) => {
    const oldVehicle = vehicles.find((v) => v.id === updated.id);
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    if (currentUser) {
      recordAuditLog(currentUser, {
        action: 'OIL_SERVICE_UPDATE',
        module: 'OIL_SERVICE',
        title: `سرویس و نگهداری خودرو ${updated.plateNumber || String(updated.code)}`,
        description: `اطلاعات فنی و سرویس دوره‌ای خودرو «${updated.plateNumber || String(updated.code)}» توسط کاربر ثبت گردید.`,
        targetId: updated.id,
        targetName: String(updated.plateNumber || updated.code),
        severity: 'SUCCESS',
        previousValue: (oldVehicle as any)?.currentMileage ? `کیلومتر: ${toFaDigits((oldVehicle as any).currentMileage)}` : undefined,
        newValue: (updated as any)?.currentMileage ? `کیلومتر: ${toFaDigits((updated as any).currentMileage)}` : undefined,
      });
    }
    showToast(`اطلاعات خودروی "${updated.plateNumber || updated.code}" با موفقیت به‌روزرسانی شد.`, 'success');
  };

  // Centralized Bidirectional Assignment: Driver <-> Vehicle (Fully Synced with Attendance Board & Matrix)
  const handleAssignDriverToVehicle = (vehicleId: string, driverNameOrNone: string, driverPhone?: string) => {
    const targetVehicle = vehicles.find((v) => v.id === vehicleId);
    if (!targetVehicle) return;

    const isUnassigning = !isAssignedDriverName(driverNameOrNone);
    const oldDriverName = targetVehicle.driverName;
    const oldDriverNorm = normalizeDriverName(oldDriverName);

    if (isUnassigning) {
      // 1. Update vehicle to unassigned
      const updatedVehicle: VehicleItem = {
        ...targetVehicle,
        driverName: 'بدون راننده',
        driverPhone: '',
        driverCode: '',
      };
      setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updatedVehicle : v)));

      // 2. Remove this vehicle plate from any driver's assignedVehicles list in driverDirectory
      setDriverDirectory((prev) =>
        prev.map((d) => {
          const isOldOwner = oldDriverNorm && normalizeDriverName(d.name) === oldDriverNorm;
          return {
            ...d,
            assignedVehicles: isOldOwner
              ? []
              : (d.assignedVehicles || []).filter(
                  (p) => p !== targetVehicle.plateNumber && !p.includes(targetVehicle.plateNumber)
                ),
          };
        })
      );

      // 3. CRITICAL: Remove vehiclePlate from drivers list for Attendance Board & Matrix
      setDrivers((prev) =>
        prev.map((d) => {
          if (
            (targetVehicle.plateNumber && d.vehiclePlate === targetVehicle.plateNumber) ||
            (oldDriverNorm && normalizeDriverName(d.name) === oldDriverNorm)
          ) {
            return {
              ...d,
              vehiclePlate: '',
              personnelCode: d.personnelCode || d.code,
            };
          }
          return d;
        })
      );

      // 4. Audit log & toast
      if (currentUser) {
        recordAuditLog(currentUser, {
          action: 'VEHICLE_UNASSIGN_DRIVER',
          module: 'FLEET',
          title: `لغو انتساب راننده از خودرو کد ${toFaDigits(targetVehicle.code)}`,
          description: `خودرو با پلاک «${targetVehicle.plateNumber}» از راننده قبلی (${oldDriverName}) لغو انتساب شد و به حالت فاقد راننده درآمد.`,
          targetId: vehicleId,
          targetName: targetVehicle.plateNumber,
          severity: 'WARNING',
        });
      }
      showToast(`خودرو کد ${toFaDigits(targetVehicle.code)} از راننده قبلی لغو انتساب شد (فاقد راننده).`, 'info');
    } else {
      const cleanDriverName = driverNameOrNone.trim();
      const targetDriverNorm = normalizeDriverName(cleanDriverName);

      // Find driver info from directory or drivers list
      const matchedDriver =
        driverDirectory.find(
          (d) => normalizeDriverName(d.name) === targetDriverNorm || (driverPhone && d.phone === driverPhone)
        ) ||
        drivers.find((d) => normalizeDriverName(d.name) === targetDriverNorm);

      const assignedPhone = matchedDriver?.phone || driverPhone || targetVehicle.driverPhone || '';
      const newVehicleCodeStr = String(targetVehicle.code);

      // 1. Update target vehicle with new driver, and unassign any other vehicle this driver previously had
      const updatedVehicle: VehicleItem = {
        ...targetVehicle,
        driverName: cleanDriverName,
        driverPhone: assignedPhone,
        driverCode: newVehicleCodeStr,
      };

      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === vehicleId) return updatedVehicle;
          if (normalizeDriverName(v.driverName) === targetDriverNorm) {
            return { ...v, driverName: 'بدون راننده', driverPhone: '', driverCode: '' };
          }
          return v;
        })
      );

      // 2. Update driverDirectory assignedVehicles & vehicle code
      setDriverDirectory((prev) =>
        prev.map((d) => {
          const dNorm = normalizeDriverName(d.name);
          if (dNorm === targetDriverNorm) {
            return {
              ...d,
              code: newVehicleCodeStr,
              personnelCode: d.personnelCode || d.code,
              phone: d.phone || assignedPhone,
              assignedVehicles: [targetVehicle.plateNumber],
            };
          }
          // Remove from old owner or other drivers who might have had this plate
          if (dNorm === oldDriverNorm) {
            return { ...d, assignedVehicles: [] };
          }
          return {
            ...d,
            assignedVehicles: (d.assignedVehicles || []).filter(
              (p) => p !== targetVehicle.plateNumber && !p.includes(targetVehicle.plateNumber)
            ),
          };
        })
      );

      // 3. CRITICAL: Update drivers array for Attendance Board & Matrix (both vehiclePlate AND code!)
      setDrivers((prev) => {
        const exists = prev.some(
          (d) =>
            normalizeDriverName(d.name) === targetDriverNorm ||
            (matchedDriver && d.id === matchedDriver.id)
        );

        const nextList = prev.map((d) => {
          const dNorm = normalizeDriverName(d.name);
          if (dNorm === targetDriverNorm || (matchedDriver && d.id === matchedDriver.id)) {
            return {
              ...d,
              vehiclePlate: targetVehicle.plateNumber,
              code: newVehicleCodeStr,
              personnelCode: d.personnelCode || d.code,
              phone: d.phone || assignedPhone,
              status: 'active' as const,
            };
          }
          if (
            (targetVehicle.plateNumber && d.vehiclePlate === targetVehicle.plateNumber) ||
            (oldDriverNorm && dNorm === oldDriverNorm)
          ) {
            return {
              ...d,
              vehiclePlate: '',
              personnelCode: d.personnelCode || d.code,
            };
          }
          return d;
        });

        if (!exists) {
          nextList.unshift({
            id: matchedDriver?.id || `drv-${Date.now()}`,
            name: cleanDriverName,
            code: newVehicleCodeStr,
            personnelCode: matchedDriver?.code || newVehicleCodeStr,
            phone: assignedPhone,
            status: 'active',
            vehiclePlate: targetVehicle.plateNumber,
            createdAt: formatPersianDateKey(today.jy, today.jm, today.jd),
          });
        }

        return nextList;
      });

      // 4. Audit log & toast
      if (currentUser) {
        recordAuditLog(currentUser, {
          action: 'VEHICLE_ASSIGN_DRIVER',
          module: 'FLEET',
          title: `اختصاص خودرو کد ${toFaDigits(targetVehicle.code)} به ${cleanDriverName}`,
          description: `خودرو با پلاک «${targetVehicle.plateNumber}» به راننده «${cleanDriverName}» اختصاص داده شد.`,
          targetId: vehicleId,
          targetName: targetVehicle.plateNumber,
          severity: 'SUCCESS',
        });
      }
      showToast(
        `خودرو کد ${toFaDigits(targetVehicle.code)} (${targetVehicle.plateNumber}) به راننده «${cleanDriverName}» اختصاص یافت و در ماتریس حضور و غیاب اعمال شد.`,
        'success'
      );
    }
  };

  const handleAssignVehicleToDriver = (driverId: string, vehiclePlateOrNone: string) => {
    const driver =
      driverDirectory.find((d) => d.id === driverId || normalizeDriverName(d.name) === normalizeDriverName(driverId)) ||
      drivers.find((d) => d.id === driverId || normalizeDriverName(d.name) === normalizeDriverName(driverId));
    if (!driver) return;

    const driverNorm = normalizeDriverName(driver.name);
    const isUnassigning =
      !vehiclePlateOrNone ||
      vehiclePlateOrNone === 'NONE' ||
      vehiclePlateOrNone === 'بدون خودرو' ||
      vehiclePlateOrNone === 'بدون راننده';

    if (isUnassigning) {
      const oldPlates = (
        (driver as DriverDirectoryItem).assignedVehicles ||
        [(driver as Driver).vehiclePlate].filter(Boolean)
      ) as string[];

      // 1. Remove assigned vehicles from driverDirectory
      setDriverDirectory((prev) =>
        prev.map((d) =>
          d.id === driverId || normalizeDriverName(d.name) === driverNorm
            ? { ...d, assignedVehicles: [] }
            : d
        )
      );

      // 2. Unassign vehicles that were assigned to this driver
      setVehicles((prev) =>
        prev.map((v) => {
          if (
            oldPlates.some((p) => p === v.plateNumber || p.includes(v.plateNumber)) ||
            normalizeDriverName(v.driverName) === driverNorm
          ) {
            return { ...v, driverName: 'بدون راننده', driverPhone: '', driverCode: '' };
          }
          return v;
        })
      );

      // 3. Update drivers array for Attendance Board & Matrix
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driverId || normalizeDriverName(d.name) === driverNorm
            ? { ...d, vehiclePlate: '', personnelCode: d.personnelCode || d.code }
            : d
        )
      );

      showToast(
        `خودروی اختصاصی از راننده «${driver.name}» لغو انتساب شد و به بخش رانندگان بدون خودرو منتقل گردید.`,
        'info'
      );
    } else {
      const targetVehicle = vehicles.find(
        (v) =>
          v.plateNumber === vehiclePlateOrNone ||
          v.id === vehiclePlateOrNone ||
          vehiclePlateOrNone.includes(v.plateNumber)
      );
      if (!targetVehicle) return;

      handleAssignDriverToVehicle(targetVehicle.id, driver.name, (driver as any).phone);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      exportToExcel(drivers, records, activeYear, activeMonth);
      showToast('فایل اکسل حضور و غیاب با موفقیت دانلود شد.', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در صدور فایل اکسل.', 'error');
    }
  };

  // Range Assign
  const handleAssignRange = (
    driverIds: string[],
    startDay: number,
    endDay: number,
    status: AttendanceStatus
  ) => {
    setRecords((prev) => {
      const nextRecords = { ...prev };
      driverIds.forEach((driverId) => {
        const driverRecord = { ...(nextRecords[driverId] || {}) };
        for (let day = startDay; day <= endDay; day++) {
          const key = formatPersianDateKey(activeYear, activeMonth, day);
          driverRecord[key] = status;
        }
        nextRecords[driverId] = driverRecord;
      });
      return nextRecords;
    });
    showToast(`وضعیت محدوده برای رانندگان با موفقیت ثبت شد.`, 'success');
  };

  // Comprehensive Manual Backup (JSON)
  const handleRestoreData = (backup: FullBackupData, mode: 'overwrite' | 'merge') => {
    try {
      const bData = backup.data;
      if (mode === 'overwrite') {
        if (Array.isArray(bData.drivers)) setDrivers(bData.drivers);
        if (bData.records) setRecords(bData.records);
        if (Array.isArray(bData.staffMembers)) setStaffMembers(bData.staffMembers);
        if (bData.staffRecords) setStaffRecords(bData.staffRecords);
        if (Array.isArray(bData.vehicles)) setVehicles(bData.vehicles);
        if (Array.isArray(bData.driverDirectory)) setDriverDirectory(bData.driverDirectory);
      } else {
        const mergedDrivers = [...drivers];
        (bData.drivers || []).forEach((d) => {
          const idx = mergedDrivers.findIndex((x) => x.id === d.id);
          if (idx >= 0) mergedDrivers[idx] = d;
          else mergedDrivers.push(d);
        });
        setDrivers(mergedDrivers);

        const mergedStaff = [...staffMembers];
        (bData.staffMembers || []).forEach((s) => {
          const idx = mergedStaff.findIndex((x) => x.id === s.id);
          if (idx >= 0) mergedStaff[idx] = s;
          else mergedStaff.push(s);
        });
        setStaffMembers(mergedStaff);

        const mergedVehicles = [...vehicles];
        (bData.vehicles || []).forEach((v) => {
          const idx = mergedVehicles.findIndex((x) => x.id === v.id);
          if (idx >= 0) mergedVehicles[idx] = v;
          else mergedVehicles.push(v);
        });
        setVehicles(mergedVehicles);

        const mergedDriverDir = [...driverDirectory];
        (bData.driverDirectory || []).forEach((item) => {
          const idx = mergedDriverDir.findIndex((x) => x.id === item.id);
          if (idx >= 0) mergedDriverDir[idx] = item;
          else mergedDriverDir.push(item);
        });
        setDriverDirectory(mergedDriverDir);

        if (bData.records) {
          setRecords((prev) => ({ ...prev, ...bData.records }));
        }
        if (bData.staffRecords) {
          setStaffRecords((prev) => ({ ...prev, ...bData.staffRecords }));
        }
      }
      showToast('اطلاعات با موفقیت از فایل پشتیبان بازیابی شد.', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در اعمال بازیابی اطلاعات.', 'error');
    }
  };

  // Reset actions
  const handleResetDefaults = () => {
    const initD = getInitialDrivers();
    const initR = getInitialAttendanceRecords();
    setDrivers(initD);
    setRecords(initR);
    setStaffMembers(INITIAL_STAFF_MEMBERS);
    setStaffRecords(getInitialStaffAttendanceRecords());
    setVehicles(INITIAL_VEHICLES);
    setDriverDirectory(INITIAL_DRIVER_DIRECTORY);
    showToast('سامانه به تنظیمات و داده‌های پیش‌فرض بازگردانی شد.', 'info');
  };

  // Explicit apply decoded backup
  const handleApplyLatestBackup = () => {
    setDrivers(DECODED_BACKUP.drivers);
    setRecords(DECODED_BACKUP.records);
    setVehicles(DECODED_BACKUP.vehicles);
    setDriverDirectory(DECODED_BACKUP.driverDirectory);
    setStaffMembers(DECODED_BACKUP.staffMembers);
    setStaffRecords(DECODED_BACKUP.staffRecords);

    try {
      localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(DECODED_BACKUP.drivers));
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(DECODED_BACKUP.records));
      localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(DECODED_BACKUP.vehicles));
      localStorage.setItem(STORAGE_KEY_DRIVER_DIRECTORY, JSON.stringify(DECODED_BACKUP.driverDirectory));
      localStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(DECODED_BACKUP.staffMembers));
      localStorage.setItem(STORAGE_KEY_STAFF_RECORDS, JSON.stringify(DECODED_BACKUP.staffRecords));
      localStorage.setItem('hamibar_service_rules_v1', JSON.stringify(DECODED_BACKUP.rules));
      localStorage.setItem(BACKUP_APPLIED_KEY, 'true');
    } catch {
      // ignore
    }

    showToast(`بک‌آپ با موفقیت روی سامانه اعمال شد: ${toFaDigits(DECODED_BACKUP.drivers.length)} راننده، ${toFaDigits(DECODED_BACKUP.vehicles.length)} خودرو و مرخصی‌ها`, 'success');
  };

  const handleClearAll = () => {
    setRecords({});
    setStaffRecords({});
    showToast('کلیه سوابق حضور و غیاب پاکسازی شدند.', 'info');
  };

  // If user is not authenticated, render the enterprise Login screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      dir="rtl"
      className={`min-h-screen ${
        theme === 'light' ? 'bg-slate-100 text-slate-900 light' : 'bg-[#0a101f] text-slate-100 dark'
      } flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-300 ${
        isCompactTheme ? 'text-xs' : ''
      }`}
    >
      {/* Mobile Backdrop Overlay for Sidebar */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          aria-label="بستن منو"
        />
      )}

      {/* Main Layout Container with Sidebar and Content */}
      <div className="w-full max-w-[1780px] mx-auto p-2 sm:p-4 md:p-5 flex-1 flex gap-3.5 items-start">

        {/* Sidebar-12 Navigation */}
        {isSidebarOpen && (
          <div className="fixed top-2 right-2 bottom-2 z-50 lg:static lg:z-20 max-h-[calc(100vh-16px)] shrink-0 animate-in slide-in-from-right duration-200">
            <Sidebar12
              activeTab={activeTab}
              onTabChange={(tab) => {
                handleTabChange(tab);
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
              onClose={() => setIsSidebarOpen(false)}
              totalVehiclesCount={vehicles.length}
              vehicles={vehicles}
              totalDrivers={drivers.length}
              totalStaff={staffMembers.length}
              todayActiveCount={todayActiveCount}
              onOpenSpotlight={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
              onOpenBackup={() => setIsBackupModalOpen(true)}
              onOpenLanSharing={() => setIsLanModalOpen(true)}
              onToggleThemeOrCompact={() => setIsCompactTheme((prev) => !prev)}
              isCompactTheme={isCompactTheme}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              currentUser={currentUser}
              onOpenUserArea={() => setIsUserAreaOpen(true)}
              onOpenUserManagement={() => handleTabChange('USERS_LOGS')}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadNotificationsCount={unreadNotificationsCount}
              onLogout={handleLogout}
              onOpenBale={() => handleOpenBale()}
              onOpenEitaa={() => handleOpenBale()}
              onOpenMasterAdmin={handleOpenMasterAdmin}
            />
          </div>
        )}

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
          {/* Header with Nav tabs, User Area, Notifications, and KPI cards */}
          <Header
            activeTab={activeTab}
            onTabChange={handleTabChange}
            totalDrivers={drivers.length}
            totalStaff={staffMembers.length}
            todayLeaveCount={todayLeaveCount}
            todayWorkshopCount={todayWorkshopCount}
            totalVehiclesCount={vehicles.length}
            vehicles={vehicles}
            driverDirectory={driverDirectory}
            onFilterChange={setFilterView}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={handleToggleSidebar}
            onOpenBackup={() => setIsBackupModalOpen(true)}
            onOpenLanSharing={() => setIsLanModalOpen(true)}
            networkDbStatus={networkDbStatus}
            lastDbSavedAt={lastDbSavedAt}
            currentUser={currentUser}
            onOpenUserArea={() => setIsUserAreaOpen(true)}
            onOpenUserManagement={() => handleTabChange('USERS_LOGS')}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            unreadNotificationsCount={unreadNotificationsCount}
            onLogout={handleLogout}
            onOpenBale={() => handleOpenBale()}
            onOpenEitaa={() => handleOpenBale()}
            onOpenMasterAdmin={handleOpenMasterAdmin}
            onNavigateToInsuranceAlerts={() => handleNavigateToFleetInsurance()}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />

          {/* Module 1: Attendance Management Hub (Drivers & Staff) */}
          {activeTab === 'ATTENDANCE' && (
            <div className="animate-in fade-in duration-150">
              <AttendanceManagementHubView
                drivers={drivers}
                driverRecords={records}
                staffMembers={staffMembers}
                staffRecords={staffRecords}
                vehicles={vehicles}
                driverDirectory={driverDirectory}
                attendanceNotes={attendanceNotes}
                onUpdateAttendanceNote={handleUpdateAttendanceNote}
                onAssignDriverToVehicle={handleAssignDriverToVehicle}
                onAssignVehicleToDriver={handleAssignVehicleToDriver}
                onNavigateToVehicleAssignment={() => setActiveTab('VEHICLE_ASSIGNMENT')}
                onNavigateToDriversDirectory={() => setActiveTab('DRIVERS')}
                onNavigateToStaffDirectory={() => setActiveTab('STAFF')}
                onUpdateDriverStatus={handleUpdateDriverStatus}
                onUpdateStaffStatus={handleUpdateStaffStatus}
                onAddDriver={() => setIsAddDriverOpen(true)}
                onAddDriverDirect={handleAddDriver}
                onUpdateDriver={handleUpdateDriver}
                onDeleteDriver={handleDeleteDriver}
                onToggleDriverActive={handleToggleDriverActive}
                onAddStaffMember={handleAddStaffMember}
                onUpdateStaffMember={handleUpdateStaffMember}
                onDeleteStaffMember={handleDeleteStaffMember}
                onToggleStaffActive={handleToggleStaffActive}
                onOpenBackup={() => setIsBackupModalOpen(true)}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* Module: Dedicated Fleet & Driver Vehicle Assignment Hub */}
          {activeTab === 'VEHICLE_ASSIGNMENT' && (
            <div className="animate-in fade-in duration-150">
              <VehicleAssignmentHubView
                vehicles={vehicles}
                drivers={drivers}
                driverDirectory={driverDirectory}
                onAssignDriverToVehicle={handleAssignDriverToVehicle}
                onAssignVehicleToDriver={handleAssignVehicleToDriver}
                onUpdateVehicle={handleUpdateVehicle}
                showToast={showToast}
                onOpenBaleForDriver={(d) =>
                  handleOpenBale({
                    name: d.name,
                    phone: d.phone,
                    vehicleCode: d.vehicleCode,
                    plateNumber: d.plateNumber,
                    vehicleType: d.vehicleType,
                  })
                }
                onOpenHandover={handleOpenHandoverForVehicle}
                theme={theme}
              />
            </div>
          )}

          {/* Module 2: Driver Directory & Dossiers */}
          {activeTab === 'DRIVERS' && (
            <div className="animate-in fade-in duration-150">
              <DriversDirectoryView
                drivers={driverDirectory}
                vehicles={vehicles}
                onAddDriver={handleAddDirectoryDriver}
                onUpdateDriver={handleUpdateDirectoryDriver}
                onAssignVehicleToDriver={handleAssignVehicleToDriver}
                onOpenBaleForDriver={(d) =>
                  handleOpenBale({
                    name: d.name,
                    phone: d.phone,
                    vehicleCode: d.code,
                    plateNumber: d.assignedVehicles?.[0],
                  })
                }
                onOpenEitaaForDriver={(d) =>
                  handleOpenBale({
                    name: d.name,
                    phone: d.phone,
                    vehicleCode: d.code,
                    plateNumber: d.assignedVehicles?.[0],
                  })
                }
                onOpenHandover={handleOpenHandoverForDriver}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* Module 3: Staff Directory & Dossiers */}
          {activeTab === 'STAFF' && (
            <div className="animate-in fade-in duration-150">
              <StaffDirectoryView
                staffMembers={staffMembers}
                onAddStaffMember={handleAddStaffMember}
                onUpdateStaffMember={handleUpdateStaffMember}
                onDeleteStaffMember={handleDeleteStaffMember}
                onToggleStaffActive={handleToggleStaffActive}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* Module 4: Fleet Management & Oil Service (مدیریت ناوگان و تعویض روغن) */}
          {activeTab === 'OIL_SERVICE' && (
            <div className="animate-in fade-in duration-150">
              <OilServiceManagementView
                vehicles={vehicles}
                onUpdateVehicle={handleUpdateVehicle}
                availableDrivers={driverDirectory}
                onAssignDriverToVehicle={handleAssignDriverToVehicle}
                showToast={showToast}
                initialSubTab={fleetSubTab}
                highlightedVehicleId={highlightedInsuranceVehicleId}
                onOpenBaleForDriver={(d) =>
                  handleOpenBale({
                    name: d.name,
                    phone: d.phone,
                    vehicleCode: d.vehicleCode,
                    plateNumber: d.plateNumber,
                  })
                }
              />
            </div>
          )}

          {/* Module 5: Dedicated Vehicle Handover & 66-item Checklist (صورت‌جلسه و برگه تحویل خودرو) */}
          {activeTab === 'HANDOVER' && (
            <div className="animate-in fade-in duration-150">
              <VehicleHandoverManager
                vehicles={vehicles}
                drivers={drivers}
                driverDirectory={driverDirectory}
                initialVehicle={preselectedHandoverVehicle}
                initialDriver={preselectedHandoverDriver}
                onShowToast={showToast}
                onSyncCentralDb={handleForceSaveToNetworkDb}
              />
            </div>
          )}

          {/* Module 6: Editable Disciplinary Regulations & Vehicle Handover */}
          {activeTab === 'REGULATIONS' && (
            <div className="animate-in fade-in duration-150">
              <DriverRegulationsView
                onShowToast={showToast}
                vehicles={vehicles}
                drivers={drivers}
                driverDirectory={driverDirectory}
                onSyncCentralDb={handleForceSaveToNetworkDb}
              />
            </div>
          )}

          {/* Module 6: Integrated User Management & System Audit Logs Hub */}
          {activeTab === 'USERS_LOGS' && (
            <div className="animate-in fade-in duration-150">
              <IntegratedUserAndAuditHubView
                currentUser={currentUser}
                onUpdateCurrentUserSession={(updated) => {
                  setCurrentUser(updated);
                  saveStoredSession(updated);
                }}
                onShowToast={(msg, type) => showToast(msg, type)}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modern Compact Footer */}
      <footer className="bg-[#0e1627] border-t border-[#1a2842] py-3.5 px-6 text-slate-400 text-xs mt-6 mb-16 sm:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">سامانه حامی</span>
            <span className="text-slate-600">|</span>
            <span>مدیریت حضور و غیاب، پرونده رانندگان و پرسنل، تعویض روغن و آیین‌نامه انضباطی</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            نسخه اختصاصی سامانه حامی
          </div>
        </div>
      </footer>

      {/* Modals & Toast */}
      <TimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        drivers={drivers}
        records={records}
        year={activeYear}
        month={activeMonth}
      />

      <AddDriverModal
        isOpen={isAddDriverOpen}
        onClose={() => setIsAddDriverOpen(false)}
        onAdd={handleAddDriver}
      />

      <RangeAssignModal
        isOpen={isRangeAssignOpen}
        onClose={() => setIsRangeAssignOpen(false)}
        drivers={drivers}
        year={activeYear}
        month={activeMonth}
        onAssignRange={handleAssignRange}
      />

      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirmResetDefaults={handleResetDefaults}
        onConfirmClearAll={handleClearAll}
      />

      {/* Manual Backup and Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        drivers={drivers}
        records={records}
        staffMembers={staffMembers}
        staffRecords={staffRecords}
        vehicles={vehicles}
        driverDirectory={driverDirectory}
        orders={[]}
        onRestoreData={handleRestoreData}
        onResetDefaults={handleResetDefaults}
        onApplyDecodedBackup={handleApplyLatestBackup}
        onShowToast={showToast}
      />

      <LanSharingModal
        isOpen={isLanModalOpen}
        onClose={() => setIsLanModalOpen(false)}
        onManualSync={handleForceFetchFromNetworkDb}
        onForceSaveToDb={handleForceSaveToNetworkDb}
        onForceFetchFromDb={handleForceFetchFromNetworkDb}
        networkDbStatus={networkDbStatus}
        lastDbSavedAt={lastDbSavedAt}
        onShowToast={showToast}
      />

      {/* User Area Modal (ناحیه کاربری) */}
      <UserProfileModal
        isOpen={isUserAreaOpen}
        onClose={() => setIsUserAreaOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updated) => {
          setCurrentUser(updated);
          saveStoredSession(updated);
        }}
        onLogout={handleLogout}
        onOpenUserManagement={() => {
          setIsUserAreaOpen(false);
          handleTabChange('USERS_LOGS');
        }}
        onOpenLanSharing={() => setIsLanModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onShowToast={(msg, type) => showToast(msg, type)}
      />

      {/* Notification Center Popover / Popup (پاپ‌آپ نوتیفیکیشن) */}
      <NotificationPopover
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onNotificationsChange={setNotifications}
        onNavigateTab={(tab, notif) => {
          if (tab === 'OIL_SERVICE' && (notif?.category === 'fleet' || notif?.id?.includes('insurance'))) {
            const vMatch = notif?.id?.match(/notif-fleet-insurance-v-(v-\d+)/);
            handleNavigateToFleetInsurance(vMatch ? vMatch[1] : undefined);
          } else {
            handleTabChange(tab);
          }
        }}
        onShowToast={(msg, type) => showToast(msg, type)}
      />

      {/* User Access Management Modal (مدیریت کاربران و سطوح دسترسی) */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onUpdateCurrentUserSession={(updated) => {
          setCurrentUser(updated);
          saveStoredSession(updated);
        }}
        onShowToast={(msg, type) => showToast(msg, type)}
        onOpenFullHub={() => {
          setIsUserManagementOpen(false);
          handleTabChange('USERS_LOGS');
        }}
      />

      {/* Bale Web Messenger Modal (ارسال پیام‌های آماده در پیام‌رسان بله) */}
      <BaleMessengerModal
        isOpen={isBaleModalOpen}
        onClose={() => {
          setIsBaleModalOpen(false);
          setBaleRecipient(null);
        }}
        drivers={driverDirectory}
        vehicles={vehicles}
        staff={staffMembers}
        initialRecipient={baleRecipient}
        currentDispatcherName={currentUser?.fullName || 'دیسپچ مرکزی'}
        currentUser={currentUser}
      />

      {/* Master Admin Settings Modal (شبکه، تنظیمات بله، دسترسی‌ها و بک‌آپ) */}
      <MasterAdminModal
        isOpen={isMasterAdminOpen}
        onClose={() => setIsMasterAdminOpen(false)}
        currentUser={currentUser}
        initialTab={masterAdminTab}
        onManualSync={handleForceFetchFromNetworkDb}
        onForceSaveToDb={handleForceSaveToNetworkDb}
        onForceFetchFromDb={handleForceFetchFromNetworkDb}
        networkDbStatus={networkDbStatus}
        lastDbSavedAt={lastDbSavedAt}
        onOpenUserManagement={() => {
          setIsMasterAdminOpen(false);
          handleTabChange('USERS_LOGS');
        }}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onShowToast={showToast}
        onDataRepaired={handleReloadAfterDataRepair}
      />

      {/* Mobile Bottom Navigation Bar (Fast & thumb-friendly navigation on mobile) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenMobileMenu={() => setIsSidebarOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        currentUser={currentUser}
      />

      <Toast toast={toast} onClose={handleCloseToast} />
    </div>
  );
};

export default App;
