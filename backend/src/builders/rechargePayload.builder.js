/**
 * Builder for FastAPI Recharge calculation request payload.
 * 
 * @param {Array} readings - Array of GroundwaterReading DB objects.
 * @param {number} specificYield - Specific yield coefficient of the aquifer.
 * @param {number|null} areaSqm - Aquifer area in square meters.
 * @returns {Object} FastAPI recharge payload body.
 */
export const buildRechargePayload = (readings, specificYield, areaSqm) => {
  const payload = {
    specific_yield: specificYield !== null && specificYield !== undefined ? Number(specificYield) : 0.02,
    readings: readings.map((r) => ({
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : new Date(r.timestamp).toISOString(),
      water_level: r.cleanedWaterLevel !== null && r.cleanedWaterLevel !== undefined
        ? Number(r.cleanedWaterLevel)
        : Number(r.rawWaterLevel),
    })),
  };

  if (areaSqm !== null && areaSqm !== undefined) {
    payload.area_sqm = Number(areaSqm);
  }

  return payload;
};
