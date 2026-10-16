/**
 * Client-side vault encryption.
 *
 * The server never sees plaintext. We derive an AES-GCM key from the user's
 * passphrase + a per-user salt (their auth uid) via PBKDF2. The unlocked key
 * lives in memory only — never persisted.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, userId: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(`exodia-vault:${userId}`),
      iterations: 250_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function encryptString(plain: string, key: CryptoKey): Promise<string> {
  if (!plain) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)),
  );
  const merged = new Uint8Array(iv.length + ct.length);
  merged.set(iv, 0);
  merged.set(ct, iv.length);
  return "v1:" + bytesToB64(merged);
}

export async function decryptString(payload: string | null, key: CryptoKey): Promise<string> {
  if (!payload) return "";
  if (!payload.startsWith("v1:")) return payload; // legacy plaintext fallback
  const merged = b64ToBytes(payload.slice(3));
  const iv = merged.slice(0, 12);
  const ct = merged.slice(12);
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return dec.decode(pt);
  } catch {
    return "⚠ decryption failed";
  }
}

const SESSION_KEY = "exodia-vault-key-cached";
let cachedKey: CryptoKey | null = null;

export async function unlockVault(passphrase: string, userId: string): Promise<CryptoKey> {
  const key = await deriveKey(passphrase, userId);
  cachedKey = key;
  // Sentinel so we can detect "session unlocked" without storing the key itself
  sessionStorage.setItem(SESSION_KEY, "1");
  return key;
}

export function isVaultUnlocked(): boolean {
  return cachedKey !== null && sessionStorage.getItem(SESSION_KEY) === "1";
}

export function getCachedKey(): CryptoKey | null {
  return cachedKey;
}

export function lockVault() {
  cachedKey = null;
  sessionStorage.removeItem(SESSION_KEY);
}
