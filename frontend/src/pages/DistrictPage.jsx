import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Database, Droplets, FileText, RadioTower } from 'lucide-react';
import { Breadcrumb, PageHeader } from '../components/layout/PortalLayout';
import { AlertCard, EmptyState, StatusBadge, SummaryCard, Tabs, TrendIndicator, LoadingSkeleton, ErrorState } from '../components/common/UI';
import { ChartFrame, TrendChart } from '../components/charts/Charts';
import { groundwaterService } from '../services/groundwater.service';

export function DistrictListPage() {
  const districtsQuery = useQuery({
    queryKey: ['districts'],
    queryFn: () => groundwaterService.getDistricts(),
  });

  if (districtsQuery.isLoading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={4}/></div></section>;
  if (districtsQuery.isError) return <section className="page-section"><div className="container"><ErrorState retry={districtsQuery.refetch}/></div></section>;

  const districtsList = districtsQuery.data || [];

  return (
    <>
      <Breadcrumb items={['District Status']}/>
      <PageHeader title="District Groundwater Status" description="Compare GEC classifications, station densities, trends, and alerts across monitored districts."/>
      <section className="page-section">
        <div className="container district-grid">
          {districtsList.map((d) => (
            <a className="district-card" href={`/districts/${d.district.toLowerCase()}`} key={d.district}>
              <div>
                <span>{d.state}</span>
                <h2>{d.district}</h2>
              </div>
              <StatusBadge status={d.classification}/>
              <dl>
                <div><dt>Live Stations</dt><dd>{d.stationCount}</dd></div>
                <div><dt>Coverage</dt><dd>{d.dataCoverage}%</dd></div>
                <div><dt>Active alerts</dt><dd>{d.activeAlerts}</dd></div>
              </dl>
              <TrendIndicator trend={d.trend}/>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

export default function DistrictPage() {
  const { slug } = useParams();
  const [active, setActive] = useState('Summary');

  const districtQuery = useQuery({
    queryKey: ['district', slug],
    queryFn: () => groundwaterService.getDistrict(slug),
  });

  const alertsQuery = useQuery({
    queryKey: ['alerts', { district: districtQuery.data?.district }],
    queryFn: () => groundwaterService.getAlerts({ district: districtQuery.data?.district }),
    enabled: !!districtQuery.data?.district
  });

  if (districtQuery.isLoading || alertsQuery.isLoading) {
    return <section className="page-section"><div className="container"><LoadingSkeleton rows={4}/></div></section>;
  }

  if (districtQuery.isError || alertsQuery.isError) {
    return <section className="page-section"><div className="container"><ErrorState retry={() => { districtQuery.refetch(); alertsQuery.refetch(); }}/></div></section>;
  }

  const district = districtQuery.data;
  const localStations = district.stations || [];
  const localAlerts = alertsQuery.data?.data || [];

  return (
    <>
      <Breadcrumb items={['Districts', district.district]}/>
      <PageHeader eyebrow={district.state} title={`${district.district} District Summary`} description="Current groundwater decision summary with trends, alerts, station coverage, and recommended actions."/>
      
      <section className="page-section">
        <div className="container">
          <div className="district-status-banner">
            <div>
              <span>Current district classification</span>
              <StatusBadge status={district.classification}/>
            </div>
            <div>
              <span>Previous classification</span>
              <StatusBadge status={district.previousClassification}/>
            </div>
            <div>
              <span>Current trend</span>
              <TrendIndicator trend={district.trend}/>
            </div>
            <p><strong>Recommended action:</strong> {district.recommendedAction}</p>
          </div>
          
          <div className="summary-grid district-metrics">
            <SummaryCard icon={RadioTower} label="Monitored stations" value={district.stationCount} support="Within district"/>
            <SummaryCard icon={Droplets} label="Average water level" value={`${district.averageWaterLevel} m bgl`} support="Dynamic district average"/>
            <SummaryCard icon={Database} label="Data coverage" value={`${district.dataCoverage}%`} support="Current period"/>
            <SummaryCard icon={AlertTriangle} label="Active alerts" value={district.activeAlerts} support="Requires review"/>
          </div>
          
          <Tabs tabs={['Summary', 'Stations', 'Trends', 'Alerts', 'Reports']} active={active} onChange={setActive}/>
          
          {active === 'Summary' && (
            <div className="content-grid">
              <ChartFrame title="District water-level trend">
              <TrendChart data={localStations
                .filter(s => s.currentWaterLevel !== null && s.currentWaterLevel !== undefined)
                .map((s, i) => ({ month: s.name.slice(0, 8), level: Math.abs(s.currentWaterLevel) }))
                .slice(0, 30)
              }/>
            </ChartFrame>
              <section className="panel">
                <h2>High-risk blocks</h2>
                {district.highRiskBlocks.map((block) => (
                  <div className="risk-block" key={block}>
                    <AlertTriangle/>
                    <span><strong>{block}</strong><small>Declining trend · review recommended</small></span>
                  </div>
                ))}
                {!district.highRiskBlocks.length && <p className="risk-block">No critical/over-exploited blocks mapped in this district.</p>}
              </section>
            </div>
          )}
          
          {active === 'Stations' && (
            localStations.length ? (
              <div className="card-grid">
                {localStations.map((s) => (
                  <article className="panel" key={s.id}>
                    <h3>{s.name}</h3>
                    <StatusBadge status={s.classification}/>
                    <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{s.currentWaterLevel} m bgl</p>
                    <Link className="text-link" to={`/stations/${s.id}`} style={{ marginTop: '0.75rem', display: 'inline-block' }}>
                      View details
                    </Link>
                  </article>
                ))}
              </div>
            ) : <EmptyState/>
          )}
          
          {active === 'Trends' && (
            <ChartFrame title="Groundwater and recharge trend">
            <TrendChart data={localStations
              .filter(s => s.currentWaterLevel !== null && s.currentWaterLevel !== undefined)
              .map(s => ({ month: s.name.slice(0, 8), level: Math.abs(s.currentWaterLevel) }))
              .slice(0, 30)
            }/>
          </ChartFrame>
          )}
          
          {active === 'Alerts' && (
            localAlerts.length ? (
              <div className="card-grid">
                {localAlerts.map((a) => (
                  <AlertCard 
                    key={a.id} 
                    alert={{
                      ...a,
                      status: a.acknowledged ? 'Acknowledged' : 'New',
                      message: a.description
                    }}
                  />
                ))}
              </div>
            ) : <EmptyState title="No active district alerts"/>
          )}
          
          {active === 'Reports' && (
            <section className="state-panel">
              <FileText/>
              <h2>Create a district report</h2>
              <p>Generate a printable summary using current station readings.</p>
              <Link className="button" to="/reports">Open report builder</Link>
            </section>
          )}
        </div>
      </section>
    </>
  );
}
