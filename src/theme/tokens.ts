/**
 * Design tokens for HeadTrack Nepal.
 *
 * NOTE: the browser prototype (HeadTrackNepal.jsx) referenced by the build
 * prompt was not available when this project was generated, so these tokens
 * were drafted fresh around a calm, clinical palette with WCAG-AA text
 * contrast. If the prototype file is recovered, port its `C` object values
 * here — every component reads colors exclusively from this file.
 */
export const C = {
  // Surfaces
  bg: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3F6',
  border: '#E1E8EE',

  // Text
  text: '#17222E',
  textSub: '#52697E',
  textFaint: '#7E93A6',
  textOnPrimary: '#FFFFFF',

  // Brand
  primary: '#0E7C7B',
  primaryDark: '#0A5B5A',
  primarySoft: '#DFF1F0',

  // Semantic levels used by the rule engine ("Notes for you")
  info: '#1258A7',
  infoSoft: '#E4EFFB',
  warning: '#9A5B00',
  warningSoft: '#FDF0DC',
  good: '#20713A',
  goodSoft: '#E5F4E9',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',

  // Chart (14-day severity trend)
  // Pair validated for CVD separation, chroma, and 3:1 surface contrast
  // (dataviz six-checks validator; protan ΔE 8.8, tritan 31.3).
  chartHeadache: '#D95D39', // headache days
  chartFree: '#0F9174', // headache-free days
  chartAxis: '#7E93A6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 19,
  xl: 24,
  xxl: 30,
} as const;
