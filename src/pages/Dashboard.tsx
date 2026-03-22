import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import MapPanel from '../components/MapPanel';
import RightPanel from '../components/RightPanel';
import DecisionsPanel from '../components/DecisionsPanel';
import NewReportModal from '../components/NewReportModal';
import { type Incident, type Severity, initialDecisionLog, type DecisionEntry, officers, type DecisionCardData } from '../data/staticData';
import { getCommandCenterIncidents, onCommandCenterIncidentsUpdated, upsertCommandCenterIncident } from '../lib/commandCenterIncidentStore';
import { getUserReports, markReportSolved, toIncidentFromUserReport } from '../lib/reportDatabase';
import { getSupabaseAuthClient } from '../lib/supabaseClient';
import { loadSimulationData, getCurrentSnapshot, advanceStep } from '../lib/simulation';
import { findNearestAvailableOfficer, computeDiversionRoute } from '../lib/algorithms';
import { buildRoadGraph, type RoadGraph } from '../lib/roadGraph';
import { type TrafficRow } from '../lib/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiversion, setShowDiversion] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>(initialDecisionLog);

  // Simulation & traffic state (from your version)
  const [trafficSnapshot, setTrafficSnapshot] = useState<TrafficRow[]>([]);
  const [roadGraph, setRoadGraph] = useState<RoadGraph | null>(null);
  const [nearestOfficer, setNearestOfficer] = useState<ReturnType<typeof findNearestAvailableOfficer>>(null);
  const [diversionRoadNames, setDiversionRoadNames] = useState<string[]>([]);
  const [liveDecisions, setLiveDecisions] = useState<DecisionCardData[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Incident enrichment logic (from your friend's version)
  const openIncident = incidents.find((incident) => incident.id === openIncidentId) || null;
  const selectedIncident = incidents.find(i => i.id === selectedId) || null;
  const openIncidentEnrichment = openIncident?.enrichmentDetails;
  const openIncidentAccidentTypes = openIncidentEnrichment?.accidentType?.filter(Boolean) || (openIncident?.confirmedAccidentType ? [openIncident.confirmedAccidentType] : []);
  const openIncidentHasEnrichment = Boolean(
    openIncidentEnrichment ||
    openIncident?.confirmedSeverity ||
    openIncidentAccidentTypes.length > 0 ||
    openIncident?.description,
  );
  const mapRef = useRef<HTMLDivElement>(null);

  // Incident refresh logic (from your friend's version)
  const refreshIncidents = useCallback(async () => {
    try {
      const reports = await getUserReports();
      const baseIncidents = reports.map(toIncidentFromUserReport);
      const visibleIncidents = baseIncidents.filter((incident) => incident.status === 'ACTIVE' || incident.status === 'REPORTED');

      setIncidents(baseIncidents);
      setSelectedId((prev) => {
        if (visibleIncidents.length === 0) return '';
        if (prev && visibleIncidents.some((item) => item.id === prev)) return prev;
        return visibleIncidents[0].id;
      });
    } catch {
      setIncidents([]);
    }
  }, []);

  // Use both refreshIncidents and command center store for robustness
  useEffect(() => {
    void refreshIncidents();
    const timer = window.setInterval(() => {
      void refreshIncidents();
    }, 2000);

    // Also listen to command center store updates
    const unsubscribe = onCommandCenterIncidentsUpdated(() => {
      const stored = getCommandCenterIncidents();
      setIncidents(stored);
      if (stored.length > 0 && !stored.some((item) => item.id === selectedId)) {
        setSelectedId(stored[0].id);
      }
    });

    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [refreshIncidents, selectedId]);

  // Simulation/traffic logic (from your version)
  useEffect(() => {
    async function init() {
      await loadSimulationData();
      setTrafficSnapshot(getCurrentSnapshot());
      const res = await fetch('/gandhinagar.geojson');
      const geoJSON = await res.json();
      const graph = buildRoadGraph(geoJSON);
      setRoadGraph(graph);
    }
    init();
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      advanceStep();
      setTrafficSnapshot(getCurrentSnapshot());
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!selectedIncident || !roadGraph) return;
    const nearest = findNearestAvailableOfficer(selectedIncident, officers);
    setNearestOfficer(nearest);
    const destLat = selectedIncident.lat + 0.009;
    const destLng = selectedIncident.lng + 0.009;
    const diversion = computeDiversionRoute(roadGraph, selectedIncident.lat, selectedIncident.lng, destLat, destLng);
    setDiversionRoadNames(diversion?.roadNames || []);
  }, [selectedId, trafficSnapshot, roadGraph]);

  // Handlers from both versions
  const handleDecisionApply = (entry: DecisionEntry) => {
    const updated = addDecisionEntry(entry);
    setDecisionLog(updated);

    // Also create a command order for regional officers
    addCommandOrder({
      id: entry.id,
      timestamp: entry.timestamp,
      decisionType: entry.type,
      incidentId: entry.incidentId,
      summary: entry.summary,
      operator: entry.operator,
      status: 'PENDING',
    });
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

  const handleMarkSolved = async (incidentId: string) => {
    try {
      await markReportSolved(incidentId);
      if (openIncidentId === incidentId) {
        setOpenIncidentId(null);
      }
      await refreshIncidents();
    } catch {
      alert('Unable to mark this incident as solved. Please try again.');
    }
  };

  return (
    <div className="dashboard-page">
      <Topbar onLogout={handleLogout} />
      <div className="dashboard-layout">
        <div className="dashboard-top">
          <MapPanel
            incidents={incidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showDiversion={showDiversion}
            showReportedMarkers={false}
          />
          <RightPanel
            selectedId={selectedId}
            selectedIncident={selectedIncident}
            trafficSnapshot={trafficSnapshot}
            nearestOfficer={nearestOfficer}
            diversionRoadNames={diversionRoadNames}
            onLiveDecisions={setLiveDecisions}
          />
        </div>
        <div className="dashboard-bottom">
          <div className="dashboard-bottom-left bottom-panel">
            <Sidebar
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenIncident={setOpenIncidentId}
              onMarkSolved={handleMarkSolved}
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
              liveDecisions={liveDecisions}
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
                {openIncidentHasEnrichment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc' }}>
                        Confirmed Severity: {openIncidentEnrichment?.confirmedSeverity || openIncident?.confirmedSeverity || '-'}
                      </span>
                      {openIncidentAccidentTypes.map((type) => (
                        <span key={type} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                          {type}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', color: 'var(--text-primary)', fontSize: '14px' }}>
                      <div><strong>Vehicles Involved:</strong> {openIncidentEnrichment?.vehiclesInvolved || '-'}</div>
                      <div><strong>Casualties:</strong> {openIncidentEnrichment?.casualties || '-'}</div>
                      <div><strong>Ambulance Required:</strong> {openIncidentEnrichment?.ambulanceRequired || '-'}</div>
                      <div><strong>Traffic Flow:</strong> {openIncidentEnrichment?.trafficFlow || '-'}</div>
                      <div><strong>Lane Blockage:</strong> {openIncidentEnrichment?.laneBlockage || '-'}</div>
                      <div><strong>Road Type:</strong> {openIncidentEnrichment?.roadType || '-'}</div>
                      <div><strong>Hazardous Material:</strong> {openIncidentEnrichment?.hazardousMaterial || '-'}</div>
                      <div><strong>GPS Coordinates:</strong> {openIncidentEnrichment?.gpsCoordinates || '-'}</div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(22,163,74,0.2)', paddingTop: '10px' }}>
                      <div style={{ fontSize: '12px', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '6px' }}>OFFICER NOTES</div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {openIncidentEnrichment?.officerNotes || openIncident?.description || '-'}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(22,163,74,0.2)', paddingTop: '10px' }}>
                      <div style={{ fontSize: '12px', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '6px' }}>OFFICER PHOTO UPDATES</div>
                      {openIncidentEnrichment?.photoNames && openIncidentEnrichment.photoNames.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {openIncidentEnrichment.photoNames.map((photoName) => (
                            <span key={photoName} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '999px', fontSize: '12px', background: 'rgba(122,130,153,0.14)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                              {photoName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No officer photo updates were submitted.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)' }}>Enrichment details are not available for this incident yet.</div>
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