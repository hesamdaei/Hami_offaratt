import { FC, useState, useMemo, FormEvent } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  KeyRound,
  Trash2,
  Edit2,
  Power,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  History,
  Activity,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Info,
  CalendarDays,
  UserCheck,
  Droplet,
  BookOpen,
  Database,
  ArrowRight,
  Eye,
  Check,
  X,
  Laptop,
  Smartphone,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Layers,
  BarChart3,
  UserX,
  FileText,
} from 'lucide-react';
import { AppUser, UserPermissions, ModulePermission } from '../types/auth';
import {
  AuditLogItem,
  AuditModule,
  AuditSeverity,
  AuditFilterState,
} from '../types/auditLog';
import {
  getAuditLogs,
  recordAuditLog,
  clearAuditLogs,
  exportAuditLogsToExcel,
  getModuleLabel,
  getSeverityLabel,
  formatRelativeTime,
} from '../utils/auditLogger';
import {
  getStoredUsers,
  saveStoredUsers,
  isMasterAdmin,
  canManageUsers,
} from '../utils/authService';
import { toFaDigits } from '../utils/jalaali';

interface IntegratedUserAndAuditHubViewProps {
  currentUser: AppUser | null;
  onUpdateCurrentUserSession?: (user: AppUser) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  initialTab?: 'USERS' | 'AUDIT_LOGS' | 'ANALYTICS';
  filterByUserId?: string;
}

const AVATAR_COLORS = [
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-slate-600 to-slate-800',
];

export const IntegratedUserAndAuditHubView: FC<IntegratedUserAndAuditHubViewProps> = ({
  currentUser,
  onUpdateCurrentUserSession,
  onShowToast,
  initialTab = 'USERS',
  filterByUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'AUDIT_LOGS' | 'ANALYTICS'>(initialTab);
  const isMaster = isMasterAdmin(currentUser);
  const hasUserManagementPermission = canManageUsers(currentUser);

  // Users State
  const [users, setUsers] = useState<AppUser[]>(() => getStoredUsers());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'MASTER' | 'OPERATOR' | 'FLEET'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => getAuditLogs());
  const [logFilter, setLogFilter] = useState<AuditFilterState>({
    searchQuery: '',
    userId: filterByUserId || 'ALL',
    module: 'ALL',
    severity: 'ALL',
  });

  // Selected Log Details Modal
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLogItem | null>(null);

  // New User Form Modal
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('اپراتور شیفت');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newBaleId, setNewBaleId] = useState('');
  const [newAvatarColor, setNewAvatarColor] = useState(AVATAR_COLORS[1]);
  const [newPermissions, setNewPermissions] = useState<UserPermissions>({
    attendance: 'full',
    drivers: 'view',
    staff: 'view',
    oilService: 'none',
    regulations: 'view',
    backupRestore: false,
    userManagement: false,
    networkSettings: false,
  });

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editBaleId, setEditBaleId] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState('');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    attendance: 'view',
    drivers: 'view',
    staff: 'view',
    oilService: 'view',
    regulations: 'view',
    backupRestore: false,
    userManagement: false,
    networkSettings: false,
  });

  // Quick Password Reset Modal
  const [passwordResetUser, setPasswordResetUser] = useState<AppUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Confirmation Modals
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [isClearLogsConfirmOpen, setIsClearLogsConfirmOpen] = useState(false);

  // -------------------------------------------------------------
  // USER MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateUser = () => {
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewRoleTitle('اپراتور شیفت');
    setNewPhoneNumber('');
    setNewBaleId('');
    setNewAvatarColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setNewPermissions({
      attendance: 'full',
      drivers: 'view',
      staff: 'view',
      oilService: 'none',
      regulations: 'view',
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
    });
    setIsCreateUserOpen(true);
  };

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanFullName = newFullName.trim();

    if (!cleanUsername || !cleanFullName || !newPassword) {
      onShowToast('لطفاً تمامی فیلدهای الزامی را تکمیل کنید.', 'error');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      onShowToast('این نام کاربری قبلاً در سامانه ثبت شده است.', 'error');
      return;
    }

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password: newPassword,
      fullName: cleanFullName,
      roleTitle: newRoleTitle.trim() || 'اپراتور سیستم',
      phoneNumber: newPhoneNumber.trim() || undefined,
      baleId: newBaleId.trim() || undefined,
      isMasterAdmin: false,
      isActive: true,
      permissions: newPermissions,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      avatarColor: newAvatarColor,
    };

    const updated = [...users, newUser];
    setUsers(updated);
    saveStoredUsers(updated);

    // Record Audit Log
    recordAuditLog(currentUser, {
      action: 'USER_CREATE',
      module: 'USERS',
      title: 'ایجاد کاربر جدید',
      description: `کاربر جدید «${cleanFullName}» با نام کاربری «${cleanUsername}» و سمت «${newUser.roleTitle}» در سامانه ایجاد شد.`,
      targetId: newUser.id,
      targetName: newUser.fullName,
      severity: 'SUCCESS',
      newValue: JSON.stringify({ role: newUser.roleTitle, permissions: newUser.permissions }),
    });

    setAuditLogs(getAuditLogs());
    setIsCreateUserOpen(false);
    onShowToast(`کاربر جدید «${cleanFullName}» با نام کاربری «${cleanUsername}» با موفقیت افزوده شد.`, 'success');
  };

  const handleOpenEditUser = (user: AppUser) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditRoleTitle(user.roleTitle);
    setEditPassword('');
    setEditPhoneNumber(user.phoneNumber || '');
    setEditBaleId(user.baleId || '');
    setEditAvatarColor(user.avatarColor || AVATAR_COLORS[0]);
    setEditPermissions({ ...user.permissions });
  };

  const handleSaveEditUser = (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanFullName = editFullName.trim();
    if (!cleanFullName) {
      onShowToast('نام و نام خانوادگی نمی‌تواند خالی باشد.', 'error');
      return;
    }

    const cleanEditUsername = editUsername.trim().toLowerCase();
    if (!cleanEditUsername) {
      onShowToast('نام کاربری نمی‌تواند خالی باشد.', 'error');
      return;
    }

    const usernameConflict = users.some(
      (u) => u.id !== editingUser.id && u.username.toLowerCase() === cleanEditUsername
    );
    if (usernameConflict) {
      onShowToast('این نام کاربری قبلاً توسط کاربر دیگری در سامانه ثبت شده است.', 'error');
      return;
    }

    const oldValues = {
      fullName: editingUser.fullName,
      username: editingUser.username,
      roleTitle: editingUser.roleTitle,
      isActive: editingUser.isActive,
    };

    const updatedUsers = users.map((u) => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          fullName: cleanFullName,
          username: cleanEditUsername,
          roleTitle: editRoleTitle.trim() || u.roleTitle,
          password: editPassword.trim() ? editPassword.trim() : u.password,
          phoneNumber: editPhoneNumber.trim() || undefined,
          baleId: editBaleId.trim() || undefined,
          avatarColor: editAvatarColor || u.avatarColor,
          // Master admin permissions remain complete
          permissions: u.isMasterAdmin ? u.permissions : editPermissions,
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    // If edited current user, update session
    if (currentUser && currentUser.id === editingUser.id && onUpdateCurrentUserSession) {
      const freshCurrent = updatedUsers.find((u) => u.id === currentUser.id);
      if (freshCurrent) onUpdateCurrentUserSession(freshCurrent);
    }

    // Record Audit Log
    recordAuditLog(currentUser, {
      action: 'USER_UPDATE',
      module: 'USERS',
      title: 'ویرایش مشخصات و دسترسی‌های کاربر',
      description: `مشخصات کاربر «${cleanFullName}» (نام کاربری: ${cleanEditUsername}) توسط «${currentUser?.fullName || 'مدیر'}» به‌روزرسانی شد.`,
      targetId: editingUser.id,
      targetName: cleanFullName,
      severity: 'WARNING',
      previousValue: JSON.stringify(oldValues),
      newValue: JSON.stringify({ fullName: cleanFullName, username: cleanEditUsername, roleTitle: editRoleTitle }),
    });

    setAuditLogs(getAuditLogs());
    setEditingUser(null);
    onShowToast(`اطلاعات کاربر «${cleanFullName}» با موفقیت به‌روزرسانی شد.`, 'success');
  };

  const handleToggleUserActive = (user: AppUser) => {
    if (user.isMasterAdmin) {
      onShowToast('حساب کاربری مدیر ارشد سیستم غیرقابل تعلیق است.', 'error');
      return;
    }

    const nextStatus = !user.isActive;
    const updatedUsers = users.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u));
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    // Record Audit Log
    recordAuditLog(currentUser, {
      action: 'USER_TOGGLE_ACTIVE',
      module: 'USERS',
      title: nextStatus ? 'فعال‌سازی مجدد حساب کاربر' : 'تعلیق و غیرفعال‌سازی حساب کاربر',
      description: `وضعیت حساب کاربری «${user.fullName}» (${user.username}) به «${nextStatus ? 'فعال' : 'غیرفعال'}» تغییر یافت.`,
      targetId: user.id,
      targetName: user.fullName,
      severity: nextStatus ? 'SUCCESS' : 'WARNING',
      previousValue: user.isActive ? 'فعال' : 'غیرفعال',
      newValue: nextStatus ? 'فعال' : 'غیرفعال',
    });

    setAuditLogs(getAuditLogs());
    onShowToast(
      nextStatus ? `حساب کاربری «${user.fullName}» فعال گردید.` : `حساب کاربری «${user.fullName}» غیرفعال شد.`,
      'info'
    );
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.isMasterAdmin) {
      onShowToast('کاربر مدیر ارشد سیستم غیرقابل حذف است.', 'error');
      setUserToDelete(null);
      return;
    }

    const updatedUsers = users.filter((u) => u.id !== userToDelete.id);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    // Record Audit Log
    recordAuditLog(currentUser, {
      action: 'USER_DELETE',
      module: 'USERS',
      title: 'حذف دائمی کاربر از سیستم',
      description: `کاربر «${userToDelete.fullName}» با نام کاربری «${userToDelete.username}» به طور کامل از سامانه حذف گردید.`,
      targetId: userToDelete.id,
      targetName: userToDelete.fullName,
      severity: 'CRITICAL',
    });

    setAuditLogs(getAuditLogs());
    onShowToast(`کاربر «${userToDelete.fullName}» با موفقیت حذف گردید.`, 'success');
    setUserToDelete(null);
  };

  const handleResetPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newPasswordValue.trim()) return;

    const updatedUsers = users.map((u) =>
      u.id === passwordResetUser.id ? { ...u, password: newPasswordValue.trim() } : u
    );
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    // Record Audit Log
    recordAuditLog(currentUser, {
      action: 'USER_PASSWORD_RESET',
      module: 'USERS',
      title: 'تغییر و بازنشانی رمز عبور',
      description: `رمز عبور کاربر «${passwordResetUser.fullName}» (${passwordResetUser.username}) توسط «${currentUser?.fullName}» تغییر یافت.`,
      targetId: passwordResetUser.id,
      targetName: passwordResetUser.fullName,
      severity: 'CRITICAL',
    });

    setAuditLogs(getAuditLogs());
    setPasswordResetUser(null);
    setNewPasswordValue('');
    onShowToast(`رمز عبور «${passwordResetUser.fullName}» با موفقیت به‌روزرسانی شد.`, 'success');
  };

  // Switch to logs tab and filter by this specific person
  const handleViewUserLogs = (user: AppUser) => {
    setLogFilter((prev) => ({
      ...prev,
      userId: user.id,
      searchQuery: '',
    }));
    setActiveTab('AUDIT_LOGS');
    onShowToast(`نمایش کلیه تغییرات ثبت‌شده توسط «${user.fullName}»`, 'info');
  };

  // -------------------------------------------------------------
  // AUDIT LOGS HANDLERS
  // -------------------------------------------------------------
  const handleClearLogs = () => {
    clearAuditLogs();
    setAuditLogs([]);
    setIsClearLogsConfirmOpen(false);
    onShowToast('تمامی تاریخچه لاگ‌ها با موفقیت پاک‌سازی شد.', 'info');
  };

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      onShowToast('هیچ لاگی با فیلترهای جاری برای دانلود یافت نشد.', 'error');
      return;
    }
    exportAuditLogsToExcel(filteredLogs);
    onShowToast(`خروجی اکسل ${toFaDigits(filteredLogs.length)} رکورد با موفقیت دریافت شد.`, 'success');
  };

  // -------------------------------------------------------------
  // FILTERED DATA CALCULATIONS
  // -------------------------------------------------------------
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.roleTitle.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (userRoleFilter === 'MASTER' && !u.isMasterAdmin) return false;
      if (userRoleFilter === 'OPERATOR' && u.roleTitle.toLowerCase().includes('مدیر')) return false;
      if (userRoleFilter === 'FLEET' && !u.roleTitle.toLowerCase().includes('فنی') && !u.roleTitle.toLowerCase().includes('ناوگان')) return false;

      if (userStatusFilter === 'ACTIVE' && !u.isActive) return false;
      if (userStatusFilter === 'INACTIVE' && u.isActive) return false;

      return true;
    });
  }, [users, userSearchQuery, userRoleFilter, userStatusFilter]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // User filter (Changes by person)
      if (logFilter.userId !== 'ALL') {
        const matchesUser =
          log.userId === logFilter.userId ||
          log.userName.toLowerCase() === logFilter.userId.toLowerCase();
        if (!matchesUser) return false;
      }

      // Module filter
      if (logFilter.module !== 'ALL' && log.module !== logFilter.module) {
        return false;
      }

      // Severity filter
      if (logFilter.severity !== 'ALL' && log.severity !== logFilter.severity) {
        return false;
      }

      // Search query
      const q = logFilter.searchQuery.trim().toLowerCase();
      if (q) {
        const inTitle = log.title.toLowerCase().includes(q);
        const inDesc = log.description.toLowerCase().includes(q);
        const inUser = log.userFullName.toLowerCase().includes(q) || log.userName.toLowerCase().includes(q);
        const inTarget = log.targetName?.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inUser && !inTarget) return false;
      }

      return true;
    });
  }, [auditLogs, logFilter]);

  // Analytics Aggregates
  const analyticsData = useMemo(() => {
    const userActionCount: Record<string, { name: string; count: number; role?: string; avatarColor?: string }> = {};
    const moduleActionCount: Record<string, number> = {};
    const severityCount: Record<string, number> = { INFO: 0, SUCCESS: 0, WARNING: 0, CRITICAL: 0 };

    auditLogs.forEach((log) => {
      // By User
      const key = log.userId || log.userName;
      if (!userActionCount[key]) {
        userActionCount[key] = {
          name: log.userFullName || log.userName,
          count: 0,
          role: log.userRole,
          avatarColor: log.userAvatarColor,
        };
      }
      userActionCount[key].count++;

      // By Module
      moduleActionCount[log.module] = (moduleActionCount[log.module] || 0) + 1;

      // By Severity
      if (severityCount[log.severity] !== undefined) {
        severityCount[log.severity]++;
      }
    });

    const topUsers = Object.entries(userActionCount)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.count - a.count);

    return { topUsers, moduleActionCount, severityCount, totalLogs: auditLogs.length };
  }, [auditLogs]);

  return (
    <div className="space-y-4 select-none pb-12" dir="rtl">
      {/* 1. TOP HEADER & MAIN TAB SWITCHER */}
      <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  مدیریت کاربران، امنیت و رهگیری لاگ سیستم
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  جامع و بلادرنگ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                کنترل سطوح دسترسی کاربران، نظارت بر تغییرات اعمال‌شده توسط هر شخص و رهگیری امنیتی وقایع
              </p>
            </div>
          </div>

          {/* Action Buttons & Tabs */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
            {/* Tab Pills */}
            <div className="flex items-center bg-[#0a1222] p-1 rounded-xl border border-[#1c2a47]">
              <button
                type="button"
                onClick={() => setActiveTab('USERS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'USERS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>کاربران و دسترسی‌ها ({toFaDigits(users.length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('AUDIT_LOGS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'AUDIT_LOGS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>لاگ و تاریخچه تغییرات ({toFaDigits(auditLogs.length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ANALYTICS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ANALYTICS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>تحلیل فعالیت‌ها</span>
              </button>
            </div>

            {/* Quick Actions */}
            {activeTab === 'USERS' && hasUserManagementPermission && (
              <button
                type="button"
                onClick={handleOpenCreateUser}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ ایجاد کاربر جدید</span>
              </button>
            )}

            {activeTab === 'AUDIT_LOGS' && (
              <button
                type="button"
                onClick={handleExportLogs}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#14233f] hover:bg-[#1a2d52] text-slate-200 border border-slate-700/60 shadow-md active:scale-95 transition cursor-pointer"
                title="دانلود فایل اکسل تاریخچه لاگ‌ها"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>خروجی اکسل لاگ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: USERS & PERMISSIONS MANAGEMENT                     */}
      {/* ========================================================= */}
      {activeTab === 'USERS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0f192e] border border-[#1e2f52] rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>کل کاربران</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {toFaDigits(users.length)}
                <span className="text-xs text-slate-400 font-normal mr-1">حساب</span>
              </div>
            </div>

            <div className="bg-[#0f192e] border border-amber-500/20 rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-amber-400 text-xs">
                <span>مدیران ارشد</span>
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-300 mt-1">
                {toFaDigits(users.filter((u) => u.isMasterAdmin).length)}
                <span className="text-xs text-amber-400/70 font-normal mr-1">مدیر ارشد</span>
              </div>
            </div>

            <div className="bg-[#0f192e] border border-emerald-500/20 rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-emerald-400 text-xs">
                <span>کاربران فعال</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-300 mt-1">
                {toFaDigits(users.filter((u) => u.isActive).length)}
                <span className="text-xs text-emerald-400/70 font-normal mr-1">فعال</span>
              </div>
            </div>

            <div className="bg-[#0f192e] border border-rose-500/20 rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-rose-400 text-xs">
                <span>حساب‌های معلق</span>
                <UserX className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-black text-rose-300 mt-1">
                {toFaDigits(users.filter((u) => !u.isActive).length)}
                <span className="text-xs text-rose-400/70 font-normal mr-1">غیرفعال</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="جستجوی نام، نام کاربری یا سمت..."
                  className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Role filter */}
              <div className="flex items-center gap-1 bg-[#0a1222] px-2 py-1.5 rounded-xl border border-[#1e2f52]">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 text-[11px]">نقش:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0f192e]">همه نقش‌ها</option>
                  <option value="MASTER" className="bg-[#0f192e]">مدیر ارشد</option>
                  <option value="OPERATOR" className="bg-[#0f192e]">اپراتور شیفت</option>
                  <option value="FLEET" className="bg-[#0f192e]">مدیر فنی / ترابری</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1 bg-[#0a1222] px-2 py-1.5 rounded-xl border border-[#1e2f52]">
                <span className="text-slate-400 text-[11px]">وضعیت:</span>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0f192e]">همه وضعیت‌ها</option>
                  <option value="ACTIVE" className="bg-[#0f192e]">فقط فعال</option>
                  <option value="INACTIVE" className="bg-[#0f192e]">فقط غیرفعال</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredUsers.map((user) => {
              const isUserSelf = currentUser?.id === user.id;

              return (
                <div
                  key={user.id}
                  className={`bg-[#0f192e] border rounded-2xl p-4 shadow-lg transition-all flex flex-col justify-between ${
                    !user.isActive
                      ? 'border-slate-800/80 bg-[#091120]/90 opacity-75'
                      : user.isMasterAdmin
                      ? 'border-amber-500/30 hover:border-amber-500/60'
                      : 'border-[#1e2f52] hover:border-blue-500/50'
                  }`}
                >
                  <div>
                    {/* User Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${
                            user.avatarColor || 'from-blue-600 to-indigo-700'
                          } flex items-center justify-center text-white font-black text-base shadow-md shrink-0`}
                        >
                          {user.fullName.slice(0, 1)}
                        </div>

                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm truncate" title={user.fullName}>
                              {user.fullName}
                            </span>
                            {user.isMasterAdmin && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                مدیر ارشد
                              </span>
                            )}
                            {isUserSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                                شما
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 mt-0.5 font-mono">
                            @{user.username} • <span className="font-sans text-slate-300">{user.roleTitle}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          user.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {user.isActive ? 'فعال' : 'معلق'}
                      </span>
                    </div>

                    {/* Permissions Badges Matrix */}
                    <div className="bg-[#0a1222] p-2.5 rounded-xl border border-[#1b2b48] mb-3 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                        <span>مجوزهای ماژولار:</span>
                        <span className="text-[10px] text-slate-500">
                          {user.isMasterAdmin ? 'دسترسی کامل نامحدود' : 'بر اساس نقش'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            user.permissions.attendance === 'full'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : user.permissions.attendance === 'view'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          حضور: {user.permissions.attendance === 'full' ? 'کامل' : user.permissions.attendance === 'view' ? 'مشاهده' : 'ندارد'}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            user.permissions.drivers === 'full'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : user.permissions.drivers === 'view'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          رانندگان: {user.permissions.drivers === 'full' ? 'کامل' : user.permissions.drivers === 'view' ? 'مشاهده' : 'ندارد'}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            user.permissions.oilService === 'full'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : user.permissions.oilService === 'view'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          روغن: {user.permissions.oilService === 'full' ? 'کامل' : user.permissions.oilService === 'view' ? 'مشاهده' : 'ندارد'}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            user.permissions.userManagement
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          مدیریت کاربران: {user.permissions.userManagement ? 'دارد' : 'ندارد'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-2 border-t border-[#172542] flex items-center justify-between gap-1.5 text-xs">
                    {/* View Logs of this person */}
                    <button
                      type="button"
                      onClick={() => handleViewUserLogs(user)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 transition text-[11px] font-bold cursor-pointer"
                      title="مشاهده تمام تغییرات ثبت‌شده توسط این شخص"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>لاگ‌های این شخص</span>
                    </button>

                    {/* Manage user controls */}
                    {hasUserManagementPermission && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPasswordResetUser(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                          title="تغییر رمز عبور"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-500/20 transition cursor-pointer"
                          title="ویرایش مشخصات و دسترسی‌ها"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {!user.isMasterAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(user)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                user.isActive
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/20'
                                  : 'text-rose-400 hover:text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              title={user.isActive ? 'تعلیق حساب کاربری' : 'فعال‌سازی حساب کاربری'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                              title="حذف دائمی کاربر"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AUDIT LOGS & CHANGE TRACKING                       */}
      {/* ========================================================= */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Audit Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0f192e] border border-[#1e2f52] rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>کل وقایع ثبت‌شده</span>
                <History className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {toFaDigits(auditLogs.length)}
                <span className="text-xs text-slate-400 font-normal mr-1">رخداد</span>
              </div>
            </div>

            <div className="bg-[#0f192e] border border-blue-500/20 rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-blue-400 text-xs">
                <span>کاربران فعال در لاگ</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-black text-blue-300 mt-1">
                {toFaDigits(analyticsData.topUsers.length)}
                <span className="text-xs text-blue-400/70 font-normal mr-1">نفر</span>
              </div>
            </div>

            <div className="bg-[#0f192e] border border-amber-500/20 rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-amber-400 text-xs">
                <span>هشدارهای تغییرات</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-300 mt-1">
                {toFaDigits(analyticsData.severityCount.WARNING || 0)}
                <span className="text-xs text-amber-400/70 font-normal mr-1">تغییر</span>
              </div>
            </div>

            <div className="bg-[#0f192e] border border-rose-500/20 rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between text-rose-400 text-xs">
                <span>عملیات‌های حساس</span>
                <Shield className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-black text-rose-300 mt-1">
                {toFaDigits(analyticsData.severityCount.CRITICAL || 0)}
                <span className="text-xs text-rose-400/70 font-normal mr-1">مورد</span>
              </div>
            </div>
          </div>

          {/* Detailed Filter Toolbar for Changes by Person */}
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">فیلترهای رهگیری وقایع و تغییرات:</span>
              </div>

              {/* Reset filter button */}
              {(logFilter.userId !== 'ALL' || logFilter.module !== 'ALL' || logFilter.severity !== 'ALL' || logFilter.searchQuery) && (
                <button
                  type="button"
                  onClick={() => setLogFilter({ searchQuery: '', userId: 'ALL', module: 'ALL', severity: 'ALL' })}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>پاک‌سازی همه فیلترها</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* Filter 1: BY PERSON (شخص انجام‌دهنده تغییرات) */}
              <div className="bg-[#0a1222] p-2 rounded-xl border border-[#1e2f52] flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                  <span>شخص ثبت‌کننده تغییر:</span>
                  {logFilter.userId !== 'ALL' && <span className="text-blue-400 text-[10px]">فیلتر فعال</span>}
                </label>
                <select
                  value={logFilter.userId}
                  onChange={(e) => setLogFilter((prev) => ({ ...prev, userId: e.target.value }))}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer py-1 font-medium"
                >
                  <option value="ALL" className="bg-[#0f192e]">همه کاربران سیستم</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#0f192e]">
                      {u.fullName} ({u.username}) - {u.roleTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: BY MODULE */}
              <div className="bg-[#0a1222] p-2 rounded-xl border border-[#1e2f52] flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold">بخش / ماژول:</label>
                <select
                  value={logFilter.module}
                  onChange={(e) => setLogFilter((prev) => ({ ...prev, module: e.target.value as any }))}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer py-1 font-medium"
                >
                  <option value="ALL" className="bg-[#0f192e]">تمام ماژول‌ها</option>
                  <option value="ATTENDANCE" className="bg-[#0f192e]">حضور و غیاب</option>
                  <option value="DRIVERS" className="bg-[#0f192e]">پرونده رانندگان</option>
                  <option value="STAFF" className="bg-[#0f192e]">پرونده پرسنل</option>
                  <option value="OIL_SERVICE" className="bg-[#0f192e]">سرویس روغن و خودرو</option>
                  <option value="USERS" className="bg-[#0f192e]">مدیریت کاربران</option>
                  <option value="AUTH" className="bg-[#0f192e]">ورود و امنیت</option>
                  <option value="BACKUP" className="bg-[#0f192e]">پشتیبان و بازیابی</option>
                </select>
              </div>

              {/* Filter 3: BY SEVERITY */}
              <div className="bg-[#0a1222] p-2 rounded-xl border border-[#1e2f52] flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold">سطح اهمیت:</label>
                <select
                  value={logFilter.severity}
                  onChange={(e) => setLogFilter((prev) => ({ ...prev, severity: e.target.value as any }))}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer py-1 font-medium"
                >
                  <option value="ALL" className="bg-[#0f192e]">همه سطوح</option>
                  <option value="INFO" className="bg-[#0f192e]">عادی (Info)</option>
                  <option value="SUCCESS" className="bg-[#0f192e]">موفق (Success)</option>
                  <option value="WARNING" className="bg-[#0f192e]">هشدار تغییرات (Warning)</option>
                  <option value="CRITICAL" className="bg-[#0f192e]">عملیات حساس (Critical)</option>
                </select>
              </div>

              {/* Filter 4: TEXT SEARCH */}
              <div className="bg-[#0a1222] p-2 rounded-xl border border-[#1e2f52] flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold">جستجو در متن لاگ:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={logFilter.searchQuery}
                    onChange={(e) => setLogFilter((prev) => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder="جستجو در عنوان یا شرح رخداد..."
                    className="w-full bg-transparent text-white text-xs pr-2 pl-6 py-0.5 focus:outline-none placeholder-slate-500"
                  />
                  {logFilter.searchQuery && (
                    <button
                      onClick={() => setLogFilter((prev) => ({ ...prev, searchQuery: '' }))}
                      className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Table / Timeline List */}
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl shadow-xl overflow-hidden">
            <div className="p-3.5 border-b border-[#1e2f52] flex items-center justify-between bg-[#0a1222] text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>نمایش {toFaDigits(filteredLogs.length)} رخداد ثبت‌شده</span>
              </span>

              {isMaster && auditLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearLogsConfirmOpen(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                >
                  پاک‌سازی تاریخچه لاگ‌ها
                </button>
              )}
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">هیچ رخدادی با این شرایط یافت نشد</h3>
                <p className="text-xs text-slate-400">
                  فیلترهای جستجو، شخص یا ماژول را تغییر دهید تا نتایج نمایش داده شوند.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[640px] custom-scrollbar">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0c1424] text-slate-300 font-bold border-b border-[#1e2f52]">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 min-w-[120px]">زمان رخداد</th>
                      <th className="p-3 min-w-[170px]">شخص انجام‌دهنده</th>
                      <th className="p-3 min-w-[120px]">بخش / ماژول</th>
                      <th className="p-3 min-w-[280px]">شرح کامل تغییرات</th>
                      <th className="p-3 min-w-[90px] text-center">اهمیت</th>
                      <th className="p-3 min-w-[70px] text-center">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#172542]">
                    {filteredLogs.map((log, idx) => {
                      const isEven = idx % 2 === 0;

                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-[#15233c] transition-colors ${
                            isEven ? 'bg-[#0f192e]' : 'bg-[#0b1322]'
                          }`}
                        >
                          {/* Index */}
                          <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                            {toFaDigits(idx + 1)}
                          </td>

                          {/* Timestamp */}
                          <td className="p-3">
                            <div className="font-bold text-white font-mono text-xs">
                              {toFaDigits(log.time)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {toFaDigits(log.jalaaliDate)} ({formatRelativeTime(log.timestamp)})
                            </div>
                          </td>

                          {/* User who made the change */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${
                                  log.userAvatarColor || 'from-blue-600 to-indigo-700'
                                } flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs`}
                              >
                                {log.userFullName?.slice(0, 1) || 'ک'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white text-xs truncate">
                                  {log.userFullName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  @{log.userName} • {log.userRole || 'کاربر'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Module */}
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#14233e] text-slate-300 border border-[#21355c]">
                              {getModuleLabel(log.module)}
                            </span>
                          </td>

                          {/* Description & Change Diff */}
                          <td className="p-3">
                            <div className="font-bold text-slate-100 text-xs mb-1">
                              {log.title}
                            </div>
                            <div className="text-slate-400 text-[11px] leading-relaxed">
                              {log.description}
                            </div>

                            {/* Diff chips if available */}
                            {(log.previousValue || log.newValue) && (
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] flex-wrap">
                                {log.previousValue && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono line-through">
                                    قبل: {log.previousValue}
                                  </span>
                                )}
                                {log.newValue && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-mono">
                                    بعد: {log.newValue}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Severity */}
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                log.severity === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : log.severity === 'WARNING'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : log.severity === 'SUCCESS'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}
                            >
                              {getSeverityLabel(log.severity)}
                            </span>
                          </td>

                          {/* Details Button */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedLogForDetails(log)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-500/20 transition cursor-pointer"
                              title="مشاهده اطلاعات تکمیلی لاگ"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: USER ACTIVITY ANALYTICS                            */}
      {/* ========================================================= */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User Activity Share Card */}
            <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e2f52] pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span>تعداد و سهم تغییرات ثبت‌شده توسط هر شخص</span>
                </h3>
                <span className="text-[10px] text-slate-400">به ترتیب بیشترین فعالیت</span>
              </div>

              <div className="space-y-3">
                {analyticsData.topUsers.map((item, idx) => {
                  const percentage =
                    analyticsData.totalLogs > 0
                      ? Math.round((item.count / analyticsData.totalLogs) * 100)
                      : 0;

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center">
                            {toFaDigits(idx + 1)}
                          </span>
                          <span className="font-bold text-white">{item.name}</span>
                          {item.role && (
                            <span className="text-[10px] text-slate-400 font-normal">({item.role})</span>
                          )}
                        </div>
                        <div className="font-mono text-slate-300 font-bold flex items-center gap-2">
                          <span>{toFaDigits(item.count)} تغییر</span>
                          <span className="text-blue-400 text-[10px]">({toFaDigits(percentage)}%)</span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Changes by Module Card */}
            <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e2f52] pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>تفکیک وقایع بر اساس بخش‌های سیستم</span>
                </h3>
                <span className="text-[10px] text-slate-400">ماژول‌های پرکاربرد</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(analyticsData.moduleActionCount).map(([mod, count]) => (
                  <div
                    key={mod}
                    className="bg-[#0a1222] border border-[#1b2b48] rounded-xl p-3 flex flex-col justify-between"
                  >
                    <span className="text-[11px] font-bold text-slate-300">
                      {getModuleLabel(mod as AuditModule)}
                    </span>
                    <div className="text-lg font-black text-white font-mono mt-1 flex items-baseline justify-between">
                      <span>{toFaDigits(Number(count))}</span>
                      <span className="text-[10px] text-slate-500 font-sans font-normal">تغییر</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Security Tip */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5 mt-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  تمامی رویدادهای حضور و غیاب، سرویس روغن، ثبت و حذف رانندگان به همراه آی‌پی و مشخصات دستگاه ثبت می‌گردند و غیرقابل دستکاری توسط اپراتورها می‌باشند.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE USER                                        */}
      {/* ========================================================= */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto custom-scrollbar shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2f52] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">ایجاد کاربر جدید در سامانه</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">نام و نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="مثال: علی رضایی"
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1 flex items-center justify-between">
                    <span>نام کاربری ورود به سیستم (قابل ویرایش) *</span>
                    <span className="text-[10px] text-slate-400 font-mono">انگلیسی</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="مثال: ali_rezaei"
                    className="w-full bg-[#0a1222] border border-amber-500/40 rounded-xl px-3 py-2 text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    نام کاربری ورود آزادانه و دلخواه قابل تنظیم و ویرایش است.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رمز عبور ورود *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۴ کاراکتر"
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">عنوان سمت / نقش شغلی</label>
                  <input
                    type="text"
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="مثال: اپراتور دیسپچ"
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">شماره موبایل (اختیاری)</label>
                  <input
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    placeholder="۰۹۱۲..."
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رنگ آواتار</label>
                  <div className="flex items-center gap-2 pt-1">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setNewAvatarColor(color)}
                        className={`w-7 h-7 rounded-xl bg-gradient-to-br ${color} transition cursor-pointer ${
                          newAvatarColor === color ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Module Permissions Matrix */}
              <div className="bg-[#0a1222] border border-[#1b2b48] rounded-xl p-3.5 space-y-3">
                <div className="font-bold text-white text-xs border-b border-[#1b2b48] pb-1.5 flex items-center justify-between">
                  <span>تعیین دسترسی به ماژول‌های سامانه:</span>
                  <span className="text-[10px] text-slate-400">کامل / فقط خواندن / عدم دسترسی</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                    <span className="text-slate-300">حضور و غیاب:</span>
                    <select
                      value={newPermissions.attendance}
                      onChange={(e) =>
                        setNewPermissions((prev) => ({ ...prev, attendance: e.target.value as ModulePermission }))
                      }
                      className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none"
                    >
                      <option value="full">دسترسی کامل (تغییر وضعیت)</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">عدم دسترسی</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                    <span className="text-slate-300">پرونده رانندگان:</span>
                    <select
                      value={newPermissions.drivers}
                      onChange={(e) =>
                        setNewPermissions((prev) => ({ ...prev, drivers: e.target.value as ModulePermission }))
                      }
                      className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none"
                    >
                      <option value="full">دسترسی کامل (ثبت و ویرایش)</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">عدم دسترسی</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                    <span className="text-slate-300">پرونده پرسنل:</span>
                    <select
                      value={newPermissions.staff}
                      onChange={(e) =>
                        setNewPermissions((prev) => ({ ...prev, staff: e.target.value as ModulePermission }))
                      }
                      className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none"
                    >
                      <option value="full">دسترسی کامل</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">عدم دسترسی</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                    <span className="text-slate-300">سرویس روغن و ناوگان:</span>
                    <select
                      value={newPermissions.oilService}
                      onChange={(e) =>
                        setNewPermissions((prev) => ({ ...prev, oilService: e.target.value as ModulePermission }))
                      }
                      className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none"
                    >
                      <option value="full">دسترسی کامل</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">عدم دسترسی</option>
                    </select>
                  </div>
                </div>

                {/* Administrative toggles */}
                <div className="pt-2 border-t border-[#1b2b48] flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={newPermissions.userManagement}
                      onChange={(e) =>
                        setNewPermissions((prev) => ({ ...prev, userManagement: e.target.checked }))
                      }
                      className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مجوز دسترسی به مدیریت کاربران و لاگ</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={newPermissions.backupRestore}
                      onChange={(e) =>
                        setNewPermissions((prev) => ({ ...prev, backupRestore: e.target.checked }))
                      }
                      className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مجوز پشتیبان‌گیری و بازیابی داده</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f52]">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg"
                >
                  ثبت کاربر جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT USER                                          */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto custom-scrollbar shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2f52] pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  ویرایش مشخصات و دسترسی‌های «{editingUser.fullName}»
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1 flex items-center justify-between">
                    <span>نام کاربری ورود به سیستم (قابل ویرایش) *</span>
                    <span className="text-[10px] text-slate-400 font-mono">لاتین</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    className="w-full bg-[#0a1222] border border-amber-500/50 rounded-xl px-3 py-2 text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">عنوان سمت / نقش شغلی</label>
                  <input
                    type="text"
                    value={editRoleTitle}
                    onChange={(e) => setEditRoleTitle(e.target.value)}
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    رمز عبور جدید (تنها در صورت تمایل به تغییر)
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="در صورت خالی بودن رمز قبلی باقی می‌ماند"
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">شماره تماس</label>
                  <input
                    type="tel"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Permissions for non-master */}
              {!editingUser.isMasterAdmin && (
                <div className="bg-[#0a1222] border border-[#1b2b48] rounded-xl p-3.5 space-y-3">
                  <div className="font-bold text-white text-xs border-b border-[#1b2b48] pb-1.5 flex items-center justify-between">
                    <span>تنظیم دسترسی‌های این کاربر:</span>
                    <span className="text-[10px] text-slate-400">سطح دسترسی ماژول‌ها</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                      <span className="text-slate-300">حضور و غیاب:</span>
                      <select
                        value={editPermissions.attendance}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({ ...prev, attendance: e.target.value as ModulePermission }))
                        }
                        className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700"
                      >
                        <option value="full">دسترسی کامل</option>
                        <option value="view">فقط مشاهده</option>
                        <option value="none">عدم دسترسی</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                      <span className="text-slate-300">رانندگان:</span>
                      <select
                        value={editPermissions.drivers}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({ ...prev, drivers: e.target.value as ModulePermission }))
                        }
                        className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700"
                      >
                        <option value="full">دسترسی کامل</option>
                        <option value="view">فقط مشاهده</option>
                        <option value="none">عدم دسترسی</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                      <span className="text-slate-300">پرسنل ستادی:</span>
                      <select
                        value={editPermissions.staff}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({ ...prev, staff: e.target.value as ModulePermission }))
                        }
                        className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700"
                      >
                        <option value="full">دسترسی کامل</option>
                        <option value="view">فقط مشاهده</option>
                        <option value="none">عدم دسترسی</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between bg-[#0f192e] p-2 rounded-lg border border-[#1e2f52]">
                      <span className="text-slate-300">سرویس روغن:</span>
                      <select
                        value={editPermissions.oilService}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({ ...prev, oilService: e.target.value as ModulePermission }))
                        }
                        className="bg-[#0a1222] text-white text-xs px-2 py-1 rounded border border-slate-700"
                      >
                        <option value="full">دسترسی کامل</option>
                        <option value="view">فقط مشاهده</option>
                        <option value="none">عدم دسترسی</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1b2b48] flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={editPermissions.userManagement}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({ ...prev, userManagement: e.target.checked }))
                        }
                        className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span>دسترسی به مدیریت کاربران و لاگ</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={editPermissions.backupRestore}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({ ...prev, backupRestore: e.target.checked }))
                        }
                        className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span>دسترسی به پشتیبان‌گیری</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f52]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK PASSWORD RESET                              */}
      {/* ========================================================= */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2f52] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  تغییر رمز عبور «{passwordResetUser.fullName}»
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">رمز عبور جدید</label>
                <input
                  type="password"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="رمز عبور جدید را وارد نمایید..."
                  className="w-full bg-[#0a1222] border border-[#1e2f52] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f52]">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg"
                >
                  تأیید رمز جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE USER CONFIRMATION                           */}
      {/* ========================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-sm">تأیید حذف کاربر</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از حذف دائمی کاربر «<strong className="text-white">{userToDelete.fullName}</strong>» با نام کاربری «
              <span className="font-mono text-amber-300">@{userToDelete.username}</span>» اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f52] text-xs">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg"
              >
                حذف قطعی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CLEAR LOGS CONFIRMATION                            */}
      {/* ========================================================= */}
      {isClearLogsConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-sm">پاک‌سازی کل تاریخچه لاگ‌ها</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از پاک‌سازی تمامی لاگ‌های ثبت‌شده در سامانه اطمینان دارید؟ این عملیات سابقه رخدادها را از حافظه سیستم پاک می‌کند.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f52] text-xs">
              <button
                type="button"
                onClick={() => setIsClearLogsConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg"
              >
                تأیید و پاک‌سازی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW AUDIT LOG DETAILS                             */}
      {/* ========================================================= */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-[#1e2f52] rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2f52] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">جزئیات کامل رخداد امنیتی</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#0a1222] p-3 rounded-xl border border-[#1b2b48] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">شناسه یکتای رخداد:</span>
                  <span className="font-mono text-slate-300 text-[11px]">{selectedLogForDetails.id}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">زمان دقیق:</span>
                  <span className="font-mono text-white font-bold">
                    {toFaDigits(selectedLogForDetails.jalaaliDate)} ساعت {toFaDigits(selectedLogForDetails.time)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">کاربر مجری:</span>
                  <span className="text-white font-bold">
                    {selectedLogForDetails.userFullName} (@{selectedLogForDetails.userName})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ماژول و بخش:</span>
                  <span className="text-blue-300 font-bold">{getModuleLabel(selectedLogForDetails.module)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">دستگاه / کلاینت:</span>
                  <span className="text-slate-300 font-mono">{selectedLogForDetails.device || 'مرورگر دسکتاپ'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">آدرس آی‌پی کلاینت:</span>
                  <span className="text-slate-300 font-mono">{selectedLogForDetails.clientIp || '192.168.1.100'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-300 block mb-1">عنوان عملیات:</span>
                <div className="p-2.5 rounded-xl bg-[#0a1222] border border-[#1e2f52] text-white font-bold">
                  {selectedLogForDetails.title}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-300 block mb-1">شرح دقیق تغییرات:</span>
                <div className="p-2.5 rounded-xl bg-[#0a1222] border border-[#1e2f52] text-slate-300 leading-relaxed">
                  {selectedLogForDetails.description}
                </div>
              </div>

              {(selectedLogForDetails.previousValue || selectedLogForDetails.newValue) && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block mb-0.5">مقدار پیش از تغییر:</span>
                    <span className="font-mono text-slate-300 break-words">
                      {selectedLogForDetails.previousValue || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/40">
                    <span className="text-emerald-500 block mb-0.5">مقدار جدید:</span>
                    <span className="font-mono text-emerald-300 break-words">
                      {selectedLogForDetails.newValue || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#1e2f52]">
              <button
                type="button"
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
