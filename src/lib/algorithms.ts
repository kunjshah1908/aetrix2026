import { RoadGraph, findNearestNode, dijkstra } from './roadGraph';
import { Officer, Incident } from '../data/staticData';

// ── HAVERSINE (straight line distance in metres) ──────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── NEAREST OFFICER DISPATCH ──────────────────────────────────────
export interface OfficerDispatchResult {
  officer: Officer;
  distanceMetres: number;
  estimatedMinutes: number;
}

export function findNearestAvailableOfficer(
  incident: Incident,
  officers: Officer[]
): OfficerDispatchResult | null {
  const available = officers.filter(o => o.status !== 'OFFLINE');

  if (available.length === 0) return null;

  let nearest: Officer | null = null;
  let minDist = Infinity;

  for (const officer of available) {
    const d = haversine(incident.lat, incident.lng, officer.lat, officer.lng);
    if (d < minDist) {
      minDist = d;
      nearest = officer;
    }
  }

  if (!nearest) return null;

  // assume average speed of 40 km/h in city
  const estimatedMinutes = Math.round((minDist / 1000 / 40) * 60);

  return {
    officer: nearest,
    distanceMetres: Math.round(minDist),
    estimatedMinutes,
  };
}

// ── DIVERSION ROUTING ─────────────────────────────────────────────
export interface DiversionResult {
  pathCoordinates: [number, number][];   // [lat, lng] pairs for Leaflet polyline
  roadNames: string[];                   // human readable road names along path
  totalDistanceMetres: number;
  estimatedMinutes: number;
}

export function computeDiversionRoute(
  graph: RoadGraph,
  incidentLat: number,
  incidentLng: number,
  destinationLat: number,
  destinationLng: number
): DiversionResult | null {
  // find nearest graph nodes to incident and destination
  const startNode = findNearestNode(graph, incidentLat, incidentLng);
  const endNode = findNearestNode(graph, destinationLat, destinationLng);

  if (!startNode || !endNode) return null;
  if (startNode === endNode) return null;

  const result = dijkstra(graph, startNode, endNode);
  if (!result) return null;

  // convert node IDs back to lat/lng coordinates for the map polyline
  const pathCoordinates: [number, number][] = result.path.map(nodeId => {
    const node = graph.nodes.get(nodeId)!;
    return [node.lat, node.lon];
  });

  // collect road names along the path
  const roadNameSet = new Set<string>();
  for (let i = 0; i < result.path.length - 1; i++) {
    const fromId = result.path[i];
    const toId = result.path[i + 1];
    const neighbors = graph.adjacency.get(fromId) || [];
    const edge = neighbors.find(n => n.nodeId === toId);
    if (edge?.edge.name) roadNameSet.add(edge.edge.name);
  }

  // assume average city speed 35 km/h for diversion route
  const estimatedMinutes = Math.round((result.totalDistance / 1000 / 35) * 60);

  return {
    pathCoordinates,
    roadNames: Array.from(roadNameSet),
    totalDistanceMetres: Math.round(result.totalDistance),
    estimatedMinutes,
  };
}