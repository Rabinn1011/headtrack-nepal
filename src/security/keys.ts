import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * SQLCipher key management.
 *
 * The 256-bit database key is generated once, on first launch, from the OS
 * CSPRNG and stored ONLY in the platform secure store (Android Keystore-
 * backed). It must never be written to the database file, app code, logs,
 * or exports. (Proposal Section 8: "the encryption key is generated on first
 * launch and stored in the OS secure keystore, not in the database or app
 * code.")
 */
const DB_KEY_NAME = 'headtrack.dbkey.v1';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getOrCreateDbKeyHex(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DB_KEY_NAME);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = bytesToHex(bytes);
  await SecureStore.setItemAsync(DB_KEY_NAME, hex, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return hex;
}

/** Random hex string helper (used for PIN salt and export salts/IVs). */
export async function randomHex(nBytes: number): Promise<string> {
  return bytesToHex(await Crypto.getRandomBytesAsync(nBytes));
}
