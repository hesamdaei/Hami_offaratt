import { FC, useState, FormEvent, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Smartphone,
  KeyRound,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { AppUser } from '../types/auth';
import { authenticateUser, authenticateWithBale } from '../utils/authService';
import {
  generateBaleLoginOtp,
  sendBaleBotMessage,
  getBaleBotConfig,
} from '../utils/baleService';
import { toFaDigits } from '../utils/jalaali';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginView: FC<LoginViewProps> = ({ onLoginSuccess }) => {
  // Login Mode: 'PASSWORD' | 'BALE'
  const [loginMode, setLoginMode] = useState<'PASSWORD' | 'BALE'>('PASSWORD');

  // Password Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Bale Login State
  const [balePhone, setBalePhone] = useState('');
  const [baleOtpCode, setBaleOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [baleFeedback, setBaleFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [generatedTestOtp, setGeneratedTestOtp] = useState<string | null>(null);

  // General State
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for Bale OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authenticateUser(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch {
      setError('خطا در احراز هویت. لطفاً مجدداً تلاش نمایید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestBaleOtp = async () => {
    setError(null);
    setBaleFeedback(null);
    const cleanPhone = balePhone.trim();

    if (!cleanPhone || cleanPhone.length < 5) {
      setError('لطفاً شماره تلفن همراه یا شناسه کاربری بله را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    const { code } = generateBaleLoginOtp(cleanPhone);
    setGeneratedTestOtp(code);
    setIsOtpSent(true);
    setOtpCountdown(120);

    // Try sending via Bale Bot if configured
    const botConfig = getBaleBotConfig();
    let sentViaBot = false;
    if (botConfig.botToken && botConfig.isEnabled) {
      const targetChatId = botConfig.channelOrChatId || cleanPhone;
      const botMsg = `سامانه حامی (مدیریت ترابری) 🚛\nکد ورود یکبار مصرف شما در پیام‌رسان بله: ${code}\nاین کد به مدت ۲ دقیقه معتبر می‌باشد.`;
      const botRes = await sendBaleBotMessage(botConfig.botToken, targetChatId, botMsg);
      if (botRes.success) {
        sentViaBot = true;
      }
    }

    setIsSubmitting(false);
    if (sentViaBot) {
      setBaleFeedback({
        type: 'success',
        text: 'کد ورود از طریق ربات بله برای شما ارسال گردید.',
      });
    } else {
      setBaleFeedback({
        type: 'info',
        text: `کد ورود ۵ رقمی بله صادر شد: ${toFaDigits(code)}`,
      });
    }
  };

  const handleBaleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isOtpSent) {
      handleRequestBaleOtp();
      return;
    }

    if (!baleOtpCode.trim()) {
      setError('لطفاً کد ۵ رقمی تأیید بله را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = authenticateWithBale(balePhone, baleOtpCode);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'کد تأیید بله نادرست است یا منقضی شده است.');
      }
      setIsSubmitting(false);
    }, 300);
  };

  const handleQuickBaleDemo = () => {
    setError(null);
    setIsSubmitting(true);
    setTimeout(() => {
      const result = authenticateWithBale('09121111111', '12345');
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      }
      setIsSubmitting(false);
    }, 200);
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
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-xl shadow-emerald-500/25 mb-3 border border-emerald-400/30">
              <div className="w-full h-full bg-[#090d18] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>حامی</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              سامانه یکپارچه مدیریت ناوگان و پرسنل
            </p>
          </div>

          {/* Authentication Mode Switcher (Segmented Control) */}
          <div className="mb-5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 flex gap-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode('PASSWORD');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'PASSWORD'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ورود با رمز عبور</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('BALE');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'BALE'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-black text-white">
                ب
              </div>
              <span>ورود با پیام‌رسان بله</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bale Feedback Notice */}
          {baleFeedback && (
            <div
              className={`mb-4 p-3 rounded-2xl text-xs flex items-center justify-between border ${
                baleFeedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-medium">{baleFeedback.text}</span>
              </div>
              {generatedTestOtp && (
                <button
                  type="button"
                  onClick={() => setBaleOtpCode(generatedTestOtp)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-bold transition"
                  title="درج خودکار کد"
                >
                  درج خودکار
                </button>
              )}
            </div>
          )}

          {/* 1. PASSWORD LOGIN FORM */}
          {loginMode === 'PASSWORD' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                  نام کاربری (Username)
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
                    placeholder="نام کاربری"
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
          )}

          {/* 2. BALE MESSENGER LOGIN FORM */}
          {loginMode === 'BALE' && (
            <form onSubmit={handleBaleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right flex items-center justify-between">
                  <span>شماره موبایل یا شناسه ثبت‌شده در بله</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Bale Auth</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    value={balePhone}
                    onChange={(e) => setBalePhone(e.target.value)}
                    placeholder="مثال: 09123456789"
                    autoFocus
                    required
                    disabled={isOtpSent}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition disabled:opacity-70"
                  />
                </div>
              </div>

              {/* Step 2: OTP Code Input (Visible after requesting) */}
              {isOtpSent && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 text-right">
                      کد تأیید ۵ رقمی دریافتی در بله
                    </label>
                    <span className="text-[11px] font-mono text-amber-400">
                      {otpCountdown > 0 ? `${toFaDigits(otpCountdown)} ثانیه` : 'کد منقضی شد'}
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={5}
                      value={baleOtpCode}
                      onChange={(e) => setBaleOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="• • • • •"
                      autoFocus
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-emerald-500/80 rounded-xl text-slate-100 text-base text-center tracking-widest focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono font-bold transition"
                    />
                  </div>

                  {/* Resend / Edit phone button */}
                  <div className="flex items-center justify-between text-[11px] mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false);
                        setBaleOtpCode('');
                        setGeneratedTestOtp(null);
                      }}
                      className="text-slate-400 hover:text-slate-200 transition"
                    >
                      تغییر شماره
                    </button>
                    {otpCountdown === 0 && (
                      <button
                        type="button"
                        onClick={handleRequestBaleOtp}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>ارسال مجدد کد</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isOtpSent ? (
                <button
                  type="button"
                  onClick={handleRequestBaleOtp}
                  disabled={isSubmitting || !balePhone.trim()}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 hover:from-emerald-500 to-teal-600 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال کد تأیید ورود در بله</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || baleOtpCode.length < 4}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 hover:from-emerald-500 to-teal-600 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>درحال تأیید کد بله...</span>
                  ) : (
                    <>
                      <span>ورود به سامانه با بله</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {/* Quick 1-Click Demo Shortcut */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleQuickBaleDemo}
                  className="text-[11px] text-emerald-400/80 hover:text-emerald-300 font-semibold transition inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>ورود سریع تستی با شناسه بله (دمو)</span>
                </button>
              </div>
            </form>
          )}

          {/* Security Features Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>پشتیبانی کامل از احراز هویت پیام‌رسان بله و رمز عبور</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>ارتباطات و نشست‌ها در بستر شبکه محلی کاملاً امن و رمزگذاری شده است</span>
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
