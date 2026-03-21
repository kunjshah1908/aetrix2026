import { type DecisionCardData } from '../data/staticData';

interface Props {
  card: DecisionCardData;
  applied: boolean;
  appliedTime: string;
  onApply: (action: string) => void;
}

export default function DecisionCard({ card, applied, appliedTime, onApply }: Props) {
  return (
    <div className="decision-card">
      <div className="decision-header">
        <span className="decision-type">{card.type}</span>
        <span className={`confidence-badge ${card.confidence === 'HIGH' ? 'confidence-high' : 'confidence-review'}`}>
          {card.confidence === 'HIGH' ? 'HIGH CONF' : 'REVIEW'}
        </span>
      </div>
      <div className="decision-body">{card.body}</div>
      {applied ? (
        <div className="decision-applied">
          {card.type === 'PUBLIC ALERT' ? 'DISPATCHED' : 'APPLIED'} · {appliedTime}
        </div>
      ) : (
        <div className="decision-footer">
          {card.actions.map(action => (
            <button
              key={action}
              className={`decision-btn ${action === 'SKIP' ? 'skip' : 'apply'}`}
              onClick={() => onApply(action)}
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
