import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import MapPanel from '../components/MapPanel';
import RightPanel from '../components/RightPanel';
import DecisionsPanel from '../components/DecisionsPanel';
import NewReportModal from '../components/NewReportModal';
import { type Incident, type Severity, initialDecisionLog, type DecisionEntry } from '../data/staticData';
import { getCommandCenterIncidents, onCommandCenterIncidentsUpdated, upsertCommandCenterIncident } from '../lib/commandCenterIncidentStore';
import { getSupabaseAuthClient } from '../lib/supabaseClient';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiversion, setShowDiversion] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>(initialDecisionLog);
  const openIncident = incidents.find((incident) => incident.id === openIncidentId) || null;

  useEffect(() => {
    const loadIncidents = () => {
      const stored = getCommandCenterIncidents();
      setIncidents(stored);
      if (stored.length > 0 && !stored.some((item) => item.id === selectedId)) {
        setSelectedId(stored[0].id);
      }
    };

    loadIncidents();
    const unsubscribe = onCommandCenterIncidentsUpdated(loadIncidents);
    return unsubscribe;
  }, [selectedId]);

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
    upsertCommandCenterIncident(newInc);
    setSelectedId(newId);
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseAuthClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore and continue route fallback.
    }
    navigate('/dashboard');
  };

  return (
    <div className="dashboard-page">
      <Topbar />
      <div style={{ padding: '10px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end' }}>
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
          <div className="dashboard-bottom-left bottom-panel">
            <Sidebar
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenIncident={setOpenIncidentId}
              onNewReport={() => setModalOpen(true)}
              onHistory={() => navigate('/history')}
              incidents={incidents}
            />
          </div>
          <div className="dashboard-bottom-right bottom-panel">
            <DecisionsPanel
              selectedId={selectedId}
              onDecisionApply={handleDecisionApply}
              onDiversionApply={() => setShowDiversion(true)}
            />
          </div>
        </div>
      </div>
      {openIncident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setOpenIncidentId(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '88vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
              border: '1px solid var(--border-default)',
              padding: '20px',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Incident Detail - {openIncident.id}</h3>
              <button
                onClick={() => setOpenIncidentId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '8px', background: 'rgba(26,111,224,0.08)', border: '1px solid rgba(26,111,224,0.22)' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '4px' }}>LOCATION</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>{openIncident.location}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}>
                <div style={{ fontSize: '12px', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '8px' }}>ENRICHMENT FORM</div>
                {openIncident.enrichmentDetails ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', color: 'var(--text-primary)', fontSize: '14px' }}>
                    <div><strong>Confirmed Severity:</strong> {openIncident.enrichmentDetails.confirmedSeverity || '-'}</div>
                    <div><strong>Accident Type:</strong> {openIncident.enrichmentDetails.accidentType.join(', ') || '-'}</div>
                    <div><strong>Vehicles Involved:</strong> {openIncident.enrichmentDetails.vehiclesInvolved || '-'}</div>
                    <div><strong>Casualties:</strong> {openIncident.enrichmentDetails.casualties || '-'}</div>
                    <div><strong>Ambulance Required:</strong> {openIncident.enrichmentDetails.ambulanceRequired || '-'}</div>
                    <div><strong>Traffic Flow:</strong> {openIncident.enrichmentDetails.trafficFlow || '-'}</div>
                    <div><strong>Lane Blockage:</strong> {openIncident.enrichmentDetails.laneBlockage || '-'}</div>
                    <div><strong>Road Type:</strong> {openIncident.enrichmentDetails.roadType || '-'}</div>
                    <div><strong>Hazardous Material:</strong> {openIncident.enrichmentDetails.hazardousMaterial || '-'}</div>
                    <div><strong>GPS Coordinates:</strong> {openIncident.enrichmentDetails.gpsCoordinates || '-'}</div>
                    <div><strong>Officer Photos:</strong> {openIncident.enrichmentDetails.photoNames.length > 0 ? openIncident.enrichmentDetails.photoNames.join(', ') : '-'}</div>
                    <div><strong>Officer Notes:</strong> {openIncident.enrichmentDetails.officerNotes || '-'}</div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)' }}>No enrichment details submitted yet.</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
                  <div style={{ fontSize: '12px', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '8px' }}>REPORTER DETAILS</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6 }}>
                    <div><strong>Name:</strong> {openIncident.reporterName || '-'}</div>
                    <div><strong>Phone:</strong> {openIncident.reporterPhone || '-'}</div>
                    <div><strong>Original Description:</strong> {openIncident.reporterDescription || '-'}</div>
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(122,130,153,0.08)', border: '1px solid rgba(122,130,153,0.25)' }}>
                  <div style={{ fontSize: '12px', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '8px' }}>REPORTER PHOTO</div>
                  {openIncident.imageDataUrl ? (
                    <img
                      src={openIncident.imageDataUrl}
                      alt="Accident uploaded by reporter"
                      style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-default)' }}
                    />
                  ) : (
                    <div style={{ color: 'var(--text-secondary)' }}>No reporter photo available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <NewReportModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleNewReport} />
    </div>
  );
}
