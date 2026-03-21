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
import { getCommandCenterIncidents, onCommandCenterIncidentsUpdated } from '../lib/commandCenterIncidentStore';
import { getSupabaseAuthClient } from '../lib/supabaseClient';

export default function RegionalOfficerDashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiversion, setShowDiversion] = useState(false);
  const [reports, setReports] = useState<Incident[]>([]);
  const [userReports, setUserReports] = useState<UserReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<UserReportRecord | null>(null);
  const [reportsError, setReportsError] = useState('');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifiedReportIds, setVerifiedReportIds] = useState<string[]>([]);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>(initialDecisionLog);
  const [selectedSubarea, setSelectedSubarea] = useState('Gandhinagar Central');
  const selectedIncident = reports.find((item) => item.id === selectedId);

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

  useEffect(() => {
    const syncVerifiedIds = () => {
      const submittedToCommandCenter = getCommandCenterIncidents();
      setVerifiedReportIds(submittedToCommandCenter.map((incident) => incident.id));
    };

    syncVerifiedIds();
    const unsubscribe = onCommandCenterIncidentsUpdated(syncVerifiedIds);
    return unsubscribe;
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
    setSelectedId(id);
    setVerifyMessage('Verified Accident, Please fill the Enrichment Form');
    window.setTimeout(() => {
      setVerifyMessage('');
    }, 2500);
  };

  const handleReject = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      alert('Please enter a reason for rejection.');
      return;
    }

    try {
      await removeUserReport(rejectTargetId);
    } catch {
      alert('Could not remove report from backend.');
      return;
    }

    setReports(prev => prev.filter(r => r.id !== rejectTargetId));
    setUserReports(prev => prev.filter(report => report.id !== rejectTargetId));
    setVerifiedReportIds(prev => prev.filter(id => id !== rejectTargetId));
    if (selectedReport?.id === rejectTargetId) {
      setSelectedReport(null);
    }

    setRejectTargetId(null);
    setRejectReason('');
  };

  const handleEnrichmentSubmitted = (incidentId: string) => {
    setVerifiedReportIds(prev => (prev.includes(incidentId) ? prev : [...prev, incidentId]));
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseAuthClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore and continue route fallback.
    }
    navigate('/regional');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar />
      <div style={{ padding: '10px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
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
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Logout
          </button>
        </div>
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
            <IncidentEnrichmentForm selectedId={selectedId} selectedIncident={selectedIncident} onSubmitted={handleEnrichmentSubmitted} />
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
              verifiedReportIds={verifiedReportIds}
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
      {verifyMessage && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 1200,
            background: '#ecfdf5',
            color: '#166534',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '13px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
          }}
        >
          {verifyMessage}
        </div>
      )}
      {rejectTargetId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px',
          }}
          onClick={() => setRejectTargetId(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              border: '1px solid var(--border-default)',
              padding: '16px',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>Reason for Rejection</h3>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Enter reason for rejecting this accident report"
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                fontFamily: 'Merriweather, serif',
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectTargetId(null)}
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer' }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
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
              <p><strong>AccidentPoint:</strong> {selectedReport.accidentPoint}</p>
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