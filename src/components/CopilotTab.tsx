import { useState, useRef, useEffect } from 'react';
import { chatHistories, templateQueries, type ChatMessage } from '../data/staticData';

interface Props {
  selectedId: string;
}

export default function CopilotTab({ selectedId }: Props) {
  const [chatMap, setChatMap] = useState<Record<string, ChatMessage[]>>({ ...chatHistories });
  const [input, setInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const messages = chatMap[selectedId] || [];

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length, selectedId]);

  const handleSend = () => {
    if (!input.trim()) return;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setChatMap(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), { role: 'user', timestamp: ts, text: input.trim() }],
    }));
    setInput('');
  };

  const handleTemplate = (label: string) => {
    const fn = templateQueries[label];
    if (fn) setInput(fn(selectedId));
  };

  const templates = ['ASSESS + RECOMMEND', 'SIGNAL RE-TIMING', 'DRAFT PUBLIC ALERT', 'AMBULANCE ROUTE', 'OFFICER REDEPLOY', 'SHIFT BRIEFING'];

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
