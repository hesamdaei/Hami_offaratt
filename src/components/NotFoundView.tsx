import React, { FC } from 'react';
import { Compass, Home, ArrowRight, Truck, Users, CalendarDays, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useAppRouter, AppRouteLink } from '../router/RouterContext';

interface NotFoundViewProps {
  attemptedPath?: string;
}

export const NotFoundView: FC<NotFoundViewProps> = ({ attemptedPath }) => {
  const { pathname, navigate, back } = useAppRouter();
  const displayPath = attemptedPath || pathname;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-2xl bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
        {/* Error Badge & Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
          <AlertTriangle className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-xs font-bold border border-slate-700">
            خطای ۴۰۴ | Route Not Found
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            صفحه مورد نظر در سامانه حامی یافت نشد!
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            آدرس درخواست‌شده در سامانه تعریف نشده یا ممکن است ساختار آدرس‌دهی آن تغییر کرده باشد.
          </p>
        </div>

        {/* Display Attempted Path */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 max-w-md mx-auto text-center font-mono text-xs text-rose-400 break-all select-all">
          <span className="text-slate-500 ml-1">مسیر درخواستی:</span>
          {displayPath}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>بازگشت به داشبورد اصلی</span>
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

        {/* Quick Recommended Destinations */}
        <div className="pt-6 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 mb-4 flex items-center justify-center gap-2">
            <Compass className="w-4 h-4 text-blue-400" />
            <span>دسترسی سریع به بخش‌های اصلی سامانه حامی:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-right">
            <AppRouteLink
              to="/attendance"
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 transition group"
            >
              <CalendarDays className="w-4 h-4 text-blue-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-200">حضور و غیاب</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">/attendance</div>
            </AppRouteLink>

            <AppRouteLink
              to="/drivers"
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition group"
            >
              <Users className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-200">رانندگان ناوگان</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">/drivers</div>
            </AppRouteLink>

            <AppRouteLink
              to="/trucks"
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition group"
            >
              <Truck className="w-4 h-4 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-200">ناوگان و خودروها</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">/trucks</div>
            </AppRouteLink>

            <AppRouteLink
              to="/reports"
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 transition group"
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-200">گزارش‌ها</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">/reports</div>
            </AppRouteLink>
          </div>
        </div>
      </div>
    </div>
  );
};
