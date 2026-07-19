import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '../src/i18n';
import { initDatabase, DB_FILE_NAME } from '../src/db/client';
import { getParticipant, logEvent } from '../src/db/repository';
import { verifyDatabaseEncrypted } from '../src/security/dbCheck';
import { attachReminderListeners } from '../src/notifications/reminders';
import { AppProvider } from '../src/state/AppContext';
import type { Participant } from '../src/db/schema';
import { C } from '../src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

type Boot = {
  participant: Participant | null;
  encryptionOk: boolean | null;
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'NotoSans-Regular': require('../assets/fonts/NotoSans-Regular.ttf'),
    'NotoSans-Medium': require('../assets/fonts/NotoSans-Medium.ttf'),
    'NotoSans-Bold': require('../assets/fonts/NotoSans-Bold.ttf'),
    'NotoSansDevanagari-Regular': require('../assets/fonts/NotoSansDevanagari-Regular.ttf'),
    'NotoSansDevanagari-Medium': require('../assets/fonts/NotoSansDevanagari-Medium.ttf'),
    'NotoSansDevanagari-Bold': require('../assets/fonts/NotoSansDevanagari-Bold.ttf'),
  });
  const [boot, setBoot] = useState<Boot | null>(null);
  const detachListeners = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initI18n();
      await initDatabase();
      const [participant, encryptionOk] = await Promise.all([
        getParticipant(),
        verifyDatabaseEncrypted(DB_FILE_NAME),
      ]);
      await logEvent('app_open');
      if (encryptionOk === false) {
        // Plaintext DB header found — SQLCipher inactive (expected only in
        // Expo Go). Logged so the pilot's technical-reliability review sees it.
        await logEvent('encryption_check_failed');
      }
      detachListeners.current = attachReminderListeners();
      if (!cancelled) setBoot({ participant, encryptionOk });
    })();
    return () => {
      cancelled = true;
      detachListeners.current?.();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && boot) void SplashScreen.hideAsync();
  }, [fontsLoaded, boot]);

  if (!fontsLoaded || !boot) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <AppProvider
      initialParticipant={boot.participant}
      initialEncryptionOk={boot.encryptionOk}
    >
      <StatusBar style="dark" backgroundColor={C.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="phq9" options={{ presentation: 'modal' }} />
      </Stack>
    </AppProvider>
  );
}
