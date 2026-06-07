import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// OAuth 토큰 at-rest 암호화 (AES-256-GCM)
// 키: TOKEN_ENCRYPT_KEY 없으면 JWT_SECRET에서 파생 — 별도 env 없이도 동작
const PREFIX = 'enc:v1:';

function key(): Buffer {
  return createHash('sha256')
    .update(process.env.TOKEN_ENCRYPT_KEY || process.env.JWT_SECRET || 'meetlink-dev')
    .digest();
}

export function encryptToken(plain?: string | null): string | null {
  if (!plain) return plain ?? null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

// 접두사가 없으면 레거시 평문으로 보고 그대로 반환 (마이그레이션 호환)
export function decryptToken(stored?: string | null): string | null {
  if (!stored) return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
