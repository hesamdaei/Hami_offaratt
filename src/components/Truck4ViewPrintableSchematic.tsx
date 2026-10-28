import { FC } from 'react';
import { BodyDamageMarker, TruckBodyView } from '../types/vehicleHandover';
import { toFaDigits } from '../utils/jalaali';

interface Truck4ViewPrintableSchematicProps {
  damages?: BodyDamageMarker[];
  isBlankForm?: boolean;
}

export const Truck4ViewPrintableSchematic: FC<Truck4ViewPrintableSchematicProps> = ({
  damages = [],
  isBlankForm = false,
}) => {
  const getDamagesForView = (view: TruckBodyView) =>
    isBlankForm ? [] : damages.filter((d) => d.view === view);

  return (
    <div className="w-full border-2 border-slate-900 rounded-lg p-2 bg-white text-slate-950 font-sans print:border-black">
      {/* Schematic Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-400 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-950 text-[11px] tracking-tight">
            شماتیک ۴ وجه بدنه کامیونت ایسوزو (ISUZU NPR / ELF) — ثبت و کنترل وضعیت آسیب‌ها
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded border border-slate-400 bg-slate-100 font-bold text-slate-800">
            جلو • عقب • راست (شاگرد) • چپ (راننده)
          </span>
        </div>

        <div className="text-[9.5px] text-slate-700 font-medium">
          {isBlankForm ? (
            <span className="font-bold text-slate-950">
              راهنمای علامت‌گذاری دستی: <span className="font-mono">×</span> خط و خش | <span className="font-mono">○</span> قِری | <span className="font-mono">▲</span> شکستگی | <span className="font-mono">■</span> رنگ‌پریدگی
            </span>
          ) : (
            <span>
              تعداد موارد خسارت ثبت‌شده:{' '}
              <strong className="font-mono font-black text-slate-950">{toFaDigits(damages.length)}</strong> مورد
            </span>
          )}
        </div>
      </div>

      {/* 4 Isuzu Views Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* ================= 1. FRONT VIEW (ISUZU NPR CABIN) ================= */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-300 pb-0.5 mb-1 bg-slate-100 text-slate-900">
            ۱. نمای جلو (کامیونت ایسوزو - کابین و جلوپنجره)
          </div>
          <div className="relative w-full h-[96px] flex items-center justify-center">
            <svg viewBox="0 0 400 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Top Cargo Container (Background Box) */}
              <rect x="52" y="15" width="296" height="85" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
              {[90, 130, 170, 230, 270, 310].map((x) => (
                <line key={x} x1={x} y1="15" x2={x} y2="100" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              <text x="200" y="45" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="bold">کانتینر بار ترابری حامی</text>

              {/* Roof Wind Deflector (Aerodynamic Isuzu Spoiler) */}
              <path
                d="M 80 95 Q 120 55 200 55 Q 280 55 320 95 Z"
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <line x1="140" y1="70" x2="155" y2="95" stroke="#94a3b8" strokeWidth="1" />
              <line x1="200" y1="60" x2="200" y2="95" stroke="#94a3b8" strokeWidth="1" />
              <line x1="260" y1="70" x2="245" y2="95" stroke="#94a3b8" strokeWidth="1" />

              {/* Main Isuzu Cabover Cabin Frame */}
              <path
                d="M 68 100 Q 75 92 100 92 L 300 92 Q 325 92 332 100 L 338 238 Q 338 248 322 248 L 78 248 Q 62 248 62 238 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />

              {/* Cab Corner Air Deflector Vanes (لوپی‌های گوشه ایسوزو) */}
              <path d="M 62 165 Q 58 190 62 220" fill="none" stroke="#0f172a" strokeWidth="2" />
              <path d="M 338 165 Q 342 190 338 220" fill="none" stroke="#0f172a" strokeWidth="2" />

              {/* Windshield */}
              <path
                d="M 86 102 L 314 102 L 322 158 Q 322 162 316 162 L 84 162 Q 78 162 78 158 Z"
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Dual Wipers */}
              <line x1="135" y1="162" x2="180" y2="128" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
              <line x1="225" y1="162" x2="270" y2="128" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
              <text x="200" y="135" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">شیشه جلو ایسوزو</text>

              {/* Roof Clearance Marker Lights */}
              <rect x="135" y="86" width="12" height="4" rx="1.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="0.8" />
              <rect x="194" y="86" width="12" height="4" rx="1.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="0.8" />
              <rect x="253" y="86" width="12" height="4" rx="1.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="0.8" />

              {/* Center Panel & Isuzu Double Horizontal Grille */}
              <rect x="105" y="172" width="190" height="62" rx="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
              
              {/* Isuzu Chrome Logo Bar */}
              <rect x="140" y="177" width="120" height="16" rx="2" fill="#0f172a" />
              <text x="200" y="189" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="3">ISUZU</text>

              {/* Twin Air Grille Slots */}
              <rect x="115" y="198" width="170" height="14" rx="2" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.2" />
              <line x1="115" y1="205" x2="285" y2="205" stroke="#0f172a" strokeWidth="1" />
              <rect x="120" y="216" width="160" height="13" rx="2" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.2" />
              <line x1="120" y1="222" x2="280" y2="222" stroke="#0f172a" strokeWidth="1" />

              {/* Signature Isuzu Vertical Stacked Headlight Units */}
              {/* Right Headlight (شاگرد) */}
              <g>
                <rect x="68" y="174" width="32" height="60" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                {/* Upper Turn Indicator (Amber) */}
                <rect x="71" y="176" width="26" height="18" rx="1.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
                {/* Main Headlight Reflector */}
                <circle cx="84" cy="210" r="11" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx="84" cy="210" r="4" fill="#0f172a" />
              </g>

              {/* Left Headlight (راننده) */}
              <g>
                <rect x="300" y="174" width="32" height="60" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                {/* Upper Turn Indicator (Amber) */}
                <rect x="303" y="176" width="26" height="18" rx="1.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
                {/* Main Headlight Reflector */}
                <circle cx="316" cy="210" r="11" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx="316" cy="210" r="4" fill="#0f172a" />
              </g>

              {/* Extended Side Mirrors on Tubular Arms */}
              {/* Right Mirror */}
              <line x1="72" y1="120" x2="35" y2="105" stroke="#0f172a" strokeWidth="2" />
              <line x1="72" y1="150" x2="35" y2="155" stroke="#0f172a" strokeWidth="2" />
              <rect x="25" y="98" width="16" height="62" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

              {/* Left Mirror */}
              <line x1="328" y1="120" x2="365" y2="105" stroke="#0f172a" strokeWidth="2" />
              <line x1="328" y1="150" x2="365" y2="155" stroke="#0f172a" strokeWidth="2" />
              <rect x="359" y="98" width="16" height="62" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

              {/* Front Heavy Bumper */}
              <rect x="52" y="244" width="296" height="34" rx="4" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
              {/* Lower Fog Lamps */}
              <rect x="65" y="252" width="26" height="16" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
              <rect x="309" y="252" width="26" height="16" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
              {/* Center License Plate Bracket */}
              <rect x="145" y="250" width="110" height="22" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="200" y="265" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">پلاک جلو</text>

              {/* Front Wheels (Below Cab) */}
              <rect x="58" y="278" width="36" height="34" rx="4" fill="#0f172a" />
              <rect x="306" y="278" width="36" height="34" rx="4" fill="#0f172a" />
            </svg>

            {/* Damage Overlay Markers */}
            {getDamagesForView('FRONT').map((d, i) => (
              <span
                key={d.id}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-black flex items-center justify-center border border-white shadow-xs"
              >
                {toFaDigits(i + 1)}
              </span>
            ))}
          </div>
        </div>

        {/* ================= 2. REAR VIEW (CONTAINER & DOORS) ================= */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-300 pb-0.5 mb-1 bg-slate-100 text-slate-900">
            ۲. نمای عقب (درب‌های کانتینر، لولاها و چراغ‌ها)
          </div>
          <div className="relative w-full h-[96px] flex items-center justify-center">
            <svg viewBox="0 0 400 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Container Perimeter Box */}
              <rect x="48" y="20" width="304" height="225" rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
              
              {/* Double Doors Center Split */}
              <line x1="200" y1="20" x2="200" y2="245" stroke="#0f172a" strokeWidth="2.5" />

              {/* Right Door Panel */}
              <rect x="58" y="30" width="134" height="205" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              {/* Left Door Panel */}
              <rect x="208" y="30" width="134" height="205" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />

              <text x="125" y="70" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="bold">درب راست</text>
              <text x="275" y="70" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="bold">درب چپ</text>

              {/* Top Marker Clearance Lights */}
              <rect x="65" y="24" width="16" height="5" rx="1" fill="#ef4444" stroke="#0f172a" strokeWidth="0.8" />
              <rect x="192" y="24" width="16" height="5" rx="1" fill="#ef4444" stroke="#0f172a" strokeWidth="0.8" />
              <rect x="319" y="24" width="16" height="5" rx="1" fill="#ef4444" stroke="#0f172a" strokeWidth="0.8" />

              {/* Vertical Locking Rods (میله‌های قفل عمودی کانتینر) */}
              {/* Rod 1 & 2 */}
              <line x1="168" y1="35" x2="168" y2="230" stroke="#0f172a" strokeWidth="2.5" />
              <rect x="158" y="130" width="20" height="12" rx="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />

              <line x1="232" y1="35" x2="232" y2="230" stroke="#0f172a" strokeWidth="2.5" />
              <rect x="222" y="130" width="20" height="12" rx="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />

              {/* Heavy Duty Hinges */}
              {[50, 105, 160, 215].map((y) => (
                <g key={y}>
                  <rect x="44" y={y} width="14" height="12" rx="2" fill="#0f172a" />
                  <rect x="342" y={y} width="14" height="12" rx="2" fill="#0f172a" />
                </g>
              ))}

              {/* Rear Chassis Underrun Protection Bar (سپر عقب) */}
              <rect x="42" y="248" width="316" height="26" rx="3" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
              {/* Warning Chevron Stripes */}
              <path d="M 45 274 L 60 248 M 65 274 L 80 248 M 85 274 L 100 248 M 300 274 L 315 248 M 320 274 L 335 248 M 340 274 L 355 248" stroke="#f59e0b" strokeWidth="3" />

              {/* Rear Horizontal Isuzu Taillights */}
              {/* Right Taillight */}
              <g>
                <rect x="52" y="252" width="60" height="18" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="54" y="254" width="18" height="14" fill="#fbbf24" />
                <rect x="73" y="254" width="20" height="14" fill="#ef4444" />
                <rect x="94" y="254" width="16" height="14" fill="#f8fafc" />
              </g>

              {/* Left Taillight */}
              <g>
                <rect x="288" y="252" width="60" height="18" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="290" y="254" width="16" height="14" fill="#f8fafc" />
                <rect x="307" y="254" width="20" height="14" fill="#ef4444" />
                <rect x="328" y="254" width="18" height="14" fill="#fbbf24" />
              </g>

              {/* Rear License Plate Slot */}
              <rect x="155" y="251" width="90" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="200" y="265" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">پلاک عقب</text>

              {/* Mudflaps with ISUZU Logo */}
              <rect x="46" y="274" width="46" height="34" rx="2" fill="#0f172a" />
              <text x="69" y="295" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">ISUZU</text>

              <rect x="308" y="274" width="46" height="34" rx="2" fill="#0f172a" />
              <text x="331" y="295" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">ISUZU</text>

              {/* Spare Wheel Underneath */}
              <circle cx="200" cy="285" r="15" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
              <circle cx="200" cy="285" r="6" fill="#0f172a" />
            </svg>

            {/* Damage Overlay Markers */}
            {getDamagesForView('REAR').map((d, i) => (
              <span
                key={d.id}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-black flex items-center justify-center border border-white shadow-xs"
              >
                {toFaDigits(i + 1)}
              </span>
            ))}
          </div>
        </div>

        {/* ================= 3. RIGHT SIDE VIEW (ISUZU NPR PASSENGER) ================= */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-300 pb-0.5 mb-1 bg-slate-100 text-slate-900">
            ۳. نمای سمت راست (شاگرد - ایسوزو ۶ تن)
          </div>
          <div className="relative w-full h-[96px] flex items-center justify-center">
            <svg viewBox="0 0 540 280" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Cargo Box (Container) */}
              <rect x="35" y="25" width="310" height="162" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
              {[85, 135, 185, 235, 285].map((x) => (
                <line key={x} x1={x} y1="25" x2={x} y2="187" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              <text x="190" y="105" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="bold">کانتینر شاگرد (ایسوزو)</text>

              {/* Isuzu Roof Spoiler / Wind Deflector */}
              <path
                d="M 345 25 L 425 45 Q 460 70 475 90 L 345 90 Z"
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Isuzu Cabover Cabin Profile (Flat Upright Nose) */}
              <path
                d="M 345 90 L 450 90 Q 482 92 495 130 L 512 178 L 512 210 L 485 210 L 475 220 L 345 220 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />

              {/* Isuzu Passenger Door with Characteristic Angled Lower Window Cut */}
              <path
                d="M 355 98 L 442 98 Q 470 100 482 135 L 495 198 L 355 198 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1.8"
              />
              {/* Distinctive Isuzu Sloped Window Sill */}
              <path
                d="M 365 106 L 436 106 Q 460 108 470 135 L 445 148 L 365 148 Z"
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              {/* Door Handle */}
              <rect x="370" y="160" width="18" height="6" rx="1.5" fill="#0f172a" />
              {/* Side Turn Indicator */}
              <rect x="495" y="170" width="8" height="12" rx="2" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
              {/* Cab Entry Step */}
              <rect x="475" y="215" width="28" height="10" rx="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />

              {/* Passenger Side Extended Mirror */}
              <rect x="480" y="105" width="12" height="38" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <line x1="480" y1="120" x2="455" y2="120" stroke="#0f172a" strokeWidth="2" />

              {/* Front Wheel (Directly Below Cab) */}
              <circle cx="468" cy="225" r="32" fill="#0f172a" />
              <circle cx="468" cy="225" r="14" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="468" cy="225" r="5" fill="#0f172a" />

              {/* Rear Dual Wheels */}
              <circle cx="155" cy="225" r="34" fill="#0f172a" />
              <circle cx="155" cy="225" r="15" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="155" cy="225" r="5" fill="#0f172a" />

              {/* Chassis Rail */}
              <rect x="25" y="187" width="485" height="8" fill="#0f172a" />

              {/* Isuzu Cylindrical Diesel Fuel Tank with Mounting Straps */}
              <rect x="230" y="195" width="85" height="28" rx="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
              <line x1="248" y1="195" x2="248" y2="223" stroke="#0f172a" strokeWidth="2" />
              <line x1="295" y1="195" x2="295" y2="223" stroke="#0f172a" strokeWidth="2" />
              <circle cx="238" cy="205" r="4" fill="#0f172a" />
              <text x="272" y="212" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">باک گازوئیل</text>

              {/* Side Underrun Cyclist Guard Rails (گاردهای جانبی) */}
              <rect x="215" y="222" width="115" height="4" fill="#64748b" />
              <rect x="215" y="229" width="115" height="4" fill="#64748b" />
            </svg>

            {/* Damage Overlay Markers */}
            {getDamagesForView('RIGHT').map((d, i) => (
              <span
                key={d.id}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-black flex items-center justify-center border border-white shadow-xs"
              >
                {toFaDigits(i + 1)}
              </span>
            ))}
          </div>
        </div>

        {/* ================= 4. LEFT SIDE VIEW (ISUZU NPR DRIVER) ================= */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-300 pb-0.5 mb-1 bg-slate-100 text-slate-900">
            ۴. نمای سمت چپ (راننده - ایسوزو ۶ تن)
          </div>
          <div className="relative w-full h-[96px] flex items-center justify-center">
            <svg viewBox="0 0 540 280" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Cargo Box (Container) */}
              <rect x="195" y="25" width="310" height="162" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
              {[245, 295, 345, 395, 445].map((x) => (
                <line key={x} x1={x} y1="25" x2={x} y2="187" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              {/* Side Loading Door (درب جانبی کانتینر) */}
              <rect x="310" y="35" width="60" height="145" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="360" y1="40" x2="360" y2="175" stroke="#0f172a" strokeWidth="2" />
              <text x="340" y="105" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="bold">کانتینر راننده</text>

              {/* Isuzu Roof Spoiler / Wind Deflector */}
              <path
                d="M 195 25 L 115 45 Q 80 70 65 90 L 195 90 Z"
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Isuzu Cabover Cabin Profile (Flat Upright Nose) */}
              <path
                d="M 195 90 L 90 90 Q 58 92 45 130 L 28 178 L 28 210 L 55 210 L 65 220 L 195 220 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />

              {/* Isuzu Driver Door with Angled Lower Window Cut */}
              <path
                d="M 185 98 L 98 98 Q 70 100 58 135 L 45 198 L 185 198 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1.8"
              />
              {/* Distinctive Isuzu Sloped Window Sill */}
              <path
                d="M 175 106 L 104 106 Q 80 108 70 135 L 95 148 L 175 148 Z"
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              {/* Door Handle */}
              <rect x="152" y="160" width="18" height="6" rx="1.5" fill="#0f172a" />
              {/* Side Turn Indicator */}
              <rect x="37" y="170" width="8" height="12" rx="2" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
              {/* Cab Entry Step */}
              <rect x="37" y="215" width="28" height="10" rx="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />

              {/* Driver Side Mirror */}
              <rect x="48" y="105" width="12" height="38" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <line x1="60" y1="120" x2="85" y2="120" stroke="#0f172a" strokeWidth="2" />

              {/* Front Wheel (Below Cab) */}
              <circle cx="72" cy="225" r="32" fill="#0f172a" />
              <circle cx="72" cy="225" r="14" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="72" cy="225" r="5" fill="#0f172a" />

              {/* Rear Dual Wheels */}
              <circle cx="385" cy="225" r="34" fill="#0f172a" />
              <circle cx="385" cy="225" r="15" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="385" cy="225" r="5" fill="#0f172a" />

              {/* Chassis Rail */}
              <rect x="30" y="187" width="485" height="8" fill="#0f172a" />

              {/* Isuzu Steel Toolbox & Battery Compartment */}
              <rect x="225" y="195" width="80" height="28" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
              <rect x="255" y="202" width="20" height="8" rx="1" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1" />
              <text x="265" y="217" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">جعبه ابزار فلزی</text>

              {/* Side Underrun Cyclist Guard Rails */}
              <rect x="210" y="222" width="115" height="4" fill="#64748b" />
              <rect x="210" y="229" width="115" height="4" fill="#64748b" />
            </svg>

            {/* Damage Overlay Markers */}
            {getDamagesForView('LEFT').map((d, i) => (
              <span
                key={d.id}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-black flex items-center justify-center border border-white shadow-xs"
              >
                {toFaDigits(i + 1)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recorded Damages List (If not blank and damages exist) */}
      {!isBlankForm && damages.length > 0 && (
        <div className="mt-1.5 pt-1 border-t border-slate-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8.5px]">
            {damages.map((dmg, idx) => {
              const viewName =
                dmg.view === 'FRONT'
                  ? 'وجه جلو'
                  : dmg.view === 'REAR'
                  ? 'وجه عقب'
                  : dmg.view === 'RIGHT'
                  ? 'وجه راست (شاگرد)'
                  : 'وجه چپ (راننده)';

              return (
                <div
                  key={dmg.id || idx}
                  className="bg-slate-50 border border-slate-300 px-1.5 py-0.5 rounded flex items-center justify-between"
                >
                  <span className="font-bold text-slate-900 truncate">
                    {toFaDigits(idx + 1)}. {viewName}: {dmg.partName || 'بدنه'}
                  </span>
                  <span className="text-red-700 font-bold shrink-0 text-[8px]">
                    {dmg.damageType === 'SCRATCH'
                      ? 'خط و خش'
                      : dmg.damageType === 'DENT'
                      ? 'قِری'
                      : dmg.damageType === 'CRACK'
                      ? 'شکستگی'
                      : 'خسارت'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
