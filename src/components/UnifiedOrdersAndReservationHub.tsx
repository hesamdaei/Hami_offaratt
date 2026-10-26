import React, { FC, useState, useMemo, useEffect } from 'react';
import {
  OrderItem,
  OrderStatus,
  OrderCategoryType,
  CustomerType,
  WaybillDetails,
  InvoiceDetails,
  ORDER_STATUS_CONFIG,
} from '../utils/ordersData';
import {
  VehicleItem,
  DriverDirectoryItem,
  VEHICLE_TYPE_NAMES,
  checkVehicleServiceEligibility,
} from '../utils/fleetSeedData';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import {
  SEDAGHAT_SERVICES_CATALOG,
  CatalogItem,
  OrderLineItem,
  CatalogCategory,
  CATEGORY_LABELS,
} from '../utils/sedaghatBarCatalog';
import { NeighborhoodPicker } from './reservation/NeighborhoodPicker';
import { TehranZonePricingMatrix } from './reservation/TehranZonePricingMatrix';
import {
  TEHRAN_NEIGHBORHOODS,
  NeighborhoodItem,
  ReservationRates,
  DEFAULT_RESERVATION_RATES,
  getSafeReservationRates,
} from '../utils/reservationRates';
import { WaybillPrintModal } from './WaybillPrintModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { ConvertToWaybillOrInvoiceModal } from './ConvertToWaybillOrInvoiceModal';
import { IranianPlate } from './IranianPlate';
import { CargoTrackingModal } from './CargoTrackingModal';
import {
  Navigation,
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
  Compass,
  PhoneCall,
  Plus,
  KeyRound,
  Minus,
  Check,
  X,
  Share2,
  CreditCard,
  AlertTriangle,
  Info,
  Calendar,
  Filter,
  Eye,
  RefreshCw,
  FolderArchive,
  Zap,
} from 'lucide-react';

interface UnifiedOrdersAndReservationHubProps {
  orders: OrderItem[];
  onAddOrder: (order: OrderItem) => void;
  onUpdateOrder: (order: OrderItem) => void;
  onDeleteOrder: (orderId: string) => void;
  vehicles: VehicleItem[];
  drivers: DriverDirectoryItem[];
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialSubTab?: 'ORDERS_LIST' | 'NEW_ORDER' | 'ZONE_MATRIX' | 'WAYBILLS';
}

export const UnifiedOrdersAndReservationHub: FC<UnifiedOrdersAndReservationHubProps> = ({
  orders,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  vehicles,
  drivers,
  showToast,
  initialSubTab = 'ORDERS_LIST',
}) => {
  const today = getTodayJalaali();

  // Active Sub-Tab: 'ORDERS_LIST' | 'NEW_ORDER' | 'ZONE_MATRIX' | 'WAYBILLS'
  const [activeTab, setActiveTab] = useState<'ORDERS_LIST' | 'NEW_ORDER' | 'ZONE_MATRIX' | 'WAYBILLS'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Search & Filter State for Orders List
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Rates loaded from localStorage or default
  const [reservationRates, setReservationRates] = useState<ReservationRates>(() => {
    try {
      const saved = localStorage.getItem('sedaghatbar_reservation_rates_v1');
      if (saved) {
        return getSafeReservationRates(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return DEFAULT_RESERVATION_RATES;
  });

  const handleUpdateReservationRates = (newRates: ReservationRates) => {
    const safe = getSafeReservationRates(newRates);
    setReservationRates(safe);
    try {
      localStorage.setItem('sedaghatbar_reservation_rates_v1', JSON.stringify(safe));
    } catch {
      // ignore
    }
  };

  // Print & Conversion Modals
  const [convertingOrder, setConvertingOrder] = useState<OrderItem | null>(null);
  const [printingWaybillOrder, setPrintingWaybillOrder] = useState<OrderItem | null>(null);
  const [printingInvoiceOrder, setPrintingInvoiceOrder] = useState<OrderItem | null>(null);
  const [viewingDetailOrder, setViewingDetailOrder] = useState<OrderItem | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<OrderItem | null>(null);

  // =========================================================================
  // FORM STATE FOR NEW ORDER / RESERVATION (Directly modeled from photo)
  // =========================================================================
  const [orderCategoryType, setOrderCategoryType] = useState<OrderCategoryType>('COMPANY');
  const [customerType, setCustomerType] = useState<CustomerType>('INDIVIDUAL');
  const [customOrderNumber, setCustomOrderNumber] = useState(
    `ORD-${today.jy}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [totalOrderNumber, setTotalOrderNumber] = useState('');
  const [preOrderNumber, setPreOrderNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [acquisitionChannel, setAcquisitionChannel] = useState('تماس تلفنی مستقیم');

  // Dates and timings
  const [orderDate, setOrderDate] = useState(
    `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`
  );
  const [loadingTime, setLoadingTime] = useState('۰۹:۰۰');
  const [coordinationTime, setCoordinationTime] = useState('۰۸:۳۰');
  const [approximateEndTime, setApproximateEndTime] = useState('۱۲:۰۰');
  const [isPostponedToCoordination, setIsPostponedToCoordination] = useState(false);
  const [isPrepaymentBypassed, setIsPrepaymentBypassed] = useState(false);
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(true);

  // Route & Floors
  const [originCity, setOriginCity] = useState('تهران');
  const [originNeighborhood, setOriginNeighborhood] = useState<NeighborhoodItem | null>(null);
  const [originAddress, setOriginAddress] = useState('');
  const [originFloor, setOriginFloor] = useState<number>(1);
  const [originHasElevator, setOriginHasElevator] = useState<boolean>(false);

  const [destCity, setDestCity] = useState('تهران');
  const [destNeighborhood, setDestNeighborhood] = useState<NeighborhoodItem | null>(null);
  const [destAddress, setDestAddress] = useState('');
  const [destFloor, setDestFloor] = useState<number>(1);
  const [destHasElevator, setDestHasElevator] = useState<boolean>(false);

  // Assignment
  const [assignedDriverName, setAssignedDriverName] = useState('');
  const [assignedVehicleCode, setAssignedVehicleCode] = useState<number | undefined>(undefined);
  const [dispatcherName, setDispatcherName] = useState('دیسپچ مرکزی');
  const [coordinatorName, setCoordinatorName] = useState('واحد دیسپچینگ حامی');
  const [printableNotes, setPrintableNotes] = useState('');
  const [coordinationNotes, setCoordinationNotes] = useState('');

  // Dual-Pane Catalog Picker State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('ALL');
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderLineItem[]>(() => [
    // Pre-populate with default truck + 3 workers as standard base
    {
      id: 'line-khavar',
      catalogItemId: 'cat-khavar',
      code: 'KH-01',
      name: 'خاور (کامیونت مسقف موکت‌کاری شده)',
      categoryName: 'ماشین',
      unit: 'دستگاه',
      quantity: 1,
      unitPriceRial: 51800000,
      baseHours: 3,
      extraHours: 0,
      extraHourRateRial: 20000000,
      floorCount: 0,
      floorExtraRateRial: 0,
      totalPriceRial: 51800000,
    },
    {
      id: 'line-wrk',
      catalogItemId: 'cat-wrk-moving',
      code: 'WRK-03',
      name: 'کارگر حمل بار و جابجایی',
      categoryName: 'کارگر',
      unit: 'نفر',
      quantity: 3,
      unitPriceRial: 18000000,
      baseHours: 3,
      extraHours: 0,
      extraHourRateRial: 3000000,
      floorCount: 0,
      floorExtraRateRial: 0,
      totalPriceRial: 54000000,
    },
  ]);

  // Prepayment
  const [advancePaymentRial, setAdvancePaymentRial] = useState<number>(5000000);

  // Detect zone type from origin and destination
  const detectedZoneInfo = useMemo(() => {
    let requiresDeposit = false;
    let zoneType = 'داخلی تهران';
    let badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

    if (
      originNeighborhood?.zoneType === 'SPECIAL_SUBURB' ||
      destNeighborhood?.zoneType === 'SPECIAL_SUBURB'
    ) {
      zoneType = 'حومه ویژه (هشتگرد/دماوند/گیلاوند)';
      requiresDeposit = true;
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    } else if (
      originNeighborhood?.zoneType === 'SUBURB' ||
      destNeighborhood?.zoneType === 'SUBURB'
    ) {
      zoneType = 'حومه تهران (کرج/اسلامشهر/شهریار)';
      requiresDeposit = true;
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }

    return { zoneType, requiresDeposit, badgeClass };
  }, [originNeighborhood, destNeighborhood]);

  // Total floors without elevator
  const effectiveTotalFloors = useMemo(() => {
    let count = 0;
    if (!originHasElevator && originFloor > 0) count += originFloor;
    if (!destHasElevator && destFloor > 0) count += destFloor;
    return count;
  }, [originFloor, originHasElevator, destFloor, destHasElevator]);

  // Calculate Grand Total for Line Items
  const calculatedGrandTotalRial = useMemo(() => {
    return selectedOrderItems.reduce((sum, item) => sum + item.totalPriceRial, 0);
  }, [selectedOrderItems]);

  const remainingBalanceRial = Math.max(0, calculatedGrandTotalRial - advancePaymentRial);

  // Filter Catalog Items
  const filteredCatalogItems = useMemo(() => {
    return SEDAGHAT_SERVICES_CATALOG.filter((item) => {
      const matchesSearch =
        catalogSearch === '' ||
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(catalogSearch.toLowerCase());

      const matchesCat =
        catalogCategoryFilter === 'ALL' || item.category === catalogCategoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [catalogSearch, catalogCategoryFilter]);

  // Add Item to Order Line Items
  const handleAddCatalogItemToOrder = (catItem: CatalogItem) => {
    setSelectedOrderItems((prev) => {
      // Check if item already exists
      const existingIndex = prev.findIndex((i) => i.catalogItemId === catItem.id);
      if (existingIndex >= 0) {
        // Increment quantity
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + 1;
        const newTotal = calculateLineItemTotal({
          ...current,
          quantity: newQty,
        });
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPriceRial: newTotal,
        };
        return updated;
      }

      // Add new item
      const initialFloorCount = catItem.requiresFloors ? effectiveTotalFloors : 0;
      const newLine: OrderLineItem = {
        id: `line-${Date.now()}-${Math.random()}`,
        catalogItemId: catItem.id,
        code: catItem.code,
        name: catItem.name,
        categoryName: catItem.categoryName,
        unit: catItem.unit,
        quantity: 1,
        unitPriceRial: catItem.unitPriceRial,
        baseHours: catItem.baseHours,
        extraHours: 0,
        extraHourRateRial: catItem.extraHourRateRial,
        floorCount: initialFloorCount,
        floorExtraRateRial: catItem.floorExtraRateRial,
        totalPriceRial: 0,
      };
      newLine.totalPriceRial = calculateLineItemTotal(newLine);
      return [...prev, newLine];
    });

    if (showToast) {
      showToast(`«${catItem.name}» به جزئیات سفارش اضافه شد.`, 'info');
    }
  };

  // Calculate single line item total
  const calculateLineItemTotal = (item: OrderLineItem): number => {
    let total = item.unitPriceRial * item.quantity;
    if (item.extraHours && item.extraHourRateRial) {
      total += item.extraHours * item.extraHourRateRial * item.quantity;
    }
    if (item.floorCount && item.floorExtraRateRial) {
      total += item.floorCount * item.floorExtraRateRial * item.quantity;
    }
    return total;
  };

  // Update line item quantity or floor
  const handleUpdateLineItem = (
    id: string,
    updates: Partial<OrderLineItem>
  ) => {
    setSelectedOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.totalPriceRial = calculateLineItemTotal(updated);
          return updated;
        }
        return item;
      })
    );
  };

  // Remove Line Item
  const handleRemoveLineItem = (id: string) => {
    setSelectedOrderItems((prev) => prev.filter((i) => i.id !== id));
  };

  // =========================================================================
  // SUBMIT ORDER / RESERVATION
  // =========================================================================
  const handleSaveAndSubmit = (
    targetAction: 'STAY_ORDER' | 'OPEN_WAYBILL' | 'OPEN_INVOICE' | 'DRAFT'
  ) => {
    if (!customerPhone && !customerName) {
      if (showToast) showToast('لطفاً نام یا شماره تماس مشتری را وارد کنید.', 'error');
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.code === assignedVehicleCode);

    // قانون محوری: ماشینی که راننده ندارد امکان اختصاص سرویس ندارد
    if (selectedVehicle && (!selectedVehicle.driverName || selectedVehicle.driverName === 'بدون راننده')) {
      if (showToast) {
        showToast('خطای دیسپچ: ماشینی که راننده ندارد امکان اختصاص سرویس و صدور بارنامه ندارد.', 'error');
      }
      return;
    }

    if (targetAction === 'OPEN_WAYBILL') {
      const hasValidDriver =
        (selectedVehicle && selectedVehicle.driverName && selectedVehicle.driverName !== 'بدون راننده') ||
        (assignedDriverName && assignedDriverName.trim() !== '' && assignedDriverName !== 'بدون راننده');

      if (!hasValidDriver) {
        if (showToast) {
          showToast(
            'صدور بارنامه مسدود شد: ماشینی که راننده ندارد امکان اختصاص سرویس و صدور بارنامه ندارد. لطفاً ابتدا راننده را مشخص کنید.',
            'error'
          );
        }
        return;
      }
    }

    const resolvedStatus: OrderStatus =
      targetAction === 'DRAFT' || isPostponedToCoordination
        ? 'COORDINATION'
        : targetAction === 'OPEN_WAYBILL'
        ? 'COMPLETED'
        : 'NORMAL';

    const cargoSummary =
      selectedOrderItems.length > 0
        ? selectedOrderItems.map((i) => `${i.name} (${toFaDigits(i.quantity)} ${i.unit})`).join('، ')
        : 'اثاثیه منزل و اقلام خانگی استاندارد';

    const newOrder: OrderItem = {
      id: `ord-${Date.now()}`,
      orderNumber: customOrderNumber,
      totalOrderNumber: totalOrderNumber || undefined,
      preOrderNumber: preOrderNumber || undefined,
      referralCode: referralCode || undefined,
      orderCategoryType,
      customerType,
      customerName: customerName || 'مشتری حامی',
      customerPhone: customerPhone || '09120000000',
      customerCompany: customerCompany || undefined,
      nationalCode: nationalCode || undefined,
      acquisitionChannel,
      orderDate,
      loadingTime,
      approximateEndTime,
      originCity,
      originNeighborhood: originNeighborhood?.title || undefined,
      originAddress:
        originAddress || (originNeighborhood ? `محله ${originNeighborhood.title}` : 'تهران مبدأ'),
      originFloor,
      originHasElevator,
      destinationCity: destCity,
      destinationNeighborhood: destNeighborhood?.title || undefined,
      destinationAddress:
        destAddress || (destNeighborhood ? `محله ${destNeighborhood.title}` : 'تهران مقصد'),
      destFloor,
      destHasElevator,
      cargoDescription: cargoSummary,
      cargoWeightTon: 3.5,
      packageCount: selectedOrderItems.length,
      requestedVehicleType: 'خاور مسقف موکت‌کاری شده حامی',
      estimatedFareRial: calculatedGrandTotalRial,
      advancePaymentRial,
      remainingPaymentRial: remainingBalanceRial,
      isPrepaymentBypassed,
      isCustomerConfirmed,
      isPostponedToCoordination,
      dispatcherName,
      coordinatorName,
      printableNotes,
      coordinationNotes,
      orderItemsDetail: selectedOrderItems,
      paymentType: advancePaymentRial > 0 ? 'PREPAID' : 'POSTPAID',
      status: resolvedStatus,
      source: 'MANUAL',
      assignedDriverName: assignedDriverName || undefined,
      assignedVehicleCode: assignedVehicleCode || undefined,
      assignedVehiclePlate: selectedVehicle?.plateNumber || (selectedVehicle as any)?.plate || undefined,
      createdAt: new Date().toISOString(),
    };

    // If Waybill was requested, generate initial waybill data
    if (targetAction === 'OPEN_WAYBILL') {
      newOrder.waybill = {
        waybillNumber: `WB-1403/${Math.floor(10000 + Math.random() * 90000)}`,
        issueDate: orderDate,
        senderName: customerName || 'فرستنده محترم',
        senderPhone: customerPhone || undefined,
        senderAddress: originAddress || `تهران - ${originNeighborhood?.title || 'مبدأ'}`,
        receiverName: customerName || 'گیرنده محترم',
        receiverPhone: customerPhone || undefined,
        receiverAddress: destAddress || `تهران - ${destNeighborhood?.title || 'مقصد'}`,
        cargoType: cargoSummary,
        cargoWeightTon: 3.5,
        cargoPackageCount: selectedOrderItems.length,
        declaredValueRial: 500000000,
        insuranceAmountRial: 150000,
        driverName: assignedDriverName || 'راننده دیسپچ حامی',
        driverPhone: '09121234567',
        vehiclePlate: selectedVehicle?.plate || 'ایران ۲۲ - ۱۲۳ع۴۵',
        vehicleCode: assignedVehicleCode,
        shippingCostRial: calculatedGrandTotalRial,
        notes: printableNotes || 'حمل اثاثیه با پتوپیچی کامل و پرسنل مجرب',
        createdAt: new Date().toISOString(),
      };
    }

    // If Invoice was requested, generate invoice
    if (targetAction === 'OPEN_INVOICE') {
      newOrder.invoice = {
        invoiceNumber: `INV-1403/${Math.floor(1000 + Math.random() * 9000)}`,
        issueDate: orderDate,
        customerName: customerName || 'مشتری محترم',
        customerPhone: customerPhone,
        customerAddress: originAddress,
        baseFreightRial: calculatedGrandTotalRial,
        loadingUnloadingCostRial: 0,
        taxPercent: 0,
        taxAmountRial: 0,
        totalPayableRial: calculatedGrandTotalRial,
        paymentStatus: advancePaymentRial >= calculatedGrandTotalRial ? 'PAID' : 'PARTIAL',
        paymentMethod: 'BANK_TRANSFER',
        notes: printableNotes,
        createdAt: new Date().toISOString(),
      };
    }

    onAddOrder(newOrder);

    // Reset Form for next order
    setCustomOrderNumber(`ORD-${today.jy}/${Math.floor(1000 + Math.random() * 9000)}`);
    setCustomerName('');
    setCustomerPhone('');
    setOriginAddress('');
    setDestAddress('');

    if (targetAction === 'OPEN_WAYBILL' && newOrder.waybill) {
      setPrintingWaybillOrder(newOrder);
      setActiveTab('ORDERS_LIST');
    } else if (targetAction === 'OPEN_INVOICE' && newOrder.invoice) {
      setPrintingInvoiceOrder(newOrder);
      setActiveTab('ORDERS_LIST');
    } else {
      setActiveTab('ORDERS_LIST');
    }

    if (showToast) {
      showToast(`سفارش «${newOrder.orderNumber}» با موفقیت ثبت گردید.`, 'success');
    }
  };

  // Statistics
  const stats = useMemo(() => {
    let coordination = 0;
    let normal = 0;
    let inProgress = 0;
    let completed = 0;
    let totalRial = 0;
    let waybillsCount = 0;

    orders.forEach((o) => {
      if (o.status === 'COORDINATION') coordination++;
      if (o.status === 'NORMAL') normal++;
      if (o.status === 'IN_PROGRESS') inProgress++;
      if (o.status === 'COMPLETED') completed++;
      if (o.waybill) waybillsCount++;
      totalRial += o.estimatedFareRial || 0;
    });

    return {
      total: orders.length,
      coordination,
      normal,
      inProgress,
      completed,
      waybillsCount,
      totalRial,
    };
  }, [orders]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        searchQuery === '' ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone.includes(searchQuery) ||
        o.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.destinationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.assignedDriverName && o.assignedDriverName.includes(searchQuery));

      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchSource = sourceFilter === 'ALL' || o.source === sourceFilter;

      return matchSearch && matchStatus && matchSource;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  return (
    <div className="space-y-4">
      {/* Top Cockpit Navigation & Action Bar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('ORDERS_LIST')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'ORDERS_LIST'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>میز کار سفارشات و بارنامه‌ها</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-amber-300 font-mono font-bold">
              {toFaDigits(orders.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('NEW_ORDER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'NEW_ORDER'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>ثبت سفارش و رزرواسیون جدید</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
              حامی
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ZONE_MATRIX')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'ZONE_MATRIX'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>تعرفه‌نامه و ماتریس مناطق</span>
          </button>

          <button
            onClick={() => setActiveTab('WAYBILLS')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'WAYBILLS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FolderArchive className="w-4 h-4 text-sky-400" />
            <span>بایگانی بارنامه‌ها و صورتحساب‌ها</span>
            {stats.waybillsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold">
                {toFaDigits(stats.waybillsCount)}
              </span>
            )}
          </button>
        </div>

        {/* Quick Quick KPI Indicator */}
        <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-950/60 border border-slate-800 px-3.5 py-1.5 rounded-xl text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>نیاز به هماهنگی: <strong className="font-mono text-amber-400">{toFaDigits(stats.coordination)}</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>در حال حمل: <strong className="font-mono text-purple-400">{toFaDigits(stats.inProgress)}</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>بارنامه شده: <strong className="font-mono text-emerald-400">{toFaDigits(stats.completed)}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ORDERS AND WAYBILL LIST VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'ORDERS_LIST' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Quick Filter Bar */}
          <div className="bg-[#111b2e] border border-[#1f2c45] p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو بر اساس شماره سفارش، نام مشتری، تلفن، شهر یا راننده..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#090f1d] border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#090f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">همه وضعیت‌ها ({toFaDigits(orders.length)})</option>
                <option value="COORDINATION">موکول به هماهنگی ({toFaDigits(stats.coordination)})</option>
                <option value="NORMAL">عادی / در انتظار تخصیص ({toFaDigits(stats.normal)})</option>
                <option value="IN_PROGRESS">در حال حمل ({toFaDigits(stats.inProgress)})</option>
                <option value="COMPLETED">تکمیل شده / بارنامه ({toFaDigits(stats.completed)})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => setActiveTab('NEW_ORDER')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت سفارش و رزرواسیون جدید</span>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-[#18263e] text-slate-200 font-bold border-b border-slate-700/80">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-12">#</th>
                    <th className="py-3 px-3.5">شماره و تاریخ</th>
                    <th className="py-3 px-3.5">مشتری و تماس</th>
                    <th className="py-3 px-3.5">مسیر (مبدأ ➔ مقصد)</th>
                    <th className="py-3 px-3.5">ناوگان و راننده</th>
                    <th className="py-3 px-3.5">مبلغ کل (ریال)</th>
                    <th className="py-3 px-3.5 text-center">وضعیت</th>
                    <th className="py-3 px-3.5 text-center">اسناد و مدارک</th>
                    <th className="py-3 px-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <PackagePlus className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
                        <span>هیچ سفارشی مطابق فیلتر یافت نشد.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, idx) => {
                      const statusCfg = ORDER_STATUS_CONFIG[order.status];
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-[#18263e]/50 transition group"
                        >
                          <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                            {toFaDigits(idx + 1)}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-mono font-bold text-white text-xs">
                              {order.orderNumber}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>{toFaDigits(order.orderDate)}</span>
                              {order.loadingTime && (
                                <span className="text-slate-500 mr-1">ساعت {toFaDigits(order.loadingTime)}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{order.customerName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{toFaDigits(order.customerPhone)}</span>
                              {order.customerCompany && (
                                <span className="text-[10px] text-slate-500 bg-slate-800 px-1 rounded mr-1">
                                  {order.customerCompany}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 max-w-xs">
                            <div className="flex items-center gap-1 text-slate-200">
                              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span className="font-medium truncate">{order.originCity} ({order.originNeighborhood || order.originAddress})</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <span className="text-slate-500">به:</span>
                              <span className="truncate">{order.destinationCity} ({order.destinationNeighborhood || order.destinationAddress})</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="text-slate-200 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-amber-400" />
                              <span>{order.assignedDriverName || 'بدون راننده'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {order.assignedVehiclePlate || 'تخصیص نیافته'}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-mono">
                            <div className="font-bold text-amber-400 text-xs">
                              {toFaDigits(order.estimatedFareRial.toLocaleString('fa-IR'))} <span className="text-[10px] text-slate-400 font-sans">ریال</span>
                            </div>
                            {order.advancePaymentRial ? (
                              <div className="text-[10px] text-emerald-400">
                                بیعانه: {toFaDigits(order.advancePaymentRial.toLocaleString('fa-IR'))}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: statusCfg.dotColor }}
                              ></span>
                              <span>{statusCfg.shortLabel}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {order.waybill ? (
                                <button
                                  onClick={() => setPrintingWaybillOrder(order)}
                                  className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] flex items-center gap-1 transition"
                                  title="مشاهده و چاپ بارنامه تمبردار"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>بارنامه</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConvertingOrder(order)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] flex items-center gap-1 transition border border-slate-700"
                                  title="صدور بارنامه یا فاکتور"
                                >
                                  <Plus className="w-3 h-3 text-amber-400" />
                                  <span>صدور سند</span>
                                </button>
                              )}

                              {order.invoice && (
                                <button
                                  onClick={() => setPrintingInvoiceOrder(order)}
                                  className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] flex items-center gap-1 transition"
                                  title="مشاهده و چاپ صورتحساب مالی"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>فاکتور</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setTrackingOrder(order)}
                                className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-lg transition"
                                title="رهگیری زنده موقعیت بار روی نقشه"
                              >
                                <Navigation className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setViewingDetailOrder(order)}
                                className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition"
                                title="مشاهده جزئیات سفارش"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteOrder(order.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                                title="حذف سفارش"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. NEW ORDER & RESERVATION (Dual-Pane Table Modeled From Photo) */}
      {/* ========================================================================= */}
      {activeTab === 'NEW_ORDER' && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl overflow-hidden shadow-2xl space-y-4 animate-in fade-in duration-150 p-4 sm:p-5">
          
          {/* Header Bar - Exactly like desktop photo */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">شماره سفارش</label>
                <input
                  type="text"
                  value={customOrderNumber}
                  onChange={(e) => setCustomOrderNumber(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">شماره کل</label>
                <input
                  type="text"
                  placeholder="اختیاری..."
                  value={totalOrderNumber}
                  onChange={(e) => setTotalOrderNumber(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع سفارش</label>
                <div className="flex items-center gap-1 bg-[#111b2e] p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setOrderCategoryType('COMPANY')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                      orderCategoryType === 'COMPANY'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    شرکت حامی
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderCategoryType('CONTRACTOR')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                      orderCategoryType === 'CONTRACTOR'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    پیمانکار
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderCategoryType('MISC')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                      orderCategoryType === 'MISC'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    متفرقه
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">کد معرف</label>
                <input
                  type="text"
                  placeholder="کد بازاریاب یا معرف..."
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">ش پیش سفارش</label>
                <input
                  type="text"
                  placeholder="شماره پیش‌فاکتور..."
                  value={preOrderNumber}
                  onChange={(e) => setPreOrderNumber(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع مشتری</label>
                <div className="flex items-center gap-3 pt-1 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={customerType === 'INDIVIDUAL'}
                      onChange={() => setCustomerType('INDIVIDUAL')}
                      className="accent-amber-500"
                    />
                    <span>حقیقی</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={customerType === 'LEGAL'}
                      onChange={() => setCustomerType('LEGAL')}
                      className="accent-amber-500"
                    />
                    <span>حقوقی</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Customer Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">تلفن همراه ۱ (اصلی)</label>
                <input
                  type="text"
                  placeholder="0912xxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">نام مشتری / سازمان</label>
                <input
                  type="text"
                  placeholder="نام و نام خانوادگی..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">نحوه آشنایی</label>
                <select
                  value={acquisitionChannel}
                  onChange={(e) => setAcquisitionChannel(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="تماس تلفنی مستقیم">تماس تلفنی مستقیم ۱۷۸۰</option>
                  <option value="اینستاگرام حامی">اینستاگرام حامی</option>
                  <option value="سایت و گوگل">جستجوی گوگل / وب‌سایت</option>
                  <option value="دیوار و شیپور">آگهی دیوار / شیپور</option>
                  <option value="معرف و مشتری قبلی">معرف و مشتری قبلی</option>
                  <option value="پیامک و بنر">تبلیغات پیامکی / بنر</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">کد ملی مشتری</label>
                <input
                  type="text"
                  placeholder="کد ملی ۱۰ رقمی..."
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Timings & Advance Payment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80 items-center">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">تاریخ بارگیری (شمسی)</label>
                <input
                  type="text"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">ساعت شروع</label>
                <input
                  type="text"
                  value={loadingTime}
                  onChange={(e) => setLoadingTime(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">هماهنگی / پایان تقریبی</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="هماهنگی"
                    value={coordinationTime}
                    onChange={(e) => setCoordinationTime(e.target.value)}
                    className="w-1/2 bg-[#111b2e] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="پایان"
                    value={approximateEndTime}
                    onChange={(e) => setApproximateEndTime(e.target.value)}
                    className="w-1/2 bg-[#111b2e] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">پیش پرداخت (ریال)</label>
                <input
                  type="number"
                  step="1000000"
                  value={advancePaymentRial}
                  onChange={(e) => setAdvancePaymentRial(Number(e.target.value) || 0)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1 text-[11px] text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPostponedToCoordination}
                    onChange={(e) => setIsPostponedToCoordination(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>موکول به هماهنگی</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrepaymentBypassed}
                    onChange={(e) => setIsPrepaymentBypassed(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>اقدام بدون کنترل پیش‌پرداخت</span>
                </label>
              </div>
            </div>

            {/* Origin & Destination & Floors Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              {/* Origin Box */}
              <div className="bg-[#111b2e] border border-slate-700/80 p-3 rounded-xl space-y-2">
                <NeighborhoodPicker
                  label="مبدأ بارگیری (انتخاب محله تهران یا حومه)"
                  selectedNeighborhood={originNeighborhood}
                  customText={originAddress}
                  onSelect={(item, text) => {
                    setOriginNeighborhood(item);
                    setOriginAddress(text);
                  }}
                  placeholder="جستجو یا انتخاب محله مبدأ..."
                  isOrigin={true}
                />
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">از طبقه:</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={originFloor}
                      onChange={(e) => setOriginFloor(Number(e.target.value) || 0)}
                      className="w-14 bg-[#090f1d] border border-slate-700 rounded px-2 py-1 text-center text-white font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={originHasElevator}
                      onChange={(e) => setOriginHasElevator(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>حق استفاده از آسانسور در مبدأ</span>
                  </label>
                </div>
              </div>

              {/* Destination Box */}
              <div className="bg-[#111b2e] border border-slate-700/80 p-3 rounded-xl space-y-2">
                <NeighborhoodPicker
                  label="مقصد تخلیه (انتخاب محله تهران یا حومه)"
                  selectedNeighborhood={destNeighborhood}
                  customText={destAddress}
                  onSelect={(item, text) => {
                    setDestNeighborhood(item);
                    setDestAddress(text);
                  }}
                  placeholder="جستجو یا انتخاب محله مقصد..."
                  isOrigin={false}
                />
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">به طبقه:</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={destFloor}
                      onChange={(e) => setDestFloor(Number(e.target.value) || 0)}
                      className="w-14 bg-[#090f1d] border border-slate-700 rounded px-2 py-1 text-center text-white font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={destHasElevator}
                      onChange={(e) => setDestHasElevator(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>حق استفاده از آسانسور در مقصد</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Zone Tag & Elevator Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111b2e] px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">تحلیل جغرافیایی مسیر:</span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${detectedZoneInfo.badgeClass}`}>
                  {detectedZoneInfo.zoneType}
                </span>
                {detectedZoneInfo.requiresDeposit && (
                  <span className="text-[10px] text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                    * الزامی بودن واریز بیعانه
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-[11px]">
                مجموع طبقات بدون آسانسور: <strong className="font-mono text-amber-300 font-bold">{toFaDigits(effectiveTotalFloors)} طبقه</strong>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TWO-PANE DUAL TABLE SELECTOR (Exact layout inspired by software screenshot) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            
            {/* LEFT PANE (lg:col-span-6): Selected Items (جزئیات سفارش) */}
            <div className="lg:col-span-6 bg-[#090f1d] border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white">جزئیات سفارش (اقلام و خدمات انتخابی)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {toFaDigits(selectedOrderItems.length)} قلم انتخاب شده
                </span>
              </div>

              {/* Selected Items Table */}
              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#111b2e] text-slate-300 font-bold text-[11px]">
                    <tr>
                      <th className="p-2 text-center w-8">ردیف</th>
                      <th className="p-2">شرح کالا / خدمت</th>
                      <th className="p-2 text-center">واحد</th>
                      <th className="p-2 text-center">تعداد</th>
                      <th className="p-2 text-center">طبقه/ساعت</th>
                      <th className="p-2 text-left">مبلغ کل (ریال)</th>
                      <th className="p-2 text-center w-8">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {selectedOrderItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                          هنوز آیتمی از جدول کاتالوگ سمت راست انتخاب نشده است.
                        </td>
                      </tr>
                    ) : (
                      selectedOrderItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="p-2 text-center font-mono text-slate-400">{toFaDigits(idx + 1)}</td>
                          <td className="p-2">
                            <div className="font-bold text-slate-100">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">کد: {item.code} ({item.categoryName})</div>
                          </td>
                          <td className="p-2 text-center text-slate-300 text-[11px]">{item.unit}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  item.quantity > 1 &&
                                  handleUpdateLineItem(item.id, { quantity: item.quantity - 1 })
                                }
                                className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-white px-1">{toFaDigits(item.quantity)}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateLineItem(item.id, { quantity: item.quantity + 1 })
                                }
                                className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {item.floorExtraRateRial && item.floorExtraRateRial > 0 ? (
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={item.floorCount || 0}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, { floorCount: Number(e.target.value) || 0 })
                                  }
                                  className="w-10 bg-[#111b2e] border border-slate-700 rounded text-center text-amber-300 font-mono py-0.5 text-xs"
                                />
                                <span className="text-slate-400 text-[10px]">طبقه</span>
                              </div>
                            ) : item.extraHourRateRial && item.extraHourRateRial > 0 ? (
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={item.extraHours || 0}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, { extraHours: Number(e.target.value) || 0 })
                                  }
                                  className="w-10 bg-[#111b2e] border border-slate-700 rounded text-center text-blue-300 font-mono py-0.5 text-xs"
                                />
                                <span className="text-slate-400 text-[10px]">ساعت اضافه</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono">-</span>
                            )}
                          </td>
                          <td className="p-2 text-left font-mono font-bold text-amber-400">
                            {toFaDigits(item.totalPriceRial.toLocaleString('fa-IR'))}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-[#111b2e] border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>مجموع هزینه اقلام و خدمات:</span>
                  <span className="font-mono font-bold text-white">
                    {toFaDigits(calculatedGrandTotalRial.toLocaleString('fa-IR'))} ریال
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>مبلغ پیش‌پرداخت (واریزی):</span>
                  <span className="font-mono text-emerald-400">
                    - {toFaDigits(advancePaymentRial.toLocaleString('fa-IR'))} ریال
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-1.5 text-sm font-black">
                  <span className="text-amber-400">مانده قابل پرداخت در مقصد:</span>
                  <span className="font-mono text-amber-400">
                    {toFaDigits(remainingBalanceRial.toLocaleString('fa-IR'))} ریال
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT PANE (lg:col-span-6): Catalog Table (شرح کالا/خدمت) */}
            <div className="lg:col-span-6 bg-[#090f1d] border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white">کاتالوگ خدمات و تعرفه‌های حامی</span>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
                  <input
                    type="text"
                    placeholder="فیلتر شرح کالا..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="bg-[#111b2e] border border-slate-700 rounded-lg pr-7 pl-2 py-1 text-[11px] text-white placeholder-slate-500 w-36 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setCatalogCategoryFilter('ALL')}
                  className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition ${
                    catalogCategoryFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  همه ({toFaDigits(SEDAGHAT_SERVICES_CATALOG.length)})
                </button>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCatalogCategoryFilter(key)}
                    className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition ${
                      catalogCategoryFilter === key
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Catalog Items Table */}
              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#111b2e] text-slate-300 font-bold text-[11px]">
                    <tr>
                      <th className="p-2">شرح کالا / خدمت</th>
                      <th className="p-2 text-center">واحد</th>
                      <th className="p-2 text-center">نوع</th>
                      <th className="p-2 text-left">مبلغ (ریال)</th>
                      <th className="p-2 text-center">مدت/طبقه</th>
                      <th className="p-2 text-center w-12">افزودن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredCatalogItems.map((catItem) => (
                      <tr
                        key={catItem.id}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => handleAddCatalogItemToOrder(catItem)}
                      >
                        <td className="p-2">
                          <div className="font-bold text-slate-100 group-hover:text-amber-300 transition">
                            {catItem.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{catItem.code}</div>
                        </td>
                        <td className="p-2 text-center text-slate-300 text-[11px]">{catItem.unit}</td>
                        <td className="p-2 text-center">
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                            {catItem.categoryName}
                          </span>
                        </td>
                        <td className="p-2 text-left font-mono font-bold text-slate-200">
                          {toFaDigits(catItem.unitPriceRial.toLocaleString('fa-IR'))}
                        </td>
                        <td className="p-2 text-center text-[10px] font-mono text-slate-400">
                          {catItem.baseHours ? `${toFaDigits(catItem.baseHours)} ساعت` : catItem.floorExtraRateRial ? `طبقه ${toFaDigits((catItem.floorExtraRateRial/1000000).toFixed(1))} م` : '-'}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddCatalogItemToOrder(catItem);
                            }}
                            className="w-6 h-6 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg flex items-center justify-center transition"
                            title="افزودن به سفارش"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Dispatcher Notes & Action Buttons (Exact functions from photo) */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-xl p-3.5 space-y-3">
            {/* Dispatcher Fleet & Driver Assignment (Morning Queue & Handover Integration) */}
            <div className="bg-[#111b2e] border border-amber-500/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>تخصیص خودرو و راننده دیسپچ (از صف نوبت صبحگاهی):</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  قانون سیستم: ماشینی که راننده ندارد امکان اختصاص سرویس ندارد
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">خودرو ناوگان:</label>
                    <button
                      type="button"
                      onClick={() => {
                        const queuedVeh =
                          vehicles.find(
                            (v) => v.queueStatus === 'IN_QUEUE' && v.driverName && v.driverName !== 'بدون راننده'
                          ) || vehicles.find((v) => v.driverName && v.driverName !== 'بدون راننده');
                        if (queuedVeh) {
                          setAssignedVehicleCode(queuedVeh.code);
                          setAssignedDriverName(queuedVeh.driverName);
                        }
                      }}
                      className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                      title="اعمال اولین راننده و خودروی نوبت در صف طبق دستورالعمل"
                    >
                      <Zap className="w-2.5 h-2.5 fill-amber-400" />
                      <span>دستورالعمل صف نوبت</span>
                    </button>
                  </div>
                  <select
                    value={assignedVehicleCode || ''}
                    onChange={(e) => {
                      const code = e.target.value ? Number(e.target.value) : undefined;
                      setAssignedVehicleCode(code);
                      const veh = vehicles.find((v) => v.code === code);
                      if (veh && veh.driverName && veh.driverName !== 'بدون راننده') {
                        setAssignedDriverName(veh.driverName);
                      }
                    }}
                    className="w-full bg-[#0a101f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- بدون تخصیص خودرو فعلاً --</option>
                    <optgroup label="✅ در صف نوبت بارگیری (مجاز و اولویت‌دار)">
                      {vehicles
                        .filter((v) => v.queueStatus === 'IN_QUEUE' && v.driverName && v.driverName !== 'بدون راننده')
                        .map((v) => (
                          <option key={v.id} value={v.code}>
                            کد {toFaDigits(v.code)}: {v.driverName} ⟵ پلاک {v.plateNumber} ({VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType} - نوبت {toFaDigits(v.queueNumber || 1)})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="⏳ سایر خودروهای دارای راننده و پلاک">
                      {vehicles
                        .filter(
                          (v) =>
                            v.queueStatus !== 'IN_QUEUE' &&
                            v.driverName &&
                            v.driverName !== 'بدون راننده' &&
                            v.status !== 'IN_MAINTENANCE'
                        )
                        .map((v) => (
                          <option key={v.id} value={v.code}>
                            کد {toFaDigits(v.code)}: {v.driverName} ⟵ پلاک {v.plateNumber} ({VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="⛔ خودروهای بدون راننده (مسدود - غیرمجاز)">
                      {vehicles
                        .filter((v) => !v.driverName || v.driverName === 'بدون راننده')
                        .map((v) => (
                          <option key={v.id} value={v.code} disabled className="text-slate-500 bg-slate-900">
                            کد {toFaDigits(v.code)} - {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType} (⛔ فاقد راننده)
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  {assignedVehicleCode && (() => {
                    const matchedVeh = vehicles.find((v) => v.code === assignedVehicleCode);
                    return (
                      <div className="mt-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-1.5 flex items-center justify-between gap-2">
                        <span>اختصاص‌یافته به: <strong className="text-white">{assignedDriverName || matchedVeh?.driverName}</strong></span>
                        {matchedVeh?.plateNumber && (
                          <IranianPlate plateNumber={matchedVeh.plateNumber} size="xs" />
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    انتخاب راننده ناوگان:
                  </label>
                  <select
                    value={assignedDriverName || ''}
                    onChange={(e) => {
                      const dName = e.target.value;
                      setAssignedDriverName(dName);
                      if (dName) {
                        const matchedVeh = vehicles.find((v) => v.driverName === dName);
                        if (matchedVeh) {
                          setAssignedVehicleCode(matchedVeh.code);
                        }
                      }
                    }}
                    className="w-full bg-[#0a101f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- انتخاب راننده از ناوگان --</option>
                    <optgroup label="✅ در صف نوبت صبحگاهی (اولویت دیسپچ)">
                      {vehicles
                        .filter((v) => v.queueStatus === 'IN_QUEUE' && v.driverName && v.driverName !== 'بدون راننده')
                        .map((v) => (
                          <option key={v.id} value={v.driverName}>
                            {v.driverName} (پلاک {v.plateNumber} - نوبت {toFaDigits(v.queueNumber || 1)})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="⏳ سایر رانندگان ناوگان">
                      {vehicles
                        .filter(
                          (v) =>
                            v.queueStatus !== 'IN_QUEUE' &&
                            v.driverName &&
                            v.driverName !== 'بدون راننده' &&
                            v.status !== 'IN_MAINTENANCE'
                        )
                        .map((v) => (
                          <option key={v.id} value={v.driverName}>
                            {v.driverName} (پلاک {v.plateNumber})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">سفارش گیرنده (اپراتور)</label>
                <input
                  type="text"
                  value={dispatcherName}
                  onChange={(e) => setDispatcherName(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">هماهنگ کننده</label>
                <input
                  type="text"
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">توضیحات قابل چاپ در فاکتور و بارنامه</label>
                <input
                  type="text"
                  placeholder="ملاحظات بارگیری، پتوپیچی، مجوز تردد و..."
                  value={printableNotes}
                  onChange={(e) => setPrintableNotes(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isCustomerConfirmed}
                    onChange={(e) => setIsCustomerConfirmed(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>با مشتری تلفنی هماهنگ شد</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveAndSubmit('DRAFT')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-700"
                >
                  ذخیره به عنوان ناتمام / پیش‌نویس
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAndSubmit('OPEN_INVOICE')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
                >
                  <Receipt className="w-4 h-4" />
                  <span>ثبت و چاپ پیش‌فاکتور</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAndSubmit('OPEN_WAYBILL')}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/25"
                >
                  <FileText className="w-4 h-4" />
                  <span>ثبت سفارش و صدور بارنامه رسمی</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TEHRAN ZONE PRICING MATRIX & SCRIPT VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'ZONE_MATRIX' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <TehranZonePricingMatrix
            rates={reservationRates}
            onUpdateRates={handleUpdateReservationRates}
            showToast={showToast}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. WAYBILLS & INVOICES ARCHIVE VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'WAYBILLS' && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <FolderArchive className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-black text-white">بایگانی بارنامه‌های رسمی و اسناد تمبردار</h3>
                <span className="text-[11px] text-slate-400">کلیه بارنامه‌های رسمی صادر شده با قابلیت چاپ مجدد و استعلام</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {orders
              .filter((o) => o.waybill || o.invoice)
              .map((order) => (
                <div
                  key={order.id}
                  className="bg-[#090f1d] border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {order.waybill?.waybillNumber || order.orderNumber}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      بارنامه رسمی
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div>مشتری: <strong className="text-white">{order.customerName}</strong></div>
                    <div>مسیر: {order.originCity} ➔ {order.destinationCity}</div>
                    <div className="text-amber-400 font-mono font-bold">
                      کرایه: {toFaDigits(order.estimatedFareRial.toLocaleString('fa-IR'))} ریال
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    {order.waybill && (
                      <button
                        onClick={() => setPrintingWaybillOrder(order)}
                        className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>چاپ بارنامه</span>
                      </button>
                    )}
                    {order.invoice && (
                      <button
                        onClick={() => setPrintingInvoiceOrder(order)}
                        className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>چاپ صورتحساب</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {convertingOrder && (
        <ConvertToWaybillOrInvoiceModal
          order={convertingOrder}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setConvertingOrder(null)}
          onSaveConversion={(orderId, waybill, invoice) => {
            const updated = {
              ...convertingOrder,
              waybill: waybill || convertingOrder.waybill,
              invoice: invoice || convertingOrder.invoice,
              assignedDriverName: waybill?.driverName || convertingOrder.assignedDriverName,
              assignedVehiclePlate: waybill?.vehiclePlate || convertingOrder.assignedVehiclePlate,
              assignedVehicleCode: waybill?.vehicleCode || convertingOrder.assignedVehicleCode,
              status: 'COMPLETED' as OrderStatus,
            };
            onUpdateOrder(updated);
            setConvertingOrder(null);
            if (waybill) setPrintingWaybillOrder(updated);
          }}
          onSave={(orderId, waybill, invoice) => {
            const updated = {
              ...convertingOrder,
              waybill: waybill || convertingOrder.waybill,
              invoice: invoice || convertingOrder.invoice,
              assignedDriverName: waybill?.driverName || convertingOrder.assignedDriverName,
              assignedVehiclePlate: waybill?.vehiclePlate || convertingOrder.assignedVehiclePlate,
              assignedVehicleCode: waybill?.vehicleCode || convertingOrder.assignedVehicleCode,
              status: 'COMPLETED' as OrderStatus,
            };
            onUpdateOrder(updated);
            setConvertingOrder(null);
            if (waybill) setPrintingWaybillOrder(updated);
          }}
        />
      )}

      {printingWaybillOrder && printingWaybillOrder.waybill && (
        <WaybillPrintModal
          order={printingWaybillOrder}
          waybill={printingWaybillOrder.waybill}
          onClose={() => setPrintingWaybillOrder(null)}
        />
      )}

      {printingInvoiceOrder && printingInvoiceOrder.invoice && (
        <InvoicePrintModal
          order={printingInvoiceOrder}
          invoice={printingInvoiceOrder.invoice}
          onClose={() => setPrintingInvoiceOrder(null)}
        />
      )}

      {viewingDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#111b2e] border border-slate-700 w-full max-w-2xl rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">جزئیات سفارش «{viewingDetailOrder.orderNumber}»</h3>
              </div>
              <button
                onClick={() => setViewingDetailOrder(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div>نام مشتری: <strong className="text-white">{viewingDetailOrder.customerName}</strong></div>
              <div>شماره تماس: <strong className="text-white font-mono">{toFaDigits(viewingDetailOrder.customerPhone)}</strong></div>
              <div>مبدأ: {viewingDetailOrder.originCity} ({viewingDetailOrder.originAddress})</div>
              <div>مقصد: {viewingDetailOrder.destinationCity} ({viewingDetailOrder.destinationAddress})</div>
              <div>مبلغ برآورد: <strong className="text-amber-400 font-mono">{toFaDigits(viewingDetailOrder.estimatedFareRial.toLocaleString('fa-IR'))} ریال</strong></div>
              <div>سفارش‌گیرنده: <strong className="text-white">{viewingDetailOrder.dispatcherName || 'دیسپچ مرکزی'}</strong></div>
            </div>

            {viewingDetailOrder.orderItemsDetail && viewingDetailOrder.orderItemsDetail.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-amber-300">اقلام و خدمات محاسبه شده:</span>
                <div className="bg-[#090f1d] p-2.5 rounded-xl space-y-1 text-xs text-slate-300 max-h-48 overflow-y-auto">
                  {viewingDetailOrder.orderItemsDetail.map((it, i) => (
                    <div key={i} className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span>{it.name} ({toFaDigits(it.quantity)} {it.unit})</span>
                      <span className="font-mono text-amber-400">{toFaDigits(it.totalPriceRial.toLocaleString('fa-IR'))} ریال</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingDetailOrder(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cargo Live Tracking Modal */}
      {trackingOrder && (
        <CargoTrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </div>
  );
};
