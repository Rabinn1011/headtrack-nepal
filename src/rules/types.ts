/**
 * Rule-engine types. The engine works on plain data (no DB imports) so the
 * whole clinical-logic surface is unit-testable in Node.
 */

export type RuleDay = {
  /** YYYY-MM-DD */
  date: string;
  hadHeadache: boolean;
  /** 0=Poor 1=Fair 2=Good */
  sleepQuality: number;
  /** true when acute headache medicine was taken that day */
  medicineTaken: boolean;
  /** 0–10, null on headache-free days */
  severity: number | null;
};

export type RuleContext = {
  /** YYYY-MM-DD — the day the summary is being viewed */
  today: string;
  /** Logged days, any order; the engine windows them itself. Should cover the trailing 28 days. */
  days: RuleDay[];
};

export type RuleLevel = 'info' | 'warning' | 'good';

export type Rule = {
  id: string;
  level: RuleLevel;
  condition: (ctx: RuleContext) => boolean;
  /** i18n key resolved by the UI; supports interpolation, e.g. {{count}} */
  messageKey: string;
  titleKey: string;
  /** Interpolation values for the message, computed from the context */
  params?: (ctx: RuleContext) => Record<string, number>;
};

export type RuleResult = {
  id: string;
  level: RuleLevel;
  titleKey: string;
  messageKey: string;
  params: Record<string, number>;
};
