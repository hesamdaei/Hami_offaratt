import { FC, useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  X,
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Camera,
  Car,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Gauge,
  Layers,
  Check,
} from 'lucide-react';
import { toFaDigits } from '../utils/jalaali';

export interface DocSlot {
  key: string;
  label: string;
  subLabel?: string;
  icon?: any;
  category?: 'photo' | 'document';
  direction?: 'front' | 'rear' | 'right' | 'left' | 'dashboard';
  required?: boolean;
}

export const VEHICLE_FULL_SLOTS: DocSlot[] = [
  // 5-Angle Vehicle Photos
  {
    key: 'photoFront',
    label: 'نمای جلو و پلاک',
    subLabel: 'تصویر مستقیم جلو، چراغ‌ها، جلوپنجره و پلاک',
    icon: ArrowUp,
    category: 'photo',
    direction: 'front',
  },
  {
    key: 'photoRear',
    label: 'نمای عقب و بارگیر',
    subLabel: 'تصویر پشت خودرو، درب اتاق بار و پلاک عقب',
    icon: ArrowDown,
    category: 'photo',
    direction: 'rear',
  },
  {
    key: 'photoRight',
    label: 'نمای بغل راست',
    subLabel: 'تصویر نیم‌رخ سمت شاگرد، تایرها و بدنه راست',
    icon: ArrowRight,
    category: 'photo',
    direction: 'right',
  },
  {
    key: 'photoLeft',
    label: 'نمای بغل چپ (راننده)',
    subLabel: 'تصویر نیم‌رخ سمت راننده، آینه و بدنه چپ',
    icon: ArrowLeft,
    category: 'photo',
    direction: 'left',
  },
  {
    key: 'photoDashboard',
    label: 'نمای داشبورد و کیلومتر',
    subLabel: 'تصویر صفحه کیلومتر، نشانگرها و کابین داخلی',
    icon: Gauge,
    category: 'photo',
    direction: 'dashboard',
  },

  // Legal & Registration Documents
  {
    key: 'vehicleCard',
    label: 'کارت هوشمند خودرو',
    subLabel: 'تصویر پشت و روی کارت مشخصات مالکیت خودرو',
    icon: FileText,
    category: 'document',
  },
  {
    key: 'greenPaper',
    label: 'برگ سبز و سند رسمی',
    subLabel: 'سند رسمی مالکیت صادره از راهور فراجا',
    icon: ShieldCheck,
    category: 'document',
  },
  {
    key: 'thirdPartyInsurance',
    label: 'بیمه‌نامه شخص ثالث',
    subLabel: 'بیمه‌نامه معتبر مسئولیت مدنی و جانی',
    icon: ShieldCheck,
    category: 'document',
  },
  {
    key: 'inspectionCert',
    label: 'گواهی معاینه فنی',
    subLabel: 'برگه تاییدیه سلامت مکانیزه و آلایندگی',
    icon: CheckCircle2,
    category: 'document',
  },
  {
    key: 'bodyInsurance',
    label: 'بیمه‌نامه بدنه',
    subLabel: 'پوشش تکمیلی بیمه خسارت بدنه خودرو',
    icon: FileText,
    category: 'document',
  },
];

interface DocumentUploaderModalProps {
  isOpen: boolean;
  title: string;
  subTitle?: string;
  slots: DocSlot[];
  documents: Record<string, string | undefined>;
  onSave: (updatedDocs: Record<string, string | undefined>) => void;
  onClose: () => void;
}

// Compress image via Canvas to prevent LocalStorage quota overflow
const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = elem.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const DocumentUploaderModal: FC<DocumentUploaderModalProps> = ({
  isOpen,
  title,
  subTitle,
  slots,
  documents,
  onSave,
  onClose,
}) => {
  const [currentDocs, setCurrentDocs] = useState<Record<string, string | undefined>>(() => {
    const docs = { ...(documents || {}) };
    // Maintain backwards compatibility: vehiclePhoto maps to photoFront if photoFront missing
    if (docs.vehiclePhoto && !docs.photoFront) {
      docs.photoFront = docs.vehiclePhoto;
    }
    return docs;
  });

  const [activeSlotKey, setActiveSlotKey] = useState<string>(slots[0]?.key || 'photoFront');
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'PHOTOS' | 'DOCS'>('ALL');
  const [previewImage, setPreviewImage] = useState<{ title: string; src: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGalleryView, setShowGalleryView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری (JPG, PNG, WebP) انتخاب فرمایید.');
      return;
    }

    try {
      setIsProcessing(true);
      const compressedDataUrl = await compressImage(file);
      const updated = {
        ...currentDocs,
        [activeSlotKey]: compressedDataUrl,
      };
      // Keep legacy vehiclePhoto synchronized if uploading photoFront
      if (activeSlotKey === 'photoFront') {
        updated.vehiclePhoto = compressedDataUrl;
      }
      setCurrentDocs(updated);
    } catch (err) {
      console.error('Error compressing image', err);
      alert('خطا در پردازش تصویر، لطفاً مجدداً تلاش کنید.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteDoc = (key: string) => {
    const updated = { ...currentDocs };
    delete updated[key];
    if (key === 'photoFront') {
      delete updated.vehiclePhoto;
    }
    setCurrentDocs(updated);
  };

  const handleSaveAndClose = () => {
    const finalDocs = { ...currentDocs };
    if (finalDocs.photoFront && !finalDocs.vehiclePhoto) {
      finalDocs.vehiclePhoto = finalDocs.photoFront;
    }
    onSave(finalDocs);
    onClose();
  };

  // Generate authentic Vector SVG placeholders for each angle / doc
  const handleInsertSample = (key: string, label: string) => {
    let svgString = '';

    if (key === 'photoFront') {
      // Front View SVG
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="100%" height="100%" fill="#090d16"/>
        <rect x="140" y="70" width="320" height="260" rx="20" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/>
        <rect x="170" y="90" width="260" height="110" rx="10" fill="#0f172a" stroke="#475569" stroke-width="2"/>
        <circle cx="185" cy="235" r="22" fill="#eab308" stroke="#fef08a" stroke-width="3"/>
        <circle cx="415" cy="235" r="22" fill="#eab308" stroke="#fef08a" stroke-width="3"/>
        <rect x="230" y="220" width="140" height="30" rx="5" fill="#334155"/>
        <rect x="220" y="270" width="160" height="36" rx="4" fill="#ffc20e" stroke="#000" stroke-width="2"/>
        <text x="300" y="294" fill="#000" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">۱۲ ع ۳۴۵ - ۱۱</text>
        <text x="300" y="45" fill="#38bdf8" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">نمای جلو و پلاک ناوگان</text>
      </svg>`;
    } else if (key === 'photoRear') {
      // Rear View SVG
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="100%" height="100%" fill="#090d16"/>
        <rect x="130" y="60" width="340" height="270" rx="12" fill="#1e293b" stroke="#ef4444" stroke-width="3"/>
        <line x1="300" y1="60" x2="300" y2="280" stroke="#475569" stroke-width="3"/>
        <rect x="150" y="230" width="40" height="30" rx="4" fill="#ef4444" stroke="#fca5a5" stroke-width="2"/>
        <rect x="410" y="230" width="40" height="30" rx="4" fill="#ef4444" stroke="#fca5a5" stroke-width="2"/>
        <rect x="220" y="275" width="160" height="36" rx="4" fill="#ffc20e" stroke="#000" stroke-width="2"/>
        <text x="300" y="299" fill="#000" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">۱۲ ع ۳۴۵ - ۱۱</text>
        <text x="300" y="40" fill="#f87171" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">نمای عقب و بارگیر خودرو</text>
      </svg>`;
    } else if (key === 'photoRight') {
      // Right Side View SVG
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="100%" height="100%" fill="#090d16"/>
        <rect x="70" y="100" width="300" height="170" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
        <path d="M 370 140 L 460 140 L 490 190 L 490 270 L 370 270 Z" fill="#334155" stroke="#3b82f6" stroke-width="2"/>
        <circle cx="160" cy="270" r="32" fill="#020617" stroke="#64748b" stroke-width="8"/>
        <circle cx="430" cy="270" r="32" fill="#020617" stroke="#64748b" stroke-width="8"/>
        <text x="300" y="55" fill="#38bdf8" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">نمای نیم‌رخ بغل راست (شاگرد)</text>
      </svg>`;
    } else if (key === 'photoLeft') {
      // Left Side View SVG
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="100%" height="100%" fill="#090d16"/>
        <path d="M 230 140 L 140 140 L 110 190 L 110 270 L 230 270 Z" fill="#334155" stroke="#3b82f6" stroke-width="2"/>
        <rect x="230" y="100" width="300" height="170" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
        <circle cx="170" cy="270" r="32" fill="#020617" stroke="#64748b" stroke-width="8"/>
        <circle cx="440" cy="270" r="32" fill="#020617" stroke="#64748b" stroke-width="8"/>
        <text x="300" y="55" fill="#38bdf8" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">نمای نیم‌رخ بغل چپ (راننده)</text>
      </svg>`;
    } else if (key === 'photoDashboard') {
      // Dashboard View SVG
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="100%" height="100%" fill="#090d16"/>
        <path d="M 50 350 L 120 180 L 480 180 L 550 350 Z" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
        <circle cx="210" cy="260" r="55" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
        <circle cx="390" cy="260" r="55" fill="#0f172a" stroke="#10b981" stroke-width="3"/>
        <rect x="275" y="240" width="50" height="30" rx="4" fill="#020617" stroke="#64748b"/>
        <text x="300" y="260" fill="#38bdf8" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">185,420 KM</text>
        <text x="300" y="70" fill="#38bdf8" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">داشبورد و کیلومترشمار کابین</text>
      </svg>`;
    } else {
      // General official document SVG
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="100%" height="100%" fill="#0e172a" rx="16"/>
        <rect x="20" y="20" width="560" height="360" fill="#1e293b" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6,6" rx="12"/>
        <text x="300" y="80" fill="#38bdf8" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">سامانه جامع بایگانی لجستیک حامی</text>
        <text x="300" y="125" fill="#f8fafc" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">${label}</text>
        <line x1="80" y1="155" x2="520" y2="155" stroke="#475569" stroke-width="1.5"/>
        <text x="300" y="200" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">شناسه تایید دیجیتال: HAMI-${Date.now().toString().slice(-6)}</text>
        <text x="300" y="240" fill="#10b981" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">✓ اصالت و اعتبار سند توسط کارشناس تایید گردید</text>
        <circle cx="300" cy="310" r="38" fill="#3b82f6" fill-opacity="0.15" stroke="#38bdf8" stroke-width="2"/>
        <text x="300" y="315" fill="#38bdf8" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">مهر بایگانی</text>
      </svg>`;
    }

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    const updated = {
      ...currentDocs,
      [key]: dataUri,
    };
    if (key === 'photoFront') {
      updated.vehiclePhoto = dataUri;
    }
    setCurrentDocs(updated);
  };

  const photoSlots = slots.filter((s) => s.category === 'photo' || s.key.startsWith('photo'));
  const docSlots = slots.filter((s) => s.category !== 'photo' && !s.key.startsWith('photo'));

  const filteredSlots =
    activeTabFilter === 'PHOTOS'
      ? photoSlots
      : activeTabFilter === 'DOCS'
      ? docSlots
      : slots;

  const activeSlot = slots.find((s) => s.key === activeSlotKey) || slots[0];
  const activeImage = currentDocs[activeSlotKey];
  const totalUploaded = Object.keys(currentDocs).filter((k) => !!currentDocs[k]).length;
  const photosUploadedCount = photoSlots.filter((s) => !!currentDocs[s.key]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-[#1e293b] bg-[#0c1322] shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>{title}</span>
                <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                  {toFaDigits(totalUploaded)} از {toFaDigits(slots.length)} ثبت شده
                </span>
              </h2>
              {subTitle && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{subTitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {photoSlots.length > 0 && (
              <button
                onClick={() => setShowGalleryView(!showGalleryView)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                  showGalleryView
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30'
                    : 'bg-[#182338] text-slate-300 border-[#253655] hover:bg-[#202f4a]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">{showGalleryView ? 'بازگشت به ویرایش' : 'گالری ۵ جهته'}</span>
                <span className="sm:hidden">{showGalleryView ? 'ویرایش' : 'گالری'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5-Direction Quick Photo Visual Bar (If vehicle photos exist in slots) */}
        {photoSlots.length >= 4 && (
          <div className="bg-[#090d16] border-b border-[#1e293b] px-3.5 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
              <Compass className="w-4 h-4 text-blue-400 animate-spin-slow shrink-0" />
              <span>پایش تصاویر پنج‌گانه:</span>
              <span className="text-xs text-emerald-400 font-mono">
                ({toFaDigits(photosUploadedCount)} از ۵ جهت)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full pb-0.5 sm:pb-0 shrink-0">
              {photoSlots.map((ps) => {
                const isUploaded = !!currentDocs[ps.key];
                const isActive = ps.key === activeSlotKey;
                const Icon = ps.icon || Car;

                return (
                  <button
                    key={ps.key}
                    onClick={() => {
                      setActiveSlotKey(ps.key);
                      setShowGalleryView(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 ${
                      isActive
                        ? 'bg-blue-600/25 text-blue-300 border-blue-500 shadow-xs'
                        : isUploaded
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-[#131d2e] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{ps.label.split(' ')[1] || ps.label}</span>
                    {isUploaded && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Multi-Angle 5-Direction Gallery Overview */}
        {showGalleryView ? (
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#0a0f1d] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>نمای جامع تصاویر ۵ جهته خودرو (چهار جهت + داشبورد)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  جهت اطمینان از سلامت ظاهری، بدنه، پلاک و صفحه کیلومتر خودرو
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photoSlots.map((slot) => {
                const img = currentDocs[slot.key];
                const Icon = slot.icon || Car;

                return (
                  <div
                    key={slot.key}
                    className="bg-[#111a2e] border border-[#1f2c45] rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-200 text-xs">{slot.label}</span>
                      </div>

                      {img ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">
                          ثبت شده
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-semibold">
                          فاقد تصویر
                        </span>
                      )}
                    </div>

                    <div className="h-40 bg-[#090d16] rounded-lg border border-[#1a263b] overflow-hidden flex items-center justify-center relative group">
                      {img ? (
                        <>
                          <img src={img} alt={slot.label} className="h-full w-full object-contain" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => setPreviewImage({ title: slot.label, src: img })}
                              className="p-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>بزرگنمایی</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveSlotKey(slot.key);
                                setShowGalleryView(false);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-3">
                          <Camera className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                          <p className="text-[11px] text-slate-400">تصویری ثبت نشده است</p>
                          <button
                            onClick={() => {
                              setActiveSlotKey(slot.key);
                              setShowGalleryView(false);
                            }}
                            className="mt-2 text-[11px] font-bold text-blue-400 hover:underline"
                          >
                            + ثبت تصویر این جهت
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 truncate">{slot.subLabel}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Normal Split Upload & Edit View */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-l border-[#1e293b] bg-[#0a0f1d] p-3 space-y-2 overflow-y-auto custom-scrollbar">
              {/* Category Filter Tabs */}
              {photoSlots.length > 0 && docSlots.length > 0 && (
                <div className="flex items-center gap-1 p-1 bg-[#121b2d] rounded-xl border border-[#1f2b42] text-[11px]">
                  <button
                    onClick={() => setActiveTabFilter('ALL')}
                    className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                      activeTabFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    همه ({toFaDigits(slots.length)})
                  </button>
                  <button
                    onClick={() => setActiveTabFilter('PHOTOS')}
                    className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                      activeTabFilter === 'PHOTOS'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    تصاویر ({toFaDigits(photoSlots.length)})
                  </button>
                  <button
                    onClick={() => setActiveTabFilter('DOCS')}
                    className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                      activeTabFilter === 'DOCS'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    اسناد ({toFaDigits(docSlots.length)})
                  </button>
                </div>
              )}

              <div className="text-[11px] font-bold text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>فهرست موارد انتخابی</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {toFaDigits(filteredSlots.length)} مورد
                </span>
              </div>

              <div className="space-y-1">
                {filteredSlots.map((slot) => {
                  const isSelected = slot.key === activeSlotKey;
                  const hasDoc = !!currentDocs[slot.key];
                  const Icon = slot.icon || FileText;

                  return (
                    <button
                      key={slot.key}
                      onClick={() => setActiveSlotKey(slot.key)}
                      className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 border ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold shadow-xs'
                          : 'border-transparent text-slate-300 hover:bg-[#152033] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            hasDoc
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isSelected
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs truncate">{slot.label}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {slot.subLabel || 'تصویر یا اسکن'}
                          </div>
                        </div>
                      </div>

                      <div>
                        {hasDoc ? (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-xs shadow-emerald-500/50"
                            title="تصویر ثبت شده"
                          />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" title="فاقد تصویر" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Slot Workspace */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-4 bg-[#0d1424]">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                      <span>{activeSlot.label}</span>
                      {currentDocs[activeSlotKey] ? (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تصویر ثبت شده
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          نیازمند ثبت تصویر
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeSlot.subLabel || 'تصویر واضح و باکیفیت بارگذاری فرمایید.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInsertSample(activeSlotKey, activeSlot.label)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="ایجاد تصویر گرافیکی شبیه‌سازی شده استاندارد"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ثبت نمونه هوشمند</span>
                    </button>
                  </div>
                </div>

                {/* Upload or Preview Display */}
                {activeImage ? (
                  <div className="space-y-3">
                    <div className="relative group rounded-2xl border border-[#233554] bg-[#070b14] overflow-hidden flex items-center justify-center min-h-[250px] max-h-[360px]">
                      <img
                        src={activeImage}
                        alt={activeSlot.label}
                        className="max-h-[340px] w-auto object-contain rounded-xl"
                      />

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                        <button
                          onClick={() => setPreviewImage({ title: activeSlot.label, src: activeImage })}
                          className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-lg flex items-center gap-1.5 text-xs font-bold transition-transform hover:scale-105"
                        >
                          <Eye className="w-4 h-4" />
                          <span>مشاهده تمام‌صفحه</span>
                        </button>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 flex items-center gap-1.5 text-xs font-semibold transition-transform hover:scale-105"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>جایگزینی تصویر</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDoc(activeSlotKey)}
                          className="p-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white flex items-center gap-1.5 text-xs font-semibold transition-transform hover:scale-105"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 bg-[#090e1a] p-3 rounded-xl border border-[#1e293b]">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <Check className="w-4 h-4" />
                        تصویر با موفقیت در مخزن دیجیتال ناوگان ثبت گردید.
                      </span>
                      <button
                        onClick={() => setPreviewImage({ title: activeSlot.label, src: activeImage })}
                        className="text-blue-400 hover:underline font-bold"
                      >
                        بزرگنمایی تصویر
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-all ${
                      isDragging
                        ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
                        : 'border-[#263753] bg-[#090e1a] hover:border-blue-500/60 hover:bg-[#0c1322]'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                      <Upload className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">
                      تصویر «{activeSlot.label}» را اینجا بکشید یا انتخاب کنید
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      تصاویر خودرو از چهار جهت اصلی (جلو، عقب، راست، چپ) و داشبورد جهت کنترل کیفیت، سلامت ظاهری و مستندسازی در سیستم بایگانی می‌شوند.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>انتخاب فایل تصویر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span>عکاسی مستقیم با دوربین</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleInputChange}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleInputChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
              </div>

              {/* Bottom Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1e293b]">
                <div className="text-[11px] text-slate-400">
                  فرمت‌های مجاز: JPG, PNG, WebP با پردازش و بهینه‌سازی خودکار
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndClose}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ذخیره و ثبت نهایی اسناد</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#090d16]">
              <h3 className="font-bold text-white text-sm">{previewImage.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.src}
                  download={`${previewImage.title}.jpg`}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  title="دانلود تصویر"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/40 overflow-auto">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
