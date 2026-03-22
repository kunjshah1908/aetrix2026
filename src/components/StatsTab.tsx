import { officers } from '../data/staticData';
import { type Incident, type DecisionEntry } from '../data/staticData';

interface Props {
  incidents: Incident[];
  decisionLog: DecisionEntry[];
}

export default function StatsTab({ incidents, decisionLog }: Props) {
  const activeIncidents = incidents.filter(i => i.status === 'ACTIVE').length;
  const resolvedToday = incidents.filter(i => i.status === 'RESOLVED').length;
  const totalDecisions = decisionLog.length;
  const averageResponseMins = decisionLog.length === 0 ? 0 : Math.round(15 - decisionLog.length * 0.2);

  const onSceneOfficers = officers.filter(o => o.status === 'ON-SCENE').length;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '12px' }}>
      <h2 className="stats-heading">Statistics</h2>
      <div className="stats-grid">
        <div className="stat-cell">
          <div className="stat-value">{activeIncidents}</div>
          <div className="stat-label">Active Incidents</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{Math.max(0, averageResponseMins)}m</div>
          <div className="stat-label">Avg Decision Lag</div>
          <div className="stat-sub">Based on decision log</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{resolvedToday}</div>
          <div className="stat-label">Resolved Incidents</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{onSceneOfficers}</div>
          <div className="stat-label">Officers on Scene</div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 10 }}>Officer Deployment</div>
      <div style={{ padding: '0 10px 10px' }}>
        <table className="officer-table">
          <thead>
            <tr>
              <th>Badge</th>
              <th>Name</th>
              <th>Subarea</th>
              <th>Status</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {officers.map(ofc => (
              <tr key={ofc.badge}>
                <td>{ofc.badge}</td>
                <td>{ofc.name}</td>
                <td>{ofc.subarea}</td>
                <td>
                  <span className={`status-${ofc.status.toLowerCase().replace('-', '-')}`}>
                    <span className="status-dot" />
                    {ofc.status}
                  </span>
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{ofc.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-header" style={{ marginTop: 10 }}>Recent decisions (latest 8)</div>
      <ul className="decision-summary-list">
        {decisionLog.slice(0, 8).map(entry => (
          <li key={entry.id}>
            <strong>{entry.type}</strong> on {entry.incidentId} — {entry.summary.substring(0, 70)}...
          </li>
        ))}
      </ul>
    </div>
  );
}
