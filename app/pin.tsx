import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '../src/components/ui';
import { AppText } from '../src/components/AppText';
import { PinPad } from '../src/components/PinPad';
import { verifyPin } from '../src/security/pin';
import { useApp } from '../src/state/AppContext';
import { C, spacing } from '../src/theme/tokens';

export default function PinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { unlock } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length !== 4) return;
    let cancelled = false;
    (async () => {
      const ok = await verifyPin(pin);
      if (cancelled) return;
      if (ok) {
        unlock();
        router.replace('/(tabs)');
      } else {
        setError(true);
        setPin('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, router, unlock]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <AppText weight="bold" size="xl">
            {t('common.appName')}
          </AppText>
          <AppText color={C.textSub}>{t('pin.enterTitle')}</AppText>
          {error ? (
            <AppText size="sm" color={C.danger}>
              {t('pin.wrong')}
            </AppText>
          ) : null}
        </View>
        <PinPad
          value={pin}
          onChange={(v) => {
            setError(false);
            setPin(v);
          }}
        />
      </View>
    </Screen>
  );
}
