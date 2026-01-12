import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'fallback-secret-change-in-production'
);

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 60 * 60; // 1 hour in seconds

interface AdminSession {
  authenticated: boolean;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Create a signed JWT token for admin session
 */
export async function createAdminSession(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_DURATION;

  const token = await new SignJWT({
    authenticated: true,
    issuedAt,
    expiresAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(SECRET_KEY);

  return token;
}

/**
 * Verify admin session token
 */
export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    const payload = verified.payload;

    // Validate payload structure
    if (
      typeof payload.authenticated === 'boolean' &&
      typeof payload.issuedAt === 'number' &&
      typeof payload.expiresAt === 'number'
    ) {
      return {
        authenticated: payload.authenticated,
        issuedAt: payload.issuedAt,
        expiresAt: payload.expiresAt,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Set admin session cookie (httpOnly, secure, sameSite)
 */
export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/**
 * Get admin session from cookie
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyAdminSession(token);
}

/**
 * Clear admin session cookie
 */
export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Check if user is authenticated as admin
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await getAdminSession();
  return session?.authenticated === true;
}
