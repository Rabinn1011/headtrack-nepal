/**
 * PHQ-9 item-9 safety check.
 *
 * This is deliberately NOT part of the general rule engine (protocol
 * Section 8 / build prompt Section 5): it is a hard-coded safety pathway
 * that must fire whenever item 9 ("thoughts that you would be better off
 * dead or of hurting yourself") is positive (> 0) at ANY timepoint, and it
 * is surfaced immediately and above every rule-engine note.
 */

export type Phq9Answers = {
  timepoint: 'baseline' | '8week';
  item9: number; // 0–3
};

export function isItem9Positive(item9: number): boolean {
  return item9 > 0;
}

/** True when any completed PHQ-9 has a positive item 9. */
export function phq9SafetyTriggered(responses: Phq9Answers[]): boolean {
  return responses.some((r) => isItem9Positive(r.item9));
}

export function computePhq9Total(items: number[]): number {
  if (items.length !== 9) throw new Error('PHQ-9 requires exactly 9 items');
  for (const v of items) {
    if (!Number.isInteger(v) || v < 0 || v > 3) {
      throw new Error('PHQ-9 item scores must be integers 0–3');
    }
  }
  return items.reduce((a, b) => a + b, 0);
}
