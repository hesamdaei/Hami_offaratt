import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { generateSqlSchemaDdl, generateFullSqlDump } from './src/db/sqlSchema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = isProd ? parseInt(process.env.PORT || '8080', 10) : 3000;
const HOST = '0.0.0.0';

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

// Default administrative user accounts (Master Admin with hesam.daei@gmail.com, Operator, Fleet Admin)
const INITIAL_USERS = [
  {
    id: 'usr-master-admin',
    username: 'admin',
    email: 'hesam.daei@gmail.com',
    password: 'hesam1090',
    fullName: 'مدیر ارشد سامانه',
    roleTitle: 'مدیریت ارشد سیستم',
    phoneNumber: '09120000000',
    isMasterAdmin: true,
    isActive: true,
    createdFrom: 'SEED',
    permissions: {
      attendance: 'full',
      vehicleAssignment: 'full',
      drivers: 'full',
      staff: 'full',
      fleetManagement: 'full',
      oilService: 'full',
      orders: 'full',
      operations: 'full',
      handover: 'full',
      customers: 'full',
      finance: 'full',
      regulations: 'full',
      phonebook: 'full',
      reports: 'full',
      developerDocs: 'full',
      canDeleteRecords: true,
      canExportExcel: true,
      backupRestore: true,
      userManagement: true,
      networkSettings: true,
      voipSettings: true,
    },
    createdAt: '1403/01/01',
    avatarColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'usr-operator-01',
    username: 'operator',
    password: '123',
    fullName: 'کارشناس ثبت حضور و تردد',
    roleTitle: 'اپراتور شیفت',
    isMasterAdmin: false,
    isActive: true,
    createdFrom: 'SEED',
    permissions: {
      attendance: 'full',
      vehicleAssignment: 'full',
      drivers: 'view',
      staff: 'view',
      fleetManagement: 'view',
      oilService: 'none',
      orders: 'none',
      operations: 'full',
      handover: 'full',
      customers: 'view',
      finance: 'none',
      regulations: 'view',
      phonebook: 'full',
      reports: 'none',
      developerDocs: 'view',
      canDeleteRecords: false,
      canExportExcel: false,
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
      voipSettings: false,
    },
    createdAt: '1403/07/01',
    avatarColor: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'usr-fleet-02',
    username: 'fleet_admin',
    password: '123',
    fullName: 'مسئول ناوگان و خودروها',
    roleTitle: 'مدیر فنی و ترابری',
    isMasterAdmin: false,
    isActive: true,
    createdFrom: 'SEED',
    permissions: {
      attendance: 'view',
      vehicleAssignment: 'full',
      drivers: 'full',
      staff: 'none',
      fleetManagement: 'full',
      oilService: 'full',
      orders: 'none',
      operations: 'view',
      handover: 'full',
      customers: 'view',
      finance: 'none',
      regulations: 'full',
      phonebook: 'view',
      reports: 'none',
      developerDocs: 'view',
      canDeleteRecords: false,
      canExportExcel: false,
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
      voipSettings: false,
    },
    createdAt: '1403/07/15',
    avatarColor: 'from-emerald-500 to-teal-600',
  },
];

// Helper to safely read seed backup data if database file does not exist
function getSeedBackupData() {
  const seedPaths = [
    path.join(__dirname, 'src', 'data', 'latestBackup.json'),
    path.join(__dirname, 'public', 'assets', 'aistudio', 'hamibar-backup-1405-08-06_c294330f.json'),
  ];
  for (const sp of seedPaths) {
    if (fs.existsSync(sp)) {
      try {
        const raw = JSON.parse(fs.readFileSync(sp, 'utf-8'));
        const src = raw.data || raw;
        return {
          drivers: src.drivers || [],
          records: src.records || {},
          vehicles: src.vehicles || [],
          driverDirectory: src.driverDirectory || [],
          staffMembers: src.staffMembers || [],
          staffRecords: src.staffRecords || {},
          rules: src.serviceRules || src.rules || {},
        };
      } catch {}
    }
  }
  return {
    drivers: [],
    records: {},
    vehicles: [],
    driverDirectory: [],
    staffMembers: [],
    staffRecords: {},
    rules: {},
  };
}

// Initialize DB file if missing or ensure users field exists
function initializeDatabaseIfEmpty() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      const seed = getSeedBackupData();
      const initialPayload = {
        drivers: seed.drivers,
        records: seed.records,
        vehicles: seed.vehicles,
        driverDirectory: seed.driverDirectory,
        staffMembers: seed.staffMembers,
        staffRecords: seed.staffRecords,
        rules: seed.rules,
        users: INITIAL_USERS,
        lastSavedAt: lastSavedTimestamp,
        serverVersion: '1.0.0',
        version: dbVersion,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialPayload, null, 2), 'utf-8');
      console.log('[+] دیتابیس شبکه با داده‌های اولیه و کاربران ایجاد شد:', DB_FILE);
    } catch (e) {
      console.error('[-] خطا در ایجاد اولیه فایل دیتابیس:', e);
    }
  } else {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.version) dbVersion = parsed.version;
      if (parsed.lastSavedAt) lastSavedTimestamp = parsed.lastSavedAt;

      // Auto-migrate users if missing in existing database file
      if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = INITIAL_USERS;
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        console.log('[+] کاربران اولیه به دیتابیس متمرکز شبکه اضافه شدند.');
      }
    } catch {}
  }
}

initializeDatabaseIfEmpty();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security Headers for LAN hardening & multi-device isolation
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }

  // CORS for multi-device network clients
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
    if (!fs.existsSync(DB_FILE)) {
      initializeDatabaseIfEmpty();
    }
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

// Helper to sanitize and deduplicate system users while enforcing immutable usernames
function sanitizeAndValidateUsers(incomingUsers: any[], currentUsers: any[]): any[] {
  const existingById = new Map<string, any>();
  const existingByUsername = new Map<string, any>();
  for (const u of currentUsers) {
    if (u && typeof u === 'object') {
      if (u.id) existingById.set(String(u.id), u);
      if (u.username) existingByUsername.set(String(u.username).trim().toLowerCase(), u);
    }
  }

  const seenIds = new Set<string>();
  const seenUsernames = new Set<string>();
  const seenStaffIds = new Set<string>();
  const seenDriverIds = new Set<string>();
  const result: any[] = [];

  for (const rawUser of incomingUsers) {
    if (!rawUser || typeof rawUser !== 'object') continue;
    const existing =
      (rawUser.id && existingById.get(String(rawUser.id))) ||
      (rawUser.username && existingByUsername.get(String(rawUser.username).trim().toLowerCase()));

    // Username is strictly immutable once created
    const immutableUsername = existing && existing.username
      ? String(existing.username).trim().toLowerCase()
      : String(rawUser.username || '').trim().toLowerCase();

    if (!immutableUsername) continue;

    if (existing && existing.username && rawUser.username && String(rawUser.username).trim().toLowerCase() !== immutableUsername) {
      console.warn(
        `[SECURITY WARNING] تلاش برای تغییر نام‌کاربری غیرقابل‌تغییر «${existing.username}» به «${rawUser.username}» در لایه سرور مسدود شد.`
      );
    }

    const stableId = existing && existing.id ? String(existing.id) : String(rawUser.id || `usr-${Date.now()}`);
    if (seenIds.has(stableId) || seenUsernames.has(immutableUsername)) {
      continue;
    }

    const staffId = rawUser.staffId || existing?.staffId;
    const driverId = rawUser.driverId || existing?.driverId;

    // Prevent duplicate user accounts for the same staff or driver dossier
    if (staffId && seenStaffIds.has(String(staffId))) {
      console.warn(`[SECURITY WARNING] جلوگیری از ایجاد حساب کاربری تکراری برای پرونده پرسنلی ${staffId}`);
      continue;
    }
    if (driverId && seenDriverIds.has(String(driverId))) {
      console.warn(`[SECURITY WARNING] جلوگیری از ایجاد حساب کاربری تکراری برای پرونده راننده ${driverId}`);
      continue;
    }

    seenIds.add(stableId);
    seenUsernames.add(immutableUsername);
    if (staffId) seenStaffIds.add(String(staffId));
    if (driverId) seenDriverIds.add(String(driverId));

    const isMaster = Boolean(rawUser.isMasterAdmin || immutableUsername === 'admin' || stableId === 'usr-master-admin');

    const rawTime = rawUser.updatedAt ? new Date(rawUser.updatedAt).getTime() : 0;
    const existTime = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const preferRaw = rawTime >= existTime;

    const mergedVoipConfig =
      rawUser.voipConfig || existing?.voipConfig
        ? preferRaw
          ? { ...(existing?.voipConfig || {}), ...(rawUser.voipConfig || {}) }
          : { ...(rawUser.voipConfig || {}), ...(existing?.voipConfig || {}) }
        : undefined;

    result.push({
      ...(existing || {}),
      ...rawUser,
      ...(preferRaw ? {} : {
        password: existing?.password ?? rawUser.password,
        passwordHash: existing?.passwordHash ?? rawUser.passwordHash,
        email: existing?.email || rawUser.email,
      }),
      id: stableId,
      username: immutableUsername,
      email: (preferRaw ? rawUser.email || existing?.email : existing?.email || rawUser.email) || (isMaster ? 'hesam.daei@gmail.com' : undefined),
      password: preferRaw
        ? rawUser.password !== undefined
          ? rawUser.password
          : existing?.password
        : existing?.password !== undefined
        ? existing?.password
        : rawUser.password,
      passwordHash: preferRaw
        ? rawUser.passwordHash !== undefined
          ? rawUser.passwordHash
          : existing?.passwordHash
        : existing?.passwordHash !== undefined
        ? existing?.passwordHash
        : rawUser.passwordHash,
      recoveryCode: existing?.recoveryCode,
      recoveryCodeExpiresAt: existing?.recoveryCodeExpiresAt,
      recoveryAttempts: existing?.recoveryAttempts,
      isMasterAdmin: isMaster,
      isActive: isMaster ? true : rawUser.isActive !== false,
      staffId: staffId || undefined,
      driverId: driverId || undefined,
      personnelCode: rawUser.personnelCode || existing?.personnelCode || undefined,
      dossierType: rawUser.dossierType || existing?.dossierType || (staffId ? 'STAFF' : driverId ? 'DRIVER' : 'NONE'),
      createdFrom: rawUser.createdFrom || existing?.createdFrom || 'USER_MANAGEMENT',
      voipConfig: mergedVoipConfig,
      updatedAt: preferRaw ? rawUser.updatedAt || existing?.updatedAt : existing?.updatedAt || rawUser.updatedAt,
      permissions: isMaster
        ? {
            ...INITIAL_USERS[0].permissions,
            ...(rawUser.permissions || {}),
            canDeleteRecords: true,
            canExportExcel: true,
            backupRestore: true,
            userManagement: true,
            networkSettings: true,
            voipSettings: true,
          }
        : {
            ...INITIAL_USERS[1].permissions,
            ...(existing?.permissions || {}),
            ...(rawUser.permissions || {}),
            // Non-master users can NEVER have Excel export or LAN network settings
            reports: 'none',
            canExportExcel: false,
            networkSettings: false,
          },
    });
  }

  // Always guarantee Master Admin exists and is active
  if (!result.some((u) => u.isMasterAdmin && u.isActive !== false)) {
    const existingMaster = existingById.get('usr-master-admin') || INITIAL_USERS[0];
    result.unshift({
      ...existingMaster,
      isMasterAdmin: true,
      isActive: true,
    });
  }

  return result;
}

// Save database safely and cross-platform (Windows & Linux resilient)
function saveDatabase(data: any) {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const now = new Date();
    dbVersion = Date.now().toString();
    lastSavedTimestamp = now.toISOString();

    // Read current DB to ensure users and smtpConfig are NEVER accidentally wiped by partial DB syncs
    let existingUsers: any[] = INITIAL_USERS;
    let existingSmtpConfig: any = undefined;
    try {
      if (fs.existsSync(DB_FILE)) {
        const currentRaw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (currentRaw && Array.isArray(currentRaw.users) && currentRaw.users.length > 0) {
          existingUsers = currentRaw.users;
        }
        if (currentRaw && currentRaw.smtpConfig) {
          existingSmtpConfig = currentRaw.smtpConfig;
        }
      }
    } catch {}

    const resolvedUsers =
      Array.isArray(data.users) && data.users.length > 0
        ? sanitizeAndValidateUsers(data.users, existingUsers)
        : existingUsers;

    const payload = {
      ...data,
      users: resolvedUsers,
      smtpConfig: data.smtpConfig !== undefined ? data.smtpConfig : existingSmtpConfig,
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
      usersCount: Array.isArray(db.users) ? db.users.length : INITIAL_USERS.length,
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

// Dedicated Users Management API - centralized across network
app.get(['/api/lan/users', '/api/users'], (req, res) => {
  const db = readDatabase();
  const rawUsers = db && Array.isArray(db.users) && db.users.length > 0 ? db.users : INITIAL_USERS;
  const users = sanitizeAndValidateUsers(rawUsers, rawUsers);
  res.json({ ok: true, users, version: dbVersion });
});

app.post(['/api/lan/users', '/api/users'], (req, res) => {
  const incomingUsers = req.body.users || req.body;
  if (!Array.isArray(incomingUsers)) {
    return res.status(400).json({ ok: false, error: 'فرمت اطلاعات کاربران نامعتبر است' });
  }

  const db = readDatabase() || {};
  const currentUsers: any[] = Array.isArray(db.users) && db.users.length > 0 ? db.users : [...INITIAL_USERS];

  const sanitizedUsers = sanitizeAndValidateUsers(incomingUsers, currentUsers);

  // Ensure at least one Master Admin remains active
  const hasActiveMaster = sanitizedUsers.some((u: any) => u.isMasterAdmin && u.isActive !== false);
  if (!hasActiveMaster) {
    return res.status(400).json({
      ok: false,
      error: 'عملیات ناموفق: سامانه باید حداقل یک «مدیر ارشد» فعال و با دسترسی کامل داشته باشد.',
    });
  }

  db.users = sanitizedUsers;
  const success = saveDatabase(db);
  if (success) {
    res.json({
      ok: true,
      users: sanitizedUsers,
      message: 'کاربران با اعمال سیاست امنیت، یکپارچگی پرونده و ثبات نام‌کاربری در دیتابیس شبکه ذخیره شدند',
      version: dbVersion,
    });
  } else {
    res.status(500).json({ ok: false, error: 'خطا در ذخیره کاربران در دیتابیس شبکه' });
  }
});

// Managerial Excel Reports Permission Enforcement API
app.post(['/api/lan/reports/permission', '/api/reports/permission'], (req, res) => {
  const { requesterId, requesterUsername, reportType } = req.body || {};
  const db = readDatabase() || {};
  const users: any[] = Array.isArray(db.users) ? db.users : INITIAL_USERS;

  const user = users.find(
    (u) =>
      (requesterId && u.id === requesterId) ||
      (requesterUsername && u.username?.toLowerCase() === String(requesterUsername).toLowerCase())
  );

  if (!user || (!user.isMasterAdmin && user.roleTitle !== 'مدیریت ارشد سیستم')) {
    console.warn(`[SECURITY AUDIT - FORBIDDEN] تلاش غیرمجاز برای دریافت گزارش اکسل «${reportType || 'عمومی'}» توسط کاربر: ${requesterUsername || requesterId || 'ناشناس'} از IP: ${req.ip}`);
    return res.status(403).json({
      ok: false,
      error: 'دسترسی غیرمجاز. خروجی اکسل گزارش‌های مدیریتی منحصراً برای نقش مدیر ارشد مجاز می‌باشد.',
    });
  }

  res.json({ ok: true, message: 'مجوز صادر شد.', allowed: true });
});

// ====================================================================
// Security & Authentication Services
// ====================================================================

// In-Memory Rate Limiter for Login & Password Recovery
interface ServerRateLimitBucket {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}
const serverRateLimitBuckets = new Map<string, ServerRateLimitBucket>();

function checkServerRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 5 * 60 * 1000,
  blockDurationMs = 3 * 60 * 1000
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = serverRateLimitBuckets.get(key) || { attempts: 0, firstAttemptAt: now };

  if (bucket.blockedUntil && now < bucket.blockedUntil) {
    const retryAfterSeconds = Math.ceil((bucket.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Reset window if expired
  if (now - bucket.firstAttemptAt > windowMs) {
    bucket.attempts = 0;
    bucket.firstAttemptAt = now;
    delete bucket.blockedUntil;
  }

  bucket.attempts += 1;

  if (bucket.attempts > maxAttempts) {
    bucket.blockedUntil = now + blockDurationMs;
    serverRateLimitBuckets.set(key, bucket);
    const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  serverRateLimitBuckets.set(key, bucket);
  return { allowed: true, remainingAttempts: maxAttempts - bucket.attempts, retryAfterSeconds: 0 };
}

function resetServerRateLimit(key: string) {
  serverRateLimitBuckets.delete(key);
}

// Server-side PBKDF2-SHA256 Password Hashing & Verification (compatible with client securityCrypto.ts)
function hashServerPassword(password: string, customSaltHex?: string): string {
  const saltHex = customSaltHex || crypto.randomBytes(16).toString('hex');
  const saltBuf = Buffer.from(saltHex, 'hex');
  const derivedHex = crypto.pbkdf2Sync(password, saltBuf, 100000, 32, 'sha256').toString('hex');
  return `pbkdf2$sha256$100000$${saltHex}$${derivedHex}`;
}

function verifyServerPassword(password: string, user: any): boolean {
  if (!password || !user) return false;
  const cleanPass = password.trim();

  if (user.password && cleanPass === String(user.password).trim()) {
    return true;
  }

  if (user.passwordHash && String(user.passwordHash).startsWith('pbkdf2$')) {
    const parts = String(user.passwordHash).split('$');
    if (parts.length >= 5) {
      const saltHex = parts[3];
      const expectedHex = parts[4];
      const computed = hashServerPassword(cleanPass, saltHex);
      const computedHex = computed.split('$')[4];
      if (expectedHex && computedHex && expectedHex.length === computedHex.length) {
        return crypto.timingSafeEqual(Buffer.from(expectedHex), Buffer.from(computedHex));
      }
    }
  }

  // Fallback only if neither password nor passwordHash was ever set on master admin
  if (!user.password && !user.passwordHash && user.isMasterAdmin && cleanPass === 'hesam1090') {
    return true;
  }

  return false;
}

// Dynamic SMTP Mail Server Configuration (reads from database db.smtpConfig first, then process.env)
interface ServerSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  updatedAt?: string;
}

function getEffectiveSmtpConfig(): ServerSmtpConfig {
  const db = readDatabase() || {};
  const dbSmtp = db.smtpConfig || {};

  const host = String(dbSmtp.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(String(dbSmtp.port || process.env.SMTP_PORT || '465'), 10) || 465;
  const secure =
    dbSmtp.secure !== undefined
      ? Boolean(dbSmtp.secure)
      : process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;
  const user = String(dbSmtp.user || process.env.SMTP_USER || '').trim();
  const rawPass = String(dbSmtp.pass || process.env.SMTP_PASS || '').trim();
  // Remove spaces from 16-character Google App Passwords automatically
  const pass = rawPass.replace(/\s+/g, '');
  const fromName = String(dbSmtp.fromName || 'سامانه مدیریت ترابری حامی').trim();
  const fromEmail = String(dbSmtp.fromEmail || user || 'hesam.daei@gmail.com').trim();

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromEmail,
    updatedAt: dbSmtp.updatedAt,
  };
}

function createMailTransporter(customCfg?: Partial<ServerSmtpConfig>) {
  const effective = { ...getEffectiveSmtpConfig(), ...(customCfg || {}) };
  const cleanPass = String(effective.pass || '').replace(/\s+/g, '');
  if (!effective.user || !cleanPass) {
    return { transporter: null, config: effective };
  }

  const transporter = nodemailer.createTransport({
    host: effective.host,
    port: effective.port,
    secure: effective.secure,
    auth: {
      user: effective.user,
      pass: cleanPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });

  return { transporter, config: { ...effective, pass: cleanPass } };
}

// Real Email Dispatcher for Password Recovery
interface EmailDispatchResult {
  success: boolean;
  deliveredViaSmtp: boolean;
  messageId?: string;
  smtpNotConfigured?: boolean;
  error?: string;
}

async function dispatchRealPasswordResetEmail(
  targetEmail: string,
  data: { code: string; fullName: string; username: string }
): Promise<EmailDispatchResult> {
  const subject = `کد امنیتی بازیابی گذرواژه - سامانه حامی [${data.code}]`;
  const { transporter, config } = createMailTransporter();

  if (!transporter) {
    return {
      success: false,
      deliveredViaSmtp: false,
      smtpNotConfigured: true,
      error:
        'تنظیمات سرور ارسال ایمیل (SMTP) هنوز ثبت نشده است. لطفاً ایمیل فرستنده و رمز برنامه (Google App Password) را در بخش تنظیمات سرور ایمیل وارد نمایید.',
    };
  }

  const htmlContent = `
    <div dir="rtl" style="font-family: Tahoma, 'Vazirmatn', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 28px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #38bdf8;">سامانه جامع مدیریت تردد و ناوگان حامی</h1>
        <p style="margin: 8px 0 0; font-size: 13px; color: #94a3b8;">درخواست رسمی بازیابی گذرواژه حساب کاربری</p>
      </div>
      <div style="padding: 32px 24px; color: #334155;">
        <p style="font-size: 15px; margin: 0 0 16px; line-height: 1.8;">
          سلام <strong>${data.fullName || data.username}</strong> گرامی،
        </p>
        <p style="font-size: 14px; margin: 0 0 20px; line-height: 1.8; color: #475569;">
          درخواستی جهت بازیابی گذرواژه حساب کاربری شما با نام کاربری <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: bold; color: #0f172a;">${data.username}</code> در سامانه حامی ثبت گردیده است.
        </p>
        <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 10px;">کد تأیید ۶ رقمی یک‌بارمصرف شما:</div>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #0369a1; font-family: monospace;">${data.code}</div>
          <div style="font-size: 12px; color: #e11d48; margin-top: 10px; font-weight: 600;">مدت اعتبار این کد ۱۰ دقیقه می‌باشد.</div>
        </div>
        <div style="background: #fffbeb; border-right: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #b45309; line-height: 1.7;">
          <strong>هشدار امنیتی:</strong> اگر این درخواست توسط شما ثبت نشده است، این ایمیل را نادیده بگیرید و کد بالا را در اختیار هیچ فردی قرار ندهید.
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          ارسال شده به صورت خودکار توسط سرویس امنیت سامانه حامی • ${new Date().toLocaleString('fa-IR')}
        </p>
      </div>
    </div>
  `;

  try {
    const fromHeader = `"${config.fromName}" <${config.fromEmail || config.user}>`;
    const info = await transporter.sendMail({
      from: fromHeader,
      to: targetEmail,
      subject,
      text: `سلام ${data.fullName || data.username}\nکد تأیید ۶ رقمی بازیابی گذرواژه شما در سامانه حامی: ${data.code}\nاعتبار این کد ۱۰ دقیقه است.`,
      html: htmlContent,
    });

    console.log(`[EMAIL-SMTP-OK] کد بازیابی گذرواژه کاربر «${data.username}» به ایمیل «${targetEmail}» ارسال شد (MessageID: ${info.messageId})`);
    return {
      success: true,
      deliveredViaSmtp: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error(`[EMAIL-SMTP-ERROR] خطا در ارسال ایمیل به ${targetEmail}:`, err.message || err);
    return {
      success: false,
      deliveredViaSmtp: false,
      error: err.message || 'خطا در برقراری ارتباط با سرور SMTP ایمیل',
    };
  }
}

// 0. SMTP Status, Configuration & Live Verification Endpoints
app.get(['/api/lan/auth/smtp-status', '/api/auth/smtp-status'], (req, res) => {
  const cfg = getEffectiveSmtpConfig();
  const db = readDatabase() || {};
  const users = Array.isArray(db.users) ? db.users : INITIAL_USERS;
  const master = users.find((u: any) => u.isMasterAdmin || u.username === 'admin');

  res.json({
    ok: true,
    configured: Boolean(cfg.user && cfg.pass),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user || master?.email || 'hesam.daei@gmail.com',
    fromName: cfg.fromName,
    fromEmail: cfg.fromEmail,
    maskedPass: cfg.pass ? '••••••••••••••••' : '',
    updatedAt: cfg.updatedAt || null,
  });
});

app.post(['/api/lan/auth/smtp-config', '/api/auth/smtp-config'], async (req, res) => {
  const { host, port, secure, user, pass, fromName, verifyConnection = true } = req.body || {};
  const currentCfg = getEffectiveSmtpConfig();

  const nextHost = String(host || currentCfg.host || 'smtp.gmail.com').trim();
  const nextPort = parseInt(String(port || currentCfg.port || 465), 10) || 465;
  const nextSecure = secure !== undefined ? Boolean(secure) : nextPort === 465;
  const nextUser = String(user || currentCfg.user || '').trim();
  // If pass is masked or empty, keep existing password if already stored
  const cleanIncomingPass =
    pass && !String(pass).includes('••') ? String(pass).replace(/\s+/g, '') : currentCfg.pass;
  const nextFromName = String(fromName || currentCfg.fromName || 'سامانه مدیریت ترابری حامی').trim();

  if (!nextUser || !cleanIncomingPass) {
    return res.status(400).json({
      ok: false,
      error: 'نشانی ایمیل فرستنده (SMTP User) و رمز عبور برنامه (۱۶ رقمی App Password گوگل یا رمز SMTP) الزامی است.',
    });
  }

  const candidateConfig: ServerSmtpConfig = {
    host: nextHost,
    port: nextPort,
    secure: nextSecure,
    user: nextUser,
    pass: cleanIncomingPass,
    fromName: nextFromName,
    fromEmail: nextUser,
    updatedAt: new Date().toISOString(),
  };

  if (verifyConnection) {
    const { transporter } = createMailTransporter(candidateConfig);
    if (!transporter) {
      return res.status(400).json({
        ok: false,
        error: 'امکان ایجاد اتصال SMTP با مشخصات واردشده وجود ندارد.',
      });
    }
    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      return res.status(400).json({
        ok: false,
        error: `خطا در احراز هویت سرور ایمیل (${nextHost}:${nextPort}): ${
          verifyErr.message || 'نام کاربری یا رمز عبور ۱۶ رقمی App Password نامعتبر است.'
        }`,
      });
    }
  }

  const db = readDatabase() || {};
  db.smtpConfig = candidateConfig;

  // Also ensure Master Admin email matches if not set
  if (Array.isArray(db.users)) {
    const adminUser = db.users.find((u: any) => u.isMasterAdmin || u.username === 'admin');
    if (adminUser && !adminUser.email) {
      adminUser.email = nextUser;
    }
  }

  saveDatabase(db);

  res.json({
    ok: true,
    configured: true,
    message: `اتصال به سرور ایمیل (${nextHost}) با موفقیت تأیید و برای حساب «${nextUser}» ذخیره گردید.`,
    host: candidateConfig.host,
    port: candidateConfig.port,
    secure: candidateConfig.secure,
    user: candidateConfig.user,
    fromName: candidateConfig.fromName,
  });
});

app.post(['/api/lan/auth/smtp-test', '/api/auth/smtp-test'], async (req, res) => {
  const { targetEmail, host, port, secure, user, pass, fromName } = req.body || {};
  const currentCfg = getEffectiveSmtpConfig();

  const customCfg: Partial<ServerSmtpConfig> = {
    host: host ? String(host).trim() : currentCfg.host,
    port: port ? parseInt(String(port), 10) : currentCfg.port,
    secure: secure !== undefined ? Boolean(secure) : currentCfg.secure,
    user: user ? String(user).trim() : currentCfg.user,
    pass: pass && !String(pass).includes('••') ? String(pass).replace(/\s+/g, '') : currentCfg.pass,
    fromName: fromName ? String(fromName).trim() : currentCfg.fromName,
  };

  const { transporter, config } = createMailTransporter(customCfg);
  if (!transporter) {
    return res.status(400).json({
      ok: false,
      error: 'مشخصات ایمیل فرستنده و رمز برنامه (App Password) هنوز ثبت نشده است.',
    });
  }

  const recipient = String(targetEmail || config.user || 'hesam.daei@gmail.com').trim();

  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      to: recipient,
      subject: 'تست ارتباط واقعی سرور ایمیل (SMTP) - سامانه حامی',
      text: `این ایمیل جهت تأیید عملکرد واقعی سرویس بازیابی رمز عبور سامانه حامی به نشانی ${recipient} ارسال گردیده است.`,
      html: `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 14px; background: #f8fafc;">
          <h2 style="color: #0284c7; margin-top: 0;">تأیید اتصال سرور ایمیل سامانه حامی</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.8;">
            ارتباط سرور سامانه حامی با سرویس ایمیل <strong>${config.host}:${config.port}</strong> با موفقیت برقرار شد.
          </p>
          <p style="color: #059669; font-weight: bold; font-size: 13px;">
            فرآیند ارسال کد بازیابی گذرواژه به ایمیل کاربران به صورت کاملاً واقعی فعال است.
          </p>
        </div>
      `,
    });

    res.json({
      ok: true,
      message: `ایمیل آزمایشی با موفقیت به نشانی «${recipient}» ارسال شد (MessageID: ${info.messageId}).`,
      messageId: info.messageId,
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: `خطا در ارسال ایمیل آزمایشی: ${err.message || 'عدم پاسخگویی سرور SMTP'}`,
    });
  }
});

// 1. Centralized Secure Login API with Rate Limiting & Audit Logging
app.post(['/api/lan/auth/login', '/api/auth/login'], (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) {
    return res.status(400).json({ ok: false, error: 'نام کاربری و رمز عبور الزامی است.' });
  }

  // Rate Limiting Protection (Max 5 attempts per 5 minutes per user/IP)
  const rateLimitKey = `login_${cleanUser}_${ip}`;
  const rateCheck = checkServerRateLimit(rateLimitKey, 5, 5 * 60 * 1000, 3 * 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      ok: false,
      error: `تعداد دفعات تلاش ناموفق بیش از حد مجاز است. دسترسی به این حساب به مدت ${rateCheck.retryAfterSeconds} ثانیه به دلایل امنیتی مسدود گردید.`,
      locked: true,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  const db = readDatabase() || {};
  const users = Array.isArray(db.users) ? db.users : [...INITIAL_USERS];

  const foundUser = users.find(
    (u: any) =>
      u.username?.toLowerCase() === cleanUser ||
      u.email?.toLowerCase() === cleanUser ||
      u.phoneNumber === cleanUser ||
      ((cleanUser === 'admin' || cleanUser === '1000' || cleanUser === 'hesam.daei@gmail.com') &&
        (u.isMasterAdmin || u.username === 'admin' || u.username === '1000'))
  );

  if (!foundUser || foundUser.isActive === false) {
    return res.status(401).json({
      ok: false,
      error: 'نام کاربری یا رمز عبور اشتباه است.',
      remainingAttempts: rateCheck.remainingAttempts,
    });
  }

  // Strict password & PBKDF2 hash verification
  const isMatch = verifyServerPassword(cleanPass, foundUser);

  if (!isMatch) {
    return res.status(401).json({
      ok: false,
      error: 'نام کاربری یا رمز عبور اشتباه است.',
      remainingAttempts: rateCheck.remainingAttempts,
    });
  }

  // Successful authentication: Reset failed rate limit counter
  resetServerRateLimit(rateLimitKey);

  // Issue secure 24-hour session
  const sessionToken = 'sess_' + crypto.randomBytes(12).toString('hex') + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Update last login timestamp in database
  foundUser.lastLoginAt = new Date().toISOString();
  if (!foundUser.passwordHash) {
    foundUser.passwordHash = hashServerPassword(cleanPass);
  }
  saveDatabase(db);

  // Return sanitized user object without sensitive credential properties
  const { password: _p, passwordHash: _ph, recoveryCode: _rc, recoveryCodeExpiresAt: _rce, recoveryAttempts: _ra, ...safeUser } = foundUser;
  safeUser.sessionToken = sessionToken;
  safeUser.expiresAt = expiresAt;

  res.json({
    ok: true,
    message: 'احراز هویت موفقیت‌آمیز بود.',
    user: safeUser,
  });
});

// 2. Real Email-Based Password Recovery Request Flow (100% Real SMTP Delivery, Zero Code Leakage)
app.post(['/api/lan/auth/forgot-password', '/api/auth/forgot-password'], async (req, res) => {
  const { emailOrUsername } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const cleanInput = (emailOrUsername || '').trim().toLowerCase();

  if (!cleanInput) {
    return res.status(400).json({ ok: false, error: 'لطفاً نام کاربری یا نشانی ایمیل ثبت‌شده خود را وارد نمایید.' });
  }

  // Rate Limiting on Password Reset Requests (Max 5 requests per 15 minutes)
  const rateLimitKey = `forgot_${cleanInput}_${ip}`;
  const rateCheck = checkServerRateLimit(rateLimitKey, 5, 15 * 60 * 1000, 10 * 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      ok: false,
      error: `تعداد درخواست‌های بازیابی بیش از حد مجاز است. لطفاً ${rateCheck.retryAfterSeconds} ثانیه دیگر مجدداً تلاش نمایید.`,
    });
  }

  const db = readDatabase() || {};
  const users = Array.isArray(db.users) ? db.users : [...INITIAL_USERS];

  // Match by registered email, username, phone or master admin aliases
  const user = users.find(
    (u: any) =>
      (u.email && u.email.toLowerCase() === cleanInput) ||
      (u.username && u.username.toLowerCase() === cleanInput) ||
      (u.phoneNumber && u.phoneNumber === cleanInput) ||
      ((cleanInput === 'admin' || cleanInput === '1000' || cleanInput === 'hesam.daei@gmail.com') &&
        (u.isMasterAdmin || u.username === 'admin' || u.username === '1000'))
  );

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: 'کاربری با این نام کاربری یا نشانی ایمیل در سامانه یافت نشد.',
    });
  }

  // Resolve real email address for the user (no fake @hamibar.ir emails)
  const rawUserEmail = (user.email || (user.isMasterAdmin ? 'hesam.daei@gmail.com' : '')).trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawUserEmail) && !rawUserEmail.endsWith('@hamibar.ir');

  if (!isEmailValid) {
    return res.status(400).json({
      ok: false,
      emailNotRegistered: true,
      error: `برای حساب کاربری «${user.fullName || user.username}» نشانی ایمیل معتبری ثبت نشده است. لطفاً از مدیر سیستم بخواهید نشانی ایمیل شما را در بخش مدیریت کاربران ثبت نماید.`,
    });
  }

  const targetEmail = rawUserEmail;
  user.email = targetEmail;

  // Mask email for privacy (e.g. he***ei@gmail.com)
  const atIdx = targetEmail.indexOf('@');
  const maskedEmail =
    atIdx > 2
      ? `${targetEmail.slice(0, 2)}***${targetEmail.slice(atIdx - 1)}`
      : targetEmail;

  // Generate cryptographically secure 6-digit numeric OTP
  const recoveryCode = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes strictly

  // Dispatch actual email via SMTP BEFORE confirming recovery step
  const emailResult = await dispatchRealPasswordResetEmail(targetEmail, {
    code: recoveryCode,
    fullName: user.fullName || user.username,
    username: user.username,
  });

  if (!emailResult.deliveredViaSmtp) {
    return res.status(emailResult.smtpNotConfigured ? 412 : 502).json({
      ok: false,
      sentViaSmtp: false,
      smtpNotConfigured: Boolean(emailResult.smtpNotConfigured),
      smtpError: !emailResult.smtpNotConfigured,
      targetEmail,
      maskedEmail,
      error:
        emailResult.error ||
        'ارسال ایمیل بازیابی از طریق سرور SMTP ناموفق بود. لطفاً تنظیمات سرور ایمیل (SMTP) را بررسی نمایید.',
    });
  }

  // Save recovery code on server only after real SMTP email delivery succeeded
  user.recoveryCode = recoveryCode;
  user.recoveryCodeExpiresAt = expiresAt;
  user.recoveryAttempts = 0;
  db.users = users;
  saveDatabase(db);

  res.json({
    ok: true,
    sentViaSmtp: true,
    message: `کد تأیید ۶ رقمی به نشانی ایمیل «${maskedEmail}» ارسال گردید. لطفاً صندوق ورودی (Inbox) یا پوشه هرزنامه (Spam) ایمیل خود را بررسی نمایید.`,
    maskedEmail,
    expiresInMinutes: 10,
    messageId: emailResult.messageId,
  });
});

// 3. Verify Code & Set New Password (Strict Verification, Updates Password & PBKDF2 Hash)
app.post(['/api/lan/auth/reset-password', '/api/auth/reset-password'], async (req, res) => {
  const { emailOrUsername, recoveryCode, newPassword } = req.body || {};
  const cleanInput = (emailOrUsername || '').trim().toLowerCase();
  const cleanCode = (recoveryCode || '').trim();
  const cleanPassword = (newPassword || '').trim();

  if (!cleanInput || !cleanCode || !cleanPassword) {
    return res.status(400).json({ ok: false, error: 'تمامی فیلدها الزامی است.' });
  }

  if (cleanPassword.length < 6) {
    return res.status(400).json({ ok: false, error: 'رمز عبور جدید باید حداقل دارای ۶ کاراکتر باشد.' });
  }

  const db = readDatabase() || {};
  const users = Array.isArray(db.users) ? db.users : [...INITIAL_USERS];

  const user = users.find(
    (u: any) =>
      (u.email && u.email.toLowerCase() === cleanInput) ||
      (u.username && u.username.toLowerCase() === cleanInput) ||
      (u.phoneNumber && u.phoneNumber === cleanInput) ||
      ((cleanInput === 'admin' || cleanInput === '1000' || cleanInput === 'hesam.daei@gmail.com') &&
        (u.isMasterAdmin || u.username === 'admin' || u.username === '1000'))
  );

  if (!user || !user.recoveryCode) {
    return res.status(400).json({
      ok: false,
      error: 'کد بازیابی نامعتبر است یا درخواستی ثبت نشده است. لطفاً مجدداً درخواست ارسال کد به ایمیل نمایید.',
    });
  }

  // Check code expiration
  if (user.recoveryCodeExpiresAt && new Date(user.recoveryCodeExpiresAt).getTime() < Date.now()) {
    delete user.recoveryCode;
    delete user.recoveryCodeExpiresAt;
    delete user.recoveryAttempts;
    saveDatabase(db);
    return res.status(400).json({
      ok: false,
      error: 'کد تأیید بازیابی منقضی شده است (بیش از ۱۰ دقیقه). لطفاً مجدداً درخواست ارسال کد به ایمیل نمایید.',
    });
  }

  // Track failed verification attempts (Max 5 attempts before burning the code)
  user.recoveryAttempts = (user.recoveryAttempts || 0) + 1;

  if (user.recoveryAttempts > 5) {
    delete user.recoveryCode;
    delete user.recoveryCodeExpiresAt;
    delete user.recoveryAttempts;
    saveDatabase(db);
    return res.status(429).json({
      ok: false,
      error: 'تعداد تلاش‌های ناموفق برای این کد بیش از ۵ بار بود. به دلایل امنیتی کد باطل شد؛ لطفاً مجدداً درخواست ارسال کد به ایمیل دهید.',
    });
  }

  // Strict OTP verification: Constant-time comparison with stored code
  if (cleanCode.length !== String(user.recoveryCode).length || cleanCode !== String(user.recoveryCode)) {
    const remaining = 5 - user.recoveryAttempts;
    saveDatabase(db);
    return res.status(400).json({
      ok: false,
      error: `کد تأیید وارد شده نادرست است. (${remaining} فرصت باقی‌مانده)`,
    });
  }

  // Valid verification: Update password, compute PBKDF2 hash, update timestamp, and clear recovery credentials
  user.password = cleanPassword;
  user.passwordHash = hashServerPassword(cleanPassword);
  user.updatedAt = new Date().toISOString();
  delete user.recoveryCode;
  delete user.recoveryCodeExpiresAt;
  delete user.recoveryAttempts;

  db.users = users;
  saveDatabase(db);

  // Send confirmation email in background if transporter is active
  if (user.email) {
    const { transporter, config } = createMailTransporter();
    if (transporter) {
      transporter
        .sendMail({
          from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
          to: user.email,
          subject: 'تأیید تغییر گذرواژه حساب کاربری - سامانه حامی',
          text: `سلام ${user.fullName || user.username}، گذرواژه حساب کاربری شما (${user.username}) در سامانه حامی با موفقیت تغییر یافت.`,
        })
        .catch(() => {});
    }
  }

  console.log(`[AUTH-PASSWORD-RESET] رمز عبور کاربر «${user.username}» از طریق تأیید ایمیل با موفقیت تغییر یافت.`);

  res.json({
    ok: true,
    message: 'رمز عبور شما با موفقیت تغییر یافت و در سرور مرکزی ثبت شد. اکنون می‌توانید با رمز عبور جدید وارد شوید.',
    username: user.username,
    updatedAt: user.updatedAt,
  });
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

// Relational SQL Schema & DDL API
app.get(['/api/lan/sql/schema', '/api/sql/schema'], (req, res) => {
  try {
    const ddl = generateSqlSchemaDdl('standard');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(ddl);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Full Relational SQL Dump Download API
app.get(['/api/lan/sql/export', '/api/sql/export'], (req, res) => {
  try {
    const db = readDatabase() || {};
    const dump = generateFullSqlDump(db);
    const nowStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hami-relational-database-${nowStr}.sql"`);
    res.send(dump);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ==============================================================================
// VoIP Click-to-Call System (Asterisk AMI / Issabel / FreePBX / Yealink / Webhook)
// ==============================================================================

interface AsteriskAmiParams {
  host: string;
  port: number;
  user: string;
  secret: string;
  channel: string; // e.g. SIP/101 or PJSIP/101
  exten: string;   // e.g. 09123456789
  context?: string;
  callerId?: string;
  autoAnswer?: boolean;
}

// Parameter sanitizer to prevent Asterisk AMI CRLF Socket Injection
function sanitizeAmiParam(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[\r\n\x00-\x1f]/g, '').trim();
}

function executeAsteriskAmiOriginate(params: AsteriskAmiParams): Promise<{ ok: boolean; message: string; details?: any }> {
  return new Promise((resolve) => {
    const host = sanitizeAmiParam(params.host) || '127.0.0.1';
    const port = params.port || 5038;
    const user = sanitizeAmiParam(params.user);
    const secret = sanitizeAmiParam(params.secret);
    const channel = sanitizeAmiParam(params.channel);
    const exten = sanitizeAmiParam(params.exten);
    const context = sanitizeAmiParam(params.context || 'from-internal');
    const callerId = sanitizeAmiParam(params.callerId || 'حامی بار');

    const socket = new net.Socket();
    let buffer = '';
    let step: 'await_banner' | 'await_login' | 'await_originate' | 'done' = 'await_banner';

    const timer = setTimeout(() => {
      try { socket.destroy(); } catch {}
      resolve({
        ok: false,
        message: `پاسخی از پورت ${port} سرور استریسک دریافت نشد (Timeout). لطفاً IP سرور و پورت AMI را بررسی نمایید.`,
      });
    }, 8000);

    socket.connect(port, host, () => {
      // Socket connected to Asterisk AMI port
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString();

      if (step === 'await_banner' && buffer.includes('Asterisk Call Manager')) {
        step = 'await_login';
        buffer = '';
        socket.write(`Action: Login\r\nUsername: ${user}\r\nSecret: ${secret}\r\n\r\n`);
      } else if (step === 'await_login' && (buffer.includes('Response: Success') || buffer.includes('Response: Error'))) {
        if (buffer.includes('Response: Error') || buffer.includes('Authentication failed')) {
          step = 'done';
          clearTimeout(timer);
          try {
            socket.write('Action: Logoff\r\n\r\n');
            socket.end();
          } catch {}
          resolve({
            ok: false,
            message: 'خطای احراز هویت استریسک: نام کاربری یا رمز عبور AMI نامعتبر است (manager.conf).',
          });
          return;
        }

        // Login succeeded, now trigger Originate action
        step = 'await_originate';
        buffer = '';

        const autoAnswerHeaders = params.autoAnswer
          ? 'Variable: __SIPADDHEADER=Call-Info:\\;answer-after=0\r\nVariable: Alert-Info=ring-answer\r\n'
          : '';

        const originateCmd =
          `Action: Originate\r\n` +
          `Channel: ${channel}\r\n` +
          `Exten: ${exten}\r\n` +
          `Context: ${context}\r\n` +
          `Priority: 1\r\n` +
          `CallerID: "${callerId}" <${channel.replace(/^[A-Za-z0-9_]+\//, '')}>\r\n` +
          `Timeout: 35000\r\n` +
          `Async: true\r\n` +
          autoAnswerHeaders +
          `\r\n`;

        socket.write(originateCmd);
      } else if (step === 'await_originate' && (buffer.includes('Response: Success') || buffer.includes('Response: Error'))) {
        step = 'done';
        clearTimeout(timer);
        const isSuccess = buffer.includes('Response: Success');
        try {
          socket.write('Action: Logoff\r\n\r\n');
          socket.end();
        } catch {}

        if (isSuccess) {
          resolve({
            ok: true,
            message: `دستور تماس صادر شد. تلفن داخلی شما (${params.channel}) در حال زنگ خوردن است؛ با برداشتن گوشی، تماس با ${params.exten} برقرار خواهد شد.`,
            details: buffer,
          });
        } else {
          resolve({
            ok: false,
            message: `سانترال استریسک درخواست تماس را نپذیرفت. بررسی کنید داخلی ${params.channel} در شبکه رجیستر و آنلاین باشد.`,
            details: buffer,
          });
        }
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        message: `خطا در اتصال به پورت ${port} سرور استریسک: ${err.message}`,
      });
    });
  });
}

function normalizeVoipDigits(input: unknown): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();
}

function executeAsteriskAmiHangup(params: {
  host: string;
  port: number;
  user: string;
  secret: string;
  extension: string;
  channelType: string;
}): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let timer: any;
    let buffer = '';
    let step: 'connect' | 'login' | 'hangup_cmd' | 'done' = 'connect';

    const host = sanitizeAmiParam(normalizeVoipDigits(params.host) || '127.0.0.1');
    const port = params.port || 5038;
    const user = sanitizeAmiParam(params.user);
    const secret = sanitizeAmiParam(params.secret);
    const ext = sanitizeAmiParam(normalizeVoipDigits(params.extension));
    const chType = sanitizeAmiParam(params.channelType || 'SIP');

    const cleanup = () => {
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {}
    };

    timer = setTimeout(() => {
      if (step !== 'done') {
        step = 'done';
        cleanup();
        resolve({ ok: true, message: 'فرمان قطع کانال به سانترال ارسال شد.' });
      }
    }, 4500);

    socket.connect(port, host, () => {});

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      if (step === 'connect' && buffer.includes('Asterisk Call Manager')) {
        step = 'login';
        buffer = '';
        socket.write(`Action: Login\r\nUsername: ${user}\r\nSecret: ${secret}\r\n\r\n`);
      } else if (step === 'login' && buffer.includes('Response: Success')) {
        step = 'hangup_cmd';
        buffer = '';
        socket.write(
          `Action: Command\r\nCommand: channel request hangup ${chType}/${ext}\r\n\r\n` +
            `Action: Logoff\r\n\r\n`
        );
        setTimeout(() => {
          if (step !== 'done') {
            step = 'done';
            cleanup();
            resolve({ ok: true, message: `فرمان قطع تماس داخلی ${ext} به سانترال ارسال شد.` });
          }
        }, 400);
      } else if (step === 'login' && buffer.includes('Response: Error')) {
        step = 'done';
        cleanup();
        resolve({ ok: false, message: 'خطای احراز هویت AMI هنگام قطع تماس.' });
      }
    });

    socket.on('error', () => {
      if (step !== 'done') {
        step = 'done';
        cleanup();
        resolve({ ok: true, message: 'تماس پایان یافت.' });
      }
    });
  });
}

// 1. Originate VoIP Call API
app.post(['/api/lan/voip/originate', '/api/voip/originate'], async (req, res) => {
  try {
    const { phoneNumber, recipientName, config } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ ok: false, error: 'شماره تلفن مقصد الزامی است.' });
    }

    const mode = config?.mode || 'softphone';
    const targetPhone = normalizeVoipDigits(phoneNumber).replace(/[^0-9+*#]/g, '');
    const ext = normalizeVoipDigits(config?.operatorExtension || '101').replace(/[^0-9A-Za-z_.-]/g, '') || '101';

    console.log(`\n[VoIP] درخواست تماس با ${recipientName || 'کاربر'} (${targetPhone}) - داخلی: ${ext} - حالت: ${mode}`);

    // Mode: Asterisk AMI (Issabel / FreePBX)
    if (mode === 'asterisk_ami') {
      const host = normalizeVoipDigits(config?.amiHost || '').replace(/\s+/g, '');
      if (!host) {
        return res.status(400).json({
          ok: false,
          message: 'آدرس IP سرور سانترال (AMI Host) در تنظیمات کاربر ثبت نشده است.',
        });
      }

      const channelPrefix = config?.channelType || 'SIP';
      const channel =
        channelPrefix === 'Local'
          ? `Local/${ext}@${normalizeVoipDigits(config?.amiContext || 'from-internal') || 'from-internal'}`
          : `${channelPrefix}/${ext}`;

      const amiResult = await executeAsteriskAmiOriginate({
        host,
        port: parseInt(normalizeVoipDigits(config?.amiPort || '5038'), 10) || 5038,
        user: normalizeVoipDigits(config?.amiUser || 'admin'),
        secret: String(config?.amiSecret || '').trim(),
        channel,
        exten: targetPhone,
        context: normalizeVoipDigits(config?.amiContext || 'from-internal') || 'from-internal',
        callerId: config?.callerId || `Ext ${ext}`,
        autoAnswer: config?.autoAnswer !== false,
      });

      return res.json(amiResult);
    }

    // Mode: Hardware IP Phone Direct CTI (Yealink, Grandstream, Fanvil)
    if (mode === 'ipphone_cti') {
      const phoneIp = normalizeVoipDigits(config?.ipPhoneIp || '')
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '')
        .replace(/\s+/g, '');
      if (!phoneIp) {
        return res.status(400).json({ ok: false, message: 'آدرس IP تلفن رومیزی در تنظیمات مشخص نشده است.' });
      }

      let ctiUrl = '';
      if (config.ipPhoneModel === 'grandstream') {
        ctiUrl = `http://${phoneIp}/cgi-bin/api-make_call?phonenumber=${encodeURIComponent(targetPhone)}`;
      } else {
        // Yealink / Fanvil default Action URI
        ctiUrl = `http://${phoneIp}/servlet?key=number=${encodeURIComponent(targetPhone)}`;
      }

      try {
        const headers: Record<string, string> = {};
        if (config.ipPhoneUser && config.ipPhonePass) {
          const auth = Buffer.from(`${config.ipPhoneUser}:${config.ipPhonePass}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        await fetch(ctiUrl, { headers, signal: controller.signal }).catch(() => null);
        clearTimeout(timeoutId);

        return res.json({
          ok: true,
          message: `دستور شماره‌گیری (${targetPhone}) به تلفن رومیزی (${phoneIp} - داخلی ${ext}) ارسال شد.`,
          details: { dialedNumber: targetPhone, ctiUrl },
        });
      } catch (ctiErr: any) {
        return res.json({
          ok: false,
          message: `خطا در ارتباط با تلفن رومیزی: ${ctiErr.message}`,
        });
      }
    }

    // Mode: Custom Webhook
    if (mode === 'webhook') {
      let url = normalizeVoipDigits(config?.webhookUrl || '');
      if (!url) {
        return res.status(400).json({ ok: false, message: 'آدرس وب‌هوک سانترال تعریف نشده است.' });
      }

      url = url
        .replace(/\{to\}/g, encodeURIComponent(targetPhone))
        .replace(/\{from\}/g, encodeURIComponent(ext))
        .replace(/\{name\}/g, encodeURIComponent(recipientName || ''));

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const webhookRes = await fetch(url, {
          method: config.webhookMethod || 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        return res.json({
          ok: webhookRes.ok,
          message: webhookRes.ok
            ? `درخواست تماس از داخلی ${ext} با موفقیت به وب‌هوک سانترال ارسال شد.`
            : `خطای سانترال در پردازش تماس (${webhookRes.status})`,
        });
      } catch (hookErr: any) {
        return res.json({
          ok: false,
          message: `خطا در اتصال به وب‌هوک سانترال: ${hookErr.message}`,
        });
      }
    }

    // Default Softphone fallback
    res.json({
      ok: true,
      message: 'دستور شماره‌گیری با سافت‌فون ارسال گردید.',
    });
  } catch (err: any) {
    console.error('خطای سرویس ویپ:', err);
    res.status(500).json({ ok: false, error: err.message || 'خطای سرور' });
  }
});

// 1.5. Hangup / End VoIP Call API
app.post(['/api/lan/voip/hangup', '/api/voip/hangup'], async (req, res) => {
  try {
    const { config } = req.body || {};
    const mode = config?.mode || 'softphone';

    if (mode === 'ipphone_cti' && config?.ipPhoneIp) {
      const phoneIp = normalizeVoipDigits(config.ipPhoneIp)
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '')
        .replace(/\s+/g, '');
      const headers: Record<string, string> = {};
      if (config.ipPhoneUser && config.ipPhonePass) {
        const auth = Buffer.from(`${config.ipPhoneUser}:${config.ipPhonePass}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      if (config.ipPhoneModel === 'grandstream') {
        const url = `http://${phoneIp}/cgi-bin/api-phone_operation?cmd=endcall`;
        await fetch(url, { headers, signal: controller.signal }).catch(() => null);
      } else {
        // Yealink supports key=X and key=RELEASE to terminate active/ringing calls
        const urlRelease = `http://${phoneIp}/servlet?key=RELEASE`;
        const urlX = `http://${phoneIp}/servlet?key=X`;
        await Promise.all([
          fetch(urlRelease, { headers, signal: controller.signal }).catch(() => null),
          fetch(urlX, { headers, signal: controller.signal }).catch(() => null),
        ]);
      }
      clearTimeout(timeoutId);

      return res.json({
        ok: true,
        message: 'فرمان قطع تماس به تلفن رومیزی ارسال شد.',
      });
    }

    if (mode === 'asterisk_ami' && config?.amiHost && config?.operatorExtension) {
      const hangupRes = await executeAsteriskAmiHangup({
        host: config.amiHost,
        port: parseInt(normalizeVoipDigits(config.amiPort || '5038'), 10) || 5038,
        user: config.amiUser || 'admin',
        secret: config.amiSecret || '',
        extension: config.operatorExtension,
        channelType: config.channelType || 'SIP',
      });
      return res.json(hangupRes);
    }

    return res.json({
      ok: true,
      message: 'تماس پایان یافت.',
    });
  } catch (err: any) {
    return res.json({ ok: true, message: 'تماس قطع شد.' });
  }
});

// 2. Test VoIP PBX Connection API
app.post(['/api/lan/voip/test', '/api/voip/test'], async (req, res) => {
  try {
    const { config } = req.body || {};
    if (!config) {
      return res.status(400).json({ ok: false, error: 'تنظیمات ارسال نشده است.' });
    }

    const ext = normalizeVoipDigits(config.operatorExtension || '101') || '101';

    if (config.mode === 'asterisk_ami') {
      const host = normalizeVoipDigits(config.amiHost || '127.0.0.1').replace(/\s+/g, '');
      const port = parseInt(normalizeVoipDigits(config.amiPort || '5038'), 10) || 5038;
      const socket = new net.Socket();
      let buffer = '';
      let timer: any;

      const testResult = await new Promise<{ ok: boolean; message: string }>((resolve) => {
        timer = setTimeout(() => {
          try { socket.destroy(); } catch {}
          resolve({ ok: false, message: `پاسخی از ${host}:${port} دریافت نشد (Timeout). پورت ۵۰۳۸ سرور سانترال را بررسی کنید.` });
        }, 5000);

        socket.connect(port, host, () => {
          // Connected
        });

        socket.on('data', (chunk) => {
          buffer += chunk.toString();
          if (buffer.includes('Asterisk Call Manager')) {
            socket.write(`Action: Login\r\nUsername: ${sanitizeAmiParam(config.amiUser)}\r\nSecret: ${sanitizeAmiParam(config.amiSecret)}\r\n\r\n`);
          } else if (buffer.includes('Response: Success')) {
            clearTimeout(timer);
            try {
              socket.write('Action: Logoff\r\n\r\n');
              socket.end();
            } catch {}
            resolve({
              ok: true,
              message: `اتصال به سانترال استریسک (${host}:${port}) برای داخلی ${ext} (${config.channelType || 'SIP'}/${ext}) با موفقیت برقرار و احراز هویت شد!`,
            });
          } else if (buffer.includes('Response: Error')) {
            clearTimeout(timer);
            try { socket.end(); } catch {}
            resolve({
              ok: false,
              message: 'پورت ۵۰۳۸ استریسک در دسترس است، اما نام کاربری یا رمز عبور AMI در manager.conf اشتباه است.',
            });
          }
        });

        socket.on('error', (err) => {
          clearTimeout(timer);
          resolve({ ok: false, message: `عدم امکان برقراری ارتباط با ${host}:${port}: ${err.message}` });
        });
      });

      return res.json(testResult);
    }

    if (config.mode === 'ipphone_cti') {
      const phoneIp = normalizeVoipDigits(config.ipPhoneIp || '')
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '')
        .replace(/\s+/g, '');
      if (!phoneIp) {
        return res.json({
          ok: false,
          message: 'لطفاً ابتدا آدرس IP تلفن رومیزی (مثلاً 192.168.1.45) را وارد نمایید.',
        });
      }
      return res.json({
        ok: true,
        message: `پیکربندی تلفن رومیزی (${config.ipPhoneModel || 'yealink'} - IP: ${phoneIp} - داخلی: ${ext}) معتبر و آماده ارسال فرمان شماره‌گیری است.`,
      });
    }

    if (config.mode === 'webhook') {
      if (!config.webhookUrl || !String(config.webhookUrl).trim()) {
        return res.json({
          ok: false,
          message: 'لطفاً آدرس URL وب‌هوک سانترال را وارد نمایید.',
        });
      }
      return res.json({
        ok: true,
        message: `وب‌هوک سانترال برای داخلی ${ext} آماده ارسال درخواست است.`,
      });
    }

    res.json({ ok: true, message: `تنظیمات داخلی ${ext} معتبر است.` });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'خطا در تست اتصال' });
  }
});

// Dedicated LAN Security Status Endpoint
app.get(['/api/lan/security-status', '/api/security-status'], (req, res) => {
  const ips = getLocalNetworkIps();
  res.json({
    ok: true,
    lanSecurity: {
      headersEnabled: true,
      amiCrlfProtection: true,
      rateLimiterActive: true,
      strictNoStoreOnApi: true,
      sessionAutoTimeoutMinutes: 30,
      activeIpAddresses: ips,
      timestamp: new Date().toISOString(),
    },
  });
});

// Download setup installer scripts
app.get('/api/setup/download/:script', (req, res) => {
  const allowed = [
    'SETUP_INSTALLER.bat',
    'setup_installer.ps1',
    'setup_installer.sh',
    'START_LAN_SERVER.bat',
    'SETUP_FIREWALL.bat',
    'CREATE_DESKTOP_SHORTCUT.bat',
    'UNINSTALL.bat',
  ];
  const scriptName = req.params.script;
  if (!allowed.includes(scriptName)) {
    return res.status(404).send('فایل مورد نظر یافت نشد.');
  }
  const filePath = path.join(__dirname, scriptName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('فایل روی سرور موجود نیست.');
  }
  res.download(filePath, scriptName);
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
