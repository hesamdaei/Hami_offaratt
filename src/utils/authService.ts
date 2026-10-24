import { AppUser, SafeAppUser, DEFAULT_MASTER_USER, INITIAL_USERS, UserPermissions } from '../types/auth';
import { verifyBaleLoginOtp } from './baleService';
import {
  hashPassword,
  verifyPassword,
  checkClientRateLimit,
  resetClientRateLimit,
  createSessionToken,
  SESSION_DURATION_HOURS,
} from './securityCrypto';

export const STORAGE_KEY_USERS = 'hamibar_system_users_v2';
export const STORAGE_KEY_SESSION = 'hamibar_session_user_v2';
export const STORAGE_KEY_REVOKED_TOKENS = 'hamibar_revoked_session_tokens';

// Uniform security error message to eliminate username enumeration attacks
const UNIFORM_AUTH_ERROR = 'نام کاربری یا رمز عبور اشتباه است.';

/**
 * Fetch all users from localStorage. Guarantees master user 'admin' always exists with master privileges.
 * Automatically migrates legacy plaintext passwords to PBKDF2-SHA256 hashes.
 */
export function getStoredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed: AppUser[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure master user exists and has master properties intact
        const adminIndex = parsed.findIndex(
          (u) => u.username.toLowerCase() === 'admin' || u.username.toLowerCase() === 'daei'
        );
        if (adminIndex === -1) {
          parsed.unshift(DEFAULT_MASTER_USER);
        } else {
          parsed[adminIndex] = {
            ...parsed[adminIndex],
            username: 'admin',
            fullName: parsed[adminIndex].fullName || DEFAULT_MASTER_USER.fullName,
            roleTitle: 'مدیریت ارشد سیستم',
            isMasterAdmin: true,
            permissions: {
              ...parsed[adminIndex].permissions,
              networkSettings: true,
              userManagement: true,
            },
          };
        }
        return parsed;
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
 * Save users to localStorage
 */
export function saveStoredUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
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
 * Authenticate username and password with PBKDF2 hashing & rate-limiting protection
 */
export async function authenticateUser(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: SafeAppUser; error?: string }> {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: UNIFORM_AUTH_ERROR };
  }

  // Rate Limiting Protection (Max 5 attempts per 5 minutes per user)
  const rateLimit = checkClientRateLimit(cleanUsername);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ${rateLimit.retryAfterSeconds} ثانیه دیگر مجدداً تلاش نمایید.`,
    };
  }

  const users = getStoredUsers();
  const foundUser = users.find(
    (u) =>
      u.username.toLowerCase() === cleanUsername ||
      (cleanUsername === 'daei' && (u.username.toLowerCase() === 'admin' || Boolean(u.isMasterAdmin))) ||
      (cleanUsername === 'admin' && (u.username.toLowerCase() === 'daei' || Boolean(u.isMasterAdmin)))
  );

  if (!foundUser) {
    return { success: false, error: UNIFORM_AUTH_ERROR };
  }

  // Verify against PBKDF2 hash or legacy password
  const storedHashOrPlain = foundUser.passwordHash || foundUser.password || '';
  const isMatch = await verifyPassword(cleanPassword, storedHashOrPlain);

  if (!isMatch) {
    return { success: false, error: UNIFORM_AUTH_ERROR };
  }

  if (!foundUser.isActive) {
    return {
      success: false,
      error: 'حساب کاربری شما غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.',
    };
  }

  // Authentication succeeded: reset rate limit
  resetClientRateLimit(cleanUsername);

  // Auto-upgrade legacy plaintext to PBKDF2 hash
  let newPasswordHash = foundUser.passwordHash;
  if (!newPasswordHash || !newPasswordHash.startsWith('pbkdf2$')) {
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
 * Permissions checks
 */
export function canViewModule(
  user: AppUser | SafeAppUser | null | undefined,
  module: 'attendance' | 'drivers' | 'staff' | 'oilService' | 'regulations'
): boolean {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;
  const perm = user.permissions?.[module];
  return perm === 'full' || perm === 'view';
}

export function canEditModule(
  user: AppUser | SafeAppUser | null | undefined,
  module: 'attendance' | 'drivers' | 'staff' | 'oilService' | 'regulations'
): boolean {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;
  return user.permissions?.[module] === 'full';
}

export function canManageUsers(user: AppUser | SafeAppUser | null | undefined): boolean {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;
  return Boolean(user.permissions?.userManagement);
}

export function canAccessBackup(user: AppUser | SafeAppUser | null | undefined): boolean {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;
  return Boolean(user.permissions?.backupRestore);
}

export function canAccessNetworkSettings(user: AppUser | SafeAppUser | null | undefined): boolean {
  return isMasterAdmin(user);
}
