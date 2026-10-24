import { VehicleItem } from './fleetSeedData';

export type GpsVehicleStatus =
  | 'WITH_WAYBILL' // دارای بارنامه فعال (آبی)
  | 'STARTED_IN_TRANSIT' // شروع کار داده / در حال حرکت (بنفش)
  | 'FREE_AVAILABLE' // آزاد و آماده به کار (سبز)
  | 'LOADING_UNLOADING' // در حال بارگیری / تخلیه (زرد)
  | 'PARKING_OFFLINE' // متوقف در پارکینگ مرکزی (خاکستری)
  | 'IN_WORKSHOP'; // در تعمیرگاه / سرویس فنی (قرمز)

export interface GpsStatusConfig {
  key: GpsVehicleStatus;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  markerColor: string;
  markerBorder: string;
  markerPulseColor: string;
  iconBg: string;
  description: string;
}

export const GPS_STATUS_CONFIGS: Record<GpsVehicleStatus, GpsStatusConfig> = {
  WITH_WAYBILL: {
    key: 'WITH_WAYBILL',
    label: 'دارای بارنامه فعال',
    shortLabel: 'دارای بارنامه',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/40',
    markerColor: '#2563eb', // Blue-600
    markerBorder: '#60a5fa',
    markerPulseColor: 'rgba(37, 99, 235, 0.45)',
    iconBg: 'bg-blue-600',
    description: 'بارنامه صادر شده و در نوبت تحویل یا شروع مأموریت است',
  },
  STARTED_IN_TRANSIT: {
    key: 'STARTED_IN_TRANSIT',
    label: 'شروع کار داده (در حال حرکت)',
    shortLabel: 'شروع کار / در مسیر',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/40',
    markerColor: '#9333ea', // Purple-600
    markerBorder: '#c084fc',
    markerPulseColor: 'rgba(147, 51, 234, 0.55)',
    iconBg: 'bg-purple-600',
    description: 'استارت مأموریت زده شده و خودرو در محور حمل بار در حال حرکت است',
  },
  FREE_AVAILABLE: {
    key: 'FREE_AVAILABLE',
    label: 'آزاد و آماده به کار',
    shortLabel: 'آزاد و آماده',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    markerColor: '#10b981', // Emerald-500
    markerBorder: '#34d399',
    markerPulseColor: 'rgba(16, 185, 129, 0.35)',
    iconBg: 'bg-emerald-600',
    description: 'خودرو آماده بارگیری و اعزام برای صدور بارنامه جدید است',
  },
  LOADING_UNLOADING: {
    key: 'LOADING_UNLOADING',
    label: 'در حال بارگیری / تخلیه',
    shortLabel: 'بارگیری / تخلیه',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/40',
    markerColor: '#f59e0b', // Amber-500
    markerBorder: '#fbbf24',
    markerPulseColor: 'rgba(245, 158, 11, 0.35)',
    iconBg: 'bg-amber-600',
    description: 'خودرو در انبار یا مبدا/مقصد در حال عملیات بارگیری یا تخلیه کالا می‌باشد',
  },
  PARKING_OFFLINE: {
    key: 'PARKING_OFFLINE',
    label: 'متوقف در پارکینگ مرکزی',
    shortLabel: 'پارکینگ / متوقف',
    badgeBg: 'bg-slate-500/20',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/40',
    markerColor: '#64748b', // Slate-500
    markerBorder: '#94a3b8',
    markerPulseColor: 'rgba(100, 116, 139, 0.2)',
    iconBg: 'bg-slate-600',
    description: 'خودرو در پارکینگ یا توقفگاه مستقر بوده و سوییچ خاموش است',
  },
  IN_WORKSHOP: {
    key: 'IN_WORKSHOP',
    label: 'تعمیرگاه و سرویس فنی',
    shortLabel: 'تعمیرگاه / سرویس',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/40',
    markerColor: '#e11d48', // Rose-600
    markerBorder: '#f43f5e',
    markerPulseColor: 'rgba(225, 29, 72, 0.4)',
    iconBg: 'bg-rose-600',
    description: 'تحت تعمیرات اساسی، سرویس تعویض روغن یا رفع عیب مکانیکی/برقی',
  },
};

export interface GpsWaybillInfo {
  waybillNumber: string;
  origin: string;
  destination: string;
  cargoDescription: string;
  cargoWeightTon: number;
  receiverCompany: string;
  issueTime: string;
  estimatedArrival: string;
  distanceRemainingKm: number;
  progressPercent: number;
}

export interface LiveGpsVehicle {
  id: string;
  code: number;
  plateNumber: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  gpsStatus: GpsVehicleStatus;
  lat: number;
  lng: number;
  speed: number; // km/h
  heading: number; // 0 - 360
  ignition: boolean;
  batteryLevel: number; // percentage
  fuelLevel: number; // percentage
  satellites: number;
  lastPing: string;
  locationTitle: string;
  waybill?: GpsWaybillInfo;
  trail: Array<[number, number]>;
}

// Rich realistic nodes across Tehran metropolitan freight zones
interface LocationTemplate {
  status: GpsVehicleStatus;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  locationTitle: string;
  waybill?: Omit<GpsWaybillInfo, 'waybillNumber'>;
}

const REGION_TEMPLATES: LocationTemplate[] = [
  // 1. Transit West (Fath & Makhsoos Corridors)
  {
    status: 'STARTED_IN_TRANSIT',
    lat: 35.6885,
    lng: 51.2750,
    speed: 68,
    heading: 260,
    locationTitle: 'بزرگراه فتح، نرسیده به سه راه شهریار',
    waybill: {
      origin: 'انبار مرکزی حامی بار (فتح)',
      destination: 'شهرک صنعتی کاسپین (قزوین)',
      cargoDescription: 'لوازم خانگی و صوتی تصویری',
      cargoWeightTon: 4.8,
      receiverCompany: 'بازرگانی پارس گستر',
      issueTime: '۰۸:۳۰',
      estimatedArrival: '۱۱:۴۵',
      distanceRemainingKm: 78,
      progressPercent: 42,
    },
  },
  // 2. Terminal South
  {
    status: 'WITH_WAYBILL',
    lat: 35.5340,
    lng: 51.2810,
    speed: 0,
    heading: 180,
    locationTitle: 'پایانه باربری تهران، سکوی صدور حواله ۳',
    waybill: {
      origin: 'پایانه جنوب تهران',
      destination: 'بندرعباس، اسکله شهید رجایی',
      cargoDescription: 'مواد اولیه صنایع پتروشیمی',
      cargoWeightTon: 5.5,
      receiverCompany: 'صادرات جنوب',
      issueTime: '۰۹:۱۵',
      estimatedArrival: 'فردا ۱۶:۰۰',
      distanceRemainingKm: 1240,
      progressPercent: 5,
    },
  },
  // 3. Central Parking (Free)
  {
    status: 'FREE_AVAILABLE',
    lat: 35.6720,
    lng: 51.2950,
    speed: 0,
    heading: 90,
    locationTitle: 'پارکینگ مرکزی حامی بار، لاین آماده اعزام',
  },
  // 4. Azadegan Ringway
  {
    status: 'STARTED_IN_TRANSIT',
    lat: 35.6120,
    lng: 51.3550,
    speed: 74,
    heading: 110,
    locationTitle: 'بزرگراه آزادگان، تقاطع آیت‌الله سعیدی',
    waybill: {
      origin: 'انبار شورآباد شماره ۲',
      destination: 'میدان مرکزی میوه و تره‌بار تهران',
      cargoDescription: 'مرکبات و مواد غذایی تازه',
      cargoWeightTon: 3.9,
      receiverCompany: 'تعاونی میوه و تره‌بار',
      issueTime: '۰۷:۴۵',
      estimatedArrival: '۱۰:۱۵',
      distanceRemainingKm: 18,
      progressPercent: 70,
    },
  },
  // 5. Shourabad Hub
  {
    status: 'LOADING_UNLOADING',
    lat: 35.4850,
    lng: 51.3120,
    speed: 0,
    heading: 45,
    locationTitle: 'منطقه لجستیکی شورآباد، انبار سپیدار ۴',
    waybill: {
      origin: 'انبار مرکزی شورآباد',
      destination: 'شهرک صنعتی پرند',
      cargoDescription: 'قطعات خودرو و ریخته‌گری',
      cargoWeightTon: 4.2,
      receiverCompany: 'سازه گستر پرند',
      issueTime: '۰۹:۴۰',
      estimatedArrival: '۱۳:۰۰',
      distanceRemainingKm: 45,
      progressPercent: 12,
    },
  },
  // 6. Makhsoos Karaj Km 11
  {
    status: 'WITH_WAYBILL',
    lat: 35.7050,
    lng: 51.2210,
    speed: 38,
    heading: 275,
    locationTitle: 'جاده مخصوص کرج، کیلومتر ۱۱',
    waybill: {
      origin: 'ایستگاه مرکزی حامی بار',
      destination: 'کارخانه داروسازی البرز (کرج)',
      cargoDescription: 'دارو و ملزومات پزشکی (یخچالی)',
      cargoWeightTon: 2.8,
      receiverCompany: 'پخش دارویی البرز',
      issueTime: '۰۸:۵۰',
      estimatedArrival: '۱۰:۴۰',
      distanceRemainingKm: 28,
      progressPercent: 55,
    },
  },
  // 7. Azadi Logistics
  {
    status: 'FREE_AVAILABLE',
    lat: 35.6997,
    lng: 51.3380,
    speed: 0,
    heading: 0,
    locationTitle: 'میدان آزادی، انبار ترانزیت غربی',
  },
  // 8. Central Workshop
  {
    status: 'IN_WORKSHOP',
    lat: 35.6705,
    lng: 51.2910,
    speed: 0,
    heading: 180,
    locationTitle: 'تعمیرگاه مرکزی حامی بار، چال سرویس شماره ۲',
  },
  // 9. Central Parking Offline
  {
    status: 'PARKING_OFFLINE',
    lat: 35.6715,
    lng: 51.2980,
    speed: 0,
    heading: 90,
    locationTitle: 'پارکینگ خودروهای سنگین حامی بار (بخش شرقی)',
  },
  // 10. Hemmat Highway
  {
    status: 'STARTED_IN_TRANSIT',
    lat: 35.7550,
    lng: 51.3100,
    speed: 62,
    heading: 85,
    locationTitle: 'بزرگراه همت، غرب به شرق بعد از جنت‌آباد',
    waybill: {
      origin: 'انبار فتح',
      destination: 'تهرانپارس، خیابان دماوند',
      cargoDescription: 'بسته‌های پستی و تجارت الکترونیک',
      cargoWeightTon: 2.1,
      receiverCompany: 'مرکز توزیع شرق',
      issueTime: '۰۸:۱۰',
      estimatedArrival: '۱۰:۳۰',
      distanceRemainingKm: 22,
      progressPercent: 65,
    },
  },
  // 11. Khavaran Terminal East
  {
    status: 'FREE_AVAILABLE',
    lat: 35.5890,
    lng: 51.5200,
    speed: 0,
    heading: 270,
    locationTitle: 'باربری خاوران، بارانداز شماره ۶',
  },
  // 12. Tehran-Karaj Highway
  {
    status: 'STARTED_IN_TRANSIT',
    lat: 35.7950,
    lng: 50.9850,
    speed: 78,
    heading: 310,
    locationTitle: 'اتوبان تهران - کرج، ورودی مهرویلا',
    waybill: {
      origin: 'انبار مرکزی تهران',
      destination: 'شهرک صنعتی سیمین دشت',
      cargoDescription: 'رنگ و پوشش‌های صنعتی',
      cargoWeightTon: 5.1,
      receiverCompany: 'صنایع شیمیایی البرز',
      issueTime: '۰۸:۰۰',
      estimatedArrival: '۱۰:۰۰',
      distanceRemainingKm: 14,
      progressPercent: 82,
    },
  },
  // 13. Tehranpars Logistics East
  {
    status: 'WITH_WAYBILL',
    lat: 35.7350,
    lng: 51.5420,
    speed: 25,
    heading: 90,
    locationTitle: 'بزرگراه شهید یاسینی، خروجی تهرانپارس',
    waybill: {
      origin: 'انبار شرق تهران',
      destination: 'شهرک صنعتی عباس‌آباد',
      cargoDescription: 'آهن‌آلات و پروفیل سبک',
      cargoWeightTon: 4.6,
      receiverCompany: 'فولاد سازان شرق',
      issueTime: '۰۹:۰۰',
      estimatedArrival: '۱۱:۱۵',
      distanceRemainingKm: 32,
      progressPercent: 30,
    },
  },
  // 14. Saveh Highway Industrial
  {
    status: 'STARTED_IN_TRANSIT',
    lat: 35.5420,
    lng: 51.1550,
    speed: 72,
    heading: 220,
    locationTitle: 'اتوبان ساوه، خروجی اسلامشهر',
    waybill: {
      origin: 'انبار فتح',
      destination: 'شهرک صنعتی شمس آباد',
      cargoDescription: 'کاشی و سرامیک پرسلان',
      cargoWeightTon: 5.8,
      receiverCompany: 'صنایع سنگ و سرامیک پارس',
      issueTime: '۰۸:۲۰',
      estimatedArrival: '۱۰:۵۰',
      distanceRemainingKm: 40,
      progressPercent: 48,
    },
  },
  // 15. Garmdarreh Hub
  {
    status: 'LOADING_UNLOADING',
    lat: 35.7480,
    lng: 51.1250,
    speed: 0,
    heading: 0,
    locationTitle: 'منطقه صنعتی گرمدره، سردخانه آریا',
    waybill: {
      origin: 'سردخانه آریا گرمدره',
      destination: 'انبار مرکزی حامی بار',
      cargoDescription: 'گوشت و پروتئین منجمد',
      cargoWeightTon: 3.5,
      receiverCompany: 'پخش پروتئین حامی',
      issueTime: '۰۹:۳۰',
      estimatedArrival: '۱۱:۴۵',
      distanceRemainingKm: 19,
      progressPercent: 15,
    },
  },
  // 16. Niayesh / Satarkhan North
  {
    status: 'STARTED_IN_TRANSIT',
    lat: 35.7720,
    lng: 51.3780,
    speed: 55,
    heading: 140,
    locationTitle: 'بزرگراه نیایش، تقاطع یادگار امام',
    waybill: {
      origin: 'انبار ترانزیت غرب',
      destination: 'خیابان شریعتی، مجتمع تجاری کوروش',
      cargoDescription: 'منسوجات و پوشاک فروشگاهی',
      cargoWeightTon: 1.8,
      receiverCompany: 'زنجیره فروشگاه‌های ایرانیان',
      issueTime: '۰۸:۴۰',
      estimatedArrival: '۱۰:۱۰',
      distanceRemainingKm: 12,
      progressPercent: 75,
    },
  },
  // 17. Workshop North Yard
  {
    status: 'IN_WORKSHOP',
    lat: 35.6690,
    lng: 51.2930,
    speed: 0,
    heading: 270,
    locationTitle: 'تعمیرگاه تخصصی دیزل حامی بار، بخش جلوبندی',
  },
  // 18. Central Parking Bay 4
  {
    status: 'PARKING_OFFLINE',
    lat: 35.6730,
    lng: 51.2940,
    speed: 0,
    heading: 90,
    locationTitle: 'پارکینگ مرکزی، سکوی توقف شبانه ۴',
  },
];

/**
 * Initializes GPS live positions for all vehicles in the fleet.
 * Ensures 100% of vehicles get clean, distinct coordinates and status.
 */
export function generateLiveGpsVehicles(vehicles: VehicleItem[]): LiveGpsVehicle[] {
  return vehicles.map((v, index) => {
    // Select base template using modulo
    const template = REGION_TEMPLATES[index % REGION_TEMPLATES.length];

    // Determine status with realistic fleet alignment
    let gpsStatus: GpsVehicleStatus = template.status;

    if (v.status === 'PARKING' || !v.driverName || v.driverName.includes('بدون راننده')) {
      gpsStatus = 'PARKING_OFFLINE';
    } else if (v.status === 'IN_MAINTENANCE') {
      gpsStatus = 'IN_WORKSHOP';
    } else if (v.status === 'IN_MISSION') {
      gpsStatus = index % 2 === 0 ? 'STARTED_IN_TRANSIT' : 'WITH_WAYBILL';
    } else if (v.status === 'ACTIVE') {
      const mode = (v.code * 7 + index) % 6;
      if (mode === 0 || mode === 1) gpsStatus = 'STARTED_IN_TRANSIT';
      else if (mode === 2) gpsStatus = 'WITH_WAYBILL';
      else if (mode === 3) gpsStatus = 'FREE_AVAILABLE';
      else if (mode === 4) gpsStatus = 'LOADING_UNLOADING';
      else gpsStatus = 'FREE_AVAILABLE';
    }

    // Deterministic spread around template so markers don't overlap
    const angle = (v.code * 47) % 360;
    const rad = (angle * Math.PI) / 180;
    const radius = 0.003 + (v.code % 5) * 0.0025;

    const lat = Number((template.lat + Math.cos(rad) * radius).toFixed(5));
    const lng = Number((template.lng + Math.sin(rad) * radius).toFixed(5));

    const isMoving = gpsStatus === 'STARTED_IN_TRANSIT' || (gpsStatus === 'WITH_WAYBILL' && template.speed > 0);
    const speed = isMoving ? Math.max(30, (template.speed + (v.code % 17) - 8)) : 0;
    const ignition = isMoving || gpsStatus === 'LOADING_UNLOADING' || gpsStatus === 'WITH_WAYBILL';

    // Generate trail points for transit vehicles
    const trail: Array<[number, number]> = isMoving
      ? [
          [Number((lat - Math.cos(rad) * 0.02).toFixed(5)), Number((lng - Math.sin(rad) * 0.02).toFixed(5))],
          [Number((lat - Math.cos(rad) * 0.01).toFixed(5)), Number((lng - Math.sin(rad) * 0.01).toFixed(5))],
          [lat, lng],
        ]
      : [[lat, lng]];

    const waybillNumber = `BL-1403/${8800 + (v.code * 19) % 1190}`;

    return {
      id: v.id,
      code: v.code,
      plateNumber: v.plateNumber,
      vehicleType: v.vehicleType,
      driverName: v.driverName || 'بدون راننده',
      driverPhone: v.driverPhone || '---',
      gpsStatus,
      lat,
      lng,
      speed,
      heading: (template.heading + (v.code * 25)) % 360,
      ignition,
      batteryLevel: 88 + (v.code % 12),
      fuelLevel: 25 + ((v.code * 13) % 70),
      satellites: 10 + (v.code % 7),
      lastPing: isMoving ? 'همین الان' : `${(v.code % 7) + 1} دقیقه پیش`,
      locationTitle: template.locationTitle,
      waybill: (gpsStatus === 'WITH_WAYBILL' || gpsStatus === 'STARTED_IN_TRANSIT' || gpsStatus === 'LOADING_UNLOADING')
        ? {
            ...(template.waybill || {
              origin: 'انبار مرکزی حامی بار (فتح)',
              destination: 'کرج، شهرک صنعتی سیمین دشت',
              cargoDescription: 'قطعات صنعتی و اقلام عمومی',
              cargoWeightTon: Number((3.2 + (v.code % 30) * 0.1).toFixed(1)),
              receiverCompany: 'شرکت توزیع و پخش کالا',
              issueTime: '۰۸:۳۰',
              estimatedArrival: '۱۱:۴۵',
              distanceRemainingKm: 35,
              progressPercent: 45,
            }),
            waybillNumber,
          }
        : undefined,
      trail,
    };
  });
}
