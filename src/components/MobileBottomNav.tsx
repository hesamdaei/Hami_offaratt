import { FC } from 'react';
import { CalendarCheck, Truck, Users, Droplet, Menu, Shield } from 'lucide-react';
import { ActiveAppTab } from './Header';
import { toFaDigits } from '../utils/jalaali';
import { AppUser } from '../types/auth';
import { isMasterAdmin } from '../utils/authService';

interface MobileBottomNavProps {
  activeTab: ActiveAppTab;
  onTabChange: (tab: ActiveAppTab) => void;
  onOpenMobileMenu: () => void;
  unreadNotificationsCount?: number;
  currentUser?: AppUser | null;
}

export const MobileBottomNav: FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenMobileMenu,
  unreadNotificationsCount = 0,
  currentUser,
}) => {
  const isMaster = isMasterAdmin(currentUser);

  const navItems = [
    {
      id: 'ATTENDANCE' as ActiveAppTab,
      label: 'حضور و غیاب',
      icon: CalendarCheck,
    },
    {
      id: 'DRIVERS' as ActiveAppTab,
      label: 'رانندگان',
      icon: Truck,
    },
    {
      id: 'STAFF' as ActiveAppTab,
      label: 'پرسنل',
      icon: Users,
    },
    {
      id: 'OIL_SERVICE' as ActiveAppTab,
      label: 'روغن و خودرو',
      icon: Droplet,
    },
  ];

  return (
    <nav
      dir="rtl"
      aria-label="ناوبری سریع موبایل"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#0c1426]/95 backdrop-blur-lg border-t border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] px-1.5 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 relative cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-amber-400 stroke-[2.5]' : 'stroke-[1.8]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                )}
              </div>
              <span className={`text-[10px] mt-1 truncate max-w-full leading-tight font-medium ${
                isActive ? 'text-amber-300 font-bold' : ''
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th button: Menu & Settings Drawer trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 relative cursor-pointer active:scale-95 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          title="منوی جامع، اعلان‌ها و تنظیمات"
        >
          <div className="relative">
            {isMaster ? (
              <Shield className="w-5 h-5 stroke-[1.8] text-amber-400" />
            ) : (
              <Menu className="w-5 h-5 stroke-[1.8]" />
            )}
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                {toFaDigits(unreadNotificationsCount)}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 truncate max-w-full leading-tight font-medium text-slate-300">
            {isMaster ? 'مدیریت' : 'منو'}
          </span>
        </button>
      </div>
    </nav>
  );
};
