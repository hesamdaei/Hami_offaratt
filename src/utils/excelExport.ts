import * as XLSX from 'xlsx';
import { Driver, AttendanceRecords } from '../types';
import {
  getMonthDaysCount,
  getPersianWeekday,
  formatPersianDateKey,
  PERSIAN_MONTH_NAMES,
  toFaDigits,
  getTodayJalaali,
} from './jalaali';

export function exportToExcel(
  drivers: Driver[],
  records: AttendanceRecords,
  year: number,
  month: number
) {
  const daysInMonth = getMonthDaysCount(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = PERSIAN_MONTH_NAMES[month - 1];

  // Header row 1: Day numbers
  const row1 = [
    'ردیف',
    'نام و نام خانوادگی راننده',
    'کد پرسنلی',
    ...daysArray.map((day) => toFaDigits(day)),
    'جمع مرخصی (م)',
    'جمع تعمیرگاه (ت)',
  ];

  // Header row 2: Weekday short
  const row2 = [
    '',
    '',
    '',
    ...daysArray.map((day) => getPersianWeekday(year, month, day).slice(0, 1)),
    '',
    '',
  ];

  const data: (string | number)[][] = [
    [`سامانه حامی - تابلوی وضعیت و مرخصی رانندگان (${monthName} ${toFaDigits(year)})`],
    [],
    row1,
    row2,
  ];

  // Daily totals
  const dailyLeaveCounts: number[] = new Array(daysInMonth).fill(0);
  const dailyWorkshopCounts: number[] = new Array(daysInMonth).fill(0);
  let totalAllLeaves = 0;
  let totalAllWorkshops = 0;

  // Data rows
  drivers.forEach((driver, idx) => {
    let driverLeaves = 0;
    let driverWorkshops = 0;
    const today = getTodayJalaali();
    const rowDays = daysArray.map((day, dayIndex) => {
      const isFuture =
        year > today.jy ||
        (year === today.jy && month > today.jm) ||
        (year === today.jy && month === today.jm && day > today.jd);

      const dateKey = formatPersianDateKey(year, month, day);
      const status = records[driver.id]?.[dateKey] || 'none';
      if (status === 'leave' || status === 'م') {
        driverLeaves++;
        dailyLeaveCounts[dayIndex]++;
        return 'م';
      } else if (status === 'workshop' || status === 'ت') {
        driverWorkshops++;
        dailyWorkshopCounts[dayIndex]++;
        return 'ت';
      }
      return isFuture ? '' : '-';
    });

    totalAllLeaves += driverLeaves;
    totalAllWorkshops += driverWorkshops;

    data.push([
      toFaDigits(idx + 1),
      driver.name,
      driver.personnelCode || '—',
      ...rowDays,
      driverLeaves,
      driverWorkshops,
    ]);
  });

  // Summary footer rows
  data.push([]);
  data.push([
    'مجموع مرخصی‌ها (م)',
    '',
    '',
    ...dailyLeaveCounts,
    totalAllLeaves,
    '',
  ]);
  data.push([
    'مجموع تعمیرگاه‌ها (ت)',
    '',
    '',
    ...dailyWorkshopCounts,
    '',
    totalAllWorkshops,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  const colWidths = [
    { wch: 6 },  // Row index
    { wch: 26 }, // Driver Name
    { wch: 12 }, // Code
    ...daysArray.map(() => ({ wch: 4.5 })), // Days
    { wch: 14 }, // Leave sum
    { wch: 14 }, // Workshop sum
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${monthName} ${year}`);

  const fileName = `Hami_Attendance_${year}_${month}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportStaffToExcel(
  staff: { id: string; name: string; code: string; role: string; department: string }[],
  records: AttendanceRecords,
  year: number,
  month: number
) {
  const daysInMonth = getMonthDaysCount(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = PERSIAN_MONTH_NAMES[month - 1];

  // Header row 1: Day numbers
  const row1 = [
    'ردیف',
    'نام و نام خانوادگی',
    'کد پرسنلی',
    'واحد سازمانی',
    'سمت / نقش',
    ...daysArray.map((day) => toFaDigits(day)),
    'جمع مرخصی',
    'جمع استراحت/شیفت',
    'درصد حضور',
  ];

  const data: (string | number)[][] = [
    [`سامانه حامی - تابلوی حضور و غیاب پرسنل و کادر ستادی (${monthName} ${toFaDigits(year)})`],
    [],
    row1,
  ];

  const dailyPresentCounts: number[] = new Array(daysInMonth).fill(0);
  const today = getTodayJalaali();

  let elapsedDaysInMonth = 0;
  daysArray.forEach((d) => {
    const isFut =
      year > today.jy ||
      (year === today.jy && month > today.jm) ||
      (year === today.jy && month === today.jm && d > today.jd);
    if (!isFut) elapsedDaysInMonth++;
  });

  staff.forEach((member, idx) => {
    let leaves = 0;
    let restOrWorkshop = 0;
    let presentDays = 0;

    const rowDays = daysArray.map((day, dayIndex) => {
      const isFuture =
        year > today.jy ||
        (year === today.jy && month > today.jm) ||
        (year === today.jy && month === today.jm && day > today.jd);

      const dateKey = formatPersianDateKey(year, month, day);
      const status = records[member.id]?.[dateKey] || 'none';
      if (status === 'leave' || status === 'م') {
        leaves++;
        return 'مرخصی';
      } else if (status === 'workshop' || status === 'ت') {
        restOrWorkshop++;
        return 'استراحت';
      } else if (status === 'mission') {
        presentDays++;
        dailyPresentCounts[dayIndex]++;
        return 'مأموریت';
      } else if (status === 'absent') {
        return 'غیبت';
      } else {
        if (isFuture) {
          return ''; // Empty for upcoming days
        }
        presentDays++;
        dailyPresentCounts[dayIndex]++;
        return 'حاضر';
      }
    });

    const presentRate = elapsedDaysInMonth > 0 ? `${Math.round((presentDays / elapsedDaysInMonth) * 100)}%` : '---';

    data.push([
      toFaDigits(idx + 1),
      member.name,
      member.code,
      member.department,
      member.role,
      ...rowDays,
      leaves,
      restOrWorkshop,
      presentRate,
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `پرسنل ${monthName} ${year}`);

  const fileName = `Hami_Staff_Attendance_${year}_${month}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

