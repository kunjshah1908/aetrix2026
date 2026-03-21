import { useState } from 'react';
import CopilotTab from './CopilotTab';
import DecisionLogTab from './DecisionLogTab';
import StatsTab from './StatsTab';
import { initialDecisionLog, type DecisionEntry } from '../data/staticData';

interface Props {
  selectedId: string;
}

export default function RightPanel({ selectedId }: Props) {
  const [activeTab, setActiveTab] = useState<'copilot' | 'declog' | 'stats'>('copilot');
  const [decisionLog] = useState<DecisionEntry[]>(initialDecisionLog);

  const tabs = [
    { key: 'copilot' as const, label: 'COPILOT' },
    { key: 'declog' as const, label: 'DEC LOG' },
    { key: 'stats' as const, label: 'STATS' },
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
        {activeTab === 'copilot' && <CopilotTab selectedId={selectedId} />}
        {activeTab === 'declog' && <DecisionLogTab entries={decisionLog} />}
        {activeTab === 'stats' && <StatsTab />}
      </div>
    </div>
  );
}
