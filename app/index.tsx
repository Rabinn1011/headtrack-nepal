import React from 'react';
import { Redirect } from 'expo-router';

import { useApp } from '../src/state/AppContext';

/** Boot router: onboarding → PIN gate → tabs. */
export default function Index() {
  const { participant, locked } = useApp();
  if (!participant) return <Redirect href="/onboarding" />;
  if (locked) return <Redirect href="/pin" />;
  return <Redirect href="/(tabs)" />;
}
