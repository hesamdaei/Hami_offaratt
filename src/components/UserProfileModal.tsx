import { FC, useState, FormEvent } from 'react';
import {
  X,
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  Users,
  Network,
  Database,
  CalendarDays,
  UserCheck,
  Droplet,
  BookOpen,
  LogOut,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
  Check,
  Mail,
  Edit3,
} from 'lucide-react';
import { AppUser, ModulePermission } from '../types/auth';
import { isMasterAdmin, getStoredUsers, saveStoredUsers, saveStoredSession } from '../utils/authService';
import { hashPassword, verifyPassword } from '../utils/securityCrypto';
import { saveServerUsers } from '../utils/lanSyncService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpdateUser: (updatedUser: AppUser) => void;
  onLogout: () => void;
  onOpenUserManagement?: () => void;
  onOpenLanSharing?: () => void;
  onOpenBackup?: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const UserProfileModal: FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout,
  onOpenUserManagement,
  onOpenLanSharing,
  onOpenBackup,
  onShowToast,
}) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Profile Edit State (Username, Full Name, Email)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(currentUser?.fullName || '');
  const [editUsername, setEditUsername] = useState(currentUser?.username || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || (isMasterAdmin(currentUser) ? 'hesam.daei@gmail.com' : ''));
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  if (!isOpen || !currentUser) return null;

  const isMaster = isMasterAdmin(currentUser);

  // Profile Submit Handler
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    const cleanFullName = editFullName.trim();
    const cleanUsername = editUsername.trim().toLowerCase();
    const cleanEmail = editEmail.trim().toLowerCase();

    if (!cleanFullName) {
      setProfileError('لطفاً نام و نام خانوادگی را وارد فرمایید.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 2) {
      setProfileError('نام کاربری باید حداقل دارای ۲ کاراکتر باشد.');
      return;
    }

    const allUsers = getStoredUsers();
    // Check if new username conflicts with another existing user
    const conflict = allUsers.find(
      (u) => u.id !== currentUser.id && u.username.toLowerCase() === cleanUsername
    );
    if (conflict) {
      setProfileError(`نام کاربری «${cleanUsername}» قبلاً توسط کاربر دیگری ثبت شده است.`);
      return;
    }

    setIsSubmittingProfile(true);
    try {
      const updatedUsers = allUsers.map((u) => {
        if (u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()) {
          return {
            ...u,
            fullName: cleanFullName,
            username: cleanUsername,
            email: cleanEmail || u.email || (u.isMasterAdmin ? 'hesam.daei@gmail.com' : undefined),
          };
        }
        return u;
      });

      // 1. Save to local storage
      saveStoredUsers(updatedUsers);

      // 2. Synchronize across LAN network
      await saveServerUsers(updatedUsers);

      // 3. Update active session
      const freshUser: AppUser = {
        ...currentUser,
        fullName: cleanFullName,
        username: cleanUsername,
        email: cleanEmail || currentUser.email || (currentUser.isMasterAdmin ? 'hesam.daei@gmail.com' : undefined),
      };
      saveStoredSession(freshUser);
      onUpdateUser(freshUser);

      setProfileSuccess(true);
      onShowToast('مشخصات و نام کاربری با موفقیت به‌روزرسانی و در شبکه همگام شد.', 'success');

      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSuccess(false);
      }, 1200);
    } catch {
      setProfileError('خطا در ذخیره‌سازی اطلاعات کاربری.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Password Submit Handler
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanOld) {
      setPasswordError('لطفاً رمز عبور فعلی خود را وارد کنید.');
      return;
    }

    if (!cleanNew || cleanNew.length < 3) {
      setPasswordError('رمز عبور جدید باید حداقل دارای ۳ کاراکتر باشد.');
      return;
    }
    if (cleanNew !== confirmPassword.trim()) {
      setPasswordError('رمز عبور جدید با تکرار آن یکسان نمی‌باشد.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const allUsers = getStoredUsers();
      const matchedUser = allUsers.find(
        (u) => u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()
      );

      // Multi-layer old password verification:
      // 1. Master admin fallback passwords
      // 2. Plain password comparison
      // 3. PBKDF2 hash verification
      let isOldValid = false;
      if (isMaster && (cleanOld === 'hesam1090' || cleanOld === 'hesam' || cleanOld === 'admin')) {
        isOldValid = true;
      } else if (matchedUser?.password && cleanOld === matchedUser.password) {
        isOldValid = true;
      } else if (matchedUser?.passwordHash) {
        isOldValid = await verifyPassword(cleanOld, matchedUser.passwordHash);
      } else if (matchedUser?.password) {
        isOldValid = await verifyPassword(cleanOld, matchedUser.password);
      }

      if (!isOldValid) {
        setPasswordError('رمز عبور فعلی وارد شده نادرست است.');
        setIsSubmittingPassword(false);
        return;
      }

      // Hash new password
      const newHash = await hashPassword(cleanNew);

      // Update in stored users
      const updatedUsers = allUsers.map((u) => {
        if (u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()) {
          return {
            ...u,
            password: cleanNew,
            passwordHash: newHash,
          };
        }
        return u;
      });

      // 1. Save to local storage
      saveStoredUsers(updatedUsers);

      // 2. Broadcast and save to central server so it persists on LAN
      await saveServerUsers(updatedUsers);

      // 3. Update session
      const freshUser: AppUser = {
        ...currentUser,
        password: cleanNew,
      };
      saveStoredSession(freshUser);
      onUpdateUser(freshUser);

      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowToast('رمز عبور جدید با موفقیت ثبت و در سرور شبکه همگام‌سازی شد.', 'success');

      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess(false);
      }, 1500);
    } catch {
      setPasswordError('خطا در به‌روزرسانی رمز عبور.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const getPermissionLabel = (perm: ModulePermission) => {
    switch (perm) {
      case 'full':
        return { label: 'دسترسی کامل (ویرایش و ثبت)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'view':
        return { label: 'فقط مشاهده (بدون ویرایش)', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'none':
        return { label: 'فاقد دسترسی (مسدود)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0c1424] border border-[#1e2d48] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL HEADER */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#101b33] via-[#0f192f] to-[#0c1424] border-b border-[#1e2d48] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#0c1424] rounded-[14px] flex items-center justify-center">
                <User className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">ناحیه کاربری و اطلاعات حساب</h2>
                {isMaster ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" />
                    مدیریت سیستم
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {currentUser.roleTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مشاهده مشخصات کاربری، وضعیت دسترسی‌های فعال و تنظیمات حساب
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. MODAL BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* User Profile Card */}
          <div className="bg-[#101b33] border border-[#1e2d48] rounded-2xl p-5 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 flex items-center justify-center text-3xl font-black text-slate-950 shadow-xl shadow-amber-500/20 shrink-0">
                {currentUser.fullName.slice(0, 1)}
              </div>

              {/* Identity Details */}
              <div className="flex-1 text-center sm:text-right space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-black text-white">{currentUser.fullName}</h3>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                    @{currentUser.username}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    حساب فعال و آنلاین
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium">
                  {currentUser.roleTitle}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 pt-2 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>تاریخ عضویت: {currentUser.createdAt}</span>
                  </div>
                  {currentUser.lastLoginAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>آخرین ورود: {new Date(currentUser.lastLoginAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Open User Management if permitted */}
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                {isMaster || currentUser.permissions?.userManagement ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUserManagement?.();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
                  >
                    <Users className="w-4 h-4" />
                    <span>مدیریت کاربران (Admin)</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(!isEditingProfile);
                    setIsChangingPassword(false);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-bold border border-sky-500/30 transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-sky-400" />
                  <span>{isEditingProfile ? 'انصراف از ویرایش' : 'ویرایش نام کاربری و ایمیل'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setIsEditingProfile(false);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>{isChangingPassword ? 'انصراف از تغییر رمز' : 'تغییر رمز عبور من'}</span>
                </button>
              </div>
            </div>

            {/* In-place Profile Editing Form (Username, Full Name, Email) */}
            {isEditingProfile && (
              <form onSubmit={handleProfileSubmit} className="mt-5 pt-5 border-t border-[#1e2d48] space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                    ویرایش مشخصات هویتی، نام کاربری و ایمیل بازیابی
                  </h4>
                  <span className="text-[10px] text-slate-400">ذخیره خودکار در سرور شبکه</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="نام کامل..."
                      className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نام کاربری ورود (Username)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="نام کاربری..."
                      className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-emerald-400" />
                      <span>ایمیل بازیابی رمز عبور</span>
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                {profileError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>اطلاعات کاربری با موفقیت ذخیره و در دیتابیس سرور شبکه همگام شد.</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingProfile}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmittingProfile ? 'درحال ثبت و همگام‌سازی...' : 'ثبت تغییرات و همگام‌سازی در شبکه'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* In-place Password Change Section */}
            {isChangingPassword && (
              <form onSubmit={handlePasswordSubmit} className="mt-5 pt-5 border-t border-[#1e2d48] space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    تغییر رمز عبور حساب کاربری
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'پنهان‌سازی' : 'نمایش رمز'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رمز عبور فعلی</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="رمز فعلی..."
                      className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رمز عبور جدید</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="رمز جدید..."
                      className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">تکرار رمز عبور جدید</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="تکرار رمز جدید..."
                      className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>رمز عبور شما با موفقیت به‌روزرسانی شد.</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    ثبت رمز عبور جدید
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Special Security Notice for Master Admin vs Others */}
          {isMaster ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold text-amber-300 block mb-0.5">اختیارات حساب مدیریتی:</span>
                شما دسترسی کامل به تمامی بخش‌های نرم‌افزار، مدیریت سطوح دسترسی سایر کاربران و تنظیمات شبکه دیتابیس LAN دارید. منوی تنظیمات شبکه محلی و پیام‌رسان منحصراً برای حساب شما نمایش داده می‌شود.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-200/90 leading-relaxed">
                <span className="font-bold text-blue-300 block mb-0.5">سطح دسترسی شما:</span>
                شما به عنوان کاربر اپراتوری/فنی در سامانه ثبت شده‌اید. تغییر در مجوزهای زیر تنها از طریق مدیریت سیستم امکان‌پذیر می‌باشد.
              </div>
            </div>
          )}

          {/* Permissions Matrix */}
          <div>
            <h4 className="text-xs font-black text-slate-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ماتریس دسترسی‌ها و مجوزهای حساب شما:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Attendance */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-200 font-bold">تابلوی حضور و غیاب</span>
                </div>
                {(() => {
                  const perm = isMaster ? 'full' : currentUser.permissions.attendance;
                  const cfg = getPermissionLabel(perm);
                  return (
                    <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>

              {/* Drivers */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-200 font-bold">پرونده رانندگان</span>
                </div>
                {(() => {
                  const perm = isMaster ? 'full' : currentUser.permissions.drivers;
                  const cfg = getPermissionLabel(perm);
                  return (
                    <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>

              {/* Staff */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-200 font-bold">پرونده پرسنل</span>
                </div>
                {(() => {
                  const perm = isMaster ? 'full' : currentUser.permissions.staff;
                  const cfg = getPermissionLabel(perm);
                  return (
                    <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>

              {/* Oil Service */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-200 font-bold">مدیریت تعویض روغن</span>
                </div>
                {(() => {
                  const perm = isMaster ? 'full' : currentUser.permissions.oilService;
                  const cfg = getPermissionLabel(perm);
                  return (
                    <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>

              {/* Regulations */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200 font-bold">آیین‌نامه انضباطی</span>
                </div>
                {(() => {
                  const perm = isMaster ? 'full' : currentUser.permissions.regulations;
                  const cfg = getPermissionLabel(perm);
                  return (
                    <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>

              {/* Backup & Restore */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200 font-bold">پشتیبان‌گیری و بازیابی</span>
                </div>
                {isMaster || currentUser.permissions.backupRestore ? (
                  <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                    مجاز (کامل)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold text-rose-400 bg-rose-500/10 border-rose-500/30">
                    غیرمجاز
                  </span>
                )}
              </div>

              {/* User Management */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-slate-200 font-bold">مدیریت کاربران و دسترسی‌ها</span>
                </div>
                {isMaster || currentUser.permissions.userManagement ? (
                  <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                    مجاز (تعریف کاربر و دسترسی)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold text-rose-400 bg-rose-500/10 border-rose-500/30">
                    مسدود (نیازمند مجوز مدیریت)
                  </span>
                )}
              </div>

              {/* LAN Network Settings */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200 font-bold">تنظیمات شبکه و دیتابیس LAN</span>
                </div>
                {isMaster ? (
                  <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-1">
                    <Unlock className="w-3 h-3 text-emerald-400" />
                    منحصراً مجاز برای مدیر ارشد
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg border text-[11px] font-bold text-slate-400 bg-slate-800/80 border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    محدود به مدیریت ارشد سیستم
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Hub Links if permitted */}
          <div className="pt-2 border-t border-[#1e2d48] flex flex-wrap gap-2">
            {isMaster && onOpenLanSharing && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLanSharing();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
              >
                <Network className="w-3.5 h-3.5 text-emerald-400" />
                <span>تنظیمات شبکه دیتابیس LAN</span>
              </button>
            )}

            {(isMaster || currentUser.permissions.backupRestore) && onOpenBackup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackup();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-500/30 text-xs font-bold transition"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>پشتیبان‌گیری دستی (JSON)</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. MODAL FOOTER */}
        <div className="px-6 py-4 bg-[#0a0f1d] border-t border-[#1e2d48] flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج از حساب کاربری</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
