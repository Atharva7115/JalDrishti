const states = [
  { name: 'Maharashtra', districts: ['Nagpur', 'Pune', 'Nashik'], center: [21.1458, 79.0882] },
  { name: 'Rajasthan', districts: ['Jaipur', 'Jodhpur', 'Ajmer'], center: [26.9124, 75.7873] },
  { name: 'Madhya Pradesh', districts: ['Bhopal', 'Indore'], center: [23.2599, 77.4126] },
];

const villages = ['Kalmeshwar', 'Hingna', 'Mulshi', 'Sinnar', 'Sanganer', 'Osian', 'Kishangarh', 'Phanda', 'Depalpur', 'Kamptee'];
const classifications = ['safe', 'semi-critical', 'critical', 'over-exploited'];
const trends = ['rising', 'stable', 'falling'];

/** @type {import('../types/index.js').Station[]} */
export const stations = Array.from({ length: 30 }, (_, index) => {
  const stateInfo = states[index % states.length];
  const district = stateInfo.districts[index % stateInfo.districts.length];
  const classification = classifications[index % classifications.length];
  const quality = 72 + ((index * 7) % 28);
  return {
    id: `station-${index + 1}`,
    stationCode: `${stateInfo.name.slice(0, 2).toUpperCase()}-${district.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    name: `${district} DWLR ${String((index % 8) + 1).padStart(2, '0')}`,
    state: stateInfo.name,
    district,
    block: `${district} Rural`,
    village: villages[index % villages.length],
    latitude: stateInfo.center[0] + ((index % 5) - 2) * 0.12,
    longitude: stateInfo.center[1] + ((index % 6) - 3) * 0.11,
    elevation: 280 + index * 7,
    agency: 'Central Ground Water Board',
    aquiferType: index % 2 ? 'Alluvial' : 'Weathered basalt',
    status: index % 11 === 0 ? 'inactive' : index % 9 === 0 ? 'maintenance' : 'active',
    classification,
    trend: trends[index % trends.length],
    currentWaterLevel: Number((5.8 + (index % 10) * 1.36).toFixed(2)),
    previousWaterLevel: Number((5.5 + (index % 10) * 1.31).toFixed(2)),
    rechargeEstimate: Number((1.2 + (index % 7) * 0.48).toFixed(2)),
    lastUpdated: index % 11 === 0 ? '2026-07-12T06:00:00+05:30' : '2026-07-14T06:00:00+05:30',
    dataQualityScore: quality,
    dataConfidence: quality >= 90 ? 'High' : quality >= 80 ? 'Moderate' : 'Low',
  };
});

export const readings = stations.flatMap((station, stationIndex) =>
  Array.from({ length: 24 }, (_, month) => {
    const isMissing = month === 8 && stationIndex % 5 === 0;
    const isAnomaly = month === 15 && stationIndex % 6 === 0;
    const value = Number((station.currentWaterLevel + Math.sin(month / 2.8) * 1.4 + (23 - month) * 0.04).toFixed(2));
    return {
      id: `${station.id}-reading-${month}`,
      stationId: station.id,
      timestamp: new Date(2024, 7 + month, 1).toISOString(),
      rawValue: isMissing ? null : isAnomaly ? value + 5 : value,
      cleanedValue: isMissing ? null : value,
      filledValue: isMissing ? value : value,
      rainfall: Math.max(0, Math.round(90 + Math.sin(month / 2) * 85)),
      isAnomaly,
      isMissing,
      isReconstructed: isMissing,
    };
  }),
);

export const forecasts = stations.flatMap((station) =>
  Array.from({ length: 8 }, (_, week) => {
    const predictedValue = Number((station.currentWaterLevel + (station.trend === 'falling' ? 0.18 : station.trend === 'rising' ? -0.12 : 0.03) * week).toFixed(2));
    return { stationId: station.id, timestamp: new Date(2026, 6, 21 + week * 7).toISOString(), predictedValue, lowerBound: predictedValue - 0.45, upperBound: predictedValue + 0.45, modelType: week % 2 ? 'lstm' : 'prophet' };
  }),
);

export const rechargeCalculations = stations.map((station, index) => ({
  id: `recharge-${index + 1}`, stationId: station.id, periodStart: '2025-07-01', periodEnd: '2026-06-30', aquiferArea: 12.5 + index, waterLevelFluctuation: 1.2 + (index % 5) * 0.3, specificYield: 0.025 + (index % 3) * 0.005, rechargeValue: station.rechargeEstimate, calculationMethod: 'WTF', calculatedAt: '2026-07-13T18:00:00+05:30',
}));

export const alerts = [
  ['Rapid decline detected', 'Groundwater level declined by 1.2 m in four weeks.', 'Nagpur', 'Maharashtra', 'critical', 'rapid-decline'],
  ['Classification changed to Critical', 'The station moved from Semi-Critical to Critical.', 'Jaipur', 'Rajasthan', 'high', 'category-change'],
  ['Forecast threshold warning', 'Forecast indicates continued decline through August.', 'Indore', 'Madhya Pradesh', 'high', 'forecast-warning'],
  ['Station data unavailable', 'No fresh sensor reading has been received for 48 hours.', 'Nashik', 'Maharashtra', 'medium', 'sensor-offline'],
  ['Groundwater condition improved', 'Recent recharge moved the local condition to Safe.', 'Ajmer', 'Rajasthan', 'low', 'improvement'],
  ['Abnormal reading detected', 'A reading is outside the expected seasonal range.', 'Bhopal', 'Madhya Pradesh', 'medium', 'anomaly'],
].map(([title, description, district, state, severity, type], index) => ({ id: `alert-${index + 1}`, title, description, district, state, severity, type, status: index > 3 ? 'Acknowledged' : 'New', createdAt: `2026-07-${14 - index}T0${7 + index}:30:00+05:30`, stationId: stations.find((item) => item.district === district)?.id, recommendedAction: severity === 'critical' ? 'Restrict non-essential pumping and verify field conditions.' : 'Review the latest readings and continue monitoring.', currentValue: `${11.4 + index} m bgl`, previousValue: `${10.2 + index} m bgl` }));

export const districts = states.flatMap((state) => state.districts.map((district, index) => {
  const districtStations = stations.filter((station) => station.district === district);
  return { district, state: state.name, classification: classifications[(index + states.indexOf(state)) % 4], previousClassification: classifications[Math.max(0, (index + states.indexOf(state)) % 4 - 1)], averageWaterLevel: Number((districtStations.reduce((sum, item) => sum + item.currentWaterLevel, 0) / Math.max(1, districtStations.length)).toFixed(2)), rechargeEstimate: 2.8 + index * 0.6, trend: trends[(index + 1) % 3], dataCoverage: 82 + index * 4, activeAlerts: alerts.filter((alert) => alert.district === district).length, stationCount: districtStations.length, highRiskBlocks: [`${district} Rural`, `${district} East`] };
}));

export const publicAdvisories = [
  'Use drip or sprinkler irrigation where practical.',
  'Schedule irrigation during cooler morning or evening hours.',
  'Repair leaking pipes and avoid unnecessary borewell pumping.',
  'Capture rooftop rainwater for recharge and non-potable use.',
];

export const chartSummary = [
  { month: 'Feb', level: 9.8, recharge: 1.2, rainfall: 12, anomalies: 2 },
  { month: 'Mar', level: 10.2, recharge: 1.1, rainfall: 8, anomalies: 3 },
  { month: 'Apr', level: 10.8, recharge: 0.9, rainfall: 15, anomalies: 5 },
  { month: 'May', level: 11.4, recharge: 0.8, rainfall: 28, anomalies: 4 },
  { month: 'Jun', level: 10.6, recharge: 1.8, rainfall: 122, anomalies: 2 },
  { month: 'Jul', level: 9.7, recharge: 2.7, rainfall: 186, anomalies: 1 },
];

export const LAST_SYNC = '14 July 2026, 6:00 AM';
export const isDemonstrationData = true;
