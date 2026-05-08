import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'tp_admin';

function hmacSha256Hex(secret: string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function createAdminToken(secret: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = Date.now().toString(36);
  const payload = `${issuedAt}.${nonce}`;
  const sig = hmacSha256Hex(secret, payload);
  return `${payload}.${sig}`;
}

export function verifyAdminToken(secret: string, token: string | undefined, maxAgeMs: number): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [issuedAtBase36, nonce, sig] = parts;
  if (!issuedAtBase36 || !nonce || !sig) return false;

  const payload = `${issuedAtBase36}.${nonce}`;
  const expectedSig = hmacSha256Hex(secret, payload);

  try {
    const a = Uint8Array.from(Buffer.from(sig, 'hex'));
    const b = Uint8Array.from(Buffer.from(expectedSig, 'hex'));
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const issuedAtMs = Number.parseInt(issuedAtBase36, 36);
  if (!Number.isFinite(issuedAtMs)) return false;

  const age = Date.now() - issuedAtMs;
  return age >= 0 && age <= maxAgeMs;
}

export function getAdminPassword(): string | null {
  const fromEnv =
    process.env.TACOPLAN_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  return fromEnv?.trim() ? fromEnv.trim() : null;
}
