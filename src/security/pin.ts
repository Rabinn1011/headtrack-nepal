import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

import { randomHex } from './keys';

/**
 * 4-digit participant PIN, stored as PBKDF2-SHA256(salt, pin) in the OS
 * secure store — never in the SQLite database (proposal Section 3, "Local
 * auth"). A 4-digit PIN is a lightweight device-sharing/loss mitigation,
 * not a cryptographic boundary; the SQLCipher key (see keys.ts) is what
 * protects the data at rest.
 */
const PIN_HASH_KEY = 'headtrack.pin.hash.v1';
const PIN_SALT_KEY = 'headtrack.pin.salt.v1';
const PBKDF2_ITERATIONS = 10_000;

export function hashPin(pin: string, saltHex: string): string {
  const key = CryptoJS.PBKDF2(pin, CryptoJS.enc.Hex.parse(saltHex), {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString(CryptoJS.enc.Hex);
}

export async function isPinSet(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_HASH_KEY)) != null;
}

export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');
  const salt = await randomHex(16);
  const hash = hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
}

/** Constant-time-ish comparison; both strings are fixed-length hex digests. */
function digestsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, stored] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_HASH_KEY),
  ]);
  if (!salt || !stored) return false;
  return digestsEqual(hashPin(pin, salt), stored);
}
