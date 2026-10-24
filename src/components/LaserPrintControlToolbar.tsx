import React, { FC, useState } from 'react';
import {
  Printer,
  Sparkles,
  Check,
  Save,
  Sliders,
  Type,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  PrintWatermarkSettings,
  WATERMARK_PRESETS,
  saveStoredPrintSettings,
} from '../utils/printSettings';
import { toFaDigits } from '../utils/jalaali';

interface LaserPrintControlToolbarProps {
  settings: PrintWatermarkSettings;
  onChange: (updated: PrintWatermarkSettings) => void;
  onPrint: () => void;
  title?: string;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LaserPrintControlToolbar: FC<LaserPrintControlToolbarProps> = ({
  settings,
  onChange,
  onPrint,
  title = 'سند چاپی',
  onShowToast,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handlePresetSelect = (presetText: string, presetSubText: string) => {
    onChange({
      ...settings,
      text: presetText,
      subText: presetSubText,
    });
  };

  const handleSaveAsDefault = () => {
    saveStoredPrintSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    if (onShowToast) {
      onShowToast('تنظیمات واترمارک و چاپ به عنوان پیش‌فرض سیستم ذخیره شد.', 'success');
    }
  };

  return (
    <div className="bg-[#0b1325] border-b border-slate-700/80 p-3 sm:p-4 text-xs select-none no-print">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Laser Print & Watermark Quick Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Laser Mode Badge & Toggle */}
          <button
            type="button"
            onClick={() => onChange({ ...settings, laserMode: !settings.laserMode })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
              settings.laserMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="حذف کلیه پس‌زمینه‌های گرافیکی و چاپ بهینه با کنتراست بالا مخصوص پرینترهای لیزری"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.laserMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>بهینه‌سازی پرینتر لیزری:</span>
            <span className="font-mono">{settings.laserMode ? 'فعال (تک‌رنگ/بدون پس‌زمینه)' : 'عادی'}</span>
          </button>

          {/* Watermark Toggle */}
          <button
            type="button"
            onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
              settings.enabled
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {settings.enabled ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>واترمارک:</span>
            <span>{settings.enabled ? 'روشن' : 'خاموش'}</span>
          </button>

          {/* Direct Watermark Text Input */}
          {settings.enabled && (
            <div className="flex items-center gap-1.5 bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-1 min-w-[200px]">
              <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="text"
                value={settings.text}
                onChange={(e) => onChange({ ...settings, text: e.target.value })}
                placeholder="متن واترمارک دلخواه..."
                className="bg-transparent border-none text-white text-xs outline-none w-full placeholder-slate-500 font-bold"
              />
            </div>
          )}

          {/* Watermark Presets */}
          {settings.enabled && (
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-slate-400 text-[11px] ml-1">قالب‌های سریع:</span>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[280px]">
                {WATERMARK_PRESETS.slice(0, 4).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetSelect(preset.text, preset.subText)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer whitespace-nowrap ${
                      settings.text === preset.text
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Advanced */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="تنظیمات پیشرفته واترمارک و فونت"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
          <button
            type="button"
            onClick={handleSaveAsDefault}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 font-bold cursor-pointer"
            title="ذخیره این واترمارک برای تمامی گزارش‌ها و اسناد چاپی بعدی سیستم"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-sky-400" />}
            <span>{isSaved ? 'ذخیره شد' : 'ثبت پیش‌فرض'}</span>
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5 transition shadow-md shadow-amber-950/30 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ (پرینتر لیزری)</span>
          </button>
        </div>
      </div>

      {/* Advanced Settings Drawer */}
      {isAdvancedOpen && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-100 bg-[#070d18] p-3 rounded-xl border border-slate-800">
          {/* Subtext */}
          <div>
            <label className="block text-slate-400 text-[11px] font-bold mb-1">
              متن انگلیسی / زیرنویس واترمارک:
            </label>
            <input
              type="text"
              value={settings.subText}
              onChange={(e) => onChange({ ...settings, subText: e.target.value })}
              placeholder="مثال: OFFICIAL DIRECTIVE"
              className="w-full bg-[#0d1627] border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono outline-none"
            />
          </div>

          {/* Opacity for laser toner */}
          <div>
            <label className="block text-slate-400 text-[11px] font-bold mb-1">
              کمرنگی واترمارک مخصوص پرینتر لیزری (کنتراست {toFaDigits(Math.round(settings.opacity * 100))}٪):
            </label>
            <input
              type="range"
              min="0.02"
              max="0.12"
              step="0.01"
              value={settings.opacity}
              onChange={(e) => onChange({ ...settings, opacity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>۲٪ (بسیار ملایم)</span>
              <span>۴٪ (استاندارد لیزری)</span>
              <span>۱۲٪ (پررنگ)</span>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-slate-400 text-[11px] font-bold mb-1">
              اندازه فونت واترمارک ({toFaDigits(settings.fontSizePt)} pt):
            </label>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={settings.fontSizePt}
              onChange={(e) => onChange({ ...settings, fontSizePt: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>۴۰ pt</span>
              <span>۶۵ pt (پیش‌فرض)</span>
              <span>۹۰ pt</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
