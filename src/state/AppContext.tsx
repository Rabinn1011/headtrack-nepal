import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Participant } from '../db/schema';
import { getParticipant } from '../db/repository';

type AppState = {
  participant: Participant | null;
  refreshParticipant: () => Promise<void>;
  /** true until the participant PIN has been entered this session */
  locked: boolean;
  unlock: () => void;
  lock: () => void;
  /** null = unknown/no file yet; false = plaintext DB detected (Expo Go or misconfig) */
  encryptionOk: boolean | null;
  setEncryptionOk: (v: boolean | null) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({
  children,
  initialParticipant,
  initialLocked,
  initialEncryptionOk,
}: {
  children: React.ReactNode;
  initialParticipant: Participant | null;
  initialLocked: boolean;
  initialEncryptionOk: boolean | null;
}) {
  const [participant, setParticipant] = useState<Participant | null>(initialParticipant);
  const [locked, setLocked] = useState(initialLocked);
  const [encryptionOk, setEncryptionOk] = useState<boolean | null>(initialEncryptionOk);

  const refreshParticipant = useCallback(async () => {
    setParticipant(await getParticipant());
  }, []);

  const value = useMemo(
    () => ({
      participant,
      refreshParticipant,
      locked,
      unlock: () => setLocked(false),
      lock: () => setLocked(true),
      encryptionOk,
      setEncryptionOk,
    }),
    [participant, locked, encryptionOk, refreshParticipant],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
