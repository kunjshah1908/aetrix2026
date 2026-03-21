import { type Incident } from '../data/staticData';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenReport: (id: string) => void;
  onVerify: (id: string) => void;
  onVerification: (id: string) => void;
  onReject: (id: string) => void;
  verifiedReportIds: string[];
  reports: Incident[];
}

export default function ReportsSidebar({ selectedId, onSelect, onOpenReport, onVerify, onVerification, onReject, verifiedReportIds, reports }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">ACTIVE REPORTINGS</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {reports.filter(r => r.status === 'REPORTED').map(rep => (
          (() => {
            const isVerified = verifiedReportIds.includes(rep.id);
            return (
          <div
            key={rep.id}
            className={`incident-card${selectedId === rep.id ? ' active' : ''}`}
            onClick={() => {
              onSelect(rep.id);
              onOpenReport(rep.id);
            }}
          >
            <div className="incident-id">{rep.id}</div>
            <div className="incident-location">Reported by: {rep.reporterName || 'Unknown'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Location: {rep.location}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Type: {rep.type}</div>
            <div className="incident-meta">
              <span className="badge badge-moderate">{rep.severity}</span>
              <span className="incident-elapsed">{rep.elapsed}</span>
            </div>
            {isVerified ? (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', padding: '4px 8px', background: '#16a34a', color: 'white', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>
                  Verified
                </span>
                <button onClick={(e) => { e.stopPropagation(); onVerification(rep.id); }} style={{ padding: '5px 10px', background: 'var(--brand-soft, #e8eef7)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-dim)', borderRadius: '6px', cursor: 'pointer' }}>Verification</button>
              </div>
            ) : (
              <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                <button onClick={(e) => { e.stopPropagation(); onVerify(rep.id); }} style={{ padding: '5px 10px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Verify</button>
                <button onClick={(e) => { e.stopPropagation(); onVerification(rep.id); }} style={{ padding: '5px 10px', background: 'var(--brand-soft, #e8eef7)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-dim)', borderRadius: '6px', cursor: 'pointer' }}>Verification</button>
                <button onClick={(e) => { e.stopPropagation(); onReject(rep.id); }} style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Reject</button>
              </div>
            )}
          </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}