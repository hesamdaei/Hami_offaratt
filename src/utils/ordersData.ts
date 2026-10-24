import { OrderLineItem } from './sedaghatBarCatalog';

export type OrderStatus =
  | 'COORDINATION' // موکول به هماهنگی
  | 'NORMAL' // عادی (در انتظار تخصیص / تأیید)
  | 'IN_PROGRESS' // در حال انجام (تخصیص یافته و در مسیر)
  | 'COMPLETED'; // انجام شده / بارنامه صادر شده

export type OrderSource = 'MANUAL' | 'ONLINE_PORTAL';

export type OrderCategoryType = 'CONTRACTOR' | 'COMPANY' | 'MISC';
export type CustomerType = 'INDIVIDUAL' | 'LEGAL';

export interface WaybillDetails {
  waybillNumber: string;
  issueDate: string;
  senderName: string;
  senderPhone?: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone?: string;
  receiverAddress: string;
  cargoType: string;
  cargoWeightTon: number;
  cargoPackageCount?: number;
  declaredValueRial?: number;
  insuranceAmountRial?: number;
  driverName: string;
  driverPhone?: string;
  vehiclePlate: string;
  vehicleCode?: number;
  shippingCostRial: number;
  notes?: string;
  createdAt: string;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  customerEconomicCode?: string;
  customerPhone?: string;
  customerAddress?: string;
  baseFreightRial: number;
  loadingUnloadingCostRial?: number;
  stopoverCostRial?: number;
  insuranceFeeRial?: number;
  taxPercent: number; // e.g. 10%
  taxAmountRial: number;
  discountRial?: number;
  totalPayableRial: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'CREDIT_30_DAYS' | 'PARTIAL';
  paymentMethod?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'POS';
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  totalOrderNumber?: string; // شماره کل
  preOrderNumber?: string; // ش پیش سفارش
  referralCode?: string; // کد معرف
  orderCategoryType?: OrderCategoryType; // نوع سفارش: پیمانکار / شرکت / متفرقه
  customerType?: CustomerType; // حقیقی / حقوقی
  customerName: string;
  customerPhone: string;
  customerCompany?: string;
  nationalCode?: string; // کد ملی مشتری
  acquisitionChannel?: string; // نحوه آشنایی
  orderDate: string;
  loadingTime?: string;
  approximateEndTime?: string; // پایان تقریبی
  originCity: string;
  originNeighborhood?: string;
  originAddress: string;
  originFloor?: number; // از طبقه
  originHasElevator?: boolean; // حق استفاده از آسانسور در مبدأ
  destinationCity: string;
  destinationNeighborhood?: string;
  destinationAddress: string;
  destFloor?: number; // به طبقه
  destHasElevator?: boolean; // حق استفاده از آسانسور در مقصد
  cargoDescription: string;
  cargoWeightTon: number;
  packageCount?: number;
  requestedVehicleType: string; // خاور، هیوندا، ایسوزو، تریلی، نیسان و...
  estimatedFareRial: number;
  advancePaymentRial?: number; // پیش پرداخت ریال
  remainingPaymentRial?: number; // باقیمانده حساب
  isPrepaymentBypassed?: boolean; // اقدام بدون کنترل پیش پرداخت
  isCustomerConfirmed?: boolean; // با مشتری هماهنگ شد
  isPostponedToCoordination?: boolean; // موکول به هماهنگی
  dispatcherName?: string; // سفارش‌گیرنده (مثلاً مسئول دیسپچ)
  coordinatorName?: string; // هماهنگ کننده
  printableNotes?: string; // توضیحات قابل چاپ
  coordinationNotes?: string; // توضیحات تکمیلی
  orderItemsDetail?: OrderLineItem[]; // لیست اقلام انتخابی از کاتالوگ
  paymentType: 'PREPAID' | 'POSTPAID' | 'CREDIT';
  status: OrderStatus;
  source: OrderSource;
  assignedDriverName?: string;
  assignedVehicleCode?: number;
  assignedVehiclePlate?: string;
  completionDate?: string;
  waybill?: WaybillDetails;
  invoice?: InvoiceDetails;
  createdAt: string;
}

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
  }
> = {
  COORDINATION: {
    label: 'موکول به هماهنگی',
    shortLabel: 'هماهنگی',
    description: 'نیاز به هماهنگی مجدد زمان بارگیری یا شرایط محموله با مشتری و انبار',
    badgeBg: 'bg-amber-950/40',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-700/60',
    dotColor: '#f59e0b',
  },
  NORMAL: {
    label: 'عادی / در انتظار تخصیص',
    shortLabel: 'عادی',
    description: 'تأیید شده و در صف تخصیص خودرو و راننده ناوگان',
    badgeBg: 'bg-blue-950/40',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-700/60',
    dotColor: '#3b82f6',
  },
  IN_PROGRESS: {
    label: 'در حال انجام',
    shortLabel: 'در حال حمل',
    description: 'خودرو و راننده تخصیص یافته و عملیات بارگیری یا حمل در جریان است',
    badgeBg: 'bg-purple-950/40',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-700/60',
    dotColor: '#a855f7',
  },
  COMPLETED: {
    label: 'انجام شده',
    shortLabel: 'تکمیل شده',
    description: 'تخلیه در مقصد نهایی تأیید شده، آماده صدور بارنامه و صورتحساب',
    badgeBg: 'bg-emerald-950/40',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-700/60',
    dotColor: '#10b981',
  },
};

export const INITIAL_ORDERS: OrderItem[] = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-1403/9201',
    customerName: 'مهندس حسینی',
    customerPhone: '09121112233',
    customerCompany: 'صنایع الکترونیک پارس',
    orderDate: '۱۴۰۳/۰۶/۱۰',
    loadingTime: '۰۸:۳۰',
    originCity: 'تهران',
    originAddress: 'بزرگراه فتح، کیلومتر ۷، خیابان ۱۷ شهریور، پلاک ۲۴',
    destinationCity: 'قزوین',
    destinationAddress: 'شهرک صنعتی کاسپین، فاز ۲، بلوار پژوهش، کارخانه سپهر',
    cargoDescription: 'تجهیزات روشنایی و بردهای الکترونیک صنعتی (پالت‌شده)',
    cargoWeightTon: 4.5,
    packageCount: 18,
    requestedVehicleType: 'خاور مسقف',
    estimatedFareRial: 68000000,
    paymentType: 'CREDIT',
    status: 'IN_PROGRESS',
    source: 'MANUAL',
    assignedDriverName: 'رضا مرادی',
    assignedVehicleCode: 3,
    assignedVehiclePlate: '۷۶ ع ۸۵۱ - ایران ۶۶',
    coordinationNotes: 'تحویل‌گیرنده در مقصد مهندس کمالی - قبل از ورود به کارخانه با انتظامات هماهنگ شود.',
    createdAt: '1403-06-10T08:00:00Z',
  },
  {
    id: 'ord-102',
    orderNumber: 'ORD-1403/9202',
    customerName: 'حاج احمد کریمی',
    customerPhone: '09123456789',
    customerCompany: 'بازرگانی آریا فولاد',
    orderDate: '۱۴۰۳/۰۶/۱۰',
    loadingTime: '۱۰:۰۰',
    originCity: 'تهران',
    originAddress: 'شورآباد، خیابان ۶۰ متری امام حسین، انبار مرکزی آریا',
    destinationCity: 'کرج',
    destinationAddress: 'شهرک صنعتی سیمین‌دشت، خیابان هفتم شرقی، سوله ۳',
    cargoDescription: 'پروفیل آلومینیوم و لوله‌های صنعتی ۳ متری',
    cargoWeightTon: 3.2,
    packageCount: 8,
    requestedVehicleType: 'ایسوزو روباز',
    estimatedFareRial: 52000000,
    paymentType: 'POSTPAID',
    status: 'NORMAL',
    source: 'ONLINE_PORTAL',
    coordinationNotes: 'لیفتراک برای بارگیری و تخلیه آماده است. نیازی به کارگر همراه نیست.',
    createdAt: '1403-06-10T09:15:00Z',
  },
  {
    id: 'ord-103',
    orderNumber: 'ORD-1403/9203',
    customerName: 'خانم دکتر صادقی',
    customerPhone: '09127890123',
    customerCompany: 'داروسازی شفا فارمد',
    orderDate: '۱۴۰۳/۰۶/۰۹',
    loadingTime: '۱۴:۰۰',
    originCity: 'تهران',
    originAddress: 'جاده مخصوص کرج، کیلومتر ۱۱، انبار دارویی',
    destinationCity: 'اصفهان',
    destinationAddress: 'شهرک صنعتی جی، خیابان ششم، مرکز پخش البرز دارو',
    cargoDescription: 'کارتن‌های سرم و مکمل دارویی بسته‌بندی استریل',
    cargoWeightTon: 4.8,
    packageCount: 120,
    requestedVehicleType: 'هیوندا مسقف فلزی',
    estimatedFareRial: 145000000,
    paymentType: 'CREDIT',
    status: 'COMPLETED',
    source: 'MANUAL',
    assignedDriverName: 'علی رضایی',
    assignedVehicleCode: 1,
    assignedVehiclePlate: '۴۵ ع ۱۲۳ - ایران ۲۲',
    completionDate: '۱۴۰۳/۰۶/۰۹ - ۱۸:۳۰',
    waybill: {
      waybillNumber: 'BL-1403/8904',
      issueDate: '۱۴۰۳/۰۶/۰۹',
      senderName: 'داروسازی شفا فارمد',
      senderPhone: '02144901234',
      senderAddress: 'جاده مخصوص کرج، کیلومتر ۱۱',
      receiverName: 'مرکز پخش البرز دارو اصفهان',
      receiverPhone: '03135728901',
      receiverAddress: 'شهرک صنعتی جی اصفهان، خیابان ۶',
      cargoType: 'دارو و مکمل پزشکی',
      cargoWeightTon: 4.8,
      cargoPackageCount: 120,
      declaredValueRial: 1800000000,
      insuranceAmountRial: 18000000,
      driverName: 'علی رضایی',
      driverPhone: '09121111111',
      vehiclePlate: '۴۵ ع ۱۲۳ - ایران ۲۲',
      vehicleCode: 1,
      shippingCostRial: 145000000,
      notes: 'حمل در دمای کنترل شده و خشک - تخلیه بدون کسری انجام شد.',
      createdAt: '1403-06-09T18:40:00Z',
    },
    invoice: {
      invoiceNumber: 'INV-1403/7712',
      issueDate: '۱۴۰۳/۰۶/۰۹',
      customerName: 'داروسازی شفا فارمد',
      customerEconomicCode: '411398765412',
      customerPhone: '02144901234',
      customerAddress: 'تهران، جاده مخصوص کرج، کیلومتر ۱۱',
      baseFreightRial: 145000000,
      loadingUnloadingCostRial: 10000000,
      stopoverCostRial: 0,
      insuranceFeeRial: 14500000,
      taxPercent: 10,
      taxAmountRial: 16950000,
      discountRial: 5000000,
      totalPayableRial: 181450000,
      paymentStatus: 'CREDIT_30_DAYS',
      paymentMethod: 'BANK_TRANSFER',
      dueDate: '۱۴۰۳/۰۷/۰۹',
      notes: 'صورتحساب رسمی صادر و در پرتال مالی مشتری ثبت گردید.',
      createdAt: '1403-06-09T19:00:00Z',
    },
    createdAt: '1403-06-09T10:00:00Z',
  },
  {
    id: 'ord-104',
    orderNumber: 'ORD-1403/9204',
    customerName: 'سرکار خانم توکلی',
    customerPhone: '09351234567',
    customerCompany: 'پخش زنجیره‌ای ماد استایل',
    orderDate: '۱۴۰۳/۰۶/۱۱',
    loadingTime: '۱۱:۰۰',
    originCity: 'تهران',
    originAddress: 'خیابان مولوی، جنب پاساژ وحدت، انبار پوشاک',
    destinationCity: 'تبریز',
    destinationAddress: 'جاده سنتو، مجتمع تجاری اطلس، انبار شماره ۲',
    cargoDescription: 'پوشاک زمستانه و منسوجات کانتینری',
    cargoWeightTon: 3.8,
    packageCount: 95,
    requestedVehicleType: 'خاور مسقف چادری',
    estimatedFareRial: 138000000,
    paymentType: 'PREPAID',
    status: 'COORDINATION',
    source: 'ONLINE_PORTAL',
    coordinationNotes: 'انبار مقصد فقط روزهای زوج امکان تخلیه دارد. منتظر تأیید نهایی تاریخ توسط سرپرست انبار تبریز هستیم.',
    createdAt: '1403-06-10T11:30:00Z',
  },
  {
    id: 'ord-105',
    orderNumber: 'ORD-1403/9205',
    customerName: 'مهندس بهرامی',
    customerPhone: '09129998877',
    customerCompany: 'توسعه سازه پایا',
    orderDate: '۱۴۰۳/۰۶/۰۸',
    loadingTime: '۰۷:۰۰',
    originCity: 'تهران',
    originAddress: 'شمس‌آباد، بلوار بوستان، کارگاه سازه فلزی',
    destinationCity: 'ساوه',
    destinationAddress: 'شهرک صنعتی کاوه، انتهای خیابان هفتم، کارخانه کاوه پلاست',
    cargoDescription: 'استراکچرهای فلزی سبک و متعلقات سوله',
    cargoWeightTon: 5.0,
    packageCount: 14,
    requestedVehicleType: 'خاور روباز بغل‌بازشو',
    estimatedFareRial: 74000000,
    paymentType: 'POSTPAID',
    status: 'COMPLETED',
    source: 'MANUAL',
    assignedDriverName: 'حسن غلامی',
    assignedVehicleCode: 7,
    assignedVehiclePlate: '۸۸ ع ۳۲۱ - ایران ۳۳',
    completionDate: '۱۴۰۳/۰۶/۰۸ - ۱۶:۰۰',
    createdAt: '1403-06-08T06:30:00Z',
  },
];
