import { FC, useState, useRef, MouseEvent, FormEvent } from 'react';
import {
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Info,
  Check,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  BodyDamageMarker,
  TruckBodyView,
  DamageType,
  DamageSeverity,
} from '../types/vehicleHandover';
import { toFaDigits } from '../utils/jalaali';

interface Truck4ViewBodyInspectorProps {
  damages: BodyDamageMarker[];
  onChangeDamages?: (damages: BodyDamageMarker[]) => void;
  readOnly?: boolean;
}

const DAMAGE_TYPE_LABELS: Record<DamageType, { label: string; color: string; bg: string }> = {
  SCRATCH: { label: 'خط و خش', color: 'text-amber-400', bg: 'bg-amber-500' },
  DENT: { label: 'قِری و فرورفتگی', color: 'text-rose-400', bg: 'bg-rose-500' },
  PAINT_CHIP: { label: 'رنگ‌پریدگی / پریدگی', color: 'text-orange-400', bg: 'bg-orange-500' },
  CRACK: { label: 'شکستگی یا ترک', color: 'text-red-500', bg: 'bg-red-600' },
  RUST: { label: 'زنگ‌زدگی / پوسیدگی', color: 'text-yellow-500', bg: 'bg-yellow-600' },
  MISSING_PART: { label: 'کسری یا فقدان قطعه', color: 'text-purple-400', bg: 'bg-purple-600' },
  OTHER: { label: 'سایر موارد', color: 'text-blue-400', bg: 'bg-blue-500' },
};

const SEVERITY_LABELS: Record<DamageSeverity, { label: string; badge: string }> = {
  MINOR: { label: 'سطحی و جزیی', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  MODERATE: { label: 'متوسط و مشهود', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  SEVERE: { label: 'شدید و عمیق', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
};

export const Truck4ViewBodyInspector: FC<Truck4ViewBodyInspectorProps> = ({
  damages,
  onChangeDamages,
  readOnly = false,
}) => {
  const [activeViewTab, setActiveViewTab] = useState<TruckBodyView>('FRONT');

  // Pending damage point dialog
  const [pendingPoint, setPendingPoint] = useState<{
    view: TruckBodyView;
    x: number;
    y: number;
  } | null>(null);

  const [selectedDamageType, setSelectedDamageType] = useState<DamageType>('SCRATCH');
  const [selectedSeverity, setSelectedSeverity] = useState<DamageSeverity>('MINOR');
  const [partNameInput, setPartNameInput] = useState<string>('');
  const [descriptionInput, setDescriptionInput] = useState<string>('');

  // Selected damage details popover
  const [inspectedMarker, setInspectedMarker] = useState<BodyDamageMarker | null>(null);

  const handleContainerClick = (
    e: MouseEvent<HTMLDivElement>,
    view: TruckBodyView
  ) => {
    if (readOnly || !onChangeDamages) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setPendingPoint({ view, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    setSelectedDamageType('SCRATCH');
    setSelectedSeverity('MINOR');
    setPartNameInput('');
    setDescriptionInput('');
  };

  const handleConfirmAddDamage = (e: FormEvent) => {
    e.preventDefault();
    if (!pendingPoint || !onChangeDamages) return;

    const newMarker: BodyDamageMarker = {
      id: `dmg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      view: pendingPoint.view,
      x: pendingPoint.x,
      y: pendingPoint.y,
      damageType: selectedDamageType,
      severity: selectedSeverity,
      partName: partNameInput.trim() || undefined,
      description: descriptionInput.trim() || undefined,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    onChangeDamages([...damages, newMarker]);
    setPendingPoint(null);
  };

  const handleDeleteDamage = (id: string) => {
    if (readOnly || !onChangeDamages) return;
    onChangeDamages(damages.filter((d) => d.id !== id));
    if (inspectedMarker?.id === id) {
      setInspectedMarker(null);
    }
  };

  const damagesByView = (view: TruckBodyView) =>
    damages.filter((d) => d.view === view);

  // SVG Renderers for the 4 faces of a freight truck (خاور / کانتینر)
  const renderTruckFrontSvg = () => (
    <svg viewBox="0 0 400 320" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cabinFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#253556" />
          <stop offset="100%" stopColor="#172338" />
        </linearGradient>
        <linearGradient id="glassFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="containerFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Background Container Body (خاور کانتینری بالا) */}
      <rect x="50" y="20" width="300" height="90" rx="6" fill="url(#containerFrontGrad)" stroke="#64748b" strokeWidth="2" />
      <line x1="100" y1="20" x2="100" y2="110" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="150" y1="20" x2="150" y2="110" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="200" y1="20" x2="200" y2="110" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="250" y1="20" x2="250" y2="110" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="300" y1="20" x2="300" y2="110" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="200" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">کانتین / اتاق بار حامی</text>

      {/* Main Cabin Frame */}
      <path
        d="M 70 100 Q 75 80 100 80 L 300 80 Q 325 80 330 100 L 340 230 Q 340 250 320 250 L 80 250 Q 60 250 60 230 Z"
        fill="url(#cabinFrontGrad)"
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Cabin Roof Light Bar */}
      <rect x="130" y="75" width="140" height="8" rx="3" fill="#f59e0b" fillOpacity="0.8" stroke="#d97706" />

      {/* Front Windshield (شیشه جلو) */}
      <polygon
        points="95,95 305,95 315,160 85,160"
        fill="url(#glassFrontGrad)"
        stroke="#38bdf8"
        strokeWidth="2"
      />
      {/* Windshield Wipers (برف پاک کن) */}
      <line x1="140" y1="160" x2="180" y2="120" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="230" y1="160" x2="270" y2="120" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Hood (کاپوت جلو) */}
      <rect x="90" y="165" width="220" height="35" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
      <text x="200" y="187" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="bold">کاپوت و سینی جلو</text>

      {/* Grille (جلو پنجره) */}
      <rect x="120" y="203" width="160" height="28" rx="4" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
      <line x1="120" y1="210" x2="280" y2="210" stroke="#334155" strokeWidth="1.5" />
      <line x1="120" y1="217" x2="280" y2="217" stroke="#334155" strokeWidth="1.5" />
      <line x1="120" y1="224" x2="280" y2="224" stroke="#334155" strokeWidth="1.5" />
      <circle cx="200" cy="217" r="7" fill="#3b82f6" fillOpacity="0.8" />

      {/* Headlights (چراغ‌های جلو شاگرد و راننده) */}
      {/* Right / شاگرد */}
      <g>
        <rect x="75" y="195" width="38" height="24" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="2" fillOpacity="0.9" />
        <rect x="75" y="222" width="22" height="10" rx="2" fill="#f97316" stroke="#c2410c" />
        <text x="94" y="211" textAnchor="middle" fill="#713f12" fontSize="9" fontWeight="bold">شاگرد</text>
      </g>
      {/* Left / راننده */}
      <g>
        <rect x="287" y="195" width="38" height="24" rx="4" fill="#fef08a" stroke="#eab308" strokeWidth="2" fillOpacity="0.9" />
        <rect x="303" y="222" width="22" height="10" rx="2" fill="#f97316" stroke="#c2410c" />
        <text x="306" y="211" textAnchor="middle" fill="#713f12" fontSize="9" fontWeight="bold">راننده</text>
      </g>

      {/* Side Mirrors (آینه‌های بغل شاگرد و راننده) */}
      {/* شاگرد (سمت راست - راست بیننده) */}
      <path d="M 50 110 L 70 120 L 70 135 L 50 130 Z" fill="#475569" stroke="#64748b" />
      <rect x="35" y="100" width="16" height="50" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
      {/* راننده (سمت چپ - چپ بیننده) */}
      <path d="M 350 110 L 330 120 L 330 135 L 350 130 Z" fill="#475569" stroke="#64748b" />
      <rect x="349" y="100" width="16" height="50" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Front Bumper (سپر جلو) */}
      <rect x="50" y="240" width="300" height="32" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      {/* License Plate Slot (محل پلاک جلو) */}
      <rect x="155" y="246" width="90" height="20" rx="3" fill="#f8fafc" stroke="#1e293b" strokeWidth="1" />
      <text x="200" y="260" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="monospace">پلاک انتظامی جلو</text>

      {/* Fog Lights in Bumper */}
      <circle cx="80" cy="256" r="6" fill="#fed7aa" stroke="#ea580c" />
      <circle cx="320" cy="256" r="6" fill="#fed7aa" stroke="#ea580c" />

      {/* Wheels Front (لاستیک‌های جلو) */}
      <rect x="58" y="272" width="34" height="42" rx="6" fill="#090d16" stroke="#334155" strokeWidth="2" />
      <rect x="308" y="272" width="34" height="42" rx="6" fill="#090d16" stroke="#334155" strokeWidth="2" />
      <line x1="75" y1="272" x2="75" y2="314" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="325" y1="272" x2="325" y2="314" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />

      {/* Ground Line */}
      <line x1="20" y1="314" x2="380" y2="314" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
    </svg>
  );

  const renderTruckRearSvg = () => (
    <svg viewBox="0 0 400 320" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rearContainerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Main Container Outline (نمای عقب اتاق بار) */}
      <rect x="50" y="25" width="300" height="215" rx="6" fill="url(#rearContainerGrad)" stroke="#64748b" strokeWidth="2.5" />

      {/* Double Doors Divider (خط جداکننده درهای دوقلو) */}
      <line x1="200" y1="25" x2="200" y2="240" stroke="#0f172a" strokeWidth="3" />

      {/* Left Door Frame (شاگرد از پشت) */}
      <rect x="60" y="35" width="130" height="195" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      {/* Right Door Frame (راننده از پشت) */}
      <rect x="210" y="35" width="130" height="195" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* Container Door Hinges (لولاهای درب کانتین) */}
      <rect x="46" y="50" width="12" height="16" rx="2" fill="#0f172a" stroke="#94a3b8" />
      <rect x="46" y="125" width="12" height="16" rx="2" fill="#0f172a" stroke="#94a3b8" />
      <rect x="46" y="200" width="12" height="16" rx="2" fill="#0f172a" stroke="#94a3b8" />

      <rect x="342" y="50" width="12" height="16" rx="2" fill="#0f172a" stroke="#94a3b8" />
      <rect x="342" y="125" width="12" height="16" rx="2" fill="#0f172a" stroke="#94a3b8" />
      <rect x="342" y="200" width="12" height="16" rx="2" fill="#0f172a" stroke="#94a3b8" />

      {/* Locking Rods & Handles (دستگیره‌های میله‌ای کانتین راست و چپ) */}
      {/* Rod Left */}
      <line x1="165" y1="40" x2="165" y2="225" stroke="#94a3b8" strokeWidth="3.5" />
      <rect x="155" y="130" width="22" height="12" rx="2" fill="#f59e0b" stroke="#78350f" />
      <text x="120" y="140" fill="#cbd5e1" fontSize="10" textAnchor="middle">دستگیره راست</text>

      {/* Rod Right */}
      <line x1="235" y1="40" x2="235" y2="225" stroke="#94a3b8" strokeWidth="3.5" />
      <rect x="223" y="130" width="22" height="12" rx="2" fill="#f59e0b" stroke="#78350f" />
      <text x="278" y="140" fill="#cbd5e1" fontSize="10" textAnchor="middle">دستگیره چپ</text>

      {/* Rear Top Marker Lights */}
      <rect x="70" y="20" width="24" height="6" rx="2" fill="#ef4444" />
      <rect x="306" y="20" width="24" height="6" rx="2" fill="#ef4444" />

      {/* Rear Bumper (سپر عقب) */}
      <rect x="40" y="240" width="320" height="30" rx="4" fill="#090d16" stroke="#475569" strokeWidth="2" />

      {/* Rear Tail Lights (چراغ‌های خطر عقب شاگرد و راننده) */}
      {/* شاگرد (سمت راست خودرو / چپ تصویر) */}
      <g>
        <rect x="52" y="246" width="55" height="18" rx="3" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
        <rect x="55" y="248" width="16" height="14" fill="#ef4444" />
        <rect x="73" y="248" width="14" height="14" fill="#f97316" />
        <rect x="89" y="248" width="15" height="14" fill="#f8fafc" />
      </g>

      {/* راننده (سمت چپ خودرو / راست تصویر) */}
      <g>
        <rect x="293" y="246" width="55" height="18" rx="3" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
        <rect x="296" y="248" width="15" height="14" fill="#f8fafc" />
        <rect x="313" y="248" width="14" height="14" fill="#f97316" />
        <rect x="329" y="248" width="16" height="14" fill="#ef4444" />
      </g>

      {/* Mudflaps (گل پخش کن های عقب) */}
      <path d="M 50 270 L 110 270 L 105 310 L 55 310 Z" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <text x="80" y="295" fill="#94a3b8" fontSize="8" textAnchor="middle">گل‌پخش‌کن</text>

      <path d="M 290 270 L 350 270 L 345 310 L 295 310 Z" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <text x="320" y="295" fill="#94a3b8" fontSize="8" textAnchor="middle">گل‌پخش‌کن</text>

      {/* Dual Rear Wheels (تایرهای عقب دوبل) */}
      <rect x="42" y="270" width="18" height="42" rx="4" fill="#090d16" stroke="#334155" />
      <rect x="340" y="270" width="18" height="42" rx="4" fill="#090d16" stroke="#334155" />

      {/* Spare Tire underneath (زاپاس زیر شاسی) */}
      <circle cx="200" cy="272" r="16" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
      <circle cx="200" cy="272" r="8" fill="#334155" />
      <text x="200" y="298" fill="#94a3b8" fontSize="9" textAnchor="middle">زاپاس</text>

      {/* Warning Chevron stripes (خطوط شبرنگ ایمنی) */}
      <line x1="120" y1="242" x2="135" y2="268" stroke="#f59e0b" strokeWidth="3" />
      <line x1="140" y1="242" x2="155" y2="268" stroke="#f59e0b" strokeWidth="3" />
      <line x1="245" y1="242" x2="260" y2="268" stroke="#f59e0b" strokeWidth="3" />
      <line x1="265" y1="242" x2="280" y2="268" stroke="#f59e0b" strokeWidth="3" />
    </svg>
  );

  const renderTruckRightSvg = () => (
    <svg viewBox="0 0 540 280" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sideContainerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Rear Cargo Container (سمت راست - کانتین) */}
      <rect x="40" y="30" width="310" height="155" rx="4" fill="url(#sideContainerGrad)" stroke="#64748b" strokeWidth="2" />
      {/* Container Ribs */}
      {[85, 135, 185, 235, 285].map((x) => (
        <line key={x} x1={x} y1="30" x2={x} y2="185" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      <text x="195" y="105" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">دیواره کانتین سمت راست (شاگرد)</text>

      {/* Cabin Profile (سمت شاگرد) */}
      <path
        d="M 350 75 L 420 75 Q 465 75 480 120 L 500 170 L 500 205 L 350 205 Z"
        fill="#253556"
        stroke="#475569"
        strokeWidth="2"
      />

      {/* Passenger Door (درب سمت شاگرد) */}
      <path
        d="M 360 85 L 415 85 Q 450 85 465 125 L 475 200 L 360 200 Z"
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.5"
      />

      {/* Passenger Window (شیشه سمت شاگرد) */}
      <path
        d="M 370 95 L 410 95 Q 440 95 452 130 L 370 130 Z"
        fill="#38bdf8"
        fillOpacity="0.3"
        stroke="#38bdf8"
        strokeWidth="1.5"
      />

      {/* Door Handle (دستگیره درب شاگرد) */}
      <rect x="375" y="145" width="18" height="6" rx="2" fill="#94a3b8" />

      {/* Right Side Mirror (آینه بغل شاگرد) */}
      <rect x="455" y="100" width="12" height="32" rx="3" fill="#0f172a" stroke="#94a3b8" />
      <line x1="445" y1="115" x2="455" y2="115" stroke="#94a3b8" strokeWidth="2" />

      {/* Front Wheel & Arch (چرخ و گلگیر جلو) */}
      <path d="M 430 205 A 38 38 0 0 1 495 205 Z" fill="#0f172a" />
      <circle cx="462" cy="220" r="32" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="462" cy="220" r="14" fill="#334155" stroke="#64748b" />
      <circle cx="462" cy="220" r="5" fill="#f8fafc" />

      {/* Rear Dual Wheels (چرخ‌های عقب راست) */}
      <path d="M 120 185 A 42 42 0 0 1 200 185 Z" fill="#0f172a" />
      <circle cx="160" cy="220" r="34" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="160" cy="220" r="15" fill="#334155" stroke="#64748b" />
      <circle cx="160" cy="220" r="5" fill="#f8fafc" />

      {/* Fuel Tank / Tool Box (جعبه ابزار / مخزن) */}
      <rect x="230" y="190" width="75" height="28" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
      <text x="267" y="208" textAnchor="middle" fill="#94a3b8" fontSize="9">درب جعبه</text>

      {/* Footstep / Step bar (رکاب شاگرد) */}
      <rect x="420" y="200" width="28" height="7" rx="2" fill="#f59e0b" stroke="#b45309" />

      {/* Side Marker Lights (چراغ‌های خطر جانبی) */}
      <circle cx="70" cy="180" r="4" fill="#f97316" />
      <circle cx="210" cy="180" r="4" fill="#f97316" />
      <circle cx="320" cy="180" r="4" fill="#f97316" />

      {/* Chassis Frame Rail */}
      <rect x="30" y="185" width="470" height="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      {/* Ground Line */}
      <line x1="20" y1="254" x2="520" y2="254" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
    </svg>
  );

  const renderTruckLeftSvg = () => (
    <svg viewBox="0 0 540 280" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sideLeftContainerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Rear Cargo Container (سمت چپ - کانتین) */}
      <rect x="190" y="30" width="310" height="155" rx="4" fill="url(#sideLeftContainerGrad)" stroke="#64748b" strokeWidth="2" />
      {/* Container Ribs */}
      {[240, 290, 340, 390, 440].map((x) => (
        <line key={x} x1={x} y1="30" x2={x} y2="185" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      <text x="345" y="105" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">دیواره کانتین سمت چپ (راننده)</text>

      {/* Cabin Profile (سمت راننده) */}
      <path
        d="M 190 75 L 120 75 Q 75 75 60 120 L 40 170 L 40 205 L 190 205 Z"
        fill="#253556"
        stroke="#475569"
        strokeWidth="2"
      />

      {/* Driver Door (درب سمت راننده) */}
      <path
        d="M 180 85 L 125 85 Q 90 85 75 125 L 65 200 L 180 200 Z"
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.5"
      />

      {/* Driver Window (شیشه سمت راننده) */}
      <path
        d="M 170 95 L 130 95 Q 100 95 88 130 L 170 130 Z"
        fill="#38bdf8"
        fillOpacity="0.3"
        stroke="#38bdf8"
        strokeWidth="1.5"
      />

      {/* Door Handle (دستگیره درب راننده) */}
      <rect x="145" y="145" width="18" height="6" rx="2" fill="#94a3b8" />

      {/* Left Side Mirror (آینه بغل راننده) */}
      <rect x="73" y="100" width="12" height="32" rx="3" fill="#0f172a" stroke="#94a3b8" />
      <line x1="85" y1="115" x2="95" y2="115" stroke="#94a3b8" strokeWidth="2" />

      {/* Front Wheel & Arch (چرخ و گلگیر جلو راننده) */}
      <path d="M 45 205 A 38 38 0 0 1 110 205 Z" fill="#0f172a" />
      <circle cx="78" cy="220" r="32" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="78" cy="220" r="14" fill="#334155" stroke="#64748b" />
      <circle cx="78" cy="220" r="5" fill="#f8fafc" />

      {/* Rear Dual Wheels (چرخ‌های عقب راننده) */}
      <path d="M 340 185 A 42 42 0 0 1 420 185 Z" fill="#0f172a" />
      <circle cx="380" cy="220" r="34" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="380" cy="220" r="15" fill="#334155" stroke="#64748b" />
      <circle cx="380" cy="220" r="5" fill="#f8fafc" />

      {/* Fuel Tank (درب و باک سوخت) */}
      <rect x="235" y="190" width="80" height="28" rx="4" fill="#1e293b" stroke="#eab308" strokeWidth="1.5" />
      <circle cx="250" cy="204" r="7" fill="#f59e0b" stroke="#78350f" />
      <text x="282" y="208" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">درب باک</text>

      {/* Footstep / Step bar (رکاب راننده) */}
      <rect x="92" y="200" width="28" height="7" rx="2" fill="#f59e0b" stroke="#b45309" />

      {/* Side Marker Lights (چراغ‌های خطر جانبی) */}
      <circle cx="220" cy="180" r="4" fill="#f97316" />
      <circle cx="330" cy="180" r="4" fill="#f97316" />
      <circle cx="470" cy="180" r="4" fill="#f97316" />

      {/* Chassis Frame Rail */}
      <rect x="40" y="185" width="470" height="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      {/* Ground Line */}
      <line x1="20" y1="254" x2="520" y2="254" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
    </svg>
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header & View Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0d1627] p-3 rounded-2xl border border-[#1f2c45]">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white text-sm">
              شماتیک ۴ وجهی بدنه کامیونت (ثبت وضعیت فیزیکی و آسیب‌ها)
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {toFaDigits(damages.length)} مورد آسیب ثبت شده
            </span>
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            روی هر وجه از کامیونت کلیک کنید تا محل خط و خش، قِری، شکستگی یا رنگ‌پریدگی را ثبت نمایید.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#090f1d] p-1 rounded-xl border border-[#1b2b48] text-xs">
          {[
            { id: 'FRONT', label: 'نمای جلو (کابین)' },
            { id: 'REAR', label: 'نمای عقب (کانتین)' },
            { id: 'RIGHT', label: 'سمت راست (شاگرد)' },
            { id: 'LEFT', label: 'سمت چپ (راننده)' },
          ].map((tab) => {
            const count = damagesByView(tab.id as TruckBodyView).length;
            const isActive = activeViewTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveViewTab(tab.id as TruckBodyView)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
                    {toFaDigits(count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Canvas Container */}
      <div className="relative bg-[#080e1b] border border-[#1f2c45] rounded-2xl p-4 sm:p-6 overflow-hidden shadow-inner flex flex-col items-center">
        {/* Helper Hint */}
        {!readOnly && (
          <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>جهت ثبت نقطه آسیب جدید، روی بخش مورد نظر در شکل کلیک کنید</span>
          </div>
        )}

        {/* Schematic Box */}
        <div
          onClick={(e) => handleContainerClick(e, activeViewTab)}
          className={`relative w-full max-w-2xl aspect-[16/10] flex items-center justify-center ${
            !readOnly ? 'cursor-crosshair' : 'cursor-default'
          }`}
        >
          {activeViewTab === 'FRONT' && renderTruckFrontSvg()}
          {activeViewTab === 'REAR' && renderTruckRearSvg()}
          {activeViewTab === 'RIGHT' && renderTruckRightSvg()}
          {activeViewTab === 'LEFT' && renderTruckLeftSvg()}

          {/* Render Damage Markers for this View */}
          {damagesByView(activeViewTab).map((marker, idx) => {
            const typeConfig = DAMAGE_TYPE_LABELS[marker.damageType];
            const isInspected = inspectedMarker?.id === marker.id;

            return (
              <div
                key={marker.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectedMarker(isInspected ? null : marker);
                }}
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-20 cursor-pointer group"
              >
                {/* Pulsing halo */}
                <span className={`absolute -inset-1 rounded-full ${typeConfig.bg} opacity-50 animate-ping`} />
                {/* Pin Badge */}
                <div
                  className={`relative flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black text-white shadow-lg border-2 border-white transition-transform ${
                    typeConfig.bg
                  } ${isInspected ? 'scale-125 ring-2 ring-amber-300' : 'group-hover:scale-110'}`}
                >
                  {toFaDigits(idx + 1)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Inspected Marker Details Card */}
        {inspectedMarker && (
          <div className="w-full max-w-lg mt-3 p-3.5 bg-[#0f192e] border border-blue-500/40 rounded-xl shadow-xl flex items-start justify-between gap-3 animate-in fade-in zoom-in-95">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${DAMAGE_TYPE_LABELS[inspectedMarker.damageType].color}`}>
                  {DAMAGE_TYPE_LABELS[inspectedMarker.damageType].label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SEVERITY_LABELS[inspectedMarker.severity].badge}`}>
                  {SEVERITY_LABELS[inspectedMarker.severity].label}
                </span>
                {inspectedMarker.partName && (
                  <span className="text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded">
                    قطعه: {inspectedMarker.partName}
                  </span>
                )}
              </div>
              {inspectedMarker.description && (
                <p className="text-slate-300 text-[11.5px] leading-relaxed">
                  {inspectedMarker.description}
                </p>
              )}
              <div className="text-[10px] text-slate-500 font-mono">
                ثبت در ساعت: {toFaDigits(inspectedMarker.timestamp)} • موقعیت: {toFaDigits(inspectedMarker.x)}% افقی، {toFaDigits(inspectedMarker.y)}% عمودی
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDeleteDamage(inspectedMarker.id)}
                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                  title="حذف این آسیب"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectedMarker(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal / Dialog to Add Damage at Clicked Point */}
      {pendingPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f192e] border border-[#22365e] rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                ثبت آسیب جدید در{' '}
                {pendingPoint.view === 'FRONT'
                  ? 'نمای جلو'
                  : pendingPoint.view === 'REAR'
                  ? 'نمای عقب'
                  : pendingPoint.view === 'RIGHT'
                  ? 'سمت راست (شاگرد)'
                  : 'سمت چپ (راننده)'}
              </h4>
              <button
                type="button"
                onClick={() => setPendingPoint(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddDamage} className="space-y-3.5 text-xs">
              {/* Damage Type Selection */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">نوع عارضه یا آسیب:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(DAMAGE_TYPE_LABELS) as DamageType[]).map((key) => {
                    const cfg = DAMAGE_TYPE_LABELS[key];
                    const isSelected = selectedDamageType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDamageType(key)}
                        className={`p-2 rounded-xl text-right font-bold border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300 border-blue-500 shadow-sm'
                            : 'bg-[#0a101d] text-slate-300 border-[#1c2a44] hover:bg-[#121e33]'
                        }`}
                      >
                        <span>{cfg.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Selection */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">شدت آسیب:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SEVERITY_LABELS) as DamageSeverity[]).map((sev) => {
                    const isSelected = selectedSeverity === sev;
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSelectedSeverity(sev)}
                        className={`py-1.5 px-2 rounded-lg font-bold border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                            : 'bg-[#0a101d] text-slate-400 border-[#1c2a44] hover:text-white'
                        }`}
                      >
                        {SEVERITY_LABELS[sev].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Part Name */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">نام قطعه یا محل دقیق (اختیاری):</label>
                <input
                  type="text"
                  value={partNameInput}
                  onChange={(e) => setPartNameInput(e.target.value)}
                  placeholder="مثلاً: درب راننده، لبه پایینی سپر، گلگیر جلو..."
                  className="w-full bg-[#0a101d] border border-[#1f2f50] rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">توضیحات تکمیلی:</label>
                <textarea
                  rows={2}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="مثلاً: دارای خط و خش ۲۰ سانتی‌متری، فرورفتگی ناشی از برخورد قبلی..."
                  className="w-full bg-[#0a101d] border border-[#1f2f50] rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPendingPoint(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md cursor-pointer"
                >
                  ثبت نشان آسیب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recorded Damages Summary List */}
      {damages.length > 0 && (
        <div className="bg-[#0b1322] border border-[#1e2f52] rounded-xl p-3.5 space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>فهرست آسیب‌های علامت‌گذاری شده روی بدنه ({toFaDigits(damages.length)} مورد):</span>
            {!readOnly && onChangeDamages && (
              <button
                type="button"
                onClick={() => onChangeDamages([])}
                className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                پاک کردن همه نشان‌ها
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {damages.map((dmg, idx) => (
              <div
                key={dmg.id}
                onClick={() => {
                  setActiveViewTab(dmg.view);
                  setInspectedMarker(dmg);
                }}
                className="bg-[#0f192e] border border-[#1d2c47] hover:border-blue-500/50 p-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full ${DAMAGE_TYPE_LABELS[dmg.damageType].bg} text-white font-mono text-[10px] font-black flex items-center justify-center shrink-0`}>
                    {toFaDigits(idx + 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-200 truncate">
                      {dmg.partName || DAMAGE_TYPE_LABELS[dmg.damageType].label}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {dmg.view === 'FRONT'
                        ? 'جلو'
                        : dmg.view === 'REAR'
                        ? 'عقب'
                        : dmg.view === 'RIGHT'
                        ? 'راست'
                        : 'چپ'}{' '}
                      • {SEVERITY_LABELS[dmg.severity].label}
                    </div>
                  </div>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDamage(dmg.id);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
