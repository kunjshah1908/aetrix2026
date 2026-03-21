import { type Incident } from '../data/staticData';

const STORAGE_KEY = 'aetrix.commandCenterIncidents.v1';
const UPDATE_EVENT = 'command-center-incidents-updated';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStored = (): Incident[] => {
  if (!isBrowser) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Incident[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const writeStored = (incidents: Incident[]) => {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const getCommandCenterIncidents = (): Incident[] => {
  return readStored();
};

export const upsertCommandCenterIncident = (incident: Incident) => {
  const existing = readStored();
  const idx = existing.findIndex((item) => item.id === incident.id);
  const next = [...existing];

  if (idx >= 0) {
    next[idx] = incident;
  } else {
    next.unshift(incident);
  }

  writeStored(next);
};

export const onCommandCenterIncidentsUpdated = (handler: () => void) => {
  if (!isBrowser) return () => undefined;

  const listener = () => handler();
  window.addEventListener(UPDATE_EVENT, listener);
  return () => window.removeEventListener(UPDATE_EVENT, listener);
};
