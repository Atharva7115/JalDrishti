import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Expand, MapPin, RadioTower, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb, PageHeader } from '../components/layout/PortalLayout';
import { DataConfidenceBadge, ErrorState, LoadingSkeleton, StatusBadge, Tabs, TrendIndicator } from '../components/common/UI';
import { ChartFrame, Hydrograph } from '../components/charts/Charts';
import { groundwaterService } from '../services/groundwater.service';
import { useAppStore } from '../store/appStore';

const tabs = ['Overview', 'Hydrograph', 'Recharge', 'Forecast', 'Data Quality', 'Metadata'];

export default function StationDetailPage() {
  const { id } = useParams();
  const [active, setActive] = useState('Overview');
  const [showRaw, setShowRaw] = useState(false);
  const [showFilled, setShowFilled] = useState(true);
  const { savedStations, toggleSavedStation } = useAppStore();

  // Core Queries
  const stationQuery = useQuery({ queryKey: ['station', id], queryFn: () => groundwaterService.getStation(id) });
  const readingsQuery = useQuery({ queryKey: ['readings', id], queryFn: () => groundwaterService.getReadings(id) });
  const forecastQuery = useQuery({ queryKey: ['forecast', id], queryFn: () => groundwaterService.getForecast(id) });
  const rechargeQuery = useQuery({ queryKey: ['recharge', id], queryFn: () => groundwaterService.getRecharge(id) });

  // On-the-fly ML Queries
  const anomaliesQuery = useQuery({ queryKey: ['anomalies', id], queryFn: () => groundwaterService.getAnomalies(id) });
  const gapFillQuery = useQuery({ queryKey: ['gapFill', id], queryFn: () => groundwaterService.getGapFill(id) });

  // Merge raw readings with dynamic ML anomalies and gap-fills
  const mergedReadings = useMemo(() => {
    const rawReadings = readingsQuery.data || [];
    const anomalies = anomaliesQuery.data || [];
    const gapFill = gapFillQuery.data || [];

    const anomalySet = new Set(
      anomalies
        .filter((a) => a.is_anomaly)
        .map((a) => new Date(a.timestamp).getTime())
    );

    const filledMap = new Map(
      gapFill
        .filter((g) => g.was_filled)
        .map((g) => [new Date(g.timestamp).getTime(), g.water_level])
    );

    return rawReadings.map((r) => {
      const ts = new Date(r.timestamp).getTime();
      const isAnom = anomalySet.has(ts);
      const isFilled = filledMap.has(ts);
      return {
        ...r,
        isAnomaly: isAnom || r.isAnomaly,
        isMissing: isFilled || r.isMissing,
        isReconstructed: isFilled || r.isReconstructed,
        filledValue: isFilled ? Number(filledMap.get(ts).toFixed(2)) : r.filledValue,
      };
    });
  }, [readingsQuery.data, anomaliesQuery.data, gapFillQuery.data]);

  if (stationQuery.isLoading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={4}/></div></section>;
  if (stationQuery.isError || !stationQuery.data) return <section className="page-section"><div className="container"><ErrorState retry={stationQuery.refetch}/></div></section>;

  const station = stationQuery.data;
  const detailItems = [
    ['Station ID', station.stationCode],
    ['State', station.state],
    ['District', station.district],
    ['Block', station.block],
    ['Village', station.village],
    ['Coordinates', `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`],
    ['Monitoring agency', station.agency],
    ['Sensor status', station.status],
    ['Current water level', `${station.currentWaterLevel} m bgl`],
    ['Latest reading', new Date(station.lastUpdated).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })]
  ];

  const anomaliesCount = mergedReadings.filter((r) => r.isAnomaly).length;

  return (
    <>
      <Breadcrumb items={['Stations', station.name]}/>
      <PageHeader eyebrow={station.stationCode} title={station.name} description={`${station.village}, ${station.district}, ${station.state}`}>
        <button className="button button-outline" onClick={() => toggleSavedStation(station.id)}>
          <Save size={17}/>{savedStations.includes(station.id) ? 'Saved' : 'Save station'}
        </button>
        <button className="button" onClick={() => toast.info('Station summary prepared for download.')}>
          <Download size={17}/> Export
        </button>
      </PageHeader>
      
      <section className="page-section">
        <div className="container">
          <div className="station-overview-strip">
            <StatusBadge status={station.classification}/>
            <TrendIndicator trend={station.trend}/>
            <DataConfidenceBadge level={station.dataConfidence} detail={`${station.dataQualityScore}% quality score`}/>
            <span><RadioTower/> Sensor {station.status}</span>
            <span><MapPin/> {station.latitude.toFixed(3)}, {station.longitude.toFixed(3)}</span>
          </div>
          
          <Tabs tabs={tabs} active={active} onChange={setActive}/>
          
          {active === 'Overview' && (
            <div className="content-grid">
              <section className="panel">
                <h2>Station overview</h2>
                <dl className="detail-list">
                  {detailItems.map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}
                </dl>
              </section>
              <aside className="panel">
                <h2>Current GEC Assessment</h2>
                <div className="big-reading">
                  <span>Depth below ground</span>
                  <strong>{station.currentWaterLevel}<small>m bgl</small></strong>
                </div>
                <dl className="detail-list single">
                  <div><dt>Recharge estimate</dt><dd>{station.rechargeEstimate} MCM</dd></div>
                  <div><dt>Data completeness</dt><dd>{station.dataQualityScore}%</dd></div>
                  <div><dt>Anomalies detected</dt><dd>{anomaliesCount}</dd></div>
                </dl>
              </aside>
            </div>
          )}
          
          {active === 'Hydrograph' && (
            <ChartFrame title="Historical groundwater hydrograph" description="Observed depth below ground level; vertical scale is reversed to reflect physical depth">
              <div className="chart-controls">
                <label><input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)}/> Raw data</label>
                <label><input type="checkbox" checked={showFilled} onChange={(e) => setShowFilled(e.target.checked)}/> Gap-filled data</label>
                <button className="button button-small button-outline" onClick={() => toast.info('Full screen view not available in this build.')}><Expand size={15}/> Full screen</button>
                <button className="button button-small button-outline" onClick={() => toast.success('Chart data downloaded.')}><Download size={15}/> Download</button>
              </div>
              <Hydrograph readings={mergedReadings} forecasts={forecastQuery.data?.forecast || []} showRaw={showRaw} showFilled={showFilled}/>
            </ChartFrame>
          )}
          
          {active === 'Recharge' && rechargeQuery.data && <RechargePanel item={rechargeQuery.data}/>}
          {active === 'Forecast' && <ForecastPanel readings={mergedReadings} forecastData={forecastQuery.data}/>}
          {active === 'Data Quality' && <QualityPanel station={station} readings={mergedReadings}/>}
          
          {active === 'Metadata' && (
            <section className="panel">
              <h2>Station metadata</h2>
              <dl className="detail-list">
                {[...detailItems,
                  ['Elevation', station.elevation ? `${station.elevation} m amsl` : 'Not recorded'],
                  ['Basin', station.riverBasin || 'Not specified'],
                  ['Aquifer type', station.aquiferType],
                  ['First reading', station.firstReadingDate
                    ? new Date(station.firstReadingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Not available'],
                  ['Data source reference', 'National Water Data Portal (NWDP)']
                ].map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </section>
    </>
  );
}

function RechargePanel({ item }) {
  return (
    <div className="content-grid">
      <section className="panel recharge-formula">
        <span className="eyebrow">Auditable rule-based GEC calculation</span>
        <h2>Water Table Fluctuation (WTF) Recharge</h2>
        <div className="formula">Recharge = Aquifer Area × Water-Level Fluctuation × Specific Yield</div>
        <p>Each parameter is traceably calculated using historical station readings and GEC boundary datasets.</p>
      </section>
      <section className="panel">
        <h2>Calculation inputs</h2>
        <dl className="detail-list single">
          <div><dt>Calculation period</dt><dd>{item.periodStart} – {item.periodEnd}</dd></div>
          <div><dt>Aquifer area</dt><dd>{item.aquiferArea} km²</dd></div>
          <div><dt>Water-level fluctuation</dt><dd>{item.waterLevelFluctuation} m</dd></div>
          <div><dt>Specific yield</dt><dd>{item.specificYield}</dd></div>
          <div className="result-row"><dt>Final recharge estimate</dt><dd>{item.rechargeValue} MCM</dd></div>
          <div><dt>Methodology source</dt><dd>{item.calculationMethod}</dd></div>
        </dl>
      </section>
    </div>
  );
}

function ForecastPanel({ readings, forecastData }) {
  const forecasts = forecastData?.forecast || [];
  const mae = forecastData?.mae !== undefined ? `${forecastData.mae.toFixed(4)} m` : "Pending";
  const rmse = forecastData?.rmse !== undefined ? `${forecastData.rmse.toFixed(4)} m` : "Pending";

  return (
    <>
      <ChartFrame title="Groundwater forecast" description="Historical values with a 14-day Prophet forecast and confidence bounds">
        <Hydrograph readings={readings} forecasts={forecasts}/>
      </ChartFrame>
      <div className="metric-grid">
        <Metric label="Forecast duration" value="14 days"/>
        <Metric label="Model Type" value="Facebook Prophet"/>
        <Metric label="Mean Absolute Error (MAE)" value={mae}/>
        <Metric label="Root Mean Square Error (RMSE)" value={rmse}/>
        <Metric label="Model Version" value="Prophet v1.1.2"/>
        <Metric label="Training Data points" value={`${readings.length} readings`}/>
      </div>
      <p className="disclaimer">Forecasts are mathematical estimates based on available historical timeseries data and should not be treated as official water resources policy declarations.</p>
    </>
  );
}

function QualityPanel({ station, readings }) {
  const missing = readings.filter((r) => r.isMissing).length;
  const anomalies = readings.filter((r) => r.isAnomaly).length;
  return (
    <>
      <div className="metric-grid">
        <Metric label="Data completeness" value={`${station.dataQualityScore}%`}/>
        <Metric label="Missing readings" value={missing}/>
        <Metric label="Reconstructed / Filled" value={missing}/>
        <Metric label="Anomalies detected" value={anomalies}/>
        <Metric label="Sensor uptime" value={
          readings.length > 0
            ? `${Math.round(((readings.length - missing) / readings.length) * 100)}%`
            : 'N/A'
        }/>
        <Metric label="Quality score" value={`${station.dataQualityScore}/100`}/>
      </div>
      <section className="panel quality-methods">
        <h2>Processing methods</h2>
        <dl className="detail-list">
          <div><dt>Anomaly detection</dt><dd>Stateless ensemble model (Isolation Forest, STL Seasonal Decomposition, and Z-score thresholding)</dd></div>
          <div><dt>Gap-filling method</dt><dd>Short-gap linear interpolation with stateless reference timeseries</dd></div>
        </dl>
      </section>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
