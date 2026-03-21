export type Severity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';
export type IncidentStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED' | 'REPORTED';

export interface Incident {
  id: string;
  location: string;
  severity: Severity;
  elapsed: string;
  status: IncidentStatus;
  lat: number;
  lng: number;
  type: string;
}

export interface Officer {
  badge: string;
  name: string;
  subarea: string;
  status: 'ON-SCENE' | 'PATROLLING' | 'OFFLINE';
  lastSeen: string;
  lat: number;
  lng: number;
}

export interface ChatMessage {
  role: 'user' | 'copilot';
  timestamp: string;
  text: string;
}

export interface DecisionEntry {
  id: string;
  timestamp: string;
  type: string;
  incidentId: string;
  summary: string;
  operator: string;
}

export const activeIncidents: Incident[] = [
  { id: 'INC-0041', location: 'Infocity Circle · Sector 11', severity: 'CRITICAL', elapsed: '00:12:34', status: 'ACTIVE', lat: 23.2156, lng: 72.6369, type: 'COLLISION' },
  { id: 'INC-0040', location: 'Gandhinagar Bus Stand · Sector 7', severity: 'MODERATE', elapsed: '00:31:05', status: 'ACTIVE', lat: 23.2230, lng: 72.6500, type: 'BREAKDOWN' },
  { id: 'INC-0038', location: 'CH-0 / SG Highway Junction', severity: 'MINOR', elapsed: '01:02:18', status: 'ACTIVE', lat: 23.2080, lng: 72.6280, type: 'DEBRIS' },
];

export const resolvedIncidents = [
  { id: 'INC-0037', time: '09:14', clearTime: '28m' },
  { id: 'INC-0036', time: '07:55', clearTime: '14m' },
];

export const officers: Officer[] = [
  { badge: 'OFC-07', name: 'Ravi Mehta', subarea: 'Sector 11-12', status: 'ON-SCENE', lastSeen: '14:24', lat: 23.2170, lng: 72.6380 },
  { badge: 'OFC-12', name: 'Priya Sharma', subarea: 'Sector 7-8', status: 'ON-SCENE', lastSeen: '14:20', lat: 23.2235, lng: 72.6510 },
  { badge: 'OFC-03', name: 'Amit Patel', subarea: 'SG Highway N', status: 'PATROLLING', lastSeen: '14:18', lat: 23.2100, lng: 72.6300 },
  { badge: 'OFC-15', name: 'Kavita Desai', subarea: 'CH-0 Corridor', status: 'PATROLLING', lastSeen: '14:15', lat: 23.2060, lng: 72.6250 },
  { badge: 'OFC-09', name: 'Suresh Nair', subarea: 'Sector 21', status: 'OFFLINE', lastSeen: '12:45', lat: 23.2200, lng: 72.6600 },
];

export const ambulances = [
  { id: 'AMB-02', lat: 23.2180, lng: 72.6400 },
  { id: 'AMB-05', lat: 23.2250, lng: 72.6450 },
];

export const chatHistories: Record<string, ChatMessage[]> = {
  'INC-0041': [
    { role: 'user', timestamp: '14:25:10', text: 'Assess INC-0041 and recommend immediate actions.' },
    { role: 'copilot', timestamp: '14:25:14', text: 'Multi-vehicle collision at Infocity Circle. 3 of 4 lanes blocked. Sensor data shows queue extending 400m north on SG Highway. Recommended actions: (1) Divert NH-8 inbound via Sector 11 Rd, (2) Extend N→S green phase at Node 41C by 35s, (3) Dispatch OFC-07 from Sector 12 to scene, (4) Stage Unit AMB-02 at Infocity overpass. Confidence: HIGH on signal and diversion. REVIEW required before alert dispatch.' },
  ],
  'INC-0040': [
    { role: 'user', timestamp: '14:10:02', text: 'Assess INC-0040 current status.' },
    { role: 'copilot', timestamp: '14:10:06', text: 'Bus breakdown at Gandhinagar Bus Stand, Sector 7. Single lane blocked. Traffic flow moderate. OFC-12 on scene managing diversion. Tow unit dispatched, ETA 15 min. No signal changes recommended at this time.' },
  ],
  'INC-0038': [
    { role: 'user', timestamp: '13:45:30', text: 'Report on debris at CH-0 junction.' },
    { role: 'copilot', timestamp: '13:45:34', text: 'Scattered debris on CH-0 / SG Highway merge lane. Minimal obstruction. OFC-03 patrolling area. Municipal cleanup crew notified. Estimated clearance: 20 min. No diversion necessary.' },
  ],
};

export interface DecisionCardData {
  id: string;
  type: string;
  confidence: 'HIGH' | 'REVIEW';
  body: string;
  actions: string[];
}

export const decisionsForIncident: Record<string, DecisionCardData[]> = {
  'INC-0041': [
    { id: 'd1', type: 'SIGNAL RE-TIMING', confidence: 'HIGH', body: 'Node 41C: N→S green +35s, E→W reduce to 20s. Node 38B: +25s green on approach from Sector 11.', actions: ['APPLY', 'SKIP'] },
    { id: 'd2', type: 'DIVERSION ROUTE', confidence: 'HIGH', body: 'Activate: SG Hwy → Sector 11 Rd → CH-1 → re-merge at Infocity N. Est. delay reduction: 8 min.', actions: ['APPLY', 'SKIP'] },
    { id: 'd3', type: 'PUBLIC ALERT', confidence: 'REVIEW', body: 'Twitter: TRAFFIC ALERT: Accident at Infocity Circle. Use Sector 11 Rd as alternate. #GandhinagarTraffic — SMS: Accident Infocity Circle. Take Sector 11 Rd alt. Delays expected.', actions: ['POST TWITTER', 'SEND SMS', 'SKIP'] },
  ],
  'INC-0040': [],
  'INC-0038': [],
};

export const diversionRoute = [
  [23.2156, 72.6369],
  [23.2180, 72.6350],
  [23.2210, 72.6320],
  [23.2240, 72.6340],
  [23.2260, 72.6370],
] as [number, number][];

export const initialDecisionLog: DecisionEntry[] = [
  { id: 'dl1', timestamp: '14:12:03', type: 'SIGNAL RE-TIMING', incidentId: 'INC-0039', summary: 'Node 38B: Extended N→S green by 20s during peak diversion.', operator: 'OPR Deshmukh' },
  { id: 'dl2', timestamp: '13:48:11', type: 'DIVERSION ROUTE', incidentId: 'INC-0039', summary: 'Activated CH-1 → Sector 9 alternate for SG Hwy southbound.', operator: 'OPR Deshmukh' },
  { id: 'dl3', timestamp: '12:30:45', type: 'OFFICER DEPLOY', incidentId: 'INC-0037', summary: 'Dispatched OFC-03 to Sector 21 for crowd management.', operator: 'OPR Joshi' },
  { id: 'dl4', timestamp: '11:05:22', type: 'PUBLIC ALERT', incidentId: 'INC-0037', summary: 'SMS alert dispatched to 4,200 subscribers in Sector 21 zone.', operator: 'OPR Joshi' },
  { id: 'dl5', timestamp: '09:45:10', type: 'SIGNAL RE-TIMING', incidentId: 'INC-0036', summary: 'Node 22A: Reverted to default timing after incident clearance.', operator: 'OPR Mehta' },
  { id: 'dl6', timestamp: '08:15:33', type: 'DIVERSION ROUTE', incidentId: 'INC-0036', summary: 'Deactivated Sector 5 bypass route. Normal flow restored.', operator: 'OPR Mehta' },
];

export const historyData: Array<{
  id: string; timestamp: string; location: string; type: string;
  severity: Severity; duration: string; status: IncidentStatus;
  officer: string; decisions: number;
}> = [
  { id: 'INC-0041', timestamp: '2024-01-15 14:12', location: 'Infocity Circle · Sector 11', type: 'COLLISION', severity: 'CRITICAL', duration: '00:12:34', status: 'ACTIVE', officer: 'OFC-07', decisions: 3 },
  { id: 'INC-0040', timestamp: '2024-01-15 13:41', location: 'Gandhinagar Bus Stand · Sector 7', type: 'BREAKDOWN', severity: 'MODERATE', duration: '00:31:05', status: 'ACTIVE', officer: 'OFC-12', decisions: 1 },
  { id: 'INC-0039', timestamp: '2024-01-15 12:08', location: 'Sector 9 · Kudasan Road', type: 'COLLISION', severity: 'MAJOR', duration: '01:44:22', status: 'RESOLVED', officer: 'OFC-03', decisions: 4 },
  { id: 'INC-0038', timestamp: '2024-01-15 11:10', location: 'CH-0 / SG Highway Junction', type: 'DEBRIS', severity: 'MINOR', duration: '01:02:18', status: 'ACTIVE', officer: 'OFC-15', decisions: 0 },
  { id: 'INC-0037', timestamp: '2024-01-15 09:14', location: 'Sector 21 · Infocity Gate', type: 'PEDESTRIAN', severity: 'MAJOR', duration: '00:28:00', status: 'RESOLVED', officer: 'OFC-03', decisions: 2 },
  { id: 'INC-0036', timestamp: '2024-01-15 07:55', location: 'Sector 5 · Pethapur Road', type: 'COLLISION', severity: 'MODERATE', duration: '00:14:00', status: 'RESOLVED', officer: 'OFC-09', decisions: 2 },
  { id: 'INC-0035', timestamp: '2024-01-14 22:30', location: 'Adalaj Circle · NH-8', type: 'ROLLOVER', severity: 'CRITICAL', duration: '00:52:10', status: 'RESOLVED', officer: 'OFC-07', decisions: 5 },
  { id: 'INC-0034', timestamp: '2024-01-14 19:15', location: 'Raksha Shakti Circle', type: 'COLLISION', severity: 'MAJOR', duration: '00:38:45', status: 'RESOLVED', officer: 'OFC-12', decisions: 3 },
  { id: 'INC-0033', timestamp: '2024-01-14 16:44', location: 'Sector 28 · GIFT City Rd', type: 'BREAKDOWN', severity: 'MINOR', duration: '00:22:15', status: 'RESOLVED', officer: 'OFC-15', decisions: 1 },
  { id: 'INC-0032', timestamp: '2024-01-14 14:20', location: 'Koba Circle · SG Highway', type: 'DEBRIS', severity: 'MINOR', duration: '00:18:30', status: 'DISMISSED', officer: 'OFC-03', decisions: 0 },
  { id: 'INC-0031', timestamp: '2024-01-14 11:05', location: 'Sargasan Cross · Sector 7', type: 'PEDESTRIAN', severity: 'MODERATE', duration: '00:25:40', status: 'RESOLVED', officer: 'OFC-09', decisions: 2 },
  { id: 'INC-0030', timestamp: '2024-01-14 08:30', location: 'Sector 1 · Sachivalaya Rd', type: 'COLLISION', severity: 'MAJOR', duration: '00:45:00', status: 'RESOLVED', officer: 'OFC-07', decisions: 4 },
];

export const templateQueries: Record<string, (id: string) => string> = {
  'ASSESS + RECOMMEND': (id) => `Assess ${id} and recommend immediate actions.`,
  'SIGNAL RE-TIMING': (id) => `Recommend updated signal timing for intersections near ${id}.`,
  'DRAFT PUBLIC ALERT': (id) => `Generate Twitter and SMS alert text for ${id}.`,
  'AMBULANCE ROUTE': (id) => `Recommend fastest ambulance route to ${id} from nearest unit.`,
  'OFFICER REDEPLOY': (id) => `Assess current officer deployment and recommend redeployment for ${id}.`,
  'SHIFT BRIEFING': (_id) => `Generate shift handover briefing for all active incidents.`,
};
