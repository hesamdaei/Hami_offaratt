import { FC, useState, FormEvent } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { AppUser } from '../types/auth';
import {
  authenticateUser,
  resetMasterAdminCredentials,
  emergencyMasterDirectLogin,
  updateUserPasswordDirectly,
} from '../utils/authService';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginView: FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recovery Accordion / Modal State
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [customNewPass, setCustomNewPass] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const result = await authenticateUser(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user as AppUser);
      } else {
        setError(result.error || 'نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch {
      setError('خطا در احراز هویت. لطفاً مجدداً تلاش نمایید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Emergency Login for Master Admin
  const handleEmergencyDirectLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const safeUser = await emergencyMasterDirectLogin();
      setSuccessMsg('احراز هویت اضطراری مدیر با موفقیت انجام شد. در حال انتقال به پنل...');
      setTimeout(() => {
        onLoginSuccess(safeUser as AppUser);
      }, 350);
    } catch {
      setError('خطا در ورود اضطراری. لطفاً مجدداً تلاش فرمایید.');
      setIsSubmitting(false);
    }
  };

  // Reset to default credentials (hesam1090)
  const handleResetToDefault = async () => {
    setIsResetting(true);
    setError(null);
    try {
      await resetMasterAdminCredentials();
      setUsername('admin');
      setPassword('hesam1090');
      setSuccessMsg('رمز عبور مدیر ارشد با موفقیت به مقدار پیش‌فرض «hesam1090» بازنشانی شد و در فرم درج گردید.');
    } catch {
      setError('خطا در بازنشانی رمز عبور.');
    } finally {
      setIsResetting(false);
    }
  };

  // Set custom new password directly
  const handleSetCustomNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!customNewPass.trim()) return;

    setIsResetting(true);
    setError(null);
    try {
      await updateUserPasswordDirectly('admin', customNewPass.trim());
      setUsername('admin');
      setPassword(customNewPass.trim());
      setSuccessMsg('رمز عبور جدید مدیر ارشد با موفقیت ثبت شد و در کادر رمز درج گردید.');
      setCustomNewPass('');
    } catch {
      setError('خطا در ثبت رمز عبور جدید.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none"
    >
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Header Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-xl shadow-emerald-500/25 mb-3 border border-emerald-400/30">
              <div className="w-full h-full bg-[#090d18] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>سامانه حامی</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              سامانه یکپارچه مدیریت ناوگان، پرسنل و حضور و غیاب
            </p>
          </div>

          {/* Success Notification */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PASSWORD LOGIN FORM */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                نام کاربری ورود (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin یا daei یا hesam"
                  autoFocus
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                رمز عبور (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title={showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 hover:from-amber-400 to-orange-500 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>درحال بررسی و احراز هویت...</span>
              ) : (
                <>
                  <span>ورود به سیستم</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Master Direct Login & Password Reset Tool */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
            {/* Direct Instant Master Access Button */}
            <button
              type="button"
              onClick={handleEmergencyDirectLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm hover:border-emerald-400"
              title="ورود فوری و مستقیم با دسترسی کامل مدیریت ارشد سیستم"
            >
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>ورود مستقیم و فوری با دسترسی مدیر ارشد</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </button>

            {/* Recovery Accordion Toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowRecoveryPanel(!showRecoveryPanel)}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400/90 hover:text-amber-300 font-semibold transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>فراموشی رمز یا بازنشانی گذرواژه مدیر</span>
                {showRecoveryPanel ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Collapsible Recovery Panel */}
            {showRecoveryPanel && (
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/20 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2 text-[11px] text-amber-200/90 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    اگر رمز عبور مدیر ارشد تغییر کرده یا فراموش شده است، می‌توانید آن را به مقدار پیش‌فرض بازگردانید یا رمز جدیدی تعیین نمایید:
                  </span>
                </div>

                {/* Default Credentials Badge */}
                <div className="bg-[#090e1c] border border-slate-800 rounded-xl p-2.5 text-[11px] flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">نام کاربری: </span>
                    <span className="font-mono text-emerald-300 font-bold">admin</span>
                  </div>
                  <div>
                    <span className="text-slate-400">رمز پیش‌فرض: </span>
                    <span className="font-mono text-amber-300 font-bold">hesam1090</span>
                  </div>
                </div>

                {/* Action 1: One-Click Reset to Default */}
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={isResetting}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isResetting ? 'درحال بازنشانی...' : 'بازنشانی رمز مدیر به پیش‌فرض (hesam1090)'}</span>
                </button>

                {/* Action 2: Set Custom New Password Directly */}
                <form onSubmit={handleSetCustomNewPassword} className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="block text-[11px] font-bold text-slate-300">
                    یا تعیین فوری رمز عبور جدید دلخواه:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={customNewPass}
                      onChange={(e) => setCustomNewPass(e.target.value)}
                      placeholder="رمز عبور جدید..."
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isResetting || !customNewPass.trim()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ثبت</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Security Features Footnote */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>سامانه امن حامی با احراز هویت نام کاربری و رمز عبور اختصاصی</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>امکان بازیابی و ورود مستقیم مدیر ارشد همواره محفوظ است</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4 text-[11px] text-slate-400">
          <span>حامی | سامانه مدیریت ناوگان و پرسنل</span>
        </div>
      </div>
    </div>
  );
};
