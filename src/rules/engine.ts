import { rules } from './rules';
import type { RuleContext, RuleResult } from './types';
import type { EntryWithDetail } from '../db/repository';

/**
 * Evaluates the declarative rule set over a context and returns the
 * pre-approved messages to show, warnings first. This replaces the
 * prototype's inline `generateNotes()` conditionals.
 */
export function evaluateRules(ctx: RuleContext): RuleResult[] {
  const levelOrder = { warning: 0, info: 1, good: 2 } as const;
  return rules
    .filter((r) => r.condition(ctx))
    .map((r) => ({
      id: r.id,
      level: r.level,
      titleKey: r.titleKey,
      messageKey: r.messageKey,
      params: r.params ? r.params(ctx) : {},
    }))
    .sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
}

/** Adapter: repository rows → rule-engine context. */
export function contextFromEntries(today: string, entries: EntryWithDetail[]): RuleContext {
  return {
    today,
    days: entries.map((e) => ({
      date: e.entryDate,
      hadHeadache: e.hadHeadache,
      sleepQuality: e.sleepQuality,
      medicineTaken: e.detail?.medicineTaken ?? false,
      severity: e.detail?.severity0_10 ?? null,
    })),
  };
}
