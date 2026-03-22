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
        <span className={`decision-type decision-type-${card.type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}>{card.type}</span>
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
          {card.actions.filter(action => action !== 'SEND SMS').map(action => {
            if (action === 'POST TWITTER') {
              return (
                <button
                  key={action}
                  className="decision-btn apply"
                  onClick={() => {
                    const tweetText = card.body.replace(/^(Twitter:\s*)?/i, '').trim();
                    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                    window.open(url, '_blank');
                    onApply(action);
                  }}
                >
                  Tweet
                </button>
              );
            }

            return (
              <button
                key={action}
                className={`decision-btn ${action === 'SKIP' ? 'skip' : 'apply'}`}
                onClick={() => onApply(action)}
              >
                {action}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
