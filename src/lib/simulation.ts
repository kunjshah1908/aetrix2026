import { TrafficRow } from "./types";

let csvData: TrafficRow[] = [];
let currentStep = 0;

export async function loadSimulationData(): Promise<void> {
const response = await fetch('/traffic_simulation.csv');  const text = await response.text();
  const lines = text.trim().split('\n');
  
  // skip header
  csvData = lines.slice(1).map(line => {
    const [step, timestamp, road_id, road_name, speed_kmh, occupancy_pct, queue_length, signal_phase, signal_remaining] = line.split(',');
    return {
      step: parseInt(step),
      timestamp,
      roadId: road_id,
      roadName: road_name.replace(/"/g, ''),
      speedKmh: parseInt(speed_kmh),
      occupancyPct: parseInt(occupancy_pct),
      queueLength: parseInt(queue_length),
      signalPhase: signal_phase as 'GREEN' | 'YELLOW' | 'RED' | 'N/A',
      signalRemainingSeconds: parseInt(signal_remaining),
    };
  });
}

export function getCurrentSnapshot(): TrafficRow[] {
  const TOTAL_STEPS = 180;
  const step = currentStep % TOTAL_STEPS;
  return csvData.filter(row => row.step === step);
}

export function advanceStep(): void {
  currentStep = (currentStep + 1) % 180;
}

export function getRoadData(roadName: string): TrafficRow | undefined {
  const snapshot = getCurrentSnapshot();
  return snapshot.find(r => r.roadName === roadName);
}