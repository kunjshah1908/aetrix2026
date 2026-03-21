import { useState } from 'react';
import { type Incident } from '../data/staticData';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onSkip: (id: string) => void;
  reports: Incident[];
}

export default function ReportsSidebar({ selectedId, onSelect, onVerify, onReject, onSkip, reports }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">ACTIVE REPORTINGS</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {reports.filter(r => r.status === 'REPORTED').map(rep => (
          <div
            key={rep.id}
            className={`incident-card${selectedId === rep.id ? ' active' : ''}`}
            onClick={() => onSelect(rep.id)}
          >
            <div className="incident-id">{rep.id}</div>
            <div className="incident-location">{rep.location}</div>
            <div className="incident-meta">
              <span className="badge badge-moderate">{rep.severity}</span>
              <span className="incident-elapsed">{rep.elapsed}</span>
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
              <button onClick={(e) => { e.stopPropagation(); onVerify(rep.id); }} style={{ padding: '5px 10px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Verify</button>
              <button onClick={(e) => { e.stopPropagation(); onReject(rep.id); }} style={{ padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Reject</button>
              <button onClick={(e) => { e.stopPropagation(); onSkip(rep.id); }} style={{ padding: '5px 10px', background: '#7a8299', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Skip</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}