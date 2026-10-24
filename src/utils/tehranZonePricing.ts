import {
  NeighborhoodItem,
  ReservationRates,
  TEHRAN_NEIGHBORHOODS,
  ZoneType,
  TehranZoneSector,
  getSafeReservationRates,
} from './reservationRates';

export type RouteCategory =
  | 'INTERNAL_SAME_ZONE'
  | 'INTERNAL_CROSS_ZONE'
  | 'INTERNAL_TO_SUBURB'
  | 'SUBURB_TO_INTERNAL'
  | 'INTERNAL_TO_SPECIAL_SUBURB'
  | 'SPECIAL_SUBURB_TO_INTERNAL'
  | 'SUBURB_TO_SUBURB'
  | 'SUBURB_TO_SPECIAL_SUBURB'
  | 'SPECIAL_SUBURB_TO_SPECIAL_SUBURB';

export interface RouteTariffResult {
  routeCategory: RouteCategory;
  categoryTitle: string;
  categoryBadge: string;
  effectiveZoneType: ZoneType;
  requiresDeposit: boolean;
  depositReason?: string;
  isCrossZoneInternal: boolean;
  
  // Base parameters
  khavarBaseHours: number;
  khavarBaseFare: number;
  khavarOvertimeRate: number;

  nissanBaseHours: number;
  nissanBaseFare: number;
  nissanOvertimeRate: number;

  laborBaseHours: number;
  laborKhavarBaseWage: number;
  laborKhavarOvertimeWage: number;
  laborNissanBaseWage: number;
  laborNissanOvertimeWage: number;

  crossZoneSurcharge: number;
  description: string;
}

export function detectNeighborhood(input: string): NeighborhoodItem | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim().toLowerCase();
  
  // Exact or partial match
  const found = TEHRAN_NEIGHBORHOODS.find(
    (n) =>
      n.name.toLowerCase().includes(clean) ||
      clean.includes(n.name.toLowerCase()) ||
      (n.description && n.description.toLowerCase().includes(clean))
  );
  return found || null;
}

export function calculateRouteTariff(
  origin: NeighborhoodItem | null,
  destination: NeighborhoodItem | null,
  ratesInput?: Partial<ReservationRates> | null
): RouteTariffResult {
  const rates = getSafeReservationRates(ratesInput);
  const originZone: ZoneType = origin ? origin.zoneType : 'INTERNAL';
  const destZone: ZoneType = destination ? destination.zoneType : 'INTERNAL';
  
  const originSector: TehranZoneSector = origin ? origin.sector : 'CENTER';
  const destSector: TehranZoneSector = destination ? destination.sector : 'CENTER';

  // Check if cross-zone inside Tehran (e.g. East to West or North to South)
  const isCrossZoneInternal =
    originZone === 'INTERNAL' &&
    destZone === 'INTERNAL' &&
    ((originSector === 'EAST' && destSector === 'WEST') ||
      (originSector === 'WEST' && destSector === 'EAST') ||
      (originSector === 'NORTH' && destSector === 'SOUTH') ||
      (originSector === 'SOUTH' && destSector === 'NORTH'));

  // Determine Category
  if (originZone === 'SPECIAL_SUBURB' || destZone === 'SPECIAL_SUBURB') {
    const isBothSpecial = originZone === 'SPECIAL_SUBURB' && destZone === 'SPECIAL_SUBURB';
    const hasSuburb = originZone === 'SUBURB' || destZone === 'SUBURB';
    
    const cat: RouteCategory = isBothSpecial
      ? 'SPECIAL_SUBURB_TO_SPECIAL_SUBURB'
      : hasSuburb
      ? 'SUBURB_TO_SPECIAL_SUBURB'
      : originZone === 'SPECIAL_SUBURB'
      ? 'SPECIAL_SUBURB_TO_INTERNAL'
      : 'INTERNAL_TO_SPECIAL_SUBURB';

    return {
      routeCategory: cat,
      categoryTitle: 'حومه ویژه و بخش‌های دورتر (هشتگرد، گیلاوند، دماوند و...)',
      categoryBadge: 'حومه ویژه / مسافت دور',
      effectiveZoneType: 'SPECIAL_SUBURB',
      requiresDeposit: true,
      depositReason: 'به دلیل بعد مسافت و هزینه اعزام به حومه ویژه (هشتگرد، گیلاوند، دماوند و...)، اخذ حداقل ۳۰٪ بیعانه الزامی است.',
      isCrossZoneInternal: false,
      khavarBaseHours: rates.khavarSpecialSuburb.baseHours,
      khavarBaseFare: rates.khavarSpecialSuburb.basePrice,
      khavarOvertimeRate: rates.khavarSpecialSuburb.overtimeHourly,
      nissanBaseHours: rates.nissanSpecialSuburb.baseHours,
      nissanBaseFare: rates.nissanSpecialSuburb.basePrice,
      nissanOvertimeRate: rates.nissanSpecialSuburb.overtimeHourly,
      laborBaseHours: rates.laborSpecialSuburb.baseHours,
      laborKhavarBaseWage: rates.laborSpecialSuburb.basePrice,
      laborKhavarOvertimeWage: rates.laborSpecialSuburb.overtimeHourly,
      laborNissanBaseWage: rates.laborNissanSuburb.basePrice,
      laborNissanOvertimeWage: rates.laborNissanSuburb.overtimeHourly,
      crossZoneSurcharge: 0,
      description: 'مسیر با مبدأ یا مقصد در حومه ویژه (بخش‌های ییلاقی یا دورتر). زمان پایه ۴ ساعت به همراه کرایه ترانزیت حومه ویژه محاسبه می‌گردد.',
    };
  }

  if (originZone === 'SUBURB' || destZone === 'SUBURB') {
    const isBothSuburb = originZone === 'SUBURB' && destZone === 'SUBURB';
    const cat: RouteCategory = isBothSuburb
      ? 'SUBURB_TO_SUBURB'
      : originZone === 'SUBURB'
      ? 'SUBURB_TO_INTERNAL'
      : 'INTERNAL_TO_SUBURB';

    return {
      routeCategory: cat,
      categoryTitle: 'حومه تهران (اسلامشهر، کرج، شهریار، پردیس و...)',
      categoryBadge: 'حومه استاندارد تهران',
      effectiveZoneType: 'SUBURB',
      requiresDeposit: true,
      depositReason: 'مبدأ یا مقصد در محدوده حومه تهران (کرج، اسلامشهر، شهریار و...) واقع شده و دریافت بیعانه الزامی است.',
      isCrossZoneInternal: false,
      khavarBaseHours: rates.khavarSuburb.baseHours,
      khavarBaseFare: rates.khavarSuburb.basePrice,
      khavarOvertimeRate: rates.khavarSuburb.overtimeHourly,
      nissanBaseHours: rates.nissanSuburb.baseHours,
      nissanBaseFare: rates.nissanSuburb.basePrice,
      nissanOvertimeRate: rates.nissanSuburb.overtimeHourly,
      laborBaseHours: rates.laborKhavarDomestic.baseHours,
      laborKhavarBaseWage: rates.laborKhavarDomestic.basePrice,
      laborKhavarOvertimeWage: rates.laborKhavarDomestic.overtimeHourly,
      laborNissanBaseWage: rates.laborNissanSuburb.basePrice,
      laborNissanOvertimeWage: rates.laborNissanSuburb.overtimeHourly,
      crossZoneSurcharge: 0,
      description: 'سرویس متصل به حومه تهران. محاسبه بر مبنای تعرفه رسمی حومه با ساعت پایه ۳ ساعت و اضافه ساعت مصوب.',
    };
  }

  // Pure Internal (North, East, West, South, Center)
  const cat: RouteCategory = isCrossZoneInternal ? 'INTERNAL_CROSS_ZONE' : 'INTERNAL_SAME_ZONE';
  const crossSurcharge = isCrossZoneInternal ? rates.crossZoneInternalSurcharge : 0;

  return {
    routeCategory: cat,
    categoryTitle: isCrossZoneInternal
      ? 'داخلی تهران (تردد طولی کراس‌زون: شرق↔غرب یا شمال↔جنوب)'
      : 'داخلی تهران (مناطق شمال، شرق، غرب، مرکز و جنوب)',
    categoryBadge: isCrossZoneInternal ? 'داخلی تهران (طولی)' : 'داخلی تهران (عادی)',
    effectiveZoneType: 'INTERNAL',
    requiresDeposit: false,
    isCrossZoneInternal,
    khavarBaseHours: rates.khavarDomestic.baseHours,
    khavarBaseFare: rates.khavarDomestic.basePrice + crossSurcharge,
    khavarOvertimeRate: rates.khavarDomestic.overtimeHourly,
    nissanBaseHours: rates.nissanDomestic.baseHours,
    nissanBaseFare: rates.nissanDomestic.basePrice + (isCrossZoneInternal ? Math.round(crossSurcharge * 0.6) : 0),
    nissanOvertimeRate: rates.nissanDomestic.overtimeHourly,
    laborBaseHours: rates.laborKhavarDomestic.baseHours,
    laborKhavarBaseWage: rates.laborKhavarDomestic.basePrice,
    laborKhavarOvertimeWage: rates.laborKhavarDomestic.overtimeHourly,
    laborNissanBaseWage: rates.laborNissanDomestic.basePrice,
    laborNissanOvertimeWage: rates.laborNissanDomestic.overtimeHourly,
    crossZoneSurcharge: crossSurcharge,
    description: isCrossZoneInternal
      ? 'تردد طولی بین دو قطب دور تهران (مانند شرق به غرب یا شمال به جنوب با احتساب ترافیک بزرگراهی).'
      : 'سرویس کاملاً درون‌شهری در محدوده مناطق ۲۲ گانه تهران با پایه ۳ ساعت.',
  };
}
