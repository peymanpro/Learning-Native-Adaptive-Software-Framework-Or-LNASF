import { useCallback, useMemo, useState } from 'react';
import {
  appendSectionObservation,
  predictNextSection,
  type DashboardPrediction,
  type DashboardSection,
} from '@/lib/lnasf/dashboard-learning';

export interface DashboardLearningState {
  history: DashboardSection[];
  prediction: DashboardPrediction | null;
  recordSectionUse: (section: DashboardSection) => void;
  resetLearning: () => void;
}

/**
 * Session-only learning state: nothing is sent to a server or persisted.
 */
export function useDashboardLearning(): DashboardLearningState {
  const [history, setHistory] = useState<DashboardSection[]>([]);

  const recordSectionUse = useCallback((section: DashboardSection) => {
    setHistory((current) => appendSectionObservation(current, section));
  }, []);

  const resetLearning = useCallback(() => {
    setHistory([]);
  }, []);

  const prediction = useMemo(
    () => predictNextSection(history),
    [history],
  );

  return { history, prediction, recordSectionUse, resetLearning };
}
