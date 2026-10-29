import * as XLSX from 'xlsx';
import {
  VehicleHandoverRecord,
  HANDOVER_CHECKLIST_ITEMS,
} from '../types/vehicleHandover';
import { toFaDigits } from './jalaali';
import { parseIranianPlate } from '../components/IranianPlate';

/**
 * Export Vehicle Handover Form to Microsoft Word (.doc)
 * Generates an MSOffice-compliant HTML document with RTL direction,
 * exact Persian fonts, tables, 66-item checklist, affidavit, and signatures.
 */
export function exportHandoverToWord(
  record: VehicleHandoverRecord,
  isBlank: boolean = false
): void {
  const col1Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 1);
  const col2Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 2);
  const col3Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 3);

  const parsedPlate = parseIranianPlate(record.vehiclePlate || '۶۶-۵۳۳ع۲۵');
  const plateText = isBlank
    ? '[       ]  ع  [       ]  -  ایران [       ]'
    : `${parsedPlate.twoDigits} ${parsedPlate.letter} ${parsedPlate.threeDigits} - ایران ${parsedPlate.provinceCode}`;

  const receiptNo = isBlank ? '................' : toFaDigits(record.receiptNumber);
  const dateStr = isBlank ? '.... / .... / ....' : toFaDigits(record.date);
  const timeStr = isBlank ? '.... : ....' : toFaDigits(record.time);
  const addressStr = isBlank ? 'پایانه مرکزی ناوگان صداقت بار پیشرو' : (record.address || 'پایانه مرکزی صداقت بار پیشرو');

  const driverNameStr = isBlank ? '................................' : record.driverName;
  const driverLastNameStr = isBlank ? '................................' : record.driverLastName;
  const driverFatherNameStr = isBlank ? '........................' : (record.driverFatherName || '........................');
  const driverNationalIdStr = isBlank ? '........................' : (toFaDigits(record.driverNationalId) || '........................');

  const vehicleTypeStr = isBlank ? '........................' : (record.vehicleType || 'کامیونت کانتینردار ایسوزو ۶ تن');
  const vehicleCodeStr = isBlank ? '................' : (record.vehicleCode ? toFaDigits(record.vehicleCode) : '۱');
  const vehicleColorStr = isBlank ? '................' : (record.vehicleColor || 'سفید روغنی');

  // Build 22 rows of the 3-column table
  let checklistRowsHtml = '';
  for (let idx = 0; idx < 22; idx++) {
    const item1 = col1Items[idx];
    const item2 = col2Items[idx];
    const item3 = col3Items[idx];

    const st1 = !isBlank && item1 ? record.checklist[item1.id] || 'HEALTHY' : null;
    const st2 = !isBlank && item2 ? record.checklist[item2.id] || 'HEALTHY' : null;
    const st3 = !isBlank && item3 ? record.checklist[item3.id] || 'HEALTHY' : null;

    const bgClass = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    checklistRowsHtml += `
      <tr style="background-color: ${bgClass};">
        <!-- Col 1 -->
        <td style="padding: 4px; border: 1px solid #000; text-align: right; font-size: 9pt;">
          ${item1 ? `${toFaDigits(item1.id.replace(/^item_/, ''))}. ${item1.label}` : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; font-weight: bold; width: 30px;">
          ${isBlank ? '[ &nbsp; ]' : st1 === 'HEALTHY' ? '✓' : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; font-weight: bold; width: 30px; color: #dc2626;">
          ${isBlank ? '[ &nbsp; ]' : st1 === 'DAMAGED' ? '✗' : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; width: 30px; border-left: 2px solid #000;">
          ${isBlank ? '[ &nbsp; ]' : st1 === 'NONE' ? '—' : ''}
        </td>

        <!-- Col 2 -->
        <td style="padding: 4px; border: 1px solid #000; text-align: right; font-size: 9pt;">
          ${item2 ? `${toFaDigits(item2.id.replace(/^item_/, ''))}. ${item2.label}` : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; font-weight: bold; width: 30px;">
          ${isBlank ? '[ &nbsp; ]' : st2 === 'HEALTHY' ? '✓' : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; font-weight: bold; width: 30px; color: #dc2626;">
          ${isBlank ? '[ &nbsp; ]' : st2 === 'DAMAGED' ? '✗' : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; width: 30px; border-left: 2px solid #000;">
          ${isBlank ? '[ &nbsp; ]' : st2 === 'NONE' ? '—' : ''}
        </td>

        <!-- Col 3 -->
        <td style="padding: 4px; border: 1px solid #000; text-align: right; font-size: 9pt;">
          ${item3 ? `${toFaDigits(item3.id.replace(/^item_/, ''))}. ${item3.label}` : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; font-weight: bold; width: 30px;">
          ${isBlank ? '[ &nbsp; ]' : st3 === 'HEALTHY' ? '✓' : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; font-weight: bold; width: 30px; color: #dc2626;">
          ${isBlank ? '[ &nbsp; ]' : st3 === 'DAMAGED' ? '✗' : ''}
        </td>
        <td style="padding: 4px; border: 1px solid #000; text-align: center; font-size: 9pt; width: 30px;">
          ${isBlank ? '[ &nbsp; ]' : st3 === 'NONE' ? '—' : ''}
        </td>
      </tr>
    `;
  }

  // Damages breakdown section
  let damagesHtml = '';
  if (!isBlank && record.damages && record.damages.length > 0) {
    damagesHtml = `
      <div style="margin-top: 8px; border: 1px solid #000; padding: 6px; background-color: #f8fafc;">
        <div style="font-weight: bold; font-size: 10pt; margin-bottom: 4px;">فهرست آسیب‌ها و خط و خش‌های ثبت‌شده بدنه کامیونت ایسوزو:</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <tr style="background-color: #e2e8f0; font-weight: bold;">
            <td style="border: 1px solid #000; padding: 3px; width: 10%;">ردیف</td>
            <td style="border: 1px solid #000; padding: 3px; width: 25%;">وجه خودرو</td>
            <td style="border: 1px solid #000; padding: 3px; width: 35%;">نام قطعه و شرح آسیب</td>
            <td style="border: 1px solid #000; padding: 3px; width: 30%;">نوع خسارت</td>
          </tr>
          ${record.damages
            .map((dmg, idx) => {
              const viewName =
                dmg.view === 'FRONT'
                  ? 'وجه جلو'
                  : dmg.view === 'REAR'
                  ? 'وجه عقب'
                  : dmg.view === 'RIGHT'
                  ? 'وجه راست (شاگرد)'
                  : 'وجه چپ (راننده)';
              const typeName =
                dmg.damageType === 'SCRATCH'
                  ? 'خط و خش'
                  : dmg.damageType === 'DENT'
                  ? 'قِری'
                  : dmg.damageType === 'CRACK'
                  ? 'شکستگی'
                  : 'خسارت';
              return `
              <tr>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${toFaDigits(idx + 1)}</td>
                <td style="border: 1px solid #000; padding: 3px;">${viewName}</td>
                <td style="border: 1px solid #000; padding: 3px;">${dmg.partName || 'بدنه'} ${dmg.description ? `(${dmg.description})` : ''}</td>
                <td style="border: 1px solid #000; padding: 3px; color: #dc2626; font-weight: bold;">${typeName}</td>
              </tr>
            `;
            })
            .join('')}
        </table>
      </div>
    `;
  } else {
    damagesHtml = `
      <div style="margin-top: 8px; border: 1px solid #000; padding: 6px; background-color: #f8fafc; font-size: 9pt;">
        <strong>کنترل ۴ وجه بدنه کامیونت ایسوزو:</strong>
        ${
          isBlank
            ? 'راهنمای علامت‌گذاری میدانی با خودکار: [ × ] خط و خش | [ ○ ] قِری و فرورفتگی | [ ▲ ] شکستگی | [ ■ ] رنگ‌پریدگی'
            : 'بدنه خودرو کاملاً سالم و بدون هرگونه خط و خش، قرشدگی یا آسیب تحویل راننده گردید.'
        }
      </div>
    `;
  }

  const wordHtmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>صورت‌جلسه تحویل خودرو صداقت بار پیشرو</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 21.0cm 29.7cm;
          margin: 1.0cm 1.0cm 1.0cm 1.0cm;
          mso-page-orientation: portrait;
        }
        body {
          font-family: 'B Nazanin', 'BNazanin', 'Vazirmatn', 'Shabnam', 'Tahoma', 'Arial', sans-serif;
          direction: rtl;
          text-align: right;
          font-size: 10pt;
          line-height: 1.3;
          color: #000000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .header-box {
          border: 2px solid #000;
          padding: 8px;
          margin-bottom: 8px;
        }
        .section-box {
          border: 1px solid #000;
          padding: 6px;
          margin-bottom: 8px;
          background-color: #fafafa;
        }
      </style>
    </head>
    <body>
      <!-- 1. Header Box -->
      <table class="header-box">
        <tr>
          <td style="width: 32%; text-align: right; vertical-align: middle;">
            <div style="font-weight: 900; font-size: 12pt;">شرکت ترابری و لجستیک صداقت بار پیشرو</div>
            <div style="font-size: 8.5pt; color: #444;">شماره تماس: ۱۷۸۶ | پشتیبانی ناوگان</div>
          </td>
          <td style="width: 36%; text-align: center; vertical-align: middle;">
            <div style="display: inline-block; border: 2px solid #000; padding: 4px 12px; font-weight: 900; font-size: 12pt; background-color: #f1f5f9;">
              صورت‌جلسه رسمی تحویل و تحول خودرو
            </div>
            <div style="font-size: 9pt; margin-top: 3px; font-weight: bold;">
              تاریخ: ${dateStr} &nbsp;•&nbsp; ساعت: ${timeStr}
            </div>
          </td>
          <td style="width: 32%; text-align: left; vertical-align: middle; font-size: 9pt;">
            <div><strong>شماره قبض:</strong> <span style="font-family: monospace; font-size: 11pt; font-weight: bold;">${receiptNo}</span></div>
            <div style="font-size: 8.5pt;"><strong>محل تحویل:</strong> ${addressStr}</div>
          </td>
        </tr>
      </table>

      <!-- 2. Driver & Vehicle Info -->
      <table class="section-box" style="margin-bottom: 8px;">
        <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 9.5pt;">
          <td colspan="4" style="padding: 3px 6px; border-bottom: 1px solid #000;">الف) مشخصات فردی راننده (تحویل‌گیرنده)</td>
        </tr>
        <tr>
          <td style="width: 25%; padding: 4px;"><strong>نام:</strong> ${driverNameStr}</td>
          <td style="width: 25%; padding: 4px;"><strong>نام خانوادگی:</strong> ${driverLastNameStr}</td>
          <td style="width: 25%; padding: 4px;"><strong>نام پدر:</strong> ${driverFatherNameStr}</td>
          <td style="width: 25%; padding: 4px;"><strong>شماره ملی:</strong> ${driverNationalIdStr}</td>
        </tr>
        <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 9.5pt;">
          <td colspan="4" style="padding: 3px 6px; border-top: 1px solid #000; border-bottom: 1px solid #000;">ب) مشخصات کامیونت و پلاک (مورد تحویل)</td>
        </tr>
        <tr>
          <td style="width: 25%; padding: 4px;"><strong>نوع خودرو:</strong> ${vehicleTypeStr}</td>
          <td style="width: 25%; padding: 4px;"><strong>کد ناوگان:</strong> ${vehicleCodeStr}</td>
          <td style="width: 25%; padding: 4px;"><strong>رنگ بدنه:</strong> ${vehicleColorStr}</td>
          <td style="width: 25%; padding: 4px; text-align: left;">
            <strong>پلاک انتظامی:</strong>
            <span style="display: inline-block; border: 2px solid #000; padding: 2px 8px; font-weight: bold; background: #fff;">
              ${plateText}
            </span>
          </td>
        </tr>
      </table>

      <!-- 3. Checklist Table (66 Items in 3 Columns) -->
      <div style="border: 2px solid #000; margin-bottom: 8px;">
        <div style="background-color: #0f172a; color: #ffffff; text-align: center; font-weight: bold; padding: 4px; font-size: 10pt;">
          چک‌لیست رسمی سلامت قطعات، تجهیزات، ادوات فنی و اسناد خودرو (۶۶ قلم استاندارد صداقت بار پیشرو)
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #cbd5e1; font-weight: bold; font-size: 8.5pt; text-align: center;">
              <td style="border: 1px solid #000; padding: 3px; text-align: right; width: 17%;">شرح قطعه (فنی و موتور)</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%;">سالم</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%;">نقص</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%; border-left: 2px solid #000;">ندارد</td>

              <td style="border: 1px solid #000; padding: 3px; text-align: right; width: 17%;">شرح قطعه (بدنه و کابین)</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%;">سالم</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%;">نقص</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%; border-left: 2px solid #000;">ندارد</td>

              <td style="border: 1px solid #000; padding: 3px; text-align: right; width: 19%;">شرح قطعه (اسناد و ادوات)</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%;">سالم</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%;">نقص</td>
              <td style="border: 1px solid #000; padding: 3px; width: 5%;">ندارد</td>
            </tr>
          </thead>
          <tbody>
            ${checklistRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- 4. Damages Summary -->
      ${damagesHtml}

      <!-- 5. Affidavit -->
      <div style="border: 1px solid #000; padding: 6px; margin-top: 8px; margin-bottom: 8px; font-size: 9.5pt; text-align: justify; background-color: #fafafa;">
        <strong>تعهدنامه و اقرارنامه رسمی راننده:</strong><br/>
        اینجانب <u>${isBlank ? '........................................................' : `${record.driverName} ${record.driverLastName}`}</u>
        فرزند <u>${isBlank ? '........................' : (record.driverFatherName || '........................')}</u>
        به شماره ملی <u>${isBlank ? '........................' : (toFaDigits(record.driverNationalId) || '........................')}</u>
        طبق مندرجات چک‌لیست ۶۶ گانه و کنترل ۴ وجه بدنه فوق، کامیونت ایسوزو را با کلیه تجهیزات رویت و تحویل گرفتم و از تاریخ تحویل، مسئولیت حفظ، نگهداری فنی، بدنه، عواقب جانبی، خلافی و جرایم رانندگی خودروی موصوف تماماً به عهده اینجانب می‌باشد.
      </div>

      <!-- 6. Signatures -->
      <table style="width: 100%; border: 2px solid #000; margin-top: 6px;">
        <tr>
          <td style="width: 50%; padding: 12px; text-align: center; border-left: 1px solid #000; vertical-align: top;">
            <div style="font-weight: bold; font-size: 10pt;">نماینده تحویل‌دهنده (شرکت ترابری و لجستیک صداقت بار پیشرو):</div>
            <div style="margin-top: 6px; font-size: 9.5pt;">${record.delivererName || 'مسئول اعزام و ترابری'}</div>
            <div style="margin-top: 35px; font-size: 8.5pt; color: #555;">امضا و مهر رسمی شرکت:</div>
          </td>
          <td style="width: 50%; padding: 12px; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; font-size: 10pt;">تحویل‌گیرنده (راننده کامیونت):</div>
            <div style="margin-top: 6px; font-size: 9.5pt;">${isBlank ? '................................................' : (record.receiverName || `${record.driverName} ${record.driverLastName}`)}</div>
            <div style="margin-top: 35px; font-size: 8.5pt; color: #555;">امضا و اثر انگشت:</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Trigger file download
  const blob = new Blob(['\ufeff', wordHtmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileNameSuffix = isBlank ? 'خام_سفید' : (record.receiptNumber || 'تکمیل_شده');
  link.download = `صورت_جلسه_تحویل_خودرو_صداقت_بار_پیشرو_${fileNameSuffix}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Vehicle Handover Form to Microsoft Excel (.xlsx)
 * Generates structured columns and rows with full checklist, metadata, and status.
 */
export function exportHandoverToExcel(
  record: VehicleHandoverRecord,
  isBlank: boolean = false
): void {
  const col1Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 1);
  const col2Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 2);
  const col3Items = HANDOVER_CHECKLIST_ITEMS.filter((i) => i.column === 3);

  const parsedPlate = parseIranianPlate(record.vehiclePlate || '۶۶-۵۳۳ع۲۵');
  const plateText = isBlank
    ? '[     ] ع [     ] - ایران [     ]'
    : `${parsedPlate.twoDigits} ${parsedPlate.letter} ${parsedPlate.threeDigits} - ایران ${parsedPlate.provinceCode}`;

  const rows: (string | number)[][] = [
    ['شرکت ترابری و لجستیک صداقت بار پیشرو - صورت‌جلسه رسمی تحویل و تحول خودرو'],
    [],
    ['مشخصات صورت‌جلسه', '', '', 'مشخصات راننده (تحویل‌گیرنده)', '', '', 'مشخصات خودرو (مورد تحویل)'],
    [
      'شماره قبض:',
      isBlank ? '' : record.receiptNumber,
      '',
      'نام و نام خانوادگی:',
      isBlank ? '' : `${record.driverName} ${record.driverLastName}`,
      '',
      'نوع وسیله:',
      isBlank ? '' : (record.vehicleType || 'کامیونت ایسوزو ۶ تن'),
    ],
    [
      'تاریخ تحویل:',
      isBlank ? '' : record.date,
      '',
      'نام پدر:',
      isBlank ? '' : (record.driverFatherName || ''),
      '',
      'کد ناوگان:',
      isBlank ? '' : (record.vehicleCode ? record.vehicleCode : '۱'),
    ],
    [
      'ساعت تحویل:',
      isBlank ? '' : record.time,
      '',
      'شماره ملی:',
      isBlank ? '' : (record.driverNationalId || ''),
      '',
      'رنگ بدنه:',
      isBlank ? '' : (record.vehicleColor || 'سفید'),
    ],
    [
      'محل تحویل:',
      record.address || 'پایانه مرکزی ناوگان صداقت بار پیشرو',
      '',
      'وضعیت فرم:',
      isBlank ? 'نسخه خام (سفید جهت بازرسی میدانی)' : 'صورت‌جلسه تکمیل‌شده',
      '',
      'پلاک انتظامی:',
      plateText,
    ],
    [],
    [
      'ردیف',
      'بخش اول: فنی و موتور',
      'وضعیت',
      'ردیف',
      'بخش دوم: بدنه و کابین',
      'وضعیت',
      'ردیف',
      'بخش سوم: اسناد و ادوات',
      'وضعیت',
    ],
  ];

  for (let idx = 0; idx < 22; idx++) {
    const item1 = col1Items[idx];
    const item2 = col2Items[idx];
    const item3 = col3Items[idx];

    const getStatusText = (status?: string | null) => {
      if (isBlank || !status) return '[  ]';
      if (status === 'HEALTHY') return 'سالم ✓';
      if (status === 'DAMAGED') return 'دارای نقص ✗';
      return 'فاقد قطعه —';
    };

    rows.push([
      idx + 1,
      item1?.label || '',
      getStatusText(item1 ? record.checklist[item1.id] : null),
      idx + 23,
      item2?.label || '',
      getStatusText(item2 ? record.checklist[item2.id] : null),
      idx + 45,
      item3?.label || '',
      getStatusText(item3 ? record.checklist[item3.id] : null),
    ]);
  }

  rows.push([]);
  rows.push(['تعهدنامه و اقرارنامه رسمی راننده:']);
  rows.push([
    'اینجانب طبق مندرجات چک‌لیست ۶۶ گانه و کنترل ۴ وجه بدنه فوق، کامیونت ایسوزو را رویت و تحویل گرفتم و از تاریخ تحویل مسئولیت حفظ، نگهداری فنی، بدنه، عواقب جانبی، خلافی و جرایم رانندگی خودروی موصوف تماماً به عهده اینجانب می‌باشد.',
  ]);
  rows.push([]);
  rows.push([
    'نماینده تحویل‌دهنده (شرکت ترابری و لجستیک صداقت بار پیشرو):',
    record.delivererName || 'مسئول اعزام',
    '',
    '',
    'تحویل‌گیرنده (راننده کامیونت):',
    isBlank ? '' : `${record.driverName} ${record.driverLastName}`,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set RTL direction on worksheet
  worksheet['!views'] = [{ rightToLeft: true }];
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 14 },
    { wch: 6 },
    { wch: 26 },
    { wch: 14 },
    { wch: 6 },
    { wch: 26 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'صورت‌جلسه تحویل خودرو');

  const fileNameSuffix = isBlank ? 'خام_سفید' : (record.receiptNumber || 'تکمیل_شده');
  XLSX.writeFile(workbook, `صورت_جلسه_تحویل_خودرو_صداقت_بار_پیشرو_${fileNameSuffix}.xlsx`);
}
