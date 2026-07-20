import { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { StatusBadge, TrendIndicator } from '../common/UI';

const colors = { safe: '#2f7d4a', 'semi-critical': '#d89b1d', critical: '#d96c18', 'over-exploited': '#b42318', unknown: '#718096' };

function RecenterButton() {
  const map = useMap();
  const locate = () => navigator.geolocation?.getCurrentPosition(({ coords }) => map.flyTo([coords.latitude, coords.longitude], 9), () => window.alert('Location access was not available. Use the filters or search instead.'));
  return <button className="map-locate" onClick={locate} aria-label="Use current location"><LocateFixed size={18} /> My location</button>;
}

export function MapLegend() { return <div className="map-legend" aria-label="Groundwater classification legend"><strong>Classification</strong>{Object.entries(colors).map(([key, color]) => <span key={key}><i style={{ backgroundColor: color }} />{key.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')}</span>)}</div>; }

export default function StationMap({ stations, height = 500, onSelect, compact = false }) {
  const center = useMemo(() => stations.length ? [stations.reduce((sum, item) => sum + item.latitude, 0) / stations.length, stations.reduce((sum, item) => sum + item.longitude, 0) / stations.length] : [22.5, 78.9], [stations]);
  return <div className={`station-map ${compact ? 'compact-map' : ''}`} style={{ height }}><MapContainer center={center} zoom={5} scrollWheelZoom={!compact} style={{ height: '100%', width: '100%' }}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{stations.map((station) => <CircleMarker key={station.id} center={[station.latitude, station.longitude]} radius={compact ? 7 : 9} pathOptions={{ color: '#fff', weight: 2, fillColor: colors[station.classification], fillOpacity: 1 }} eventHandlers={{ click: () => onSelect?.(station) }}><Popup><div className="map-popup"><span>{station.stationCode}</span><strong>{station.name}</strong><small>{station.district}, {station.state}</small><StatusBadge compact status={station.classification}/><TrendIndicator trend={station.trend}/><p>{station.currentWaterLevel} m below ground level</p><Link to={`/stations/${station.id}`}>View station details</Link></div></Popup></CircleMarker>)}<RecenterButton /></MapContainer><MapLegend /></div>;
}
