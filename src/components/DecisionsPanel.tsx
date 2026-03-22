import { useState } from 'react';
import DecisionCard from './DecisionCard';
import { type DecisionEntry, type DecisionCardData } from '../data/staticData';

interface Props {
  selectedId: string;
  decisions: DecisionCardData[];
  onDecisionApply: (entry: DecisionEntry) => void;
  onDiversionApply: () => void;
}

export default function DecisionsPanel({ selectedId, decisions = [], onDecisionApply, onDiversionApply }: Props) {
  const [appliedDecisions, setAppliedDecisions] = useState<Record<string, string>>({});


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
      <div className="section-header section-header-with-actions">
        <span>ACTIONS & DECISIONS</span>
        <button
          className="section-header-btn"
          onClick={handleApplyAll}
          disabled={decisions.length === 0}
        >
          APPLY ALL
        </button>
      </div>
      <div className="decisions-list">
        {decisions.length === 0 ? (
          <div className="decisions-empty">
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
          </>
        )}
      </div>
    </div>
  );
}
