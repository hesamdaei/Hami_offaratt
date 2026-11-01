import React, { FC, useState, useMemo } from 'react';
import {
  Code2,
  Server,
  Database,
  Wrench,
  PhoneCall,
  Terminal,
  Search,
  Copy,
  Check,
  Printer,
  Layers,
  ShieldCheck,
  FolderGit2,
  Cpu,
  AlertTriangle,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { toFaDigits } from '../utils/jalaali';
import { APP_BUILD_TAG } from '../constants/version';

export type DocSectionId =
  | 'ALL'
  | 'ARCHITECTURE'
  | 'API_DB'
  | 'FLEET_LOGIC'
  | 'VOIP_CTI'
  | 'DEPLOY_UPDATE';

interface ApiEndpointDoc {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  summary: string;
  payload: string;
  response: string;
}

interface TechStackItem {
  name: string;
  version: string;
  layer: string;
  purpose: string;
}

const TECH_STACK_ITEMS: TechStackItem[] = [
  {
    name: 'React + React DOM',
    version: '19.0.1',
    layer: 'Frontend Core',
    purpose: 'رابط کاربری تک‌صفحه‌ای (SPA)، مدیریت وضعیت ماژولار و هوک‌های واکنش‌گرا',
  },
  {
    name: 'TypeScript',
    version: '5.8.2',
    layer: 'Language & Types',
    purpose: 'بررسی ایستا و امنیت تایپ‌ها در کلاینت و سرور (npm run lint)',
  },
  {
    name: 'Vite',
    version: '6.2.3',
    layer: 'Build & Bundler',
    purpose: 'باندلینگ سریع نسخه وب و اتصال میدل‌ور در سرور Express',
  },
  {
    name: 'Tailwind CSS',
    version: '4.1.14',
    layer: 'Styling & Design',
    purpose: 'طراحی راست‌به‌چپ (RTL)، پوسته دوگانه تاریک/روشن و چیدمان واکنش‌گرا',
  },
  {
    name: 'Recharts',
    version: '3.10.1',
    layer: 'Data Visualization',
    purpose: 'نمودارهای تحلیلی وضعیت ناوگان (فعال، در تعمیرگاه، در مرخصی) در داشبورد',
  },
  {
    name: 'Node.js + Express',
    version: '4.21.2',
    layer: 'Backend & LAN Server',
    purpose: 'سرور مرکزی شبکه محلی، مدیریت دیتابیس JSON، پروکسی تلفن و استریم کالرآیدی',
  },
  {
    name: 'ExcelJS & XLSX',
    version: '4.4.0',
    layer: 'Reporting Engine',
    purpose: 'تولید گزارش‌های اکسل مدیریتی چندشیته با فرمت‌بندی راست‌به‌چپ',
  },
  {
    name: 'Electron & Tauri',
    version: '2.0.0',
    layer: 'Desktop Packaging',
    purpose: 'بسته‌بندی نرم‌افزار برای اجرا در ویندوز و محیط دسکتاپ سازمانی',
  },
];

const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/status',
    summary: 'بررسی سلامت سرور، نسخه بیلد، آدرس‌های IP شبکه محلی (LAN) و وضعیت کالرآیدی',
    payload: 'بدون پارامتر ورودی',
    response: '{ ok: true, status: "ONLINE", version: "1.1786.1", lanIps: [...], hasDatabase: true }',
  },
  {
    method: 'GET',
    path: '/api/db',
    summary: 'دریافت کل دیتابیس متمرکز (ناوگان، رانندگان، پرسنل، حضور و غیاب، سفارش‌ها)',
    payload: 'بدون پارامتر ورودی (در صورت نبود فایل، بازسازی خودکار از آخرین بکاپ انجام می‌شود)',
    response: '{ ok: true, data: { drivers, records, vehicles, driverDirectory, staffMembers, ... } }',
  },
  {
    method: 'POST',
    path: '/api/db',
    summary: 'ذخیره دیتابیس متمرکز روی سرور + ایجاد خودکار نسخه پشتیبان در پوشه data/backups',
    payload: '{ drivers, records, vehicles, driverDirectory, staffMembers, staffRecords, orders }',
    response: '{ ok: true, updatedAt: "ISO_DATE", backupCreated: true }',
  },
  {
    method: 'GET',
    path: '/api/backups',
    summary: 'دریافت فهرست ۲۰ نسخه پشتیبان آخر نگهداری‌شده در سرور',
    payload: 'بدون پارامتر ورودی',
    response: '{ ok: true, backups: [{ filename, size, createdAt }] }',
  },
  {
    method: 'POST',
    path: '/api/backups/restore',
    summary: 'بازگردانی دیتابیس سرور به یک فایل پشتیبان مشخص',
    payload: '{ filename: "backup-2026-10-31T12-00-00.json" }',
    response: '{ ok: true, data: RestoredDatabaseObject }',
  },
  {
    method: 'POST',
    path: '/api/voip/yealink-dial',
    summary: 'پروکسی سمت سرور برای ارسال دستور Action URI به تلفن رومیزی Yealink در شبکه محلی',
    payload: '{ phoneIp: "192.168.1.50", number: "90912...", action: "dial" | "hangup", username, password }',
    response: '{ ok: true, targetUrl: "http://192.168.1.50/servlet?key=number=..." }',
  },
  {
    method: 'GET',
    path: '/api/caller-id/stream',
    summary: 'استریم بلادرنگ Server-Sent Events (SSE) جهت دریافت لحظه‌ای تماس‌های ورودی در مرورگر',
    payload: 'اتصال EventSource پایدار',
    response: 'event: message -> { type: "incoming_call", call: { number, line, timestamp } }',
  },
  {
    method: 'POST',
    path: '/api/caller-id/incoming',
    summary: 'وب‌هوک HTTP برای ثبت تماس ورودی از سانترال/گیت‌وی یا شبیه‌ساز تماس',
    payload: '{ number: "09121234567", line: "Line 1", name: "نام مخاطب" }',
    response: '{ ok: true, event: CallerIdRecord }',
  },
  {
    method: 'GET',
    path: '/api/users',
    summary: 'دریافت فهرست کاربران سامانه و ماتریس سطوح دسترسی (RBAC)',
    payload: 'بدون پارامتر ورودی',
    response: '{ ok: true, users: AppUser[] }',
  },
];

export const DeveloperDocsView: FC = () => {
  const [activeSection, setActiveSection] = useState<DocSectionId>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const filteredTechStack = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TECH_STACK_ITEMS;
    return TECH_STACK_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.layer.toLowerCase().includes(q) ||
        item.purpose.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredEndpoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return API_ENDPOINTS;
    return API_ENDPOINTS.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.payload.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const sections: { id: DocSectionId; label: string; icon: FC<{ className?: string }> }[] = [
    { id: 'ALL', label: 'همه سرفصل‌ها', icon: Layers },
    { id: 'ARCHITECTURE', label: 'معماری و تکنولوژی‌ها', icon: Cpu },
    { id: 'API_DB', label: 'APIها، دیتابیس و بکاپ', icon: Database },
    { id: 'FLEET_LOGIC', label: 'منطق ناوگان و سرویس روغن', icon: Wrench },
    { id: 'VOIP_CTI', label: 'سانترال یالینک و کالرآیدی', icon: PhoneCall },
    { id: 'DEPLOY_UPDATE', label: 'نصب، بیلد و بروزرسانی', icon: Terminal },
  ];

  const showSection = (id: DocSectionId) => activeSection === 'ALL' || activeSection === id;

  return (
    <div dir="rtl" className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <Code2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>مرجع مهندسی نرم‌افزار و معماری سیستم</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums" dir="ltr">
                {APP_BUILD_TAG}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono" dir="ltr">
                DEVELOPER_GUIDE.md
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              مستندات فنی و راهنمای توسعه‌دهندگان سامانه حامی بار
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              این بخش شامل تمامی جزئیات فنی، استک تکنولوژی‌ها، ساختار دیتابیس متمرکز، قوانین محاسبه سرویس روغن، پروتکل‌های ارتباط با تلفن یالینک و چک‌لیست استاندارد برای بروزرسانی سامانه توسط تیم توسعه است.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ مستندات فنی</span>
            </button>
          </div>
        </div>

        {/* Search & Section Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در APIها، پکیج‌ها یا توابع..."
              className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: ARCHITECTURE & TECH STACK */}
      {showSection('ARCHITECTURE') && (
        <section className="bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-amber-500 shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                ۰۱. معماری سیستم، تکنولوژی‌ها و ساختار پوشه‌ها
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              Full-Stack TypeScript SPA + Express LAN
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Tech Stack Table */}
            <div className="lg:col-span-7 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">تکنولوژی / کتابخانه</th>
                    <th className="py-2.5 px-3 font-bold">نسخه</th>
                    <th className="py-2.5 px-3 font-bold">لایه</th>
                    <th className="py-2.5 px-3 font-bold">کاربرد در سامانه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filteredTechStack.map((item) => (
                    <tr
                      key={item.name}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-amber-400" dir="ltr">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400" dir="ltr">
                        {item.version}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                        {item.layer}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key Files & Directory Map */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <FolderGit2 className="w-4 h-4 text-amber-500" />
                <span>نقشه فایل‌های کلیدی پروژه برای توسعه‌دهندگان</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                    /server.ts &amp; /lan-server.cjs
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    سرور اصلی Express روی پورت ۳۰۰۰، مدیریت دیتابیس متمرکز، بکاپ خودکار، پروکسی یالینک و سوکت UDP کالرآیدی.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                    /src/utils/maintenanceStandardsConfig.ts
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    منبع واحد نرمال‌سازی تاریخ تعویض روغن (<code className="font-mono">normalizeVehicleOilData</code>) و قوانین سرویس دوره‌ای خودروها.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                    /src/utils/voipService.ts
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    منطق ۳ مود تماس تلفنی (SIP، وب‌هوک سانترال، Action URI یالینک) و اعمال پیش‌کد آزادسازی خط شهری (<code className="font-mono">trunkPrefix</code>).
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                    /src/utils/authService.ts
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    مدیریت کاربران، نشست‌ها و کنترل دسترسی ماژول‌ها (محدودسازی سفارش‌ها، امور مالی و گزارش‌ها به ادمین اصلی یا مجوز صریح).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: API & DATABASE */}
      {showSection('API_DB') && (
        <section className="bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-500 shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                ۰۲. مستندات APIها، دیتابیس متمرکز و پشتیبان‌گیری خودکار
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              /data/hami-database.json · Auto-Rotation (20 Backups)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                ۱. خودترمیمی دیتابیس (Self-Healing DB)
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                در <code className="font-mono">server.ts</code>، تابع <code className="font-mono">readDatabase()</code> پیش از هر بار خواندن، وجود فایل <code className="font-mono">data/hami-database.json</code> را بررسی می‌کند. اگر فایل حذف شده باشد، بلافاصله تابع <code className="font-mono">initializeDatabaseIfEmpty()</code> آن را از روی آخرین بکاپ پایه بازسازی می‌نماید.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                ۲. چرخش خودکار ۲۰ نسخه پشتیبان
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                با هر درخواست ذخیره (<code className="font-mono">POST /api/db</code>)، یک نسخه پشتیبان زمان‌بندی‌شده در پوشه <code className="font-mono">data/backups/</code> ثبت شده و تابع <code className="font-mono">cleanOldBackups()</code> نسخه‌های مازاد بر ۲۰ فایل آخر را حذف می‌کند.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                ۳. همگام‌سازی شبکه محلی (LAN Sync)
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                کلاینت‌ها از طریق سرویس <code className="font-mono">lanSyncService.ts</code> تغییرات را با سرور مرکزی همگام می‌کنند و در صورت قطع موقت شبکه، داده‌ها در <code className="font-mono">localStorage</code> مرورگر حفظ می‌شوند.
              </p>
            </div>
          </div>

          {/* API Endpoints Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-bold">متد</th>
                  <th className="py-2.5 px-3 font-bold">مسیر Endpoint</th>
                  <th className="py-2.5 px-3 font-bold">توضیح عملکرد</th>
                  <th className="py-2.5 px-3 font-bold">ورودی / خروجی نمونه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredEndpoints.map((ep) => (
                  <tr
                    key={`${ep.method}-${ep.path}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">
                      <span
                        className={
                          ep.method === 'GET'
                            ? 'text-sky-600 dark:text-sky-400'
                            : ep.method === 'POST'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {ep.path}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {ep.summary}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">
                      <div>In: {ep.payload}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Out: {ep.response}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SECTION 3: FLEET & OIL CALCULATION LOGIC */}
      {showSection('FLEET_LOGIC') && (
        <section className="bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-amber-500 shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                ۰۳. منطق محاسبات ناوگان، منبع واحد تاریخ تعویض روغن و تقویم شمسی
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              Single Source of Truth: vehicle.lastChangeDate
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-slate-800 dark:text-slate-200 leading-relaxed">
              <div className="font-black text-amber-800 dark:text-amber-300">
                قانون مهم معماری: یکپارچه‌سازی تاریخ آخرین تعویض روغن خودروها
              </div>
              <p>
                هر خودرو تنها یک فیلد مرجع برای آخرین تاریخ تعویض روغن دارد: <code className="font-mono font-bold">vehicle.lastChangeDate</code> (با فرمت شمسی <code className="font-mono">YYYY/MM/DD</code>). برای جلوگیری از تداخل بین تاریخ‌های مختلف، هر زمان اطلاعات خودرو ویرایش یا بارگذاری می‌شود، تابع <code className="font-mono font-bold">normalizeVehicleOilData(vehicle)</code> در فایل <code className="font-mono">src/utils/maintenanceStandardsConfig.ts</code> اجرا شده و تمام فیلدهای فرعی را با <code className="font-mono">lastChangeDate</code> همگام می‌کند.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-950 text-slate-100 rounded-xl p-4 space-y-2.5 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  نحوه بروزرسانی استاندارد تاریخ تعویض روغن
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'oil-snippet',
                      `import { normalizeVehicleOilData } from '../utils/maintenanceStandardsConfig';\n\nconst updated = normalizeVehicleOilData({\n  ...vehicle,\n  lastChangeDate: '1404/08/01',\n});\nonUpdateVehicle(updated);`
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition cursor-pointer"
                >
                  {copiedId === 'oil-snippet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی کد</span>
                    </>
                  )}
                </button>
              </div>
              <pre dir="ltr" className="text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
{`import { normalizeVehicleOilData } from '../utils/maintenanceStandardsConfig';

const updated = normalizeVehicleOilData({
  ...vehicle,
  lastChangeDate: '1404/08/01',
});
onUpdateVehicle(updated);`}
              </pre>
            </div>

            <div className="bg-slate-950 text-slate-100 rounded-xl p-4 space-y-2.5 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  نرمال‌سازی کد خودرو (جلوگیری از خطای تطبیق کد ۰۹ و ۹)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'code-snippet',
                      `const normalizeCode = (c?: string) =>\n  toEnDigits(String(c || '')).replace(/[^0-9]/g, '').replace(/^0+/, '') || '0';`
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition cursor-pointer"
                >
                  {copiedId === 'code-snippet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی کد</span>
                    </>
                  )}
                </button>
              </div>
              <pre dir="ltr" className="text-[11px] font-mono text-sky-400 overflow-x-auto leading-relaxed">
{`// تبدیل ارقام فارسی و حذف صفرهای ابتدایی (مثلا "09" -> "9")
const normalizeCode = (c?: string) =>
  toEnDigits(String(c || ''))
    .replace(/[^0-9]/g, '')
    .replace(/^0+/, '') || '0';`}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: VOIP, YEALINK & CALLER ID */}
      {showSection('VOIP_CTI') && (
        <section className="bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-5 h-5 text-sky-500 shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                ۰۴. پروتکل‌های ارتباطی تلفن، سانترال Yealink و کالرآیدی (CTI / UDP)
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              Yealink Action URI · UDP Port 6699 · SSE Stream
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                مود سوم CTI: ارتباط مستقیم با تلفن Yealink + پیش‌کد خط شهری
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                در مود <code className="font-mono">YEALINK_ACTION_URI</code>، سیستم پیش‌کد آزادسازی خط سانترال (مانند عدد <code className="font-mono font-bold">9</code>) را از طریق تابع <code className="font-mono">applyTrunkPrefix(phone, trunkPrefix)</code> به ابتدای شماره‌های شهری و موبایل اضافه کرده و از طریق پروکسی سرور به آدرس <code className="font-mono">http://&lt;PHONE_IP&gt;/servlet?key=number=...</code> ارسال می‌کند. برای قطع تماس نیز کلید <code className="font-mono">key=X</code> ارسال می‌شود.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                شنونده کالرآیدی شبکه (UDP 6699 &amp; HTTP Webhook)
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                سرور Express در زمان اجرا یک سوکت UDP روی پورت <code className="font-mono font-bold">6699</code> باز می‌کند. به محض دریافت بسته کالرآیدی از سخت‌افزار یا سانترال، شماره تماس‌گیرنده استخراج شده و از طریق استریم <code className="font-mono">/api/caller-id/stream</code> (پروتکل SSE) در لحظه روی مرورگر اپراتورها پاپ‌آپ تماس را باز می‌کند.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5: DEPLOYMENT, BUILD & UPDATE CHECKLIST */}
      {showSection('DEPLOY_UPDATE') && (
        <section className="bg-white dark:bg-[#111b2e] border border-slate-200 dark:border-[#1f2c45] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-emerald-500 shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                ۰۵. راهنمای نصب، اجرا، بیلد و چک‌لیست بروزرسانی در محیط عملیاتی
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              Port 3000 · LAN Server · Production Build
            </span>
          </div>

          <div className="bg-slate-950 text-slate-100 rounded-xl p-4 space-y-2.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                دستورات خط فرمان (CLI) جهت توسعه، بررسی تایپ‌ها و استقرار
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'cli-commands',
                    `npm install\nnpm run lint\nnpm run build\nnpm run start:lan`
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition cursor-pointer"
              >
                {copiedId === 'cli-commands' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی دستورات</span>
                  </>
                )}
              </button>
            </div>
            <pre dir="ltr" className="text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
{`# 1. نصب وابستگی‌ها
npm install

# 2. اجرای محیط توسعه (Vite + Express روی پورت 3000)
npm run dev

# 3. بررسی صحت تایپ‌ها و عدم وجود خطای کامپایل (TypeScript)
npm run lint

# 4. بیلد نهایی و اجرای سرور شبکه محلی (LAN)
npm run start:lan`}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>چک‌لیست پیش از انتشار نسخه جدید</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside leading-relaxed">
                <li>
                  اجرای دستور <code className="font-mono">npm run lint</code> و اطمینان از صفر بودن خطاهای TypeScript.
                </li>
                <li>
                  پرهیز از ایجاد وابستگی چرخشی (Circular Dependency) بین فایل‌های <code className="font-mono">src/utils/</code>؛ برای تایپ‌ها از <code className="font-mono">import type</code> استفاده کنید.
                </li>
                <li>
                  بروزرسانی شماره نسخه در فایل‌های <code className="font-mono">src/constants/version.ts</code> و <code className="font-mono">package.json</code>.
                </li>
                <li>
                  تهیه یک نسخه بکاپ دستی از طریق مودال «پشتیبان‌گیری» پیش از جایگزینی فایل‌های سرور عملیاتی.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>فایل‌های مستندات موجود در ریشه پروژه</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 leading-relaxed font-mono" dir="ltr">
                <li>• /DEVELOPER_GUIDE.md (مرجع کامل مهندسی و معماری)</li>
                <li>• /README.md (معرفی پروژه و شروع سریع)</li>
                <li>• /ARCHITECTURE_AND_USER_MANAGEMENT.md (مدیریت کاربران و امنیت)</li>
                <li>• /LOCAL_SERVER_INSTALLATION_GUIDE.md (نصب سرور شبکه محلی)</li>
                <li>• /BALE_INTEGRATION_GUIDE.md (راهنمای بازوی پیام‌رسان بله)</li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
