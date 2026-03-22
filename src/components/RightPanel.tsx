import { useState } from 'react';
import CopilotTab from './CopilotTab';
import DecisionLogTab from './DecisionLogTab';
import StatsTab from './StatsTab';
import { initialDecisionLog, type DecisionEntry } from '../data/staticData';
import { Incident, Officer, type DecisionCardData } from '../data/staticData';
import { TrafficRow } from '../lib/types';

interface Props {
  selectedId: string;
  selectedIncident: Incident | null;
  incidents: Incident[];
  trafficSnapshot: TrafficRow[];
  nearestOfficer: { officer: Officer; distanceMetres: number; estimatedMinutes: number } | null;
  diversionRoadNames: string[];
  decisionLog: DecisionEntry[];
  onLiveDecisions: (decisions: DecisionCardData[]) => void;
}

export default function RightPanel({ selectedId, selectedIncident, incidents, trafficSnapshot, nearestOfficer, diversionRoadNames, decisionLog, onLiveDecisions }: Props) {
  const [activeTab, setActiveTab] = useState<'copilot' | 'declog' | 'stats'>('copilot');

  const tabs = [
    { key: 'copilot' as const, label: 'COPILOT' },
    { key: 'declog' as const, label: 'Decision Logs' },
    { key: 'stats' as const, label: 'Statistics' },
  ];

  return (
    <div className="right-panel">
      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'copilot' && (
          <CopilotTab 
            selectedId={selectedId} 
            selectedIncident={selectedIncident} 
            trafficSnapshot={trafficSnapshot} 
            nearestOfficer={nearestOfficer} 
            diversionRoadNames={diversionRoadNames} 
            onLiveDecisions={onLiveDecisions}
          />
        )}
        {activeTab === 'declog' && <DecisionLogTab entries={decisionLog} />}
        {activeTab === 'stats' && <StatsTab incidents={incidents} decisionLog={decisionLog} />}
      </div>
    </div>
  );
}
