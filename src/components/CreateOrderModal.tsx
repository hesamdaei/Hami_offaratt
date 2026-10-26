import React, { FC, useState, useMemo } from 'react';
import { OrderItem, OrderStatus, OrderSource, ORDER_STATUS_CONFIG } from '../utils/ordersData';
import {
  VehicleItem,
  DriverDirectoryItem,
  VEHICLE_TYPE_NAMES,
  checkVehicleServiceEligibility,
} from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { getTodayJalaali, toFaDigits } from '../utils/jalaali';
import {
  PackagePlus,
  Globe,
  User,
  Phone,
  Building,
  MapPin,
  Truck,
  DollarSign,
  FileText,
  X,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  AlertTriangle,
  KeyRound,
  Zap,
} from 'lucide-react';

interface CreateOrderModalProps {
  onClose: () => void;
  onSaveOrder: (newOrder: OrderItem) => void;
  vehicles: VehicleItem[];
  drivers: DriverDirectoryItem[];
  initialMode?: 'MANUAL' | 'ONLINE_PORTAL';
}

export const CreateOrderModal: FC<CreateOrderModalProps> = ({
  onClose,
  onSaveOrder,
  vehicles,
  drivers,
  initialMode = 'MANUAL',
}) => {
  const today = getTodayJalaali();
  const [sourceMode, setSourceMode] = useState<OrderSource>(initialMode);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [originCity, setOriginCity] = useState('تهران');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationCity, setDestinationCity] = useState('قزوین');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [cargoWeightTon, setCargoWeightTon] = useState<number>(3.5);
  const [packageCount, setPackageCount] = useState<number>(10);
  const [requestedVehicleType, setRequestedVehicleType] = useState('خاور مسقف');
  const [estimatedFareRial, setEstimatedFareRial] = useState<number>(65000000);
  const [paymentType, setPaymentType] = useState<'PREPAID' | 'POSTPAID' | 'CREDIT'>('CREDIT');
  const [status, setStatus] = useState<OrderStatus>('NORMAL');
  const [loadingTime, setLoadingTime] = useState('۰۹:۰۰');
  const [coordinationNotes, setCoordinationNotes] = useState('');
  
  // Assignment
  const [assignedDriverName, setAssignedDriverName] = useState<string>('');
  const [assignedVehicleCode, setAssignedVehicleCode] = useState<number | undefined>(undefined);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const handleVehicleChange = (codeStr: string) => {
    setAssignmentError(null);
    if (!codeStr) {
      setAssignedVehicleCode(undefined);
      return;
    }
    const code = Number(codeStr);
    const veh = vehicles.find((v) => v.code === code);
    if (!veh) return;

    if (!veh.driverName || veh.driverName === 'بدون راننده') {
      setAssignmentError('ماشینی که راننده ندارد امکان اختصاص سرویس ندارد.');
      setAssignedVehicleCode(code);
      setAssignedDriverName('');
      return;
    }

    setAssignedVehicleCode(code);
    setAssignedDriverName(veh.driverName);
  };

  const handleDriverSelect = (driverNameVal: string) => {
    setAssignmentError(null);
    setAssignedDriverName(driverNameVal);
    if (!driverNameVal) {
      return;
    }
    const matchedVeh = vehicles.find(
      (v) => v.driverName === driverNameVal && v.driverName !== 'بدون راننده'
    );
    if (matchedVeh) {
      setAssignedVehicleCode(matchedVeh.code);
    }
  };

  const handleApplySopInCreate = () => {
    // Dispatch SOP: prioritize vehicle in queue (lowest queueNumber)
    const inQueueVehicles = vehicles
      .filter((v) => v.queueStatus === 'IN_QUEUE' && v.driverName && v.driverName !== 'بدون راننده')
      .sort((a, b) => (a.queueNumber || 999) - (b.queueNumber || 999));

    const queuedVeh = inQueueVehicles[0] || vehicles.find((v) => v.driverName && v.driverName !== 'بدون راننده');
    if (queuedVeh) {
      setAssignedVehicleCode(queuedVeh.code);
      setAssignedDriverName(queuedVeh.driverName);
      setAssignmentError(null);
    }
  };

  // Rule detections from Dispatch & Reservation Guide
  const isSuburbanOrder = useMemo(() => {
    const suburbanKeywords = [
      'اسلامشهر', 'کرج', 'شهریار', 'پردیس', 'رباط‌کریم', 'رباط کریم',
      'قدس', 'ورامین', 'هشتگرد', 'گیلاوند', 'دماوند', 'فیروزکوه',
      'طالقان', 'رودهن', 'بومهن', 'لواسان', 'فشم'
    ];
    const text = `${originCity} ${destinationCity} ${originAddress} ${destinationAddress}`.toLowerCase();
    return suburbanKeywords.some((k) => text.includes(k));
  }, [originCity, destinationCity, originAddress, destinationAddress]);

  const isSideBySideWithNissan = useMemo(() => {
    const isNissan = requestedVehicleType === 'NISSAN';
    const desc = (cargoDescription || '').toLowerCase();
    const hasSideBySide = desc.includes('ساید') || desc.includes('یخچال');
    return isNissan && hasSideBySide;
  }, [requestedVehicleType, cargoDescription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedVehicle = vehicles.find((v) => v.code === assignedVehicleCode);
    if (selectedVehicle && (!selectedVehicle.driverName || selectedVehicle.driverName === 'بدون راننده')) {
      setAssignmentError('خطا: ماشینی که راننده ندارد امکان اختصاص سرویس ندارد. لطفاً خودرو دارای راننده و در نوبت را انتخاب کنید.');
      return;
    }

    const newOrder: OrderItem = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${today.jy}/${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customerName || (sourceMode === 'ONLINE_PORTAL' ? 'مشتری آنلاین' : 'مشتری بدون نام'),
      customerPhone: customerPhone || '09120000000',
      customerCompany: customerCompany || undefined,
      orderDate: `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`,
      loadingTime,
      originCity,
      originAddress: originAddress || `انبار مرکزی ${originCity}`,
      destinationCity,
      destinationAddress: destinationAddress || `انبار گیرنده در ${destinationCity}`,
      cargoDescription: cargoDescription || 'محموله عمومی و تجاری',
      cargoWeightTon: Number(cargoWeightTon) || 1,
      packageCount: Number(packageCount) || 1,
      requestedVehicleType,
      estimatedFareRial: Number(estimatedFareRial) || 50000000,
      paymentType,
      status,
      source: sourceMode,
      assignedDriverName: assignedDriverName || undefined,
      assignedVehicleCode: assignedVehicleCode || undefined,
      assignedVehiclePlate: selectedVehicle?.plateNumber || undefined,
      coordinationNotes: coordinationNotes || undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveOrder(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none">
      <div className="bg-[#111b2e] border border-[#1f2c45] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-[#18263e] border-b border-[#1f2c45] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-white">
                ثبت سفارش حمل و بارگیری جدید
              </h2>
              <span className="text-[11px] text-slate-400 line-clamp-1">
                درج سفارش دستی دیسپچر یا پیش‌نمایش درگاه آنلاین مشتری
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Switcher Mode */}
        <div className="p-2 sm:p-3 bg-[#0d1627] border-b border-[#1f2c45] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSourceMode('MANUAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                sourceMode === 'MANUAL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-[#18263e] text-slate-300 hover:bg-[#203150] border border-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ثبت دستی توسط دیسپچر</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceMode('ONLINE_PORTAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                sourceMode === 'ONLINE_PORTAL'
                  ? 'bg-blue-600 text-white font-black shadow-md'
                  : 'bg-[#18263e] text-slate-300 hover:bg-[#203150] border border-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-300" />
              <span>پیش‌نمایش پرتال مشتریان</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400 hidden sm:inline">
            {sourceMode === 'ONLINE_PORTAL' ? '🌐 ثبت درگاه آنلاین' : '👤 متصدی باربری'}
          </span>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Status and Initial Pipeline */}
          <div className="bg-[#142036] border border-slate-700/60 rounded-xl p-3">
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              وضعیت اولیه سفارش در چرخه کاری:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['COORDINATION', 'NORMAL', 'IN_PROGRESS', 'COMPLETED'] as OrderStatus[]).map((st) => {
                const conf = ORDER_STATUS_CONFIG[st];
                const isSelected = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`p-2 rounded-xl text-right border transition ${
                      isSelected
                        ? `${conf.badgeBg} border-amber-400 ring-1 ring-amber-400 ${conf.badgeText} font-black`
                        : 'bg-[#111b2e] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.dotColor }} />
                      <span>{conf.shortLabel}</span>
                    </div>
                    <div className="text-[10px] opacity-75 line-clamp-1">{conf.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-bold">نام و نام‌خانوادگی مشتری *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: مهندس رحمانی"
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-bold">تلفن تماس مشتری *</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09121234567"
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">نام شرکت / سازمان (اختیاری)</label>
              <input
                type="text"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                placeholder="مثال: بازرگانی پارس فولاد"
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#142036]/50 p-3 rounded-xl border border-slate-800">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                <MapPin className="w-4 h-4" />
                <span>مبدأ و بارگیری</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    placeholder="شهر مبدأ"
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                    placeholder="نشانی دقیق محل بارگیری / انبار"
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <MapPin className="w-4 h-4" />
                <span>مقصد و تخلیه</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    placeholder="شهر مقصد"
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    placeholder="نشانی دقیق مقصد و تحویل‌گیرنده"
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cargo Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1 font-bold">شرح محموله / کالا *</label>
              <input
                type="text"
                value={cargoDescription}
                onChange={(e) => setCargoDescription(e.target.value)}
                placeholder="مثال: قطعات یدکی خودرو / لوله و پروفیل / مواد اولیه"
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">وزن تخمینی (تن)</label>
              <input
                type="number"
                step="0.1"
                value={cargoWeightTon}
                onChange={(e) => setCargoWeightTon(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">تعداد بسته / پالت</label>
              <input
                type="number"
                value={packageCount}
                onChange={(e) => setPackageCount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Vehicle & Fare */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-bold">نوع خودروی درخواستی</label>
              <select
                value={requestedVehicleType}
                onChange={(e) => setRequestedVehicleType(e.target.value)}
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="خاور مسقف">خاور مسقف چادری</option>
                <option value="خاور روباز">خاور روباز بغل‌بازشو</option>
                <option value="هیوندا مسقف">هیوندا مسقف فلزی</option>
                <option value="ایسوزو ۶ تن">ایسوزو ۶ تن</option>
                <option value="تریلی کفی">تریلی کفی / کانتینری</option>
                <option value="نیسان وانت">نیسان وانت مسقف</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-bold">کرایه توافقی برآوردی (ریال)</label>
              <input
                type="number"
                value={estimatedFareRial}
                onChange={(e) => setEstimatedFareRial(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-bold">نوع پرداخت کرایه</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="CREDIT">اعتباری ماهانه شرکتی</option>
                <option value="POSTPAID">پس‌کرایه (در مقصد تخلیه)</option>
                <option value="PREPAID">پیش‌کرایه (مبدأ بارگیری)</option>
              </select>
            </div>
          </div>

          {/* Dispatcher Fleet Assignment (Morning Delivery & Queue Enforced) */}
          <div className="bg-[#142036]/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <KeyRound className="w-3.5 h-3.5" />
                <span>تخصیص خودرو و راننده (تحویل صبحگاهی و صف نوبت):</span>
              </div>
              <button
                type="button"
                onClick={handleApplySopInCreate}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
                title="اعمال اولین خودرو و راننده مجاز حاضر در صف نوبت"
              >
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>اعمال طبق دستورالعمل صف نوبت</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">
                  انتخاب خودرو از ناوگان:
                </label>
                <select
                  value={assignedVehicleCode || ''}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- بدون تخصیص فعلی --</option>
                  
                  <optgroup label="✅ خودروهای حاضر در صف نوبت بارنامه (دارای راننده و پلاک)">
                    {vehicles
                      .filter((v) => v.queueStatus === 'IN_QUEUE' && v.driverName && v.driverName !== 'بدون راننده')
                      .map((v) => (
                        <option key={v.id} value={v.code}>
                          کد {toFaDigits(v.code)}: {v.driverName} ⟵ پلاک {v.plateNumber} ({VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType} - نوبت {toFaDigits(v.queueNumber || 1)})
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="⏳ سایر خودروهای ناوگان دارای راننده و پلاک">
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

                  <optgroup label="⛔ خودروهای بدون راننده (امکان اختصاص سرویس ندارد)">
                    {vehicles
                      .filter((v) => !v.driverName || v.driverName === 'بدون راننده')
                      .map((v) => (
                        <option key={v.id} value={v.code} disabled className="text-slate-500 bg-slate-900">
                          کد {toFaDigits(v.code)} - {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType} (⛔ بدون راننده - مسدود)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">
                  انتخاب راننده ناوگان (اختصاص خودرو و پلاک):
                </label>
                <select
                  value={assignedDriverName || ''}
                  onChange={(e) => handleDriverSelect(e.target.value)}
                  className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- انتخاب راننده از ناوگان --</option>
                  <optgroup label="✅ رانندگان در صف نوبت صبحگاهی">
                    {vehicles
                      .filter((v) => v.queueStatus === 'IN_QUEUE' && v.driverName && v.driverName !== 'بدون راننده')
                      .map((v) => (
                        <option key={v.id} value={v.driverName}>
                          {v.driverName} (کد {toFaDigits(v.code)} - پلاک {v.plateNumber} - نوبت {toFaDigits(v.queueNumber || 1)})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="⏳ سایر رانندگان ناوگان با خودرو اختصاصی">
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
                          {v.driverName} (کد {toFaDigits(v.code)} - پلاک {v.plateNumber})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {assignedVehicleCode && (() => {
              const matchedVeh = vehicles.find((v) => v.code === assignedVehicleCode);
              return matchedVeh && matchedVeh.plateNumber ? (
                <div className="bg-[#0e172a] border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">راننده و خودروی اختصاص‌یافته:</span>
                    <strong className="text-white">{assignedDriverName || matchedVeh.driverName}</strong>
                    <span className="text-slate-400">({VEHICLE_TYPE_NAMES[matchedVeh.vehicleType] || matchedVeh.vehicleType})</span>
                  </div>
                  <IranianPlate plateNumber={matchedVeh.plateNumber} size="xs" />
                </div>
              ) : null;
            })()}

            {/* دستورالعمل بیعانه برای سرویس‌های حومه */}
            {isSuburbanOrder && (
              <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>دستورالعمل بند ۲ دفتر حامی:</strong> مبدا یا مقصد این بار در حومه یا حومه ویژه است؛ دریافت بیعانه از مشتری الزامی می‌باشد.
                </span>
              </div>
            )}

            {/* دستورالعمل ساید‌بای‌ساید با نیسان */}
            {isSideBySideWithNissan && (
              <div className="bg-blue-950/50 border border-blue-500/40 rounded-xl p-2.5 flex items-start gap-2 text-xs text-blue-200">
                <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>دستورالعمل حمل بار:</strong> سفارش شامل یخچال ساید‌بای‌ساید با نیسان است؛ اعزام کارگر ماهر الزامی بوده و راننده به تنهایی مجاز به بارگیری نیست.
                </span>
              </div>
            )}

            {assignmentError && (
              <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-2.5 flex items-center gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{assignmentError}</span>
              </div>
            )}
          </div>

          {/* Coordination Notes */}
          <div>
            <label className="block text-xs text-slate-300 mb-1 font-bold">
              یادداشت‌ها و هماهنگی‌های اختصاصی:
            </label>
            <textarea
              rows={2}
              value={coordinationNotes}
              onChange={(e) => setCoordinationNotes(e.target.value)}
              placeholder="نکات هماهنگی با انبار، ساعت تخلیه، نام تحویل‌گیرنده در مقصد..."
              className="w-full bg-[#142036] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1f2c45]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>ثبت سفارش در سامانه</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
