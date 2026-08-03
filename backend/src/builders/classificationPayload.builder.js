/**
 * Builder for FastAPI GEC Classification request payload.
 * 
 * @param {number} rechargeM3 - Calculated recharge in cubic meters.
 * @param {number} annualExtractionM3 - Annual extraction in cubic meters.
 * @returns {Object} FastAPI classification payload body.
 */
export const buildClassificationPayload = (rechargeM3, annualExtractionM3) => {
  return {
    recharge_m3: Number(rechargeM3),
    annual_extraction_m3: Number(annualExtractionM3),
  };
};
