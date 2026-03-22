import { useMemo, useState } from 'react';
import { type DecisionEntry } from '../data/staticData';

interface Props {
  entries: DecisionEntry[];
}

export default function DecisionLogTab({ entries }: Props) {
  const [typeFilter, setTypeFilter] = useState('ALL TYPES');
  const [incidentFilter, setIncidentFilter] = useState('ALL INCIDENTS');

  const incidentOptions = useMemo(() => {
    const ids = Array.from(new Set(entries.map(e => e.incidentId)));
    return ids.sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const typeMatch = typeFilter === 'ALL TYPES' || entry.type === typeFilter;
      const incidentMatch = incidentFilter === 'ALL INCIDENTS' || entry.incidentId === incidentFilter;
      return typeMatch && incidentMatch;
    });
  }, [entries, typeFilter, incidentFilter]);

  const downloadCsv = () => {
    const csv = [
      ['Timestamp', 'Decision Type', 'Incident ID', 'Summary', 'Operator'],
      ...filteredEntries.map(e => [e.timestamp, e.type, e.incidentId, e.summary, e.operator]),
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `decision_log_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">Decision Logs</div>
      <div className="declog-filters">
        <select className="declog-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option>ALL TYPES</option>
          <option>SIGNAL RE-TIMING</option>
          <option>DIVERSION ROUTE</option>
          <option>PUBLIC ALERT</option>
          <option>OFFICER DEPLOY</option>
          <option>AMBULANCE ROUTE</option>
        </select>
        <select className="declog-select" value={incidentFilter} onChange={(e) => setIncidentFilter(e.target.value)}>
          <option>ALL INCIDENTS</option>
          {incidentOptions.map(id => <option key={id}>{id}</option>)}
        </select>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredEntries.length === 0 ? (
          <div className="declog-empty">No entries match the selected filters.</div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="declog-entry">
              <div className="declog-timestamp" title="Date time">{entry.timestamp}</div>
              <div className="declog-type" title="Decision type">{entry.type}</div>
              <div className="declog-incident" title="Incident ID">{entry.incidentId}</div>
              <div className="declog-summary" title="Summary">{entry.summary}</div>
              <div className="declog-operator" title="Operator">{entry.operator}</div>
            </div>
          ))
        )}
      </div>
      <button className="export-btn" onClick={downloadCsv}>EXPORT CSV</button>
    </div>
  );
}
