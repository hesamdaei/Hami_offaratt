import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { DECODED_BACKUP } from './src/utils/backupDecoder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

// Database & backup storage paths
const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'hami-database.json');
const DIST_DIR = path.join(__dirname, 'dist');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// In-memory version tracker for fast polling
let dbVersion = Date.now().toString();
let lastSavedTimestamp = new Date().toISOString();

// Initialize DB file if missing
function initializeDatabaseIfEmpty() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      const initialPayload = {
        drivers: DECODED_BACKUP.drivers || [],
        records: DECODED_BACKUP.records || {},
        vehicles: DECODED_BACKUP.vehicles || [],
        driverDirectory: DECODED_BACKUP.driverDirectory || [],
        staffMembers: DECODED_BACKUP.staffMembers || [],
        staffRecords: DECODED_BACKUP.staffRecords || {},
        rules: DECODED_BACKUP.rules || {},
        lastSavedAt: lastSavedTimestamp,
        serverVersion: '1.0.0',
        version: dbVersion,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialPayload, null, 2), 'utf-8');
      console.log('[+] دیتابیس شبکه با داده‌های اولیه ایجاد شد:', DB_FILE);
    } catch (e) {
      console.error('[-] خطا در ایجاد اولیه فایل دیتابیس:', e);
    }
  } else {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.version) dbVersion = parsed.version;
      if (parsed.lastSavedAt) lastSavedTimestamp = parsed.lastSavedAt;
    } catch {}
  }
}

initializeDatabaseIfEmpty();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS for multi-device network clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper: detect local network IPs
function getLocalNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips: Array<{ interface: string; address: string }> = [];
  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name];
    if (!list) continue;
    for (const iface of list) {
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

// Read database from file
function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('خطا در خواندن فایل دیتابیس:', err);
  }
  return null;
}

// Clean old backups keeping last 20
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

// Save database safely and cross-platform (Windows & Linux resilient)
function saveDatabase(data: any) {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const now = new Date();
    dbVersion = Date.now().toString();
    lastSavedTimestamp = now.toISOString();

    const payload = {
      ...data,
      version: dbVersion,
      lastSavedAt: lastSavedTimestamp,
      serverVersion: '1.0.0',
    };

    const jsonStr = JSON.stringify(payload, null, 2);

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

    // Create automatic snapshot backup
    const backupFileName = `backup-${now.toISOString().slice(0, 13).replace(/:/g, '-')}.json`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    if (!fs.existsSync(backupPath)) {
      try {
        fs.writeFileSync(backupPath, jsonStr, 'utf-8');
        cleanOldBackups();
      } catch {}
    }
    return true;
  } catch (err) {
    console.error('خطا در ذخیره‌سازی دیتابیس:', err);
    return false;
  }
}

// ================= API ROUTES =================

// Server status & network interfaces
app.get(['/api/lan/status', '/api/status'], (req, res) => {
  const ips = getLocalNetworkIps();
  const db = readDatabase();
  res.json({
    ok: true,
    name: 'حامی - سرور شبکه محلی و دیتابیس متمرکز',
    mode: 'LAN_HOST',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    port: PORT,
    localIps: ips,
    hasData: !!db,
    version: dbVersion,
    lastSavedAt: lastSavedTimestamp,
    stats: db ? {
      driversCount: Array.isArray(db.drivers) ? db.drivers.length : 0,
      vehiclesCount: Array.isArray(db.vehicles) ? db.vehicles.length : 0,
      staffCount: Array.isArray(db.staffMembers) ? db.staffMembers.length : 0,
      lastSaved: db.lastSavedAt || lastSavedTimestamp,
    } : null,
  });
});

// Lightweight version check for client sync polling (extremely fast)
app.get(['/api/lan/version', '/api/version'], (req, res) => {
  res.json({
    ok: true,
    version: dbVersion,
    lastSavedAt: lastSavedTimestamp,
  });
});

// Retrieve shared database
app.get(['/api/lan/db', '/api/db'], (req, res) => {
  const db = readDatabase();
  if (db) {
    res.json({ ok: true, data: db, version: dbVersion, lastSavedAt: lastSavedTimestamp });
  } else {
    res.json({ ok: false, data: null, message: 'هنوز داده‌ای ذخیره نشده است' });
  }
});

// Save shared database from any client across the network
app.post(['/api/lan/db', '/api/db'], (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ ok: false, error: 'داده نامعتبر است' });
  }

  const success = saveDatabase(data);
  if (success) {
    res.json({
      ok: true,
      message: 'اطلاعات با موفقیت در دیتابیس سرور ذخیره شد',
      version: dbVersion,
      savedAt: lastSavedTimestamp,
    });
  } else {
    res.status(500).json({ ok: false, error: 'خطا در ثبت اطلاعات در فایل دیتابیس' });
  }
});

// List backups
app.get(['/api/lan/backups', '/api/backups'], (req, res) => {
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
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Setup Frontend Serving: Vite dev middleware or Static Production
async function start() {
  if (!isProd) {
    // Development mode: mount Vite dev middleware
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    if (fs.existsSync(DIST_DIR)) {
      app.use(express.static(DIST_DIR));
      app.get('*', (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
      });
    } else {
      app.get('*', (req, res) => {
        res.send('پوشه dist ساخته نشده است. لطفاً npm run build را اجرا نمایید.');
      });
    }
  }

  app.listen(PORT, HOST, () => {
    const ips = getLocalNetworkIps();
    console.log('\n' + '='.repeat(60));
    console.log('       سامانه لجستیک حامی - سرور یکپارچه فول‌استک و دیتابیس شبکه');
    console.log('='.repeat(60));
    console.log(`[+] وضعیت سرور: در حال اجرا روی پورت ${PORT}`);
    console.log(`[+] دسترسی لوکال: http://localhost:${PORT}`);
    console.log(`[+] دسترسی شبکه LAN / Wi-Fi:`);
    if (ips.length === 0) {
      console.log(`    (کارت شبکه فعال محلی یافت نشد)`);
    } else {
      ips.forEach((item) => {
        console.log(`    -> http://${item.address}:${PORT}  (${item.interface})`);
      });
    }
    console.log('='.repeat(60));
    console.log('فایل دیتابیس:', DB_FILE);
    console.log('='.repeat(60) + '\n');
  });
}

start().catch((err) => {
  console.error('خطای راه‌اندازی سرور:', err);
  process.exit(1);
});
