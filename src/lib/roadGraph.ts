export interface Node {
  id: string;
  lat: number;
  lon: number;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  distance: number;
  name: string;
  highway: string;
  speedLimit: number;
}

export interface RoadGraph {
  nodes: Map<string, Node>;
  edges: Edge[];
  adjacency: Map<string, { nodeId: string; edge: Edge }[]>;
}

function coordId(lon: number, lat: number): string {
  return `${lon.toFixed(6)},${lat.toFixed(6)}`;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
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

function speedLimitFromHighway(highway: string): number {
  const speeds: Record<string, number> = {
    motorway: 100,
    trunk: 80,
    primary: 60,
    secondary: 50,
    tertiary: 40,
    residential: 30,
    service: 20,
    unclassified: 30,
  };
  return speeds[highway] ?? 30;
}

export function buildRoadGraph(geojson: any): RoadGraph {
  const nodes = new Map<string, Node>();
  const edges: Edge[] = [];
  const adjacency = new Map<string, { nodeId: string; edge: Edge }[]>();

  const features = geojson.features as any[];

  for (const feature of features) {
    if (feature.geometry?.type !== 'LineString') continue;

    const coords: [number, number][] = feature.geometry.coordinates;
    const props = feature.properties || {};
    const highway = props.highway || 'unclassified';
    const name = props.name || props.ref || highway;
    const speedLimit = speedLimitFromHighway(highway);

    // register all nodes
    for (const [lon, lat] of coords) {
      const id = coordId(lon, lat);
      if (!nodes.has(id)) {
        nodes.set(id, { id, lat, lon });
        adjacency.set(id, []);
      }
    }

    // create edges between consecutive coordinate pairs
    for (let i = 0; i < coords.length - 1; i++) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];
      const fromId = coordId(lon1, lat1);
      const toId = coordId(lon2, lat2);
      const distance = haversineDistance(lat1, lon1, lat2, lon2);

      const edgeId = `${feature.id}-${i}`;

      const edge: Edge = {
        id: edgeId,
        from: fromId,
        to: toId,
        distance,
        name,
        highway,
        speedLimit,
      };

      edges.push(edge);

      // bidirectional — most roads in OSM are two-way unless tagged oneway
      const oneway = props.oneway === 'yes';

      adjacency.get(fromId)!.push({ nodeId: toId, edge });
      if (!oneway) {
        const reverseEdge: Edge = { ...edge, id: edgeId + '-r', from: toId, to: fromId };
        adjacency.get(toId)!.push({ nodeId: fromId, edge: reverseEdge });
      }
    }
  }

  return { nodes, edges, adjacency };
}

export function findNearestNode(
  graph: RoadGraph,
  lat: number,
  lon: number
): string | null {
  let nearest: string | null = null;
  let minDist = Infinity;

  for (const [id, node] of graph.nodes) {
    const d = haversineDistance(lat, lon, node.lat, node.lon);
    if (d < minDist) {
      minDist = d;
      nearest = id;
    }
  }

  return nearest;
}

export function dijkstra(
  graph: RoadGraph,
  startId: string,
  endId: string,
  costFn?: (edge: Edge) => number
): { path: string[]; totalDistance: number } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const queue: { id: string; cost: number }[] = [];

  for (const id of graph.nodes.keys()) dist.set(id, Infinity);
  dist.set(startId, 0);
  queue.push({ id: startId, cost: 0 });

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const { id: current } = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === endId) break;

    for (const { nodeId, edge } of graph.adjacency.get(current) || []) {
      if (visited.has(nodeId)) continue;
      const edgeCost = costFn ? costFn(edge) : edge.distance;
      const newDist = dist.get(current)! + edgeCost;
      if (newDist < dist.get(nodeId)!) {
        dist.set(nodeId, newDist);
        prev.set(nodeId, current);
        queue.push({ id: nodeId, cost: newDist });
      }
    }
  }

  if (dist.get(endId) === Infinity) return null;

  const path: string[] = [];
  let cur: string | undefined = endId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur);
  }

  return { path, totalDistance: dist.get(endId)! };
}
