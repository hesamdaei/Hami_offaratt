import { FC } from 'react';
import { toFaDigits, normalizePersianDigits } from '../utils/jalaali';

export interface ParsedPlate {
  twoDigits: string;
  letter: string;
  threeDigits: string;
  provinceCode: string;
  isCommercial: boolean;
  plateType: 'commercial' | 'private' | 'government' | 'police' | 'taxi' | 'disabled';
}

export interface PlateLetterInfo {
  char: string;
  type: string;
  description: string;
}

export const IRANIAN_PLATE_LETTERS: PlateLetterInfo[] = [
  { char: 'ع', type: 'عمومی و باری', description: 'کامیون، خاور، وانت، ناوگان حمل و نقل عمومی (زرد)' },
  { char: 'ک', type: 'کشاورزی و صنعتی', description: 'ماشین‌آلات کشاورزی، تراکتور و ادوات (زرد)' },
  { char: 'ت', type: 'تاکسی', description: 'تاکسی‌های شهری و بین‌شهری (زرد)' },
  { char: 'الف', type: 'دولتی', description: 'خودروهای دولتی و اداری (قرمز)' },
  { char: 'پ', type: 'پلیس', description: 'خودروهای نیروی انتظامی و پلیس راهور (سبز)' },
  { char: 'ث', type: 'سپاه', description: 'خودروهای سازمان‌های نظامی و سپاه (سبز)' },
  { char: 'ب', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ج', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'د', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'س', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ص', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ط', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ق', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ل', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'م', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ن', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'و', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ه', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: 'ی', type: 'شخصی', description: 'پلاک شخصی سواری (سفید)' },
  { char: '♿', type: 'معلولین', description: 'ویژه جانبازان و معلولین گرامی (سفید)' },
];

/**
 * Intelligent Iranian Plate Parser
 * Parses formats like:
 * - "۶۶-۵۳۳ع۲۵" -> twoDigits: "۲۵", letter: "ع", threeDigits: "۵۳۳", provinceCode: "۶۶"
 * - "۲۵ع۵۳۳-۶۶" -> twoDigits: "۲۵", letter: "ع", threeDigits: "۵۳۳", provinceCode: "۶۶"
 * - "۲۵ ع ۵۳۳ ایران ۶۶" -> twoDigits: "۲۵", letter: "ع", threeDigits: "۵۳۳", provinceCode: "۶۶"
 * - "ایران ۶۶ - ۲۵ ع ۵۳۳" -> twoDigits: "۲۵", letter: "ع", threeDigits: "۵۳۳", provinceCode: "۶۶"
 * - "خودرو ۱ (۶۶-۵۳۳ع۲۵)" -> parses inner plate
 * Works uniformly with Persian, Arabic, and English digits!
 */
export function parseIranianPlate(raw?: string | null): ParsedPlate {
  const defaultPlate: ParsedPlate = {
    twoDigits: '۲۵',
    letter: 'ع',
    threeDigits: '۵۳۳',
    provinceCode: '۶۶',
    isCommercial: true,
    plateType: 'commercial',
  };

  if (!raw || typeof raw !== 'string') {
    return defaultPlate;
  }

  let text = raw.trim();

  // If text has parentheses with plate inside e.g. "خودرو ۱ (۶۶-۵۳۳ع۲۵)"
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1].length >= 5) {
    text = parenMatch[1].trim();
  }

  // Normalize Persian and Arabic digits to ASCII for regex processing
  const norm = normalizePersianDigits(text).trim();

  // Extract letter (excluding "ایران" or "iran")
  const withoutIran = norm.replace(/ایران/gi, ' ').replace(/iran/gi, ' ');
  const letterMatch = withoutIran.match(/([^\d\s\-_/\\|()]+)/);
  let letter = letterMatch ? letterMatch[1].trim() : 'ع';
  if (!letter || letter === '') letter = 'ع';

  // Determine plate type from letter
  let plateType: ParsedPlate['plateType'] = 'private';
  if (['ع', 'ک'].includes(letter)) {
    plateType = 'commercial';
  } else if (letter === 'ت') {
    plateType = 'taxi';
  } else if (letter === 'الف') {
    plateType = 'government';
  } else if (['پ', 'ث', 'ف', 'ز', 'ش'].includes(letter)) {
    plateType = 'police';
  } else if (letter === '♿' || letter === 'ژ') {
    plateType = 'disabled';
  } else {
    plateType = 'private';
  }

  const isCommercial = plateType === 'commercial' || plateType === 'taxi';

  let provinceCode = '66';
  let twoDigits = '25';
  let threeDigits = '533';

  // Case 1: Hyphen-separated format e.g., "66-533ع25" or "25ع533-66"
  if (norm.includes('-')) {
    const parts = norm.split('-');
    const partA = parts[0].trim();
    const partB = parts[1].trim();

    // Check which part contains the letter
    const partAHasLetter = /[^\d\s]/.test(partA.replace(/ایران/gi, ''));
    const letterPart = partAHasLetter ? partA : partB;
    const provPart = partAHasLetter ? partB : partA;

    // Province digits from the non-letter part
    const provDigits = provPart.replace(/[^\d]/g, '');
    if (provDigits) {
      provinceCode = provDigits.slice(0, 2);
    }

    // Split letter part by non-digits
    const digitsInLetterPart = letterPart.split(/[^\d]+/).filter(Boolean);
    if (digitsInLetterPart.length >= 2) {
      const d1 = digitsInLetterPart[0];
      const d2 = digitsInLetterPart[1];
      if (d1.length === 2 && d2.length === 3) {
        twoDigits = d1;
        threeDigits = d2;
      } else if (d1.length === 3 && d2.length === 2) {
        twoDigits = d2;
        threeDigits = d1;
      } else {
        twoDigits = d1.length <= 2 ? d1 : d2;
        threeDigits = d1.length > 2 ? d1 : d2;
      }
    } else if (digitsInLetterPart.length === 1) {
      const single = digitsInLetterPart[0];
      if (single.length >= 5) {
        threeDigits = single.slice(0, 3);
        twoDigits = single.slice(3, 5);
      }
    }
  } else {
    // Case 2: Space separated or formatted string e.g., "۲۵ ع ۵۳۳ ایران ۶۶" or "۲۵ع۵۳۳ایران۶۶"
    // Extract all digit chunks from string without Iran
    const allDigits = withoutIran.split(/[^\d]+/).filter(Boolean);
    const d3 = allDigits.find((d) => d.length === 3);
    const d2List = allDigits.filter((d) => d.length === 2);

    if (d3) {
      threeDigits = d3;
    }

    if (d2List.length >= 2) {
      twoDigits = d2List[0];
      provinceCode = d2List[1];
    } else if (d2List.length === 1) {
      twoDigits = d2List[0];
    }
  }

  return {
    twoDigits: toFaDigits(twoDigits || '۲۵'),
    letter,
    threeDigits: toFaDigits(threeDigits || '۵۳۳'),
    provinceCode: toFaDigits(provinceCode || '۶۶'),
    isCommercial,
    plateType,
  };
}

/**
 * Format any plate representation into official standard readable Persian text:
 * e.g., "۲۵ ع ۵۳۳ - ایران ۶۶"
 */
export function formatIranianPlateString(
  raw?: string | null,
  format: 'standard' | 'persianText' | 'shortDash' = 'standard'
): string {
  if (!raw) return '';
  const parsed = parseIranianPlate(raw);
  if (format === 'shortDash') {
    return `${parsed.provinceCode}-${parsed.threeDigits}${parsed.letter}${parsed.twoDigits}`;
  }
  if (format === 'persianText') {
    return `ایران ${parsed.provinceCode} | ${parsed.threeDigits} ${parsed.letter} ${parsed.twoDigits}`;
  }
  return `${parsed.twoDigits} ${parsed.letter} ${parsed.threeDigits} - ایران ${parsed.provinceCode}`;
}

export interface IranianPlateProps {
  plateNumber?: string;
  plate?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showScrew?: boolean;
  className?: string;
}

export const IranianPlate: FC<IranianPlateProps> = ({
  plateNumber,
  plate,
  size = 'md',
  showScrew = true,
  className = '',
}) => {
  const actualPlate = plateNumber || plate || '';
  const parsed = parseIranianPlate(actualPlate);

  // Background & text color theme based on plate type
  // Commercial/Truck/Public: Yellow background (#FFC20E or amber-400), Black text
  // Private: White background, Black text
  // Government: Red background, White text
  // Police: Dark Green background, White text
  const colorThemes = {
    commercial: {
      bg: 'bg-[#FFC20E] text-slate-950 border-black print:bg-white print:text-black',
      letterBadge: 'text-slate-950 font-black print:text-black',
      iranText: 'text-slate-900 print:text-black',
      divider: 'border-slate-950/40 print:border-black',
      screw: 'bg-slate-900/40 border-slate-950/60 print:hidden',
    },
    taxi: {
      bg: 'bg-[#FFC20E] text-slate-950 border-black print:bg-white print:text-black',
      letterBadge: 'text-slate-950 font-black print:text-black',
      iranText: 'text-slate-900 print:text-black',
      divider: 'border-slate-950/40 print:border-black',
      screw: 'bg-slate-900/40 border-slate-950/60 print:hidden',
    },
    private: {
      bg: 'bg-white text-slate-950 border-black print:bg-white print:text-black',
      letterBadge: 'text-slate-950 font-black print:text-black',
      iranText: 'text-slate-900 print:text-black',
      divider: 'border-slate-950/40 print:border-black',
      screw: 'bg-slate-400/60 border-slate-600 print:hidden',
    },
    government: {
      bg: 'bg-red-700 text-white border-black print:bg-white print:text-black',
      letterBadge: 'text-white font-black print:text-black',
      iranText: 'text-red-100 print:text-black',
      divider: 'border-white/40 print:border-black',
      screw: 'bg-white/40 border-white/60 print:hidden',
    },
    police: {
      bg: 'bg-emerald-800 text-white border-black print:bg-white print:text-black',
      letterBadge: 'text-white font-black print:text-black',
      iranText: 'text-emerald-100 print:text-black',
      divider: 'border-white/40 print:border-black',
      screw: 'bg-white/40 border-white/60 print:hidden',
    },
    disabled: {
      bg: 'bg-white text-blue-900 border-black print:bg-white print:text-black',
      letterBadge: 'text-blue-700 font-black print:text-black',
      iranText: 'text-slate-900 print:text-black',
      divider: 'border-slate-950/40 print:border-black',
      screw: 'bg-slate-400/60 border-slate-600 print:hidden',
    },
  };

  const currentTheme = colorThemes[parsed.plateType] || colorThemes.commercial;

  // Sizing definitions matching standard Iranian plate ratio (520mm x 110mm ≈ 4.72:1)
  const sizeConfig = {
    xs: {
      container: 'h-6 text-[11px] min-w-[130px] rounded-[4px] border-[1.5px]',
      blueBand: 'w-4 px-0.5 py-0.5',
      flagH: 'h-1.5 w-3',
      irText: 'text-[5px]',
      iranBox: 'w-7 pr-1 pl-1',
      iranLabel: 'text-[7px]',
      provDigit: 'text-[10px]',
      mainDigits: 'text-[12px] gap-1 px-1.5',
      letter: 'text-[11px] px-0.5',
    },
    sm: {
      container: 'h-7 text-xs min-w-[155px] rounded-[5px] border-[2px]',
      blueBand: 'w-5 px-0.5 py-0.5',
      flagH: 'h-2 w-3.5',
      irText: 'text-[6px]',
      iranBox: 'w-8 pr-1 pl-1',
      iranLabel: 'text-[8px]',
      provDigit: 'text-[11px]',
      mainDigits: 'text-[13px] gap-1.5 px-2',
      letter: 'text-[13px] px-1',
    },
    md: {
      container: 'h-9 text-sm min-w-[195px] rounded-[6px] border-[2.5px]',
      blueBand: 'w-6 px-1 py-0.5',
      flagH: 'h-2.5 w-4.5',
      irText: 'text-[7px]',
      iranBox: 'w-10 pr-1.5 pl-1',
      iranLabel: 'text-[9px]',
      provDigit: 'text-[14px]',
      mainDigits: 'text-[16px] gap-2 px-2.5',
      letter: 'text-[16px] px-1.5',
    },
    lg: {
      container: 'h-11 text-base min-w-[240px] rounded-[7px] border-[3px]',
      blueBand: 'w-8 px-1.5 py-1',
      flagH: 'h-3 w-5.5',
      irText: 'text-[8px]',
      iranBox: 'w-12 pr-2 pl-1.5',
      iranLabel: 'text-[11px]',
      provDigit: 'text-[18px]',
      mainDigits: 'text-[20px] gap-3 px-3',
      letter: 'text-[20px] px-2',
    },
    xl: {
      container: 'h-14 text-xl min-w-[300px] rounded-[8px] border-[3.5px]',
      blueBand: 'w-10 px-2 py-1',
      flagH: 'h-4 w-7',
      irText: 'text-[10px]',
      iranBox: 'w-16 pr-2.5 pl-2',
      iranLabel: 'text-[13px]',
      provDigit: 'text-[23px]',
      mainDigits: 'text-[26px] gap-4 px-4',
      letter: 'text-[26px] px-2.5',
    },
  }[size];

  return (
    <div
      dir="ltr"
      className={`inline-flex items-stretch select-none font-bold tracking-tight shadow-sm print:shadow-none overflow-hidden relative border-black print:border-black ${currentTheme.bg} ${sizeConfig.container} ${className}`}
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 3px rgba(0,0,0,0.2)',
      }}
      title={`شماره پلاک: ${parsed.twoDigits} ${parsed.letter} ${parsed.threeDigits} - ایران ${parsed.provinceCode}`}
    >
      {/* Screw/Rivet Accents */}
      {showScrew && size !== 'xs' && (
        <>
          <span
            className={`absolute left-[26%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${currentTheme.screw} border pointer-events-none opacity-40 print:hidden`}
          />
          <span
            className={`absolute right-[22%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${currentTheme.screw} border pointer-events-none opacity-40 print:hidden`}
          />
        </>
      )}

      {/* 1. Left Blue Stripe with Iranian Flag + I.R. IRAN */}
      <div
        className={`flex flex-col items-center justify-between bg-[#003399] print:bg-white print:text-black print:border-r print:border-black text-white shrink-0 self-stretch ${sizeConfig.blueBand}`}
      >
        {/* Iranian Flag */}
        <div className={`flex flex-col overflow-hidden rounded-[1px] shadow-xs ${sizeConfig.flagH} border border-black/20 print:border-black print:bg-white`}>
          <div className="bg-[#22c55e] print:bg-neutral-300 h-[33.33%] w-full" />
          <div className="bg-white h-[33.33%] w-full flex items-center justify-center relative">
            <span className="w-0.5 h-0.5 rounded-full bg-[#ef4444] print:bg-black inline-block" />
          </div>
          <div className="bg-[#ef4444] print:bg-neutral-800 h-[33.33%] w-full" />
        </div>

        {/* I.R. IRAN Text */}
        <div className={`flex flex-col items-center justify-center font-sans font-black leading-none ${sizeConfig.irText} tracking-tighter print:text-black`}>
          <span>I.R.</span>
          <span className="opacity-90 print:opacity-100">IRAN</span>
        </div>
      </div>

      {/* 2. Main Plate Area: [2-Digits] [Letter] [3-Digits] (Standard Iranian LTR visual order) */}
      <div className={`flex-1 flex items-center justify-center font-extrabold ${sizeConfig.mainDigits}`}>
        {/* Left 2 Digits (e.g., ۲۵) */}
        <span
          className="font-mono tracking-tight leading-none print:text-black"
          style={{ fontFamily: 'Shabnam, Vazir, Tahoma, sans-serif' }}
        >
          {parsed.twoDigits}
        </span>

        {/* Letter (e.g., ع or ک or ب) */}
        <span
          className={`leading-none flex items-center justify-center ${sizeConfig.letter} ${currentTheme.letterBadge} print:text-black`}
          style={{ fontFamily: 'Shabnam, Vazir, Tahoma, sans-serif' }}
        >
          {parsed.letter}
        </span>

        {/* Right 3 Digits (e.g., ۵۳۳) */}
        <span
          className="font-mono tracking-tight leading-none print:text-black"
          style={{ fontFamily: 'Shabnam, Vazir, Tahoma, sans-serif' }}
        >
          {parsed.threeDigits}
        </span>
      </div>

      {/* 3. Right Province Box: "ایران" on Top, 2-Digit City Code on Bottom */}
      <div
        className={`flex flex-col items-center justify-center border-l ${currentTheme.divider} shrink-0 self-stretch ${sizeConfig.iranBox} print:border-l print:border-black`}
        style={{
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.15)',
        }}
      >
        <span
          className={`font-bold leading-none ${sizeConfig.iranLabel} ${currentTheme.iranText} print:text-black`}
          style={{ fontFamily: 'Shabnam, Vazir, Tahoma, sans-serif' }}
        >
          ایران
        </span>
        <span
          className={`font-extrabold font-mono leading-none mt-0.5 ${sizeConfig.provDigit} print:text-black`}
          style={{ fontFamily: 'Shabnam, Vazir, Tahoma, sans-serif' }}
        >
          {parsed.provinceCode}
        </span>
      </div>
    </div>
  );
};
