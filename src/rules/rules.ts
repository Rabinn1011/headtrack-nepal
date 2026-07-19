import type { Rule, RuleContext, RuleDay } from './types';

/**
 * The clinician-reviewable rule set.
 *
 * Every rule and message string is versioned in this single file so the
 * clinical and mental-health advisers can sign off on exact wording before
 * each release (proposal Section 6). Message text lives in
 * src/i18n/en.json / ne.json under "rules.*" — the engine only selects
 * pre-approved messages and fills in the participant's own numbers; it
 * never generates free text at runtime.
 */

export const RULES_VERSION = '1.0.0';

// ---- windowing helpers (pure) ----

function isoAddDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0');
  const dd = `${dt.getDate()}`.padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** Days within the trailing window of `n` days ending on ctx.today (inclusive). */
export function trailingDays(ctx: RuleContext, n: number, endOffset = 0): RuleDay[] {
  const end = isoAddDays(ctx.today, -endOffset);
  const start = isoAddDays(end, -(n - 1));
  return ctx.days.filter((d) => d.date >= start && d.date <= end);
}

export function medicineDaysInLast28(ctx: RuleContext): number {
  return trailingDays(ctx, 28).filter((d) => d.medicineTaken).length;
}

export function headacheDaysThisWeek(ctx: RuleContext): number {
  return trailingDays(ctx, 7).filter((d) => d.hadHeadache).length;
}

export function headacheDaysPreviousWeek(ctx: RuleContext): number {
  return trailingDays(ctx, 7, 7).filter((d) => d.hadHeadache).length;
}

// ---- the rule set ----

/**
 * CLINICAL THRESHOLD NOTE (do not change without adviser sign-off):
 * The medication-overuse rule uses the protocol's real clinical threshold —
 * acute medicine on ≥10 days in the trailing 28 days. The browser prototype
 * demonstrated a scaled-down 14-day demo threshold; that demo value must
 * NOT ship. Confirm the 28-day/10-day threshold with the clinical adviser
 * before release (flagged in the build prompt and README).
 */
export const MOU_WINDOW_DAYS = 28;
export const MOU_THRESHOLD_DAYS = 10;

/** Poor sleep (=0) on at least this fraction of headache days, trailing 7 days. */
export const SLEEP_ASSOCIATION_FRACTION = 0.5;

export const rules: Rule[] = [
  {
    id: 'medication-overuse-caution',
    level: 'warning',
    titleKey: 'rules.mouTitle',
    messageKey: 'rules.mouBody',
    condition: (ctx) => medicineDaysInLast28(ctx) >= MOU_THRESHOLD_DAYS,
    params: (ctx) => ({ count: medicineDaysInLast28(ctx) }),
  },
  {
    id: 'poor-sleep-association',
    level: 'info',
    titleKey: 'rules.sleepTitle',
    // Wording must keep the "does not prove causation" phrasing
    // (protocol Section 7.5 approved message).
    messageKey: 'rules.sleepBody',
    condition: (ctx) => {
      const week = trailingDays(ctx, 7);
      const headacheDays = week.filter((d) => d.hadHeadache);
      if (headacheDays.length === 0) return false;
      const poorSleep = headacheDays.filter((d) => d.sleepQuality === 0).length;
      return poorSleep / headacheDays.length >= SLEEP_ASSOCIATION_FRACTION;
    },
  },
  {
    id: 'rising-burden-review',
    level: 'warning',
    titleKey: 'rules.burdenTitle',
    messageKey: 'rules.burdenBody',
    condition: (ctx) => headacheDaysThisWeek(ctx) > headacheDaysPreviousWeek(ctx),
    params: (ctx) => ({
      current: headacheDaysThisWeek(ctx),
      previous: headacheDaysPreviousWeek(ctx),
    }),
  },
  {
    id: 'general-wellbeing-tip',
    level: 'good',
    titleKey: 'rules.tipTitle',
    messageKey: 'rules.tipBody',
    // Always shown (protocol: one general wellbeing tip).
    condition: () => true,
  },
];
