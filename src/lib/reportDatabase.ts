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
  description: string;
  imageDataUrl: string;
  createdAt: string;
  status: 'REPORTED';
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

const apiUrl = (path: string) => `${API_ROOT}${path}`;

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

const createFallbackReport = (input: NewUserReportInput): UserReportRecord => ({
  id: `REP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  name: input.name,
  phoneNumber: input.phoneNumber,
  location: input.location,
  accidentPoint: input.accidentPoint,
  accidentType: input.accidentType,
  description: input.description,
  imageDataUrl: input.imageDataUrl,
  createdAt: new Date().toISOString(),
  status: 'REPORTED',
  lat: 23.215 + (Math.random() - 0.5) * 0.02,
  lng: 72.637 + (Math.random() - 0.5) * 0.02,
});

const toSeverity = (accidentType: UserAccidentType): Severity => {
  if (accidentType === 'Extreme') return 'CRITICAL';
  if (accidentType === 'Medium') return 'MODERATE';
  return 'MINOR';
};

export const getUserReports = async (): Promise<UserReportRecord[]> => {
  try {
    const response = await fetch(apiUrl('/api/reports'));
    if (!response.ok) {
      throw new Error(`Unable to load reports from backend (HTTP ${response.status})`);
    }

    const reports = (await response.json()) as UserReportRecord[];
    return sortReportsNewestFirst(reports);
  } catch {
    if (!canUseLocalFallback()) {
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
      const errorText = await response.text();
      throw new Error(errorText || `Unable to create report in backend (HTTP ${response.status})`);
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

export const toIncidentFromUserReport = (report: UserReportRecord): Incident => {
  return {
    id: report.id,
    location: report.location,
    severity: toSeverity(report.accidentType),
    elapsed: '00:00:00',
    status: report.status,
    lat: report.lat,
    lng: report.lng,
    type: report.accidentType,
    reporterName: report.name,
    reporterPhone: report.phoneNumber,
    description: report.description,
    reporterDescription: report.description,
    imageDataUrl: report.imageDataUrl,
  };
};
