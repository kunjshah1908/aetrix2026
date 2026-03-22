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
  trafficSnapshot: TrafficRow[];
  nearestOfficer: { officer: Officer; distanceMetres: number; estimatedMinutes: number } | null;
  diversionRoadNames: string[];
  onLiveDecisions: (decisions: DecisionCardData[]) => void;
  decisionLog: DecisionEntry[];
  incidents: Incident[];
}

export default function RightPanel({ selectedId, selectedIncident, trafficSnapshot, nearestOfficer, diversionRoadNames, onLiveDecisions, decisionLog, incidents }: Props) {
  const [activeTab, setActiveTab] = useState<'copilot' | 'decision-log' | 'statistics'>('copilot');

  const tabs = [
    { key: 'copilot' as const, label: 'COPILOT' },
    { key: 'decision-log' as const, label: 'Decision Logs' },
    { key: 'statistics' as const, label: 'Statistics' },
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
        {activeTab === 'decision-log' && <DecisionLogTab entries={decisionLog} />}
        {activeTab === 'statistics' && <StatsTab incidents={incidents} decisionLog={decisionLog} />}
      </div>
    </div>
  );
}
