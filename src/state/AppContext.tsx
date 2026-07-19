import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Participant } from '../db/schema';
import { getParticipant } from '../db/repository';

type AppState = {
  participant: Participant | null;
  refreshParticipant: () => Promise<void>;
  /** null = unknown/no file yet; false = plaintext DB detected (Expo Go or misconfig) */
  encryptionOk: boolean | null;
  setEncryptionOk: (v: boolean | null) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({
  children,
  initialParticipant,
  initialEncryptionOk,
}: {
  children: React.ReactNode;
  initialParticipant: Participant | null;
  initialEncryptionOk: boolean | null;
}) {
  const [participant, setParticipant] = useState<Participant | null>(initialParticipant);
  const [encryptionOk, setEncryptionOk] = useState<boolean | null>(initialEncryptionOk);

  const refreshParticipant = useCallback(async () => {
    setParticipant(await getParticipant());
  }, []);

  const value = useMemo(
    () => ({
      participant,
      refreshParticipant,
      encryptionOk,
      setEncryptionOk,
    }),
    [participant, encryptionOk, refreshParticipant],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
