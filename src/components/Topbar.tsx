import { useState, useEffect } from 'react';

export default function Topbar() {
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
        <span className="topbar-logo text-secondary">TRAFFICAI</span>
        <span className="topbar-city">GANDHINAGAR · CENTRAL COMMAND</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-indicator">
          <span className="dot dot-green" />
          SENSORS LIVE
        </span>
        <span className="topbar-indicator">
          <span className="dot dot-amber" />
          2 ACTIVE INC
        </span>
        <span className="topbar-clock">{clock}</span>
      </div>
    </div>);

}