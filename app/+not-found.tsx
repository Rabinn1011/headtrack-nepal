import React from 'react';
import { Link } from 'expo-router';

import { Screen } from '../src/components/ui';
import { AppText } from '../src/components/AppText';

export default function NotFound() {
  return (
    <Screen>
      <Link href="/">
        <AppText>←</AppText>
      </Link>
    </Screen>
  );
}
