/**
 * سامانه لجستیک و ترابری «حامی» - نسخه Beta 1.1786.1
 * ارائه‌دهنده زمینه مسیریابی کلاینت و هوک سراسری (App Router Context)
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, FC, ReactNode, AnchorHTMLAttributes } from 'react';
import { RouteConfig, MatchedRouteResult, matchAppRoute, canUserAccessRoute } from './routes';
import { AppUser } from '../types/auth';

interface AppRouterContextType {
  pathname: string;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  currentRoute: RouteConfig | null;
  is404: boolean;
  canAccess: boolean;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
  back: () => void;
  forward: () => void;
}

const AppRouterContext = createContext<AppRouterContextType | null>(null);

interface AppRouterProviderProps {
  children: ReactNode;
  currentUser?: AppUser | null;
}

export const AppRouterProvider: FC<AppRouterProviderProps> = ({ children, currentUser }) => {
  // دریافت مسیر اولیه از window.location
  const getInitialPathname = () => {
    if (typeof window === 'undefined') return '/dashboard';
    const path = window.location.pathname || '/';
    return path === '/' ? '/dashboard' : path;
  };

  const [pathname, setPathname] = useState<string>(getInitialPathname);
  const [searchStr, setSearchStr] = useState<string>(() => (typeof window !== 'undefined' ? window.location.search : ''));

  // تحلیل مسیر و استخراج پارامترها
  const matchResult: MatchedRouteResult = useMemo(() => {
    return matchAppRoute(pathname);
  }, [pathname]);

  const searchParams = useMemo(() => {
    return new URLSearchParams(searchStr);
  }, [searchStr]);

  // بررسی دسترسی کاربر جاری به مسیر
  const canAccess = useMemo(() => {
    if (matchResult.is404 || !matchResult.route) return true; // ۴۰۴ به عنوان نقض دسترسی شمرده نمی‌شود، صفحه ۴۰۴ نشان داده می‌شود
    return canUserAccessRoute(currentUser, matchResult.route);
  }, [currentUser, matchResult]);

  // همگام‌سازی عنوان مرورگر (document.title)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (matchResult.is404) {
        document.title = 'حامی | ۴۰۴ - صفحه یافت نشد';
      } else if (matchResult.route?.browserTitle) {
        document.title = matchResult.route.browserTitle;
      } else {
        document.title = 'حامی - سامانه مدیریت ناوگان و ترابری';
      }
    }
  }, [matchResult]);

  // متد هدایت به مسیر جدید با HTML5 History API
  const navigate = useCallback((to: string, options?: { replace?: boolean; state?: any }) => {
    if (typeof window === 'undefined') return;

    // تجزیه URL ورودی به مسیر و کوئری
    const [pathPart, queryPart] = to.split('?');
    const targetPath = pathPart || '/dashboard';
    const targetQuery = queryPart ? `?${queryPart}` : '';
    const fullUrl = `${targetPath}${targetQuery}`;

    if (options?.replace) {
      window.history.replaceState(options.state || null, '', fullUrl);
    } else {
      window.history.pushState(options.state || null, '', fullUrl);
    }

    setPathname(targetPath);
    setSearchStr(targetQuery);

    // اسکرول نرم به بالای صفحه
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const back = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  const forward = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }, []);

  // شنود رویداد popstate برای دکمه‌های بازگشت (Back) و جلو (Forward) مرورگر
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const currentLocPath = window.location.pathname || '/';
      setPathname(currentLocPath === '/' ? '/dashboard' : currentLocPath);
      setSearchStr(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // رهگیری کلیک روی تگ‌های استاندارد <a> داخلی برای SPA navigation روان
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAnchorClick = (e: MouseEvent) => {
      // فقط کلیک چپ بدون کلیدهای ترکیبی (Ctrl, Shift, Meta) را اینترسپت کن
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) {
        return;
      }

      const target = (e.target as HTMLElement)?.closest('a');
      if (!target || !target.href) return;

      // بررسی اینکه آدرس مربوط به دامنه جاری است یا خیر
      const url = new URL(target.href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      // اگر برای دانلود، پروتکل خاص یا تارگت جدید (_blank) باشد اجازه بده رفتار پیش‌فرض انجام شود
      if (target.hasAttribute('download') || target.target === '_blank' || target.getAttribute('rel')?.includes('external')) {
        return;
      }

      // هدایت داخلی به روش SPA
      e.preventDefault();
      const relativeUrl = `${url.pathname}${url.search}${url.hash}`;
      navigate(relativeUrl);
    };

    document.addEventListener('click', handleAnchorClick);
    return () => {
      document.removeEventListener('click', handleAnchorClick);
    };
  }, [navigate]);

  const value = useMemo(
    () => ({
      pathname,
      params: matchResult.params,
      searchParams,
      currentRoute: matchResult.route,
      is404: matchResult.is404,
      canAccess,
      navigate,
      back,
      forward,
    }),
    [pathname, matchResult, searchParams, canAccess, navigate, back, forward]
  );

  return <AppRouterContext.Provider value={value}>{children}</AppRouterContext.Provider>;
};

/**
 * هوک رسمی استفاده از روتر در تمام کامپوننت‌های سامانه
 */
export function useAppRouter(): AppRouterContextType {
  const context = useContext(AppRouterContext);
  if (!context) {
    throw new Error('useAppRouter must be used within an AppRouterProvider');
  }
  return context;
}

/**
 * کامپوننت لینک استاندارد و بهینه‌شده برای SPA
 */
export interface AppRouteLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  activeClassName?: string;
  exact?: boolean;
}

export const AppRouteLink: FC<AppRouteLinkProps> = ({
  to,
  children,
  className = '',
  activeClassName = '',
  exact = false,
  ...props
}) => {
  const { pathname, navigate } = useAppRouter();

  const isActive = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (props.onClick) {
      props.onClick(e);
    }
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigate(to);
    }
  };

  const combinedClasses = `${className} ${isActive ? activeClassName : ''}`.trim();

  return (
    <a href={to} className={combinedClasses} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};
