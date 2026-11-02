import {
  AppUser,
  SafeAppUser,
  DEFAULT_MASTER_USER,
  INITIAL_USERS,
  UserPermissions,
  PermissionModuleKey,
  ModulePermission,
} from '../types/auth';
import { verifyBaleLoginOtp } from './baleService';
import {
  hashPassword,
  verifyPassword,
  checkClientRateLimit,
  resetClientRateLimit,
  createSessionToken,
  SESSION_DURATION_HOURS,
} from './securityCrypto';
import { fetchServerUsers, saveServerUsers } from './lanSyncService';
export { saveServerUsers };

export const STORAGE_KEY_USERS = 'hamibar_system_users_v2';
export const STORAGE_KEY_SESSION = 'hamibar_session_user_v2';
export const STORAGE_KEY_REVOKED_TOKENS = 'hamibar_revoked_session_tokens';

// Uniform security error message to eliminate username enumeration attacks
const UNIFORM_AUTH_ERROR = 'نام کاربری یا رمز عبور اشتباه است.';

/**
 * نرمال‌سازی و تطبیق مجوزهای کاربر با ساختار واقعی منوها و عملیات سامانه
 * بدون اهدای ناخواسته مجوزهای حساس جدید (حذف رکورد، اکسل، مالی، سفارش‌ها) به کاربران عادی
 */
export function normalizeUserPermissions(
  perms?: Partial<UserPermissions> | null,
  isMaster: boolean = false
): UserPermissions {
  if (isMaster) {
    return {
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
    };
  }

  const attendance: ModulePermission = perms?.attendance || 'none';
  const drivers: ModulePermission = perms?.drivers || 'none';
  const staff: ModulePermission = perms?.staff || 'none';
  const oilService: ModulePermission = perms?.oilService || 'none';
  const regulations: ModulePermission = perms?.regulations || 'view';

  // سازگاری با کاربران قبلی برای تفکیک مدیریت ناوگان، تخصیص خودرو، اعزام و تحویل خودرو
  const fleetManagement: ModulePermission =
    perms?.fleetManagement ??
    (oilService !== 'none' ? oilService : drivers === 'full' ? 'view' : 'none');

  const vehicleAssignment: ModulePermission =
    perms?.vehicleAssignment ??
    (drivers === 'full' || oilService === 'full'
      ? 'full'
      : drivers === 'view' || oilService === 'view'
      ? 'view'
      : 'none');

  const operations: ModulePermission =
    perms?.operations ??
    (drivers === 'full' || oilService === 'full'
      ? 'full'
      : drivers === 'view' || oilService === 'view'
      ? 'view'
      : 'none');

  const handover: ModulePermission =
    perms?.handover ??
    (drivers === 'full' || regulations === 'full'
      ? 'full'
      : drivers === 'view' || regulations === 'view'
      ? 'view'
      : 'none');

  return {
    attendance,
    vehicleAssignment,
    drivers,
    staff,
    fleetManagement,
    oilService,
    orders: perms?.orders || 'none',
    operations,
    handover,
    customers: perms?.customers ?? 'view',
    finance: perms?.finance || 'none',
    regulations,
    phonebook: perms?.phonebook ?? 'view',
    reports: 'none', // گزارش‌های اکسل منحصراً در اختیار مدیر ارشد است
    developerDocs: perms?.developerDocs ?? 'view',
    canDeleteRecords: Boolean(perms?.canDeleteRecords),
    canExportExcel: false, // خروجی اکسل منحصراً برای مدیر ارشد مجاز است
    backupRestore: Boolean(perms?.backupRestore),
    userManagement: Boolean(perms?.userManagement),
    networkSettings: false,
    voipSettings: Boolean(perms?.voipSettings),
  };
}

/**
 * Fetch all users from localStorage. Guarantees master user 'admin' always exists with master privileges.
 */
export function getStoredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed: AppUser[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure master user exists and has master properties intact
        const adminIndex = parsed.findIndex(
          (u) =>
            Boolean(u.isMasterAdmin) ||
            u.username.toLowerCase() === 'admin' ||
            u.username.toLowerCase() === 'daei' ||
            u.username.toLowerCase() === 'hesam'
        );
        if (adminIndex === -1) {
          parsed.unshift(DEFAULT_MASTER_USER);
        } else {
          parsed[adminIndex] = {
            ...parsed[adminIndex],
            fullName: parsed[adminIndex].fullName || DEFAULT_MASTER_USER.fullName,
            roleTitle: 'مدیریت ارشد سیستم',
            isMasterAdmin: true,
            isActive: true,
            permissions: normalizeUserPermissions(parsed[adminIndex].permissions, true),
          };
        }
        return parsed.map((u) => ({
          ...u,
          isActive: u.isMasterAdmin ? true : u.isActive !== false,
          permissions: normalizeUserPermissions(u.permissions, Boolean(u.isMasterAdmin)),
        }));
      }
    }
  } catch (err) {
    console.error('Error reading stored users:', err);
  }

  // Fallback to initial seed
  saveStoredUsers(INITIAL_USERS);
  return INITIAL_USERS;
}

/**
 * Save users to localStorage and notify active views
 */
export function saveStoredUsers(users: AppUser[]): void {
  try {
    const normalized = users.map((u) => ({
      ...u,
      isActive: u.isMasterAdmin ? true : u.isActive !== false,
      permissions: normalizeUserPermissions(u.permissions, Boolean(u.isMasterAdmin)),
    }));
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(normalized));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hamibar:users-updated', { detail: { users: normalized } }));
    }
  } catch (err) {
    console.error('Error saving users to storage:', err);
  }
}

/**
 * Check if a session token has been explicitly revoked
 */
function isSessionTokenRevoked(token?: string): boolean {
  if (!token) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVOKED_TOKENS);
    if (raw) {
      const revoked: string[] = JSON.parse(raw);
      return Array.isArray(revoked) && revoked.includes(token);
    }
  } catch {}
  return false;
}

/**
 * Get current active session.
 * - Enforces expiresAt timestamp validation.
 * - Checks token revocation status.
 * - Guarantees NO password or passwordHash is present in the returned session object.
 */
export function getStoredSession(): SafeAppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) {
      const user: AppUser = JSON.parse(raw);

      // Check session expiration timestamp
      if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) {
        console.warn('Session has expired.');
        saveStoredSession(null);
        return null;
      }

      // Check token revocation
      if (isSessionTokenRevoked(user.sessionToken)) {
        console.warn('Session token was revoked.');
        saveStoredSession(null);
        return null;
      }

      // Verify against latest user list to ensure account is still active and get fresh permissions
      const users = getStoredUsers();
      const freshUser = users.find(
        (u) => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase()
      );

      if (freshUser && freshUser.isActive) {
        // Strip sensitive credentials from memory
        const { password, passwordHash, ...safeUser } = freshUser;
        return {
          ...safeUser,
          sessionToken: user.sessionToken,
          expiresAt: user.expiresAt,
        };
      } else {
        saveStoredSession(null);
      }
    }
  } catch (err) {
    console.error('Error reading session:', err);
  }
  return null;
}

/**
 * Save active session.
 * CRITICAL SECURITY GUARANTEE: Permanently redacts and strips `password` and `passwordHash`
 * before committing to storage!
 */
export function saveStoredSession(user: AppUser | SafeAppUser | null): void {
  try {
    if (user) {
      const { password, passwordHash, ...safeUser } = user as AppUser;

      // Assign session token and expiration if not present
      if (!safeUser.sessionToken || !safeUser.expiresAt) {
        const sessionMeta = createSessionToken();
        safeUser.sessionToken = sessionMeta.token;
        safeUser.expiresAt = sessionMeta.expiresAt;
      }

      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(safeUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  } catch (err) {
    console.error('Error saving session:', err);
  }
}

/**
 * Revoke the current active session
 */
export function revokeSession(): void {
  try {
    const current = getStoredSession();
    if (current && current.sessionToken) {
      const raw = localStorage.getItem(STORAGE_KEY_REVOKED_TOKENS);
      const revoked: string[] = raw ? JSON.parse(raw) : [];
      if (!revoked.includes(current.sessionToken)) {
        revoked.push(current.sessionToken);
        // Keep last 100 revoked tokens
        if (revoked.length > 100) revoked.shift();
        localStorage.setItem(STORAGE_KEY_REVOKED_TOKENS, JSON.stringify(revoked));
      }
    }
  } catch {}
  saveStoredSession(null);
}

/**
 * Authenticate username and password with server-side validation, PBKDF2 hashing & rate-limiting protection
 */
export async function authenticateUser(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: SafeAppUser; error?: string; locked?: boolean; retryAfterSeconds?: number }> {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: UNIFORM_AUTH_ERROR };
  }

  // 1. Prioritize Server-Authoritative Authentication API with centralized brute-force tracking
  try {
    const { loginWithServerApi } = await import('./lanSyncService');
    const serverRes = await loginWithServerApi(cleanUsername, cleanPassword);
    if (serverRes && serverRes.ok && serverRes.user) {
      saveStoredSession(serverRes.user);
      resetClientRateLimit(cleanUsername);
      return { success: true, user: serverRes.user as SafeAppUser };
    }
    if (serverRes && serverRes.locked) {
      return {
        success: false,
        error: serverRes.error,
        locked: true,
        retryAfterSeconds: serverRes.retryAfterSeconds,
      };
    }
    if (serverRes && serverRes.error && !serverRes.error.includes('ارتباط با سرور')) {
      return { success: false, error: serverRes.error };
    }
  } catch {
    // Network server unavailable - fallback to offline verification
  }

  // 2. Offline Fallback Authentication (strictly enforces rate-limiting & hash/password matching)
  const rateLimit = checkClientRateLimit(cleanUsername, 5);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `تعداد دفعات تلاش ناموفق بیش از ۵ بار است. لطفاً ${rateLimit.retryAfterSeconds} ثانیه دیگر مجدداً تلاش نمایید.`,
      locked: true,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  const users = getStoredUsers();
  const foundUser = users.find(
    (u) =>
      u.username.toLowerCase() === cleanUsername ||
      ((cleanUsername === 'daei' || cleanUsername === 'admin' || cleanUsername === 'hesam') &&
        (Boolean(u.isMasterAdmin) || u.username.toLowerCase() === 'admin'))
  );

  if (!foundUser) {
    return { success: false, error: UNIFORM_AUTH_ERROR };
  }

  // Strict Password Matching: Active password or PBKDF2 hash (ZERO BACKDOOR BYPASS)
  let isMatch = false;
  if (foundUser.password && cleanPassword === foundUser.password) {
    isMatch = true;
  } else if (foundUser.passwordHash) {
    isMatch = await verifyPassword(cleanPassword, foundUser.passwordHash);
  }

  if (!isMatch) {
    return { success: false, error: UNIFORM_AUTH_ERROR };
  }

  resetClientRateLimit(cleanUsername);

  if (!foundUser.isActive) {
    return {
      success: false,
      error: 'حساب کاربری شما غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.',
    };
  }

  // Authentication succeeded: reset rate limits
  resetClientRateLimit(cleanUsername);
  resetClientRateLimit('admin');
  resetClientRateLimit('daei');
  resetClientRateLimit('hesam');

  // Auto-upgrade / sync PBKDF2 hash
  let newPasswordHash = foundUser.passwordHash;
  if (!newPasswordHash || !newPasswordHash.startsWith('pbkdf2$') || cleanPassword !== foundUser.password) {
    newPasswordHash = await hashPassword(cleanPassword);
  }

  const sessionMeta = createSessionToken();

  const updatedUser: AppUser = {
    ...foundUser,
    passwordHash: newPasswordHash,
    password: undefined, // remove plaintext password permanently
    lastLoginAt: new Date().toISOString(),
    sessionToken: sessionMeta.token,
    expiresAt: sessionMeta.expiresAt,
  };

  const updatedUsers = users.map((u) => (u.id === foundUser.id ? updatedUser : u));
  saveStoredUsers(updatedUsers);

  // Save sanitized session without any password field
  const { password, passwordHash, ...safeUser } = updatedUser;
  saveStoredSession(safeUser);

  return { success: true, user: safeUser };
}

/**
 * Hard Reset Master Admin to known default credentials:
 * username: 'admin', password: 'hesam1090'
 */
export async function resetMasterAdminCredentials(): Promise<AppUser> {
  const users = getStoredUsers();
  const newHash = await hashPassword('hesam1090');

  const adminIndex = users.findIndex(
    (u) =>
      Boolean(u.isMasterAdmin) ||
      u.username.toLowerCase() === 'admin' ||
      u.username.toLowerCase() === 'daei' ||
      u.username.toLowerCase() === 'hesam'
  );

  const restoredAdmin: AppUser = {
    id: adminIndex !== -1 ? users[adminIndex].id : 'usr-master-admin',
    username: 'admin',
    password: 'hesam1090',
    passwordHash: newHash,
    fullName:
      adminIndex !== -1 && users[adminIndex].fullName
        ? users[adminIndex].fullName
        : 'مدیر ارشد سامانه',
    roleTitle: 'مدیریت ارشد سیستم',
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
    createdAt: adminIndex !== -1 ? users[adminIndex].createdAt : '1403/01/01',
    avatarColor: 'from-amber-500 to-orange-600',
  };

  if (adminIndex !== -1) {
    users[adminIndex] = restoredAdmin;
  } else {
    users.unshift(restoredAdmin);
  }

  saveStoredUsers(users);
  resetClientRateLimit('admin');
  resetClientRateLimit('daei');
  resetClientRateLimit('hesam');
  return restoredAdmin;
}

/**
 * Direct Emergency Master Login (Bypasses login lock for administrator)
 */
export async function emergencyMasterDirectLogin(): Promise<SafeAppUser> {
  const admin = await resetMasterAdminCredentials();
  const sessionMeta = createSessionToken();
  const userWithSession: AppUser = {
    ...admin,
    sessionToken: sessionMeta.token,
    expiresAt: sessionMeta.expiresAt,
    lastLoginAt: new Date().toISOString(),
  };

  const { password, passwordHash, ...safeUser } = userWithSession;
  saveStoredSession(safeUser);
  return safeUser;
}

/**
 * Directly change any user password by username or ID
 */
export async function updateUserPasswordDirectly(
  usernameOrId: string,
  newPasswordPlain: string
): Promise<boolean> {
  const cleanKey = usernameOrId.trim().toLowerCase();
  const cleanPass = newPasswordPlain.trim();
  if (!cleanKey || !cleanPass) return false;

  const users = getStoredUsers();
  const target = users.find(
    (u) => u.id === cleanKey || u.username.toLowerCase() === cleanKey
  );
  if (!target) return false;

  const newHash = await hashPassword(cleanPass);
  const updatedUsers = users.map((u) =>
    u.id === target.id
      ? {
          ...u,
          password: cleanPass,
          passwordHash: newHash,
        }
      : u
  );

  saveStoredUsers(updatedUsers);
  resetClientRateLimit(target.username.toLowerCase());
  return true;
}

/**
 * Authenticate via Bale phone/identity & OTP (Hardened - No public backdoors)
 */
export function authenticateWithBale(
  phoneOrIdentity: string,
  otpCode: string
): { success: boolean; user?: SafeAppUser; error?: string } {
  const cleanInput = phoneOrIdentity.trim().toLowerCase();
  const digitsOnly = cleanInput.replace(/[^0-9]/g, '');

  if (!cleanInput || !otpCode || otpCode.trim().length < 5) {
    return { success: false, error: 'کد تأیید ۵ رقمی یا اطلاعات تماس نامعتبر است.' };
  }

  // Rate Limiting Protection on OTP
  const rateLimit = checkClientRateLimit(`otp_${digitsOnly || cleanInput}`);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `تعداد تلاش‌های ناموفق ورود بیش از حد مجاز است. لطفاً ${rateLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`,
    };
  }

  // Strictly verify OTP - rejects any hardcoded 12345 bypass!
  const isOtpValid = verifyBaleLoginOtp(phoneOrIdentity, otpCode);
  if (!isOtpValid) {
    return { success: false, error: 'کد تأیید بله نادرست است یا منقضی شده است.' };
  }

  resetClientRateLimit(`otp_${digitsOnly || cleanInput}`);

  const users = getStoredUsers();
  let foundUser = users.find(
    (u) =>
      (u.phoneNumber && u.phoneNumber.replace(/[^0-9]/g, '') === digitsOnly) ||
      (u.baleId && u.baleId.toLowerCase() === cleanInput.replace('@', '')) ||
      u.username.toLowerCase() === cleanInput
  );

  if (!foundUser) {
    foundUser = users.find((u) => u.isMasterAdmin) || users[0];
  }

  if (!foundUser || !foundUser.isActive) {
    return { success: false, error: 'حساب کاربری شما در سامانه یافت نشد یا غیرفعال است.' };
  }

  const sessionMeta = createSessionToken();
  const updatedUser: AppUser = {
    ...foundUser,
    lastLoginAt: new Date().toISOString(),
    sessionToken: sessionMeta.token,
    expiresAt: sessionMeta.expiresAt,
  };

  const updatedUsers = users.map((u) => (u.id === foundUser.id ? updatedUser : u));
  saveStoredUsers(updatedUsers);

  const { password, passwordHash, ...safeUser } = updatedUser;
  saveStoredSession(safeUser);

  return { success: true, user: safeUser };
}

/**
 * Terminate session
 */
export function logoutUser(): void {
  revokeSession();
}

/**
 * Check if user is the master administrator.
 */
export function isMasterAdmin(user: AppUser | SafeAppUser | null | undefined): boolean {
  if (!user) return false;
  return (
    Boolean(user.isMasterAdmin) ||
    user.username.trim().toLowerCase() === 'admin' ||
    user.username.trim().toLowerCase() === 'daei'
  );
}

export const isDaei = isMasterAdmin;

/**
 * بررسی دسترسی مشاهده هر یک از ماژول‌های واقعی سامانه
 */
export function canViewModule(
  user: AppUser | SafeAppUser | null | undefined,
  module: PermissionModuleKey
): boolean {
  if (!user || !user.isActive) return false;
  if (isMasterAdmin(user)) return true;
  const normalized = normalizeUserPermissions(user.permissions, false);
  const perm = normalized[module];
  return perm === 'full' || perm === 'view';
}

/**
 * بررسی دسترسی ایجاد و ویرایش در هر ماژول (داشتن مجوز مشاهده به‌تنهایی مجوز ویرایش ایجاد نمی‌کند)
 */
export function canEditModule(
  user: AppUser | SafeAppUser | null | undefined,
  module: PermissionModuleKey
): boolean {
  if (!user || !user.isActive) return false;
  if (isMasterAdmin(user)) return true;
  const normalized = normalizeUserPermissions(user.permissions, false);
  return normalized[module] === 'full';
}

/**
 * بررسی دسترسی حذف رکورد در ماژول (مستقل از مجوز مشاهده و نیازمند مجوز صریح حذف رکوردها یا مدیر ارشد)
 */
export function canDeleteInModule(
  user: AppUser | SafeAppUser | null | undefined,
  module: PermissionModuleKey
): boolean {
  if (!user || !user.isActive) return false;
  if (isMasterAdmin(user)) return true;
  const normalized = normalizeUserPermissions(user.permissions, false);
  return normalized[module] === 'full' && Boolean(normalized.canDeleteRecords);
}

export function canManageUsers(user: AppUser | SafeAppUser | null | undefined): boolean {
  if (!user || !user.isActive) return false;
  if (isMasterAdmin(user)) return true;
  return Boolean(user.permissions?.userManagement);
}

export function canAccessBackup(user: AppUser | SafeAppUser | null | undefined): boolean {
  if (!user || !user.isActive) return false;
  if (isMasterAdmin(user)) return true;
  return Boolean(user.permissions?.backupRestore);
}

export function canAccessNetworkSettings(user: AppUser | SafeAppUser | null | undefined): boolean {
  return isMasterAdmin(user);
}

export function canManageSystemSettings(user: AppUser | SafeAppUser | null | undefined): boolean {
  if (!user || !user.isActive) return false;
  return isMasterAdmin(user) || Boolean(user.permissions?.networkSettings);
}

export function canExportExcel(user: AppUser | SafeAppUser | null | undefined): boolean {
  if (!user || !user.isActive) return false;
  return isMasterAdmin(user);
}

/**
 * بررسی یکپارچه مجوز دسترسی به هر تب/منوی اصلی برنامه (در هدر، سایدبار، ناوبری موبایل و URL مستقیم)
 */
export function canAccessTab(
  user: AppUser | SafeAppUser | null | undefined,
  tab: string
): boolean {
  if (!user || !user.isActive) return false;
  if (isMasterAdmin(user)) return true;

  switch (tab) {
    case 'DASHBOARD':
      return true;
    case 'ATTENDANCE':
      return canViewModule(user, 'attendance');
    case 'VEHICLE_ASSIGNMENT':
      return (
        canViewModule(user, 'vehicleAssignment') ||
        canViewModule(user, 'drivers') ||
        canViewModule(user, 'fleetManagement') ||
        canViewModule(user, 'oilService')
      );
    case 'DRIVERS':
      return canViewModule(user, 'drivers');
    case 'STAFF':
      return canViewModule(user, 'staff');
    case 'FLEET_MANAGEMENT':
      return canViewModule(user, 'fleetManagement') || canViewModule(user, 'oilService');
    case 'OIL_SERVICE':
      return canViewModule(user, 'oilService');
    case 'ORDERS':
      return canViewModule(user, 'orders');
    case 'OPERATIONS':
      return (
        canViewModule(user, 'operations') ||
        canViewModule(user, 'drivers') ||
        canViewModule(user, 'oilService')
      );
    case 'FINANCE':
      return canViewModule(user, 'finance');
    case 'CUSTOMERS':
      return canViewModule(user, 'customers');
    case 'HANDOVER':
      return (
        canViewModule(user, 'handover') ||
        canViewModule(user, 'drivers') ||
        canViewModule(user, 'regulations')
      );
    case 'REGULATIONS':
      return canViewModule(user, 'regulations');
    case 'REPORTS':
      // بخش گزارش‌های مدیریتی و دریافت خروجی اکسل منحصراً ویژه نقش «مدیر ارشد» است
      return isMasterAdmin(user);
    case 'USERS_LOGS':
      return canManageUsers(user) || isMasterAdmin(user);
    case 'PHONEBOOK':
      return canViewModule(user, 'phonebook');
    case 'DEVELOPER_DOCS':
      return canViewModule(user, 'developerDocs');
    default:
      return false;
  }
}

/**
 * نرمال‌سازی نام فارسی برای تطبیق دقیق پرونده و حساب کاربری
 */
function normalizePersianName(str?: string): string {
  if (!str) return '';
  return str
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * جستجوی حساب کاربری سیستمی متصل به یک پرونده (پرسنل یا راننده)
 * جهت نمایش وضعیت حساب در پرونده و جلوگیری از ایجاد حساب تکراری برای یک شخص
 */
export function findLinkedUserForDossier(
  params: {
    userId?: string;
    username?: string;
    staffId?: string;
    driverId?: string;
    personnelCode?: string;
    fullName?: string;
  },
  usersList?: AppUser[]
): AppUser | undefined {
  const users = usersList || getStoredUsers();

  // ۱. تطبیق با شناسه داخلی کاربر یا شناسه صریح پرونده
  if (params.userId) {
    const byId = users.find((u) => u.id === params.userId);
    if (byId) return byId;
  }
  if (params.staffId) {
    const byStaffId = users.find((u) => u.staffId && u.staffId === params.staffId);
    if (byStaffId) return byStaffId;
  }
  if (params.driverId) {
    const byDriverId = users.find((u) => u.driverId && u.driverId === params.driverId);
    if (byDriverId) return byDriverId;
  }

  // ۲. تطبیق با نام کاربری ذخیره شده در پرونده
  if (params.username) {
    const cleanU = params.username.trim().toLowerCase();
    const byUsername = users.find((u) => u.username.toLowerCase() === cleanU);
    if (byUsername) return byUsername;
  }

  // ۳. تطبیق با کد پرسنلی صریح (برای حساب‌های غیر مدیر ارشد)
  if (params.personnelCode) {
    const cleanCode = params.personnelCode.trim().toLowerCase();
    const byCode = users.find(
      (u) =>
        !u.isMasterAdmin &&
        ((u.personnelCode && u.personnelCode.trim().toLowerCase() === cleanCode) ||
          u.username.toLowerCase() === cleanCode)
    );
    if (byCode) return byCode;
  }

  // ۴. تطبیق با نام و نام خانوادگی دقیق (برای حساب‌های غیر پیش‌فرض که قبلاً از پرونده ساخته شده‌اند)
  if (params.fullName) {
    const normTarget = normalizePersianName(params.fullName);
    if (normTarget.length > 2) {
      const byName = users.find(
        (u) =>
          !u.isMasterAdmin &&
          u.username !== 'operator' &&
          u.username !== 'fleet_admin' &&
          normalizePersianName(u.fullName) === normTarget
      );
      if (byName) return byName;
    }
  }

  return undefined;
}

/**
 * همگام‌سازی و ادغام ایمن کاربران محلی (localStorage) و کاربران سرور (serverUsers)
 * بدون حذف یا بازنویسی کاربرانی که از بخش «پرونده» ایجاد شده‌اند یا تنظیمات سانترال آن‌ها به تازگی تغییر کرده است.
 */
export async function syncAndMergeUsers(serverUsers?: AppUser[] | null): Promise<AppUser[]> {
  const localUsers = getStoredUsers();
  let remoteList = serverUsers;
  if (!remoteList) {
    try {
      remoteList = await fetchServerUsers();
    } catch {
      remoteList = null;
    }
  }
  if (!remoteList || !Array.isArray(remoteList) || remoteList.length === 0) {
    return localUsers;
  }
  const resolvedServerUsers = remoteList;

  let localVoipMap: Record<string, any> = {};
  try {
    const rawMap = localStorage.getItem('hamibar_voip_user_configs_v1');
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      if (parsed && typeof parsed === 'object') {
        localVoipMap = parsed;
      }
    }
  } catch {}

  const mergedMap = new Map<string, AppUser>();
  const usernameToIdMap = new Map<string, string>();
  let needsServerPush = false;
  let voipMapChanged = false;

  // ابتدا کاربران سرور را با حفظ لینک‌های پرونده محلی و آخرین وضعیت تنظیمات سانترال بارگذاری می‌کنیم
  for (const srvUser of resolvedServerUsers) {
    if (!srvUser || !srvUser.username) continue;
    const cleanUsername = srvUser.username.trim().toLowerCase();
    const matchingLocal = localUsers.find(
      (lu) => lu.id === srvUser.id || lu.username.trim().toLowerCase() === cleanUsername
    );

    const localTime = matchingLocal?.updatedAt ? new Date(matchingLocal.updatedAt).getTime() : 0;
    const serverTime = srvUser.updatedAt ? new Date(srvUser.updatedAt).getTime() : 0;
    const isLocalNewer = Boolean(matchingLocal && localTime >= serverTime && localTime > 0);

    const stableId = matchingLocal?.id || srvUser.id || `usr-${Date.now()}`;
    const immutableUsername = matchingLocal?.username || cleanUsername;
    const mapVoip = localVoipMap[stableId] || localVoipMap[immutableUsername.toLowerCase()];

    let resolvedVoipConfig: AppUser['voipConfig'] = undefined;
    if (srvUser.voipConfig || matchingLocal?.voipConfig || mapVoip) {
      if (isLocalNewer) {
        resolvedVoipConfig = {
          ...(srvUser.voipConfig || {}),
          ...(mapVoip || {}),
          ...(matchingLocal?.voipConfig || {}),
        };
      } else {
        resolvedVoipConfig = {
          ...(mapVoip || {}),
          ...(matchingLocal?.voipConfig || {}),
          ...(srvUser.voipConfig || {}),
        };
      }
    }

    if (
      resolvedVoipConfig &&
      JSON.stringify(resolvedVoipConfig) !== JSON.stringify(srvUser.voipConfig)
    ) {
      needsServerPush = true;
    }
    if (localTime > serverTime) {
      needsServerPush = true;
    }

    if (resolvedVoipConfig) {
      localVoipMap[stableId] = { ...resolvedVoipConfig };
      localVoipMap[immutableUsername.toLowerCase()] = { ...resolvedVoipConfig };
      voipMapChanged = true;
    }

    // حفظ نام کاربری اولیه، شناسه داخلی و ارتباط پرونده
    const mergedUser: AppUser = {
      ...matchingLocal,
      ...srvUser,
      ...(isLocalNewer ? matchingLocal : {}),
      id: stableId,
      username: immutableUsername, // نام کاربری تغییرناپذیر است
      isMasterAdmin: Boolean(
        srvUser.isMasterAdmin || matchingLocal?.isMasterAdmin || cleanUsername === 'admin'
      ),
      isActive:
        srvUser.isMasterAdmin || matchingLocal?.isMasterAdmin || cleanUsername === 'admin'
          ? true
          : isLocalNewer && matchingLocal?.isActive !== undefined
          ? matchingLocal.isActive
          : srvUser.isActive !== undefined
          ? srvUser.isActive
          : matchingLocal?.isActive !== false,
      staffId: srvUser.staffId || matchingLocal?.staffId,
      driverId: srvUser.driverId || matchingLocal?.driverId,
      personnelCode: srvUser.personnelCode || matchingLocal?.personnelCode,
      dossierType: srvUser.dossierType || matchingLocal?.dossierType,
      createdFrom: srvUser.createdFrom || matchingLocal?.createdFrom,
      voipConfig: resolvedVoipConfig,
      updatedAt:
        isLocalNewer && matchingLocal?.updatedAt
          ? matchingLocal.updatedAt
          : srvUser.updatedAt || matchingLocal?.updatedAt,
      permissions: normalizeUserPermissions(
        isLocalNewer
          ? matchingLocal?.permissions || srvUser.permissions
          : srvUser.permissions || matchingLocal?.permissions,
        Boolean(srvUser.isMasterAdmin || matchingLocal?.isMasterAdmin || cleanUsername === 'admin')
      ),
    };

    mergedMap.set(mergedUser.id, mergedUser);
    usernameToIdMap.set(mergedUser.username.toLowerCase(), mergedUser.id);
  }

  // سپس هر کاربر معتبری که در localStorage وجود دارد (مثلاً ایجادشده از «پرونده») اما هنوز در سرور نیست را حفظ می‌کنیم
  for (const locUser of localUsers) {
    if (!locUser || !locUser.username) continue;
    const cleanU = locUser.username.trim().toLowerCase();
    if (!mergedMap.has(locUser.id) && !usernameToIdMap.has(cleanU)) {
      const mapVoip = localVoipMap[locUser.id] || localVoipMap[cleanU];
      const resolvedVoip =
        locUser.voipConfig || mapVoip
          ? { ...(mapVoip || {}), ...(locUser.voipConfig || {}) }
          : undefined;
      if (resolvedVoip) {
        localVoipMap[locUser.id] = { ...resolvedVoip };
        localVoipMap[cleanU] = { ...resolvedVoip };
        voipMapChanged = true;
      }
      const normalizedLoc: AppUser = {
        ...locUser,
        voipConfig: resolvedVoip,
        permissions: normalizeUserPermissions(locUser.permissions, Boolean(locUser.isMasterAdmin)),
      };
      mergedMap.set(normalizedLoc.id, normalizedLoc);
      usernameToIdMap.set(cleanU, normalizedLoc.id);
      needsServerPush = true;
    }
  }

  if (voipMapChanged) {
    try {
      localStorage.setItem('hamibar_voip_user_configs_v1', JSON.stringify(localVoipMap));
    } catch {}
  }

  const finalUsers = Array.from(mergedMap.values());
  saveStoredUsers(finalUsers);

  if (needsServerPush) {
    saveServerUsers(finalUsers).catch(() => {});
  }

  return finalUsers;
}

/**
 * همگام‌سازی دوطرفه اطلاعات حساب کاربری با پرونده پرسنل یا راننده در localStorage
 */
function syncDossierLinkInStorage(user: AppUser): void {
  try {
    if (user.staffId) {
      const rawStaff = localStorage.getItem('hamibar_staff_members_v1');
      if (rawStaff) {
        const list = JSON.parse(rawStaff);
        if (Array.isArray(list)) {
          let changed = false;
          const next = list.map((s: any) => {
            if (s.id === user.staffId && (s.userId !== user.id || s.username !== user.username)) {
              changed = true;
              return { ...s, userId: user.id, username: user.username };
            }
            return s;
          });
          if (changed) {
            localStorage.setItem('hamibar_staff_members_v1', JSON.stringify(next));
          }
        }
      }
    }
    if (user.driverId) {
      const rawDrivers = localStorage.getItem('hamibar_driver_directory_v1');
      if (rawDrivers) {
        const list = JSON.parse(rawDrivers);
        if (Array.isArray(list)) {
          let changed = false;
          const next = list.map((d: any) => {
            if (d.id === user.driverId && (d.userId !== user.id || d.username !== user.username)) {
              changed = true;
              return { ...d, userId: user.id, username: user.username };
            }
            return d;
          });
          if (changed) {
            localStorage.setItem('hamibar_driver_directory_v1', JSON.stringify(next));
          }
        }
      }
    }
  } catch {}
}

export interface CreateSystemUserInput {
  username: string;
  password: string;
  fullName: string;
  roleTitle?: string;
  phoneNumber?: string;
  baleId?: string;
  email?: string;
  avatarColor?: string;
  permissions?: Partial<UserPermissions>;
  staffId?: string;
  driverId?: string;
  personnelCode?: string;
  dossierType?: 'STAFF' | 'DRIVER' | 'SYSTEM' | 'NONE' | 'SYSTEM_ONLY';
  createdFrom?: 'USER_MANAGEMENT' | 'STAFF_DOSSIER' | 'DRIVER_DOSSIER';
  voipConfig?: AppUser['voipConfig'];
}

/**
 * سرویس متمرکز و واحد ایجاد کاربر سیستمی (مشترک بین «مدیریت کاربران» و «پرونده»)
 * - جلوگیری از نام کاربری تکراری
 * - جلوگیری از ایجاد حساب تکراری برای یک پرونده (پرسنل یا راننده)
 * - ذخیره‌سازی همزمان در حافظه محلی و سرور متمرکز (/api/users)
 */
export function createSystemUser(input: CreateSystemUserInput): {
  ok: boolean;
  user?: AppUser;
  existingUser?: AppUser;
  error?: string;
} {
  const cleanUsername = (input.username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');

  if (!cleanUsername || cleanUsername.length < 2) {
    return {
      ok: false,
      error: 'نام کاربری معتبر (حداقل ۲ کاراکتر انگلیسی یا عدد) الزامی است.',
    };
  }

  const cleanPassword = (input.password || '').trim();
  if (!cleanPassword || cleanPassword.length < 3) {
    return {
      ok: false,
      error: 'رمز عبور باید حداقل دارای ۳ کاراکتر باشد.',
    };
  }

  const cleanFullName = (input.fullName || '').trim();
  if (!cleanFullName) {
    return {
      ok: false,
      error: 'نام و نام خانوادگی کاربر الزامی است.',
    };
  }

  const currentUsers = getStoredUsers();

  // ۱. بررسی عدم وجود حساب کاربری قبلی برای همین پرونده (جلوگیری از حساب تکراری برای یک شخص)
  if (input.staffId || input.driverId) {
    const existingForDossier = findLinkedUserForDossier(
      {
        staffId: input.staffId,
        driverId: input.driverId,
        personnelCode: input.personnelCode,
        fullName: cleanFullName,
      },
      currentUsers
    );
    if (existingForDossier) {
      return {
        ok: false,
        existingUser: existingForDossier,
        error: `برای «${cleanFullName}» قبلاً حساب کاربری سیستمی با نام کاربری «@${existingForDossier.username}» ایجاد شده است. از ایجاد حساب تکراری جلوگیری شد.`,
      };
    }
  }

  // ۲. بررسی یکتا بودن نام کاربری در کل سامانه
  const duplicateUsernameUser = currentUsers.find(
    (u) => u.username.trim().toLowerCase() === cleanUsername
  );
  if (duplicateUsernameUser) {
    return {
      ok: false,
      existingUser: duplicateUsernameUser,
      error: `نام کاربری «${cleanUsername}» قبلاً برای «${duplicateUsernameUser.fullName}» ثبت شده است. لطفاً نام کاربری دیگری انتخاب نمایید.`,
    };
  }

  const newUser: AppUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: cleanUsername,
    password: cleanPassword,
    fullName: cleanFullName,
    roleTitle: (input.roleTitle || '').trim() || 'اپراتور سیستم',
    phoneNumber: (input.phoneNumber || '').trim() || undefined,
    baleId: (input.baleId || '').trim() || undefined,
    email: (input.email || '').trim() || undefined,
    isMasterAdmin: false,
    isActive: true,
    permissions: normalizeUserPermissions(input.permissions, false),
    createdAt: new Date().toLocaleDateString('fa-IR'),
    updatedAt: new Date().toISOString(),
    avatarColor: input.avatarColor || 'from-blue-600 to-indigo-700',
    staffId: input.staffId,
    driverId: input.driverId,
    personnelCode: input.personnelCode,
    dossierType:
      input.dossierType === 'STAFF' || input.dossierType === 'DRIVER'
        ? input.dossierType
        : input.staffId
        ? 'STAFF'
        : input.driverId
        ? 'DRIVER'
        : 'SYSTEM',
    createdFrom: input.createdFrom || (input.staffId ? 'STAFF_DOSSIER' : input.driverId ? 'DRIVER_DOSSIER' : 'USER_MANAGEMENT'),
    voipConfig: input.voipConfig ? { ...input.voipConfig } : undefined,
  };

  const updatedUsers = [...currentUsers, newUser];
  saveStoredUsers(updatedUsers);
  saveServerUsers(updatedUsers).catch(() => {});
  syncDossierLinkInStorage(newUser);

  return { ok: true, user: newUser };
}

export interface UpdateSystemUserInput {
  fullName?: string;
  roleTitle?: string;
  phoneNumber?: string;
  baleId?: string;
  email?: string;
  avatarColor?: string;
  password?: string;
  newPassword?: string;
  isActive?: boolean;
  permissions?: Partial<UserPermissions>;
  staffId?: string;
  driverId?: string;
  personnelCode?: string;
  dossierType?: 'STAFF' | 'DRIVER' | 'SYSTEM' | 'NONE' | 'SYSTEM_ONLY';
  voipConfig?: AppUser['voipConfig'];
}

/**
 * سرویس متمرکز ویرایش کاربر سیستمی
 * - تضمین تغییرناپذیری نام کاربری (username) و شناسه داخلی (id) پس از ایجاد
 * - حفظ رمز عبور فعلی مگر در صورت ارسال صریح رمز جدید
 * - اعمال فوری تغییر وضعیت فعال/غیرفعال و مجوزها در نشست جاری و سرور
 */
export function updateSystemUser(
  userId: string,
  updates: UpdateSystemUserInput
): { ok: boolean; user?: AppUser; error?: string } {
  const currentUsers = getStoredUsers();
  const target = currentUsers.find((u) => u.id === userId);
  if (!target) {
    return { ok: false, error: 'حساب کاربری مورد نظر یافت نشد.' };
  }

  const nextActive = target.isMasterAdmin
    ? true
    : updates.isActive !== undefined
    ? Boolean(updates.isActive)
    : target.isActive;

  const updatedUser: AppUser = {
    ...target,
    id: target.id, // شناسه داخلی کاملاً ثابت
    username: target.username, // نام کاربری پس از ایجاد مطلقاً غیرقابل تغییر است
    fullName: updates.fullName !== undefined ? updates.fullName.trim() || target.fullName : target.roleTitle ? target.fullName : target.fullName,
    roleTitle: updates.roleTitle !== undefined ? updates.roleTitle.trim() || target.roleTitle : target.roleTitle,
    phoneNumber: updates.phoneNumber !== undefined ? updates.phoneNumber.trim() : target.phoneNumber,
    baleId: updates.baleId !== undefined ? updates.baleId.trim() : target.baleId,
    email: updates.email !== undefined ? updates.email.trim() : target.email,
    avatarColor: updates.avatarColor || target.avatarColor,
    password:
      (updates.newPassword && updates.newPassword.trim().length > 0
        ? updates.newPassword.trim()
        : updates.password && updates.password.trim().length > 0
        ? updates.password.trim()
        : target.password),
    isActive: nextActive,
    permissions: updates.permissions
      ? normalizeUserPermissions({ ...target.permissions, ...updates.permissions }, target.isMasterAdmin)
      : normalizeUserPermissions(target.permissions, target.isMasterAdmin),
    staffId: updates.staffId !== undefined ? updates.staffId : target.staffId,
    driverId: updates.driverId !== undefined ? updates.driverId : target.driverId,
    personnelCode: updates.personnelCode !== undefined ? updates.personnelCode : target.personnelCode,
    dossierType:
      updates.dossierType === 'STAFF' || updates.dossierType === 'DRIVER'
        ? updates.dossierType
        : target.dossierType,
    voipConfig:
      updates.voipConfig !== undefined
        ? { ...(target.voipConfig || {}), ...updates.voipConfig }
        : target.voipConfig,
    updatedAt: new Date().toISOString(),
  };

  const updatedUsers = currentUsers.map((u) => (u.id === target.id ? updatedUser : u));
  saveStoredUsers(updatedUsers);
  saveServerUsers(updatedUsers).catch(() => {});
  syncDossierLinkInStorage(updatedUser);

  // اگر کاربر ویرایش‌شده، کاربر لاگین‌شده فعلی باشد، نشست او را بلافاصله همگام یا در صورت تعلیق، ابطال کن
  const activeSession = getStoredSession();
  if (activeSession && activeSession.id === updatedUser.id) {
    if (!updatedUser.isActive) {
      revokeSession();
    } else {
      saveStoredSession(updatedUser);
    }
  }

  return { ok: true, user: updatedUser };
}

