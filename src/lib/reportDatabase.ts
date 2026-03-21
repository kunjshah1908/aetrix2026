import { type Incident, type Severity } from '../data/staticData';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_ROOT = API_BASE_URL || '';

export type UserAccidentType = 'Minor' | 'Medium' | 'Extreme';

export interface UserReportRecord {
  id: string;
  name: string;
  phoneNumber: string;
  location: string;
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
  accidentType: UserAccidentType;
  description: string;
  imageDataUrl: string;
}

const apiUrl = (path: string) => `${API_ROOT}${path}`;

const toSeverity = (accidentType: UserAccidentType): Severity => {
  if (accidentType === 'Extreme') return 'CRITICAL';
  if (accidentType === 'Medium') return 'MODERATE';
  return 'MINOR';
};

export const getUserReports = async (): Promise<UserReportRecord[]> => {
  const response = await fetch(apiUrl('/api/reports'));
  if (!response.ok) {
    throw new Error('Unable to load reports from backend');
  }

  const reports = (await response.json()) as UserReportRecord[];
  return reports.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

export const addUserReport = async (input: NewUserReportInput): Promise<UserReportRecord> => {
  const response = await fetch(apiUrl('/api/reports'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Unable to create report in backend');
  }

  return (await response.json()) as UserReportRecord;
};

export const removeUserReport = async (id: string): Promise<void> => {
  const response = await fetch(apiUrl(`/api/reports/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Unable to delete report from backend');
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
    imageDataUrl: report.imageDataUrl,
  };
};
