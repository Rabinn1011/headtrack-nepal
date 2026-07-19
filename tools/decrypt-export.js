#!/usr/bin/env node
/**
 * Offline decryption tool for HeadTrack Nepal research exports.
 * For the study/research team only. Requires Node 18+ — no dependencies.
 *
 * Usage:
 *   node tools/decrypt-export.js <export-file.htn.enc> <passphrase> [outDir]
 *
 * Writes entries.csv, phq9.csv and app_events.csv into outDir (default ".").
 *
 * File format: JSON envelope { v, kdf: PBKDF2-SHA256, iter, salt, iv,
 * cipher: AES-256-CBC, ct(base64) }; plaintext is a JSON object mapping
 * CSV filenames to CSV content. Matches src/export/encrypt.ts.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const [, , file, passphrase, outDir = '.'] = process.argv;
if (!file || !passphrase) {
  console.error('Usage: node tools/decrypt-export.js <export-file.htn.enc> <passphrase> [outDir]');
  process.exit(1);
}

const envelope = JSON.parse(fs.readFileSync(file, 'utf8'));
if (envelope.v !== 1 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.cipher !== 'AES-256-CBC') {
  fail(`Unsupported envelope format: ${JSON.stringify({ v: envelope.v, kdf: envelope.kdf, cipher: envelope.cipher })}`);
}

const key = crypto.pbkdf2Sync(
  Buffer.from(passphrase, 'utf8'),
  Buffer.from(envelope.salt, 'hex'),
  envelope.iter,
  32,
  'sha256',
);

let plaintext;
try {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(envelope.iv, 'hex'));
  plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ct, 'base64')),
    decipher.final(),
  ]).toString('utf8');
} catch {
  fail('Decryption failed — wrong passphrase or corrupted file.');
}

let bundle;
try {
  bundle = JSON.parse(plaintext);
} catch {
  fail('Decrypted content is not a valid export bundle.');
}

fs.mkdirSync(outDir, { recursive: true });
for (const [name, content] of Object.entries(bundle)) {
  const safe = path.basename(name);
  fs.writeFileSync(path.join(outDir, safe), content, 'utf8');
  console.log(`Wrote ${path.join(outDir, safe)}`);
}
console.log('Done.');
