import { useState } from 'react';
import { Check, Download, Eye, FileText, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, PageHeader } from '../components/layout/PortalLayout';
import { DemoBadge, LoadingSkeleton, ErrorState } from '../components/common/UI';
import { groundwaterService } from '../services/groundwater.service';

export default function ReportsPage() {
  const [selectedDistrict, setSelectedDistrict] = useState('Nagpur');
  const [preview, setPreview] = useState(false);
  const [options, setOptions] = useState({
    charts: true,
    map: true,
    stations: true,
    recommendations: true
  });

  const toggle = (key) => setOptions({ ...options, [key]: !options[key] });

  // 1. Fetch list of districts dynamically
  const districtsQuery = useQuery({
    queryKey: ['districts'],
    queryFn: () => groundwaterService.getDistricts(),
  });

  // 2. Fetch specific district details dynamically
  const districtQuery = useQuery({
    queryKey: ['districtDetails', selectedDistrict],
    queryFn: () => groundwaterService.getDistrict(selectedDistrict),
    enabled: !!selectedDistrict,
  });

  const districts = districtsQuery.data || [];
  const districtDetails = districtQuery.data;

  // 3. Dynamic recommendation text
  const getRecommendationText = (classification) => {
    const cat = classification ? classification.toLowerCase() : 'safe';
    if (cat === 'over-exploited') {
      return "Execute immediate demand controls, ban new commercial borewells, and implement artificial recharge structures.";
    }
    if (cat === 'critical') {
      return "Prioritize drinking water allocations, restrict non-essential agricultural pumping, and enforce water-saving drip irrigation.";
    }
    if (cat === 'semi-critical') {
      return "Monitor extraction rates, promote localized rainwater harvesting, and advise farmers to avoid additional extraction.";
    }
    return "Continue routine monitoring, maintain existing recharge wells, and promote water conservation practices.";
  };

  // 4. Fully functional CSV exporter using live report details
  const exportCSV = () => {
    if (!districtDetails) {
      toast.error("No report data available to export.");
      return;
    }
    const headers = ["Station ID", "Station Name", "Classification", "Water Level (m bgl)"];
    const rows = (districtDetails.stations || []).map(s => [
      s.id,
      s.name,
      s.classification,
      s.currentWaterLevel
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedDistrict}_Groundwater_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Groundwater Report CSV downloaded successfully.");
  };

  if (districtsQuery.isLoading) {
    return (
      <div className="container" style={{ padding: "40px" }}>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (districtsQuery.isError) {
    return (
      <div className="container" style={{ padding: "40px" }}>
        <ErrorState retry={districtsQuery.refetch} />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb items={['Reports', 'Report Builder']} />
      <PageHeader
        title="Groundwater Report Builder"
        description="Create a printable planning summary using current live database metrics."
      >
        <DemoBadge />
      </PageHeader>

      <section className="page-section">
        <div className="container report-layout">
          <section className="panel">
            <h2>Report configuration</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="report-type">Report type</label>
                <select id="report-type">
                  <option>District groundwater report</option>
                  <option>Critical-station report</option>
                  <option>Weekly status report</option>
                  <option>Monthly trend report</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="report-state">State</label>
                <select id="report-state">
                  <option>Maharashtra</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="report-district">District</label>
                <select
                  id="report-district"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                >
                  {districts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="report-date">Date range</label>
                <input id="report-date" type="date" defaultValue="2026-07-01" />
              </div>
            </div>

            <fieldset className="report-options">
              <legend>Include sections</legend>
              {Object.keys(options).map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={() => toggle(key)}
                  />
                  <span>
                    <Check />
                    {key[0].toUpperCase() + key.slice(1)}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="form-actions">
              <button className="button" onClick={() => setPreview(true)}>
                <Eye size={17} /> Preview report
              </button>
              <button className="button button-outline" onClick={exportCSV}>
                <FileText size={17} /> Generate Report CSV
              </button>
            </div>
          </section>

          <aside className={`report-preview ${preview ? 'ready' : ''}`}>
            {districtQuery.isLoading ? (
              <div style={{ padding: "20px" }}>
                <LoadingSkeleton rows={3} />
              </div>
            ) : (
              <div className="report-paper">
                <span className="report-kicker">JalDrishti · Official Groundwater Report</span>
                <h1>District Groundwater Report</h1>
                <p>Maharashtra · {selectedDistrict} District</p>
                <div className="report-rule" />

                {options.stations && (
                  <>
                    <h2>Executive groundwater summary</h2>
                    <p>
                      {selectedDistrict} district is currently classified as{' '}
                      <strong style={{ textTransform: 'capitalize' }}>
                        {districtDetails?.classification || 'Safe'}
                      </strong>
                      , with an average monitored groundwater level of{' '}
                      <strong>{districtDetails?.averageWaterLevel || 0} m bgl</strong>.
                      There are currently {districtDetails?.stations?.length || 0} telemetry monitoring points active in this region.
                    </p>

                    <div className="report-numbers">
                      <span>
                        <strong>{districtDetails?.stations?.filter(s => s.classification !== 'safe').length || 0}</strong>
                        Critical points
                      </span>
                      <span>
                        <strong>{districtDetails?.activeAlerts || 0}</strong>
                        Active Alerts
                      </span>
                      <span>
                        <strong>{districtDetails?.stations?.length || 0}</strong>
                        Stations
                      </span>
                    </div>
                  </>
                )}

                {options.recommendations && (
                  <>
                    <h2>Recommended action</h2>
                    <p>{getRecommendationText(districtDetails?.classification)}</p>
                  </>
                )}

                <small>
                  Generated dynamically by JalDrishti Decision-Support Panel ·{' '}
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </small>
              </div>
            )}

            {!preview && (
              <div className="preview-cover">
                <Eye />
                <strong>Report preview</strong>
                <span>Configure the report and select Preview.</span>
              </div>
            )}

            <div className="report-actions">
              <button onClick={() => window.print()}>
                <Printer /> Print
              </button>
              <button onClick={exportCSV}>
                <Download /> Download CSV
              </button>
              <button
                onClick={() =>
                  navigator.share
                    ? navigator.share({
                        title: `JalDrishti Report - ${selectedDistrict}`,
                        text: `Groundwater telemetry report for ${selectedDistrict} District.`
                      })
                    : toast.info('Share is not supported in this browser.')
                }
              >
                <Share2 /> Share
              </button>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
