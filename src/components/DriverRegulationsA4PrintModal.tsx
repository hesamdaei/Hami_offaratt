import React, { FC, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  FileText,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building,
  ShieldAlert,
  Car,
  FileCheck,
  ChevronDown,
  Sparkles,
  Info,
  Stamp,
  Award,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  BookmarkCheck,
} from 'lucide-react';
import { VehicleItem } from '../utils/fleetSeedData';
import { getTodayJalaali, toFaDigits } from '../utils/jalaali';
import { PersianDatePicker } from './PersianDatePicker';
import type { RegulationCategory } from './DriverRegulationsView';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';

interface DriverRegulationsA4PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: RegulationCategory[];
  affidavitText: string;
  vehicles?: VehicleItem[];
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type A4PrintLayoutMode =
  | 'LETTER_AFFIDAVIT'
  | 'FULL'
  | 'VIOLATIONS_ONLY'
  | 'AFFIDAVIT_STANDALONE';

export const DriverRegulationsA4PrintModal: FC<DriverRegulationsA4PrintModalProps> = ({
  isOpen,
  onClose,
  categories,
  affidavitText,
  vehicles = [],
  onShowToast,
}) => {
  const today = useMemo(() => getTodayJalaali(), []);
  const todayFormatted = `${today.jy}/${String(today.jm).padStart(2, '0')}/${String(today.jd).padStart(2, '0')}`;

  // Custom Company Name (Strictly NO Hami Bar, fully customizable by user)
  const [companyName, setCompanyName] = useState<string>(
    'شرکت خدمات حمل و نقل و ترابری جاده‌ای (سهامی خاص)'
  );
  const [companySubtitle, setCompanySubtitle] = useState<string>(
    'واحد نظارت، امور رانندگان و بازرسی دیسپچینگ ناوگان'
  );

  const [selectedDriverId, setSelectedDriverId] = useState<string>('BLANK');
  const [issueDate, setIssueDate] = useState<string>(todayFormatted);
  const [docNumber, setDocNumber] = useState<string>(
    `ابلاغ-۱۴۰۵/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [printLayout, setPrintLayout] = useState<A4PrintLayoutMode>('LETTER_AFFIDAVIT');
  const [fontScale, setFontScale] = useState<'COMPACT' | 'NORMAL' | 'LARGE'>('NORMAL');
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => getStoredPrintSettings());
  const [showCompanyEdit, setShowCompanyEdit] = useState<boolean>(false);

  // Manual Driver inputs if Blank or override
  const [customDriverName, setCustomDriverName] = useState<string>('');
  const [customNationalId, setCustomNationalId] = useState<string>('');
  const [customLicenseNo, setCustomLicenseNo] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customPlate, setCustomPlate] = useState<string>('');

  // Guarantor details for Standalone Affidavit
  const [guarantorName, setGuarantorName] = useState<string>('');
  const [guarantorNationalId, setGuarantorNationalId] = useState<string>('');

  // Selected vehicle from fleet
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedDriverId);
  }, [vehicles, selectedDriverId]);

  // Active driver details (sanitized, zero reference to Hami Bar)
  const driverName = selectedVehicle ? selectedVehicle.driverName : customDriverName;
  const vehicleCode = selectedVehicle ? String(selectedVehicle.code) : '';
  const plateNumber = selectedVehicle ? selectedVehicle.plateNumber : customPlate;
  const phoneNumber = selectedVehicle ? (selectedVehicle.phone || '۰۹۱۲-------') : customPhone;
  const nationalId =
    customNationalId ||
    (selectedVehicle ? `۰۰${selectedVehicle.code * 17 + 10000000}`.slice(-10) : '');
  const licenseNo =
    customLicenseNo ||
    (selectedVehicle ? `LIC-${selectedVehicle.code * 45 + 10000}` : '');

  // Sanitized affidavit text (strips any leftover mentions of Hami Bar)
  const cleanAffidavitText = useMemo(() => {
    return affidavitText
      .replace(/شرکت حمل و نقل سراسری حامی بار/g, companyName)
      .replace(/شرکت حامی بار/g, companyName)
      .replace(/حامی بار/g, 'شرکت ترابری')
      .replace(/شرکت حامی/g, companyName);
  }, [affidavitText, companyName]);

  // Filtered categories based on selected layout
  const displayedCategories = useMemo(() => {
    if (printLayout === 'VIOLATIONS_ONLY') {
      return categories.filter((c) => c.id === 'VIOLATIONS' || c.id === 'FINANCIAL_WAYBILL');
    }
    if (printLayout === 'LETTER_AFFIDAVIT') {
      return categories.filter((c) => c.id === 'GENERAL_RULES' || c.id === 'VIOLATIONS');
    }
    return categories;
  }, [categories, printLayout]);

  const totalClauses = useMemo(() => {
    return displayedCategories.reduce((acc, c) => acc + c.items.length, 0);
  }, [displayedCategories]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
    if (onShowToast) {
      onShowToast(
        'دستور چاپ به چاپگر ارسال شد. برای بهترین خروجی، گزینه حاشیه (Margins) را روی Default یا None بگذارید.',
        'info'
      );
    }
  };

  const getScaleClasses = () => {
    switch (fontScale) {
      case 'COMPACT':
        return 'text-[8.5pt] leading-normal';
      case 'LARGE':
        return 'text-[10pt] leading-relaxed';
      case 'NORMAL':
      default:
        return 'text-[9.2pt] leading-relaxed';
    }
  };

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto print:static print:bg-white print:p-0 print:m-0 print:overflow-visible print:block">
      {/* Modal Dialog Box */}
      <div className="print-modal-content bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden my-auto print:static print:bg-white print:border-none print:shadow-none print:max-h-none print:overflow-visible print:w-full print:m-0">
        
        {/* Modal Top Control Bar (Hidden in Print) */}
        <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-6 py-3 sm:py-3.5 bg-[#111c34] border-b border-[#1e2d47] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2 flex-wrap">
                <span>چاپ نسخه اختصاصی A4 آیین‌نامه و تعهدنامه</span>
                <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  ابعاد استاندارد ۲۱۰ × ۲۹۷ mm
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/20">
                  بدون نام حامی بار (سربرگ رسمی سفارشی)
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                تنظیم دقیق ارتفاع و حاشیه‌ها جهت انطباق ۱۰۰٪ با قطع تک‌برگی یا چندبرگی A4
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => setShowCompanyEdit(!showCompanyEdit)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="تنظیم نام شرکت و سربرگ"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>ویرایش سربرگ</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-linear-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-black text-xs shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition hover:scale-[1.02] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فوری A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Laser Printer & Customizable Watermark Control Toolbar */}
        <LaserPrintControlToolbar
          settings={printSettings}
          onChange={setPrintSettings}
          onPrint={handlePrint}
          title="آیین‌نامه انضباطی و تعهدنامه راننده"
          onShowToast={onShowToast}
        />

        {/* Company Title Inline Editor Strip (Hidden in Print) */}
        {showCompanyEdit && (
          <div className="no-print bg-[#08101e] px-4 sm:px-6 py-2.5 border-b border-amber-500/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div>
              <label className="block text-amber-300 font-bold mb-1">نام رسمی شرکت / سازمان در سربرگ:</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: شرکت حمل و نقل و ترابری خاورمیانه (سهامی خاص)"
                className="w-full bg-[#111b2e] border border-amber-500/40 text-white rounded-lg px-2.5 py-1.5 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">زیرعنوان سازمانی / بخش صادرکننده:</label>
              <input
                type="text"
                value={companySubtitle}
                onChange={(e) => setCompanySubtitle(e.target.value)}
                placeholder="مثال: مدیریت ترابری و بازرسی ناوگان"
                className="w-full bg-[#111b2e] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Modal Configuration Strip (Hidden in Print) */}
        <div className="no-print bg-[#090f1d] px-3.5 sm:px-6 py-2.5 border-b border-[#172338] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs shrink-0">
          {/* Driver Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">راننده منتسب به سند:</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-[#111b2e] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:border-amber-500 focus:outline-none font-sans"
            >
              <option value="BLANK">-- فرم خام اداری (بدون نام - جهت تکمیل دستی) --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  کد {toFaDigits(v.code)}: {v.driverName} ({v.plateNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Layout mode */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">فرمت نسخه چاپی A4:</label>
            <select
              value={printLayout}
              onChange={(e) => setPrintLayout(e.target.value as A4PrintLayoutMode)}
              className="w-full bg-[#111b2e] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:border-amber-500 focus:outline-none font-bold text-amber-300"
            >
              <option value="LETTER_AFFIDAVIT">۱. ابلاغیه اداری و تعهدنامه (تک‌برگ دقیق A4)</option>
              <option value="FULL">۲. دفترچه جامع آیین‌نامه (چندبرگی کامل A4)</option>
              <option value="VIOLATIONS_ONLY">۳. جدول جرایم و تخلفات انضباطی (تک‌برگ A4)</option>
              <option value="AFFIDAVIT_STANDALONE">۴. تعهدنامه و اقرارنامه محضری ضامن‌دار (تک‌برگ A4)</option>
            </select>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">شماره ابلاغیه اداری:</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full bg-[#111b2e] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Issue Date with Persian Date Picker */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">تاریخ ابلاغ:</label>
            <PersianDatePicker
              value={issueDate}
              onChange={setIssueDate}
              placeholder="انتخاب تاریخ ابلاغ"
            />
          </div>
        </div>

        {/* Font scale and guidance strip (Hidden in Print) */}
        <div className="no-print bg-[#0c1527] px-3.5 sm:px-6 py-2 border-b border-[#172338] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-300">تراکم متن در صفحه A4:</span>
            <button
              onClick={() => setFontScale('COMPACT')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                fontScale === 'COMPACT' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              فشرده (تضمین تک‌برگ)
            </button>
            <button
              onClick={() => setFontScale('NORMAL')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                fontScale === 'NORMAL' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              استاندارد اداری
            </button>
            <button
              onClick={() => setFontScale('LARGE')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                fontScale === 'LARGE' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              خوانایی بالا
            </button>

            <span className="text-slate-600">|</span>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printSettings.enabled}
                onChange={(e) => setPrintSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>واترمارک امنیتی رسمی</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>تنظیم پرینتر: سایز برگه A4 • حاشیه Default یا None • گزینه Background Graphics فعال</span>
          </div>
        </div>

        {/* Scrollable Viewport containing the True A4 Document */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/70 custom-scrollbar flex justify-center print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
          
          {/* THE OFFICIAL A4 PRINTABLE DOCUMENT CONTAINER */}
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className={`w-full max-w-[210mm] bg-white text-slate-950 p-[8mm] sm:p-[12mm] shadow-2xl rounded-sm font-['Vazirmatn','Shabnam',Tahoma,sans-serif] border border-slate-300 relative print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none print:p-0 ${
              printLayout === 'LETTER_AFFIDAVIT' || printLayout === 'VIOLATIONS_ONLY' || printLayout === 'AFFIDAVIT_STANDALONE'
                ? 'a4-single-page'
                : ''
            } ${getScaleClasses()}`}
            style={{ direction: 'rtl' }}
          >
            {/* Customizable Laser Printer Watermark */}
            <LaserPrintWatermark
              enabled={printSettings.enabled}
              text={printSettings.text}
              subText={printSettings.subText}
              opacity={printSettings.opacity}
              fontSizePt={printSettings.fontSizePt}
            />

            {/* Content Container (Layered above watermark) */}
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                {/* Top Official Letterhead */}
                <div className="border-b-2 border-slate-900 pb-2.5 mb-2.5">
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Right: Neutral Majestic Transport Emblem & Company Title */}
                    <div className="flex items-center gap-3">
                      {/* Stylized Vector Transportation Crest Emblem (Free of Hami Bar) */}
                      <div className="w-13 h-13 sm:w-14 sm:h-14 border-2 border-slate-900 rounded-xl flex flex-col items-center justify-center p-1 bg-slate-100 shrink-0 shadow-xs">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full text-slate-900"
                          fill="currentColor"
                        >
                          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
                          <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                          {/* Stylized Steering & Highway Crest */}
                          <path
                            d="M 50 15 L 53 27 L 65 27 L 55 35 L 59 47 L 50 40 L 41 47 L 45 35 L 35 27 L 47 27 Z"
                            fill="#0f172a"
                          />
                          <path
                            d="M 32 75 L 44 48 L 56 48 L 68 75 Z"
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="3.5"
                          />
                          <line x1="50" y1="52" x2="50" y2="72" stroke="#0f172a" strokeWidth="3" strokeDasharray="3 2" />
                          {/* Laurel wreaths */}
                          <path
                            d="M 20 50 C 20 65 30 78 45 83"
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="2.5"
                          />
                          <path
                            d="M 80 50 C 80 65 70 78 55 83"
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="2.5"
                          />
                        </svg>
                      </div>

                      <div>
                        <div className="text-[8pt] sm:text-[8.5pt] font-bold text-slate-700 flex items-center gap-1.5">
                          <span>جمهوری اسلامی ایران</span>
                          <span className="text-slate-400">•</span>
                          <span>سامانه نظارت بر ترابری جاده‌ای و ناوگان باربری</span>
                        </div>
                        <h1 className="text-sm sm:text-base font-black text-slate-950 tracking-tight leading-snug">
                          {companyName}
                        </h1>
                        <p className="text-[9pt] font-black text-amber-900 mt-0.5">
                          {printLayout === 'LETTER_AFFIDAVIT' && 'ابلاغیه رسمی آیین‌نامه انضباطی، مقررات سیر و تعهدنامه راننده'}
                          {printLayout === 'FULL' && 'منشور کامل اخلاق حرفه‌ای، آیین‌نامه انضباطی و تعهدنامه رانندگان ناوگان'}
                          {printLayout === 'VIOLATIONS_ONLY' && 'جدول رسمی مصوب تخلفات، جرایم انضباطی و کسر کارکرد رانندگان'}
                          {printLayout === 'AFFIDAVIT_STANDALONE' && 'اقرارنامه کتبی رسمی، تعهد محضری و ضمانت‌نامه حسن انجام کار'}
                        </p>
                        <span className="text-[7.5pt] text-slate-500 font-mono">
                          {companySubtitle} • نظارت بر حسن اجرای قرارداد پیمانکاری حمل و نقل
                        </span>
                      </div>
                    </div>

                    {/* Left: Administrative Metadata */}
                    <div className="text-left font-mono text-[8.5pt] space-y-1 text-slate-800 border-r-2 border-slate-300 pr-3 min-w-[125px] shrink-0">
                      <div>
                        <span className="text-slate-500 font-sans">شماره ابلاغ: </span>
                        <strong className="font-bold text-slate-950">{toFaDigits(docNumber)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">تاریخ ابلاغ: </span>
                        <strong className="font-bold text-slate-950">{toFaDigits(issueDate)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">پیوست: </span>
                        <strong className="text-slate-900 font-sans">تعهدنامه رسمی</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">طبقه سند: </span>
                        <span className="text-slate-900 font-sans font-bold">اداری / پرسنلی</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver Identity Card Box */}
                <div className="border border-slate-800 rounded-lg p-2 mb-2.5 bg-slate-50/80 text-[8.5pt] avoid-page-break">
                  <div className="font-bold text-slate-900 mb-1 pb-1 border-b border-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-700" />
                      <span>مشخصات هویتی و پرسنلی راننده طرف قرارداد (ناوگان فعال):</span>
                    </span>
                    <span className="text-[8pt] text-emerald-800 font-mono font-bold">
                      وضعیت ابلاغ: رسمی و لازم‌الاجرا
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-y-1 gap-x-3">
                    <div>
                      <span className="text-slate-600">نام و نام خانوادگی: </span>
                      <strong className="text-slate-950 font-bold">
                        {driverName || '...........................................'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600">کد ملی: </span>
                      <strong className="text-slate-950 font-mono font-bold">
                        {nationalId ? toFaDigits(nationalId) : '...........................................'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600">تلفن همراه: </span>
                      <strong className="text-slate-950 font-mono font-bold">
                        {phoneNumber ? toFaDigits(phoneNumber) : '...........................................'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600">کد ناوگان / ردیف: </span>
                      <strong className="text-slate-950 font-mono font-bold">
                        {vehicleCode ? `کد ${toFaDigits(vehicleCode)}` : '...........................................'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600">پلاک انتظامی خودرو: </span>
                      <strong className="text-slate-950 font-mono font-bold">
                        {plateNumber || '...........................................'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600">شماره گواهینامه / کارت هوشمند: </span>
                      <strong className="text-slate-950 font-mono font-bold">
                        {licenseNo ? toFaDigits(licenseNo) : '...........................................'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Formal Administrative Letter Preamble */}
                <div className="text-[8.5pt] text-justify leading-relaxed text-slate-900 mb-2 px-1 border-r-2 border-amber-600 pr-2 bg-amber-50/40 py-1 rounded-l avoid-page-break">
                  <strong>احتراماً،</strong> بدین‌وسیله مواد، تکالیف انضباطی، منشور رفتاری و ضوابط اجرایی مصوب شرکت جهت حضور منظم در بارگیری، رعایت اصول ایمنی و مهار بار، حسن برخورد با صاحبان کالا، حفظ شئونات و سلامت فنی وسیله نقلیه به شرح ذیل ابلاغ می‌گردد. رعایت کامل و بدون قید و شرط تمامی مفاد برای نامبرده الزامی بوده و هرگونه تخطی مشمول ضمانت‌های اجرایی و کسورات مصوب خواهد بود.
                </div>

                {/* ========================================================================= */}
                {/* LAYOUT 1: SINGLE-PAGE OFFICIAL LETTER & AFFIDAVIT (PRECISE 1-PAGE A4)    */}
                {/* ========================================================================= */}
                {printLayout === 'LETTER_AFFIDAVIT' && (
                  <div className="space-y-2 mb-2">
                    <div className="border border-slate-400 rounded-lg p-2 bg-white avoid-page-break">
                      <div className="font-bold text-[8.8pt] text-slate-950 border-b border-slate-300 pb-1 mb-1.5 flex items-center justify-between">
                        <span>خلاصه ۸ تکلیف کلیدی و خط‌مشی‌های انضباطی رانندگان ناوگان:</span>
                        <span className="text-[8pt] text-slate-600 font-mono font-bold">مصوب کمیسیون نظارت</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[8.2pt] leading-normal text-slate-900">
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۱.</span>
                          <p><strong>حضور به‌موقع:</strong> اعلام ورود و خروج به دیسپچ و حضور رأس ساعت مقرر در مبدأ بارگیری.</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۲.</span>
                          <p><strong>منع دریافت وجه مازاد:</strong> دریافت هرگونه انعام یا وجه خارج از بارنامه رسمی اکیداً ممنوع است.</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۳.</span>
                          <p><strong>سرویس فنی دوره‌ای:</strong> تعویض روغن، فیلترها و چک ترمز طبق کیلومتراژ مجاز در تعمیرگاه معتمد.</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۴.</span>
                          <p><strong>تسویه بارنامه:</strong> تحویل نسخه‌های فیزیکی بارنامه و رسید دریافت بار ظرف حداکثر ۲۴ ساعت.</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۵.</span>
                          <p><strong>مسئولیت سلامت بار:</strong> مهار استاندارد محموله با چادر و طناب و جبران خسارات ناشی از اهمال.</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۶.</span>
                          <p><strong>پوشش و رفتار حرفه‌ای:</strong> رعایت کامل شئونات، لباس فرم سازمانی و حسن برخورد با ارباب‌رجوع.</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۷.</span>
                          <p><strong>سرعت و ایمنی جاده‌ای:</strong> رعایت دقیق سرعت مطمئنه و ممنوعیت رانندگی در حالت خواب‌آلودگی.</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-amber-800 shrink-0">۸.</span>
                          <p><strong>ردیابی و ارتباط زنده:</strong> فعال نگه‌داشتن سامانه موقعیت‌یاب ناوگان در طول مسیر سفر باری.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* LAYOUT 2: FULL COMPREHENSIVE MULTI-PAGE REGULATIONS                       */}
                {/* ========================================================================= */}
                {printLayout === 'FULL' && (
                  <div className="space-y-2.5 mb-3">
                    <div className="text-[8.5pt] font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>متن کامل مواد و بندهای آیین‌نامه انضباطی ناوگان ({toFaDigits(totalClauses)} بند):</span>
                      <span className="text-[8pt] text-slate-500 font-mono">سند تفصیلی</span>
                    </div>

                    {displayedCategories.map((cat, catIdx) => (
                      <div
                        key={cat.id}
                        className="border border-slate-400 rounded-lg p-2 bg-white avoid-page-break"
                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                      >
                        <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5 bg-slate-100 -m-2 p-1.5 rounded-t-lg">
                          <h3 className="font-bold text-[9pt] text-slate-950 flex items-center gap-1.5">
                            <span className="text-amber-800 font-mono">ماده {toFaDigits(catIdx + 1)}:</span>
                            <span>{cat.title}</span>
                          </h3>
                          <span className="text-[8pt] text-slate-600 font-mono">
                            ({toFaDigits(cat.items.length)} بند مصوب)
                          </span>
                        </div>

                        {/* Clauses Items List */}
                        <div className="space-y-1 text-[8.2pt] leading-relaxed">
                          {cat.items.map((item) => (
                            <div
                              key={item.num}
                              className={`flex items-start gap-1.5 ${
                                item.important ? 'font-bold text-slate-950' : 'text-slate-800'
                              }`}
                            >
                              <span className="font-mono font-bold text-slate-900 shrink-0 text-[8pt]">
                                {toFaDigits(item.num)}.
                              </span>
                              <p className="text-justify">{item.text}</p>
                            </div>
                          ))}
                        </div>

                        {/* Warning / Fine Note if present */}
                        {cat.warn && (
                          <div className="mt-1.5 p-1 bg-amber-50 border border-amber-300 rounded text-[7.8pt] text-amber-950 font-semibold">
                            <strong>ضمانت اجرا و کسر کارکرد: </strong>
                            <span>{cat.warn}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ========================================================================= */}
                {/* LAYOUT 3: VIOLATIONS & FINES DEDUCTION SCHEDULE TABLE (1-PAGE A4)          */}
                {/* ========================================================================= */}
                {printLayout === 'VIOLATIONS_ONLY' && (
                  <div className="mb-2 avoid-page-break">
                    <div className="font-bold text-[8.8pt] text-slate-950 mb-1 flex items-center justify-between">
                      <span>جدول رسمی تعرفه جرایم، تخلفات انضباطی و نمرات منفی رانندگان:</span>
                      <span className="text-[8pt] text-slate-600 font-mono">سال جاری</span>
                    </div>

                    <table className="w-full text-right border-collapse border border-slate-400 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                          <th className="p-1.5 border-l border-slate-400 w-8 text-center">ردیف</th>
                          <th className="p-1.5 border-l border-slate-400">عنوان و شرح تخلف</th>
                          <th className="p-1.5 border-l border-slate-400 w-28 text-center">مرتبه اول</th>
                          <th className="p-1.5 border-l border-slate-400 w-28 text-center">مرتبه دوم</th>
                          <th className="p-1.5 w-32 text-center">مرتبه سوم و تکرار</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        <tr>
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono font-bold">۱</td>
                          <td className="p-1.5 border-l border-slate-300 font-medium">تأخیر در بارگیری یا غیبت بدون اطلاع دیسپچ</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">تذکر کتبی + ۱ روز محرومیت</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">۳ روز محرومیت از بار</td>
                          <td className="p-1.5 text-center text-red-950 font-bold">تعلیق پرونده راننده</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono font-bold">۲</td>
                          <td className="p-1.5 border-l border-slate-300 font-medium">دریافت هرگونه وجه اضافی یا انعام از مشتری</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">استرداد وجه + ۵۰۰,۰۰۰ تومان جریمه</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">۱,۵۰۰,۰۰۰ تومان جریمه + توبیخ</td>
                          <td className="p-1.5 text-center text-red-950 font-bold">لغو قرارداد و معرفی به مراجع</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono font-bold">۳</td>
                          <td className="p-1.5 border-l border-slate-300 font-medium">اهمال در مهار بار و بروز خسارت فیزیکی</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">جبران ۱۰۰٪ خسارت وارده</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">جبران خسارت + جریمه انضباطی</td>
                          <td className="p-1.5 text-center text-red-950 font-bold">توقیف سفته ضمانت</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono font-bold">۴</td>
                          <td className="p-1.5 border-l border-slate-300 font-medium">عدم انجام سرویس دوره‌ای روغن در موعد مقرر</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">توقف خودرو تا انجام سرویس</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">۵۰۰,۰۰۰ تومان کسر از کارکرد</td>
                          <td className="p-1.5 text-center text-red-950 font-bold">ارجاع خودرو به انبار مرکزی</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono font-bold">۵</td>
                          <td className="p-1.5 border-l border-slate-300 font-medium">رفتار نامناسب، مشاجره با مشتری یا همکاران</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">درج در پرونده انضباطی</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">۷ روز لغو نوبت بارگیری</td>
                          <td className="p-1.5 text-center text-red-950 font-bold">فسخ یک‌طرفه قرارداد</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono font-bold">۶</td>
                          <td className="p-1.5 border-l border-slate-300 font-medium">خاموش کردن GPS ردیاب یا انحراف از مسیر</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">اخطار شدید کتبی</td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-amber-900">۱,۰۰۰,۰۰۰ تومان کسر کارکرد</td>
                          <td className="p-1.5 text-center text-red-950 font-bold">قطع دسترسی به سامانه</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* LAYOUT 4: STANDALONE AFFIDAVIT & GUARANTOR DETAILS (1-PAGE A4)            */}
                {/* ========================================================================= */}
                {printLayout === 'AFFIDAVIT_STANDALONE' && (
                  <div className="mb-2 avoid-page-break space-y-2">
                    <div className="border border-slate-400 rounded-lg p-2 bg-slate-50 text-[8.2pt]">
                      <div className="font-bold text-slate-900 mb-1 border-b border-slate-300 pb-1">
                        مشخصات ضامن / معرف معتبر راننده (پشتوانه حقوقی قرارداد):
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-600">نام و نام‌خانوادگی ضامن: </span>
                          <strong className="text-slate-950 font-bold">
                            {guarantorName || '.........................................................'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-600">کد ملی ضامن: </span>
                          <strong className="text-slate-950 font-mono font-bold">
                            {guarantorNationalId ? toFaDigits(guarantorNationalId) : '.........................................................'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-600">شغل و محل اشتغال: </span>
                          <strong className="text-slate-950">.........................................................</strong>
                        </div>
                        <div>
                          <span className="text-slate-600">شماره تماس ثابت و همراه: </span>
                          <strong className="text-slate-950">.........................................................</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DRIVER OFFICIAL AFFIDAVIT & SIGNATURE BOX (Shown in all layouts) */}
                <div
                  className="border-2 border-slate-900 rounded-xl p-2.5 bg-slate-50/90 avoid-page-break mt-1"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <div className="text-center font-black text-[9.5pt] text-slate-950 border-b border-slate-400 pb-1 mb-1.5 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-800" />
                    <span>متن اقرارنامه کتبی، تعهد محضری و ضمانت اجرای انضباطی راننده</span>
                  </div>

                  <p className="text-[8.2pt] text-justify leading-relaxed text-slate-950 font-medium">
                    {cleanAffidavitText}
                  </p>

                  {/* Three Official Signature & Stamp Blocks */}
                  <div className="grid grid-cols-3 gap-2 pt-2 mt-2 border-t border-slate-400 text-[8.2pt] text-center">
                    {/* Driver Signature Box */}
                    <div className="border border-slate-800 rounded-lg p-1.5 min-h-[80px] flex flex-col justify-between bg-white shadow-2xs">
                      <div className="font-bold text-slate-950 text-[8.5pt]">
                        امضا و اثر انگشت سبابه راننده
                      </div>
                      <div className="text-[7.5pt] text-slate-600">
                        {driverName || '.............................'}
                      </div>
                      <div className="text-[7.5pt] text-slate-700 font-mono font-bold">
                        تاریخ: {toFaDigits(issueDate)}
                      </div>
                    </div>

                    {/* Fleet Dispatch Supervisor Box */}
                    <div className="border border-slate-800 rounded-lg p-1.5 min-h-[80px] flex flex-col justify-between bg-white shadow-2xs">
                      <div className="font-bold text-slate-950 text-[8.5pt]">
                        تأیید سرپرست دیسپچ و امور رانندگان
                      </div>
                      <div className="text-[7.5pt] text-slate-600">
                        واحد بازرسی و نظارت ناوگان
                      </div>
                      <div className="text-[7.5pt] text-slate-700 font-mono font-bold">
                        امضا و تاریخ کارشناس
                      </div>
                    </div>

                    {/* General Manager Stamp Box */}
                    <div className="border border-slate-800 rounded-lg p-1.5 min-h-[80px] flex flex-col justify-between bg-white shadow-2xs">
                      <div className="font-bold text-slate-950 text-[8.5pt]">
                        مهر رسمی و تأیید مدیریت عملیات
                      </div>
                      <div className="text-[7.5pt] text-slate-600">
                        مدیریت ترابری شرکت
                      </div>
                      <div className="text-[7.5pt] text-slate-400 font-mono">
                        محل درج مهر برجسته
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official A4 Footer Note (Strictly NO Hami Bar) */}
              <div className="mt-2 text-center text-[7pt] text-slate-600 font-mono border-t border-slate-300 pt-1 flex items-center justify-between avoid-page-break">
                <span>سامانه جامع مدیریت ناوگان و حمل‌ونقل جاده‌ای — نسخه رسمی مصوب هیئت مدیره و کمیسیون انضباطی</span>
                <span>قطع استاندارد A4 (۲۱۰ × ۲۹۷ میلی‌متر)</span>
                <span>کد رهگیری سند: IR-TR-REG-A4-{toFaDigits(docNumber.replace(/[^\d]/g, '') || '1405')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
