import { useCallback, useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import ReportsSidebar from '../components/ReportsSidebar';
import MapPanel from '../components/MapPanel';
import IncidentEnrichmentForm from '../components/IncidentEnrichmentForm';
import DecisionsPanel from '../components/DecisionsPanel';
import OrdersPanel from '../components/OrdersPanel';
import NewReportModal from '../components/NewReportModal';
import { type Incident, type Severity, initialDecisionLog, type DecisionEntry } from '../data/staticData';
import { getUserReports, removeUserReport, toIncidentFromUserReport, type UserReportRecord } from '../lib/reportDatabase';
import { getCommandCenterIncidents, onCommandCenterIncidentsUpdated } from '../lib/commandCenterIncidentStore';

export default function RegionalOfficerDashboard() {
  const [selectedId, setSelectedId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiversion, setShowDiversion] = useState(false);
  const [reports, setReports] = useState<Incident[]>([]);
  const [userReports, setUserReports] = useState<UserReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<UserReportRecord | null>(null);
  const [reportsError, setReportsError] = useState('');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [enrichmentTargetId, setEnrichmentTargetId] = useState<string | null>(null);
  const [verifiedReportIds, setVerifiedReportIds] = useState<string[]>([]);
  const [commandCenterIncidents, setCommandCenterIncidents] = useState<Incident[]>([]);
  const [submittedEnrichmentById, setSubmittedEnrichmentById] = useState<Record<string, {
    confirmedSeverity: 'Mild' | 'Moderate' | 'Extreme';
    confirmedAccidentType: string;
    enrichmentDetails: NonNullable<Incident['enrichmentDetails']>;
  }>>({});
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>(initialDecisionLog);
  const [officerBadge] = useState('OFC-03');
  
  const selectedIncident = reports.find((item) => item.id === selectedId);
  const enrichmentIncident = reports.find((item) => item.id === enrichmentTargetId);
  const selectedReportIncident = selectedReport ? reports.find((item) => item.id === selectedReport.id) : null;
  const selectedCommandCenterIncident = selectedReport ? commandCenterIncidents.find((item) => item.id === selectedReport.id) : null;
  const selectedSubmittedEnrichment = selectedReport ? submittedEnrichmentById[selectedReport.id] : undefined;
  const isSelectedReportVerified = selectedReport ? verifiedReportIds.includes(selectedReport.id) : false;
  const enrichmentFormId = enrichmentTargetId ? `verification-enrichment-form-${enrichmentTargetId}` : 'verification-enrichment-form';

  const refreshReports = useCallback(async () => {
    try {
      const storedReports = await getUserReports();
      setUserReports(storedReports);
      const incidentReports = storedReports.map(toIncidentFromUserReport);
      const visibleReports = incidentReports.filter((incident) => incident.status === 'ACTIVE' || incident.status === 'REPORTED');
      setReports(incidentReports);
      setReportsError('');
      setSelectedId((prev) => {
        if (visibleReports.length === 0) return '';
        if (prev && visibleReports.some((item) => item.id === prev)) return prev;
        return visibleReports[0].id;
      });
    } catch (error) {
      const fallbackMessage = 'Unable to load reports from backend. Check Vercel API deployment and Supabase environment variables.';
      if (error instanceof Error && error.message.trim()) {
        setReportsError(error.message);
        return;
      }
      setReportsError(fallbackMessage);
    }
  }, []);

  useEffect(() => {
    void refreshReports();
    const timer = window.setInterval(() => {
      void refreshReports();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [refreshReports]);

  useEffect(() => {
    const syncVerifiedIds = () => {
      const submittedToCommandCenter = getCommandCenterIncidents();
      setCommandCenterIncidents(submittedToCommandCenter);
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
    setVerifyMessage('Accident Verified and Sent to Command Center!');
    window.setTimeout(() => {
      setVerifyMessage('');
    }, 2500);
  };

  const handleOpenVerification = (id: string) => {
    setSelectedId(id);
    setEnrichmentTargetId(id);
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

  const handleEnrichmentSubmitted = (
    incidentId: string,
    submittedData?: {
      confirmedSeverity: 'Mild' | 'Moderate' | 'Extreme';
      confirmedAccidentType: string;
      enrichmentDetails: NonNullable<Incident['enrichmentDetails']>;
    }
  ) => {
    if (submittedData) {
      setSubmittedEnrichmentById((prev) => ({
        ...prev,
        [incidentId]: submittedData,
      }));
    }
    setVerifiedReportIds(prev => (prev.includes(incidentId) ? prev : [...prev, incidentId]));
    void refreshReports();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar showSensorsLive={false} />
      {reportsError && (
        <div style={{ padding: '10px 20px', background: '#fef2f2', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>
          {reportsError}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ width: '60%', minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-default)' }}>
          <div style={{ height: '60%', minHeight: 0 }}>
            <MapPanel
              incidents={reports}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showDiversion={showDiversion}
            />
          </div>
          <div style={{ height: '40%', minHeight: 0, padding: '12px', background: 'var(--bg-page)', borderTop: '1px solid var(--border-default)' }}>
            <div className="bottom-panel" style={{ height: '100%' }}>
              <ReportsSidebar
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpenReport={handleOpenReport}
                onVerification={handleOpenVerification}
                onReject={handleReject}
                verifiedReportIds={verifiedReportIds}
                reports={reports}
              />
            </div>
          </div>
        </div>
        <div style={{ width: '40%', minWidth: 0, padding: '12px', background: 'var(--bg-page)' }}>
          <div className="bottom-panel" style={{ height: '100%' }}>
            <OrdersPanel officerBadge={officerBadge} />
          </div>
        </div>
      </div>
      {enrichmentTargetId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 17, 29, 0.58)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1250,
            padding: '20px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setEnrichmentTargetId(null)}
        >
          <div
            className="clean-modal-scroll"
            style={{
              width: '100%',
              maxWidth: '940px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              borderRadius: '14px',
              border: 'none',
              boxShadow: '0 20px 42px rgba(2, 8, 23, 0.4)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
                background: 'linear-gradient(90deg, var(--accent-blue-light), var(--accent-blue))',
                borderBottom: '1px solid var(--accent-blue-dark)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '17px', letterSpacing: '0.02em' }}>Verification - Incident Enrichment Form</h3>
                <div style={{ marginTop: '4px', color: 'rgba(248,250,252,0.85)', fontSize: '12px' }}>Complete verification details before sending to command center</div>
              </div>
              <button
                onClick={() => setEnrichmentTargetId(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#f8fafc',
                  fontSize: '18px',
                  lineHeight: 1,
                  width: '30px',
                  height: '30px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '14px', background: 'linear-gradient(180deg, #f8fbff 0%, var(--bg-surface) 100%)' }}>
              <IncidentEnrichmentForm
                selectedId={enrichmentTargetId}
                selectedIncident={enrichmentIncident}
                formId={enrichmentFormId}
                hideSubmitButton
                onSubmitted={(incidentId, submittedData) => {
                  handleEnrichmentSubmitted(incidentId, submittedData);
                  handleVerify(incidentId);
                  setEnrichmentTargetId(null);
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '0 16px 16px' }}>
              <button
                onClick={() => setEnrichmentTargetId(null)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '999px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
              <button
                type="submit"
                form={enrichmentFormId}
                style={{
                  padding: '9px 14px',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 8px 18px rgba(37, 99, 235, 0.35)',
                }}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
      {verifyMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: '#ecfdf5',
              color: '#166534',
              border: '1px solid #86efac',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '14px',
              boxShadow: '0 10px 26px rgba(0,0,0,0.2)',
            }}
          >
            {verifyMessage}
          </div>
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
            background: 'rgba(9, 17, 29, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="clean-modal-scroll"
            style={{
              width: '100%',
              maxWidth: '760px',
              maxHeight: '88vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              borderRadius: '14px',
              boxShadow: '0 18px 40px rgba(2, 8, 23, 0.35)',
              border: 'none',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
                background: 'linear-gradient(90deg, var(--accent-blue-light), var(--accent-blue))',
                borderBottom: '1px solid var(--accent-blue-dark)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '17px', letterSpacing: '0.02em' }}>User Report Details</h3>
                <div style={{ marginTop: '4px', color: 'rgba(248,250,252,0.86)', fontSize: '12px' }}>Report ID: {selectedReport.id}</div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: '18px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: '#f8fafc',
                  width: '30px',
                  height: '30px',
                  borderRadius: '999px',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #dbeafe', background: '#f8fbff' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Reporter</div>
                  <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedReport.name}</div>
                  <div style={{ marginTop: '3px', fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedReport.phoneNumber}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #dbeafe', background: '#f8fbff' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Incident Status</div>
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: selectedReport.accidentType === 'Extreme' ? '#fee2e2' : selectedReport.accidentType === 'Minor' ? '#dcfce7' : '#fef3c7', color: selectedReport.accidentType === 'Extreme' ? '#b91c1c' : selectedReport.accidentType === 'Minor' ? '#166534' : '#a16207' }}>
                      {selectedReport.accidentType}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Elapsed: {selectedReportIncident?.elapsed || '00:00:00'}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-default)', background: '#ffffff' }}>
                <div style={{ marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Incident Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.45 }}>
                  <div><strong>Location:</strong> {selectedReport.location}</div>
                  <div><strong>Accident Point:</strong> {selectedReport.accidentPoint}</div>
                  <div><strong>Type:</strong> {selectedReport.accidentType}</div>
                  <div><strong>Report ID:</strong> {selectedReport.id}</div>
                </div>
                <div style={{ marginTop: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                  <strong>Description:</strong> {selectedReport.description}
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Uploaded Photo</div>
                <img
                  src={selectedReport.imageDataUrl}
                  alt="Reported accident"
                  style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-default)', boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)' }}
                />
              </div>

              {isSelectedReportVerified && (
                <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                  <div style={{ marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#166534' }}>Verification Decision</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', color: '#14532d', fontSize: '14px', lineHeight: 1.45 }}>
                    <div><strong>Status:</strong> Verified and Sent</div>
                    <div><strong>Confirmed Severity:</strong> {selectedSubmittedEnrichment?.confirmedSeverity || selectedCommandCenterIncident?.confirmedSeverity || selectedReport.confirmedSeverity || 'Not recorded'}</div>
                    <div><strong>Confirmed Type:</strong> {selectedSubmittedEnrichment?.confirmedAccidentType || selectedCommandCenterIncident?.confirmedAccidentType || selectedReport.confirmedAccidentType || selectedReport.accidentType}</div>
                    <div><strong>Vehicles Involved:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.vehiclesInvolved || selectedCommandCenterIncident?.enrichmentDetails?.vehiclesInvolved || selectedReport.enrichmentDetails?.vehiclesInvolved || 'Not recorded'}</div>
                    <div><strong>Casualties:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.casualties || selectedCommandCenterIncident?.enrichmentDetails?.casualties || selectedReport.enrichmentDetails?.casualties || 'Not recorded'}</div>
                    <div><strong>Ambulance Required:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.ambulanceRequired || selectedCommandCenterIncident?.enrichmentDetails?.ambulanceRequired || selectedReport.enrichmentDetails?.ambulanceRequired || 'Not recorded'}</div>
                    <div><strong>Traffic Flow:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.trafficFlow || selectedCommandCenterIncident?.enrichmentDetails?.trafficFlow || selectedReport.enrichmentDetails?.trafficFlow || 'Not recorded'}</div>
                    <div><strong>Lane Blockage:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.laneBlockage || selectedCommandCenterIncident?.enrichmentDetails?.laneBlockage || selectedReport.enrichmentDetails?.laneBlockage || 'Not recorded'}</div>
                    <div><strong>Road Type:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.roadType || selectedCommandCenterIncident?.enrichmentDetails?.roadType || selectedReport.enrichmentDetails?.roadType || 'Not recorded'}</div>
                    <div><strong>Hazardous Material:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.hazardousMaterial || selectedCommandCenterIncident?.enrichmentDetails?.hazardousMaterial || selectedReport.enrichmentDetails?.hazardousMaterial || 'Not recorded'}</div>
                    <div><strong>GPS Coordinates:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.gpsCoordinates || selectedCommandCenterIncident?.enrichmentDetails?.gpsCoordinates || selectedReport.enrichmentDetails?.gpsCoordinates || 'Not recorded'}</div>
                    <div><strong>Accident Types Selected:</strong> {(selectedSubmittedEnrichment?.enrichmentDetails?.accidentType?.length ? selectedSubmittedEnrichment.enrichmentDetails.accidentType : selectedCommandCenterIncident?.enrichmentDetails?.accidentType?.length ? selectedCommandCenterIncident.enrichmentDetails.accidentType : selectedReport.enrichmentDetails?.accidentType?.length ? selectedReport.enrichmentDetails.accidentType : []).length ? (selectedSubmittedEnrichment?.enrichmentDetails?.accidentType || selectedCommandCenterIncident?.enrichmentDetails?.accidentType || selectedReport.enrichmentDetails?.accidentType || []).join(', ') : 'Not recorded'}</div>
                    <div><strong>Uploaded Evidence:</strong> {(() => {
                      const files = selectedSubmittedEnrichment?.enrichmentDetails?.photoNames || selectedCommandCenterIncident?.enrichmentDetails?.photoNames || selectedReport.enrichmentDetails?.photoNames || [];
                      return files.length ? `${files.length} file(s)` : 'No additional files';
                    })()}</div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#166534' }}>
                    <strong>Officer Notes:</strong> {selectedSubmittedEnrichment?.enrichmentDetails?.officerNotes || selectedCommandCenterIncident?.enrichmentDetails?.officerNotes || selectedReport.enrichmentDetails?.officerNotes || 'No notes submitted'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <NewReportModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleNewReport} />
    </div>
  );
}