import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import MapPanel from '../components/MapPanel';
import RightPanel from '../components/RightPanel';
import DecisionsPanel from '../components/DecisionsPanel';
import NewReportModal from '../components/NewReportModal';
import { activeIncidents, type Incident, type Severity, initialDecisionLog, type DecisionEntry } from '../data/staticData';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(activeIncidents[0].id);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiversion, setShowDiversion] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([...activeIncidents]);
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>(initialDecisionLog);

  const handleDecisionApply = (entry: DecisionEntry) => {
    setDecisionLog(prev => [entry, ...prev]);
  };

  const handleNewReport = (data: { location: string; severity: string; type: string; officer: string; notes: string }) => {
    const newId = `INC-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const newInc: Incident = {
      id: newId,
      location: data.location || 'Unknown Location',
      severity: data.severity as Severity,
      elapsed: '00:00:00',
      status: 'REPORTED',
      lat: 23.215 + (Math.random() - 0.5) * 0.02,
      lng: 72.637 + (Math.random() - 0.5) * 0.02,
      type: data.type,
    };
    setIncidents(prev => [newInc, ...prev]);
    setSelectedId(newId);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar />
      <div className="dashboard-layout">
        <div className="dashboard-top">
          <MapPanel
            incidents={incidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showDiversion={showDiversion}
          />
          <RightPanel selectedId={selectedId} />
        </div>
        <div className="dashboard-bottom">
          <div className="dashboard-bottom-left">
            <Sidebar
              selectedId={selectedId}
              onSelect={setSelectedId}
              onNewReport={() => setModalOpen(true)}
              onHistory={() => navigate('/history')}
              incidents={incidents}
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
