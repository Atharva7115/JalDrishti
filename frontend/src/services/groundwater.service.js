import { api, simulateNetwork, USE_MOCK_DATA } from './api';
import { alerts, districts, forecasts, readings, rechargeCalculations, stations } from '../data/mockData';

export const groundwaterService = {
  getStations: async () => {
    if (USE_MOCK_DATA) {
      return simulateNetwork(stations);
    }
    const res = await api.get('/stations', { params: { limit: 2000 } });
    // Map backend casing to frontend classification mapping (SAFE -> safe, SEMI_CRITICAL -> semi-critical)
    const mapped = (res.data.data || []).map((s) => ({
      ...s,
      name: s.stationName,
      stationCode: s.stationName.slice(0, 2).toUpperCase() + '-DWLR-' + s.id.slice(0, 4).toUpperCase(),
      lastUpdated: s.latestReadingTime || new Date().toISOString(),
      classification: s.assessmentCategory
        ? s.assessmentCategory.toLowerCase().replace('_', '-')
        : 'safe',
      trend: 'stable', // list-view default; real trend computed per-station detail page
      status: 'active',
      dataQualityScore: 95, // list-view default; real score available on station detail
      dataConfidence: 'High',
      currentWaterLevel: s.latestWaterLevel !== null ? Number(s.latestWaterLevel.toFixed(2)) : 0,
      rechargeEstimate: 0,
    }));
    return mapped;
  },

  getStation: async (id) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork(stations.find((item) => item.id === id));
    }
    const res = await api.get(`/stations/${id}`);
    const s = res.data.data;
    if (!s) return null;

    // Convert casing and nested fields
    return {
      id: s.id,
      stationCode: s.stationName.slice(0, 2).toUpperCase() + '-DWLR-' + s.id.slice(0, 4).toUpperCase(),
      name: s.stationName,
      state: s.state,
      district: s.district,
      block: s.block || s.tehsil || `${s.district} Rural`,
      village: s.village || s.block || s.district,
      latitude: s.latitude,
      longitude: s.longitude,
      elevation: s.rlMsl || null,
      agency: s.agency,
      aquiferType: s.aquiferType?.name || 'Basalt',
      riverBasin: s.riverBasin || null,
      status: s.isActive ? 'active' : 'inactive',
      classification: s.latestAssessment?.category
        ? s.latestAssessment.category.toLowerCase().replace('_', '-')
        : 'safe',
      // Real trend computed from last 2 readings delta in backend
      trend: s.trend || 'stable',
      currentWaterLevel: s.readingSummary?.latestWaterLevel !== null ? Number(s.readingSummary.latestWaterLevel.toFixed(2)) : 0,
      previousWaterLevel: s.readingSummary?.previousWaterLevel !== null && s.readingSummary?.previousWaterLevel !== undefined
        ? Number(s.readingSummary.previousWaterLevel.toFixed(2))
        : null,
      rechargeEstimate: s.latestAssessment?.annualRecharge
        ? Number((s.latestAssessment.annualRecharge / 1000000).toFixed(2))
        : 0,
      lastUpdated: s.readingSummary?.latestReadingTime || new Date().toISOString(),
      firstReadingDate: s.readingSummary?.firstReadingTime || null,
      // Real quality score computed from actual vs expected readings count in backend
      dataQualityScore: s.readingSummary?.qualityScore ?? 95,
      dataConfidence: s.readingSummary?.qualityScore >= 80 ? 'High' : s.readingSummary?.qualityScore >= 50 ? 'Medium' : 'Low',
    };
  },

  getReadings: async (stationId) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork(readings.filter((item) => item.stationId === stationId));
    }
    const res = await api.get(`/stations/${stationId}/readings`);
    const readingsArray = res.data.data || [];
    return readingsArray.map((r) => {
      const val = r.cleanedWaterLevel !== null ? Number(r.cleanedWaterLevel.toFixed(2)) : Number(r.rawWaterLevel.toFixed(2));
      return {
        id: r.id,
        stationId: r.stationId,
        timestamp: r.timestamp,
        rawValue: Number(r.rawWaterLevel.toFixed(2)),
        cleanedValue: val,
        filledValue: val,
        isAnomaly: r.isAnomaly,
        isMissing: r.isImputed,
        isReconstructed: r.isImputed,
        rainfall: 0, // mock rainfall
      };
    });
  },

  getForecast: async (stationId) => {
    if (USE_MOCK_DATA) {
      const mockPoints = forecasts.filter((item) => item.stationId === stationId);
      return {
        mae: 0.34,
        rmse: 0.48,
        forecast: mockPoints.map((item) => ({
          stationId,
          timestamp: item.timestamp,
          predictedValue: Number(item.predictedValue.toFixed(2)),
          lowerBound: Number(item.lowerBound.toFixed(2)),
          upperBound: Number(item.upperBound.toFixed(2)),
          modelType: 'prophet',
        }))
      };
    }
    const res = await api.get(`/stations/${stationId}/forecast`);
    const data = res.data.data;
    const forecastArray = data.forecast || [];
    return {
      mae: Number((data.mae || 0).toFixed(4)),
      rmse: Number((data.rmse || 0).toFixed(4)),
      forecast: forecastArray.map((item) => ({
        stationId,
        timestamp: item.timestamp,
        predictedValue: Number(item.predicted_level.toFixed(2)),
        lowerBound: Number(item.yhat_lower.toFixed(2)),
        upperBound: Number(item.yhat_upper.toFixed(2)),
        modelType: 'prophet',
      }))
    };
  },

  getRecharge: async (stationId) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork(rechargeCalculations.find((item) => item.stationId === stationId));
    }
    const res = await api.post(`/stations/${stationId}/recharge`);
    const data = res.data.data;
    if (!data || !data.yearly || data.yearly.length === 0) return null;

    const latest = data.yearly[data.yearly.length - 1];

    // Fetch station to resolve aquifer area
    const stationRes = await api.get(`/stations/${stationId}`);
    const s = stationRes.data.data;
    const areaHa = s.latestAssessment?.area ? s.latestAssessment.area / 10000 : 1250; // default 1250 ha
    const aquiferArea = areaHa / 100; // convert ha to km2

    return {
      id: `recharge-${stationId}`,
      stationId,
      periodStart: `${latest.year}-01-01`,
      periodEnd: `${latest.year}-12-31`,
      aquiferArea: Number(aquiferArea.toFixed(2)),
      waterLevelFluctuation: Number((latest.water_table_rise_m || 0).toFixed(2)),
      specificYield: Number((latest.specificYield || 0.02).toFixed(4)),
      rechargeValue: Number(((latest.recharge_m3 || 0) / 1000000).toFixed(2)), // Convert m3 to MCM
      calculationMethod: latest.source === "official" ? "GSDA Official Assessment" : "Water Table Fluctuation (WTF)",
      calculatedAt: new Date().toISOString(),
    };
  },

  getAnomalies: async (stationId) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork([]);
    }
    const res = await api.post(`/stations/${stationId}/anomalies`);
    return res.data.data.anomalies || [];
  },

  getGapFill: async (stationId) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork([]);
    }
    const res = await api.post(`/stations/${stationId}/gap-fill`);
    return res.data.data.readings || [];
  },

  getAlerts: async (filters = {}) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork(alerts);
    }
    const res = await api.get('/alerts', { params: filters });
    return res.data; // Return full object containing data and pagination
  },

  getDistricts: async () => {
    if (USE_MOCK_DATA) {
      return simulateNetwork(districts);
    }
    const res = await api.get('/districts');
    return res.data.data;
  },

  getDistrict: async (districtName) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork(districts.find(d => d.district.toLowerCase() === districtName.toLowerCase()));
    }
    const res = await api.get(`/districts/${districtName}`);
    return res.data.data;
  },

  acknowledgeAlert: async (alertId) => {
    if (USE_MOCK_DATA) {
      return simulateNetwork({ success: true });
    }
    const res = await api.patch(`/alerts/${alertId}/acknowledge`);
    return res.data;
  },

  triggerIngestion: async () => {
    if (USE_MOCK_DATA) {
      return simulateNetwork({ success: true });
    }
    const res = await api.post('/ingestion/start');
    return res.data;
  },

  triggerAlertScan: async () => {
    if (USE_MOCK_DATA) {
      return simulateNetwork({ success: true });
    }
    const res = await api.post('/alerts/run');
    return res.data;
  },
};

export const authService = {
  login: async ({ identifier, role }) => {
    if (!USE_MOCK_DATA) return (await api.post('/auth/login', { identifier, role })).data;
    return simulateNetwork({ token: 'demo-token', user: { id: 'demo-user', name: 'Demo User', email: identifier, role: role || 'researcher', organization: 'JalDrishti Demonstration' } });
  },
};
