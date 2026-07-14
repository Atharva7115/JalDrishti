import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Bookmark, CheckCircle2, Database, RefreshCw, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { LAST_SYNC } from '../../data/mockData';

export const classificationLabel = { safe: 'Safe', 'semi-critical': 'Semi-Critical', critical: 'Critical', 'over-exploited': 'Over-Exploited', unknown: 'No recent data' };
export const classificationMessage = { safe: 'Groundwater conditions are within the sustainable range.', 'semi-critical': 'Use groundwater carefully and monitor seasonal change.', critical: 'Immediate conservation and pumping review are recommended.', 'over-exploited': 'Extraction exceeds sustainable recharge. Urgent action is required.', unknown: 'A current classification cannot be calculated.' };

export function DemoBadge() { return <span className="demo-badge"><Database size={14} /> Demonstration Data</span>; }
export function StatusBadge({ status, compact = false }) { return <span className={`status-badge status-${status} ${compact ? 'compact' : ''}`}><span aria-hidden="true" />{classificationLabel[status] || status}</span>; }
export function TrendIndicator({ trend }) { const Icon = trend === 'rising' ? ArrowUpRight : trend === 'falling' ? ArrowDownRight : ArrowRight; return <span className={`trend trend-${trend}`}><Icon size={17} />{trend[0].toUpperCase() + trend.slice(1)}</span>; }
export function DataConfidenceBadge({ level = 'High', detail }) { return <span className={`confidence confidence-${level.toLowerCase().replace(' ', '-')}`}><CheckCircle2 size={15} /><span>Data Confidence: <strong>{level}</strong>{detail && <small>{detail}</small>}</span></span>; }

export function SummaryCard({ icon: Icon, label, value, support, tone = 'default' }) { return <article className={`summary-card tone-${tone}`}><span className="summary-icon" aria-hidden="true"><Icon /></span><div><span>{label}</span><strong>{value}</strong><small>{support}</small></div></article>; }

export function StationCard({ station, action = true }) {
  const { savedStations, toggleSavedStation } = useAppStore();
  const saved = savedStations.includes(station.id);
  return <article className="station-card"><div className="card-top"><div><span className="station-code">{station.stationCode}</span><h3>{station.name}</h3><p>{station.district}, {station.state}</p></div><button className={`save-button ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Remove' : 'Save'} ${station.name}`} onClick={() => toggleSavedStation(station.id)}><Bookmark fill={saved ? 'currentColor' : 'none'} /></button></div><div className="station-card-status"><StatusBadge status={station.classification} /><TrendIndicator trend={station.trend} /></div><dl className="mini-stats"><div><dt>Water level</dt><dd>{station.currentWaterLevel} m bgl</dd></div><div><dt>Data quality</dt><dd>{station.dataQualityScore}%</dd></div></dl>{action && <Link className="text-link" to={`/stations/${station.id}`}>View station details <ArrowRight size={16} /></Link>}</article>;
}

export function AlertCard({ alert, onStatusChange }) { return <article className={`alert-card severity-${alert.severity}`}><div className="alert-card-head"><span className="severity-label"><AlertCircle size={16} />{alert.severity} severity</span><time>{new Date(alert.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time></div><h3>{alert.title}</h3><p className="location-label">{alert.district}, {alert.state}</p><p>{alert.description}</p><div className="card-actions"><Link className="text-link" to={`/alerts/${alert.id}`}>View details <ArrowRight size={16} /></Link>{onStatusChange && <button className="button button-small button-outline" onClick={() => onStatusChange(alert.id)}>Acknowledge</button>}</div></article>; }

export function LoadingSkeleton({ rows = 3 }) { return <div className="skeleton-stack" role="status" aria-label="Loading data">{Array.from({ length: rows }, (_, index) => <div className="skeleton" key={index} />)}<span className="sr-only">Loading…</span></div>; }
export function EmptyState({ title = 'No data found', message = 'Try changing your filters or search terms.' }) { return <div className="state-panel"><Database /><h2>{title}</h2><p>{message}</p></div>; }
export function ErrorState({ retry }) { return <div className="state-panel error-panel"><AlertCircle /><h2>Groundwater readings could not be loaded.</h2><p>The data source may be temporarily unavailable.</p><div><button className="button" onClick={retry}><RefreshCw size={17} /> Retry</button><button className="button button-outline" onClick={() => window.location.reload()}>View Cached Data</button></div></div>; }
export function OfflineBanner() { const { offline, setOffline } = useAppStore(); if (!offline) return null; return <div className="offline-banner" role="status"><div className="container"><WifiOff size={18} /><span>You are viewing data last synchronized on {LAST_SYNC}. Some readings, forecasts, or alerts may not be current.</span><button onClick={() => setOffline(!navigator.onLine)}><RefreshCw size={15} /> Retry</button></div></div>; }

export function Tabs({ tabs, active, onChange, label = 'Content sections' }) { return <div className="tabs" role="tablist" aria-label={label}>{tabs.map((tab) => <button role="tab" aria-selected={active === tab} className={active === tab ? 'active' : ''} key={tab} onClick={() => onChange(tab)}>{tab}</button>)}</div>; }
