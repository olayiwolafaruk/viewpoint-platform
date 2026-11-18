// PBKDF2 uses the Web Crypto API supported by Node.js 22 and Cloudflare Workers.
const ITERATIONS = 600_000;
const KEY_BITS = 256;
const encoder = new TextEncoder();

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, KEY_BITS));
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || encoder.encode(password).length > 1024) throw new Error('Password must contain at least 12 characters and no more than 1024 UTF-8 bytes.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITERATIONS}$${encode(salt)}$${encode(await derive(password, salt, ITERATIONS))}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (encoder.encode(password).length > 1024) return false;
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
    const iterations = Number(parts[1]);
    if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
    const salt = decode(parts[2]); const expected = decode(parts[3]);
    if (salt.length !== 16 || expected.length !== KEY_BITS / 8) return false;
    const actual = await derive(password, salt, iterations);
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch { return false; }
}
