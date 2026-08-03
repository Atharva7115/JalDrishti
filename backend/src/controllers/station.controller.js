import * as mlOrchestratorService from "../services/mlOrchestrator.service.js";

/**
 * Controller to handle REST requests for station ML analyses.
 * Delegates all data logic to the Orchestrator service.
 */

/**
 * GET /stations/:stationId/forecast
 */
export const getForecast = async (req, res) => {
  const { stationId } = req.params;
  const horizonDays = req.query.horizonDays ? Number(req.query.horizonDays) : undefined;
  const freq = req.query.freq || undefined;

  const requestStartTime = Date.now();
  console.log(`[ML Integration] GET /stations/${stationId}/forecast requested`);

  try {
    const result = await mlOrchestratorService.orchestrateForecast(
      stationId,
      horizonDays,
      freq
    );

    const totalTime = Date.now() - requestStartTime;
    console.log(`[ML Integration] Forecast endpoint completed in ${totalTime}ms (FastAPI: ${result.mlDurationMs}ms, DB: ${result.dbSaveTimeMs}ms)`);

    return res.status(200).json({
      success: true,
      data: {
        mae: result.mae,
        rmse: result.rmse,
        forecast: result.forecast,
      },
      metrics: {
        mlExecutionTimeMs: result.mlDurationMs,
        dbSaveTimeMs: result.dbSaveTimeMs,
        totalRequestTimeMs: totalTime,
      },
    });
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[ML Integration Error] Forecast handler failed after ${totalTime}ms:`, error.message);

    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to process forecasting request.",
      details: error.data || null,
    });
  }
};

/**
 * POST /stations/:stationId/recharge
 */
export const calculateRecharge = async (req, res) => {
  const { stationId } = req.params;

  const requestStartTime = Date.now();
  console.log(`[ML Integration] POST /stations/${stationId}/recharge requested`);

  try {
    const result = await mlOrchestratorService.orchestrateRecharge(stationId);
    const totalTime = Date.now() - requestStartTime;

    console.log(`[ML Integration] Recharge endpoint completed in ${totalTime}ms (FastAPI: ${result.mlDurationMs}ms, DB: ${result.dbSaveTimeMs}ms)`);

    return res.status(200).json({
      success: true,
      data: {
        yearly: result.yearly,
      },
      metrics: {
        mlExecutionTimeMs: result.mlDurationMs,
        dbSaveTimeMs: result.dbSaveTimeMs,
        totalRequestTimeMs: totalTime,
      },
    });
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[ML Integration Error] Recharge handler failed after ${totalTime}ms:`, error.message);

    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to calculate groundwater recharge.",
      details: error.data || null,
    });
  }
};

/**
 * POST /stations/:stationId/classify
 */
export const classifyStation = async (req, res) => {
  const { stationId } = req.params;

  const requestStartTime = Date.now();
  console.log(`[ML Integration] POST /stations/${stationId}/classify requested`);

  try {
    const result = await mlOrchestratorService.orchestrateClassification(stationId);
    const totalTime = Date.now() - requestStartTime;

    console.log(`[ML Integration] Classification endpoint completed in ${totalTime}ms (FastAPI: ${result.mlDurationMs}ms)`);

    return res.status(200).json({
      success: true,
      data: {
        stage_of_extraction_pct: result.stage_of_extraction_pct,
        classification: result.classification,
        recharge_m3: result.recharge_m3,
        annual_extraction_m3: result.annual_extraction_m3,
        year: result.year,
      },
      metrics: {
        mlExecutionTimeMs: result.mlDurationMs,
        totalRequestTimeMs: totalTime,
      },
    });
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[ML Integration Error] Classification handler failed after ${totalTime}ms:`, error.message);

    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to perform groundwater classification.",
      details: error.data || null,
    });
  }
};

/**
 * POST /stations/:stationId/anomalies
 */
export const detectAnomalies = async (req, res) => {
  const { stationId } = req.params;
  const freq = req.query.freq || undefined;

  const requestStartTime = Date.now();
  console.log(`[ML Integration] POST /stations/${stationId}/anomalies requested`);

  try {
    const result = await mlOrchestratorService.orchestrateAnomalies(stationId, freq);
    const totalTime = Date.now() - requestStartTime;

    console.log(`[ML Integration] Anomalies endpoint completed in ${totalTime}ms (FastAPI: ${result.mlDurationMs}ms)`);

    return res.status(200).json({
      success: true,
      data: {
        anomalies: result.anomalies,
      },
      metrics: {
        mlExecutionTimeMs: result.mlDurationMs,
        totalRequestTimeMs: totalTime,
      },
    });
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[ML Integration Error] Anomalies handler failed after ${totalTime}ms:`, error.message);

    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to run anomaly detection.",
      details: error.data || null,
    });
  }
};

/**
 * POST /stations/:stationId/gap-fill
 */
export const fillGaps = async (req, res) => {
  const { stationId } = req.params;
  const freq = req.query.freq || undefined;

  const requestStartTime = Date.now();
  console.log(`[ML Integration] POST /stations/${stationId}/gap-fill requested`);

  try {
    const result = await mlOrchestratorService.orchestrateGapFill(stationId, freq);
    const totalTime = Date.now() - requestStartTime;

    console.log(`[ML Integration] Gap-fill endpoint completed in ${totalTime}ms (FastAPI: ${result.mlDurationMs}ms)`);

    return res.status(200).json({
      success: true,
      data: {
        readings: result.readings,
      },
      metrics: {
        mlExecutionTimeMs: result.mlDurationMs,
        totalRequestTimeMs: totalTime,
      },
    });
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[ML Integration Error] Gap-fill handler failed after ${totalTime}ms:`, error.message);

    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fill timeseries data gaps.",
      details: error.data || null,
    });
  }
};




