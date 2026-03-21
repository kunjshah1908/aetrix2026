import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyData, type Severity } from '../data/staticData';

const badgeClass = (s: Severity) => {
  switch (s) {
    case 'CRITICAL': return 'badge badge-critical';
    case 'MAJOR': return 'badge badge-major';
    case 'MODERATE': return 'badge badge-moderate';
    case 'MINOR': return 'badge badge-minor';
  }
};

const statusClass = (s: string) => `status-${s.toLowerCase()}`;

const detailText = `Multi-vehicle incident reported by sensor grid and confirmed via CCTV feed. Initial response team dispatched within 4 minutes of detection. Traffic diversion activated on adjacent corridors. Signal timing adjustments applied at three upstream intersections to manage queue buildup. Officer on scene confirmed lane blockage and coordinated with municipal tow services. Ambulance staged at nearest overpass for rapid deployment. Public alert disseminated via SMS to 4,200 registered users in the affected zone and posted on official Twitter handle. Incident command transferred to shift supervisor at 10:00 hours. Continuous monitoring maintained through sensor telemetry and CCTV. Resolution confirmed after debris clearance and lane reopening. Post-incident signal timing reverted to default schedule. All units stood down and returned to patrol assignments.`;

export default function History() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = historyData.filter(r =>
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="history-page">
      <div className="history-topbar">
        <button className="back-btn" onClick={() => navigate('/')}>← COMMAND</button>
        <span style={{ fontSize: 10, color: '#5a6477', textTransform: 'uppercase', letterSpacing: '2px' }}>FULL INCIDENT HISTORY</span>
        <button className="export-btn">EXPORT CSV</button>
      </div>

      <div className="history-filters">
        <input className="history-filter-input" type="date" placeholder="FROM" />
        <input className="history-filter-input" type="date" placeholder="TO" />
        <select className="history-filter-input">
          <option>ALL SEVERITY</option>
          <option>CRITICAL</option><option>MAJOR</option><option>MODERATE</option><option>MINOR</option>
        </select>
        <select className="history-filter-input">
          <option>ALL STATUS</option>
          <option>ACTIVE</option><option>RESOLVED</option><option>DISMISSED</option>
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
              <>
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
                </tr>
                {expandedId === row.id && (
                  <tr key={`${row.id}-detail`}>
                    <td colSpan={9} style={{ padding: 0 }}>
                      <div className="history-detail">
                        <h4>INCIDENT NARRATIVE</h4>
                        <p>{detailText}</p>
                        <h4>DECISIONS TAKEN</h4>
                        <p>Signal re-timing applied at 3 nodes. Diversion route activated. Public SMS alert sent. Officer redeployed.</p>
                        <h4>OFFICER UPDATES</h4>
                        <p>OFC on scene at T+4m. Confirmed 3-lane blockage. Coordinated tow service. Cleared at T+{row.duration}.</p>
                        <h4>RESOLUTION</h4>
                        <p>All lanes reopened. Signal timing reverted. Units returned to patrol.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
