import { useState } from 'react';
import DecisionCard from './DecisionCard';
import { decisionsForIncident, type DecisionEntry, type DecisionCardData } from '../data/staticData';

interface Props {
  selectedId: string;
  onDecisionApply: (entry: DecisionEntry) => void;
  onDiversionApply: () => void;
}

export default function DecisionsPanel({ selectedId, onDecisionApply, onDiversionApply }: Props) {
  const [appliedDecisions, setAppliedDecisions] = useState<Record<string, string>>({});
  const decisions = decisionsForIncident[selectedId] || [];

  const handleApplyDecision = (cardId: string, action: string) => {
    if (action === 'SKIP') {
      setAppliedDecisions(prev => ({ ...prev, [cardId]: 'skipped' }));
      return;
    }
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setAppliedDecisions(prev => ({ ...prev, [cardId]: ts }));

    const card = decisions.find(d => d.id === cardId);
    if (card) {
      onDecisionApply({
        id: `dl-${Date.now()}`,
        timestamp: ts,
        type: card.type,
        incidentId: selectedId,
        summary: card.body.substring(0, 80) + '...',
        operator: 'OPR Current',
      });
      if (card.type === 'DIVERSION ROUTE') onDiversionApply();
    }
  };

  const handleApplyAll = () => {
    decisions.forEach(card => {
      if (!appliedDecisions[card.id]) {
        handleApplyDecision(card.id, 'APPLY');
      }
    });
  };

  return (
    <div className="decisions-panel">
      <div className="section-header">ACTIONS & DECISIONS</div>
      <div className="decisions-list">
        {decisions.length === 0 ? (
          <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 12 }}>
            No decisions pending for {selectedId}.
          </div>
        ) : (
          <>
            <div className="decisions-incident-label">{selectedId}</div>
            {decisions.map(card => (
              <DecisionCard
                key={card.id}
                card={card}
                applied={!!appliedDecisions[card.id] && appliedDecisions[card.id] !== 'skipped'}
                appliedTime={appliedDecisions[card.id] || ''}
                onApply={(action) => handleApplyDecision(card.id, action)}
              />
            ))}
            <button className="apply-all-btn" onClick={handleApplyAll}>APPLY ALL</button>
          </>
        )}
      </div>
    </div>
  );
}
