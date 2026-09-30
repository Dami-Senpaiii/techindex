import { betterAuth } from 'better-auth';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const cost = { N: 16384, r: 16, p: 1, maxmem: 64 * 1024 * 1024 };
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password.normalize('NFKC'), salt, 64, cost);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword({ password, hash }) {
  const [salt, hex] = hash.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hex || '')) return false;
  const key = await derive(password.normalize('NFKC'), salt, 64, cost);
  return timingSafeEqual(key, Buffer.from(hex, 'hex'));
}
export function authOptions(env, origin) {
  if (!env.SHOP_DB || !env.BETTER_AUTH_SECRET) throw new Error('Account service is not configured');
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
  return {
    appName: 'TechIndex', baseURL: origin, secret: env.BETTER_AUTH_SECRET, database: env.SHOP_DB,
    trustedOrigins: local ? [origin] : ['https://techindex.ch', 'https://www.techindex.ch'],
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, password: { hash: hashPassword, verify: verifyPassword } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, freshAge: 60 * 15 },
    user: { changeEmail: { enabled: true, updateEmailWithoutVerification: true }, deleteUser: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60,
      customRules: { '/sign-up/email': { window: 3600, max: 5 }, '/sign-in/email': { window: 60, max: 8 }, '/change-password': { window: 60, max: 5 } } },
    advanced: { cookiePrefix: 'techindex', useSecureCookies: !local,
      ipAddress: { ipAddressHeaders: local ? ['x-forwarded-for'] : ['cf-connecting-ip'] },
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: !local } },
    logger: { level: 'error' },
  };
}
export function getAuth(env, request) { return betterAuth(authOptions(env, new URL(request.url).origin)); }
