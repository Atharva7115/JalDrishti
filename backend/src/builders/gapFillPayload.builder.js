/**
 * Builder for FastAPI Gap Filling request payload.
 * Preserves null/undefined water levels so they can be imputed by the ML model.
 * 
 * @param {Array} readings - Array of GroundwaterReading DB objects.
 * @param {string} freq - Resampling frequency.
 * @returns {Object} FastAPI gap fill payload body.
 */
export const buildGapFillPayload = (readings, freq = "D") => {
  return {
    freq: freq,
    readings: readings.map((r) => ({
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : new Date(r.timestamp).toISOString(),
      water_level: r.rawWaterLevel !== null && r.rawWaterLevel !== undefined
        ? Number(r.rawWaterLevel)
        : null,
    })),
  };
};
