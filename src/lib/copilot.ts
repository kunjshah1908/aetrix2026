import { Incident, Officer, officers, ambulances } from '../data/staticData';
import { TrafficRow } from './types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are TRAFFICAI, the AI copilot for Gandhinagar Traffic Police Central Command. You receive live incident data, real-time traffic sensor readings, officer positions, and signal states.

You must respond with ONLY a valid JSON object in exactly this structure, no markdown, no backticks, no explanation:

{
  "narrative": "2-3 sentence plain English assessment of the current situation",
  "signal_retiming": {
    "decisions": ["specific instruction for each intersection"],
    "confidence": "HIGH or REVIEW"
  },
  "diversion_route": {
    "steps": ["turn by turn road names forming the diversion"],
    "estimated_delay_reduction": "X min",
    "confidence": "HIGH or REVIEW"
  },
  "officer_orders": [
    {
      "badge": "OFC-XX",
      "name": "officer name",
      "instruction": "specific order",
      "priority": "URGENT or STANDARD"
    }
  ],
  "public_alert": {
    "twitter": "max 280 chars, include location and alternate route and #GandhinagarTraffic",
    "sms": "max 160 chars, plain text only",
    "confidence": "HIGH or REVIEW"
  },
  "incident_narrative": "one paragraph summary for the audit log"
}`;

function buildContext(
  incident: Incident,
  trafficSnapshot: TrafficRow[],
  nearestOfficer: { officer: Officer; distanceMetres: number; estimatedMinutes: number } | null,
  diversionRoadNames: string[]
): string {
  const availableOfficers = officers.filter(o => o.status !== 'OFFLINE');

  const trafficLines = trafficSnapshot
    .map(r => `  - ${r.roadName}: ${r.speedKmh} km/h, occupancy ${r.occupancyPct}%, queue ${r.queueLength} vehicles, signal ${r.signalPhase} (${r.signalRemainingSeconds}s remaining)`)
    .join('\n');

  const officerLines = availableOfficers
    .map(o => `  - ${o.badge} ${o.name}: ${o.subarea}, status ${o.status}, last seen ${o.lastSeen}`)
    .join('\n');

  const ambulanceLines = ambulances
    .map(a => `  - ${a.id}: lat ${a.lat}, lng ${a.lng}`)
    .join('\n');

  const diversionText = diversionRoadNames.length > 0
    ? diversionRoadNames.join(' → ')
    : 'No diversion computed yet';

  const nearestText = nearestOfficer
    ? `${nearestOfficer.officer.badge} ${nearestOfficer.officer.name} — ${nearestOfficer.distanceMetres}m away, ETA ${nearestOfficer.estimatedMinutes} min`
    : 'No available officers';

  return `
INCIDENT:
  ID: ${incident.id}
  Location: ${incident.location}
  Coordinates: ${incident.lat}, ${incident.lng}
  Severity: ${incident.severity}
  Type: ${incident.type}
  Status: ${incident.status}
  Time elapsed: ${incident.elapsed}
  ${incident.description ? `Civilian description: ${incident.description}` : ''}
  ${incident.enrichmentDetails ? `Officer notes: ${incident.enrichmentDetails.officerNotes}` : ''}
  ${incident.enrichmentDetails ? `Lane blockage: ${incident.enrichmentDetails.laneBlockage}` : ''}
  ${incident.enrichmentDetails ? `Casualties: ${incident.enrichmentDetails.casualties}` : ''}
  ${incident.enrichmentDetails ? `Ambulance required: ${incident.enrichmentDetails.ambulanceRequired}` : ''}

LIVE TRAFFIC SENSOR DATA:
${trafficLines}

NEAREST AVAILABLE OFFICER:
  ${nearestText}

ALGORITHM-COMPUTED DIVERSION PATH:
  ${diversionText}

ALL AVAILABLE OFFICERS:
${officerLines}

AMBULANCE UNITS:
${ambulanceLines}
  `;
}

export async function queryCopilot(
  userMessage: string,
  incident: Incident,
  trafficSnapshot: TrafficRow[],
  nearestOfficer: { officer: Officer; distanceMetres: number; estimatedMinutes: number } | null,
  diversionRoadNames: string[]
): Promise<any> {
  const context = buildContext(incident, trafficSnapshot, nearestOfficer, diversionRoadNames);

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `CURRENT SITUATION CONTEXT:\n${context}\n\nOPERATOR QUERY: ${userMessage}` }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.choices[0].message.content;

  const cleaned = rawText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      narrative: rawText,
      signal_retiming: null,
      diversion_route: null,
      officer_orders: [],
      public_alert: null,
      incident_narrative: rawText
    };
  }
}