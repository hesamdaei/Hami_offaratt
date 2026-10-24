import { FC, useState, useMemo, MouseEvent } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  CalendarDays,
  Droplet,
  AlertTriangle,
  Info,
  CheckCircle2,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AppNotification, NotificationCategory } from '../types/notification';
import { playNotificationSound, saveReadNotificationIds } from '../utils/notificationService';
import { ActiveAppTab } from './Header';
import { toFaDigits } from '../utils/jalaali';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNotificationsChange: (updated: AppNotification[]) => void;
  onNavigateTab?: (tab: ActiveAppTab, notif?: AppNotification) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const NotificationPopover: FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationsChange,
  onNavigateTab,
  onShowToast,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | NotificationCategory>('ALL');
  const [isMuted, setIsMuted] = useState(false);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'ALL') return notifications;
    return notifications.filter((n) => n.category === selectedFilter);
  }, [notifications, selectedFilter]);

  if (!isOpen) return null;

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    onNotificationsChange(updated);
    const readIds = new Set<string>(updated.map((n) => n.id));
    saveReadNotificationIds(readIds);
    onShowToast?.('تمامی اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند.', 'info');
  };

  const handleClearAll = () => {
    onNotificationsChange([]);
    onShowToast?.('لیست اعلان‌ها پاک‌سازی گردید.', 'info');
  };

  const handleToggleRead = (id: string, e?: MouseEvent) => {
    e?.stopPropagation();
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: !n.read } : n));
    onNotificationsChange(updated);
    const readIds = new Set<string>(updated.filter((n) => n.read).map((n) => n.id));
    saveReadNotificationIds(readIds);
  };

  const handleDeleteItem = (id: string, e?: MouseEvent) => {
    e?.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    onNotificationsChange(updated);
  };

  const handleActionClick = (notif: AppNotification) => {
    // Mark as read
    if (!notif.read) {
      handleToggleRead(notif.id);
    }
    // Navigate tab
    if (notif.actionTab && onNavigateTab) {
      onNavigateTab(notif.actionTab, notif);
      onClose();
    }
  };

  const handlePlayTestSound = () => {
    if (!isMuted) {
      playNotificationSound();
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 bg-black/60 sm:bg-black/40 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[460px] bg-[#0c1424] border-0 sm:border border-[#1e2d48] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[85vh] sm:mt-14 sm:mr-4 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#101b33] via-[#0f192f] to-[#0c1424] border-b border-[#1e2d48] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">مرکز اعلان‌ها و یادآوری‌ها</h3>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                    {toFaDigits(unreadCount)} جدید
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                    خوانده شده
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                هشدارهای عملیاتی، ترابری و یادآوری‌های روزانه سامانه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (!nextMuted) playNotificationSound();
              }}
              className={`p-2 rounded-xl transition ${
                isMuted ? 'text-slate-500 hover:text-slate-300' : 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
              }`}
              title={isMuted ? 'صدای اعلان غیرفعال است (برای فعال‌سازی کلیک کنید)' : 'پخش صدای اعلان فعال است'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. FILTER TABS & BULK ACTIONS */}
        <div className="px-4 py-2 bg-[#090f1d] border-b border-[#18263e] flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              همه ({toFaDigits(notifications.length)})
            </button>
            <button
              onClick={() => setSelectedFilter('attendance')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'attendance'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              حضور و غیاب
            </button>
            <button
              onClick={() => setSelectedFilter('oil_service')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'oil_service'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              سرویس روغن
            </button>
            <button
              onClick={() => setSelectedFilter('fleet')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'fleet'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              بیمه و ناوگان
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition"
                title="علامت‌گذاری همه به عنوان خوانده شده"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خواندن همه</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-slate-400 hover:text-rose-400 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition"
                title="پاک کردن تمامی اعلان‌ها"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3. NOTIFICATION LIST (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-slate-800/60 flex items-center justify-center mb-3 text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">هیچ اعلان جدیدی وجود ندارد</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                همه کارها و هشدارهای سیستم در وضعیت مطلوب قرار دارند.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleActionClick(notif)}
                  className={`relative p-3.5 rounded-2xl border transition group cursor-pointer ${
                    isUnread
                      ? 'bg-[#101c36] hover:bg-[#142344] border-blue-500/40 shadow-md'
                      : 'bg-[#0e1628]/80 hover:bg-[#131d33] border-slate-800/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon according to type */}
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'warning' && (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === 'alert' && (
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === 'success' && (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === 'info' && (
                        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <Info className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4
                            className={`text-xs font-black truncate ${
                              isUnread ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                          )}
                        </div>

                        {notif.badge && (
                          <span className="px-2 py-0.2 rounded-md bg-slate-800 text-[10px] font-mono font-bold text-amber-300 border border-slate-700 shrink-0">
                            {notif.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                        <span>{notif.timestamp}</span>

                        <div className="flex items-center gap-2">
                          {notif.actionLabel && (
                            <span className="text-amber-400 font-bold flex items-center gap-1 group-hover:underline">
                              <span>{notif.actionLabel}</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(notif.id, e)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                            title="حذف این اعلان"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. FOOTER */}
        <div className="p-3 bg-[#0a0f1d] border-t border-[#1e2d48] flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={handlePlayTestSound}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-300 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>تست صدای زنگ</span>
          </button>

          <span className="text-[11px] font-mono">
            سیستم اعلان‌های هوشمند حامی
          </span>
        </div>
      </div>
    </div>
  );
};
