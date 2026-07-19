import * as FileSystem from 'expo-file-system';

/**
 * Encryption self-check.
 *
 * A plaintext SQLite file always begins with the 16-byte magic header
 * "SQLite format 3\0". A SQLCipher-encrypted file has a random-looking
 * first page (the header is encrypted too), so the absence of the magic
 * bytes is a reliable on-device signal that encryption is active.
 *
 * verifyDatabaseEncrypted() is run on app start; if the file turns out to
 * be plaintext in a production build the app logs an
 * `encryption_check_failed` event and surfaces an error, per the proposal's
 * risk table ("Automated tests that confirm the database file is unreadable
 * without the secure-store key before the pilot begins").
 */

// "SQLite format 3\0" — note the 16th byte is NUL.
export const SQLITE_MAGIC: readonly number[] = [
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61,
  0x74, 0x20, 0x33, 0x00,
];

export function isPlaintextSqliteHeader(first16Bytes: Uint8Array): boolean {
  if (first16Bytes.length < 16) return false;
  for (let i = 0; i < 16; i++) {
    if (first16Bytes[i] !== SQLITE_MAGIC[i]) return false;
  }
  return true;
}

export function base64ToBytes(b64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/**
 * Returns true when the on-disk database file does NOT carry the plaintext
 * SQLite header (i.e. SQLCipher is active). Returns null when the file
 * cannot be inspected (e.g. it does not exist yet).
 */
export async function verifyDatabaseEncrypted(dbFileName: string): Promise<boolean | null> {
  const path = `${FileSystem.documentDirectory}SQLite/${dbFileName}`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  const b64 = await FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.Base64,
    length: 32,
    position: 0,
  });
  return !isPlaintextSqliteHeader(base64ToBytes(b64));
}
