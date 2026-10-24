import React, { FC, useState, useMemo } from 'react';
import {
  Navigation,
  Truck,
  Radio,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  CargoTrackingItem,
  loadAllCargoTrackings,
  getCargoTracking,
  MILESTONE_CONFIG,
  TrackingMilestone,
  generateCustomerShareUrl,
  generateDriverPortalUrl,
} from '../utils/cargoTrackingService';
import { OrderItem } from '../utils/ordersData';
import { CargoTrackingCustomerPortal } from './CargoTrackingCustomerPortal';
import { CargoTrackingDriverPortal } from './CargoTrackingDriverPortal';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';

interface CargoTrackingHubViewProps {
  orders?: OrderItem[];
  initialOrderNumber?: string;
  initialMode?: 'CUSTOMER' | 'DRIVER' | 'OVERVIEW';
  onNavigateToOrders?: () => void;
}

export const CargoTrackingHubView: FC<CargoTrackingHubViewProps> = ({
  orders,
  initialOrderNumber = 'ORD-1403/9201',
  initialMode = 'CUSTOMER',
  onNavigateToOrders,
}) => {
  const [activeMode, setActiveMode] = useState<'CUSTOMER' | 'DRIVER' | 'OVERVIEW'>(initialMode);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>(initialOrderNumber);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TrackingMilestone>('ALL');
  const [copiedOrder, setCopiedOrder] = useState<string | null>(null);

  const allTrackings = useMemo(() => {
    const raw = loadAllCargoTrackings(orders);
    return Object.values(raw);
  }, [orders]);

  const filteredTrackings = useMemo(() => {
    return allTrackings.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.orderNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.includes(q) ||
        item.driverName.toLowerCase().includes(q) ||
        item.vehiclePlate.includes(q) ||
        item.origin.address.toLowerCase().includes(q) ||
        item.destination.address.toLowerCase().includes(q)
      );
    });
  }, [allTrackings, statusFilter, searchQuery]);

  const handleCopyLink = (orderNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateCustomerShareUrl(orderNo);
    navigator.clipboard.writeText(url);
    setCopiedOrder(orderNo);
    setTimeout(() => setCopiedOrder(null), 2000);
  };

  const handleOpenNewTab = (orderNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`?track=${encodeURIComponent(orderNo)}`, '_blank');
  };

  const counts = useMemo(() => {
    const total = allTrackings.length;
    const inTransit = allTrackings.filter((t) => t.status === 'IN_TRANSIT').length;
    const loading = allTrackings.filter((t) => t.status === 'LOADING').length;
    const delivered = allTrackings.filter((t) => t.status === 'DELIVERED').length;
    return { total, inTransit, loading, delivered };
  }, [allTrackings]);

  return (
    <div className="space-y-4 font-sans text-slate-100" dir="rtl">
      {/* Top Banner and Navigation Bar */}
      <div className="bg-[#101b33] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">سامانه پیگیری زنده موقعیت بار (GPS Cargo Tracking)</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                قابلیت جدید
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              اشتراک‌گذاری لحظه‌ای لوکیشن توسط راننده و رهگیری آنلاین مسیر، زمان رسیدن و مشخصات بار توسط مشتری
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-[#0a1122] p-1.5 rounded-xl border border-slate-800 self-stretch md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveMode('CUSTOMER')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeMode === 'CUSTOMER'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>نمای رهگیری مشتری</span>
          </button>

          <button
            onClick={() => setActiveMode('DRIVER')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeMode === 'DRIVER'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>پنل فرستنده راننده (GPS)</span>
          </button>

          <button
            onClick={() => setActiveMode('OVERVIEW')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeMode === 'OVERVIEW'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>فهرست تمام بارها ({toFaDigits(allTrackings.length)})</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Customer View */}
      {activeMode === 'CUSTOMER' && (
        <CargoTrackingCustomerPortal
          orderNumber={selectedOrderNo}
          isStandalone={false}
          onOpenDriverPortal={(ordNo) => {
            setSelectedOrderNo(ordNo);
            setActiveMode('DRIVER');
          }}
        />
      )}

      {/* Mode 2: Driver Portal View */}
      {activeMode === 'DRIVER' && (
        <CargoTrackingDriverPortal
          orderNumber={selectedOrderNo}
          isStandalone={false}
          onOpenCustomerView={(ordNo) => {
            setSelectedOrderNo(ordNo);
            setActiveMode('CUSTOMER');
          }}
        />
      )}

      {/* Mode 3: Overview Grid of All Shipments */}
      {activeMode === 'OVERVIEW' && (
        <div className="space-y-4">
          {/* KPI Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() => setStatusFilter('ALL')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                statusFilter === 'ALL'
                  ? 'bg-cyan-600/15 border-cyan-500/40 ring-1 ring-cyan-500/30'
                  : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400">کل محموله‌های فعال</div>
              <div className="text-xl font-black text-white font-mono mt-1">
                {toFaDigits(counts.total)} مرسوله
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('IN_TRANSIT')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                statusFilter === 'IN_TRANSIT'
                  ? 'bg-cyan-600/15 border-cyan-500/40 ring-1 ring-cyan-500/30'
                  : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-cyan-400">در حال حمل (در مسیر)</div>
              <div className="text-xl font-black text-cyan-300 font-mono mt-1">
                {toFaDigits(counts.inTransit)} ناوگان
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('LOADING')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                statusFilter === 'LOADING'
                  ? 'bg-amber-600/15 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-amber-400">در حال بارگیری در مبدأ</div>
              <div className="text-xl font-black text-amber-300 font-mono mt-1">
                {toFaDigits(counts.loading)} بارنامه
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('DELIVERED')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                statusFilter === 'DELIVERED'
                  ? 'bg-emerald-600/15 border-emerald-500/40 ring-1 ring-emerald-500/30'
                  : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-emerald-400">تحویل قطعی شده</div>
              <div className="text-xl font-black text-emerald-300 font-mono mt-1">
                {toFaDigits(counts.delivered)} سفر
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 bg-[#0f172a] border border-slate-800 rounded-2xl p-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس شماره سفارش، نام مشتری، راننده، شماره پلاک یا مقصد..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Grid of Cargo Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrackings.map((item) => {
              const conf = MILESTONE_CONFIG[item.status];
              return (
                <div
                  key={item.orderNumber}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-black text-white font-mono">
                          {item.orderNumber}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {item.customerName} ({item.customerCompany || 'شخصی'})
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-black px-2.5 py-1 rounded-xl border ${conf.badgeBg} ${conf.badgeText} ${conf.badgeBorder}`}
                      >
                        {conf.label}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>پیشرفت مأموریت:</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {toFaDigits(item.progressPercent)}٪
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Route addresses */}
                    <div className="text-xs space-y-1.5 pt-1">
                      <div className="flex items-center gap-2 text-slate-300 truncate">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                        <span className="text-[11px] text-slate-400">مبدأ:</span>
                        <span className="truncate">{item.origin.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300 truncate">
                        <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                        <span className="text-[11px] text-slate-400">مقصد:</span>
                        <span className="truncate">{item.destination.name}</span>
                      </div>
                    </div>

                    {/* Driver & Plate */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="text-xs">
                        <div className="font-bold text-white">{item.driverName}</div>
                        <div className="text-[10px] text-slate-400">{item.vehicleType}</div>
                      </div>
                      <IranianPlate plateNumber={item.vehiclePlate} size="xs" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrderNo(item.orderNumber);
                        setActiveMode('CUSTOMER');
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>مشاهده زنده</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedOrderNo(item.orderNumber);
                        setActiveMode('DRIVER');
                      }}
                      className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
                      title="ورود به پنل راننده"
                    >
                      <Radio className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleCopyLink(item.orderNumber, e)}
                      className={`p-2 rounded-xl text-xs border transition ${
                        copiedOrder === item.orderNumber
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title="کپی لینک اختصاصی مشتری"
                    >
                      {copiedOrder === item.orderNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={(e) => handleOpenNewTab(item.orderNumber, e)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                      title="باز کردن صفحه مشتری در پنجره جدید"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
