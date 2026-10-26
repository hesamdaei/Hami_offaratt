import React, { FC, useState, useMemo } from 'react';
import { OrderItem, WaybillDetails, InvoiceDetails } from '../utils/ordersData';
import {
  VehicleItem,
  DriverDirectoryItem,
  VEHICLE_TYPE_NAMES,
  INITIAL_VEHICLES,
  INITIAL_DRIVER_DIRECTORY,
} from '../utils/fleetSeedData';
import { IranianPlate } from './IranianPlate';
import { getTodayJalaali, toFaDigits } from '../utils/jalaali';
import { PersianDatePicker } from './PersianDatePicker';
import {
  FileText,
  Receipt,
  X,
  CheckCircle,
  Truck,
  ShieldCheck,
  Building,
  DollarSign,
  Layers,
  Sparkles,
  ArrowLeft,
  AlertOctagon,
  AlertTriangle,
  Phone,
  Zap,
  BookOpen,
  BadgeCheck,
} from 'lucide-react';

export interface ConvertToWaybillOrInvoiceModalProps {
  order: OrderItem;
  vehicles?: VehicleItem[];
  drivers?: DriverDirectoryItem[];
  onClose: () => void;
  onSaveConversion?: (
    orderId: string,
    waybillData?: WaybillDetails,
    invoiceData?: InvoiceDetails
  ) => void;
  onSave?: (
    orderId: string,
    waybillData?: WaybillDetails,
    invoiceData?: InvoiceDetails
  ) => void;
}

export const ConvertToWaybillOrInvoiceModal: FC<
  ConvertToWaybillOrInvoiceModalProps
> = ({ order, onClose, onSaveConversion, onSave, vehicles = [], drivers = [] }) => {
  const today = getTodayJalaali();

  // Ensure active vehicles and drivers are populated from props or defaults
  const activeVehicles = useMemo(
    () => (vehicles && vehicles.length > 0 ? vehicles : INITIAL_VEHICLES),
    [vehicles]
  );
  const activeDrivers = useMemo(
    () => (drivers && drivers.length > 0 ? drivers : INITIAL_DRIVER_DIRECTORY),
    [drivers]
  );

  // Build structured list of fleet drivers who have an assigned vehicle
  const assignedFleetList = useMemo(() => {
    const list: Array<{
      id: string;
      driverName: string;
      driverPhone: string;
      plateNumber: string;
      vehicleCode?: number;
      vehicleType?: string;
      vehicleTypeName: string;
      queueStatus?: string;
      queueNumber?: number;
    }> = [];

    const seenDriverAndPlates = new Set<string>();

    // 1. Vehicles with an assigned driver
    activeVehicles.forEach((v) => {
      if (v.driverName && v.driverName.trim() !== '' && v.driverName !== 'بدون راننده') {
        const key = `${v.driverName}__${v.plateNumber}`;
        if (!seenDriverAndPlates.has(key)) {
          seenDriverAndPlates.add(key);
          const dirDriver = activeDrivers.find((d) => d.name === v.driverName);
          list.push({
            id: `veh-${v.code || v.id}`,
            driverName: v.driverName,
            driverPhone: v.driverPhone || dirDriver?.phone || '09120000000',
            plateNumber: v.plateNumber,
            vehicleCode: v.code,
            vehicleType: v.vehicleType,
            vehicleTypeName: VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType || 'کامیون',
            queueStatus: v.queueStatus,
            queueNumber: v.queueNumber,
          });
        }
      }
    });

    // 2. Drivers from directory who have assigned vehicles not yet listed
    activeDrivers.forEach((d) => {
      if (!d.name || d.name === 'بدون راننده') return;
      const alreadyListed = list.some((item) => item.driverName === d.name);
      if (!alreadyListed) {
        let matchedVeh = activeVehicles.find((v) => v.driverName === d.name);
        if (!matchedVeh && d.assignedVehicles && d.assignedVehicles.length > 0) {
          matchedVeh = activeVehicles.find((v) =>
            d.assignedVehicles.some(
              (av) =>
                av.includes(String(v.code)) || (v.plateNumber && av.includes(v.plateNumber))
            )
          );
        }

        if (matchedVeh) {
          list.push({
            id: `drv-${d.id}`,
            driverName: d.name,
            driverPhone: d.phone || matchedVeh.driverPhone || '09120000000',
            plateNumber: matchedVeh.plateNumber,
            vehicleCode: matchedVeh.code,
            vehicleType: matchedVeh.vehicleType,
            vehicleTypeName:
              VEHICLE_TYPE_NAMES[matchedVeh.vehicleType] || matchedVeh.vehicleType || 'کامیون',
            queueStatus: matchedVeh.queueStatus,
            queueNumber: matchedVeh.queueNumber,
          });
        } else if (d.assignedVehicles && d.assignedVehicles.length > 0) {
          const avText = d.assignedVehicles[0];
          const plateMatch = avText.match(/\(([^)]+)\)/);
          const plate = plateMatch ? plateMatch[1] : avText;
          list.push({
            id: `drv-${d.id}`,
            driverName: d.name,
            driverPhone: d.phone || '09120000000',
            plateNumber: plate,
            vehicleTypeName: 'ناوگان',
          });
        }
      }
    });

    // Sort strictly by Dispatch SOP (دستورالعمل دیسپچ و صف نوبت حامی):
    // 1. IN_QUEUE vehicles first sorted ascending by queueNumber (1, 2, 3...)
    // 2. Active vehicles with drivers
    list.sort((a, b) => {
      const aInQueue = a.queueStatus === 'IN_QUEUE';
      const bInQueue = b.queueStatus === 'IN_QUEUE';
      if (aInQueue && !bInQueue) return -1;
      if (!aInQueue && bInQueue) return 1;
      if (aInQueue && bInQueue) {
        return (a.queueNumber || 999) - (b.queueNumber || 999);
      }
      return 0;
    });

    return list;
  }, [activeVehicles, activeDrivers]);

  // Find initial matching assigned vehicle / driver
  const initialAssignedVehicle = useMemo(() => {
    return activeVehicles.find(
      (v) =>
        (order.assignedVehicleCode && v.code === order.assignedVehicleCode) ||
        (order.assignedDriverName && v.driverName === order.assignedDriverName) ||
        (order.assignedVehiclePlate && v.plateNumber === order.assignedVehiclePlate)
    );
  }, [activeVehicles, order]);

  // Priority candidate following Dispatch SOP (دستورالعمل دیسپچ حامی):
  // 1. If order itself already has an assigned driver and vehicle in fleet, prioritize that.
  // 2. If not, pick top driver in morning queue (IN_QUEUE with lowest queueNumber).
  // 3. Fallback to first fleet driver with an assigned vehicle.
  const sopPriorityCandidate = useMemo(() => {
    if (
      initialAssignedVehicle &&
      initialAssignedVehicle.driverName &&
      initialAssignedVehicle.driverName !== 'بدون راننده'
    ) {
      const matchInList = assignedFleetList.find(
        (item) =>
          item.vehicleCode === initialAssignedVehicle.code ||
          item.driverName === initialAssignedVehicle.driverName
      );
      if (matchInList) return matchInList;
    }

    if (order.assignedDriverName && order.assignedDriverName !== 'بدون راننده') {
      const matchByName = assignedFleetList.find(
        (item) => item.driverName === order.assignedDriverName
      );
      if (matchByName) return matchByName;
    }

    // According to SOP: prioritize first in queue
    const queuedItem = assignedFleetList.find((item) => item.queueStatus === 'IN_QUEUE');
    if (queuedItem) return queuedItem;

    return assignedFleetList[0] || null;
  }, [initialAssignedVehicle, order, assignedFleetList]);

  // Auto-fill driver & vehicle according to SOP if order does not have one
  const initialDriver =
    (order.waybill?.driverName && order.waybill.driverName !== 'بدون راننده'
      ? order.waybill.driverName
      : null) ||
    (order.assignedDriverName && order.assignedDriverName !== 'بدون راننده'
      ? order.assignedDriverName
      : null) ||
    (initialAssignedVehicle?.driverName && initialAssignedVehicle.driverName !== 'بدون راننده'
      ? initialAssignedVehicle.driverName
      : null) ||
    sopPriorityCandidate?.driverName ||
    '';

  const initialPlate =
    order.waybill?.vehiclePlate ||
    order.assignedVehiclePlate ||
    initialAssignedVehicle?.plateNumber ||
    sopPriorityCandidate?.plateNumber ||
    '';

  const initialPhone =
    order.waybill?.driverPhone ||
    initialAssignedVehicle?.driverPhone ||
    sopPriorityCandidate?.driverPhone ||
    (initialDriver ? activeDrivers.find((d) => d.name === initialDriver)?.phone : '') ||
    '09120000000';

  const initialVehicleCode =
    order.waybill?.vehicleCode ||
    order.assignedVehicleCode ||
    initialAssignedVehicle?.code ||
    sopPriorityCandidate?.vehicleCode;

  // Mode: 'WAYBILL' | 'INVOICE' | 'BOTH'
  const [conversionTarget, setConversionTarget] = useState<
    'WAYBILL' | 'INVOICE' | 'BOTH'
  >(order.waybill && !order.invoice ? 'INVOICE' : !order.waybill && order.invoice ? 'WAYBILL' : 'BOTH');

  // Form State: Waybill
  const [waybillNumber, setWaybillNumber] = useState<string>(
    order.waybill?.waybillNumber || `BL-${today.jy}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [waybillDate, setWaybillDate] = useState<string>(
    order.waybill?.issueDate || `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`
  );
  const [senderName, setSenderName] = useState<string>(
    order.waybill?.senderName || order.customerCompany || order.customerName
  );
  const [senderPhone, setSenderPhone] = useState<string>(
    order.waybill?.senderPhone || order.customerPhone
  );
  const [senderAddress, setSenderAddress] = useState<string>(
    order.waybill?.senderAddress || order.originAddress
  );
  const [receiverName, setReceiverName] = useState<string>(
    order.waybill?.receiverName || `تحویل‌گیرنده در ${order.destinationCity}`
  );
  const [receiverPhone, setReceiverPhone] = useState<string>(
    order.waybill?.receiverPhone || ''
  );
  const [receiverAddress, setReceiverAddress] = useState<string>(
    order.waybill?.receiverAddress || order.destinationAddress
  );
  const [cargoType, setCargoType] = useState<string>(
    order.waybill?.cargoType || order.cargoDescription
  );
  const [cargoWeightTon, setCargoWeightTon] = useState<number>(
    order.waybill?.cargoWeightTon || order.cargoWeightTon
  );
  const [cargoPackageCount, setCargoPackageCount] = useState<number>(
    order.waybill?.cargoPackageCount || order.packageCount || 1
  );
  const [declaredValueRial, setDeclaredValueRial] = useState<number>(
    order.waybill?.declaredValueRial || order.estimatedFareRial * 10
  );

  // Driver & Vehicle state
  const [driverName, setDriverName] = useState<string>(initialDriver);
  const [driverPhone, setDriverPhone] = useState<string>(initialPhone);
  const [vehiclePlate, setVehiclePlate] = useState<string>(initialPlate);
  const [assignedVehicleCode, setAssignedVehicleCode] = useState<number | undefined>(
    initialVehicleCode
  );

  // Fleet dropdown selected key
  const [selectedFleetKey, setSelectedFleetKey] = useState<string>(() => {
    const matched = assignedFleetList.find(
      (item) =>
        (initialVehicleCode && item.vehicleCode === initialVehicleCode) ||
        (initialDriver && item.driverName === initialDriver) ||
        (initialPlate && item.plateNumber === initialPlate)
    );
    return matched ? matched.id : sopPriorityCandidate?.id || '';
  });

  const [driverValidationError, setDriverValidationError] = useState<string | null>(null);
  const [sopFeedbackMessage, setSopFeedbackMessage] = useState<string | null>(null);

  // Quick Action: Apply Dispatch SOP priority (دستورالعمل دیسپچ حامی)
  const handleApplyDispatchSOP = () => {
    if (!sopPriorityCandidate) {
      setDriverValidationError('هیچ خودروی فعالی با راننده اختصاص‌یافته در ناوگان یافت نشد.');
      return;
    }
    setSelectedFleetKey(sopPriorityCandidate.id);
    setDriverName(sopPriorityCandidate.driverName);
    setVehiclePlate(sopPriorityCandidate.plateNumber);
    setDriverPhone(sopPriorityCandidate.driverPhone);
    if (sopPriorityCandidate.vehicleCode) {
      setAssignedVehicleCode(sopPriorityCandidate.vehicleCode);
    }
    setDriverValidationError(null);
    setSopFeedbackMessage(
      `راننده «${sopPriorityCandidate.driverName}» با پلاک «${sopPriorityCandidate.plateNumber}» ${
        sopPriorityCandidate.queueStatus === 'IN_QUEUE'
          ? `(نوبت ${toFaDigits(sopPriorityCandidate.queueNumber || 1)} صف انتظار)`
          : ''
      } بر اساس دستورالعمل دیسپچ اعمال گردید.`
    );
  };

  // Handle selecting from fleet dropdown (Driver + Assigned Vehicle + Plate)
  const handleSelectFleetAssignment = (fleetId: string) => {
    setSelectedFleetKey(fleetId);
    setDriverValidationError(null);

    if (!fleetId) return;

    const chosen = assignedFleetList.find((item) => item.id === fleetId);
    if (chosen) {
      setDriverName(chosen.driverName);
      setVehiclePlate(chosen.plateNumber);
      if (chosen.driverPhone) setDriverPhone(chosen.driverPhone);
      if (chosen.vehicleCode) setAssignedVehicleCode(chosen.vehicleCode);
    }
  };

  const handleDriverChange = (val: string) => {
    setDriverName(val);
    setDriverValidationError(null);

    // Look for matching assigned fleet item
    const matchedFleetItem = assignedFleetList.find(
      (item) => item.driverName === val
    );
    if (matchedFleetItem) {
      setSelectedFleetKey(matchedFleetItem.id);
      setVehiclePlate(matchedFleetItem.plateNumber);
      if (matchedFleetItem.driverPhone) setDriverPhone(matchedFleetItem.driverPhone);
      if (matchedFleetItem.vehicleCode) setAssignedVehicleCode(matchedFleetItem.vehicleCode);
      return;
    }

    const matchedDriver = activeDrivers.find((d) => d.name === val);
    if (matchedDriver) {
      if (matchedDriver.phone) setDriverPhone(matchedDriver.phone);
      const matchedVeh = activeVehicles.find(
        (v) =>
          v.driverName === val ||
          (matchedDriver.assignedVehicles &&
            matchedDriver.assignedVehicles.some(
              (av) =>
                av.includes(String(v.code)) || (v.plateNumber && av.includes(v.plateNumber))
            ))
      );
      if (matchedVeh && matchedVeh.plateNumber) {
        setVehiclePlate(matchedVeh.plateNumber);
        setAssignedVehicleCode(matchedVeh.code);
        setSelectedFleetKey(`veh-${matchedVeh.code}`);
      }
    } else {
      const matchedVeh = activeVehicles.find(
        (v) => v.driverName === val || v.plateNumber === val
      );
      if (matchedVeh) {
        if (matchedVeh.driverPhone) setDriverPhone(matchedVeh.driverPhone);
        if (matchedVeh.plateNumber) setVehiclePlate(matchedVeh.plateNumber);
        if (matchedVeh.code) setAssignedVehicleCode(matchedVeh.code);
        setSelectedFleetKey(`veh-${matchedVeh.code}`);
      }
    }
  };

  const handlePlateChange = (val: string) => {
    setVehiclePlate(val);
    setDriverValidationError(null);

    const matchedFleetItem = assignedFleetList.find(
      (item) => item.plateNumber === val
    );
    if (matchedFleetItem) {
      setSelectedFleetKey(matchedFleetItem.id);
      setDriverName(matchedFleetItem.driverName);
      if (matchedFleetItem.driverPhone) setDriverPhone(matchedFleetItem.driverPhone);
      if (matchedFleetItem.vehicleCode) setAssignedVehicleCode(matchedFleetItem.vehicleCode);
      return;
    }

    const matchedVeh = activeVehicles.find((v) => v.plateNumber === val);
    if (matchedVeh && matchedVeh.driverName && matchedVeh.driverName !== 'بدون راننده') {
      setDriverName(matchedVeh.driverName);
      if (matchedVeh.driverPhone) setDriverPhone(matchedVeh.driverPhone);
      if (matchedVeh.code) setAssignedVehicleCode(matchedVeh.code);
      setSelectedFleetKey(`veh-${matchedVeh.code}`);
    }
  };
  const [shippingCostRial, setShippingCostRial] = useState<number>(
    order.waybill?.shippingCostRial || order.estimatedFareRial
  );
  const [waybillNotes, setWaybillNotes] = useState<string>(
    order.waybill?.notes || 'تخلیه سالم و بدون کسری در مقصد انجام گرفت.'
  );

  // Form State: Invoice
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    order.invoice?.invoiceNumber || `INV-${today.jy}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(
    order.invoice?.issueDate || `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`
  );
  const [customerEconomicCode, setCustomerEconomicCode] = useState<string>(
    order.invoice?.customerEconomicCode || '411000000000'
  );
  const [baseFreightRial, setBaseFreightRial] = useState<number>(
    order.invoice?.baseFreightRial || order.estimatedFareRial
  );
  const [loadingCostRial, setLoadingCostRial] = useState<number>(
    order.invoice?.loadingUnloadingCostRial || 0
  );
  const [insuranceFeeRial, setInsuranceFeeRial] = useState<number>(
    order.invoice?.insuranceFeeRial || Math.round(order.estimatedFareRial * 0.05)
  );
  const [stopoverCostRial, setStopoverCostRial] = useState<number>(
    order.invoice?.stopoverCostRial || 0
  );
  const [discountRial, setDiscountRial] = useState<number>(
    order.invoice?.discountRial || 0
  );
  const [taxPercent, setTaxPercent] = useState<number>(
    order.invoice?.taxPercent || 10
  );
  const [paymentStatus, setPaymentStatus] = useState<
    'UNPAID' | 'PAID' | 'CREDIT_30_DAYS' | 'PARTIAL'
  >(order.invoice?.paymentStatus || (order.paymentType === 'CREDIT' ? 'CREDIT_30_DAYS' : 'PAID'));
  const [paymentMethod, setPaymentMethod] = useState<
    'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'POS'
  >(order.invoice?.paymentMethod || 'BANK_TRANSFER');
  const [invoiceNotes, setInvoiceNotes] = useState<string>(
    order.invoice?.notes || 'صورتحساب رسمی حامی صادر شد.'
  );

  // Dynamic calculated invoice total
  const subtotalBeforeTax =
    baseFreightRial + loadingCostRial + insuranceFeeRial + stopoverCostRial - discountRial;
  const taxAmount = Math.round((Math.max(0, subtotalBeforeTax) * taxPercent) / 100);
  const grandTotalPayable = Math.max(0, subtotalBeforeTax) + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDriverValidationError(null);

    let newWaybill: WaybillDetails | undefined = undefined;
    let newInvoice: InvoiceDetails | undefined = undefined;

    if (conversionTarget === 'WAYBILL' || conversionTarget === 'BOTH') {
      const cleanDriver = driverName.trim();
      if (!cleanDriver || cleanDriver === 'بدون راننده' || cleanDriver === 'راننده ثبت نشده') {
        setDriverValidationError(
          '⛔ صدور بارنامه مسدود شد: ماشینی که راننده ندارد امکان اختصاص سرویس و صدور بارنامه ندارد. لطفاً ابتدا راننده را مشخص کنید.'
        );
        return;
      }

      const cleanPlate = vehiclePlate.trim();
      if (!cleanPlate) {
        setDriverValidationError(
          '⛔ صدور بارنامه مسدود شد: لطفاً شماره پلاک خودروی اختصاص‌یافته به راننده را از لیست ناوگان انتخاب نمایید.'
        );
        return;
      }

      newWaybill = {
        waybillNumber,
        issueDate: waybillDate,
        senderName,
        senderPhone,
        senderAddress,
        receiverName,
        receiverPhone,
        receiverAddress,
        cargoType,
        cargoWeightTon: Number(cargoWeightTon) || 0,
        cargoPackageCount: Number(cargoPackageCount) || 1,
        declaredValueRial: Number(declaredValueRial) || 0,
        insuranceAmountRial: Math.round(Number(declaredValueRial) * 0.01),
        driverName: cleanDriver,
        driverPhone: driverPhone.trim() || '09120000000',
        vehiclePlate: cleanPlate,
        vehicleCode: assignedVehicleCode || order.assignedVehicleCode,
        shippingCostRial: Number(shippingCostRial) || 0,
        notes: waybillNotes,
        createdAt: new Date().toISOString(),
      };
    }

    if (conversionTarget === 'INVOICE' || conversionTarget === 'BOTH') {
      newInvoice = {
        invoiceNumber,
        issueDate: invoiceDate,
        customerName: order.customerName,
        customerEconomicCode,
        customerPhone: order.customerPhone,
        customerAddress: order.originAddress,
        baseFreightRial: Number(baseFreightRial) || 0,
        loadingUnloadingCostRial: Number(loadingCostRial) || 0,
        insuranceFeeRial: Number(insuranceFeeRial) || 0,
        stopoverCostRial: Number(stopoverCostRial) || 0,
        discountRial: Number(discountRial) || 0,
        taxPercent: Number(taxPercent) || 0,
        taxAmountRial: taxAmount,
        totalPayableRial: grandTotalPayable,
        paymentStatus,
        paymentMethod,
        dueDate: paymentStatus === 'CREDIT_30_DAYS' ? `${today.jy}/${String(today.jm === 12 ? 1 : today.jm + 1).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}` : undefined,
        notes: invoiceNotes,
        createdAt: new Date().toISOString(),
      };
    }

    const saveHandler = onSaveConversion || onSave;
    if (typeof saveHandler === 'function') {
      saveHandler(order.id, newWaybill, newInvoice);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none">
      <div className="bg-[#111b2e] border border-[#1f2c45] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#18263e] border-b border-[#1f2c45] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-white">
                تبدیل سفارش تکمیل‌شده به بارنامه یا صورتحساب مالی
              </h2>
              <span className="text-[11px] text-slate-400">
                سفارش: {order.orderNumber} • مشتری: {order.customerName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Choice Selector */}
        <div className="p-4 bg-[#0d1627] border-b border-[#1f2c45] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-300 font-bold">نوع سند مورد نیاز برای صدور:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConversionTarget('BOTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                conversionTarget === 'BOTH'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[#18263e] text-slate-300 hover:bg-[#203150] border border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-300" />
              <span>صدور همزمان هر دو (بارنامه + صورتحساب)</span>
            </button>

            <button
              type="button"
              onClick={() => setConversionTarget('WAYBILL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                conversionTarget === 'WAYBILL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-[#18263e] text-slate-300 hover:bg-[#203150] border border-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>فقط بارنامه</span>
            </button>

            <button
              type="button"
              onClick={() => setConversionTarget('INVOICE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                conversionTarget === 'INVOICE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#18263e] text-slate-300 hover:bg-[#203150] border border-slate-700'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>فقط صورتحساب</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* 1. Waybill Fields Section */}
          {(conversionTarget === 'WAYBILL' || conversionTarget === 'BOTH') && (
            <div className="bg-[#142036] border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 text-amber-400">
                <span className="text-xs font-black flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>مشخصات بارنامه رسمی جاده‌ای</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  شماره: {waybillNumber}
                </span>
              </div>

              {driverValidationError && (
                <div className="bg-rose-950/70 border border-rose-500/60 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-200">
                  <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">خطای اعتبارسنجی دیسپچ:</div>
                    <div className="mt-0.5">{driverValidationError}</div>
                  </div>
                </div>
              )}

              {/* پنل انتخاب هوشمند راننده و پلاک خودرو از ناوگان اختصاص‌یافته */}
              <div className="bg-[#0b1424] border-2 border-amber-500/50 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                        <span>انتخاب راننده و پلاک خودرو از ناوگان اختصاص‌یافته</span>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          ناوگان فعال
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        راننده‌ای که خودرو به او اختصاص داده شده است را جهت درج خودکار پلاک و شماره تماس در بارنامه انتخاب کنید:
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-300 font-mono bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg">
                    {toFaDigits(assignedFleetList.length)} راننده با خودرو اختصاصی
                  </span>
                </div>

                {/* بنر و دکمه اختصاصی دستورالعمل دیسپچ حامی */}
                <div className="bg-gradient-to-r from-amber-950/70 via-[#131f36] to-amber-950/50 border border-amber-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-300">
                          دستورالعمل دیسپچ و نوبت‌دهی حامی
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.2 rounded-full border border-amber-500/30 font-bold">
                          بند ۱ و ۲۴ آیین‌نامه
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        اولویت صدور بارنامه منحصراً به رانندگانی تعلق دارد که خودرو به آنها اختصاص یافته و در صف نوبت صبحگاهی حضور دارند.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyDispatchSOP}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer shrink-0"
                    title="انتخاب خودکار راننده و پلاک خودرو بر اساس اولویت دستورالعمل صف نوبت"
                  >
                    <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                    <span>اعمال طبق دستورالعمل (نوبت اول صف)</span>
                  </button>
                </div>

                {sopFeedbackMessage && (
                  <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-emerald-200 flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{sopFeedbackMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSopFeedbackMessage(null)}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* چیپ‌های انتخاب سریع رانندگان حاضر در صف نوبت */}
                {assignedFleetList.filter((item) => item.queueStatus === 'IN_QUEUE').length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <span>انتخاب سریع راننده حاضر در صف نوبت طبق دستورالعمل:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedFleetList
                        .filter((item) => item.queueStatus === 'IN_QUEUE')
                        .map((item) => {
                          const isSelected = selectedFleetKey === item.id || driverName === item.driverName;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectFleetAssignment(item.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                  : 'bg-[#14233c] hover:bg-[#1a2d4d] text-slate-200 border border-slate-700/80'
                              }`}
                            >
                              <span className="w-4 h-4 rounded-full bg-slate-900/40 text-[10px] flex items-center justify-center font-mono font-bold">
                                {toFaDigits(item.queueNumber || 1)}
                              </span>
                              <span>{item.driverName}</span>
                              <span className="text-[10px] opacity-80 font-mono">({item.plateNumber})</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* منوی بازشونده انتخاب مستقیم راننده و خودرو اختصاص‌یافته */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1.5">
                    انتخاب از تمام ناوگان (راننده + پلاک اختصاصی):
                  </label>
                  <select
                    value={selectedFleetKey}
                    onChange={(e) => handleSelectFleetAssignment(e.target.value)}
                    className="w-full bg-[#111b2e] border-2 border-amber-500/60 hover:border-amber-400 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-bold focus:outline-none transition shadow-inner cursor-pointer"
                  >
                    <option value="">-- کلیک کنید: انتخاب راننده و خودروی اختصاص‌یافته از ناوگان --</option>

                    {/* خودروهای حاضر در صف نوبت */}
                    {assignedFleetList.some((item) => item.queueStatus === 'IN_QUEUE') && (
                      <optgroup label="🟢 خودروهای حاضر در صف نوبت بارنامه (دارای راننده و پلاک معتبر)">
                        {assignedFleetList
                          .filter((item) => item.queueStatus === 'IN_QUEUE')
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              نوبت {toFaDigits(item.queueNumber || 1)}: {item.driverName} ⟵ {item.vehicleTypeName} (پلاک {item.plateNumber})
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* سایر رانندگان ناوگان با خودرو اختصاصی */}
                    <optgroup label="🚗 رانندگان ناوگان با خودروی اختصاص‌یافته و پلاک فعال">
                      {assignedFleetList
                        .filter((item) => item.queueStatus !== 'IN_QUEUE')
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.driverName} ⟵ {item.vehicleTypeName} (پلاک {item.plateNumber}) {item.vehicleCode ? `[کد ${toFaDigits(item.vehicleCode)}]` : ''}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* پیش‌نمایش پلاک و مشخصات راننده منتخب */}
                {driverName && vehiclePlate ? (
                  <div className="bg-[#14233c] border border-emerald-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">نام راننده مجری:</span>
                        <span className="text-sm font-black text-white flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {driverName}
                        </span>
                      </div>

                      <div className="h-8 w-[1px] bg-slate-700 hidden sm:block" />

                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 mb-0.5">پلاک خودرو اختصاص‌یافته:</span>
                        <div>
                          <IranianPlate plateNumber={vehiclePlate} size="sm" />
                        </div>
                      </div>

                      <div className="h-8 w-[1px] bg-slate-700 hidden sm:block" />

                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">شماره تماس راننده:</span>
                        <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-400" />
                          {toFaDigits(driverPhone)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>تأیید ناوگان حامی (آماده صدور)</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      راننده و پلاک خودرو از منوی بالا انتخاب شود، یا در فیلدهای زیر نام راننده را مشخص کنید تا پلاک خودروی اختصاصی او بارگذاری شود.
                    </span>
                  </div>
                )}
              </div>

              {/* فیلدهای تفصیلی بارنامه */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">شماره بارنامه</label>
                  <input
                    type="text"
                    value={waybillNumber}
                    onChange={(e) => setWaybillNumber(e.target.value)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <PersianDatePicker
                    label="تاریخ صدور بارنامه"
                    required
                    value={waybillDate}
                    onChange={(val) => setWaybillDate(val)}
                    placeholder="انتخاب تاریخ صدور..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نام فرستنده بار</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نام گیرنده بار در مقصد</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    نام راننده مجری حمل <span className="text-emerald-400 text-[10px]">(یا انتخاب از ناوگان)</span>
                  </label>
                  <input
                    type="text"
                    list="drivers-modal-list"
                    value={driverName}
                    onChange={(e) => handleDriverChange(e.target.value)}
                    placeholder="نام راننده مجری..."
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"
                    required
                  />
                  <datalist id="drivers-modal-list">
                    {assignedFleetList.map((item) => (
                      <option key={item.id} value={item.driverName}>
                        {item.driverName} - پلاک {item.plateNumber}
                      </option>
                    ))}
                    {activeDrivers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.phone ? `(${toFaDigits(d.phone)})` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    شماره پلاک خودروی اختصاص‌یافته
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => handlePlateChange(e.target.value)}
                    placeholder="مثال: ایران ۱۱ - ۷۸۹ ب ۳۴"
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-amber-300 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    شماره تماس راننده (جهت پیگیری و ردیابی)
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">شرح کالا و بسته‌بندی</label>
                  <input
                    type="text"
                    value={cargoType}
                    onChange={(e) => setCargoType(e.target.value)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">وزن بار (تن)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cargoWeightTon}
                    onChange={(e) => setCargoWeightTon(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">کرایه مصوب بارنامه (ریال)</label>
                  <input
                    type="number"
                    value={shippingCostRial}
                    onChange={(e) => setShippingCostRial(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Invoice Fields Section */}
          {(conversionTarget === 'INVOICE' || conversionTarget === 'BOTH') && (
            <div className="bg-[#142036] border border-emerald-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 text-emerald-400">
                <span className="text-xs font-black flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  <span>مشخصات صورتحساب و محاسبات مالی</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  شماره: {invoiceNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">شماره صورتحساب</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <PersianDatePicker
                    label="تاریخ صدور صورتحساب"
                    value={invoiceDate}
                    onChange={(val) => setInvoiceDate(val)}
                    placeholder="انتخاب تاریخ..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">کد اقتصادی / شناسه مشتری</label>
                  <input
                    type="text"
                    value={customerEconomicCode}
                    onChange={(e) => setCustomerEconomicCode(e.target.value)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">وضعیت پرداخت</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                  >
                    <option value="PAID">تسویه شده کامل</option>
                    <option value="CREDIT_30_DAYS">اعتباری ۳۰ روزه</option>
                    <option value="UNPAID">در انتظار واریز</option>
                    <option value="PARTIAL">تسویه علی‌الحساب</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">کرایه پایه حمل (ریال)</label>
                  <input
                    type="number"
                    value={baseFreightRial}
                    onChange={(e) => setBaseFreightRial(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">هزینه بارگیری / خدمات (ریال)</label>
                  <input
                    type="number"
                    value={loadingCostRial}
                    onChange={(e) => setLoadingCostRial(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">حق بیمه و مسئولیت (ریال)</label>
                  <input
                    type="number"
                    value={insuranceFeeRial}
                    onChange={(e) => setInsuranceFeeRial(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">درصد ارزش افزوده</label>
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">تخفیف (ریال)</label>
                  <input
                    type="number"
                    value={discountRial}
                    onChange={(e) => setDiscountRial(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#111b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">مبلغ کل محاسبه‌شده نهایی</label>
                  <div className="w-full bg-[#0d1627] border border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-emerald-400 font-mono font-bold">
                    {toFaDigits(grandTotalPayable.toLocaleString('fa-IR'))} ریال
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
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
              className="px-5 py-2 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>تأیید و صدور سند</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
