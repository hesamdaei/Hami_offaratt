import { FC, useState, useEffect, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Wrench,
  Download,
  Copy,
  Check,
  Search,
  RotateCcw,
  ShieldCheck,
  Database,
  Calendar,
  Phone,
  FileCode2,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import {
  runComprehensiveDiagnosticScan,
  performAutoRepair,
  resetStorageToCleanSeed,
  DiagnosticReport,
  DiagnosticIssue,
  DiagnosticSource,
  DiagnosticSeverity,
  DIAGNOSTIC_SOURCE_LABELS,
} from '../utils/dataIntegrityValidator';
import { toFaDigits } from '../utils/jalaali';

interface DataIntegrityDiagnosticTabProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onDataRepaired?: () => void;
}

export const DataIntegrityDiagnosticTab: FC<DataIntegrityDiagnosticTabProps> = ({
  onShowToast,
  onDataRepaired,
}) => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'ALL' | DiagnosticSource>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | DiagnosticSeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoRepairResult, setAutoRepairResult] = useState<string | null>(null);

  // Initial Scan
  const executeScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      try {
        const result = runComprehensiveDiagnosticScan();
        setReport(result);
      } catch (err: any) {
        onShowToast(`خطا در اسکن داده‌ها: ${err?.message}`, 'error');
      } finally {
        setIsScanning(false);
      }
    }, 200);
  };

  useEffect(() => {
    executeScan();
  }, []);

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    if (!report) return [];
    return report.issues.filter((issue) => {
      if (selectedSource !== 'ALL' && issue.source !== selectedSource) return false;
      if (selectedSeverity !== 'ALL' && issue.severity !== selectedSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRecord = issue.recordTitle.toLowerCase().includes(q);
        const matchesField = issue.field.toLowerCase().includes(q) || issue.fieldLabel.toLowerCase().includes(q);
        const matchesMsg = issue.message.toLowerCase().includes(q) || issue.recommendation.toLowerCase().includes(q);
        const matchesCode = String(issue.recordCode || '').includes(q);
        const matchesVal = String(issue.currentValue || '').toLowerCase().includes(q);
        if (!matchesRecord && !matchesField && !matchesMsg && !matchesCode && !matchesVal) {
          return false;
        }
      }
      return true;
    });
  }, [report, selectedSource, selectedSeverity, searchQuery]);

  // Auto-Repair Action
  const handleAutoRepair = () => {
    setIsRepairing(true);
    setAutoRepairResult(null);
    setTimeout(() => {
      try {
        const res = performAutoRepair();
        setAutoRepairResult(res.message);
        onShowToast(res.message, res.repairedCount > 0 ? 'success' : 'info');
        executeScan();
        if (onDataRepaired) onDataRepaired();
      } catch (err: any) {
        onShowToast(`خطا در فرآیند اصلاح: ${err?.message}`, 'error');
      } finally {
        setIsRepairing(false);
      }
    }, 400);
  };

  // Reset to Pristine Clean Seed
  const handleResetToCleanSeed = () => {
    if (
      !window.confirm(
        'آیا اطمینان دارید که می‌خواهید کش مرورگر را با نسخه پاکیزه و اعتبارسنجی شده سید اولیه جایگزین نمایید؟'
      )
    ) {
      return;
    }
    const res = resetStorageToCleanSeed();
    if (res.success) {
      onShowToast(res.message, 'success');
      executeScan();
      if (onDataRepaired) onDataRepaired();
    } else {
      onShowToast(res.message, 'error');
    }
  };

  // Copy Summary to Clipboard
  const handleCopyReport = () => {
    if (!report) return;
    const summaryText = `گزارش عیب‌یابی و یکپارچگی داده‌های سامانه حامی:
زمان اسکن: ${report.scannedAt}
کل رکوردهای اسکن شده: ${report.totalRecordsScanned}
خطاهای بحرانی: ${report.errorCount}
هشدارها: ${report.warningCount}
نمره سلامت سیستم: ${report.healthScore}٪

تفکیک منابع داده:
- خودروهای سید (fleetSeedData.ts): ${report.sourceStats.FLEET_SEED.total} مورد (${report.sourceStats.FLEET_SEED.errors} خطا)
- پایگاه پشتیبان (backupDecoder.ts): ${report.sourceStats.BACKUP_SEED.total} مورد (${report.sourceStats.BACKUP_SEED.errors} خطا)
- رانندگان: ${report.sourceStats.DRIVERS_SEED.total} مورد (${report.sourceStats.DRIVERS_SEED.errors} خطا)
- سفارشات: ${report.sourceStats.ORDERS_DATA.total} مورد (${report.sourceStats.ORDERS_DATA.errors} خطا)
- پرسنل: ${report.sourceStats.STAFF_SEED.total} مورد (${report.sourceStats.STAFF_SEED.errors} خطا)
- حافظه محلی مرورگر: ${report.sourceStats.LOCAL_STORAGE.total} مورد (${report.sourceStats.LOCAL_STORAGE.errors} خطا)

تعداد مشکلات فیلتر شده: ${filteredIssues.length}
`;
    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      onShowToast('گزارش عیب‌یابی در کلیپ‌بورد کپی شد.', 'info');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Export JSON Log
  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hami-data-diagnostic-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('فایل لاگ عیب‌یابی JSON ذخیره شد.', 'success');
  };

  return (
    <div className="space-y-4">
      {/* HEADER CARD & HEALTH SCORE */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#111e38] to-[#0c1426] border border-cyan-500/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  ابزار عیب‌یابی و پایش جامع سلامت داده‌ها (Data Integrity Debugger)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  اسکن بلادرنگ
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                بررسی خودکار مقادیر نامعتبر، تاریخ‌های ناقص/فارسی، کیلومترهای معکوس و رکوردهای مخدوش در{' '}
                <span className="font-mono text-cyan-300">fleetSeedData.ts</span> و سایر منابع.
              </p>
            </div>
          </div>

          {/* Health Score Gauge */}
          {report && (
            <div className="flex items-center gap-3 bg-[#080d19]/80 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-medium">شاخص سلامت داده:</span>
                <span
                  className={`text-lg font-black font-mono ${
                    report.healthScore >= 90
                      ? 'text-emerald-400'
                      : report.healthScore >= 70
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {toFaDigits(report.healthScore)}٪
                </span>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                {report.healthScore >= 90 ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* QUICK STATS PILLS */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <div className="bg-[#0b1324] p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">کل رکوردهای اسکن شده:</span>
              <span className="font-mono font-bold text-slate-200">
                {toFaDigits(report.totalRecordsScanned)}
              </span>
            </div>

            <div className="bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/30 flex items-center justify-between">
              <span className="text-xs text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>خطاهای بحرانی:</span>
              </span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {toFaDigits(report.errorCount)}
              </span>
            </div>

            <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30 flex items-center justify-between">
              <span className="text-xs text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>هشدارهای نیازمند توجه:</span>
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {toFaDigits(report.warningCount)}
              </span>
            </div>

            <div className="bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/30 flex items-center justify-between">
              <span className="text-xs text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>رکوردهای کاملاً سالم:</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {toFaDigits(report.healthyCount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ACTION TOOLBAR */}
      <div className="p-3 bg-[#0d162a] rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Re-scan button */}
          <button
            onClick={executeScan}
            disabled={isScanning}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'درحال اسکن...' : 'اسکن مجدد داده‌ها'}</span>
          </button>

          {/* Auto repair button */}
          <button
            onClick={handleAutoRepair}
            disabled={isRepairing || !report || report.issues.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Wrench className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
            <span>{isRepairing ? 'درحال اصلاح...' : 'تعمیر خودکار مقادیر ناسازگار'}</span>
          </button>

          {/* Reset to clean seed */}
          <button
            onClick={handleResetToCleanSeed}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="جایگزینی کش محلی مرورگر با سید پاکیزه"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>بازنشانی به سید پاکیزه</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Report */}
          <button
            onClick={handleCopyReport}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition cursor-pointer"
            title="کپی خلاصه متنی گزارش"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'کپی شد' : 'کپی گزارش'}</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition cursor-pointer"
            title="دانلود گزارش کامل به صورت JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>خروجی JSON</span>
          </button>
        </div>
      </div>

      {/* AUTO REPAIR RESULT BANNER */}
      {autoRepairResult && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{autoRepairResult}</span>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Source Selector */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">منبع داده مورد بررسی:</label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value as any)}
            className="w-full px-2.5 py-1.5 bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-500"
          >
            <option value="ALL">همه منابع داده ({report ? toFaDigits(report.issues.length) : 0})</option>
            <option value="FLEET_SEED">fleetSeedData.ts (خودروها)</option>
            <option value="BACKUP_SEED">backupDecoder.ts (پشتیبان)</option>
            <option value="DRIVERS_SEED">defaultDrivers.ts (رانندگان)</option>
            <option value="ORDERS_DATA">ordersData.ts (سفارشات)</option>
            <option value="STAFF_SEED">staffSeedData.ts (پرسنل)</option>
            <option value="LOCAL_STORAGE">LocalStorage (حافظه محلی)</option>
          </select>
        </div>

        {/* Severity Selector */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">سطح اهمیت:</label>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="w-full px-2.5 py-1.5 bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-500"
          >
            <option value="ALL">همه سطوح</option>
            <option value="ERROR">فقط خطاهای بحرانی 🔴</option>
            <option value="WARNING">فقط هشدارها 🟡</option>
          </select>
        </div>

        {/* Search input */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">جستجو در نتایج عیب‌یابی:</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با پلاک، نام، فیلد..."
              className="w-full px-2.5 py-1.5 pl-8 bg-[#0b1222] border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-hidden focus:border-cyan-500 placeholder:text-slate-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* ISSUES LIST */}
      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center bg-[#091122] rounded-xl border border-slate-800 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">هیچ مشکلی با فیلترهای انتخابی یافت نشد</h4>
            <p className="text-xs text-slate-400">
              داده‌های این بخش با الزامات اعتبارسنجی تاریخ‌ها، پلاک‌ها و شماره‌های تماس مطابقت دارند.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-3.5 rounded-xl border transition text-xs space-y-2 ${
                issue.severity === 'ERROR'
                  ? 'bg-rose-950/15 border-rose-500/30'
                  : 'bg-amber-950/15 border-amber-500/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      issue.severity === 'ERROR'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {issue.severity === 'ERROR' ? 'خطای ساختاری' : 'هشدار'}
                  </span>

                  <span className="font-bold text-white text-xs">{issue.recordTitle}</span>

                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                    {issue.sourceLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">فیلد:</span>
                  <code className="text-cyan-300 bg-slate-900/80 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-700">
                    {issue.field}
                  </code>
                </div>
              </div>

              {/* Message & Current Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-[#080e1c] p-2 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 block mb-0.5">شرح مغایرت:</span>
                  <span className="text-slate-200">{issue.message}</span>
                </div>

                <div className="bg-[#080e1c] p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block mb-0.5">مقدار فعلی:</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {issue.currentValue === ''
                        ? '(خالی)'
                        : issue.currentValue === null || issue.currentValue === undefined
                        ? '(ثبت نشده)'
                        : String(issue.currentValue)}
                    </span>
                  </div>
                  {issue.isAutoFixable && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>قابل اصلاح خودکار</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Recommendation */}
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-0.5">
                <span className="text-cyan-400 font-bold shrink-0">راهکار پیشنهادی:</span>
                <span>{issue.recommendation}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="p-3 bg-[#0a1020] rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          تعداد مشکلات نمایش داده شده: {toFaDigits(filteredIssues.length)} از{' '}
          {toFaDigits(report?.issues.length || 0)} مورد
        </span>
        <span className="text-slate-500">
          دکمه «تعمیر خودکار» فرمت تاریخ‌ها را استانداردسازی کرده و در حافظه محلی ذخیره می‌نماید.
        </span>
      </div>
    </div>
  );
};
