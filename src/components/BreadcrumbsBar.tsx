import React, { FC } from 'react';
import { ChevronLeft, Home } from 'lucide-react';
import { useAppRouter, AppRouteLink } from '../router/RouterContext';

interface BreadcrumbsBarProps {
  customSubtitle?: string;
}

export const BreadcrumbsBar: FC<BreadcrumbsBarProps> = ({ customSubtitle }) => {
  const { currentRoute, is404, pathname, params } = useAppRouter();

  if (is404) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1.5 px-1 mb-2 font-medium" dir="rtl">
        <AppRouteLink to="/dashboard" className="hover:text-blue-400 transition flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          <span>سامانه حامی</span>
        </AppRouteLink>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-rose-400 font-bold font-mono">خطای ۴۰۴ ({pathname})</span>
      </div>
    );
  }

  if (!currentRoute) return null;

  const breadcrumbs = currentRoute.breadcrumb || [];

  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-xs text-slate-400 py-1 px-1 mb-2 font-medium" dir="rtl" aria-label="Breadcrumb">
      <AppRouteLink to="/dashboard" className="hover:text-blue-400 transition flex items-center gap-1">
        <Home className="w-3.5 h-3.5 text-slate-400" />
      </AppRouteLink>

      {breadcrumbs.map((item, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {isLast && !params.id ? (
              <span className="text-slate-200 font-bold">{item.label}</span>
            ) : item.path ? (
              <AppRouteLink to={item.path} className="hover:text-blue-400 transition">
                {item.label}
              </AppRouteLink>
            ) : (
              <span className="text-slate-300 font-semibold">{item.label}</span>
            )}
          </React.Fragment>
        );
      })}

      {params.id && (
        <>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="text-blue-400 font-bold font-mono bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/40">
            {params.id}
          </span>
        </>
      )}

      {customSubtitle && (
        <span className="text-[11px] text-slate-500 mr-2 border-r border-slate-700 pr-2 hidden md:inline">
          {customSubtitle}
        </span>
      )}
    </nav>
  );
};
