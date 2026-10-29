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

  // SVG Renderers for the 4 faces of an Isuzu NPR / ELF freight truck (کامیونت ایسوزو ۶ تن)
  const renderTruckFrontSvg = () => (
    <svg viewBox="0 0 400 320" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cabinFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a3f68" />
          <stop offset="100%" stopColor="#141f36" />
        </linearGradient>
        <linearGradient id="glassFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="containerFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Top Container Body (اتاق بار کانتینری بالا) */}
      <rect x="52" y="15" width="296" height="85" rx="6" fill="url(#containerFrontGrad)" stroke="#64748b" strokeWidth="2" />
      {[90, 130, 170, 230, 270, 310].map((x) => (
        <line key={x} x1={x} y1="15" x2={x} y2="100" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      <text x="200" y="45" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">کانتینر بار صداقت بار پیشرو</text>

      {/* Isuzu Roof Wind Deflector / Aerodynamic Spoiler */}
      <path
        d="M 80 95 Q 120 55 200 55 Q 280 55 320 95 Z"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="2"
      />
      <line x1="140" y1="70" x2="155" y2="95" stroke="#334155" strokeWidth="1.5" />
      <line x1="200" y1="60" x2="200" y2="95" stroke="#334155" strokeWidth="1.5" />
      <line x1="260" y1="70" x2="245" y2="95" stroke="#334155" strokeWidth="1.5" />

      {/* Main Isuzu Cabover Cabin Frame */}
      <path
        d="M 68 100 Q 75 92 100 92 L 300 92 Q 325 92 332 100 L 338 238 Q 338 248 322 248 L 78 248 Q 62 248 62 238 Z"
        fill="url(#cabinFrontGrad)"
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Corner Air Deflectors (لوپی‌های بادگیر گوشه ایسوزو) */}
      <path d="M 62 165 Q 56 190 62 220" fill="none" stroke="#64748b" strokeWidth="2.5" />
      <path d="M 338 165 Q 344 190 338 220" fill="none" stroke="#64748b" strokeWidth="2.5" />

      {/* Windshield */}
      <path
        d="M 86 102 L 314 102 L 322 158 Q 322 162 316 162 L 84 162 Q 78 162 78 158 Z"
        fill="url(#glassFrontGrad)"
        stroke="#38bdf8"
        strokeWidth="2"
      />
      {/* Dual Wipers */}
      <line x1="135" y1="162" x2="180" y2="128" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="225" y1="162" x2="270" y2="128" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <text x="200" y="135" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold">شیشه جلو ایسوزو</text>

      {/* Roof Clearance Marker Lights */}
      <rect x="135" y="86" width="14" height="5" rx="1.5" fill="#f59e0b" stroke="#78350f" />
      <rect x="193" y="86" width="14" height="5" rx="1.5" fill="#f59e0b" stroke="#78350f" />
      <rect x="251" y="86" width="14" height="5" rx="1.5" fill="#f59e0b" stroke="#78350f" />

      {/* Center Panel & Isuzu Double Horizontal Grille */}
      <rect x="105" y="170" width="190" height="64" rx="4" fill="#0b1120" stroke="#334155" strokeWidth="1.8" />
      
      {/* Isuzu Chrome Logo Bar */}
      <rect x="135" y="175" width="130" height="18" rx="3" fill="#1e293b" stroke="#64748b" />
      <text x="200" y="188" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" letterSpacing="4">ISUZU</text>

      {/* Twin Air Grille Slots */}
      <rect x="115" y="198" width="170" height="14" rx="2" fill="#030712" stroke="#374151" strokeWidth="1.2" />
      <line x1="115" y1="205" x2="285" y2="205" stroke="#4b5563" strokeWidth="1.5" />
      <rect x="120" y="216" width="160" height="13" rx="2" fill="#030712" stroke="#374151" strokeWidth="1.2" />
      <line x1="120" y1="222" x2="280" y2="222" stroke="#4b5563" strokeWidth="1.5" />

      {/* Signature Isuzu Vertical Stacked Headlight Units */}
      {/* Right Headlight (شاگرد) */}
      <g>
        <rect x="68" y="174" width="32" height="60" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        {/* Upper Turn Indicator (Amber) */}
        <rect x="71" y="176" width="26" height="18" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
        {/* Main Headlight Reflector */}
        <circle cx="84" cy="210" r="11" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
        <circle cx="84" cy="210" r="4" fill="#713f12" />
      </g>

      {/* Left Headlight (راننده) */}
      <g>
        <rect x="300" y="174" width="32" height="60" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        {/* Upper Turn Indicator (Amber) */}
        <rect x="303" y="176" width="26" height="18" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
        {/* Main Headlight Reflector */}
        <circle cx="316" cy="210" r="11" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
        <circle cx="316" cy="210" r="4" fill="#713f12" />
      </g>

      {/* Extended Side Mirrors on Tubular Arms */}
      {/* Right Mirror */}
      <line x1="72" y1="120" x2="35" y2="105" stroke="#64748b" strokeWidth="2.5" />
      <line x1="72" y1="150" x2="35" y2="155" stroke="#64748b" strokeWidth="2.5" />
      <rect x="25" y="98" width="16" height="62" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />

      {/* Left Mirror */}
      <line x1="328" y1="120" x2="365" y2="105" stroke="#64748b" strokeWidth="2.5" />
      <line x1="328" y1="150" x2="365" y2="155" stroke="#64748b" strokeWidth="2.5" />
      <rect x="359" y="98" width="16" height="62" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />

      {/* Front Heavy Bumper */}
      <rect x="52" y="244" width="296" height="34" rx="5" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      {/* Lower Fog Lamps */}
      <rect x="65" y="252" width="26" height="16" rx="3" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.2" />
      <rect x="309" y="252" width="26" height="16" rx="3" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.2" />
      {/* Center License Plate Bracket */}
      <rect x="145" y="250" width="110" height="22" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
      <text x="200" y="265" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">پلاک جلو</text>

      {/* Front Wheels (Below Cab) */}
      <rect x="58" y="278" width="36" height="34" rx="4" fill="#090d16" stroke="#334155" strokeWidth="2" />
      <rect x="306" y="278" width="36" height="34" rx="4" fill="#090d16" stroke="#334155" strokeWidth="2" />
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

      {/* Main Container Outline */}
      <rect x="48" y="20" width="304" height="225" rx="6" fill="url(#rearContainerGrad)" stroke="#64748b" strokeWidth="2.5" />
      
      {/* Double Doors Center Split */}
      <line x1="200" y1="20" x2="200" y2="245" stroke="#0f172a" strokeWidth="3" />

      {/* Right Door Panel */}
      <rect x="58" y="30" width="134" height="205" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      {/* Left Door Panel */}
      <rect x="208" y="30" width="134" height="205" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      <text x="125" y="70" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="bold">درب راست</text>
      <text x="275" y="70" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="bold">درب چپ</text>

      {/* Top Marker Clearance Lights */}
      <rect x="65" y="24" width="16" height="6" rx="1.5" fill="#ef4444" stroke="#7f1d1d" />
      <rect x="192" y="24" width="16" height="6" rx="1.5" fill="#ef4444" stroke="#7f1d1d" />
      <rect x="319" y="24" width="16" height="6" rx="1.5" fill="#ef4444" stroke="#7f1d1d" />

      {/* Vertical Locking Rods (میله‌های قفل عمودی کانتینر) */}
      <line x1="168" y1="35" x2="168" y2="230" stroke="#cbd5e1" strokeWidth="3.5" />
      <rect x="158" y="130" width="22" height="14" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />

      <line x1="232" y1="35" x2="232" y2="230" stroke="#cbd5e1" strokeWidth="3.5" />
      <rect x="222" y="130" width="22" height="14" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />

      {/* Heavy Duty Hinges */}
      {[50, 105, 160, 215].map((y) => (
        <g key={y}>
          <rect x="44" y={y} width="14" height="14" rx="2" fill="#0f172a" stroke="#64748b" />
          <rect x="342" y={y} width="14" height="14" rx="2" fill="#0f172a" stroke="#64748b" />
        </g>
      ))}

      {/* Rear Underrun Protection Bumper */}
      <rect x="42" y="248" width="316" height="26" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      {/* Warning Chevron Stripes */}
      <path d="M 45 274 L 60 248 M 65 274 L 80 248 M 85 274 L 100 248 M 300 274 L 315 248 M 320 274 L 335 248 M 340 274 L 355 248" stroke="#f59e0b" strokeWidth="3" />

      {/* Rear Horizontal Isuzu Taillights */}
      {/* Right Taillight */}
      <g>
        <rect x="52" y="252" width="60" height="18" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <rect x="54" y="254" width="18" height="14" fill="#f59e0b" />
        <rect x="73" y="254" width="20" height="14" fill="#ef4444" />
        <rect x="94" y="254" width="16" height="14" fill="#f8fafc" />
      </g>

      {/* Left Taillight */}
      <g>
        <rect x="288" y="252" width="60" height="18" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <rect x="290" y="254" width="16" height="14" fill="#f8fafc" />
        <rect x="307" y="254" width="20" height="14" fill="#ef4444" />
        <rect x="328" y="254" width="18" height="14" fill="#f59e0b" />
      </g>

      {/* Rear License Plate Slot */}
      <rect x="155" y="251" width="90" height="20" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
      <text x="200" y="265" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">پلاک عقب</text>

      {/* Mudflaps with ISUZU Logo */}
      <rect x="46" y="274" width="46" height="34" rx="3" fill="#090d16" stroke="#334155" />
      <text x="69" y="295" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">ISUZU</text>

      <rect x="308" y="274" width="46" height="34" rx="3" fill="#090d16" stroke="#334155" />
      <text x="331" y="295" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">ISUZU</text>

      {/* Spare Wheel Underneath */}
      <circle cx="200" cy="285" r="16" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
      <circle cx="200" cy="285" r="7" fill="#334155" />
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

      {/* Cargo Box (Container) */}
      <rect x="35" y="25" width="310" height="162" rx="4" fill="url(#sideContainerGrad)" stroke="#64748b" strokeWidth="2.5" />
      {[85, 135, 185, 235, 285].map((x) => (
        <line key={x} x1={x} y1="25" x2={x} y2="187" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      <text x="190" y="105" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="bold">کانتینر شاگرد (ایسوزو)</text>

      {/* Isuzu Roof Spoiler / Wind Deflector */}
      <path
        d="M 345 25 L 425 45 Q 460 70 475 90 L 345 90 Z"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="2"
      />

      {/* Isuzu Cabover Cabin Profile (Flat Upright Nose) */}
      <path
        d="M 345 90 L 450 90 Q 482 92 495 130 L 512 178 L 512 210 L 485 210 L 475 220 L 345 220 Z"
        fill="#253556"
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Isuzu Passenger Door with Characteristic Angled Lower Window Cut */}
      <path
        d="M 355 98 L 442 98 Q 470 100 482 135 L 495 198 L 355 198 Z"
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.8"
      />
      {/* Distinctive Isuzu Sloped Window Sill */}
      <path
        d="M 365 106 L 436 106 Q 460 108 470 135 L 445 148 L 365 148 Z"
        fill="#38bdf8"
        fillOpacity="0.3"
        stroke="#38bdf8"
        strokeWidth="1.5"
      />
      {/* Door Handle */}
      <rect x="370" y="160" width="18" height="6" rx="2" fill="#94a3b8" />
      {/* Side Turn Indicator */}
      <rect x="495" y="170" width="8" height="12" rx="2" fill="#f59e0b" stroke="#78350f" />
      {/* Cab Entry Step */}
      <rect x="475" y="215" width="28" height="10" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />

      {/* Passenger Side Extended Mirror */}
      <rect x="480" y="105" width="12" height="38" rx="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
      <line x1="480" y1="120" x2="455" y2="120" stroke="#94a3b8" strokeWidth="2" />

      {/* Front Wheel (Directly Below Cab) */}
      <circle cx="468" cy="225" r="32" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="468" cy="225" r="14" fill="#334155" stroke="#64748b" />
      <circle cx="468" cy="225" r="5" fill="#f8fafc" />

      {/* Rear Dual Wheels */}
      <circle cx="155" cy="225" r="34" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="155" cy="225" r="15" fill="#334155" stroke="#64748b" />
      <circle cx="155" cy="225" r="5" fill="#f8fafc" />

      {/* Chassis Rail */}
      <rect x="25" y="187" width="485" height="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />

      {/* Isuzu Cylindrical Diesel Fuel Tank with Mounting Straps */}
      <rect x="230" y="195" width="85" height="28" rx="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.8" />
      <line x1="248" y1="195" x2="248" y2="223" stroke="#f59e0b" strokeWidth="2" />
      <line x1="295" y1="195" x2="295" y2="223" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="238" cy="205" r="4" fill="#f59e0b" />
      <text x="272" y="212" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold">باک گازوئیل</text>

      {/* Side Underrun Cyclist Guard Rails */}
      <rect x="215" y="222" width="115" height="4" fill="#64748b" />
      <rect x="215" y="229" width="115" height="4" fill="#64748b" />
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

      {/* Cargo Box (Container) */}
      <rect x="195" y="25" width="310" height="162" rx="4" fill="url(#sideLeftContainerGrad)" stroke="#64748b" strokeWidth="2.5" />
      {[245, 295, 345, 395, 445].map((x) => (
        <line key={x} x1={x} y1="25" x2={x} y2="187" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      {/* Side Loading Door (درب جانبی کانتینر) */}
      <rect x="310" y="35" width="60" height="145" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
      <line x1="360" y1="40" x2="360" y2="175" stroke="#94a3b8" strokeWidth="2" />
      <text x="340" y="105" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="bold">کانتینر راننده</text>

      {/* Isuzu Roof Spoiler / Wind Deflector */}
      <path
        d="M 195 25 L 115 45 Q 80 70 65 90 L 195 90 Z"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="2"
      />

      {/* Isuzu Cabover Cabin Profile (Flat Upright Nose) */}
      <path
        d="M 195 90 L 90 90 Q 58 92 45 130 L 28 178 L 28 210 L 55 210 L 65 220 L 195 220 Z"
        fill="#253556"
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Isuzu Driver Door with Angled Lower Window Cut */}
      <path
        d="M 185 98 L 98 98 Q 70 100 58 135 L 45 198 L 185 198 Z"
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.8"
      />
      {/* Distinctive Isuzu Sloped Window Sill */}
      <path
        d="M 175 106 L 104 106 Q 80 108 70 135 L 95 148 L 175 148 Z"
        fill="#38bdf8"
        fillOpacity="0.3"
        stroke="#38bdf8"
        strokeWidth="1.5"
      />
      {/* Door Handle */}
      <rect x="152" y="160" width="18" height="6" rx="2" fill="#94a3b8" />
      {/* Side Turn Indicator */}
      <rect x="37" y="170" width="8" height="12" rx="2" fill="#f59e0b" stroke="#78350f" />
      {/* Cab Entry Step */}
      <rect x="37" y="215" width="28" height="10" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />

      {/* Driver Side Mirror */}
      <rect x="48" y="105" width="12" height="38" rx="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
      <line x1="60" y1="120" x2="85" y2="120" stroke="#94a3b8" strokeWidth="2" />

      {/* Front Wheel (Below Cab) */}
      <circle cx="72" cy="225" r="32" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="72" cy="225" r="14" fill="#334155" stroke="#64748b" />
      <circle cx="72" cy="225" r="5" fill="#f8fafc" />

      {/* Rear Dual Wheels */}
      <circle cx="385" cy="225" r="34" fill="#090d16" stroke="#334155" strokeWidth="2.5" />
      <circle cx="385" cy="225" r="15" fill="#334155" stroke="#64748b" />
      <circle cx="385" cy="225" r="5" fill="#f8fafc" />

      {/* Chassis Rail */}
      <rect x="30" y="187" width="485" height="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />

      {/* Isuzu Steel Toolbox & Battery Compartment */}
      <rect x="225" y="195" width="80" height="28" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1.8" />
      <rect x="255" y="202" width="20" height="8" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
      <text x="265" y="217" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold">جعبه ابزار فلزی</text>

      {/* Side Underrun Cyclist Guard Rails */}
      <rect x="210" y="222" width="115" height="4" fill="#64748b" />
      <rect x="210" y="229" width="115" height="4" fill="#64748b" />
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
