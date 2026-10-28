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
    <div className="w-full border border-slate-900 rounded-lg p-2 bg-white text-slate-900">
      {/* Schematic Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-300 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-950 text-[11px]">
            شماتیک ۴ وجه بدنه کامیونت (جهت نشانه‌گذاری و ثبت خط و خش و آسیب‌ها)
          </span>
          <span className="text-[9.5px] px-2 py-0.2 rounded border border-slate-400 bg-slate-100 font-bold">
            جلو • عقب • راست (شاگرد) • چپ (راننده)
          </span>
        </div>

        <div className="text-[9.5px] text-slate-700 font-medium">
          {isBlankForm ? (
            <span className="font-bold text-slate-900">
              راهنمای علامت‌گذاری دستی: <span className="font-mono">×</span> خط و خش | <span className="font-mono">○</span> قِری | <span className="font-mono">▲</span> شکستگی | <span className="font-mono">■</span> رنگ‌پریدگی
            </span>
          ) : (
            <span>
              تعداد موارد خسارت ثبت‌شده:{' '}
              <strong className="font-mono text-slate-950">{toFaDigits(damages.length)}</strong> مورد
            </span>
          )}
        </div>
      </div>

      {/* 4 Views Grid (2x2 or 4x1 depending on layout, optimized for A4 print) */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* 1. FRONT VIEW */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-200 pb-0.5 mb-1 bg-slate-100">
            ۱. نمای جلو (کابین و شیشه روبرو)
          </div>
          <div className="relative w-full h-[88px] flex items-center justify-center">
            <svg viewBox="0 0 400 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Container Box */}
              <rect x="50" y="20" width="300" height="90" rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
              <line x1="120" y1="20" x2="120" y2="110" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="200" y1="20" x2="200" y2="110" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="280" y1="20" x2="280" y2="110" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <text x="200" y="60" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="bold">اتاق بار</text>

              {/* Cabin */}
              <path
                d="M 70 100 Q 75 80 100 80 L 300 80 Q 325 80 330 100 L 340 230 Q 340 250 320 250 L 80 250 Q 60 250 60 230 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />

              {/* Windshield */}
              <polygon points="95,95 305,95 315,160 85,160" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
              <line x1="140" y1="160" x2="175" y2="125" stroke="#0f172a" strokeWidth="2" />
              <line x1="225" y1="160" x2="260" y2="125" stroke="#0f172a" strokeWidth="2" />
              <text x="200" y="135" textAnchor="middle" fill="#64748b" fontSize="11">شیشه جلو</text>

              {/* Hood */}
              <rect x="90" y="165" width="220" height="35" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="200" y="187" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">کاپوت و سینی</text>

              {/* Grille */}
              <rect x="120" y="203" width="160" height="28" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="120" y1="210" x2="280" y2="210" stroke="#64748b" strokeWidth="1" />
              <line x1="120" y1="217" x2="280" y2="217" stroke="#64748b" strokeWidth="1" />
              <line x1="120" y1="224" x2="280" y2="224" stroke="#64748b" strokeWidth="1" />
              <circle cx="200" cy="217" r="6" fill="#0f172a" />

              {/* Headlights */}
              <rect x="75" y="195" width="38" height="24" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <text x="94" y="211" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">شاگرد</text>

              <rect x="287" y="195" width="38" height="24" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <text x="306" y="211" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">راننده</text>

              {/* Mirrors */}
              <rect x="35" y="100" width="16" height="50" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="349" y="100" width="16" height="50" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />

              {/* Bumper */}
              <rect x="50" y="240" width="300" height="32" rx="4" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
              <rect x="155" y="246" width="90" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="200" y="260" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">پلاک جلو</text>

              {/* Wheels */}
              <rect x="58" y="272" width="34" height="38" rx="4" fill="#0f172a" />
              <rect x="308" y="272" width="34" height="38" rx="4" fill="#0f172a" />
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

        {/* 2. REAR VIEW */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-200 pb-0.5 mb-1 bg-slate-100">
            ۲. نمای عقب (درب‌های کانتینر و چراغ‌ها)
          </div>
          <div className="relative w-full h-[88px] flex items-center justify-center">
            <svg viewBox="0 0 400 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Container Body */}
              <rect x="50" y="25" width="300" height="215" rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
              <line x1="200" y1="25" x2="200" y2="240" stroke="#0f172a" strokeWidth="2.5" />

              {/* Left & Right Door panels */}
              <rect x="60" y="35" width="130" height="195" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="210" y="35" width="130" height="195" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="125" y="80" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="bold">درب راست</text>
              <text x="275" y="80" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="bold">درب چپ</text>

              {/* Locking Rods */}
              <line x1="165" y1="40" x2="165" y2="225" stroke="#0f172a" strokeWidth="2.5" />
              <rect x="155" y="130" width="20" height="10" fill="#cbd5e1" stroke="#0f172a" />

              <line x1="235" y1="40" x2="235" y2="225" stroke="#0f172a" strokeWidth="2.5" />
              <rect x="225" y="130" width="20" height="10" fill="#cbd5e1" stroke="#0f172a" />

              {/* Hinges */}
              <rect x="46" y="50" width="10" height="14" fill="#0f172a" />
              <rect x="46" y="130" width="10" height="14" fill="#0f172a" />
              <rect x="46" y="200" width="10" height="14" fill="#0f172a" />
              <rect x="344" y="50" width="10" height="14" fill="#0f172a" />
              <rect x="344" y="130" width="10" height="14" fill="#0f172a" />
              <rect x="344" y="200" width="10" height="14" fill="#0f172a" />

              {/* Rear Bumper & Lights */}
              <rect x="40" y="240" width="320" height="28" rx="3" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
              <rect x="52" y="245" width="55" height="16" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="80" y="257" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">خطر راست</text>

              <rect x="293" y="245" width="55" height="16" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="320" y="257" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">خطر چپ</text>

              {/* License Plate Slot */}
              <rect x="160" y="245" width="80" height="18" rx="2" fill="#ffffff" stroke="#0f172a" />
              <text x="200" y="257" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">پلاک عقب</text>

              {/* Wheels */}
              <rect x="44" y="268" width="18" height="38" rx="2" fill="#0f172a" />
              <rect x="338" y="268" width="18" height="38" rx="2" fill="#0f172a" />
              <circle cx="200" cy="275" r="14" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <text x="200" y="278" textAnchor="middle" fill="#0f172a" fontSize="8">زاپاس</text>
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

        {/* 3. RIGHT SIDE VIEW */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-200 pb-0.5 mb-1 bg-slate-100">
            ۳. نمای سمت راست (شاگرد)
          </div>
          <div className="relative w-full h-[88px] flex items-center justify-center">
            <svg viewBox="0 0 540 280" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Container Side */}
              <rect x="40" y="30" width="310" height="155" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
              {[90, 140, 190, 240, 290].map((x) => (
                <line key={x} x1={x} y1="30" x2={x} y2="185" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              <text x="195" y="110" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="bold">بدنه کانتین شاگرد</text>

              {/* Cabin Profile */}
              <path
                d="M 350 75 L 420 75 Q 465 75 480 120 L 500 170 L 500 205 L 350 205 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Door & Window */}
              <path d="M 360 85 L 415 85 Q 450 85 465 125 L 475 200 L 360 200 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <path d="M 370 95 L 410 95 Q 440 95 452 130 L 370 130 Z" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="375" y="145" width="16" height="5" fill="#0f172a" />
              <rect x="455" y="100" width="10" height="28" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />

              {/* Wheels */}
              <circle cx="462" cy="220" r="30" fill="#0f172a" />
              <circle cx="462" cy="220" r="12" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

              <circle cx="160" cy="220" r="32" fill="#0f172a" />
              <circle cx="160" cy="220" r="13" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

              {/* Tool box */}
              <rect x="230" y="190" width="75" height="26" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <text x="267" y="206" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">جعبه ابزار</text>

              {/* Chassis */}
              <rect x="30" y="185" width="470" height="7" fill="#0f172a" />
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

        {/* 4. LEFT SIDE VIEW */}
        <div className="border border-slate-400 rounded p-1 bg-white flex flex-col items-center">
          <div className="w-full text-center text-[9px] font-black border-b border-slate-200 pb-0.5 mb-1 bg-slate-100">
            ۴. نمای سمت چپ (راننده)
          </div>
          <div className="relative w-full h-[88px] flex items-center justify-center">
            <svg viewBox="0 0 540 280" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Container Side */}
              <rect x="190" y="30" width="310" height="155" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
              {[240, 290, 340, 390, 440].map((x) => (
                <line key={x} x1={x} y1="30" x2={x} y2="185" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              <text x="345" y="110" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="bold">بدنه کانتین راننده</text>

              {/* Cabin Profile */}
              <path
                d="M 190 75 L 120 75 Q 75 75 60 120 L 40 170 L 40 205 L 190 205 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Door & Window */}
              <path d="M 180 85 L 125 85 Q 90 85 75 125 L 65 200 L 180 200 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <path d="M 170 95 L 130 95 Q 100 95 88 130 L 170 130 Z" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.5" />
              <rect x="145" y="145" width="16" height="5" fill="#0f172a" />
              <rect x="73" y="100" width="10" height="28" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />

              {/* Wheels */}
              <circle cx="78" cy="220" r="30" fill="#0f172a" />
              <circle cx="78" cy="220" r="12" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

              <circle cx="380" cy="220" r="32" fill="#0f172a" />
              <circle cx="380" cy="220" r="13" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

              {/* Fuel Tank */}
              <rect x="235" y="190" width="80" height="26" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="250" cy="203" r="6" fill="#0f172a" />
              <text x="282" y="206" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">باک گازوئیل</text>

              {/* Chassis */}
              <rect x="40" y="185" width="470" height="7" fill="#0f172a" />
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
