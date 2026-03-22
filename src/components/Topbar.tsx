import { useState, useEffect } from 'react';

interface TopbarProps {
  onLogout?: () => void;
  showSensorsLive?: boolean;
}

export default function Topbar({ onLogout, showSensorsLive = true }: TopbarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fmt = (n: number) => String(n).padStart(2, '0');
  const clock = `${fmt(time.getHours())}:${fmt(time.getMinutes())}:${fmt(time.getSeconds())}`;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo text-secondary">URBAN PULSE</span>
        <span className="topbar-city">WHERE EVERY INCIDENT FINDS IT'S COMMAND</span>
      </div>
      <div className="topbar-right">
        {showSensorsLive && (
          <span className="topbar-indicator">
            <span className="dot dot-green" />
            SENSORS LIVE
          </span>
        )}
        <span className="topbar-clock">{clock}</span>
        {onLogout && (
          <button className="topbar-logout" onClick={onLogout}>Logout</button>
        )}
      </div>
    </div>
  );
}