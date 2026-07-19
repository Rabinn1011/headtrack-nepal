import { decryptEnvelope, encryptWithParams } from '../encrypt';

const SALT = '00112233445566778899aabbccddeeff';
const IV = 'ffeeddccbbaa99887766554433221100';

describe('export encryption', () => {
  it('round-trips UTF-8 content (including Devanagari)', () => {
    const plain = 'participant_id,entry_date\r\nHTN-001,2026-03-01\r\nनेपाली पाठ';
    const env = encryptWithParams(plain, 'correct horse battery', SALT, IV);
    expect(decryptEnvelope(env, 'correct horse battery')).toBe(plain);
  });

  it('produces ciphertext that does not contain the plaintext', () => {
    const env = encryptWithParams('HTN-001 secret data', 'passphrase-123', SALT, IV);
    expect(env.ct).not.toContain('HTN-001');
    expect(JSON.stringify(env)).not.toContain('secret');
  });

  it('fails to decrypt with a wrong passphrase', () => {
    const env = encryptWithParams('sensitive', 'right-passphrase', SALT, IV);
    let result: string | null = null;
    try {
      result = decryptEnvelope(env, 'wrong-passphrase');
    } catch {
      result = null;
    }
    expect(result === 'sensitive').toBe(false);
  });

  it('envelope declares its algorithm parameters for the decrypt tool', () => {
    const env = encryptWithParams('x', 'p', SALT, IV);
    expect(env).toMatchObject({
      v: 1,
      kdf: 'PBKDF2-SHA256',
      cipher: 'AES-256-CBC',
      salt: SALT,
      iv: IV,
    });
    expect(env.iter).toBeGreaterThanOrEqual(10000);
  });
});
