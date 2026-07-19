import { base64ToBytes, isPlaintextSqliteHeader } from '../dbCheck';

// The on-device counterpart of this check runs at every app start
// (see app/_layout.tsx) and logs `encryption_check_failed` if the database
// file is found in plaintext. A full open-without-key test requires a
// device build and lives in the Detox plan (e2e/README.md).
describe('isPlaintextSqliteHeader', () => {
  const plaintextHeader = Uint8Array.from([
    // "SQLite format 3\0"
    0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61,
    0x74, 0x20, 0x33, 0x00,
  ]);

  it('detects an unencrypted SQLite file header', () => {
    expect(isPlaintextSqliteHeader(plaintextHeader)).toBe(true);
  });

  it('treats SQLCipher-style random first pages as encrypted', () => {
    const encryptedLooking = Uint8Array.from(
      Array.from({ length: 16 }, (_, i) => (i * 73 + 41) % 256),
    );
    expect(isPlaintextSqliteHeader(encryptedLooking)).toBe(false);
  });

  it('boundary: a single differing byte (the trailing NUL) is not plaintext', () => {
    const almost = Uint8Array.from(plaintextHeader);
    almost[15] = 0x20;
    expect(isPlaintextSqliteHeader(almost)).toBe(false);
  });

  it('boundary: short buffers are not classified as plaintext', () => {
    expect(isPlaintextSqliteHeader(plaintextHeader.slice(0, 15))).toBe(false);
  });
});

describe('base64ToBytes', () => {
  it('decodes the plaintext SQLite magic from base64', () => {
    // base64 of "SQLite format 3\0"
    const b64 = Buffer.from('SQLite format 3\0', 'latin1').toString('base64');
    expect(isPlaintextSqliteHeader(base64ToBytes(b64))).toBe(true);
  });
});
