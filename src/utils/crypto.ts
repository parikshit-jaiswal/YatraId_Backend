// utils/crypto.ts
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32; // 256 bits
const IV_LEN = 12;  // 96 bits for GCM
const TAG_LEN = 16;

function generateKeyFromSecret(secret: string): Buffer {
  // Use a KDF for production. For MVP a hash is ok:
  return crypto.createHash("sha256").update(secret || process.env.ENCRYPTION_SECRET || 'default-secret').digest(); // 32 bytes
}

export function encryptData(data: string, secret?: string): string {
  const key = generateKeyFromSecret(secret || process.env.ENCRYPTION_SECRET || 'default-secret');
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const plaintext = Buffer.from(data, "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Return base64 string of iv + tag + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptData(base64: string, secret?: string): string {
  const key = generateKeyFromSecret(secret || process.env.ENCRYPTION_SECRET || 'default-secret');
  const data = Buffer.from(base64, "base64");
  const iv = data.slice(0, IV_LEN);
  const tag = data.slice(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = data.slice(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// Keep old function names for backward compatibility
export const encryptJSON = (obj: any, secret?: string) => encryptData(JSON.stringify(obj), secret);
export const decryptJSON = (base64: string, secret?: string) => JSON.parse(decryptData(base64, secret));
