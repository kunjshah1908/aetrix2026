import { DecisionEntry, initialDecisionLog } from '../data/staticData';

const STORAGE_KEY = 'aetrix.decisionLog.v1';
const EVENT_NAME = 'decision-log-updated';

const readLocal = (): DecisionEntry[] => {
  if (typeof window === 'undefined' || !window.localStorage) return initialDecisionLog;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialDecisionLog;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return initialDecisionLog;
    return parsed;
  } catch {
    return initialDecisionLog;
  }
};

const writeLocal = (entries: DecisionEntry[]) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const getDecisionLog = (): DecisionEntry[] => readLocal();

export const addDecisionEntry = (entry: DecisionEntry): DecisionEntry[] => {
  const current = readLocal();
  const next = [entry, ...current];
  writeLocal(next);
  return next;
};

export const clearDecisionLog = () => writeLocal([]);

export const onDecisionLogUpdated = (handler: () => void): () => void => {
  if (typeof window === 'undefined') return () => undefined;
  const listener = () => handler();
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
};