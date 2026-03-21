import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type IncidentStatus, type Severity } from '../data/staticData';
import { getUserReports, toIncidentFromUserReport } from '../lib/reportDatabase';

interface HistoryRow {
  id: string;
  timestamp: string;
  createdAt: string;
  location: string;
  type: string;
  severity: Severity;
  duration: string;
  status: IncidentStatus;
  officer: string;
  decisions: number;
  reporterName: string;
  reporterPhone: string;
  reporterDescription: string;
  effectiveDescription: string;
  enrichmentSummary: string;
}

const badgeClass = (s: Severity) => {
  switch (s) {
    case 'CRITICAL': return 'badge badge-critical';
    case 'MAJOR': return 'badge badge-major';
    case 'MODERATE': return 'badge badge-moderate';
    case 'MINOR': return 'badge badge-minor';
  }
};

const statusClass = (s: string) => `status-${s.toLowerCase()}`;

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const inDateRange = (iso: string, from: string, to: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (date < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59.999`);
    if (date > toDate) return false;
  }

  return true;
};

export default function History() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatus>('ALL');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loadError, setLoadError] = useState('');

  const refreshHistory = useCallback(async () => {
    try {
      const reports = await getUserReports();
      const nextRows: HistoryRow[] = reports.map((report) => {
        const incident = toIncidentFromUserReport(report);
        const enrichment = incident.enrichmentDetails;
        const enrichmentSummary = enrichment
          ? [
              `Severity: ${enrichment.confirmedSeverity || report.confirmedSeverity || '-'}`,
              `Accident Type: ${enrichment.accidentType?.join(', ') || report.confirmedAccidentType || '-'}`,
              `Traffic: ${enrichment.trafficFlow || '-'}`,
            ].join(' | ')
          : `Severity: ${report.confirmedSeverity || '-'} | Accident Type: ${report.confirmedAccidentType || '-'} | Traffic: -`;

        return {
          id: incident.id,
          timestamp: formatTimestamp(report.createdAt),
          createdAt: report.createdAt,
          location: incident.location,
          type: incident.type,
          severity: incident.severity,
          duration: incident.elapsed,
          status: incident.status,
          officer: incident.enrichmentDetails ? 'Regional Officer' : '-',
          decisions: 0,
          reporterName: incident.reporterName || '-',
          reporterPhone: incident.reporterPhone || '-',
          reporterDescription: incident.reporterDescription || '-',
          effectiveDescription: incident.description || '-',
          enrichmentSummary,
        };
      });

      setRows(nextRows);
      setLoadError('');
    } catch {
      setLoadError('Unable to load full history from backend.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
    const timer = window.setInterval(() => {
      void refreshHistory();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [refreshHistory]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (!inDateRange(row.createdAt, fromDate, toDate)) return false;
        if (severityFilter !== 'ALL' && row.severity !== severityFilter) return false;
        if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;

        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          row.location.toLowerCase().includes(q) ||
          row.id.toLowerCase().includes(q) ||
          row.type.toLowerCase().includes(q)
        );
      }),
    [rows, fromDate, toDate, severityFilter, statusFilter, search],
  );

  const handleExportCsv = () => {
    const header = ['INC ID', 'TIMESTAMP', 'LOCATION', 'TYPE', 'SEVERITY', 'DURATION', 'STATUS', 'OFFICER', 'DECISIONS'];
    const csvRows = filtered.map((row) => [
      row.id,
      row.timestamp,
      row.location,
      row.type,
      row.severity,
      row.duration,
      row.status,
      row.officer,
      String(row.decisions),
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aetrix-full-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="history-page">
      <div className="history-topbar">
        <button className="back-btn" onClick={() => navigate('/')}>← COMMAND</button>
        <span style={{ fontSize: 10, color: '#5a6477', textTransform: 'uppercase', letterSpacing: '2px' }}>FULL INCIDENT HISTORY</span>
        <button className="export-btn" onClick={handleExportCsv}>EXPORT CSV</button>
      </div>

      {loadError && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-default)', color: '#991b1b', background: '#fef2f2' }}>
          {loadError}
        </div>
      )}

      <div className="history-filters">
        <input className="history-filter-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} placeholder="FROM" />
        <input className="history-filter-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} placeholder="TO" />
        <select className="history-filter-input" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as 'ALL' | Severity)}>
          <option value="ALL">ALL SEVERITY</option>
          <option value="CRITICAL">CRITICAL</option><option value="MAJOR">MAJOR</option><option value="MODERATE">MODERATE</option><option value="MINOR">MINOR</option>
        </select>
        <select className="history-filter-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | IncidentStatus)}>
          <option value="ALL">ALL STATUS</option>
          <option value="REPORTED">REPORTED</option><option value="ACTIVE">ACTIVE</option><option value="RESOLVED">RESOLVED</option><option value="DISMISSED">DISMISSED</option>
        </select>
        <input className="history-filter-input" placeholder="search location…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
      </div>

      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>INC ID</th><th>TIMESTAMP</th><th>LOCATION</th><th>TYPE</th>
              <th>SEVERITY</th><th>DURATION</th><th>STATUS</th><th>OFFICER</th><th>DECISIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              [
                <tr key={row.id} className="clickable" onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}>
                  <td style={{ color: '#4a9eff' }}>{row.id}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.timestamp}</td>
                  <td>{row.location}</td>
                  <td>{row.type}</td>
                  <td><span className={badgeClass(row.severity)}>{row.severity}</span></td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.duration}</td>
                  <td><span className={statusClass(row.status)}>{row.status}</span></td>
                  <td>{row.officer}</td>
                  <td>{row.decisions}</td>
                </tr>,
                expandedId === row.id && (
                  <tr key={`${row.id}-detail`}>
                    <td colSpan={9} style={{ padding: 0 }}>
                      <div className="history-detail">
                        <h4>INCIDENT SUMMARY</h4>
                        <p>{row.effectiveDescription}</p>
                        <h4>REPORTER DETAILS</h4>
                        <p>Name: {row.reporterName} | Phone: {row.reporterPhone}</p>
                        <h4>REPORTER DESCRIPTION</h4>
                        <p>{row.reporterDescription}</p>
                        <h4>ENRICHMENT SNAPSHOT</h4>
                        <p>{row.enrichmentSummary}</p>
                        <h4>CURRENT STATUS</h4>
                        <p>
                          {row.status === 'RESOLVED'
                            ? 'Marked solved by Command Center. This record is permanently retained in Full History.'
                            : 'This incident is still active and visible in live operations.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ),
              ]
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '18px 10px', color: 'var(--text-secondary)' }}>
                  No incidents found for current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
