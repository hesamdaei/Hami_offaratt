// Accurate Jalaali (Solar Hijri) Calendar Calculations

function div(a: number, b: number): number {
  return ~~(a / b);
}

function mod(a: number, b: number): number {
  return a - ~~(a / b) * b;
}

const J_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324,
  2394, 2456, 3178,
];

export function jalCal(jy: number): { leap: number; gy: number; march: number } | null {
  const bl = J_BREAKS.length;
  let leapJ = -14;
  let jp = J_BREAKS[0];
  if (jy < jp || jy >= J_BREAKS[bl - 1]) return null;
  let jm = 0;
  let jump = 0;
  for (let i = 1; i < bl; i++) {
    jm = J_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  const n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const gy = jy + 621;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

export function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

export function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  if (!r) return 0;
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  if (!r) return { jy: 1404, jm: 1, jd: 1 };
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number;
  let jd: number;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
    } else {
      k -= 186;
      jm = 7 + div(k, 30);
      jd = mod(k, 30) + 1;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
  }
  return { jy, jm, jd };
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PERSIAN_WEEKDAY_NAMES = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
];

export function toFaDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n)
    .split('')
    .map((c) => fa[Number(c)] || c)
    .join('');
}

export function getMonthDaysCount(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const r = jalCal(jy);
  return r ? (r.leap === 0 ? 30 : 29) : 29;
}

export function getPersianWeekday(jy: number, jm: number, jd: number): string {
  const jdn = j2d(jy, jm, jd);
  const g = d2g(jdn);
  const jsDate = new Date(g.gy, g.gm - 1, g.gd);
  return PERSIAN_WEEKDAY_NAMES[jsDate.getDay()];
}

export function normalizePersianDigits(str?: string | null): string {
  if (!str) return '';
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(faDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(arDigits[i], 'g'), String(i));
  }
  return res;
}

export function formatPersianDateKey(year: number, month: number, day: number): string {
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

export function formatJalaaliDate(jy: number, jm: number, jd: number): string {
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function parseJalaaliDate(dateStr?: string | null): { jy: number; jm: number; jd: number } | null {
  if (!dateStr) return null;
  const normalized = normalizePersianDigits(dateStr);
  // Convert any common separators (dashes, dots, spaces, underscores) to slashes
  const withSlashes = normalized.replace(/[-.\s_]+/g, '/');
  const cleaned = withSlashes.replace(/[^\d/]/g, '').trim();
  const parts = cleaned.split('/').map((p) => parseInt(p, 10));
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    let year = parts[0];
    // Handle 2-digit Persian years (e.g. 05 -> 1405, 99 -> 1399)
    if (year < 100) {
      year = year < 50 ? 1400 + year : 1300 + year;
    }
    const month = Math.min(12, Math.max(1, parts[1]));
    const day = Math.min(31, Math.max(1, parts[2]));
    return { jy: year, jm: month, jd: day };
  }
  return null;
}

// Exact mathematical day difference between two Jalaali dates via Julian Day Numbers
export function diffJalaaliDays(
  fromDate: { jy: number; jm: number; jd: number },
  toDate: { jy: number; jm: number; jd: number }
): number {
  const d1 = j2d(fromDate.jy, fromDate.jm, fromDate.jd);
  const d2 = j2d(toDate.jy, toDate.jm, toDate.jd);
  return d2 - d1;
}

// Calculate exact days elapsed from past date to today or reference date
export function calculateDaysBetweenJalaali(pastDateStr?: string | null, referenceDateStr?: string | null): number {
  if (!pastDateStr) return 0;
  const p1 = parseJalaaliDate(pastDateStr);
  if (!p1) return 0;
  const p2 = referenceDateStr ? parseJalaaliDate(referenceDateStr) : getTodayJalaali();
  if (!p2) return 0;
  return Math.max(0, diffJalaaliDays(p1, p2));
}

// Calculate signed difference in days between two Jalaali date strings (positive if date2 is after date1)
export function calculateDaysDifference(date1Str?: string | null, date2Str?: string | null): number {
  if (!date1Str || !date2Str) return 0;
  const p1 = parseJalaaliDate(date1Str);
  const p2 = parseJalaaliDate(date2Str);
  if (!p1 || !p2) return 0;
  return diffJalaaliDays(p1, p2);
}

// Add days to a Jalaali date and return the exact resulting Jalaali date
export function addJalaaliDays(
  date: { jy: number; jm: number; jd: number },
  days: number
): { jy: number; jm: number; jd: number } {
  const jdn = j2d(date.jy, date.jm, date.jd) + days;
  return d2j(jdn);
}

// Get the weekday of the 1st of a Jalaali month (0 = Saturday, 1 = Sunday, ..., 6 = Friday)
export function getFirstWeekdayOfMonth(jy: number, jm: number): number {
  const jdn = j2d(jy, jm, 1);
  const g = d2g(jdn);
  const jsDate = new Date(g.gy, g.gm - 1, g.gd);
  const jsDay = jsDate.getDay(); // 0 is Sunday, 6 is Saturday
  return (jsDay + 1) % 7; // Convert so 0 = Saturday, 6 = Friday
}

export function getTodayJalaali(): {
  jy: number;
  jm: number;
  jd: number;
  fullFa: string;
  gregorianFormatted: string;
  weekdayName: string;
} {
  const now = new Date();
  const jdn = g2d(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const j = d2j(jdn);
  const weekdayIndex = now.getDay();
  const weekdayName = PERSIAN_WEEKDAY_NAMES[weekdayIndex];
  const fullFa = `${weekdayName}، ${toFaDigits(j.jd)} ${PERSIAN_MONTH_NAMES[j.jm - 1]} ${toFaDigits(j.jy)}`;
  const gregorianFormatted = `${toFaDigits(now.getDate())} / ${toFaDigits(now.getMonth() + 1)} / ${toFaDigits(now.getFullYear())}`;

  return {
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
    fullFa,
    gregorianFormatted,
    weekdayName,
  };
}

// Helper to convert date string into integer YYYYMMDD for fast comparisons
export function getDateSortNumber(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const p = parseJalaaliDate(dateStr);
  if (!p) return null;
  return p.jy * 10000 + p.jm * 100 + p.jd;
}

// Check if a target date (year, month, day) is strictly before a person's start/creation date
export function isDateBeforeStart(
  startDateStr: string | undefined | null,
  year: number,
  month: number,
  day: number
): boolean {
  if (!startDateStr) return false;
  const startSort = getDateSortNumber(startDateStr);
  if (!startSort) return false;
  const targetSort = year * 10000 + month * 100 + day;
  return targetSort < startSort;
}

