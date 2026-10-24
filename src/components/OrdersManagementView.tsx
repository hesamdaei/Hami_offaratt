import { FC, useState, useMemo } from 'react';
import {
  OrderItem,
  OrderStatus,
  WaybillDetails,
  InvoiceDetails,
  ORDER_STATUS_CONFIG,
} from '../utils/ordersData';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { CreateOrderModal } from './CreateOrderModal';
import { ConvertToWaybillOrInvoiceModal } from './ConvertToWaybillOrInvoiceModal';
import { WaybillPrintModal } from './WaybillPrintModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { CargoTrackingModal } from './CargoTrackingModal';
import {
  PackagePlus,
  Search,
  SlidersHorizontal,
  Kanban,
  Table as TableIcon,
  FileSpreadsheet,
  FileText,
  Receipt,
  Printer,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  Building,
  User,
  Phone,
  DollarSign,
  Layers,
  Globe,
  Trash2,
  Edit3,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  Navigation,
  Radio,
} from 'lucide-react';

interface OrdersManagementViewProps {
  orders: OrderItem[];
  onAddOrder: (order: OrderItem) => void;
  onUpdateOrder: (order: OrderItem) => void;
  onDeleteOrder: (orderId: string) => void;
  vehicles: VehicleItem[];
  drivers: DriverDirectoryItem[];
}

export const OrdersManagementView: FC<OrdersManagementViewProps> = ({
  orders,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  vehicles,
  drivers,
}) => {
  const today = getTodayJalaali();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeViewMode, setActiveViewMode] = useState<'KANBAN' | 'TABLE' | 'DOCS'>('KANBAN');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialMode, setCreateModalInitialMode] = useState<'MANUAL' | 'ONLINE_PORTAL'>('MANUAL');
  
  // Selected order for conversion or printing
  const [convertingOrder, setConvertingOrder] = useState<OrderItem | null>(null);
  const [printingWaybillOrder, setPrintingWaybillOrder] = useState<OrderItem | null>(null);
  const [printingInvoiceOrder, setPrintingInvoiceOrder] = useState<OrderItem | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<OrderItem | null>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      const matchSearch =
        searchQuery === '' ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerCompany && order.customerCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        order.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.destinationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.cargoDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.assignedDriverName && order.assignedDriverName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchStatus =
        statusFilter === 'ALL' || order.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    let coordination = 0;
    let normal = 0;
    let inProgress = 0;
    let completed = 0;
    let waybillsCount = 0;
    let invoicesCount = 0;

    orders.forEach((o) => {
      if (o.status === 'COORDINATION') coordination++;
      if (o.status === 'NORMAL') normal++;
      if (o.status === 'IN_PROGRESS') inProgress++;
      if (o.status === 'COMPLETED') completed++;
      if (o.waybill) waybillsCount++;
      if (o.invoice) invoicesCount++;
    });

    return {
      total: orders.length,
      coordination,
      normal,
      inProgress,
      completed,
      waybillsCount,
      invoicesCount,
    };
  }, [orders]);

  // Handle direct status transition
  const handleQuickStatusChange = (order: OrderItem, newStatus: OrderStatus) => {
    const updated: OrderItem = {
      ...order,
      status: newStatus,
      completionDate:
        newStatus === 'COMPLETED' && !order.completionDate
          ? `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`
          : order.completionDate,
    };
    onUpdateOrder(updated);

    // If moved to completed, automatically prompt for Waybill / Invoice issuance
    if (newStatus === 'COMPLETED' && !order.waybill && !order.invoice) {
      setConvertingOrder(updated);
    }
  };

  // Handle saving conversion
  const handleSaveConversion = (
    orderId: string,
    waybillData?: WaybillDetails,
    invoiceData?: InvoiceDetails
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const updated: OrderItem = {
      ...targetOrder,
      waybill: waybillData || targetOrder.waybill,
      invoice: invoiceData || targetOrder.invoice,
      assignedDriverName: waybillData?.driverName || targetOrder.assignedDriverName,
      assignedVehiclePlate: waybillData?.vehiclePlate || targetOrder.assignedVehiclePlate,
      assignedVehicleCode: waybillData?.vehicleCode || targetOrder.assignedVehicleCode,
    };

    onUpdateOrder(updated);
    setConvertingOrder(null);
  };

  // Export orders to CSV
  const handleExportCSV = () => {
    const headers = [
      'شماره سفارش',
      'مشتری',
      'شرکت',
      'تلفن',
      'مبدأ',
      'مقصد',
      'شرح بار',
      'وزن (تن)',
      'نوع خودرو',
      'کرایه (ریال)',
      'وضعیت',
      'راننده',
      'شماره بارنامه',
      'شماره صورتحساب',
    ];

    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.customerCompany || '-',
      o.customerPhone,
      o.originCity,
      o.destinationCity,
      o.cargoDescription,
      o.cargoWeightTon,
      o.requestedVehicleType,
      o.estimatedFareRial,
      ORDER_STATUS_CONFIG[o.status]?.label || o.status,
      o.assignedDriverName || '-',
      o.waybill?.waybillNumber || '-',
      o.invoice?.invoiceNumber || '-',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hamibar_orders_${today.jy}_${today.jm}_${today.jd}.csv`;
    link.click();
  };

  const formatRial = (val?: number) => {
    if (!val) return '۰';
    return toFaDigits(val.toLocaleString('fa-IR'));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 select-none">
      
      {/* 1. Header & Live Metric Strip */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 shadow-sm space-y-3">
        {/* Top title and main actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">مدیریت سفارشات و صدور بارنامه و صورتحساب</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  لجستیک هوشمند
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ثبت دستی دیسپچر، آماده‌سازی برای ثبت آنلاین مشتری و تبدیل سفارشات تکمیل‌شده به بارنامه و فاکتور مالی
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Simulation Online Customer Order Button */}
            <button
              onClick={() => {
                setCreateModalInitialMode('ONLINE_PORTAL');
                setIsCreateModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 transition flex items-center gap-1.5 shadow-xs"
              title="پیش‌نمایش فرم درگاه ثبت آنلاین مشتری"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>+ درگاه آنلاین مشتری</span>
            </button>

            {/* Manual Order Button */}
            <button
              onClick={() => {
                setCreateModalInitialMode('MANUAL');
                setIsCreateModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ ثبت سفارش جدید</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#18263e] hover:bg-[#203150] text-emerald-300 border border-emerald-800/40 transition flex items-center gap-1.5 shadow-xs"
              title="خروجی فایل اکسل سفارشات"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">اکسل</span>
            </button>
          </div>
        </div>

        {/* Live Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-[#1f2c45]">
          {/* Total */}
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-950/60 border-blue-500/50 text-white'
                : 'bg-[#142036] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 mb-0.5">کل سفارشات</div>
            <div className="text-lg font-black font-mono text-white">{toFaDigits(stats.total)}</div>
          </div>

          {/* Coordination */}
          <div
            onClick={() => setStatusFilter('COORDINATION')}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'COORDINATION'
                ? 'bg-amber-950/60 border-amber-500/50 text-white'
                : 'bg-[#142036] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-amber-400 mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>موکول به هماهنگی</span>
            </div>
            <div className="text-lg font-black font-mono text-amber-400">{toFaDigits(stats.coordination)}</div>
          </div>

          {/* Normal */}
          <div
            onClick={() => setStatusFilter('NORMAL')}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'NORMAL'
                ? 'bg-blue-950/60 border-blue-500/50 text-white'
                : 'bg-[#142036] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-blue-400 mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>عادی (در صف)</span>
            </div>
            <div className="text-lg font-black font-mono text-blue-400">{toFaDigits(stats.normal)}</div>
          </div>

          {/* In progress */}
          <div
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-purple-950/60 border-purple-500/50 text-white'
                : 'bg-[#142036] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-purple-400 mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>در حال انجام</span>
            </div>
            <div className="text-lg font-black font-mono text-purple-400">{toFaDigits(stats.inProgress)}</div>
          </div>

          {/* Completed */}
          <div
            onClick={() => setStatusFilter('COMPLETED')}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-white'
                : 'bg-[#142036] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-emerald-400 mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>انجام شده</span>
            </div>
            <div className="text-lg font-black font-mono text-emerald-400">{toFaDigits(stats.completed)}</div>
          </div>

          {/* Issued Waybills */}
          <div
            onClick={() => setActiveViewMode('DOCS')}
            className="p-2.5 rounded-xl border bg-[#142036] border-slate-800 text-slate-300 hover:border-slate-700 transition cursor-pointer"
          >
            <div className="text-[10px] text-amber-300 mb-0.5 flex items-center gap-1">
              <FileText className="w-3 h-3 text-amber-400" />
              <span>بارنامه‌ها</span>
            </div>
            <div className="text-lg font-black font-mono text-amber-300">{toFaDigits(stats.waybillsCount)}</div>
          </div>

          {/* Issued Invoices */}
          <div
            onClick={() => setActiveViewMode('DOCS')}
            className="p-2.5 rounded-xl border bg-[#142036] border-slate-800 text-slate-300 hover:border-slate-700 transition cursor-pointer"
          >
            <div className="text-[10px] text-emerald-300 mb-0.5 flex items-center gap-1">
              <Receipt className="w-3 h-3 text-emerald-400" />
              <span>صورتحساب‌ها</span>
            </div>
            <div className="text-lg font-black font-mono text-emerald-300">{toFaDigits(stats.invoicesCount)}</div>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & View Mode Switcher */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی سفارش، مشتری، راننده، شهر..."
            className="w-full bg-[#18263e] border border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#18263e] p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setActiveViewMode('KANBAN')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeViewMode === 'KANBAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>کانبان جریان سفارشات</span>
          </button>

          <button
            onClick={() => setActiveViewMode('TABLE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeViewMode === 'TABLE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>جدول سفارشات</span>
          </button>

          <button
            onClick={() => setActiveViewMode('DOCS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeViewMode === 'DOCS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>اسناد مالی و بارنامه‌ها</span>
          </button>
        </div>
      </div>

      {/* 3. VIEW 1: Kanban Pipeline Board */}
      {activeViewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(['COORDINATION', 'NORMAL', 'IN_PROGRESS', 'COMPLETED'] as OrderStatus[]).map((colStatus) => {
            const config = ORDER_STATUS_CONFIG[colStatus];
            const columnOrders = filteredOrders.filter((o) => o.status === colStatus);

            return (
              <div
                key={colStatus}
                className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-3 flex flex-col min-h-[580px] shadow-sm"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.dotColor }} />
                    <span className="text-xs font-black text-white">{config.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#18263e] text-slate-300 border border-slate-700">
                    {toFaDigits(columnOrders.length)}
                  </span>
                </div>

                {/* Column Orders List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar pr-0.5 max-h-[640px]">
                  {columnOrders.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                      سفارشی در این وضعیت موجود نیست
                    </div>
                  ) : (
                    columnOrders.map((order) => {
                      const hasWaybill = !!order.waybill;
                      const hasInvoice = !!order.invoice;

                      return (
                        <div
                          key={order.id}
                          className="bg-[#142036] hover:bg-[#18263e] border border-slate-700/80 hover:border-slate-600 rounded-xl p-3 space-y-2.5 transition-all shadow-xs group"
                        >
                          {/* Top: Order Code & Source Badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                              {order.orderNumber}
                            </span>
                            <div className="flex items-center gap-1 text-[10px]">
                              {order.source === 'ONLINE_PORTAL' ? (
                                <span className="text-sky-400 bg-sky-950/50 px-1.5 py-0.2 rounded border border-sky-800/40 flex items-center gap-1">
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>آنلاین</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">دستی</span>
                              )}
                              <span className="text-slate-400 font-mono">{toFaDigits(order.orderDate)}</span>
                            </div>
                          </div>

                          {/* Customer & Company */}
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{order.customerName}</span>
                            </div>
                            {order.customerCompany && (
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-400" />
                                <span>{order.customerCompany}</span>
                              </div>
                            )}
                          </div>

                          {/* Route: Origin -> Destination */}
                          <div className="bg-[#0e1726] p-2 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-slate-300">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-blue-400" />
                                <strong className="text-blue-200">{order.originCity}</strong>
                              </div>
                              <ArrowLeft className="w-3 h-3 text-slate-400" />
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                <strong className="text-emerald-200">{order.destinationCity}</strong>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate" title={order.cargoDescription}>
                              📦 {order.cargoDescription} ({toFaDigits(order.cargoWeightTon)} تن)
                            </div>
                          </div>

                          {/* Fare & Vehicle Info */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="text-slate-300">{order.requestedVehicleType}</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatRial(order.estimatedFareRial)} ریال
                            </span>
                          </div>

                          {/* Assigned Driver if any */}
                          {order.assignedDriverName && (
                            <div className="text-[10px] bg-slate-800/80 px-2 py-1 rounded text-slate-300 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Truck className="w-3 h-3 text-amber-400" />
                                <span>راننده: {order.assignedDriverName}</span>
                              </span>
                              {order.assignedVehicleCode && (
                                <span className="font-mono text-amber-400">کد {toFaDigits(order.assignedVehicleCode)}</span>
                              )}
                            </div>
                          )}

                          {/* Coordination notes badge */}
                          {order.coordinationNotes && (
                            <div className="text-[10px] text-amber-300/80 bg-amber-950/30 p-1.5 rounded border border-amber-900/30 line-clamp-2">
                              💬 {order.coordinationNotes}
                            </div>
                          )}

                          {/* Issued Documents & Live Tracking Badges */}
                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            <button
                              onClick={() => setTrackingOrder(order)}
                              className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 px-2 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1 transition"
                              title="رهگیری زنده موقعیت بار روی نقشه"
                            >
                              <Navigation className="w-3 h-3 text-cyan-400" />
                              <span>رهگیری زنده</span>
                            </button>
                            {hasWaybill && (
                              <button
                                onClick={() => setPrintingWaybillOrder(order)}
                                className="text-[10px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 transition"
                                title="مشاهده و چاپ بارنامه"
                              >
                                <FileText className="w-3 h-3" />
                                <span>بارنامه: {order.waybill?.waybillNumber}</span>
                              </button>
                            )}
                            {hasInvoice && (
                              <button
                                onClick={() => setPrintingInvoiceOrder(order)}
                                className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1 transition"
                                title="مشاهده و چاپ صورتحساب"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>فاکتور</span>
                              </button>
                            )}
                          </div>

                          {/* Pipeline Quick Action Buttons */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-xs">
                            {/* Actions per status */}
                            {colStatus === 'COORDINATION' && (
                              <button
                                onClick={() => handleQuickStatusChange(order, 'NORMAL')}
                                className="w-full py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition flex items-center justify-center gap-1"
                              >
                                <span>تأیید و انتقال به عادی</span>
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}

                            {colStatus === 'NORMAL' && (
                              <button
                                onClick={() => handleQuickStatusChange(order, 'IN_PROGRESS')}
                                className="w-full py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition flex items-center justify-center gap-1"
                              >
                                <span>شروع حمل (در حال انجام)</span>
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}

                            {colStatus === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleQuickStatusChange(order, 'COMPLETED')}
                                className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تخلیه شد و تکمیل (انجام شد)</span>
                              </button>
                            )}

                            {colStatus === 'COMPLETED' && (
                              <div className="w-full flex items-center gap-1.5">
                                <button
                                  onClick={() => setConvertingOrder(order)}
                                  className="flex-1 py-1 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-600 hover:opacity-90 text-slate-950 font-black text-[10px] transition flex items-center justify-center gap-1 shadow-xs"
                                >
                                  <Sparkles className="w-3 h-3 text-slate-950" />
                                  <span>صدور بارنامه / فاکتور</span>
                                </button>
                                <button
                                  onClick={() => onDeleteOrder(order.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-950/30"
                                  title="حذف سفارش"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. VIEW 2: Table / List View */}
      {activeViewMode === 'TABLE' && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl shadow-lg overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-[#142036] text-white border-b border-[#1f2c45]">
                <tr>
                  <th className="p-3">شماره سفارش</th>
                  <th className="p-3">مشتری و شرکت</th>
                  <th className="p-3">مسیر (مبدأ ← مقصد)</th>
                  <th className="p-3">شرح محموله</th>
                  <th className="p-3">خودرو و راننده</th>
                  <th className="p-3 text-left">کرایه توافقی</th>
                  <th className="p-3 text-center">وضعیت سفارش</th>
                  <th className="p-3 text-center">اسناد صادره</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a273f]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      هیچ سفارشی مطابق جستجو یا فیلتر یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, idx) => {
                    const statusCfg = ORDER_STATUS_CONFIG[order.status];
                    return (
                      <tr key={order.id} className="hover:bg-[#182845] transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-400">
                          {order.orderNumber}
                          <div className="text-[10px] text-slate-400 font-sans">{toFaDigits(order.orderDate)}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-white">{order.customerName}</div>
                          {order.customerCompany && (
                            <div className="text-[10px] text-slate-400">{order.customerCompany}</div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono">{toFaDigits(order.customerPhone)}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-200">
                            {order.originCity} ← {order.destinationCity}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]" title={order.originAddress}>
                            مبدأ: {order.originAddress}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="text-slate-200">{order.cargoDescription}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {toFaDigits(order.cargoWeightTon)} تن • {order.requestedVehicleType}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="text-white font-medium">
                            {order.assignedDriverName || 'تعیین نشده'}
                          </div>
                          {order.assignedVehiclePlate && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {order.assignedVehiclePlate}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-left font-mono font-black text-emerald-400">
                          {formatRial(order.estimatedFareRial)} ریال
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {order.waybill ? (
                              <button
                                onClick={() => setPrintingWaybillOrder(order)}
                                className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 text-[10px] font-bold"
                                title="چاپ بارنامه"
                              >
                                بارنامه
                              </button>
                            ) : null}
                            {order.invoice ? (
                              <button
                                onClick={() => setPrintingInvoiceOrder(order)}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 text-[10px] font-bold"
                                title="چاپ فاکتور"
                              >
                                فاکتور
                              </button>
                            ) : null}
                            {!order.waybill && !order.invoice && (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setTrackingOrder(order)}
                              className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 border border-cyan-500/40"
                              title="رهگیری زنده موقعیت بار روی نقشه"
                            >
                              <Navigation className="w-3 h-3 text-cyan-400" />
                              <span>رهگیری</span>
                            </button>
                            {order.status === 'COMPLETED' ? (
                              <button
                                onClick={() => setConvertingOrder(order)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>صدور سند</span>
                              </button>
                            ) : (
                              <select
                                value={order.status}
                                onChange={(e) => handleQuickStatusChange(order, e.target.value as OrderStatus)}
                                className="bg-[#18263e] border border-slate-700 text-slate-300 text-[10px] rounded px-1 py-0.5"
                              >
                                <option value="COORDINATION">هماهنگی</option>
                                <option value="NORMAL">عادی</option>
                                <option value="IN_PROGRESS">در حال انجام</option>
                                <option value="COMPLETED">انجام شده</option>
                              </select>
                            )}

                            <button
                              onClick={() => onDeleteOrder(order.id)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. VIEW 3: Issued Documents Archive */}
      {activeViewMode === 'DOCS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Waybills archive */}
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2 text-amber-400">
              <span className="text-xs font-black flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>بارنامه‌های رسمی صادر شده ({toFaDigits(stats.waybillsCount)})</span>
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {orders.filter((o) => !!o.waybill).length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  هنوز بارنامه‌ای برای سفارشات صادر نشده است.
                </div>
              ) : (
                orders
                  .filter((o) => !!o.waybill)
                  .map((o) => (
                    <div
                      key={o.id}
                      className="bg-[#142036] p-3 rounded-xl border border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-amber-300 font-mono">
                          بارنامه شماره: {o.waybill?.waybillNumber}
                        </div>
                        <div className="text-[11px] text-white mt-0.5">
                          فرستنده: {o.waybill?.senderName} ← گیرنده: {o.waybill?.receiverName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          راننده: {o.waybill?.driverName} • تاریخ: {o.waybill?.issueDate}
                        </div>
                      </div>

                      <button
                        onClick={() => setPrintingWaybillOrder(o)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>چاپ بارنامه</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Invoices archive */}
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2 text-emerald-400">
              <span className="text-xs font-black flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                <span>صورتحساب‌های رسمی صادر شده ({toFaDigits(stats.invoicesCount)})</span>
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {orders.filter((o) => !!o.invoice).length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  هنوز صورتحسابی برای سفارشات صادر نشده است.
                </div>
              ) : (
                orders
                  .filter((o) => !!o.invoice)
                  .map((o) => (
                    <div
                      key={o.id}
                      className="bg-[#142036] p-3 rounded-xl border border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-emerald-300 font-mono">
                          صورتحساب: {o.invoice?.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-white mt-0.5">
                          مشتری: {o.invoice?.customerName}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono font-bold">
                          مبلغ کل: {formatRial(o.invoice?.totalPayableRial)} ریال
                        </div>
                      </div>

                      <button
                        onClick={() => setPrintingInvoiceOrder(o)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>چاپ فاکتور</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Modals */}
      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <CreateOrderModal
          onClose={() => setIsCreateModalOpen(false)}
          onSaveOrder={(newOrder) => {
            onAddOrder(newOrder);
            setIsCreateModalOpen(false);
          }}
          vehicles={vehicles}
          drivers={drivers}
          initialMode={createModalInitialMode}
        />
      )}

      {/* Convert to Waybill / Invoice Modal */}
      {convertingOrder && (
        <ConvertToWaybillOrInvoiceModal
          order={convertingOrder}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setConvertingOrder(null)}
          onSaveConversion={(orderId, waybill, invoice) => {
            handleSaveConversion(orderId, waybill, invoice);
          }}
          onSave={(orderId, waybill, invoice) => {
            handleSaveConversion(orderId, waybill, invoice);
          }}
        />
      )}

      {/* Print Waybill Modal */}
      {printingWaybillOrder && printingWaybillOrder.waybill && (
        <WaybillPrintModal
          order={printingWaybillOrder}
          waybill={printingWaybillOrder.waybill}
          onClose={() => setPrintingWaybillOrder(null)}
        />
      )}

      {/* Print Invoice Modal */}
      {printingInvoiceOrder && printingInvoiceOrder.invoice && (
        <InvoicePrintModal
          order={printingInvoiceOrder}
          invoice={printingInvoiceOrder.invoice}
          onClose={() => setPrintingInvoiceOrder(null)}
        />
      )}

      {/* Live Cargo Tracking Modal */}
      {trackingOrder && (
        <CargoTrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </div>
  );
};
