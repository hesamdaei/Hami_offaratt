import { FC, useState, FormEvent } from 'react';
import {
  X,
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Check,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  UserCheck,
  Droplet,
  BookOpen,
  Database,
  Network,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { AppUser, UserPermissions, ModulePermission } from '../types/auth';
import { getStoredUsers, saveStoredUsers, isMasterAdmin } from '../utils/authService';
import { toFaDigits } from '../utils/jalaali';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpdateCurrentUserSession: (user: AppUser) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onOpenFullHub?: () => void;
}

export const UserManagementModal: FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateCurrentUserSession,
  onShowToast,
  onOpenFullHub,
}) => {
  const [users, setUsers] = useState<AppUser[]>(() => getStoredUsers());
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');

  // New User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('اپراتور سیستم');
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

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editPassword, setEditPassword] = useState('');
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

  if (!isOpen) return null;

  const refreshUsersList = () => {
    const list = getStoredUsers();
    setUsers(list);
  };

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    const cleanFullName = newFullName.trim();

    if (!cleanFullName || !cleanUsername || !cleanPassword) {
      onShowToast('لطفاً تمامی فیلدهای الزامی را تکمیل نمایید.', 'error');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      onShowToast('این نام کاربری قبلاً در سامانه ثبت شده است.', 'error');
      return;
    }

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password: cleanPassword,
      fullName: cleanFullName,
      roleTitle: newRoleTitle.trim() || 'کاربر سیستم',
      isMasterAdmin: false,
      isActive: true,
      permissions: {
        ...newPermissions,
        networkSettings: false,
      },
      createdAt: new Date().toLocaleDateString('fa-IR'),
      avatarColor: 'from-blue-600 to-indigo-700',
    };

    const updated = [...users, newUser];
    setUsers(updated);
    saveStoredUsers(updated);
    onShowToast(`کاربر جدید «${cleanFullName}» با نام کاربری «${cleanUsername}» با موفقیت افزوده شد.`, 'success');

    // Reset Form
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewRoleTitle('اپراتور سیستم');
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
    setActiveTab('LIST');
  };

  const startEditing = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditRoleTitle(user.roleTitle);
    setEditPassword(user.password || '');
    setEditPermissions({ ...user.permissions, networkSettings: isMasterAdmin(user) });
  };

  const handleSaveEdit = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const cleanEditUsername = editUsername.trim().toLowerCase();
    if (!cleanEditUsername) {
      onShowToast('نام کاربری نمی‌تواند خالی باشد.', 'error');
      return;
    }

    const usernameConflict = users.some(
      (u) => u.id !== userId && u.username.toLowerCase() === cleanEditUsername
    );
    if (usernameConflict) {
      onShowToast('این نام کاربری توسط کاربر دیگری استفاده شده است.', 'error');
      return;
    }

    const isTargetMaster = isMasterAdmin(targetUser);

    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const updated: AppUser = {
          ...u,
          username: cleanEditUsername,
          fullName: editFullName.trim() || u.fullName,
          roleTitle: editRoleTitle.trim() || u.roleTitle,
          password: editPassword.trim() || u.password,
          permissions: {
            ...editPermissions,
            // Master Admin always keeps network & admin permissions
            networkSettings: isTargetMaster ? true : false,
            userManagement: isTargetMaster ? true : editPermissions.userManagement,
          },
        };

        if (currentUser && currentUser.id === u.id) {
          onUpdateCurrentUserSession(updated);
        }
        return updated;
      }
      return u;
    });

    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    setEditingUserId(null);
    onShowToast(`تغییرات کاربر «${editFullName}» با موفقیت ذخیره شد.`, 'success');
  };

  const handleToggleActive = (user: AppUser) => {
    if (isMasterAdmin(user)) {
      onShowToast('حساب کاربری مدیریت غیرقابل غیرفعال‌سازی است.', 'error');
      return;
    }

    const updated = users.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    setUsers(updated);
    saveStoredUsers(updated);
    onShowToast(`وضعیت کاربر «${user.fullName}» تغییر یافت.`, 'info');
  };

  const handleDeleteUser = (user: AppUser) => {
    if (isMasterAdmin(user)) {
      onShowToast('حذف حساب کاربری مدیریت مجاز نمی‌باشد.', 'error');
      return;
    }

    if (confirm(`آیا از حذف دسترسی و کاربر «${user.fullName}» با نام کاربری ${user.username} اطمینان دارید؟`)) {
      const updated = users.filter((u) => u.id !== user.id);
      setUsers(updated);
      saveStoredUsers(updated);
      onShowToast(`کاربر «${user.fullName}» حذف گردید.`, 'success');
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md select-none overflow-y-auto"
    >
      <div className="bg-[#0e1627] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0a101d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  مدیریت کاربران و سطوح دسترسی
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  پنل مدیریت
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تعریف کاربران، تعیین نقش‌ها و کنترل دسترسی به بخش‌های مختلف نرم‌افزار
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-header Banner */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              مدیریت حساب‌های کاربری و تعیین سطوح دسترسی بخش‌های مختلف سامانه
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            کاربر جاری: <span className="text-emerald-400 font-bold">{currentUser?.username}</span>
          </span>
        </div>

        {/* Navigation Tabs (Segmented Control) & Full Hub Link */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-[#090f1e] flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 max-w-md">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>لیست کاربران ({toFaDigits(users.length)})</span>
            </button>
            <button
              onClick={() => setActiveTab('CREATE')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'CREATE'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>تعریف کاربر جدید</span>
            </button>
          </div>

          {onOpenFullHub && (
            <button
              type="button"
              onClick={onOpenFullHub}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 hover:text-blue-200 text-xs font-bold transition cursor-pointer shadow-sm"
              title="مشاهده بخش جامع کاربران، سطوح دسترسی و تاریخچه تغییرات هر شخص"
            >
              <Shield className="w-4 h-4 text-blue-400" />
              <span>مشاهده بخش جامع و رهگیری لاگ سیستم ←</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3.5">
                {users.map((user) => {
                  const isMaster = isMasterAdmin(user);
                  const isEditing = editingUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-2xl border transition ${
                        isMaster
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : user.isActive
                          ? 'bg-[#111c30] border-slate-800'
                          : 'bg-slate-900/60 border-slate-800/60 opacity-75'
                      }`}
                    >
                      {isEditing ? (
                        /* Inline Edit Form */
                        <div className="space-y-4 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs font-bold text-amber-400">
                              ویرایش اطلاعات و دسترسی‌های کاربر: {user.fullName} ({user.username})
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              انصراف
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">
                                نام و نام خانوادگی
                              </label>
                              <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-amber-400 font-bold block mb-1 flex items-center justify-between">
                                <span>نام کاربری ورود به سیستم (قابل ویرایش)</span>
                                <span className="text-[10px] text-slate-500 font-normal">انگلیسی</span>
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">
                                سمت / عنوان شغلی
                              </label>
                              <input
                                type="text"
                                value={editRoleTitle}
                                onChange={(e) => setEditRoleTitle(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">
                                رمز عبور جدید
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          {/* Permissions Selector Grid */}
                          <div>
                            <span className="text-xs font-bold text-slate-300 block mb-2">
                              تنظیم سطوح دسترسی به بخش‌های نرم‌افزار:
                            </span>

                            {isMaster ? (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-amber-400" />
                                <span>
                                  این حساب دارای دسترسی کامل مدیریتی به تمامی بخش‌ها و تنظیمات زیرساخت می‌باشد.
                                </span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {/* Attendance */}
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                  <span className="text-xs text-slate-300">حضور و غیاب:</span>
                                  <select
                                    value={editPermissions.attendance}
                                    onChange={(e) =>
                                      setEditPermissions({
                                        ...editPermissions,
                                        attendance: e.target.value as ModulePermission,
                                      })
                                    }
                                    className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2 py-1"
                                  >
                                    <option value="full">ثبت و ویرایش کامل</option>
                                    <option value="view">فقط مشاهده</option>
                                    <option value="none">بدون دسترسی</option>
                                  </select>
                                </div>

                                {/* Drivers */}
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                  <span className="text-xs text-slate-300">پرونده رانندگان:</span>
                                  <select
                                    value={editPermissions.drivers}
                                    onChange={(e) =>
                                      setEditPermissions({
                                        ...editPermissions,
                                        drivers: e.target.value as ModulePermission,
                                      })
                                    }
                                    className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2 py-1"
                                  >
                                    <option value="full">ثبت و ویرایش کامل</option>
                                    <option value="view">فقط مشاهده</option>
                                    <option value="none">بدون دسترسی</option>
                                  </select>
                                </div>

                                {/* Staff */}
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                  <span className="text-xs text-slate-300">پرونده پرسنل:</span>
                                  <select
                                    value={editPermissions.staff}
                                    onChange={(e) =>
                                      setEditPermissions({
                                        ...editPermissions,
                                        staff: e.target.value as ModulePermission,
                                      })
                                    }
                                    className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2 py-1"
                                  >
                                    <option value="full">ثبت و ویرایش کامل</option>
                                    <option value="view">فقط مشاهده</option>
                                    <option value="none">بدون دسترسی</option>
                                  </select>
                                </div>

                                {/* Oil Service */}
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                  <span className="text-xs text-slate-300">تعویض روغن و خودروها:</span>
                                  <select
                                    value={editPermissions.oilService}
                                    onChange={(e) =>
                                      setEditPermissions({
                                        ...editPermissions,
                                        oilService: e.target.value as ModulePermission,
                                      })
                                    }
                                    className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2 py-1"
                                  >
                                    <option value="full">ثبت و ویرایش کامل</option>
                                    <option value="view">فقط مشاهده</option>
                                    <option value="none">بدون دسترسی</option>
                                  </select>
                                </div>

                                {/* Regulations */}
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                  <span className="text-xs text-slate-300">آیین‌نامه انضباطی:</span>
                                  <select
                                    value={editPermissions.regulations}
                                    onChange={(e) =>
                                      setEditPermissions({
                                        ...editPermissions,
                                        regulations: e.target.value as ModulePermission,
                                      })
                                    }
                                    className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2 py-1"
                                  >
                                    <option value="full">ثبت و ویرایش کامل</option>
                                    <option value="view">فقط مشاهده</option>
                                    <option value="none">بدون دسترسی</option>
                                  </select>
                                </div>

                                {/* Backup */}
                                <label className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer">
                                  <span className="text-xs text-slate-300">بک‌آپ و بازیابی داده‌ها:</span>
                                  <input
                                    type="checkbox"
                                    checked={editPermissions.backupRestore}
                                    onChange={(e) =>
                                      setEditPermissions({
                                        ...editPermissions,
                                        backupRestore: e.target.checked,
                                      })
                                    }
                                    className="rounded text-amber-500 focus:ring-0 w-4 h-4"
                                  />
                                </label>

                                {/* User Management */}
                                <label className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer">
                                  <span className="text-xs text-slate-300">دسترسی مدیریت کاربران:</span>
                                  <input
                                    type="checkbox"
                                    checked={editPermissions.userManagement}
                                    onChange={(e) =>
                                      setEditPermissions({
                                        ...editPermissions,
                                        userManagement: e.target.checked,
                                      })
                                    }
                                    className="rounded text-amber-500 focus:ring-0 w-4 h-4"
                                  />
                                </label>

                                {/* Network Settings Note */}
                                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between opacity-60">
                                  <span className="text-xs text-slate-400">تنظیمات شبکه (LAN):</span>
                                  <span className="text-[10px] text-amber-400/80 font-bold">
                                    مختص مدیریت سیستم
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(user.id)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                            >
                              <Check className="w-4 h-4" />
                              <span>ذخیره تغییرات</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard View Item */
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${user.avatarColor || 'from-blue-600 to-indigo-700'} border border-blue-500/40 flex items-center justify-center font-black text-white shrink-0 shadow-md`}>
                              {user.fullName.slice(0, 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">
                                  {user.fullName}
                                </span>
                                {isMaster ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-amber-400" />
                                    <span>مدیریت ارشد سامانه</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    {user.roleTitle}
                                  </span>
                                )}
                                {user.isActive ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    فعال
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    غیرفعال
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span>
                                  نام کاربری: <strong className="text-slate-200 font-mono">{user.username}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  رمز عبور: <strong className="text-slate-400 font-mono tracking-widest">••••••••</strong>
                                </span>
                              </div>

                              {/* Permissions Tags */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {isMaster ? (
                                  <>
                                    <span className="text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/25">
                                      دسترسی نامحدود
                                    </span>
                                    <span className="text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/25">
                                      تنظیمات اختصاصی شبکه (LAN)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {user.permissions.attendance !== 'none' && (
                                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                                        حضور‌غیاب ({user.permissions.attendance === 'full' ? 'کامل' : 'مشاهده'})
                                      </span>
                                    )}
                                    {user.permissions.drivers !== 'none' && (
                                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                                        رانندگان ({user.permissions.drivers === 'full' ? 'کامل' : 'مشاهده'})
                                      </span>
                                    )}
                                    {user.permissions.staff !== 'none' && (
                                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                                        پرسنل ({user.permissions.staff === 'full' ? 'کامل' : 'مشاهده'})
                                      </span>
                                    )}
                                    {user.permissions.oilService !== 'none' && (
                                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                                        روغن و خودرو ({user.permissions.oilService === 'full' ? 'کامل' : 'مشاهده'})
                                      </span>
                                    )}
                                    {user.permissions.regulations !== 'none' && (
                                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                                        آیین‌نامه ({user.permissions.regulations === 'full' ? 'کامل' : 'مشاهده'})
                                      </span>
                                    )}
                                    {user.permissions.backupRestore && (
                                      <span className="text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/25">
                                        بک‌آپ دستی
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => startEditing(user)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
                              title="ویرایش دسترسی‌ها و مشخصات"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>ویرایش دسترسی</span>
                            </button>

                            {!isMaster && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(user)}
                                  className={`p-1.5 rounded-xl border transition ${
                                    user.isActive
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                                  }`}
                                  title={user.isActive ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی کاربر'}
                                >
                                  {user.isActive ? (
                                    <Lock className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <Unlock className="w-4 h-4 text-emerald-400" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                                  title="حذف کاربر"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'CREATE' && (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">مشخصات هویتی و ورود کاربر جدید</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-bold">
                      نام و نام خانوادگی *
                    </label>
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="مثال: علی رضایی"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-bold">
                      سمت / عنوان سازمانی
                    </label>
                    <input
                      type="text"
                      value={newRoleTitle}
                      onChange={(e) => setNewRoleTitle(e.target.value)}
                      placeholder="مثال: متصدی امور اداری"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-amber-300 block mb-1 font-bold flex items-center justify-between">
                      <span>نام کاربری ورود به سیستم (قابل ویرایش) *</span>
                      <span className="text-[10px] text-slate-400 font-normal">لاتین / دلخواه</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      placeholder="e.g. operator2"
                      required
                      className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      نام کاربری آزادانه توسط مدیر قابل تغییر و تعریف است.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-bold">
                      رمز عبور *
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="رمز ورود..."
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Module Permissions Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">تخصیص سطوح دسترسی اختصاصی</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    برای هر بخش دسترسی ثبت/ویرایش، فقط مشاهده یا عدم دسترسی را معین کنید
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Attendance */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">تابلوی حضور و غیاب</span>
                      <span className="text-[10px] text-slate-400">ثبت حضور، مرخصی و مأموریت</span>
                    </div>
                    <select
                      value={newPermissions.attendance}
                      onChange={(e) =>
                        setNewPermissions({
                          ...newPermissions,
                          attendance: e.target.value as ModulePermission,
                        })
                      }
                      className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2.5 py-1.5 font-bold"
                    >
                      <option value="full">ثبت و ویرایش</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">بدون دسترسی</option>
                    </select>
                  </div>

                  {/* Drivers */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">پرونده رانندگان</span>
                      <span className="text-[10px] text-slate-400">مدارک، گواهینامه و سوابق</span>
                    </div>
                    <select
                      value={newPermissions.drivers}
                      onChange={(e) =>
                        setNewPermissions({
                          ...newPermissions,
                          drivers: e.target.value as ModulePermission,
                        })
                      }
                      className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2.5 py-1.5 font-bold"
                    >
                      <option value="full">ثبت و ویرایش</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">بدون دسترسی</option>
                    </select>
                  </div>

                  {/* Staff */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">پرونده پرسنل</span>
                      <span className="text-[10px] text-slate-400">کارگزینی و احکام سازمانی</span>
                    </div>
                    <select
                      value={newPermissions.staff}
                      onChange={(e) =>
                        setNewPermissions({
                          ...newPermissions,
                          staff: e.target.value as ModulePermission,
                        })
                      }
                      className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2.5 py-1.5 font-bold"
                    >
                      <option value="full">ثبت و ویرایش</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">بدون دسترسی</option>
                    </select>
                  </div>

                  {/* Oil Service */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">سرویس روغن و خودرو</span>
                      <span className="text-[10px] text-slate-400">فنی، کیلومتر و تعویض‌ها</span>
                    </div>
                    <select
                      value={newPermissions.oilService}
                      onChange={(e) =>
                        setNewPermissions({
                          ...newPermissions,
                          oilService: e.target.value as ModulePermission,
                        })
                      }
                      className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2.5 py-1.5 font-bold"
                    >
                      <option value="full">ثبت و ویرایش</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">بدون دسترسی</option>
                    </select>
                  </div>

                  {/* Regulations */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">آیین‌نامه انضباطی</span>
                      <span className="text-[10px] text-slate-400">قوانین و چاپ فرم A4</span>
                    </div>
                    <select
                      value={newPermissions.regulations}
                      onChange={(e) =>
                        setNewPermissions({
                          ...newPermissions,
                          regulations: e.target.value as ModulePermission,
                        })
                      }
                      className="bg-slate-800 text-xs text-amber-400 border border-slate-700 rounded-lg px-2.5 py-1.5 font-bold"
                    >
                      <option value="full">ثبت و ویرایش</option>
                      <option value="view">فقط مشاهده</option>
                      <option value="none">بدون دسترسی</option>
                    </select>
                  </div>

                  {/* Backup */}
                  <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">پشتیبان‌گیری دستی</span>
                      <span className="text-[10px] text-slate-400">دانلود و بازیابی فایل JSON</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={newPermissions.backupRestore}
                      onChange={(e) =>
                        setNewPermissions({
                          ...newPermissions,
                          backupRestore: e.target.checked,
                        })
                      }
                      className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* User Management */}
                  <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">مدیریت کاربران</span>
                      <span className="text-[10px] text-slate-400">تعریف و ویرایش دسترسی سایرین</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={newPermissions.userManagement}
                      onChange={(e) =>
                        setNewPermissions({
                          ...newPermissions,
                          userManagement: e.target.checked,
                        })
                      }
                      className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* Network Settings (Locked to Master Admin) */}
                  <div className="p-3 rounded-xl bg-[#080d17] border border-amber-500/20 flex items-center justify-between opacity-80">
                    <div>
                      <span className="text-xs font-bold text-amber-300 block flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>تنظیمات شبکه (LAN)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        منحصر به حساب مدیریت
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      قفل سیستمی
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ایجاد و فعال‌سازی کاربر</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
