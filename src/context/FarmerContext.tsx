import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { FarmerInput } from '../types/farm';

const STORAGE_KEY = 'kisanrakshak.farmerInput';

interface FarmerContextValue {
  input: FarmerInput | null;
  saveInput: (input: FarmerInput) => void;
}

const FarmerContext = createContext<FarmerContextValue | null>(null);

function readStoredInput(): FarmerInput | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FarmerInput) : null;
  } catch {
    return null;
  }
}

export function FarmerProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState<FarmerInput | null>(readStoredInput);

  const saveInput = useCallback((next: FarmerInput) => {
    setInput(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      return;
    }
  }, []);

  const value = useMemo(() => ({ input, saveInput }), [input, saveInput]);

  return <FarmerContext.Provider value={value}>{children}</FarmerContext.Provider>;
}

export function useFarmer(): FarmerContextValue {
  const context = useContext(FarmerContext);
  if (!context) {
    throw new Error('useFarmer must be used inside FarmerProvider');
  }
  return context;
}
