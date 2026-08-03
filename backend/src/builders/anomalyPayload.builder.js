/**
 * Builder for FastAPI Anomaly Detection request payload.
 * 
 * @param {Array} readings - Array of GroundwaterReading DB objects.
 * @param {string} freq - Resampling frequency.
 * @returns {Object} FastAPI anomalies payload body.
 */
export const buildAnomalyPayload = (readings, freq = "D") => {
  return {
    freq: freq,
    readings: readings.map((r) => ({
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : new Date(r.timestamp).toISOString(),
      water_level: r.cleanedWaterLevel !== null && r.cleanedWaterLevel !== undefined
        ? Number(r.cleanedWaterLevel)
        : Number(r.rawWaterLevel),
    })),
  };
};
