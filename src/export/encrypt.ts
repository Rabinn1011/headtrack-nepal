import CryptoJS from 'crypto-js';

import { randomHex } from '../security/keys';

/**
 * Passphrase protection for the de-identified research export (protocol
 * Section 8: "exported research data will be de-identified and
 * password-protected").
 *
 * Format (versioned JSON envelope, one per file):
 *   { v: 1, kdf: "PBKDF2-SHA256", iter, salt, iv, cipher: "AES-256-CBC", ct }
 *
 * The matching offline decryption tool for the research team is
 * tools/decrypt-export.js (Node, no dependencies).
 */

export const EXPORT_KDF_ITERATIONS = 10_000;

export type EncryptedEnvelope = {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string; // hex
  iv: string; // hex
  cipher: 'AES-256-CBC';
  ct: string; // base64
};

function deriveKey(passphrase: string, saltHex: string): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(passphrase, CryptoJS.enc.Hex.parse(saltHex), {
    keySize: 256 / 32,
    iterations: EXPORT_KDF_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

/** Pure core — deterministic given salt/iv, so it is unit-testable. */
export function encryptWithParams(
  plaintext: string,
  passphrase: string,
  saltHex: string,
  ivHex: string,
): EncryptedEnvelope {
  const key = deriveKey(passphrase, saltHex);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: CryptoJS.enc.Hex.parse(ivHex),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: EXPORT_KDF_ITERATIONS,
    salt: saltHex,
    iv: ivHex,
    cipher: 'AES-256-CBC',
    ct: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
  };
}

export function decryptEnvelope(envelope: EncryptedEnvelope, passphrase: string): string {
  const key = deriveKey(passphrase, envelope.salt);
  const params = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(envelope.ct),
  });
  const plain = CryptoJS.AES.decrypt(params, key, {
    iv: CryptoJS.enc.Hex.parse(envelope.iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return plain.toString(CryptoJS.enc.Utf8);
}

/** App-facing wrapper: salts and IVs come from the OS CSPRNG (expo-crypto). */
export async function encryptForExport(
  plaintext: string,
  passphrase: string,
): Promise<string> {
  const [salt, iv] = await Promise.all([randomHex(16), randomHex(16)]);
  return JSON.stringify(encryptWithParams(plaintext, passphrase, salt, iv));
}
