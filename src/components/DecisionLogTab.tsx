import { type DecisionEntry } from '../data/staticData';

interface Props {
  entries: DecisionEntry[];
}

export default function DecisionLogTab({ entries }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">DECISION LOG</div>
      <div className="declog-filters">
        <select className="declog-select">
          <option>ALL TYPES</option>
          <option>SIGNAL RE-TIMING</option>
          <option>DIVERSION ROUTE</option>
          <option>PUBLIC ALERT</option>
          <option>OFFICER DEPLOY</option>
        </select>
        <select className="declog-select">
          <option>ALL INCIDENTS</option>
          <option>INC-0041</option>
          <option>INC-0040</option>
          <option>INC-0039</option>
        </select>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {entries.map(entry => (
          <div key={entry.id} className="declog-entry">
            <div className="declog-timestamp">{entry.timestamp}</div>
            <div className="declog-type">{entry.type}</div>
            <div className="declog-incident">{entry.incidentId}</div>
            <div className="declog-summary">{entry.summary}</div>
            <div className="declog-operator">{entry.operator}</div>
          </div>
        ))}
      </div>
      <button className="export-btn">EXPORT CSV</button>
    </div>
  );
}
