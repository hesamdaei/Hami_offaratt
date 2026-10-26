import { OrderItem } from './ordersData';
import { toFaDigits } from './jalaali';

export type TrackingMilestone =
  | 'REGISTERED'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'ARRIVED_DESTINATION'
  | 'DELIVERED';

export interface TrackingLocationPoint {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface CurrentLocationState {
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  accuracyMeters: number;
  timestamp: number;
  updatedAtFa: string;
  isRealGps: boolean;
}

export interface TrackingMilestoneStep {
  status: TrackingMilestone;
  title: string;
  description: string;
  timeFa: string;
  completed: boolean;
}

export interface CargoTrackingItem {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCompany?: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  vehicleType: string;
  cargoDescription: string;
  cargoWeightTon?: number;
  packageCount?: number;
  origin: TrackingLocationPoint;
  destination: TrackingLocationPoint;
  currentLocation: CurrentLocationState;
  status: TrackingMilestone;
  isLiveBroadcasting: boolean;
  estimatedEtaMinutes: number;
  distanceRemainingKm: number;
  progressPercent: number;
  driverNote?: string;
  history: TrackingMilestoneStep[];
  routePoints: Array<[number, number]>;
  currentRouteIndex: number;
  createdAt: string;
}

const STORAGE_KEY_TRACKING = 'hamibar_cargo_trackings_v1';
const BROADCAST_CHANNEL_NAME = 'hamibar_cargo_tracking_bus';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel unavailable in some sandbox environments
}

export const MILESTONE_CONFIG: Record<
  TrackingMilestone,
  {
    label: string;
    description: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    stepIndex: number;
  }
> = {
  REGISTERED: {
    label: 'ثبت و هماهنگی بار',
    description: 'بارنامه و نوبت اختصاص یافته و راننده مشخص شده است',
    color: '#3b82f6',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/40',
    stepIndex: 1,
  },
  LOADING: {
    label: 'در حال بارگیری در مبدأ',
    description: 'کامیون در محل مبدأ مستقر بوده و عملیات بارگیری در جریان است',
    color: '#eab308',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-300',
    badgeBorder: 'border-yellow-500/40',
    stepIndex: 2,
  },
  IN_TRANSIT: {
    label: 'در مسیر انتقال به مقصد',
    description: 'بارگیری انجام شده و خودرو در حال حمل بار به سوی مقصد است',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/40',
    stepIndex: 3,
  },
  ARRIVED_DESTINATION: {
    label: 'رسیده به مقصد (در حال تخلیه)',
    description: 'ناوگان به مقصد رسیده و محموله در حال بازبینی و تخلیه است',
    color: '#a855f7',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/40',
    stepIndex: 4,
  },
  DELIVERED: {
    label: 'تحویل نهایی و اتمام مأموریت',
    description: 'بار با سلامت کامل به گیرنده تحویل شد و رسید دریافت گردید',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    stepIndex: 5,
  },
};

// Calculate Haversine distance in KM
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Calculate bearing/heading in degrees
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((bearing + 360) % 360);
}

// Generate realistic polyline route waypoints between origin & destination
function generateRoutePoints(
  origin: [number, number],
  dest: [number, number],
  steps = 25
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add realistic subtle road curvature deviations
    const curveDeviation = Math.sin(t * Math.PI) * 0.015;
    const lat = origin[0] + (dest[0] - origin[0]) * t + curveDeviation * 0.5;
    const lng = origin[1] + (dest[1] - origin[1]) * t + curveDeviation;
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  return points;
}

// Predefined realistic corridors in Tehran and intercity logistics
const SAMPLE_ROUTES: Record<
  string,
  {
    origin: TrackingLocationPoint;
    destination: TrackingLocationPoint;
    initialProgress: number;
    initialStatus: TrackingMilestone;
    notes: string;
  }
> = {
  'ORD-1403/9201': {
    origin: {
      name: 'کارخانه پارس، فتح',
      address: 'تهران، بزرگراه فتح، کیلومتر ۷، خیابان ۱۷ شهریور',
      lat: 35.6812,
      lng: 51.2789,
    },
    destination: {
      name: 'شهرک صنعتی کاسپین',
      address: 'قزوین، شهرک صنعتی کاسپین، فاز ۲، بلوار پژوهش',
      lat: 36.1485,
      lng: 50.1942,
    },
    initialProgress: 48,
    initialStatus: 'IN_TRANSIT',
    notes: 'در حال حرکت در اتوبان کرج-قزوین، بارندگی سبک گزارش شده و سرعت مطمئنه رعایت می‌شود.',
  },
  'ORD-1403/9202': {
    origin: {
      name: 'انبار مرکزی آریا، شورآباد',
      address: 'تهران، شورآباد، خیابان ۶۰ متری امام حسین',
      lat: 35.4851,
      lng: 51.3412,
    },
    destination: {
      name: 'شهرک صنعتی سیمین‌دشت',
      address: 'کرج، شهرک صنعتی سیمین‌دشت، خیابان هفتم شرقی',
      lat: 35.7924,
      lng: 50.9815,
    },
    initialProgress: 65,
    initialStatus: 'IN_TRANSIT',
    notes: 'از عوارضی آزادراه تهران-کرج عبور کرده و به سمت خروجی سیمین‌دشت در حرکت است.',
  },
  'ORD-1403/9203': {
    origin: {
      name: 'انبار بهاران، یافت‌آباد',
      address: 'تهران، یافت‌آباد، بلوار الغدیر، میدان بهاران',
      lat: 35.6534,
      lng: 51.3256,
    },
    destination: {
      name: 'پروژه پردیس، فاز ۸',
      address: 'پردیس، فاز ۸، بلوار امیرکبیر، مجتمع مسکونی نیلوفر',
      lat: 35.7412,
      lng: 51.8154,
    },
    initialProgress: 15,
    initialStatus: 'LOADING',
    notes: 'در محل انبار مبدأ مستقر است؛ کارگران در حال چیدمان و پتوپیچی اثاثیه هستند.',
  },
  'ORD-1403/9204': {
    origin: {
      name: 'باربری شوش، خیابان صابونیان',
      address: 'تهران، میدان شوش، خیابان صابونیان، مجتمع بلور',
      lat: 35.6611,
      lng: 51.4328,
    },
    destination: {
      name: 'فروشگاه سپید، تجریش',
      address: 'تهران، تجریش، خیابان دزاشیب، نبش رمضانی',
      lat: 35.8078,
      lng: 51.4389,
    },
    initialProgress: 88,
    initialStatus: 'ARRIVED_DESTINATION',
    notes: 'به تجریش رسیده و برای هماهنگی تخلیه جلوی فروشگاه توقف نموده است.',
  },
  'ORD-1403/9205': {
    origin: {
      name: 'پایانه کالای نسیم‌شهر',
      address: 'تهران، پایانه بار نسیم‌شهر، غرفه ۱۰۴',
      lat: 35.5342,
      lng: 51.1894,
    },
    destination: {
      name: 'انبار سپهر، شهرک صنعتی شمس‌آباد',
      address: 'تهران، اتوبان تهران-قم، شهرک صنعتی شمس‌آباد، بلوار بهارستان',
      lat: 35.3125,
      lng: 51.2415,
    },
    initialProgress: 100,
    initialStatus: 'DELIVERED',
    notes: 'تحویل بار با موفقیت کامل انجام شده و بارنامه توسط انباردار تایید گردید.',
  },
};

// Default seed generator
export function createDefaultTrackings(orders?: OrderItem[]): Record<string, CargoTrackingItem> {
  const result: Record<string, CargoTrackingItem> = {};

  const orderList = orders && orders.length > 0 ? orders : [];

  // Generate for sample presets
  Object.entries(SAMPLE_ROUTES).forEach(([orderNumber, preset]) => {
    const existingOrder = orderList.find((o) => o.orderNumber === orderNumber);
    const originPoint = preset.origin;
    const destPoint = preset.destination;
    const routePoints = generateRoutePoints(
      [originPoint.lat, originPoint.lng],
      [destPoint.lat, destPoint.lng],
      30
    );

    const currentIndex = Math.floor((preset.initialProgress / 100) * (routePoints.length - 1));
    const currentCoord = routePoints[currentIndex] || routePoints[0];
    const nextCoord =
      currentIndex < routePoints.length - 1
        ? routePoints[currentIndex + 1]
        : currentCoord;

    const heading = calculateBearing(
      currentCoord[0],
      currentCoord[1],
      nextCoord[0],
      nextCoord[1]
    );

    const totalDist = calculateDistanceKm(
      originPoint.lat,
      originPoint.lng,
      destPoint.lat,
      destPoint.lng
    );

    const remainingDist = calculateDistanceKm(
      currentCoord[0],
      currentCoord[1],
      destPoint.lat,
      destPoint.lng
    );

    const speed = preset.initialStatus === 'IN_TRANSIT' ? 52 : 0;
    const etaMin = speed > 0 ? Math.round((remainingDist / speed) * 60) : 0;

    const customerName = existingOrder?.customerName || 'مشتری حامی';
    const customerPhone = existingOrder?.customerPhone || '09121112233';
    const driverName = existingOrder?.assignedDriverName || 'رضا مرادی';
    const driverPhone = '09129876543';
    const vehiclePlate = existingOrder?.assignedVehiclePlate || '۷۶ ع ۸۵۱ - ایران ۶۶';
    const vehicleType = existingOrder?.requestedVehicleType || 'خاور مسقف چادری';
    const cargoDesc =
      existingOrder?.cargoDescription || 'تجهیزات و اقلام صنعتی پالت‌بندی شده';

    result[orderNumber] = {
      orderId: existingOrder?.id || `ord-${orderNumber}`,
      orderNumber,
      customerName,
      customerPhone,
      customerCompany: existingOrder?.customerCompany,
      driverName,
      driverPhone,
      vehiclePlate,
      vehicleType,
      cargoDescription: cargoDesc,
      cargoWeightTon: existingOrder?.cargoWeightTon || 3.5,
      packageCount: existingOrder?.packageCount || 12,
      origin: originPoint,
      destination: destPoint,
      currentLocation: {
        lat: currentCoord[0],
        lng: currentCoord[1],
        heading,
        speedKmh: speed,
        accuracyMeters: 8,
        timestamp: Date.now(),
        updatedAtFa: 'چند لحظه پیش',
        isRealGps: false,
      },
      status: preset.initialStatus,
      isLiveBroadcasting: preset.initialStatus === 'IN_TRANSIT',
      estimatedEtaMinutes: etaMin,
      distanceRemainingKm: remainingDist,
      progressPercent: preset.initialProgress,
      driverNote: preset.notes,
      routePoints,
      currentRouteIndex: currentIndex,
      createdAt: new Date().toISOString(),
      history: [
        {
          status: 'REGISTERED',
          title: 'صدور بارنامه و تعیین خودرو',
          description: `خودرو ${vehicleType} با رانندگی آقای ${driverName} اختصاص یافت.`,
          timeFa: '۰۸:۰۰',
          completed: true,
        },
        {
          status: 'LOADING',
          title: 'بارگیری در مبدأ',
          description: `استقرار در ${originPoint.name} و بارگیری مرسوله`,
          timeFa: '۰۸:۴۵',
          completed: preset.initialProgress >= 20,
        },
        {
          status: 'IN_TRANSIT',
          title: 'شروع حرکت به سوی مقصد',
          description: `خروج از مبدأ و حرکت در محور مواصلاتی`,
          timeFa: '۰۹:۱۵',
          completed: preset.initialProgress >= 30,
        },
        {
          status: 'ARRIVED_DESTINATION',
          title: 'ورود به محدوده مقصد',
          description: `رسیدن به ${destPoint.name} و آماده‌سازی جهت تخلیه`,
          timeFa: '۱۰:۳۰',
          completed: preset.initialProgress >= 85,
        },
        {
          status: 'DELIVERED',
          title: 'تحویل نهایی مرسوله',
          description: 'امضای رسید تحویل و تسویه حساب بارنامه',
          timeFa: '۱۱:۱۵',
          completed: preset.initialProgress >= 100,
        },
      ],
    };
  });

  return result;
}

// Read all trackings from LocalStorage or seed defaults
export function loadAllCargoTrackings(orders?: OrderItem[]): Record<string, CargoTrackingItem> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRACKING);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  const seeded = createDefaultTrackings(orders);
  saveAllCargoTrackings(seeded);
  return seeded;
}

// Save all to LocalStorage and broadcast update
export function saveAllCargoTrackings(data: Record<string, CargoTrackingItem>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TRACKING, JSON.stringify(data));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ALL_TRACKINGS_UPDATED' });
    }
    window.dispatchEvent(new CustomEvent('hamibar_tracking_synced'));
  } catch {
    // ignore
  }
}

// Get single tracking by orderNumber or id
export function getCargoTracking(
  orderNumberOrId: string,
  orders?: OrderItem[]
): CargoTrackingItem | null {
  const all = loadAllCargoTrackings(orders);
  if (all[orderNumberOrId]) return all[orderNumberOrId];

  // Try finding by orderId
  const byId = Object.values(all).find(
    (item) => item.orderId === orderNumberOrId || item.orderNumber === orderNumberOrId
  );
  if (byId) return byId;

  // If not found in trackings, but exists in orders, generate on the fly
  if (orders) {
    const foundOrder = orders.find(
      (o) => o.orderNumber === orderNumberOrId || o.id === orderNumberOrId
    );
    if (foundOrder) {
      return initializeTrackingForOrder(foundOrder);
    }
  }

  return null;
}

// Initialize on the fly for any newly created order
export function initializeTrackingForOrder(order: OrderItem): CargoTrackingItem {
  const all = loadAllCargoTrackings();
  if (all[order.orderNumber]) return all[order.orderNumber];

  // Coordinates centered in Tehran by default
  const originLat = 35.7000 + (Math.random() - 0.5) * 0.08;
  const originLng = 51.3500 + (Math.random() - 0.5) * 0.08;
  const destLat = 35.7300 + (Math.random() - 0.5) * 0.08;
  const destLng = 51.4200 + (Math.random() - 0.5) * 0.08;

  const originPoint: TrackingLocationPoint = {
    name: order.originCity || 'مبدأ بارگیری',
    address: order.originAddress || 'تهران',
    lat: Number(originLat.toFixed(5)),
    lng: Number(originLng.toFixed(5)),
  };

  const destPoint: TrackingLocationPoint = {
    name: order.destinationCity || 'مقصد تخلیه',
    address: order.destinationAddress || 'تهران',
    lat: Number(destLat.toFixed(5)),
    lng: Number(destLng.toFixed(5)),
  };

  const routePoints = generateRoutePoints(
    [originPoint.lat, originPoint.lng],
    [destPoint.lat, destPoint.lng],
    25
  );

  const initialStatus: TrackingMilestone =
    order.status === 'COMPLETED'
      ? 'DELIVERED'
      : order.status === 'IN_PROGRESS'
      ? 'IN_TRANSIT'
      : 'LOADING';

  const initialProgress = initialStatus === 'DELIVERED' ? 100 : initialStatus === 'IN_TRANSIT' ? 40 : 15;
  const currentIndex = Math.floor((initialProgress / 100) * (routePoints.length - 1));
  const currentCoord = routePoints[currentIndex] || routePoints[0];

  const item: CargoTrackingItem = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerCompany: order.customerCompany,
    driverName: order.assignedDriverName || 'راننده معین حامی',
    driverPhone: '09121002030',
    vehiclePlate: order.assignedVehiclePlate || '۴۲ ع ۱۲۳ - ایران ۷۷',
    vehicleType: order.requestedVehicleType || 'خاور مسقف',
    cargoDescription: order.cargoDescription || 'مرسوله تجاری',
    cargoWeightTon: order.cargoWeightTon,
    packageCount: order.packageCount,
    origin: originPoint,
    destination: destPoint,
    currentLocation: {
      lat: currentCoord[0],
      lng: currentCoord[1],
      heading: 45,
      speedKmh: initialStatus === 'IN_TRANSIT' ? 45 : 0,
      accuracyMeters: 10,
      timestamp: Date.now(),
      updatedAtFa: 'لحظاتی قبل',
      isRealGps: false,
    },
    status: initialStatus,
    isLiveBroadcasting: initialStatus === 'IN_TRANSIT',
    estimatedEtaMinutes: initialStatus === 'IN_TRANSIT' ? 25 : 0,
    distanceRemainingKm: calculateDistanceKm(
      currentCoord[0],
      currentCoord[1],
      destPoint.lat,
      destPoint.lng
    ),
    progressPercent: initialProgress,
    driverNote: 'راننده آماده حرکت به سوی مقصد است.',
    routePoints,
    currentRouteIndex: currentIndex,
    createdAt: new Date().toISOString(),
    history: [
      {
        status: 'REGISTERED',
        title: 'ثبت سفارش و اعزام خودرو',
        description: `سفارش ثبت و خودرو تخصیص داده شد.`,
        timeFa: order.loadingTime || '۰۸:۳۰',
        completed: true,
      },
      {
        status: 'LOADING',
        title: 'بارگیری در مبدأ',
        description: `ورود به مبدأ: ${originPoint.name}`,
        timeFa: '۰۹:۰۰',
        completed: initialProgress >= 20,
      },
      {
        status: 'IN_TRANSIT',
        title: 'شروع حرکت به سوی مقصد',
        description: `خروج از مبدأ به سمت مقصد`,
        timeFa: '۰۹:۳۰',
        completed: initialProgress >= 30,
      },
      {
        status: 'ARRIVED_DESTINATION',
        title: 'رسیدن به مقصد',
        description: `ورود به آدرس گیرنده: ${destPoint.name}`,
        timeFa: '۱۰:۳۰',
        completed: initialProgress >= 85,
      },
      {
        status: 'DELIVERED',
        title: 'تحویل نهایی بار',
        description: 'تحویل محموله و ثبت امضا',
        timeFa: '۱۱:۰۰',
        completed: initialProgress >= 100,
      },
    ],
  };

  all[order.orderNumber] = item;
  saveAllCargoTrackings(all);
  return item;
}

// Update driver's live GPS coordinates
export function updateDriverLiveCoordinates(
  orderNumber: string,
  lat: number,
  lng: number,
  speedKmh: number,
  headingDeg: number,
  accuracyMeters: number,
  isRealGps = true
): CargoTrackingItem | null {
  const all = loadAllCargoTrackings();
  const item = all[orderNumber];
  if (!item) return null;

  const remainingDist = calculateDistanceKm(lat, lng, item.destination.lat, item.destination.lng);
  const totalDist = calculateDistanceKm(
    item.origin.lat,
    item.origin.lng,
    item.destination.lat,
    item.destination.lng
  );

  const traveledDist = Math.max(0, totalDist - remainingDist);
  const progressPercent = totalDist > 0 ? Math.min(100, Math.round((traveledDist / totalDist) * 100)) : 50;

  const etaMinutes = speedKmh > 5 ? Math.round((remainingDist / speedKmh) * 60) : item.estimatedEtaMinutes;

  item.currentLocation = {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    heading: Math.round(headingDeg),
    speedKmh: Math.round(speedKmh),
    accuracyMeters: Math.round(accuracyMeters),
    timestamp: Date.now(),
    updatedAtFa: 'چند ثانیه پیش',
    isRealGps,
  };
  item.distanceRemainingKm = remainingDist;
  item.progressPercent = progressPercent;
  item.estimatedEtaMinutes = etaMinutes;
  item.isLiveBroadcasting = true;

  // Add to breadcrumb route if moved significantly
  const lastPoint = item.routePoints[item.routePoints.length - 1];
  if (!lastPoint || calculateDistanceKm(lastPoint[0], lastPoint[1], lat, lng) > 0.1) {
    item.routePoints.push([lat, lng]);
  }

  all[orderNumber] = item;
  saveAllCargoTrackings(all);
  return item;
}

// Advance simulation one step
export function advanceSimulationStep(orderNumber: string): CargoTrackingItem | null {
  const all = loadAllCargoTrackings();
  const item = all[orderNumber];
  if (!item || !item.routePoints || item.routePoints.length === 0) return null;

  const nextIndex = Math.min(item.routePoints.length - 1, item.currentRouteIndex + 1);
  const currentCoord = item.routePoints[nextIndex];
  const nextCoord =
    nextIndex < item.routePoints.length - 1
      ? item.routePoints[nextIndex + 1]
      : currentCoord;

  const heading = calculateBearing(
    currentCoord[0],
    currentCoord[1],
    nextCoord[0],
    nextCoord[1]
  );

  const totalPoints = item.routePoints.length;
  const progress = Math.min(100, Math.round((nextIndex / (totalPoints - 1)) * 100));

  let status: TrackingMilestone = item.status;
  if (progress >= 100) {
    status = 'DELIVERED';
  } else if (progress >= 85) {
    status = 'ARRIVED_DESTINATION';
  } else if (progress >= 15) {
    status = 'IN_TRANSIT';
  } else {
    status = 'LOADING';
  }

  const speed = status === 'IN_TRANSIT' ? Math.floor(45 + Math.random() * 25) : 0;
  const remainingDist = calculateDistanceKm(
    currentCoord[0],
    currentCoord[1],
    item.destination.lat,
    item.destination.lng
  );
  const eta = speed > 0 ? Math.round((remainingDist / speed) * 60) : 0;

  item.currentRouteIndex = nextIndex;
  item.currentLocation = {
    lat: currentCoord[0],
    lng: currentCoord[1],
    heading,
    speedKmh: speed,
    accuracyMeters: 6,
    timestamp: Date.now(),
    updatedAtFa: 'چند ثانیه پیش',
    isRealGps: false,
  };
  item.distanceRemainingKm = remainingDist;
  item.progressPercent = progress;
  item.estimatedEtaMinutes = eta;
  item.status = status;
  item.isLiveBroadcasting = status === 'IN_TRANSIT';

  // Mark histories completed
  item.history = item.history.map((h) => {
    if (h.status === 'REGISTERED') return { ...h, completed: true };
    if (h.status === 'LOADING') return { ...h, completed: progress >= 15 };
    if (h.status === 'IN_TRANSIT') return { ...h, completed: progress >= 25 };
    if (h.status === 'ARRIVED_DESTINATION') return { ...h, completed: progress >= 85 };
    if (h.status === 'DELIVERED') return { ...h, completed: progress >= 100 };
    return h;
  });

  all[orderNumber] = item;
  saveAllCargoTrackings(all);
  return item;
}

// Update status milestone manually (e.g. driver clicks "Arrived" or "Loading")
export function updateMilestoneStatus(
  orderNumber: string,
  newStatus: TrackingMilestone,
  driverNote?: string
): CargoTrackingItem | null {
  const all = loadAllCargoTrackings();
  const item = all[orderNumber];
  if (!item) return null;

  item.status = newStatus;
  if (driverNote) item.driverNote = driverNote;

  if (newStatus === 'LOADING') {
    item.progressPercent = Math.max(item.progressPercent, 15);
    item.currentLocation.speedKmh = 0;
  } else if (newStatus === 'IN_TRANSIT') {
    item.progressPercent = Math.max(item.progressPercent, 35);
    item.currentLocation.speedKmh = 48;
    item.isLiveBroadcasting = true;
  } else if (newStatus === 'ARRIVED_DESTINATION') {
    item.progressPercent = Math.max(item.progressPercent, 90);
    item.currentLocation.speedKmh = 0;
  } else if (newStatus === 'DELIVERED') {
    item.progressPercent = 100;
    item.distanceRemainingKm = 0;
    item.estimatedEtaMinutes = 0;
    item.currentLocation.speedKmh = 0;
    item.isLiveBroadcasting = false;
  }

  // Update history items
  const nowFa = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  item.history = item.history.map((h) => {
    if (h.status === newStatus) {
      return { ...h, completed: true, timeFa: toFaDigits(nowFa) };
    }
    const stepConfig = MILESTONE_CONFIG[h.status];
    const targetConfig = MILESTONE_CONFIG[newStatus];
    if (stepConfig.stepIndex <= targetConfig.stepIndex) {
      return { ...h, completed: true };
    }
    return h;
  });

  all[orderNumber] = item;
  saveAllCargoTrackings(all);
  return item;
}

// Toggle Driver Live Sharing
export function toggleDriverLiveBroadcast(
  orderNumber: string,
  broadcasting: boolean
): CargoTrackingItem | null {
  const all = loadAllCargoTrackings();
  const item = all[orderNumber];
  if (!item) return null;

  item.isLiveBroadcasting = broadcasting;
  all[orderNumber] = item;
  saveAllCargoTrackings(all);
  return item;
}

// Generate shareable customer tracking link
export function generateCustomerShareUrl(orderNumber: string): string {
  if (typeof window === 'undefined') return `?track=${encodeURIComponent(orderNumber)}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?track=${encodeURIComponent(orderNumber)}`;
}

// Generate driver sharing beacon link
export function generateDriverPortalUrl(orderNumber: string): string {
  if (typeof window === 'undefined') return `?mode=driver&order=${encodeURIComponent(orderNumber)}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?mode=driver&order=${encodeURIComponent(orderNumber)}`;
}
