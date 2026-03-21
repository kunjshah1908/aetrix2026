import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import ReportsSidebar from '../components/ReportsSidebar';
import MapPanel from '../components/MapPanel';
import IncidentEnrichmentForm from '../components/IncidentEnrichmentForm';
import DecisionsPanel from '../components/DecisionsPanel';
import NewReportModal from '../components/NewReportModal';
import { type Incident, type Severity, initialDecisionLog, type DecisionEntry } from '../data/staticData';
import { getUserReports, removeUserReport, toIncidentFromUserReport, type UserReportRecord } from '../lib/reportDatabase';

export default function RegionalOfficerDashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiversion, setShowDiversion] = useState(false);
  const [reports, setReports] = useState<Incident[]>([]);
  const [userReports, setUserReports] = useState<UserReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<UserReportRecord | null>(null);
  const [reportsError, setReportsError] = useState('');
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>(initialDecisionLog);
  const [selectedSubarea, setSelectedSubarea] = useState('Gandhinagar Central');

  useEffect(() => {
    const loadReports = async () => {
      try {
        const storedReports = await getUserReports();
        setUserReports(storedReports);
        const incidentReports = storedReports.map(toIncidentFromUserReport);
        setReports(incidentReports);
        if (incidentReports.length > 0) {
          setSelectedId(incidentReports[0].id);
        }
      } catch {
        setReportsError('Unable to load reports from backend. Please make sure API server is running.');
      }
    };

    loadReports();
  }, []);

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

  const handleOpenReport = (id: string) => {
    const report = userReports.find((item) => item.id === id) || null;
    setSelectedReport(report);
  };

  const handleVerify = (id: string) => {
    // Logic to verify and open in reporting space
    setSelectedId(id);
    // Perhaps open a modal or switch view
  };

  const handleReject = async (id: string) => {
    try {
      await removeUserReport(id);
    } catch {
      alert('Could not remove report from backend.');
      return;
    }

    setReports(prev => prev.filter(r => r.id !== id));
    setUserReports(prev => prev.filter(report => report.id !== id));
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }
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
      {reportsError && (
        <div style={{ padding: '10px 20px', background: '#fef2f2', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>
          {reportsError}
        </div>
      )}
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
              onOpenReport={handleOpenReport}
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
      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '700px',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              padding: '20px',
              border: '1px solid var(--border-default)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>User Report Details</h3>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <p><strong>Report ID:</strong> {selectedReport.id}</p>
              <p><strong>Name:</strong> {selectedReport.name}</p>
              <p><strong>Phone Number:</strong> {selectedReport.phoneNumber}</p>
              <p><strong>Location:</strong> {selectedReport.location}</p>
              <p><strong>Type of Accident:</strong> {selectedReport.accidentType}</p>
              <p><strong>Description:</strong> {selectedReport.description}</p>
              <p><strong>Submitted At:</strong> {new Date(selectedReport.createdAt).toLocaleString()}</p>
            </div>

            <div style={{ marginTop: '14px' }}>
              <div style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>Uploaded Photo</div>
              <img
                src={selectedReport.imageDataUrl}
                alt="Reported accident"
                style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-default)' }}
              />
            </div>
          </div>
        </div>
      )}
      <NewReportModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleNewReport} />
    </div>
  );
}