import React, { FC } from 'react';
import { ShieldAlert, Home, ArrowRight, Lock, UserCheck } from 'lucide-react';
import { useAppRouter } from '../router/RouterContext';
import { AppUser } from '../types/auth';

interface AccessDeniedViewProps {
  currentUser?: AppUser | null;
  requiredRoleName?: string;
}

export const AccessDeniedView: FC<AccessDeniedViewProps> = ({
  currentUser,
  requiredRoleName = 'مدیر ارشد سامانه',
}) => {
  const { pathname, navigate, back } = useAppRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-xl bg-[#0f172a]/95 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
        {/* Red Shield Lock Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-2">
          <ShieldAlert className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 font-mono text-xs font-bold border border-rose-500/30">
            خطای ۴۰۳ | Access Forbidden
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            دسترسی به این بخش محدود شده است
          </h1>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            نقش یا سطح دسترسی حساب کاربری شما اجازه ورود مستقیم به مسیر{' '}
            <span className="font-mono text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900/60">
              {pathname}
            </span>{' '}
            را نمی‌دهد.
          </p>
        </div>

        {/* Current User Role vs Required Role */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-right">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-400">کاربر جاری:</span>
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              {currentUser?.fullName || currentUser?.username || 'کاربر سیستم'}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-400">سمت / نقش ثبت‌شده:</span>
            <span className="font-bold text-amber-400">
              {currentUser?.roleTitle || (currentUser?.isMasterAdmin ? 'مدیریت ارشد سیستم' : 'کاربر عادی')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400">مجوز الزامی برای این مسیر:</span>
            <span className="font-bold text-rose-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {requiredRoleName}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>انتقال به داشبورد مجاز</span>
          </button>

          <button
            type="button"
            onClick={back}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>یک مرحله بازگشت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
