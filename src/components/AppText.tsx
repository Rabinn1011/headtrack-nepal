import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { C, fontSize } from '../theme/tokens';

type Weight = 'regular' | 'medium' | 'bold';

type Props = TextProps & {
  weight?: Weight;
  size?: keyof typeof fontSize;
  color?: string;
};

/**
 * The only Text primitive used in the app. Picks the bundled Noto family
 * matching the active language so Devanagari renders identically across
 * Android versions and OEM skins (proposal Section 7 — fonts are bundled,
 * never fetched at runtime).
 */
export function AppText({ weight = 'regular', size = 'md', color = C.text, style, ...rest }: Props) {
  const { i18n } = useTranslation();
  const devanagari = i18n.language === 'ne';
  const family = devanagari
    ? { regular: 'NotoSansDevanagari-Regular', medium: 'NotoSansDevanagari-Medium', bold: 'NotoSansDevanagari-Bold' }[weight]
    : { regular: 'NotoSans-Regular', medium: 'NotoSans-Medium', bold: 'NotoSans-Bold' }[weight];

  const base: TextStyle = {
    fontFamily: family,
    fontSize: fontSize[size],
    color,
    // Devanagari needs taller line-height to avoid clipped matras.
    lineHeight: fontSize[size] * (devanagari ? 1.65 : 1.45),
  };
  return <Text {...rest} style={[base, style]} />;
}
