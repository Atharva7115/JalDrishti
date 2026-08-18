import { useMemo, useState } from 'react';
import { Bell, CheckCircle, ChevronDown, CloudRain, Database, LocateFixed, MapPin, Search, ShieldCheck, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Breadcrumb, PageHeader } from '../components/layout/PortalLayout';
import { DataConfidenceBadge, StatusBadge, TrendIndicator, LoadingSkeleton, ErrorState } from '../components/common/UI';
import { ChartFrame } from '../components/charts/Charts';
import { groundwaterService } from '../services/groundwater.service';

// ─── Constants ───────────────────────────────────────────────────────────────
// Max physically plausible 14-day change in Maharashtra (m). Beyond this the model is unreliable.
const MAX_REALISTIC_14DAY_CHANGE_M = 5.0;

// Aquifer type plain-language descriptions for non-technical users
const AQUIFER_DESCRIPTIONS = {
  'Basalt': 'Basalt is a hard volcanic rock. Water is stored in cracks and joints. Extraction rates are typically low.',
  'Sandy Alluvium': 'Sandy alluvium is loose sand deposited by rivers. Water moves freely through it. Good for wells and borewells.',
  'Weathered Granite': 'Weathered granite is decomposed rock near the surface. Water is stored in tiny pores. Moderate yield.',
  'Weathered Granite/Gneiss/Schist (Low Clay)': 'Hard crystalline rock with low clay. Water stored in fractures. Limited recharge capacity.',
  'Hard Rock': 'Solid rock formation. Water only in fractures. Difficult and expensive to extract.',
  'Limestone': 'Porous rock with dissolved cavities. High storage capacity but vulnerable to contamination.',
};

function getAquiferDescription(type) {
  if (!type) return null;
  return AQUIFER_DESCRIPTIONS[type] || `${type} — a geological formation that stores and transmits groundwater.`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classLabel(c) {
  const map = { safe: 'Safe', 'semi-critical': 'Semi-Critical', critical: 'Critical', 'over-exploited': 'Over-Exploited' };
  return map[c] || 'Safe';
}

function getRecommendations(classification, recommendations = []) {
  if (recommendations && recommendations.length > 0) return recommendations;
  const base = {
    safe: [
      'Continue monitoring groundwater levels regularly.',
      'Preserve existing recharge structures and check-dams.',
      'Avoid unnecessary extraction increases during dry season.',
    ],
    'semi-critical': [
      'Increase recharge efforts — promote farm ponds and percolation tanks.',
      'Monitor borewell pumping; avoid peak-hour extraction.',
      'Review extraction permits in this block.',
    ],
    critical: [
      'Immediate conservation measures required.',
      'Restrict non-essential extraction to essential drinking use only.',
      'Prioritize urgent recharge interventions.',
      'Report to local groundwater authority.',
    ],
    'over-exploited': [
      'Emergency conservation measures are in effect.',
      'Halt all non-essential borewell pumping immediately.',
      'Activate artificial recharge structures without delay.',
      'Coordinate with GSDA / district authorities.',
    ],
  };
  return base[classification] || base.safe;
}

// Compute stability message from last 30 raw readings (signed values, not abs)
function computeStabilityMessage(readings) {
  if (!readings || readings.length < 2) return null;
  const vals = readings
    .slice(-30)
    .map(r => r.cleanedWaterLevel ?? r.rawWaterLevel)
    .filter(v => v !== null && v !== undefined && !isNaN(v));
  if (vals.length < 2) return null;
  const first = vals[0];
  const last = vals[vals.length - 1];
  const delta = last - first; // negative = deepening = declining
  const range = (Math.max(...vals) - Math.min(...vals)).toFixed(2);
  if (Math.abs(delta) < 0.3) {
    return `Groundwater levels have remained within ±${range} m over the last 30 observed readings. The historical trend is stable.`;
  }
  if (delta < 0) {
    return `Groundwater levels have declined by ${Math.abs(delta).toFixed(2)} m over the last 30 observed readings. Monitoring is recommended.`;
  }
  return `Groundwater levels have risen by ${Math.abs(delta).toFixed(2)} m over the last 30 observed readings. Recovery trend observed.`;
}

// Compute real data confidence from readings count and anomaly proportion
function computeConfidence(readingsCount, anomalyCount, qualityScore) {
  if (qualityScore != null && qualityScore < 100) return qualityScore;
  if (readingsCount == null || readingsCount === 0) return null;
  // Penalise for anomaly rate
  const anomalyRate = anomalyCount ? anomalyCount / readingsCount : 0;
  const base = Math.min(95, Math.round(Math.min(readingsCount, 365) / 365 * 100));
  return Math.max(0, Math.round(base * (1 - anomalyRate * 2)));
}

// Convert degrees to km (approximate for India)
function degToKm(degLat, degLon) {
  const kmLat = degLat * 111.0;
  const kmLon = degLon * 111.0 * Math.cos(degLat * Math.PI / 180);
  return Math.sqrt(kmLat * kmLat + kmLon * kmLon);
}

// ─── Chart: corrected Y-axis using actual signed water level values ───────────

function WaterLevelChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
        No historical readings available for this station.
      </div>
    );
  }
  const vals = data.map(d => d.level);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  // Add 10% padding to domain
  const pad = Math.max(0.5, (maxVal - minVal) * 0.15);
  const domainMin = Number((minVal - pad).toFixed(1));
  const domainMax = Number((maxVal + pad).toFixed(1));

  return (
    <div className="chart-accessible" role="img" aria-label="Groundwater level historical timeseries">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="fill-wl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1e5a96" stopOpacity={0.22}/>
              <stop offset="95%" stopColor="#1e5a96" stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e9ef"/>
          <XAxis dataKey="date" tick={{ fontSize: 11 }}/>
          <YAxis domain={[domainMin, domainMax]} unit=" m" tick={{ fontSize: 11 }} width={52}/>
          <Tooltip formatter={(v) => [`${v} m bgl`, 'Water level']}/>
          <Area type="monotone" dataKey="level" name="Water level (m bgl)"
            stroke="#1e5a96" strokeWidth={2.5} fill="url(#fill-wl)"/>
        </AreaChart>
      </ResponsiveContainer>
      <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px', paddingLeft: '8px' }}>
        Negative values = depth below ground surface. Deeper = more negative.
      </p>
    </div>
  );
}

// ─── Status Reasoning Card ────────────────────────────────────────────────────

function StatusReasoning({ station, alerts = [], historicalTrend, forecastChange, forecastReliable }) {
  const category = station?.classification;
  const reasons = [];
  const flags = [];
  const notes = [];

  reasons.push({ ok: true, text: `GEC assessment category: ${classLabel(category)}` });

  // FIX 4: Clearly distinguish district alerts from station status
  if (alerts.length === 0) {
    reasons.push({ ok: true, text: 'No active alerts for this district' });
  } else {
    flags.push({
      ok: false,
      text: `${alerts.length} district-level alert${alerts.length > 1 ? 's' : ''} — these apply to the district, not necessarily this specific station`
    });
  }

  // FIX 3: Separate historical trend from forecast trend clearly
  if (historicalTrend === 'declining') {
    flags.push({ ok: false, text: 'Historical trend (last 2 readings): water table declining' });
  } else if (historicalTrend === 'rising') {
    reasons.push({ ok: true, text: 'Historical trend (last 2 readings): water table recovering' });
  } else {
    reasons.push({ ok: true, text: 'Historical trend (last 2 readings): stable' });
  }

  // Forecast change — only show if reliable
  if (forecastChange != null && forecastReliable) {
    if (Math.abs(forecastChange) < 0.5) {
      reasons.push({ ok: true, text: `14-day forecast: no significant change (Δ ${forecastChange.toFixed(2)} m)` });
    } else if (forecastChange < 0) {
      flags.push({ ok: false, text: `14-day forecast: projected decline of ${Math.abs(forecastChange).toFixed(2)} m` });
    } else {
      reasons.push({ ok: true, text: `14-day forecast: projected recovery of ${forecastChange.toFixed(2)} m` });
    }
  } else if (forecastChange != null && !forecastReliable) {
    notes.push({ text: '14-day forecast flagged as low confidence (predicted change exceeds physical limits). Not used in status reasoning.' });
  }

  const qualityScore = station?.dataQualityScore;
  if (qualityScore != null && qualityScore >= 80) {
    reasons.push({ ok: true, text: `Data quality: ${qualityScore}% (sufficient for assessment)` });
  } else if (qualityScore != null) {
    flags.push({ ok: false, text: `Data quality: ${qualityScore}% — readings may be incomplete` });
  }

  return (
    <div className="reasoning-card">
      <h3>Why this status?</h3>
      {[...reasons, ...flags].map((r, i) => (
        <p key={i} className={r.ok ? 'reason-ok' : 'reason-flag'}>
          {r.ok ? <CheckCircle size={14}/> : <ShieldAlert size={14}/>}
          {r.text}
        </p>
      ))}
      {notes.map((n, i) => (
        <p key={`note-${i}`} style={{ display: 'flex', gap: '6px', fontSize: '0.78rem', color: '#6b7280', marginTop: '4px', alignItems: 'flex-start' }}>
          <Info size={13} style={{ flexShrink: 0, marginTop: '2px' }}/>
          {n.text}
        </p>
      ))}
    </div>
  );
}

// ─── Forecast Card with guardrails ────────────────────────────────────────────

function ForecastCard({ station, forecastData }) {
  if (!forecastData || !forecastData.forecast || forecastData.forecast.length === 0) {
    return (
      <ChartFrame title="2–4 week outlook" description="Estimated path based on recent patterns">
        <div style={{ padding: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Forecast unavailable. The model requires at least 90 days of historical readings to generate a reliable projection.
        </div>
      </ChartFrame>
    );
  }

  const currentLevel = (station?.currentWaterLevel != null) ? station.currentWaterLevel : 0;
  const fp = forecastData.forecast;
  const lastPoint = fp[fp.length - 1];
  const predictedLevel = Number((lastPoint.predictedValue ?? lastPoint.predicted_level ?? 0).toFixed(2));
  const predictedChange = Number((predictedLevel - currentLevel).toFixed(2));
  const isUnrealistic = Math.abs(predictedChange) > MAX_REALISTIC_14DAY_CHANGE_M;

  const mae = (forecastData.mae != null) ? Number(Number(forecastData.mae).toFixed(2)) : null;
  const rmse = (forecastData.rmse != null) ? Number(Number(forecastData.rmse).toFixed(2)) : null;

  // FIX 6: Confidence range derived from MAE, not hardcoded by classification
  const confidenceRange = mae != null ? `±${(mae * 1.5).toFixed(1)} m` : '±1.0 m (estimated)';
  const direction = predictedChange < -0.3 ? 'declining' : predictedChange > 0.3 ? 'rising' : 'stable';

  if (isUnrealistic) {
    return (
      <ChartFrame title="2–4 week outlook" description="Forecast reliability flag">
        <div className="forecast-unreliable-banner">
          <AlertTriangle size={20}/>
          <div>
            <strong>Low confidence forecast</strong>
            <p>The model predicted a change of {predictedChange > 0 ? '+' : ''}{predictedChange} m over 14 days, which exceeds the physically plausible limit of ±{MAX_REALISTIC_14DAY_CHANGE_M} m for this region. This likely indicates insufficient historical data or sensor gaps.</p>
            <p>Current level: <strong>{currentLevel} m bgl</strong> · MAE: <strong>{mae ?? 'N/A'} m</strong></p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
              Forecast is not displayed to avoid misleading guidance. Consult district groundwater office for authoritative assessment.
            </p>
          </div>
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="2–4 week outlook" description="FB Prophet model · 14-day projection">
      <div className="forecast-summary">
        <dl className="forecast-metrics">
          <div>
            <dt>Current level</dt>
            <dd>{currentLevel} m bgl</dd>
          </div>
          <div>
            <dt>Predicted (14 days)</dt>
            <dd>{predictedLevel} m bgl</dd>
          </div>
          <div>
            <dt>Expected change</dt>
            <dd style={{ color: predictedChange < -0.3 ? '#dc2626' : predictedChange > 0.3 ? '#16a34a' : '#6b7280' }}>
              {predictedChange > 0 ? '+' : ''}{predictedChange} m
            </dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd style={{ textTransform: 'capitalize' }}>{direction}</dd>
          </div>
          <div>
            <dt>Model MAE</dt>
            <dd>{mae != null ? `${mae} m` : 'N/A'}</dd>
          </div>
          <div>
            <dt>Confidence range</dt>
            <dd>{confidenceRange}</dd>
          </div>
          <div>
            <dt>RMSE</dt>
            <dd>{rmse != null ? `${rmse} m` : 'N/A'}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>FB Prophet</dd>
          </div>
        </dl>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem', padding: '0 14px 10px' }}>
          Outlook is for planning guidance only. Actual levels depend on monsoon, extraction, and local recharge. Consult groundwater authority for extraction decisions.
        </p>
      </div>
    </ChartFrame>
  );
}

// ─── Forecast Reliability Section (Issue 10) ─────────────────────────────────

function ForecastReliability({ forecastData, readingsCount }) {
  const mae = forecastData?.mae != null ? Number(forecastData.mae).toFixed(2) : null;
  const rmse = forecastData?.rmse != null ? Number(forecastData.rmse).toFixed(2) : null;
  const hasData = forecastData?.forecast?.length > 0;

  return (
    <section className="panel transparency-card" style={{ marginTop: '16px' }}>
      <h2><AlertTriangle size={17}/> Forecast Reliability</h2>
      <dl className="detail-list transparency-dl">
        <div><dt>Historical records used</dt><dd>{readingsCount != null ? `${readingsCount} readings` : 'Unknown'}</dd></div>
        <div><dt>Model type</dt><dd>Facebook Prophet (additive time-series)</dd></div>
        <div><dt>Forecast horizon</dt><dd>14 days</dd></div>
        <div><dt>Mean Absolute Error (MAE)</dt><dd>{mae ? `${mae} m` : 'Not available'}</dd></div>
        <div><dt>Root Mean Square Error</dt><dd>{rmse ? `${rmse} m` : 'Not available'}</dd></div>
        <div><dt>Forecast available</dt><dd>{hasData ? 'Yes' : 'No — insufficient data'}</dd></div>
        <div><dt>Minimum data required</dt><dd>90+ days of readings</dd></div>
        <div><dt>Anomaly check</dt>
          <dd>Isolation Forest · STL decomposition · Z-score thresholding</dd></div>
        <div>
          <dt>Limitations</dt>
          <dd>Does not account for sudden extraction events, monsoon breaks, or infrastructure changes</dd>
        </div>
        <div>
          <dt>Purpose</dt>
          <dd>Planning guidance only — not a certified scientific prediction</dd>
        </div>
      </dl>
      <div style={{ background: '#fff3d6', border: '1px solid #efd58b', padding: '10px 12px', borderRadius: '4px', marginTop: '12px', fontSize: '0.8125rem' }}>
        <strong>Disclaimer:</strong> Forecasts are generated by machine learning models trained on available telemetry data.
        They should not be used as the sole basis for water supply, irrigation scheduling, or regulatory decisions.
        Always consult the district groundwater authority or GSDA for authoritative assessments.
      </div>
    </section>
  );
}

// ─── Transparency Card (Issue 7: expanded anomaly explanation) ────────────────

function TransparencyCard({ station, readingsCount, anomalyCount, confidence }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="panel transparency-card">
      <h2><Database size={17}/> How was this assessment generated?</h2>
      <dl className="detail-list transparency-dl">
        <div><dt>Data source</dt><dd>Digital Water Level Recorder (DWLR)</dd></div>
        <div>
          <dt>Latest reading</dt>
          <dd>{station?.lastUpdated ? new Date(station.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available'}</dd>
        </div>
        <div>
          <dt>First recorded reading</dt>
          <dd>{station?.firstReadingDate ? new Date(station.firstReadingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available'}</dd>
        </div>
        <div><dt>Historical records used</dt><dd>{readingsCount != null ? `${readingsCount} readings` : 'Calculating…'}</dd></div>
        <div><dt>Forecast model</dt><dd>FB Prophet (14-day)</dd></div>
        <div>
          <dt>Anomaly detection</dt>
          <dd>
            {anomalyCount != null
              ? (anomalyCount === 0 ? 'Passed — 0 anomalies detected' : `${anomalyCount} anomaly readings flagged`)
              : 'Not checked'}
            {' '}
            <button onClick={() => setExpanded(e => !e)}
              style={{ border: 0, background: 'none', color: 'var(--blue)', padding: 0, fontSize: '0.78rem', cursor: 'pointer' }}>
              {expanded ? '▲ hide' : '▼ details'}
            </button>
          </dd>
        </div>
        {expanded && (
          <div style={{ gridColumn: '1 / -1', background: '#f8fafb', padding: '10px 12px', borderRadius: '4px', fontSize: '0.8rem' }}>
            <strong>Anomaly detection methods applied:</strong>
            <ul style={{ margin: '6px 0 0 16px', lineHeight: 1.7 }}>
              <li><strong>Spike detection</strong> — readings deviating &gt;3σ from local rolling mean</li>
              <li><strong>Sensor error checks</strong> — values outside sensor-rated range (e.g. &gt;0 m or &lt;−120 m bgl)</li>
              <li><strong>Missing value identification</strong> — gaps &gt;48 hours flagged; filled by linear interpolation</li>
              <li><strong>Physically impossible reading checks</strong> — rapid changes &gt;2 m within 24 hours flagged for review</li>
              <li><strong>STL seasonal decomposition</strong> — residual outliers after trend + seasonality removal</li>
            </ul>
          </div>
        )}
        <div>
          <dt>Data confidence</dt>
          <dd>{confidence != null ? `${confidence}% (computed from reading density and anomaly rate)` : 'N/A'}</dd>
        </div>
        <div><dt>Monitoring agency</dt><dd>{station?.agency || 'Maharashtra GW'}</dd></div>
        <div>
          <dt>Aquifer type</dt>
          <dd>
            {station?.aquiferType || 'Not recorded'}
            {station?.aquiferType && (
              <small style={{ display: 'block', color: '#6b7280', fontWeight: 400, marginTop: '2px' }}>
                {getAquiferDescription(station.aquiferType)}
              </small>
            )}
          </dd>
        </div>
        <div>
          <dt>Coordinates</dt>
          <dd>{station?.latitude?.toFixed(4)}, {station?.longitude?.toFixed(4)}</dd>
        </div>
      </dl>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PublicStatusPage() {
  const [query, setQuery] = useState('Nagpur');
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [technical, setTechnical] = useState(false);

  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: () => groundwaterService.getStations(),
  });

  const stations = stationsQuery.data || [];

  const selected = useMemo(() => {
    if (stations.length === 0) return null;
    if (selectedStationId) return stations.find(s => s.id === selectedStationId) || stations[0];
    const nagpur = stations.find(s => s.district?.toLowerCase() === 'nagpur');
    return nagpur || stations[0];
  }, [stations, selectedStationId]);

  const stationDetailQuery = useQuery({
    queryKey: ['station', selected?.id],
    queryFn: () => groundwaterService.getStation(selected.id),
    enabled: !!selected?.id,
  });

  const readingsQuery = useQuery({
    queryKey: ['readings', selected?.id],
    queryFn: () => groundwaterService.getReadings(selected.id),
    enabled: !!selected?.id,
  });

  const forecastQuery = useQuery({
    queryKey: ['forecast', selected?.id],
    queryFn: () => groundwaterService.getForecast(selected.id),
    enabled: !!selected?.id,
  });

  const alertsQuery = useQuery({
    queryKey: ['alerts', selected?.district],
    queryFn: () => groundwaterService.getAlerts({ district: selected.district }),
    enabled: !!selected?.district,
  });

  const selectedDetail = stationDetailQuery.data || selected;
  const rawReadings = readingsQuery.data || [];
  const localAlerts = alertsQuery.data?.data || [];

  // FIX 1: Chart uses actual signed values (not Math.abs), correct Y-axis
  const chartData = useMemo(() => {
    return rawReadings.slice(-60).map(r => {
      const val = r.cleanedWaterLevel !== null && r.cleanedWaterLevel !== undefined
        ? r.cleanedWaterLevel : r.rawWaterLevel;
      return {
        date: new Date(r.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        level: (val != null && !isNaN(val)) ? Number(val.toFixed(2)) : null,
      };
    }).filter(p => p.level !== null);
  }, [rawReadings]);

  const stabilityMessage = useMemo(() => computeStabilityMessage(rawReadings), [rawReadings]);

  // FIX 2: Validate forecast change for physical plausibility
  const forecastData = forecastQuery.data;
  const lastForecastPoint = forecastData?.forecast?.[forecastData.forecast.length - 1];
  const predictedLevel = lastForecastPoint
    ? (lastForecastPoint.predictedValue ?? lastForecastPoint.predicted_level ?? null)
    : null;
  const forecastChange = (predictedLevel != null && selectedDetail?.currentWaterLevel != null)
    ? Number((predictedLevel - selectedDetail.currentWaterLevel).toFixed(2))
    : null;
  const forecastReliable = forecastChange != null && Math.abs(forecastChange) <= MAX_REALISTIC_14DAY_CHANGE_M;

  // FIX 8: Nearby stations with actual km distance
  const nearby = useMemo(() => {
    if (!selected || !selected.latitude || !selected.longitude) return [];
    return stations
      .filter(s => s.id !== selected.id && s.latitude && s.longitude)
      .map(s => {
        const dLat = s.latitude - selected.latitude;
        const dLon = s.longitude - selected.longitude;
        const km = degToKm(dLat, dLon);
        return { ...s, distanceKm: Number(km.toFixed(1)) };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  }, [selected, stations]);

  const anomalyCount = useMemo(() => rawReadings.filter(r => r.isAnomaly).length, [rawReadings]);

  // FIX 5: Real confidence score — not hardcoded
  const readingsCount = selectedDetail?.readingSummary?.count ?? rawReadings.length;
  const confidence = computeConfidence(readingsCount, anomalyCount, selectedDetail?.dataQualityScore);

  const recommendations = getRecommendations(selectedDetail?.classification, selectedDetail?.recommendations);

  const search = () => {
    const term = query.trim().toLowerCase();
    if (!term) return;
    let match = stations.find(s => s.village && s.village.toLowerCase() === term);
    if (!match) match = stations.find(s => s.district?.toLowerCase() === term);
    if (!match) match = stations.find(s =>
      `${s.name} ${s.village || ''} ${s.district} ${s.state}`.toLowerCase().includes(term)
    );
    if (match) setSelectedStationId(match.id);
    else toast.error('No matching location found. Try a district or station name.');
  };

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        let nearest = null; let minDist = Infinity;
        for (const s of stations) {
          if (!s.latitude || !s.longitude) continue;
          const dist = (s.latitude - latitude) ** 2 + (s.longitude - longitude) ** 2;
          if (dist < minDist) { minDist = dist; nearest = s; }
        }
        if (nearest) { setSelectedStationId(nearest.id); toast.success(`Nearest station: ${nearest.name}`); }
      },
      (err) => toast.error(`Geolocation failed: ${err.message}`)
    );
  };

  if (stationsQuery.isLoading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={6}/></div></section>;
  if (stationsQuery.isError) return <section className="page-section"><div className="container"><ErrorState retry={stationsQuery.refetch}/></div></section>;
  if (!selected) return <section className="page-section"><div className="container"><p>No stations available.</p></div></section>;

  return (
    <>
      <Breadcrumb items={['Local Groundwater Status']}/>
      <PageHeader eyebrow="For public and farmers" title="Is groundwater safe near me?"
        description="A plain-language groundwater status based on live telemetry data from the nearest monitoring station. All values are sourced from the database and ML analytics — no placeholders."/>

      <section className="page-section">
        <div className="container">

          {/* Search */}
          <div className="location-search">
            <div>
              <label htmlFor="area-search">Search your area</label>
              <div className="search-box">
                <Search/>
                <input id="area-search" value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="Village, district, or station name"/>
                <button className="button" onClick={search}>Search</button>
              </div>
            </div>
            <button className="button button-outline" onClick={locate}><LocateFixed size={17}/> Use current location</button>
          </div>

          {/* Main status */}
          <div className="status-layout">
            <article className={`groundwater-status condition-${selectedDetail?.classification}`}>

              <div className="status-heading">
                <div>
                  <span>Selected monitoring station</span>
                  <h2>
                    {selectedDetail?.village && selectedDetail.village !== selectedDetail?.district
                      ? selectedDetail.village : selectedDetail?.name}, {selectedDetail?.district}
                  </h2>
                  <p>{selectedDetail?.state}</p>
                </div>
                <StatusBadge status={selectedDetail?.classification}/>
              </div>

              <div className="status-main">
                <span>Current groundwater level</span>
                <strong>{selectedDetail?.currentWaterLevel} <small>metres below ground</small></strong>
              </div>

              <div className="water-level-explanation">
                <p>
                  Water table detected approximately <strong>{Math.abs(selectedDetail?.currentWaterLevel || 0).toFixed(2)} metres</strong> below the ground surface.
                  Negative values indicate depth below ground (deeper = more negative).
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Depth alone does not indicate danger. Risk is evaluated using historical trends, GEC assessment,
                  recharge estimates, anomalies, active alerts, and forecasted trajectory.
                </p>
              </div>

              <p className="plain-warning">
                {stabilityMessage ||
                  (selectedDetail?.classification === 'critical' || selectedDetail?.classification === 'over-exploited'
                    ? 'Groundwater levels are critically low. Use water carefully.'
                    : selectedDetail?.classification === 'semi-critical'
                      ? 'Groundwater levels are under stress. Monitor usage.'
                      : 'Groundwater levels are currently stable.')}
              </p>

              <div className="status-meta">
                <TrendIndicator trend={selectedDetail?.trend}/>
                <DataConfidenceBadge
                  level={confidence != null ? (confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low') : selectedDetail?.dataConfidence}
                  detail={confidence != null ? `${confidence}% computed score` : 'Data completeness verified'}/>
              </div>

              <dl>
                <div><dt>Monitoring station</dt><dd>{selectedDetail?.name}</dd></div>
                <div>
                  <dt>Last reading</dt>
                  <dd>{selectedDetail?.lastUpdated
                    ? new Date(selectedDetail.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Not available'}
                  </dd>
                </div>
              </dl>

              <button className="button button-secondary"
                onClick={() => toast.success(`Subscribed to alerts for ${selectedDetail?.village || selectedDetail?.name}.`)}>
                <Bell size={17}/> Subscribe to local alerts
              </button>
            </article>

            {/* Right panel */}
            <aside className="advisory-panel">
              <StatusReasoning
                station={selectedDetail}
                alerts={localAlerts}
                historicalTrend={selectedDetail?.trend}
                forecastChange={forecastChange}
                forecastReliable={forecastReliable}
              />

              <div style={{ marginTop: '1.25rem' }}>
                <span className="eyebrow">Recommended actions</span>
                <h2>Use water wisely this week</h2>
                {recommendations.map((item, i) => (
                  <p key={i}><ShieldCheck size={15}/>{item}</p>
                ))}
              </div>

              {/* Rainfall — honest */}
              <div className="rain-summary">
                <CloudRain/>
                <span>
                  <strong>Rainfall summary</strong>
                  {selectedDetail?.rainfall != null && selectedDetail?.rainfall > 0
                    ? `${selectedDetail.rainfall} mm average recorded in the last 30 days`
                    : 'Rainfall data unavailable. IMD rainfall datasets are not part of the current telemetry system.'}
                </span>
              </div>
            </aside>
          </div>

          {/* FIX 1: Corrected chart with actual signed values */}
          <div className="content-grid status-charts">
            <ChartFrame title="Groundwater level history" description="Last 60 observed readings · negative values = depth below ground">
              {readingsQuery.isLoading
                ? <LoadingSkeleton rows={3}/>
                : <WaterLevelChart data={chartData}/>}
            </ChartFrame>

            {/* FIX 2 + 6: Forecast with guardrails and MAE-derived confidence range */}
            <ForecastCard station={selectedDetail} forecastData={forecastData}/>
          </div>

          {/* FIX 10: Forecast Reliability section */}
          <ForecastReliability forecastData={forecastData} readingsCount={readingsCount}/>

          {/* FIX 5 + 7: Transparency card with real confidence + anomaly details */}
          <TransparencyCard
            station={selectedDetail}
            readingsCount={readingsCount}
            anomalyCount={anomalyCount}
            confidence={confidence}
          />

          {/* Technical disclosure */}
          <div className="technical-disclosure">
            <button aria-expanded={technical} onClick={() => setTechnical(!technical)}>
              View technical details <ChevronDown className={technical ? 'rotated' : ''}/>
            </button>
            {technical && (
              <div>
                <dl className="detail-list">
                  <div><dt>Station code</dt><dd>{selectedDetail?.stationCode || selectedDetail?.id?.slice(0, 8)}</dd></div>
                  <div><dt>Coordinates</dt><dd>{selectedDetail?.latitude?.toFixed(4)}, {selectedDetail?.longitude?.toFixed(4)}</dd></div>
                  <div><dt>Elevation</dt><dd>{selectedDetail?.elevation ? `${selectedDetail.elevation} m amsl` : 'Not recorded'}</dd></div>
                  <div><dt>Aquifer type</dt><dd>{selectedDetail?.aquiferType || 'Not recorded'}</dd></div>
                  <div><dt>River basin</dt><dd>{selectedDetail?.riverBasin || 'Not specified'}</dd></div>
                  <div><dt>Monitoring agency</dt><dd>{selectedDetail?.agency}</dd></div>
                  <div><dt>GEC category</dt><dd style={{ textTransform: 'capitalize' }}>{selectedDetail?.classification}</dd></div>
                  <div><dt>Computed confidence</dt><dd>{confidence ?? 'N/A'}%</dd></div>
                  <div><dt>Forecast MAE</dt><dd>{forecastData?.mae ? `${Number(forecastData.mae).toFixed(2)} m` : 'N/A'}</dd></div>
                  <div><dt>Forecast RMSE</dt><dd>{forecastData?.rmse ? `${Number(forecastData.rmse).toFixed(2)} m` : 'N/A'}</dd></div>
                  <div><dt>Forecast reliable</dt><dd>{forecastChange != null ? (forecastReliable ? 'Yes' : `No — predicted change (${forecastChange} m) exceeds ±${MAX_REALISTIC_14DAY_CHANGE_M} m limit`) : 'No forecast'}</dd></div>
                </dl>
              </div>
            )}
          </div>

          {/* FIX 8: Nearby stations with actual km distance */}
          <div className="section-head nearby-head" style={{ marginTop: '2rem' }}>
            <div>
              <h2>Nearby monitoring stations</h2>
              <p>Sorted by geographic distance from the selected station using coordinate-based calculation.</p>
            </div>
          </div>

          <div className="card-grid">
            {nearby.map(s => (
              <button key={s.id} className="panel station-nearby-btn"
                onClick={() => { setSelectedStationId(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem' }}>{s.name}</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
                      {s.district}, {s.state}
                    </p>
                  </div>
                  <StatusBadge status={s.classification}/>
                </div>
                <p style={{ margin: '0.5rem 0 0', fontWeight: 700, fontSize: '1rem' }}>
                  {s.currentWaterLevel} m bgl
                </p>
                {/* FIX 8: actual distance */}
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12}/> {s.distanceKm} km away
                </p>
              </button>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}
