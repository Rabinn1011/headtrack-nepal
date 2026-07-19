import React from 'react';
import { Redirect } from 'expo-router';

import { useApp } from '../src/state/AppContext';

/** Boot router: onboarding on first launch, otherwise straight into the tabs. */
export default function Index() {
  const { participant } = useApp();
  if (!participant) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
