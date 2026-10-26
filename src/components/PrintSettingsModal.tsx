import React, { FC, useState, useEffect } from 'react';
import {
  Printer,
  Sparkles,
  Check,
  Save,
  Type,
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  X,
  FileText,
  ShieldCheck,
  Building,
} from 'lucide-react';
import {
  PrintWatermarkSettings,
  DEFAULT_PRINT_SETTINGS,
  WATERMARK_PRESETS,
  getStoredPrintSettings,
  saveStoredPrintSettings,
} from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { toFaDigits } from '../utils/jalaali';

interface PrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: PrintWatermarkSettings) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrintSettingsModal: FC<PrintSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onShowToast,
}) => {
  const [settings, setSettings] = useState<PrintWatermarkSettings>(getStoredPrintSettings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredPrintSettings());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredPrintSettings(settings);
    if (onSave) onSave(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    if (onShowToast) {
      onShowToast('تنظیمات واتر مارک و چاپگر لیزری با موفقیت ثبت و ذخیره شد.', 'success');
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_PRINT_SETTINGS);
    saveStoredPrintSettings(DEFAULT_PRINT_SETTINGS);
    if (onSave) onSave(DEFAULT_PRINT_SETTINGS);
    if (onShowToast) {
      onShowToast('تنظیمات به حالت پیش‌فرض اولیه بازگردانده شد.', 'info');
    }
  };

  const handlePresetSelect = (text: string, subText: string) => {
    setSettings((prev) => ({
      ...prev,
      text,
      subText,
      enabled: true,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-[#0b1325] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>ثبت و تنظیمات واتر مارک و چاپ پرینتر لیزری</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  بدون بک‌گراند گرافیکی
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                شخصی‌سازی متن واترمارک امنیتی و بهینه‌سازی کلیه اسناد و گزارش‌ها جهت چاپ کم‌مصرف روی پرینترهای لیزری
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Two columns (Controls on Right, Live Preview on Left) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 custom-scrollbar text-xs">
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Laser Printer Optimization Status Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">حالت بهینه پرینتر لیزری (Laser Safe)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, laserMode: !s.laserMode }))}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                    settings.laserMode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.laserMode ? 'فعال (تک‌رنگ با وضوح بالا)' : 'غیرفعال'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                در حالت بهینه لیزری، تمام پس‌زمینه‌های گرافیکی تیره، سایه‌ها و بافت‌ها به صورت خودکار حذف شده و متون با مشکی خالص و کادرهای خطی پرینت می‌شوند تا در مصرف کارتریج و تونر صرفه‌جویی شده و برگه‌ها سیاه نشوند.
              </p>
            </div>

            {/* Watermark Activation & Text Input */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-amber-400" />
                  <span>ثبت متن واتر مارک سفارشی</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                    settings.enabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.enabled ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>نمایش واتر مارک: روشن</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>نمایش واتر مارک: خاموش</span>
                    </>
                  )}
                </button>
              </div>

              {/* Main Text Input */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-300 font-medium">متن اصلی واترمارک (به صورت مورب در مرکز برگه چاپ می‌شود):</span>
                <input
                  type="text"
                  value={settings.text}
                  onChange={(e) => setSettings((s) => ({ ...s, text: e.target.value }))}
                  placeholder="مثال: شرکت حمل و نقل حامی / محرمانه / ابلاغیه رسمی"
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-amber-400 text-xs transition"
                  disabled={!settings.enabled}
                />
              </div>

              {/* Sub-text Input */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-300 font-medium">زیرعنوان واترمارک (اختیاری - انگلیسی یا سازمانی):</span>
                <input
                  type="text"
                  value={settings.subText}
                  onChange={(e) => setSettings((s) => ({ ...s, subText: e.target.value }))}
                  placeholder="مثال: OFFICIAL DOCUMENT / CONFIDENTIAL / نسخه بایگانی"
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400 text-xs transition"
                  disabled={!settings.enabled}
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-semibold">قالب‌های سریع واترمارک آماده:</span>
                <div className="flex flex-wrap gap-1.5">
                  {WATERMARK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePresetSelect(preset.text, preset.subText)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                        settings.text === preset.text
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fine-Tuning: Opacity & Font Size */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3.5">
              <div className="font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>تنظیم غلظت چاپ و اندازه قلم (ویژه کارتریج لیزری)</span>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">غلظت واترمارک (Opacity):</span>
                  <span className="font-mono text-amber-300 font-bold">
                    %{toFaDigits(Math.round(settings.opacity * 100))}
                    {settings.opacity <= 0.05 ? ' (بهینه و استاندارد لیزری)' : ' (پررنگ‌تر)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.15"
                  step="0.01"
                  value={settings.opacity}
                  onChange={(e) => setSettings((s) => ({ ...s, opacity: parseFloat(e.target.value) }))}
                  className="w-full accent-amber-400 cursor-pointer"
                  disabled={!settings.enabled}
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>%۲ (بسیار ملایم)</span>
                  <span>%۵ (پیش‌فرض لیزری)</span>
                  <span>%۱۵ (پررنگ)</span>
                </div>
              </div>

              {/* Font Size Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">اندازه قلم واترمارک:</span>
                  <span className="font-mono text-sky-300 font-bold">{toFaDigits(settings.fontSizePt)} pt</span>
                </div>
                <input
                  type="range"
                  min="36"
                  max="90"
                  step="2"
                  value={settings.fontSizePt}
                  onChange={(e) => setSettings((s) => ({ ...s, fontSizePt: parseInt(e.target.value, 10) }))}
                  className="w-full accent-sky-400 cursor-pointer"
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          {/* Live A4 Print Preview Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full mb-2 flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>پیش‌نمایش زنده برگه چاپ لیزری (A4)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">بدون پس‌زمینه گرافیکی</span>
            </div>

            {/* Simulated Clean White A4 Paper with Crisp Laser Lines */}
            <div className="w-full max-w-[340px] aspect-[1/1.414] bg-white text-black rounded-lg border-2 border-black p-4 shadow-xl relative overflow-hidden flex flex-col justify-between select-none">
              {/* Watermark Rendering */}
              <LaserPrintWatermark
                enabled={settings.enabled}
                text={settings.text}
                subText={settings.subText}
                opacity={settings.opacity}
                fontSizePt={Math.round(settings.fontSizePt * 0.45)}
              />

              {/* Header Outline */}
              <div className="relative z-10 border-b border-black pb-2 flex items-center justify-between">
                <div>
                  <div className="font-black text-[11px] text-black">شرکت حمل و نقل و لجستیک</div>
                  <div className="text-[8px] text-black">گزارش رسمی سامانه عملیات</div>
                </div>
                <div className="text-left font-mono text-[8px] text-black">
                  <div>تاریخ: ۱۴۰۵/۰۷/۲۷</div>
                  <div>شماره: ۱۰۴۹۲</div>
                </div>
              </div>

              {/* Sample Document Table Structure (Laser Crisp Grid) */}
              <div className="relative z-10 my-auto space-y-2">
                <div className="border border-black text-[8px] text-center font-bold py-1 bg-white">
                  عنوان سند چاپی: نمونه بهینه‌سازی پرینتر لیزری
                </div>

                <table className="w-full border-collapse border border-black text-[7.5px] text-center">
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th className="border-l border-black p-1">ردیف</th>
                      <th className="border-l border-black p-1">شرح مدرک</th>
                      <th className="border-l border-black p-1">وضعیت</th>
                      <th className="p-1">تأییدیه</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-l border-black p-0.5 font-mono">۱</td>
                      <td className="border-l border-black p-0.5">بیمه‌نامه و معاینه فنی</td>
                      <td className="border-l border-black p-0.5">معتبر</td>
                      <td className="p-0.5">✓</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-l border-black p-0.5 font-mono">۲</td>
                      <td className="border-l border-black p-0.5">بارنامه و فاکتور رسمی</td>
                      <td className="border-l border-black p-0.5">صادر شده</td>
                      <td className="p-0.5">✓</td>
                    </tr>
                    <tr>
                      <td className="border-l border-black p-0.5 font-mono">۳</td>
                      <td className="border-l border-black p-0.5">آئین‌نامه و ابلاغیه</td>
                      <td className="border-l border-black p-0.5">نهایی</td>
                      <td className="p-0.5">✓</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border border-black p-1.5 text-[7px] text-black leading-tight">
                  <div className="font-bold">تعهدات و امضاء:</div>
                  کلیه حقوق این سند محفوظ بوده و فاقد هرگونه پس‌زمینه رنگی جهت حفظ وضوح پرینتر لیزری می‌باشد.
                </div>
              </div>

              {/* Signatures Area */}
              <div className="relative z-10 border-t border-black pt-2 flex justify-between text-[7.5px] font-bold text-black">
                <div>امضاء متصدی</div>
                <div>مهر و امضاء امور مالی</div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-2 text-center">
              این تنظیمات به عنوان الگو در تمامی گزارش‌ها و اسناد چاپی اعمال خواهد شد.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>بازنشانی به پیش‌فرض</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>با موفقیت ثبت و ذخیره شد</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>ثبت و ذخیره تنظیمات چاپ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
