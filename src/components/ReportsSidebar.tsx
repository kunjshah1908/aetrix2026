import { type Incident } from '../data/staticData';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenReport: (id: string) => void;
  onVerification: (id: string) => void;
  onReject: (id: string) => void;
  verifiedReportIds: string[];
  reports: Incident[];
}

export default function ReportsSidebar({ selectedId, onSelect, onOpenReport, onVerification, onReject, verifiedReportIds, reports }: Props) {
  const getUserSeverity = (type: string) => {
    const normalized = (type || '').trim().toLowerCase();
    if (normalized === 'extreme') return 'Extreme';
    if (normalized === 'minor') return 'Minor';
    return 'Medium';
  };

  const getSeverityBadgeStyle = (severity: 'Minor' | 'Medium' | 'Extreme') => {
    if (severity === 'Extreme') {
      return { background: '#fee2e2', color: '#b91c1c' };
    }
    if (severity === 'Minor') {
      return { background: '#dcfce7', color: '#166534' };
    }
    return { background: '#fef3c7', color: '#a16207' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">ACTIVE REPORTINGS</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {reports.filter(r => r.status === 'REPORTED' || r.status === 'ACTIVE').map(rep => (
          (() => {
            const isVerified = verifiedReportIds.includes(rep.id);
            const userSeverity = getUserSeverity(rep.type);
            const severityStyle = getSeverityBadgeStyle(userSeverity);
            return (
          <div
            key={rep.id}
            className={`incident-card${selectedId === rep.id ? ' active' : ''}`}
            style={{ padding: '10px 12px', marginBottom: '8px' }}
            onClick={() => {
              onSelect(rep.id);
              onOpenReport(rep.id);
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="incident-id">{rep.id}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <div className="incident-location" style={{ marginTop: 0 }}>Reported by: {rep.reporterName || 'Unknown'}</div>
                  <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, ...severityStyle }}>
                    {userSeverity}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.35 }}>
                  Location: {rep.location}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
                <span className="incident-elapsed">{rep.elapsed}</span>
                {isVerified ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span style={{ display: 'inline-block', padding: '5px 10px', background: '#16a34a', color: 'white', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                      Verified and Sent
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button onClick={(e) => { e.stopPropagation(); onVerification(rep.id); }} style={{ padding: '5px 10px', background: 'var(--brand-soft, #e8eef7)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-dim)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Verification</button>
                    <button onClick={(e) => { e.stopPropagation(); onReject(rep.id); }} style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Reject</button>
                  </div>
                )}
              </div>
            </div>
          </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}