/**
 * Component tests for the conditional-question design (protocol Section 7.5):
 * headache-detail fields appear ONLY when "Yes" is selected; sleep/stress
 * context questions are always present; an already-logged day shows the
 * summary card with an edit option instead of the form.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../src/i18n/en.json';
import { AppProvider } from '../src/state/AppContext';

jest.mock('../src/db/repository', () => ({
  getEntryByDate: jest.fn(async () => null),
  upsertTodayEntry: jest.fn(async () => undefined),
  logEvent: jest.fn(async () => undefined),
  getParticipant: jest.fn(async () => null),
  toDateString: (d: Date) => {
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(cb, []);
  },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    { get: () => (props: object) => <View {...props} /> },
  );
});

jest.mock('@react-native-community/slider', () => {
  const { View } = jest.requireActual('react-native');
  return (props: object) => <View {...props} testID="severity-slider" />;
});

import TodayScreen from '../app/(tabs)/index';
import { getEntryByDate } from '../src/db/repository';

const participant = {
  participantId: 'HTN-001',
  age: 30,
  sex: 'female' as const,
  headacheHistoryMonths: 12,
  smartphoneExperience: 2,
  enrolledAt: '2026-01-01T00:00:00Z',
};

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnObjects: true,
  });
});

function renderToday() {
  return render(
    <AppProvider initialParticipant={participant} initialEncryptionOk={true}>
      <TodayScreen />
    </AppProvider>,
  );
}

describe('Today check-in — conditional fields', () => {
  beforeEach(() => {
    (getEntryByDate as jest.Mock).mockResolvedValue(null);
  });

  it('asks the daily question and always shows sleep and stress', async () => {
    renderToday();
    expect(await screen.findByText(en.checkin.question)).toBeTruthy();
    expect(screen.getByText(en.checkin.sleep)).toBeTruthy();
    expect(screen.getByText(en.checkin.stress)).toBeTruthy();
    // no headache-detail fields before an answer
    expect(screen.queryByText(en.checkin.severity)).toBeNull();
  });

  it('shows headache-detail fields only after answering Yes', async () => {
    renderToday();
    await screen.findByText(en.checkin.question);
    expect(screen.queryByText(en.checkin.duration)).toBeNull();

    fireEvent.press(screen.getAllByText(en.common.yes)[0]);

    expect(screen.getByText(en.checkin.severity)).toBeTruthy();
    expect(screen.getByText(en.checkin.duration)).toBeTruthy();
    expect(screen.getByText(en.checkin.symptoms)).toBeTruthy();
    expect(screen.getByText(en.checkin.medicine)).toBeTruthy();
    expect(screen.getByText(en.checkin.activity)).toBeTruthy();
    // context questions still present
    expect(screen.getByText(en.checkin.sleep)).toBeTruthy();
    expect(screen.getByText(en.checkin.stress)).toBeTruthy();
  });

  it('hides headache-detail fields again when No is selected', async () => {
    renderToday();
    await screen.findByText(en.checkin.question);
    fireEvent.press(screen.getAllByText(en.common.yes)[0]);
    expect(screen.getByText(en.checkin.severity)).toBeTruthy();

    fireEvent.press(screen.getAllByText(en.common.no)[0]);
    expect(screen.queryByText(en.checkin.severity)).toBeNull();
    expect(screen.queryByText(en.checkin.duration)).toBeNull();
    // sleep/stress remain
    expect(screen.getByText(en.checkin.sleep)).toBeTruthy();
  });

  it('shows the already-logged summary card with an edit option instead of the form', async () => {
    (getEntryByDate as jest.Mock).mockResolvedValue({
      id: 1,
      participantId: 'HTN-001',
      entryDate: '2026-03-01',
      hadHeadache: true,
      sleepQuality: 1,
      perceivedStress: 0,
      createdAt: '',
      updatedAt: '',
      detail: {
        id: 1,
        entryId: 1,
        severity0_10: 6,
        durationBucket: 1,
        activityLimitation: 2,
        medicineTaken: true,
        symptoms: '["nausea"]',
        site: null,
        notes: null,
      },
    });
    renderToday();

    expect(await screen.findByText(en.checkin.alreadyLogged)).toBeTruthy();
    expect(screen.getByText(en.checkin.editToday)).toBeTruthy();
    expect(screen.queryByText(en.checkin.question)).toBeNull();

    // tapping edit brings the form back, pre-filled
    fireEvent.press(screen.getByText(en.checkin.editToday));
    await waitFor(() => expect(screen.getByText(en.checkin.question)).toBeTruthy());
    expect(screen.getByText(en.checkin.severity)).toBeTruthy();
  });
});
