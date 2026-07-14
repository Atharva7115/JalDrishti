import { api, simulateNetwork, USE_MOCK_DATA } from './api';
import { alerts, districts, forecasts, readings, rechargeCalculations, stations } from '../data/mockData';

const get = async (path, mockValue) => USE_MOCK_DATA ? simulateNetwork(mockValue) : (await api.get(path)).data;

export const groundwaterService = {
  getStations: () => get('/stations', stations),
  getStation: (id) => get(`/stations/${id}`, stations.find((item) => item.id === id)),
  getReadings: (stationId) => get(`/stations/${stationId}/readings`, readings.filter((item) => item.stationId === stationId)),
  getForecast: (stationId) => get(`/stations/${stationId}/forecast`, forecasts.filter((item) => item.stationId === stationId)),
  getRecharge: (stationId) => get(`/stations/${stationId}/recharge`, rechargeCalculations.find((item) => item.stationId === stationId)),
  getAlerts: () => get('/alerts', alerts),
  getDistricts: () => get('/districts', districts),
};

export const authService = {
  login: async ({ identifier, role }) => {
    if (!USE_MOCK_DATA) return (await api.post('/auth/login', { identifier, role })).data;
    return simulateNetwork({ token: 'demo-token', user: { id: 'demo-user', name: 'Demo User', email: identifier, role: role || 'researcher', organization: 'JalDrishti Demonstration' } });
  },
};
