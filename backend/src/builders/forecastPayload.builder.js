/**
 * Builder for FastAPI Forecasting request payload.
 * Maps GroundwaterReading records to timezone-naive datetimes (as strings)
 * and formats the request body.
 * 
 * @param {Array} readings - Array of GroundwaterReading DB objects.
 * @param {number} horizonDays - The prediction horizon in days.
 * @param {string} freq - Time resampling frequency (e.g. 'D', 'H').
 * @returns {Object} FastAPI forecast payload body.
 */
export const buildForecastPayload = (readings, horizonDays = 14, freq = "D") => {
  return {
    horizon_days: horizonDays,
    freq: freq,
    readings: readings.map((r) => ({
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : new Date(r.timestamp).toISOString(),
      water_level: r.cleanedWaterLevel !== null && r.cleanedWaterLevel !== undefined
        ? Number(r.cleanedWaterLevel)
        : Number(r.rawWaterLevel),
    })),
  };
};
