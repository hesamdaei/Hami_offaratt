import React, { FC, useState, useMemo, useEffect } from 'react';
import {
  PhoneCall,
  Calculator,
  BookOpen,
  Settings2,
  Truck,
  Users,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Printer,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Plus,
  Minus,
  Layers,
  Wrench,
  Flame,
  Info,
  Building2,
  FileSpreadsheet,
  FileCheck2,
  Compass,
  MapPin,
  ArrowRightLeft,
} from 'lucide-react';
import {
  ReservationRates,
  DEFAULT_RESERVATION_RATES,
  ORIGINAL_GUIDE_TEXT,
  NeighborhoodItem,
  TEHRAN_NEIGHBORHOODS,
  ZoneType,
  getSafeReservationRates,
} from '../utils/reservationRates';
import { calculateRouteTariff, RouteTariffResult } from '../utils/tehranZonePricing';
import { QuotationPrintModal } from './QuotationPrintModal';
import { NeighborhoodPicker } from './reservation/NeighborhoodPicker';
import { TehranZonePricingMatrix } from './reservation/TehranZonePricingMatrix';
import { OrderItem } from '../utils/ordersData';
import { getTodayJalaali, toFaDigits } from '../utils/jalaali';

const STORAGE_KEY_RATES = 'sedaghatbar_reservation_rates_v1';

interface ReservationGuideAndCalculatorViewProps {
  onAddOrder?: (order: OrderItem) => void;
  onNavigateToOrders?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReservationGuideAndCalculatorView: FC<ReservationGuideAndCalculatorViewProps> = ({
  onAddOrder,
  onNavigateToOrders,
  showToast,
}) => {
  // Sub-tabs in Reservation View
  const [activeSubTab, setActiveSubTab] = useState<'CALCULATOR' | 'ZONE_MATRIX' | 'CALL_SCRIPT' | 'SETTINGS' | 'GUIDE_TEXT'>('CALCULATOR');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Rates loaded from localStorage or default
  const [rates, setRates] = useState<ReservationRates>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RATES);
      if (saved) {
        return getSafeReservationRates(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return DEFAULT_RESERVATION_RATES;
  });

  // Save rates to local storage
  const handleSaveRates = (newRates: ReservationRates) => {
    const safe = getSafeReservationRates(newRates);
    setRates(safe);
    try {
      localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(safe));
      if (showToast) showToast('نرخ‌ها و تعرفه‌های رزرواسیون با موفقیت به‌روزرسانی شد.', 'success');
    } catch {
      // ignore
    }
  };

  const handleResetRates = () => {
    if (window.confirm('آیا از بازنشانی تمامی تعرفه‌ها به مقادیر پیش‌فرض اطمینان دارید؟')) {
      setRates(DEFAULT_RESERVATION_RATES);
      try {
        localStorage.removeItem(STORAGE_KEY_RATES);
        if (showToast) showToast('تعرفه‌ها به حالت پیش‌فرض بازگردانی شدند.', 'info');
      } catch {
        // ignore
      }
    }
  };

  // ----------------------------------------------------
  // Interactive Calculator State
  // ----------------------------------------------------
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Neighborhood & Zone States
  const [originNeighborhood, setOriginNeighborhood] = useState<NeighborhoodItem | null>(null);
  const [originAddress, setOriginAddress] = useState('');
  const [destNeighborhood, setDestNeighborhood] = useState<NeighborhoodItem | null>(null);
  const [destAddress, setDestAddress] = useState('');
  const [serviceType, setServiceType] = useState<'DOMESTIC' | 'SUBURB' | 'SPECIAL_SUBURB' | 'INTERCITY'>('DOMESTIC');
  const [vehicleType, setVehicleType] = useState<'KHAVAR_VIP' | 'KHAVAR_CANVAS' | 'NISSAN'>('KHAVAR_VIP');
  const [isPacked, setIsPacked] = useState<boolean>(true);

  // Time & Overtime
  const [expectedHours, setExpectedHours] = useState<number>(3);

  // Workers
  const [carrierLaborCount, setCarrierLaborCount] = useState<number>(3);
  const [layoutLaborFemale, setLayoutLaborFemale] = useState<number>(0);
  const [layoutLaborMale, setLayoutLaborMale] = useState<number>(0);
  const [cleaningLaborCount, setCleaningLaborCount] = useState<number>(0);
  const [packerLaborFemale, setPackerLaborFemale] = useState<number>(0);
  const [packerLaborMale, setPackerLaborMale] = useState<number>(0);
  const [technicianCount, setTechnicianCount] = useState<number>(0);

  // Heavy Items
  const [sideBySideCount, setSideBySideCount] = useState<number>(0);
  const [sideBySideFloors, setSideBySideFloors] = useState<number>(1);

  const [diningGlassCount, setDiningGlassCount] = useState<number>(0);
  const [diningGlassFloors, setDiningGlassFloors] = useState<number>(1);

  const [treadmillCount, setTreadmillCount] = useState<number>(0);
  const [treadmillFloors, setTreadmillFloors] = useState<number>(1);

  const [buffetCount, setBuffetCount] = useState<number>(0);
  const [buffetFloors, setBuffetFloors] = useState<number>(1);

  const [sofaBedCount, setSofaBedCount] = useState<number>(0);
  const [sofaBedFloors, setSofaBedFloors] = useState<number>(1);

  // Safes
  const [safeTier, setSafeTier] = useState<'NONE' | 'UNDER_100' | '100_TO_150' | '150_TO_250' | 'ABOVE_250'>('NONE');
  const [safeFloors, setSafeFloors] = useState<number>(1);

  // Walking Distance
  const [walkingMeters, setWalkingMeters] = useState<number>(0);

  // Cargo Declared Value (Tomans) for Insurance
  const [declaredValueMillions, setDeclaredValueMillions] = useState<number>(50); // e.g., 50 million Tomans

  // Consumables Quantities
  const [packStandardQty, setPackStandardQty] = useState<number>(0);
  const [packWalnutQty, setPackWalnutQty] = useState<number>(0);
  const [cartonLaminateQty, setCartonLaminateQty] = useState<number>(0);
  const [cartonRegalQty, setCartonRegalQty] = useState<number>(0);
  const [cellophaneQty, setCellophaneQty] = useState<number>(0);
  const [bubbleWrapQty, setBubbleWrapQty] = useState<number>(0);
  const [carpetCoverQty, setCarpetCoverQty] = useState<number>(0);
  const [mattressSingleQty, setMattressSingleQty] = useState<number>(0);
  const [mattressDoubleQty, setMattressDoubleQty] = useState<number>(0);
  const [tapeQty, setTapeQty] = useState<number>(0);

  // Additional notes
  const [reservationNotes, setReservationNotes] = useState<string>('');

  // ----------------------------------------------------
  // Dynamic Route Tariff Detection
  // ----------------------------------------------------
  const detectedRouteTariff = useMemo(() => {
    return calculateRouteTariff(originNeighborhood, destNeighborhood, rates);
  }, [originNeighborhood, destNeighborhood, rates]);

  // Auto-sync serviceType when neighborhoods change (unless user manually switches to INTERCITY)
  useEffect(() => {
    if (serviceType !== 'INTERCITY') {
      if (detectedRouteTariff.effectiveZoneType === 'SPECIAL_SUBURB') {
        setServiceType('SPECIAL_SUBURB');
        if (expectedHours < 4) setExpectedHours(4);
      } else if (detectedRouteTariff.effectiveZoneType === 'SUBURB') {
        setServiceType('SUBURB');
      } else {
        setServiceType('DOMESTIC');
      }
    }
  }, [detectedRouteTariff.effectiveZoneType]);

  // ----------------------------------------------------
  // Rules Check: Side-by-side on Nissan requires mandatory workers
  // ----------------------------------------------------
  const isNissanWithSideBySide = vehicleType === 'NISSAN' && sideBySideCount > 0;
  const isIntercityUnderstaffed = serviceType === 'INTERCITY' && carrierLaborCount < rates.intercity.minLaborers;
  const isSuburbRequiresDeposit = serviceType === 'SUBURB' || serviceType === 'SPECIAL_SUBURB' || detectedRouteTariff.requiresDeposit;

  // ----------------------------------------------------
  // Dynamic Real-time Calculations
  // ----------------------------------------------------
  const calculation = useMemo(() => {
    // 1. Vehicle Base + Overtime
    let vehicleBasePrice = 0;
    let vehicleBaseHours = 3;
    let vehicleOvertimeRate = 0;

    if (vehicleType === 'NISSAN') {
      if (serviceType === 'SPECIAL_SUBURB' || detectedRouteTariff.effectiveZoneType === 'SPECIAL_SUBURB') {
        vehicleBasePrice = rates.nissanSpecialSuburb.basePrice;
        vehicleBaseHours = rates.nissanSpecialSuburb.baseHours;
        vehicleOvertimeRate = rates.nissanSpecialSuburb.overtimeHourly;
      } else if (serviceType === 'SUBURB' || detectedRouteTariff.effectiveZoneType === 'SUBURB') {
        vehicleBasePrice = rates.nissanSuburb.basePrice;
        vehicleBaseHours = rates.nissanSuburb.baseHours;
        vehicleOvertimeRate = rates.nissanSuburb.overtimeHourly;
      } else {
        vehicleBasePrice = rates.nissanDomestic.basePrice;
        vehicleBaseHours = rates.nissanDomestic.baseHours;
        vehicleOvertimeRate = rates.nissanDomestic.overtimeHourly;
        if (detectedRouteTariff.isCrossZoneInternal) {
          vehicleBasePrice += Math.round(rates.crossZoneInternalSurcharge * 0.6);
        }
      }
    } else {
      // Khavar VIP or Canvas
      if (serviceType === 'SPECIAL_SUBURB' || detectedRouteTariff.effectiveZoneType === 'SPECIAL_SUBURB') {
        vehicleBasePrice = rates.khavarSpecialSuburb.basePrice;
        vehicleBaseHours = rates.khavarSpecialSuburb.baseHours;
        vehicleOvertimeRate = rates.khavarSpecialSuburb.overtimeHourly;
      } else if (serviceType === 'SUBURB' || detectedRouteTariff.effectiveZoneType === 'SUBURB') {
        vehicleBasePrice = rates.khavarSuburb.basePrice;
        vehicleBaseHours = rates.khavarSuburb.baseHours;
        vehicleOvertimeRate = rates.khavarSuburb.overtimeHourly;
      } else {
        vehicleBasePrice = rates.khavarDomestic.basePrice;
        vehicleBaseHours = rates.khavarDomestic.baseHours;
        vehicleOvertimeRate = rates.khavarDomestic.overtimeHourly;
        if (detectedRouteTariff.isCrossZoneInternal) {
          vehicleBasePrice += rates.crossZoneInternalSurcharge;
        }
      }

      if (vehicleType === 'KHAVAR_VIP') {
        vehicleBasePrice = Math.round(vehicleBasePrice * (1 + rates.intercity.vipMoquetteMarkupPercent / 100));
      }
    }

    const vehicleOvertimeHours = Math.max(0, expectedHours - vehicleBaseHours);
    const vehicleOvertimeCost = vehicleOvertimeHours * vehicleOvertimeRate;
    const vehicleTotalCost = vehicleBasePrice + vehicleOvertimeCost;

    // 2. Carrier Labor Costs
    let carrierBasePrice = 0;
    let carrierBaseHours = 3;
    let carrierOvertimeRate = 0;

    if (vehicleType === 'NISSAN') {
      if (serviceType === 'SPECIAL_SUBURB' || serviceType === 'SUBURB') {
        carrierBasePrice = rates.laborNissanSuburb.basePrice;
        carrierBaseHours = rates.laborNissanSuburb.baseHours;
        carrierOvertimeRate = rates.laborNissanSuburb.overtimeHourly;
      } else {
        carrierBasePrice = rates.laborNissanDomestic.basePrice;
        carrierBaseHours = rates.laborNissanDomestic.baseHours;
        carrierOvertimeRate = rates.laborNissanDomestic.overtimeHourly;
      }
    } else {
      if (serviceType === 'SPECIAL_SUBURB') {
        carrierBasePrice = rates.laborSpecialSuburb.basePrice;
        carrierBaseHours = rates.laborSpecialSuburb.baseHours;
        carrierOvertimeRate = rates.laborSpecialSuburb.overtimeHourly;
      } else {
        carrierBasePrice = rates.laborKhavarDomestic.basePrice;
        carrierBaseHours = rates.laborKhavarDomestic.baseHours;
        carrierOvertimeRate = rates.laborKhavarDomestic.overtimeHourly;
      }
    }

    const carrierLaborOvertimeHours = Math.max(0, expectedHours - carrierBaseHours);
    const singleCarrierLaborCost = carrierBasePrice + (carrierLaborOvertimeHours * carrierOvertimeRate);
    const totalCarrierLaborCost = singleCarrierLaborCost * carrierLaborCount;

    // 3. Specialized Staff
    // Layout (خانم و آقا)
    const totalLayoutCount = layoutLaborFemale + layoutLaborMale;
    const layoutOvertimeHours = Math.max(0, expectedHours - rates.layoutLabor.baseHours);
    const singleLayoutCost = rates.layoutLabor.basePrice + (layoutOvertimeHours * rates.layoutLabor.overtimeHourly);
    const totalLayoutCost = singleLayoutCost * totalLayoutCount;

    // Cleaning (نظافت)
    const cleaningOvertimeHours = Math.max(0, expectedHours - rates.cleaningLabor.baseHours);
    const singleCleaningCost = rates.cleaningLabor.basePrice + (cleaningOvertimeHours * rates.cleaningLabor.overtimeHourly);
    const totalCleaningCost = singleCleaningCost * cleaningLaborCount;

    // Packing staff (بسته‌بندی)
    const totalPackerCount = packerLaborFemale + packerLaborMale;
    const packerOvertimeHours = Math.max(0, expectedHours - rates.packerLabor.baseHours);
    const singlePackerCost = rates.packerLabor.basePrice + (packerOvertimeHours * rates.packerLabor.overtimeHourly);
    const totalPackerCost = singlePackerCost * totalPackerCount;

    // Technician / فنی‌کار
    const techOvertimeHours = Math.max(0, expectedHours - rates.technicianLabor.baseHours);
    const singleTechCost = rates.technicianLabor.basePrice + (techOvertimeHours * rates.technicianLabor.overtimeHourly);
    const totalTechCost = singleTechCost * technicianCount;

    const totalAllLaborCost = totalCarrierLaborCost + totalLayoutCost + totalCleaningCost + totalPackerCost + totalTechCost;

    // 4. Heavy Items Costs
    const sideBySideCost = sideBySideCount * sideBySideFloors * rates.heavyItemsFloorRate.refrigeratorLarge;
    const diningGlassCost = diningGlassCount * diningGlassFloors * rates.heavyItemsFloorRate.diningGlassLarge;
    const treadmillCost = treadmillCount * treadmillFloors * rates.heavyItemsFloorRate.treadmill;
    const buffetCost = buffetCount * buffetFloors * rates.heavyItemsFloorRate.buffetCabinet;
    const sofaBedCost = sofaBedCount * sofaBedFloors * rates.heavyItemsFloorRate.sofaBed;

    let safeCost = 0;
    if (safeTier === 'UNDER_100') {
      safeCost = safeFloors * rates.safeRates.under100KgFloor;
    } else if (safeTier === '100_TO_150') {
      safeCost = safeFloors * rates.safeRates.from100To150KgFloor;
    } else if (safeTier === '150_TO_250') {
      safeCost = safeFloors * rates.safeRates.from150To250KgFloor;
    } else if (safeTier === 'ABOVE_250') {
      safeCost = safeFloors * rates.safeRates.above250KgFloor;
    }

    const totalHeavyItemsCost = sideBySideCost + diningGlassCost + treadmillCost + buffetCost + sofaBedCost + safeCost;

    // 5. Walking Distance Cost
    let walkingCost = 0;
    if (walkingMeters > rates.walkingDistance.freeMetersThreshold) {
      walkingCost = walkingMeters * rates.walkingDistance.feePerTotalMeter;
    }

    // 6. Insurance
    const insuranceUnits = Math.ceil(declaredValueMillions / (rates.insurance.perMillions / 1000000));
    const insuranceCost = insuranceUnits * rates.insurance.ratePerUnit;

    // 7. Consumables
    const packStdCost = packStandardQty * rates.packingSupplies.packStandard;
    const packWalnutCost = packWalnutQty * rates.packingSupplies.packWalnut;
    const cartonLamCost = cartonLaminateQty * rates.packingSupplies.cartonLaminate5Layer;
    const cartonRegCost = cartonRegalQty * rates.packingSupplies.cartonRegalWardrobe;
    const cellophaneCost = cellophaneQty * rates.packingSupplies.cellophaneRoll;
    const bubbleCost = bubbleWrapQty * rates.packingSupplies.bubbleWrapMeter;
    const carpetCost = carpetCoverQty * rates.packingSupplies.carpetCoverMeter;
    const matSingleCost = mattressSingleQty * rates.packingSupplies.mattressCoverSingle;
    const matDoubleCost = mattressDoubleQty * rates.packingSupplies.mattressCoverDouble;
    const tapeCost = tapeQty * rates.packingSupplies.adhesiveTape;

    const totalConsumablesCost = packStdCost + packWalnutCost + cartonLamCost + cartonRegCost + cellophaneCost + bubbleCost + carpetCost + matSingleCost + matDoubleCost + tapeCost;

    // Grand Total Estimated Price
    const grandTotal = vehicleTotalCost + totalAllLaborCost + totalHeavyItemsCost + walkingCost + insuranceCost + totalConsumablesCost;

    return {
      vehicleBasePrice,
      vehicleOvertimeCost,
      vehicleTotalCost,
      totalCarrierLaborCost,
      totalLayoutCost,
      totalCleaningCost,
      totalPackerCost,
      totalTechCost,
      totalAllLaborCost,
      sideBySideCost,
      diningGlassCost,
      treadmillCost,
      buffetCost,
      sofaBedCost,
      safeCost,
      totalHeavyItemsCost,
      walkingCost,
      insuranceCost,
      totalConsumablesCost,
      grandTotal,
    };
  }, [
    rates,
    serviceType,
    vehicleType,
    expectedHours,
    carrierLaborCount,
    layoutLaborFemale,
    layoutLaborMale,
    cleaningLaborCount,
    packerLaborFemale,
    packerLaborMale,
    technicianCount,
    sideBySideCount,
    sideBySideFloors,
    diningGlassCount,
    diningGlassFloors,
    treadmillCount,
    treadmillFloors,
    buffetCount,
    buffetFloors,
    sofaBedCount,
    sofaBedFloors,
    safeTier,
    safeFloors,
    walkingMeters,
    declaredValueMillions,
    packStandardQty,
    packWalnutQty,
    cartonLaminateQty,
    cartonRegalQty,
    cellophaneQty,
    bubbleWrapQty,
    carpetCoverQty,
    mattressSingleQty,
    mattressDoubleQty,
    tapeQty,
  ]);

  // Convert to official order in orders list
  const handleConvertToOrder = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('لطفاً نام و شماره تماس مشتری را وارد فرمایید.');
      return;
    }

    const todayInfo = getTodayJalaali();
    const orderNum = `ORD-${todayInfo.jy}${String(todayInfo.jm).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: OrderItem = {
      id: `ord_${Date.now()}`,
      orderNumber: orderNum,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      orderDate: todayInfo.fullFa,
      originCity: originAddress ? originAddress.split(' ')[0] : 'تهران',
      originAddress: originAddress || 'مبدأ اعلامی مشتری',
      destinationCity: destAddress ? destAddress.split(' ')[0] : 'تهران',
      destinationAddress: destAddress || 'مقصد اعلامی مشتری',
      cargoDescription: `اثاثیه منزل (${vehicleType === 'NISSAN' ? 'نیسان' : 'خاور'}) - ${isPacked ? 'بسته‌بندی شده' : 'نیازمند بسته‌بندی'}`,
      cargoWeightTon: vehicleType === 'NISSAN' ? 1.8 : 4.5,
      requestedVehicleType: vehicleType === 'NISSAN' ? 'نیسان وانت' : 'خاور مسقف',
      estimatedFareRial: calculation.grandTotal * 10, // convert Tomans to Rials
      paymentType: serviceType === 'SUBURB' ? 'PREPAID' : 'POSTPAID',
      status: 'NORMAL',
      source: 'MANUAL',
      coordinationNotes: `رزرو شده بر اساس استعلام حامی. ${reservationNotes ? `یادداشت: ${reservationNotes}` : ''}`,
      createdAt: todayInfo.gregorianFormatted,
    };

    if (onAddOrder) {
      onAddOrder(newOrder);
      if (showToast) {
        showToast(`سفارش «${orderNum}» با مبلغ برآورد ${calculation.grandTotal.toLocaleString('fa-IR')} تومان ثبت شد.`, 'success');
      }
      if (onNavigateToOrders) {
        onNavigateToOrders();
      }
    }
  };

  // Copy SMS Preview
  const handleCopySMS = () => {
    const text = `درود بر شما مشتری گرامی،
پیش‌فاکتور رزرواسیون شرکت حامی:
• نام: ${customerName || 'مشتری محترم'}
• سرویس: ${vehicleType === 'NISSAN' ? 'نیسان' : 'خاور'} (${serviceType === 'DOMESTIC' ? 'داخل شهر' : serviceType === 'SUBURB' ? 'حومه' : 'شهرستان'})
• زمان پایه پیش‌بینی: ${expectedHours} ساعت
• تعداد کارگر: ${carrierLaborCount + layoutLaborFemale + layoutLaborMale + cleaningLaborCount + packerLaborFemale + packerLaborMale + technicianCount} نفر
• برآورد کل هزینه: ${calculation.grandTotal.toLocaleString('fa-IR')} تومان
پشتیبانی ۲۴ ساعته حامی`;

    navigator.clipboard.writeText(text);
    if (showToast) {
      showToast('متن پیامک پیش‌فاکتور رزرواسیون کپی شد.', 'info');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Banner Header with Hami Brand & Mode Switcher */}
      <div className="bg-[#111b2e] border border-[#1f2c45] p-4 sm:p-5 rounded-xl shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  راهنمای رزرواسیون و محاسبه‌گر هوشمند تعرفه حامی
                </h1>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  کال‌سنتر و پذیرش
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                موتور هوشمند استعلام قیمت، قواعد انضباطی اعزام، اقلام سنگین، پیاده‌روی، بسته‌بندی و نیروی تخصصی
              </p>
            </div>
          </div>

          {/* Sub-navigation switcher */}
          <div className="flex items-center gap-1 bg-[#0b1220] p-1 rounded-xl border border-slate-800 w-full lg:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('CALCULATOR')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSubTab === 'CALCULATOR'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>محاسبه‌گر هزینه و پیش‌فاکتور</span>
            </button>

            <button
              onClick={() => setActiveSubTab('ZONE_MATRIX')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSubTab === 'ZONE_MATRIX'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>ماتریس و تعرفه مناطق (تهران، حومه، ویژه)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('CALL_SCRIPT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSubTab === 'CALL_SCRIPT'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>اسکریپت و اصول مکالمه تلفنی</span>
            </button>

            <button
              onClick={() => setActiveSubTab('GUIDE_TEXT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSubTab === 'GUIDE_TEXT'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>متن جزوه آموزشی</span>
            </button>

            <button
              onClick={() => setActiveSubTab('SETTINGS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSubTab === 'SETTINGS'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>تنظیم مبالغ و تعرفه‌ها</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CALCULATOR & ESTIMATOR VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'CALCULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left/Main Configuration Column (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Warning / Rule Notification if any */}
            {isNissanWithSideBySide && (
              <div className="bg-amber-950/40 border-2 border-amber-500/60 p-4 rounded-xl flex items-start gap-3 shadow-md animate-pulse">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed">
                  <strong className="text-amber-300 font-bold block mb-0.5 text-sm">قانون الزامی حامی (ساید‌بای‌ساید + نیسان):</strong>
                  طبق دستورالعمل شرکت، در صورتی که مشتری دارای یخچال ساید‌بای‌ساید بوده و درخواست خودروی نیسان داشته باشد، <strong>اعزام کارگر ماهر الزامی است</strong> و راننده به تنهایی مجاز به بارگیری نمی‌باشد.
                </div>
              </div>
            )}

            {isIntercityUnderstaffed && (
              <div className="bg-rose-950/40 border-2 border-rose-500/60 p-4 rounded-xl flex items-start gap-3 shadow-md">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200 leading-relaxed">
                  <strong className="text-rose-300 font-bold block mb-0.5 text-sm">قانون بارهای شهرستان:</strong>
                  اعزام کارگر برای شهرستان حداقل <strong>{toFaDigits(rates.intercity.minLaborers)} نفر</strong> (شامل ۱ نفر بارچین تخصصی و ۲ نفر کارگر حمل بار) الزامی است.
                </div>
              </div>
            )}

            {isSuburbRequiresDeposit && (
              <div className="bg-blue-950/40 border border-blue-500/40 p-3.5 rounded-xl flex items-start gap-3 text-xs text-blue-200">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>قانون بارهای حومه:</strong> با توجه به اینکه مبدأ یا مقصد در حومه شهر است، دریافت بیعانه از مشتری الزامی می‌باشد.
                </div>
              </div>
            )}

            {/* Block 1: Customer & Zone */}
            <div className="bg-[#111b2e] border border-[#1f2c45] p-4 sm:p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>۱. اطلاعات مشتری و حوزه جغرافیایی</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نام مشتری / متقاضی</label>
                  <input
                    type="text"
                    placeholder="مثال: آقای مهندس رضایی"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#090f1d] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">شماره تماس همراه</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="0912..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#090f1d] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none font-mono text-right"
                  />
                </div>
              </div>

              {/* Service Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>محدوده و حوزه سرویس‌دهی</span>
                  <span className="text-[11px] text-amber-400 font-normal">
                    (تطبیق خودکار با انتخاب محله‌های مبدأ و مقصد)
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceType('DOMESTIC')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      serviceType === 'DOMESTIC'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-[#090f1d] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    داخلی تهران
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('SUBURB')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      serviceType === 'SUBURB'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-sm'
                        : 'bg-[#090f1d] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    حومه تهران (کرج/اسلامشهر...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('SPECIAL_SUBURB')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      serviceType === 'SPECIAL_SUBURB'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                        : 'bg-[#090f1d] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    حومه ویژه (هشتگرد/گیلاوند...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('INTERCITY')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      serviceType === 'INTERCITY'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-[#090f1d] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    بین شهری (شهرستان)
                  </button>
                </div>
              </div>

              {/* Origin and Destination Pickers with Neighborhood database */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <NeighborhoodPicker
                    label="مبدأ بارگیری (انتخاب محله تهران یا حومه)"
                    selectedNeighborhood={originNeighborhood}
                    customText={originAddress}
                    onSelect={(item, text) => {
                      setOriginNeighborhood(item);
                      setOriginAddress(text);
                    }}
                    placeholder="جستجو یا انتخاب محله (مثال: سعادت‌آباد، صادقیه، پونک...)"
                    isOrigin={true}
                  />
                </div>

                <div className="space-y-2">
                  <NeighborhoodPicker
                    label="مقصد تخلیه (انتخاب محله تهران یا حومه)"
                    selectedNeighborhood={destNeighborhood}
                    customText={destAddress}
                    onSelect={(item, text) => {
                      setDestNeighborhood(item);
                      setDestAddress(text);
                    }}
                    placeholder="جستجو یا انتخاب مقصد (مثال: تهرانپارس، اسلامشهر، هشتگرد...)"
                    isOrigin={false}
                  />
                </div>
              </div>

              {/* Detected Route Analysis Badge */}
              <div className="bg-[#090f1d] border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">تحلیل جغرافیایی مسیر:</span>
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    {detectedRouteTariff.categoryTitle}
                  </span>
                  {detectedRouteTariff.isCrossZoneInternal && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                      + تردد طولی کراس‌زون
                    </span>
                  )}
                </div>

                {detectedRouteTariff.requiresDeposit && (
                  <span className="text-[11px] text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>نیازمند اخذ بیعانه</span>
                  </span>
                )}
              </div>
            </div>

            {/* Block 2: Vehicle & Time Estimation */}
            <div className="bg-[#111b2e] border border-[#1f2c45] p-4 sm:p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Truck className="w-4 h-4 text-amber-400" />
                <span>۲. انتخاب خودرو و زمان‌بندی پایه</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setVehicleType('KHAVAR_VIP')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    vehicleType === 'KHAVAR_VIP'
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                      : 'bg-[#090f1d] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-amber-400">خاور مسقف فلزی VIP</span>
                      <Truck className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      دیواره‌های کاملاً موکت‌شده، ۵۰ عدد پتو و ضربه‌گیر مخصوص اثاثیه حساس
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-amber-300 font-mono">
                    پایه {toFaDigits(rates.khavarDomestic.baseHours)} ساعت
                  </div>
                </div>

                <div
                  onClick={() => setVehicleType('KHAVAR_CANVAS')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    vehicleType === 'KHAVAR_CANVAS'
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                      : 'bg-[#090f1d] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-amber-400">خاور مسقف برزنتی ویژه</span>
                      <Truck className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      اتاق بزرگ جادار و مقاوم در برابر بارندگی جهت حمل بارهای حجیم
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-amber-300 font-mono">
                    پایه {toFaDigits(rates.khavarDomestic.baseHours)} ساعت
                  </div>
                </div>

                <div
                  onClick={() => setVehicleType('NISSAN')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    vehicleType === 'NISSAN'
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                      : 'bg-[#090f1d] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-amber-400">نیسان وانت اختصاصی</span>
                      <Truck className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      سریع و مناسب بارهای کم‌حجم، تجاری سبک و خرده‌بار ساختمانی
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-amber-300 font-mono">
                    پایه {toFaDigits(rates.nissanDomestic.baseHours)} ساعت
                  </div>
                </div>
              </div>

              {/* Hours counter slider */}
              <div className="bg-[#090f1d] p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white block">مدت زمان پیش‌بینی سرویس:</span>
                  <span className="text-slate-400 text-[11px]">
                    (شامل بارگیری در مبدأ + تخلیه در مقصد + تردد)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpectedHours((h) => Math.max(1, h - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-base font-black text-amber-400 font-mono w-14 text-center">
                    {toFaDigits(expectedHours)} ساعت
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpectedHours((h) => Math.min(12, h + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Block 3: Human Resources & Specialized Workers */}
            <div className="bg-[#111b2e] border border-[#1f2c45] p-4 sm:p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>۳. تخصیص نیروی انسانی و خدمات تخصصی</span>
                </h3>
                <span className="text-xs text-amber-400 font-mono font-bold">
                  مجموع: {toFaDigits(carrierLaborCount + layoutLaborFemale + layoutLaborMale + cleaningLaborCount + packerLaborFemale + packerLaborMale + technicianCount)} نفر
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Carrier Labor */}
                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">کارگر حمل بار و اثاثیه</div>
                    <div className="text-[11px] text-slate-400">تخلیه و بارگیری سنگین</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCarrierLaborCount((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-amber-400 text-sm">
                      {toFaDigits(carrierLaborCount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCarrierLaborCount((c) => c + 1)}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Technician */}
                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>نیروی فنی (تکنسین)</span>
                      <Wrench className="w-3 h-3 text-sky-400" />
                    </div>
                    <div className="text-[10px] text-slate-400">باز و بست لباسشویی، لوستر، پرده، تخت</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTechnicianCount((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-amber-400 text-sm">
                      {toFaDigits(technicianCount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTechnicianCount((c) => c + 1)}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Packing Labor (Female & Male) */}
                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">کارگر بسته‌بندی ریز (خانم)</div>
                    <div className="text-[10px] text-pink-400">اقلام شکستنی، کریستال و آشپزخانه</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPackerLaborFemale((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-amber-400 text-sm">
                      {toFaDigits(packerLaborFemale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPackerLaborFemale((c) => c + 1)}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">کارگر بسته‌بندی درشت (آقا)</div>
                    <div className="text-[10px] text-blue-400">مبلمان، چوب، بوفه و لوازم حجیم</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPackerLaborMale((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-amber-400 text-sm">
                      {toFaDigits(packerLaborMale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPackerLaborMale((c) => c + 1)}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Layout Labor */}
                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">کارگر چیدمان مقصد</div>
                    <div className="text-[10px] text-slate-400">چیدمان اثاثیه و کمدها</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLayoutLaborFemale((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-amber-400 text-sm">
                      {toFaDigits(layoutLaborFemale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLayoutLaborFemale((c) => c + 1)}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Cleaning Labor */}
                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">کارگر نظافت عمومی</div>
                    <div className="text-[10px] text-slate-400">نظافت قبل و بعد از بارگیری</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCleaningLaborCount((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-amber-400 text-sm">
                      {toFaDigits(cleaningLaborCount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCleaningLaborCount((c) => c + 1)}
                      className="w-7 h-7 bg-slate-800 text-slate-300 rounded flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Block 4: Heavy Items & Floor Charges */}
            <div className="bg-[#111b2e] border border-[#1f2c45] p-4 sm:p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>۴. اقلام سنگین و تعرفه طبقات</span>
              </h3>

              <div className="space-y-3">
                {/* Side-by-Side */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#090f1d] p-2.5 rounded-xl border border-slate-800 items-center">
                  <div className="sm:col-span-6 text-xs text-white font-medium">
                    <span>یخچال ساید‌بای‌ساید / ۲۴ فوت به بالا</span>
                    <span className="block text-[10px] text-slate-400">
                      نرخ هر طبقه: {rates.heavyItemsFloorRate.refrigeratorLarge.toLocaleString('fa-IR')} ت
                    </span>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد:</span>
                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                      <button onClick={() => setSideBySideCount((c) => Math.max(0, c - 1))} className="text-slate-300 px-1.5">-</button>
                      <span className="font-mono font-bold text-amber-400 w-4 text-center">{toFaDigits(sideBySideCount)}</span>
                      <button onClick={() => setSideBySideCount((c) => c + 1)} className="text-slate-300 px-1.5">+</button>
                    </div>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد طبقات:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={sideBySideFloors}
                      onChange={(e) => setSideBySideFloors(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Treadmill */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#090f1d] p-2.5 rounded-xl border border-slate-800 items-center">
                  <div className="sm:col-span-6 text-xs text-white font-medium">
                    <span>تردمیل ورزشی</span>
                    <span className="block text-[10px] text-slate-400">
                      نرخ هر طبقه: {rates.heavyItemsFloorRate.treadmill.toLocaleString('fa-IR')} ت
                    </span>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد:</span>
                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                      <button onClick={() => setTreadmillCount((c) => Math.max(0, c - 1))} className="text-slate-300 px-1.5">-</button>
                      <span className="font-mono font-bold text-amber-400 w-4 text-center">{toFaDigits(treadmillCount)}</span>
                      <button onClick={() => setTreadmillCount((c) => c + 1)} className="text-slate-300 px-1.5">+</button>
                    </div>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد طبقات:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={treadmillFloors}
                      onChange={(e) => setTreadmillFloors(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Dining Glass Table */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#090f1d] p-2.5 rounded-xl border border-slate-800 items-center">
                  <div className="sm:col-span-6 text-xs text-white font-medium">
                    <span>شیشه میز ناهارخوری (۶ نفره به بالا)</span>
                    <span className="block text-[10px] text-slate-400">
                      نرخ هر طبقه: {rates.heavyItemsFloorRate.diningGlassLarge.toLocaleString('fa-IR')} ت
                    </span>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد:</span>
                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                      <button onClick={() => setDiningGlassCount((c) => Math.max(0, c - 1))} className="text-slate-300 px-1.5">-</button>
                      <span className="font-mono font-bold text-amber-400 w-4 text-center">{toFaDigits(diningGlassCount)}</span>
                      <button onClick={() => setDiningGlassCount((c) => c + 1)} className="text-slate-300 px-1.5">+</button>
                    </div>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد طبقات:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={diningGlassFloors}
                      onChange={(e) => setDiningGlassFloors(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Buffet Cabinet / Sofa Bed */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#090f1d] p-2.5 rounded-xl border border-slate-800 items-center">
                  <div className="sm:col-span-6 text-xs text-white font-medium">
                    <span>بوفه شیشه‌ای یا مبل تختخواب‌شو</span>
                    <span className="block text-[10px] text-slate-400">
                      نرخ هر طبقه: {rates.heavyItemsFloorRate.buffetCabinet.toLocaleString('fa-IR')} ت
                    </span>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد:</span>
                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                      <button onClick={() => setBuffetCount((c) => Math.max(0, c - 1))} className="text-slate-300 px-1.5">-</button>
                      <span className="font-mono font-bold text-amber-400 w-4 text-center">{toFaDigits(buffetCount)}</span>
                      <button onClick={() => setBuffetCount((c) => c + 1)} className="text-slate-300 px-1.5">+</button>
                    </div>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400">تعداد طبقات:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={buffetFloors}
                      onChange={(e) => setBuffetFloors(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Safe / گاوصندوق */}
                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">گاوصندوق (محاسبه بر اساس وزن):</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">طبقات:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={safeFloors}
                        onChange={(e) => setSafeFloors(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSafeTier('NONE')}
                      className={`p-2 rounded text-[11px] font-bold border ${
                        safeTier === 'NONE'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      ندارد
                    </button>
                    <button
                      type="button"
                      onClick={() => setSafeTier('UNDER_100')}
                      className={`p-2 rounded text-[11px] font-bold border ${
                        safeTier === 'UNDER_100'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      زیر ۱۰۰ کیلو
                    </button>
                    <button
                      type="button"
                      onClick={() => setSafeTier('100_TO_150')}
                      className={`p-2 rounded text-[11px] font-bold border ${
                        safeTier === '100_TO_150'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      ۱۰۰ تا ۱۵۰ کیلو
                    </button>
                    <button
                      type="button"
                      onClick={() => setSafeTier('150_TO_250')}
                      className={`p-2 rounded text-[11px] font-bold border ${
                        safeTier === '150_TO_250'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      ۱۵۰ تا ۲۵۰ کیلو
                    </button>
                    <button
                      type="button"
                      onClick={() => setSafeTier('ABOVE_250')}
                      className={`p-2 rounded text-[11px] font-bold border ${
                        safeTier === 'ABOVE_250'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      بالای ۲۵۰ کیلو
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Block 5: Walking Distance, Insurance & Packing Materials */}
            <div className="bg-[#111b2e] border border-[#1f2c45] p-4 sm:p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <PackageCheck className="w-4 h-4 text-amber-400" />
                <span>۵. پیاده‌روی، بیمه‌نامه و تجهیزات بسته‌بندی</span>
              </h3>

              {/* Walking & Insurance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">متراژ پیاده‌روی (تا ورودی ماشین)</span>
                    <span className="text-[10px] text-emerald-400">تا {toFaDigits(rates.walkingDistance.freeMetersThreshold)} متر رایگان</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={walkingMeters}
                      onChange={(e) => setWalkingMeters(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                      placeholder="متراژ بر حسب متر..."
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">متر</span>
                  </div>
                  {walkingMeters > rates.walkingDistance.freeMetersThreshold && (
                    <div className="text-[10px] text-amber-400 mt-1">
                      عبور از سقف مجاز: کل متراژ ضربدر نرخ ({calculation.walkingCost.toLocaleString('fa-IR')} ت)
                    </div>
                  )}
                </div>

                <div className="bg-[#090f1d] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>ارزش اعلامی بار جهت بیمه</span>
                    </span>
                    <span className="text-[10px] text-blue-400">
                      هر ۱۰ م: {rates.insurance.ratePerUnit.toLocaleString('fa-IR')} ت
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={declaredValueMillions}
                      onChange={(e) => setDeclaredValueMillions(Math.max(10, parseInt(e.target.value) || 10))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">میلیون ت</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    حق بیمه صادره: <strong className="text-white font-mono">{calculation.insuranceCost.toLocaleString('fa-IR')}</strong> تومان
                  </div>
                </div>
              </div>

              {/* Packing Supplies Matrix */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  تجهیزات و اقلام مصرفی بسته‌بندی:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">پک استاندارد متری</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.packStandard.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={packStandardQty}
                      onChange={(e) => setPackStandardQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">پک وکیوم گردویی</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.packWalnut.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={packWalnutQty}
                      onChange={(e) => setPackWalnutQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">کارتن ۵ لایه لمینت</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.cartonLaminate5Layer.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={cartonLaminateQty}
                      onChange={(e) => setCartonLaminateQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">کارتن رگال‌دار لباس</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.cartonRegalWardrobe.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={cartonRegalQty}
                      onChange={(e) => setCartonRegalQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">رول سلفون بزرگ</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.cellophaneRoll.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={cellophaneQty}
                      onChange={(e) => setCellophaneQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">بابل ضربه‌گیر (متر)</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.bubbleWrapMeter.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={bubbleWrapQty}
                      onChange={(e) => setBubbleWrapQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">کاور خوشخواب ۲ نفره</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.mattressCoverDouble.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={mattressDoubleQty}
                      onChange={(e) => setMattressDoubleQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">کاور فرش (متر)</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.carpetCoverMeter.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={carpetCoverQty}
                      onChange={(e) => setCarpetCoverQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>

                  <div className="bg-[#090f1d] p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-200">چسب پهن نواری</div>
                      <div className="text-[9px] text-slate-400">{rates.packingSupplies.adhesiveTape.toLocaleString('fa-IR')} ت</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={tapeQty}
                      onChange={(e) => setTapeQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 bg-slate-800 rounded text-center text-xs text-amber-400 font-mono py-0.5 border border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">یادداشت و هماهنگی‌های خاص مشتری</label>
                <textarea
                  rows={2}
                  placeholder="مثال: درب ورودی تنگ است، پارکینگ همکف ندارد، نیاز به باز کردن درب ساید در مبدأ..."
                  value={reservationNotes}
                  onChange={(e) => setReservationNotes(e.target.value)}
                  className="w-full bg-[#090f1d] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right Summary Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Quote Card */}
            <div className="bg-[#111b2e] border-2 border-amber-500/50 rounded-2xl p-5 shadow-xl space-y-4 sticky top-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">پیش‌فاکتور رسمی استعلام</span>
                  <h3 className="text-base font-black text-white">برآورد هزینه حامی</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
              </div>

              {/* Breakdown lines */}
              <div className="space-y-2 text-xs border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between text-slate-300">
                  <span>کرایه خودرو ({vehicleType === 'NISSAN' ? 'نیسان' : 'خاور'}):</span>
                  <span className="font-mono text-white font-bold">{calculation.vehicleTotalCost.toLocaleString('fa-IR')} ت</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    دستمزد نیروها ({toFaDigits(carrierLaborCount + layoutLaborFemale + layoutLaborMale + cleaningLaborCount + packerLaborFemale + packerLaborMale + technicianCount)} نفر):
                  </span>
                  <span className="font-mono text-white font-bold">{calculation.totalAllLaborCost.toLocaleString('fa-IR')} ت</span>
                </div>

                {calculation.totalHeavyItemsCost > 0 && (
                  <div className="flex items-center justify-between text-amber-300">
                    <span>اقلام سنگین و طبقات:</span>
                    <span className="font-mono font-bold">{calculation.totalHeavyItemsCost.toLocaleString('fa-IR')} ت</span>
                  </div>
                )}

                {calculation.walkingCost > 0 && (
                  <div className="flex items-center justify-between text-amber-300">
                    <span>هزینه پیاده‌روی ({toFaDigits(walkingMeters)} م):</span>
                    <span className="font-mono font-bold">{calculation.walkingCost.toLocaleString('fa-IR')} ت</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-blue-300">
                  <span>بیمه‌نامه رسمی اثاثیه:</span>
                  <span className="font-mono font-bold">{calculation.insuranceCost.toLocaleString('fa-IR')} ت</span>
                </div>

                {calculation.totalConsumablesCost > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>لوازم و تجهیزات بسته‌بندی:</span>
                    <span className="font-mono text-white font-bold">{calculation.totalConsumablesCost.toLocaleString('fa-IR')} ت</span>
                  </div>
                )}
              </div>

              {/* Total Final Price */}
              <div className="bg-[#090f1d] p-4 rounded-xl border border-amber-500/30 text-center">
                <span className="text-xs text-slate-400 block mb-1">مبلغ برآورد نهایی به مشتری:</span>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {calculation.grandTotal.toLocaleString('fa-IR')}
                  <span className="text-xs font-normal text-slate-400 mr-1.5">تومان</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleConvertToOrder}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>ثبت مستقیم در کارتابل سفارشات</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopySMS}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>کپی پیامک به مشتری</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="چاپ پیش‌فاکتور رسمی (بهینه پرینتر لیزری)"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>چاپ پیش‌فاکتور (لیزری)</span>
                  </button>
                </div>
              </div>

              {/* Rules summary reminder */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>یادآوری قوانین تماس:</span>
                </div>
                <p>• شروع مکالمه با عبارت «درود، حامی بفرمایید»</p>
                <p>• بارهای حومه مستلزم اخذ قطعی بیعانه می‌باشند</p>
                <p>• تماس با واحد اعزام برای استعلام ماشین ممنوع است</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ZONE PRICING & TARIFF MATRIX VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'ZONE_MATRIX' && (
        <TehranZonePricingMatrix
          rates={rates}
          onUpdateRates={handleSaveRates}
          showToast={showToast}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. CALL SCRIPT & OPERATIONAL SOP */}
      {/* ========================================================================= */}
      {activeSubTab === 'CALL_SCRIPT' && (
        <div className="space-y-5">
          <div className="bg-[#111b2e] border border-[#1f2c45] p-5 rounded-xl space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <PhoneCall className="w-5 h-5 text-amber-400" />
              <span>الگوریتم و اسکریپت استاندارد پاسخگویی تلفنی (Call Center SOP)</span>
            </h2>

            {/* Step by step dialogue */}
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="bg-[#090f1d] border-r-4 border-amber-500 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400">گام ۱: احوالپرسی رسمی و شناسایی نیاز</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded">شروع مکالمه</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg text-xs text-slate-200 border border-slate-800 font-serif leading-relaxed">
                  «درود، حامی بفرمایید. در خدمتتون هستم...»
                </div>
                <p className="text-xs text-slate-300">
                  بلافاصله سه سوال کلیدی بپرسید:
                </p>
                <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 pr-2">
                  <li><strong>مسیر جابجایی:</strong> از کدام محله/شهر به کدام نقطه است؟ (داخلی / حومه / شهرستان)</li>
                  <li><strong>نوع وسیله نقلیه:</strong> به ماشین خاور (اثاثیه کامل) نیاز دارند یا نیسان (خرده بار و سبک)؟</li>
                  <li><strong>وضعیت بسته‌بندی:</strong> آیا بار از قبل بسته‌بندی شده یا نیاز به اعزام کادر تخصصی بسته‌بند دارند؟</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="bg-[#090f1d] border-r-4 border-blue-500 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-400">گام ۲: پرسش‌های تخصصی نیسان و ساید‌بای‌ساید</span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded">اعتبارسنجی مهم</span>
                </div>
                <p className="text-xs text-slate-300">
                  اگر مشتری تقاضای <strong>نیسان</strong> داشت:
                </p>
                <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 pr-2">
                  <li>حتماً نوع بار و اقلام سنگین را استعلام کنید.</li>
                  <li>سوال کنید: «آیا نیاز به کارگر حمل بار هم دارید یا خودتان همراهی می‌کنید؟»</li>
                  <li className="text-amber-300 font-bold">
                    قانون طلایی: در صورتی که مشتری یخچال ساید‌بای‌ساید داشته باشد و نیسان بخواهد، اعزام حداقل کارگر ماهر الزامی است.
                  </li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="bg-[#090f1d] border-r-4 border-purple-500 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-400">گام ۳: معرفی خدمات نیروی انسانی و تکنسین</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded">فروش خدمات ارزش افزوده</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <strong className="text-xs text-pink-400 block mb-1">کادر بسته‌بندی خانم:</strong>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      مخصوص بسته‌بندی ظروف چینی، کریستال، اقلام شکستنی، آشپزخانه و لباس با لوازم وکیوم
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <strong className="text-xs text-blue-400 block mb-1">کادر بسته‌بندی آقا:</strong>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      بسته‌بندی بوفه، مبلمان، سرویس خواب، چوب و کاور کردن خوشخواب و فرش‌ها
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <strong className="text-xs text-amber-400 block mb-1">نیروی فنی و تکنسین:</strong>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      باز کردن و نصب مجدد ماشین لباسشویی، ظرفشویی، لوستر، پرده‌ها، تخت و سرویس خواب در مقصد
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#090f1d] border-r-4 border-rose-500 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-400">گام ۴: چک‌لیست اقلام سنگین و طبقات</span>
                  <span className="text-[10px] bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded">شفافیت مالی</span>
                </div>
                <p className="text-xs text-slate-300">
                  برای جلوگیری از اختلاف حساب در محل تخلیه، حتماً اقلام زیر را سوال فرمایید:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ یخچال ساید یا بالای ۲۴ فوت</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ گاوصندوق و وزن تقریبی</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ تردمیل ورزشی</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ میز ناهارخوری شیشه‌ای بزرگ</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ بوفه بزرگ و کمدهای شیشه‌ای</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ مبل تختخواب‌شو</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ متراژ پیاده‌روی کوچه/پارکینگ</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">✓ ارزش تقریبی بار جهت بیمه</div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-[#090f1d] border-r-4 border-emerald-500 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400">گام ۵: قوانین انضباطی دفتر و ثبت نهایی</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">پروتکل اداری</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li><strong>ممنوعیت تماس با اعزام:</strong> تماس اپراتور با واحد اعزام جهت موقعیت خودرو اکیداً ممنوع است. شماره مستقیم راننده از طریق پنل به مشتری پیامک می‌شود.</li>
                  <li><strong>بیعانه حومه:</strong> برای سفارشاتی که مبدأ در حومه است، ثبت بدون دریافت بیعانه ممنوع است.</li>
                  <li><strong>کنترل روز قبل:</strong> بارنامه‌های روز بعد باید ۲۴ ساعت قبل توسط سرپرست بازبینی و قطعی شوند.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SETTINGS & TARIFF RATES CUSTOMIZER */}
      {/* ========================================================================= */}
      {activeSubTab === 'SETTINGS' && (
        <div className="bg-[#111b2e] border border-[#1f2c45] p-5 rounded-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-amber-400" />
                <span>پیکربندی مبالغ و تعرفه‌های پایه رزرواسیون</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تنظیم مبالغ ورودی ساعت پایه، اضافه ساعت، دستمزد کارگران، اقلام سنگین، پیاده‌روی و اقلام بسته‌بندی
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetRates}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بازنشانی به مقادیر پیش‌فرض</span>
            </button>
          </div>

          {/* Rate Forms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Domestic Vehicles & Labor */}
            <div className="bg-[#090f1d] p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-400 border-b border-slate-800 pb-1.5">
                ۱. تعرفه خودروها و کارگران داخل شهر (Domestic)
              </h3>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">خاور پایه (تومان)</label>
                  <input
                    type="number"
                    value={rates.khavarDomestic.basePrice}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        khavarDomestic: { ...rates.khavarDomestic, basePrice: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ساعت پایه</label>
                  <input
                    type="number"
                    value={rates.khavarDomestic.baseHours}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        khavarDomestic: { ...rates.khavarDomestic, baseHours: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت خاور</label>
                  <input
                    type="number"
                    value={rates.khavarDomestic.overtimeHourly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        khavarDomestic: { ...rates.khavarDomestic, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">نیسان پایه (تومان)</label>
                  <input
                    type="number"
                    value={rates.nissanDomestic.basePrice}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        nissanDomestic: { ...rates.nissanDomestic, basePrice: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ساعت پایه نیسان</label>
                  <input
                    type="number"
                    value={rates.nissanDomestic.baseHours}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        nissanDomestic: { ...rates.nissanDomestic, baseHours: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت نیسان</label>
                  <input
                    type="number"
                    value={rates.nissanDomestic.overtimeHourly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        nissanDomestic: { ...rates.nissanDomestic, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">کارگر خاور پایه (تومان)</label>
                  <input
                    type="number"
                    value={rates.laborKhavarDomestic.basePrice}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        laborKhavarDomestic: { ...rates.laborKhavarDomestic, basePrice: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت کارگر خاور</label>
                  <input
                    type="number"
                    value={rates.laborKhavarDomestic.overtimeHourly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        laborKhavarDomestic: { ...rates.laborKhavarDomestic, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Suburb & Specialized Labor */}
            <div className="bg-[#090f1d] p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-400 border-b border-slate-800 pb-1.5">
                ۲. نیروهای تخصصی (تکنسین و بسته‌بند) و حومه
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">تکنسین فنی پایه</label>
                  <input
                    type="number"
                    value={rates.technicianLabor.basePrice}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        technicianLabor: { ...rates.technicianLabor, basePrice: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت تکنسین</label>
                  <input
                    type="number"
                    value={rates.technicianLabor.overtimeHourly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        technicianLabor: { ...rates.technicianLabor, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">کارگر بسته‌بند پایه</label>
                  <input
                    type="number"
                    value={rates.packerLabor.basePrice}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        packerLabor: { ...rates.packerLabor, basePrice: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">اضافه ساعت بسته‌بند</label>
                  <input
                    type="number"
                    value={rates.packerLabor.overtimeHourly}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        packerLabor: { ...rates.packerLabor, overtimeHourly: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">خاور حومه پایه</label>
                  <input
                    type="number"
                    value={rates.khavarSuburb.basePrice}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        khavarSuburb: { ...rates.khavarSuburb, basePrice: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">نیسان حومه پایه</label>
                  <input
                    type="number"
                    value={rates.nissanSuburb.basePrice}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        nissanSuburb: { ...rates.nissanSuburb, basePrice: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Box 3: Heavy items floor rates */}
            <div className="bg-[#090f1d] p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-400 border-b border-slate-800 pb-1.5">
                ۳. نرخ طبقات اقلام سنگین (هر طبقه - تومان)
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ساید بای ساید</label>
                  <input
                    type="number"
                    value={rates.heavyItemsFloorRate.refrigeratorLarge}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        heavyItemsFloorRate: { ...rates.heavyItemsFloorRate, refrigeratorLarge: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">تردمیل</label>
                  <input
                    type="number"
                    value={rates.heavyItemsFloorRate.treadmill}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        heavyItemsFloorRate: { ...rates.heavyItemsFloorRate, treadmill: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">شیشه ناهارخوری بزرگ</label>
                  <input
                    type="number"
                    value={rates.heavyItemsFloorRate.diningGlassLarge}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        heavyItemsFloorRate: { ...rates.heavyItemsFloorRate, diningGlassLarge: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">بوفه و کمد بزرگ</label>
                  <input
                    type="number"
                    value={rates.heavyItemsFloorRate.buffetCabinet}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        heavyItemsFloorRate: { ...rates.heavyItemsFloorRate, buffetCabinet: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Box 4: Walking & Insurance */}
            <div className="bg-[#090f1d] p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-400 border-b border-slate-800 pb-1.5">
                ۴. پیاده‌روی، بیمه و حداقل کارگر شهرستان
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">متراژ مجاز رایگان (متر)</label>
                  <input
                    type="number"
                    value={rates.walkingDistance.freeMetersThreshold}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        walkingDistance: { ...rates.walkingDistance, freeMetersThreshold: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">نرخ هر متر مازاد (تومان)</label>
                  <input
                    type="number"
                    value={rates.walkingDistance.feePerTotalMeter}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        walkingDistance: { ...rates.walkingDistance, feePerTotalMeter: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">بیمه به ازای ۱۰ م ت</label>
                  <input
                    type="number"
                    value={rates.insurance.ratePerUnit}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        insurance: { ...rates.insurance, ratePerUnit: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">حداقل کارگر شهرستان</label>
                  <input
                    type="number"
                    value={rates.intercity.minLaborers}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        intercity: { ...rates.intercity, minLaborers: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() => handleSaveRates(rates)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
            >
              ذخیره و اعمال تعرفه‌های جدید در سیستم
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FULL STUDY GUIDE TEXT */}
      {/* ========================================================================= */}
      {activeSubTab === 'GUIDE_TEXT' && (
        <div className="bg-[#111b2e] border border-[#1f2c45] p-5 sm:p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>متن مرجع و کامل جزوه آموزشی رزرواسیون شرکت حامی</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(ORIGINAL_GUIDE_TEXT);
                if (showToast) showToast('متن جزوه کپی شد.', 'info');
              }}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>کپی متن جزوه</span>
            </button>
          </div>

          <div className="bg-[#090f1d] p-5 rounded-xl border border-slate-800 text-slate-200 text-xs leading-loose whitespace-pre-line font-sans">
            {ORIGINAL_GUIDE_TEXT}
          </div>
        </div>
      )}

      {/* Laser-Optimized A4 Quotation / Pre-Invoice Print Modal with Customizable Watermark */}
      {isPrintModalOpen && (
        <QuotationPrintModal
          details={{
            quoteNumber: `Q-${Date.now().toString().slice(-6)}`,
            customerName: 'متقاضی خدمات لجستیک',
            customerPhone: '',
            vehicleTypeName: vehicleType === 'NISSAN' ? 'نیسان بار مسقف' : 'کامیونت خاور مسقف',
            serviceTypeName: serviceType === 'FULL_PACK' ? 'اسباب‌کشی VIP (بسته‌بندی، حمل، چیدمان)' : 'حمل اثاثیه استاندارد',
            originZone: originNeighborhood || 'محدوده تهران',
            destinationZone: destNeighborhood || 'محدوده تهران',
            durationHours: expectedHours,
            workersCount: carrierLaborCount + layoutLaborFemale + layoutLaborMale + cleaningLaborCount + packerLaborFemale + packerLaborMale + technicianCount,
            baseFare: calculation.vehicleBaseCost,
            laborCost: calculation.totalAllLaborCost,
            extraHoursCost: calculation.extraHoursCost,
            heavyItemsCost: calculation.totalHeavyItemsCost + calculation.walkingCost,
            totalCost: calculation.grandTotal,
            depositRequired: calculation.depositRequired,
            notes: 'پیش‌فاکتور برآورد تقریبی صادر شده از طریق سامانه رزرواسیون حامی. چاپ شده با استاندارد لیزری.',
          }}
          onClose={() => setIsPrintModalOpen(false)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
