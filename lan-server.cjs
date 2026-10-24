/**
 * سامانه حامی - سرور شبکه محلی (LAN Server)
 * راه‌اندازی سبک و مستقل برای اشتراک در شبکه داخلی بدون نیاز به اینترنت یا سرور ابری
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const app = express();
const DEFAULT_PORT = parseInt(process.env.LAN_PORT || process.env.PORT || '3000', 10);
let currentPort = DEFAULT_PORT;
const HOST = '0.0.0.0';

// تنظیمات پوشه داده‌ها و پشتیبان‌ها
const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'hami-database.json');
const DIST_DIR = path.join(__dirname, 'dist');

// اطمینان از وجود پوشه‌های ذخیره‌سازی
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// میان‌افزارها
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS برای دسترسی بدون محدودیت کلاینت‌های شبکه LAN
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// شناسایی IPهای شبکه محلی سیستم
function getLocalNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          interface: name,
          address: iface.address,
        });
      }
    }
  }
  return ips;
}

const DEFAULT_SEED_FILE = path.join(DATA_DIR, 'default-seed.json');

// خواندن دیتابیس لوکال با قابلیت خودترمیم و بارگذاری اولیه
function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.version) dbVersion = parsed.version;
      return parsed;
    } else if (fs.existsSync(DEFAULT_SEED_FILE)) {
      const raw = fs.readFileSync(DEFAULT_SEED_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      fs.writeFileSync(DB_FILE, raw, 'utf-8');
      return parsed;
    }
  } catch (err) {
    console.error('خطا در خواندن فایل دیتابیس:', err);
  }
  return null;
}

let dbVersion = Date.now().toString();

// ذخیره دیتابیس لوکال به صورت ایمن و سازگار با سیستم‌عامل‌های ویندوز و لینوکس
function saveDatabase(data) {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    dbVersion = Date.now().toString();
    const nowIso = new Date().toISOString();
    const payload = {
      ...data,
      version: dbVersion,
      lastSavedAt: nowIso,
      serverVersion: '1.0.0',
    };
    const jsonStr = JSON.stringify(payload, null, 2);

    // روش ذخیره دو مرحله‌ای با تضمین کارکرد در ویندوز (جلوگیری از EPERM rename)
    try {
      fs.writeFileSync(tempFile, jsonStr, 'utf-8');
      try {
        fs.renameSync(tempFile, DB_FILE);
      } catch (renameErr) {
        fs.copyFileSync(tempFile, DB_FILE);
        try { fs.unlinkSync(tempFile); } catch {}
      }
    } catch (writeErr) {
      fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
    }

    // بک‌آپ دوره‌ای (هر ساعت یا روز)
    const now = new Date();
    const backupFileName = `backup-${now.toISOString().slice(0, 13).replace(/:/g, '-')}.json`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    if (!fs.existsSync(backupPath)) {
      try {
        fs.writeFileSync(backupPath, jsonStr, 'utf-8');
        cleanOldBackups();
      } catch {}
    }
    return { success: true, version: dbVersion, savedAt: nowIso };
  } catch (err) {
    console.error('خطا در ذخیره‌سازی دیتابیس:', err);
    return { success: false, error: err.message };
  }
}

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 20) {
      files.slice(20).forEach((f) => {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
        } catch {}
      });
    }
  } catch {}
}

// ------------------- API ENDPOINTS -------------------

// وضعیت سرور و مشخصات شبکه
app.get(['/api/lan/status', '/api/status'], (req, res) => {
  const ips = getLocalNetworkIps();
  const db = readDatabase();
  res.json({
    ok: true,
    name: 'حامی - سرور شبکه محلی',
    mode: 'LAN_HOST',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    port: currentPort,
    localIps: ips,
    hasData: !!db,
    version: db ? db.version || dbVersion : dbVersion,
    stats: db ? {
      driversCount: db.drivers ? db.drivers.length : 0,
      vehiclesCount: db.vehicles ? db.vehicles.length : 0,
      staffCount: db.staffMembers ? db.staffMembers.length : 0,
      lastSaved: db.lastSavedAt || null,
    } : null,
  });
});

// استعلام سبک نسخه دیتابیس برای همگام‌سازی لحظه‌ای
app.get(['/api/lan/version', '/api/version'], (req, res) => {
  const db = readDatabase();
  res.json({
    ok: true,
    version: db ? db.version || dbVersion : dbVersion,
    lastSavedAt: db ? db.lastSavedAt || null : null,
  });
});

// دریافت داده‌های مشترک
app.get(['/api/lan/db', '/api/db'], (req, res) => {
  const db = readDatabase();
  if (db) {
    res.json({
      ok: true,
      data: db,
      version: db.version || dbVersion,
      lastSavedAt: db.lastSavedAt || null,
    });
  } else {
    res.json({ ok: false, data: null, message: 'هنوز داده‌ای ذخیره نشده است' });
  }
});

// ذخیره داده‌های مشترک از هر کلاینت متصل در شبکه
app.post(['/api/lan/db', '/api/db'], (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ ok: false, error: 'داده نامعتبر است' });
  }

  const result = saveDatabase(data);
  if (result.success) {
    res.json({
      ok: true,
      message: 'اطلاعات با موفقیت در دیتابیس سرور محلی ذخیره شد',
      version: result.version,
      savedAt: result.savedAt,
    });
  } else {
    res.status(500).json({ ok: false, error: result.error || 'خطا در ثبت اطلاعات در هارد دیسک سرور' });
  }
});

// لیست بک‌آپ‌های خودکار سرور
app.get('/api/lan/backups', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          filename: f,
          sizeBytes: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ ok: true, backups: files });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// دانلود مستقیم نسخه پشتیبان فعال یا خروجی دیتابیس برای کلاینت‌های شبکه
app.get('/api/lan/export', (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const nowStr = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="hami-database-export-${nowStr}.json"`);
      res.sendFile(DB_FILE);
    } else {
      res.status(404).json({ ok: false, error: 'هنوز فایلی در سرور ثبت نشده است' });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// دانلود یک فایل بک‌آپ مشخص با تدابیر امنیتی جلوگیری از Path Traversal
app.get('/api/lan/backup/download/:filename', (req, res) => {
  try {
    const rawFilename = path.basename(req.params.filename);
    const targetPath = path.join(BACKUPS_DIR, rawFilename);
    if (fs.existsSync(targetPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${rawFilename}"`);
      res.sendFile(targetPath);
    } else {
      res.status(404).json({ ok: false, error: 'فایل بک‌آپ مورد نظر یافت نشد' });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// سرو کردن فایل‌های استاتیک برنامه ساخته‌شده (Production dist)
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    const ips = getLocalNetworkIps();
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>سرور محلی سامانه حامی</title>
        <style>
          body { font-family: Tahoma, sans-serif; background: #0a101f; color: #f1f5f9; padding: 40px; text-align: center; }
          .card { background: #111e38; border: 1px solid #1e3a8a; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { color: #f59e0b; margin-top: 0; }
          .ip-box { background: #050a14; padding: 12px; border-radius: 8px; margin: 10px 0; font-family: monospace; font-size: 16px; color: #38bdf8; }
          .cmd { background: #1e293b; padding: 10px; border-radius: 6px; font-family: monospace; display: inline-block; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>سرور شبکه محلی سامانه حامی فعال است</h1>
          <p>پوشه dist هنوز بیلد نشده است. لطفاً دستور زیر را در ترمینال اجرا کنید:</p>
          <div class="cmd">npm run build</div>
          <p style="margin-top: 25px;">آدرس‌های شبکه محلی برای سایر سیستم‌ها:</p>
          ${ips.map(ip => `<div class="ip-box">http://${ip.address}:${currentPort}</div>`).join('')}
        </div>
      </body>
      </html>
    `);
  });
}

// شروع به کار سرور با قابلیت انتخاب پورت آزاد
function startServer(portToTry) {
  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[!] پورت ${portToTry} مشغول است، در حال تست پورت ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('[!] خطای سرور:', err);
    }
  });

  server.listen(portToTry, HOST, () => {
    currentPort = portToTry;
    const ips = getLocalNetworkIps();
    console.log('\n' + '='.repeat(60));
    console.log('       سامانه لجستیک حامی - سرور شبکه محلی (LAN Server)');
    console.log('='.repeat(60));
    console.log(`[+] وضعیت: آماده به کار روی پورت ${portToTry}`);
    console.log(`[+] دسترسی از همین سیستم:         http://localhost:${portToTry}`);
    console.log(`[+] دسترسی سایر سیستم‌ها در شبکه LAN / Wi-Fi:`);
    if (ips.length === 0) {
      console.log(`    (کارت شبکه فعالی پیدا نشد - از اتصال به مودم یا کابل LAN مطمئن شوید)`);
    } else {
      ips.forEach((item) => {
        console.log(`    -> http://${item.address}:${portToTry}  (${item.interface})`);
      });
    }
    console.log('='.repeat(60));
    console.log('مسیر ذخیره دیتابیس مشترک:', DB_FILE);
    console.log('برای خروج کلید Ctrl + C را فشار دهید.\n');
  });
}

startServer(DEFAULT_PORT);
