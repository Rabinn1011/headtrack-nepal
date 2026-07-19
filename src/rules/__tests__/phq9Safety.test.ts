import { computePhq9Total, isItem9Positive, phq9SafetyTriggered } from '../phq9Safety';

describe('PHQ-9 item-9 safety check (hard-coded, outside the rule engine)', () => {
  it('triggers when item 9 is positive at any timepoint', () => {
    expect(
      phq9SafetyTriggered([
        { timepoint: 'baseline', item9: 0 },
        { timepoint: '8week', item9: 1 },
      ]),
    ).toBe(true);
  });

  it('does not trigger when item 9 is 0 at every timepoint', () => {
    expect(
      phq9SafetyTriggered([
        { timepoint: 'baseline', item9: 0 },
        { timepoint: '8week', item9: 0 },
      ]),
    ).toBe(false);
  });

  it('boundary: the lowest positive score (1, "several days") triggers', () => {
    expect(isItem9Positive(1)).toBe(true);
    expect(isItem9Positive(0)).toBe(false);
    expect(phq9SafetyTriggered([{ timepoint: 'baseline', item9: 1 }])).toBe(true);
  });

  it('does not trigger with no completed assessments', () => {
    expect(phq9SafetyTriggered([])).toBe(false);
  });
});

describe('computePhq9Total', () => {
  it('sums nine valid items', () => {
    expect(computePhq9Total([1, 2, 3, 0, 1, 2, 3, 0, 1])).toBe(13);
  });

  it('rejects wrong item counts', () => {
    expect(() => computePhq9Total([1, 2, 3])).toThrow();
  });

  it('boundary: rejects out-of-range item scores (max item score is 3)', () => {
    expect(() => computePhq9Total([4, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow();
    expect(computePhq9Total([3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(27);
  });
});
