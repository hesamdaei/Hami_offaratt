import React, { FC, useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Phone,
  Truck,
  Clock,
  Gauge,
  Radio,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Maximize2,
  Compass,
  AlertCircle,
  Headphones,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  CargoTrackingItem,
  getCargoTracking,
  loadAllCargoTrackings,
  MILESTONE_CONFIG,
  generateCustomerShareUrl,
} from '../utils/cargoTrackingService';
import { IranianPlate } from './IranianPlate';
import { toFaDigits } from '../utils/jalaali';

interface CargoTrackingCustomerPortalProps {
  orderNumber?: string;
  isStandalone?: boolean;
  onBackToApp?: () => void;
  onOpenDriverPortal?: (orderNumber: string) => void;
}

export const CargoTrackingCustomerPortal: FC<CargoTrackingCustomerPortalProps> = ({
  orderNumber = 'ORD-1403/9201',
  isStandalone = false,
  onBackToApp,
  onOpenDriverPortal,
}) => {
  const [tracking, setTracking] = useState<CargoTrackingItem | null>(() =>
    getCargoTracking(orderNumber)
  );
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>(orderNumber);
  const [isCopied, setIsCopied] = useState(false);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [lastSyncSecondsAgo, setLastSyncSecondsAgo] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);

  // Poll for updates & listen to BroadcastChannel + Storage events
  useEffect(() => {
    const handleUpdate = () => {
      const refreshed = getCargoTracking(selectedOrderNo);
      if (refreshed) {
        setTracking({ ...refreshed });
        setLastSyncSecondsAgo(0);
      }
    };

    const interval = setInterval(handleUpdate, 2500);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'hamibar_cargo_trackings_v1') {
        handleUpdate();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('hamibar_tracking_synced', handleUpdate);

    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('hamibar_cargo_tracking_bus');
        channel.onmessage = () => handleUpdate();
      }
    } catch {
      // ignore
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hamibar_tracking_synced', handleUpdate);
      if (channel) channel.close();
    };
  }, [selectedOrderNo]);

  // Update second ticker for freshness indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setLastSyncSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize or re-render Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!tracking) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [tracking.currentLocation.lat, tracking.currentLocation.lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Custom Origin Icon
    const originIcon = L.divIcon({
      className: 'custom-origin-marker',
      html: `
        <div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16,185,129,0.5); color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Custom Destination Icon
    const destIcon = L.divIcon({
      className: 'custom-dest-marker',
      html: `
        <div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(239,68,68,0.5); color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Custom Vehicle Icon with radar pulse
    const vehicleIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background-color: rgba(6,182,212,0.3); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: #0284c7; width: 38px; height: 38px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(2,132,199,0.6); color: white; transform: rotate(${tracking.currentLocation.heading || 0}deg); transition: transform 0.5s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="16" height="13" x="1" y="5" rx="2"/><polygon points="17 8 20 8 23 11 23 16 17 16 17 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    // Update Origin Marker
    if (originMarkerRef.current) {
      originMarkerRef.current.setLatLng([tracking.origin.lat, tracking.origin.lng]);
    } else {
      originMarkerRef.current = L.marker([tracking.origin.lat, tracking.origin.lng], {
        icon: originIcon,
      })
        .bindPopup(`<b>مبدأ بارگیری:</b><br/>${tracking.origin.name}<br/>${tracking.origin.address}`)
        .addTo(map);
    }

    // Update Destination Marker
    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([tracking.destination.lat, tracking.destination.lng]);
    } else {
      destMarkerRef.current = L.marker([tracking.destination.lat, tracking.destination.lng], {
        icon: destIcon,
      })
        .bindPopup(
          `<b>مقصد تخلیه:</b><br/>${tracking.destination.name}<br/>${tracking.destination.address}`
        )
        .addTo(map);
    }

    // Update Vehicle Marker
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([
        tracking.currentLocation.lat,
        tracking.currentLocation.lng,
      ]);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    } else {
      vehicleMarkerRef.current = L.marker(
        [tracking.currentLocation.lat, tracking.currentLocation.lng],
        { icon: vehicleIcon }
      )
        .bindPopup(
          `<b>خودرو حامل بار:</b> ${tracking.vehicleType}<br/><b>راننده:</b> ${tracking.driverName}<br/><b>سرعت:</b> ${toFaDigits(
            tracking.currentLocation.speedKmh
          )} کیلومتر/ساعت`
        )
        .addTo(map);
    }

    // Update Route Polylines
    if (tracking.routePoints && tracking.routePoints.length > 0) {
      const allPoints = tracking.routePoints;
      const currIdx = tracking.currentRouteIndex || 0;
      const traveledPoints = allPoints.slice(0, currIdx + 1);

      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(allPoints);
      } else {
        routePolylineRef.current = L.polyline(allPoints, {
          color: '#94a3b8',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.6,
        }).addTo(map);
      }

      if (traveledPolylineRef.current) {
        traveledPolylineRef.current.setLatLngs(traveledPoints);
      } else {
        traveledPolylineRef.current = L.polyline(traveledPoints, {
          color: '#0284c7',
          weight: 5,
          opacity: 0.9,
        }).addTo(map);
      }
    }

    // Auto-pan if autoFollow is active
    if (isAutoFollow) {
      map.panTo([tracking.currentLocation.lat, tracking.currentLocation.lng], { animate: true });
    }
  }, [tracking, isAutoFollow]);

  const handleFitBounds = () => {
    if (!mapInstanceRef.current || !tracking) return;
    const bounds = L.latLngBounds([
      [tracking.origin.lat, tracking.origin.lng],
      [tracking.destination.lat, tracking.destination.lng],
      [tracking.currentLocation.lat, tracking.currentLocation.lng],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    setIsAutoFollow(false);
  };

  const handleCenterVehicle = () => {
    if (!mapInstanceRef.current || !tracking) return;
    mapInstanceRef.current.setView(
      [tracking.currentLocation.lat, tracking.currentLocation.lng],
      14,
      { animate: true }
    );
    setIsAutoFollow(true);
  };

  const handleCopyLink = () => {
    if (!tracking) return;
    const url = generateCustomerShareUrl(tracking.orderNumber);
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const allAvailable = loadAllCargoTrackings();
  const availableOrders = Object.values(allAvailable);

  const milestoneConfig = tracking ? MILESTONE_CONFIG[tracking.status] : null;

  return (
    <div
      className={`w-full flex flex-col bg-[#0b1329] text-slate-100 ${
        isStandalone ? 'min-h-screen' : 'h-[calc(100vh-140px)] rounded-2xl border border-slate-800'
      } overflow-hidden font-sans`}
      dir="rtl"
    >
      {/* Top Customer Header Bar */}
      <header className="bg-[#0f172a]/95 backdrop-blur border-b border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
              title="بازگشت به برنامه اصلی"
            >
              <ChevronRight className="w-4 h-4" />
              <span>بازگشت به پنل مدیریت</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white">سامانه پیگیری زنده بار و مرسوله</h1>
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  جی‌پی‌اس زنده
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                شبکه هوشمند حمل و نقل اثاثیه و بارهای تجاری حامی بار
              </p>
            </div>
          </div>
        </div>

        {/* Quick Order Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
            <span className="text-slate-400">کد رهگیری:</span>
            <select
              value={selectedOrderNo}
              onChange={(e) => {
                setSelectedOrderNo(e.target.value);
                const updated = getCargoTracking(e.target.value);
                if (updated) setTracking(updated);
              }}
              className="bg-transparent text-cyan-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              {availableOrders.map((ord) => (
                <option key={ord.orderNumber} value={ord.orderNumber} className="bg-slate-900 text-white">
                  {ord.orderNumber} ({ord.customerName})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              isCopied
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="کپی لینک اختصاصی رهگیری مشتری"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'لینک کپی شد' : 'اشتراک لینک مشتری'}</span>
          </button>

          {onOpenDriverPortal && tracking && (
            <button
              onClick={() => onOpenDriverPortal(tracking.orderNumber)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 transition"
              title="ورود به پنل ارسال موقعیت راننده"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>پنل راننده (شبیه‌ساز / GPS)</span>
            </button>
          )}

          <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/60 px-2 py-1 rounded-lg">
            <RefreshCw className={`w-3 h-3 text-cyan-400 ${lastSyncSecondsAgo < 3 ? 'animate-spin' : ''}`} />
            <span>
              به‌روزرسانی: {toFaDigits(lastSyncSecondsAgo)} ثانیه قبل
            </span>
          </div>
        </div>
      </header>

      {/* Main Body: Map on Left/Center, Info Panels on Right */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Leaflet Map Canvas */}
        <div className="flex-1 h-64 lg:h-auto relative bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Map Actions Control Pill */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              onClick={handleCenterVehicle}
              className={`p-2.5 rounded-xl shadow-lg border backdrop-blur transition flex items-center gap-2 text-xs font-bold ${
                isAutoFollow
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-900/40'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="تمرکز روی موقعیت خودرو"
            >
              <Navigation className="w-4 h-4 text-cyan-300" />
              <span>خودرو</span>
            </button>
            <button
              onClick={handleFitBounds}
              className="p-2.5 rounded-xl shadow-lg border bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200 backdrop-blur transition flex items-center gap-2 text-xs font-bold"
              title="مشاهده تمام مسیر از مبدأ تا مقصد"
            >
              <Maximize2 className="w-4 h-4 text-cyan-300" />
              <span>کل مسیر</span>
            </button>
          </div>

          {/* Floating Live Signal Speed Pill */}
          {tracking && (
            <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3.5 py-2 shadow-xl backdrop-blur flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold text-white">
                  {tracking.currentLocation.isRealGps ? 'سیگنال مستقیم ماهواره‌ای' : 'سیگنال فرستنده راننده'}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-700"></div>
              <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono font-bold">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>{toFaDigits(tracking.currentLocation.speedKmh)} km/h</span>
              </div>
            </div>
          )}
        </div>

        {/* Info & Status Sidebar */}
        {tracking && (
          <aside className="w-full lg:w-[420px] bg-[#0c1427]/95 border-t lg:border-t-0 lg:border-r border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 z-10 custom-scrollbar">
            {/* Primary Status Card with Progress */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">وضعیت لحظه‌ای باربری</span>
                {milestoneConfig && (
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-xl border ${milestoneConfig.badgeBg} ${milestoneConfig.badgeText} ${milestoneConfig.badgeBorder}`}
                  >
                    {milestoneConfig.label}
                  </span>
                )}
              </div>

              {/* ETA and Distance KPIs */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">زمان تقریبی تا مقصد</div>
                    <div className="text-sm font-black text-white font-mono">
                      {tracking.estimatedEtaMinutes > 0
                        ? `${toFaDigits(tracking.estimatedEtaMinutes)} دقیقه`
                        : 'رسیده به مقصد'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">مسافت باقیمانده</div>
                    <div className="text-sm font-black text-white font-mono">
                      {toFaDigits(tracking.distanceRemainingKm)} کیلومتر
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">پیشرفت مسیر بارگیری تا تحویل:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {toFaDigits(tracking.progressPercent)}٪
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${tracking.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Driver note if present */}
              {tracking.driverNote && (
                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-200 flex items-start gap-2">
                  <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-cyan-300">پیام راننده:</strong> {tracking.driverNote}
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Timeline */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>مراحل جابجایی بار</span>
              </h3>

              <div className="space-y-3 relative pr-2">
                <div className="absolute right-5 top-3 bottom-3 w-0.5 bg-slate-800 -z-0"></div>

                {tracking.history.map((step, idx) => {
                  const isCurrent = step.status === tracking.status;
                  return (
                    <div key={idx} className="flex items-start gap-3 relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 transition ${
                          step.completed
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : isCurrent
                            ? 'bg-cyan-600 border-cyan-400 text-white animate-pulse'
                            : 'bg-slate-950 border-slate-700 text-slate-500'
                        }`}
                      >
                        {step.completed ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          toFaDigits(idx + 1)
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              step.completed || isCurrent ? 'text-white' : 'text-slate-500'
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {step.timeFa}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Driver & Vehicle Information Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>مشخصات ناوگان و راننده</span>
              </h3>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
                    {tracking.driverName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">{tracking.driverName}</div>
                    <div className="text-[11px] text-slate-400">{tracking.vehicleType}</div>
                  </div>
                </div>

                <a
                  href={`tel:${tracking.driverPhone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition"
                  title="تماس مستقیم با راننده"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>تماس</span>
                </a>
              </div>

              {/* Iranian Plate Display */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">پلاک انتظامی خودرو:</span>
                <IranianPlate plateNumber={tracking.vehiclePlate} size="sm" />
              </div>
            </div>

            {/* Addresses and Cargo Details */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5 text-xs">
              <h3 className="font-black text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>مسیر و جزئیات مرسوله</span>
              </h3>

              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">مبدأ بارگیری:</div>
                    <div className="text-white text-[11px] font-medium leading-relaxed">
                      {tracking.origin.address}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">مقصد تخلیه:</div>
                    <div className="text-white text-[11px] font-medium leading-relaxed">
                      {tracking.destination.address}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>شرح محموله:</span>
                <span className="text-slate-200 font-bold truncate max-w-[200px]">
                  {tracking.cargoDescription}
                </span>
              </div>
            </div>

            {/* Support and Dispatch Desk */}
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">مرکز پاسخگویی حامی بار</div>
                  <div className="text-[10px] text-slate-400">پشتیبانی ۲۴ ساعته سفر</div>
                </div>
              </div>
              <a
                href="tel:02144332211"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold"
              >
                ۰۲۱-۴۴۳۳۲۲۱۱
              </a>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
