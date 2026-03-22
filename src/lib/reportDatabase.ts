import { type Incident, type Severity } from '../data/staticData';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_ROOT = API_BASE_URL || '';
const LOCAL_REPORTS_STORAGE_KEY = 'aetrix:userReports';

const canUseLocalFallback = () =>
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export type UserAccidentType = 'Minor' | 'Medium' | 'Extreme';

export interface UserReportRecord {
  id: string;
  name: string;
  phoneNumber: string;
  location: string;
  accidentPoint: string;
  accidentType: UserAccidentType;
  confirmedSeverity?: 'Mild' | 'Moderate' | 'Extreme' | null;
  confirmedAccidentType?: string | null;
  enrichmentDetails?: Incident['enrichmentDetails'] | null;
  description: string;
  imageDataUrl: string;
  createdAt: string;
  status: 'REPORTED' | 'ACTIVE' | 'RESOLVED';
  lat: number;
  lng: number;
}

interface NewUserReportInput {
  name: string;
  phoneNumber: string;
  location: string;
  accidentPoint: string;
  accidentType: UserAccidentType;
  description: string;
  imageDataUrl: string;
}

interface SubmitEnrichmentInput {
  reportId: string;
  confirmedSeverity: 'Mild' | 'Moderate' | 'Extreme';
  confirmedAccidentType: string;
  enrichmentDetails: NonNullable<Incident['enrichmentDetails']>;
}

const apiUrl = (path: string) => `${API_ROOT}${path}`;

const readApiErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const text = (await response.text()).trim();
    if (!text) return fallback;

    try {
      const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
      if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
    } catch {
      // Response body was plain text; fall through.
    }

    return text;
  } catch {
    return fallback;
  }
};

const parseAccidentPointCoords = (accidentPoint: string): { lat: number; lng: number } | null => {
  const match = accidentPoint.match(/Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const withAccidentPointCoords = (report: UserReportRecord): UserReportRecord => {
  const coords = parseAccidentPointCoords(report.accidentPoint);
  if (!coords) {
    return report;
  }

  return {
    ...report,
    lat: coords.lat,
    lng: coords.lng,
  };
};

const isUserReportRecord = (value: unknown): value is UserReportRecord => {
  if (!value || typeof value !== 'object') return false;
  const report = value as Partial<UserReportRecord>;
  return (
    typeof report.id === 'string' &&
    typeof report.name === 'string' &&
    typeof report.phoneNumber === 'string' &&
    typeof report.location === 'string' &&
    typeof report.accidentPoint === 'string' &&
    typeof report.accidentType === 'string' &&
    typeof report.description === 'string' &&
    typeof report.imageDataUrl === 'string' &&
    typeof report.createdAt === 'string' &&
    typeof report.status === 'string' &&
    typeof report.lat === 'number' &&
    typeof report.lng === 'number'
  );
};

const sortReportsNewestFirst = (reports: UserReportRecord[]) =>
  [...reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

const readLocalReports = (): UserReportRecord[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUserReportRecord);
  } catch {
    return [];
  }
};

const writeLocalReports = (reports: UserReportRecord[]) => {
  window.localStorage.setItem(LOCAL_REPORTS_STORAGE_KEY, JSON.stringify(sortReportsNewestFirst(reports)));
};

const createFallbackReport = (input: NewUserReportInput): UserReportRecord => {
  const coords = parseAccidentPointCoords(input.accidentPoint);
  return {
    id: `REP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: input.name,
    phoneNumber: input.phoneNumber,
    location: input.location,
    accidentPoint: input.accidentPoint,
    accidentType: input.accidentType,
    confirmedSeverity: null,
    confirmedAccidentType: null,
    enrichmentDetails: null,
    description: input.description,
    imageDataUrl: input.imageDataUrl,
    createdAt: new Date().toISOString(),
    status: 'REPORTED',
    lat: coords?.lat ?? 23.215 + (Math.random() - 0.5) * 0.02,
    lng: coords?.lng ?? 72.637 + (Math.random() - 0.5) * 0.02,
  };
};

const toSeverity = (accidentType: UserAccidentType): Severity => {
  if (accidentType === 'Extreme') return 'CRITICAL';
  if (accidentType === 'Medium') return 'MODERATE';
  return 'MINOR';
};

const toSeverityFromConfirmed = (confirmedSeverity: UserReportRecord['confirmedSeverity']): Severity | null => {
  if (confirmedSeverity === 'Extreme') return 'CRITICAL';
  if (confirmedSeverity === 'Moderate') return 'MODERATE';
  if (confirmedSeverity === 'Mild') return 'MINOR';
  return null;
};

const toElapsed = (createdAt: string): string => {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return '00:00:00';
  const now = Date.now();
  const diffMs = Math.max(0, now - created);
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const getUserReports = async (): Promise<UserReportRecord[]> => {
  try {
    const response = await fetch(apiUrl('/api/reports'));
    if (!response.ok) {
      const details = await readApiErrorMessage(response, `Unable to load reports from backend (HTTP ${response.status})`);
      throw new Error(details);
    }

    const reports = ((await response.json()) as UserReportRecord[]).map(withAccidentPointCoords);
    return sortReportsNewestFirst(reports);
  } catch (error) {
    if (!canUseLocalFallback()) {
      if (error instanceof Error && error.message.trim()) {
        throw error;
      }
      throw new Error('Unable to load reports from backend. Please check server deployment and environment variables.');
    }
    return sortReportsNewestFirst(readLocalReports());
  }
};

export const addUserReport = async (input: NewUserReportInput): Promise<UserReportRecord> => {
  try {
    const response = await fetch(apiUrl('/api/reports'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const details = await readApiErrorMessage(response, `Unable to create report in backend (HTTP ${response.status})`);
      throw new Error(details);
    }

    return (await response.json()) as UserReportRecord;
  } catch (error) {
    if (!canUseLocalFallback()) {
      throw error;
    }
    const fallbackReport = createFallbackReport(input);
    const existingReports = readLocalReports();
    writeLocalReports([fallbackReport, ...existingReports]);
    return fallbackReport;
  }
};

export const removeUserReport = async (id: string): Promise<void> => {
  try {
    const response = await fetch(apiUrl(`/api/reports/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Unable to delete report from backend (HTTP ${response.status})`);
    }

    return;
  } catch {
    if (!canUseLocalFallback()) {
      throw new Error('Unable to delete report from backend. Please check server deployment and environment variables.');
    }
    const existingReports = readLocalReports();
    const nextReports = existingReports.filter((report) => report.id !== id);
    writeLocalReports(nextReports);
  }
};

export const verifyUserReport = async (id: string): Promise<UserReportRecord> => {
  try {
    const response = await fetch(apiUrl(`/api/reports/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });

    if (!response.ok) {
      throw new Error(`Unable to verify report in backend (HTTP ${response.status})`);
    }

    return (await response.json()) as UserReportRecord;
  } catch (error) {
    if (!canUseLocalFallback()) {
      throw error;
    }

    const existingReports = readLocalReports();
    const index = existingReports.findIndex((report) => report.id === id);
    if (index < 0) {
      throw new Error('Report not found for verification.');
    }

    const updatedReport = { ...existingReports[index], status: 'ACTIVE' as const };
    const nextReports = [...existingReports];
    nextReports[index] = updatedReport;
    writeLocalReports(nextReports);
    return updatedReport;
  }
};

export const markReportSolved = async (id: string): Promise<UserReportRecord> => {
  try {
    const response = await fetch(apiUrl(`/api/reports/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Unable to mark report solved in backend (HTTP ${response.status})`);
    }

    return withAccidentPointCoords((await response.json()) as UserReportRecord);
  } catch (error) {
    if (!canUseLocalFallback()) {
      throw error;
    }

    const existingReports = readLocalReports();
    const index = existingReports.findIndex((report) => report.id === id);
    if (index < 0) {
      throw new Error('Report not found for solved update.');
    }

    const updatedReport: UserReportRecord = {
      ...existingReports[index],
      status: 'RESOLVED',
    };
    const nextReports = [...existingReports];
    nextReports[index] = updatedReport;
    writeLocalReports(nextReports);
    return updatedReport;
  }
};

export const submitReportEnrichment = async (input: SubmitEnrichmentInput): Promise<UserReportRecord> => {
  try {
    const response = await fetch(apiUrl(`/api/reports/${encodeURIComponent(input.reportId)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        confirmedSeverity: input.confirmedSeverity,
        confirmedAccidentType: input.confirmedAccidentType,
        enrichmentDetails: input.enrichmentDetails,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Unable to save enrichment in backend (HTTP ${response.status})`);
    }

    return withAccidentPointCoords((await response.json()) as UserReportRecord);
  } catch (error) {
    if (!canUseLocalFallback()) {
      throw error;
    }

    const existingReports = readLocalReports();
    const index = existingReports.findIndex((report) => report.id === input.reportId);
    if (index < 0) {
      throw new Error('Report not found for enrichment update.');
    }

    const existing = existingReports[index];
    const updatedReport: UserReportRecord = {
      ...existing,
      status: 'ACTIVE',
      confirmedSeverity: input.confirmedSeverity,
      confirmedAccidentType: input.confirmedAccidentType,
      enrichmentDetails: input.enrichmentDetails,
      description: input.enrichmentDetails.officerNotes || existing.description,
    };

    const nextReports = [...existingReports];
    nextReports[index] = updatedReport;
    writeLocalReports(nextReports);
    return updatedReport;
  }
};

export const toIncidentFromUserReport = (report: UserReportRecord): Incident => {
  const normalizedReport = withAccidentPointCoords(report);
  const mappedConfirmedSeverity = toSeverityFromConfirmed(normalizedReport.confirmedSeverity);
  const effectiveSeverity = mappedConfirmedSeverity || toSeverity(normalizedReport.accidentType);
  const effectiveType = normalizedReport.confirmedAccidentType || normalizedReport.accidentType;
  const effectiveDescription = normalizedReport.enrichmentDetails?.officerNotes || normalizedReport.description;

  return {
    id: normalizedReport.id,
    location: normalizedReport.location,
    severity: effectiveSeverity,
    elapsed: toElapsed(normalizedReport.createdAt),
    status: normalizedReport.status,
    lat: normalizedReport.lat,
    lng: normalizedReport.lng,
    type: effectiveType,
    confirmedSeverity: normalizedReport.confirmedSeverity || undefined,
    confirmedAccidentType: normalizedReport.confirmedAccidentType || undefined,
    reporterName: normalizedReport.name,
    reporterPhone: normalizedReport.phoneNumber,
    description: effectiveDescription,
    reporterDescription: normalizedReport.description,
    imageDataUrl: normalizedReport.imageDataUrl,
    enrichmentDetails: normalizedReport.enrichmentDetails || undefined,
  };
};
