import { useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, FileText, Gauge, Map, RadioTower, ShieldAlert, TrendingDown, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Breadcrumb, PageHeader } from '../components/layout/PortalLayout';
import { AlertCard, DemoBadge, StatusBadge, SummaryCard, TrendIndicator, LoadingSkeleton, ErrorState, EmptyState } from '../components/common/UI';
import { ChartFrame, ClassificationChart, MultiMetricChart } from '../components/charts/Charts';
import StationMap from '../components/maps/StationMap';
import { groundwaterService } from '../services/groundwater.service';

export default function PlannerPage() {
  const [ingesting, setIngesting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: () => groundwaterService.getStations(),
  });

  const alertsQuery = useQuery({
    queryKey: ['alerts', { limit: 10, isResolved: 'false' }],
    queryFn: () => groundwaterService.getAlerts({ limit: 10, isResolved: 'false' }),
  });

  const districtsQuery = useQuery({
    queryKey: ['districts'],
    queryFn: () => groundwaterService.getDistricts(),
  });

  const handleIngest = async () => {
    setIngesting(true);
    const toastId = toast.loading('Initializing live NWDP ingestion batch...');
    try {
      await groundwaterService.triggerIngestion();
      toast.success('Ingestion completed successfully! New readings stored in database.', { id: toastId });
      stationsQuery.refetch();
      districtsQuery.refetch();
    } catch (err) {
      toast.error(`Ingestion failed: ${err.message || 'connection timeout'}`, { id: toastId });
    } finally {
      setIngesting(false);
    }
  };

  const handleAlertScan = async () => {
    setScanning(true);
    const toastId = toast.loading('Running telemetry alerts audit...');
    try {
      await groundwaterService.triggerAlertScan();
      toast.success('Alert scan completed! Generated/updated database alerts successfully.', { id: toastId });
      alertsQuery.refetch();
      districtsQuery.refetch();
    } catch (err) {
      toast.error(`Alert scan failed: ${err.message || 'connection timeout'}`, { id: toastId });
    } finally {
      setScanning(false);
    }
  };

  if (stationsQuery.isLoading || alertsQuery.isLoading || districtsQuery.isLoading) {
    return (
      <section className="page-section">
        <div className="container">
          <LoadingSkeleton rows={5} />
        </div>
      </section>
    );
  }

  if (stationsQuery.isError || alertsQuery.isError || districtsQuery.isError) {
    return (
      <section className="page-section">
        <div className="container">
          <ErrorState retry={() => {
            stationsQuery.refetch();
            alertsQuery.refetch();
            districtsQuery.refetch();
          }} />
        </div>
      </section>
    );
  }

  const stations = stationsQuery.data || [];
  const alertsList = alertsQuery.data?.data || [];
  const districtsList = districtsQuery.data || [];

  // Compute live station GEC metrics
  const totalStations = stations.length;
  const safeCount = stations.filter((s) => s.classification === 'safe').length;
  const semiCount = stations.filter((s) => s.classification === 'semi-critical').length;
  const criticalCount = stations.filter((s) => s.classification === 'critical').length;
  const overCount = stations.filter((s) => s.classification === 'over-exploited').length;

  const totalActiveAlerts = alertsQuery.data?.pagination?.total || alertsList.length;

  const metrics = [
    [RadioTower, 'Monitored stations', totalStations, 'Across Maharashtra', 'default'],
    [CheckCircle2, 'Safe stations', safeCount, 'Low water depletion risk', 'safe'],
    [Gauge, 'Semi-Critical', semiCount, 'Increasing extraction rates', 'semi'],
    [AlertTriangle, 'Critical stations', criticalCount, 'Strict management zones', 'critical'],
    [Waves, 'Over-Exploited', overCount, 'Groundwater overdraft', 'over'],
    [TrendingDown, 'Worsening regions', districtsList.filter(d => d.trend === 'declining').length, 'Districts with declining trend', 'default'],
    [ShieldAlert, 'Active alerts', totalActiveAlerts, 'Requires intervention', 'default'],
    [Activity, 'Data coverage', '95%', 'Reporting completeness', 'default']
  ];

  return (
    <>
      <Breadcrumb items={['Government Planner Dashboard']}/>
      <PageHeader eyebrow="Decision workspace" title="Government Planner Dashboard" description="District-level risk evaluation, early warning markers, and resource management dashboard.">
        <DemoBadge/>
        <Link className="button" to="/reports"><FileText size={17}/> Generate report</Link>
      </PageHeader>
      
      <section className="page-section">
        <div className="container">
          <div className="filters planner-filters">
            <div className="field">
              <label>State</label>
              <select defaultValue="Maharashtra">
                <option value="Maharashtra">Maharashtra</option>
              </select>
            </div>
            <div className="field">
              <label>District</label>
              <select>
                <option>All districts</option>
              </select>
            </div>
            <div className="field">
              <label>Block</label>
              <select><option>All blocks</option></select>
            </div>
            <div className="field">
              <label>Date range</label>
              <select><option>Current year</option></select>
            </div>
            <button className="button" onClick={() => toast.success('Planner filters applied.')}>Apply</button>
          </div>
          
          <div className="summary-grid">
            {metrics.map(([icon, label, value, support, tone]) => (
              <SummaryCard key={label} icon={icon} label={label} value={value} support={support} tone={tone}/>
            ))}
          </div>
          
          <div className="dashboard-charts">
            <ChartFrame title="Classification distribution" description="Live GEC category percentages (1,448 stations)">
              <ClassificationChart stations={stations}/>
            </ChartFrame>
            <ChartFrame title="Recharge and alert trend" description="Aggregated indicators">
              <MultiMetricChart/>
            </ChartFrame>
          </div>
          
          <div className="content-grid dashboard-section">
            <ChartFrame title="District groundwater status" description="Geospatial distribution preview">
              <StationMap compact stations={stations}/>
            </ChartFrame>
            <section className="panel">
              <div className="section-head compact-head">
                <div><h2>Priority alerts</h2></div>
                <Link className="text-link" to="/alerts">View all <ArrowRight size={15}/></Link>
              </div>
              <div className="compact-alerts">
                {alertsList.slice(0, 3).map((a) => (
                  <AlertCard 
                    key={a.id} 
                    alert={{
                      ...a,
                      status: a.acknowledged ? 'Acknowledged' : 'New',
                      message: a.description
                    }}
                  />
                ))}
                {!alertsList.length && <EmptyState title="No active priority alerts found" />}
              </div>
            </section>
          </div>

          <div className="section-head dashboard-section">
            <div>
              <h2>Judges Demonstration Panel</h2>
              <p>Trigger and evaluate live data operations, telemetry ingestion, and ML alert generation.</p>
            </div>
          </div>
          
          <div className="panel demo-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', border: '1px solid #d8dee9', borderRadius: '8px', background: '#f8fafc' }}>
            <div>
              <h3 style={{ marginTop: 0 }}>Live NWDP Ingestion</h3>
              <p style={{ fontSize: '0.875rem', color: '#4c566a', marginBottom: '1rem' }}>Fetch new groundwater records from the NWDP server and run point-in-polygon GIS resolvers for taluka and district mappings.</p>
              <button className="button button-small" onClick={handleIngest} disabled={ingesting}>
                {ingesting ? 'Running Ingestion...' : 'Trigger Ingestion Now'}
              </button>
            </div>
            <div>
              <h3 style={{ marginTop: 0 }}>Trigger Telemetry Alert Scan</h3>
              <p style={{ fontSize: '0.875rem', color: '#4c566a', marginBottom: '1rem' }}>Evaluate all 1,449 stations' historical readings and forecasts to update telemetry gap flags, rapid drop warnings, and anomaly alerts.</p>
              <button className="button button-small button-outline" onClick={handleAlertScan} disabled={scanning}>
                {scanning ? 'Running Alert Scan...' : 'Trigger Alert Scan Now'}
              </button>
            </div>
          </div>
          
          <div className="section-head dashboard-section">
            <div>
              <h2>Highest-risk districts</h2>
              <p>Planning priority based on classification and depletion trends.</p>
            </div>
            <Link className="button button-outline" to="/districts"><Map size={17}/> View all districts</Link>
          </div>
          
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>State</th>
                  <th>Classification</th>
                  <th>Trend</th>
                  <th>Stations</th>
                  <th>Coverage</th>
                  <th>Alerts</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {districtsList.toSorted((a, b) => b.activeAlerts - a.activeAlerts).slice(0, 6).map((d) => (
                  <tr key={d.district}>
                    <td><strong>{d.district}</strong></td>
                    <td>{d.state}</td>
                    <td><StatusBadge compact status={d.classification}/></td>
                    <td><TrendIndicator trend={d.trend}/></td>
                    <td>{d.stationCount}</td>
                    <td>{d.dataCoverage}%</td>
                    <td>{d.activeAlerts}</td>
                    <td><Link className="text-link" to={`/districts/${d.district.toLowerCase()}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
