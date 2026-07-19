import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import i18n from '../i18n';
import { logEvent } from '../db/repository';

/**
 * One configurable daily local reminder (proposal Section 9). Entirely
 * on-device — there is no push server. `reminder_fired` / `reminder_opened`
 * app_events feed the adherence analysis.
 *
 * Known limitation (documented in README): `reminder_fired` can only be
 * logged when JS is running when the notification arrives (foreground).
 * `reminder_opened` is always logged, so the fired-but-not-opened gap is
 * estimated from schedule times vs opened events, per the protocol's
 * battery-optimisation risk note.
 */

const TIME_KEY = 'headtrack.reminder.time'; // "HH:MM", absent = off
const CHANNEL_ID = 'daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18n.t('settings.reminderTitle'),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function getReminderTime(): Promise<{ hour: number; minute: number } | null> {
  const stored = await AsyncStorage.getItem(TIME_KEY);
  if (!stored) return null;
  const [h, m] = stored.split(':').map(Number);
  return { hour: h, minute: m };
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('common.appName'),
      body: i18n.t('reminder.notificationBody'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
  await AsyncStorage.setItem(TIME_KEY, `${hour}:${minute}`);
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(TIME_KEY);
}

/** Wire once from the root layout. */
export function attachReminderListeners(): () => void {
  const received = Notifications.addNotificationReceivedListener(() => {
    void logEvent('reminder_fired');
  });
  const responded = Notifications.addNotificationResponseReceivedListener(() => {
    void logEvent('reminder_opened');
  });
  return () => {
    received.remove();
    responded.remove();
  };
}
