import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import ReportsSidebar from '../components/ReportsSidebar';
import MapPanel from '../components/MapPanel';
import IncidentEnrichmentForm from '../components/IncidentEnrichmentForm';
import DecisionsPanel from '../components/DecisionsPanel';
import NewReportModal from '../components/NewReportModal';
import { activeIncidents, type Incident, type Severity, initialDecisionLog, type DecisionEntry } from '../data/staticData';

// Mock data for user reports
const mockUserReports: Incident[] = [
  {
    id: 'REP-001',
    location: 'Sector 15, Gandhinagar',
    severity: 'MODERATE' as Severity,
    elapsed: '00:15:00',
    status: 'REPORTED',
    lat: 23.215,
    lng: 72.637,
    type: 'Vehicle Accident',
  },
  {
    id: 'REP-002',
    location: 'Highway 8, Ahmedabad',
    severity: 'MINOR' as Severity,
    elapsed: '00:30:00',
    status: 'REPORTED',
    lat: 23.025,
    lng: 72.571,
    type: 'Road Debris',
  },
];

export default function RegionalOfficerDashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(mockUserReports[0].id);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiversion, setShowDiversion] = useState(false);
  const [reports, setReports] = useState<Incident[]>([...mockUserReports]);
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>(initialDecisionLog);
  const [selectedSubarea, setSelectedSubarea] = useState('Gandhinagar Central');

  const handleDecisionApply = (entry: DecisionEntry) => {
    setDecisionLog(prev => [entry, ...prev]);
  };

  const handleNewReport = (data: { location: string; severity: string; type: string; officer: string; notes: string }) => {
    const newId = `REP-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const newRep: Incident = {
      id: newId,
      location: data.location || 'Unknown Location',
      severity: data.severity as Severity,
      elapsed: '00:00:00',
      status: 'REPORTED',
      lat: 23.215 + (Math.random() - 0.5) * 0.02,
      lng: 72.637 + (Math.random() - 0.5) * 0.02,
      type: data.type,
    };
    setReports(prev => [newRep, ...prev]);
    setSelectedId(newId);
  };

  const handleVerify = (id: string) => {
    // Logic to verify and open in reporting space
    setSelectedId(id);
    // Perhaps open a modal or switch view
  };

  const handleReject = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleSkip = (id: string) => {
    // Skip logic, maybe mark as skipped
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar />
      <div style={{ padding: '10px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
        <label style={{ marginRight: '10px', color: 'var(--text-secondary)' }}>Select Subarea:</label>
        <select
          value={selectedSubarea}
          onChange={(e) => setSelectedSubarea(e.target.value)}
          style={{ padding: '5px', border: '1px solid var(--border-default)', borderRadius: '4px' }}
        >
          <option>Gandhinagar Central</option>
          <option>Ahmedabad North</option>
          <option>Ahmedabad South</option>
          <option>Vadodara</option>
          <option>Surat</option>
        </select>
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-top">
          <MapPanel
            incidents={reports}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showDiversion={showDiversion}
          />
          <div className="right-panel">
            <IncidentEnrichmentForm selectedId={selectedId} />
          </div>
        </div>
        <div className="dashboard-bottom">
          <div className="dashboard-bottom-left">
            <ReportsSidebar
              selectedId={selectedId}
              onSelect={setSelectedId}
              onVerify={handleVerify}
              onReject={handleReject}
              onSkip={handleSkip}
              reports={reports}
            />
          </div>
          <div className="dashboard-bottom-right">
            <DecisionsPanel
              selectedId={selectedId}
              onDecisionApply={handleDecisionApply}
              onDiversionApply={() => setShowDiversion(true)}
            />
          </div>
        </div>
      </div>
      <NewReportModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleNewReport} />
    </div>
  );
}