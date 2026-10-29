import { FC, useState, useEffect, FormEvent } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Send,
  RefreshCw,
  Clock,
  KeyRound,
  Check,
  Fingerprint,
} from 'lucide-react';
import { AppUser } from '../types/auth';
import { authenticateUser } from '../utils/authService';
import { requestForgotPasswordCode, resetPasswordWithCode } from '../utils/lanSyncService';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginView: FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'email_recovery'>('login');

  // Standard Login State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rate Limiting & Lockout Timer
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Email Password Recovery Flow State
  const [recoveryEmailOrUser, setRecoveryEmailOrUser] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [sentViaSmtp, setSentViaSmtp] = useState<boolean | null>(null);
  const [devCodeFallback, setDevCodeFallback] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password strength calculation
  const passwordStrength = (() => {
    if (!newPassword) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[a-zA-Z]/.test(newPassword) && /[^a-zA-Z0-9]/.test(newPassword)) score += 1;

    if (score <= 1) return { score: 1, label: 'ضعیف (حداقل ۶ کاراکتر)', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'متوسط', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'خوب', color: 'bg-blue-500' };
    return { score: 4, label: 'بسیار قوی', color: 'bg-emerald-500' };
  })();

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const result = await authenticateUser(username, password);
      if (result.success && result.user) {
        setSuccessMsg('احراز هویت با موفقیت انجام شد. در حال بارگذاری سامانه...');
        setTimeout(() => {
          onLoginSuccess(result.user as AppUser);
        }, 300);
      } else {
        if (result.locked && result.retryAfterSeconds) {
          setLockoutSeconds(result.retryAfterSeconds);
        }
        setError(result.error || 'نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch {
      setError('خطا در احراز هویت. لطفاً ارتباط خود را با سرور بررسی نمایید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Request 6-digit recovery code to official registered email
  const handleSendRecoveryCode = async (e: FormEvent) => {
    e.preventDefault();
    if (resendCooldown > 0) return;

    setError(null);
    setSuccessMsg(null);

    const cleanInput = recoveryEmailOrUser.trim();
    if (!cleanInput) {
      setError('لطفاً نشانی ایمیل یا نام کاربری خود را وارد نمایید.');
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await requestForgotPasswordCode(cleanInput);
      if (res.ok) {
        setMaskedEmail(res.maskedEmail || cleanInput);
        setSentViaSmtp(res.sentViaSmtp ?? true);
        setDevCodeFallback(res.devCodeFallback || null);
        setSuccessMsg(
          res.message ||
            `کد تأیید ۶ رقمی امن به نشانی ایمیل ${res.maskedEmail || cleanInput} ارسال گردید. لطفاً صندوق ورودی (Inbox) یا پوشه هرزنامه (Spam) ایمیل خود را بررسی نمایید.`
        );
        setRecoveryStep(2);
        setResendCooldown(60); // 60s cooldown before allowing resend
      } else {
        setError(res.error || 'خطا در ارسال کد بازیابی. لطفاً ورودی را بررسی نمایید.');
      }
    } catch {
      setError('خطا در برقراری ارتباط با سرویس امنیتی سرور.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 2: Verify code and set new password
  const handleResetPasswordWithCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = recoveryCode.trim();
    const cleanPass = newPassword.trim();

    if (!cleanCode) {
      setError('لطفاً کد تأیید ۶ رقمی دریافتی از ایمیل را وارد نمایید.');
      return;
    }
    if (cleanCode.length !== 6) {
      setError('کد تأیید باید دقیقاً ۶ رقم باشد.');
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setError('رمز عبور جدید باید حداقل دارای ۶ کاراکتر باشد.');
      return;
    }
    if (cleanPass !== confirmNewPassword.trim()) {
      setError('رمز عبور جدید با تکرار آن یکسان نمی‌باشد.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const res = await resetPasswordWithCode(recoveryEmailOrUser, cleanCode, cleanPass);
      if (res.ok) {
        setSuccessMsg('رمز عبور شما با موفقیت به‌روزرسانی شد. اکنون می‌توانید با رمز عبور جدید وارد شوید.');
        setUsername(res.username || username || 'admin');
        setPassword('');
        // Switch back to login form after brief confirmation
        setTimeout(() => {
          setActiveTab('login');
          setRecoveryStep(1);
          setRecoveryCode('');
          setNewPassword('');
          setConfirmNewPassword('');
        }, 1500);
      } else {
        setError(res.error || 'کد تأیید وارد شده نادرست یا منقضی شده است.');
      }
    } catch {
      setError('خطا در ثبت رمز عبور جدید در سرور.');
    } finally {
      setIsVerifyingCode(false);
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
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Header Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 p-0.5 shadow-xl shadow-blue-500/20 mb-3 border border-blue-400/30">
              <div className="w-full h-full bg-[#090d18] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>سامانه لجستیک حامی بار</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              درگاه ورود یکپارچه امن، احراز هویت متمرکز و کنترل دسترسی
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#090e1c] p-1 rounded-2xl border border-slate-800 mb-5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ورود امن به سامانه</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('email_recovery');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'email_recovery'
                  ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بازیابی گذرواژه با ایمیل</span>
            </button>
          </div>

          {/* Success Notification */}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Lockout Banner */}
          {lockoutSeconds > 0 && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>دسترسی موقتاً مسدود شد. زمان انتظار:</span>
              </div>
              <span className="font-mono text-sm font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/30">
                {lockoutSeconds} ثانیه
              </span>
            </div>
          )}

          {/* TAB 1: STANDARD SECURE LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                  نام کاربری یا نشانی ایمیل (Username / Email)
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
                    placeholder="1000 یا admin یا hesam.daei@gmail.com"
                    autoFocus
                    required
                    disabled={isSubmitting || lockoutSeconds > 0}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 text-right">
                    گذرواژه (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('email_recovery');
                      setError(null);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer"
                  >
                    گذرواژه را فراموش کرده‌اید؟
                  </button>
                </div>
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
                    disabled={isSubmitting || lockoutSeconds > 0}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition disabled:opacity-50"
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
                disabled={isSubmitting || lockoutSeconds > 0}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 hover:from-blue-500 to-indigo-600 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>درحال بررسی و احراز هویت...</span>
                  </>
                ) : (
                  <>
                    <span>ورود به سیستم</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: REAL EMAIL PASSWORD RECOVERY FLOW */}
          {activeTab === 'email_recovery' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 leading-relaxed flex items-start gap-2.5">
                <Fingerprint className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  فرآیند امن بازیابی گذرواژه: کد یک‌بارمصرف ۶ رقمی به نشانی ایمیل رسمی ثبت‌شده شما در سامانه ارسال خواهد شد.
                </span>
              </div>

              {recoveryStep === 1 ? (
                /* STEP 1: ENTER EMAIL / USERNAME */
                <form onSubmit={handleSendRecoveryCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                      نشانی ایمیل ثبت‌شده یا نام کاربری (Email / Username)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4 text-sky-400" />
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        value={recoveryEmailOrUser}
                        onChange={(e) => setRecoveryEmailOrUser(e.target.value)}
                        placeholder="hesam.daei@gmail.com یا admin"
                        required
                        disabled={isSendingCode}
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-sky-500 font-mono transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingCode || resendCooldown > 0}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 hover:from-sky-500 to-teal-600 hover:to-teal-500 text-white shadow-lg shadow-sky-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingCode ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>درحال ارسال ایمیل حاوی کد تأیید...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ارسال کد تأیید ۶ رقمی به ایمیل</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* STEP 2: ENTER CODE & NEW PASSWORD */
                <form onSubmit={handleResetPasswordWithCode} className="space-y-3.5">
                  {maskedEmail && (
                    <div className="p-3 bg-[#0a1224] rounded-xl border border-sky-500/30 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-slate-400">ارسال شده به: </span>
                        <span className="font-mono text-emerald-300 font-bold">{maskedEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendRecoveryCode}
                        disabled={isSendingCode || resendCooldown > 0}
                        className="text-[11px] text-sky-400 hover:text-sky-300 disabled:text-slate-600 transition cursor-pointer font-medium"
                      >
                        {resendCooldown > 0 ? `ارسال مجدد (${resendCooldown}s)` : 'ارسال مجدد کد'}
                      </button>
                    </div>
                  )}

                  {/* Real SMTP Delivery or LAN Local Mode Notice */}
                  {sentViaSmtp === true ? (
                    <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ایمیل با موفقیت از طریق SMTP ارسال شد. لطفاً Inbox و Spam را چک کنید.</span>
                    </div>
                  ) : sentViaSmtp === false && devCodeFallback ? (
                    <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30 text-xs text-amber-200 space-y-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed text-amber-200/90">
                          تنظیمات SMTP در فایل .env تعریف نشده است. جهت راحتی در سرور محلی، کد امنیتی در کنسول ترمینال و کادر زیر در دسترس است:
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        <span className="font-mono text-amber-300 text-sm font-bold tracking-widest">{devCodeFallback}</span>
                        <button
                          type="button"
                          onClick={() => setRecoveryCode(devCodeFallback)}
                          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded text-[10px] font-bold cursor-pointer transition"
                        >
                          درج خودکار کد
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      کد تأیید ۶ رقمی دریافتی از ایمیل (Verification Code)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={6}
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="______"
                      required
                      autoFocus
                      disabled={isVerifyingCode}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-center font-mono text-xl tracking-[0.5em] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">
                        گذرواژه جدید (New Password)
                      </label>
                      {newPassword && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          قدرت: {passwordStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        dir="ltr"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="حداقل ۶ کاراکتر..."
                        required
                        disabled={isVerifyingCode}
                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password Strength Meter Bar */}
                    {newPassword && (
                      <div className="h-1 w-full bg-slate-800 rounded-full mt-1.5 overflow-hidden flex">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      تکرار گذرواژه جدید (Confirm Password)
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      dir="ltr"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="تکرار رمز جدید..."
                      required
                      disabled={isVerifyingCode}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep(1)}
                      disabled={isVerifyingCode}
                      className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      مرحله قبل
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifyingCode || recoveryCode.length !== 6 || newPassword.length < 6}
                      className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingCode ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>درحال تأیید و تغییر رمز...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>تأیید کد و تغییر رمز عبور</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Security Features & Cryptography Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>اتصال رمزنگاری‌شده سرور با گواهی امنیتی و محافظت ضد Brute-Force</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <KeyRound className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>بازیابی گذرواژه رسمی با کد تأیید رمزنگاری‌شده ارسالی به ایمیل اختصاصی کاربر</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4 text-[11px] text-slate-400">
          <span>حامی بار | سامانه یکپارچه مدیریت ترابری و لجستیک</span>
        </div>
      </div>
    </div>
  );
};
