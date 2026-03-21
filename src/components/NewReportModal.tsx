import { useState } from 'react';
import { officers } from '../data/staticData';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { location: string; severity: string; type: string; officer: string; notes: string }) => void;
}

export default function NewReportModal({ open, onClose, onSubmit }: Props) {
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('MODERATE');
  const [type, setType] = useState('COLLISION');
  const [officer, setOfficer] = useState(officers[0].badge);
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit({ location, severity, type, officer, notes });
    setLocation(''); setNotes('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">MANUAL INCIDENT ENTRY</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">LOCATION</label>
            <input className="form-input" placeholder="intersection or address" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">SEVERITY</label>
            <select className="form-select" value={severity} onChange={e => setSeverity(e.target.value)}>
              <option>CRITICAL</option><option>MAJOR</option><option>MODERATE</option><option>MINOR</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ACCIDENT TYPE</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              <option>COLLISION</option><option>BREAKDOWN</option><option>DEBRIS</option><option>PEDESTRIAN</option><option>ROLLOVER</option><option>OTHER</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">OFFICER ASSIGNED</label>
            <select className="form-select" value={officer} onChange={e => setOfficer(e.target.value)}>
              {officers.map(o => <option key={o.badge} value={o.badge}>{o.badge} — {o.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">FIELD NOTES</label>
            <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button className="form-submit" onClick={handleSubmit}>SUBMIT REPORT</button>
        </div>
      </div>
    </div>
  );
}
