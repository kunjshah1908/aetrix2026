import { officers } from '../data/staticData';

export default function StatsTab() {
  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div className="stats-grid">
        <div className="stat-cell">
          <div className="stat-value">2</div>
          <div className="stat-label">ACTIVE</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">8m 42s</div>
          <div className="stat-label">AVG VERIFY TIME</div>
          <div className="stat-sub">-2m vs yesterday</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">14</div>
          <div className="stat-label">RESOLVED TODAY</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">3</div>
          <div className="stat-label">OFFICERS ON SCENE</div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 8 }}>OFFICER DEPLOYMENT</div>
      <div style={{ padding: '0 10px 10px' }}>
        <table className="officer-table">
          <thead>
            <tr>
              <th>BADGE</th>
              <th>NAME</th>
              <th>SUBAREA</th>
              <th>STATUS</th>
              <th>LAST SEEN</th>
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
    </div>
  );
}
