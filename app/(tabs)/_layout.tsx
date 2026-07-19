import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookOpenText, ChartColumn, CircleCheck, Settings } from 'lucide-react-native';

import { C } from '../../src/theme/tokens';

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const labelFamily =
    i18n.language === 'ne' ? 'NotoSansDevanagari-Medium' : 'NotoSans-Medium';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primaryDark,
        tabBarInactiveTintColor: C.textFaint,
        tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border },
        tabBarLabelStyle: { fontFamily: labelFamily, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => <CircleCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: t('tabs.summary'),
          tabBarIcon: ({ color, size }) => <ChartColumn color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.diary'),
          tabBarIcon: ({ color, size }) => <BookOpenText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
