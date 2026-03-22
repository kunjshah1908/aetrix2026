export interface TrafficRow {
  step: number;
  timestamp: string;
  roadId: string;
  roadName: string;
  speedKmh: number;
  occupancyPct: number;
  queueLength: number;
  signalPhase: 'GREEN' | 'YELLOW' | 'RED' | 'N/A';
  signalRemainingSeconds: number;
}