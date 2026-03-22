import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type Incident, diversionRoute } from '../data/staticData';

interface Props {
  incidents: Incident[];
  selectedId: string;
  onSelect: (id: string) => void;
  showDiversion: boolean;
  showReportedMarkers?: boolean;
}

export default function MapPanel({ incidents, selectedId, onSelect, showDiversion, showReportedMarkers = true }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const lastCenteredIncidentIdRef = useRef<string>('');

  const recenterToSelectedIncident = (animate = true) => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const incident = incidents.find((item) => item.id === selectedId);
    if (!incident) return;
    map.setView([incident.lat, incident.lng], map.getZoom(), { animate });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([23.2156, 72.6369], 13);
    // Light-themed map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    // Ensure tiles render correctly after flex/layout calculations settle.
    window.setTimeout(() => map.invalidateSize(), 0);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    const timer = window.setTimeout(handleResize, 120);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const getIncidentLevel = (incident: Incident) => {
      const type = (incident.type || '').toLowerCase();
      if (type.includes('extreme') || incident.severity === 'CRITICAL') return 'extreme';
      if (type.includes('medium') || type.includes('moderate') || incident.severity === 'MODERATE' || incident.severity === 'MAJOR') return 'moderate';
      return 'mild';
    };

    const buildMarkerIcon = (incident: Incident, isSelected: boolean) => {
      const size = isSelected ? 24 : 20;

      if (incident.status === 'REPORTED') {
        return L.divIcon({
          className: '',
          html: `<div class="map-marker-cross${isSelected ? ' selected' : ''}" style="width:${size}px;height:${size}px"><span></span><span></span></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      }

      const level = getIncidentLevel(incident);
      const blink = level === 'extreme' ? ' map-marker-blink' : '';
      return L.divIcon({
        className: '',
        html: `<div class="map-marker-circle map-marker-${level}${blink}${isSelected ? ' selected' : ''}" style="width:${size}px;height:${size}px"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    incidents
      .filter((incident) => incident.status === 'ACTIVE' || (showReportedMarkers && incident.status === 'REPORTED'))
      .forEach((inc) => {
      const isSelected = inc.id === selectedId;
      const icon = buildMarkerIcon(inc, isSelected);

      const marker = L.marker([inc.lat, inc.lng], { icon }).addTo(map);
      marker.on('click', () => onSelect(inc.id));
      markersRef.current.push(marker);
      });
  }, [incidents, selectedId, onSelect, showReportedMarkers]);

  useEffect(() => {
    // Recenter only when user changes selected incident, not on every incident refresh.
    if (!selectedId || lastCenteredIncidentIdRef.current === selectedId) return;
    recenterToSelectedIncident(true);
    lastCenteredIncidentIdRef.current = selectedId;
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

  return (
    <div className="map-panel">
      <div className="map-container">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="map-legend">
        {showReportedMarkers && (
          <div className="map-legend-item">
            <span className="legend-cross" />
            <span>USER REPORTED</span>
          </div>
        )}
        <div className="map-legend-item">
          <span className="legend-circle" style={{ background: '#facc15' }} />
          <span>MILD VERIFIED</span>
        </div>
        <div className="map-legend-item">
          <span className="legend-circle" style={{ background: '#f97316' }} />
          <span>MODERATE VERIFIED</span>
        </div>
        <div className="map-legend-item">
          <span className="legend-circle" style={{ background: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.65)' }} />
          <span>EXTREME VERIFIED</span>
        </div>
        <div className="map-legend-item">
          <span style={{ width: 18, height: 2, background: '#1a6fe0', display: 'inline-block' }} />
          <span>DIVERSION</span>
        </div>
      </div>

      <div className="map-recenter-control">
        <button
          className="map-control-btn"
          onClick={() => recenterToSelectedIncident(true)}
          title="Recenter map to selected incident"
        >
          RECENTER
        </button>
      </div>
    </div>
  );
}
