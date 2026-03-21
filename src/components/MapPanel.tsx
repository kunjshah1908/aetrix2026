import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type Incident, officers, ambulances, diversionRoute } from '../data/staticData';

const colorMap: Record<string, string> = {
  CRITICAL: '#dc2626',
  MAJOR: '#d97706',
  MODERATE: '#ca8a04',
  MINOR: '#2563eb',
};

interface Props {
  incidents: Incident[];
  selectedId: string;
  onSelect: (id: string) => void;
  showDiversion: boolean;
}

export default function MapPanel({ incidents, selectedId, onSelect, showDiversion }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [layers, setLayers] = useState<string[]>(['SENSORS']);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([23.2156, 72.6369], 13);
    // Light-themed map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    incidents.forEach(inc => {
      const isSelected = inc.id === selectedId;
      const size = isSelected ? 18 : 14;
      const color = colorMap[inc.severity] || '#1a6fe0';
      const border = isSelected ? '3px solid #1a6fe0' : '2px solid white';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([inc.lat, inc.lng], { icon }).addTo(map);
      marker.on('click', () => onSelect(inc.id));
      markersRef.current.push(marker);
    });

    officers.forEach(ofc => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:10px;height:10px;background:#16a34a;border:1px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.15);"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      markersRef.current.push(L.marker([ofc.lat, ofc.lng], { icon }).addTo(map));
    });

    ambulances.forEach(amb => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:10px;height:10px;background:#ffffff;border:2px solid #7a8299;box-shadow:0 1px 3px rgba(0,0,0,0.15);"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      markersRef.current.push(L.marker([amb.lat, amb.lng], { icon }).addTo(map));
    });
  }, [incidents, selectedId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const inc = incidents.find(i => i.id === selectedId);
    if (inc) map.setView([inc.lat, inc.lng], map.getZoom(), { animate: true });
  }, [selectedId, incidents]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (showDiversion) {
      polylineRef.current = L.polyline(diversionRoute, {
        color: '#1a6fe0', opacity: 0.7, dashArray: '6, 4', weight: 3,
      }).addTo(map);
    }
  }, [showDiversion]);

  const toggleLayer = (name: string) => {
    setLayers(prev => prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]);
  };

  return (
    <div className="map-panel">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div className="map-legend">
        <div className="map-legend-item">
          <span className="legend-circle" style={{ background: '#dc2626' }} />
          <span>INCIDENT</span>
        </div>
        <div className="map-legend-item">
          <span className="legend-square" style={{ background: '#16a34a' }} />
          <span>OFFICER</span>
        </div>
        <div className="map-legend-item">
          <span className="legend-square" style={{ background: '#ffffff', border: '2px solid #7a8299' }} />
          <span>AMBULANCE</span>
        </div>
        <div className="map-legend-item">
          <span style={{ width: 18, height: 2, background: '#1a6fe0', display: 'inline-block' }} />
          <span>DIVERSION</span>
        </div>
      </div>

      <div className="map-controls">
        {['SENSORS', 'SIGNALS', 'HEATMAP', 'OFFICERS'].map(name => (
          <button
            key={name}
            className={`map-control-btn${layers.includes(name) ? ' active' : ''}`}
            onClick={() => toggleLayer(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
