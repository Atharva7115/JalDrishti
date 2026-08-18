import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartSummary } from '../../data/mockData';

const COLORS = ['#2f7d4a', '#d89b1d', '#d96c18', '#b42318'];

export function ChartFrame({ title, description, children, className = '' }) { return <section className={`chart-card ${className}`}><div className="chart-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div><div className="chart-body">{children}</div></section>; }

export function TrendChart({ data = chartSummary, dataKey = 'level', color = '#1e5a96', label = 'Water level' }) { return <div className="chart-accessible" role="img" aria-label={`${label} trend chart for the last six months`}><ResponsiveContainer width="100%" height={280}><AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}><defs><linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={.24}/><stop offset="95%" stopColor={color} stopOpacity={.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e4e9ef" /><XAxis dataKey={data[0]?.month ? 'month' : 'date'} /><YAxis unit={dataKey === 'level' ? 'm' : ''} /><Tooltip /><Area type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2.5} fill={`url(#fill-${dataKey})`} /></AreaChart></ResponsiveContainer></div>; }

export function ClassificationChart({ stations }) { const data = ['safe', 'semi-critical', 'critical', 'over-exploited'].map((name) => ({ name, value: stations.filter((station) => station.classification === name).length })); return <div role="img" aria-label="Station classification distribution"><ResponsiveContainer width="100%" height={270}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>{data.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip /><Legend formatter={(value) => value.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')} /></PieChart></ResponsiveContainer></div>; }

export function MultiMetricChart({ data = chartSummary }) { return <div role="img" aria-label="Groundwater recharge and anomaly trend"><ResponsiveContainer width="100%" height={280}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#e4e9ef"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Legend/><Bar dataKey="recharge" name="Recharge estimate" fill="#087e8b" radius={[3,3,0,0]}/><Bar dataKey="anomalies" name="Anomalies" fill="#d89b1d" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>; }

export function Hydrograph({ readings, forecasts = [], showRaw = false, showFilled = true }) {
  const historical = readings.slice(-60).map((item) => ({
    date: new Date(item.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    cleaned: item.cleanedValue,
    raw: item.rawValue,
    filled: item.filledValue,
    anomaly: item.isAnomaly ? item.cleanedValue : null,
    imputed: item.isMissing ? item.filledValue : null,
  }));

  const future = forecasts.map((item) => ({
    date: new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    forecast: item.predictedValue,
    lower: item.lowerBound,
    upper: item.upperBound,
  }));

  const data = [...historical, ...future];

  return (
    <div className="chart-wide" role="img" aria-label="Historical groundwater hydrograph with forecast">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e9ef"/>
          <XAxis dataKey="date"/>
          <YAxis reversed unit=" m" label={{ value: 'Depth below ground (m bgl)', angle: -90, position: 'insideLeft' }}/>
          <Tooltip/>
          <Legend/>
          
          <Line connectNulls type="monotone" dataKey="cleaned" name="Cleaned level" stroke="#1e5a96" strokeWidth={2.5} dot={false}/>
          {showRaw && <Line connectNulls type="monotone" dataKey="raw" name="Raw level" stroke="#718096" strokeDasharray="4 4" dot={false}/>}
          {showFilled && <Line connectNulls type="monotone" dataKey="filled" name="Gap-filled" stroke="#087e8b" dot={false}/>}
          
          {/* Real ML Forecast and Confidence Intervals */}
          <Line connectNulls type="monotone" dataKey="forecast" name="Forecast" stroke="#7c3aed" strokeWidth={2} strokeDasharray="7 4" dot={false}/>
          <Line connectNulls type="monotone" dataKey="lower" name="Lower Bound" stroke="#c084fc" strokeDasharray="3 3" strokeWidth={1} dot={false}/>
          <Line connectNulls type="monotone" dataKey="upper" name="Upper Bound" stroke="#c084fc" strokeDasharray="3 3" strokeWidth={1} dot={false}/>
          
          {/* Highlighted Markers */}
          <Line connectNulls type="monotone" dataKey="anomaly" name="Anomaly Point" stroke="#ef4444" strokeWidth={0} dot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fca5a5' }}/>
          <Line connectNulls type="monotone" dataKey="imputed" name="Imputed Point" stroke="#087e8b" strokeWidth={0} dot={{ r: 4, stroke: '#087e8b', strokeWidth: 1.5, fill: '#99f6e4' }}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
