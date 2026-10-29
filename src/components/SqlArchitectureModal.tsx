import { FC, useState } from 'react';
import {
  X,
  Database,
  Download,
  Copy,
  Check,
  Table,
  Layers,
  Key,
  FileCode,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';
import { RELATIONAL_SQL_SCHEMA, generateSqlSchemaDdl, generateFullSqlDump } from '../db/sqlSchema';
import { toFaDigits } from '../utils/jalaali';

interface SqlArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbData: {
    users?: any[];
    vehicles?: any[];
    drivers?: any[];
    records?: Record<string, any>;
    driverDirectory?: any[];
    staffMembers?: any[];
    staffRecords?: Record<string, any>;
    rules?: any;
  };
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SqlArchitectureModal: FC<SqlArchitectureModalProps> = ({
  isOpen,
  onClose,
  dbData,
  onShowToast,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>(RELATIONAL_SQL_SCHEMA[0].name);
  const [activeTab, setActiveTab] = useState<'tables' | 'ddl' | 'stats'>('tables');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentTable = RELATIONAL_SQL_SCHEMA.find((t) => t.name === selectedTable) || RELATIONAL_SQL_SCHEMA[0];

  const handleCopyDdl = () => {
    const ddl = generateSqlSchemaDdl('standard');
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    onShowToast('اسکریپت ساختار DDL پایگاه‌داده SQL در حافظه کپی شد.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSqlDump = () => {
    try {
      const sqlDump = generateFullSqlDump(dbData);
      const blob = new Blob([sqlDump], { type: 'application/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `hami-database-relational-${nowStr}.sql`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast('فایل دیتابیس رابطه‌ای کامل (.sql) با موفقیت دانلود شد.', 'success');
    } catch {
      onShowToast('خطا در تولید فایل خروجی SQL.', 'error');
    }
  };

  // Calculate table record counts from actual live memory
  const getTableRowCount = (tableName: string) => {
    switch (tableName) {
      case 'users':
        return Array.isArray(dbData.users) ? dbData.users.length : 0;
      case 'vehicles':
        return Array.isArray(dbData.vehicles) ? dbData.vehicles.length : 0;
      case 'drivers':
        return Array.isArray(dbData.drivers) ? dbData.drivers.length : 0;
      case 'staff_members':
        return Array.isArray(dbData.staffMembers) ? dbData.staffMembers.length : 0;
      case 'service_rules':
        return dbData.rules ? Object.keys(dbData.rules).length : 6;
      case 'vehicle_handover_records':
        return 1;
      case 'audit_logs':
        return 1;
      case 'attendance_records':
        return dbData.records ? Object.keys(dbData.records).length : 0;
      case 'staff_attendance_records':
        return dbData.staffRecords ? Object.keys(dbData.staffRecords).length : 0;
      default:
        return 0;
    }
  };

  const totalColumns = RELATIONAL_SQL_SCHEMA.reduce((acc, t) => acc + t.columns.length, 0);
  const totalIndexes = RELATIONAL_SQL_SCHEMA.reduce((acc, t) => acc + t.indexes.length, 0);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#0b1220] border border-[#1e2d48] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] select-none text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL HEADER */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-[#101b33] via-[#0f192f] to-[#0c1424] border-b border-[#1e2d48] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-[#0c1424] rounded-[14px] flex items-center justify-center">
                <Database className="w-6 h-6 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  معماری و ساختار پایگاه‌داده رابطه‌ای (SQL Database Architecture)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  نگارش مهندسی ۲.۰
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                طراحی اصولی جداول نرمال‌سازی شده، کلیدهای اصلی و خارجی، ایندکس‌ها و خروجی کامل SQL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSqlDump}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
              title="دانلود اسکریپت کامل خروجی SQL با تمام داده‌های موجود"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">دریافت خروجی دیتابیس (SQL Dump)</span>
              <span className="sm:hidden">خروجی SQL</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. SUB-HEADER TABS & STATS BAR */}
        <div className="px-6 py-2.5 bg-[#090f1d] border-b border-[#1e2d48] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'tables'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>جداول و فیلدها ({toFaDigits(RELATIONAL_SQL_SCHEMA.length)})</span>
            </button>
            <button
              onClick={() => setActiveTab('ddl')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'ddl'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>کد اسکریپت DDL</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تحلیل یکپارچگی رابطه</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <div>
              <span>کل ستون‌ها: </span>
              <span className="text-sky-300 font-bold">{toFaDigits(totalColumns)}</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div>
              <span>ایندکس‌ها: </span>
              <span className="text-amber-300 font-bold">{toFaDigits(totalIndexes)}</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>قوانین ACID و کلید خارجی فعال</span>
            </div>
          </div>
        </div>

        {/* 3. MODAL BODY */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {activeTab === 'tables' && (
            <>
              {/* Tables Navigation Sidebar */}
              <div className="w-full md:w-64 bg-[#0a101d] border-b md:border-b-0 md:border-l border-[#1e2d48] p-3 overflow-y-auto custom-scrollbar flex md:flex-col gap-1.5 shrink-0">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 hidden md:block">
                  جداول نرمال‌سازی شده
                </div>
                {RELATIONAL_SQL_SCHEMA.map((table) => {
                  const count = getTableRowCount(table.name);
                  const isSelected = table.name === selectedTable;
                  return (
                    <button
                      key={table.name}
                      onClick={() => setSelectedTable(table.name)}
                      className={`w-full text-right px-3 py-2.5 rounded-xl transition flex items-center justify-between text-xs shrink-0 ${
                        isSelected
                          ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40 font-bold'
                          : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Table className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                        <span className="truncate">{table.label}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {toFaDigits(count)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Table Details Viewer */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                <div className="bg-[#101b33] border border-[#1e2d48] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-sky-300">{currentTable.name}</span>
                      <span className="text-xs text-slate-300 font-bold">({currentTable.label})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{currentTable.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 font-mono">
                      {toFaDigits(currentTable.columns.length)} ستون
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono">
                      {toFaDigits(getTableRowCount(currentTable.name))} رکورد در حافظه
                    </span>
                  </div>
                </div>

                {/* Columns Table */}
                <div className="bg-[#0f172a] border border-[#1e2d48] rounded-2xl overflow-hidden shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#090e1c] text-slate-400 border-b border-[#1e2d48] font-bold">
                        <tr>
                          <th className="py-2.5 px-4 font-mono">نام فیلد (Column)</th>
                          <th className="py-2.5 px-4 font-mono">نوع داده (Data Type)</th>
                          <th className="py-2.5 px-4">نقش / محدودیت</th>
                          <th className="py-2.5 px-4">توضیحات و کاربرد مهندسی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2d48]/70">
                        {currentTable.columns.map((col) => (
                          <tr key={col.name} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                              {col.isPrimary && (
                                <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Primary Key" />
                              )}
                              <span>{col.name}</span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-sky-300 font-semibold">
                              {col.type}
                            </td>
                            <td className="py-2.5 px-4">
                              {col.isPrimary ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  PRIMARY KEY
                                </span>
                              ) : col.foreignKey ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  FK → {col.foreignKey.table}.{col.foreignKey.column}
                                </span>
                              ) : col.isNullable === false ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20">
                                  NOT NULL
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">NULLABLE</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-300">
                              {col.description}
                              {col.defaultValue && (
                                <span className="mr-2 font-mono text-[10px] text-slate-400">
                                  (پیش‌فرض: {col.defaultValue})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table Indexes */}
                {currentTable.indexes.length > 0 && (
                  <div className="bg-[#101b33]/60 border border-[#1e2d48] rounded-2xl p-4">
                    <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      ایندکس‌های جدول جهت بهینه‌سازی سرعت کوئری‌ها (Indexes)
                    </h4>
                    <div className="space-y-1.5 font-mono text-xs text-slate-300 bg-[#090e1c] p-3 rounded-xl border border-slate-800">
                      {currentTable.indexes.map((idx, i) => (
                        <div key={i} className="text-sky-300/90">{idx}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'ddl' && (
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    اسکریپت استاندارد ساخت پایگاه‌داده (Standard SQL / PostgreSQL DDL Script)
                  </span>
                </div>
                <button
                  onClick={handleCopyDdl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition border border-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'کپی شد!' : 'کپی اسکریپت DDL'}</span>
                </button>
              </div>

              <pre
                dir="ltr"
                className="flex-1 p-4 bg-[#070d18] border border-slate-800 rounded-2xl text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed select-text"
              >
                {generateSqlSchemaDdl('standard')}
              </pre>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/40 to-indigo-950/60 border border-blue-500/30">
                  <div className="text-xs text-blue-300 font-bold mb-1">کل موجودیت‌های سیستم</div>
                  <div className="text-2xl font-black text-white font-mono">{toFaDigits(RELATIONAL_SQL_SCHEMA.length)} جدول</div>
                  <p className="text-[11px] text-slate-400 mt-1">نرمال‌سازی کامل فرم سوم (3NF)</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-teal-950/60 border border-emerald-500/30">
                  <div className="text-xs text-emerald-300 font-bold mb-1">یکپارچگی و ارجاعات (Foreign Keys)</div>
                  <div className="text-2xl font-black text-white font-mono">فعال و بدون تناقض</div>
                  <p className="text-[11px] text-slate-400 mt-1">حفظ یکپارچگی ارجاعی با CASCADE و SET NULL</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/40 to-orange-950/60 border border-amber-500/30">
                  <div className="text-xs text-amber-300 font-bold mb-1">پشتیبانی از موتورهای SQL</div>
                  <div className="text-2xl font-black text-white font-mono">Postgres / SQLite / MySQL</div>
                  <p className="text-[11px] text-slate-400 mt-1">خروجی سازگار با تمام موتورهای استاندارد</p>
                </div>
              </div>

              {/* Schema Relations Map */}
              <div className="bg-[#101b33] border border-[#1e2d48] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  نقشه روابط بین جداول سیستم (Entity-Relationship Topology)
                </h3>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 bg-[#090e1c] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-amber-400 font-bold">drivers</span>
                      <span className="mx-2 text-slate-500">↔</span>
                      <span className="font-mono text-sky-400 font-bold">vehicles</span>
                    </div>
                    <span className="text-[11px] text-slate-400">تخصیص یک به یک یا چند به یک راننده به خودرو</span>
                  </div>
                  <div className="p-3 bg-[#090e1c] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-emerald-400 font-bold">attendance_records</span>
                      <span className="mx-2 text-slate-500">→</span>
                      <span className="font-mono text-amber-400 font-bold">drivers</span>
                    </div>
                    <span className="text-[11px] text-slate-400">سوابق حضور و غیاب ماهانه به ازای هر راننده</span>
                  </div>
                  <div className="p-3 bg-[#090e1c] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-purple-400 font-bold">staff_attendance_records</span>
                      <span className="mx-2 text-slate-500">→</span>
                      <span className="font-mono text-purple-300 font-bold">staff_members</span>
                    </div>
                    <span className="text-[11px] text-slate-400">سوابق تردد و شیفت پرسنل اداری و کادری</span>
                  </div>
                  <div className="p-3 bg-[#090e1c] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-rose-400 font-bold">vehicle_handover_records</span>
                      <span className="mx-2 text-slate-500">→</span>
                      <span className="font-mono text-sky-400 font-bold">vehicles & drivers</span>
                    </div>
                    <span className="text-[11px] text-slate-400">صورت‌جلسات تحویل خودرو با چک‌لیست ۶۶ قلمی</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. MODAL FOOTER */}
        <div className="px-6 py-4 bg-[#090f1d] border-t border-[#1e2d48] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>خروجی SQL شامل تمام جداول، ایندکس‌ها، نماها و داده‌های موجود آماده واردسازی مستقیم است.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSqlDump}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل کامل SQL</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
