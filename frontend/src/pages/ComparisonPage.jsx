import { useMemo, useState } from 'react';
import { Download, Plus, Printer, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Breadcrumb, PageHeader } from '../components/layout/PortalLayout';
import { DataConfidenceBadge, StatusBadge, LoadingSkeleton, ErrorState } from '../components/common/UI';
import { ChartFrame, Hydrograph } from '../components/charts/Charts';
import { groundwaterService } from '../services/groundwater.service';

export default function ComparisonPage() {
  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: () => groundwaterService.getStations(),
  });

  const stations = stationsQuery.data || [];
  const [ids, setIds] = useState([]);

  // Initialize ids to first 2 stations once loaded
  useMemo(() => {
    if (stations.length > 0 && ids.length === 0) {
      setIds(stations.slice(0, 2).map((s) => s.id));
    }
  }, [stations]);

  const readingsQuery = useQuery({
    queryKey: ['readings', ids[0]],
    queryFn: () => groundwaterService.getReadings(ids[0]),
    enabled: !!ids[0]
  });

  const forecastQuery = useQuery({
    queryKey: ['forecast', ids[0]],
    queryFn: () => groundwaterService.getForecast(ids[0]),
    enabled: !!ids[0]
  });

  const [normalized, setNormalized] = useState(false);
  const selected = useMemo(() => stations.filter((s) => ids.includes(s.id)), [ids, stations]);

  const add = (id) => {
    if (ids.length >= 5) return toast.error('You can compare up to five stations.');
    if (id && !ids.includes(id)) setIds([...ids, id]);
  };

  if (stationsQuery.isLoading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={4}/></div></section>;
  if (stationsQuery.isError) return <section className="page-section"><div className="container"><ErrorState retry={stationsQuery.refetch}/></div></section>;

  return (
    <>
      <Breadcrumb items={['Researcher', 'Station Comparison']}/>
      <PageHeader title="Station Comparison" description="Compare GEC classifications, water levels, and trends for two to five monitoring stations."/>
      
      <section className="page-section">
        <div className="container">
          <div className="comparison-selector">
            <div className="selected-chips">
              {selected.map((s) => (
                <span key={s.id}>
                  {s.name}
                  <button aria-label={`Remove ${s.name}`} onClick={() => setIds(ids.filter((id) => id !== s.id))}>
                    <X size={14}/>
                  </button>
                </span>
              ))}
            </div>
            <label className="add-station">
              <Plus size={17}/>
              <select defaultValue="" onChange={(e) => { add(e.target.value); e.target.value = ''; }}>
                <option value="" disabled>Add station</option>
                {stations.filter((s) => !ids.includes(s.id)).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          </div>
          
          <div className="comparison-toolbar">
            <label>
              <input type="checkbox" checked={normalized} onChange={(e) => setNormalized(e.target.checked)}/> Normalize values for comparison
            </label>
            <div>
              <button className="button button-small button-outline" onClick={() => toast.success('Comparison CSV downloaded.')}><Download size={15}/> CSV</button>
              <button className="button button-small button-outline" onClick={() => toast.success('Comparison JSON downloaded.')}><Download size={15}/> JSON</button>
              <button className="button button-small" onClick={() => window.print()}><Printer size={15}/> Print summary</button>
            </div>
          </div>
          
          <ChartFrame title="Hydrograph Comparison" description="Observed timeseries for the primary selected station">
            <Hydrograph readings={readingsQuery.data || []} forecasts={forecastQuery.data?.forecast || []}/>
          </ChartFrame>
          
          <div className="comparison-table">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Classification</th>
                    <th>Water level</th>
                    <th>Coordinates</th>
                    <th>Telemetry source</th>
                    <th>Data confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        <small className="table-subtext">{s.stationCode || s.id.slice(0, 8)}</small>
                      </td>
                      <td><StatusBadge compact status={s.classification}/></td>
                      <td>{s.currentWaterLevel} m bgl</td>
                      <td>{s.latitude.toFixed(3)}, {s.longitude.toFixed(3)}</td>
                      <td>{s.agency}</td>
                      <td><DataConfidenceBadge level={s.dataConfidence}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
