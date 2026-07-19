import { contextFromEntries, evaluateRules } from '../engine';
import {
  MOU_THRESHOLD_DAYS,
  MOU_WINDOW_DAYS,
} from '../rules';
import type { RuleContext, RuleDay } from '../types';

const TODAY = '2026-03-28';

function isoAddDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0');
  const dd = `${dt.getDate()}`.padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** Build a day `offset` days before TODAY (offset 0 = today). */
function day(offset: number, overrides: Partial<RuleDay> = {}): RuleDay {
  return {
    date: isoAddDays(TODAY, -offset),
    hadHeadache: false,
    sleepQuality: 2,
    medicineTaken: false,
    severity: null,
    ...overrides,
  };
}

function ctx(days: RuleDay[]): RuleContext {
  return { today: TODAY, days };
}

function ids(c: RuleContext): string[] {
  return evaluateRules(c).map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Rule: medication-overuse-caution (≥10 medicine days in trailing 28 days)
// ---------------------------------------------------------------------------
describe('medication-overuse-caution', () => {
  it('triggers when medicine was used on 10 days in the last 28', () => {
    const days = Array.from({ length: 10 }, (_, i) =>
      day(i, { hadHeadache: true, severity: 5, medicineTaken: true }),
    );
    const results = evaluateRules(ctx(days));
    const mou = results.find((r) => r.id === 'medication-overuse-caution');
    expect(mou).toBeDefined();
    expect(mou!.level).toBe('warning');
    expect(mou!.params.count).toBe(10);
  });

  it('does not trigger at 9 medicine days in the last 28', () => {
    const days = Array.from({ length: 9 }, (_, i) =>
      day(i, { hadHeadache: true, severity: 5, medicineTaken: true }),
    );
    expect(ids(ctx(days))).not.toContain('medication-overuse-caution');
  });

  it('boundary: a 10th medicine day outside the 28-day window does not count', () => {
    const inWindow = Array.from({ length: 9 }, (_, i) =>
      day(i, { hadHeadache: true, severity: 5, medicineTaken: true }),
    );
    // Window is today-27 … today, so offset 28 is one day too old.
    const outside = day(MOU_WINDOW_DAYS, {
      hadHeadache: true,
      severity: 5,
      medicineTaken: true,
    });
    expect(ids(ctx([...inWindow, outside]))).not.toContain('medication-overuse-caution');

    // …but the same day at offset 27 (the window edge) does count.
    const edge = day(MOU_WINDOW_DAYS - 1, {
      hadHeadache: true,
      severity: 5,
      medicineTaken: true,
    });
    expect(ids(ctx([...inWindow, edge]))).toContain('medication-overuse-caution');
  });

  it('uses the protocol threshold, not the prototype demo threshold', () => {
    expect(MOU_WINDOW_DAYS).toBe(28);
    expect(MOU_THRESHOLD_DAYS).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Rule: poor-sleep-association (poor sleep on ≥50% of headache days, 7 days)
// ---------------------------------------------------------------------------
describe('poor-sleep-association', () => {
  it('triggers when poor sleep occurred on most headache days this week', () => {
    const days = [
      day(0, { hadHeadache: true, severity: 6, sleepQuality: 0 }),
      day(1, { hadHeadache: true, severity: 4, sleepQuality: 0 }),
      day(2, { hadHeadache: true, severity: 3, sleepQuality: 2 }),
      day(3),
    ];
    expect(ids(ctx(days))).toContain('poor-sleep-association');
  });

  it('does not trigger when poor sleep is below half of headache days', () => {
    const days = [
      day(0, { hadHeadache: true, severity: 6, sleepQuality: 0 }),
      day(1, { hadHeadache: true, severity: 4, sleepQuality: 2 }),
      day(2, { hadHeadache: true, severity: 3, sleepQuality: 1 }),
    ];
    expect(ids(ctx(days))).not.toContain('poor-sleep-association');
  });

  it('does not trigger with zero headache days (no division by zero)', () => {
    const days = [day(0, { sleepQuality: 0 }), day(1, { sleepQuality: 0 })];
    expect(ids(ctx(days))).not.toContain('poor-sleep-association');
  });

  it('boundary: exactly 50% of headache days with poor sleep triggers', () => {
    const days = [
      day(0, { hadHeadache: true, severity: 5, sleepQuality: 0 }),
      day(1, { hadHeadache: true, severity: 5, sleepQuality: 2 }),
    ];
    expect(ids(ctx(days))).toContain('poor-sleep-association');
  });

  it('boundary: only looks at the trailing 7 days', () => {
    // Poor-sleep headache days 8+ days ago must not trigger the note.
    const days = [
      day(8, { hadHeadache: true, severity: 5, sleepQuality: 0 }),
      day(9, { hadHeadache: true, severity: 5, sleepQuality: 0 }),
      day(0, { hadHeadache: true, severity: 2, sleepQuality: 2 }),
    ];
    expect(ids(ctx(days))).not.toContain('poor-sleep-association');
  });
});

// ---------------------------------------------------------------------------
// Rule: rising-burden-review (this 7 days > previous 7 days)
// ---------------------------------------------------------------------------
describe('rising-burden-review', () => {
  it('triggers when this week has more headache days than last week', () => {
    const days = [
      day(0, { hadHeadache: true, severity: 5 }),
      day(1, { hadHeadache: true, severity: 5 }),
      day(8, { hadHeadache: true, severity: 5 }),
    ];
    const results = evaluateRules(ctx(days));
    const burden = results.find((r) => r.id === 'rising-burden-review');
    expect(burden).toBeDefined();
    expect(burden!.params).toEqual({ current: 2, previous: 1 });
  });

  it('does not trigger when this week has fewer headache days', () => {
    const days = [
      day(0, { hadHeadache: true, severity: 5 }),
      day(8, { hadHeadache: true, severity: 5 }),
      day(9, { hadHeadache: true, severity: 5 }),
    ];
    expect(ids(ctx(days))).not.toContain('rising-burden-review');
  });

  it('boundary: equal weeks do not trigger (strictly greater required)', () => {
    const days = [
      day(0, { hadHeadache: true, severity: 5 }),
      day(8, { hadHeadache: true, severity: 5 }),
    ];
    expect(ids(ctx(days))).not.toContain('rising-burden-review');
  });

  it('boundary: day 7 belongs to the previous week, day 6 to the current week', () => {
    // Only entry is at offset 7 → previous=1, current=0 → no trigger.
    expect(ids(ctx([day(7, { hadHeadache: true, severity: 5 })]))).not.toContain(
      'rising-burden-review',
    );
    // Only entry at offset 6 → current=1, previous=0 → trigger.
    expect(ids(ctx([day(6, { hadHeadache: true, severity: 5 })]))).toContain(
      'rising-burden-review',
    );
  });
});

// ---------------------------------------------------------------------------
// Rule: general-wellbeing-tip (always shown)
// ---------------------------------------------------------------------------
describe('general-wellbeing-tip', () => {
  it('is shown with no data at all', () => {
    expect(ids(ctx([]))).toContain('general-wellbeing-tip');
  });

  it('is shown alongside triggered warnings', () => {
    const days = Array.from({ length: 12 }, (_, i) =>
      day(i, { hadHeadache: true, severity: 7, medicineTaken: true }),
    );
    expect(ids(ctx(days))).toContain('general-wellbeing-tip');
  });

  it('boundary: it is the only note on an empty diary and sorts last', () => {
    const results = evaluateRules(ctx([]));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('general-wellbeing-tip');
    expect(results[0].level).toBe('good');
  });
});

// ---------------------------------------------------------------------------
// Ordering + adapter
// ---------------------------------------------------------------------------
describe('evaluateRules ordering and adapter', () => {
  it('sorts warnings before info before good', () => {
    const days = [
      ...Array.from({ length: 10 }, (_, i) =>
        day(i, { hadHeadache: true, severity: 5, medicineTaken: true, sleepQuality: 0 }),
      ),
    ];
    const levels = evaluateRules(ctx(days)).map((r) => r.level);
    const sorted = [...levels].sort(
      (a, b) => ({ warning: 0, info: 1, good: 2 })[a] - ({ warning: 0, info: 1, good: 2 })[b],
    );
    expect(levels).toEqual(sorted);
  });

  it('contextFromEntries maps repository rows, defaulting medicine to false', () => {
    const c = contextFromEntries(TODAY, [
      {
        id: 1,
        participantId: 'HTN-001',
        entryDate: TODAY,
        hadHeadache: false,
        sleepQuality: 1,
        perceivedStress: 2,
        createdAt: '',
        updatedAt: '',
        detail: null,
      },
    ]);
    expect(c.days).toEqual([
      {
        date: TODAY,
        hadHeadache: false,
        sleepQuality: 1,
        medicineTaken: false,
        severity: null,
      },
    ]);
  });
});
