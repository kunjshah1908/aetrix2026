import { useState } from 'react';
import { resolvedIncidents, type Incident } from '../data/staticData';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  onNewReport: () => void;
  onHistory: () => void;
  incidents: Incident[];
  onOpenIncident?: (id: string) => void;
}

export default function Sidebar({ selectedId, onSelect, onNewReport, onHistory, incidents, onOpenIncident }: Props) {
  const [resolvedOpen, setResolvedOpen] = useState(false);

  const badgeClass = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'badge badge-critical';
      case 'MAJOR': return 'badge badge-major';
      case 'MODERATE': return 'badge badge-moderate';
      case 'MINOR': return 'badge badge-minor';
      default: return 'badge';
    }
  };

  return (
    <div className="sidebar-panel">
      <div className="section-header">ACTIVE INCIDENTS</div>
      <div className="incidents-list">
        {incidents.filter(i => i.status === 'ACTIVE' || i.status === 'REPORTED').map(inc => (
          <div
            key={inc.id}
            className={`incident-card${selectedId === inc.id ? ' active' : ''}`}
            onClick={() => {
              onSelect(inc.id);
              onOpenIncident?.(inc.id);
            }}
          >
            <div className="incident-id">{inc.id}</div>
            <div className="incident-location">{inc.location}</div>
            <div className="incident-meta">
              <span className={badgeClass(inc.severity)}>{inc.severity}</span>
              <span className="incident-elapsed">{inc.elapsed}</span>
            </div>
          </div>
        ))}

        <div
          className="collapsible-header"
          onClick={() => setResolvedOpen(!resolvedOpen)}
        >
          <span>RESOLVED TODAY</span>
          <span>{resolvedOpen ? '−' : '+'}</span>
        </div>
        {resolvedOpen && resolvedIncidents.map(r => (
          <div key={r.id} className="resolved-item">
            {r.id} · {r.time} · cleared in {r.clearTime}
          </div>
        ))}
      </div>

      <div className="sidebar-buttons">
        <button className="btn-sidebar primary" onClick={onNewReport}>+ NEW REPORT</button>
        <button className="btn-sidebar" onClick={onHistory}>FULL HISTORY</button>
      </div>
    </div>
  );
}
