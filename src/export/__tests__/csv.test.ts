import { buildEntriesCsv, csvEscape, toCsv } from '../csv';
import type { EntryWithDetail } from '../../db/repository';

function entry(overrides: Partial<EntryWithDetail> = {}): EntryWithDetail {
  return {
    id: 1,
    participantId: 'HTN-001',
    entryDate: '2026-03-01',
    hadHeadache: true,
    sleepQuality: 0,
    perceivedStress: 2,
    createdAt: '2026-03-01T20:00:00Z',
    updatedAt: '2026-03-01T20:00:00Z',
    detail: {
      id: 1,
      entryId: 1,
      severity0_10: 7,
      durationBucket: 2,
      activityLimitation: 1,
      medicineTaken: true,
      symptoms: '["nausea","light"]',
      site: 'one_side',
      notes: 'my neighbour Ram gave me medicine', // potentially identifying
    },
    ...overrides,
  };
}

describe('csvEscape', () => {
  it('quotes fields containing commas, quotes, and newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape(null)).toBe('');
  });
});

describe('buildEntriesCsv (de-identification)', () => {
  it('contains the study ID and clinical fields', () => {
    const csv = buildEntriesCsv([entry()]);
    expect(csv).toContain('HTN-001');
    expect(csv).toContain('severity_0_10');
    expect(csv.split('\r\n')[1]).toContain('7');
  });

  it('NEVER includes the free-text notes field', () => {
    const csv = buildEntriesCsv([entry()]);
    expect(csv).not.toContain('notes');
    expect(csv).not.toContain('Ram');
  });

  it('leaves detail columns empty on headache-free days', () => {
    const csv = buildEntriesCsv([entry({ hadHeadache: false, detail: null })]);
    const dataRow = csv.trim().split('\r\n')[1];
    expect(dataRow).toBe('HTN-001,2026-03-01,0,0,2,,,,,,');
  });
});

describe('toCsv', () => {
  it('emits CRLF line endings and a trailing newline', () => {
    const csv = toCsv(['a', 'b'], [[1, 2]]);
    expect(csv).toBe('a,b\r\n1,2\r\n');
  });
});
