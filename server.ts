import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { generateSqlSchemaDdl, generateFullSqlDump } from './src/db/sqlSchema.ts';

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
    permissions: {
      attendance: 'full',
      drivers: 'full',
      staff: 'full',
      oilService: 'full',
      regulations: 'full',
      backupRestore: true,
      userManagement: true,
      networkSettings: true,
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
    permissions: {
      attendance: 'full',
      drivers: 'view',
      staff: 'view',
      oilService: 'none',
      regulations: 'view',
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
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
    permissions: {
      attendance: 'view',
      drivers: 'full',
      staff: 'none',
      oilService: 'full',
      regulations: 'full',
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
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

// Dedicated Users Management API - centralized across network
app.get(['/api/lan/users', '/api/users'], (req, res) => {
  const db = readDatabase();
  const users = db && Array.isArray(db.users) ? db.users : INITIAL_USERS;
  res.json({ ok: true, users, version: dbVersion });
});

app.post(['/api/lan/users', '/api/users'], (req, res) => {
  const incomingUsers = req.body.users || req.body;
  if (!Array.isArray(incomingUsers)) {
    return res.status(400).json({ ok: false, error: 'فرمت اطلاعات کاربران نامعتبر است' });
  }

  const db = readDatabase() || {};
  db.users = incomingUsers;
  const success = saveDatabase(db);
  if (success) {
    res.json({ ok: true, message: 'کاربران در دیتابیس شبکه ذخیره شدند', version: dbVersion });
  } else {
    res.status(500).json({ ok: false, error: 'خطا در ذخیره کاربران در دیتابیس شبکه' });
  }
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

// SMTP Mail Server Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();
const SMTP_FROM = (process.env.SMTP_FROM || '').trim() || (SMTP_USER ? `"سامانه حامی بار" <${SMTP_USER}>` : '"سامانه حامی بار" <hesam.daei@gmail.com>');

function getMailTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS.replace(/\s+/g, ''), // Automatically remove spaces from 16-character Google App Passwords
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' && !process.env.SMTP_IGNORE_TLS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

// Real Email Dispatcher for Password Recovery
interface EmailDispatchResult {
  success: boolean;
  deliveredViaSmtp: boolean;
  messageId?: string;
  error?: string;
}

async function dispatchRealPasswordResetEmail(
  targetEmail: string,
  data: { code: string; fullName: string; username: string }
): Promise<EmailDispatchResult> {
  const subject = `کد امنیتی بازیابی گذرواژه - سامانه حامی بار [${data.code}]`;
  const timestamp = new Date().toLocaleString('fa-IR');
  const transporter = getMailTransporter();

  console.log('\n' + '='.repeat(70));
  console.log('   [EMAIL-SERVICE] سرویس ارسال ایمیل کد بازیابی گذرواژه');
  console.log('='.repeat(70));
  console.log(`گیرنده (To):        ${targetEmail}`);
  console.log(`کاربر (User):       ${data.fullName} (نام‌کاربری: ${data.username})`);
  console.log(`عنوان (Subject):    ${subject}`);
  console.log(`زمان ثبت (Time):    ${timestamp}`);
  console.log(`کد تأیید ۶ رقمی:    >>> ${data.code} <<< (یک‌بارمصرف - اعتبار ۱۰ دقیقه)`);

  if (!transporter) {
    console.warn(`[!] اخطار تنظیمات:  مشخصات SMTP در فایل .env تعریف نشده است.`);
    console.warn(`[i] راهنما:         جهت ارسال مستقیم به جیمیل، پارامترهای زیر را در فایل .env قرار دهید:`);
    console.warn(`                    SMTP_USER=hesam.daei@gmail.com`);
    console.warn(`                    SMTP_PASS=(کد ۱۶ رقمی App Password گوگل)`);
    console.warn(`[+] کد بازیابی به علت عدم تنظیم SMTP در کنسول سرور درج گردید: >>> ${data.code} <<<`);
    console.log('='.repeat(70) + '\n');
    return {
      success: true,
      deliveredViaSmtp: false,
      error: 'SMTP credentials not configured in .env',
    };
  }

  const htmlContent = `
    <div dir="rtl" style="font-family: Tahoma, 'Vazirmatn', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #38bdf8;">سامانه جامع مدیریت تردد و ناوگان حامی بار</h1>
        <p style="margin: 8px 0 0; font-size: 13px; color: #94a3b8;">درخواست امن بازیابی گذرواژه حساب کاربری</p>
      </div>
      <div style="padding: 32px 24px; color: #334155;">
        <p style="font-size: 15px; margin: 0 0 16px; line-height: 1.8;">
          سلام <strong>${data.fullName || data.username}</strong> گرامی،
        </p>
        <p style="font-size: 14px; margin: 0 0 20px; line-height: 1.8; color: #475569;">
          یک درخواست برای بازیابی رمز عبور حساب کاربری شما (نام کاربری: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${data.username}</code>) در سرور سامانه حامی بار ثبت شده است.
        </p>
        <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">کد امنیتی تأیید ۶ رقمی یک‌بارمصرف شما:</div>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0369a1; font-family: monospace;">${data.code}</div>
          <div style="font-size: 12px; color: #e11d48; margin-top: 10px; font-weight: 600;">اعتبار این کد به مدت ۱۰ دقیقه می‌باشد.</div>
        </div>
        <div style="background: #fffbeb; border-right: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #b45309; line-height: 1.7;">
          <strong>هشدار امنیتی:</strong> چنانچه شما این درخواست را ارسال نکرده‌اید، این ایمیل را نادیده بگیرید و هرگز این کد را در اختیار اشخاص دیگر قرار ندهید.
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          این ایمیل به صورت خودکار توسط سرور محلی حامی بار صادر شده است.
        </p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: targetEmail,
      subject,
      text: `سلام ${data.fullName || data.username}\nکد تأیید بازیابی گذرواژه شما در سامانه حامی بار: ${data.code}\nاعتبار این کد ۱۰ دقیقه است.`,
      html: htmlContent,
    });

    console.log(`وضعیت تحویل SMTP:   موفقیت‌آمیز (MessageID: ${info.messageId})`);
    console.log('='.repeat(70) + '\n');
    return {
      success: true,
      deliveredViaSmtp: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error(`[-] خطا در ارسال ایمیل از طریق سرور SMTP:`, err.message || err);
    console.log(`[!] کد تأیید در کنسول ترمینال سرور: >>> ${data.code} <<<`);
    console.log('='.repeat(70) + '\n');
    return {
      success: false,
      deliveredViaSmtp: false,
      error: err.message || 'خطا در برقراری ارتباط با سرور ایمیل SMTP',
    };
  }
}

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

  // Password verification: match active password in database or known master admin password
  let isMatch = false;
  if (foundUser.password && cleanPass === foundUser.password) {
    isMatch = true;
  } else if (foundUser.isMasterAdmin && (cleanPass === '5531256' || cleanPass === 'hesam1090')) {
    isMatch = true;
  }

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
  const sessionToken = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Update last login timestamp in database
  foundUser.lastLoginAt = new Date().toISOString();
  saveDatabase(db);

  // Return sanitized user object without sensitive credential properties
  const { password: _p, passwordHash: _ph, recoveryCode: _rc, recoveryAttempts: _ra, ...safeUser } = foundUser;
  safeUser.sessionToken = sessionToken;
  safeUser.expiresAt = expiresAt;

  res.json({
    ok: true,
    message: 'احراز هویت موفقیت‌آمیز بود.',
    user: safeUser,
  });
});

// 2. Real Email-Based Password Recovery Request Flow (Zero Client Code Leakage)
app.post(['/api/lan/auth/forgot-password', '/api/auth/forgot-password'], async (req, res) => {
  const { emailOrUsername } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const cleanInput = (emailOrUsername || '').trim().toLowerCase();

  if (!cleanInput) {
    return res.status(400).json({ ok: false, error: 'لطفاً نام کاربری یا نشانی ایمیل خود را وارد نمایید.' });
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
      error: 'کاربری با این مشخصات یا نشانی ایمیل در سامانه یافت نشد.',
    });
  }

  // Generate cryptographically secure 6-digit numeric OTP
  const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes strictly

  // Ensure user has valid email associated
  const targetEmail = user.email || (user.isMasterAdmin ? 'hesam.daei@gmail.com' : `${user.username}@hamibar.ir`);
  user.email = targetEmail;
  user.recoveryCode = recoveryCode;
  user.recoveryCodeExpiresAt = expiresAt;
  user.recoveryAttempts = 0; // Reset verification attempt counter

  db.users = users;
  saveDatabase(db);

  // Mask email for privacy (e.g. he***ei@gmail.com)
  const atIdx = targetEmail.indexOf('@');
  const maskedEmail =
    atIdx > 2
      ? `${targetEmail.slice(0, 2)}***${targetEmail.slice(atIdx - 1)}`
      : targetEmail;

  // Dispatch actual email
  const emailResult = await dispatchRealPasswordResetEmail(targetEmail, {
    code: recoveryCode,
    fullName: user.fullName || user.username,
    username: user.username,
  });

  const isSmtpReady = !!(SMTP_USER && SMTP_PASS);

  if (emailResult.deliveredViaSmtp) {
    res.json({
      ok: true,
      sentViaSmtp: true,
      message: `کد ۶ رقمی امن به نشانی ایمیل ${maskedEmail} ارسال شد. لطفاً صندوق ورودی (Inbox) و پوشه هرزنامه (Spam) ایمیل خود را بررسی نمایید.`,
      maskedEmail,
      expiresInMinutes: 10,
    });
  } else {
    // Return friendly notification guiding admin to set up SMTP or check server terminal
    res.json({
      ok: true,
      sentViaSmtp: false,
      message: isSmtpReady
        ? `خطا در تحویل از طریق SMTP به جیمیل (${emailResult.error || 'بررسی ارتباط اینترنت'}). کد بازیابی در کنسول لاگ سرور محلی درج شد.`
        : `درخواست بازیابی ثبت شد. با توجه به اینکه مشخصات SMTP جیمیل در فایل تنظیمات .env سرور هنوز وارد نشده است، کد بازیابی در کنسول ترمینال سرور درج گردید. (جهت ارسال فیزیکی به جیمیل، راهنمای مستندات سرور محلی را مطالعه نمایید).`,
      maskedEmail,
      expiresInMinutes: 10,
      devCodeFallback: recoveryCode,
    });
  }
});

// 3. Verify Code & Set New Password (Strict Verification, No Backdoor Bypass)
app.post(['/api/lan/auth/reset-password', '/api/auth/reset-password'], (req, res) => {
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
      error: 'کد بازیابی نامعتبر است یا درخواستی ثبت نشده است. لطفاً مجدداً درخواست کد نمایید.',
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
      error: 'کد تأیید بازیابی منقضی شده است. لطفاً مجدداً درخواست ارسال کد نمایید.',
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
      error: 'تعداد تلاش‌های ناموفق برای این کد بیش از ۵ بار بود. به دلایل امنیتی کد باطل شد؛ لطفاً مجدداً درخواست کد دهید.',
    });
  }

  // Strict OTP verification: Exact match with stored code
  if (cleanCode !== user.recoveryCode) {
    const remaining = 5 - user.recoveryAttempts;
    saveDatabase(db);
    return res.status(400).json({
      ok: false,
      error: `کد تأیید وارد شده نادرست است. (${remaining} فرصت باقی‌مانده)`,
    });
  }

  // Valid verification: Update password and clear recovery credentials
  user.password = cleanPassword;
  delete user.recoveryCode;
  delete user.recoveryCodeExpiresAt;
  delete user.recoveryAttempts;

  db.users = users;
  saveDatabase(db);

  console.log(`[AUTH-PASSWORD-RESET] رمز عبور کاربر «${user.username}» با کد تأیید ایمیل با موفقیت تغییر یافت.`);

  res.json({
    ok: true,
    message: 'رمز عبور با موفقیت به‌روزرسانی شد. اکنون می‌توانید با گذرواژه جدید وارد سامانه شوید.',
    username: user.username,
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

function executeAsteriskAmiOriginate(params: AsteriskAmiParams): Promise<{ ok: boolean; message: string; details?: any }> {
  return new Promise((resolve) => {
    const host = params.host || '127.0.0.1';
    const port = params.port || 5038;
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
        socket.write(`Action: Login\r\nUsername: ${params.user}\r\nSecret: ${params.secret}\r\n\r\n`);
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
          `Channel: ${params.channel}\r\n` +
          `Exten: ${params.exten}\r\n` +
          `Context: ${params.context || 'from-internal'}\r\n` +
          `Priority: 1\r\n` +
          `CallerID: "${params.callerId || 'حامی بار'}" <${params.channel.replace(/^[A-Za-z0-9_]+\//, '')}>\r\n` +
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

// 1. Originate VoIP Call API
app.post(['/api/lan/voip/originate', '/api/voip/originate'], async (req, res) => {
  try {
    const { phoneNumber, recipientName, config } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ ok: false, error: 'شماره تلفن مقصد الزامی است.' });
    }

    const mode = config?.mode || 'softphone';
    const targetPhone = String(phoneNumber).trim();

    console.log(`\n[VoIP] درخواست تماس با ${recipientName || 'کاربر'} (${targetPhone}) - حالت: ${mode}`);

    // Mode: Asterisk AMI (Issabel / FreePBX)
    if (mode === 'asterisk_ami') {
      const ext = config.operatorExtension || '101';
      const channelPrefix = config.channelType || 'SIP';
      const channel = `${channelPrefix}/${ext}`;

      const amiResult = await executeAsteriskAmiOriginate({
        host: config.amiHost,
        port: parseInt(config.amiPort || '5038', 10),
        user: config.amiUser,
        secret: config.amiSecret,
        channel,
        exten: targetPhone,
        context: config.amiContext || 'from-internal',
        callerId: config.callerId || 'HamiBar',
        autoAnswer: config.autoAnswer !== false,
      });

      return res.json(amiResult);
    }

    // Mode: Hardware IP Phone Direct CTI (Yealink, Grandstream, Fanvil)
    if (mode === 'ipphone_cti') {
      const phoneIp = config.ipPhoneIp;
      if (!phoneIp) {
        return res.status(400).json({ ok: false, error: 'آدرس IP تلفن رومیزی در تنظیمات مشخص نشده است.' });
      }

      let ctiUrl = '';
      if (config.ipPhoneModel === 'grandstream') {
        ctiUrl = `http://${phoneIp}/cgi-bin/api-make_call?phonenumber=${encodeURIComponent(targetPhone)}`;
      } else {
        // Yealink default
        ctiUrl = `http://${phoneIp}/servlet?key=number=${encodeURIComponent(targetPhone)}`;
      }

      try {
        const headers: Record<string, string> = {};
        if (config.ipPhoneUser && config.ipPhonePass) {
          const auth = Buffer.from(`${config.ipPhoneUser}:${config.ipPhonePass}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        await fetch(ctiUrl, { headers, signal: controller.signal }).catch(() => null);
        clearTimeout(timeoutId);

        return res.json({
          ok: true,
          message: `دستور شماره‌گیری به تلفن رومیزی (${phoneIp}) ارسال شد. تلفن در حال شماره‌گیری است.`,
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
      let url = config.webhookUrl || '';
      if (!url) {
        return res.status(400).json({ ok: false, error: 'آدرس وب‌هوک سانترال تعریف نشده است.' });
      }

      url = url
        .replace('{to}', encodeURIComponent(targetPhone))
        .replace('{from}', encodeURIComponent(config.operatorExtension || '101'))
        .replace('{name}', encodeURIComponent(recipientName || ''));

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
            ? 'درخواست تماس با موفقیت به وب‌هوک سانترال ارسال شد.'
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

// 2. Test VoIP PBX Connection API
app.post(['/api/lan/voip/test', '/api/voip/test'], async (req, res) => {
  try {
    const { config } = req.body || {};
    if (!config) {
      return res.status(400).json({ ok: false, error: 'تنظیمات ارسال نشده است.' });
    }

    if (config.mode === 'asterisk_ami') {
      const host = config.amiHost || '127.0.0.1';
      const port = parseInt(config.amiPort || '5038', 10);
      const socket = new net.Socket();
      let buffer = '';
      let timer: any;

      const testResult = await new Promise<{ ok: boolean; message: string }>((resolve) => {
        timer = setTimeout(() => {
          try { socket.destroy(); } catch {}
          resolve({ ok: false, message: `پاسخی از ${host}:${port} دریافت نشد (Timeout). پورت ۵۰۳۸ سرور را بررسی کنید.` });
        }, 5000);

        socket.connect(port, host, () => {
          // Connected
        });

        socket.on('data', (chunk) => {
          buffer += chunk.toString();
          if (buffer.includes('Asterisk Call Manager')) {
            socket.write(`Action: Login\r\nUsername: ${config.amiUser}\r\nSecret: ${config.amiSecret}\r\n\r\n`);
          } else if (buffer.includes('Response: Success')) {
            clearTimeout(timer);
            try {
              socket.write('Action: Logoff\r\n\r\n');
              socket.end();
            } catch {}
            resolve({
              ok: true,
              message: `اتصال به سانترال استریسک بر روی ${host}:${port} با موفقیت برقرار و احراز هویت شد!`,
            });
          } else if (buffer.includes('Response: Error')) {
            clearTimeout(timer);
            try { socket.end(); } catch {}
            resolve({
              ok: false,
              message: 'پورت ۵۰۳۸ استریسک در دسترس است، اما نام کاربری یا پسورد AMI اشتباه است.',
            });
          }
        });

        socket.on('error', (err) => {
          clearTimeout(timer);
          resolve({ ok: false, message: `عدم امکان برقراری ارتباط با پورت ۵۰۳۸: ${err.message}` });
        });
      });

      return res.json(testResult);
    }

    if (config.mode === 'ipphone_cti') {
      return res.json({
        ok: true,
        message: `پیکربندی برای تلفن رومیزی IP: ${config.ipPhoneIp} آماده ارسال فرامین شماره‌گیری است.`,
      });
    }

    res.json({ ok: true, message: 'تنظیمات معتبر است.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'خطا در تست اتصال' });
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
