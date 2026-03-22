console.log('GROQ KEY:', import.meta.env.VITE_GROQ_API_KEY);
import { useState, useRef, useEffect } from 'react';
import { chatHistories, templateQueries, type ChatMessage } from '../data/staticData';
import { Incident, Officer, type DecisionCardData } from '../data/staticData';
import { TrafficRow } from '../lib/types';
import { queryCopilot } from '../lib/copilot';

interface Props {
  selectedId: string;
  selectedIncident: Incident | null;
  trafficSnapshot: TrafficRow[];
  nearestOfficer: { officer: Officer; distanceMetres: number; estimatedMinutes: number } | null;
  diversionRoadNames: string[];
  onLiveDecisions: (decisions: DecisionCardData[]) => void;
}

export default function CopilotTab({ selectedId, selectedIncident, trafficSnapshot, nearestOfficer, diversionRoadNames, onLiveDecisions }: Props) {
  const [chatMap, setChatMap] = useState<Record<string, ChatMessage[]>>({ ...chatHistories });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const messages = chatMap[selectedId] || [];

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length, selectedId]);

  const handleSend = async () => {
    if (!input.trim() || !selectedIncident) return;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setChatMap(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), { role: 'user', timestamp: ts, text: input.trim() }],
    }));
    setInput('');
    setLoading(true);
    try {
      const result = await queryCopilot(input.trim(), selectedIncident, trafficSnapshot, nearestOfficer, diversionRoadNames);
      const now2 = new Date();
      const ts2 = `${String(now2.getHours()).padStart(2,'0')}:${String(now2.getMinutes()).padStart(2,'0')}:${String(now2.getSeconds()).padStart(2,'0')}`;
      const responseText = result.narrative || JSON.stringify(result);
      setChatMap(prev => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] || []), { role: 'copilot', timestamp: ts2, text: responseText }],
      }));

      // Convert result to DecisionCardData[] and call onLiveDecisions
      const cards: DecisionCardData[] = [];
      if (result.signal_retiming) {
        cards.push({
          id: `live-signal-${Date.now()}`,
          type: 'SIGNAL RE-TIMING',
          confidence: result.signal_retiming.confidence === 'HIGH' ? 'HIGH' : 'REVIEW',
          body: result.signal_retiming.decisions.join(' | '),
          actions: ['APPLY', 'SKIP'],
        });
      }
      if (result.diversion_route) {
        cards.push({
          id: `live-diversion-${Date.now()}`,
          type: 'DIVERSION ROUTE',
          confidence: result.diversion_route.confidence === 'HIGH' ? 'HIGH' : 'REVIEW',
          body: result.diversion_route.steps.join(' → ') + ` | Est. delay reduction: ${result.diversion_route.estimated_delay_reduction}`,
          actions: ['APPLY', 'SKIP'],
        });
      }
      if (result.officer_orders && result.officer_orders.length > 0) {
        cards.push({
          id: `live-officer-${Date.now()}`,
          type: 'OFFICER DISPATCH',
          confidence: 'HIGH',
          body: result.officer_orders.map((o: any) => `${o.badge} ${o.name}: ${o.instruction} [${o.priority}]`).join(' | '),
          actions: ['APPLY', 'SKIP'],
        });
      }
      if (result.public_alert) {
        cards.push({
          id: `live-alert-${Date.now()}`,
          type: 'PUBLIC ALERT',
          confidence: result.public_alert.confidence === 'HIGH' ? 'HIGH' : 'REVIEW',
          body: `Twitter: ${result.public_alert.twitter} | SMS: ${result.public_alert.sms}`,
          actions: ['POST TWITTER', 'SEND SMS', 'SKIP'],
        });
      }
      onLiveDecisions(cards);
    } catch (err) {
      console.error('Copilot error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplate = (label: string) => {
    const fn = templateQueries[label];
    if (fn) setInput(fn(selectedId));
  };

  const templates = ['ASSESS + RECOMMEND', 'SIGNAL RE-TIMING', 'AMBULANCE ROUTE'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="quick-templates">
        <div className="quick-templates-label">QUICK TEMPLATES</div>
        <div className="template-grid">
          {templates.map(t => (
            <button key={t} className="template-btn" onClick={() => handleTemplate(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="chat-area" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div className="chat-timestamp">[{msg.timestamp}] {msg.role.toUpperCase()}</div>
            <div className={`chat-bubble ${msg.role}`}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble copilot" style={{ opacity: 0.6 }}>COPILOT REASONING...</div>
        )}
      </div>

      <div className="copilot-input-row">
        <input
          className="copilot-input"
          placeholder="type query or add context…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="copilot-send" onClick={handleSend}>SEND →</button>
      </div>
    </div>
  );
}
