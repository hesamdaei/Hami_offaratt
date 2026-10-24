import { FC, useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Navigation,
  Gauge,
  Zap,
  Satellite,
  Play,
  Pause,
  Search,
  Maximize2,
  Phone,
  FileText,
  MapPin,
  X,
  ExternalLink,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  Table as TableIcon,
  RotateCcw,
  Compass,
  ArrowUpRight,
  TrendingUp,
  BatteryCharging,
  Fuel,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  Activity,
  Radio,
  Clock,
  Truck,
} from 'lucide-react';
import { VehicleItem, VEHICLE_TYPE_NAMES } from '../utils/fleetSeedData';
import {
  GpsVehicleStatus,
  GPS_STATUS_CONFIGS,
  LiveGpsVehicle,
  generateLiveGpsVehicles,
} from '../utils/gpsFleetData';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';

interface LiveFleetMapViewProps {
  vehicles: VehicleItem[];
  onNavigateFleetTab?: (vehicleId?: string) => void;
  isStandalone?: boolean;
}

type MapTileProvider = 'dark' | 'voyager' | 'standard';
type ViewMode = 'map' | 'grid' | 'table';
type SortOption = 'code_asc' | 'code_desc' | 'speed_desc' | 'status';

const STORAGE_KEY_GPS_DATA = 'hamibar_live_gps_fleet_v1';

// Normalize Persian & English digits for instant search
function normalizeSearch(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .toLowerCase()
    .trim();
}

export const LiveFleetMapView: FC<LiveFleetMapViewProps> = ({
  vehicles,
  onNavigateFleetTab,
  isStandalone = false,
}) => {
  // Live GPS vehicles state initialized from props & local cache
  const [gpsVehicles, setGpsVehicles] = useState<LiveGpsVehicle[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GPS_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return generateLiveGpsVehicles(vehicles);
  });

  // Keep in sync when vehicles list changes
  useEffect(() => {
    setGpsVehicles((prev) => {
      const map = new Map<string, LiveGpsVehicle>(prev.map((p) => [p.id, p]));
      const newItems = generateLiveGpsVehicles(vehicles);
      return newItems.map((item) => {
        const existing = map.get(item.id);
        if (existing) {
          return {
            ...item,
            gpsStatus: existing.gpsStatus || item.gpsStatus,
            lat: existing.lat || item.lat,
            lng: existing.lng || item.lng,
            speed: existing.speed ?? item.speed,
            waybill: existing.waybill || item.waybill,
          };
        }
        return item;
      });
    });
  }, [vehicles]);

  // Persist live GPS data
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GPS_DATA, JSON.stringify(gpsVehicles));
    } catch {
      // ignore
    }
  }, [gpsVehicles]);

  // Master UI View Modes: 'map' (Split Map/Drawer), 'grid' (Fleet Matrix), 'table' (Data Dense)
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Selected vehicle for details drawer / focus
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<GpsVehicleStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [onlyMovingFilter, setOnlyMovingFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('code_asc');

  // Map state
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const trailLayerRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Simulation & Map Settings
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<1 | 2 | 5>(1);
  const [mapProvider, setMapProvider] = useState<MapTileProvider>('dark');
  const [showTrails, setShowTrails] = useState(true);
  const [followSelectedVehicle, setFollowSelectedVehicle] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('هم‌اکنون');

  // Status Change / Waybill Modal
  const [isStatusEditModalOpen, setIsStatusEditModalOpen] = useState(false);
  const [newStatusChoice, setNewStatusChoice] = useState<GpsVehicleStatus>('WITH_WAYBILL');
  const [newWaybillNumber, setNewWaybillNumber] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newCargo, setNewCargo] = useState('');

  // Selected vehicle memo
  const selectedVehicle = useMemo(() => {
    return gpsVehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [gpsVehicles, selectedVehicleId]);

  // Status metrics counts & KPI calculations
  const statusCounts = useMemo(() => {
    const counts: Record<GpsVehicleStatus | 'ALL', number> = {
      ALL: gpsVehicles.length,
      WITH_WAYBILL: 0,
      STARTED_IN_TRANSIT: 0,
      FREE_AVAILABLE: 0,
      LOADING_UNLOADING: 0,
      PARKING_OFFLINE: 0,
      IN_WORKSHOP: 0,
    };
    gpsVehicles.forEach((v) => {
      if (counts[v.gpsStatus] !== undefined) {
        counts[v.gpsStatus]++;
      }
    });
    return counts;
  }, [gpsVehicles]);

  // Executive Fleet Telemetry KPI Metrics
  const fleetKPIs = useMemo(() => {
    const total = gpsVehicles.length || 1;
    const inMission = statusCounts.WITH_WAYBILL + statusCounts.STARTED_IN_TRANSIT;
    const utilizationRate = Math.round((inMission / total) * 100);

    const movingVehicles = gpsVehicles.filter((v) => v.speed > 0);
    const avgSpeed = movingVehicles.length > 0
      ? Math.round(movingVehicles.reduce((acc, v) => acc + v.speed, 0) / movingVehicles.length)
      : 0;

    const onlineSatellites = gpsVehicles.filter((v) => v.satellites >= 6).length;

    return {
      totalVehicles: total,
      inMission,
      utilizationRate,
      movingCount: movingVehicles.length,
      avgSpeed,
      onlineSatellites,
    };
  }, [gpsVehicles, statusCounts]);

  // Filtered and Sorted Vehicles
  const filteredVehicles = useMemo(() => {
    const normQ = normalizeSearch(searchQuery);

    const list = gpsVehicles.filter((v) => {
      // Status filter
      if (statusFilter !== 'ALL' && v.gpsStatus !== statusFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'ALL' && v.vehicleType !== typeFilter) {
        return false;
      }
      // Moving only filter
      if (onlyMovingFilter && v.speed === 0) {
        return false;
      }
      // Search query
      if (normQ) {
        const codeStr = String(v.code);
        const codeFaStr = toFaDigits(v.code);
        const nameMatch = v.driverName.toLowerCase().includes(normQ) || v.driverName.includes(searchQuery.trim());
        const codeMatch = codeStr.includes(normQ) || codeFaStr.includes(searchQuery.trim());
        const plateMatch = v.plateNumber.toLowerCase().includes(normQ) || v.plateNumber.includes(searchQuery.trim());
        const waybillMatch = v.waybill?.waybillNumber.toLowerCase().includes(normQ) || false;
        const destMatch = v.waybill?.destination.toLowerCase().includes(normQ) || false;
        const cargoMatch = v.waybill?.cargoDescription.toLowerCase().includes(normQ) || false;
        return codeMatch || nameMatch || plateMatch || waybillMatch || destMatch || cargoMatch;
      }
      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'code_asc') return a.code - b.code;
      if (sortBy === 'code_desc') return b.code - a.code;
      if (sortBy === 'speed_desc') return b.speed - a.speed;
      if (sortBy === 'status') return a.gpsStatus.localeCompare(b.gpsStatus);
      return 0;
    });
  }, [gpsVehicles, statusFilter, typeFilter, onlyMovingFilter, searchQuery, sortBy]);

  // All unique vehicle codes sorted numerically
  const allSortedCodes = useMemo(() => {
    return [...gpsVehicles].sort((a, b) => a.code - b.code);
  }, [gpsVehicles]);

  // Tile provider URLs
  const getTileUrl = (provider: MapTileProvider) => {
    switch (provider) {
      case 'dark':
        // CartoDB Dark Matter
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      case 'voyager':
        // CartoDB Voyager
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'standard':
      default:
        // OpenStreetMap Standard
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Greater Tehran freight corridors
    const map = L.map(mapContainerRef.current, {
      center: [35.6892, 51.3100],
      zoom: 11,
      zoomControl: false,
    });

    // Zoom control on top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Base Tile Layer
    const tileLayer = L.tileLayer(getTileUrl(mapProvider), {
      maxZoom: 19,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer Group for Markers
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    mapInstanceRef.current = map;

    // Fit bounds initially
    if (gpsVehicles.length > 0) {
      setTimeout(() => {
        try {
          const bounds = L.latLngBounds(gpsVehicles.map((v) => [v.lat, v.lng]));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        } catch {
          // ignore
        }
      }, 300);
    }

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle Tile Layer Switch
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(getTileUrl(mapProvider));
  }, [mapProvider]);

  // 3. Render / Update Leaflet Markers (Directional, Radar-Pulsing & Sleek HTML Markers)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    // Clear previous trail
    if (trailLayerRef.current) {
      trailLayerRef.current.remove();
      trailLayerRef.current = null;
    }

    // Draw active trail for selected vehicle
    if (selectedVehicle && showTrails && selectedVehicle.trail && selectedVehicle.trail.length > 1) {
      const config = GPS_STATUS_CONFIGS[selectedVehicle.gpsStatus];
      const trailPolyline = L.polyline(selectedVehicle.trail, {
        color: config.markerColor,
        weight: 3.5,
        opacity: 0.9,
        dashArray: selectedVehicle.gpsStatus === 'STARTED_IN_TRANSIT' ? undefined : '4, 6',
      }).addTo(mapInstanceRef.current);
      trailLayerRef.current = trailPolyline;
    }

    // Add markers for filtered vehicles
    filteredVehicles.forEach((vehicle) => {
      const isSelected = vehicle.id === selectedVehicleId;
      const config = GPS_STATUS_CONFIGS[vehicle.gpsStatus];
      const isMoving = vehicle.gpsStatus === 'STARTED_IN_TRANSIT' || vehicle.speed > 0;

      // HTML Marker with Directional Bearing & Status Radar Ring
      const markerHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center select-none" dir="rtl">
          ${
            isMoving
              ? `<div class="absolute -inset-2 rounded-full animate-ping opacity-40 pointer-events-none" style="background-color: ${config.markerColor};"></div>`
              : ''
          }
          
          <div class="relative flex items-center justify-center transition-all duration-200 ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-115 z-10'
          }">
            <div 
              class="w-8.5 h-8.5 rounded-full flex items-center justify-center text-white font-mono font-black shadow-lg border-2 transition-all relative"
              style="
                background-color: ${config.markerColor}; 
                border-color: ${isSelected ? '#ffffff' : '#f8fafc'};
                box-shadow: ${
                  isSelected
                    ? '0 0 0 3px rgba(255,255,255,0.8), 0 4px 14px rgba(0,0,0,0.6)'
                    : '0 2px 8px rgba(0,0,0,0.45)'
                };
              "
            >
              <span class="text-[12px] leading-none tracking-tight font-black">${toFaDigits(vehicle.code)}</span>
            </div>

            <!-- Directional Bearing Arrow for moving vehicles -->
            ${
              isMoving
                ? `
                <div 
                  class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 border border-emerald-400 flex items-center justify-center shadow-xs"
                  style="transform: rotate(${vehicle.heading}deg);"
                  title="زاویه حرکت: ${toFaDigits(vehicle.heading)}°"
                >
                  <div class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-emerald-400"></div>
                </div>
              `
                : ''
            }
          </div>

          <!-- Minimal Hover Tooltip -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
            <div class="bg-slate-950/95 text-white border border-slate-700/80 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xl whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
              <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${config.markerColor}"></span>
              <span>کد ${toFaDigits(vehicle.code)}</span>
              <span class="text-slate-500">|</span>
              <span class="text-slate-200">${vehicle.driverName}</span>
              <span class="text-slate-400 text-[9px]">(${config.shortLabel})</span>
              ${isMoving ? `<span class="text-emerald-400 font-mono">${toFaDigits(vehicle.speed)} km/h</span>` : ''}
            </div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-minimal-gps-marker',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([vehicle.lat, vehicle.lng], { icon });

      marker.on('click', () => {
        setSelectedVehicleId(vehicle.id);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([vehicle.lat, vehicle.lng], {
            animate: true,
            duration: 0.5,
          });
        }
      });

      markersGroup.addLayer(marker);
    });
  }, [filteredVehicles, selectedVehicleId, showTrails, selectedVehicle]);

  // 4. Follow Selected Vehicle when moving
  useEffect(() => {
    if (followSelectedVehicle && selectedVehicle && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([selectedVehicle.lat, selectedVehicle.lng], {
        animate: true,
        duration: 0.4,
      });
    }
  }, [followSelectedVehicle, selectedVehicle?.lat, selectedVehicle?.lng]);

  // 5. Live GPS Movement Simulation Tick with Speed Multiplier
  useEffect(() => {
    if (!isSimulating) return;

    const intervalTime = Math.round(3500 / simSpeedMultiplier);

    const interval = setInterval(() => {
      setGpsVehicles((prev) => {
        return prev.map((v) => {
          if (v.gpsStatus !== 'STARTED_IN_TRANSIT') {
            return v;
          }

          // Step coordinates along heading
          const rad = (v.heading * Math.PI) / 180;
          const stepSize = 0.00035 * simSpeedMultiplier;
          const deltaLat = Math.cos(rad) * stepSize;
          const deltaLng = Math.sin(rad) * (stepSize * 1.25);

          const newLat = Number((v.lat + deltaLat).toFixed(5));
          const newLng = Number((v.lng + deltaLng).toFixed(5));

          // Speed fluctuation
          const speedJitter = Math.floor(Math.random() * 7) - 3;
          const newSpeed = Math.min(95, Math.max(35, v.speed + speedJitter));

          // Append to trail
          const updatedTrail = [...v.trail, [newLat, newLng] as [number, number]];
          if (updatedTrail.length > 30) {
            updatedTrail.shift();
          }

          return {
            ...v,
            lat: newLat,
            lng: newLng,
            speed: newSpeed,
            lastPing: 'هم‌اکنون',
            trail: updatedTrail,
          };
        });
      });

      const now = new Date();
      setLastSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeedMultiplier]);

  // Actions
  const handleFocusVehicle = (v: LiveGpsVehicle) => {
    setSelectedVehicleId(v.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([v.lat, v.lng], 15, {
        animate: true,
        duration: 0.7,
      });
    }
  };

  const handleFitBounds = () => {
    if (!mapInstanceRef.current || filteredVehicles.length === 0) return;
    const bounds = L.latLngBounds(filteredVehicles.map((v) => [v.lat, v.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 });
  };

  const handleCenterTehran = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([35.6892, 51.3100], 11, {
      animate: true,
      duration: 0.6,
    });
  };

  const handleOpenStatusModal = () => {
    if (!selectedVehicle) return;
    setNewStatusChoice(selectedVehicle.gpsStatus);
    setNewWaybillNumber(
      selectedVehicle.waybill?.waybillNumber || `BL-1403/${Math.floor(8000 + Math.random() * 1999)}`
    );
    setNewOrigin(selectedVehicle.waybill?.origin || 'انبار مرکزی حامی بار (فتح)');
    setNewDestination(selectedVehicle.waybill?.destination || 'شهرک صنعتی کاسپین (قزوین)');
    setNewCargo(selectedVehicle.waybill?.cargoDescription || 'لوازم خانگی و صوتی تصویری');
    setIsStatusEditModalOpen(true);
  };

  const handleSaveStatusChange = () => {
    if (!selectedVehicle) return;

    setGpsVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== selectedVehicle.id) return v;

        const isTransit = newStatusChoice === 'STARTED_IN_TRANSIT';
        const hasBill =
          newStatusChoice === 'WITH_WAYBILL' ||
          isTransit ||
          newStatusChoice === 'LOADING_UNLOADING';

        return {
          ...v,
          gpsStatus: newStatusChoice,
          speed: isTransit ? 55 : 0,
          ignition: isTransit || hasBill,
          waybill: hasBill
            ? {
                waybillNumber: newWaybillNumber,
                origin: newOrigin || 'انبار مرکزی حامی بار (فتح)',
                destination: newDestination || 'تهران / مقصد باربری',
                cargoDescription: newCargo || 'کالای عمومی و تجاری',
                cargoWeightTon: v.waybill?.cargoWeightTon || 4.2,
                receiverCompany: v.waybill?.receiverCompany || 'شرکت تحویل گیرنده',
                issueTime: v.waybill?.issueTime || '۰۹:۰۰',
                estimatedArrival: v.waybill?.estimatedArrival || '۱۲:۳۰',
                distanceRemainingKm: v.waybill?.distanceRemainingKm || 45,
                progressPercent: isTransit ? 35 : 0,
              }
            : undefined,
        };
      })
    );

    setIsStatusEditModalOpen(false);
  };

  const handleResetFleetCoordinates = () => {
    const refreshed = generateLiveGpsVehicles(vehicles);
    setGpsVehicles(refreshed);
    try {
      localStorage.setItem(STORAGE_KEY_GPS_DATA, JSON.stringify(refreshed));
    } catch {
      // ignore
    }
  };

  return (
    <div className={`flex flex-col gap-2.5 min-h-[780px] select-none ${isStandalone ? 'h-screen p-3' : 'h-[calc(100vh-160px)]'}`}>
      {/* 1. EXECUTIVE COMMAND STRIP & KPI HUD (Senior Dispatch Ribbon) */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-3 shadow-md space-y-2.5">
        {/* Top Operational Bar: Title, Live Beacon, View Switcher & Sim Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          {/* Right side: Module Title & Telemetry Beacon */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-xs">
              <Navigation className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white">
                  مرکز مانیتورینگ بلادرنگ و تلمتری ناوگان حامی بار
                </h1>
                <span className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>پایش زنده ماهواره‌ای</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>همگام‌سازی تلمتری: {lastSyncTime}</span>
                <span>•</span>
                <span>پوشش‌دهی {toFaDigits(fleetKPIs.totalVehicles)} خودروی فعال</span>
              </p>
            </div>
          </div>

          {/* Left side: View Mode Selector + Simulation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher (Map / Grid / Table) */}
            <div className="flex items-center bg-[#0d1526] p-1 rounded-xl border border-slate-700/80 shadow-inner text-xs">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="نمای نقشه تعاملی و دیسپچ"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>نقشه و تلمتری</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="ماتریس کارت‌های عملیاتی همه خودروها"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ماتریس ناوگان</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="جدول داده‌ای مانیتورینگ ناوگان"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول تلمتری</span>
              </button>
            </div>

            {/* Simulation Engine Controls */}
            <div className="flex items-center gap-1.5 bg-[#0d1526] px-2 py-1 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isSimulating
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="توقف / پخش حرکت زنده GPS"
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>فعال</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>مکث</span>
                  </>
                )}
              </button>

              {/* Simulation Speed Pill */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
                {([1, 2, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSimSpeedMultiplier(spd)}
                    className={`px-1.5 py-0.5 rounded ${
                      simSpeedMultiplier === spd
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={`سرعت شبیه‌سازی: ${spd}x`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Reset positions */}
              <button
                type="button"
                onClick={handleResetFleetCoordinates}
                className="p-1 text-slate-400 hover:text-amber-300 transition"
                title="بازنشانی مختصات و به‌روزرسانی اولیه"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Total Fleet */}
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              statusFilter === 'ALL'
                ? 'bg-blue-950/60 border-blue-500 shadow-xs ring-1 ring-blue-500/40'
                : 'bg-[#142036] hover:bg-[#18263e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>کل ناوگان</span>
              <Truck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base font-black text-white mt-1 flex items-baseline justify-between">
              <span>{toFaDigits(fleetKPIs.totalVehicles)}</span>
              <span className="text-[10px] font-normal text-slate-400">خودرو</span>
            </div>
          </div>

          {/* In Transit */}
          <div
            onClick={() => setStatusFilter('STARTED_IN_TRANSIT')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              statusFilter === 'STARTED_IN_TRANSIT'
                ? 'bg-purple-950/60 border-purple-500 shadow-xs ring-1 ring-purple-500/40'
                : 'bg-[#142036] hover:bg-[#18263e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-purple-300 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                <span>در حال حرکت</span>
              </span>
              <Compass className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-base font-black text-purple-300 mt-1 flex items-baseline justify-between">
              <span>{toFaDigits(statusCounts.STARTED_IN_TRANSIT)}</span>
              <span className="text-[10px] font-mono text-purple-400 font-normal">
                {toFaDigits(fleetKPIs.utilizationRate)}% بهره‌وری
              </span>
            </div>
          </div>

          {/* With Waybill */}
          <div
            onClick={() => setStatusFilter('WITH_WAYBILL')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              statusFilter === 'WITH_WAYBILL'
                ? 'bg-blue-950/60 border-blue-500 shadow-xs ring-1 ring-blue-500/40'
                : 'bg-[#142036] hover:bg-[#18263e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-blue-300 text-[11px]">
              <span>دارای بارنامه</span>
              <FileText className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base font-black text-blue-300 mt-1 flex items-baseline justify-between">
              <span>{toFaDigits(statusCounts.WITH_WAYBILL)}</span>
              <span className="text-[10px] font-normal text-slate-400">حواله صادر شده</span>
            </div>
          </div>

          {/* Free Available */}
          <div
            onClick={() => setStatusFilter('FREE_AVAILABLE')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              statusFilter === 'FREE_AVAILABLE'
                ? 'bg-emerald-950/60 border-emerald-500 shadow-xs ring-1 ring-emerald-500/40'
                : 'bg-[#142036] hover:bg-[#18263e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-300 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>آماده به کار</span>
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-black text-emerald-300 mt-1 flex items-baseline justify-between">
              <span>{toFaDigits(statusCounts.FREE_AVAILABLE)}</span>
              <span className="text-[10px] font-normal text-emerald-400/80">آماده اعزام</span>
            </div>
          </div>

          {/* Loading/Unloading */}
          <div
            onClick={() => setStatusFilter('LOADING_UNLOADING')}
            className={`p-2 rounded-xl border cursor-pointer transition ${
              statusFilter === 'LOADING_UNLOADING'
                ? 'bg-amber-950/60 border-amber-500 shadow-xs ring-1 ring-amber-500/40'
                : 'bg-[#142036] hover:bg-[#18263e] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-amber-300 text-[11px]">
              <span>بارگیری / تخلیه</span>
              <Activity className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-black text-amber-300 mt-1 flex items-baseline justify-between">
              <span>{toFaDigits(statusCounts.LOADING_UNLOADING)}</span>
              <span className="text-[10px] font-normal text-slate-400">در محل سکو</span>
            </div>
          </div>

          {/* Average Speed */}
          <div className="p-2 rounded-xl border border-slate-800 bg-[#142036]">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>میانگین سرعت</span>
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-black text-white mt-1 flex items-baseline justify-between">
              <span>{toFaDigits(fleetKPIs.avgSpeed)}</span>
              <span className="text-[10px] font-mono text-slate-400">km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FLEET CODE QUICK-SELECT SCROLLER & ADVANCED FILTER BAR */}
      <div className="bg-[#111b2e] px-3 py-2 rounded-xl border border-[#1f2c45] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shadow-xs">
        {/* Horizontal Chips of All Fleet Codes */}
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">کدهای زنده:</span>
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 w-full">
            {allSortedCodes.map((v) => {
              const config = GPS_STATUS_CONFIGS[v.gpsStatus];
              const isSelected = v.id === selectedVehicleId;
              const isMoving = v.speed > 0;

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleFocusVehicle(v)}
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center font-mono font-black text-xs text-white shrink-0 transition-all border relative ${
                    isSelected
                      ? 'ring-2 ring-white scale-110 shadow-md'
                      : 'opacity-90 hover:opacity-100 hover:scale-105 border-slate-700/80'
                  }`}
                  style={{
                    backgroundColor: config.markerColor,
                    borderColor: isSelected ? '#ffffff' : config.markerBorder,
                  }}
                  title={`کد ${v.code} - ${v.driverName} (${config.shortLabel}) | ${toFaDigits(v.speed)} km/h`}
                >
                  {toFaDigits(v.code)}
                  {isMoving && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border border-slate-950"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Type & Moving Filters */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              placeholder="جستجوی کد، راننده، پلاک یا بارنامه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0e1627] border border-slate-700 rounded-lg pr-8 pl-6 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Vehicle Type Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0e1627] text-slate-300 border border-slate-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="ALL">همه انواع خودرو</option>
            <option value="KHAAVAR">خاور</option>
            <option value="HYUNDAI">هیوندا</option>
            <option value="ISUZU">ایسوزو</option>
            <option value="NISSAN">نیسان</option>
          </select>

          {/* Only Moving Toggle */}
          <button
            type="button"
            onClick={() => setOnlyMovingFilter(!onlyMovingFilter)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              onlyMovingFilter
                ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                : 'bg-[#0e1627] border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="فقط خودروهای دارای سرعت و در حال حرکت"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>فقط متحرک</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN WORK AREA (Conditioned by viewMode) */}
      {viewMode === 'map' ? (
        /* MODE A: SPLIT MAP & TELEMETRY INSPECTOR */
        <div className="flex-1 flex flex-col lg:flex-row gap-2.5 relative min-h-0 overflow-hidden">
          {/* Map Container Area */}
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-[#1f2c45] shadow-xl bg-[#0c1322]">
            {/* Leaflet Map DOM Hook */}
            <div ref={mapContainerRef} className="w-full h-full min-h-[450px]" />

            {/* Floating Top Left Controls: Fit Bounds, Center Tehran, Tile Layers */}
            <div className="absolute top-3 left-3 z-1000 flex flex-col gap-2 pointer-events-auto">
              {/* Tile Provider Pill */}
              <div className="bg-[#0f172a]/95 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMapProvider('dark')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    mapProvider === 'dark'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  تاریک
                </button>
                <button
                  type="button"
                  onClick={() => setMapProvider('voyager')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    mapProvider === 'voyager'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  روشن
                </button>
                <button
                  type="button"
                  onClick={() => setMapProvider('standard')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    mapProvider === 'standard'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  OSM
                </button>
              </div>

              {/* Fit All & Center Tehran */}
              <div className="bg-[#0f172a]/95 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleFitBounds}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="نمایش تمام ناوگان در کادر (Fit All)"
                >
                  <Maximize2 className="w-4 h-4 text-blue-400" />
                </button>

                <button
                  type="button"
                  onClick={handleCenterTehran}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="مرکز بر کلانشهر تهران"
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowTrails(!showTrails)}
                  className={`p-1.5 rounded-lg transition ${
                    showTrails ? 'text-purple-400 bg-purple-950/50' : 'text-slate-400 hover:text-white'
                  }`}
                  title="نمایش / عدم نمایش ردپای حرکت (GPS Trails)"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Toggle Sidebar Collapse Button (Floating on Right Edge of Map) */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute top-3 right-3 z-1000 bg-[#0f172a]/95 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 shadow-xl text-slate-300 hover:text-white pointer-events-auto transition flex items-center gap-1.5 text-xs font-bold"
              title={isSidebarCollapsed ? 'نمایش پنل بازرسی ناوگان' : 'بستن پنل و گسترش نقشه'}
            >
              {isSidebarCollapsed ? (
                <>
                  <ChevronLeft className="w-4 h-4 text-blue-400" />
                  <span>نمایش پنل ناوگان</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">گسترش نقشه</span>
                </>
              )}
            </button>

            {/* Bottom Left Floating Legend */}
            <div className="absolute bottom-4 left-4 z-1000 bg-[#0f172a]/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 shadow-xl text-[11px] hidden md:flex flex-col gap-1.5 pointer-events-auto">
              <div className="text-[10px] text-slate-400 font-bold border-b border-slate-700/60 pb-1 flex items-center justify-between gap-4">
                <span>راهنمای رنگی کدها</span>
                <span className="font-mono text-slate-400">{toFaDigits(filteredVehicles.length)} خودرو</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></span>
                  <span>دارای بارنامه</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-xs"></span>
                  <span>شروع کار / در مسیر</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
                  <span>آزاد و آماده اعزام</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
                  <span>بارگیری / تخلیه</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-xs"></span>
                  <span>پارکینگ مرکزی</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs"></span>
                  <span>تعمیرگاه و سرویس</span>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Telemetry Inspector & Fleet Drawer */}
          {!isSidebarCollapsed && (
            <div className="w-full lg:w-96 bg-[#111b2e] border border-[#1f2c45] rounded-2xl flex flex-col overflow-hidden shadow-xl shrink-0">
              {/* Drawer Header */}
              <div className="p-3 border-b border-[#1f2c45] bg-[#142036] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">مانیتورینگ ناوگان و کدها</h3>
                    <p className="text-[10px] text-slate-400">
                      نمایش {toFaDigits(filteredVehicles.length)} از {toFaDigits(gpsVehicles.length)} خودرو
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-[#0e1627] text-slate-300 border border-slate-700 text-[10px] rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="code_asc">کد صعودی</option>
                    <option value="code_desc">کد نزولی</option>
                    <option value="speed_desc">بیشترین سرعت</option>
                    <option value="status">وضعیت</option>
                  </select>
                </div>
              </div>

              {/* Selected Vehicle Telemetry Card */}
              {selectedVehicle && (
                <div className="p-3 bg-[#0e172a] border-b border-slate-700/80 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-white text-xs shrink-0 border-2 shadow-md"
                        style={{
                          backgroundColor: GPS_STATUS_CONFIGS[selectedVehicle.gpsStatus].markerColor,
                          borderColor: '#ffffff',
                        }}
                      >
                        {toFaDigits(selectedVehicle.code)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">
                            خودرو کد {toFaDigits(selectedVehicle.code)}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                              GPS_STATUS_CONFIGS[selectedVehicle.gpsStatus].badgeBg
                            } ${GPS_STATUS_CONFIGS[selectedVehicle.gpsStatus].badgeText} ${
                              GPS_STATUS_CONFIGS[selectedVehicle.gpsStatus].badgeBorder
                            }`}
                          >
                            {GPS_STATUS_CONFIGS[selectedVehicle.gpsStatus].shortLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-bold mt-0.5">
                          راننده: {selectedVehicle.driverName}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                      title="بستن پنل خودرو"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Iranian Plate Display */}
                  <div className="flex items-center justify-between bg-[#142036] p-2 rounded-xl border border-slate-700">
                    <IranianPlate plateNumber={selectedVehicle.plateNumber} size="sm" />
                    <div className="text-left text-[11px] font-mono">
                      <div className="text-slate-400 text-[10px]">نوع خودرو</div>
                      <div className="text-slate-200 font-bold">
                        {VEHICLE_TYPE_NAMES[selectedVehicle.vehicleType] || selectedVehicle.vehicleType}
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Metrics Grid (4 Gauges) */}
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                    <div className="bg-[#142036] p-1.5 rounded-xl border border-slate-700">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5 font-sans">
                        <Gauge className="w-3 h-3 text-amber-400" />
                        <span>سرعت</span>
                      </div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {toFaDigits(selectedVehicle.speed)}{' '}
                        <span className="text-[8px] font-sans text-slate-400">km/h</span>
                      </div>
                    </div>

                    <div className="bg-[#142036] p-1.5 rounded-xl border border-slate-700">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5 font-sans">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>سوییچ</span>
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 ${
                          selectedVehicle.ignition ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {selectedVehicle.ignition ? 'روشن' : 'خاموش'}
                      </div>
                    </div>

                    <div className="bg-[#142036] p-1.5 rounded-xl border border-slate-700">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5 font-sans">
                        <Satellite className="w-3 h-3 text-sky-400" />
                        <span>ماهواره</span>
                      </div>
                      <div className="text-xs font-black text-sky-400 mt-0.5">
                        {toFaDigits(selectedVehicle.satellites)}
                      </div>
                    </div>

                    <div className="bg-[#142036] p-1.5 rounded-xl border border-slate-700">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5 font-sans">
                        <BatteryCharging className="w-3 h-3 text-purple-400" />
                        <span>باتری</span>
                      </div>
                      <div className="text-xs font-black text-purple-300 mt-0.5">
                        {toFaDigits(selectedVehicle.batteryLevel)}%
                      </div>
                    </div>
                  </div>

                  {/* Waybill / Mission Card */}
                  {selectedVehicle.waybill ? (
                    <div className="bg-blue-950/30 border border-blue-800/60 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-300">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>بارنامه: {selectedVehicle.waybill.waybillNumber}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          تخمین: {selectedVehicle.waybill.estimatedArrival}
                        </span>
                      </div>

                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300 text-[10px]">
                          <span className="text-slate-400 shrink-0">مبدا:</span>
                          <span className="font-medium truncate">{selectedVehicle.waybill.origin}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-200 text-[10px] font-bold">
                          <span className="text-slate-400 shrink-0">مقصد:</span>
                          <span className="text-amber-300 truncate">
                            {selectedVehicle.waybill.destination}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-blue-900/50">
                          <span>محموله: {selectedVehicle.waybill.cargoDescription}</span>
                          <span className="font-mono">{toFaDigits(selectedVehicle.waybill.cargoWeightTon)} تن</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-xl text-[11px] text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{selectedVehicle.locationTitle}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={handleOpenStatusModal}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 transition"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>تغییر وضعیت یا بارنامه</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFollowSelectedVehicle(!followSelectedVehicle)}
                      className={`p-1.5 rounded-lg border transition ${
                        followSelectedVehicle
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title="دنبال کردن خودکار روی نقشه"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {selectedVehicle.driverPhone && selectedVehicle.driverPhone !== '---' && (
                      <a
                        href={`tel:${selectedVehicle.driverPhone}`}
                        className="p-1.5 rounded-lg bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-300 border border-emerald-600/40 transition"
                        title={`تماس با راننده (${selectedVehicle.driverPhone})`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    {onNavigateFleetTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateFleetTab(selectedVehicle.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title="مشاهده پرونده خودرو در مدیریت ناوگان"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Vehicle List Scrollable Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {filteredVehicles.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    خودرویی با این فیلترها یافت نشد.
                  </div>
                ) : (
                  filteredVehicles.map((v) => {
                    const config = GPS_STATUS_CONFIGS[v.gpsStatus];
                    const isSelected = v.id === selectedVehicleId;
                    const isMoving = v.gpsStatus === 'STARTED_IN_TRANSIT' || v.speed > 0;

                    return (
                      <div
                        key={v.id}
                        onClick={() => handleFocusVehicle(v)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#182a4a] border-blue-500 shadow-xs ring-1 ring-blue-500/50'
                            : 'bg-[#0f172a] hover:bg-[#142036] border-[#1f2c45]'
                        }`}
                      >
                        {/* Code badge and driver info */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-white shrink-0 shadow-xs border"
                            style={{
                              backgroundColor: config.markerColor,
                              borderColor: config.markerBorder,
                            }}
                          >
                            <span className="text-[11px] leading-none">{toFaDigits(v.code)}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-white truncate">
                                {v.driverName}
                              </span>
                              {isMoving && (
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType} • پلاک {v.plateNumber}
                            </div>
                          </div>
                        </div>

                        {/* Status Pill & Speed */}
                        <div className="text-left shrink-0">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                          >
                            {config.shortLabel}
                          </span>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                            {isMoving ? (
                              <span className="text-emerald-400 font-bold">
                                {toFaDigits(v.speed)} km/h
                              </span>
                            ) : (
                              <span>متوقف</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* MODE B: FLEET TELEMETRY MATRIX GRID */
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0d1526] border border-[#1f2c45] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs sm:text-sm font-black text-white">
                ماتریس کارت‌های عملیاتی و تلمتری ناوگان
              </h2>
              <span className="text-xs text-slate-400">
                ({toFaDigits(filteredVehicles.length)} خودرو آماده نظارت)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">مرتب‌سازی:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#142036] text-slate-200 border border-slate-700 text-xs rounded-lg px-2.5 py-1 font-medium"
              >
                <option value="code_asc">کد خودرو (صعودی)</option>
                <option value="code_desc">کد خودرو (نزولی)</option>
                <option value="speed_desc">بیشترین سرعت</option>
                <option value="status">وضعیت</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filteredVehicles.map((v) => {
              const config = GPS_STATUS_CONFIGS[v.gpsStatus];
              const isMoving = v.speed > 0;

              return (
                <div
                  key={v.id}
                  className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3 shadow-md hover:border-slate-600 transition flex flex-col justify-between gap-2.5"
                >
                  {/* Top Bar: Code Badge, Driver & Status Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-white text-xs shrink-0 shadow-sm border"
                        style={{
                          backgroundColor: config.markerColor,
                          borderColor: config.markerBorder,
                        }}
                      >
                        {toFaDigits(v.code)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">{v.driverName}</span>
                          {isMoving && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                    >
                      {config.shortLabel}
                    </span>
                  </div>

                  {/* Plate Display */}
                  <div className="bg-[#142036] p-1.5 rounded-lg border border-slate-700/80 flex items-center justify-center">
                    <IranianPlate plateNumber={v.plateNumber} size="sm" />
                  </div>

                  {/* Live Telemetry Meters */}
                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div className="bg-[#142036] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                        <Gauge className="w-3 h-3 text-amber-400" />
                        <span>سرعت</span>
                      </div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {toFaDigits(v.speed)} <span className="text-[8px] font-sans text-slate-400">km/h</span>
                      </div>
                    </div>

                    <div className="bg-[#142036] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>سوییچ</span>
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 ${
                          v.ignition ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {v.ignition ? 'روشن' : 'خاموش'}
                      </div>
                    </div>

                    <div className="bg-[#142036] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                        <Fuel className="w-3 h-3 text-sky-400" />
                        <span>باک</span>
                      </div>
                      <div className="text-xs font-black text-sky-300 mt-0.5">
                        {toFaDigits(v.fuelLevel)}%
                      </div>
                    </div>
                  </div>

                  {/* Waybill info if exists */}
                  {v.waybill ? (
                    <div className="bg-blue-950/20 border border-blue-900/50 p-2 rounded-lg text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-blue-300 font-bold">
                        <span>بارنامه: {v.waybill.waybillNumber}</span>
                        <span className="text-[10px] text-slate-400">{v.waybill.estimatedArrival}</span>
                      </div>
                      <div className="text-slate-300 text-[10px] truncate">
                        مقصد: <span className="text-amber-300 font-bold">{v.waybill.destination}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{v.locationTitle}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        handleFocusVehicle(v);
                        setViewMode('map');
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition flex items-center justify-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>مشاهده در نقشه</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicleId(v.id);
                        handleOpenStatusModal();
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="تغییر وضعیت"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {v.driverPhone && v.driverPhone !== '---' && (
                      <a
                        href={`tel:${v.driverPhone}`}
                        className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 transition"
                        title="تماس با راننده"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MODE C: DATA DENSE TELEMETRY TABLE */
        <div className="flex-1 overflow-hidden bg-[#0d1526] border border-[#1f2c45] rounded-2xl shadow-xl flex flex-col">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs sm:text-sm font-black text-white">
                جدول داده‌های تلمتری و عملیات دیسپچینگ ناوگان
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {toFaDigits(filteredVehicles.length)} رکورد آنلاین
            </span>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#111b2e] text-slate-400 font-bold border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">کد</th>
                  <th className="p-2.5">پلاک ملی</th>
                  <th className="p-2.5">راننده و تماس</th>
                  <th className="p-2.5">نوع خودرو</th>
                  <th className="p-2.5">وضعیت عملیاتی</th>
                  <th className="p-2.5 text-center">سرعت (km/h)</th>
                  <th className="p-2.5 text-center">سوییچ</th>
                  <th className="p-2.5">بارنامه / مقصد</th>
                  <th className="p-2.5">موقعیت جاری</th>
                  <th className="p-2.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVehicles.map((v) => {
                  const config = GPS_STATUS_CONFIGS[v.gpsStatus];
                  const isMoving = v.speed > 0;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-[#142036] transition cursor-pointer"
                      onClick={() => setSelectedVehicleId(v.id)}
                    >
                      {/* Code */}
                      <td className="p-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-white text-xs shadow-xs border"
                          style={{
                            backgroundColor: config.markerColor,
                            borderColor: config.markerBorder,
                          }}
                        >
                          {toFaDigits(v.code)}
                        </div>
                      </td>

                      {/* Plate */}
                      <td className="p-2.5 whitespace-nowrap">
                        <IranianPlate plateNumber={v.plateNumber} size="sm" />
                      </td>

                      {/* Driver & Phone */}
                      <td className="p-2.5">
                        <div className="font-bold text-white">{v.driverName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{v.driverPhone}</div>
                      </td>

                      {/* Type */}
                      <td className="p-2.5 text-slate-300">
                        {VEHICLE_TYPE_NAMES[v.vehicleType] || v.vehicleType}
                      </td>

                      {/* Status */}
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                        >
                          {config.shortLabel}
                        </span>
                      </td>

                      {/* Speed */}
                      <td className="p-2.5 text-center font-mono">
                        {isMoving ? (
                          <span className="text-emerald-400 font-bold">
                            {toFaDigits(v.speed)}
                          </span>
                        ) : (
                          <span className="text-slate-500">۰</span>
                        )}
                      </td>

                      {/* Ignition */}
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[10px] font-bold ${
                            v.ignition ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {v.ignition ? 'روشن' : 'خاموش'}
                        </span>
                      </td>

                      {/* Waybill */}
                      <td className="p-2.5">
                        {v.waybill ? (
                          <div>
                            <span className="font-mono text-blue-300 font-bold text-[11px]">
                              {v.waybill.waybillNumber}
                            </span>
                            <div className="text-[10px] text-amber-300 truncate max-w-xs">
                              {v.waybill.destination}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">فاقد بارنامه</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="p-2.5 text-slate-400 text-[11px] truncate max-w-xs">
                        {v.locationTitle}
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFocusVehicle(v);
                              setViewMode('map');
                            }}
                            className="p-1 rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition"
                            title="مشاهده در نقشه"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicleId(v.id);
                              handleOpenStatusModal();
                            }}
                            className="p-1 rounded-md bg-slate-800 text-slate-300 hover:text-white transition"
                            title="تغییر وضعیت"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {v.driverPhone && v.driverPhone !== '---' && (
                            <a
                              href={`tel:${v.driverPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded-md bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900 transition"
                              title="تماس"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL: CHANGE GPS STATUS / WAYBILL ASSIGNMENT */}
      {isStatusEditModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-5000 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slideUp">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1f2c45] bg-[#142036] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    تغییر وضعیت آنلاین و صدور بارنامه
                  </h3>
                  <p className="text-xs text-slate-400">
                    خودرو کد {toFaDigits(selectedVehicle.code)} - راننده: {selectedVehicle.driverName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStatusEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Status Choice Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  انتخاب وضعیت جدید خودرو:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(GPS_STATUS_CONFIGS) as GpsVehicleStatus[]).map((stKey) => {
                    const cfg = GPS_STATUS_CONFIGS[stKey];
                    const isSelected = newStatusChoice === stKey;
                    return (
                      <button
                        key={stKey}
                        type="button"
                        onClick={() => setNewStatusChoice(stKey)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                            : 'bg-[#0f172a] hover:bg-[#142036] border-[#1f2c45]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full mt-0.5 shrink-0"
                          style={{ backgroundColor: cfg.markerColor }}
                        ></span>
                        <div>
                          <div className="text-xs font-bold text-white">{cfg.label}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {cfg.shortLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Waybill fields if status requires it */}
              {(newStatusChoice === 'WITH_WAYBILL' ||
                newStatusChoice === 'STARTED_IN_TRANSIT' ||
                newStatusChoice === 'LOADING_UNLOADING') && (
                <div className="bg-[#0f172a] p-3.5 rounded-xl border border-[#1f2c45] space-y-3">
                  <div className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>مشخصات بارنامه و مأموریت حمل</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        شماره بارنامه:
                      </label>
                      <input
                        type="text"
                        value={newWaybillNumber}
                        onChange={(e) => setNewWaybillNumber(e.target.value)}
                        placeholder="BL-1403/..."
                        className="w-full bg-[#142036] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        نوع کالا / محموله:
                      </label>
                      <input
                        type="text"
                        value={newCargo}
                        onChange={(e) => setNewCargo(e.target.value)}
                        placeholder="مواد غذایی، قطعات و..."
                        className="w-full bg-[#142036] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        مبدا بارگیری:
                      </label>
                      <input
                        type="text"
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        placeholder="انبار مرکزی حامی بار (فتح)"
                        className="w-full bg-[#142036] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        مقصد تخلیه:
                      </label>
                      <input
                        type="text"
                        value={newDestination}
                        onChange={(e) => setNewDestination(e.target.value)}
                        placeholder="شهرک صنعتی / انبار مقصد"
                        className="w-full bg-[#142036] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1f2c45] bg-[#142036] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStatusEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveStatusChange}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md transition"
              >
                ثبت و اعمال وضعیت در جی‌پی‌اس
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
