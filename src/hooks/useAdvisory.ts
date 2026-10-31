import { useCallback, useEffect, useState } from 'react';
import { fetchAdvisory } from '../services/advisoryService';
import type { AdvisoryResponse, FarmerInput } from '../types/farm';

export type AdvisoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: AdvisoryResponse };

export function useAdvisory(input: FarmerInput | null) {
  const [state, setState] = useState<AdvisoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!input) {
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    fetchAdvisory(input)
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [input, attempt]);

  const refresh = useCallback(() => setAttempt((count) => count + 1), []);

  return { state, refresh };
}
